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
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="board-a" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="board-c" className="relative">
              Financial
              {jobBoardC.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {jobBoardC.length}
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

          <TabsContent value="board-c" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial – Cost Analysis</CardTitle>
                <CardDescription>
                  CIFs ready for final admin approval and claim creation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : jobBoardC.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No CIFs awaiting admin approval
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobBoardC.map(renderCIFCard)}
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
function CIFCreationForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { profileWithOrg: profile } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<"lookup" | "bdm">("lookup");
  const [companyNumber, setCompanyNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [companyResearch, setCompanyResearch] = useState("");
  const [analysisData, setAnalysisData] = useState<any>(null);
  
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
  });

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
              description: "AI Sidekick has analyzed the company" 
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
    if (!companyData || !profile?.id) return;

    // Validate all required fields
    const requiredFields = {
      "Number of Employees": formData.numberOfEmployees,
      "Primary Contact Name": formData.primaryContactName,
      "Primary Contact Email": formData.primaryContactEmail,
      "Primary Contact Phone": formData.primaryContactPhone,
      "Can Answer Feasibility": formData.canAnswerFeasibility,
      "Understands Scheme": formData.understandsScheme,
      "Has Claimed Before": formData.hasClaimedBefore,
      "Projects Discussed": formData.projectsDiscussed,
      "Fee Terms Discussed": formData.feeTermsDiscussed,
    };

    // Add conditional required fields
    if (formData.canAnswerFeasibility === "no") {
      requiredFields["Alternate Contact Informed"] = formData.alternateContactInformed;
    }
    if (formData.understandsScheme === "yes") {
      requiredFields["Scheme Understanding Details"] = formData.schemeUnderstandingDetails;
    }
    if (formData.hasClaimedBefore === "yes") {
      requiredFields["Previous Claim Details"] = formData.previousClaimDetails;
    }
    if (formData.projectsDiscussed === "yes") {
      requiredFields["Projects Details"] = formData.projectsDetails;
    }
    if (formData.feeTermsDiscussed === "yes") {
      requiredFields["Fee Terms Details"] = formData.feeTermsDetails;
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === "")
      .map(([key]) => key);

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
          scheme_understanding_details: formData.schemeUnderstandingDetails || undefined,
          has_claimed_before: formData.hasClaimedBefore === "yes" ? true : formData.hasClaimedBefore === "no" ? false : null,
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

      if (result) {
        toast({ title: "CIF created successfully!", description: "Redirecting to CIF details..." });
        setTimeout(() => {
          router.push(`/staff/cif/${result.cif.id}`);
        }, 1500);
      }
    } catch (error: any) {
      console.error("CIF creation error:", error);
      toast({ 
        title: "Failed to create CIF", 
        description: error.message || "Unknown error occurred",
        variant: "destructive" 
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
                    RD Sidekick is researching this company...
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis Result */}
          {analysisData && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                RD Sidekick Research
              </h3>
              <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {analysisData}
              </div>
            </div>
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
                onClick={() => setFormData(prev => ({ ...prev, hasClaimedBefore: "yes" }))}
              >
                YES
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.hasClaimedBefore === "no" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, hasClaimedBefore: "no", previousClaimDetails: "" }))}
              >
                NO
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.hasClaimedBefore === "dont_know" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, hasClaimedBefore: "dont_know", previousClaimDetails: "" }))}
              >
                DON'T KNOW
              </Button>
            </div>
          </div>

          {formData.hasClaimedBefore === "yes" && (
            <div className="space-y-2 pl-4 border-l-4 border-orange-500">
              <Label htmlFor="prev-claim-details">If yes, what has been claimed? *</Label>
              <Textarea
                id="prev-claim-details"
                placeholder="Details of previous R&D tax credit claims..."
                className="min-h-[80px]"
                value={formData.previousClaimDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, previousClaimDetails: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">Have any projects been discussed? *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.projectsDiscussed === "yes" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, projectsDiscussed: "yes" }))}
              >
                YES
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.projectsDiscussed === "no" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, projectsDiscussed: "no", projectsDetails: "" }))}
              >
                NO
              </Button>
            </div>
          </div>

          {formData.projectsDiscussed === "yes" && (
            <div className="space-y-2 pl-4 border-l-4 border-orange-500">
              <Label htmlFor="projects-details">If yes, what projects have been discussed? *</Label>
              <Textarea
                id="projects-details"
                placeholder="Describe the R&D projects discussed..."
                className="min-h-[100px]"
                value={formData.projectsDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, projectsDetails: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold">Have the fee terms been discussed? *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.feeTermsDiscussed === "yes" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, feeTermsDiscussed: "yes" }))}
              >
                YES
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.feeTermsDiscussed === "no" ? "default" : "outline"}
                onClick={() => setFormData(prev => ({ ...prev, feeTermsDiscussed: "no", feeTermsDetails: "" }))}
              >
                NO
              </Button>
            </div>
          </div>

          {formData.feeTermsDiscussed === "yes" && (
            <div className="space-y-2 pl-4 border-l-4 border-orange-500">
              <Label htmlFor="fee-terms-details">If yes, what terms have been discussed? *</Label>
              <Textarea
                id="fee-terms-details"
                placeholder="Details of fee structure and terms discussed..."
                className="min-h-[100px]"
                value={formData.feeTermsDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, feeTermsDetails: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="additional-info">Any further information to help with the feasibility study?</Label>
            <Textarea
              id="additional-info"
              placeholder="Any additional notes or information..."
              className="min-h-[100px]"
              value={formData.additionalInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, additionalInfo: e.target.value }))}
            />
          </div>

          {/* ADDITIONAL FIELDS (Optional) */}
          <div className="pt-4 border-t">
            {/* Business Background and Project Overview removed */}
          </div>

          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white dark:bg-gray-950 pb-2">
            <Button onClick={handleCreateCIF} disabled={saving} className="flex-1">
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