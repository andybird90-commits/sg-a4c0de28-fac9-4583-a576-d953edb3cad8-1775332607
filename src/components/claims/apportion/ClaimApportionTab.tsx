import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { claimApportionmentService, type ParsedLineInput } from "@/services/claimApportionmentService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, FileText, RefreshCw, Trash2, Upload } from "lucide-react";

type SourceFileRow = {
  id: string;
  claim_id: string;
  org_id: string;
  bucket_name: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  uploaded_at: string | null;
  parse_status: string | null;
  confidence: number | null;
};

type ApportionLineRow = {
  id: string;
  source_file_id: string | null;
  line_index: number | null;
  raw_name: string | null;
  normalised_name: string | null;
  category: "supplier" | "subcontractor" | "staff" | "unknown" | string;
  reference_text: string | null;
  debit_total: number | null;
  credit_total: number | null;
  net_total: number | null;
  vat_total: number | null;
  gross_total: number | null;
  source_page: number | null;
  confidence: number | null;
  include: boolean | null;
  notes: string | null;
};

type ApportionmentRow = {
  id: string;
  claim_id: string;
  org_id: string;
  source_line_id: string | null;
  source_file_id: string | null;
  item_name: string | null;
  heading: string | null;
  category: string | null;
  total_source_cost: number | null;
  claimable_percent: number | null;
  claimable_amount: number | null;
  justification: string | null;
  rd_activity_note: string | null;
  reviewer_note: string | null;
  status: "draft" | "reviewed" | "approved" | "excluded" | string;
};

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function inferFileType(filename: string, mime: string | null | undefined): string {
  const lower = filename.toLowerCase();
  if (mime) return mime;
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function extractPdfTextAndMaybeOcr(blob: Blob): Promise<Array<{ pageNumber: number; text: string }>> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  (pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc;

  const data = await blob.arrayBuffer();
  const doc = await (pdfjs as any).getDocument({ data }).promise;

  const pages: Array<{ pageNumber: number; text: string }> = [];
  let totalChars = 0;

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items || []).map((it: any) => (typeof it?.str === "string" ? it.str : "")).filter(Boolean);
    const text = strings.join(" ").replace(/\s+/g, " ").trim();
    totalChars += text.length;
    pages.push({ pageNumber: i, text });
  }

  const looksScanned = totalChars < 50;

  if (!looksScanned) {
    return pages;
  }

  const tesseract = await import("tesseract.js");
  const ocrPages: Array<{ pageNumber: number; text: string }> = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    if (!ctx) {
      ocrPages.push({ pageNumber: i, text: "" });
      continue;
    }

    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/png");

    const result = await tesseract.recognize(dataUrl, "eng");
    const text = (result.data?.text || "").replace(/\s+/g, " ").trim();
    ocrPages.push({ pageNumber: i, text });
  }

  return ocrPages;
}

async function extractImageOcr(blob: Blob): Promise<Array<{ pageNumber: number; text: string }>> {
  const tesseract = await import("tesseract.js");
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });

  const result = await tesseract.recognize(dataUrl, "eng");
  const text = (result.data?.text || "").replace(/\s+/g, " ").trim();
  return [{ pageNumber: 1, text }];
}

const LineEditSchema = z.object({
  raw_name: z.string().nullable(),
  category: z.enum(["supplier", "subcontractor", "staff", "unknown"]),
  reference_text: z.string().nullable(),
  debit_total: z.number().nullable(),
  credit_total: z.number().nullable(),
  net_total: z.number().nullable(),
  vat_total: z.number().nullable(),
  gross_total: z.number().nullable(),
  source_page: z.number().int().positive().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  include: z.boolean(),
  notes: z.string().nullable()
});

