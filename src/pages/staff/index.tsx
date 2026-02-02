import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { FileText, Users, Shield, Briefcase, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { pipelineService } from "@/services/pipelineService";
import type { Database } from "@/integrations/supabase/types";

type PipelineEntry = Database["public"]["Tables"]["pipeline_entries"]["Row"] & {
  organisations?: {
    name: string;
    companies_house_number: string | null;
  } | null;
};

export default function StaffHomePage() {
  const router = useRouter();
  const { profileWithOrg, isStaff } = useApp();
  const [pipelineData, setPipelineData] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    totalRevenue: number;
    byMonth: Record<string, number>;
    byQuarter: Record<string, number>;
  }>({
    totalRevenue: 0,
    byMonth: {},
    byQuarter: {},
  });

  useEffect(() => {
    if (isStaff) {
      loadPipelineData();
    }
  }, [isStaff]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      const entries = await pipelineService.getAllPipelineEntries();
      setPipelineData(entries.slice(0, 10)); // Show top 10 on dashboard

      const summaryData = await pipelineService.getPipelineSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error("Failed to load pipeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isStaff) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-muted-foreground mt-2">You do not have permission to access the staff area.</p>
        </div>
      </StaffLayout>
    );
  }

  const userName = profileWithOrg?.full_name || "Staff Member";
  const orgCode = profileWithOrg?.organisation_code || "N/A";
  const role = profileWithOrg?.internal_role || "Staff";

  // Calculate date range for timeline (next 6 months)
  const today = new Date();
  const timelineMonths: Date[] = [];
  for (let i = 0; i < 6; i++) {
    const month = new Date(today.getFullYear(), today.getMonth() + i, 1);
    timelineMonths.push(month);
  }

  const getConfidenceBadge = (score: number | null) => {
    if (!score) return <Badge variant="outline">Unknown</Badge>;
    if (score >= 80) return <Badge className="bg-green-500">High</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge className="bg-red-500">Low</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "£0";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  };

  return (
    <StaffLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Welcome, {userName} ({orgCode})
            </p>
            <p className="text-sm text-muted-foreground">
              Role: <span className="font-semibold">{role}</span>
            </p>
          </div>
          <Button onClick={() => router.push("/staff/pipeline")}>
            View Full Pipeline <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Total Forecasted Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground mt-1">Next 12 months</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Active Pipeline Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pipelineData.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Clients in pipeline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5" />
                This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(summary.byMonth[formatMonthYear(today)] || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Expected revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Gantt-Style Pipeline View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Pipeline Timeline (Next 6 Months)
              </span>
              <Button variant="outline" size="sm" onClick={() => router.push("/staff/pipeline")}>
                View All
              </Button>
            </CardTitle>
            <CardDescription>Visual representation of predicted work and revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading pipeline data...</div>
            ) : pipelineData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pipeline entries yet. Enable claims to auto-generate predictions.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Timeline Header */}
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="w-48 font-semibold text-sm">Client</div>
                  <div className="flex-1 grid grid-cols-6 gap-1">
                    {timelineMonths.map((month, idx) => (
                      <div key={idx} className="text-xs font-semibold text-center">
                        {formatMonthYear(month)}
                      </div>
                    ))}
                  </div>
                  <div className="w-32 text-right font-semibold text-sm">Revenue</div>
                </div>

                {/* Pipeline Entries */}
                {pipelineData.slice(0, 8).map((entry) => {
                  const pipelineStart = entry.pipeline_start_date ? new Date(entry.pipeline_start_date) : null;
                  const filingDate = entry.expected_accounts_filing_date ? new Date(entry.expected_accounts_filing_date) : null;

                  // Calculate which months this entry spans
                  const startMonth = pipelineStart ? pipelineStart.getMonth() : null;
                  const startYear = pipelineStart ? pipelineStart.getFullYear() : null;
                  const endMonth = filingDate ? filingDate.getMonth() : null;
                  const endYear = filingDate ? filingDate.getFullYear() : null;

                  return (
                    <div key={entry.id} className="flex items-center gap-2 py-2 hover:bg-muted/50 rounded">
                      <div className="w-48 truncate">
                        <p className="font-medium text-sm">{entry.organisations?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {getConfidenceBadge(entry.filing_confidence_score)}
                        </p>
                      </div>
                      <div className="flex-1 grid grid-cols-6 gap-1">
                        {timelineMonths.map((month, idx) => {
                          const monthNum = month.getMonth();
                          const yearNum = month.getFullYear();
                          
                          // Check if this month is within the pipeline period
                          let isInPeriod = false;
                          if (startMonth !== null && startYear !== null && endMonth !== null && endYear !== null) {
                            const monthDate = new Date(yearNum, monthNum);
                            const start = new Date(startYear, startMonth);
                            const end = new Date(endYear, endMonth);
                            isInPeriod = monthDate >= start && monthDate <= end;
                          }

                          // Highlight filing month
                          const isFilingMonth = endMonth === monthNum && endYear === yearNum;

                          return (
                            <div
                              key={idx}
                              className={`h-8 rounded ${
                                isFilingMonth
                                  ? "bg-blue-500"
                                  : isInPeriod
                                  ? "bg-blue-200 dark:bg-blue-900"
                                  : "bg-gray-100 dark:bg-gray-800"
                              }`}
                              title={
                                isFilingMonth
                                  ? "Filing month"
                                  : isInPeriod
                                  ? "Active pipeline work"
                                  : ""
                              }
                            />
                          );
                        })}
                      </div>
                      <div className="w-32 text-right font-semibold text-sm">
                        {formatCurrency(entry.predicted_revenue)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/claims")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Claims
              </CardTitle>
              <CardDescription>Manage R&D tax credit claims</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/cif")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Onboarding
              </CardTitle>
              <CardDescription>Client Information Forms</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/clients")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clients
              </CardTitle>
              <CardDescription>Client management</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/staff/admin")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Admin
              </CardTitle>
              <CardDescription>Administrative functions</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </StaffLayout>
  );
}