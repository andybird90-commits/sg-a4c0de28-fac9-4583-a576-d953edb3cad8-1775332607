import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, CheckCircle, XCircle, Upload, FileText, AlertTriangle } from "lucide-react";
import { cifService, type CIFWithDetails } from "@/services/cifService";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
    setLoading(true);
    try {
      const data = await cifService.getCIFById(cifId);
      if (data) {
        setCif(data);
        // Pre-populate form fields if data exists
        setTechUnderstanding(data.technical_understanding || "");
        setTechChallenges(data.challenges_uncertainties || "");
        setTechActivities(data.qualifying_activities?.join("\n") || "");
        setTechProjects(data.rd_projects_list?.join("\n") || "");
        if (data.feasibility_status) setTechStatus(data.feasibility_status);
        if (data.estimated_claim_band) setTechClaimBand(data.estimated_claim_band);
        if (data.risk_rating) setTechRiskRating(data.risk_rating);
        setTechNotesForFinance(data.notes_for_finance || "");
        setTechMissingInfo(data.missing_information_flags?.join("\n") || "");

        setFinancialYear(data.financial_year || "");
        setStaffCost(data.staff_cost_estimate?.toString() || "");
        setSubcontractorCost(data.subcontractor_estimate?.toString() || "");
        setConsumablesCost(data.consumables_estimate?.toString() || "");
        setSoftwareCost(data.software_estimate?.toString() || "");
        setApportionment(data.apportionment_assumptions || "");
        setAccountantName(data.accountant_name || "");
        setAccountantFirm(data.accountant_firm || "");
        setAccountantEmail(data.accountant_email || "");
        setAccountantPhone(data.accountant_phone || "");
        setReadyToSubmit(data.ready_to_submit || false);
      } else {
        toast({ title: "Error", description: "CIF not found", variant: "destructive" });
        router.push("/staff/cif");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load CIF", variant: "destructive" });
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
      // Upload file to Supabase Storage
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

      // Save document reference in database
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
        // Clean up uploaded file
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("cif-documents")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
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

      // Create download link
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
          description: `CIF approved and claim created: ${result.claim.title}` 
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

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/staff/cif")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to CIF Pipeline
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{companyName}</h1>
            <p className="text-muted-foreground mt-1">
              CIF #{cif.id.slice(0, 8)} • FY: {cif.financial_year || "Not specified"}
            </p>
          </div>
          <Badge className="text-base px-4 py-2">
            {cif.current_stage?.replace(/_/g, " ").toUpperCase()}
          </Badge>
        </div>

        {prospect && (
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-semibold">Company Number:</span> {prospect.company_number}
              </div>
              <div>
                <span className="font-semibold">Status:</span> {prospect.status}
              </div>
              <div className="col-span-2">
                <span className="font-semibold">Registered Name:</span> {(prospect as any).registered_name || prospect.company_name}
              </div>
              {prospect.incorporation_date && (
                <div>
                  <span className="font-semibold">Incorporated:</span>{" "}
                  {new Date(prospect.incorporation_date).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="bdm" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bdm">BDM Section</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="bdm" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>BDM Section A</CardTitle>
                <CardDescription>Initial business development information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-semibold">Business Background</Label>
                  <p className="text-sm mt-1">{cif.business_background || "Not provided"}</p>
                </div>
                <Separator />
                <div>
                  <Label className="font-semibold">Project Overview</Label>
                  <p className="text-sm mt-1">{cif.project_overview || "Not provided"}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Primary Contact</Label>
                    <p className="text-sm mt-1">{cif.primary_contact_name || "Not provided"}</p>
                    <p className="text-sm text-muted-foreground">{cif.primary_contact_email}</p>
                    <p className="text-sm text-muted-foreground">{cif.primary_contact_phone}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">R&D Themes</Label>
                    <ul className="text-sm mt-1 list-disc list-inside">
                      {cif.rd_themes?.map((theme, idx) => (
                        <li key={idx}>{theme}</li>
                      )) || <li>Not provided</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Technical Feasibility Assessment</CardTitle>
                <CardDescription>Complete technical review and feasibility determination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tech-understanding">Technical Understanding *</Label>
                  <Textarea
                    id="tech-understanding"
                    placeholder="Describe the technical work and R&D activities..."
                    value={techUnderstanding}
                    onChange={(e) => setTechUnderstanding(e.target.value)}
                    rows={4}
                    disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tech-challenges">Challenges & Uncertainties</Label>
                  <Textarea
                    id="tech-challenges"
                    placeholder="Technical challenges and scientific uncertainties..."
                    value={techChallenges}
                    onChange={(e) => setTechChallenges(e.target.value)}
                    rows={3}
                    disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tech-activities">Qualifying Activities (one per line)</Label>
                  <Textarea
                    id="tech-activities"
                    placeholder="List qualifying R&D activities..."
                    value={techActivities}
                    onChange={(e) => setTechActivities(e.target.value)}
                    rows={3}
                    disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tech-projects">R&D Projects List (one per line)</Label>
                  <Textarea
                    id="tech-projects"
                    placeholder="List R&D projects..."
                    value={techProjects}
                    onChange={(e) => setTechProjects(e.target.value)}
                    rows={3}
                    disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tech-status">Feasibility Status *</Label>
                    <Select value={techStatus} onValueChange={(v: "qualified" | "not_qualified" | "needs_more_info") => setTechStatus(v)} disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}>
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
                    <Label htmlFor="tech-claim-band">Estimated Claim Band</Label>
                    <Select value={techClaimBand} onValueChange={(v: any) => setTechClaimBand(v)} disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}>
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
                    <Label htmlFor="tech-risk">Risk Rating</Label>
                    <Select value={techRiskRating} onValueChange={(v: any) => setTechRiskRating(v)} disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}>
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
                  <Label htmlFor="tech-notes">Notes for Finance Team</Label>
                  <Textarea
                    id="tech-notes"
                    placeholder="Additional notes or context for finance team..."
                    value={techNotesForFinance}
                    onChange={(e) => setTechNotesForFinance(e.target.value)}
                    rows={2}
                    disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tech-missing">Missing Information Flags (one per line)</Label>
                  <Textarea
                    id="tech-missing"
                    placeholder="List any missing information..."
                    value={techMissingInfo}
                    onChange={(e) => setTechMissingInfo(e.target.value)}
                    rows={2}
                    disabled={cif.current_stage !== "bdm_section" && cif.current_stage !== "tech_feasibility"}
                  />
                </div>

                {(cif.current_stage === "bdm_section" || cif.current_stage === "tech_feasibility") && (
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
                <CardTitle>Financial Section</CardTitle>
                <CardDescription>Complete financial estimates and compliance documentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="financial-year">Financial Year *</Label>
                  <Input
                    id="financial-year"
                    placeholder="e.g. YE 31-03-2024 or 2023/24"
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    disabled={cif.current_stage !== "financial_section"}
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
                      disabled={cif.current_stage !== "financial_section"}
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
                      disabled={cif.current_stage !== "financial_section"}
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
                      disabled={cif.current_stage !== "financial_section"}
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
                      disabled={cif.current_stage !== "financial_section"}
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
                    disabled={cif.current_stage !== "financial_section"}
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
                        disabled={cif.current_stage !== "financial_section"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-firm">Firm Name *</Label>
                      <Input
                        id="accountant-firm"
                        placeholder="Accounting firm"
                        value={accountantFirm}
                        onChange={(e) => setAccountantFirm(e.target.value)}
                        disabled={cif.current_stage !== "financial_section"}
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
                        disabled={cif.current_stage !== "financial_section"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-phone">Phone</Label>
                      <Input
                        id="accountant-phone"
                        placeholder="+44 20 1234 5678"
                        value={accountantPhone}
                        onChange={(e) => setAccountantPhone(e.target.value)}
                        disabled={cif.current_stage !== "financial_section"}
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
                        disabled={cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("loa-upload")?.click()}
                        disabled={cif.current_stage !== "financial_section" || uploadingLOA}
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
                        disabled={cif.current_stage !== "financial_section" || uploadingASS}
                      />
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("ass-upload")?.click()}
                        disabled={cif.current_stage !== "financial_section" || uploadingASS}
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
                            {cif.current_stage === "financial_section" && (
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
                    disabled={cif.current_stage !== "financial_section"}
                  />
                  <Label htmlFor="ready-submit" className="cursor-pointer">
                    Ready to submit to admin for approval
                  </Label>
                </div>

                {cif.current_stage === "financial_section" && (
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
                
                {cif.rejection_reason && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-orange-900">Previous Rejection</p>
                        <p className="text-sm text-orange-700 mt-1">{cif.rejection_reason}</p>
                        {cif.rejected_at && (
                          <p className="text-xs text-orange-600 mt-1">
                            Rejected on {new Date(cif.rejected_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
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

                {/* Rejection Modal */}
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
                              <SelectItem value="bdm_section">Job Board A (BDM Section)</SelectItem>
                              <SelectItem value="tech_feasibility">Job Board B (Technical Feasibility)</SelectItem>
                              <SelectItem value="financial_section">Job Board C (Financial Section)</SelectItem>
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
                          rejectionType === "archive" ? "Archive CIF" :
                          "Send Back"}
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