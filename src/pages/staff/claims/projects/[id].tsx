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
import { sidekickTimelineService } from "@/services/sidekickTimelineService";
import { MessageWidget } from "@/components/MessageWidget";
import { ProjectCostSummary } from "@/components/projects/ProjectCostSummary";
import { ProjectGantt } from "@/components/projects/ProjectGantt";
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
type SidekickTimelineItemRow = Database["public"]["Tables"]["sidekick_project_timeline_items"]["Row"];

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
  const [staffReturnNotes, setStaffReturnNotes] = useState<string>("");

  const [evidencePreview, setEvidencePreview] = useState<SidekickEvidenceItem | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null);
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState<boolean>(false);
  const [evidencePreviewLoading, setEvidencePreviewLoading] = useState<boolean>(false);

  const [evidenceType, setEvidenceType] = useState<"note" | "file" | "link">("note");
  const [evidenceTitle, setEvidenceTitle] = useState<string>("");
  const [evidenceBody, setEvidenceBody] = useState<string>("");
  const [evidenceUrl, setEvidenceUrl] = useState<string>("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceSubmitting, setEvidenceSubmitting] = useState<boolean>(false);

  const [commentBody, setCommentBody] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);

  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const [sendBackDialogOpen, setSendBackDialogOpen] = useState<boolean>(false);
  const [sendBackMode, setSendBackMode] =
    useState<ClaimProject["workflow_status"]>("awaiting_client_review");
  const [sendBackMessage, setSendBackMessage] = useState<string>("");

  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [lastSavedNotesAt, setLastSavedNotesAt] = useState<Date | null>(null);
  const [timelineItems, setTimelineItems] = useState<SidekickTimelineItemRow[]>([]);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadProject(id);
    }
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
      setStaffReturnNotes(projectData.staff_return_notes ?? "");

      const claimData = await claimService.getClaimById(projectData.claim_id);
      setClaim(claimData);

      // If this claim project is linked to a Sidekick project, load shared project data
      if (projectData.source_sidekick_project_id) {
        try {
          const sidekickId = projectData.source_sidekick_project_id as string;

          const [sp, evidenceItems, comments, analyses, advice, timeline] = await Promise.all([
            sidekickProjectService.getProjectById(sidekickId),
            sidekickEvidenceService.getEvidenceByProject(sidekickId),
            sidekickCommentService.getCommentsByProject(sidekickId),
            feasibilityService.getAnalysesByProject(sidekickId),
            sidekickCostAdviceService.getByProject(sidekickId),
            (async () => {
              try {
                const items = await sidekickTimelineService.getByProject(sidekickId);
                return items;
              } catch (timelineError) {
                console.error("Error loading Sidekick timeline items:", timelineError);
                return [];
              }
            })(),
          ]);

          setSidekickProject(sp);
          setSidekickEvidence(evidenceItems || []);
          setSidekickComments(comments || []);
          setCostAdvice(advice || []);
          setFeasibilityAnalysis(analyses && analyses.length > 0 ? analyses.sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime())[0] : null);
          setTimelineItems(timeline || []);
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

  const handleOpenEvidencePreview = async (item: SidekickEvidenceItem) => {
    setEvidencePreview(item);
    setEvidencePreviewUrl(null);
    setEvidenceDialogOpen(true);

    if (!item.file_path) {
      return;
    }

    try {
      setEvidencePreviewLoading(true);
      const url = await sidekickEvidenceService.getSignedUrl(item.file_path);
      setEvidencePreviewUrl(url);
    } catch (error) {
      console.error("Error getting evidence file URL:", error);
      toast({
        title: "Could not load file",
        description: "There was a problem loading this evidence file.",
        variant: "destructive",
      });
    } finally {
      setEvidencePreviewLoading(false);
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

  const saveStaffReturnNotes = async () => {
    if (!project) return;

    try {
      setSavingNotes(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not signed in",
          description: "You need to be signed in to update notes.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("claim_projects")
        .update({
          staff_return_notes: staffReturnNotes,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", project.id);

      if (error) {
        console.error("Error saving staff return notes:", error);
        toast({
          title: "Error",
          description: "Failed to save notes.",
          variant: "destructive",
        });
        return;
      }

      setLastSavedNotesAt(new Date());

      toast({
        title: "Notes saved",
        description: "Return notes have been updated.",
      });
    } finally {
      setSavingNotes(false);
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

      if (typeof options?.message === "string") {
        (updates as any).staff_return_notes = options.message;
      }

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

  const handleMoveBackToPending = async () => {
    await updateWorkflowStatus("submitted_to_team");
  };

  const handleMarkApproved = async () => {
    await updateWorkflowStatus("approved");
  };

  const handleSendBackToClient = async () => {
    const messageToSend = sendBackMessage.trim() || staffReturnNotes.trim() || undefined;
    await updateWorkflowStatus(sendBackMode, {
      message: messageToSend,
    });
    if (messageToSend) {
      setStaffReturnNotes(messageToSend);
    }
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

  const schemeLabel =
    ((claim as any)?.scheme_type as string | null | undefined) ??
    ((claim as any)?.scheme as string | null | undefined) ??
    null;

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
              <div className="flex items-center justify-between gap-4 pt-4 border-t">
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
              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="flex items-center justify-between gap-3 flex-wrap">
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
              </div>
            )}

            {project.workflow_status === "team_in_progress" && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    When you are ready, send this project back to the client for approval or request changes. You can also move it back to Pending if you want to re-queue it.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMoveBackToPending}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? "Moving..." : "Move back to Pending"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSendBackMessage(staffReturnNotes);
                        setSendBackDialogOpen(true);
                      }}
                      disabled={updatingStatus}
                    >
                      Send to client
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {project.workflow_status === "awaiting_client_review" && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    This project has been sent to the client. You can mark it as approved once you are satisfied.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleMarkApproved}
                    disabled={updatingStatus}
                  >
                    {updatingStatus ? "Approving..." : "Mark approved"}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <Label htmlFor="staffReturnNotes">Return notes to client (optional)</Label>
              <Textarea
                id="staffReturnNotes"
                rows={3}
                value={staffReturnNotes}
                onChange={(e) => setStaffReturnNotes(e.target.value)}
                placeholder="Draft the notes you plan to send back to the client. These will pre-fill the message when you send the project."
              />
              <div className="flex items-center justify-between">
                {lastSavedNotesAt && (
                  <p className="text-xs text-muted-foreground">
                    Saved at {format(lastSavedNotesAt, "PPP p")}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={saveStaffReturnNotes}
                  disabled={updatingStatus || savingNotes}
                >
                  {savingNotes ? "Saving..." : "Save notes"}
                </Button>
              </div>
            </div>
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
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Project Timeline
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Read-only view of the activities the client has added to their project timeline in RD Companion.
                  </p>
                  <ProjectGantt items={timelineItems} />
                </div>

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
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEvidencePreview(item)}
                                className="text-[11px] text-blue-600 hover:underline"
                              >
                                View evidence
                              </button>
                            </div>
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
                    AI Feasibility Analysis
                  </h3>
                  {feasibilityAnalysis ? (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Overall Summary
                          </p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {feasibilityAnalysis.summary ?? "No summary available"}
                          </p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Technical Feasibility
                          </p>
                          <p className="font-semibold text-sm">
                            {feasibilityAnalysis.technical_rating ?? "N/A"}
                          </p>
                          {feasibilityAnalysis.technical_reasoning && (
                            <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">
                              {feasibilityAnalysis.technical_reasoning}
                            </p>
                          )}
                          {Array.isArray(feasibilityAnalysis.technical_constraints) &&
                            feasibilityAnalysis.technical_constraints.length > 0 && (
                              <div className="mt-2">
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  Key Constraints
                                </p>
                                <ul className="text-[11px] text-muted-foreground space-y-1">
                                  {feasibilityAnalysis.technical_constraints.map((item, index) => (
                                    <li key={index} className="flex gap-2">
                                      <span>•</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            R&amp;D Tax Eligibility
                          </p>
                          <p className="font-semibold text-sm">
                            {feasibilityAnalysis.rd_tax_flag ?? "N/A"}
                          </p>
                          {feasibilityAnalysis.rd_tax_reasoning && (
                            <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">
                              {feasibilityAnalysis.rd_tax_reasoning}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Commercial Outlook
                          </p>
                          <p className="font-semibold text-sm mb-1">
                            {feasibilityAnalysis.commercial_rating ?? "N/A"}
                          </p>
                          {feasibilityAnalysis.commercial_reasoning && (
                            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap mb-2">
                              {feasibilityAnalysis.commercial_reasoning}
                            </p>
                          )}
                          {Array.isArray(feasibilityAnalysis.target_customers) &&
                            feasibilityAnalysis.target_customers.length > 0 && (
                              <div className="mb-2">
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  Target customers
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {feasibilityAnalysis.target_customers.map((customer, index) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px]"
                                    >
                                      {customer}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          {Array.isArray(feasibilityAnalysis.revenue_ideas) &&
                            feasibilityAnalysis.revenue_ideas.length > 0 && (
                              <div>
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  Revenue ideas
                                </p>
                                <ul className="text-[11px] text-muted-foreground space-y-1">
                                  {feasibilityAnalysis.revenue_ideas.map((idea, index) => (
                                    <li key={index} className="flex gap-2">
                                      <span>•</span>
                                      <span>{idea}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>

                        <div className="border rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            Delivery Considerations
                          </p>
                          <p className="font-semibold text-sm mb-1">
                            {feasibilityAnalysis.delivery_complexity
                              ? `${feasibilityAnalysis.delivery_complexity} complexity`
                              : "Complexity not assessed"}
                          </p>
                          {typeof feasibilityAnalysis.delivery_timeframe_months === "number" && (
                            <p className="text-[11px] text-muted-foreground mb-2">
                              Estimated timeframe: ~{feasibilityAnalysis.delivery_timeframe_months} months
                            </p>
                          )}
                          {Array.isArray(feasibilityAnalysis.delivery_dependencies) &&
                            feasibilityAnalysis.delivery_dependencies.length > 0 && (
                              <>
                                <p className="text-[11px] text-muted-foreground mb-1">
                                  Key dependencies
                                </p>
                                <ul className="text-[11px] text-muted-foreground space-y-1">
                                  {feasibilityAnalysis.delivery_dependencies.map(
                                    (dep, index) => (
                                      <li key={index} className="flex gap-2">
                                        <span>•</span>
                                        <span>{dep}</span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </>
                            )}
                        </div>
                      </div>

                      {Array.isArray(feasibilityAnalysis.notable_risks) &&
                        feasibilityAnalysis.notable_risks.length > 0 && (
                          <div className="border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Notable risks
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {feasibilityAnalysis.notable_risks.map((risk, index) => (
                                <li key={index} className="flex gap-2">
                                  <span>•</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {Array.isArray(feasibilityAnalysis.regulatory_issues) &&
                        feasibilityAnalysis.regulatory_issues.length > 0 && (
                          <div className="border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Regulatory considerations
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {feasibilityAnalysis.regulatory_issues.map((issue, index) => (
                                <li key={index} className="flex gap-2">
                                  <span>•</span>
                                  <span>{issue}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {Array.isArray(feasibilityAnalysis.next_actions) &&
                        feasibilityAnalysis.next_actions.length > 0 && (
                          <div className="border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Recommended next actions
                            </p>
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                              {feasibilityAnalysis.next_actions.map((action, index) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No feasibility analysis has been run for this Sidekick project yet. When the client runs an analysis, the latest result will show here in full.
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <ProjectCostSummary items={costAdvice} schemeLabel={schemeLabel} />
      </div>
      <Dialog
        open={evidenceDialogOpen}
        onOpenChange={(open) => {
          setEvidenceDialogOpen(open);
          if (!open) {
            setEvidencePreview(null);
            setEvidencePreviewUrl(null);
            setEvidencePreviewLoading(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {evidencePreview?.title || "Evidence"}
            </DialogTitle>
            <DialogDescription>
              Review the evidence item as seen by the client.
            </DialogDescription>
          </DialogHeader>
          {evidencePreview ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {evidencePreview.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(evidencePreview.created_at).toLocaleString()}
                </span>
              </div>

              {evidencePreview.file_path && (
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Attached file</p>
                  {evidencePreviewLoading && (
                    <p className="text-xs text-muted-foreground">
                      Loading file...
                    </p>
                  )}
                  {!evidencePreviewLoading && evidencePreviewUrl && (
                    <>
                      {/\.(jpg|jpeg|png|gif|webp)$/i.test(
                        evidencePreview.file_path
                      ) ? (
                        <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                          <img
                            src={evidencePreviewUrl}
                            alt={evidencePreview.title || "Evidence file"}
                            className="object-contain w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {evidencePreview.file_path.split("/").pop()}
                            </p>
                          </div>
                          <a
                            href={evidencePreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Open file
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {evidencePreview.external_url && (
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">External link</p>
                  <a
                    href={evidencePreview.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {evidencePreview.external_url}
                  </a>
                </div>
              )}

              {evidencePreview.body && (
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {evidencePreview.body}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No evidence selected.
            </p>
          )}
        </DialogContent>
      </Dialog>
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