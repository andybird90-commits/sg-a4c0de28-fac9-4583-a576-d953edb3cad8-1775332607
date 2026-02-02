import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
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
} from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function ClaimDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const { user: profile } = useApp();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Project management state
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    rd_theme: "Engineering",
  });

  // Cost management state
  const [showCostDialog, setShowCostDialog] = useState(false);
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

  useEffect(() => {
    if (id && typeof id === "string") {
      loadClaim(id);
    }
  }, [id]);

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

  const handleCreateProject = async () => {
    if (!claim || !profile) return;

    try {
      await claimService.createProject({
        claim_id: claim.id,
        org_id: claim.org_id, // Pass org_id explicitly
        name: projectForm.name,
        description: projectForm.description,
        start_date: projectForm.start_date || null,
        end_date: projectForm.end_date || null,
        rd_theme: projectForm.rd_theme, // Use rd_theme
        created_by: profile.id,
      });

      toast({ title: "Success", description: "Project created successfully" });
      setShowProjectDialog(false);
      setProjectForm({ name: "", description: "", start_date: "", end_date: "", rd_theme: "Engineering" });
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
        rd_theme: projectForm.rd_theme,
      });

      toast({ title: "Success", description: "Project updated successfully" });
      setShowProjectDialog(false);
      setEditingProject(null);
      setProjectForm({ name: "", description: "", start_date: "", end_date: "", rd_theme: "Engineering" });
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
        org_id: claim.org_id, // Pass org_id
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
        org_id: claim.org_id, // Pass org_id
        doc_type: documentType as any,
        title: selectedFile.name, // Add title
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
              <h1 className="text-3xl font-bold text-slate-900">
                {claim.organisations?.name || "Unknown Client"}
              </h1>
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
          <TabsContent value="projects" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>R&D Projects</CardTitle>
                    <CardDescription>Manage the R&D projects included in this claim</CardDescription>
                  </div>
                  <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingProject(null);
                        setProjectForm({ name: "", description: "", start_date: "", end_date: "", rd_theme: "Engineering" });
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingProject ? "Edit Project" : "Add New Project"}</DialogTitle>
                        <DialogDescription>
                          Provide details about the R&D project for this claim
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="project-name">Project Name *</Label>
                          <Input
                            id="project-name"
                            value={projectForm.name}
                            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                            placeholder="e.g., AI-Powered Quality Control System"
                          />
                        </div>
                        <div>
                          <Label htmlFor="project-description">Description *</Label>
                          <Textarea
                            id="project-description"
                            value={projectForm.description}
                            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                            placeholder="Describe the R&D activities, challenges, and uncertainties..."
                            rows={4}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input
                              id="start-date"
                              type="date"
                              value={projectForm.start_date}
                              onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="end-date">End Date</Label>
                            <Input
                              id="end-date"
                              type="date"
                              value={projectForm.end_date}
                              onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="rd-theme">R&D Theme</Label>
                          <Input
                            id="rd-theme"
                            value={projectForm.rd_theme}
                            onChange={(e) => setProjectForm({ ...projectForm, rd_theme: e.target.value })}
                            placeholder="e.g. Engineering, Software, Science"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={editingProject ? handleUpdateProject : handleCreateProject}>
                          {editingProject ? "Update Project" : "Create Project"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {claim.projects && claim.projects.length > 0 ? (
                  <div className="space-y-4">
                    {claim.projects.map((project) => (
                      <Card key={project.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                              <p className="text-slate-600 mb-3">{project.description}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                {project.start_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {format(new Date(project.start_date), "MMM yyyy")} - 
                                    {project.end_date ? format(new Date(project.end_date), "MMM yyyy") : "Present"}
                                  </span>
                                )}
                                {project.rd_theme && (
                                  <Badge variant="outline">{project.rd_theme}</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingProject(project);
                                  setProjectForm({
                                    name: project.name || "",
                                    description: project.description || "",
                                    start_date: project.start_date || "",
                                    end_date: project.end_date || "",
                                    rd_theme: project.rd_theme || "Engineering",
                                  });
                                  setShowProjectDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No projects added yet</p>
                    <p className="text-sm">Add your first R&D project to get started</p>
                  </div>
                )}
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
                        <Plus className="mr-2 h-4 w-4" />
                        Add Cost
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Cost Entry</DialogTitle>
                        <DialogDescription>Record a new R&D cost entry</DialogDescription>
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
                            <Label htmlFor="cost-date">Date *</Label>
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
                        <Button onClick={handleCreateCost}>Add Cost</Button>
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

                <p className="text-sm text-slate-500 mb-4">Cost tracking will be displayed here. Feature coming soon.</p>
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
                <p className="text-sm text-slate-500">Evidence management will be displayed here. Feature coming soon.</p>
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
                <p className="text-sm text-slate-500">Team management features coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}