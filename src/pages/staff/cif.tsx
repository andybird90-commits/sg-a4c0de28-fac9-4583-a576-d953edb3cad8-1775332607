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
import { Checkbox } from "@/components/ui/checkbox";
import { MessageWidget } from "@/components/MessageWidget";

export default function StaffCIFPage() {
  const router = useRouter();
  const { profileWithOrg: profile, isStaff } = useApp();
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
      case "bdm_section":return "bg-blue-500";
      case "tech_feasibility":return "bg-purple-500";
      case "financial_section":return "bg-orange-500";
      case "admin_approval":return "bg-green-500";
      case "approved":return "bg-emerald-500";
      case "rejected":return "bg-red-500";
      default:return "bg-gray-500";
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
            {cif.created_by_profile &&
            <div className="text-muted-foreground">
                Created by: {cif.created_by_profile.full_name || cif.created_by_profile.email}
              </div>
            }
            {cif.estimated_claim_band &&
            <div className="text-muted-foreground">
                Est. Claim: {cif.estimated_claim_band}
              </div>
            }
          </div>
          <Button
            className="w-full mt-4"
            onClick={() => router.push(`/staff/cif/${cif.id}`)}>

            <ExternalLink className="h-4 w-4 mr-2" />
            Open CIF
          </Button>
        </CardContent>
      </Card>);

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
                onCancel={() => setCreateDialogOpen(false)} />

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
              Technical
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
                  CIFs that have completed BDM section and are ready for technical review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ?
                <div className="text-center py-8 text-muted-foreground">Loading...</div> :
                jobBoardA.length === 0 ?
                <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No CIFs awaiting technical review
                  </div> :

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobBoardA.map(renderCIFCard)}
                  </div>
                }
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="board-b" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Technical – Feasibility Assessment</CardTitle>
                <CardDescription>
                  CIFs that have passed technical feasibility and need financial details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ?
                <div className="text-center py-8 text-muted-foreground">Loading...</div> :
                jobBoardB.length === 0 ?
                <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No CIFs awaiting financial section
                  </div> :

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobBoardB.map(renderCIFCard)}
                  </div>
                }
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
                {loading ?
                <div className="text-center py-8 text-muted-foreground">Loading...</div> :
                jobBoardC.length === 0 ?
                <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    No CIFs awaiting admin approval
                  </div> :

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobBoardC.map(renderCIFCard)}
                  </div>
                }
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
    </StaffLayout>);

}

