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
  draft: "bg-gray-500",
  ready_for_review: "bg-blue-500",
  in_review: "bg-yellow-500",
  needs_changes: "bg-orange-500",
  rejected: "bg-red-500",
  transferred: "bg-green-500",
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
        // Fetch both sidekick projects and regular projects
        const [sidekickData, regularData] = await Promise.all([
          sidekickProjectService.getProjectsByOrganisation(currentOrg.id),
          supabase
            .from("projects")
            .select("*")
            .eq("org_id", currentOrg.id)
            .order("created_at", { ascending: false })
        ]);

        // Combine both types
        const combined: CombinedProject[] = [
          ...sidekickData.map(p => ({
            id: p.id,
            name: p.name || "Untitled Project",
            description: p.description,
            created_at: p.created_at,
            type: "sidekick" as const,
            status: p.status,
            sector: p.sector,
            stage: p.stage,
          })),
          ...(regularData.data || []).map(p => ({
            id: p.id,
            name: p.name || "Untitled Project",
            description: p.description,
            created_at: p.created_at,
            type: "regular" as const,
          }))
        ];

        // Sort by created_at
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
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
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Projects</h1>
              <p className="mt-1 text-sm text-slate-400">
                Manage your R&amp;D project ideas and feasibility analyses
              </p>
            </div>
            <Link href="/projects/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-slate-400 mb-4">
                  Create your first project to start tracking R&amp;D ideas and feasibility
                </p>
                <Link href="/projects/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
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
                  className="relative h-full group bg-[#050b16] border border-slate-800 shadow-professional-md hover:border-[#ff6b35]/60 transition-colors"
                >
                  <Link
                    href={`/projects/${project.id}`}
                    className="absolute inset-0 z-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
                  >
                    <span className="sr-only">View {project.name}</span>
                  </Link>
                  <CardHeader className="relative z-10 pointer-events-none pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-50">
                        {project.type === "sidekick" && (
                          <Lightbulb className="w-4 h-4 text-[#ff6b35]" />
                        )}
                        {project.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 pointer-events-auto">
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
                    <CardDescription className="line-clamp-2 text-sm text-slate-300">
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10 pointer-events-none">
                    <div className="flex items-center gap-4 text-sm text-slate-300 flex-wrap">
                      <Badge
                        variant="outline"
                        className="bg-slate-900 text-slate-100 border-slate-700/80 text-[11px] px-2 py-0.5 rounded-full"
                      >
                        {project.type === "sidekick" ? "Companion" : "Project"}
                      </Badge>
                      {project.sector && (
                        <span className="inline-flex items-center">
                          {project.sector}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
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