export function ClaimApportionTab(props: {
  claimId: string;
  orgId: string;
  onCostsPushed?: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);

  const [sourceFiles, setSourceFiles] = useState<SourceFileRow[]>([]);
  const [selectedSourceFileId, setSelectedSourceFileId] = useState<string>("");
  const [lines, setLines] = useState<ApportionLineRow[]>([]);
  const [apportionments, setApportionments] = useState<ApportionmentRow[]>([]);

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);

  const [filterText, setFilterText] = useState("");
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushInProgress, setPushInProgress] = useState(false);
  const [pushMode, setPushMode] = useState<"create-only" | "update-existing">("create-only");

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshSources = async () => {
    const rows = (await claimApportionmentService.listSourceFiles(props.claimId)) as any[];
    setSourceFiles(rows as SourceFileRow[]);
    if (!selectedSourceFileId && rows.length > 0) {
      setSelectedSourceFileId(rows[0].id);
    }
  };

  const refreshLines = async (sourceFileId: string) => {
    const rows = (await claimApportionmentService.listLinesForSource(sourceFileId)) as any[];
    setLines(rows as ApportionLineRow[]);
  };

  const refreshApportionments = async () => {
    const rows = (await claimApportionmentService.listApportionmentsForClaim(props.claimId)) as any[];
    setApportionments(rows as ApportionmentRow[]);
  };

  useEffect(() => {
    void refreshSources();
    void refreshApportionments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.claimId]);

  useEffect(() => {
    if (!selectedSourceFileId) return;
    void refreshLines(selectedSourceFileId);
     
  }, [selectedSourceFileId]);

  const selectedSource = useMemo(() => sourceFiles.find((s) => s.id === selectedSourceFileId) ?? null, [sourceFiles, selectedSourceFileId]);

  const filteredLines = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return lines;
    return lines.filter((l) => {
      const hay = [
        l.raw_name ?? "",
        l.normalised_name ?? "",
        l.reference_text ?? "",
        l.notes ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filterText, lines]);

  const summary = useMemo(() => {
    const included = lines.filter((l) => l.include !== false);
    const totalDebits = included.reduce((s, l) => s + (safeNumber(l.debit_total) || 0), 0);
    const totalCredits = included.reduce((s, l) => s + (safeNumber(l.credit_total) || 0), 0);
    const netSpend = included.reduce((s, l) => s + (safeNumber(l.net_total) || 0), 0);

    const totalClaimable = apportionments.reduce((s, a) => s + (safeNumber(a.claimable_amount) || 0), 0);
    const totalApproved = apportionments
      .filter((a) => a.status === "approved")
      .reduce((s, a) => s + (safeNumber(a.claimable_amount) || 0), 0);

    const needingReview = apportionments.filter((a) => a.status === "draft").length;
    const lowConfidence = included.filter((l) => (safeNumber(l.confidence) ?? 1) < 0.6).length;

    return { totalDebits, totalCredits, netSpend, totalClaimable, totalApproved, needingReview, lowConfidence };
  }, [lines, apportionments]);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Not authenticated", description: "Please log in and try again.", variant: "destructive" });
        return;
      }

      const fileType = inferFileType(file.name, file.type);
      const bucket = "evidence-files";
      const path = `claim_apportionment/${props.claimId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });
      if (uploadError) throw uploadError;

      const payload: any = {
        claim_id: props.claimId,
        org_id: props.orgId,
        bucket_name: bucket,
        file_path: path,
        file_name: file.name,
        file_type: fileType,
        uploaded_at: new Date().toISOString(),
        parse_status: "uploaded",
        confidence: null
      };

      await claimApportionmentService.createSourceFile(payload);

      toast({ title: "Uploaded", description: "Source file uploaded. Click Parse to extract lines." });
      await refreshSources();
    } catch (error: any) {
      console.error("[ClaimApportionTab] upload error", error);
      toast({ title: "Upload failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleViewSource = async (source: SourceFileRow) => {
    if (!source.bucket_name || !source.file_path) return;
    const { data, error } = await supabase.storage.from(source.bucket_name).createSignedUrl(source.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "View failed", description: "Could not create a secure link to this file.", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDeleteSource = async (source: SourceFileRow) => {
    try {
      if (!source.id) return;
      if (source.bucket_name && source.file_path) {
        await supabase.storage.from(source.bucket_name).remove([source.file_path]);
      }
      await claimApportionmentService.deleteSourceFile(source.id);
      if (selectedSourceFileId === source.id) {
        setSelectedSourceFileId("");
        setLines([]);
      }
      await refreshSources();
      toast({ title: "Deleted", description: "Source file removed." });
    } catch (error: any) {
      console.error("[ClaimApportionTab] delete error", error);
      toast({ title: "Delete failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
    }
  };

  const handleParse = async (source: SourceFileRow) => {
    if (!source.bucket_name || !source.file_path) return;

    setParsing(source.id);
    try {
      await claimApportionmentService.updateSourceFile(source.id, { parse_status: "parsing" } as any);
      await refreshSources();

      const { data: signed, error: signedError } = await supabase.storage.from(source.bucket_name).createSignedUrl(source.file_path, 120);
      if (signedError || !signed?.signedUrl) {
        throw signedError || new Error("Could not create signed URL");
      }

      const response = await fetch(signed.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file (status ${response.status})`);
      }

      const blob = await response.blob();
      const fileType = source.file_type || inferFileType(source.file_name || "file", blob.type);

      let pages: Array<{ pageNumber: number; text: string }>;

      if (fileType.includes("pdf")) {
        pages = await extractPdfTextAndMaybeOcr(blob);
      } else if (fileType.startsWith("image/")) {
        pages = await extractImageOcr(blob);
      } else {
        pages = [{ pageNumber: 1, text: "" }];
      }

      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const structRes = await fetch("/api/claims/apportion/structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          claimId: props.claimId,
          sourceFileId: source.id,
          pages,
          filename: source.file_name || "file",
          fileType
        })
      });

      const structJson = await structRes.json();
      if (!structRes.ok || structJson?.ok !== true) {
        throw new Error(structJson?.error || "Parse failed");
      }

      const parsedLines: ParsedLineInput[] = (structJson?.result?.lines || []).map((l: any) => ({
        lineIndex: Number(l.lineIndex ?? 0),
        rawName: typeof l.rawName === "string" ? l.rawName : null,
        normalisedName: typeof l.normalisedName === "string" ? l.normalisedName : null,
        category: l.category ?? "unknown",
        referenceText: typeof l.referenceText === "string" ? l.referenceText : null,
        debitTotal: safeNumber(l.debitTotal),
        creditTotal: safeNumber(l.creditTotal),
        netTotal: safeNumber(l.netTotal),
        vatTotal: safeNumber(l.vatTotal),
        grossTotal: safeNumber(l.grossTotal),
        sourcePage: safeNumber(l.sourcePage) as any,
        confidence: safeNumber(l.confidence),
        include: l.include !== false,
        notes: typeof l.notes === "string" ? l.notes : null,
        rawExtraction: l.rawExtraction ?? null
      }));

      await claimApportionmentService.upsertParsedLines({
        claimId: props.claimId,
        orgId: props.orgId,
        sourceFileId: source.id,
        lines: parsedLines
      });

      const avgConfidenceRaw =
        parsedLines.length > 0
          ? parsedLines.reduce((s, l) => s + (l.confidence ?? 0.5), 0) / parsedLines.length
          : null;

      await claimApportionmentService.updateSourceFile(source.id, {
        parse_status: "parsed",
        confidence: avgConfidenceRaw !== null ? clamp(avgConfidenceRaw, 0, 1) : null
      } as any);

      toast({ title: "Parsed", description: "Extracted lines are ready for review and editing." });
      await refreshSources();
      if (selectedSourceFileId === source.id) {
        await refreshLines(source.id);
      }
    } catch (error: any) {
      console.error("[ClaimApportionTab] parse error", error);
      toast({
        title: "Parse failed",
        description: error?.message ?? "Unexpected error while parsing",
        variant: "destructive"
      });

      try {
        await claimApportionmentService.updateSourceFile(source.id, { parse_status: "error" } as any);
        await refreshSources();
      } catch {
        // ignore
      }
    } finally {
      setParsing(null);
    }
  };

  const saveLineEdit = async (line: ApportionLineRow, patch: Partial<ApportionLineRow>) => {
    if (!line.id) return;
    const next: any = { ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("claim_apportionment_lines").update(next).eq("id", line.id);
    if (error) throw error;
  };

  const ensureWorkingRowForLine = async (line: ApportionLineRow) => {
    const existing = apportionments.find((a) => a.source_line_id === line.id);
    if (existing) return;

    const total = safeNumber(line.net_total) ?? safeNumber(line.gross_total) ?? safeNumber(line.debit_total) ?? 0;
    const itemName = (line.normalised_name || line.raw_name || "").toString();

    await claimApportionmentService.upsertApportionment({
      claim_id: props.claimId,
      org_id: props.orgId,
      source_line_id: line.id,
      source_file_id: line.source_file_id,
      item_name: itemName,
      heading: "other",
      category: (line.category as any) || "unknown",
      total_source_cost: total,
      claimable_percent: 0,
      claimable_amount: 0,
      status: "draft"
    } as any);

    await refreshApportionments();
  };

  const updateWorkingRow = async (row: ApportionmentRow, patch: Partial<ApportionmentRow>) => {
    const total = safeNumber(patch.total_source_cost ?? row.total_source_cost) ?? 0;
    const existingPct = safeNumber(patch.claimable_percent ?? row.claimable_percent) ?? 0;
    const existingAmt = safeNumber(patch.claimable_amount ?? row.claimable_amount) ?? 0;

    let claimablePercent = existingPct;
    let claimableAmount = existingAmt;

    const pctTouched = Object.prototype.hasOwnProperty.call(patch, "claimable_percent");
    const amtTouched = Object.prototype.hasOwnProperty.call(patch, "claimable_amount");

    if (amtTouched && !pctTouched) {
      const nextAmt = clamp(existingAmt, 0, total);
      claimableAmount = nextAmt;
      claimablePercent = total > 0 ? clamp(nextAmt / total, 0, 1) : 0;
    }

    if (pctTouched && !amtTouched) {
      const nextPct = clamp(existingPct, 0, 1);
      claimablePercent = nextPct;
      claimableAmount = clamp(total * nextPct, 0, total);
    }

    if (pctTouched && amtTouched) {
      claimableAmount = clamp(existingAmt, 0, total);
      claimablePercent = total > 0 ? clamp(claimableAmount / total, 0, 1) : 0;
    }

    await claimApportionmentService.updateApportionment(row.id, {
      ...(patch as any),
      claimable_percent: claimablePercent,
      claimable_amount: claimableAmount,
      total_source_cost: total
    } as any);

    await refreshApportionments();
  };

  const approvedToPush = useMemo(() => apportionments.filter((a) => a.status === "approved"), [apportionments]);

  const handlePushApproved = async () => {
    setPushInProgress(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;

      if (approvedToPush.length === 0) {
        toast({ title: "Nothing to push", description: "Approve at least one row first." });
        return;
      }

      const apportionmentsNeedingPush: ApportionmentRow[] = [];

      for (const row of approvedToPush) {
        const link = await claimApportionmentService.getCostLinkByApportionment(row.id);
        if (!link?.claim_cost_id) {
          apportionmentsNeedingPush.push(row);
        }
      }

      if (apportionmentsNeedingPush.length === 0 && pushMode === "create-only") {
        toast({ title: "Already pushed", description: "All approved rows have already been pushed to Costs." });
        return;
      }

      const rowsToProcess = pushMode === "create-only" ? apportionmentsNeedingPush : approvedToPush;

      for (const row of rowsToProcess) {
        const link = await claimApportionmentService.getCostLinkByApportionment(row.id);

        const costType = (row.heading || "other") as any;
        const amount = clamp(safeNumber(row.claimable_amount) ?? 0, 0, safeNumber(row.total_source_cost) ?? 0);

        const sourceFile = sourceFiles.find((s) => s.id === row.source_file_id);
        const sourceRefParts = [
          sourceFile?.file_name ? `Source: ${sourceFile.file_name}` : null
        ].filter(Boolean);

        const descriptionParts = [
          row.item_name ? `Item: ${row.item_name}` : null,
          `Claimable: ${formatMoney(amount)} (${Math.round((safeNumber(row.claimable_percent) ?? 0) * 100)}%)`,
          row.justification ? `Justification: ${row.justification}` : null,
          row.rd_activity_note ? `R&D note: ${row.rd_activity_note}` : null,
          sourceRefParts.length ? sourceRefParts.join(" ") : null,
          `Apportionment ID: ${row.id}`
        ].filter(Boolean);

        const description = descriptionParts.join("\n");

        if (link?.claim_cost_id) {
          if (pushMode !== "update-existing") continue;

          const { error } = await supabase
            .from("claim_costs")
            .update({
              cost_type: costType,
              description,
              amount,
              updated_at: new Date().toISOString()
            } as any)
            .eq("id", link.claim_cost_id);

          if (error) throw error;

          await claimApportionmentService.linkPushedCost({
            apportionmentId: row.id,
            claimCostId: link.claim_cost_id,
            pushedBy: userId,
            snapshot: { mode: "update", costType, amount, description }
          });
        } else {
          const { data: created, error } = await supabase
            .from("claim_costs")
            .insert({
              claim_id: props.claimId,
              org_id: props.orgId,
              cost_type: costType,
              description,
              amount,
              cost_date: null,
              project_id: null
            } as any)
            .select("id")
            .single();

          if (error) throw error;

          await claimApportionmentService.linkPushedCost({
            apportionmentId: row.id,
            claimCostId: created.id,
            pushedBy: userId,
            snapshot: { mode: "create", costType, amount, description }
          });
        }
      }

      toast({
        title: "Pushed to Costs",
        description: "Approved apportionment items have been pushed to the Costs tab."
      });

      setShowPushDialog(false);
      await refreshApportionments();
      if (props.onCostsPushed) {
        await props.onCostsPushed();
      }
    } catch (error: any) {
      console.error("[ClaimApportionTab] push error", error);
      toast({ title: "Push failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
    } finally {
      setPushInProgress(false);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!selectedSourceFileId) return;

    const byKey = new Map<string, ApportionLineRow[]>();
    lines.forEach((l) => {
      const key = (l.normalised_name || l.raw_name || "").trim().toLowerCase();
      if (!key) return;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(l);
    });

    const duplicates = Array.from(byKey.values()).filter((arr) => arr.length > 1);

    if (duplicates.length === 0) {
      toast({ title: "No duplicates found", description: "No duplicate names detected in this source file." });
      return;
    }

    try {
      for (const group of duplicates) {
        const primary = group[0];
        const rest = group.slice(1);

        const sumDebit = group.reduce((s, l) => s + (safeNumber(l.debit_total) || 0), 0);
        const sumCredit = group.reduce((s, l) => s + (safeNumber(l.credit_total) || 0), 0);
        const sumNet = group.reduce((s, l) => s + (safeNumber(l.net_total) || 0), 0);
        const sumVat = group.reduce((s, l) => s + (safeNumber(l.vat_total) || 0), 0);
        const sumGross = group.reduce((s, l) => s + (safeNumber(l.gross_total) || 0), 0);

        await saveLineEdit(primary, {
          debit_total: sumDebit,
          credit_total: sumCredit,
          net_total: sumNet,
          vat_total: sumVat,
          gross_total: sumGross,
          notes: [primary.notes, "Merged duplicates"].filter(Boolean).join(" • ")
        });

        for (const other of rest) {
          await saveLineEdit(other, { include: false, notes: [other.notes, "Merged into primary"].filter(Boolean).join(" • ") });
        }
      }

      toast({ title: "Merged", description: "Duplicate names merged into primary rows (others excluded)." });
      await refreshLines(selectedSourceFileId);
    } catch (error: any) {
      console.error("[ClaimApportionTab] merge error", error);
      toast({ title: "Merge failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
    }
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Apportion</CardTitle>
          <CardDescription>Loading apportionment tools...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Source Files</CardTitle>
            <CardDescription>
              Upload cost documents (PDFs, scanned PDFs, images/photos). Parse them into editable lines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="apportion-upload">Upload</Label>
                <Input
                  id="apportion-upload"
                  type="file"
                  accept="application/pdf,image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </div>
              <Button type="button" variant="outline" disabled={uploading} onClick={() => void refreshSources()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {sourceFiles.length === 0 ? (
              <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
                No source files yet. Upload a PDF or image to begin.
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceFiles.map((s) => (
                      <TableRow
                        key={s.id}
                        className={s.id === selectedSourceFileId ? "bg-muted/40" : undefined}
                        onClick={() => setSelectedSourceFileId(s.id)}
                      >
                        <TableCell className="max-w-[220px] truncate font-medium">
                          {s.file_name || "Untitled"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(s.file_type || "").includes("pdf") ? "PDF" : (s.file_type || "file")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.uploaded_at ? new Date(s.uploaded_at).toLocaleDateString("en-GB") : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {s.parse_status || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.confidence !== null && s.confidence !== undefined ? `${Math.round(s.confidence * 100)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleViewSource(s);
                              }}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              disabled={parsing === s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleParse(s);
                              }}
                              title="Parse / Re-parse"
                            >
                              {parsing === s.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteSource(s);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Totals across included extracted lines and working apportionments.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Total debits</p>
              <p className="text-lg font-semibold">{formatMoney(summary.totalDebits)}</p>
            </div>
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Total credits</p>
              <p className="text-lg font-semibold">{formatMoney(summary.totalCredits)}</p>
            </div>
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Net spend (from lines)</p>
              <p className="text-lg font-semibold">{formatMoney(summary.netSpend)}</p>
            </div>
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Total currently claimable</p>
              <p className="text-lg font-semibold">{formatMoney(summary.totalClaimable)}</p>
            </div>
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Total approved for claim</p>
              <p className="text-lg font-semibold">{formatMoney(summary.totalApproved)}</p>
            </div>
            <div className="rounded-md border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Rows needing review</p>
              <p className="text-lg font-semibold">{summary.needingReview}</p>
            </div>
            <div className="rounded-md border bg-background/40 p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Low-confidence lines (included)</p>
              <p className="text-lg font-semibold">{summary.lowConfidence}</p>
              <p className="text-[11px] text-muted-foreground">Confidence &lt; 60%.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Extracted Lines (editable)</CardTitle>
          <CardDescription>
            Review and correct extracted rows before they affect any claim costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <Label>Search / filter</Label>
              <Input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Search name, reference or notes..." />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={!selectedSourceFileId} onClick={() => void handleMergeDuplicates()}>
                Merge duplicate names
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedSourceFileId}
                onClick={() => {
                  if (selectedSourceFileId) void refreshLines(selectedSourceFileId);
                }}
              >
                Refresh lines
              </Button>
            </div>
          </div>

          {!selectedSource ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">Select a source file to view extracted lines.</div>
          ) : filteredLines.length === 0 ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
              No extracted lines yet. Click Parse on a source file.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Include</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">VAT</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Working</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={l.include !== false}
                          onChange={async (e) => {
                            const include = e.target.checked;
                            try {
                              await saveLineEdit(l, { include } as any);
                              if (selectedSourceFileId) await refreshLines(selectedSourceFileId);
                            } catch (error: any) {
                              toast({ title: "Update failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Input
                          value={l.raw_name ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, raw_name: v } : x)));
                          }}
                          onBlur={async () => {
                            try {
                              const validated = LineEditSchema.safeParse({
                                raw_name: l.raw_name ?? "",
                                category: (l.category as any) || "unknown",
                                reference_text: l.reference_text ?? null,
                                debit_total: safeNumber(l.debit_total),
                                credit_total: safeNumber(l.credit_total),
                                net_total: safeNumber(l.net_total),
                                vat_total: safeNumber(l.vat_total),
                                gross_total: safeNumber(l.gross_total),
                                source_page: safeNumber(l.source_page) as any,
                                confidence: safeNumber(l.confidence),
                                include: l.include !== false,
                                notes: l.notes ?? null
                              });
                              if (!validated.success) return;
                              await saveLineEdit(l, { raw_name: (l.raw_name ?? "") as any });
                            } catch (error: any) {
                              toast({ title: "Save failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <Select
                          value={(l.category as any) || "unknown"}
                          onValueChange={async (value) => {
                            try {
                              await saveLineEdit(l, { category: value as any });
                              if (selectedSourceFileId) await refreshLines(selectedSourceFileId);
                            } catch (error: any) {
                              toast({ title: "Update failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supplier">Supplier</SelectItem>
                            <SelectItem value="subcontractor">Subcontractor</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Input
                          value={l.reference_text ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, reference_text: v } : x)));
                          }}
                          onBlur={async () => {
                            try {
                              await saveLineEdit(l, { reference_text: (l.reference_text ?? "") as any });
                            } catch (error: any) {
                              toast({ title: "Save failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px] text-right">{formatMoney(safeNumber(l.debit_total))}</TableCell>
                      <TableCell className="min-w-[120px] text-right">{formatMoney(safeNumber(l.credit_total))}</TableCell>
                      <TableCell className="min-w-[120px] text-right">{formatMoney(safeNumber(l.net_total))}</TableCell>
                      <TableCell className="min-w-[120px] text-right">{formatMoney(safeNumber(l.vat_total))}</TableCell>
                      <TableCell className="min-w-[120px] text-right">{formatMoney(safeNumber(l.gross_total))}</TableCell>
                      <TableCell className="min-w-[80px] text-xs text-muted-foreground">{l.source_page ?? "—"}</TableCell>
                      <TableCell className="min-w-[100px] text-xs text-muted-foreground">
                        {l.confidence !== null && l.confidence !== undefined ? `${Math.round(l.confidence * 100)}%` : "—"}
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <Input
                          value={l.notes ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) => prev.map((x) => (x.id === l.id ? { ...x, notes: v } : x)));
                          }}
                          onBlur={async () => {
                            try {
                              await saveLineEdit(l, { notes: (l.notes ?? "") as any });
                            } catch (error: any) {
                              toast({ title: "Save failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            void ensureWorkingRowForLine(l);
                          }}
                        >
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apportionment Working Table</CardTitle>
          <CardDescription>
            Set claimable % and rationale. Only approved items can be pushed to Costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Approved rows: <span className="font-semibold text-foreground">{approvedToPush.length}</span>
            </div>
            <Button type="button" variant="secondary" onClick={() => setShowPushDialog(true)} disabled={approvedToPush.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Push approved items to Costs tab
            </Button>
          </div>

          {apportionments.length === 0 ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
              No working rows yet. Add from extracted lines above.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item name</TableHead>
                    <TableHead>Heading</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Total source</TableHead>
                    <TableHead className="text-right">Claimable %</TableHead>
                    <TableHead className="text-right">Claimable amount</TableHead>
                    <TableHead>Justification</TableHead>
                    <TableHead>R&amp;D activity note</TableHead>
                    <TableHead>Reviewer note</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apportionments.map((a) => {
                    const total = safeNumber(a.total_source_cost) ?? 0;
                    const pct = safeNumber(a.claimable_percent) ?? 0;
                    const amt = safeNumber(a.claimable_amount) ?? 0;

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="min-w-[220px]">
                          <Input
                            value={a.item_name ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setApportionments((prev) => prev.map((x) => (x.id === a.id ? { ...x, item_name: v } : x)));
                            }}
                            onBlur={() => void updateWorkingRow(a, { item_name: a.item_name ?? "" } as any)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <Select value={a.heading ?? "other"} onValueChange={(v) => void updateWorkingRow(a, { heading: v } as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="subcontractor">Subcontractors</SelectItem>
                              <SelectItem value="consumables">Consumables</SelectItem>
                              <SelectItem value="software">Software</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <Select value={(a.category as any) ?? "unknown"} onValueChange={(v) => void updateWorkingRow(a, { category: v } as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="supplier">Supplier</SelectItem>
                              <SelectItem value="subcontractor">Subcontractor</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="min-w-[140px] text-right">{formatMoney(total)}</TableCell>
                        <TableCell className="min-w-[140px] text-right">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round(pct * 100)}
                            onChange={(e) => {
                              const next = clamp(Number(e.target.value || 0), 0, 100);
                              setApportionments((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, claimable_percent: next / 100 } : x))
                              );
                            }}
                            onBlur={() => void updateWorkingRow(a, { claimable_percent: (safeNumber(a.claimable_percent) ?? 0) } as any)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[160px] text-right">
                          <Input
                            type="number"
                            min={0}
                            max={total}
                            step={0.01}
                            value={amt}
                            onChange={(e) => {
                              const next = safeNumber(e.target.value) ?? 0;
                              setApportionments((prev) =>
                                prev.map((x) => (x.id === a.id ? { ...x, claimable_amount: next } : x))
                              );
                            }}
                            onBlur={() => void updateWorkingRow(a, { claimable_amount: (safeNumber(a.claimable_amount) ?? 0) } as any)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[260px]">
                          <Textarea
                            rows={2}
                            value={a.justification ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setApportionments((prev) => prev.map((x) => (x.id === a.id ? { ...x, justification: v } : x)));
                            }}
                            onBlur={() => void updateWorkingRow(a, { justification: a.justification ?? "" } as any)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[260px]">
                          <Textarea
                            rows={2}
                            value={a.rd_activity_note ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setApportionments((prev) => prev.map((x) => (x.id === a.id ? { ...x, rd_activity_note: v } : x)));
                            }}
                            onBlur={() => void updateWorkingRow(a, { rd_activity_note: a.rd_activity_note ?? "" } as any)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[260px]">
                          <Textarea
                            rows={2}
                            value={a.reviewer_note ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setApportionments((prev) => prev.map((x) => (x.id === a.id ? { ...x, reviewer_note: v } : x)));
                            }}
                            onBlur={() => void updateWorkingRow(a, { reviewer_note: a.reviewer_note ?? "" } as any)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[160px]">
                          <Select value={(a.status as any) ?? "draft"} onValueChange={(v) => void updateWorkingRow(a, { status: v } as any)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="excluded">Excluded</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPushDialog} onOpenChange={setShowPushDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push approved items to Costs</DialogTitle>
            <DialogDescription>
              This will create cost entries for approved rows (or update existing pushed costs if you choose).
              It will not overwrite user-entered costs without your confirmation here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-background/40 p-3 text-sm">
              <p>
                Approved rows: <span className="font-semibold">{approvedToPush.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                You can run this multiple times. Each apportionment row keeps an audit link to the cost item that was created.
              </p>
            </div>

            <div>
              <Label>Mode</Label>
              <Select value={pushMode} onValueChange={(v) => setPushMode(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-only">Create new costs only (recommended)</SelectItem>
                  <SelectItem value="update-existing">Update previously pushed costs too</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowPushDialog(false)} disabled={pushInProgress}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={() => void handlePushApproved()} disabled={pushInProgress}>
              {pushInProgress ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Pushing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Confirm push to Costs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}