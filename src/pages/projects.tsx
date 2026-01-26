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
import { Plus, FolderOpen, Clock } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];

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
  const [projects, setProjects] = useState<SidekickProject[]>([]);
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
        const data = await sidekickProjectService.getProjectsByOrganisation(currentOrg.id);
        setProjects(data);
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
        title="Projects - RD Sidekick"
        description="Manage your R&D projects and feasibility analyses"
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-1">
                Manage your R&D project ideas and feasibility analyses
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
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first project to start tracking R&D ideas and feasibility
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
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Badge className={statusColors[project.status]}>
                          {statusLabels[project.status]}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {project.sector && (
                          <span className="inline-flex items-center">
                            {project.sector}
                          </span>
                        )}
                        {project.stage && (
                          <Badge variant="outline">{project.stage}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(project.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}