import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, RefreshCw, Filter, Pencil, Save, X, Download } from "lucide-react";
import { pipelineService } from "@/services/pipelineService";
import type { PipelineWithDetails, MissingCompanyNumberClient } from "@/services/pipelineService";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, eachMonthOfInterval, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  parseAverageFeeCsv,
  buildInternalClients,
  reconcileFeesWithClients } from
"@/services/clientFeeReconciliationService";
import { ProjectGantt } from "@/components/projects/ProjectGantt";

type ClientToBeOnboardedRow =
Database["public"]["Tables"]["clients_to_be_onboarded"]["Row"];

export default function PipelinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingFees, setApplyingFees] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineWithDetails[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [missingCompanies, setMissingCompanies] = useState<MissingCompanyNumberClient[]>([]);

  // Filters
  // Default to a very wide date range so the initial view shows all entries.
  // Users can then narrow the range using the filters.
  const [filterStartDate, setFilterStartDate] = useState("2026-01-01");
  const [filterEndDate, setFilterEndDate] = useState("2027-12-31");
  const [minConfidence, setMinConfidence] = useState(0);

  // Editing State
  const [editingEntry, setEditingEntry] = useState<PipelineWithDetails | null>(null);
  const [editForm, setEditForm] = useState({
    predicted_revenue: 0,
    expected_accounts_filing_date: "",
    filing_confidence_score: 0
  });

  useEffect(() => {
    loadPipeline();
    loadSummary();
  }, [filterStartDate, filterEndDate, minConfidence]);

  useEffect(() => {
    loadMissingCompanies();
  }, []);

  async function loadPipeline() {
    try {
      setLoading(true);
      const data = await pipelineService.getPipelineByDateRange(filterStartDate, filterEndDate);
      const filtered = data.filter((p) => (p.filing_confidence_score || 0) >= minConfidence);
      setPipeline(filtered);
    } catch (error) {
      console.error("Error loading pipeline:", error);
      toast({
        title: "Error",
        description: "Failed to load pipeline data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const data = await pipelineService.getPipelineSummary();
      setSummary(data);
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  }

  async function loadMissingCompanies() {
    try {
      const data = await pipelineService.getClientsMissingCompanyNumber();
      setMissingCompanies(data);
    } catch (error) {
      console.error("Error loading missing company numbers:", error);
    }
  }

  async function handleRefreshAll() {
    try {
      setRefreshing(true);
      await pipelineService.syncPipelineFromClients();
      await pipelineService.refreshAllPipelinePredictions();
      await loadPipeline();
      await loadSummary();
      toast({
        title: "Success",
        description: "Pipeline predictions refreshed"
      });
    } catch (error) {
      console.error("Error refreshing:", error);
      toast({
        title: "Error",
        description: "Failed to refresh predictions",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  }

  function handleDownloadCsv() {
    const params = new URLSearchParams();
    params.set("startDate", filterStartDate);
    params.set("endDate", filterEndDate);
    params.set("minConfidence", String(minConfidence));

    const url = `/api/pipeline/predicted-revenue-by-client?${params.toString()}`;
    window.location.href = url;
  }

  async function handleApplyAverageFees() {
    try {
      setApplyingFees(true);

      const { data: clientRows, error: clientError } = await supabase.
      from("clients_to_be_onboarded").
      select("id, company_name");

      if (clientError) {
        console.error(
          "Error loading clients_to_be_onboarded:",
          clientError
        );
        toast({
          title: "Error",
          description: "Failed to load clients not yet onboarded",
          variant: "destructive"
        });
        return;
      }

      if (!clientRows || clientRows.length === 0) {
        toast({
          title: "No clients found",
          description:
          "There are no clients in the 'clients_to_be_onboarded' list to match against."
        });
        return;
      }

      const res = await fetch(
        "/client_average_claim_fees_for_softgen_v2.csv"
      );
      if (!res.ok) {
        toast({
          title: "Error",
          description:
          "Could not load client_average_claim_fees_for_softgen_v2.csv",
          variant: "destructive"
        });
        return;
      }

      const csvText = await res.text();
      const uploaded = parseAverageFeeCsv(csvText);

      if (uploaded.length === 0) {
        toast({
          title: "No CSV rows",
          description:
          "The average fee CSV did not contain any valid rows."
        });
        return;
      }

      const internalClients = buildInternalClients(
        clientRows as ClientToBeOnboardedRow[]
      );

      const result = reconcileFeesWithClients(
        uploaded,
        internalClients
      );

      let appliedCount = 0;

      for (const match of result.exactMatches) {
        const clientId = match.client.id;
        const fee = match.uploaded.averageClaimFee;
        const placeholderCode = `PL-${clientId.slice(0, 8)}`;

        const { data: org, error: orgError } = await supabase.
        from("organisations").
        select("id").
        eq("organisation_code", placeholderCode).
        maybeSingle();

        if (orgError || !org) {
          console.warn(
            "[Fee Reconciliation] No organisation found for client",
            clientId,
            "placeholderCode",
            placeholderCode,
            orgError
          );
          continue;
        }

        const { data: pipelineEntry, error: pipelineError } =
        await supabase.
        from("pipeline_entries").
        select("id").
        eq("org_id", org.id).
        maybeSingle();

        if (pipelineError || !pipelineEntry) {
          console.warn(
            "[Fee Reconciliation] No pipeline entry found for org",
            org.id,
            pipelineError
          );
          continue;
        }

        const { error: updateError } = await supabase.
        from("pipeline_entries").
        update({ predicted_revenue: fee }).
        eq("id", pipelineEntry.id);

        if (updateError) {
          console.error(
            "[Fee Reconciliation] Failed to update pipeline entry",
            pipelineEntry.id,
            updateError
          );
          continue;
        }

        appliedCount += 1;
      }

      console.log(
        "[Fee Reconciliation] Exact matches applied:",
        result.exactMatches
      );
      console.log(
        "[Fee Reconciliation] Non-exact matches (copy this into chat so we can resolve):",
        {
          suggestedMatches: result.suggestedMatches,
          ambiguousMatches: result.ambiguousMatches,
          noMatches: result.noMatches
        }
      );

      toast({
        title: "Average fees applied",
        description: `Updated ${appliedCount} pipeline entries from exact name matches. Check the browser console for ambiguous or unmatched clients and share here to resolve.`
      });

      await loadPipeline();
      await loadSummary();
    } catch (error) {
      console.error("Error applying average fees:", error);
      toast({
        title: "Error",
        description: "Failed to apply average claim fees",
        variant: "destructive"
      });
    } finally {
      setApplyingFees(false);
    }
  }

  function handleEditClick(entry: PipelineWithDetails, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent navigation
    setEditingEntry(entry);
    setEditForm({
      predicted_revenue: entry.predicted_revenue || 0,
      expected_accounts_filing_date: entry.expected_accounts_filing_date || "",
      filing_confidence_score: entry.filing_confidence_score || 0
    });
  }

  async function handleSaveEdit() {
    if (!editingEntry) return;
    try {
      await pipelineService.updatePipelineEntry(editingEntry.id, {
        predicted_revenue: editForm.predicted_revenue,
        expected_accounts_filing_date: editForm.expected_accounts_filing_date,
        filing_confidence_score: editForm.filing_confidence_score,
        // Also update pipeline start date based on new filing date (1 month prior)
        pipeline_start_date: pipelineService.calculatePipelineStartDate(new Date(editForm.expected_accounts_filing_date)).toISOString().split('T')[0]
      });

      toast({ title: "Saved", description: "Pipeline entry updated successfully" });
      setEditingEntry(null);
      loadPipeline();
      loadSummary();
    } catch (error) {
      console.error("Error updating:", error);
      toast({ title: "Error", description: "Failed to update entry", variant: "destructive" });
    }
  }

  // Expand pipeline so each entry also shows once in the following year
  // (e.g. a 2026 filing also appears in 2027 at the same time) as long as it
  // falls within the current filter end date year.
  const expandedPipeline = useMemo(() => {
    const endYear = parseISO(filterEndDate).getFullYear();
    const result: PipelineWithDetails[] = [];

    for (const entry of pipeline) {
      result.push(entry);

      if (entry.expected_accounts_filing_date && entry.pipeline_start_date) {
        const expected = parseISO(entry.expected_accounts_filing_date);
        const baseYear = expected.getFullYear();
        const nextYear = baseYear + 1;

        if (nextYear <= endYear) {
          const nextExpected = new Date(expected);
          nextExpected.setFullYear(nextYear);

          const pipelineStart = parseISO(entry.pipeline_start_date);
          const nextPipelineStart = new Date(pipelineStart);
          nextPipelineStart.setFullYear(pipelineStart.getFullYear() + 1);

          result.push({
            ...entry,
            id: `${entry.id}-repeat-${nextYear}`,
            expected_accounts_filing_date: nextExpected.
            toISOString().
            split("T")[0],
            pipeline_start_date: nextPipelineStart.
            toISOString().
            split("T")[0]
          } as PipelineWithDetails);
        }
      }
    }

    return result;
  }, [pipeline, filterEndDate]);

  // Generate months for Gantt view
  const startDate = parseISO(filterStartDate);
  const endDate = parseISO(filterEndDate);
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Calculate revenue by month
  const revenueByMonth = months.map((month) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthPipeline = expandedPipeline.filter((p) => {
      if (!p.expected_accounts_filing_date) return false;
      const expectedDate = parseISO(p.expected_accounts_filing_date);
      return expectedDate >= monthStart && expectedDate <= monthEnd;
    });

    const revenue = monthPipeline.reduce(
      (sum, p) => sum + (p.predicted_revenue || 0),
      0
    );

    return { month, revenue, count: monthPipeline.length };
  });

  const maxRevenue = useMemo(
    () =>
      revenueByMonth.reduce(
        (max, m) => (m.revenue > max ? m.revenue : max),
        0
      ),
    [revenueByMonth]
  );

  const totalPipelineRevenue = useMemo(
    () => revenueByMonth.reduce((sum, m) => sum + m.revenue, 0),
    [revenueByMonth]
  );

  function getConfidenceBadge(confidence: number) {
    if (confidence >= 70) return "default"; // dark/black
    if (confidence >= 40) return "secondary"; // gray
    return "destructive"; // red
  }

  return (
    <StaffLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Revenue Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Predicted work based on Companies House filing patterns
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadCsv}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button onClick={handleRefreshAll} disabled={refreshing}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh Predictions
            </Button>
          </div>
        </div>

        {/* Charts section - stacked vertically, with mobile table for small screens */}
        <section className="space-y-4">
          {/* Pipeline Revenue by Month */}
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Pipeline Revenue by Month
                </h2>
                <p className="text-sm text-slate-500">
                  Based on expected filing dates and predicted revenue
                </p>
              </div>
            </div>
            <div className="mt-4">
              {/* Desktop chart */}
              <div className="hidden gap-2 md:flex">
                {revenueByMonth.map((m) => (
                  <div
                    key={m.month.toISOString()}
                    className="flex-1 text-center text-[11px]"
                  >
                    <div className="flex h-40 items-end justify-center">
                      <div className="flex h-full w-4 flex-col justify-end">
                        <div className="mb-1 text-[10px] font-medium text-slate-700">
                          £
                          {m.revenue.toLocaleString("en-GB", {
                            maximumFractionDigits: 0
                          })}
                        </div>
                        <div
                          className="mx-auto w-3 rounded-full bg-emerald-500"
                          style={{
                            height:
                              maxRevenue > 0
                                ? `${Math.max(
                                    8,
                                    (m.revenue / maxRevenue) * 100
                                  )}%`
                                : "8%"
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 font-medium text-slate-700">
                      {format(m.month, "MMM yy")}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {m.count} clients
                    </div>
                  </div>
                ))}
              </div>
              {/* Mobile table */}
              <div className="md:hidden">
                <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Month</th>
                        <th className="px-3 py-2 font-medium">Revenue</th>
                        <th className="px-3 py-2 font-medium">Customers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueByMonth.map((m) => (
                        <tr
                          key={m.month.toISOString()}
                          className="border-t border-slate-100"
                        >
                          <td className="px-3 py-2 text-slate-900">
                            {format(m.month, "MMM yy")}
                          </td>
                          <td className="px-3 py-2 text-slate-900">
                            £
                            {m.revenue.toLocaleString("en-GB", {
                              maximumFractionDigits: 0
                            })}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {m.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md" />
              
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md" />
              
            </div>
            <div>
              <label className="text-sm font-medium">Min Confidence</label>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md">
                
                <option value={0}>All (0%+)</option>
                <option value={40}>Medium (40%+)</option>
                <option value={70}>High (70%+)</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadPipeline} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Monthly Revenue Forecast */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Revenue Forecast</h2>
          <div className="space-y-3">
            {revenueByMonth.map(({ month, revenue, count }) =>
            <div key={month.toISOString()} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-24 font-medium">{format(month, "MMM yyyy")}</div>
                  <Badge variant="outline">{count} customers</Badge>
                </div>
                <div className="text-lg font-semibold" style={{ fontSize: "16px" }}>£{revenue.toLocaleString()}</div>
              </div>
            )}
          </div>
        </Card>

        {/* Gantt-Style Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Pipeline Timeline</h2>
            <Badge variant="outline">{expandedPipeline.length} entries</Badge>
          </div>
          
          {loading ?
          <div className="text-center py-12 text-muted-foreground">Loading pipeline...</div> :
          expandedPipeline.length === 0 ?
          <div className="text-center py-12 text-muted-foreground">
              No pipeline entries found. Customers will appear here when their CIF is complete and claim is enabled.
            </div> :

          <div className="space-y-2">
            <ProjectGantt
              items={expandedPipeline.map((entry) => ({
                id: entry.id,
                name: entry.organisation?.name || "Unknown Organisation",
                start_date: entry.pipeline_start_date,
                end_date: entry.expected_accounts_filing_date
              }))}
            />
          </div>
          }
        </Card>

        {missingCompanies.length > 0 &&
        <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">
              Clients missing Companies House number
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              These clients were skipped from the revenue pipeline because they do not have a company number set.
            </p>
            <div className="space-y-2">
              {missingCompanies.map((client) =>
            <div
              key={`${client.source}-${client.id}`}
              className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
              
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Source:{" "}
                      {client.source === "imported" ?
                  "Imported client" :
                  "Prospect / onboarded client"}
                      {client.org_id ? ` · Org: ${client.org_id}` : ""}
                    </div>
                  </div>
                </div>
            )}
            </div>
          </Card>
        }

        {/* Edit Dialog */}
        <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pipeline Entry</DialogTitle>
              <DialogDescription>
                Manually update predictions for {editingEntry?.organisation?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Predicted Revenue (£)</Label>
                <Input
                  type="number"
                  value={editForm.predicted_revenue}
                  onChange={(e) => setEditForm({ ...editForm, predicted_revenue: Number(e.target.value) })} />
                
              </div>
              <div className="space-y-2">
                <Label>Expected Filing Date</Label>
                <Input
                  type="date"
                  value={editForm.expected_accounts_filing_date}
                  onChange={(e) => setEditForm({ ...editForm, expected_accounts_filing_date: e.target.value })} />
                
              </div>
              <div className="space-y-2">
                <Label>Confidence Score (0-100)</Label>
                <Input
                  type="number"
                  min="0" max="100"
                  value={editForm.filing_confidence_score}
                  onChange={(e) => setEditForm({ ...editForm, filing_confidence_score: Number(e.target.value) })} />
                
                <p className="text-xs text-muted-foreground">
                  Auto-calculated based on {editingEntry?.years_trading} years trading and filing history.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingEntry(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </StaffLayout>);

}