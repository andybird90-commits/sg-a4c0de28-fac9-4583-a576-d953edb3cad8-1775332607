import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cifService, type CIFWithDetails } from "@/services/cifService";
import { MessageWidget } from "@/components/MessageWidget";
import { ArrowLeft, Save, Upload, FileText, XCircle, AlertTriangle, CheckCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

export default function CIFDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { profileWithOrg: profile, isStaff } = useApp();
  const { toast } = useToast();

  const [cif, setCif] = useState<CIFWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionType, setRejectionType] = useState<"send_back" | "archive" | "delete">("send_back");
  const [rejectToStage, setRejectToStage] = useState<"bdm_section" | "tech_feasibility" | "financial_section">("bdm_section");
  const [rejectionReason, setRejectionReason] = useState("");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // BDM Form State
  const [bdmBusinessBackground, setBdmBusinessBackground] = useState("");
  const [bdmProjectOverview, setBdmProjectOverview] = useState("");
  const [bdmContactName, setBdmContactName] = useState("");
  const [bdmContactPosition, setBdmContactPosition] = useState("");
  const [bdmContactEmail, setBdmContactEmail] = useState("");
  const [bdmContactPhone, setBdmContactPhone] = useState("");
  const [bdmRdThemes, setBdmRdThemes] = useState<string[]>([]);
  const [bdmExpFeasibilityDate, setBdmExpFeasibilityDate] = useState("");
  const [bdmHasClaimedBefore, setBdmHasClaimedBefore] = useState(false);
  const [bdmPrevClaimYearEnd, setBdmPrevClaimYearEnd] = useState("");
  const [bdmPrevClaimValue, setBdmPrevClaimValue] = useState("");

  // Technical Form State
  const [techUnderstanding, setTechUnderstanding] = useState("");
  const [techChallenges, setTechChallenges] = useState("");
  const [techActivities, setTechActivities] = useState("");
  const [techProjects, setTechProjects] = useState("");
  const [techStatus, setTechStatus] = useState<"qualified" | "not_qualified" | "needs_more_info">("needs_more_info");
  const [techClaimBand, setTechClaimBand] = useState<"0-25k" | "25k-50k" | "50k-100k" | "100k-250k" | "250k+">("0-25k");
  const [techRiskRating, setTechRiskRating] = useState<"low" | "medium" | "high">("low");
  const [techNotesForFinance, setTechNotesForFinance] = useState("");
  const [techMissingInfo, setTechMissingInfo] = useState("");

  // Financial Form State
  const [financialYear, setFinancialYear] = useState("");
  const [staffCost, setStaffCost] = useState("");
  const [subcontractorCost, setSubcontractorCost] = useState("");
  const [consumablesCost, setConsumablesCost] = useState("");
  const [softwareCost, setSoftwareCost] = useState("");
  const [apportionment, setApportionment] = useState("");
  const [accountantName, setAccountantName] = useState("");
  const [accountantFirm, setAccountantFirm] = useState("");
  const [accountantEmail, setAccountantEmail] = useState("");
  const [accountantPhone, setAccountantPhone] = useState("");
  const [readyToSubmit, setReadyToSubmit] = useState(false);

  // Document upload state
  const [uploadingLOA, setUploadingLOA] = useState(false);
  const [uploadingASS, setUploadingASS] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  // Add state for extracted feasibility analysis
  const [feasibilityExtract, setFeasibilityExtract] = useState<string>("");
  const [lastAccountsDate, setLastAccountsDate] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isStaff) {
      router.push("/home");
      return;
    }
    if (id && typeof id === "string") {
      fetchCIF(id);
      fetchDocuments(id);
    }
  }, [id, isStaff]);

  const fetchCIF = async (cifId: string) => {
    if (!cifId) return;

    setLoading(true);
    try {
      console.log("Fetching CIF:", cifId);
      const data = await cifService.getCIFById(cifId);
      
      if (!data) {
        router.push("/staff/cif");
        return;
      }

      setCif(data);
      console.log("CIF loaded:", data);

      // Populate BDM Form
      setBdmBusinessBackground(data.business_background || "");
      setBdmProjectOverview(data.project_overview || "");
      setBdmContactName(data.primary_contact_name || "");
      setBdmContactPosition(data.primary_contact_position || "");
      setBdmContactEmail(data.primary_contact_email || "");
      setBdmContactPhone(data.primary_contact_phone || "");
      setBdmRdThemes(data.rd_themes || []);
      setBdmExpFeasibilityDate(data.expected_feasibility_date || "");
      setBdmHasClaimedBefore(data.has_claimed_before || false);
      setBdmPrevClaimYearEnd(data.previous_claim_year_end_date || "");
      setBdmPrevClaimValue(data.previous_claim_value?.toString() || "");

      // Populate Technical Form
      setTechUnderstanding(data.technical_understanding || "");
    } catch (error) {
      console.error("Failed to load CIF:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (cifId: string) => {
    try {
      const { data: docs, error } = await supabase
        .from("cif_documents")
        .select("*, uploaded_by_profile:profiles!cif_documents_uploaded_by_fkey(full_name)")
        .eq("cif_id", cifId)
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        return;
      }

      setDocuments(docs || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleFileUpload = async (file: File, docType: "loa" | "anti_slavery") => {
    if (!cif || !profile?.id) return;

    const setUploading = docType === "loa" ? setUploadingLOA : setUploadingASS;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${cif.id}/${docType}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("cif-documents")
        .upload(fileName, file);

      if (uploadError) {
        toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
        console.error("Upload error:", uploadError);
        return;
      }

      const { error: dbError } = await supabase.from("cif_documents").insert({
        cif_id: cif.id,
        doc_type: docType,
        file_path: fileName,
        uploaded_by: profile.id,
        notes: file.name,
      });

      if (dbError) {
        toast({ title: "Error", description: "Failed to save document reference", variant: "destructive" });
        console.error("Database error:", dbError);
        await supabase.storage.from("cif-documents").remove([fileName]);
        return;
      }

      toast({ title: "Success", description: `${docType === "loa" ? "Letter of Authority" : "Anti-Slavery Statement"} uploaded` });
      fetchDocuments(cif.id);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, filePath: string) => {
    if (!cif) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("cif-documents")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      const { error: dbError } = await supabase
        .from("cif_documents")
        .delete()
        .eq("id", docId);

      if (dbError) {
        toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Document deleted" });
      fetchDocuments(cif.id);
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    }
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("cif-documents")
        .download(filePath);

      if (error || !data) {
        toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  };

  const handleCompleteBDM = async () => {
    if (!cif || !profile?.id) return;

    setSaving(true);
    try {
      const result = await cifService.completeBDMSection(
        cif.id,
        {
          business_background: bdmBusinessBackground,
          project_overview: bdmProjectOverview,
          primary_contact_name: bdmContactName,
          primary_contact_position: bdmContactPosition,
          primary_contact_email: bdmContactEmail,
          primary_contact_phone: bdmContactPhone,
          rd_themes: bdmRdThemes,
          expected_feasibility_date: bdmExpFeasibilityDate,
          has_claimed_before: bdmHasClaimedBefore,
          previous_claim_year_end_date: bdmPrevClaimYearEnd,
          previous_claim_value: bdmPrevClaimValue ? parseFloat(bdmPrevClaimValue) : undefined,
        },
        profile.id
      );

      if (result) {
        toast({ title: "Success", description: "BDM section completed" });
        fetchCIF(cif.id);
      } else {
        toast({ title: "Error", description: "Failed to complete BDM section", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save BDM section", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTechnical = async () => {
    if (!cif || !profile?.id) return;

    if (!techUnderstanding || !techStatus) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await cifService.completeTechnicalSection(
        cif.id,
        {
          technical_understanding: techUnderstanding,
          challenges_uncertainties: techChallenges,
          qualifying_activities: techActivities.split("\n").filter(a => a.trim()),
          rd_projects_list: techProjects.split("\n").filter(p => p.trim()),
          feasibility_status: techStatus,
          estimated_claim_band: techClaimBand || undefined,
          risk_rating: techRiskRating || undefined,
          notes_for_finance: techNotesForFinance,
          missing_information_flags: techMissingInfo.split("\n").filter(f => f.trim()),
        },
        profile.id
      );

      if (result) {
        toast({ title: "Success", description: "Technical section completed" });
        fetchCIF(cif.id);
      } else {
        toast({ title: "Error", description: "Failed to complete technical section", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save technical section", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteFinancial = async () => {
    if (!cif || !profile?.id) return;

    if (!financialYear || !accountantName || !accountantFirm) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await cifService.completeFinancialSection(
        cif.id,
        {
          financial_year: financialYear,
          staff_cost_estimate: staffCost ? parseFloat(staffCost) : undefined,
          subcontractor_estimate: subcontractorCost ? parseFloat(subcontractorCost) : undefined,
          consumables_estimate: consumablesCost ? parseFloat(consumablesCost) : undefined,
          software_estimate: softwareCost ? parseFloat(softwareCost) : undefined,
          apportionment_assumptions: apportionment,
          accountant_name: accountantName,
          accountant_firm: accountantFirm,
          accountant_email: accountantEmail,
          accountant_phone: accountantPhone,
          ready_to_submit: readyToSubmit,
        },
        profile.id
      );

      if (result) {
        toast({ title: "Success", description: "Financial section completed" });
        fetchCIF(cif.id);
      } else {
        toast({ title: "Error", description: "Failed to complete financial section", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save financial section", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveCIF = async () => {
    if (!cif || !profile?.id) return;

    setSaving(true);
    try {
      const result = await cifService.approveCIF(cif.id, profile.id);

      if (result) {
        toast({ 
          title: "Success", 
          description: `CIF approved and claim created for FY ${result.claim?.claim_year || 'Unknown'}`
        });
        router.push("/staff/cif");
      } else {
        toast({ title: "Error", description: "Failed to approve CIF", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve CIF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRejectCIF = async () => {
    if (!cif || !profile?.id) return;

    if (rejectionType === "send_back" && !rejectToStage) {
      toast({ title: "Error", description: "Please select a stage to send back to", variant: "destructive" });
      return;
    }

    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await cifService.rejectCIF(
        cif.id, 
        rejectionType,
        rejectionType === "send_back" ? rejectToStage : undefined,
        rejectionReason,
        profile.id
      );

      if (rejectionType === "delete" || result) {
        toast({ 
          title: "Success", 
          description: rejectionType === "delete" 
            ? "CIF deleted successfully" 
            : rejectionType === "archive"
            ? "CIF archived successfully"
            : `CIF sent back to ${rejectToStage.replace(/_/g, " ")}`
        });
        setShowRejectModal(false);
        router.push("/staff/cif");
      } else {
        toast({ title: "Error", description: "Failed to reject CIF", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject CIF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCIF = async () => {
    if (!cif || !profile?.id) return;

    setSaving(true);
    try {
      const result = await cifService.rejectCIF(
        cif.id,
        "delete",
        undefined,
        "Admin deletion",
        profile.id
      );

      toast({ 
        title: "Success", 
        description: "CIF deleted successfully"
      });
      setShowDeleteModal(false);
      router.push("/staff/cif");
    } catch (error) {
      console.error("Error deleting CIF:", error);
      toast({ title: "Error", description: "Failed to delete CIF", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (cif?.company_research) {
      try {
        console.log("Raw company_research:", cif.company_research);
        
        // Parse the JSON string
        const parsed = typeof cif.company_research === 'string' 
          ? JSON.parse(cif.company_research)
          : cif.company_research;
        
        console.log("Parsed research:", parsed);
        console.log("Available keys:", Object.keys(parsed));
        console.log("feasibility_summary:", parsed.feasibility_summary);
        
        // Extract the feasibility summary - handle both direct object and nested structure
        const summary = parsed.feasibility_summary || parsed.summary || "";
        
        if (summary) {
          console.log("✅ Found summary:", summary);
          setFeasibilityExtract(summary);
        } else {
          console.log("❌ No summary found in:", parsed);
          setFeasibilityExtract("");
        }
      } catch (error) {
        console.error("Error parsing company_research:", error);
        setFeasibilityExtract("");
      }
    } else {
      console.log("No company_research data available");
      setFeasibilityExtract("");
    }
  }, [cif?.company_research]);

  if (!isStaff || loading) {
    return (
      <StaffLayout>
        <div className="text-center py-12">Loading CIF...</div>
      </StaffLayout>
    );
  }

  if (!cif) {
    return (
      <StaffLayout>
        <div className="text-center py-12">CIF not found</div>
      </StaffLayout>
    );
  }

  const prospect = cif.prospects;
  const companyName = prospect?.company_name || "Unknown Company";
  const canEdit = cif.current_stage !== "approved" && cif.current_stage !== "rejected";

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/staff/cif")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{companyName}</h1>
                <MessageWidget
                  entityType="cif"
                  entityId={cif.id}
                  entityName={companyName}
                />
              </div>
              <p className="text-muted-foreground">
                {cif?.primary_contact_name} • {cif?.primary_contact_email}
              </p>
            </div>
          </div>
          {profile?.internal_role === "admin" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete CIF
            </Button>
          )}
        </div>

        <Tabs defaultValue="bdm" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bdm">BDM</TabsTrigger>
            <TabsTrigger value="feasibility">Feasibility</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* BDM Tab */}
          <TabsContent value="bdm" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Development</CardTitle>
                <CardDescription>
                  Initial capture of company information and R&D potential
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_name">Primary Contact Name</Label>
                    <Input
                      id="primary_contact_name"
                      value={bdmContactName}
                      onChange={(e) => setBdmContactName(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_position">Position</Label>
                    <Input
                      id="primary_contact_position"
                      value={bdmContactPosition}
                      onChange={(e) => setBdmContactPosition(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_email">Email</Label>
                    <Input
                      id="primary_contact_email"
                      type="email"
                      value={bdmContactEmail}
                      onChange={(e) => setBdmContactEmail(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_phone">Phone</Label>
                    <Input
                      id="primary_contact_phone"
                      value={bdmContactPhone}
                      onChange={(e) => setBdmContactPhone(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_background">Business Background</Label>
                  <Textarea
                    id="business_background"
                    placeholder="Describe what the business does..."
                    value={bdmBusinessBackground}
                    onChange={(e) => setBdmBusinessBackground(e.target.value)}
                    rows={3}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_overview">Project Overview</Label>
                  <Textarea
                    id="project_overview"
                    placeholder="Overview of R&D projects..."
                    value={bdmProjectOverview}
                    onChange={(e) => setBdmProjectOverview(e.target.value)}
                    rows={4}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expected_feasibility_date">Expected Feasibility Date</Label>
                    <Input
                      id="expected_feasibility_date"
                      type="date"
                      value={bdmExpFeasibilityDate}
                      onChange={(e) => setBdmExpFeasibilityDate(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="has_claimed_before"
                    checked={bdmHasClaimedBefore}
                    onCheckedChange={(checked) => setBdmHasClaimedBefore(checked as boolean)}
                    disabled={!canEdit}
                  />
                  <Label htmlFor="has_claimed_before">Has claimed R&D tax credits before?</Label>
                </div>

                {bdmHasClaimedBefore && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="prev_claim_year">Previous Claim Year End</Label>
                      <Input
                        id="prev_claim_year"
                        type="date"
                        value={bdmPrevClaimYearEnd}
                        onChange={(e) => setBdmPrevClaimYearEnd(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prev_claim_value">Previous Claim Value (£)</Label>
                      <Input
                        id="prev_claim_value"
                        type="number"
                        value={bdmPrevClaimValue}
                        onChange={(e) => setBdmPrevClaimValue(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                )}

                {canEdit && (cif.current_stage === "bdm_section" || isStaff) && (
                  <Button onClick={handleCompleteBDM} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Complete BDM Section"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feasibility Tab */}
          <TabsContent value="feasibility" className="space-y-6">
            {/* Last Accounts Filed Date */}
            {prospect?.last_accounts_date && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm">
                  <span className="font-semibold">Last Accounts Filed:</span>{" "}
                  {new Date(prospect.last_accounts_date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
            )}

            {/* AI Feasibility Analysis */}
            {(() => {
              try {
                if (!cif?.company_research) return null;
                
                let research: any = cif.company_research;
                // Parse if string and looks like JSON
                if (typeof research === "string") {
                  try {
                    if (research.trim().startsWith('{')) {
                      research = JSON.parse(research);
                    }
                  } catch (e) {
                    // Not JSON, treat as string
                  }
                }

                // Check if we have structured analysis data
                const hasStructuredData = research && typeof research === 'object' && (
                  research.feasibility_summary || 
                  research.estimated_claim_band ||
                  research.rd_indicators
                );

                if (!hasStructuredData && !feasibilityExtract) return null;

                return (
                  <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-purple-900 dark:text-purple-100">
                          RD Sidekick Feasibility Analysis
                        </CardTitle>
                      </div>
                      {(feasibilityExtract && feasibilityExtract.length > 300) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="text-purple-700 hover:text-purple-900 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show More
                            </>
                          )}
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className={!isExpanded && feasibilityExtract && feasibilityExtract.length > 300 ? "max-h-48 overflow-hidden relative" : ""}>
                      <CardDescription className="text-xs text-purple-600 mb-3">
                        AI-generated preliminary assessment
                      </CardDescription>
                      
                      {hasStructuredData ? (
                        <div className="space-y-4">
                          {/* Estimated Claim Band */}
                          {research.estimated_claim_band && (
                            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-lg border border-purple-200">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-purple-900 mb-1">Estimated Claim Range</p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700">
                                    £{research.estimated_claim_band}
                                  </Badge>
                                  {research.claim_rationale && (
                                    <p className="text-xs text-purple-700">{research.claim_rationale}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Feasibility Summary */}
                          {research.feasibility_summary && (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-purple-900 dark:text-purple-100 whitespace-pre-wrap">
                                {research.feasibility_summary}
                              </p>
                            </div>
                          )}

                          {/* R&D Indicators */}
                          {research.rd_indicators && Array.isArray(research.rd_indicators) && research.rd_indicators.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-purple-900">R&D Indicators:</p>
                              <ul className="space-y-1 ml-4">
                                {research.rd_indicators.map((indicator: string, idx: number) => (
                                  <li key={idx} className="text-sm text-purple-800 list-disc">{indicator}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Questions for Meeting */}
                          {research.key_questions && Array.isArray(research.key_questions) && research.key_questions.length > 0 && (
                            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-sm font-semibold text-blue-900">Key Questions for Feasibility Meeting:</p>
                              <ul className="space-y-1 ml-4">
                                {research.key_questions.map((question: string, idx: number) => (
                                  <li key={idx} className="text-sm text-blue-800 list-disc">{question}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Risk Flags */}
                          {research.risk_flags && Array.isArray(research.risk_flags) && research.risk_flags.length > 0 && (
                            <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <p className="text-sm font-semibold text-orange-900">Risk Flags:</p>
                              </div>
                              <ul className="space-y-1 ml-4">
                                {research.risk_flags.map((flag: string, idx: number) => (
                                  <li key={idx} className="text-sm text-orange-800 list-disc">{flag}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Prenotification Notice */}
                          {research.prenotification_required && (
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                              <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Prenotification Likely Required</p>
                              {research.prenotification_reason && (
                                <p className="text-xs text-yellow-800">{research.prenotification_reason}</p>
                              )}
                            </div>
                          )}

                          {/* Core Business & Technical Environment */}
                          {(research.core_business || research.technical_environment) && (
                            <div className="space-y-2 text-sm">
                              {research.core_business && (
                                <div>
                                  <span className="font-semibold text-purple-900">Core Business: </span>
                                  <span className="text-purple-800">{research.core_business}</span>
                                </div>
                              )}
                              {research.technical_environment && (
                                <div>
                                  <span className="font-semibold text-purple-900">Technical Environment: </span>
                                  <span className="text-purple-800">{research.technical_environment}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Fallback to plain text display if structured data not available
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <div className="whitespace-pre-wrap text-purple-900 dark:text-purple-100">
                            {isExpanded || !feasibilityExtract ? feasibilityExtract : `${feasibilityExtract.slice(0, 300)}...`}
                          </div>
                        </div>
                      )}
                      
                      {!isExpanded && feasibilityExtract && feasibilityExtract.length > 300 && !hasStructuredData && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent dark:from-slate-950/50" />
                      )}
                    </CardContent>
                  </Card>
                );
              } catch (error) {
                console.error("Error parsing company research:", error);
                return null;
              }
            })()}

            {/* Manual Feasibility Assessment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Feasibility Assessment</CardTitle>
                <CardDescription>
                  Evaluate the technical and commercial feasibility of the R&D claim
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="technical_understanding">
                    Technical Understanding *
                  </Label>
                  <Textarea
                    id="technical_understanding"
                    placeholder="Describe your understanding of the technical aspects..."
                    value={techUnderstanding}
                    onChange={(e) => setTechUnderstanding(e.target.value)}
                    disabled={!canEdit}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenges_uncertainties">Challenges & Uncertainties</Label>
                  <Textarea
                    id="challenges_uncertainties"
                    placeholder="Technical challenges and scientific uncertainties..."
                    value={techChallenges}
                    onChange={(e) => setTechChallenges(e.target.value)}
                    rows={3}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifying_activities">Qualifying Activities (one per line)</Label>
                  <Textarea
                    id="qualifying_activities"
                    placeholder="List qualifying R&D activities..."
                    value={techActivities}
                    onChange={(e) => setTechActivities(e.target.value)}
                    rows={3}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rd_projects_list">R&D Projects List (one per line)</Label>
                  <Textarea
                    id="rd_projects_list"
                    placeholder="List R&D projects..."
                    value={techProjects}
                    onChange={(e) => setTechProjects(e.target.value)}
                    rows={3}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="feasibility_status">Feasibility Status *</Label>
                    <Select value={techStatus} onValueChange={(v: any) => setTechStatus(v)} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="not_qualified">Not Qualified</SelectItem>
                        <SelectItem value="needs_more_info">Needs More Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_claim_band">Estimated Claim Band</Label>
                    <Select value={techClaimBand} onValueChange={(v: any) => setTechClaimBand(v)} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select band" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0-25k">£0-25k</SelectItem>
                        <SelectItem value="25k-50k">£25k-50k</SelectItem>
                        <SelectItem value="50k-100k">£50k-100k</SelectItem>
                        <SelectItem value="100k-250k">£100k-250k</SelectItem>
                        <SelectItem value="250k+">£250k+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="risk_rating">Risk Rating</Label>
                    <Select value={techRiskRating} onValueChange={(v: any) => setTechRiskRating(v)} disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes_for_finance">Notes for Finance Team</Label>
                  <Textarea
                    id="notes_for_finance"
                    placeholder="Additional notes or context for finance team..."
                    value={techNotesForFinance}
                    onChange={(e) => setTechNotesForFinance(e.target.value)}
                    rows={2}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="missing_information_flags">Missing Information Flags (one per line)</Label>
                  <Textarea
                    id="missing_information_flags"
                    placeholder="List any missing information..."
                    value={techMissingInfo}
                    onChange={(e) => setTechMissingInfo(e.target.value)}
                    rows={2}
                    disabled={!canEdit}
                  />
                </div>

                {canEdit && (cif.current_stage === "bdm_section" || cif.current_stage === "tech_feasibility") && (
                  <Button onClick={handleCompleteTechnical} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Complete Technical Section"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>
                  Cost estimates and financial details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="financial-year">Financial Year *</Label>
                  <Input
                    id="financial-year"
                    placeholder="e.g. YE 31-03-2024 or 2023/24"
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    disabled={!canEdit || cif.current_stage !== "financial_section"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-cost">Staff Cost Estimate (£)</Label>
                    <Input
                      id="staff-cost"
                      type="number"
                      placeholder="0.00"
                      value={staffCost}
                      onChange={(e) => setStaffCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcontractor-cost">Subcontractor Estimate (£)</Label>
                    <Input
                      id="subcontractor-cost"
                      type="number"
                      placeholder="0.00"
                      value={subcontractorCost}
                      onChange={(e) => setSubcontractorCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumables-cost">Consumables Estimate (£)</Label>
                    <Input
                      id="consumables-cost"
                      type="number"
                      placeholder="0.00"
                      value={consumablesCost}
                      onChange={(e) => setConsumablesCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="software-cost">Software Estimate (£)</Label>
                    <Input
                      id="software-cost"
                      type="number"
                      placeholder="0.00"
                      value={softwareCost}
                      onChange={(e) => setSoftwareCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apportionment">Apportionment Assumptions</Label>
                  <Textarea
                    id="apportionment"
                    placeholder="Describe cost allocation methodology..."
                    value={apportionment}
                    onChange={(e) => setApportionment(e.target.value)}
                    rows={3}
                    disabled={!canEdit || cif.current_stage !== "financial_section"}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Accountant Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountant-name">Accountant Name *</Label>
                      <Input
                        id="accountant-name"
                        placeholder="Accountant name"
                        value={accountantName}
                        onChange={(e) => setAccountantName(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-firm">Firm Name *</Label>
                      <Input
                        id="accountant-firm"
                        placeholder="Accounting firm"
                        value={accountantFirm}
                        onChange={(e) => setAccountantFirm(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-email">Email</Label>
                      <Input
                        id="accountant-email"
                        type="email"
                        placeholder="accountant@firm.com"
                        value={accountantEmail}
                        onChange={(e) => setAccountantEmail(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-phone">Phone</Label>
                      <Input
                        id="accountant-phone"
                        placeholder="+44 20 1234 5678"
                        value={accountantPhone}
                        onChange={(e) => setAccountantPhone(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Required Documents</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2">Letter of Authority</Label>
                      <input
                        type="file"
                        id="loa-upload"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "loa");
                        }}
                        className="hidden"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("loa-upload")?.click()}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLOA ? "Uploading..." : "Upload Letter of Authority"}
                      </Button>
                    </div>

                    <div>
                      <Label className="block mb-2">Anti-Slavery Statement</Label>
                      <input
                        type="file"
                        id="ass-upload"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "anti_slavery");
                        }}
                        className="hidden"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("ass-upload")?.click()}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingASS ? "Uploading..." : "Upload Anti-Slavery Statement"}
                      </Button>
                    </div>
                  </div>

                  {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold">Uploaded Documents</h4>
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {doc.doc_type === "loa" ? "Letter of Authority" : "Anti-Slavery Statement"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.notes} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc.file_path, doc.notes)}
                            >
                              Download
                            </Button>
                            {canEdit && cif.current_stage === "financial_section" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ready-submit"
                    checked={readyToSubmit}
                    onCheckedChange={(checked) => setReadyToSubmit(checked as boolean)}
                    disabled={!canEdit || cif.current_stage !== "financial_section"}
                  />
                  <Label htmlFor="ready-submit" className="cursor-pointer">
                    Ready to submit to admin for approval
                  </Label>
                </div>

                {canEdit && cif.current_stage === "financial_section" && (
                  <Button onClick={handleCompleteFinancial} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Complete Financial Section"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Review & Approval</CardTitle>
                <CardDescription>Final review and claim creation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {cif.rejection_reason && !cif.rejection_reason.includes("[ARCHIVED]") && cif.current_stage !== "approved" && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-orange-900">Previous Rejection</p>
                        <p className="text-sm text-orange-700 mt-1">
                          {cif.rejection_reason.replace("[SENT_BACK]", "").trim()}
                        </p>
                        {cif.rejected_at && (
                          <p className="text-xs text-orange-600 mt-1">
                            Rejected on {new Date(cif.rejected_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">BDM Section</p>
                    <p className="text-sm text-muted-foreground">Business development completed</p>
                    {cif.created_by_profile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {cif.created_by_profile.full_name || cif.created_by_profile.email}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Technical Feasibility</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {cif.feasibility_status || "Pending"}
                    </p>
                  </div>
                  {cif.feasibility_status === "qualified" ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Financial Section</p>
                    <p className="text-sm text-muted-foreground">
                      Ready: {cif.ready_to_submit ? "Yes" : "No"}
                    </p>
                  </div>
                  {cif.ready_to_submit ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-orange-500" />
                  )}
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Required Documents</p>
                    <p className="text-sm text-muted-foreground">
                      {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
                    </p>
                  </div>
                  {documents.length >= 2 ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-orange-500" />
                  )}
                </div>

                <Separator />

                {cif.current_stage === "admin_approval" && (
                  <div className="flex gap-3">
                    <Button onClick={handleApproveCIF} disabled={saving} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {saving ? "Approving..." : "Approve & Create Claim"}
                    </Button>
                    <Button 
                      onClick={() => setShowRejectModal(true)} 
                      disabled={saving} 
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {cif.current_stage === "approved" && cif.linked_claim_id && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-900">CIF Approved</p>
                    <p className="text-sm text-green-700">
                      Claim has been created and linked to this CIF
                    </p>
                  </div>
                )}

                {cif.current_stage === "rejected" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-900">CIF Rejected</p>
                    <p className="text-sm text-red-700">
                      This CIF did not meet approval criteria
                    </p>
                  </div>
                )}

                <AlertDialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                  <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject CIF</AlertDialogTitle>
                      <AlertDialogDescription>
                        Choose how to handle this rejection. All actions require a reason.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Rejection Type</Label>
                        <Select 
                          value={rejectionType} 
                          onValueChange={(v: "send_back" | "archive" | "delete") => setRejectionType(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_back">Send Back to Stage (for revision)</SelectItem>
                            <SelectItem value="archive">Archive (may return later)</SelectItem>
                            <SelectItem value="delete">Delete Permanently</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {rejectionType === "send_back" && (
                        <div className="space-y-2">
                          <Label>Send Back To</Label>
                          <Select 
                            value={rejectToStage} 
                            onValueChange={(v: "bdm_section" | "tech_feasibility" | "financial_section") => setRejectToStage(v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bdm_section">BDM Section</SelectItem>
                              <SelectItem value="tech_feasibility">Technical Feasibility</SelectItem>
                              <SelectItem value="financial_section">Financial Section</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            The responsible staff member will be notified to revise this section.
                          </p>
                        </div>
                      )}

                      {rejectionType === "archive" && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <strong>Archive:</strong> The CIF will be moved to the archive. You can reactivate it later if the prospect returns.
                          </p>
                        </div>
                      )}

                      {rejectionType === "delete" && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-900">
                            <strong>Warning:</strong> This action cannot be undone. The CIF and all associated data will be permanently deleted.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Reason for Rejection *</Label>
                        <Textarea
                          placeholder="Provide detailed feedback..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                        />
                      </div>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => {
                        setShowRejectModal(false);
                        setRejectionReason("");
                        setRejectionType("send_back");
                      }}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRejectCIF}
                        disabled={saving || !rejectionReason.trim()}
                        className={rejectionType === "delete" ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        {saving ? "Processing..." : 
                          rejectionType === "delete" ? "Delete Permanently" :
                          rejectionType === "archive"
                          ? "Archive CIF"
                          : "Send Back"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete CIF Permanently?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the CIF record
                        for <strong>{companyName}</strong> and remove all associated data from the database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setShowDeleteModal(false)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteCIF}
                        disabled={saving}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {saving ? "Deleting..." : "Delete Permanently"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}