import React, { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useRouter } from "next/router";
import { claimService, type ClaimWithDetails } from "@/services/claimService";
import { claimCompletionStatusService } from "@/services/claimCompletionStatusService";
import { MessageWidget } from "@/components/MessageWidget";
import { Button } from "@/components/ui/button";
import { ChevronRight, PoundSterling } from "lucide-react";

type StageStatus = "not_started" | "in_progress" | "complete" | "blocked" | null | undefined;

function getStatusColor(status: StageStatus): string {
  switch (status) {
    case "complete":
      return "bg-emerald-500/90 text-white";
    case "in_progress":
      return "bg-amber-400/90 text-slate-900";
    case "blocked":
      return "bg-rose-500/90 text-white";
    case "not_started":
    default:
      return "bg-slate-200 text-slate-700";
  }
}

function StatusBox({
  label,
  status,
}: {
  label: string;
  status: StageStatus;
}) {
  return (
    <div
      className={`inline-flex min-w-[80px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold shadow-sm ${getStatusColor(
        status
      )}`}
    >
      {label}
    </div>
  );
}

interface BoardRow {
  claim: ClaimWithDetails;
  techStatus: StageStatus;
  costStatus: StageStatus;
  qaStatus: StageStatus;
  draftStatus: StageStatus;
  finalStatus: StageStatus;
  estimatedValue: number;
  latestConversation: string | null;
}

export default function StaffHomePage() {
  const router = useRouter();
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const claims = await claimService.getAllClaims();
        const completionByClaim =
          await claimCompletionStatusService.getForClaims(
            claims.map((c) => c.id)
          );

        const nextRows: BoardRow[] = claims.map((claim) => {
          const completion = completionByClaim[claim.id];

          const techStatus: StageStatus =
            (completion?.technical_status as StageStatus) ?? "not_started";
          const costStatus: StageStatus =
            (completion?.cost_status as StageStatus) ?? "not_started";
          const qaStatus: StageStatus =
            (completion?.qa_status as StageStatus) ?? "not_started";

          // Use the actual ClaimWithDetails fields that exist on the type
          const hasDraft =
            // prefer explicit completion status when present
            !!completion?.draft_status
              ? (completion.draft_status as StageStatus) === "complete"
              : Boolean(
                  // fall back to whatever draft indicator the claim type exposes
                  (claim as any).draft_pdf_url ??
                    (claim as any).draft_document_url ??
                    (claim as any).draft_document_path
                );

          const hasFinal =
            !!completion?.final_status
              ? (completion.final_status as StageStatus) === "complete"
              : Boolean(
                  (claim as any).final_pdf_url ??
                    (claim as any).final_document_url ??
                    (claim as any).final_document_path
                );

          const draftStatus: StageStatus =
            (completion?.draft_status as StageStatus) ??
            (hasDraft ? "complete" : "not_started");

          const finalStatus: StageStatus =
            (completion?.final_status as StageStatus) ??
            (hasFinal ? "complete" : "not_started");

          const estimatedValue =
            (claim as any).estimated_benefit ??
            (claim as any).estimated_value ??
            0;

          const latestConversation =
            (claim as any).latest_conversation_summary ??
            (claim as any).latest_conversation ??
            null;

          return {
            claim,
            techStatus,
            costStatus,
            qaStatus,
            draftStatus,
            finalStatus,
            estimatedValue,
            latestConversation,
          };
        });

        setRows(nextRows);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <StaffLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Claims Board
            </h1>
            <p className="text-sm text-slate-500">
              Monday-style view of all active claims with completion status.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/staff/claims")}
          >
            View list
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading claims…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No claims to display.
            </div>
          ) : (
            <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Conversation</th>
                  <th className="px-4 py-3 text-left">Tech</th>
                  <th className="px-4 py-3 text-left">Cost</th>
                  <th className="px-4 py-3 text-left">QA</th>
                  <th className="px-4 py-3 text-left">Draft</th>
                  <th className="px-4 py-3 text-left">Final</th>
                  <th className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <PoundSterling className="h-3 w-3" />
                      <span>Est. Value</span>
                    </div>
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.claim.id}
                    className="border-b last:border-0 hover:bg-slate-50/80"
                    onClick={() =>
                      router.push(`/staff/claims/${row.claim.id}`)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {row.claim.organisations?.name || "Unknown client"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.claim.organisations?.organisation_code}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {row.claim.claim_year}
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top text-xs text-slate-600">
                      {row.latestConversation || (
                        <span className="text-slate-400">
                          No recent notes
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBox label="Tech" status={row.techStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBox label="Cost" status={row.costStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBox label="QA" status={row.qaStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBox label="Draft" status={row.draftStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBox label="Final" status={row.finalStatus} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {row.estimatedValue > 0 ? (
                        new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                          maximumFractionDigits: 0,
                        }).format(row.estimatedValue)
                      ) : (
                        <span className="text-xs font-normal text-slate-400">
                          Not set
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        <MessageWidget
                          entityType="claim"
                          entityId={row.claim.id}
                          entityName={`${row.claim.organisations?.name || "Claim"} - FY ${
                            row.claim.claim_year
                          }`}
                        />
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </StaffLayout>
  );
}