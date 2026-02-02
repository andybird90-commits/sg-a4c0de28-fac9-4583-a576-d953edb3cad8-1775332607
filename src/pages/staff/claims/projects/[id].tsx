import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { claimService } from "@/services/claimService";
import { MessageWidget } from "@/components/MessageWidget";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Users,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ClaimProject | null>(null);
  const [claim, setClaim] = useState<any>(null);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProject(id);
    }
  }, [id]);

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from("claim_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!projectData) {
        toast({
          title: "Error",
          description: "Project not found",
          variant: "destructive",
        });
        router.push("/staff/claims");
        return;
      }

      setProject(projectData);

      // Fetch associated claim
      const claimData = await claimService.getClaimById(projectData.claim_id);
      setClaim(claimData);
    } catch (error) {
      console.error("Error loading project:", error);
      toast({
        title: "Error",
        description: "Failed to load project details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      submitted_to_team: { label: "Pending Review", className: "bg-yellow-100 text-yellow-800" },
      team_in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800" },
      awaiting_client_review: { label: "Awaiting Client", className: "bg-purple-100 text-purple-800" },
      revision_requested: { label: "Needs Changes", className: "bg-orange-100 text-orange-800" },
      approved: { label: "Approved", className: "bg-green-100 text-green-800" },
    };

    const config = statusConfig[status || "draft"] || { 
      label: status || "Draft", 
      className: "bg-gray-100 text-gray-800" 
    };
    
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSLABadge = () => {
    if (!project?.due_date) return null;
    const now = new Date();
    const dueDate = new Date(project.due_date);
    const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (hoursLeft < 24) {
      return <Badge className="bg-orange-500">{Math.floor(hoursLeft)}h left</Badge>;
    } else {
      return <Badge className="bg-green-500">{Math.floor(hoursLeft / 24)}d left</Badge>;
    }
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  if (!project || !claim) {
    return (
      <StaffLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <Button onClick={() => router.push("/staff/claims")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Claims
          </Button>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/staff/claims/${project.claim_id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Claim
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <MessageWidget
                  entityType="project"
                  entityId={project.id}
                  entityName={project.name}
                />
              </div>
              <p className="text-muted-foreground mt-1">
                {claim.organisations?.name} • FY {claim.claim_year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getWorkflowStatusBadge(project.workflow_status)}
            {getSLABadge()}
          </div>
        </div>

        {/* Project Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
            {project.description && (
              <CardDescription className="text-base mt-2">
                {project.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {project.start_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(project.start_date), "PPP")}
                  </p>
                </div>
              )}
              {project.end_date && (
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(project.end_date), "PPP")}
                  </p>
                </div>
              )}
              {project.rd_theme && (
                <div>
                  <p className="text-sm text-muted-foreground">R&D Theme</p>
                  <Badge variant="secondary" className="mt-1">
                    {project.rd_theme}
                  </Badge>
                </div>
              )}
              {project.assigned_to_user_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Assigned To</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    <Users className="h-4 w-4 text-primary" />
                    Team Member
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* R&D Details Tabs */}
        <Tabs defaultValue="technical" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="technical">Technical Details</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="activities">Qualifying Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="technical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Technical Understanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.technical_understanding ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {project.technical_understanding}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No technical understanding documented yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Challenges & Uncertainties
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.challenges_uncertainties ? (
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {project.challenges_uncertainties}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No challenges documented yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Qualifying Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.qualifying_activities && Array.isArray(project.qualifying_activities) && project.qualifying_activities.length > 0 ? (
                  <ul className="list-disc list-inside space-y-2">
                    {project.qualifying_activities.map((activity, index) => (
                      <li key={index} className="text-muted-foreground">
                        {activity}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">
                    No qualifying activities documented yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Workflow Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Workflow Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Status</p>
                <p className="text-sm text-muted-foreground">
                  {project.workflow_status === "submitted_to_team" && "Waiting for team to claim"}
                  {project.workflow_status === "team_in_progress" && "Being reviewed by team"}
                  {project.workflow_status === "awaiting_client_review" && "Sent to client for review"}
                  {project.workflow_status === "revision_requested" && "Client requested changes"}
                  {project.workflow_status === "approved" && "Approved by client"}
                  {project.workflow_status === "draft" && "Draft - not submitted yet"}
                </p>
              </div>
              {getWorkflowStatusBadge(project.workflow_status)}
            </div>

            {project.due_date && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(project.due_date), "PPP 'at' p")}
                  </p>
                </div>
                {getSLABadge()}
              </div>
            )}

            {project.assigned_to_user_id && (
              <div className="flex items-center gap-2 pt-4 border-t">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm">
                  This project is currently assigned to a team member
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Created</p>
                <p>{project.created_at ? format(new Date(project.created_at), "PPP") : "N/A"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Last Updated</p>
                <p>{project.updated_at ? format(new Date(project.updated_at), "PPP") : "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}