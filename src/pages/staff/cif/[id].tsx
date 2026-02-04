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
import { ArrowLeft, Save, Upload, FileText, XCircle, AlertTriangle, CheckCircle, Sparkles, ChevronDown, ChevronUp, Zap } from "lucide-react";

export default function CIFDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { profileWithOrg: profile, isStaff } = useApp();
  const { toast } = useToast();

  const [cif, setCif] = useState<CIFWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("bdm");

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

  // Add state for full feasibility analysis data
  const [companyResearch, setCompanyResearch] = useState<string>("");
  const [aiResearchData, setAiResearchData] = useState<any>(null);
  const [feasibilityAnalysis, setFeasibilityAnalysis] = useState<any>(null);

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
      const { data, error } = await supabase.
      from("cif_records").
      select("*").
      eq("id", cifId).
      single();

      console.log("🔍 CIF Data fetched:", data);

      if (error) throw error;
      if (!data) throw new Error("CIF not found");

      setCif(data);

      // Fetch linked feasibility analysis if it exists
      if (data.section2_feasibility_id) {
        try {
          const { data: feasData, error: feasError } = await supabase.
          from("feasibility_analyses").
          select("*").
          eq("id", data.section2_feasibility_id).
          single();

          if (feasError) {
            console.error("Error loading feasibility analysis:", feasError);
          } else if (feasData) {
            setFeasibilityAnalysis(feasData);

            // Populate Technical Form from feasibility analysis
            const feasDataAny = feasData as any;
            setTechUnderstanding(feasDataAny.technical_understanding || "");
            setTechChallenges(Array.isArray(feasDataAny.challenges_uncertainties) ?
            feasDataAny.challenges_uncertainties.join("\n") :
            feasDataAny.challenges_uncertainties || "");

            const activities = feasDataAny.qualifying_activities;
            setTechActivities(Array.isArray(activities) ? activities.join("\n") : "");

            const projects = feasDataAny.rd_projects_list;
            setTechProjects(Array.isArray(projects) ? projects.join("\n") : "");

            const status = feasDataAny.feasibility_status || "needs_more_info";
            if (status === "qualified" || status === "not_qualified" || status === "needs_more_info") {
              setTechStatus(status);
            }

            const claimBand = feasDataAny.estimated_claim_band || "0-25k";
            if (claimBand === "0-25k" || claimBand === "25k-50k" || claimBand === "50k-100k" || claimBand === "100k-250k" || claimBand === "250k+") {
              setTechClaimBand(claimBand);
            }

            const riskRating = feasDataAny.risk_rating || "low";
            if (riskRating === "low" || riskRating === "medium" || riskRating === "high") {
              setTechRiskRating(riskRating);
            }

            setTechNotesForFinance(feasDataAny.notes_for_finance || "");

            const missingInfo = feasDataAny.missing_information_flags;
            setTechMissingInfo(Array.isArray(missingInfo) ? missingInfo.join("\n") : "");
          }
        } catch (error) {
          console.error("Error loading feasibility analysis:", error);
        }
      }

      // Populate BDM Form
      setBdmContactName(data.primary_contact_name || "");
      setBdmContactPosition(data.primary_contact_position || "");
      setBdmContactEmail(data.primary_contact_email || "");
      setBdmContactPhone(data.primary_contact_phone || "");
      setBdmBusinessBackground(data.business_background || "");
      setBdmProjectOverview(data.project_overview || "");
      setBdmExpFeasibilityDate(data.expected_feasibility_date || "");
      setBdmHasClaimedBefore(data.has_claimed_before || false);
      setBdmPrevClaimYearEnd(data.previous_claim_year_end_date || "");
      setBdmPrevClaimValue(data.previous_claim_value?.toString() || "");

      // Extract AI research data from ai_research_data JSONB field
      let mergedResearch = data.ai_research_data || {};

      // Merge with company_research if available (fallback/legacy data)
      if (data.company_research) {
        try {
          const research = typeof data.company_research === 'string' ?
          JSON.parse(data.company_research) :
          data.company_research;

          console.log("🔄 Merging company_research into aiResearchData", research);

          // Smart merge: Only overwrite if new data exists and is not empty
          const hasData = (val: any) => {
            if (val === null || val === undefined) return false;
            if (Array.isArray(val) && val.length === 0) return false;
            if (typeof val === 'object' && Object.keys(val).length === 0) return false;
            if (typeof val === 'string' && val.trim() === '') return false;
            return true;
          };

          // Base object from legacy research
          const base: any = { ...research };
          const mergedAny = mergedResearch as any;

          // Overlay new data only where it has content
          Object.keys(mergedAny).forEach((key) => {
            if (hasData(mergedAny[key])) {
              // Special handling for nested objects
              if (key === 'feasibility' && base.feasibility) {
                base.feasibility = { ...base.feasibility, ...mergedAny.feasibility };
              } else if (key === 'trading_history' && base.trading_history) {
                base.trading_history = { ...base.trading_history, ...mergedAny.trading_history };
              } else {
                base[key] = mergedAny[key];
              }
            }
          });

          mergedResearch = base;

        } catch (e) {
          console.error("Error parsing company_research for merge:", e);
        }
      }

      console.log("✅ Final Merged AI Data:", mergedResearch);
      setAiResearchData(mergedResearch);

      // Fallback to company_research plain text
      if (data.company_research) {
        setCompanyResearch(data.company_research);
      }

      // Populate Financial Form
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

      // Populate extracted feasibility analysis
      try {
        if (data.company_research) {
          const research = typeof data.company_research === 'string' ?
          JSON.parse(data.company_research) :
          data.company_research;

          const summary = research.feasibility_summary || research.summary || "";
          setFeasibilityExtract(summary);
        }
      } catch (error) {
        console.error("Error parsing company_research:", error);
        setFeasibilityExtract("");
      }
    } catch (error) {
      console.error("Error loading CIF:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async (cifId: string) => {
    try {
      const { data: docs, error } = await supabase.
      from("cif_documents").
      select("*, uploaded_by_profile:profiles!cif_documents_uploaded_by_fkey(full_name)").
      eq("cif_id", cifId).
      order("uploaded_at", { ascending: false });

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
      const { error: uploadError } = await supabase.storage.
      from("cif-documents").
      upload(fileName, file);

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
        notes: file.name
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
      const { error: storageError } = await supabase.storage.
      from("cif-documents").
      remove([filePath]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      const { error: dbError } = await supabase.
      from("cif_documents").
      delete().
      eq("id", docId);

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
      const { data, error } = await supabase.storage.
      from("cif-documents").
      download(filePath);

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
          expected_feasibility_date: bdmExpFeasibilityDate || undefined,
          has_claimed_before: bdmHasClaimedBefore,
          previous_claim_year_end_date: bdmPrevClaimYearEnd || undefined,
          previous_claim_value: bdmPrevClaimValue ? parseFloat(bdmPrevClaimValue) : undefined
        },
        profile.id
      );

      if (result) {
        toast({
          title: "Success",
          description: "BDM section completed successfully. Moving to Feasibility Assessment."
        });
        await fetchCIF(cif.id);
        setActiveTab("feasibility");
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
          qualifying_activities: techActivities.split("\n").filter((a) => a.trim()),
          rd_projects_list: techProjects.split("\n").filter((p) => p.trim()),
          feasibility_status: techStatus,
          estimated_claim_band: techClaimBand || undefined,
          risk_rating: techRiskRating || undefined,
          notes_for_finance: techNotesForFinance,
          missing_information_flags: techMissingInfo.split("\n").filter((f) => f.trim())
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
          ready_to_submit: readyToSubmit
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
          description: rejectionType === "delete" ?
          "CIF deleted successfully" :
          rejectionType === "archive" ?
          "CIF archived successfully" :
          `CIF sent back to ${rejectToStage.replace(/_/g, " ")}`
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

  if (!isStaff || loading) {
    return (
      <StaffLayout>
        <div className="text-center py-12">Loading CIF...</div>
      </StaffLayout>);
  }

  if (!cif) {
    return (
      <StaffLayout>
        <div className="text-center py-12">CIF not found</div>
      </StaffLayout>);
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
                  entityName={companyName} />
              </div>
              <p className="text-muted-foreground">
                {cif?.primary_contact_name} • {cif?.primary_contact_email}
              </p>
            </div>
          </div>
          {profile?.internal_role === "admin" &&
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="z-50">
              <XCircle className="h-4 w-4 mr-2" />
              Delete CIF
            </Button>
          }
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bdm">BDM</TabsTrigger>
            <TabsTrigger value="feasibility">Feasibility</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>

          {/* BDM Tab */}
          <TabsContent value="bdm" className="space-y-6">
            
            {/* AI Business Intelligence Card */}
            {aiResearchData && (
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    RD Sidekick Business Intelligence
                  </CardTitle>
                  <CardDescription>AI-powered company analysis and R&D potential assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Core Business */}
                  {aiResearchData.core_business && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Core Business</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{aiResearchData.core_business}</p>
                    </div>
                  )}

                  {/* Technical Environment */}
                  {aiResearchData.technical_environment && (
                    <div className="pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                      <h4 className="font-semibold text-sm mb-2">Technical Environment</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{aiResearchData.technical_environment}</p>
                    </div>
                  )}

                  {/* R&D Indicators */}
                  {aiResearchData.rd_indicators && Array.isArray(aiResearchData.rd_indicators) && aiResearchData.rd_indicators.length > 0 && (
                    <div className="pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                      <h4 className="font-semibold text-sm mb-2">R&D Indicators</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {aiResearchData.rd_indicators.map((indicator: string, idx: number) => (
                          <li key={idx}>{indicator}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Questions */}
                  {aiResearchData.key_questions && Array.isArray(aiResearchData.key_questions) && aiResearchData.key_questions.length > 0 && (
                    <div className="pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                      <h4 className="font-semibold text-sm mb-2">Key Questions for Feasibility Meeting</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {aiResearchData.key_questions.map((question: string, idx: number) => (
                          <li key={idx}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk Flags */}
                  {aiResearchData.risk_flags && Array.isArray(aiResearchData.risk_flags) && aiResearchData.risk_flags.length > 0 && (
                    <div className="pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
                      <h4 className="font-semibold text-sm mb-2 text-orange-700 dark:text-orange-300">Risk Flags</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-orange-700 dark:text-orange-300">
                        {aiResearchData.risk_flags.map((flag: string, idx: number) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                      disabled={!canEdit} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_position">Position</Label>
                    <Input
                      id="primary_contact_position"
                      value={bdmContactPosition}
                      onChange={(e) => setBdmContactPosition(e.target.value)}
                      disabled={!canEdit} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_email">Email</Label>
                    <Input
                      id="primary_contact_email"
                      type="email"
                      value={bdmContactEmail}
                      onChange={(e) => setBdmContactEmail(e.target.value)}
                      disabled={!canEdit} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_phone">Phone</Label>
                    <Input
                      id="primary_contact_phone"
                      value={bdmContactPhone}
                      onChange={(e) => setBdmContactPhone(e.target.value)}
                      disabled={!canEdit} />
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
                    disabled={!canEdit} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_overview">Project Overview</Label>
                  <Textarea
                    id="project_overview"
                    placeholder="Overview of R&D projects..."
                    value={bdmProjectOverview}
                    onChange={(e) => setBdmProjectOverview(e.target.value)}
                    rows={4}
                    disabled={!canEdit} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expected_feasibility_date">Expected Feasibility Date</Label>
                    <Input
                      id="expected_feasibility_date"
                      type="date"
                      value={bdmExpFeasibilityDate}
                      onChange={(e) => setBdmExpFeasibilityDate(e.target.value)}
                      disabled={!canEdit} />
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Checkbox
                    id="has_claimed_before"
                    checked={bdmHasClaimedBefore}
                    onCheckedChange={(checked) => setBdmHasClaimedBefore(checked as boolean)}
                    disabled={!canEdit} />

                  <Label htmlFor="has_claimed_before">Has claimed R&D tax credits before?</Label>
                </div>

                {bdmHasClaimedBefore &&
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="prev_claim_year">Previous Claim Year End</Label>
                      <Input
                      id="prev_claim_year"
                      type="date"
                      value={bdmPrevClaimYearEnd}
                      onChange={(e) => setBdmPrevClaimYearEnd(e.target.value)}
                      disabled={!canEdit} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prev_claim_value">Previous Claim Value (£)</Label>
                      <Input
                      id="prev_claim_value"
                      type="number"
                      value={bdmPrevClaimValue}
                      onChange={(e) => setBdmPrevClaimValue(e.target.value)}
                      disabled={!canEdit} />
                    </div>
                  </div>
                }

                {canEdit && (cif.current_stage === "bdm_section" || isStaff) &&
                <Button onClick={handleCompleteBDM} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Complete BDM Section"}
                  </Button>
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feasibility Tab */}
          <TabsContent value="feasibility" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Feasibility Assessment</h2>
                <p className="text-muted-foreground">
                  Evaluate the technical and commercial feasibility of the R&D claim
                </p>
              </div>
            </div>

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
            {aiResearchData?.feasibility && (
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Zap className="h-5 w-5" />
                    RD Sidekick Feasibility Analysis
                  </CardTitle>
                  <CardDescription>
                    AI-powered R&D potential and technical assessment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Feasibility Summary */}
                  {aiResearchData.feasibility_summary && (
                    <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Feasibility Summary</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {aiResearchData.feasibility_summary}
                      </p>
                    </div>
                  )}

                  {/* Claim Band & Rationale */}
                  <div className="grid grid-cols-2 gap-4">
                    {aiResearchData.estimated_claim_band && (
                      <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">Estimated Claim Band</h4>
                        <Badge variant="secondary" className="text-base">{aiResearchData.estimated_claim_band}</Badge>
                      </div>
                    )}
                    {aiResearchData.previous_claims_likelihood && (
                      <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">Previous Claims Likelihood</h4>
                        <Badge variant={
                          aiResearchData.previous_claims_likelihood === 'high' ? 'default' :
                          aiResearchData.previous_claims_likelihood === 'medium' ? 'secondary' : 'outline'
                        }>
                          {aiResearchData.previous_claims_likelihood}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {aiResearchData.claim_rationale && (
                    <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Claim Rationale</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {aiResearchData.claim_rationale}
                      </p>
                    </div>
                  )}

                  {/* Technical Environment */}
                  {aiResearchData.technical_environment && (
                    <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Technical Environment</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {aiResearchData.technical_environment}
                      </p>
                    </div>
                  )}

                  {/* R&D Indicators */}
                  {aiResearchData.rd_indicators && Array.isArray(aiResearchData.rd_indicators) && aiResearchData.rd_indicators.length > 0 && (
                    <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">R&D Indicators</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {aiResearchData.rd_indicators.map((indicator: string, idx: number) => (
                          <li key={idx}>{indicator}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Questions */}
                  {aiResearchData.key_questions && Array.isArray(aiResearchData.key_questions) && aiResearchData.key_questions.length > 0 && (
                    <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Key Questions for Feasibility Meeting</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {aiResearchData.key_questions.map((question: string, idx: number) => (
                          <li key={idx}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prenotification */}
                  {aiResearchData.prenotification_required !== undefined && (
                    <div className="p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Prenotification Required</h4>
                      <Badge variant={aiResearchData.prenotification_required ? "destructive" : "default"}>
                        {aiResearchData.prenotification_required ? "Yes" : "No"}
                      </Badge>
                      {aiResearchData.prenotification_reason && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          {aiResearchData.prenotification_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Risk Flags */}
                  {aiResearchData.risk_flags && Array.isArray(aiResearchData.risk_flags) && aiResearchData.risk_flags.length > 0 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                      <h4 className="font-semibold text-sm mb-2 text-orange-700 dark:text-orange-300">Risk Flags</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-orange-700 dark:text-orange-300">
                        {aiResearchData.risk_flags.map((flag: string, idx: number) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Next Steps */}
                  {aiResearchData.recommended_next_steps && Array.isArray(aiResearchData.recommended_next_steps) && aiResearchData.recommended_next_steps.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="font-semibold text-sm mb-2 text-green-700 dark:text-green-300">Recommended Next Steps</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-green-700 dark:text-green-300">
                        {aiResearchData.recommended_next_steps.map((step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Technical Feasibility Form</CardTitle>
                <CardDescription>
                  Detailed assessment of technical eligibility and project qualification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="technical_understanding">Technical Understanding</Label>
                  <Textarea
                    id="technical_understanding"
                    placeholder="Describe the technical baseline and advancements..."
                    value={techUnderstanding}
                    onChange={(e) => setTechUnderstanding(e.target.value)}
                    rows={4}
                    disabled={!canEdit} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenges_uncertainties">Technological Uncertainties</Label>
                  <Textarea
                    id="challenges_uncertainties"
                    placeholder="List key technical challenges..."
                    value={techChallenges}
                    onChange={(e) => setTechChallenges(e.target.value)}
                    rows={4}
                    disabled={!canEdit} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifying_activities">Qualifying Activities</Label>
                  <Textarea
                    id="qualifying_activities"
                    placeholder="List specific R&D activities..."
                    value={techActivities}
                    onChange={(e) => setTechActivities(e.target.value)}
                    rows={4}
                    disabled={!canEdit} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rd_projects">R&D Projects List</Label>
                  <Textarea
                    id="rd_projects"
                    placeholder="List identifiable projects..."
                    value={techProjects}
                    onChange={(e) => setTechProjects(e.target.value)}
                    rows={4}
                    disabled={!canEdit} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="feasibility_status">Status</Label>
                    <Select
                      value={techStatus}
                      onValueChange={(v: any) => setTechStatus(v)}
                      disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="not_qualified">Not Qualified</SelectItem>
                        <SelectItem value="needs_more_info">Needs More Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="risk_rating">Risk Rating</Label>
                    <Select
                      value={techRiskRating}
                      onValueChange={(v: any) => setTechRiskRating(v)}
                      disabled={!canEdit}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="claim_band">Estimated Claim Value Band</Label>
                  <Select
                    value={techClaimBand}
                    onValueChange={(v: any) => setTechClaimBand(v)}
                    disabled={!canEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Band" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-25k">£0 - £25k</SelectItem>
                      <SelectItem value="25k-50k">£25k - £50k</SelectItem>
                      <SelectItem value="50k-100k">£50k - £100k</SelectItem>
                      <SelectItem value="100k-250k">£100k - £250k</SelectItem>
                      <SelectItem value="250k+">£250k+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes_finance">Notes for Finance Team</Label>
                  <Textarea
                    id="notes_finance"
                    placeholder="Any specific notes regarding costs or apportionment..."
                    value={techNotesForFinance}
                    onChange={(e) => setTechNotesForFinance(e.target.value)}
                    rows={3}
                    disabled={!canEdit} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="missing_info">Missing Information Flags</Label>
                  <Textarea
                    id="missing_info"
                    placeholder="List any missing technical details..."
                    value={techMissingInfo}
                    onChange={(e) => setTechMissingInfo(e.target.value)}
                    rows={2}
                    disabled={!canEdit} />
                </div>

                {canEdit && (cif.current_stage === "tech_feasibility" || isStaff) &&
                  <Button onClick={handleCompleteTechnical} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Complete Technical Feasibility"}
                  </Button>
                }
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
                    disabled={!canEdit || cif.current_stage !== "financial_section"} />
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
                      disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcontractor-cost">Subcontractor Estimate (£)</Label>
                    <Input
                      id="subcontractor-cost"
                      type="number"
                      placeholder="0.00"
                      value={subcontractorCost}
                      onChange={(e) => setSubcontractorCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consumables-cost">Consumables Estimate (£)</Label>
                    <Input
                      id="consumables-cost"
                      type="number"
                      placeholder="0.00"
                      value={consumablesCost}
                      onChange={(e) => setConsumablesCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="software-cost">Software Estimate (£)</Label>
                    <Input
                      id="software-cost"
                      type="number"
                      placeholder="0.00"
                      value={softwareCost}
                      onChange={(e) => setSoftwareCost(e.target.value)}
                      disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS} />
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
                    disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA} />
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
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-firm">Firm Name *</Label>
                      <Input
                        id="accountant-firm"
                        placeholder="Accounting firm"
                        value={accountantFirm}
                        onChange={(e) => setAccountantFirm(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-email">Email</Label>
                      <Input
                        id="accountant-email"
                        type="email"
                        placeholder="accountant@firm.com"
                        value={accountantEmail}
                        onChange={(e) => setAccountantEmail(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountant-phone">Phone</Label>
                      <Input
                        id="accountant-phone"
                        placeholder="+44 20 1234 5678"
                        value={accountantPhone}
                        onChange={(e) => setAccountantPhone(e.target.value)}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS} />
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
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA} />

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("loa-upload")?.click()}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}>
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
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS} />

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("ass-upload")?.click()}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingASS ? "Uploading..." : "Upload Anti-Slavery Statement"}
                      </Button>
                    </div>
                  </div>

                  {documents.length > 0 &&
                  <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold">Uploaded Documents</h4>
                      {documents.map((doc) =>
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
                          onClick={() => handleDownloadDocument(doc.file_path, doc.notes)}>
                              Download
                            </Button>
                            {canEdit && cif.current_stage === "financial_section" &&
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.file_path)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                        }
                          </div>
                        </div>
                    )}
                    </div>
                  }
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ready-submit"
                    checked={readyToSubmit}
                    onCheckedChange={(checked) => setReadyToSubmit(checked as boolean)}
                    disabled={!canEdit || cif.current_stage !== "financial_section"} />
                  <Label htmlFor="ready-submit" className="cursor-pointer">
                    Ready to submit to admin for approval
                  </Label>
                </div>

                {canEdit && cif.current_stage === "financial_section" &&
                <Button onClick={handleCompleteFinancial} disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Complete Financial Section"}
                  </Button>
                }
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
                
                {cif.rejection_reason && !cif.rejection_reason.includes("[ARCHIVED]") && cif.current_stage !== "approved" &&
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-orange-900">Previous Rejection</p>
                        <p className="text-sm text-orange-700 mt-1">
                          {cif.rejection_reason.replace("[SENT_BACK]", "").trim()}
                        </p>
                        {cif.rejected_at &&
                      <p className="text-xs text-orange-600 mt-1">
                            Rejected on {new Date(cif.rejected_at).toLocaleDateString()}
                          </p>
                      }
                      </div>
                    </div>
                  </div>
                }

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">BDM Section</p>
                    <p className="text-sm text-muted-foreground">Business development completed</p>
                    {cif.created_by_profile &&
                    <p className="text-xs text-muted-foreground mt-1">
                        By: {cif.created_by_profile.full_name || cif.created_by_profile.email}
                      </p>
                    }
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
                  {cif.feasibility_status === "qualified" ?
                  <CheckCircle className="h-6 w-6 text-green-500" /> :
                  <XCircle className="h-6 w-6 text-red-500" />
                  }
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Financial Section</p>
                    <p className="text-sm text-muted-foreground">
                      Ready: {cif.ready_to_submit ? "Yes" : "No"}
                    </p>
                  </div>
                  {cif.ready_to_submit ?
                  <CheckCircle className="h-6 w-6 text-green-500" /> :
                  <XCircle className="h-6 w-6 text-orange-500" />
                  }
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">Required Documents</p>
                    <p className="text-sm text-muted-foreground">
                      {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
                    </p>
                  </div>
                  {documents.length >= 2 ?
                  <CheckCircle className="h-6 w-6 text-green-500" /> :
                  <XCircle className="h-6 w-6 text-orange-500" />
                  }
                </div>

                <Separator />

                {cif.current_stage === "admin_approval" &&
                <div className="flex gap-3">
                    <Button onClick={handleApproveCIF} disabled={saving} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {saving ? "Approving..." : "Approve & Create Claim"}
                    </Button>
                    <Button
                    onClick={() => setShowRejectModal(true)}
                    disabled={saving}
                    variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                }

                {cif.current_stage === "approved" && cif.linked_claim_id &&
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-900">CIF Approved</p>
                    <p className="text-sm text-green-700">
                      Claim has been created and linked to this CIF
                    </p>
                  </div>
                }

                {cif.current_stage === "rejected" &&
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-semibold text-red-900">CIF Rejected</p>
                    <p className="text-sm text-red-700">
                      This CIF did not meet approval criteria
                    </p>
                  </div>
                }

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
                          onValueChange={(v: "send_back" | "archive" | "delete") => setRejectionType(v)}>
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

                      {rejectionType === "send_back" &&
                      <div className="space-y-2">
                          <Label>Send Back To</Label>
                          <Select
                          value={rejectToStage}
                          onValueChange={(v: "bdm_section" | "tech_feasibility" | "financial_section") => setRejectToStage(v)}>
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
                      }

                      {rejectionType === "archive" &&
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <strong>Archive:</strong> The CIF will be moved to the archive. You can reactivate it later if the prospect returns.
                          </p>
                        </div>
                      }

                      {rejectionType === "delete" &&
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-900">
                            <strong>Warning:</strong> This action cannot be undone. The CIF and all associated data will be permanently deleted.
                          </p>
                        </div>
                      }

                      <div className="space-y-2">
                        <Label>Reason for Rejection *</Label>
                        <Textarea
                          placeholder="Provide detailed feedback..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4} />
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
                        className={rejectionType === "delete" ? "bg-red-600 hover:bg-red-700" : ""}>
                        {saving ? "Processing..." :
                        rejectionType === "delete" ? "Delete Permanently" :
                        rejectionType === "archive" ?
                        "Archive CIF" :
                        "Send Back"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog - Moved outside Tabs to ensure it renders */}
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
              <AlertDialogCancel onClick={() => {
                console.log("Delete cancelled");
                setShowDeleteModal(false);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Delete confirmed, calling handleDeleteCIF");
                  handleDeleteCIF();
                }}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700">
                {saving ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </StaffLayout>
  );
}