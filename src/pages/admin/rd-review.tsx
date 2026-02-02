import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { AdminNav } from "@/components/AdminNav";
import { useApp } from "@/contexts/AppContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Building2, Eye, Calendar, DollarSign, Users, AlertCircle } from "lucide-react";
import { MessageWidget } from "@/components/MessageWidget";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"] & {
  organisations?: {
    name: string;
    sidekick_enabled: boolean;
    linked_conexa_company_name: string | null;
  };
};

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

export default function RDReviewPage() {
  const router = useRouter();
  const { user } = useApp();
  const [projects, setProjects] = useState<SidekickProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const data = await sidekickProjectService.getProjectsForReview(statusFilter || undefined);
        setProjects(data);
      } catch (error) {
        console.error("Error fetching projects for review:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, statusFilter]);

  if (!user) return null;

  return (
    <>
      <SEO
        title="RD Review Queue - RD Sidekick Admin"
        description="Review Sidekick projects from clients"
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <AdminNav />

          <div className="mt-8">
            <h1 className="text-3xl font-bold mb-2">RD Review Queue</h1>
            <p className="text-muted-foreground mb-6">
              Review and manage Sidekick projects submitted by clients
            </p>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-6">
              <TabsList>
                <TabsTrigger value="">All Projects</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="ready_for_review">Ready for Review</TabsTrigger>
                <TabsTrigger value="in_review">In Review</TabsTrigger>
                <TabsTrigger value="needs_changes">Needs Changes</TabsTrigger>
              </TabsList>

              <TabsContent value={statusFilter}>
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading projects...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No projects in this status</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {projects.map((project) => (
                      <Card key={project.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <CardTitle className="text-xl">{project.name}</CardTitle>
                                <Badge className={statusColors[project.status]}>
                                  {statusLabels[project.status]}
                                </Badge>
                              </div>
                              
                              {project.description && (
                                <p className="text-sm text-muted-foreground mb-4">
                                  {project.description}
                                </p>
                              )}

                              {/* Organization Info */}
                              <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                                {project.organisations && (
                                  <div className="flex items-center gap-1">
                                    <Building2 className="w-4 h-4" />
                                    <span>{project.organisations.name}</span>
                                    {project.organisations.sidekick_enabled && (
                                      <Badge variant="outline" className="ml-1">
                                        Sidekick Enabled
                                      </Badge>
                                    )}
                                    {project.organisations.linked_conexa_company_name && (
                                      <Badge variant="secondary" className="ml-1">
                                        Linked: {project.organisations.linked_conexa_company_name}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                {project.sector && <Badge variant="outline">{project.sector}</Badge>}
                                {project.stage && <Badge variant="outline">{project.stage}</Badge>}
                              </div>

                              {/* Project Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                                {/* Timeline */}
                                {(project.start_date || project.end_date) && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <Calendar className="w-4 h-4" />
                                      <span>Timeline</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground pl-6">
                                      {project.start_date && (
                                        <div>Start: {new Date(project.start_date).toLocaleDateString()}</div>
                                      )}
                                      {project.end_date && (
                                        <div>End: {new Date(project.end_date).toLocaleDateString()}</div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Budget */}
                                {(project.total_budget || project.rd_budget) && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <DollarSign className="w-4 h-4" />
                                      <span>Budget</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground pl-6">
                                      {project.total_budget && (
                                        <div>Total: £{Number(project.total_budget).toLocaleString()}</div>
                                      )}
                                      {project.rd_budget && (
                                        <div>R&D: £{Number(project.rd_budget).toLocaleString()}</div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Team */}
                                {project.team_members && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <Users className="w-4 h-4" />
                                      <span>Team Members</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground pl-6">
                                      {project.team_members}
                                    </div>
                                  </div>
                                )}

                                {/* R&D Challenges */}
                                {project.rd_challenges && (
                                  <div className="space-y-1 md:col-span-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <AlertCircle className="w-4 h-4" />
                                      <span>R&D Challenges</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground pl-6">
                                      {project.rd_challenges.length > 200 
                                        ? `${project.rd_challenges.substring(0, 200)}...` 
                                        : project.rd_challenges}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {project.ready_for_review_at && (
                                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  Ready for review: {new Date(project.ready_for_review_at).toLocaleString()}
                                </div>
                              )}
                            </div>
                            <Link href={`/admin/rd-review/${project.id}`}>
                              <Button size="sm" className="ml-4">
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                            </Link>
                            <MessageWidget
                              entityType="project"
                              entityId={project.id}
                              entityName={project.name}
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </>
  );
}