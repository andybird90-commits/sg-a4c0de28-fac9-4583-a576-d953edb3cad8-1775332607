import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { claimService, ClaimWithDetails } from "@/services/claimService";
import { messageService } from "@/services/messageService";
import { useApp } from "@/contexts/AppContext";
import { MessageWidget } from "@/components/MessageWidget";
import {
  ArrowLeft,
  Plus,
  FileText,
  Upload,
  Download,
  Trash2,
  Edit,
  Save,
  X,
  Calendar,
  PoundSterling,
  Users,
  CheckCircle2,
  Clock,
  Building2,
  Briefcase,
  AlertCircle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];
type ClaimDocument = Database["public"]["Tables"]["claim_documents"]["Row"];

type HmrcResponseItem = {
  question: string;
  team_response: string;
};

// Helper component for project cards with workflow actions
function ProjectCard({
  project,
  showClaimButton,
  showSendToClient,
}: {
  project: ClaimProject;
  showClaimButton?: boolean;
  showSendToClient?: boolean;
}) {
  const { user } = useApp();
  const [claiming, setClaiming] = useState(false);
  const [sending, setSending] = useState(false);

  const handleClaimProject = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      await claimService.claimProject(project.id, user.id);
      window.location.reload();
    } catch (error) {
      console.error("Error claiming project:", error);
      alert("Failed to claim project");
    } finally {
      setClaiming(false);
    }
  };

  const handleSendToClient = async () => {
    if (!user) return;
    setSending(true);
    try {
      await claimService.sendProjectToClient(project.id, user.id);
      window.location.reload();
    } catch (error) {
      console.error("Error sending to client:", error);
      alert("Failed to send to client");
    } finally {
      setSending(false);
    }
  };

  const getSLABadge = () => {
    const now = new Date();
    let target: Date | null = null;

    if (project.due_date) {
      target = new Date(project.due_date);
    } else if (project.submitted_to_team_at) {
      const slaHours = 48;
      target = new Date(project.submitted_to_team_at);
      target.setHours(target.getHours() + slaHours);
    }

    if (!target) return null;
    const hoursLeft =
      (target.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (hoursLeft < 24) {
      return (
        <Badge className="bg-orange-500 text-slate-950">
          {Math.floor(hoursLeft)}h left
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-500 text-slate-950">
          {Math.floor(hoursLeft / 24)}d left
        </Badge>
      );
    }
  };

  const getWorkflowLabel = (status?: string | null) => {
    switch (status) {
      case "submitted_to_team":
        return "Pending review";
      case "team_in_progress":
        return "In progress";
      case "awaiting_client_review":
        return "Awaiting client";
      case "revision_requested":
        return "Revisions requested";
      case "approved":
        return "Approved";
      default:
        return status || "draft";
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        project.workflow_status === "submitted_to_team"
          ? "border-orange-500/80 bg-orange-500/5"
          : "hover:bg-accent/50"
      }`}
    >
      <Link href={`/staff/claims/projects/${project.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-medium break-words">{project.name}</h4>
              <Badge variant="outline">
                {getWorkflowLabel(project.workflow_status)}
              </Badge>
              {project.workflow_status === "submitted_to_team" && (
                <Badge className="bg-orange-500 text-slate-950">
                  Pending from client
                </Badge>
              )}
              {getSLABadge()}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground break-words mb-2">
                {project.description}
              </p>
            )}
            {project.rd_theme && (
              <Badge variant="secondary" className="text-xs">
                {project.rd_theme}
              </Badge>
            )}
            {project.assigned_to_user_id && (
              <p className="text-xs text-muted-foreground mt-2">
                Assigned to team member
              </p>
            )}
          </div>
        </div>
      </Link>
      <div className="flex gap-2 flex-shrink-0 mt-2">
        {showClaimButton &&
          !project.assigned_to_user_id &&
          false && (
            <Button
              onClick={handleClaimProject}
              disabled={claiming}
              size="sm"
            >
              {claiming ? "Claiming..." : "Claim Project"}
            </Button>
          )}
        {showSendToClient && (
          <Button onClick={handleSendToClient} disabled={sending} size="sm">
            {sending ? "Sending..." : "Send to Client"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ClaimDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { user: profile } = useApp();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [clientCostAdviceCounts, setClientCostAdviceCounts] = useState<Record<string, number>>({});

  // Available sidekick projects for import
  const [sidekickProjects, setSidekickProjects] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // AI Sidekick state
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showSendAnalysisDialog, setShowSendAnalysisDialog] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Project management state
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    rd_theme: "",
    technical_understanding: "",
    challenges_uncertainties: "",
    qualifying_activities: "",
  });

  // Cost management state
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<any>(null);
  const [costForm, setCostForm] = useState({
    cost_type: "staff",
    description: "",
    amount: "",
    cost_date: "",
    project_id: "",
  });

  // Document management state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("supporting_evidence");
  const [documentProjectId, setDocumentProjectId] = useState("");

  const [qaAdmins, setQaAdmins] = useState<
    { id: string; full_name: string | null; email: string | null }[]
  >([]);
  const [selectedQaAdmin, setSelectedQaAdmin] = useState("");
  const [loadingQaAdmins, setLoadingQaAdmins] = useState(false);
  const [submittingQa, setSubmittingQa] = useState(false);
  const [qaActionLoading, setQaActionLoading] = useState(false);
  const [qaFeedback, setQaFeedback] = useState("");
  const [clientActionLoading, setClientActionLoading] = useState(false);
  const [clientFeedback, setClientFeedback] = useState("");
  const [hmrcActionLoading, setHmrcActionLoading] = useState(false);

  const [hmrcResponses, setHmrcResponses] = useState<HmrcResponseItem[]>([]);
  const [outcomeSubmittedValue, setOutcomeSubmittedValue] = useState("");
  const [outcomeReceivedValue, setOutcomeReceivedValue] = useState("");

  // Derived state for projects to match the new UI code
  const projects = claim?.projects || [];
  const loadingProjects = loading;
  // Alias for compatibility with the new UI code
  const setShowAddProject = setShowProjectDialog;

  useEffect(() => {
    if (id && typeof id === "string") {
      loadClaim(id);
    }
  }, [id]);

  useEffect(() => {
    if (claim?.org_id) {
      loadSidekickProjects(claim.org_id);
    }
  }, [claim?.org_id]);

  useEffect(() => {
    const loadAdminsForQa = async (): Promise<void> => {
      if (!profile?.internal_role) return;

      try {
        setLoadingQaAdmins(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, internal_role")
          .eq("internal_role", "admin");

        if (error) {
          console.error("Error loading admins for QA:", error);
          toast({
            title: "Error",
            description: "Failed to load admin reviewers",
            variant: "destructive",
          });
          return;
        }

        setQaAdmins(data || []);
      } finally {
        setLoadingQaAdmins(false);
      }
    };

    loadAdminsForQa();
  }, [profile?.internal_role, toast]);

  const loadClaim = async (claimId: string) => {
    try {
      setLoading(true);
      const data = await claimService.getClaimById(claimId);
      setClaim(data);

      const existingHmrcResponses =
        ((data as any)?.hmrc_responses as HmrcResponseItem[] | null) || [];

      if (existingHmrcResponses.length > 0) {
        setHmrcResponses(existingHmrcResponses);
      } else {
        setHmrcResponses([
          { question: "", team_response: "" },
          { question: "", team_response: "" },
          { question: "", team_response: "" },
        ]);
      }

      const submittedValue =
        data?.submitted_claim_value !== null &&
        data?.submitted_claim_value !== undefined
          ? String(data.submitted_claim_value)
          : "";
      const receivedValue =
        data?.received_claim_value !== null &&
        data?.received_claim_value !== undefined
          ? String(data.received_claim_value)
          : "";

      setOutcomeSubmittedValue(submittedValue);
      setOutcomeReceivedValue(receivedValue);

      if (data?.projects && data.projects.length > 0) {
        await loadClientCostAdviceCounts(data.projects as ClaimProject[]);
      } else {
        setClientCostAdviceCounts({});
      }
    } catch (error) {
      console.error("Error loading claim:", error);
      toast({
        title: "Error",
        description: "Failed to load claim details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSidekickProjects = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("sidekick_projects")
        .select("*")
        .eq("company_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSidekickProjects(data || []);
    } catch (error) {
      console.error("Error loading sidekick projects:", error);
    }
  };

  const loadClientCostAdviceCounts = async (projects: ClaimProject[]) => {
    const sidekickToClaim = new Map<string, string>();
    const sidekickIds: string[] = [];

    projects.forEach((project) => {
      const sourceId = project.source_sidekick_project_id as string | null;
      if (sourceId) {
        sidekickToClaim.set(sourceId, project.id);
        sidekickIds.push(sourceId);
      }
    });

    if (sidekickIds.length === 0) {
      setClientCostAdviceCounts({});
      return;
    }

    const { data, error } = await supabase
      .from("sidekick_project_cost_advice")
      .select("id, project_id")
      .in("project_id", sidekickIds);

    if (error) {
      console.error("Error loading client cost advice counts:", error);
      return;
    }

    const counts: Record<string, number> = {};
    (data || []).forEach((row: any) => {
      const projectId =
        typeof row.project_id === "string" ? row.project_id : null;
      if (!projectId) return;
      const claimProjectId = sidekickToClaim.get(projectId);
      if (!claimProjectId) return;
      counts[claimProjectId] = (counts[claimProjectId] || 0) + 1;
    });

    setClientCostAdviceCounts(counts);
  };

  const handleSubmitForQa = async (): Promise<void> => {
    if (!claim) return;

    if (!selectedQaAdmin) {
      toast({
        title: "Select reviewer",
        description: "Please choose an admin to review this claim.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingQa(true);

      await claimService.updateClaim(claim.id, {
        status: "final_signoff" as any,
        qa_reviewer_id: selectedQaAdmin as any,
        qa_requested_at: new Date().toISOString(),
      });

      await messageService.sendMessage(
        claim.org_id,
        [selectedQaAdmin],
        `Claim QA requested: ${claim.organisations?.name || "Client"} - FY ${claim.claim_year}`,
        "You have been assigned as QA reviewer for this claim. Please review the claim details and either sign off or return comments.",
        undefined,
        { entity_type: "claim", entity_id: claim.id }
      );

      toast({
        title: "Submitted for QA",
        description: "The selected admin has been notified to review this claim.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error submitting claim for QA:", error);
      toast({
        title: "Error",
        description: "Failed to submit claim for QA",
        variant: "destructive",
      });
    } finally {
      setSubmittingQa(false);
    }
  };

  const handleImportSidekickProject = async (sidekickProjectId: string) => {
    if (!claim) return;

    try {
      await claimService.importSidekickProject(claim.id, claim.org_id, sidekickProjectId);
      toast({ title: "Success", description: "Project imported successfully" });
      if (id && typeof id === "string") loadClaim(id);
      setShowImportDialog(false);
    } catch (error) {
      console.error("Error importing project:", error);
      toast({ 
        title: "Error", 
        description: "Failed to import project", 
        variant: "destructive" 
      });
    }
  };

  const handleCreateProject = async () => {
    if (!claim || !profile) return;

    try {
      await claimService.createProject({
        claim_id: claim.id,
        org_id: claim.org_id,
        name: projectForm.name,
        description: projectForm.description,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        rd_theme: projectForm.rd_theme || null,
        technical_understanding: projectForm.technical_understanding || null,
        challenges_uncertainties: projectForm.challenges_uncertainties || null,
        qualifying_activities: projectForm.qualifying_activities ? projectForm.qualifying_activities.split("\n").filter(Boolean) : null,
        created_by: profile.id,
      });

      toast({ title: "Success", description: "Project created successfully" });
      setShowProjectDialog(false);
      setProjectForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        rd_theme: "",
        technical_understanding: "",
        challenges_uncertainties: "",
        qualifying_activities: "",
      });
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      await claimService.updateProject(editingProject.id, {
        name: projectForm.name,
        description: projectForm.description,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        rd_theme: projectForm.rd_theme || null,
        technical_understanding: projectForm.technical_understanding || null,
        challenges_uncertainties: projectForm.challenges_uncertainties || null,
        qualifying_activities: projectForm.qualifying_activities ? projectForm.qualifying_activities.split("\n").filter(Boolean) : null,
      });

      toast({ title: "Success", description: "Project updated successfully" });
      setShowProjectDialog(false);
      setEditingProject(null);
      setProjectForm({
        name: "",
        description: "",
        start_date: "",
        end_date: "",
        rd_theme: "",
        technical_understanding: "",
        challenges_uncertainties: "",
        qualifying_activities: "",
      });
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await claimService.deleteProject(projectId);
      toast({ title: "Success", description: "Project deleted successfully" });
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleCreateCost = async () => {
    if (!claim) return;

    try {
      const projectId =
        costForm.project_id === "none" ? null : costForm.project_id || null;

      await claimService.createCost({
        claim_id: claim.id,
        org_id: claim.org_id,
        project_id: projectId,
        cost_type: costForm.cost_type as any,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
        cost_date: costForm.cost_date || null,
      });

      toast({ title: "Success", description: "Cost entry created successfully" });
      setShowCostDialog(false);
      setCostForm({ cost_type: "staff", description: "", amount: "", cost_date: "", project_id: "" });
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create cost entry",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCost = async () => {
    if (!editingCost) return;

    try {
      const projectId =
        costForm.project_id === "none" ? null : costForm.project_id || null;

      await claimService.updateCost(editingCost.id, {
        cost_type: costForm.cost_type as any,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
        cost_date: costForm.cost_date || null,
        project_id: projectId,
      });

      toast({ title: "Success", description: "Cost entry updated successfully" });
      setShowCostDialog(false);
      setEditingCost(null);
      setCostForm({ cost_type: "staff", description: "", amount: "", cost_date: "", project_id: "" });
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cost entry",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (!confirm("Are you sure you want to delete this cost entry?")) return;

    try {
      await claimService.deleteCost(costId);
      toast({ title: "Success", description: "Cost entry deleted successfully" });
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete cost entry",
        variant: "destructive",
      });
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!claim) return;

    try {
      setLoadingAnalysis(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast({
          title: "Not authenticated",
          description: "You need to be logged in to generate an AI analysis.",
          variant: "destructive",
        });
        setLoadingAnalysis(false);
        return;
      }

      const response = await fetch("/api/claims/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ claimId: claim.id }),
      });

      if (!response.ok) throw new Error("Failed to generate analysis");

      const data = await response.json();
      setAiAnalysis(data.analysis);
      toast({ title: "Success", description: "AI analysis generated successfully" });
    } catch (error) {
      console.error("Error generating analysis:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI analysis",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleSendAnalysis = async () => {
    if (!claim || !profile || !aiAnalysis || !sendTo) return;

    try {
      setSendingMessage(true);

      // Use messageService to handle message creation and recipient linking
      await messageService.sendMessage(
        claim.org_id,
        [sendTo], // recipientIds
        `AI Analysis: ${claim.organisations?.name} - FY ${claim.claim_year}`, // subject
        aiAnalysis, // body
        undefined, // parentMessageId
        { entity_type: "claim", entity_id: claim.id } // context
      );

      toast({ title: "Success", description: "AI analysis sent successfully" });
      setShowSendAnalysisDialog(false);
      setSendTo("");
    } catch (error) {
      console.error("Error sending analysis:", error);
      toast({
        title: "Error",
        description: "Failed to send analysis",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!claim || !selectedFile || !profile) return;

    try {
      setUploadingDocument(true);
      const projectId =
        documentProjectId === "none" ? null : documentProjectId || null;

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${claim.id}_${Date.now()}.${fileExt}`;
      const filePath = `claim_documents/${fileName}`;

      // Upload to evidence-files storage bucket
      const { error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record with project assignment
      await claimService.createDocument({
        claim_id: claim.id,
        org_id: claim.org_id,
        project_id: projectId,
        doc_type: documentType as any,
        title: selectedFile.name,
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        uploaded_by: profile.id,
      });

      toast({ title: "Success", description: "Document uploaded successfully" });
      setShowDocumentDialog(false);
      setSelectedFile(null);
      setDocumentProjectId("");
      if (id && typeof id === "string") loadClaim(id);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDownloadDocument = async (doc: ClaimDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("evidence-files")
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Document downloaded" });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleQaApprove = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setQaActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "final_signoff" as any,
        qa_completed_at: new Date().toISOString(),
      });

      const recipients = [
        claim.bd_owner_id,
        claim.technical_lead_id,
        claim.cost_lead_id,
      ].filter(Boolean) as string[];

      if (recipients.length > 0) {
        await messageService.sendMessage(
          claim.org_id,
          recipients,
          `Claim QA approved: ${claim.organisations?.name || ""} - FY ${
            claim.claim_year
          }`,
          `QA reviewer has approved this claim for client review.${
            qaFeedback ? `\n\nQA notes:\n${qaFeedback}` : ""
          }`,
          undefined,
          { entity_type: "claim", entity_id: claim.id }
        );
      }

      toast({
        title: "QA approved",
        description: "Claim is now ready to be issued to the client for comment.",
      });

      setQaFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error approving QA:", error);
      toast({
        title: "Error",
        description: "Failed to record QA approval",
        variant: "destructive",
      });
    } finally {
      setQaActionLoading(false);
    }
  };

  const handleQaReturnWithComments = async (): Promise<void> => {
    if (!claim || !profile) return;

    if (!qaFeedback.trim()) {
      toast({
        title: "Add feedback",
        description: "Please add comments before returning the claim.",
        variant: "destructive",
      });
      return;
    }

    try {
      setQaActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "in_progress" as any,
        qa_completed_at: new Date().toISOString(),
      });

      const recipients = [
        claim.bd_owner_id,
        claim.technical_lead_id,
        claim.cost_lead_id,
      ].filter(Boolean) as string[];

      if (recipients.length > 0) {
        await messageService.sendMessage(
          claim.org_id,
          recipients,
          `Claim returned with QA comments: ${claim.organisations?.name || ""} - FY ${
            claim.claim_year
          }`,
          qaFeedback,
          undefined,
          { entity_type: "claim", entity_id: claim.id }
        );
      }

      toast({
        title: "Returned with comments",
        description: "QA feedback has been sent to the delivery team.",
      });

      setQaFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error returning claim with QA comments:", error);
      toast({
        title: "Error",
        description: "Failed to return claim with comments",
        variant: "destructive",
      });
    } finally {
      setQaActionLoading(false);
    }
  };

  const handleIssueToClient = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setClientActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "client_review" as any,
        client_review_requested_at: new Date().toISOString(),
      });

      toast({
        title: "Issued to client",
        description: "Claim has been issued to the client for comment.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error issuing claim to client:", error);
      toast({
        title: "Error",
        description: "Failed to issue claim to client",
        variant: "destructive",
      });
    } finally {
      setClientActionLoading(false);
    }
  };

  const handleClientApprove = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setClientActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "ready_to_file" as any,
        client_review_completed_at: new Date().toISOString(),
      });

      toast({
        title: "Client approved",
        description: "Client approval recorded. Claim is ready to file with HMRC.",
      });

      setClientFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error recording client approval:", error);
      toast({
        title: "Error",
        description: "Failed to record client approval",
        variant: "destructive",
      });
    } finally {
      setClientActionLoading(false);
    }
  };

  const handleClientComments = async (): Promise<void> => {
    if (!claim || !profile) return;

    if (!clientFeedback.trim()) {
      toast({
        title: "Add client comments",
        description: "Please add the client feedback before recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      setClientActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "in_progress" as any,
        client_review_completed_at: new Date().toISOString(),
      });

      const recipients = [
        claim.bd_owner_id,
        claim.technical_lead_id,
        claim.cost_lead_id,
      ].filter(Boolean) as string[];

      if (recipients.length > 0) {
        await messageService.sendMessage(
          claim.org_id,
          recipients,
          `Client comments on claim: ${claim.organisations?.name || ""} - FY ${
            claim.claim_year
          }`,
          clientFeedback,
          undefined,
          { entity_type: "claim", entity_id: claim.id }
        );
      }

      toast({
        title: "Client comments recorded",
        description: "Client feedback has been logged. Claim moved back to draft.",
      });

      setClientFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error recording client comments:", error);
      toast({
        title: "Error",
        description: "Failed to record client comments",
        variant: "destructive",
      });
    } finally {
      setClientActionLoading(false);
    }
  };

  const handleIssueToHmrc = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setHmrcActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "submitted_hmrc" as any,
        actual_submission_date: new Date().toISOString().slice(0, 10),
      });

      toast({
        title: "Issued to HMRC",
        description: "Claim has been marked as submitted to HMRC.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error issuing claim to HMRC:", error);
      toast({
        title: "Error",
        description: "Failed to mark claim as submitted to HMRC",
        variant: "destructive",
      });
    } finally {
      setHmrcActionLoading(false);
    }
  };

  const handleAddHmrcResponseRow = () => {
    setHmrcResponses((prev) => [
      ...prev,
      { question: "", team_response: "" },
    ]);
  };

  const handleHmrcResponseChange = (
    index: number,
    field: "question" | "team_response",
    value: string
  ) => {
    setHmrcResponses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveHmrcResponses = async (): Promise<void> => {
    if (!claim) return;

    try {
      const cleaned = hmrcResponses.filter(
        (item) =>
          item.question.trim() !== "" || item.team_response.trim() !== ""
      );

      await claimService.updateClaim(claim.id, {
        hmrc_responses: cleaned as any,
        status:
          claim.status === "submitted_hmrc"
            ? ("hmrc_feedback" as any)
            : ((claim.status || "hmrc_feedback") as any),
      });

      toast({
        title: "HMRC responses saved",
        description: "Responses have been saved to this claim.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error saving HMRC responses:", error);
      toast({
        title: "Error",
        description: "Failed to save HMRC responses",
        variant: "destructive",
      });
    }
  };

  const handleSaveOutcome = async (): Promise<void> => {
    if (!claim) return;

    try {
      const submitted =
        outcomeSubmittedValue.trim() === ""
          ? null
          : Number.parseFloat(outcomeSubmittedValue);
      const received =
        outcomeReceivedValue.trim() === ""
          ? null
          : Number.parseFloat(outcomeReceivedValue);

      await claimService.updateClaim(claim.id, {
        submitted_claim_value: submitted as any,
        received_claim_value: received as any,
      });

      toast({
        title: "Outcome saved",
        description: "Submitted and received values have been updated.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error saving claim outcome:", error);
      toast({
        title: "Error",
        description: "Failed to save outcome values",
        variant: "destructive",
      });
    }
  };

  const handleMarkClaimCompleted = async (): Promise<void> => {
    if (!claim) return;

    try {
      await claimService.updateClaim(claim.id, {
        status: "completed" as any,
      });

      toast({
        title: "Claim completed",
        description:
          "Claim has been marked as completed and archived in the system.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error marking claim completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark claim as completed",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      intake: { label: "Intake", className: "bg-blue-100 text-blue-800" },
      in_progress: { label: "In Progress", className: "bg-purple-100 text-purple-800" },
      review: { label: "Review", className: "bg-orange-100 text-orange-800" },
      submitted: { label: "Submitted", className: "bg-green-100 text-green-800" },
      approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <StaffLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff6b35] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading claim details...</p>
          </div>
        </div>
      </StaffLayout>
    );
  }

  if (!claim) {
    return (
      <StaffLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Claim Not Found</h1>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/staff/claims")}
              className="text-slate-200 hover:text-white hover:bg-slate-800/80"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
                  {claim.organisations?.name || "Unknown Client"}
                </h1>
                <MessageWidget
                  entityType="claim"
                  entityId={claim.id}
                  entityName={`${claim.organisations?.name || "Claim"} - FY ${claim.claim_year}`}
                />
              </div>
              <p className="text-sm text-slate-400">
                FY {claim.claim_year} • {claim.organisations?.organisation_code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(claim.status || "draft")}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-medium break-words">{claim.name}</h4>
                <Badge variant="outline">
                  {getWorkflowLabel(claim.workflow_status)}
                </Badge>
                {claim.workflow_status === "submitted_to_team" && (
                  <Badge className="bg-orange-500 text-slate-950">
                    Pending from client
                  </Badge>
                )}
                {getSLABadge()}
              </div>
              {claim.description && (
                <p className="text-sm text-muted-foreground break-words mb-2">
                  {claim.description}
                </p>
              )}
              {claim.rd_theme && (
                <Badge variant="secondary" className="text-xs">
                  {claim.rd_theme}
                </Badge>
              )}
              {claim.assigned_to_user_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Assigned to team member
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-medium break-words">{claim.name}</h4>
                <Badge variant="outline">
                  {getWorkflowLabel(claim.workflow_status)}
                </Badge>
                {claim.workflow_status === "submitted_to_team" && (
                  <Badge className="bg-orange-500 text-slate-950">
                    Pending from client
                  </Badge>
                )}
                {getSLABadge()}
              </div>
              {claim.description && (
                <p className="text-sm text-muted-foreground break-words mb-2">
                  {claim.description}
                </p>
              )}
              {claim.rd_theme && (
                <Badge variant="secondary" className="text-xs">
                  {claim.rd_theme}
                </Badge>
              )}
              {claim.assigned_to_user_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Assigned to team member
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-medium break-words">{claim.name}</h4>
                <Badge variant="outline">
                  {getWorkflowLabel(claim.workflow_status)}
                </Badge>
                {claim.workflow_status === "submitted_to_team" && (
                  <Badge className="bg-orange-500 text-slate-950">
                    Pending from client
                  </Badge>
                )}
                {getSLABadge()}
              </div>
              {claim.description && (
                <p className="text-sm text-muted-foreground break-words mb-2">
                  {claim.description}
                </p>
              )}
              {claim.rd_theme && (
                <Badge variant="secondary" className="text-xs">
                  {claim.rd_theme}
                </Badge>
              )}
              {claim.assigned_to_user_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Assigned to team member
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-medium break-words">{claim.name}</h4>
                <Badge variant="outline">
                  {getWorkflowLabel(claim.workflow_status)}
                </Badge>
                {claim.workflow_status === "submitted_to_team" && (
                  <Badge className="bg-orange-500 text-slate-950">
                    Pending from client
                  </Badge>
                )}
                {getSLABadge()}
              </div>
              {claim.description && (
                <p className="text-sm text-muted-foreground break-words mb-2">
                  {claim.description}
                </p>
              )}
              {claim.rd_theme && (
                <Badge variant="secondary" className="text-xs">
                  {claim.rd_theme}
                </Badge>
              )}
              {claim.assigned_to_user_id && (
                <p className="text-xs text-muted-foreground mt-2">
                  Assigned to team member
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="sidekick">Companion</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Claim Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-slate-600">Claim Year</Label>
                        <p className="font-medium">{claim.claim_year}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600">Status</Label>
                        <div className="mt-1">{getStatusBadge(claim.status || "draft")}</div>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600">Created</Label>
                        <p className="font-medium">
                          {claim.created_at ? format(new Date(claim.created_at), "PPP") : "N/A"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-slate-600">Last Updated</Label>
                        <p className="font-medium">
                          {claim.updated_at ? format(new Date(claim.updated_at), "PPP") : "N/A"}
                        </p>
                      </div>
                    </div>

                    {claim.notes && (
                      <div>
                        <Label className="text-sm text-slate-600">Notes</Label>
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">{claim.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Team Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {claim.bd_owner && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {claim.bd_owner.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{claim.bd_owner.full_name}</p>
                          <p className="text-sm text-slate-600">BD Owner</p>
                        </div>
                      </div>
                    )}

                    {claim.technical_lead && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                          {claim.technical_lead.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{claim.technical_lead.full_name}</p>
                          <p className="text-sm text-slate-600">Technical Lead</p>
                        </div>
                      </div>
                    )}

                    {claim.cost_lead && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">
                          {claim.cost_lead.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{claim.cost_lead.full_name}</p>
                          <p className="text-sm text-slate-600">Cost Lead</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Filing & Approval Workflow</CardTitle>
                      <CardDescription>
                        Manage internal QA, client review and HMRC submission steps.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Step 1 – Internal QA */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">
                          Step 1 – Internal QA signoff
                        </p>
                        {claim.status === "final_signoff" && claim.qa_reviewer_id ? (
                          <p className="text-sm text-slate-600">
                            Awaiting QA review from{" "}
                            <span className="font-medium">
                              {claim.qa_reviewer?.full_name || "assigned admin"}
                            </span>
                            .
                          </p>
                        ) : (
                          <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="flex-1">
                              <Label className="text-sm text-slate-600">
                                Assign QA reviewer (admin)
                              </Label>
                              <Select
                                value={selectedQaAdmin}
                                onValueChange={setSelectedQaAdmin}
                                disabled={loadingQaAdmins || submittingQa}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      loadingQaAdmins
                                        ? "Loading admins..."
                                        : "Select admin reviewer"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {qaAdmins.map((admin) => (
                                    <SelectItem key={admin.id} value={admin.id}>
                                      {admin.full_name || admin.email || "Admin"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              onClick={handleSubmitForQa}
                              disabled={!selectedQaAdmin || submittingQa}
                            >
                              {submittingQa ? "Submitting..." : "Submit for QA signoff"}
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-slate-500">
                          The selected admin will receive a message with a link to this
                          claim to review and approve.
                        </p>
                      </div>

                      {claim.status === "final_signoff" &&
                        claim.qa_reviewer_id &&
                        profile?.id === claim.qa_reviewer_id && (
                          <div className="mt-4 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-800">
                              QA reviewer actions
                            </p>
                            <Textarea
                              placeholder="Add QA comments or notes for the team..."
                              value={qaFeedback}
                              onChange={(e) => setQaFeedback(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={handleQaApprove}
                                disabled={qaActionLoading}
                              >
                                {qaActionLoading ? "Saving..." : "Approve for client review"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleQaReturnWithComments}
                                disabled={qaActionLoading}
                              >
                                Return with comments
                              </Button>
                            </div>
                          </div>
                        )}

                      {/* Step 2 – Client review */}
                      <div className="space-y-2 border-t border-slate-200 pt-4">
                        <p className="text-sm font-medium text-slate-700">
                          Step 2 – Client review and comments
                        </p>
                        {claim.status === "final_signoff" &&
                          claim.qa_completed_at &&
                          !claim.client_review_requested_at && (
                            <Button
                              size="sm"
                              onClick={handleIssueToClient}
                              disabled={clientActionLoading}
                            >
                              {clientActionLoading
                                ? "Issuing to client..."
                                : "Issue to client for comment"}
                            </Button>
                          )}

                        {["client_review", "ready_to_file", "submitted_hmrc", "hmrc_feedback", "completed"].includes(
                          claim.status || ""
                        ) && (
                          <p className="text-xs text-slate-600">
                            Client review requested{" "}
                            {claim.client_review_requested_at
                              ? format(new Date(claim.client_review_requested_at), "PPP")
                              : "recently"}
                            .
                          </p>
                        )}

                        {claim.status === "client_review" && (
                          <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-medium text-slate-800">
                              Record client outcome
                            </p>
                            <Textarea
                              placeholder="Optional: paste client comments or notes for the file..."
                              value={clientFeedback}
                              onChange={(e) => setClientFeedback(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={handleClientApprove}
                                disabled={clientActionLoading}
                              >
                                {clientActionLoading
                                  ? "Saving..."
                                  : "Client approved – ready to file"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleClientComments}
                                disabled={clientActionLoading}
                              >
                                Client comments – back to draft
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Step 3 – HMRC submission */}
                      <div className="space-y-2 border-t border-slate-200 pt-4">
                        <p className="text-sm font-medium text-slate-700">
                          Step 3 – HMRC submission
                        </p>
                        {claim.status === "ready_to_file" && (
                          <Button
                            size="sm"
                            onClick={handleIssueToHmrc}
                            disabled={hmrcActionLoading}
                          >
                            {hmrcActionLoading ? "Submitting..." : "Issue to HMRC"}
                          </Button>
                        )}
                        {["submitted_hmrc", "hmrc_feedback", "completed"].includes(
                          claim.status || ""
                        ) && (
                          <>
                            <p className="text-xs text-slate-600">
                              Submitted to HMRC{" "}
                              {claim.actual_submission_date
                                ? format(new Date(claim.actual_submission_date), "PPP")
                                : "recently"}
                              .
                            </p>

                            <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
                              <p className="text-sm font-medium text-slate-700">
                                HMRC responses and claim outcome
                              </p>
                              <div className="space-y-3">
                                {hmrcResponses.map((item, index) => (
                                  <div
                                    key={index}
                                    className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-2"
                                  >
                                    <div>
                                      <Label className="text-xs text-slate-600">
                                        HMRC question / point {index + 1}
                                      </Label>
                                      <Textarea
                                        className="mt-1 h-20"
                                        value={item.question}
                                        onChange={(e) =>
                                          handleHmrcResponseChange(
                                            index,
                                            "question",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Paste the HMRC question or point here..."
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-slate-600">
                                        Team response / counter
                                      </Label>
                                      <Textarea
                                        className="mt-1 h-20"
                                        value={item.team_response}
                                        onChange={(e) =>
                                          handleHmrcResponseChange(
                                            index,
                                            "team_response",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Draft your response to HMRC..."
                                      />
                                    </div>
                                  </div>
                                ))}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddHmrcResponseRow}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add another response
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSaveHmrcResponses}
                                  >
                                    Save responses
                                  </Button>
                                </div>
                                <p className="text-xs text-slate-500">
                                  Use the Companion tab on this claim to help draft
                                  wording for HMRC responses.
                                </p>
                              </div>

                              <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                                <p className="text-sm font-medium text-slate-800">
                                  Claim outcome (for sales ratios)
                                </p>
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div>
                                    <Label className="text-xs text-slate-600">
                                      Submitted claim value (£)
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="mt-1"
                                      value={outcomeSubmittedValue}
                                      onChange={(e) =>
                                        setOutcomeSubmittedValue(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">
                                      Received value (£)
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      className="mt-1"
                                      value={outcomeReceivedValue}
                                      onChange={(e) =>
                                        setOutcomeReceivedValue(e.target.value)
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-slate-600">
                                      Realised vs submitted
                                    </Label>
                                    <p className="mt-2 text-sm font-medium text-slate-800">
                                      {outcomeSubmittedValue &&
                                      outcomeReceivedValue
                                        ? `${Math.round(
                                            (Number(
                                              outcomeReceivedValue || "0"
                                            ) /
                                              Math.max(
                                                Number(
                                                  outcomeSubmittedValue || "0"
                                                ),
                                                1
                                              )) *
                                              100
                                          )}%`
                                        : "—"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleSaveOutcome}
                                  >
                                    Save outcome
                                  </Button>
                                  {claim.status !== "completed" && (
                                    <Button
                                      size="sm"
                                      onClick={handleMarkClaimCompleted}
                                    >
                                      Mark claim completed
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-6">
                {/* Workflow Status Filter Tabs */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Workflow</CardTitle>
                    <CardDescription>Manage projects through the review workflow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="all" className="space-y-4">
                      <TabsList className="grid grid-cols-5 w-full">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="pending">
                          Pending Review
                          {projects.filter(p => p.workflow_status === "submitted_to_team").length > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {projects.filter(p => p.workflow_status === "submitted_to_team").length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                        <TabsTrigger value="awaiting_client">Awaiting Client</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                      </TabsList>

                      {/* All Projects */}
                      <TabsContent value="all" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold">All Projects ({projects.length})</h3>
                          <Button onClick={() => setShowAddProject(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Project
                          </Button>
                        </div>
                        {loadingProjects ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : projects.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No projects yet</p>
                        ) : (
                          <div className="space-y-3">
                            {projects.map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* Pending Review */}
                      <TabsContent value="pending" className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Pending Review ({projects.filter(p => p.workflow_status === "submitted_to_team").length})
                        </h3>
                        {projects.filter(p => p.workflow_status === "submitted_to_team").length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No projects pending review</p>
                        ) : (
                          <div className="space-y-3">
                            {projects
                              .filter(
                                (p) => p.workflow_status === "submitted_to_team"
                              )
                              .map((project) => (
                                <ProjectCard
                                  key={project.id}
                                  project={project}
                                />
                              ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* In Progress */}
                      <TabsContent value="in_progress" className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          In Progress ({projects.filter(p => p.workflow_status === "team_in_progress").length})
                        </h3>
                        {projects.filter(p => p.workflow_status === "team_in_progress").length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No projects in progress</p>
                        ) : (
                          <div className="space-y-3">
                            {projects.filter(p => p.workflow_status === "team_in_progress").map((project) => (
                              <ProjectCard key={project.id} project={project} showSendToClient />
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* Awaiting Client */}
                      <TabsContent value="awaiting_client" className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Awaiting Client ({projects.filter(p => ["awaiting_client_review", "revision_requested"].includes(p.workflow_status || "")).length})
                        </h3>
                        {projects.filter(p => ["awaiting_client_review", "revision_requested"].includes(p.workflow_status || "")).length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No projects awaiting client review</p>
                        ) : (
                          <div className="space-y-3">
                            {projects.filter(p => ["awaiting_client_review", "revision_requested"].includes(p.workflow_status || "")).map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* Approved */}
                      <TabsContent value="approved" className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Approved ({projects.filter(p => p.workflow_status === "approved").length})
                        </h3>
                        {projects.filter(p => p.workflow_status === "approved").length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No approved projects yet</p>
                        ) : (
                          <div className="space-y-3">
                            {projects.filter(p => p.workflow_status === "approved").map((project) => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Costs Tab */}
              <TabsContent value="costs" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Cost Tracking</CardTitle>
                        <CardDescription>Track all R&D-related costs for this claim</CardDescription>
                      </div>
                      <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Document
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Evidence</DialogTitle>
                            <DialogDescription>Upload supporting documentation for this claim</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="doc-type">Document Type *</Label>
                              <Select value={documentType} onValueChange={setDocumentType}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="supporting_evidence">Supporting Evidence</SelectItem>
                                  <SelectItem value="financial_records">Financial Records</SelectItem>
                                  <SelectItem value="technical_documentation">Technical Documentation</SelectItem>
                                  <SelectItem value="correspondence">Correspondence</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="doc-project">Assign to Project (Optional)</Label>
                              <Select value={documentProjectId} onValueChange={setDocumentProjectId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select project..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">General (not project-specific)</SelectItem>
                                  {claim.projects?.map((proj) => (
                                    <SelectItem key={proj.id} value={proj.id}>
                                      {proj.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="file-upload">Select File *</Label>
                              <Input
                                id="file-upload"
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                              />
                              {selectedFile && (
                                <p className="text-sm text-slate-600 mt-2">
                                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                                </p>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleDocumentUpload} disabled={!selectedFile || uploadingDocument}>
                              {uploadingDocument ? "Uploading..." : "Upload"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {claim.documents && claim.documents.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {claim.documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell>{doc.created_at ? format(new Date(doc.created_at), "dd/MM/yyyy") : "N/A"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{doc.doc_type}</Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{doc.title}</TableCell>
                              <TableCell>
                                {doc.project_id ? (
                                  <span className="text-sm text-slate-600">
                                    {claim.projects?.find(p => p.id === doc.project_id)?.name || "Unknown"}
                                  </span>
                                ) : (
                                  <span className="text-sm text-slate-400">General</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(doc.file_size || 0)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 text-slate-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No documents uploaded yet</p>
                        <p className="text-sm">Upload supporting evidence for your R&D claim</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Companion Tab (internal value still 'sidekick') */}
              <TabsContent value="sidekick" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <RefreshCw className="h-5 w-5 text-orange-600" />
                          AI Companion Analysis
                        </CardTitle>
                        <CardDescription>
                          Get AI-powered insights and recommendations for this claim
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {aiAnalysis && (
                          <Dialog open={showSendAnalysisDialog} onOpenChange={setShowSendAnalysisDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline">
                                <Users className="mr-2 h-4 w-4" />
                                Send Analysis
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Send AI Analysis</DialogTitle>
                                <DialogDescription>
                                  Send this AI analysis as a message to a team member or client
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="send-to">Send To *</Label>
                                  <Select value={sendTo} onValueChange={setSendTo}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select recipient..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {claim.bd_owner && (
                                        <SelectItem value={claim.bd_owner.id}>
                                          {claim.bd_owner.full_name} (BD Owner)
                                        </SelectItem>
                                      )}
                                      {claim.technical_lead && (
                                        <SelectItem value={claim.technical_lead.id}>
                                          {claim.technical_lead.full_name} (Technical Lead)
                                        </SelectItem>
                                      )}
                                      {claim.cost_lead && (
                                        <SelectItem value={claim.cost_lead.id}>
                                          {claim.cost_lead.full_name} (Cost Lead)
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Analysis Preview</Label>
                                  <div className="mt-2 p-4 bg-slate-50 rounded-lg max-h-64 overflow-y-auto">
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                      {aiAnalysis.substring(0, 200)}...
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowSendAnalysisDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={handleSendAnalysis} 
                                  disabled={!sendTo || sendingMessage}
                                >
                                  {sendingMessage ? "Sending..." : "Send Message"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button 
                          onClick={handleGenerateAnalysis} 
                          disabled={loadingAnalysis}
                        >
                          {loadingAnalysis ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Generate Analysis
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!aiAnalysis && !loadingAnalysis && (
                      <div className="text-center py-12 text-slate-500">
                        <RefreshCw className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium mb-2">No Analysis Generated Yet</p>
                        <p className="text-sm mb-4">
                          Click &quot;Generate Analysis&quot; to get AI-powered insights and recommendations
                        </p>
                        <div className="max-w-md mx-auto text-left space-y-2">
                          <p className="text-sm font-medium">The AI will analyze:</p>
                          <ul className="text-sm space-y-1 list-disc list-inside text-slate-600">
                            <li>Technical quality and R&D qualification</li>
                            <li>Documentation completeness</li>
                            <li>Cost justification and categorization</li>
                            <li>Potential HMRC audit risks</li>
                            <li>Specific improvement recommendations</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {loadingAnalysis && (
                      <div className="text-center py-12">
                        <RefreshCw className="h-12 w-12 mx-auto mb-3 text-orange-600 animate-spin" />
                        <p className="font-medium text-slate-900 mb-2">Analyzing Claim...</p>
                        <p className="text-sm text-slate-600">
                          AI is reviewing your projects, costs, and documentation
                        </p>
                      </div>
                    )}

                    {aiAnalysis && !loadingAnalysis && (
                      <div className="prose max-w-none">
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-6">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <RefreshCw className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                AI Analysis Results
                              </h3>
                              <p className="text-sm text-slate-600">
                                Generated insights and recommendations for improvement
                              </p>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-6 border border-orange-100">
                            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {aiAnalysis}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}