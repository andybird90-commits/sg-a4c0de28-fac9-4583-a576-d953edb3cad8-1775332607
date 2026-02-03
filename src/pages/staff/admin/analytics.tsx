import { useEffect, useState } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, Building2, FileText, Clock } from "lucide-react";

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
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get total counts
      const [usersCount, orgsCount, claimsCount, evidenceCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("organisations").select("*", { count: "exact", head: true }),
        supabase.from("claims").select("*", { count: "exact", head: true }),
        supabase.from("evidence_items").select("*", { count: "exact", head: true }),
      ]);

      // Get recent activity (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      const [newUsers, newClaims] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", weekAgoISO),
        supabase
          .from("claims")
          .select("*", { count: "exact", head: true })
          .gte("created_at", weekAgoISO),
      ]);

      // Get organisation stats
      const { data: orgs } = await supabase
        .from("organisations")
        .select("id, name");

      const orgStats = await Promise.all(
        (orgs || []).map(async (org) => {
          const [users, claims] = await Promise.all([
            supabase
              .from("organisation_users")
              .select("*", { count: "exact", head: true })
              .eq("organisation_id", org.id),
            supabase
              .from("claims")
              .select("*", { count: "exact", head: true })
              .eq("organisation_id", org.id),
          ]);

          return {
            name: org.name,
            userCount: users.count || 0,
            claimCount: claims.count || 0,
          };
        })
      );

      setAnalytics({
        totalUsers: usersCount.count || 0,
        totalOrganisations: orgsCount.count || 0,
        totalClaims: claimsCount.count || 0,
        totalEvidence: evidenceCount.count || 0,
        recentActivity: {
          newUsersThisWeek: newUsers.count || 0,
          newClaimsThisWeek: newClaims.count || 0,
          activeUsersToday: 0, // Would need session tracking to implement
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-slate-600 mt-2">System-wide statistics and insights</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : analytics.totalUsers}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                +{analytics.recentActivity.newUsersThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Organisations</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : analytics.totalOrganisations}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active organisations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Claims</CardTitle>
              <FileText className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : analytics.totalClaims}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                +{analytics.recentActivity.newClaimsThisWeek} this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Evidence Items</CardTitle>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : analytics.totalEvidence}
              </div>
              <p className="text-xs text-slate-500 mt-1">Total collected</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Activity from the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">New Users</p>
                    <p className="text-sm text-slate-600">Registered this week</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {analytics.recentActivity.newUsersThisWeek}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">New Claims</p>
                    <p className="text-sm text-slate-600">Submitted this week</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.recentActivity.newClaimsThisWeek}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organisation Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organisation Breakdown
            </CardTitle>
            <CardDescription>Users and claims by organisation</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : analytics.organisationStats.length === 0 ? (
              <p className="text-slate-500">No organisations found</p>
            ) : (
              <div className="space-y-4">
                {analytics.organisationStats.map((org, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <div className="flex gap-4 mt-1 text-sm text-slate-600">
                        <span>{org.userCount} users</span>
                        <span>{org.claimCount} claims</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">
                        Avg: {org.userCount > 0 ? (org.claimCount / org.userCount).toFixed(1) : 0} claims/user
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}