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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, FileText, RefreshCw, Trash2 } from "lucide-react";

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
  source_id: string | null;
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
  source_id: string | null;
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

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = await blob.arrayBuffer();
  const doc = await (pdfjs as any).getDocument({ data }).promise;

  const pages: Array<{ pageNumber: number; text: string }> = [];
  let totalChars = 0;

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const items = Array.isArray(content.items) ? (content.items as any[]) : [];

    const byLine = new Map<number, Array<{ x: number; str: string }>>();

    for (const it of items) {
      const str = typeof it?.str === "string" ? it.str : "";
      if (!str.trim()) continue;

      const transform = Array.isArray(it?.transform) ? (it.transform as number[]) : null;
      const x = transform?.[4] ?? 0;
      const y = transform?.[5] ?? 0;

      const key = Math.round(y / 2) * 2;

      const bucket = byLine.get(key) ?? [];
      bucket.push({ x, str });
      byLine.set(key, bucket);
    }

    const sortedLines = Array.from(byLine.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) => {
        const line = parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        return line;
      })
      .filter(Boolean);

    const text = sortedLines.join("\n").trim();

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

function trimPagesForApi(pages: Array<{ pageNumber: number; text: string }>, opts?: { maxPages?: number; maxCharsPerPage?: number; maxTotalChars?: number }) {
  const maxPages = opts?.maxPages ?? 15;
  const maxCharsPerPage = opts?.maxCharsPerPage ?? 2500;
  const maxTotalChars = opts?.maxTotalChars ?? 45000;

  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const limitedPages = sorted.slice(0, maxPages);

  let total = 0;
  let trimmed = false;

  const out = limitedPages.map((p) => {
    const raw = p.text || "";
    const perPage = raw.length > maxCharsPerPage ? raw.slice(0, maxCharsPerPage) : raw;
    if (perPage.length !== raw.length) trimmed = true;

    const remaining = Math.max(0, maxTotalChars - total);
    const finalText = perPage.length > remaining ? perPage.slice(0, remaining) : perPage;

    if (finalText.length !== perPage.length) trimmed = true;

    total += finalText.length;

    return { pageNumber: p.pageNumber, text: finalText };
  });

  if (sorted.length > maxPages) trimmed = true;

  return { pages: out.filter((p) => p.text.length > 0), trimmed, totalChars: total, originalPages: sorted.length };
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

const WorkingTableRow = ({
  a,
  onOptimisticUpdate,
  onSave
}: {
  a: ApportionmentRow;
  onOptimisticUpdate: (patch: Partial<ApportionmentRow>) => void;
  onSave: (patch: Partial<ApportionmentRow>) => void;
}) => {
  const total = safeNumber(a.total_source_cost) ?? 0;
  const pct = safeNumber(a.claimable_percent) ?? 0;
  const amt = roundMoney(safeNumber(a.claimable_amount) ?? 0);

  const [localPct, setLocalPct] = useState<string>(pct === 0 ? "" : String(roundMoney(pct * 100)));
  const [localAmt, setLocalAmt] = useState<string>(amt === 0 ? "" : amt.toFixed(2));

  // Sync from external state when it changes (e.g. from DB refresh)
  useEffect(() => {
    setLocalPct(pct === 0 ? "" : String(roundMoney(pct * 100)));
    setLocalAmt(amt === 0 ? "" : amt.toFixed(2));
  }, [pct, amt]);

  const handlePctChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPct(e.target.value);
  };

  const handlePctBlur = () => {
    const raw = localPct === "" ? null : Number(localPct);
    const nextPct = raw !== null ? Math.max(0, Math.min(100, raw)) / 100 : 0;
    const nextAmt = roundMoney(total * nextPct);
    setLocalPct(nextPct === 0 ? "" : String(roundMoney(nextPct * 100)));
    setLocalAmt(nextAmt === 0 ? "" : nextAmt.toFixed(2));
    onOptimisticUpdate({ claimable_percent: nextPct, claimable_amount: nextAmt });
    onSave({ claimable_percent: nextPct, claimable_amount: nextAmt });
  };

  const handleAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalAmt(e.target.value);
  };

  const handleAmtBlur = () => {
    const raw = localAmt === "" ? 0 : Number(localAmt);
    let nextAmt = raw;
    if (total < 0) {
      nextAmt = Math.min(0, Math.max(total, nextAmt));
    } else {
      nextAmt = Math.max(0, Math.min(total, nextAmt));
    }
    const nextPct = total !== 0 ? nextAmt / total : 0;
    setLocalAmt(nextAmt === 0 ? "" : nextAmt.toFixed(2));
    setLocalPct(nextPct === 0 ? "" : String(roundMoney(nextPct * 100)));
    onOptimisticUpdate({ claimable_percent: nextPct, claimable_amount: nextAmt });
    onSave({ claimable_percent: nextPct, claimable_amount: nextAmt });
  };

  return (
    <TableRow>
      <TableCell className="min-w-[220px]">
        <Input
          value={a.item_name ?? ""}
          onChange={(e) => onOptimisticUpdate({ item_name: e.target.value })}
          onBlur={(e) => onSave({ item_name: e.target.value })}
        />
      </TableCell>
      <TableCell className="min-w-[160px]">
        <Select
          value={(a.heading as any) ?? "other"}
          onValueChange={(v) => {
            onOptimisticUpdate({ heading: v });
            onSave({ heading: v });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
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
        <Select
          value={(a.category as any) ?? "unknown"}
          onValueChange={(v) => {
            onOptimisticUpdate({ category: v as any });
            onSave({ category: v as any });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="supplier">Supplier</SelectItem>
            <SelectItem value="subcontractor">Subcontractor</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[120px] text-right font-semibold pt-4 bg-muted/20">
        {formatMoney(total)}
      </TableCell>
      <TableCell className="min-w-[120px] text-right">
        <div className="relative">
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className="pr-6 text-right text-blue-600 font-medium"
            value={localPct}
            placeholder="0"
            onChange={handlePctChange}
            onBlur={handlePctBlur}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
        </div>
      </TableCell>
      <TableCell className="min-w-[160px] text-right">
        <Input
          type="number"
          step={0.01}
          className="text-right font-medium"
          value={localAmt}
          placeholder="0.00"
          onChange={handleAmtChange}
          onBlur={handleAmtBlur}
        />
      </TableCell>
      <TableCell className="min-w-[220px]">
        <Textarea
          rows={2}
          value={a.justification ?? ""}
          onChange={(e) => onOptimisticUpdate({ justification: e.target.value })}
          onBlur={(e) => onSave({ justification: e.target.value })}
        />
      </TableCell>
      <TableCell className="min-w-[260px]">
        <Textarea
          rows={2}
          value={a.rd_activity_note ?? ""}
          onChange={(e) => onOptimisticUpdate({ rd_activity_note: e.target.value })}
          onBlur={(e) => onSave({ rd_activity_note: e.target.value })}
        />
      </TableCell>
      <TableCell className="min-w-[260px]">
        <Textarea
          rows={2}
          value={a.reviewer_note ?? ""}
          onChange={(e) => onOptimisticUpdate({ reviewer_note: e.target.value })}
          onBlur={(e) => onSave({ reviewer_note: e.target.value })}
        />
      </TableCell>
      <TableCell className="min-w-[160px]">
        <Select
          value={(a.status as any) ?? "draft"}
          onValueChange={(v) => {
            onOptimisticUpdate({ status: v as any });
            onSave({ status: v as any });
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
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
};

export function ClaimApportionTab(props: {
  claimId: string;
  orgId: string;
  onCostsPushed?: () => Promise<void> | void;
}) {
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [checkedInternalRole, setCheckedInternalRole] = useState(false);
  const [currentInternalRole, setCurrentInternalRole] = useState<string | null>(null);

  const [sourceFiles, setSourceFiles] = useState<SourceFileRow[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [lines, setLines] = useState<ApportionLineRow[]>([]);
  const [apportionments, setApportionments] = useState<ApportionmentRow[]>([]);

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState<string | null>(null);

  const [filterText, setFilterText] = useState("");
  const [showExcluded, setShowExcluded] = useState(false);
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushInProgress, setPushInProgress] = useState(false);
  const [pushMode, setPushMode] = useState<"create-only" | "update-existing">("create-only");
  const [showClearLinesDialog, setShowClearLinesDialog] = useState(false);
  const [showClearWorkingDialog, setShowClearWorkingDialog] = useState(false);
  const [clearingLines, setClearingLines] = useState(false);
  const [addingIncludedToWorking, setAddingIncludedToWorking] = useState(false);
  const [clearAlsoWorking, setClearAlsoWorking] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user ?? null;

        if (!user) {
          if (!cancelled) {
            setCurrentInternalRole(null);
            setCheckedInternalRole(true);
          }
          return;
        }

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("internal_role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[ClaimApportionTab] internal_role lookup error", profileError);
        }

        if (!cancelled) {
          setCurrentInternalRole((profileRow as any)?.internal_role ?? null);
          setCheckedInternalRole(true);
        }
      } catch (error) {
        console.error("[ClaimApportionTab] internal_role lookup unexpected error", error);
        if (!cancelled) {
          setCurrentInternalRole(null);
          setCheckedInternalRole(true);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSources = async () => {
    const rows = (await claimApportionmentService.listSourcesForClaim(props.claimId)) as any[];
    const nextRows = rows as SourceFileRow[];
    setSourceFiles(nextRows);

    const stillExists = selectedSourceId ? nextRows.some((r) => r.id === selectedSourceId) : false;
    if (!stillExists && nextRows.length > 0) {
      setSelectedSourceId(nextRows[0].id);
    }
  };

  const refreshLines = async (sourceId: string) => {
    const rows = (await claimApportionmentService.listLinesForSource(sourceId)) as any[];
    setLines(rows as ApportionLineRow[]);
  };

  const refreshApportionments = async () => {
    const rows = (await claimApportionmentService.listApportionmentsForClaim(props.claimId)) as any[];
    const normalised = rows.map((r) => {
      const total = safeNumber(r.total_source_cost);
      const amt = safeNumber(r.claimable_amount);
      const pct = safeNumber(r.claimable_percent);

      return {
        ...r,
        total_source_cost: total,
        claimable_amount: amt === null ? null : roundMoney(amt),
        claimable_percent: pct
      };
    });

    setApportionments(normalised as ApportionmentRow[]);
  };

  useEffect(() => {
    void refreshSources();
    void refreshApportionments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.claimId]);

  useEffect(() => {
    if (!selectedSourceId) return;
    void refreshLines(selectedSourceId);
     
  }, [selectedSourceId]);

  const selectedSource = useMemo(
    () => sourceFiles.find((s) => s.id === selectedSourceId) ?? null,
    [sourceFiles, selectedSourceId]
  );

  const filteredLines = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const base = showExcluded ? lines : lines.filter((l) => l.include !== false);
    if (!q) return base;
    return base.filter((l) => {
      const hay = [l.raw_name ?? "", l.normalised_name ?? "", l.reference_text ?? "", l.notes ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [filterText, lines, showExcluded]);

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
        file_size_bytes: file.size,
        uploaded_by: sessionData.session.user.id,
        uploaded_at: new Date().toISOString(),
        parse_status: "uploaded",
        confidence: null
      };

      const created = await claimApportionmentService.createSource(payload);

      toast({ title: "Uploaded", description: "File uploaded. Click Parse to extract lines." });

      await refreshSources();
      if (created?.id) {
        setSelectedSourceId(created.id);
      }
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
      await claimApportionmentService.deleteSource(source.id);
      if (selectedSourceId === source.id) {
        setSelectedSourceId("");
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
      await claimApportionmentService.updateSource(source.id, { parse_status: "parsing" } as any);
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

      const { pages: trimmedPages, trimmed, totalChars, originalPages } = trimPagesForApi(pages, {
        maxPages: 250,
        maxCharsPerPage: 15000,
        maxTotalChars: 3000000
      });

      if (trimmed) {
        toast({
          title: "Large document trimmed for parsing",
          description: `To avoid timeouts, only part of the extracted text was sent (pages: ${Math.min(originalPages, 40)}/${originalPages}, chars: ${totalChars.toLocaleString()}). If results look incomplete, upload a smaller PDF or split it.`,
          variant: "default"
        });
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

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
          pages: trimmedPages.length ? trimmedPages : [{ pageNumber: 1, text: "" }],
          filename: source.file_name ?? "file",
          fileType: source.file_type ?? fileType
        })
      });

      const rawBody = await structRes.text();

      let structJson: any = null;
      let structTextPreview = "";

      try {
        structJson = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        structTextPreview = (rawBody || "").slice(0, 500);
      }

      if (!structRes.ok || structJson?.ok !== true) {
        const apiError = structJson?.error || structJson?.message || `Parse failed (HTTP ${structRes.status})`;
        const hint = structJson?.hint ? `\n${structJson.hint}` : "";

        const contentType = structRes.headers.get("content-type") || "unknown";
        const previewBody =
          structTextPreview ||
          (rawBody ? rawBody.slice(0, 500) : "[empty response body]");

        const preview = `\nResponse: HTTP ${structRes.status} (${contentType})\nResponse preview: ${previewBody}`;

        throw new Error(`${apiError}${hint}${preview}`.trim());
      }

      if (structJson?.degraded === true) {
        toast({
          title: "Parsed (quick fallback)",
          description:
            "A fast fallback parser was used due to a timeout. The extracted lines may be incomplete — review them carefully, and you can re-parse later for a higher-quality extraction.",
          variant: "default"
        });
      }

      const structured = structJson.result;

      const parsedLines: ParsedLineInput[] = (structured?.lines || []).map((l: any, idx: number) => ({
        lineIndex: idx,
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
        sourceId: source.id,
        lines: parsedLines
      });

      // Auto-cleanup unapproved working rows from previous parses of this file
      await claimApportionmentService.clearWorkingApportionmentsForSource({
        claimId: props.claimId,
        sourceId: source.id,
        keepApproved: true
      });

      const supersededNote = `Superseded by re-parse on ${new Date().toISOString()}`;
      await supabase
        .from("claim_apportionment_lines")
        .update({
          include: false,
          notes: supersededNote,
          updated_at: new Date().toISOString()
        } as any)
        .eq("claim_id", props.claimId)
        .eq("source_id", source.id)
        .gte("line_index", parsedLines.length);

      const avgConfidenceRaw =
        parsedLines.length > 0
          ? parsedLines.reduce((s, l) => s + (l.confidence ?? 0.5), 0) / parsedLines.length
          : null;

      await claimApportionmentService.updateSource(source.id, {
        parse_status: "parsed",
        confidence: avgConfidenceRaw !== null ? clamp(avgConfidenceRaw, 0, 1) : null
      } as any);

      toast({ title: "Parsed", description: "Extracted lines are ready for review and editing." });
      await refreshSources();
      if (selectedSourceId === source.id) {
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
        await claimApportionmentService.updateSource(source.id, { parse_status: "error" } as any);
        await refreshSources();
      } catch {
        // ignore
      }
    } finally {
      setParsing(null);
    }
  };

  const handleClearExtractedLines = async () => {
    if (!selectedSourceId) return;
    setClearingLines(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast({
          title: "Not authenticated",
          description: "Please log in and try again.",
          variant: "destructive"
        });
        return;
      }

      const clearedNote = `Cleared before re-parse on ${new Date().toISOString()}`;

      const { error: clearError } = await supabase
        .from("claim_apportionment_lines")
        .update({
          include: false,
          notes: clearedNote,
          updated_at: new Date().toISOString()
        } as any)
        .eq("claim_id", props.claimId)
        .eq("source_id", selectedSourceId);

      if (clearError) throw clearError;

      const { error: sourceError } = await supabase
        .from("claim_apportionment_sources")
        .update({
          parse_status: "uploaded",
          confidence: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", selectedSourceId);

      if (sourceError) throw sourceError;

      let clearedWorkingRows = 0;
      if (clearAlsoWorking) {
        clearedWorkingRows = await claimApportionmentService.clearWorkingApportionmentsForSource({
          claimId: props.claimId,
          sourceId: selectedSourceId,
          keepApproved: true
        });
      }

      toast({
        title: "Cleared extracted lines",
        description: clearAlsoWorking
          ? `Extracted lines cleared. Removed ${clearedWorkingRows} working row${clearedWorkingRows === 1 ? "" : "s"} for this file (approved rows kept). You can now click Parse selected to re-parse this file.`
          : "You can now click Parse selected to re-parse this file."
      });

      setShowClearLinesDialog(false);
      await refreshSources();
      await refreshLines(selectedSourceId);
      await refreshApportionments();
    } catch (error: any) {
      console.error("[ClaimApportionTab] clear extracted lines error", error);
      toast({
        title: "Clear failed",
        description: error?.message ?? "Unexpected error",
        variant: "destructive"
      });
    } finally {
      setClearingLines(false);
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

    const total = safeNumber(line.net_total) ?? safeNumber(line.gross_total) ?? safeNumber(line.debit_total) ?? safeNumber(line.credit_total) ?? 0;
    const itemName = (line.normalised_name || line.raw_name || "").toString();

    await claimApportionmentService.upsertApportionment({
      claim_id: props.claimId,
      org_id: props.orgId,
      source_line_id: line.id,
      source_id: line.source_id,
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

  const handleAddIncludedToWorking = async () => {
    if (!selectedSourceId) return;
    setAddingIncludedToWorking(true);
    try {
      const existingLineIds = new Set(
        apportionments.map((a) => a.source_line_id).filter((v): v is string => typeof v === "string" && v.length > 0)
      );

      const toAdd = lines.filter((l) => l.source_id === selectedSourceId && l.include !== false && !!l.id && !existingLineIds.has(l.id));

      if (toAdd.length === 0) {
        toast({
          title: "Nothing to add",
          description: "All included lines are already in the working table (or there are no included lines)."
        });
        return;
      }

      const payload = toAdd.map((line) => {
        const total = safeNumber(line.net_total) ?? safeNumber(line.gross_total) ?? safeNumber(line.debit_total) ?? safeNumber(line.credit_total) ?? 0;
        const itemName = (line.normalised_name || line.raw_name || "").toString();

        return {
          claim_id: props.claimId,
          org_id: props.orgId,
          source_line_id: line.id,
          source_id: line.source_id,
          item_name: itemName,
          heading: "other",
          category: (line.category as any) || "unknown",
          total_source_cost: total,
          claimable_percent: 0,
          claimable_amount: 0,
          status: "draft"
        };
      });

      // Bulk insert in chunks to handle thousands of rows instantly
      for (let i = 0; i < payload.length; i += 150) {
        const chunk = payload.slice(i, i + 150);
        const { error } = await supabase.from("claim_apportionments").insert(chunk);
        if (error) throw error;
      }

      toast({
        title: "Added to working table",
        description: `Added ${toAdd.length} line${toAdd.length === 1 ? "" : "s"} as draft working rows. You can now set Status = Approved there.`
      });
      await refreshApportionments();
    } catch (error: any) {
      console.error("[ClaimApportionTab] add included to working failed", error);
      toast({
        title: "Add failed",
        description: error?.message ?? "Unexpected error",
        variant: "destructive"
      });
    } finally {
      setAddingIncludedToWorking(false);
    }
  };

  const safeUpdateApportionment = async (id: string, patch: Partial<ApportionmentRow>) => {
    try {
      await claimApportionmentService.updateApportionment(id, patch as any);
    } catch (error: any) {
      console.error("[ClaimApportionTab] update working row failed", { error, rowId: id, patch });
      toast({
        title: "Save failed",
        description: error?.message ?? "Failed to save changes",
        variant: "destructive"
      });
      await refreshApportionments();
    }
  };

  const approvedToPush = useMemo(() => {
    return apportionments.filter((a) => String(a.status || "").trim().toLowerCase() === "approved");
  }, [apportionments]);

  const handlePushApproved = async () => {
    setPushInProgress(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;

      if (approvedToPush.length === 0) {
        toast({
          title: "Nothing to push",
          description: "Set one or more working rows to Status = Approved, then try again."
        });
        return;
      }

      if (!userId) {
        toast({
          title: "Not authenticated",
          description: "Please log in and try again.",
          variant: "destructive"
        });
        return;
      }

      if (checkedInternalRole && !currentInternalRole) {
        toast({
          title: "Cannot push to Costs",
          description:
            "Pushing creates rows in the Costs table (claim_costs), which is restricted to internal staff accounts. Your profile is not marked as internal staff (profiles.internal_role is empty). Ask an admin to update your user, or log in with a staff account.",
          variant: "destructive"
        });
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("internal_role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("[ClaimApportionTab] profile lookup error", profileError);
      }

      const internalRole = (profileRow as any)?.internal_role ?? null;
      if (!internalRole) {
        toast({
          title: "Cannot push to Costs",
          description:
            "Your account does not have staff permissions to create/update claim costs. Ask an RD staff user to push approved items, or log in with a staff account.",
          variant: "destructive"
        });
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
        const amount = roundMoney(
          clamp(safeNumber(row.claimable_amount) ?? 0, 0, safeNumber(row.total_source_cost) ?? 0)
        );

        const sourceFile = sourceFiles.find((s) => s.id === row.source_id);
        const sourceRefParts = [sourceFile?.file_name ? `Source: ${sourceFile.file_name}` : null].filter(Boolean);

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

          if (error) {
            console.error("[ClaimApportionTab] claim_costs update error", { error, claimCostId: link.claim_cost_id, rowId: row.id });
            throw error;
          }

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

          if (error) {
            console.error("[ClaimApportionTab] claim_costs insert error", { error, rowId: row.id, costType, amount });
            throw error;
          }

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

      const msg = String(error?.message ?? "");
      const code = typeof error?.code === "string" ? error.code : "";
      const details = typeof error?.details === "string" ? error.details : "";
      const hint = typeof error?.hint === "string" ? error.hint : "";

      const isPermission = /permission denied|not authorized|rls/i.test([msg, code, details].join(" "));

      const diagnosticParts = [
        code ? `Code: ${code}` : null,
        details ? `Details: ${details}` : null,
        hint ? `Hint: ${hint}` : null
      ].filter(Boolean);

      toast({
        title: "Push failed",
        description: isPermission
          ? `Permission denied creating/updating claim costs. Make sure you’re logged in as an internal staff user.${diagnosticParts.length ? `\n${diagnosticParts.join("\n")}` : ""}`
          : `${msg || "Unexpected error"}${diagnosticParts.length ? `\n${diagnosticParts.join("\n")}` : ""}`,
        variant: "destructive"
      });
    } finally {
      setPushInProgress(false);
    }
  };

  const handleMergeDuplicates = async () => {
    if (!selectedSourceId) return;

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
          await saveLineEdit(other, {
            include: false,
            notes: [other.notes, "Merged into primary"].filter(Boolean).join(" • ")
          });
        }
      }

      toast({ title: "Merged", description: "Duplicate names merged into primary rows (others excluded)." });
      await refreshLines(selectedSourceId);
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
            <CardDescription>Upload cost documents (PDFs, scanned PDFs, images/photos). Parse them into editable lines.</CardDescription>
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedSource || parsing === selectedSource.id}
                  onClick={() => {
                    if (selectedSource) void handleParse(selectedSource);
                  }}
                >
                  {parsing === selectedSource?.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Parse selected
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedSourceId || clearingLines}
                  onClick={() => setShowClearLinesDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                  Clear lines
                </Button>
                <Button type="button" variant="outline" disabled={uploading} onClick={() => void refreshSources()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {sourceFiles.length === 0 ? (
              <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">No source files yet. Upload a PDF or image to begin.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
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
                        className={s.id === selectedSourceId ? "bg-muted/40" : undefined}
                        onClick={() => setSelectedSourceId(s.id)}
                      >
                        <TableCell className="max-w-[220px] truncate font-medium">{s.file_name || "Untitled"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{(s.file_type || "").includes("pdf") ? "PDF" : s.file_type || "file"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.uploaded_at ? new Date(s.uploaded_at).toLocaleDateString("en-GB") : "—"}</TableCell>
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
            <div className="rounded-md border bg-background/40 p-3 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Rows needing review</p>
              <p className="text-lg font-semibold">{summary.needingReview}</p>
              <p className="text-[11px] text-muted-foreground">Confidence &lt; 60%.</p>
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
          <CardDescription>Review and correct extracted rows before they affect any claim costs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <Label>Search / filter</Label>
              <Input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Search name, reference or notes..." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedSourceId || addingIncludedToWorking}
                onClick={() => void handleAddIncludedToWorking()}
              >
                {addingIncludedToWorking ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                    "Add included to working table"
                  )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (typeof document === "undefined") return;
                  document.getElementById("apportion-working-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                Jump to working table
              </Button>
              <label className="flex items-center gap-2 rounded-md border bg-background/40 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={showExcluded}
                  onChange={(e) => setShowExcluded(e.target.checked)}
                />
                Show excluded
              </label>
              <Button type="button" variant="outline" disabled={!selectedSourceId} onClick={() => void handleMergeDuplicates()}>
                Merge duplicate names
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedSourceId}
                onClick={() => {
                  if (selectedSourceId) void refreshLines(selectedSourceId);
                }}
              >
                Refresh lines
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedSourceId || clearingLines}
                onClick={() => setShowClearLinesDialog(true)}
              >
                Clear extracted lines
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            To approve/push: add items to the <span className="font-medium text-foreground">Apportionment Working Table</span>, set{" "}
            <span className="font-medium text-foreground">Status = Approved</span>, then push approved items to Costs.
          </div>

          {selectedSource && filteredLines.length > 0 && apportionments.length === 0 ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm">
              <p className="font-medium text-foreground">No working rows yet</p>
              <p className="mt-1 text-muted-foreground">
                Extracted lines can’t be approved directly. First add the relevant lines into the working table, then set Status = Approved there.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedSourceId || addingIncludedToWorking}
                  onClick={() => void handleAddIncludedToWorking()}
                >
                  {addingIncludedToWorking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add included to working table"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (typeof document === "undefined") return;
                    document.getElementById("apportion-working-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Jump to working table
                </Button>
              </div>
            </div>
          ) : null}

          {!selectedSource ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">Select a source file to view extracted lines.</div>
          ) : filteredLines.length === 0 ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">No extracted lines yet. Click Parse on a source file.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Include</TableHead>
                    <TableHead>Working</TableHead>
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
                              if (selectedSourceId) await refreshLines(selectedSourceId);
                            } catch (error: any) {
                              toast({ title: "Update failed", description: error?.message ?? "Unexpected error", variant: "destructive" });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            void ensureWorkingRowForLine(l);
                            if (typeof document !== "undefined") {
                              setTimeout(() => {
                                document.getElementById("apportion-working-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }, 150);
                            }
                          }}
                        >
                          Add
                        </Button>
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
                              if (selectedSourceId) await refreshLines(selectedSourceId);
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
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Totals:</TableCell>
                    <TableCell className="text-right font-bold bg-muted/20">
                      {formatMoney(apportionments.reduce((sum, a) => sum + (safeNumber(a.total_source_cost) || 0), 0))}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {formatMoney(apportionments.reduce((sum, a) => sum + (safeNumber(a.claimable_amount) || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="apportion-working-table">
        <CardHeader>
          <CardTitle>Apportionment Working Table</CardTitle>
          <CardDescription>Set claimable % and rationale. Only approved items can be pushed to Costs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Approved rows: <span className="font-semibold text-foreground">{approvedToPush.length}</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowClearWorkingDialog(true)}
                disabled={apportionments.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                Clear unapproved
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPushDialog(true)}
                disabled={approvedToPush.length === 0 || (checkedInternalRole && !currentInternalRole)}
              >
                <Download className="mr-2 h-4 w-4" />
                Push approved items to Costs tab
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            To approve/push: add items to the <span className="font-medium text-foreground">Apportionment Working Table</span>, set{" "}
            <span className="font-medium text-foreground">Status = Approved</span>, then push approved items to Costs.
          </div>

          {approvedToPush.length === 0 ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
              To enable push: set at least one working row’s <span className="font-medium text-foreground">Status</span> to{" "}
              <span className="font-medium text-foreground">Approved</span>.
            </div>
          ) : checkedInternalRole && !currentInternalRole ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
              Pushing to Costs is restricted to internal staff accounts. Your user isn’t marked as internal staff (profiles.internal_role is empty).
            </div>
          ) : null}

          {apportionments.length === 0 ? (
            <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
              No working rows yet. To approve/push, first add items from Extracted Lines (use the per-row “Add” button, or “Add included to working table”), then set Status = Approved in the working table.
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-md border pb-4">
              <Table className="w-full min-w-[1600px]">
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
                  {apportionments.map((a) => (
                    <WorkingTableRow
                      key={a.id}
                      a={a}
                      onOptimisticUpdate={(patch) => {
                        setApportionments((prev) =>
                          prev.map((x) => (x.id === a.id ? { ...x, ...patch } : x))
                        );
                      }}
                      onSave={(patch) => void safeUpdateApportionment(a.id, patch)}
                    />
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Totals:</TableCell>
                    <TableCell className="text-right font-bold bg-muted/20">
                      {formatMoney(apportionments.reduce((sum, a) => sum + (safeNumber(a.total_source_cost) || 0), 0))}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {formatMoney(apportionments.reduce((sum, a) => sum + (safeNumber(a.claimable_amount) || 0), 0))}
                    </TableCell>
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
                </TableFooter>
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
              This will create cost entries for approved rows (or update existing pushed costs if you choose). It will not overwrite user-entered costs without your confirmation here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-background/40 p-3 text-sm">
              <p>
                Approved rows: <span className="font-semibold">{approvedToPush.length}</span>
              </p>
              <p className="text-xs text-muted-foreground">You can run this multiple times. Each apportionment row keeps an audit link to the cost item that was created.</p>
            </div>

            {checkedInternalRole && !currentInternalRole ? (
              <div className="rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Blocked</p>
                <p className="mt-1">
                  Your account isn’t marked as internal staff (profiles.internal_role is empty), so Supabase will block writing to claim_costs.
                </p>
              </div>
            ) : null}

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
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handlePushApproved()}
              disabled={pushInProgress || (checkedInternalRole && !currentInternalRole) || approvedToPush.length === 0}
            >
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

      <Dialog open={showClearWorkingDialog} onOpenChange={setShowClearWorkingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all unapproved working rows?</DialogTitle>
            <DialogDescription>
              This will instantly delete all Draft, Reviewed, and Excluded rows from the working table for this claim. 
              Approved rows will be kept safe.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowClearWorkingDialog(false)} disabled={clearingLines}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                const toDelete = apportionments.filter(a => a.status !== "approved");
                const ids = toDelete.map(a => a.id);
                if (ids.length === 0) {
                  toast({ title: "Nothing to clear", description: "No unapproved rows found." });
                  setShowClearWorkingDialog(false);
                  return;
                }
                
                // 1. Optimistically clear the UI instantly
                setApportionments(prev => prev.filter(a => a.status === "approved"));
                setShowClearWorkingDialog(false);
                toast({ title: "Clearing...", description: `Removing ${ids.length} rows in the background.` });
                
                try {
                  // 2. Safely delete in small batches
                  for (let i = 0; i < ids.length; i += 20) {
                    const chunk = ids.slice(i, i + 20);
                    await supabase.from("claim_apportionment_cost_links").delete().in("apportionment_id", chunk);
                    const { error } = await supabase.from("claim_apportionments").delete().in("id", chunk);
                    if (error) throw error;
                  }
                  toast({ title: "Cleared", description: `Successfully removed ${ids.length} rows.` });
                } catch (error: any) {
                  console.error("Clear working rows failed", error);
                  toast({ title: "Clear incomplete", description: error?.message || "Some rows may not have been removed", variant: "destructive" });
                  // Rollback UI to actual DB state if it failed
                  await refreshApportionments();
                }
              }}
            >
              Clear {apportionments.filter(a => a.status !== "approved").length} rows
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearLinesDialog} onOpenChange={setShowClearLinesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear extracted lines?</DialogTitle>
            <DialogDescription>
              This will clear all extracted lines for the currently selected file so you can parse it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <input
              type="checkbox"
              id="clear-also-working"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={clearAlsoWorking}
              onChange={(e) => setClearAlsoWorking(e.target.checked)}
            />
            <Label htmlFor="clear-also-working" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Also remove any unapproved Working Table rows linked to this file
            </Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowClearLinesDialog(false)} disabled={clearingLines}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleClearExtractedLines()}
              disabled={clearingLines}
            >
              {clearingLines ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                "Clear lines"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}