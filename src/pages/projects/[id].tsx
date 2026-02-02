import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { sidekickCommentService } from "@/services/sidekickCommentService";
import { feasibilityService, type FeasibilityAnalysis } from "@/services/feasibilityService";
import { claimService } from "@/services/claimService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Lightbulb, FileText, MessageSquare, Send, Upload, Link as LinkIcon, Trash2, ExternalLink, Sparkles, Edit, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type SidekickEvidenceItem = Database["public"]["Tables"]["sidekick_evidence_items"]["Row"];
type SidekickProjectComment = Database["public"]["Tables"]["sidekick_project_comments"]["Row"] & {
  author?: { email: string };
};

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  ready_for_review: "bg-blue-500",
  in_review: "bg-yellow-500",
  needs_changes: "bg-orange-500",
  rejected: "bg-red-500",
  transferred: "bg-green-500",
  submitted_to_team: "bg-blue-500",
  team_in_progress: "bg-yellow-500",
  awaiting_client_review: "bg-purple-500",
  revision_requested: "bg-orange-500",
  approved: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  ready_for_review: "Ready for Review",
  in_review: "In Review",
  needs_changes: "Needs Changes",
  rejected: "Rejected",
  transferred: "Transferred to Conexa",
  submitted_to_team: "With R&D Team",
  team_in_progress: "Team Working",
  awaiting_client_review: "Review Required",
  revision_requested: "Revisions Requested",
  approved: "Approved",
  cancelled: "Cancelled",
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useApp();
  const [project, setProject] = useState<SidekickProject | null>(null);
  const [claimProject, setClaimProject] = useState<ClaimProject | null>(null);
  const [evidence, setEvidence] = useState<SidekickEvidenceItem[]>([]);
  const [comments, setComments] = useState<SidekickProjectComment[]>([]);
  const [feasibilityAnalysis, setFeasibilityAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runningFeasibility, setRunningFeasibility] = useState(false);

  // Evidence form state
  const [evidenceType, setEvidenceType] = useState<"note" | "file" | "link">("note");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Comment form state
  const [commentBody, setCommentBody] = useState("");
  
  // Edit project state
  const [editingProject, setEditingProject] = useState(false);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editProjectSector, setEditProjectSector] = useState("");
  const [editProjectStage, setEditProjectStage] = useState("");
  
  // Delete state
  const [deletingProject, setDeletingProject] = useState(false);
  const [deletingEvidence, setDeletingEvidence] = useState<string | null>(null);

  // Workflow state
  const [sendToTeamDialog, setSendToTeamDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [revisionDialog, setRevisionDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  
  // Partial approval state
  const [approvalSections, setApprovalSections] = useState({
    basic_info: "approved",
    technical_understanding: "pending",
    challenges: "pending",
    qualifying_activities: "pending",
  });
  const [revisionFeedback, setRevisionFeedback] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!id || !user || !router.isReady) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch project, evidence, and comments
        const [projectData, evidenceData, commentsData] = await Promise.all([
          sidekickProjectService.getProjectById(id as string),
          sidekickEvidenceService.getEvidenceByProject(id as string),
          sidekickCommentService.getCommentsByProject(id as string),
        ]);

        setProject(projectData);
        setEvidence(evidenceData);
        setComments(commentsData);

        // Check if this project is linked to a claim project
        if (projectData?.claim_project_id) {
          try {
            const claimProj = await claimService.getProjectById(projectData.claim_project_id);
            setClaimProject(claimProj);
            
            // Initialize approval sections from claim project
            if (claimProj?.approval_status) {
              setApprovalSections(claimProj.approval_status as any);
            }
          } catch (error) {
            console.error("Error fetching claim project:", error);
          }
        }

        // Fetch feasibility analysis separately
        setFeasibilityLoading(true);
        try {
          const analyses = await feasibilityService.getAnalysesByProject(id as string);
          if (analyses && analyses.length > 0) {
            const sortedAnalyses = analyses.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setFeasibilityAnalysis(sortedAnalyses[0]);
          } else {
            setFeasibilityAnalysis(null);
          }
        } catch (feasibilityError) {
          console.error("Error fetching feasibility analysis:", feasibilityError);
          setFeasibilityAnalysis(null);
        } finally {
          setFeasibilityLoading(false);
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, router.isReady]);

  useEffect(() => {
    if (editingProject && project) {
      setEditProjectName(project.name);
      setEditProjectDescription(project.description || "");
      setEditProjectSector(project.sector || "");
      setEditProjectStage(project.stage || "");
    }
  }, [editingProject, project]);

  const handleSendToTeam = async () => {
    if (!claimProject || !user) return;

    setSubmitting(true);
    try {
      await claimService.sendProjectToTeam(claimProject.id, user.id);
      
      // Refresh claim project
      const updated = await claimService.getProjectById(claimProject.id);
      setClaimProject(updated);
      
      setSendToTeamDialog(false);
      alert("Project sent to R&D team! They have 3 days to review and respond.");
    } catch (error) {
      console.error("Error sending to team:", error);
      alert("Failed to send project to team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveProject = async () => {
    if (!claimProject || !user) return;

    setSubmitting(true);
    try {
      await claimService.approveProject(claimProject.id, user.id, approvalSections);
      
      // Refresh claim project
      const updated = await claimService.getProjectById(claimProject.id);
      setClaimProject(updated);
      
      setReviewDialog(false);
      
      const allApproved = Object.values(approvalSections).every(s => s === "approved");
      if (allApproved) {
        alert("Project fully approved! ✅");
      } else {
        alert("Feedback sent to team. They'll address your revision requests.");
      }
    } catch (error) {
      console.error("Error approving project:", error);
      alert("Failed to approve project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevisions = async () => {
    if (!claimProject || !user || !revisionFeedback.trim()) return;

    setSubmitting(true);
    try {
      const sectionsNeedingRevision = Object.entries(approvalSections)
        .filter(([_, status]) => status === "needs_revision")
        .map(([section, _]) => section);

      await claimService.requestRevisions(
        claimProject.id,
        user.id,
        revisionFeedback,
        sectionsNeedingRevision
      );
      
      // Refresh claim project
      const updated = await claimService.getProjectById(claimProject.id);
      setClaimProject(updated);
      
      setRevisionDialog(false);
      setRevisionFeedback("");
      alert("Revision request sent to team!");
    } catch (error) {
      console.error("Error requesting revisions:", error);
      alert("Failed to request revisions");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelProject = async () => {
    if (!claimProject || !user || !cancelReason.trim()) return;

    setSubmitting(true);
    try {
      await claimService.cancelProject(claimProject.id, user.id, cancelReason);
      
      // Refresh claim project
      const updated = await claimService.getProjectById(claimProject.id);
      setClaimProject(updated);
      
      setCancelDialog(false);
      setCancelReason("");
      alert("Project cancelled");
    } catch (error) {
      console.error("Error cancelling project:", error);
      alert("Failed to cancel project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReadyForReview = async () => {
    if (!project) return;

    setSubmitting(true);
    try {
      await sidekickProjectService.markReadyForReview(project.id);
      const updated = await sidekickProjectService.getProjectById(project.id);
      setProject(updated);
      alert("Project marked ready for review!");
    } catch (error) {
      console.error("Error marking ready for review:", error);
      alert("Failed to mark ready for review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!project || !user) return;

    setSubmitting(true);
    try {
      let filePath = null;
      if (evidenceType === "file" && evidenceFile) {
        filePath = await sidekickEvidenceService.uploadFile(evidenceFile, project.id);
      }

      await sidekickEvidenceService.createEvidence({
        project_id: project.id,
        created_by: user.id,
        type: evidenceType,
        title: evidenceTitle || null,
        body: evidenceBody || null,
        file_path: filePath,
        external_url: evidenceType === "link" ? evidenceUrl : null,
        sidekick_visible: true,
        rd_internal_only: false,
      });

      const evidenceData = await sidekickEvidenceService.getEvidenceByProject(project.id);
      setEvidence(evidenceData);

      setEvidenceTitle("");
      setEvidenceBody("");
      setEvidenceUrl("");
      setEvidenceFile(null);
      alert("Evidence added successfully!");
    } catch (error) {
      console.error("Error adding evidence:", error);
      alert("Failed to add evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!project || !user || !commentBody.trim()) return;

    setSubmitting(true);
    try {
      await sidekickCommentService.createComment({
        project_id: project.id,
        author_id: user.id,
        author_role: "client",
        body: commentBody,
      });

      const commentsData = await sidekickCommentService.getCommentsByProject(project.id);
      setComments(commentsData);

      setCommentBody("");
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunFeasibility = async () => {
    if (!project || !user) return;

    setRunningFeasibility(true);
    try {
      const analysis = await feasibilityService.submitForAnalysis({
        ideaDescription: project.description || project.name,
        sector: project.sector || undefined,
        stage: project.stage || undefined,
        projectId: project.id
      });

      setFeasibilityAnalysis(analysis);
      alert("Feasibility analysis completed successfully!");
    } catch (error) {
      console.error("Error running feasibility analysis:", error);
      alert("Failed to run feasibility analysis");
    } finally {
      setRunningFeasibility(false);
    }
  };

  const handleEditProject = async () => {
    if (!project) return;

    setSubmitting(true);
    try {
      await sidekickProjectService.updateProject(project.id, {
        name: editProjectName,
        description: editProjectDescription || null,
        sector: editProjectSector || null,
        stage: editProjectStage || null,
      });

      const updated = await sidekickProjectService.getProjectById(project.id);
      setProject(updated);
      setEditingProject(false);
      alert("Project updated successfully!");
    } catch (error) {
      console.error("Error updating project:", error);
      alert("Failed to update project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !window.confirm("Are you sure you want to delete this project? This will also delete all evidence and comments. This action cannot be undone.")) return;

    setDeletingProject(true);
    try {
      await sidekickProjectService.deleteProject(project.id);
      alert("Project deleted successfully");
      router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    } finally {
      setDeletingProject(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!project || !window.confirm("Are you sure you want to delete this evidence item?")) return;

    setDeletingEvidence(evidenceId);
    try {
      await sidekickEvidenceService.deleteEvidence(evidenceId);
      const evidenceData = await sidekickEvidenceService.getEvidenceByProject(project.id);
      setEvidence(evidenceData);
      alert("Evidence deleted successfully!");
    } catch (error) {
      console.error("Error deleting evidence:", error);
      alert("Failed to delete evidence");
    } finally {
      setDeletingEvidence(null);
    }
  };

  const getSLAStatus = () => {
    if (!claimProject?.due_date) return null;
    
    const now = new Date();
    const dueDate = new Date(claimProject.due_date);
    const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) {
      return { label: "Overdue", color: "bg-red-500", icon: XCircle };
    } else if (hoursLeft < 24) {
      return { label: `${Math.floor(hoursLeft)}h left`, color: "bg-orange-500", icon: AlertCircle };
    } else {
      return { label: `${Math.floor(hoursLeft / 24)}d left`, color: "bg-green-500", icon: Clock };
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading project...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Project not found</p>
          <Link href="/projects">
            <Button variant="ghost">Back to Projects</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const workflowStatus = claimProject?.workflow_status || project.status;
  const canEdit = !claimProject || claimProject.workflow_status === "draft";
  const canSendToTeam = claimProject && claimProject.workflow_status === "draft";
  const needsClientReview = claimProject && claimProject.workflow_status === "awaiting_client_review";
  const isApproved = claimProject && claimProject.workflow_status === "approved";
  const slaStatus = getSLAStatus();

  return (
    <>
      <SEO
        title={`${project.name} - RD Sidekick`}
        description={project.description || "Project details"}
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Link href="/projects">
            <Button variant="ghost" className="mb-4 sm:mb-6" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 break-words">{project.name}</h1>
              {project.description && (
                <p className="text-sm sm:text-base text-muted-foreground mb-3 break-words">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusColors[workflowStatus] || "bg-gray-500"}>
                  {statusLabels[workflowStatus] || workflowStatus}
                </Badge>
                {slaStatus && claimProject?.workflow_status === "team_in_progress" && (
                  <Badge className={slaStatus.color} variant="outline">
                    <slaStatus.icon className="h-3 w-3 mr-1" />
                    {slaStatus.label}
                  </Badge>
                )}
                {project.sector && <Badge variant="outline" className="text-xs">{project.sector}</Badge>}
                {project.stage && <Badge variant="outline" className="text-xs">{project.stage}</Badge>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
              {canEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingProject(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {canSendToTeam && (
                <Button 
                  onClick={() => setSendToTeamDialog(true)}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Send to Team</span>
                  <span className="sm:hidden">Send</span>
                </Button>
              )}
              {needsClientReview && (
                <Button 
                  onClick={() => setReviewDialog(true)}
                  size="sm"
                  className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Review Team's Work</span>
                  <span className="sm:hidden">Review</span>
                </Button>
              )}
              {claimProject && claimProject.workflow_status !== "cancelled" && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setCancelDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="feasibility" className="space-y-4 sm:space-y-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 h-auto gap-1">
              <TabsTrigger value="feasibility" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Feasibility</span>
                <span className="sm:hidden">Idea</span>
              </TabsTrigger>
              <TabsTrigger value="evidence" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Evidence</span>
                <span className="sm:hidden">Files</span>
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs sm:text-sm py-2 px-2 sm:px-4">
                <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Comments</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feasibility">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Feasibility Analysis</CardTitle>
                  <CardDescription className="text-sm">
                    AI-powered feasibility assessment for this project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feasibilityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : feasibilityAnalysis ? (
                    <div className="space-y-4">
                      {feasibilityAnalysis.summary && (
                        <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h3 className="font-semibold text-sm sm:text-base mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            Analysis Summary
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground break-words">{feasibilityAnalysis.summary}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        {feasibilityAnalysis.technical_rating && (
                          <div className="p-3 sm:p-4 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Technical Feasibility</div>
                            <div className="text-lg sm:text-xl font-bold">{feasibilityAnalysis.technical_rating}</div>
                            {feasibilityAnalysis.technical_reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">{feasibilityAnalysis.technical_reasoning}</p>
                            )}
                          </div>
                        )}
                        {feasibilityAnalysis.commercial_rating && (
                          <div className="p-3 sm:p-4 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Commercial Viability</div>
                            <div className="text-lg sm:text-xl font-bold">{feasibilityAnalysis.commercial_rating}</div>
                            {feasibilityAnalysis.commercial_reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">{feasibilityAnalysis.commercial_reasoning}</p>
                            )}
                          </div>
                        )}
                        {feasibilityAnalysis.rd_tax_flag && (
                          <div className="p-3 sm:p-4 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">R&D Tax Eligibility</div>
                            <div className="text-lg sm:text-xl font-bold">{feasibilityAnalysis.rd_tax_flag}</div>
                            {feasibilityAnalysis.rd_tax_reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">{feasibilityAnalysis.rd_tax_reasoning}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => router.push(`/feasibility/${feasibilityAnalysis.id}`)}
                        className="w-full sm:w-auto"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Feasibility Report
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-muted-foreground">No feasibility analysis yet</p>
                      <Button 
                        onClick={handleRunFeasibility} 
                        disabled={runningFeasibility}
                        size="sm"
                      >
                        {runningFeasibility ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Running Analysis...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Run Feasibility Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evidence">
              <div className="space-y-4 sm:space-y-6">
                {canEdit && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Add Evidence</CardTitle>
                      <CardDescription className="text-sm">Upload files, add notes, or link external resources</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant={evidenceType === "note" ? "default" : "outline"}
                          onClick={() => setEvidenceType("note")}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Note
                        </Button>
                        <Button
                          type="button"
                          variant={evidenceType === "file" ? "default" : "outline"}
                          onClick={() => setEvidenceType("file")}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          File
                        </Button>
                        <Button
                          type="button"
                          variant={evidenceType === "link" ? "default" : "outline"}
                          onClick={() => setEvidenceType("link")}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="evidenceTitle" className="text-sm">Title</Label>
                          <Input
                            id="evidenceTitle"
                            value={evidenceTitle}
                            onChange={(e) => setEvidenceTitle(e.target.value)}
                            placeholder="Brief title for this evidence"
                            className="text-sm"
                          />
                        </div>

                        {evidenceType === "note" && (
                          <div>
                            <Label htmlFor="evidenceBody" className="text-sm">Description</Label>
                            <Textarea
                              id="evidenceBody"
                              value={evidenceBody}
                              onChange={(e) => setEvidenceBody(e.target.value)}
                              placeholder="Describe your evidence..."
                              rows={4}
                              className="text-sm resize-none"
                            />
                          </div>
                        )}

                        {evidenceType === "file" && (
                          <div>
                            <Label htmlFor="evidenceFile" className="text-sm">Upload File</Label>
                            <Input
                              id="evidenceFile"
                              type="file"
                              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {evidenceType === "link" && (
                          <div>
                            <Label htmlFor="evidenceUrl" className="text-sm">External URL</Label>
                            <Input
                              id="evidenceUrl"
                              value={evidenceUrl}
                              onChange={(e) => setEvidenceUrl(e.target.value)}
                              placeholder="https://..."
                              className="text-sm"
                            />
                          </div>
                        )}

                        <Button 
                          onClick={handleAddEvidence} 
                          disabled={submitting}
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          {submitting ? "Adding..." : "Add Evidence"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Evidence Items ({evidence.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evidence.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No evidence yet. Add your first evidence item above.</p>
                    ) : (
                      <div className="space-y-3">
                        {evidence.map((item) => (
                          <div key={item.id} className="p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                                  {item.title && <h4 className="font-medium text-sm break-words">{item.title}</h4>}
                                </div>
                                {item.body && <p className="text-xs sm:text-sm text-muted-foreground mb-2 break-words line-clamp-2">{item.body}</p>}
                                {item.external_url && (
                                  <a 
                                    href={item.external_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline break-all"
                                  >
                                    {item.external_url}
                                  </a>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEvidence(item.id)}
                                  disabled={deletingEvidence === item.id}
                                  className="flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <div className="space-y-4 sm:space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Add Comment</CardTitle>
                    <CardDescription className="text-sm">Share updates or respond to RD staff feedback</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Write a comment..."
                      rows={4}
                      className="text-sm resize-none"
                    />
                    <Button 
                      onClick={handleAddComment} 
                      disabled={submitting || !commentBody.trim()}
                      className="w-full sm:w-auto"
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitting ? "Posting..." : "Post Comment"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Comments ({comments.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Start the conversation!</p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-3 sm:p-4 border rounded-lg">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={comment.author_role === "rd_staff" ? "default" : "secondary"} className="text-xs">
                                  {comment.author_role === "rd_staff" ? "RD Staff" : "Client"}
                                </Badge>
                                {comment.author?.email && (
                                  <span className="text-xs text-muted-foreground break-all">{comment.author.email}</span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm break-words whitespace-pre-wrap">{comment.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Send to Team Dialog */}
          <Dialog open={sendToTeamDialog} onOpenChange={setSendToTeamDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Project to R&D Team?</DialogTitle>
                <DialogDescription>
                  Your project will be sent to your R&D team for technical review. They have 3 business days to complete their review and send it back to you.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendToTeamDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendToTeam} disabled={submitting}>
                  {submitting ? "Sending..." : "Send to Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Review Dialog with Partial Approval */}
          <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Team's Work</DialogTitle>
                <DialogDescription>
                  Review each section and approve or request changes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.basic_info === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          basic_info: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Basic Information</h4>
                      <p className="text-sm text-muted-foreground">Project name, description, sector, stage</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.technical_understanding === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          technical_understanding: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Technical Understanding</h4>
                      <p className="text-sm text-muted-foreground">Team's technical analysis and approach</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.challenges === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          challenges: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Challenges & Uncertainties</h4>
                      <p className="text-sm text-muted-foreground">Technical challenges and risk assessment</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.qualifying_activities === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          qualifying_activities: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Qualifying Activities</h4>
                      <p className="text-sm text-muted-foreground">R&D activities and eligibility assessment</p>
                    </div>
                  </div>
                </div>

                {Object.values(approvalSections).some(s => s === "needs_revision") && (
                  <div className="space-y-2">
                    <Label>Feedback for sections needing revision</Label>
                    <Textarea
                      value={revisionFeedback}
                      onChange={(e) => setRevisionFeedback(e.target.value)}
                      placeholder="Explain what needs to be changed..."
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleApproveProject}
                  disabled={submitting || (Object.values(approvalSections).some(s => s === "needs_revision") && !revisionFeedback.trim())}
                >
                  {submitting ? "Submitting..." : Object.values(approvalSections).every(s => s === "approved") ? "Approve All" : "Submit Feedback"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Cancel Dialog */}
          <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Project?</DialogTitle>
                <DialogDescription>
                  Please provide a reason for cancelling this project
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelDialog(false)}>
                  Keep Project
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelProject}
                  disabled={submitting || !cancelReason.trim()}
                >
                  {submitting ? "Cancelling..." : "Cancel Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Project Dialog */}
          <Dialog open={editingProject} onOpenChange={setEditingProject}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary" />
                  Edit Project
                </DialogTitle>
                <DialogDescription>
                  Update your project details below
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-project-name">Project Name</Label>
                  <Input
                    id="edit-project-name"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-project-description">Description</Label>
                  <Textarea
                    id="edit-project-description"
                    value={editProjectDescription}
                    onChange={(e) => setEditProjectDescription(e.target.value)}
                    placeholder="Enter project description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-project-sector">Sector</Label>
                    <Input
                      id="edit-project-sector"
                      value={editProjectSector}
                      onChange={(e) => setEditProjectSector(e.target.value)}
                      placeholder="e.g., Energy, Healthcare"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-project-stage">Stage</Label>
                    <Input
                      id="edit-project-stage"
                      value={editProjectStage}
                      onChange={(e) => setEditProjectStage(e.target.value)}
                      placeholder="e.g., Concept, Development"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingProject(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditProject}
                  disabled={submitting || !editProjectName.trim()}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}