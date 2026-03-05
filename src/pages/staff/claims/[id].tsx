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
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-slate-700">
                  <Briefcase className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Projects
                  </p>
                  <p className="text-2xl font-semibold text-slate-50">
                    {claim.projects?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-emerald-500/40">
                  <PoundSterling className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Total Costs
                  </p>
                  <p className="text-2xl font-semibold text-slate-50">
                    {formatCurrency(claim.total_costs || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-violet-500/40">
                  <FileText className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Documents
                  </p>
                  <p className="text-2xl font-semibold text-slate-50">
                    {claim.document_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 border border-orange-500/50">
                  <RefreshCw className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    AI Companion
                  </p>
                  <p className="text-2xl font-semibold text-emerald-300">
                    Ready
                  </p>
                </div>
              </div>
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
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6">
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

              <Card>
                <CardHeader>
                  <CardTitle>Filing &amp; Approval Workflow</CardTitle>
                  <CardDescription>
                    Manage internal QA signoff before client review and HMRC submission.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {/* Later steps: client review & HMRC submission will build on this state */}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                      <Button onClick={() => {
                        setEditingCost(null);
                        setCostForm({ cost_type: "staff", description: "", amount: "", cost_date: "", project_id: "" });
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Cost
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingCost ? "Edit Cost Entry" : "Add Cost Entry"}</DialogTitle>
                        <DialogDescription>Record an R&D cost entry</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="cost-type">Cost Type *</Label>
                          <Select value={costForm.cost_type} onValueChange={(val) => setCostForm({ ...costForm, cost_type: val })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff Costs</SelectItem>
                              <SelectItem value="subcontractor">Subcontractor</SelectItem>
                              <SelectItem value="materials">Materials/Consumables</SelectItem>
                              <SelectItem value="software">Software</SelectItem>
                              <SelectItem value="equipment">Equipment</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="cost-project">Related Project (Optional)</Label>
                          <Select value={costForm.project_id} onValueChange={(val) => setCostForm({ ...costForm, project_id: val })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No project (general cost)</SelectItem>
                              {claim.projects?.map((proj) => (
                                <SelectItem key={proj.id} value={proj.id}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span>{proj.name}</span>
                                    {clientCostAdviceCounts[proj.id] ? (
                                      <Badge variant="secondary" className="ml-2 text-[10px] uppercase">
                                        {clientCostAdviceCounts[proj.id]} client cost
                                        {clientCostAdviceCounts[proj.id] > 1 ? "s" : ""}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="cost-description">Description *</Label>
                          <Textarea
                            id="cost-description"
                            value={costForm.description}
                            onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                            placeholder="Describe the cost..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cost-amount">Amount (£) *</Label>
                            <Input
                              id="cost-amount"
                              type="number"
                              step="0.01"
                              value={costForm.amount}
                              onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label htmlFor="cost-date">Date</Label>
                            <Input
                              id="cost-date"
                              type="date"
                              value={costForm.cost_date}
                              onChange={(e) => setCostForm({ ...costForm, cost_date: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCostDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={editingCost ? handleUpdateCost : handleCreateCost}>
                          {editingCost ? "Update Cost" : "Add Cost"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-4 shadow-professional-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-100 tracking-tight">
                        Total Claim Value
                      </p>
                      <p className="mt-1 text-3xl font-bold text-emerald-300">
                        {formatCurrency(claim.total_costs || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-gradient-to-tr from-emerald-500/20 via-emerald-500/10 to-transparent shadow-lg shadow-emerald-500/20">
                      <PoundSterling className="h-6 w-6 text-emerald-200" />
                    </div>
                  </div>
                </div>

                {claim.costs && claim.costs.length > 0 ? (
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
                      {claim.costs.map((cost) => (
                        <TableRow key={cost.id}>
                          <TableCell>{cost.cost_date ? format(new Date(cost.cost_date), "dd/MM/yyyy") : "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{cost.cost_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{cost.description}</TableCell>
                          <TableCell>
                            {cost.project_id ? (
                              <span className="text-sm text-slate-600">
                                {claim.projects?.find(p => p.id === cost.project_id)?.name || "Unknown"}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">General</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(cost.amount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingCost(cost);
                                  setCostForm({
                                    cost_type: cost.cost_type,
                                    description: cost.description || "",
                                    amount: cost.amount.toString(),
                                    cost_date: cost.cost_date || "",
                                    project_id: cost.project_id || "",
                                  });
                                  setShowCostDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCost(cost.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-slate-600 bg-slate-900 shadow-inner">
                      <PoundSterling className="h-7 w-7 text-slate-200" />
                    </div>
                    <p className="font-semibold text-slate-100">No costs recorded yet</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Add cost entries to track R&amp;D expenditure
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evidence Tab */}
          <TabsContent value="evidence" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Evidence & Documentation</CardTitle>
                    <CardDescription>Upload and manage supporting documents</CardDescription>
                  </div>
                  <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
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
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {claim.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.doc_type}</Badge>
                          </TableCell>
                          <TableCell>{((doc.file_size || 0) / 1024).toFixed(2)} KB</TableCell>
                          <TableCell>{doc.created_at ? format(new Date(doc.created_at), "dd/MM/yyyy") : "N/A"}</TableCell>
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
        </Tabs>
      </div>
    </StaffLayout>
  );
}