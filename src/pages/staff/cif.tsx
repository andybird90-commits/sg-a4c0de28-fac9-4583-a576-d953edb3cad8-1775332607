import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Clock, AlertCircle } from "lucide-react";
import { cifService, type CIFWithDetails } from "@/services/cifService";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidekickResearchPanel } from "@/components/staff/cif/SidekickResearchPanel";

export default function StaffCIFPage() {
  const router = useRouter();
  const { isStaff } = useApp();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [jobBoardA, setJobBoardA] = useState<CIFWithDetails[]>([]);
  const [jobBoardB, setJobBoardB] = useState<CIFWithDetails[]>([]);
  const [jobBoardC, setJobBoardC] = useState<CIFWithDetails[]>([]);
  const [rejectedCIFs, setRejectedCIFs] = useState<CIFWithDetails[]>([]);
  const [archivedCIFs, setArchivedCIFs] = useState<CIFWithDetails[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const initialCompanyNumber =
    typeof router.query.companyNumber === "string" ? router.query.companyNumber : "";

  useEffect(() => {
    if (!isStaff) {
      router.push("/home");
      return;
    }
    fetchAllBoards();
  }, [isStaff]);

  const fetchAllBoards = async () => {
    setLoading(true);
    try {
      const [boardA, boardB, boardC, rejected, archived] = await Promise.all([
        cifService.getJobBoardA(),
        cifService.getJobBoardB(),
        cifService.getJobBoardC(),
        cifService.getRejectedCIFs(),
        cifService.getArchivedCIFs()
      ]);
      setJobBoardA(boardA);
      setJobBoardB(boardB);
      setJobBoardC(boardC);
      setRejectedCIFs(rejected);
      setArchivedCIFs(archived);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load CIF job boards", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCIF = () => {
    setCreateDialogOpen(true);
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "bdm_section": return "bg-blue-500";
      case "tech_feasibility": return "bg-purple-500";
      case "financial_section": return "bg-orange-500";
      case "admin_approval": return "bg-green-500";
      case "approved": return "bg-emerald-500";
      case "rejected": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const renderCIFCard = (cif: CIFWithDetails) => {
    const prospect = cif.prospects;
    const companyName = prospect?.company_name || "Unknown Company";

    return (
      <Card key={cif.id} className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{companyName}</CardTitle>
              <CardDescription className="mt-1">
                FY: {cif.financial_year || "Not specified"}
              </CardDescription>
            </div>
            <Badge className={getStageColor(cif.current_stage)} style={{ padding: "0px 2px" }}>
              {cif.current_stage?.replace(/_/g, " ").toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Updated: {formatDate(cif.updated_at)}</span>
            </div>
            {cif.created_by_profile && (
              <div className="text-muted-foreground">
                Created by: {cif.created_by_profile.full_name || cif.created_by_profile.email}
              </div>
            )}
            {cif.estimated_claim_band && (
              <div className="text-muted-foreground">
                Est. Claim: {cif.estimated_claim_band}
              </div>
            )}
          </div>
          <Button
            className="w-full mt-4"
            onClick={() => router.push(`/staff/cif/${cif.id}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open CIF
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (!isStaff) {
    return null;
  }

  return (
    <StaffLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">CIF Pipeline</h1>
            <p className="text-muted-foreground mt-1">
              Manage Client Intake Forms from creation to claim approval
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={handleCreateCIF}>
                <Plus className="h-5 w-5 mr-2" />
                Create New CIF
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CIFCreationForm
                onSuccess={() => {
                  setCreateDialogOpen(false);
                  fetchAllBoards();
                }}
                onCancel={() => setCreateDialogOpen(false)}
                initialCompanyNumber={initialCompanyNumber}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="board-a" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="board-a" className="relative">
              BDM
              {jobBoardA.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {jobBoardA.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="board-b" className="relative">
              Feasibility
              {jobBoardB.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {jobBoardB.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="relative">
              Rejected
              {rejectedCIFs.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {rejectedCIFs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="relative">
              Archived
              {archivedCIFs.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {archivedCIFs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board-a" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>BDM – Business Development</CardTitle>
                <CardDescription>
                  CIFs that have completed BDM section and are ready for feasibility review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : jobBoardA.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No CIFs awaiting technical review
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobBoardA.map(renderCIFCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="board-b" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Feasibility – R&D Assessment</CardTitle>
                <CardDescription>
                  CIFs that have passed feasibility assessment and need financial details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : jobBoardB.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No CIFs awaiting financial section
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobBoardB.map(renderCIFCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rejected CIFs</CardTitle>
                <CardDescription>
                  CIFs that were rejected and sent back to specific stages for revision
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : rejectedCIFs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No rejected CIFs
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rejectedCIFs.map(renderCIFCard)}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archived" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Archived CIFs</CardTitle>
                <CardDescription>
                  CIFs that have been archived - prospects that may return in the future
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : archivedCIFs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No archived CIFs
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedCIFs.map(renderCIFCard)}
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

// CIF Creation Form Component
function CIFCreationForm({
  onSuccess,
  onCancel,
  initialCompanyNumber
}: {
  onSuccess: () => void;
  onCancel: () => void;
  initialCompanyNumber?: string;
}) {
  const { profileWithOrg: profile } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<"lookup" | "bdm">("lookup");
  const [companyNumber, setCompanyNumber] = useState(initialCompanyNumber || "");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [companyResearch, setCompanyResearch] = useState("");
  const [analysisData, setAnalysisData] = useState<any>(null);

  const [notificationStatus, setNotificationStatus] = useState<"required" | "not_required" | "unclear" | null>(null);
  const [notificationDeadline, setNotificationDeadline] = useState<string | null>(null);
  
  // Define formData state with explicit initial values for ALL fields
  const [formData, setFormData] = useState({
    numberOfEmployees: "",
    primaryContactName: "",
    primaryContactPosition: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    primaryContactLandline: "",
    canAnswerFeasibility: "",
    alternateContactInformed: "",
    understandsScheme: "",
    schemeUnderstandingDetails: "",
    hasClaimedBefore: "",
    previousClaimDetails: "",
    projectsDiscussed: "",
    projectsDetails: "",
    feeTermsDiscussed: "",
    feeTermsDetails: "",
    additionalInfo: "",
    // HMRC notification fields
    claimedWithinLast3Years: "",
    accountingPeriodStart: "",
    accountingPeriodEnd: "",
    internalRdContactName: "",
    internalRdContactEmail: "",
    organisationRdSummary: "",
  });

  const recomputeNotificationStatus = (nextFormData: typeof formData) => {
    const hasClaimedBeforeValue =
      nextFormData.hasClaimedBefore === "yes"
        ? true
        : nextFormData.hasClaimedBefore === "no"
        ? false
        : null;

    const claimedWithinLast3YearsValue =
      nextFormData.claimedWithinLast3Years === "yes"
        ? true
        : nextFormData.claimedWithinLast3Years === "no"
        ? false
        : null;

    let status: "required" | "not_required" | "unclear" | null = null;
    let deadline: string | null = null;

    if (
      hasClaimedBeforeValue === null ||
      (hasClaimedBeforeValue === true && claimedWithinLast3YearsValue === null) ||
      !nextFormData.accountingPeriodEnd
    ) {
      status = "unclear";
    } else {
      const end = new Date(nextFormData.accountingPeriodEnd);
      if (!Number.isNaN(end.getTime())) {
        const deadlineDate = new Date(end);
        deadlineDate.setMonth(deadlineDate.getMonth() + 6);
        deadline = deadlineDate.toISOString().slice(0, 10);
      }

      if (hasClaimedBeforeValue === false) {
        status = "required";
      } else if (claimedWithinLast3YearsValue === true) {
        status = "not_required";
      } else {
        status = "required";
      }
    }

    setNotificationStatus(status);
    setNotificationDeadline(deadline);
  };

  useEffect(() => {
    if (initialCompanyNumber) {
      setCompanyNumber(initialCompanyNumber);
    }
  }, [initialCompanyNumber]);

  const handleCompanyLookup = async () => {
    if (!companyNumber.trim()) {
      toast({ title: "Error", description: "Please enter a company number", variant: "destructive" });
      return;
    }

    setLookupLoading(true);
    setCompanyResearch("");
    
    try {
      const data = await cifService.lookupCompaniesHouse(companyNumber.trim(), true);

      if (!data) {
        toast({ title: "Error", description: "Company not found", variant: "destructive" });
        return;
      }

      if (!cifService.isCompanyActive(data.company_status)) {
        toast({
          title: "Company Inactive",
          description: "This company is dissolved or inactive and cannot be onboarded",
          variant: "destructive"
        });
        return;
      }

      setCompanyData(data);
      setStep("bdm");
      toast({ title: "Success", description: "Company found and active" });

      setResearchLoading(true);
      try {
        const researchResponse = await fetch("/api/sidekick/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: data.company_name,
            companyNumber: data.company_number,
            industry: data.sic_codes?.[0] || "Unknown"
          })
        });

        if (researchResponse.ok) {
          const researchData = await researchResponse.json();
          setAnalysisData(researchData);

          if (researchData?.feasibility_summary?.trim()) {
            setCompanyResearch(researchData.feasibility_summary);
            toast({ 
              title: "Research Complete", 
              description: "AI Companion has analyzed the company" 
            });
          }
        }
      } catch (researchError) {
        console.error("Research error:", researchError);
      } finally {
        setResearchLoading(false);
      }

    } catch (error: any) {
      console.error("Company lookup error:", error);
      toast({ title: "Error", description: error.message || "Failed to lookup company", variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateCIF = async () => {
    console.log("CIFCreationForm.handleCreateCIF clicked");

    if (!companyData || !profile?.id) {
      console.log("CreateCIF early return: missing companyData or profile", {
        hasCompanyData: !!companyData,
        profileId: profile?.id,
      });
      toast({
        title: "Missing data",
        description:
          "Company details or your user profile are not loaded yet. Please close and reopen the form.",
        variant: "destructive",
      });
      return;
    }

    // Only require fields that are actually visible and truly required
    const requiredFields: Record<string, string> = {
      "Number of Employees": formData.numberOfEmployees,
      "Primary Contact Name": formData.primaryContactName,
      "Primary Contact Email": formData.primaryContactEmail,
      "Primary Contact Phone": formData.primaryContactPhone,
      "Can Answer Feasibility": formData.canAnswerFeasibility,
      "Understands Scheme": formData.understandsScheme,
      "Has Claimed Before": formData.hasClaimedBefore,
      "Fee Terms Discussed": formData.feeTermsDiscussed,
      "Additional Information to Help Feasibility Study": formData.additionalInfo,
      // HMRC notification fields
      "Accounting Period Start Date": formData.accountingPeriodStart,
      "Accounting Period End Date": formData.accountingPeriodEnd,
      "Main Internal R&D Contact Name": formData.internalRdContactName,
      "Main Internal R&D Contact Email": formData.internalRdContactEmail,
      "High-level Innovation / R&D Summary": formData.organisationRdSummary,
    };

    // Conditional requirements tied directly to on-screen follow-up questions
    if (formData.canAnswerFeasibility === "no") {
      requiredFields["Alternate Contact Informed"] = formData.alternateContactInformed;
    }
    if (formData.understandsScheme === "yes") {
      requiredFields["Scheme Understanding Details"] = formData.schemeUnderstandingDetails;
    }
    if (formData.hasClaimedBefore === "yes") {
      requiredFields["Previous Claim Details"] = formData.previousClaimDetails;
      requiredFields["Most Recent Claim Within Last 3 Years"] =
        formData.claimedWithinLast3Years;
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === "")
      .map(([key]) => key);

    console.log("CIFCreationForm.handleCreateCIF validation", {
      formData,
      missingFields,
    });

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      console.log("CIFCreationForm.handleCreateCIF calling cifService.createCIF");
      const result = await cifService.createCIF({
        prospectData: {
          company_name: companyData.company_name,
          company_number: companyData.company_number,
          contact_name: formData.primaryContactName,
          contact_email: formData.primaryContactEmail,
          contact_phone: formData.primaryContactPhone,
          registered_address: companyData.registered_office_address?.address_line_1
            ? [
                companyData.registered_office_address.address_line_1,
                companyData.registered_office_address.address_line_2,
                companyData.registered_office_address.locality,
                companyData.registered_office_address.postal_code,
              ]
                .filter(Boolean)
                .join(", ")
            : undefined,
          sic_codes: companyData.sic_codes || [],
          incorporation_date: companyData.date_of_creation || undefined,
          number_of_employees: parseInt(formData.numberOfEmployees) || undefined,
        },
        bdmSectionData: {
          primary_contact_name: formData.primaryContactName,
          primary_contact_position: formData.primaryContactPosition || undefined,
          primary_contact_email: formData.primaryContactEmail,
          primary_contact_phone: formData.primaryContactPhone,
          primary_contact_landline: formData.primaryContactLandline || undefined,
          number_of_employees: parseInt(formData.numberOfEmployees) || undefined,
          can_answer_feasibility: formData.canAnswerFeasibility,
          alternate_contact_informed: formData.alternateContactInformed || undefined,
          understands_scheme: formData.understandsScheme,
          scheme_understanding_details:
            formData.schemeUnderstandingDetails || undefined,
          has_claimed_before:
            formData.hasClaimedBefore === "yes"
              ? true
              : formData.hasClaimedBefore === "no"
              ? false
              : null,
          previous_claim_details: formData.previousClaimDetails || undefined,
          projects_discussed: formData.projectsDiscussed,
          projects_details: formData.projectsDetails || undefined,
          fee_terms_discussed: formData.feeTermsDiscussed,
          fee_terms_details: formData.feeTermsDetails || undefined,
          additional_info: formData.additionalInfo || undefined,
          ai_research_data: analysisData || undefined,
        },
        createdBy: profile.id,
      });

      console.log("CIFCreationForm.handleCreateCIF result", result);

      if (result) {
        toast({
          title: "CIF created successfully!",
          description: "Redirecting to CIF details...",
        });
        setTimeout(() => {
          router.push(`/staff/cif/${result.cif.id}`);
        }, 1500);
        onSuccess();
      }
    } catch (error: any) {
      console.error("CIF creation error:", error);
      toast({
        title: "Failed to create CIF",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === "lookup" ? "Lookup Company" : "Complete BDM Section"}
        </DialogTitle>
        <DialogDescription>
          {step === "lookup"
            ? "Enter the Companies House number to lookup company details"
            : "Fill in the Feasibility Request Form - all fields are required"
          }
        </DialogDescription>
      </DialogHeader>

      {step === "lookup" && (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company-number">Company Number</Label>
            <Input
              id="company-number"
              placeholder="e.g. 12345678"
              value={companyNumber}
              onChange={(e) => setCompanyNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCompanyLookup()}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCompanyLookup} disabled={lookupLoading} className="flex-1">
              {lookupLoading ? "Looking up..." : "Lookup Company"}
            </Button>
            <Button onClick={onCancel} variant="outline">Cancel</Button>
          </div>
        </div>
      )}

      {step === "bdm" && companyData && (
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{companyData.company_name}</CardTitle>
              <CardDescription>
                Company #{companyData.company_number} • {companyData.company_status}
              </CardDescription>
            </CardHeader>
          </Card>

          {researchLoading && (
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="py-8">
                <div className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    RD Companion is researching this company...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Result */}
          {analysisData && (
            <SidekickResearchPanel
              analysisData={analysisData}
              fallbackText={companyResearch}
            />
          )}

          {/* BUSINESS DETAILS */}
          <div className="bg-orange-500 text-white px-4 py-2 font-semibold rounded">
            BUSINESS DETAILS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyData.company_name} disabled />
            </div>
            <div className="space-y-2">
              <Label>Company Number</Label>
              <Input value={companyData.company_number} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="num-employees">Number of Employees *</Label>
            <Input
              id="num-employees"
              type="number"
              placeholder="e.g. 50"
              value={formData.numberOfEmployees}
              onChange={(e) => setFormData(prev => ({ ...prev, numberOfEmployees: e.target.value }))}
            />
          </div>

          {/* Contact Details Section */}
          <div className="space-y-4">
            <div className="bg-orange-500 text-white px-4 py-2 font-semibold">
              CONTACT DETAILS
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryContactName">
                  Contact Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="primaryContactName"
                  value={formData.primaryContactName}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactName: e.target.value })
                  }
                  placeholder="Full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryContactPosition">Contact Position</Label>
                <Input
                  id="primaryContactPosition"
                  value={formData.primaryContactPosition}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactPosition: e.target.value })
                  }
                  placeholder="Job title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryContactEmail">
                  Contact Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="primaryContactEmail"
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactEmail: e.target.value })
                  }
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryContactPhone">
                  Contact Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="primaryContactPhone"
                  type="tel"
                  value={formData.primaryContactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactPhone: e.target.value })
                  }
                  placeholder="+44 1234 567890"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="primaryContactLandline">Contact Landline</Label>
                <Input
                  id="primaryContactLandline"
                  type="tel"
                  value={formData.primaryContactLandline}
                  onChange={(e) =>
                    setFormData({ ...formData, primaryContactLandline: e.target.value })
                  }
                  placeholder="+44 20 1234 5678"
                />
              </div>
            </div>
          </div>

          {/* START POINT INFORMATION */}
          <div className="bg-orange-500 text-white px-4 py-2 font-semibold rounded">
            START POINT INFORMATION
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Is the contact able to answer the feasibility questions? *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.canAnswerFeasibility === "yes" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, canAnswerFeasibility: "yes", alternateContactInformed: "" }))}
              >
                YES
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.canAnswerFeasibility === "no" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, canAnswerFeasibility: "no" }))}
              >
                NO
              </Button>
            </div>
          </div>

          {formData.canAnswerFeasibility === "no" && (
            <div className="space-y-2 pl-4 border-l-4 border-orange-500">
              <Label className="font-semibold">
                Has the initial contact been informed that we will need the details of someone who can? *
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={formData.alternateContactInformed === "yes" ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, alternateContactInformed: "yes" }))}
                >
                  YES
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={formData.alternateContactInformed === "no" ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, alternateContactInformed: "no" }))}
                >
                  NO
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">
              Does the person nominated for the feasibility study know about/have any understanding of the scheme? *
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.understandsScheme === "yes" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, understandsScheme: "yes" }))}
              >
                YES
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.understandsScheme === "no" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, understandsScheme: "no", schemeUnderstandingDetails: "" }))}
              >
                NO
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.understandsScheme === "dont_know" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, understandsScheme: "dont_know", schemeUnderstandingDetails: "" }))}
              >
                DON'T KNOW
              </Button>
            </div>
          </div>

          {formData.understandsScheme === "yes" && (
            <div className="space-y-2 pl-4 border-l-4 border-orange-500">
              <Label htmlFor="scheme-details">If yes, please provide details: *</Label>
              <Textarea
                id="scheme-details"
                placeholder="Describe their understanding of the scheme..."
                className="min-h-[80px]"
                value={formData.schemeUnderstandingDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, schemeUnderstandingDetails: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">Have they claimed before? *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.hasClaimedBefore === "yes" ? "default" : "outline"}
                onClick={() =>
                  setFormData(prev => {
                    const next = { ...prev, hasClaimedBefore: "yes" };
                    recomputeNotificationStatus(next);
                    return next;
                  })
                }
              >
                YES
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.hasClaimedBefore === "no" ? "default" : "outline"}
                onClick={() =>
                  setFormData(prev => {
                    const next = { ...prev, hasClaimedBefore: "no" };
                    recomputeNotificationStatus(next);
                    return next;
                  })
                }
              >
                NO
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.hasClaimedBefore === "dont_know" ? "default" : "outline"}
                onClick={() =>
                  setFormData(prev => {
                    const next = { ...prev, hasClaimedBefore: "dont_know" };
                    recomputeNotificationStatus(next);
                    return next;
                  })
                }
              >
                DON'T KNOW
              </Button>
            </div>
          </div>

          {formData.hasClaimedBefore === "yes" && (
            <div className="space-y-4 pl-4 border-l-4 border-orange-500">
              <div className="space-y-2">
                <Label htmlFor="prev-claim-details">If yes, what has been claimed? *</Label>
                <Textarea
                  id="prev-claim-details"
                  placeholder="Details of previous R&D tax credit claims..."
                  className="min-h-[80px]"
                  value={formData.previousClaimDetails}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, previousClaimDetails: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">
                  If yes, was the most recent claim within the last 3 years? *
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.claimedWithinLast3Years === "yes" ? "default" : "outline"}
                    onClick={() =>
                      setFormData(prev => {
                        const next = { ...prev, claimedWithinLast3Years: "yes" };
                        recomputeNotificationStatus(next);
                        return next;
                      })
                    }
                  >
                    YES
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.claimedWithinLast3Years === "no" ? "default" : "outline"}
                    onClick={() =>
                      setFormData(prev => {
                        const next = { ...prev, claimedWithinLast3Years: "no" };
                        recomputeNotificationStatus(next);
                        return next;
                      })
                    }
                  >
                    NO
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formData.claimedWithinLast3Years === "dont_know" ? "default" : "outline"}
                    onClick={() =>
                      setFormData(prev => {
                        const next = { ...prev, claimedWithinLast3Years: "dont_know" };
                        recomputeNotificationStatus(next);
                        return next;
                      })
                    }
                  >
                    DON'T KNOW
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* HMRC Claim Notification Check */}
          <div className="space-y-4 mt-6">
            <div className="bg-orange-500 text-white px-4 py-2 font-semibold rounded">
              HMRC CLAIM NOTIFICATION CHECK
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accounting-period-start">
                  Accounting period start date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accounting-period-start"
                  type="date"
                  value={formData.accountingPeriodStart}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      accountingPeriodStart: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accounting-period-end">
                  Accounting period end date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accounting-period-end"
                  type="date"
                  value={formData.accountingPeriodEnd}
                  onChange={(e) =>
                    setFormData(prev => {
                      const next = { ...prev, accountingPeriodEnd: e.target.value };
                      recomputeNotificationStatus(next);
                      return next;
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="internal-rd-contact-name">
                  Main internal R&amp;D contact name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="internal-rd-contact-name"
                  value={formData.internalRdContactName}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      internalRdContactName: e.target.value,
                    }))
                  }
                  placeholder="Who owns R&amp;D day to day?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internal-rd-contact-email">
                  Main internal R&amp;D contact email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="internal-rd-contact-email"
                  type="email"
                  value={formData.internalRdContactEmail}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      internalRdContactEmail: e.target.value,
                    }))
                  }
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation-rd-summary">
                High-level innovation / R&amp;D summary (company-level) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="organisation-rd-summary"
                className="min-h-[80px]"
                placeholder="One-paragraph overview of the organisation's innovation / R&amp;D activity."
                value={formData.organisationRdSummary}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    organisationRdSummary: e.target.value,
                  }))
                }
              />
            </div>

            <div className="rounded border border-dashed border-orange-500/60 bg-orange-500/5 p-3 text-sm">
              <p className="font-semibold mb-1">Notification outcome</p>
              {notificationStatus === "required" && (
                <p>
                  <span className="font-semibold text-orange-600 dark:text-orange-300">
                    Notification required
                  </span>
                  {notificationDeadline && (
                    <>
                      {" "}
                      – must be submitted by{" "}
                      <span className="font-mono">{notificationDeadline}</span>
                    </>
                  )}
                </p>
              )}
              {notificationStatus === "not_required" && (
                <p className="text-emerald-600 dark:text-emerald-300 font-semibold">
                  Notification not required based on current answers.
                </p>
              )}
              {notificationStatus === "unclear" && (
                <p className="text-yellow-600 dark:text-yellow-300">
                  Notification status is <span className="font-semibold">unclear</span>. Please confirm previous
                  claim history and the accounting period end date.
                </p>
              )}
              {!notificationStatus && (
                <p className="text-muted-foreground">
                  Complete the questions above to see whether an HMRC Claim Notification is required.
                </p>
              )}
            </div>
          </div>

          {/* ADDITIONAL FIELDS (Optional) */}
          <div className="pt-4 border-t space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold">
                Have the fee terms been discussed? <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={formData.feeTermsDiscussed === "yes" ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      feeTermsDiscussed: "yes",
                    }))
                  }
                >
                  YES
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={formData.feeTermsDiscussed === "no" ? "default" : "outline"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      feeTermsDiscussed: "no",
                    }))
                  }
                >
                  NO
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional-info">
                Any further information to help with the feasibility study?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="additional-info"
                placeholder="Any additional notes or information..."
                className="min-h-[80px]"
                value={formData.additionalInfo}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    additionalInfo: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-950 pb-2">
            <Button
              type="button"
              onClick={handleCreateCIF}
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Creating CIF..." : "Create CIF"}
            </Button>
            <Button onClick={() => setStep("lookup")} variant="outline">Back</Button>
            <Button onClick={onCancel} variant="outline">Cancel</Button>
          </div>
        </div>
      )}
    </>
  );
}