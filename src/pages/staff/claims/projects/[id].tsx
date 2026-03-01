import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { claimService } from "@/services/claimService";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { sidekickCommentService } from "@/services/sidekickCommentService";
import { feasibilityService, type FeasibilityAnalysis } from "@/services/feasibilityService";
import { sidekickCostAdviceService, type SidekickCostAdvice } from "@/services/sidekickCostAdviceService";
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
  MessageSquare,
  Upload,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];
type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type SidekickEvidenceItem = Database["public"]["Tables"]["sidekick_evidence_items"]["Row"];
type SidekickProjectComment = Database["public"]["Tables"]["sidekick_project_comments"]["Row"] & {
  author?: { email: string };
};
type SidekickCostAdviceRow = SidekickCostAdvice;

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ClaimProject | null>(null);
  const [claim, setClaim] = useState<any>(null);

  // Shared Sidekick project context (client + staff "same pond")
  const [sidekickProject, setSidekickProject] = useState<SidekickProject | null>(null);
  const [sidekickEvidence, setSidekickEvidence] = useState<SidekickEvidenceItem[]>([]);
  const [sidekickComments, setSidekickComments] = useState<SidekickProjectComment[]>([]);
  const [feasibilityAnalysis, setFeasibilityAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [costAdvice, setCostAdvice] = useState<SidekickCostAdviceRow[]>([]);

  // Evidence form state (staff adding evidence into shared Sidekick pool)
  const [evidenceType, setEvidenceType] = useState<"note" | "file" | "link">("note");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceSubmitting, setEvidenceSubmitting] = useState(false);

  // Comment form state for "Staff says"
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [sendBackMode, setSendBackMode] = useState<"awaiting_client_review" | "revision_requested">("awaiting_client_review");
  const [sendBackMessage, setSendBackMessage] = useState("");

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProject(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true);

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

      const claimData = await claimService.getClaimById(projectData.claim_id);
      setClaim(claimData);

      // If this claim project is linked to a Sidekick project, load shared project data
      if (projectData.source_sidekick_project_id) {
        try {
          const sidekickId = projectData.source_sidekick_project_id as string;

          const [sp, evidenceItems, comments, analyses, advice] = await Promise.all([
            sidekickProjectService.getProjectById(sidekickId),
            sidekickEvidenceService.getEvidenceByProject(sidekickId),
            sidekickCommentService.getCommentsByProject(sidekickId),
            feasibilityService.getAnalysesByProject(sidekickId),
            sidekickCostAdviceService.getByProject(sidekickId),
          ]);

          setSidekickProject(sp);
          setSidekickEvidence(evidenceItems || []);
          setSidekickComments(comments || []);
          setCostAdvice(advice || []);

          if (analyses && analyses.length > 0) {
            const sortedAnalyses = analyses.sort(
              (a, b) =>
                new Date(b.created_at ?? "").getTime() -
                new Date(a.created_at ?? "").getTime()
            );
            setFeasibilityAnalysis(sortedAnalyses[0]);
          } else {
            setFeasibilityAnalysis(null);
          }
        } catch (sidekickError) {
          console.error("Error loading linked Sidekick project:", sidekickError);
        }
      } else {
        setSidekickProject(null);
        setSidekickEvidence([]);
        setSidekickComments([]);
        setFeasibilityAnalysis(null);
      }
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
      className: "bg-gray-100 text-gray-800",
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

  const clientComments = sidekickComments.filter(
    (c) => c.author_role === "client"
  );
  const staffComments = sidekickComments.filter(
    (c) => c.author_role === "rd_staff"
  );

  const handleAddEvidence = async () => {
    if (!sidekickProject) {
      toast({
        title: "No linked Sidekick project",
        description: "This claim project is not linked to a Sidekick project.",
        variant: "destructive",
      });
      return;
    }

    if (evidenceType === "note" && !evidenceBody.trim() && !evidenceTitle.trim()) {
      toast({
        title: "Add some details",
        description: "Please add a title or description for the evidence.",
        variant: "destructive",
      });
      return;
    }

    if (evidenceType === "link" && !evidenceUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a URL for this evidence link.",
        variant: "destructive",
      });
      return;
    }

    if (evidenceType === "file" && !evidenceFile) {
      toast({
        title: "File required",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      setEvidenceSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not signed in",
          description: "You need to be signed in to add evidence.",
          variant: "destructive",
        });
        return;
      }

      let filePath: string | null = null;
      if (evidenceType === "file" && evidenceFile) {
        filePath = await sidekickEvidenceService.uploadFile(
          evidenceFile,
          sidekickProject.id
        );
      }

      await sidekickEvidenceService.createEvidence({
        project_id: sidekickProject.id,
        created_by: user.id,
        type: evidenceType,
        title: evidenceTitle || null,
        body: evidenceBody || null,
        file_path: filePath,
        external_url: evidenceType === "link" ? evidenceUrl : null,
        sidekick_visible: true,
        rd_internal_only: false,
      });

      const updatedEvidence = await sidekickEvidenceService.getEvidenceByProject(
        sidekickProject.id
      );
      setSidekickEvidence(updatedEvidence);

      setEvidenceTitle("");
      setEvidenceBody("");
      setEvidenceUrl("");
      setEvidenceFile(null);

      toast({
        title: "Evidence added",
        description: "Evidence is now visible on both client and staff sides.",
      });
    } catch (error) {
      console.error("Error adding evidence:", error);
      toast({
        title: "Error",
        description: "Failed to add evidence.",
        variant: "destructive",
      });
    } finally {
      setEvidenceSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!sidekickProject || !commentBody.trim()) {
      return;
    }

    try {
      setCommentSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not signed in",
          description: "You need to be signed in to add a comment.",
          variant: "destructive",
        });
        return;
      }

      await sidekickCommentService.createComment({
        project_id: sidekickProject.id,
        author_id: user.id,
        author_role: "rd_staff",
        body: commentBody,
      });

      const updatedComments = await sidekickCommentService.getCommentsByProject(
        sidekickProject.id
      );
      setSidekickComments(updatedComments);

      setCommentBody("");

      toast({
        title: "Comment added",
        description: "Your note is visible to the client in their Companion.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive",
      });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const updateWorkflowStatus = async (
    newStatus: ClaimProject["workflow_status"],
    options?: { message?: string }
  ) => {
    if (!project) return;

    try {
      setUpdatingStatus(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not signed in",
          description: "You need to be signed in to update the workflow status.",
          variant: "destructive",
        });
        return;
      }

      const updates: Partial<ClaimProject> = {
        workflow_status: newStatus,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (newStatus === "team_in_progress" && !project.assigned_to_user_id) {
        (updates as any).assigned_to_user_id = user.id;
      }

      const { error } = await supabase
        .from("claim_projects")
        .update(updates)
        .eq("id", project.id);

      if (error) {
        throw error;
      }

      await loadProject(project.id);

      if (options?.message && sidekickProject) {
        await sidekickCommentService.createComment({
          project_id: sidekickProject.id,
          author_id: user.id,
          author_role: "rd_staff",
          body: options.message,
        });

        const updatedComments = await sidekickCommentService.getCommentsByProject(
          sidekickProject.id
        );
        setSidekickComments(updatedComments);
      }

      toast({
        title: "Workflow updated",
        description: "Project status has been updated.",
      });
    } catch (error) {
      console.error("Error updating workflow status:", error);
      toast({
        title: "Error",
        description: "Failed to update workflow status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStartReview = async () => {
    await updateWorkflowStatus("team_in_progress");
  };

  const handleSendBackToClient = async () => {
    await updateWorkflowStatus(sendBackMode, {
      message: sendBackMessage.trim() || undefined,
    });
    setSendBackDialogOpen(false);
    setSendBackMessage("");
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
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
                {project.qualifying_activities &&
                Array.isArray(project.qualifying_activities) &&
                project.qualifying_activities.length > 0 ? (
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
                  {project.workflow_status === "submitted_to_team" &&
                    "Pending team review"}
                  {project.workflow_status === "team_in_progress" &&
                    "Being reviewed by team"}
                  {project.workflow_status === "awaiting_client_review" &&
                    "Sent to client for review"}
                  {project.workflow_status === "revision_requested" &&
                    "Client requested changes"}
                  {project.workflow_status === "approved" &&
                    "Approved by client"}
                  {project.workflow_status === "draft" &&
                    "Draft - not submitted yet"}
                </p>
              </div>
              {getWorkflowStatusBadge(project.workflow_status)}
            </div>

            {project.due_date && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(
                      new Date(project.due_date),
                      "PPP 'at' p"
                    )}
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

            {project.workflow_status === "submitted_to_team" && (
              <div className="flex items-center justify-between gap-3 pt-4 border-t flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Client has submitted this project for review. Start your review to take ownership and work on it.
                </p>
                <Button
                  size="sm"
                  onClick={handleStartReview}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? "Starting..." : "Start review"}
                </Button>
              </div>
            )}

            {project.workflow_status === "team_in_progress" && (
              <div className="flex items-center justify-between gap-3 pt-4 border-t flex-wrap">
                <p className="text-sm text-muted-foreground">
                  When you are ready, send this project back to the client for approval or request changes.
                </p>
                <Button
                  size="sm"
                  onClick={() => setSendBackDialogOpen(true)}
                  disabled={updatingStatus}
                >
                  Send to client
                </Button>
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
                <p>
                  {project.created_at
                    ? format(new Date(project.created_at), "PPP")
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Last Updated</p>
                <p>
                  {project.updated_at
                    ? format(new Date(project.updated_at), "PPP")
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Collaboration: shared Sidekick evidence, comments, feasibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Client Collaboration
            </CardTitle>
            <CardDescription>
              Shared project space between client and RD team. Changes here are
              visible in the client Companion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {!sidekickProject ? (
              <p className="text-sm text-muted-foreground">
                This claim project is not currently linked to a Sidekick
                project. Link a Sidekick project to share evidence and
                discussion with the client.
              </p>
            ) : (
              <>
                {/* Evidence */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Evidence ({sidekickEvidence.length})
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Add or review evidence that both client and staff can
                        see.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 border rounded-lg p-3">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant={
                            evidenceType === "note" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setEvidenceType("note")}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Note
                        </Button>
                        <Button
                          type="button"
                          variant={
                            evidenceType === "file" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setEvidenceType("file")}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          File
                        </Button>
                        <Button
                          type="button"
                          variant={
                            evidenceType === "link" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setEvidenceType("link")}
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="evidenceTitle">Title</Label>
                          <Input
                            id="evidenceTitle"
                            value={evidenceTitle}
                            onChange={(e) =>
                              setEvidenceTitle(e.target.value)
                            }
                            placeholder="Short title"
                          />
                        </div>

                        {evidenceType === "note" && (
                          <div>
                            <Label htmlFor="evidenceBody">Description</Label>
                            <Textarea
                              id="evidenceBody"
                              value={evidenceBody}
                              onChange={(e) =>
                                setEvidenceBody(e.target.value)
                              }
                              rows={3}
                              placeholder="Describe the evidence..."
                            />
                          </div>
                        )}

                        {evidenceType === "file" && (
                          <div>
                            <Label htmlFor="evidenceFile">Upload file</Label>
                            <Input
                              id="evidenceFile"
                              type="file"
                              onChange={(e) =>
                                setEvidenceFile(
                                  e.target.files?.[0] ?? null
                                )
                              }
                            />
                          </div>
                        )}

                        {evidenceType === "link" && (
                          <div>
                            <Label htmlFor="evidenceUrl">URL</Label>
                            <Input
                              id="evidenceUrl"
                              value={evidenceUrl}
                              onChange={(e) =>
                                setEvidenceUrl(e.target.value)
                              }
                              placeholder="https://..."
                            />
                          </div>
                        )}

                        <Button
                          size="sm"
                          className="mt-1"
                          onClick={handleAddEvidence}
                          disabled={evidenceSubmitting}
                        >
                          {evidenceSubmitting
                            ? "Adding..."
                            : "Add Evidence"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 border rounded-lg p-3 max-h-72 overflow-y-auto">
                      {sidekickEvidence.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No evidence yet. Add notes, files, or links on the
                          left.
                        </p>
                      ) : (
                        sidekickEvidence.map((item) => (
                          <div
                            key={item.id}
                            className="border-b last:border-b-0 pb-2 mb-2 last:pb-0 last:mb-0"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                              {item.title && (
                                <span className="font-medium text-sm">
                                  {item.title}
                                </span>
                              )}
                            </div>
                            {item.body && (
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {item.body}
                              </p>
                            )}
                            {item.external_url && (
                              <a
                                href={item.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-blue-600 hover:underline break-all mt-1"
                              >
                                {item.external_url}
                              </a>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {new Date(
                                item.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Client says / Staff says */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Client says / Staff says
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Shared discussion around this project. Entries are dated and
                    visible on both sides.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-3 space-y-3">
                      <h4 className="font-medium text-sm mb-1">Client says</h4>
                      {clientComments.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No client comments yet.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {clientComments.map((comment) => (
                            <div key={comment.id} className="text-xs">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-medium">
                                  {comment.author?.email ??
                                    "Client"}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {comment.body}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border rounded-lg p-3 space-y-3">
                      <h4 className="font-medium text-sm mb-1">
                        Staff says
                      </h4>
                      <div className="space-y-2">
                        <Textarea
                          rows={3}
                          value={commentBody}
                          onChange={(e) =>
                            setCommentBody(e.target.value)
                          }
                          placeholder="Add a note or response for the client..."
                        />
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={
                            commentSubmitting || !commentBody.trim()
                          }
                        >
                          {commentSubmitting
                            ? "Posting..."
                            : "Post Comment"}
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
                        {staffComments.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No staff comments yet.
                          </p>
                        ) : (
                          staffComments.map((comment) => (
                            <div key={comment.id} className="text-xs">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-medium">
                                  {comment.author?.email ??
                                    "Staff"}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(
                                    comment.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-muted-foreground whitespace-pre-wrap">
                                {comment.body}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feasibility summary */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Feasibility Snapshot
                  </h3>
                  {feasibilityAnalysis ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Summary
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {feasibilityAnalysis.summary ??
                            "No summary available"}
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Technical Feasibility
                        </p>
                        <p className="font-semibold text-sm">
                          {feasibilityAnalysis.technical_rating ??
                            "N/A"}
                        </p>
                        {feasibilityAnalysis.technical_reasoning && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-4">
                            {feasibilityAnalysis.technical_reasoning}
                          </p>
                        )}
                      </div>
                      <div className="border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          R&D Tax Eligibility
                        </p>
                        <p className="font-semibold text-sm">
                          {feasibilityAnalysis.rd_tax_flag ?? "N/A"}
                        </p>
                        {feasibilityAnalysis.rd_tax_reasoning && (
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-4">
                            {feasibilityAnalysis.rd_tax_reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No feasibility analysis has been run for this
                      Sidekick project yet. When the client runs an
                      analysis, the latest result will show here.
                    </p>
                  )}
                </div>

                {/* Client cost advice (for staff calculator) */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Client Cost Advice
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    These are cost suggestions provided by the client in their Companion. Use them to inform your calculator entries.
                  </p>

                  {costAdvice.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No cost advice has been provided for this project yet.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {costAdvice.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {item.cost_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <div className="font-semibold text-sm">
                            £{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                              {item.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={sendBackDialogOpen} onOpenChange={setSendBackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send project to client</DialogTitle>
            <DialogDescription>
              Choose how to update the project and optionally include a message for the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Action</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    sendBackMode === "awaiting_client_review"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setSendBackMode("awaiting_client_review")}
                >
                  Send for review
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    sendBackMode === "revision_requested"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setSendBackMode("revision_requested")}
                >
                  Request changes
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="sendBackMessage">
                Message to client (optional)
              </Label>
              <Textarea
                id="sendBackMessage"
                rows={4}
                value={sendBackMessage}
                onChange={(e) => setSendBackMessage(e.target.value)}
                placeholder="Add context or guidance for the client..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendBackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSendBackToClient} disabled={updatingStatus}>
              {updatingStatus ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}