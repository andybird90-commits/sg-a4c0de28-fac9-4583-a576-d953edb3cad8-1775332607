import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, FileText, Database, ChevronLeft, Loader2, Calendar, Building2 } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

interface AnalyticsData {
  totalUsers: number;
  totalOrganisations: number;
  totalEvidence: number;
  totalProjects: number;
  evidenceThisWeek: number;
  evidenceThisMonth: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  topOrganisations: Array<{
    name: string;
    evidence_count: number;
    user_count: number;
  }>;
  evidenceByType: Record<string, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

export default function AdminAnalytics() {
  const router = useRouter();
  const { notify } = useNotifications();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
    fetchAnalytics();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== "andy.bird@rdmande.uk") {
      notify({ type: "error", title: "Access Denied", message: "Access denied. Admin only." });
      router.push("/home");
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Total users
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Total organisations
      const { count: orgCount } = await supabase
        .from("organisations")
        .select("*", { count: "exact", head: true });

      // Total evidence
      const { data: allEvidence, count: evidenceCount } = await supabase
        .from("evidence_items")
        .select("*", { count: "exact" });

      // Total projects
      const { count: projectCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

      // Evidence this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const { count: evidenceWeekCount } = await supabase
        .from("evidence_items")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo.toISOString());

      // Evidence this month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const { count: evidenceMonthCount } = await supabase
        .from("evidence_items")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneMonthAgo.toISOString());

      // Active users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: activeTodayCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_sign_in_at", today.toISOString());

      // Active users this week
      const { count: activeWeekCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("last_sign_in_at", oneWeekAgo.toISOString());

      // Top organisations by evidence
      const { data: orgs } = await supabase
        .from("organisations")
        .select(`
          id,
          name,
          organisation_users (count),
          evidence_items (count)
        `);

      const topOrgs = (orgs || [])
        .map((org: any) => ({
          name: org.name,
          evidence_count: org.evidence_items?.length || 0,
          user_count: org.organisation_users?.length || 0
        }))
        .sort((a, b) => b.evidence_count - a.evidence_count)
        .slice(0, 5);

      // Evidence by type
      const evidenceByType: Record<string, number> = {};
      (allEvidence || []).forEach((item: any) => {
        const type = item.type || "unknown";
        evidenceByType[type] = (evidenceByType[type] || 0) + 1;
      });

      // Recent activity (last 7 days)
      const recentActivity: Array<{ date: string; count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { count } = await supabase
          .from("evidence_items")
          .select("*", { count: "exact", head: true })
          .gte("created_at", date.toISOString())
          .lt("created_at", nextDate.toISOString());

        recentActivity.push({
          date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          count: count || 0
        });
      }

      setAnalytics({
        totalUsers: userCount || 0,
        totalOrganisations: orgCount || 0,
        totalEvidence: evidenceCount || 0,
        totalProjects: projectCount || 0,
        evidenceThisWeek: evidenceWeekCount || 0,
        evidenceThisMonth: evidenceMonthCount || 0,
        activeUsersToday: activeTodayCount || 0,
        activeUsersWeek: activeWeekCount || 0,
        topOrganisations: topOrgs,
        evidenceByType,
        recentActivity
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      notify({ type: "error", title: "Error", message: "Failed to load analytics" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-500">Failed to load analytics data</p>
        </div>
      </Layout>
    );
  }

  const maxActivityCount = Math.max(...analytics.recentActivity.map(a => a.count), 1);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push("/home")}
              className="mb-4 text-slate-600 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>

            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
                <p className="text-slate-600">System-wide statistics and insights</p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Evidence</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{analytics.totalEvidence}</p>
                    <p className="text-xs text-slate-500 mt-1">All time</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Users</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{analytics.totalUsers}</p>
                    <p className="text-xs text-slate-500 mt-1">Registered accounts</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <Users className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Organisations</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{analytics.totalOrganisations}</p>
                    <p className="text-xs text-slate-500 mt-1">Active clients</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Projects</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{analytics.totalProjects}</p>
                    <p className="text-xs text-slate-500 mt-1">Across all orgs</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <Database className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & User Engagement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Activity Chart */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Evidence Captured (Last 7 Days)
                </CardTitle>
                <CardDescription>Daily evidence submission trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.recentActivity.map((day, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{day.date}</span>
                        <span className="font-semibold text-slate-900">{day.count} items</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${(day.count / maxActivityCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Engagement */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  User Engagement
                </CardTitle>
                <CardDescription>Active user statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Active Today</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      {analytics.activeUsersToday} users
                    </Badge>
                  </div>
                  <div className="w-full bg-emerald-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${(analytics.activeUsersToday / analytics.totalUsers) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Active This Week</span>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {analytics.activeUsersWeek} users
                    </Badge>
                  </div>
                  <div className="w-full bg-blue-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(analytics.activeUsersWeek / analytics.totalUsers) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Evidence This Week</span>
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                      {analytics.evidenceThisWeek} items
                    </Badge>
                  </div>
                  <div className="w-full bg-purple-100 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${(analytics.evidenceThisWeek / analytics.totalEvidence) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Evidence This Month</span>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      {analytics.evidenceThisMonth} items
                    </Badge>
                  </div>
                  <div className="w-full bg-amber-100 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${(analytics.evidenceThisMonth / analytics.totalEvidence) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Organisations & Evidence Types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Organisations */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  Top Organisations
                </CardTitle>
                <CardDescription>Most active organisations by evidence count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topOrganisations.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No organisations yet</p>
                  ) : (
                    analytics.topOrganisations.map((org, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{org.name}</p>
                            <p className="text-sm text-slate-500">{org.user_count} users</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          {org.evidence_count} evidence
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Evidence by Type */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Evidence by Type
                </CardTitle>
                <CardDescription>Distribution of evidence types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.keys(analytics.evidenceByType).length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No evidence captured yet</p>
                  ) : (
                    Object.entries(analytics.evidenceByType)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count], idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 capitalize">{type}</span>
                            <span className="font-semibold text-slate-900">{count} items</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                              style={{ width: `${(count / analytics.totalEvidence) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}