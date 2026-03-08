import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, Building2, FileText } from "lucide-react";

interface AnalyticsData {
  totalUsers: number;
  totalOrganisations: number;
  totalClaims: number;
  totalEvidence: number;
  recentActivity: {
    newUsersThisWeek: number;
    newClaimsThisWeek: number;
    activeUsersToday: number;
  };
  organisationStats: Array<{
    name: string;
    userCount: number;
    claimCount: number;
  }>;
}

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalOrganisations: 0,
    totalClaims: 0,
    totalEvidence: 0,
    recentActivity: {
      newUsersThisWeek: 0,
      newClaimsThisWeek: 0,
      activeUsersToday: 0,
    },
    organisationStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const loadAnalytics = async (): Promise<void> => {
    try {
      setLoading(true);

      const [usersCount, orgsCount, claimsCount, evidenceCount] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("organisations").select("id", { count: "exact", head: true }),
        supabase.from("claims").select("id", { count: "exact", head: true }),
        supabase.from("evidence_items").select("id", { count: "exact", head: true }),
      ]);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      const [newUsers, newClaims] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgoISO),
        supabase.from("claims").select("id", { count: "exact", head: true }).gte("created_at", weekAgoISO),
      ]);

      const { data: orgs } = await supabase.from("organisations").select("id, name");

      const orgStats = await Promise.all(
        (orgs ?? []).map(async (org) => {
          const [users, claims] = await Promise.all([
            supabase.from("organisation_users").select("id", { count: "exact", head: true }).eq("org_id", org.id),
            supabase.from("claims").select("id", { count: "exact", head: true }).eq("org_id", org.id),
          ]);

          return {
            name: org.name,
            userCount: users.count ?? 0,
            claimCount: claims.count ?? 0,
          };
        })
      );

      setAnalytics({
        totalUsers: usersCount.count ?? 0,
        totalOrganisations: orgsCount.count ?? 0,
        totalClaims: claimsCount.count ?? 0,
        totalEvidence: evidenceCount.count ?? 0,
        recentActivity: {
          newUsersThisWeek: newUsers.count ?? 0,
          newClaimsThisWeek: newClaims.count ?? 0,
          activeUsersToday: 0,
        },
        organisationStats: orgStats,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffLayout title="Analytics">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-6 text-slate-100 sm:px-6 lg:px-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">Analytics</h1>
          <p className="text-sm text-slate-400 sm:text-base">System-wide statistics and insights</p>
        </header>

        {/* Overview stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <span>Total users</span>
                <Users className="h-4 w-4 text-slate-400" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-50">{loading ? "…" : analytics.totalUsers}</p>
              <p className="mt-1 text-xs text-slate-500">
                +{analytics.recentActivity.newUsersThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <span>Organisations</span>
                <Building2 className="h-4 w-4 text-slate-400" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-50">{loading ? "…" : analytics.totalOrganisations}</p>
              <p className="mt-1 text-xs text-slate-500">Active organisations</p>
            </CardContent>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <span>Total claims</span>
                <FileText className="h-4 w-4 text-slate-400" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-50">{loading ? "…" : analytics.totalClaims}</p>
              <p className="mt-1 text-xs text-slate-500">
                +{analytics.recentActivity.newClaimsThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <span>Evidence items</span>
                <BarChart3 className="h-4 w-4 text-slate-400" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-50">{loading ? "…" : analytics.totalEvidence}</p>
              <p className="mt-1 text-xs text-slate-500">Total collected</p>
            </CardContent>
          </Card>
        </section>

        {/* Recent Activity */}
        <section>
          <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                    <TrendingUp className="h-4 w-4 text-sky-400" />
                    Recent activity
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-400 sm:text-sm">
                    Activity from the last 7 days
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10">
                    <Users className="h-4 w-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">Registered this week</p>
                    <p className="text-xs text-slate-400">New users created in the last 7 days</p>
                  </div>
                </div>
                <p className="text-xl font-semibold text-slate-50">
                  {analytics.recentActivity.newUsersThisWeek}
                </p>
              </div>

              <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                    <FileText className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">Submitted this week</p>
                    <p className="text-xs text-slate-400">Claims submitted in the last 7 days</p>
                  </div>
                </div>
                <p className="text-xl font-semibold text-slate-50">
                  {analytics.recentActivity.newClaimsThisWeek}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Organisation Breakdown */}
        <section>
          <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                <Building2 className="h-4 w-4 text-slate-300" />
                Organisation breakdown
              </CardTitle>
              <CardDescription className="mt-1 text-xs text-slate-400 sm:text-sm">
                Users and claims by organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : analytics.organisationStats.length === 0 ? (
                <p className="text-sm text-slate-400">No organisations found.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.organisationStats.map((org, index) => {
                    const avg =
                      org.userCount > 0 ? (org.claimCount / org.userCount).toFixed(1) : "0.0";

                    return (
                      <div
                        key={`${org.name}-${index}`}
                        className="flex flex-col items-start justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-100">{org.name}</p>
                          <p className="text-xs text-slate-400">
                            {org.userCount} users · {org.claimCount} claims
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          Avg: <span className="font-semibold text-slate-100">{avg}</span> claims/user
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </StaffLayout>
  );
}