// CIF Creation Form Component
function CIFCreationForm({ onSuccess, onCancel }: {onSuccess: () => void;onCancel: () => void;}) {
  const { profileWithOrg: profile } = useApp();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState<"lookup" | "bdm">("lookup");
  const [companyNumber, setCompanyNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [researchSummary, setResearchSummary] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [companyResearch, setCompanyResearch] = useState("");
  const [formData, setFormData] = useState({
    businessBackground: "",
    projectOverview: "",
    primaryContactName: "",
    primaryContactPosition: "",
    primaryContactEmail: "",
    primaryContactPhone: "",
    primaryContactLandline: "",
    rdThemes: "",
    expectedFeasibilityDate: "",
    hasClaimedBefore: false,
    previousClaimYearEndDate: "",
    previousClaimValue: "",
    previousClaimDateSubmitted: "",
  });

  // BDM Form Fields
  const [businessBackground, setBusinessBackground] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactPosition, setPrimaryContactPosition] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [primaryContactLandline, setPrimaryContactLandline] = useState("");
  const [hasClaimedBefore, setHasClaimedBefore] = useState(false);
  const [previousClaimYearEnd, setPreviousClaimYearEnd] = useState("");
  const [previousClaimValue, setPreviousClaimValue] = useState("");
  const [previousClaimDateSubmitted, setPreviousClaimDateSubmitted] = useState("");
  const [rdThemes, setRdThemes] = useState("");
  const [expectedFeasibilityDate, setExpectedFeasibilityDate] = useState("");

  const handleCompanyLookup = async () => {
    if (!companyNumber.trim()) {
      toast({ title: "Error", description: "Please enter a company number", variant: "destructive" });
      return;
    }

    setLookupLoading(true);
    try {
      const data = await cifService.lookupCompaniesHouse(companyNumber);

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

      // Trigger auto-research
      performResearch(data.company_name, data.company_number);

    } catch (error) {
      toast({ title: "Error", description: "Failed to lookup company", variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!companyNumber.trim()) {
      toast({ title: "Please enter a company number", variant: "destructive" });
      return;
    }

    setLookingUp(true);
    try {
      const data = await cifService.lookupCompaniesHouse(companyNumber.trim());
      if (data) {
        setCompanyData(data);
        toast({ title: "Company found!", description: data.company_name });
        
        // Automatically fetch AI research
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
            setCompanyResearch(researchData.summary || "");
          }
        } catch (err) {
          console.error("Research fetch error:", err);
        } finally {
          setResearchLoading(false);
        }
      } else {
        toast({ title: "Company not found", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Lookup failed", description: error.message, variant: "destructive" });
    } finally {
      setLookingUp(false);
    }
  };

  const performResearch = async (name: string, number: string) => {
    setResearchLoading(true);
    try {
      const res = await fetch("/api/sidekick/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: name, companyNumber: number }),
      });
      if (res.ok) {
        const data = await res.json();
        setResearchSummary(data.summary);
        // Pre-fill business background if empty
        if (!businessBackground) {
           setBusinessBackground(data.summary);
        }
      }
    } catch (err) {
      console.error("Research failed", err);
    } finally {
      setResearchLoading(false);
    }
  };

  const handleCreateCIF = async () => {
    if (!companyData || !profile?.id) return;

    // Validate required fields
    const missingFields: string[] = [];
    if (!formData.businessBackground.trim()) missingFields.push("Business Background");
    if (!formData.projectOverview.trim()) missingFields.push("Project Overview");
    if (!formData.primaryContactName.trim()) missingFields.push("Primary Contact Name");
    
    if (missingFields.length > 0) {
      toast({ 
        title: "Missing required fields", 
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      const result = await cifService.createCIF({
        prospectData: {
          company_name: companyData.company_name,
          company_number: companyData.company_number,
          company_status: companyData.company_status,
          registered_address: `${companyData.registered_address?.address_line_1 || ""}, ${companyData.registered_address?.locality || ""}, ${companyData.registered_address?.postal_code || ""}`.trim(),
          sic_codes: companyData.sic_codes,
          incorporation_date: companyData.date_of_creation,
          number_of_directors: companyData.number_of_directors,
          number_of_employees: companyData.number_of_employees,
        },
        bdmSectionData: {
          business_background: formData.businessBackground,
          project_overview: formData.projectOverview,
          primary_contact_name: formData.primaryContactName,
          primary_contact_position: formData.primaryContactPosition || undefined,
          primary_contact_email: formData.primaryContactEmail || undefined,
          primary_contact_phone: formData.primaryContactPhone || undefined,
          primary_contact_landline: formData.primaryContactLandline || undefined,
          rd_themes: formData.rdThemes ? formData.rdThemes.split("\n").filter(t => t.trim()) : undefined,
          expected_feasibility_date: formData.expectedFeasibilityDate || undefined,
          has_claimed_before: formData.hasClaimedBefore,
          previous_claim_year_end_date: formData.previousClaimYearEndDate || undefined,
          previous_claim_value: formData.previousClaimValue ? parseFloat(formData.previousClaimValue) : undefined,
          previous_claim_date_submitted: formData.previousClaimDateSubmitted || undefined,
          company_research: companyResearch,
        },
        createdBy: profile.id,
      });

      if (result) {
        toast({ title: "CIF created successfully!", description: "Redirecting to CIF details..." });
        setTimeout(() => {
          router.push(`/staff/cif/${result.cif.id}`);
        }, 1500);
      } else {
        throw new Error("Failed to create CIF");
      }
    } catch (error: any) {
      console.error("CIF creation error:", error);
      toast({ title: "Failed to create CIF", description: error.message || "Unknown error", variant: "destructive" });
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
          {step === "lookup" ?
          "Enter the Companies House number to lookup company details" :
          "Fill in the initial business development information"
          }
        </DialogDescription>
      </DialogHeader>

      {step === "lookup" &&
      <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company-number">Company Number</Label>
            <Input
            id="company-number"
            placeholder="e.g. 12345678"
            value={companyNumber}
            onChange={(e) => setCompanyNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCompanyLookup()} />

          </div>
          <div className="flex gap-3">
            <Button onClick={handleCompanyLookup} disabled={lookupLoading} className="flex-1">
              {lookupLoading ? "Looking up..." : "Lookup Company"}
            </Button>
            <Button onClick={onCancel} variant="outline">Cancel</Button>
          </div>
        </div>
      }

      {step === "bdm" && companyData &&
      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{companyData.company_name}</CardTitle>
              <CardDescription>
                Company #{companyData.company_number} • {companyData.company_status}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Company Research Summary */}
          {companyResearch && (
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  RD Sidekick Research
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {companyResearch}
                </p>
              </CardContent>
            </Card>
          )}

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

            <div className="space-y-2">
              <Label htmlFor="business-bg">Business Background *</Label>
              <Textarea
                id="business-bg"
                placeholder="Brief description of the business and what they do..."
                className="min-h-[100px]"
                value={formData.businessBackground}
                onChange={(e) => setFormData(prev => ({ ...prev, businessBackground: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-overview">Project Overview *</Label>
              <Textarea
                id="project-overview"
                placeholder="Description of the R&D project or technical challenges..."
                className="min-h-[100px]"
                value={formData.projectOverview}
                onChange={(e) => setFormData(prev => ({ ...prev, projectOverview: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Primary Contact Name *</Label>
                <Input
                  id="contact-name"
                  placeholder="Full name"
                  value={formData.primaryContactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryContactName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-position">Primary Contact Position</Label>
                <Input
                  id="contact-position"
                  placeholder="Job title"
                  value={formData.primaryContactPosition}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryContactPosition: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-email">Primary Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.primaryContactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryContactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Primary Contact Phone</Label>
                <Input
                  id="contact-phone"
                  placeholder="+44 1234 567890"
                  value={formData.primaryContactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryContactPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-landline">Primary Contact Landline</Label>
              <Input
                id="contact-landline"
                placeholder="+44 20 1234 5678"
                value={formData.primaryContactLandline}
                onChange={(e) => setFormData(prev => ({ ...prev, primaryContactLandline: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rd-themes">R&D Themes (one per line)</Label>
              <Textarea
                id="rd-themes"
                placeholder="e.g. AI/ML&#10;Software Development&#10;Data Analytics"
                className="min-h-[100px]"
                value={formData.rdThemes}
                onChange={(e) => setFormData(prev => ({ ...prev, rdThemes: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feasibility-date">Expected Feasibility Date</Label>
              <Input
                id="feasibility-date"
                type="date"
                value={formData.expectedFeasibilityDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expectedFeasibilityDate: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="claimed-before"
                className="rounded border-gray-300"
                checked={formData.hasClaimedBefore}
                onChange={(e) => setFormData(prev => ({ ...prev, hasClaimedBefore: e.target.checked }))}
              />
              <Label htmlFor="claimed-before">Has the company claimed before?</Label>
            </div>

            {formData.hasClaimedBefore && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                <div className="space-y-2">
                  <Label htmlFor="prev-year-end">Previous Claim Year End Date</Label>
                  <Input
                    id="prev-year-end"
                    type="date"
                    value={formData.previousClaimYearEndDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, previousClaimYearEndDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prev-value">Previous Claim Value (£)</Label>
                  <Input
                    id="prev-value"
                    type="number"
                    placeholder="25000"
                    value={formData.previousClaimValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, previousClaimValue: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prev-submitted">Previous Claim Date Submitted</Label>
                  <Input
                    id="prev-submitted"
                    type="date"
                    value={formData.previousClaimDateSubmitted}
                    onChange={(e) => setFormData(prev => ({ ...prev, previousClaimDateSubmitted: e.target.value }))}
                  />
                </div>
              </div>
            )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleCreateCIF} disabled={saving} className="flex-1">
              {saving ? "Creating CIF..." : "Create CIF"}
            </Button>
            <Button onClick={() => setStep("lookup")} variant="outline">Back</Button>
            <Button onClick={onCancel} variant="outline">Cancel</Button>
          </div>
        </div>
      }
    </>);

}