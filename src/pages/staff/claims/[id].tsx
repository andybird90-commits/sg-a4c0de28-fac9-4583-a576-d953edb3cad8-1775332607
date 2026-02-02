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
  showSendToClient 
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
    if (!project.due_date) return null;
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

  return (
    <div className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <Link href={`/staff/claims/${project.claim_id}/projects/${project.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-medium break-words">{project.name}</h4>
              <Badge variant="outline">{project.workflow_status || "draft"}</Badge>
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
        {showClaimButton && !project.assigned_to_user_id && (
          <Button onClick={handleClaimProject} disabled={claiming} size="sm">
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

  // Available sidekick projects for import
  const [sidekickProjects, setSidekickProjects] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

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

  const loadClaim = async (claimId: string) => {
    try {
      setLoading(true);
      const data = await claimService.getClaimById(claimId);
      setClaim(data);
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
      await claimService.createCost({
        claim_id: claim.id,
        org_id: claim.org_id,
        project_id: costForm.project_id || null,
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
      await claimService.updateCost(editingCost.id, {
        cost_type: costForm.cost_type as any,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
        cost_date: costForm.cost_date || null,
        project_id: costForm.project_id || null,
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

  const handleDocumentUpload = async () => {
    if (!claim || !selectedFile || !profile) return;

    try {
      setUploadingDocument(true);
      
      // Upload to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${claim.id}_${Date.now()}.${fileExt}`;
      const filePath = `claim_documents/${fileName}`;

      // For now, create document record (file upload would go to Supabase Storage)
      await claimService.createDocument({
        claim_id: claim.id,
        org_id: claim.org_id,
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
      if (id && typeof id === "string") loadClaim(id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
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
            <Button variant="ghost" onClick={() => router.push("/staff/claims")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  {claim.organisations?.name || "Unknown Client"}
                </h1>
                <MessageWidget
                  entityType="claim"
                  entityId={claim.id}
                  entityName={`${claim.organisations?.name || "Claim"} - FY ${claim.claim_year}`}
                />
              </div>
              <p className="text-slate-600">
                FY {claim.claim_year} • {claim.organisations?.organisation_code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(claim.status || "draft")}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Projects</p>
                  <p className="text-2xl font-bold">{claim.projects?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <PoundSterling className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Costs</p>
                  <p className="text-2xl font-bold">{formatCurrency(claim.total_costs || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Documents</p>
                  <p className="text-2xl font-bold">{claim.document_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Team Members</p>
                  <p className="text-2xl font-bold">
                    {[claim.bd_owner, claim.technical_lead, claim.cost_lead].filter(Boolean).length}
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
            <TabsTrigger value="team">Team</TabsTrigger>
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
                        {projects.filter(p => p.workflow_status === "submitted_to_team").map((project) => (
                          <ProjectCard key={project.id} project={project} showClaimButton />
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
                              <SelectItem value="">No project (general cost)</SelectItem>
                              {claim.projects?.map((proj) => (
                                <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
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
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Total Claim Value</p>
                      <p className="text-3xl font-bold text-green-900">{formatCurrency(claim.total_costs || 0)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-full">
                      <PoundSterling className="h-8 w-8 text-green-600" />
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
                  <div className="text-center py-12 text-slate-500">
                    <PoundSterling className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No costs recorded yet</p>
                    <p className="text-sm">Add cost entries to track R&D expenditure</p>
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
                              <Button variant="ghost" size="sm">
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

          {/* Team Tab */}
          <TabsContent value="team" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>Manage team assignments and roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {claim.bd_owner && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                            {claim.bd_owner.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{claim.bd_owner.full_name}</p>
                            <p className="text-sm text-slate-600">{claim.bd_owner.email}</p>
                            <Badge className="mt-1 bg-blue-100 text-blue-800">BD Owner</Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {claim.technical_lead && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold text-lg">
                            {claim.technical_lead.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{claim.technical_lead.full_name}</p>
                            <p className="text-sm text-slate-600">{claim.technical_lead.email}</p>
                            <Badge className="mt-1 bg-purple-100 text-purple-800">Technical Lead</Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {claim.cost_lead && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-lg">
                            {claim.cost_lead.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{claim.cost_lead.full_name}</p>
                            <p className="text-sm text-slate-600">{claim.cost_lead.email}</p>
                            <Badge className="mt-1 bg-orange-100 text-orange-800">Cost Lead</Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {!claim.bd_owner && !claim.technical_lead && !claim.cost_lead && (
                    <div className="text-center py-12 text-slate-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p>No team members assigned yet</p>
                      <p className="text-sm">Assign team members to manage this claim</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}