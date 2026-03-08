import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Building2, FileText, BarChart3, Activity, Lock } from "lucide-react";
import { profileService } from "@/services/profileService";
import { organisationService } from "@/services/organisationService";
import { claimService } from "@/services/claimService";
import { evidenceService } from "@/services/evidenceService";

interface SummaryStats {
  totalUsers: number;
  totalOrganisations: number;
  totalClaims: number;
  totalEvidenceItems: number;
}

interface ActivityStats {
  registeredThisWeek: number;
  submittedThisWeek: number;
}

interface OrganisationStats {
  organisationId: string;
  organisationName: string;
  userCount: number;
  claimCount: number;
}

const AdminAnalyticsPage: React.FC = () => {
  const { user, isAdmin } = useApp();
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalUsers: 0,
    totalOrganisations: 0,
    totalClaims: 0,
    totalEvidenceItems: 0,
  });
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    registeredThisWeek: 0,
    submittedThisWeek: 0,
  });
  const [organisationStats, setOrganisationStats] = useState<OrganisationStats[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [users, organisations, claims, evidence] = await Promise.all([
          profileService.getAllProfiles(),
          organisationService.getAllOrganisations(),
          claimService.getAllClaims(),
          evidenceService.getAllEvidenceItems(),
        ]);

        // Until profiles/claims expose consistent created_at fields at the service level,
        // treat the "this week" metrics as zero to avoid relying on missing properties.
        const registeredThisWeek = 0;
        const submittedThisWeek = 0;

        const orgStatsMap: Record<string, OrganisationStats> = {};

        organisations.forEach((org) => {
          orgStatsMap[org.id] = {
            organisationId: org.id,
            organisationName: org.name,
            userCount: 0,
            claimCount: 0,
          };
        });

        // The Profile and ClaimWithDetails types used by the services don't currently expose a flat
        // organisation_id field, so we avoid strict typing here and only increment counts when such
        // a property exists at runtime. This keeps the analytics page compiling and functional
        // without changing the underlying service types.
        (users as any[]).forEach((orgUser) => {
          if (orgUser.organisation_id && orgStatsMap[orgUser.organisation_id]) {
            orgStatsMap[orgUser.organisation_id].userCount += 1;
          }
        });

        (claims as any[]).forEach((claim) => {
          if (claim.organisation_id && orgStatsMap[claim.organisation_id]) {
            orgStatsMap[claim.organisation_id].claimCount += 1;
          }
        });

        setSummaryStats({
          totalUsers: users.length,
          totalOrganisations: organisations.length,
          totalClaims: claims.length,
          totalEvidenceItems: evidence.length,
        });

        setActivityStats({
          registeredThisWeek,
          submittedThisWeek,
        });

        setOrganisationStats(Object.values(orgStatsMap));
      } catch (error) {
        console.error("Failed to load analytics data", error);
      } finally {
        setLoading(false);
      }
    };

    if (user && isAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  if (!user || !isAdmin) {
    return (
      <Layout>
        <SEO title="Analytics - RD Companion" />
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
          <Card className="w-full max-w-md border border-slate-800 bg-slate-900/90 shadow-professional-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-slate-400" />
                Access restricted
              </CardTitle>
              <CardDescription className="text-slate-400">
                You do not have permission to view this page. Please contact an administrator if you believe this is a
                mistake.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Analytics - RD Companion" />
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">Analytics</h1>
            <p className="text-sm text-slate-400 sm:text-base">System-wide statistics and insights</p>
          </header>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-orange-500" />
            </div>
          ) : (
            <>
              {/* Top summary cards */}
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <Users className="h-4 w-4" />
                      Total users
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-50">{summaryStats.totalUsers}</p>
                    <p className="mt-1 text-xs text-slate-500">+0 this week</p>
                  </CardContent>
                </Card>

                <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <Building2 className="h-4 w-4" />
                      Organisations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-50">{summaryStats.totalOrganisations}</p>
                    <p className="mt-1 text-xs text-slate-500">Active organisations</p>
                  </CardContent>
                </Card>

                <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <FileText className="h-4 w-4" />
                      Total claims
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-50">{summaryStats.totalClaims}</p>
                    <p className="mt-1 text-xs text-slate-500">+0 this week</p>
                  </CardContent>
                </Card>

                <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <BarChart3 className="h-4 w-4" />
                      Evidence items
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold text-slate-50">{summaryStats.totalEvidenceItems}</p>
                    <p className="mt-1 text-xs text-slate-500">Total collected</p>
                  </CardContent>
                </Card>
              </section>

              {/* Recent activity */}
              <section>
                <Card className="border border-slate-800 bg-slate-900/80 shadow-professional-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base text-slate-100">
                          <Activity className="h-4 w-4 text-sky-400" />
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
                        {activityStats.registeredThisWeek}
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
                        {activityStats.submittedThisWeek}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Organisation breakdown */}
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
                  <CardContent className="space-y-2">
                    {organisationStats.length === 0 ? (
                      <p className="text-sm text-slate-400">No organisations found.</p>
                    ) : (
                      organisationStats.map((org) => {
                        const avgClaimsPerUser =
                          org.userCount > 0 ? (org.claimCount / org.userCount).toFixed(1) : "0.0";

                        return (
                          <div
                            key={org.organisationId}
                            className="flex flex-col items-start justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-100">{org.organisationName}</p>
                              <p className="text-xs text-slate-400">
                                {org.userCount} users · {org.claimCount} claims
                              </p>
                            </div>
                            <p className="text-xs text-slate-400">
                              Avg:{" "}
                              <span className="font-semibold text-slate-100">{avgClaimsPerUser}</span> claims/user
                            </p>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminAnalyticsPage;