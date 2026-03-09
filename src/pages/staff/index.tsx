import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import {
  FileText,
  Users,
  Shield,
  Briefcase,
  TrendingUp,
  Calendar,
  ArrowRight,
  CalendarDays,
  Zap,
  Lightbulb,
  FileWarning } from
"lucide-react";
import { pipelineService } from "@/services/pipelineService";
import type { PipelineWithDetails } from "@/services/pipelineService";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";

type InspectorSessionRow =
Database["public"]["Tables"]["hmrc_inspector_sessions"]["Row"];

export default function StaffHomePage() {
  const router = useRouter();
  const { profileWithOrg, isStaff } = useApp();
  const [pipelineData, setPipelineData] = useState<PipelineWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [securedOnly, setSecuredOnly] = useState(false);

  const [innovationMetrics, setInnovationMetrics] = useState<{
    averageInnovationDensity: number | null;
    activeProjects: number;
    documentationGaps: number;
    loading: boolean;
  }>({
    averageInnovationDensity: null,
    activeProjects: 0,
    documentationGaps: 0,
    loading: true
  });

  const [portfolioProjects, setPortfolioProjects] = useState<
    {
      projectId: string;
      projectName: string;
      innovationDensity: number | null;
      documentationStrength: number | null;
      overallHealth: number | null;
      lastActivity: string | null;
    }[]>(
    []);

  const [claimReadiness, setClaimReadiness] = useState<{
    draftClaims: number;
    readyForFinalisation: number;
    submittedClaims: number;
    simulatorPassCount: number | null;
    loading: boolean;
  }>({
    draftClaims: 0,
    readyForFinalisation: 0,
    submittedClaims: 0,
    simulatorPassCount: null,
    loading: true
  });

  const [defenceStatus, setDefenceStatus] = useState<{
    claimsWithDefencePacks: number | null;
    simulatorRiskFlags: number | null;
    narrativeAlignmentIssues: number | null;
  }>({
    claimsWithDefencePacks: null,
    simulatorRiskFlags: null,
    narrativeAlignmentIssues: null
  });

  const [emergingSignals, setEmergingSignals] = useState<
    {
      projectId: string;
      projectName: string;
      innovationDensity: number | null;
      documentationStrength: number | null;
      overallHealth: number | null;
      lastUpdated: string | null;
    }[]>(
    []);

  useEffect(() => {
    if (isStaff) {
      loadPipelineData();
      loadInnovationIntelligence();
    }
  }, [isStaff]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 24, 0);

      const startStr = start.toISOString().split("T")[0];
      const endStr = end.toISOString().split("T")[0];

      const entries = await pipelineService.getPipelineByDateRange(
        startStr,
        endStr
      );

      setPipelineData(entries);
    } catch (error) {
      console.error("Failed to load pipeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInnovationIntelligence = async () => {
    try {
      try {
        const warmRes = await fetch(
          "/api/projects/health-score/warm-cache",
          {
            method: "POST"
          }
        );

        if (!warmRes.ok) {
          const text = await warmRes.text().catch(() => "");
          console.error(
            "Failed to warm project health cache:",
            warmRes.status,
            text
          );
        }
      } catch (err) {
        console.error(
          "Error calling project health warm-cache API:",
          err
        );
      }

      // Project health / innovation metrics
      const { data: healthRows, error: healthError } = await supabase.
      from("project_health_scores").
      select(
        `
          project_id,
          innovation_density_score,
          documentation_strength,
          overall_health_score,
          updated_at,
          project:claim_projects!project_health_scores_project_id_fkey(
            id,
            name,
            updated_at
          )
        `
      );

      if (healthError) {
        console.error("Failed to load project health data:", healthError);
      }

      const rows = (healthRows || []) as {
        project_id: string;
        innovation_density_score: number | null;
        documentation_strength: number | null;
        overall_health_score: number | null;
        updated_at: string | null;
        project?: {
          id: string;
          name: string | null;
          updated_at: string | null;
        } | null;
      }[];

      if (!healthError) {
        const byProjectKey = new Map<string, (typeof rows)[number]>();

        for (const row of rows) {
          const key = (row.project?.name || "Untitled project").
          trim().
          toLowerCase();

          const existing = byProjectKey.get(key);
          if (!existing) {
            byProjectKey.set(key, row);
          } else {
            const existingScore = existing.overall_health_score || 0;
            const currentScore = row.overall_health_score || 0;
            if (currentScore > existingScore) {
              byProjectKey.set(key, row);
            }
          }
        }

        const uniqueRows = Array.from(byProjectKey.values());

        const scoredRows = uniqueRows.filter(
          (r) =>
          typeof r.innovation_density_score === "number" &&
          !Number.isNaN(r.innovation_density_score as number)
        );

        const averageInnovationDensity =
        scoredRows.length > 0 ?
        Math.round(
          scoredRows.reduce(
            (sum, r) => sum + (r.innovation_density_score || 0),
            0
          ) / scoredRows.length
        ) :
        null;

        const activeProjects = uniqueRows.filter(
          (r) => (r.innovation_density_score || 0) >= 60
        ).length;

        const documentationGaps = uniqueRows.filter(
          (r) =>
          (r.innovation_density_score || 0) >= 60 &&
          (r.documentation_strength || 0) < 50
        ).length;

        setInnovationMetrics({
          averageInnovationDensity,
          activeProjects,
          documentationGaps,
          loading: false
        });

        const sorted = [...uniqueRows].sort(
          (a, b) =>
          (b.overall_health_score || 0) - (a.overall_health_score || 0)
        );

        const top = sorted.slice(0, 8).map((r) => ({
          projectId: r.project_id,
          projectName: r.project?.name || "Untitled project",
          innovationDensity: r.innovation_density_score,
          documentationStrength: r.documentation_strength,
          overallHealth: r.overall_health_score,
          lastActivity: r.project?.updated_at || r.updated_at || null
        }));

        setPortfolioProjects(top);

        const emerging = scoredRows.
        map((r) => ({
          projectId: r.project_id,
          projectName: r.project?.name || "Untitled project",
          innovationDensity: r.innovation_density_score,
          documentationStrength: r.documentation_strength,
          overallHealth: r.overall_health_score,
          lastUpdated: r.updated_at
        })).
        filter((r) => {
          const innovation = r.innovationDensity || 0;
          const docs = r.documentationStrength || 0;
          const overall = r.overallHealth || 0;
          return (
            innovation >= 60 && (
            docs < 60 || overall < 75));

        }).
        sort((a, b) => {
          const innovDiff =
          (b.innovationDensity || 0) - (a.innovationDensity || 0);
          if (innovDiff !== 0) return innovDiff;
          return (a.documentationStrength || 0) - (b.documentationStrength || 0);
        }).
        slice(0, 6);

        setEmergingSignals(emerging);
      } else {
        setInnovationMetrics((prev) => ({
          ...prev,
          loading: false
        }));
        setPortfolioProjects([]);
      }

      // load inspector-based simulator metrics
      const { data: inspectorSessions } = await supabase.
      from("hmrc_inspector_sessions").
      select("*").
      eq("status", "completed");

      let claimsPassingInspector = 0;
      if (inspectorSessions && inspectorSessions.length > 0) {
        const byClaim = new Map<string, InspectorSessionRow>();
        for (const row of inspectorSessions as InspectorSessionRow[]) {
          if (!row.claim_id) continue;
          const existing = byClaim.get(row.claim_id);
          if (
          !existing ||
          (existing.updated_at || "") < (row.updated_at || ""))
          {
            byClaim.set(row.claim_id, row);
          }
        }

        for (const session of byClaim.values()) {
          if (typeof session.overall_score === "number" && session.overall_score >= 70) {
            claimsPassingInspector += 1;
          }
        }
      }

      setInnovationMetrics((prev) => ({
        ...prev,
        claimsPassingInspector
      }));

      // Claim readiness metrics – use cached claim status only
      const { data: claims, error: claimsError } = await supabase.
      from("claims").
      select("id, status");

      if (claimsError) {
        console.error("Failed to load claim readiness data:", claimsError);
        setClaimReadiness((prev) => ({
          ...prev,
          loading: false
        }));
      } else {
        const claimRows = (claims || []) as {id: string;status: string;}[];

        const draftClaims = claimRows.filter((c) =>
        ["intake", "data_gathering", "draft_in_progress"].includes(c.status)
        ).length;

        const readyForFinalisation = claimRows.filter(
          (c) => c.status === "ready_to_file"
        ).length;

        const submittedClaims = claimRows.filter((c) =>
        ["submitted_hmrc", "completed"].includes(c.status)
        ).length;

        setClaimReadiness({
          draftClaims,
          readyForFinalisation,
          submittedClaims,
          simulatorPassCount: null,
          loading: false
        });
      }

      // Defence / simulator / narrative checks are not yet backed by tables in this schema.
      // Keep the UI ready but mark metrics as not configured.
      setDefenceStatus({
        claimsWithDefencePacks: null,
        simulatorRiskFlags: null,
        narrativeAlignmentIssues: null
      });
    } catch (error) {
      console.error("Error loading innovation intelligence metrics:", error);
      setInnovationMetrics((prev) => ({
        ...prev,
        loading: false
      }));
      setClaimReadiness((prev) => ({
        ...prev,
        loading: false
      }));
    }
  };

  const userName = profileWithOrg?.full_name || "Staff Member";
  const orgCode = profileWithOrg?.organisation_code || "N/A";
  const role = profileWithOrg?.internal_role || "Staff";

  // Build 12-month window from the start of the current month
  const today = new Date();
  const months: Date[] = [];
  for (let i = 0; i < 24; i += 1) {
    months.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
  }

  type MonthlyBucket = {
    date: Date;
    onboarded: number;
    notOnboarded: number;
  };

  const initialBuckets: MonthlyBucket[] = months.map((date) => ({
    date,
    onboarded: 0,
    notOnboarded: 0
  }));

  const visiblePipeline = securedOnly ?
  pipelineData.filter((entry) => Boolean(entry.claim_id)) :
  pipelineData;

  const expandedPipeline = useMemo(() => {
    const endYear = months[months.length - 1]?.getFullYear();
    const result: PipelineWithDetails[] = [];

    for (const entry of visiblePipeline) {
      result.push(entry);

      if (entry.expected_accounts_filing_date) {
        const expected = new Date(entry.expected_accounts_filing_date);
        const nextYear = expected.getFullYear() + 1;

        if (endYear && nextYear <= endYear) {
          const nextExpected = new Date(expected);
          nextExpected.setFullYear(nextYear);

          result.push({
            ...entry,
            id: `${entry.id}-repeat-${nextYear}`,
            expected_accounts_filing_date: nextExpected.
            toISOString().
            split("T")[0]
          } as PipelineWithDetails);
        }
      }
    }

    return result;
  }, [visiblePipeline, months]);

  const monthlyBuckets: MonthlyBucket[] = expandedPipeline.reduce(
    (buckets, entry) => {
      if (!entry.expected_accounts_filing_date) return buckets;

      const filingDate = new Date(entry.expected_accounts_filing_date);
      const monthIndex = months.findIndex(
        (m) =>
          m.getFullYear() === filingDate.getFullYear() &&
          m.getMonth() === filingDate.getMonth()
      );
      if (monthIndex === -1) return buckets;

      const revenue = entry.predicted_revenue || 0;
      if (entry.claim_id) {
        buckets[monthIndex].onboarded += revenue;
      } else {
        buckets[monthIndex].notOnboarded += revenue;
      }

      return buckets;
    },
    initialBuckets
  );

  // Each month now reflects only real pipeline data; we no longer mirror
  // the first half of the series into the second half.

  const totalForecastedRevenue = monthlyBuckets.reduce(
    (sum, bucket) => sum + bucket.onboarded + bucket.notOnboarded,
    0
  );

  const thisMonthBucket = monthlyBuckets[0];
  const thisMonthRevenue =
    (thisMonthBucket?.onboarded || 0) +
    (thisMonthBucket?.notOnboarded || 0);

  const activeItems = visiblePipeline.length;

  const maxMonthTotal = Math.max(
    0,
    ...monthlyBuckets.map(
      (bucket) => bucket.onboarded + bucket.notOnboarded
    )
  );

  const tickStep = 50000;
  const maxScaleValue =
    maxMonthTotal > 0
      ? Math.max(
          tickStep,
          Math.ceil(maxMonthTotal / tickStep) * tickStep
        )
      : tickStep;

  const yAxisTicks: number[] = [];
  for (let value = 0; value <= maxScaleValue; value += tickStep) {
    yAxisTicks.push(value);
  }

  type MonthlyClientsBucket = {
    date: Date;
    onboardedCount: number;
    notOnboardedCount: number;
  };

  const initialClientBuckets: MonthlyClientsBucket[] = months.map((date) => ({
    date,
    onboardedCount: 0,
    notOnboardedCount: 0
  }));

  const monthlyClientsBuckets: MonthlyClientsBucket[] = expandedPipeline.reduce(
    (buckets, entry) => {
      if (!entry.expected_accounts_filing_date) return buckets;

      const filingDate = new Date(entry.expected_accounts_filing_date);
      const monthIndex = months.findIndex(
        (m) =>
          m.getFullYear() === filingDate.getFullYear() &&
          m.getMonth() === filingDate.getMonth()
      );
      if (monthIndex === -1) return buckets;

      if (entry.claim_id) {
        buckets[monthIndex].onboardedCount += 1;
      } else {
        buckets[monthIndex].notOnboardedCount += 1;
      }

      return buckets;
    },
    initialClientBuckets
  );

  // Client counts are now taken directly from pipeline data for every month,
  // with no artificial mirroring of earlier months.

  const maxClientsCount = Math.max(
    0,
    ...monthlyClientsBuckets.map(
      (bucket) => bucket.onboardedCount + bucket.notOnboardedCount
    )
  );

  const clientYAxisTicks: number[] = [];
  if (maxClientsCount === 0) {
    clientYAxisTicks.push(0, 1);
  } else {
    const clientTickStep =
    maxClientsCount <= 5 ? 1 : maxClientsCount <= 20 ? 2 : 5;
    const clientMaxScale =
    Math.ceil(maxClientsCount / clientTickStep) * clientTickStep;

    for (let value = 0; value <= clientMaxScale; value += clientTickStep) {
      clientYAxisTicks.push(value);
    }
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
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric"
    });
  };

  const formatDateShort = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "UTC"
    });
  };

  const getHealthBadgeClass = (score: number | null) => {
    if (score === null || typeof score !== "number") {
      return "bg-slate-900/60 text-slate-300 border border-slate-700/60";
    }
    if (score >= 80) {
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
    }
    if (score >= 60) {
      return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    }
    return "bg-red-500/20 text-red-300 border border-red-500/40";
  };

  if (!isStaff) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You do not have permission to access the staff area.
          </p>
        </div>
      </StaffLayout>);

  }

  return (
    <StaffLayout title="Dashboard">
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex w-full flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold">Dashboard</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Welcome, {userName} ({orgCode})
              </p>
              <p className="text-sm text-muted-foreground">
                Role: <span className="font-semibold">{role}</span>
              </p>
            </div>
            <Button
              className="self-start sm:self-auto"
              onClick={() => router.push("/staff/pipeline")}
            >
              View Full Pipeline <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Revenue Summary Cards (Next 12 Months) */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-professional-md">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Total Forecasted Revenue</span>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-foreground">
                    {formatCurrency(totalForecastedRevenue)}
                  </div>
                  <p className="text-sm text-muted-foreground">Next 24 months</p>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-professional-md">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Active Pipeline Items</span>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-foreground">
                    {activeItems}
                  </div>
                  <p className="text-sm text-muted-foreground">Clients in pipeline</p>
                </div>
              </CardHeader>
            </Card>

            <Card className="shadow-professional-md">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-foreground">This Month</span>
                </div>
                <div>
                  <div className="text-3xl font-semibold text-foreground">
                    {formatCurrency(thisMonthRevenue)}
                  </div>
                  <p className="text-sm text-muted-foreground">Expected revenue</p>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* 12-Month Pipeline Chart */}
          <Card className="shadow-professional-md">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5 text-primary" />
                  12-Month Pipeline
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Revenue forecast and budget analysis (onboarded vs not yet onboarded)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={securedOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSecuredOnly((prev) => !prev)}
                >
                  Secured Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/staff/pipeline")}
                >
                  View Gantt
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading pipeline data...
                </div>
              ) : monthlyBuckets.every(
                (bucket) => bucket.onboarded === 0 && bucket.notOnboarded === 0
              ) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pipeline entries in the next 12 months. Enable claims or
                  import clients to build your pipeline forecast.
                </div>
              ) : (
                <>
                  <div className="flex gap-4 h-72 pb-6">
                    <div className="flex flex-col justify-between h-48 text-xs text-muted-foreground pr-2">
                      {yAxisTicks
                        .slice()
                        .reverse()
                        .map((value) => (
                          <span key={value}>{formatCurrency(value)}</span>
                        ))}
                    </div>
                    <div className="flex items-end gap-3 h-72 flex-1 border-l border-border border-b pl-4 pb-6 overflow-x-auto">
                      {monthlyBuckets.map((bucket, idx) => {
                        const total = bucket.onboarded + bucket.notOnboarded;

                        const hoverTitle = `Total: ${formatCurrency(
                          total
                        )}\nOnboarded: ${formatCurrency(
                          bucket.onboarded
                        )}\nNot onboarded: ${formatCurrency(
                          bucket.notOnboarded
                        )}`;

                        const onboardedHeight =
                          maxMonthTotal > 0
                            ? (bucket.onboarded / maxMonthTotal) * 100
                            : 0;
                        const notOnboardedHeight =
                          maxMonthTotal > 0
                            ? (bucket.notOnboarded / maxMonthTotal) * 100
                            : 0;

                        return (
                          <div
                            key={idx}
                            className="flex flex-col items-center min-w-[2.5rem] sm:min-w-[3rem]"
                          >
                            <div
                              className="flex flex-col-reverse w-6 sm:w-8 h-48 rounded overflow-hidden bg-transparent"
                              title={hoverTitle}
                            >
                              {total > 0 && (
                                <>
                                  {bucket.onboarded > 0 && (
                                    <div
                                      className="bg-orange-500"
                                      style={{
                                        height: `${onboardedHeight}%`,
                                      }}
                                      title={`Onboarded: ${formatCurrency(
                                        bucket.onboarded
                                      )}`}
                                    />
                                  )}
                                  {bucket.notOnboarded > 0 && (
                                    <div
                                      className="bg-[#0F1D2D]"
                                      style={{
                                        height: `${notOnboardedHeight}%`,
                                      }}
                                      title={`Not onboarded: ${formatCurrency(
                                        bucket.notOnboarded
                                      )}`}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                            <span className="mt-2 text-xs text-muted-foreground rotate-[-30deg] origin-top">
                              {formatMonthYear(bucket.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-orange-500" />
                      <span>Onboarded clients (has claim)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-[#0F1D2D]" />
                      <span>Not yet onboarded</span>
                    </div>
                    {securedOnly && (
                      <span className="text-xs text-muted-foreground">
                        Showing secured (onboarded) revenue only.
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Innovation & Claim Intelligence */}
          <section className="space-y-6 border-t border-border pt-8">
            <div>
              <h2 className="text-2xl font-semibold">Innovation &amp; Claim Intelligence</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time insight into innovation activity, claim readiness and documentation health.
              </p>
            </div>

            {/* Row 1 – Innovation Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-professional-md">
                <CardHeader className="flex items-center gap-2 text-lg text-muted-foreground">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-foreground">Innovation Density</span>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {innovationMetrics.loading
                      ? "—"
                      : innovationMetrics.averageInnovationDensity !== null
                        ? innovationMetrics.averageInnovationDensity
                        : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-professional-md">
                <CardHeader className="flex items-center gap-2 text-lg text-muted-foreground">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <span className="text-foreground">Active R&amp;D Projects</span>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {innovationMetrics.loading ? "—" : innovationMetrics.activeProjects}
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-professional-md">
                <CardHeader className="flex items-center gap-2 text-lg text-muted-foreground">
                  <FileWarning className="h-5 w-5 text-primary" />
                  <span className="text-foreground">Documentation Gaps</span>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {innovationMetrics.loading ? "—" : innovationMetrics.documentationGaps}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Row 2 – R&D Portfolio Map */}
            <Card className="shadow-professional-md">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg text-foreground">R&amp;D Portfolio Overview</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Distribution of R&amp;D activity and documentation across projects
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/staff/claims")}
                >
                  View All Projects
                </Button>
              </CardHeader>
              <CardContent>
                {innovationMetrics.loading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    Loading portfolio…
                  </div>
                ) : portfolioProjects.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No project health scores available yet.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl bg-card overflow-x-auto">
                    <div className="min-w-[720px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[30%]">Project</TableHead>
                            <TableHead>Innovation Density</TableHead>
                            <TableHead>Documentation Strength</TableHead>
                            <TableHead>Overall Health</TableHead>
                            <TableHead className="w-[20%]">Last Activity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {portfolioProjects.map((p) => (
                            <TableRow
                              key={p.projectId}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() =>
                                router.push(`/staff/claims/projects/${p.projectId}`)
                              }
                            >
                              <TableCell className="font-medium">
                                {p.projectName}
                              </TableCell>
                              <TableCell>{p.innovationDensity ?? "—"}</TableCell>
                              <TableCell>{p.documentationStrength ?? "—"}</TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHealthBadgeClass(
                                    p.overallHealth
                                  )}`}
                                >
                                  {p.overallHealth !== null ? `${p.overallHealth}` : "No score"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDateShort(p.lastActivity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Row 3 – Claim Readiness */}
            <Card className="shadow-professional-md">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Claim Readiness</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Pipeline of claims from draft through to submission
                </CardDescription>
              </CardHeader>
              <CardContent>
                {claimReadiness.loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading claim readiness…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Draft Claims</div>
                      <div className="text-2xl font-semibold mt-1 text-foreground">
                        {claimReadiness.draftClaims}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Ready for Finalisation
                      </div>
                      <div className="text-2xl font-semibold mt-1 text-foreground">
                        {claimReadiness.readyForFinalisation}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Submitted Claims
                      </div>
                      <div className="text-2xl font-semibold mt-1 text-foreground">
                        {claimReadiness.submittedClaims}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Claims Passing HMRC Simulator
                      </div>
                      <div className="text-2xl font-semibold mt-1 text-foreground">
                        {claimReadiness.simulatorPassCount !== null
                          ? claimReadiness.simulatorPassCount
                          : "—"}
                      </div>
                      {claimReadiness.simulatorPassCount === null && (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Simulator integration not yet configured.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Row 4 – Emerging R&D Signals */}
            <Card className="shadow-professional-md">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  Emerging R&amp;D Opportunities
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Latest innovation signals detected across projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {innovationMetrics.loading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Analysing project health signals…
                  </div>
                ) : emergingSignals.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No emerging R&amp;D opportunities detected yet. Once projects
                    start to show strong innovation signals but weaker documentation,
                    they will appear here for follow-up.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl bg-card overflow-x-auto">
                    <div className="min-w-[720px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[35%]">Project</TableHead>
                            <TableHead>Innovation</TableHead>
                            <TableHead>Documentation</TableHead>
                            <TableHead>Health</TableHead>
                            <TableHead className="w-[20%]">Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emergingSignals.map((s) => (
                            <TableRow
                              key={s.projectId}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() =>
                                router.push(`/staff/claims/projects/${s.projectId}`)
                              }
                            >
                              <TableCell className="font-medium">
                                {s.projectName}
                              </TableCell>
                              <TableCell>{s.innovationDensity ?? "—"}</TableCell>
                              <TableCell>
                                {s.documentationStrength ?? "—"}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getHealthBadgeClass(
                                    s.overallHealth
                                  )}`}
                                >
                                  {s.overallHealth !== null ? `${s.overallHealth}` : "No score"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDateShort(s.lastUpdated)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Monthly Predicted Submissions Chart */}
          <Card className="shadow-professional-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                Monthly Predicted Submissions
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Number of clients expected to submit in each month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading submission data...
                </div>
              ) : monthlyClientsBuckets.every(
                (bucket) =>
                  bucket.onboardedCount === 0 &&
                  bucket.notOnboardedCount === 0
              ) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No predicted submissions in the next 24 months.
                </div>
              ) : (
                <>
                  <div className="flex gap-4 h-64 pb-6">
                    <div className="flex flex-col justify-between h-40 text-xs text-muted-foreground pr-2">
                      {clientYAxisTicks
                        .slice()
                        .reverse()
                        .map((value) => (
                          <span key={value}>{value}</span>
                        ))}
                    </div>
                    <div className="flex items-end gap-3 h-64 flex-1 border-l border-border border-b pl-4 pb-6 overflow-x-auto">
                      {monthlyClientsBuckets.map((bucket, idx) => {
                        const totalCount =
                          bucket.onboardedCount + bucket.notOnboardedCount;

                        const onboardedHeight =
                          maxClientsCount > 0
                            ? (bucket.onboardedCount / maxClientsCount) * 100
                            : 0;
                        const notOnboardedHeight =
                          maxClientsCount > 0
                            ? (bucket.notOnboardedCount / maxClientsCount) * 100
                            : 0;

                        const hoverTitle = `Total: ${totalCount} client${
                          totalCount === 1 ? "" : "s"
                        }\nOnboarded: ${
                          bucket.onboardedCount
                        }\nNot onboarded: ${bucket.notOnboardedCount}`;

                        return (
                          <div
                            key={idx}
                            className="flex flex-col items-center min-w-[2.5rem] sm:min-w-[3rem]"
                          >
                            <div
                              className="flex flex-col-reverse w-6 sm:w-8 h-40 rounded overflow-hidden bg-transparent"
                              title={hoverTitle}
                            >
                              {totalCount > 0 && (
                                <>
                                  {bucket.onboardedCount > 0 && (
                                    <div
                                      className="bg-orange-500"
                                      style={{
                                        height: `${onboardedHeight}%`,
                                      }}
                                      title={`Onboarded: ${bucket.onboardedCount}`}
                                    />
                                  )}
                                  {bucket.notOnboardedCount > 0 && (
                                    <div
                                      className="bg-[#0F1D2D]"
                                      style={{
                                        height: `${notOnboardedHeight}%`,
                                      }}
                                      title={`Not onboarded: ${bucket.notOnboardedCount}`}
                                    />
                                  )}
                                </>
                              )}
                            </div>
                            <span className="mt-2 text-xs text-muted-foreground rotate-[-30deg] origin-top">
                              {formatMonthYear(bucket.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-orange-500" />
                      <span>Onboarded clients (has claim)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-[#0F1D2D]" />
                      <span>Not yet onboarded</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer bg-[#050b16] border-slate-800 text-slate-100"
              onClick={() => router.push("/staff/claims")}>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-400" />
                  Claims
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Manage R&amp;D tax credit claims
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer bg-[#050b16] border-slate-800 text-slate-100"
              onClick={() => router.push("/staff/cif")}>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-orange-400" />
                  Onboarding
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Client Information Forms
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer bg-[#050b16] border-slate-800 text-slate-100"
              onClick={() => router.push("/staff/clients")}>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-400" />
                  Clients
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Client management
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer bg-[#050b16] border-slate-800 text-slate-100"
              onClick={() => router.push("/staff/admin")}>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  Admin
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Administrative functions
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </StaffLayout>);

}