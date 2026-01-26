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
import { useNotifications } from "@/contexts/NotificationContext";

export default function HomePage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const { notify } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({
    totalEvidence: 0,
    evidenceThisMonth: 0,
    activeProjects: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrg) {
      loadDashboardData();
    }
  }, [currentOrg]);

  const loadDashboardData = async () => {
    if (!currentOrg) return;

    setLoading(true);
    try {
      const [evidenceData, projectsData] = await Promise.all([
        evidenceService.getEvidence(currentOrg.id),
        organisationService.getProjects(currentOrg.id)
      ]);

      setProjects(projectsData);

      const now = new Date();
      const thisMonth = evidenceData.filter(e => {
        const created = new Date(e.created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const recentActivity = evidenceData.filter(e => new Date(e.created_at) >= lastWeek).length;

      setStats({
        totalEvidence: evidenceData.length,
        evidenceThisMonth: thisMonth,
        activeProjects: projectsData.length,
        recentActivity
      });
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      notify({
        type: "error",
        title: "Load failed",
        message: error.message || "Failed to load dashboard data"
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.email === "andy.bird@rdmande.uk";

  if (!currentOrg) {
    return (
      <Layout>
        <SEO title="Dashboard - RD Sidekick" />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
          <Card className="max-w-md shadow-professional-lg border-0">
            <CardContent className="pt-6">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">No Organisation Selected</h2>
                <p className="text-muted-foreground mb-6">Please select an organisation to continue.</p>
                <Button onClick={() => router.push("/organisation-select")} className="gradient-primary">
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
      <SEO title="Dashboard - RD Sidekick" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{currentOrg.name}</span>
                  {currentOrg.sidekick_enabled && (
                    <Badge variant="secondary" className="ml-2 bg-success/10 text-success border-success/20">
                      Sidekick Enabled
                    </Badge>
                  )}
                </div>
              </div>
              <Button 
                onClick={() => router.push("/projects/new")} 
                size="lg"
                className="gradient-primary shadow-professional-md hover:shadow-professional-lg transition-professional"
              >
                <FolderOpen className="mr-2 h-5 w-5" />
                New Project
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-info p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Total Evidence</p>
                    <p className="text-3xl font-bold text-white">{stats.totalEvidence}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-success p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-white">{stats.evidenceThisMonth}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-secondary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Active Projects</p>
                    <p className="text-3xl font-bold text-white">{stats.activeProjects}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="border-0 shadow-professional-md hover:shadow-professional-lg transition-professional overflow-hidden">
              <div className="gradient-primary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-1">Last 7 Days</p>
                    <p className="text-3xl font-bold text-white">{stats.recentActivity}</p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Quick Actions */}
            <div className="space-y-6">
              <Card className="border-0 shadow-professional-md">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => router.push("/projects/new")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200"
                  >
                    <FolderOpen className="mr-3 h-4 w-4" />
                    New Project
                  </Button>
                  <Button 
                    onClick={() => router.push("/projects")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200"
                  >
                    <BarChart3 className="mr-3 h-4 w-4" />
                    Browse Projects
                  </Button>
                  <Button 
                    onClick={() => router.push("/feasibility")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200"
                  >
                    <Lightbulb className="mr-3 h-4 w-4" />
                    Feasibility Analysis
                  </Button>
                  <Button 
                    onClick={() => router.push("/evidence/capture")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200"
                  >
                    <Camera className="mr-3 h-4 w-4" />
                    Capture Evidence
                  </Button>
                  <Button 
                    onClick={() => router.push("/settings")} 
                    variant="outline"
                    className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-professional border-slate-200"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Settings
                  </Button>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card className="border-0 shadow-professional-md bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Admin Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-4 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                      onClick={() => router.push("/admin/organisations")}
                    >
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Building2 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Organisations</p>
                        <p className="text-xs text-slate-500">Manage client orgs</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-4 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                      onClick={() => router.push("/admin/users")}
                    >
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">User Management</p>
                        <p className="text-xs text-slate-500">View all users</p>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-auto py-4 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                      onClick={() => router.push("/admin/analytics")}
                    >
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-900">Analytics</p>
                        <p className="text-xs text-slate-500">System insights</p>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Recent Projects */}
            <div className="lg:col-span-2">
              <Card className="border-0 shadow-professional-md h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Recent Projects
                    </CardTitle>
                    {projects.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push("/projects")}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
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
                    <div className="text-center py-12">
                      <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                      <p className="text-muted-foreground text-sm mb-6">
                        Create your first project to organize your R&D work
                      </p>
                      <Button 
                        onClick={() => router.push("/projects/new")}
                        className="gradient-primary"
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Create Your First Project
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.slice(0, 8).map((project) => {
                        return (
                          <div
                            key={project.id}
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="p-5 rounded-lg border border-slate-200 hover:border-primary hover:shadow-professional-md transition-professional cursor-pointer bg-white"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-base text-foreground line-clamp-1">
                                    {project.name}
                                  </h3>
                                  <Badge 
                                    variant="default"
                                    className="text-2xs bg-success/10 text-success border-success/20 flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Active
                                  </Badge>
                                </div>
                                
                                {project.description && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {project.description}
                                  </p>
                                )}

                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                  {new Date(project.created_at).toLocaleDateString()}
                                </div>
                              </div>

                              <div className="flex-shrink-0">
                                <div className="bg-primary/10 p-3 rounded-lg">
                                  <FolderOpen className="h-5 w-5 text-primary" />
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