import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { bulkProjectService, type BulkProject } from "@/services/bulkProjectService";
import { claimService } from "@/services/claimService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageWidget } from "@/components/MessageWidget";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FolderOpen, Clock, Lightbulb, Layers } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type RegularProject = Database["public"]["Tables"]["projects"]["Row"];
type ClaimRow = Database["public"]["Tables"]["claims"]["Row"];
type ClaimProjectRow = Database["public"]["Tables"]["claim_projects"]["Row"];

interface CombinedProject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  type: "sidekick" | "regular";
  status?: string;
  sector?: string | null;
  stage?: string | null;
}

interface ClaimWithProjects extends ClaimRow {
  projects?: ClaimProjectRow[];
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-foreground",
  ready_for_review: "bg-sky-100 text-sky-800",
  in_review: "bg-amber-100 text-amber-800",
  needs_changes: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
  transferred: "bg-emerald-100 text-emerald-800",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  ready_for_review: "Ready for Review",
  in_review: "In Review",
  needs_changes: "Needs Changes",
  rejected: "Rejected",
  transferred: "Transferred to Conexa",
};

export default function ProjectsPage() {
  const router = useRouter();
  const { user, currentOrg } = useApp();
  const { notify } = useNotifications();
  const [projects, setProjects] = useState<CombinedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkProjects, setBulkProjects] = useState<BulkProject[]>([]);
  const [bulkLoading, setBulkLoading] = useState(true);

  const [claimSelectionOpen, setClaimSelectionOpen] = useState(false);
  const [selectedBulkProject, setSelectedBulkProject] = useState<BulkProject | null>(null);
  const [selectedSidekickProject, setSelectedSidekickProject] = useState<{
    id: string;
    name: string;
    description?: string | null;
  } | null>(null);
  const [claimsForOrg, setClaimsForOrg] = useState<ClaimWithProjects[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [attachingToClaim, setAttachingToClaim] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!currentOrg) return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        setBulkLoading(true);

        const [sidekickData, regularData, bulkData] = await Promise.all([
          sidekickProjectService.getProjectsByOrganisation(currentOrg.id),
          supabase
            .from("projects")
            .select("*")
            .eq("org_id", currentOrg.id)
            .order("created_at", { ascending: false }),
          bulkProjectService.getProjectsForOrganisation(currentOrg.id),
        ]);

        const combined: CombinedProject[] = [
          ...sidekickData.map((p) => ({
            id: p.id,
            name: p.name || "Untitled Project",
            description: p.description,
            created_at: p.created_at,
            type: "sidekick" as const,
            status: p.status,
            sector: p.sector,
            stage: p.stage,
          })),
          ...(regularData.data || []).map((p: RegularProject) => ({
            id: p.id,
            name: p.name || "Untitled Project",
            description: p.description,
            created_at: p.created_at,
            type: "regular" as const,
          })),
        ];

        combined.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        setProjects(combined);
        setBulkProjects(bulkData || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
        setBulkLoading(false);
      }
    };

    fetchProjects();
  }, [currentOrg]);

  const loadClaimsForOrganisation = async () => {
    if (!currentOrg) return;

    try {
      setClaimsLoading(true);
      const { data, error } = await supabase
        .from("claims")
        .select(
          `
          id,
          org_id,
          claim_year,
          status,
          period_start,
          period_end,
          created_at,
          projects:claim_projects(
            id,
            name,
            status,
            workflow_status
          )
        `
        )
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ProjectsPage] Error loading claims for Add to claim:", error);
        notify({
          type: "error",
          title: "Could not load claims",
          message: error.message ?? "Please try again.",
        });
        return;
      }

      setClaimsForOrg((data as ClaimWithProjects[]) || []);
    } catch (error: any) {
      console.error("[ProjectsPage] Unexpected error loading claims:", error);
      notify({
        type: "error",
        title: "Could not load claims",
        message: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setClaimsLoading(false);
    }
  };

  const openAddBulkToClaim = (project: BulkProject) => {
    setSelectedBulkProject(project);
    setSelectedSidekickProject(null);
    setSelectedClaimId(null);
    setClaimSelectionOpen(true);
    void loadClaimsForOrganisation();
  };

  const openAddSidekickToClaim = (project: CombinedProject) => {
    setSelectedSidekickProject({
      id: project.id,
      name: project.name,
      description: project.description,
    });
    setSelectedBulkProject(null);
    setSelectedClaimId(null);
    setClaimSelectionOpen(true);
    void loadClaimsForOrganisation();
  };

  const handleAttachProjectToClaim = async () => {
    if (!user || !currentOrg || !selectedClaimId) {
      return;
    }

    try {
      setAttachingToClaim(true);

      if (selectedBulkProject) {
        const { error } = await supabase.from("claim_projects").insert({
          claim_id: selectedClaimId,
          org_id: currentOrg.id,
          name: selectedBulkProject.name,
          description: selectedBulkProject.description,
          rd_theme: selectedBulkProject.sector,
          created_by: user.id,
        });

        if (error) {
          console.error("[ProjectsPage] Error attaching bulk project to claim:", error);
          notify({
            type: "error",
            title: "Could not add to claim",
            message: error.message ?? "Please try again.",
          });
          return;
        }

        notify({
          type: "success",
          title: "Bulk project added to claim",
          message: "This bulk project has been added to the selected claim.",
        });
      } else if (selectedSidekickProject) {
        try {
          await claimService.importSidekickProject(
            selectedClaimId,
            currentOrg.id,
            selectedSidekickProject.id
          );
        } catch (error: any) {
          console.error("[ProjectsPage] Error attaching sidekick project to claim:", error);
          notify({
            type: "error",
            title: "Could not add to claim",
            message: error?.message || "Something went wrong. Please try again.",
          });
          return;
        }

        notify({
          type: "success",
          title: "Project added to claim",
          message: "This project has been added to the selected claim.",
        });
      } else {
        return;
      }

      setClaimSelectionOpen(false);
      setSelectedBulkProject(null);
      setSelectedSidekickProject(null);
      setSelectedClaimId(null);
    } catch (error: any) {
      console.error("[ProjectsPage] Unexpected error attaching project to claim:", error);
      notify({
        type: "error",
        title: "Could not add to claim",
        message: error?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setAttachingToClaim(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <SEO
        title="Projects - RD Companion"
        description="Manage your R&D projects and feasibility analyses"
      />
      <Layout>
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Projects</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your R&amp;D project ideas and feasibility analyses
              </p>
            </div>
            <Link href="/projects/new">
              <Button className="shadow-professional-md">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card className="bg-card shadow-professional-md">
              <CardContent className="py-12 text-center">
                <FolderOpen className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 text-xl font-semibold text-foreground">No projects yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first project to start tracking R&amp;D ideas and feasibility
                </p>
                <Link href="/projects/new">
                  <Button className="shadow-professional-md">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="group relative h-full border border-border bg-card shadow-professional-md transition-colors hover:border-[#ff6b35]/60"
                >
                  <Link
                    href={`/projects/${project.id}`}
                    className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <span className="sr-only">View {project.name}</span>
                  </Link>
                  <CardHeader className="pointer-events-none relative pb-4">
                    <div className="mb-2 flex items-start justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                        {project.type === "sidekick" && (
                          <Lightbulb className="h-4 w-4 text-[#ff6b35]" />
                        )}
                        {project.name}
                      </CardTitle>
                      <div className="pointer-events-auto flex items-center gap-2">
                        {project.type === "sidekick" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-border px-2 py-1 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openAddSidekickToClaim(project);
                            }}
                          >
                            Add to claim
                          </Button>
                        )}
                        {project.status && (
                          <Badge className={statusColors[project.status]}>
                            {statusLabels[project.status]}
                          </Badge>
                        )}
                        <MessageWidget
                          entityType="project"
                          entityId={project.id}
                          entityName={project.name}
                        />
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pointer-events-none relative">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="rounded-full border-border bg-muted px-2 py-0.5 text-[11px]"
                      >
                        {project.type === "sidekick" ? "Companion" : "Project"}
                      </Badge>
                      {project.sector && (
                        <span className="inline-flex items-center text-xs font-medium text-muted-foreground">
                          {project.sector}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Bulk projects</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review bulk R&amp;D project uploads prepared for your advisor.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex shadow-professional-md"
                onClick={() => router.push("/bulk-upload")}
              >
                <Layers className="mr-2 h-4 w-4" />
                New bulk project
              </Button>
            </div>

            {bulkLoading ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Loading bulk projects...</p>
              </div>
            ) : bulkProjects.length === 0 ? (
              <Card className="bg-card shadow-professional-md">
                <CardContent className="py-8 text-center">
                  <p className="mb-3 text-sm text-muted-foreground">
                    You do not have any bulk projects yet.
                  </p>
                  <Button
                    className="shadow-professional-md"
                    onClick={() => router.push("/bulk-upload")}
                  >
                    <Layers className="mr-2 h-4 w-4" />
                    Start a bulk project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bulkProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="flex h-full flex-col border border-border bg-card shadow-professional-md"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-foreground">
                        {project.name || "Untitled bulk project"}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto flex flex-col gap-3 pb-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {project.sector && (
                          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
                            {project.sector}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border"
                          onClick={() =>
                            router.push(`/bulk-upload?bulkProjectId=${project.id}`)
                          }
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          className="bg-orange-500 text-slate-950 shadow-professional-md hover:bg-orange-400"
                          onClick={() => openAddBulkToClaim(project)}
                        >
                          Add to claim
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={claimSelectionOpen}
          onOpenChange={(open) => {
            setClaimSelectionOpen(open);
            if (!open) {
              setSelectedBulkProject(null);
              setSelectedSidekickProject(null);
              setSelectedClaimId(null);
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                Add project to an existing claim
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Choose which claim this project should be attached to. You can see which projects
                are already in each claim.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 space-y-4">
              {selectedBulkProject ? (
                <div className="rounded-md border border-border bg-muted/60 p-3 text-sm">
                  <p className="font-medium text-foreground">{selectedBulkProject.name}</p>
                  {selectedBulkProject.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {selectedBulkProject.description}
                    </p>
                  )}
                </div>
              ) : (
                selectedSidekickProject && (
                  <div className="rounded-md border border-border bg-muted/60 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {selectedSidekickProject.name}
                    </p>
                    {selectedSidekickProject.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {selectedSidekickProject.description}
                      </p>
                    )}
                  </div>
                )
              )}

              {claimsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-orange-500" />
                </div>
              ) : claimsForOrg.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  There are no claims for this organisation yet. Create a claim first, then add this
                  project.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {claimsForOrg.map((claim) => {
                    const projectsInClaim = ((claim as any).projects ||
                      []) as ClaimProjectRow[];
                    const isSelected = selectedClaimId === claim.id;

                    return (
                      <button
                        key={claim.id}
                        type="button"
                        onClick={() => setSelectedClaimId(claim.id)}
                        className={`w-full rounded-lg border px-3 py-3 text-left text-sm transition-colors sm:px-4 sm:py-3.5 ${
                          isSelected
                            ? "border-orange-500 bg-orange-50"
                            : "border-border bg-background hover:border-slate-400 hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Claim {claim.claim_year}
                            </p>
                            {claim.period_start && claim.period_end && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Period{" "}
                                {new Date(claim.period_start).toLocaleDateString()} –{" "}
                                {new Date(claim.period_end).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className="whitespace-nowrap border-border bg-muted text-[11px] font-medium capitalize"
                          >
                            {String(claim.status || "")
                              .replace(/_/g, " ")
                              .toLowerCase() || "intake"}
                          </Badge>
                        </div>
                        {projectsInClaim.length > 0 && (
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p className="text-[11px] font-medium uppercase tracking-wide">
                              Projects in claim
                            </p>
                            <ul className="space-y-0.5">
                              {projectsInClaim.slice(0, 3).map((p) => (
                                <li key={p.id} className="truncate">
                                  • {p.name}
                                </li>
                              ))}
                              {projectsInClaim.length > 3 && (
                                <li className="text-[11px]">
                                  + {projectsInClaim.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClaimSelectionOpen(false);
                  setSelectedBulkProject(null);
                  setSelectedSidekickProject(null);
                  setSelectedClaimId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-orange-500 text-slate-950 hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-orange-500/40 disabled:text-slate-300"
                onClick={handleAttachProjectToClaim}
                disabled={
                  !selectedClaimId ||
                  attachingToClaim ||
                  claimsLoading ||
                  claimsForOrg.length === 0
                }
              >
                {attachingToClaim ? "Adding..." : "Add to claim"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}