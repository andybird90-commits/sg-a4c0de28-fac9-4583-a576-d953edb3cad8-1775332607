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
import { BookFeasibilityModal } from "@/components/staff/cif/BookFeasibilityModal";
import { ArrowLeft, Save, Upload, FileText, XCircle, AlertTriangle, CheckCircle, Sparkles, ChevronDown, ChevronUp, Zap, Loader2, Calendar } from "lucide-react";

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

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);

  // BDM Form State - Matching Feasibility Request Form
  const [bdmName, setBdmName] = useState("");
  
  // Business Details
  const [companyName, setCompanyName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [numberOfEmployees, setNumberOfEmployees] = useState("");
  
  // Contact Details
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  
  // Start Point Information
  const [canAnswerFeasibility, setCanAnswerFeasibility] = useState<"yes" | "no" | "">("yes");
  const [alternateContactInformed, setAlternateContactInformed] = useState<"yes" | "no" | "">("no");
  const [understandsScheme, setUnderstandsScheme] = useState<"yes" | "no" | "dont_know" | "">("dont_know");
  const [schemeUnderstandingDetails, setSchemeUnderstandingDetails] = useState("");
  const [hasClaimedBefore, setHasClaimedBefore] = useState<"yes" | "no" | "dont_know" | "">("dont_know");
  const [previousClaimDetails, setPreviousClaimDetails] = useState("");
  
  // Projects & Fee Terms
  const [projectsDiscussed, setProjectsDiscussed] = useState<"yes" | "no" | "">("no");
  const [projectsDetails, setProjectsDetails] = useState("");
  const [feeTermsDiscussed, setFeeTermsDiscussed] = useState<"yes" | "no" | "">("no");
  const [feeTermsDetails, setFeeTermsDetails] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Feasibility Section states (from Company Information Form)
  const [completedByName, setCompletedByName] = useState("");
  const [feasibilityCallDate, setFeasibilityCallDate] = useState("");
  const [anyIssuesGatheringInfo, setAnyIssuesGatheringInfo] = useState("");
  const [issuesGatheringInfoDetails, setIssuesGatheringInfoDetails] = useState("");
  const [utr, setUtr] = useState("");
  const [turnover, setTurnover] = useState("");
  const [payroll, setPayroll] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [payeReference, setPayeReference] = useState("");
  const [competentProf1Name, setCompetentProf1Name] = useState("");
  const [competentProf1Position, setCompetentProf1Position] = useState("");
  const [competentProf1Mobile, setCompetentProf1Mobile] = useState("");
  const [competentProf1Email, setCompetentProf1Email] = useState("");
  const [competentProf2Name, setCompetentProf2Name] = useState("");
  const [competentProf2Position, setCompetentProf2Position] = useState("");
  const [competentProf2Mobile, setCompetentProf2Mobile] = useState("");
  const [competentProf2Email, setCompetentProf2Email] = useState("");
  const [competentProf3Name, setCompetentProf3Name] = useState("");
  const [competentProf3Position, setCompetentProf3Position] = useState("");
  const [competentProf3Mobile, setCompetentProf3Mobile] = useState("");
  const [competentProf3Email, setCompetentProf3Email] = useState("");
  const [firstClaimYearForNewClaim, setFirstClaimYearForNewClaim] = useState("");
  const [accountsFiled, setAccountsFiled] = useState("");
  const [ct600FiledSeen, setCt600FiledSeen] = useState("");
  const [preNotificationRequired, setPreNotificationRequired] = useState("");
  const [costsDetails, setCostsDetails] = useState("");
  const [projectsDetailsFeas, setProjectsDetailsFeas] = useState("");
  const [subcontractorsInvolved, setSubcontractorsInvolved] = useState("");
  const [timeSensitive, setTimeSensitive] = useState("");
  const [yearEndMonth, setYearEndMonth] = useState("");
  const [apes, setApes] = useState("");
  const [feePercentage, setFeePercentage] = useState("");
  const [minimumFee, setMinimumFee] = useState("");
  const [introducer, setIntroducer] = useState("");
  const [introducerDetails, setIntroducerDetails] = useState("");

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
  const [uploadingAML, setUploadingAML] = useState(false);
  const [uploadingKYC, setUploadingKYC] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const hasAmlDocument = documents.some((doc) => doc.doc_type === "aml");
  const hasKycDocument = documents.some((doc) => doc.doc_type === "kyc");

  // Add state for extracted feasibility analysis
  const [feasibilityExtract, setFeasibilityExtract] = useState<string>("");
  const [lastAccountsDate, setLastAccountsDate] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  // Add state for full feasibility analysis data
  const [companyResearch, setCompanyResearch] = useState<string>("");
  const [aiResearchData, setAiResearchData] = useState<any>(null);
  const [feasibilityAnalysis, setFeasibilityAnalysis] = useState<any>(null);

  const isBDMComplete = () => {
    return (
      !!contactName &&
      !!contactEmail &&
      !!contactNumber &&
      !!companyName &&
      !!numberOfEmployees &&
      !!canAnswerFeasibility &&
      (canAnswerFeasibility === "yes" || !!alternateContactInformed) &&
      !!understandsScheme &&
      (understandsScheme === "no" || understandsScheme === "dont_know" || !!schemeUnderstandingDetails) &&
      !!hasClaimedBefore &&
      (hasClaimedBefore === "no" || hasClaimedBefore === "dont_know" || !!previousClaimDetails) &&
      !!projectsDiscussed &&
      (projectsDiscussed === "no" || !!projectsDetails) &&
      !!feeTermsDiscussed &&
      (feeTermsDiscussed === "no" || !!feeTermsDetails)
    );
  };

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
      const { data, error } = await supabase
        .from("cif_records")
        .select(`
          *,
          prospects(*)
        `)
        .eq("id", cifId)
        .single();

      console.log("🔍 CIF Data fetched:", data);

      if (error) throw error;
      if (!data) throw new Error("CIF not found");

      // Cast data to any first to handle the type mismatch until cifService is fully updated/reloaded
      const cifData = data as any;
      
      // Update the CIF state with correct typing
      setCif(cifData as CIFWithDetails);

      // Fetch linked feasibility analysis if it exists
      if (cifData.section2_feasibility_id) {
        try {
          const { data: feasData, error: feasError } = await supabase
            .from("feasibility_analyses")
            .select("*")
            .eq("id", cifData.section2_feasibility_id)
            .single();

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

      // Populate BDM Form - New structure matching Feasibility Request Form
      setBdmName(profile?.full_name || "");
      
      // Business Details
      const prospect = Array.isArray(cifData.prospects) ? cifData.prospects[0] : cifData.prospects;
      setCompanyName(prospect?.company_name || "");
      setCompanyNumber(prospect?.company_number || "");
      // Always read headcount from prospect; cif_records does not have this column
      setNumberOfEmployees(
        prospect?.number_of_employees != null
          ? prospect.number_of_employees.toString()
          : ""
      );
      
      // Contact Details
      setContactName(cifData.primary_contact_name || "");
      setContactNumber(cifData.primary_contact_phone || "");
      setContactEmail(cifData.primary_contact_email || "");
      
      // Feasibility call date/time (from booked diary slot or saved feasibility data)
      const rawFeasibilityCallDate = (cifData as any).feasibility_call_date as string | null | undefined;
      if (rawFeasibilityCallDate) {
        const parsed = new Date(rawFeasibilityCallDate);
        if (!Number.isNaN(parsed.getTime())) {
          const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setFeasibilityCallDate(local);
        }
      } else {
        setFeasibilityCallDate("");
      }
      
      // Start Point Information
      setCanAnswerFeasibility(cifData.can_answer_feasibility || "yes");
      setAlternateContactInformed(cifData.alternate_contact_informed || "no");
      setUnderstandsScheme(cifData.understands_scheme || "dont_know");
      setSchemeUnderstandingDetails(cifData.scheme_understanding_details || "");
      // Map legacy boolean has_claimed_before to new state
      if (cifData.has_claimed_before === true) setHasClaimedBefore("yes");
      else if (cifData.has_claimed_before === false) setHasClaimedBefore("no");
      else setHasClaimedBefore("dont_know");
      
      setPreviousClaimDetails(cifData.previous_claim_details || "");
      
      // Projects & Fee Terms
      setProjectsDiscussed(cifData.projects_discussed || "no");
      setProjectsDetails(cifData.projects_details || "");
      setFeeTermsDiscussed(cifData.fee_terms_discussed || "no");
      setFeeTermsDetails(cifData.fee_terms_details || "");
      setAdditionalInfo(cifData.additional_info || "");

      // Legacy fields for compatibility
      setHasClaimedBefore(cifData.has_claimed_before === true ? "yes" : "no");
      setPreviousClaimDetails(cifData.previous_claim_details || "");
      setProjectsDiscussed(cifData.projects_discussed || "no");
      setProjectsDetails(cifData.projects_details || "");
      setFeeTermsDiscussed(cifData.fee_terms_discussed || "no");
      setFeeTermsDetails(cifData.fee_terms_details || "");
      setAdditionalInfo(cifData.additional_info || "");

      // Extract AI research data from ai_research_data JSONB field
      const mergedResearch = cifData.ai_research_data || {};

      // Merge with company_research if available (fallback/legacy data)
      if (cifData.company_research) {
        try {
          let research;
          
          // Check if it's actually JSON by trying to parse it
          if (typeof cifData.company_research === 'string') {
            // Try to detect if it's JSON (starts with { or [)
            const trimmed = cifData.company_research.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                research = JSON.parse(cifData.company_research);
                console.log("🔄 Parsed company_research as JSON", research);
              } catch (parseError) {
                console.log("⚠️ company_research looks like JSON but failed to parse, treating as plain text");
                research = { description: cifData.company_research };
              }
            } else {
              // It's plain text, wrap it
              console.log("📝 company_research is plain text, wrapping it");
              research = { description: cifData.company_research };
            }
          } else {
            // Already an object
            research = cifData.company_research;
          }

          console.log("🔄 Merging company_research into aiResearchData", research);

          setAiResearchData((prev: any) => ({
            ...prev,
            ...(research || {}),
            section1_completed_by: cifData.section1_completed_by || prev?.section1_completed_by
          }));
        } catch (e) {
          console.error("Error parsing company_research for merge:", e);
        }
      }

      console.log("✅ Final Merged AI Data:", mergedResearch);
      setAiResearchData(mergedResearch);

      // Fallback to company_research plain text
      if (cifData.company_research) {
        setCompanyResearch(cifData.company_research);
      }

      // Populate Financial Form
      setFinancialYear(cifData.financial_year || "");
      setStaffCost(cifData.staff_cost_estimate?.toString() || "");
      setSubcontractorCost(cifData.subcontractor_estimate?.toString() || "");
      setConsumablesCost(cifData.consumables_estimate?.toString() || "");
      setSoftwareCost(cifData.software_estimate?.toString() || "");
      setApportionment(cifData.apportionment_assumptions || "");
      setAccountantName(cifData.accountant_name || "");
      setAccountantFirm(cifData.accountant_firm || "");
      setAccountantEmail(cifData.accountant_email || "");
      setAccountantPhone(cifData.accountant_phone || "");
      setReadyToSubmit(cifData.ready_to_submit || false);

    } catch (error) {
      console.error("Error loading CIF:", error);
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

  const handleFileUpload = async (
    file: File,
    docType: "loa" | "anti_slavery" | "aml" | "kyc"
  ) => {
    if (!cif || !profile?.id) return;

    let setUploading: (value: boolean) => void;
    if (docType === "loa") {
      setUploading = setUploadingLOA;
    } else if (docType === "anti_slavery") {
      setUploading = setUploadingASS;
    } else if (docType === "aml") {
      setUploading = setUploadingAML;
    } else {
      setUploading = setUploadingKYC;
    }

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
        notes: file.name
      });

      if (dbError) {
        toast({ title: "Error", description: "Failed to save document reference", variant: "destructive" });
        console.error("Database error:", dbError);
        await supabase.storage.from("cif-documents").remove([fileName]);
        return;
      }

      toast({
        title: "Success",
        description:
          docType === "loa"
            ? "Letter of Authority uploaded"
            : docType === "anti_slavery"
            ? "Anti-Slavery Statement uploaded"
            : docType === "aml"
            ? "AML document uploaded"
            : "KYC document uploaded",
      });
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

    if (!isBDMComplete()) {
      toast({
        title: "Incomplete Form",
        description: "Please complete all required fields before requesting a feasibility call.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const bdmData = {
        primary_contact_name: contactName,
        primary_contact_phone: contactNumber,
        primary_contact_email: contactEmail,
        number_of_employees: numberOfEmployees ? parseInt(numberOfEmployees) : undefined,
        can_answer_feasibility: canAnswerFeasibility as "yes" | "no",
        alternate_contact_informed: alternateContactInformed as "yes" | "no",
        understands_scheme: understandsScheme as "yes" | "no" | "dont_know",
        scheme_understanding_details: schemeUnderstandingDetails,
        previous_claim_details: previousClaimDetails,
        projects_discussed: projectsDiscussed as "yes" | "no",
        projects_details: projectsDetails,
        fee_terms_discussed: feeTermsDiscussed as "yes" | "no",
        fee_terms_details: feeTermsDetails,
        additional_info: additionalInfo,
        has_claimed_before: hasClaimedBefore === "yes"
      };

      const result = await cifService.completeBDMSection({
        cifId: cif.id,
        updates: bdmData,
        userId: profile.id,
      });

      if (result) {
        toast({
          title: "Success",
          description: "BDM section completed successfully."
        });
        await fetchCIF(cif.id);
        setShowBookingModal(true);
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
    if (!cif) return;
    setSaving(true);
    
    try {
      if (!hasAmlDocument || !hasKycDocument) {
        toast({
          title: "Missing compliance documents",
          description: "Please upload both AML and KYC documents before submitting feasibility for admin approval.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Validate required fields
      const requiredFields: Record<string, any> = {
        "Completed By": completedByName,
        "Feasibility Call Date": feasibilityCallDate,
        "Any Issues Gathering Info": anyIssuesGatheringInfo,
        "UTR": utr,
        "Turnover": turnover,
        "Payroll": payroll,
        "VAT Number": vatNumber,
        "PAYE Reference": payeReference,
        "First Claim Year": firstClaimYearForNewClaim,
        "Accounts Filed": accountsFiled,
        "CT600 Filed/Seen": ct600FiledSeen,
        "Pre Notification Required": preNotificationRequired,
        "Costs Details": costsDetails,
        "Projects Details": projectsDetailsFeas,
        "Subcontractors": subcontractorsInvolved,
        "Time Sensitive": timeSensitive,
        "Accountant Name": accountantFirm,
        "Accountant Contact": accountantName,
        "Accountant Email": accountantEmail,
        "Accountant Phone": accountantPhone,
        "Financial Year": financialYear,
        "Year End": yearEndMonth,
        "APEs": apes,
        "Fee Percentage": feePercentage,
        "Introducer": introducer
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        toast({
          title: "Missing Information",
          description: `Please fill in the following required fields: ${missingFields.join(", ")}`,
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      await cifService.completeFeasibilitySection(cif.id, {
        completed_by_name: completedByName,
        feasibility_call_date: feasibilityCallDate,
        any_issues_gathering_info: anyIssuesGatheringInfo as "yes" | "no",
        issues_gathering_info_details: issuesGatheringInfoDetails,
        utr,
        turnover: parseFloat(turnover),
        payroll: parseFloat(payroll),
        vat_number: vatNumber,
        paye_reference: payeReference,
        competent_professional_1_name: competentProf1Name,
        competent_professional_1_position: competentProf1Position,
        competent_professional_1_mobile: competentProf1Mobile,
        competent_professional_1_email: competentProf1Email,
        competent_professional_2_name: competentProf2Name,
        competent_professional_2_position: competentProf2Position,
        competent_professional_2_mobile: competentProf2Mobile,
        competent_professional_2_email: competentProf2Email,
        competent_professional_3_name: competentProf3Name,
        competent_professional_3_position: competentProf3Position,
        competent_professional_3_mobile: competentProf3Mobile,
        competent_professional_3_email: competentProf3Email,
        technical_understanding: "See details in form",
      });

      toast({
        title: "Success",
        description: "Feasibility section completed and submitted for approval",
      });
      
      fetchCIF(cif.id);
    } catch (error) {
      console.error("Error completing feasibility:", error);
      toast({
        title: "Error",
        description: "Failed to save feasibility data",
        variant: "destructive",
      });
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
      const result = await cifService.completeFinancialSection(cif.id, profile.id);

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
          description: "CIF approved and ready for claim creation"
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
      const result = await cifService.rejectCIF(cif.id, profile.id, rejectionReason);

      if (result) {
        toast({
          title: "Success",
          description: "CIF rejected successfully"
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
    if (!cif) return;

    setSaving(true);
    try {
      await cifService.deleteCIF(cif.id);

      toast({
        title: "CIF deleted",
        description: "The CIF and all associated data have been permanently deleted."
      });
      setShowDeleteModal(false);
      router.push("/staff/cif");
    } catch (error) {
      console.error("Error deleting CIF:", error);
      toast({
        title: "Error",
        description: "Failed to delete CIF",
        variant: "destructive",
      });
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

  const prospect = Array.isArray(cif.prospects) ? cif.prospects[0] : cif.prospects;
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
                <h1 className="text-3xl font-bold">{companyName || "Unknown Company"}</h1>
                <MessageWidget
                  entityType="cif"
                  entityId={cif.id}
                  entityName={companyName || "Unknown Company"}
                />
              </div>
              <p className="text-muted-foreground">
                {contactName} • {contactEmail}
              </p>
            </div>
          </div>
          {profile?.internal_role === "admin" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="z-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Delete CIF
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bdm">BDM</TabsTrigger>
            <TabsTrigger value="feasibility">Feasibility</TabsTrigger>
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
                    RD Companion Business Intelligence
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
                <CardTitle className="text-orange-600">Feasibility Request Form</CardTitle>
                <CardDescription>
                  Complete all fields from the initial BDM call to request a feasibility meeting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BDM Name */}
                <div className="space-y-2">
                  <Label htmlFor="bdm_name" className="text-base font-semibold">BDM NAME:</Label>
                  <Input
                    id="bdm_name"
                    value={bdmName}
                    onChange={(e) => setBdmName(e.target.value)}
                    disabled={true}
                    className="bg-muted"
                  />
                </div>

                <Separator className="my-6" />

                {/* Business Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">BUSINESS DETAILS:</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-base">COMPANY NAME:</Label>
                    <Input
                      id="company_name"
                      value={companyName}
                      disabled={true}
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_number" className="text-base">COMPANY NUMBER:</Label>
                    <Input
                      id="company_number"
                      value={companyNumber}
                      disabled={true}
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number_of_employees" className="text-base">NUMBER OF EMPLOYEES *</Label>
                    <Input
                      id="number_of_employees"
                      type="number"
                      placeholder="e.g. 25"
                      value={numberOfEmployees}
                      onChange={(e) => setNumberOfEmployees(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Contact Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">CONTACT DETAILS:</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_name" className="text-base">CONTACT NAME: *</Label>
                    <Input
                      id="contact_name"
                      placeholder="Full name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_number" className="text-base">CONTACT NUMBER: *</Label>
                    <Input
                      id="contact_number"
                      type="tel"
                      placeholder="+44 20 1234 5678"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email" className="text-base">CONTACT EMAIL: *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      placeholder="email@company.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Start Point Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">START POINT INFORMATION:</h3>
                  
                  <div className="space-y-2">
                    <Label className="text-base">IS THE CONTACT ABLE TO ANSWER THE FEASIBILITY QUESTIONS? *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={canAnswerFeasibility === "yes" ? "default" : "outline"}
                        onClick={() => setCanAnswerFeasibility("yes")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={canAnswerFeasibility === "no" ? "default" : "outline"}
                        onClick={() => setCanAnswerFeasibility("no")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        NO
                      </Button>
                    </div>
                  </div>

                  {canAnswerFeasibility === "no" && (
                    <div className="space-y-2 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <Label className="text-base">IF NO, HAS THE INITIAL CONTACT BEEN INFORMED THAT WE WILL NEED THE DETAILS OF SOMEONE WHO CAN? *</Label>
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={alternateContactInformed === "yes" ? "default" : "outline"}
                          onClick={() => setAlternateContactInformed("yes")}
                          disabled={!canEdit}
                          className="flex-1"
                        >
                          YES
                        </Button>
                        <Button
                          type="button"
                          variant={alternateContactInformed === "no" ? "default" : "outline"}
                          onClick={() => setAlternateContactInformed("no")}
                          disabled={!canEdit}
                          className="flex-1"
                        >
                          NO
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-base">DOES THE PERSON NOMINATED FOR THE FEASIBILITY STUDY KNOW ABOUT/HAVE ANY UNDERSTANDING OF THE SCHEME? *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={understandsScheme === "yes" ? "default" : "outline"}
                        onClick={() => setUnderstandsScheme("yes")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={understandsScheme === "no" ? "default" : "outline"}
                        onClick={() => setUnderstandsScheme("no")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        NO
                      </Button>
                      <Button
                        type="button"
                        variant={understandsScheme === "dont_know" ? "default" : "outline"}
                        onClick={() => setUnderstandsScheme("dont_know")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        DON'T KNOW
                      </Button>
                    </div>
                  </div>

                  {understandsScheme === "yes" && (
                    <div className="space-y-2">
                      <Label htmlFor="scheme_details" className="text-base">IF YES, PLEASE PROVIDE DETAILS: *</Label>
                      <Textarea
                        id="scheme_details"
                        placeholder="What do they know about the R&D tax credit scheme?"
                        value={schemeUnderstandingDetails}
                        onChange={(e) => setSchemeUnderstandingDetails(e.target.value)}
                        rows={3}
                        disabled={!canEdit}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-base">HAVE THEY CLAIMED BEFORE? *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={hasClaimedBefore === "yes" ? "default" : "outline"}
                        onClick={() => setHasClaimedBefore("yes")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={hasClaimedBefore === "no" ? "default" : "outline"}
                        onClick={() => setHasClaimedBefore("no")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        NO
                      </Button>
                      <Button
                        type="button"
                        variant={hasClaimedBefore === "dont_know" ? "default" : "outline"}
                        onClick={() => setHasClaimedBefore("dont_know")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        DON'T KNOW
                      </Button>
                    </div>
                  </div>

                  {hasClaimedBefore === "yes" && (
                    <div className="space-y-2">
                      <Label htmlFor="previous_claim" className="text-base">IF YES, WHAT HAS BEEN CLAIMED? *</Label>
                      <Textarea
                        id="previous_claim"
                        placeholder="Details of previous claims (year, amount, advisor, etc.)"
                        value={previousClaimDetails}
                        onChange={(e) => setPreviousClaimDetails(e.target.value)}
                        rows={3}
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Projects Discussion Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">HAVE ANY PROJECTS BEEN DISCUSSED? *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={projectsDiscussed === "yes" ? "default" : "outline"}
                        onClick={() => setProjectsDiscussed("yes")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={projectsDiscussed === "no" ? "default" : "outline"}
                        onClick={() => setProjectsDiscussed("no")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        NO
                      </Button>
                    </div>
                  </div>

                  {projectsDiscussed === "yes" && (
                    <div className="space-y-2">
                      <Label htmlFor="projects_details" className="text-base">IF YES, WHAT PROJECTS HAVE BEEN DISCUSSED? *</Label>
                      <Textarea
                        id="projects_details"
                        placeholder="List and describe projects discussed..."
                        value={projectsDetails}
                        onChange={(e) => setProjectsDetails(e.target.value)}
                        rows={4}
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Fee Terms Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-base">HAVE THE FEE TERMS BEEN DISCUSSED? *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={feeTermsDiscussed === "yes" ? "default" : "outline"}
                        onClick={() => setFeeTermsDiscussed("yes")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={feeTermsDiscussed === "no" ? "default" : "outline"}
                        onClick={() => setFeeTermsDiscussed("no")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        NO
                      </Button>
                    </div>
                  </div>

                  {feeTermsDiscussed === "yes" && (
                    <div className="space-y-2">
                      <Label htmlFor="fee_terms_details" className="text-base">IF YES, WHAT TERMS HAVE BEEN DISCUSSED? *</Label>
                      <Textarea
                        id="fee_terms_details"
                        placeholder="Fee structure, percentage, payment terms, etc."
                        value={feeTermsDetails}
                        onChange={(e) => setFeeTermsDetails(e.target.value)}
                        rows={3}
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Additional Information */}
                <div className="space-y-2">
                  <Label htmlFor="additional_info" className="text-base">ANY FURTHER INFORMATION TO HELP WITH THE FEASIBILITY STUDY?</Label>
                  <Textarea
                    id="additional_info"
                    placeholder="Any other relevant information..."
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={4}
                    disabled={!canEdit}
                  />
                </div>

                <Separator className="my-6" />

                {/* Request Feasibility Button */}
                {canEdit && (
                  <div className="space-y-3">
                    <Button
                      onClick={handleCompleteBDM}
                      disabled={saving || !isBDMComplete()}
                      className="w-full"
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-2 h-4 w-4" />
                          Complete BDM & Request Feasibility Call
                        </>
                      )}
                    </Button>

                    {!isBDMComplete() && (
                      <p className="text-sm text-muted-foreground text-center">
                        Please complete all required fields (*) to request a feasibility call
                      </p>
                    )}
                  </div>
                )}
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
                    RD Companion Feasibility Analysis
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
                          aiResearchData.previous_claims_likelihood === "high" ? "default" :
                            aiResearchData.previous_claims_likelihood === "medium" ? "secondary" : "outline"
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
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
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
                <CardTitle className="text-orange-600">Company Information Form</CardTitle>
                <CardDescription>
                  Complete feasibility assessment and financial details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* SECTION A - BUSINESS DETAILS */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">
                    SECTION A - BUSINESS DETAILS
                  </h3>

                  {/* Requested by / Completed by */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Requested by - NAME</Label>
                      <Input value={bdmName} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="completed_by_name">Completed by - NAME *</Label>
                      <Input
                        id="completed_by_name"
                        value={completedByName}
                        onChange={(e) => setCompletedByName(e.target.value)}
                        placeholder="Feasibility assessor name"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  {/* Feasibility Call Date/Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feasibility_call_date">FEASIBILITY CALL/MEETING - DATE/TIME: *</Label>
                      <Input
                        id="feasibility_call_date"
                        type="datetime-local"
                        value={feasibilityCallDate}
                        onChange={(e) => setFeasibilityCallDate(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  {/* Any Issues Gathering Info */}
                  <div className="space-y-2">
                    <Label>ANY ISSUES GATHERING REQUIRED INFORMATION? *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={anyIssuesGatheringInfo === "yes" ? "default" : "outline"}
                        onClick={() => setAnyIssuesGatheringInfo("yes")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={anyIssuesGatheringInfo === "no" ? "default" : "outline"}
                        onClick={() => setAnyIssuesGatheringInfo("no")}
                        disabled={!canEdit}
                        className="flex-1"
                      >
                        NO
                      </Button>
                    </div>
                  </div>

                  {anyIssuesGatheringInfo === "yes" && (
                    <div className="space-y-2 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <Label htmlFor="issues_details">If yes, please provide details: *</Label>
                      <Textarea
                        id="issues_details"
                        value={issuesGatheringInfoDetails}
                        onChange={(e) => setIssuesGatheringInfoDetails(e.target.value)}
                        rows={3}
                        disabled={!canEdit}
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* COMPANY DETAILS */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">
                    COMPANY DETAILS
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company Name:</Label>
                      <Input value={companyName} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Number:</Label>
                      <Input value={companyNumber} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Industry/SIC Code:</Label>
                      <Input value={prospect?.sic_codes?.[0] || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="utr">UTR: *</Label>
                      <Input
                        id="utr"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="Unique Taxpayer Reference"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="turnover">Turnover: *</Label>
                      <Input
                        id="turnover"
                        type="number"
                        value={turnover}
                        onChange={(e) => setTurnover(e.target.value)}
                        placeholder="£"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payroll">Payroll: *</Label>
                      <Input
                        id="payroll"
                        type="number"
                        value={payroll}
                        onChange={(e) => setPayroll(e.target.value)}
                        placeholder="£"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vat_number">VAT Number:</Label>
                      <Input
                        id="vat_number"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paye_reference">PAYE Reference:</Label>
                      <Input
                        id="paye_reference"
                        value={payeReference}
                        onChange={(e) => setPayeReference(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  {/* Main Contact */}
                  <div className="pt-4 space-y-4">
                    <h4 className="font-semibold">Main Contact:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name:</Label>
                        <Input value={contactName} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Position:</Label>
                        <Input value={cif.primary_contact_position || ""} disabled className="bg-muted" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mobile:</Label>
                        <Input value={contactNumber} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email:</Label>
                        <Input value={contactEmail} disabled className="bg-muted" />
                      </div>
                    </div>
                  </div>

                  {/* Competent Professionals */}
                  <div className="pt-4 space-y-4">
                    <h4 className="font-semibold">Competent Professional(s) (if different to main contact)</h4>
                    
                    {/* Competent Professional 1 */}
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Name 1:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_1_name">Name:</Label>
                          <Input
                            id="comp_prof_1_name"
                            value={competentProf1Name}
                            onChange={(e) => setCompetentProf1Name(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_1_position">Position:</Label>
                          <Input
                            id="comp_prof_1_position"
                            value={competentProf1Position}
                            onChange={(e) => setCompetentProf1Position(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_1_mobile">Mobile:</Label>
                          <Input
                            id="comp_prof_1_mobile"
                            value={competentProf1Mobile}
                            onChange={(e) => setCompetentProf1Mobile(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_1_email">Email:</Label>
                          <Input
                            id="comp_prof_1_email"
                            type="email"
                            value={competentProf1Email}
                            onChange={(e) => setCompetentProf1Email(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Competent Professional 2 */}
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Name 2:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_2_name">Name:</Label>
                          <Input
                            id="comp_prof_2_name"
                            value={competentProf2Name}
                            onChange={(e) => setCompetentProf2Name(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_2_position">Position:</Label>
                          <Input
                            id="comp_prof_2_position"
                            value={competentProf2Position}
                            onChange={(e) => setCompetentProf2Position(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_2_mobile">Mobile:</Label>
                          <Input
                            id="comp_prof_2_mobile"
                            value={competentProf2Mobile}
                            onChange={(e) => setCompetentProf2Mobile(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_2_email">Email:</Label>
                          <Input
                            id="comp_prof_2_email"
                            type="email"
                            value={competentProf2Email}
                            onChange={(e) => setCompetentProf2Email(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Competent Professional 3 */}
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium">Name 3:</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_3_name">Name:</Label>
                          <Input
                            id="comp_prof_3_name"
                            value={competentProf3Name}
                            onChange={(e) => setCompetentProf3Name(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_3_position">Position:</Label>
                          <Input
                            id="comp_prof_3_position"
                            value={competentProf3Position}
                            onChange={(e) => setCompetentProf3Position(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_3_mobile">Mobile:</Label>
                          <Input
                            id="comp_prof_3_mobile"
                            value={competentProf3Mobile}
                            onChange={(e) => setCompetentProf3Mobile(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="comp_prof_3_email">Email:</Label>
                          <Input
                            id="comp_prof_3_email"
                            type="email"
                            value={competentProf3Email}
                            onChange={(e) => setCompetentProf3Email(e.target.value)}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Number of Directors/Employees */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Directors:</Label>
                      <Input value={prospect?.number_of_directors || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Employees:</Label>
                      <Input value={numberOfEmployees} disabled className="bg-muted" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* FEASIBILITY */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">
                    FEASIBILITY
                  </h3>

                  {/* Have they Claimed Before */}
                  <div className="space-y-2">
                    <Label>Have they Claimed Before?</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={hasClaimedBefore === "yes" ? "default" : "outline"}
                        onClick={() => setHasClaimedBefore("yes")}
                        disabled
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={hasClaimedBefore === "no" ? "default" : "outline"}
                        onClick={() => setHasClaimedBefore("no")}
                        disabled
                        className="flex-1"
                      >
                        NO
                      </Button>
                    </div>
                  </div>

                  {hasClaimedBefore === "yes" && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Claim Year:</Label>
                          <Input value={cif.previous_claim_year_end_date || ""} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                          <Label>Claim Value:</Label>
                          <Input value={cif.previous_claim_value ? `£${cif.previous_claim_value}` : ""} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                          <Label>Date Submitted:</Label>
                          <Input value={cif.previous_claim_date_submitted || ""} disabled className="bg-muted" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="first_claim_year">First Claim Year for New Claim: *</Label>
                    <Input
                      id="first_claim_year"
                      value={firstClaimYearForNewClaim}
                      onChange={(e) => setFirstClaimYearForNewClaim(e.target.value)}
                      placeholder="e.g., 2024"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Accounts Filed / CT600 / Pre Notification */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Accounts Filed: *</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={accountsFiled === "yes" ? "default" : "outline"}
                          onClick={() => setAccountsFiled("yes")}
                          disabled={!canEdit}
                          size="sm"
                          className="flex-1"
                        >
                          YES
                        </Button>
                        <Button
                          type="button"
                          variant={accountsFiled === "no" ? "default" : "outline"}
                          onClick={() => setAccountsFiled("no")}
                          disabled={!canEdit}
                          size="sm"
                          className="flex-1"
                        >
                          NO
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>CT600 Filed/Seen: *</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={ct600FiledSeen === "yes" ? "default" : "outline"}
                          onClick={() => setCt600FiledSeen("yes")}
                          disabled={!canEdit}
                          size="sm"
                          className="flex-1"
                        >
                          YES
                        </Button>
                        <Button
                          type="button"
                          variant={ct600FiledSeen === "no" ? "default" : "outline"}
                          onClick={() => setCt600FiledSeen("no")}
                          disabled={!canEdit}
                          size="sm"
                          className="flex-1"
                        >
                          NO
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Pre Notification Required: *</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={preNotificationRequired === "yes" ? "default" : "outline"}
                          onClick={() => setPreNotificationRequired("yes")}
                          disabled={!canEdit}
                          size="sm"
                          className="flex-1"
                        >
                          YES
                        </Button>
                        <Button
                          type="button"
                          variant={preNotificationRequired === "no" ? "default" : "outline"}
                          onClick={() => setPreNotificationRequired("no")}
                          disabled={!canEdit}
                          size="sm"
                          className="flex-1"
                        >
                          NO
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* FEASIBILITY continued - Costs and Projects */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">
                    FEASIBILITY continued
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="costs_details">Costs - (please detail costs below): *</Label>
                    <Textarea
                      id="costs_details"
                      value={costsDetails}
                      onChange={(e) => setCostsDetails(e.target.value)}
                      rows={6}
                      placeholder="Detail all R&D costs..."
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projects_details_feas">Projects - (please detail projects below): *</Label>
                    <Textarea
                      id="projects_details_feas"
                      value={projectsDetailsFeas}
                      onChange={(e) => setProjectsDetailsFeas(e.target.value)}
                      rows={6}
                      placeholder="Detail all R&D projects..."
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Subcontractors and Time Sensitive */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Subcontractors: *</Label>
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={subcontractorsInvolved === "yes" ? "default" : "outline"}
                          onClick={() => setSubcontractorsInvolved("yes")}
                          disabled={!canEdit}
                          className="flex-1"
                        >
                          YES
                        </Button>
                        <Button
                          type="button"
                          variant={subcontractorsInvolved === "no" ? "default" : "outline"}
                          onClick={() => setSubcontractorsInvolved("no")}
                          disabled={!canEdit}
                          className="flex-1"
                        >
                          NO
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Time Sensitive: *</Label>
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant={timeSensitive === "yes" ? "default" : "outline"}
                          onClick={() => setTimeSensitive("yes")}
                          disabled={!canEdit}
                          className="flex-1"
                        >
                          YES
                        </Button>
                        <Button
                          type="button"
                          variant={timeSensitive === "no" ? "default" : "outline"}
                          onClick={() => setTimeSensitive("no")}
                          disabled={!canEdit}
                          className="flex-1"
                        >
                          NO
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* ACCOUNTANTS DETAILS */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">
                    ACCOUNTANTS DETAILS
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountant_name_field">Company Name: *</Label>
                      <Input
                        id="accountant_name_field"
                        value={accountantFirm}
                        onChange={(e) => setAccountantFirm(e.target.value)}
                        placeholder="Accountancy firm name"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountant_contact">Contact: *</Label>
                      <Input
                        id="accountant_contact"
                        value={accountantName}
                        onChange={(e) => setAccountantName(e.target.value)}
                        placeholder="Contact person name"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountant_email_field">Email: *</Label>
                      <Input
                        id="accountant_email_field"
                        type="email"
                        value={accountantEmail}
                        onChange={(e) => setAccountantEmail(e.target.value)}
                        placeholder="accountant@firm.com"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountant_phone_field">Phone: *</Label>
                      <Input
                        id="accountant_phone_field"
                        value={accountantPhone}
                        onChange={(e) => setAccountantPhone(e.target.value)}
                        placeholder="+44 20 1234 5678"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* CONTRACT TERMS */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 -mx-3">
                    CONTRACT TERMS
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year_end">Year End: *</Label>
                      <Input
                        id="year_end"
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        placeholder="e.g., 31-03-2024"
                        disabled={!canEdit || cif.current_stage !== "financial_section"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year_end_month">Month: *</Label>
                      <Input
                        id="year_end_month"
                        value={yearEndMonth}
                        onChange={(e) => setYearEndMonth(e.target.value)}
                        placeholder="e.g., March"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apes">APEs: *</Label>
                      <Input
                        id="apes"
                        value={apes}
                        onChange={(e) => setApes(e.target.value)}
                        placeholder="Annual Percentage Estimate"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fee_percentage">Fee Percentage: *</Label>
                      <Input
                        id="fee_percentage"
                        type="number"
                        step="0.01"
                        value={feePercentage}
                        onChange={(e) => setFeePercentage(e.target.value)}
                        placeholder="%"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimum_fee">Minimum Fee: *</Label>
                      <Input
                        id="minimum_fee"
                        type="number"
                        value={minimumFee}
                        onChange={(e) => setMinimumFee(e.target.value)}
                        placeholder="£"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                    </div>
                  </div>

                  {/* Introducer */}
                  <div className="space-y-2">
                    <Label>Introducer: *</Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={introducer === "yes" ? "default" : "outline"}
                        onClick={() => setIntroducer("yes")}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                        className="flex-1"
                      >
                        YES
                      </Button>
                      <Button
                        type="button"
                        variant={introducer === "no" ? "default" : "outline"}
                        onClick={() => setIntroducer("no")}
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingASS}
                        className="flex-1"
                      >
                        NO
                      </Button>
                    </div>
                  </div>

                  {introducer === "yes" && (
                    <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                      <Label htmlFor="introducer_details">Details Name/Company: *</Label>
                      <Input
                        id="introducer_details"
                        value={introducerDetails}
                        onChange={(e) => setIntroducerDetails(e.target.value)}
                        placeholder="Introducer name/company"
                        disabled={!canEdit || cif.current_stage !== "financial_section" || uploadingLOA}
                      />
                    </div>
                  )}

                  {/* Compliance & Anti-Money Laundering */}
                  <div className="space-y-4 p-4 bg-muted/40 rounded-lg border border-muted-foreground/20">
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Compliance & Anti-Money Laundering</h4>
                      <p className="text-sm text-muted-foreground">
                        As part of onboarding, ensure that standard Anti-Money Laundering (AML), Know Your Customer (KYC)
                        and Anti-Bribery checks have been completed in line with your firm&apos;s policies before progressing
                        this engagement.
                      </p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Client identity and beneficial ownership verified</li>
                        <li>Source of funds and business activities understood</li>
                        <li>Sanctions and politically exposed persons (PEP) screening completed</li>
                      </ul>
                      <p className="text-xs text-destructive mt-1">
                        AML and KYC documentation must be uploaded before submitting feasibility for admin approval.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* AML upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">AML Document (required)</Label>
                        {documents.filter((doc) => doc.doc_type === "aml").length > 0 && (
                          <div className="space-y-1">
                            {documents
                              .filter((doc) => doc.doc_type === "aml")
                              .map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between rounded-md border bg-background px-2 py-1 text-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadDocument(doc.file_path, doc.notes || "aml_document")
                                    }
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span className="truncate max-w-[140px]">
                                      {doc.notes || "AML document"}
                                    </span>
                                  </button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                                    disabled={saving}
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed px-3 py-2 text-xs font-medium hover:bg-muted/60">
                          <Upload className="mr-2 h-3 w-3" />
                          <span>{uploadingAML ? "Uploading..." : "Upload AML file (PDF/Word)"}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={!canEdit || uploadingAML || saving}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const extension = file.name.split(".").pop()?.toLowerCase();
                              const allowedExtensions = ["pdf", "doc", "docx"];
                              if (!extension || !allowedExtensions.includes(extension)) {
                                toast({
                                  title: "Invalid file type",
                                  description: "Please upload a PDF or Word document.",
                                  variant: "destructive",
                                });
                                event.target.value = "";
                                return;
                              }
                              handleFileUpload(file, "aml");
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {!hasAmlDocument && (
                          <p className="text-xs text-destructive">AML document is required.</p>
                        )}
                      </div>

                      {/* KYC upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">KYC Document (required)</Label>
                        {documents.filter((doc) => doc.doc_type === "kyc").length > 0 && (
                          <div className="space-y-1">
                            {documents
                              .filter((doc) => doc.doc_type === "kyc")
                              .map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between rounded-md border bg-background px-2 py-1 text-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadDocument(doc.file_path, doc.notes || "kyc_document")
                                    }
                                    className="flex items-center gap-1 text-primary hover:underline"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span className="truncate max-w-[140px]">
                                      {doc.notes || "KYC document"}
                                    </span>
                                  </button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteDocument(doc.id, doc.file_path)}
                                    disabled={saving}
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed px-3 py-2 text-xs font-medium hover:bg-muted/60">
                          <Upload className="mr-2 h-3 w-3" />
                          <span>{uploadingKYC ? "Uploading..." : "Upload KYC file (PDF/Word)"}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={!canEdit || uploadingKYC || saving}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (!file) return;
                              const extension = file.name.split(".").pop()?.toLowerCase();
                              const allowedExtensions = ["pdf", "doc", "docx"];
                              if (!extension || !allowedExtensions.includes(extension)) {
                                toast({
                                  title: "Invalid file type",
                                  description: "Please upload a PDF or Word document.",
                                  variant: "destructive",
                                });
                                event.target.value = "";
                                return;
                              }
                              handleFileUpload(file, "kyc");
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {!hasKycDocument && (
                          <p className="text-xs text-destructive">KYC document is required.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Complete Feasibility Button */}
                {canEdit && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleCompleteTechnical}
                      disabled={saving || !hasAmlDocument || !hasKycDocument}
                      className="w-full"
                      size="lg"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Complete Feasibility & Submit for Admin Approval"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      This will mark the feasibility section as complete and move this CIF to admin review.
                      AML and KYC documents are required before submission.
                    </p>
                  </div>
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
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Feasibility Booking Modal */}
        {cif && (
          <BookFeasibilityModal
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            cifId={cif.id}
            clientId={cif.prospect_id || null}
            clientEmail={contactEmail || cif.primary_contact_email || ""}
            bdmUserId={profile?.id || ""}
            onSuccess={() => {
              setShowBookingModal(false);
              fetchCIF(cif.id);
              toast({
                title: "Success",
                description: "Feasibility call booked successfully"
              });
            }}
          />
        )}
      </div>
    </StaffLayout>
  );
}