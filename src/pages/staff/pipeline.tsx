import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import StaffLayout from "@/components/staff/StaffLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, RefreshCw, Filter, Download } from "lucide-react";
import { pipelineService, PipelineWithDetails } from "@/services/pipelineService";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths, eachMonthOfInterval } from "date-fns";

export default function PipelinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineWithDetails[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filterStartDate, setFilterStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterEndDate, setFilterEndDate] = useState(format(addMonths(new Date(), 6), "yyyy-MM-dd"));
  const [minConfidence, setMinConfidence] = useState(0);

  useEffect(() => {
    loadPipeline();
    loadSummary();
  }, [filterStartDate, filterEndDate, minConfidence]);

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

  async function handleRefreshAll() {
    try {
      setRefreshing(true);
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

  // Generate months for Gantt view
  const startDate = new Date(filterStartDate);
  const endDate = new Date(filterEndDate);
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

  function getConfidenceColor(confidence: number) {
    if (confidence >= 70) return "text-green-600 bg-green-50";
    if (confidence >= 40) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  }

  function getConfidenceBadge(confidence: number) {
    if (confidence >= 70) return "default";
    if (confidence >= 40) return "secondary";
    return "destructive";
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
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
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
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          £{(entry.predicted_revenue || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Predicted Revenue
                        </div>
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
      </div>
    </StaffLayout>
  );
}