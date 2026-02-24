import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
} from "lucide-react";
import { pipelineService } from "@/services/pipelineService";
import type { PipelineWithDetails } from "@/services/pipelineService";

export default function StaffHomePage() {
  const router = useRouter();
  const { profileWithOrg, isStaff } = useApp();
  const [pipelineData, setPipelineData] = useState<PipelineWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [securedOnly, setSecuredOnly] = useState(false);

  useEffect(() => {
    if (isStaff) {
      loadPipelineData();
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

  if (!isStaff) {
    return (
      <StaffLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You do not have permission to access the staff area.
          </p>
        </div>
      </StaffLayout>
    );
  }

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
    notOnboarded: 0,
  }));

  const visiblePipeline = securedOnly
    ? pipelineData.filter((entry) => Boolean(entry.claim_id))
    : pipelineData;

  const monthlyBuckets: MonthlyBucket[] = visiblePipeline.reduce(
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
    notOnboardedCount: 0,
  }));

  const monthlyClientsBuckets: MonthlyClientsBucket[] = visiblePipeline.reduce(
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
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });
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

        {/* Revenue Summary Cards (Next 12 Months) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Total Forecasted Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {formatCurrency(totalForecastedRevenue)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Next 24 months
              </p>
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
              <p className="text-3xl font-bold">{activeItems}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clients in pipeline
              </p>
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
                {formatCurrency(thisMonthRevenue)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Expected revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 12-Month Pipeline Chart */}
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                12-Month Pipeline
              </CardTitle>
              <CardDescription>
                Revenue forecast and budget analysis (onboarded vs not yet
                onboarded)
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
                (bucket) =>
                  bucket.onboarded === 0 && bucket.notOnboarded === 0
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
                  <div className="flex items-end gap-3 h-72 flex-1 border-l border-b border-border pl-4 pb-6 overflow-x-auto">
                    {monthlyBuckets.map((bucket, idx) => {
                      const total =
                        bucket.onboarded + bucket.notOnboarded;

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
                            className="flex flex-col-reverse w-6 sm:w-8 h-48 rounded overflow-hidden bg-muted"
                            title={hoverTitle}
                          >
                            {total > 0 && (
                              <>
                                {bucket.onboarded > 0 && (
                                  <div
                                    className="bg-emerald-500"
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
                                    className="bg-amber-400"
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
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span>Onboarded clients (has claim)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-amber-400" />
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

        {/* Monthly Predicted Submissions Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Predicted Submissions
            </CardTitle>
            <CardDescription>
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
                  <div className="flex items-end gap-3 h-64 flex-1 border-l border-b border-border pl-4 pb-6 overflow-x-auto">
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
                            className="flex flex-col-reverse w-6 sm:w-8 h-40 rounded overflow-hidden bg-muted"
                            title={hoverTitle}
                          >
                            {totalCount > 0 && (
                              <>
                                {bucket.onboardedCount > 0 && (
                                  <div
                                    className="bg-emerald-500"
                                    style={{
                                      height: `${onboardedHeight}%`,
                                    }}
                                    title={`Onboarded: ${bucket.onboardedCount}`}
                                  />
                                )}
                                {bucket.notOnboardedCount > 0 && (
                                  <div
                                    className="bg-amber-400"
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
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                    <span>Onboarded clients (has claim)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-amber-400" />
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
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/staff/claims")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Claims
              </CardTitle>
              <CardDescription>Manage R&amp;D tax credit claims</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/staff/cif")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Onboarding
              </CardTitle>
              <CardDescription>Client Information Forms</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/staff/clients")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clients
              </CardTitle>
              <CardDescription>Client management</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push("/staff/admin")}
          >
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