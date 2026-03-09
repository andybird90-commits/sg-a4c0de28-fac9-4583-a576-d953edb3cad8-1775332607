import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageWidget } from "@/components/MessageWidget";
import { Plus, FolderOpen, Clock, Lightbulb } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type RegularProject = Database["public"]["Tables"]["projects"]["Row"];

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
  const [projects, setProjects] = useState<CombinedProject[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [sidekickData, regularData] = await Promise.all([
          sidekickProjectService.getProjectsByOrganisation(currentOrg.id),
          supabase
            .from("projects")
            .select("*")
            .eq("org_id", currentOrg.id)
            .order("created_at", { ascending: false }),
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
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentOrg]);

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
        </div>
      </Layout>
    </>
  );
}