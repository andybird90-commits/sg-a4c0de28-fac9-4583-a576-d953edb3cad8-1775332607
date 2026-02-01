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
  const { profileWithOrg: profile, isStaff } = useApp();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [jobBoardA, setJobBoardA] = useState<CIFWithDetails[]>([]);
  const [jobBoardB, setJobBoardB] = useState<CIFWithDetails[]>([]);
  const [jobBoardC, setJobBoardC] = useState<CIFWithDetails[]>([]);
  const [rejectedCIFs, setRejectedCIFs] = useState<CIFWithDetails[]>([]);
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
      const [boardA, boardB, boardC, rejected] = await Promise.all([
        cifService.getJobBoardA(),
        cifService.getJobBoardB(),
        cifService.getJobBoardC(),
        cifService.getRejectedCIFs(),
      ]);
      setJobBoardA(boardA);
      setJobBoardB(boardB);
      setJobBoardC(boardC);
      setRejectedCIFs(rejected);
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
            <Badge className={getStageColor(cif.current_stage)}>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="board-a" className="relative">
              Job Board A
              {jobBoardA.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {jobBoardA.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="board-b" className="relative">
              Job Board B
              {jobBoardB.length > 0 && (
                <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                  {jobBoardB.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="board-c" className="relative">
              Job Board C
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
          </TabsList>

          <TabsContent value="board-a" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Board A – Awaiting Technical Feasibility</CardTitle>
                <CardDescription>
                  CIFs that have completed BDM section and are ready for technical review
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
                <CardTitle>Job Board B – Awaiting Financial Section</CardTitle>
                <CardDescription>
                  CIFs that have passed technical feasibility and need financial details
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
                <CardTitle>Job Board C – Awaiting Admin Sign-off</CardTitle>
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
                  CIFs that did not qualify or were rejected during review
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
        </Tabs>
      </div>
    </StaffLayout>
  );
}

// CIF Creation Form Component
function CIFCreationForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { profileWithOrg: profile } = useApp();
  const { toast } = useToast();
  
  const [step, setStep] = useState<"lookup" | "bdm">("lookup");
  const [companyNumber, setCompanyNumber] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // BDM Form Fields
  const [businessBackground, setBusinessBackground] = useState("");
  const [projectOverview, setProjectOverview] = useState("");
  const [primaryContactName, setPrimaryContactName] = useState("");
  const [primaryContactEmail, setPrimaryContactEmail] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
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
    } catch (error) {
      toast({ title: "Error", description: "Failed to lookup company", variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateCIF = async () => {
    if (!companyData || !profile?.id) return;

    if (!businessBackground || !projectOverview || !primaryContactName) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const result = await cifService.createCIF({
        prospectData: {
          company_name: companyData.company_name,
          company_number: companyData.company_number,
          registered_name: companyData.company_name,
          registered_address: JSON.stringify(companyData.registered_address),
          sic_codes: companyData.sic_codes || [],
          incorporation_date: companyData.date_of_creation,
          status: companyData.company_status,
        },
        bdmSectionData: {
          business_background: businessBackground,
          project_overview: projectOverview,
          primary_contact_name: primaryContactName,
          primary_contact_email: primaryContactEmail,
          primary_contact_phone: primaryContactPhone,
          rd_themes: rdThemes.split("\n").filter(t => t.trim()),
          expected_feasibility_date: expectedFeasibilityDate || undefined,
        },
        createdBy: profile.id,
      });

      if (result) {
        toast({ title: "Success", description: "CIF created successfully" });
        onSuccess();
      } else {
        toast({ title: "Error", description: "Failed to create CIF", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create CIF", variant: "destructive" });
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
            : "Fill in the initial business development information"
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

          <div className="space-y-2">
            <Label htmlFor="business-bg">Business Background *</Label>
            <Textarea
              id="business-bg"
              placeholder="Describe the company's business and industry..."
              value={businessBackground}
              onChange={(e) => setBusinessBackground(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-overview">Project Overview *</Label>
            <Textarea
              id="project-overview"
              placeholder="Describe the R&D project and objectives..."
              value={projectOverview}
              onChange={(e) => setProjectOverview(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-name">Primary Contact Name *</Label>
            <Input
              id="contact-name"
              placeholder="Contact person name"
              value={primaryContactName}
              onChange={(e) => setPrimaryContactName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Primary Contact Email</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="contact@company.com"
              value={primaryContactEmail}
              onChange={(e) => setPrimaryContactEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Primary Contact Phone</Label>
            <Input
              id="contact-phone"
              placeholder="+44 20 1234 5678"
              value={primaryContactPhone}
              onChange={(e) => setPrimaryContactPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rd-themes">R&D Themes (one per line)</Label>
            <Textarea
              id="rd-themes"
              placeholder="e.g. AI/ML&#10;Software Development&#10;Data Analytics"
              value={rdThemes}
              onChange={(e) => setRdThemes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feasibility-date">Expected Feasibility Date</Label>
            <Input
              id="feasibility-date"
              type="date"
              value={expectedFeasibilityDate}
              onChange={(e) => setExpectedFeasibilityDate(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
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