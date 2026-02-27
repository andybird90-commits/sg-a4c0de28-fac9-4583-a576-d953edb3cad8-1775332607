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
  AlertCircle
} from "lucide-react";
import { evidenceService } from "@/services/evidenceService";
import { organisationService, type Project } from "@/services/organisationService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { useNotifications } from "@/contexts/NotificationContext";

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

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) {
      return;
    }

    // If user is staff, always use the staff dashboard instead of the client dashboard
    if (user && isStaff) {
      router.replace("/staff");
      return;
    }

    // If no user after auth loads, redirect to login
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // User is authenticated, load data
    if (currentOrg) {
      loadDashboardData();
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

      const sidekickEvidencePromises = projectsData.map(project => 
        sidekickEvidenceService.getEvidenceByProject(project.id).catch(() => [])
      );
      const sidekickEvidenceArrays = await Promise.all(sidekickEvidencePromises);
      const sidekickEvidenceData = sidekickEvidenceArrays.flat();

      const allEvidence = [...oldEvidenceData, ...sidekickEvidenceData];

      setProjects(projectsData);

      const now = new Date();
      const thisMonth = allEvidence.filter(e => {
        const created = new Date(e.created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentActivity = allEvidence.filter(e => new Date(e.created_at) >= lastWeek).length;

      setStats({
        totalEvidence: allEvidence.length,
        evidenceThisMonth: thisMonth,
        activeProjects: projectsData.length,
        recentActivity
      });
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      
      // Check if it's an auth error
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

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <Layout>
        <SEO title="Dashboard - RD Companion" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6">
          <Card className="max-w-md shadow-professional-lg border-0 w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Loading...</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Please wait while we load your dashboard</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Show auth error state
  if (authError) {
    return (
      <Layout>
        <SEO title="Dashboard - RD Companion" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6">
          <Card className="max-w-md shadow-professional-lg border-0 w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-destructive mb-4" />
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">Session Expired</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">Your session has expired. Redirecting to login...</p>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 sm:p-6">
          <Card className="max-w-md shadow-professional-lg border-0 w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <Building2 className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">No Organisation Selected</h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">Please select an organisation to continue.</p>
                <Button onClick={() => router.push("/organisation-select")} className="gradient-primary w-full sm:w-auto">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 truncate">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium truncate">{currentOrg.name}</span>
                  {currentOrg.sidekick_enabled && (
                    <Badge variant="secondary" className="ml-2 bg-success/10 text-success border-success/20 text-xs">
                      Companion Enabled
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => router.push("/projects/new")} 
                size="lg"
                className="gradient-primary shadow-professional-md hover:shadow-professional-lg transition-professional w-full sm:w-auto"
              >
                <FolderOpen className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                New Project
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-info p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-2xs sm:text-xs lg:text-sm font-medium text-white/80 mb-1 truncate">Total Evidence</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.totalEvidence}</p>
                  </div>
                  <div className="bg-white/20 p-1.5 sm:p-2 lg:p-3 rounded-lg flex-shrink-0">
                    <Layers className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-success p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-2xs sm:text-xs lg:text-sm font-medium text-white/80 mb-1 truncate">This Month</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.evidenceThisMonth}</p>
                  </div>
                  <div className="bg-white/20 p-1.5 sm:p-2 lg:p-3 rounded-lg flex-shrink-0">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-secondary p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-2xs sm:text-xs lg:text-sm font-medium text-white/80 mb-1 truncate">Active Projects</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.activeProjects}</p>
                  </div>
                  <div className="bg-white/20 p-1.5 sm:p-2 lg:p-3 rounded-lg flex-shrink-0">
                    <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-primary p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-2xs sm:text-xs lg:text-sm font-medium text-white/80 mb-1 truncate">Last 7 Days</p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">{stats.recentActivity}</p>
                  </div>
                  <div className="bg-white/20 p-1.5 sm:p-2 lg:p-3 rounded-lg flex-shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-0 shadow-professional-md">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="truncate">Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <Button 
                    onClick={() => router.push("/projects/new")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <FolderOpen className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">New Project</span>
                  </Button>
                  <Button 
                    onClick={() => router.push("/projects")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <BarChart3 className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Browse Projects</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/claims/new")}
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <FileText className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Start New Claim</span>
                  </Button>
                  <Button 
                    onClick={() => router.push("/feasibility")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Lightbulb className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Feasibility Analysis</span>
                  </Button>
                  <Button 
                    onClick={() => router.push("/feasibility/history")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Clock className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Feasibility History</span>
                  </Button>
                  <Button 
                    onClick={() => router.push("/evidence/capture")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Camera className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Capture Evidence</span>
                  </Button>
                  <Button 
                    onClick={() => router.push("/settings")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200 text-xs sm:text-sm lg:text-base h-auto py-2 sm:py-2.5"
                  >
                    <Settings className="mr-2 sm:mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Settings</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="border-0 shadow-professional-md h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0 flex-1">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                      <span className="truncate">Recent Projects</span>
                    </CardTitle>
                    {projects.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push("/projects")}
                        className="text-primary hover:text-primary hover:bg-primary/10 flex-shrink-0 text-xs sm:text-sm"
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
                      <div className="bg-muted rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Create your first project to organize your R&D work
                      </p>
                      <Button 
                        onClick={() => router.push("/projects/new")}
                        className="gradient-primary w-full sm:w-auto"
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Create Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {projects.slice(0, 8).map((project) => {
                        return (
                          <div
                            key={project.id}
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="p-4 sm:p-5 rounded-lg border border-slate-200 hover:border-primary hover:shadow-professional-md transition-professional cursor-pointer bg-white"
                          >
                            <div className="flex items-start justify-between gap-3 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1">
                                    {project.name}
                                  </h3>
                                  <Badge 
                                    variant="default"
                                    className="text-2xs bg-success/10 text-success border-success/20 flex items-center gap-1 flex-shrink-0"
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
                                  <span className="truncate">{new Date(project.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>

                              <div className="flex-shrink-0">
                                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg">
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
    </Layout>
  );
}