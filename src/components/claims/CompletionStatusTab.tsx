import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import type { ClaimWithDetails } from "@/services/claimService";
import {
  claimCompletionStatusService,
  type ClaimCompletionStatus,
  type ClaimStepStatus
} from "@/services/claimCompletionStatusService";
import { format } from "date-fns";

interface CompletionStatusTabProps {
  claim: ClaimWithDetails;
}

function getBadgeClasses(status: ClaimStepStatus): string {
  if (status === "complete") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

function computeStepStatus(notes: string, complete: boolean): ClaimStepStatus {
  if (complete) return "complete";
  if (notes.trim().length > 0) return "in_progress";
  return "not_started";
}

export function CompletionStatusTab({ claim }: CompletionStatusTabProps) {
  const { toast } = useToast();
  const { user } = useApp();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ClaimCompletionStatus | null>(null);

  const [technicalNotes, setTechnicalNotes] = useState("");
  const [technicalComplete, setTechnicalComplete] = useState(false);

  const [costNotes, setCostNotes] = useState("");
  const [costComplete, setCostComplete] = useState(false);

  const [qaNotes, setQaNotes] = useState("");
  const [qaComplete, setQaComplete] = useState(false);

  useEffect(() => {
    const loadStatus = async () => {
      if (!claim.id) return;
      try {
        setLoading(true);
        let current = await claimCompletionStatusService.getForClaim(claim.id);

        // If no row yet, create a default one
        if (!current) {
          current = await claimCompletionStatusService.upsertForClaim(
            claim.id,
            {}
          );
        }

        // If draft / final PDFs already exist on the claim but status is still not_started,
        // align the completion record with reality.
        const updates: Partial<ClaimCompletionStatus> = {};

        if (
          claim.draft_pdf_url &&
          current.draft_status === "not_started"
        ) {
          updates.draft_status = "complete";
          updates.draft_completed_at = current.draft_completed_at ?? new Date().toISOString();
          updates.draft_document_id = current.draft_document_id ?? claim.draft_pdf_url;
          updates.draft_completed_by = current.draft_completed_by ?? (user?.id ?? null);
        }

        if (
          claim.final_pdf_url &&
          current.final_status === "not_started"
        ) {
          updates.final_status = "complete";
          updates.final_completed_at = current.final_completed_at ?? new Date().toISOString();
          updates.final_document_id = current.final_document_id ?? claim.final_pdf_url;
          updates.final_completed_by = current.final_completed_by ?? (user?.id ?? null);
        }

        if (Object.keys(updates).length > 0) {
          current = await claimCompletionStatusService.upsertForClaim(
            claim.id,
            updates
          );
        }

        setStatus(current);
        setTechnicalNotes(current.technical_notes ?? "");
        setTechnicalComplete(current.technical_status === "complete");
        setCostNotes(current.cost_notes ?? "");
        setCostComplete(current.cost_status === "complete");
        setQaNotes(current.qa_notes ?? "");
        setQaComplete(current.qa_status === "complete");
      } catch (error) {
        console.error("[CompletionStatusTab] Failed to load status:", error);
        toast({
          title: "Error",
          description: "Failed to load completion status for this claim.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    void loadStatus();
  }, [claim.id, claim.draft_pdf_url, claim.final_pdf_url, toast, user?.id]);

  const handleSaveSection = async (
    section: "technical" | "cost" | "qa"
  ) => {
    if (!claim.id) return;

    try {
      let notes: string;
      let completeFlag: boolean;

      if (section === "technical") {
        notes = technicalNotes;
        completeFlag = technicalComplete;
      } else if (section === "cost") {
        notes = costNotes;
        completeFlag = costComplete;
      } else {
        notes = qaNotes;
        completeFlag = qaComplete;
      }

      const stepStatus = computeStepStatus(notes, completeFlag);
      const nowIso = new Date().toISOString();
      const userId = user?.id ?? null;

      const update: Partial<ClaimCompletionStatus> = {};

      if (section === "technical") {
        update.technical_status = stepStatus;
        update.technical_notes = notes.trim() || null;
        update.technical_completed_at =
          stepStatus === "complete" ? nowIso : null;
        update.technical_completed_by =
          stepStatus === "complete" ? userId : null;
      } else if (section === "cost") {
        update.cost_status = stepStatus;
        update.cost_notes = notes.trim() || null;
        update.cost_completed_at =
          stepStatus === "complete" ? nowIso : null;
        update.cost_completed_by =
          stepStatus === "complete" ? userId : null;
      } else {
        update.qa_status = stepStatus;
        update.qa_notes = notes.trim() || null;
        update.qa_completed_at =
          stepStatus === "complete" ? nowIso : null;
        update.qa_completed_by =
          stepStatus === "complete" ? userId : null;
      }

      const updated = await claimCompletionStatusService.upsertForClaim(
        claim.id,
        update
      );
      setStatus(updated);

      toast({
        title: "Saved",
        description: "Completion status has been updated."
      });
    } catch (error) {
      console.error("[CompletionStatusTab] Failed to save:", error);
      toast({
        title: "Error",
        description: "Failed to save completion status.",
        variant: "destructive"
      });
    }
  };

  if (loading || !status) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading completion status...
      </div>
    );
  }

  const renderStepBadge = (stepStatus: ClaimStepStatus) => (
    <Badge className={getBadgeClasses(stepStatus)}>
      {stepStatus.replace("_", " ")}
    </Badge>
  );

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "dd MMM yyyy, HH:mm");
  };

  return (
    <div className="space-y-6">
      {/* Technical signoff */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Signoff</CardTitle>
          <CardDescription>
            Capture technical reviewer notes and mark when technical work is complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Status
            </p>
            {renderStepBadge(status.technical_status as ClaimStepStatus)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Technical notes
            </p>
            <Textarea
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Technical signoff notes and comments"
              rows={4}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="technical-complete"
                checked={technicalComplete}
                onCheckedChange={(checked) =>
                  setTechnicalComplete(Boolean(checked))
                }
              />
              <label
                htmlFor="technical-complete"
                className="text-sm leading-none"
              >
                Technical complete
              </label>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleSaveSection("technical")}
              >
                Save technical status
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Completed at: {formatDate(status.technical_completed_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost signoff */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Signoff</CardTitle>
          <CardDescription>
            Cost review, apportionment and fee checks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Status</p>
            {renderStepBadge(status.cost_status as ClaimStepStatus)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Cost signoff notes
            </p>
            <Textarea
              value={costNotes}
              onChange={(e) => setCostNotes(e.target.value)}
              placeholder="Cost signoff notes and comments"
              rows={4}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cost-complete"
                checked={costComplete}
                onCheckedChange={(checked) =>
                  setCostComplete(Boolean(checked))
                }
              />
              <label
                htmlFor="cost-complete"
                className="text-sm leading-none"
              >
                Cost complete
              </label>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleSaveSection("cost")}
              >
                Save cost status
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Completed at: {formatDate(status.cost_completed_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QA signoff */}
      <Card>
        <CardHeader>
          <CardTitle>QA Signoff</CardTitle>
          <CardDescription>
            QA review, risk checks and approval to issue to client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Status</p>
            {renderStepBadge(status.qa_status as ClaimStepStatus)}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              QA comments
            </p>
            <Textarea
              value={qaNotes}
              onChange={(e) => setQaNotes(e.target.value)}
              placeholder="QA comments and risk notes"
              rows={4}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="qa-complete"
                checked={qaComplete}
                onCheckedChange={(checked) => setQaComplete(Boolean(checked))}
              />
              <label
                htmlFor="qa-complete"
                className="text-sm leading-none"
              >
                QA complete
              </label>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleSaveSection("qa")}
              >
                Save QA status
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Completed at: {formatDate(status.qa_completed_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Draft / Final status overview */}
      <Card>
        <CardHeader>
          <CardTitle>Draft &amp; Final Submission Status</CardTitle>
          <CardDescription>
            Automatically updated from draft / final report generation. Read-only here.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Draft submission
            </p>
            <div className="flex items-center justify-between gap-2">
              {renderStepBadge(status.draft_status as ClaimStepStatus)}
              <p className="text-[11px] text-muted-foreground">
                Completed at: {formatDate(status.draft_completed_at)}
              </p>
            </div>
            {status.draft_document_id && (
              <p className="text-[11px] text-muted-foreground break-all">
                Document: {status.draft_document_id}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Final submission
            </p>
            <div className="flex items-center justify-between gap-2">
              {renderStepBadge(status.final_status as ClaimStepStatus)}
              <p className="text-[11px] text-muted-foreground">
                Completed at: {formatDate(status.final_completed_at)}
              </p>
            </div>
            {status.final_document_id && (
              <p className="text-[11px] text-muted-foreground break-all">
                Document: {status.final_document_id}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}