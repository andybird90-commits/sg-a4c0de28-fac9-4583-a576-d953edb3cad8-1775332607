import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  FolderOpen,
  Settings,
  TrendingUp,
  Calendar,
  Layers,
  Activity,
  Building2,
  Shield,
  ArrowRight,
  BarChart3,
  Users,
  Clock,
  Lightbulb,
  FileText,
  CheckCircle2,
  AlertCircle,
  Mic,
  ClipboardList,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { evidenceService } from "@/services/evidenceService";
import { organisationService, type Project } from "@/services/organisationService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { useNotifications } from "@/contexts/NotificationContext";
import { VoiceNoteModal } from "@/components/voice-notes/VoiceNoteModal";
import { organisationNotificationStatusService } from "@/services/organisationNotificationStatusService";
import type { NotificationStatusState } from "@/services/organisationNotificationStatusService";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { user, currentOrg, loading: authLoading, isStaff } = useApp();
  const { notify } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    totalEvidence: 0,
    evidenceThisMonth: 0,
    activeProjects: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [isVoiceNoteOpen, setIsVoiceNoteOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatusState | null>(null);
  const [notificationDeadline, setNotificationDeadline] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user && isStaff) {
      router.replace("/staff");
      return;
    }

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (currentOrg) {
      loadDashboardData();
      organisationNotificationStatusService
        .getOrganisationNotificationStatus(currentOrg.id)
        .then((status) => {
          if (status) {
            setNotificationStatus(status.status as NotificationStatusState);
            setNotificationDeadline(status.deadline_date);
          } else {
            setNotificationStatus(null);
            setNotificationDeadline(null);
          }
        })
        .catch((err) => {
          console.error("Failed to load organisation notification status for dashboard", err);
        });
    } else {
      setLoading(false);
    }
  }, [user, currentOrg, authLoading, isStaff, router]);

  const loadDashboardData = async () => {
    if (!currentOrg) return;

    setLoading(true);
    setAuthError(false);
    try {
      const [oldEvidenceData, projectsData] = await Promise.all([
        evidenceService.getEvidence(currentOrg.id),
        organisationService.getProjects(currentOrg.id)
      ]);

      const sidekickEvidencePromises = projectsData.map((project) =>
        sidekickEvidenceService.getEvidenceByProject(project.id).catch(() => [])
      );
      const sidekickEvidenceArrays = await Promise.all(sidekickEvidencePromises);
      const sidekickEvidenceData = sidekickEvidenceArrays.flat();

      const allEvidence = [...oldEvidenceData, ...sidekickEvidenceData];

      setProjects(projectsData);

      const now = new Date();
      const thisMonth = allEvidence.filter((e) => {
        const created = new Date(e.created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentActivity = allEvidence.filter((e) => new Date(e.created_at) >= lastWeek).length;

      setStats({
        totalEvidence: allEvidence.length,
        evidenceThisMonth: thisMonth,
        activeProjects: projectsData.length,
        recentActivity
      });
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);

      if (error?.message?.includes("session") || error?.message?.includes("JWT") || error?.status === 403) {
        setAuthError(true);
        notify({
          type: "error",
          title: "Authentication Error",
          message: "Your session has expired. Please log in again."
        });
        setTimeout(() => router.push("/auth/login"), 2000);
      } else {
        notify({
          type: "error",
          title: "Load failed",
          message: error.message || "Failed to load dashboard data"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.email === "andy.bird@rdmande.uk";

  if (authLoading) {
    return (
      <Layout>
        <SEO title="Dashboard - RD Companion" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 text-foreground">
          <Card className="max-w-md shadow-professional-lg border border-border bg-card w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">Loading...</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Please wait while we load your dashboard
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (authError) {
    return (
      <Layout>
        <SEO title="Dashboard - RD Companion" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 text-foreground">
          <Card className="max-w-md shadow-professional-lg border border-border bg-card w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-destructive mb-4" />
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">Session Expired</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  Your session has expired. Redirecting to login...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!currentOrg) {
    return (
      <Layout>
        <SEO title="Dashboard - RD Companion" />
        <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 text-foreground">
          <Card className="max-w-md shadow-professional-lg border border-border bg-card w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <Building2 className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl sm:text-2xl font-semibold mb-2">No Organisation Selected</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  Please select an organisation to continue.
                </p>
                <Button
                  onClick={() => router.push("/organisation-select")}
                  className="gradient-primary w-full sm:w-auto text-slate-950"
                >
                  Select Organisation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Dashboard - RD Companion" />
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 truncate">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium truncate text-foreground">{currentOrg.name}</span>
                  {currentOrg.sidekick_enabled && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs"
                    >
                      Companion Enabled
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex w-full sm:w-auto sm:justify-end">
                <div className="flex w-full sm:w-auto gap-3 sm:justify-end">
                  <Button
                    onClick={() => router.push("/bulk-upload")}
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto border-border text-foreground hover:bg-muted transition-professional"
                  >
                    <Layers className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Bulk upload
                  </Button>
                  <Button
                    onClick={() => setIsVoiceNoteOpen(true)}
                    size="lg"
                    className="gradient-primary shadow-professional-md hover:shadow-professional-lg transition-professional w-full sm:w-auto text-slate-950"
                  >
                    <Mic className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Voice Note
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {/* Total Evidence */}
            <Card className="bg-card border border-border shadow-professional-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
                    <Layers className="w-4 h-4" />
                  </span>
                  <span>Total Evidence</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold">
                  {stats.totalEvidence}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all projects</p>
              </CardContent>
            </Card>

            {/* This Month */}
            <Card className="bg-card border border-border shadow-professional-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <span>This Month</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold">
                  {stats.evidenceThisMonth}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Evidence items captured</p>
              </CardContent>
            </Card>

            {/* Active Projects */}
            <Card className="bg-card border border-border shadow-professional-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                    <FolderOpen className="w-4 h-4" />
                  </span>
                  <span>Active Projects</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold">
                  {stats.activeProjects}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
              </CardContent>
            </Card>

            {/* Last 7 Days */}
            <Card className="bg-card border border-border shadow-professional-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <span>Last 7 Days</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold">
                  {stats.recentActivity}
                </div>
                <p className="text-xs text-muted-foreground mt-1">New evidence added</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="space-y-4 sm:space-y-6">
              <Card className="border border-border bg-card shadow-professional-md lg:hidden">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="truncate">Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <Button
                    onClick={() => router.push("/projects/new")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <FolderOpen className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">New Project</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/projects")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <BarChart3 className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Browse Projects</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/claims/new")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <FileText className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Start New Claim</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/feasibility")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Lightbulb className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Feasibility Analysis</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/feasibility/history")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Clock className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Feasibility History</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/evidence/capture")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Camera className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Capture Evidence</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/settings")}
                    variant="outline"
                    className="w-full justify-start border-border text-foreground hover:bg-muted transition-professional text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Settings className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Settings</span>
                  </Button>
                </CardContent>
              </Card>

              {/* HMRC Notification card */}
              <Card className="border border-border bg-card shadow-professional-md">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="truncate">HMRC Notification</span>
                    {notificationStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full border",
                          notificationStatus === "submitted"
                            ? "border-emerald-500/60 text-emerald-700 bg-emerald-500/10"
                            : notificationStatus === "not_required"
                            ? "border-slate-400/60 text-slate-700 bg-slate-200/40"
                            : notificationStatus === "overdue"
                            ? "border-red-500/60 text-red-700 bg-red-500/10"
                            : "border-amber-500/60 text-amber-700 bg-amber-500/10"
                        )}
                      >
                        {notificationStatus === "submitted" && "Completed"}
                        {notificationStatus === "not_required" && "Not required"}
                        {notificationStatus === "required" && "Required"}
                        {notificationStatus === "overdue" && "Overdue"}
                        {notificationStatus === "unclear" && "Unclear"}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="mt-1 text-xs text-muted-foreground">
                    {notificationStatus
                      ? notificationStatus === "submitted"
                        ? "Your HMRC pre-notification has been completed for this organisation. Your advisor will let you know if anything further is needed."
                        : notificationStatus === "not_required"
                        ? "Based on your onboarding answers, HMRC pre-notification is not required for this organisation."
                        : notificationStatus === "required"
                        ? "Your advisor needs to complete an HMRC pre-notification for this organisation before a claim can be submitted."
                        : notificationStatus === "overdue"
                        ? "Your HMRC pre-notification is overdue. Your advisor will contact you to complete this before submitting a claim."
                        : "Your advisor is still assessing whether an HMRC pre-notification is required for this organisation."
                      : "We haven’t run an HMRC notification check for this organisation yet. Your advisor will complete this as part of the onboarding process."}
                  </p>
                  {notificationDeadline && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Deadline: <span className="font-medium text-foreground">{notificationDeadline}</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Desktop-only Start New Claim card */}
              <Card className="border border-border bg-card shadow-professional-md hidden lg:block">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10 text-orange-500">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="truncate">Start New Claim</span>
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Begin a new R&amp;D claim for this organisation in just a few steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={() => router.push("/claims/new")}
                    className="w-full gradient-primary text-slate-950 shadow-professional-md hover:shadow-professional-lg transition-professional"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Start New Claim
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="border border-border bg-card shadow-professional-md h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0 flex-1 text-foreground">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Recent Projects</span>
                    </CardTitle>
                    {projects.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/projects")}
                        className="text-primary hover:text-primary/90 hover:bg-muted flex-shrink-0 text-xs sm:text-sm"
                      >
                        View All
                        <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="bg-muted rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4 border border-border">
                        <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">No projects yet</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Create your first project to organize your R&D work
                      </p>
                      <Button
                        onClick={() => router.push("/projects/new")}
                        className="gradient-primary w-full sm:w-auto text-slate-950"
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Create Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {projects.slice(0, 3).map((project) => {
                        return (
                          <div
                            key={project.id}
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="p-4 sm:p-5 rounded-lg border border-border hover:border-primary/70 shadow-professional transition-professional cursor-pointer bg-card"
                          >
                            <div className="flex items-start justify-between gap-3 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1">
                                    {project.name}
                                  </h3>
                                  <Badge
                                    variant="default"
                                    className="text-2xs bg-emerald-500/10 text-emerald-700 border-emerald-500/30 flex items-center gap-1 flex-shrink-0"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Active
                                  </Badge>
                                </div>

                                {project.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                                    {project.description}
                                  </p>
                                )}

                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {new Date(project.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-shrink-0">
                                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg border border-primary/30">
                                  <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <VoiceNoteModal
        open={isVoiceNoteOpen}
        onClose={() => setIsVoiceNoteOpen(false)}
        organisationId={currentOrg.id}
        userId={user?.id ?? ""}
        projects={projects}
      />
    </Layout>
  );
}