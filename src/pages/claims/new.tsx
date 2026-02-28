import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

    const selectedProjects = projects.filter((p) => selectedIds.has(p.id));

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
          userId: user.id,
          projects: selectedProjects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            sector: p.sector,
            start_date: p.start_date,
            end_date: p.end_date,
          })),
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
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title="Start New Claim - RD Companion" />
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex max-w-5xl flex-col px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex text-slate-300 hover:bg-slate-800/70 hover:text-slate-50"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
                  Start New Claim
                </h1>
                <p className="text-sm text-slate-400">
                  Select existing projects to include in a new R&amp;D claim.
                </p>
              </div>
            </div>
          </div>

          <Card className="mb-6 border border-slate-800 bg-slate-900/90 shadow-professional-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-slate-50 sm:text-lg">
                <FileText className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />
                Claim details
              </CardTitle>
              <CardDescription className="text-slate-300">
                Choose the accounting year and which projects should be part of this
                claim.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-100">
                    Claim year
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={claimYear}
                    onChange={(e) =>
                      setClaimYear(Number(e.target.value) || claimYear)
                    }
                    className="w-32 rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/80"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Typically this is the year end of the accounting period you are
                    claiming for.
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-300">
                    You can reuse projects across multiple years if they remain
                    relevant. Your R&amp;D team will handle the detailed allocation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-800 bg-slate-900/90 shadow-professional-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base text-slate-50 sm:text-lg">
                <FolderOpen className="h-4 w-4 text-orange-500 sm:h-5 sm:w-5" />
                Select projects
              </CardTitle>
              <CardDescription className="text-slate-300">
                Choose which Sidekick projects should be included in this claim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
                </div>
              ) : projects.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="mb-3 text-sm text-slate-300">
                    You don&apos;t have any projects yet.
                  </p>
                  <Button
                    onClick={() => router.push("/projects/new")}
                    className="bg-orange-500 text-slate-950 hover:bg-orange-400"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Create your first project
                  </Button>
                </div>
              ) : (
                <>
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {projects.map((project) => {
                      const isSelected = selectedIds.has(project.id);
                      return (
                        <label
                          key={project.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 sm:px-4 sm:py-4 transition-colors ${
                            isSelected
                              ? "border-orange-500/90 bg-slate-900"
                              : "border-slate-700/80 bg-slate-950/70 hover:border-slate-500/90 hover:bg-slate-900"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleProject(project.id)}
                            className="mt-1 flex-shrink-0 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="line-clamp-1 text-sm font-semibold text-slate-50 sm:text-base">
                                {project.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="border-emerald-400/40 bg-emerald-500/15 text-[10px] font-medium uppercase tracking-wide text-emerald-300"
                              >
                                {project.status || "draft"}
                              </Badge>
                              {project.sector && (
                                <Badge
                                  variant="outline"
                                  className="border-slate-600 bg-slate-900/80 text-[10px] text-slate-200"
                                >
                                  {project.sector}
                                </Badge>
                              )}
                            </div>
                            {project.description && (
                              <p className="mb-1 line-clamp-2 text-xs text-slate-300 sm:text-sm">
                                {project.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                              {project.start_date && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(
                                      project.start_date
                                    ).toLocaleDateString()}
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
                  <div className="mt-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-xs text-slate-400 sm:text-sm">
                      Selected projects:{" "}
                      <span className="font-medium text-slate-100">
                        {selectedIds.size}
                      </span>
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push("/projects")}
                        className="border-slate-600 bg-slate-900/80 text-slate-100 hover:bg-slate-800 hover:text-slate-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-orange-500 text-slate-950 hover:bg-orange-400 disabled:bg-orange-500/40 disabled:text-slate-300"
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