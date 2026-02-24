import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, RefreshCw, Filter, Pencil, Save, X } from "lucide-react";
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
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PipelinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineWithDetails[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [missingCompanies, setMissingCompanies] = useState<MissingCompanyNumberClient[]>([]);
  
  // Filters
  // Default to a very wide date range so the initial view shows all entries.
  // Users can then narrow the range using the filters.
  const [filterStartDate, setFilterStartDate] = useState("2000-01-01");
  const [filterEndDate, setFilterEndDate] = useState("2100-12-31");
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
      const filtered = data.filter(p => (p.filing_confidence_score || 0) >= minConfidence);
      setPipeline(filtered);
    } catch (error) {
      console.error("Error loading pipeline:", error);
      toast({
        title: "Error",
        description: "Failed to load pipeline data",
        variant: "destructive",
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
        description: "Pipeline predictions refreshed",
      });
    } catch (error) {
      console.error("Error refreshing:", error);
      toast({
        title: "Error",
        description: "Failed to refresh predictions",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
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

  // Generate months for Gantt view
  const startDate = parseISO(filterStartDate);
  const endDate = parseISO(filterEndDate);
  const months = eachMonthOfInterval({ start: startDate, end: endDate });

  // Calculate revenue by month
  const revenueByMonth = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthPipeline = pipeline.filter(p => {
      const pipelineDate = new Date(p.pipeline_start_date);
      return pipelineDate >= monthStart && pipelineDate <= monthEnd;
    });
    const revenue = monthPipeline.reduce((sum, p) => sum + (p.predicted_revenue || 0), 0);
    return { month, revenue, count: monthPipeline.length };
  });

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
          <Button onClick={handleRefreshAll} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Predictions
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pipeline</p>
                  <p className="text-3xl font-bold mt-1">£{summary.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Customers</p>
                  <p className="text-3xl font-bold mt-1">{summary.count}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                  <p className="text-3xl font-bold mt-1">{summary.avgConfidence}%</p>
                </div>
                <Filter className="w-8 h-8 text-purple-500" />
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Min Confidence</label>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
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
            {revenueByMonth.map(({ month, revenue, count }) => (
              <div key={month.toISOString()} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-24 font-medium">{format(month, "MMM yyyy")}</div>
                  <Badge variant="outline">{count} customers</Badge>
                </div>
                <div className="text-lg font-semibold">£{revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gantt-Style Timeline */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Pipeline Timeline</h2>
            <Badge variant="outline">{pipeline.length} entries</Badge>
          </div>
          
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading pipeline...</div>
          ) : pipeline.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No pipeline entries found. Customers will appear here when their CIF is complete and claim is enabled.
            </div>
          ) : (
            <div className="space-y-2">
              {pipeline.map((entry) => {
                const pipelineDate = new Date(entry.pipeline_start_date);
                const expectedFilingDate = entry.expected_accounts_filing_date 
                  ? new Date(entry.expected_accounts_filing_date) 
                  : null;
                const confidence = entry.filing_confidence_score || 0;

                return (
                  <div
                    key={entry.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (entry.claim_id) {
                        router.push(`/staff/claims/${entry.claim_id}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-semibold text-lg">
                            {entry.organisation?.name || "Unknown Organisation"}
                          </h3>
                          <Badge variant={getConfidenceBadge(confidence)}>
                            {confidence}% confident
                          </Badge>
                          <Badge
                            variant={entry.claim_id ? "outline" : "secondary"}
                          >
                            {entry.claim_id ? "Onboarded client" : "Client not yet onboarded"}
                          </Badge>
                          {entry.auto_created && (
                            <Badge variant="outline">Auto</Badge>
                          )}
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <span>Pipeline Start: <strong>{format(pipelineDate, "dd MMM yyyy")}</strong></span>
                            {expectedFilingDate && (
                              <span>Expected Filing: <strong>{format(expectedFilingDate, "dd MMM yyyy")}</strong></span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4">
                            <span>Avg Filing Lag: <strong>{entry.average_filing_lag_days || 0} days</strong></span>
                            <span>Years Trading: <strong>{entry.years_trading || 0}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="text-2xl font-bold">
                          £{(entry.predicted_revenue || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 mb-2">
                          Predicted Revenue
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleEditClick(entry, e)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Manual Entry
                        </Button>
                      </div>
                    </div>

                    {/* Visual Timeline Bar */}
                    <div className="mt-4">
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`absolute h-full ${
                            confidence >= 70 ? "bg-green-500" :
                            confidence >= 40 ? "bg-yellow-500" :
                            "bg-red-500"
                          }`}
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {missingCompanies.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">
              Clients missing Companies House number
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              These clients were skipped from the revenue pipeline because they do not have a company number set.
            </p>
            <div className="space-y-2">
              {missingCompanies.map((client) => (
                <div
                  key={`${client.source}-${client.id}`}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                >
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Source:{" "}
                      {client.source === "imported"
                        ? "Imported client"
                        : "Prospect / onboarded client"}
                      {client.org_id ? ` · Org: ${client.org_id}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

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
                  onChange={(e) => setEditForm({...editForm, predicted_revenue: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Filing Date</Label>
                <Input 
                  type="date" 
                  value={editForm.expected_accounts_filing_date} 
                  onChange={(e) => setEditForm({...editForm, expected_accounts_filing_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Confidence Score (0-100)</Label>
                <Input 
                  type="number" 
                  min="0" max="100"
                  value={editForm.filing_confidence_score} 
                  onChange={(e) => setEditForm({...editForm, filing_confidence_score: Number(e.target.value)})}
                />
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
    </StaffLayout>
  );
}