import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, FolderOpen, ArrowLeft, FileText } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];

export default function NewClaimFromProjectsPage() {
  const router = useRouter();
  const { user, currentOrg, loading: authLoading } = useApp();
  const { notify } = useNotifications();

  const [projects, setProjects] = useState<SidekickProject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [claimYear, setClaimYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!currentOrg) {
      router.push("/organisation-select");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await sidekickProjectService.getProjectsByOrganisation(
          currentOrg.id
        );

        setProjects(data);
      } catch (error: any) {
        console.error("[NewClaimFromProjectsPage] Error loading projects:", error);
        notify({
          type: "error",
          title: "Failed to load projects",
          message: error?.message || "Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, user, currentOrg, router, notify]);

  const toggleProject = (projectId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleCreateClaim = async () => {
    if (!currentOrg || !user) {
      return;
    }

    if (selectedIds.size === 0) {
      notify({
        type: "error",
        title: "No projects selected",
        message: "Please select at least one project to include in the claim.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/claims/start-from-sidekick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId: currentOrg.id,
          claimYear,
          sidekickProjectIds: Array.from(selectedIds),
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        notify({
          type: "error",
          title: "Could not start claim",
          message: result?.error || "Please try again.",
        });
        return;
      }

      notify({
        type: "success",
        title: "Claim created",
        message: "Your selected projects have been attached to a new claim.",
      });

      router.push("/projects");
    } catch (error: any) {
      console.error("[NewClaimFromProjectsPage] Error creating claim:", error);
      notify({
        type: "error",
        title: "Unexpected error",
        message: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <SEO title="Start New Claim - RD Companion" />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Start New Claim - RD Companion" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Start New Claim
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Select existing projects to include in a new R&amp;D claim.
                </p>
              </div>
            </div>
          </div>

          <Card className="mb-6 border-0 shadow-professional-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Claim details
              </CardTitle>
              <CardDescription>
                Choose the accounting year and which projects should be part of
                this claim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Claim year
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={claimYear}
                    onChange={(e) => setClaimYear(Number(e.target.value) || claimYear)}
                    className="w-32 border rounded-md px-3 py-2 text-sm bg-background"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Typically this is the year end of the accounting period you are
                    claiming for.
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    You can reuse projects across multiple years if they remain
                    relevant. Your R&amp;D team will handle the detailed
                    allocation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-professional-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Select projects
              </CardTitle>
              <CardDescription>
                Choose which Sidekick projects should be included in this claim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground mb-3">
                    You don&apos;t have any projects yet.
                  </p>
                  <Button
                    onClick={() => router.push("/projects/new")}
                    className="gradient-primary"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Create your first project
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {projects.map((project) => {
                      const isSelected = selectedIds.has(project.id);
                      return (
                        <label
                          key={project.id}
                          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:p-4 cursor-pointer hover:border-primary/70 hover:shadow-professional-sm transition-professional"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProject(project.id)}
                            className="mt-1 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm sm:text-base text-foreground line-clamp-1">
                                {project.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-2xs bg-success/10 text-success border-success/20"
                              >
                                {project.status || "draft"}
                              </Badge>
                              {project.sector && (
                                <Badge variant="outline" className="text-2xs">
                                  {project.sector}
                                </Badge>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-1">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {project.start_date && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(project.start_date).toLocaleDateString()}
                                  </span>
                                </span>
                              )}
                              {project.stage && (
                                <span className="inline-flex items-center">
                                  Stage: {project.stage}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Selected projects:{" "}
                      <span className="font-medium">{selectedIds.size}</span>
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/projects")}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="gradient-primary"
                        onClick={handleCreateClaim}
                        disabled={submitting || selectedIds.size === 0}
                      >
                        {submitting ? "Creating claim..." : "Create claim"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}