import React, { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useRouter } from "next/router";
import { claimService, type ClaimWithDetails } from "@/services/claimService";
import { claimCompletionStatusService } from "@/services/claimCompletionStatusService";
import { MessageWidget } from "@/components/MessageWidget";
import { Button } from "@/components/ui/button";
import { ChevronRight, PoundSterling } from "lucide-react";
import { messageService } from "@/services/messageService";
import { pipelineService } from "@/services/pipelineService";

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
  status



}: {label: string;status: StageStatus;}) {
  return (
    <div
      className={`inline-flex min-w-[80px] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold shadow-sm ${getStatusColor(
        status
      )}`}>
      
      {label}
    </div>);

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
  projectsCount: number;
  evidenceCount: number;
  companyAddress: string | null;
  companyContact: string | null;
  unreadHistoryCount: number;
}

interface UpcomingClientRow {
  id: string;
  clientName: string;
  organisationCode: string | null;
  expectedFilingDate: string | null;
  daysUntilFiling: number | null;
  predictedRevenue: number | null;
  confidence: number | null;
}

export default function StaffHomePage() {
  const router = useRouter();
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingClients, setUpcomingClients] = useState<UpcomingClientRow[]>([]);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAssignedToMe, setShowAssignedToMe] = useState(false);

  const formatFilingDate = (value: string | null): string => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "-";
    }
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0
    }).format(value);
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const claims = await claimService.getAllClaims(
          showAssignedToMe ? { assigned_to_me: true } : undefined
        );

        const unreadByClaim =
        await messageService.getUnreadCountsForClaims(
          claims.map((c) => c.id)
        );

        const completionByClaim =
        await claimCompletionStatusService.getForClaims(
          claims.map((c) => c.id)
        );

        const nextRows: BoardRow[] = claims.map((claim) => {
          const completion = completionByClaim[claim.id];

          const techStatus: StageStatus =
          completion?.technical_status as StageStatus ?? "not_started";
          const costStatus: StageStatus =
          completion?.cost_status as StageStatus ?? "not_started";
          const qaStatus: StageStatus =
          completion?.qa_status as StageStatus ?? "not_started";

          // Use the actual ClaimWithDetails fields that exist on the type
          const hasDraft =
          // prefer explicit completion status when present
          !!completion?.draft_status ?
          completion.draft_status as StageStatus === "complete" :
          Boolean(
            // fall back to whatever draft indicator the claim type exposes
            (claim as any).draft_pdf_url ??
            (claim as any).draft_document_url ??
            (claim as any).draft_document_path
          );

          const hasFinal =
          !!completion?.final_status ?
          completion.final_status as StageStatus === "complete" :
          Boolean(
            (claim as any).final_pdf_url ??
            (claim as any).final_document_url ??
            (claim as any).final_document_path
          );

          const draftStatus: StageStatus =
          completion?.draft_status as StageStatus ?? (
          hasDraft ? "complete" : "not_started");

          const finalStatus: StageStatus =
          completion?.final_status as StageStatus ?? (
          hasFinal ? "complete" : "not_started");

          // Projects & evidence
          const projectsCount = Array.isArray((claim as any).projects) ?
          (claim as any).projects.length :
          0;
          const evidenceCount =
          typeof (claim as any).document_count === "number" ?
          (claim as any).document_count :
          0;

          // Company details (best-effort, blanks allowed)
          const org: any = (claim as any).organisations ?? {};
          const addressParts = [
          org.address_line1,
          org.address_line2,
          org.city,
          org.postcode].
          filter(Boolean);
          const companyAddress =
          addressParts.length > 0 ? addressParts.join(", ") : null;

          const contactParts = [
          org.contact_name,
          org.contact_email,
          org.contact_phone].
          filter(Boolean);
          const companyContact =
          contactParts.length > 0 ? contactParts.join(" • ") : null;

          // Estimated value – use total_costs coming from client/staff side aggregation
          const totalCosts =
          typeof (claim as any).total_costs === "number" ?
          (claim as any).total_costs :
          Number((claim as any).total_costs || 0);
          const estimatedValue = totalCosts;

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
            projectsCount,
            evidenceCount,
            companyAddress,
            companyContact,
            unreadHistoryCount: unreadByClaim[claim.id] || 0
          };
        });

        setRows(nextRows);

        const upcoming = await pipelineService.getUpcomingClientFilings(30);
        const upcomingRows: UpcomingClientRow[] = upcoming.map((item) => ({
          id: item.pipelineId,
          clientName: item.clientName,
          organisationCode: item.organisationCode,
          expectedFilingDate: item.expectedFilingDate,
          daysUntilFiling: item.daysUntilFiling,
          predictedRevenue: item.predictedRevenue,
          confidence: item.confidence
        }));
        setUpcomingClients(upcomingRows);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [showAssignedToMe]);

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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showAssignedToMe ? "default" : "outline"}
              onClick={() => setShowAssignedToMe((prev) => !prev)}>
              {showAssignedToMe ? "Show all claims" : "My claims only"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/staff/claims")}>
              View list
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          {loading ?
          <div className="py-10 text-center text-sm text-muted-foreground">
              Loading claims…
            </div> :
          rows.length === 0 ?
          <div className="py-10 text-center text-sm text-muted-foreground">
              No claims to display.
            </div> :

          <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">History</th>
                  <th className="px-4 py-3 text-left">BDM</th>
                  <th className="px-4 py-3 text-left">Tech</th>
                  <th className="px-4 py-3 text-left">Cost</th>
                  <th className="px-4 py-3 text-left">QA</th>
                  <th className="px-4 py-3 text-left">Draft</th>
                  <th className="px-4 py-3 text-left">Final</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) =>
              <tr
                key={row.claim.id}
                className="border-b last:border-0 hover:bg-slate-50/80"
                onClick={() =>
                router.push(`/staff/claims/${row.claim.id}`)
                }>
                
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900">
                          {row.claim.organisations?.name || "Unknown client"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.claim.organisations?.organisation_code}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.projectsCount} projects
                          {row.evidenceCount > 0 &&
                      <> • {row.evidenceCount} evidence items</>
                      }
                        </div>
                        <div className="mt-0.5 space-y-0.5 text-[11px] text-slate-500">
                          <div>Address: {row.companyAddress || "-"}</div>
                          <div>Contact: {row.companyContact || "-"}</div>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          <span>BDM: {row.claim.bd_owner?.full_name || "-"}</span>
                          <span>Tech: {row.claim.technical_lead?.full_name || "-"}</span>
                          <span>Cost: {row.claim.cost_lead?.full_name || "-"}</span>
                          <span>QA: {row.claim.qa_reviewer?.full_name || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {row.claim.claim_year}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push({
                        pathname: `/staff/claims/${row.claim.id}`,
                        query: { tab: "history" }
                      });
                    }} style={{ margin: "28px 0px", padding: "20px 6px" }}>
                    
                        <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-707">
                          {row.unreadHistoryCount > 9 ?
                      "9+" :
                      row.unreadHistoryCount}
                        </span>
                        <span>
                          {row.unreadHistoryCount === 0 ?
                      "No new" :
                      "History"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBox label="BDM" status="complete" />
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
                    <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}>
                  
                      <div className="flex items-center justify-end gap-2">
                        <MessageWidget
                      entityType="claim"
                      entityId={row.claim.id}
                      entityName={`${row.claim.organisations?.name || "Claim"} - FY ${
                      row.claim.claim_year}`} />
                    
                    
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          }
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Clients due to submit (next 30 days)
            </h2>
            <p className="text-xs text-slate-500">
              Based on predicted accounts filing dates from Companies House.
            </p>
          </div>

          {upcomingClients.length === 0 ?
          <div className="px-4 py-6 text-sm text-slate-500">
              No clients are predicted to file in the next 30 days.
            </div> :

          <>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Org code</th>
                    <th className="px-4 py-3 text-left">Predicted filing</th>
                    <th className="px-4 py-3 text-left">Days</th>
                    <th className="px-4 py-3 text-left">Est. revenue</th>
                    <th className="px-4 py-3 text-left">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllUpcoming ?
                upcomingClients :
                upcomingClients.slice(0, 5)).
                map((client) =>
                <tr key={client.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-slate-900">
                        {client.clientName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {client.organisationCode || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {formatFilingDate(client.expectedFilingDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {client.daysUntilFiling ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {formatCurrency(client.predictedRevenue)}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {client.confidence != null ?
                    `${client.confidence}%` :
                    "-"}
                      </td>
                    </tr>
                )}
                </tbody>
              </table>

              {upcomingClients.length > 5 &&
            <div className="flex justify-end border-t bg-white px-4 py-2">
                  <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllUpcoming((prev) => !prev)}>
                
                    {showAllUpcoming ? "Show less" : "Show more"}
                  </Button>
                </div>
            }
            </>
          }
        </div>
      </div>
    </StaffLayout>);

}