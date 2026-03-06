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
import { messageService } from "@/services/messageService";
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
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { sidekickCostAdviceService } from "@/services/sidekickCostAdviceService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";

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

type HmrcResponseItem = {
  question: string;
  team_response: string;
};

// Helper component for project cards with workflow actions
function ProjectCard({
  project,
  showClaimButton,
  showSendToClient,
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
    const now = new Date();
    let target: Date | null = null;

    if (project.due_date) {
      target = new Date(project.due_date);
    } else if (project.submitted_to_team_at) {
      const slaHours = 48;
      target = new Date(project.submitted_to_team_at);
      target.setHours(target.getHours() + slaHours);
    }

    if (!target) return null;
    const hoursLeft =
      (target.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (hoursLeft < 24) {
      return (
        <Badge className="bg-orange-500 text-slate-950">
          {Math.floor(hoursLeft)}h left
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-500 text-slate-950">
          {Math.floor(hoursLeft / 24)}d left
        </Badge>
      );
    }
  };

  const getWorkflowLabel = (status?: string | null) => {
    switch (status) {
      case "submitted_to_team":
        return "Pending review";
      case "team_in_progress":
        return "In progress";
      case "awaiting_client_review":
        return "Awaiting client";
      case "revision_requested":
        return "Revisions requested";
      case "approved":
        return "Approved";
      default:
        return status || "draft";
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        project.workflow_status === "submitted_to_team"
          ? "border-orange-500/80 bg-orange-500/5"
          : "hover:bg-accent/50"
      }`}
    >
      <Link href={`/staff/claims/projects/${project.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-medium break-words">{project.name}</h4>
              <Badge variant="outline">
                {getWorkflowLabel(project.workflow_status)}
              </Badge>
              {project.workflow_status === "submitted_to_team" && (
                <Badge className="bg-orange-500 text-slate-950">
                  Pending from client
                </Badge>
              )}
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
        {showClaimButton &&
          !project.assigned_to_user_id &&
          false && (
            <Button
              onClick={handleClaimProject}
              disabled={claiming}
              size="sm"
            >
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
  const [clientCostAdviceCounts, setClientCostAdviceCounts] = useState<Record<string, number>>({});

  // Available sidekick projects for import
  const [sidekickProjects, setSidekickProjects] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // AI Sidekick state
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showSendAnalysisDialog, setShowSendAnalysisDialog] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [hmrcAnalysis, setHmrcAnalysis] = useState<string>("");
  const [loadingHmrcAnalysis, setLoadingHmrcAnalysis] = useState(false);

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
  const [clientCostTotalsByType, setClientCostTotalsByType] = useState<
    Record<string, { total: number; count: number }>
  >({});
  const [clientTotalCost, setClientTotalCost] = useState(0);
  const [clientCostEntryCount, setClientCostEntryCount] = useState(0);
  const [clientProjectCostSummary, setClientProjectCostSummary] = useState<
    Record<
      string,
      {
        total: number;
        count: number;
        byType: Record<string, { total: number; count: number }>;
      }
    >
  >({});
  const [clientEvidenceByProject, setClientEvidenceByProject] = useState<
    Record<
      string,
      Array<{
        id: string;
        projectId: string;
        title: string | null;
        type: string;
        createdAt: string;
        externalUrl?: string | null;
        body?: string | null;
      }>
    >
  >({});
  const [saving, setSaving] = useState(false);

  // Document management state
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("supporting_evidence");
  const [documentProjectId, setDocumentProjectId] = useState("");

  const [qaAdmins, setQaAdmins] = useState<
    { id: string; full_name: string | null; email: string | null }[]
  >([]);
  const [selectedQaAdmin, setSelectedQaAdmin] = useState("");
  const [loadingQaAdmins, setLoadingQaAdmins] = useState(false);
  const [submittingQa, setSubmittingQa] = useState(false);
  const [qaActionLoading, setQaActionLoading] = useState(false);
  const [qaFeedback, setQaFeedback] = useState("");
  const [clientActionLoading, setClientActionLoading] = useState(false);
  const [clientFeedback, setClientFeedback] = useState("");
  const [hmrcActionLoading, setHmrcActionLoading] = useState(false);

  const [hmrcResponses, setHmrcResponses] = useState<HmrcResponseItem[]>([]);
  const [outcomeSubmittedValue, setOutcomeSubmittedValue] = useState("");
  const [outcomeReceivedValue, setOutcomeReceivedValue] = useState("");
  const [schemeDraft, setSchemeDraft] = useState("");
  const [savingScheme, setSavingScheme] = useState(false);

  // New state for draft/finalise actions
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [finalisingPack, setFinalisingPack] = useState(false);
  const [draftSummary, setDraftSummary] = useState<any | null>(null);
  const [finaliseSummary, setFinaliseSummary] = useState<any | null>(null);
  const [downloadingDraftPdf, setDownloadingDraftPdf] = useState(false);
  const [downloadingFinalPdf, setDownloadingFinalPdf] = useState(false);

  // Projects tab state
  const [projects, setProjects] = useState<ClaimProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const loadClaim = async (claimId: string): Promise<void> => {
    try {
      setLoading(true);
      setLoadingProjects(true);

      const loaded = await claimService.getClaimById(claimId);
      if (!loaded) {
        setClaim(null);
        return;
      }

      setClaim(loaded);

      const existingHmrc =
        (loaded.hmrc_responses as HmrcResponseItem[] | null) ?? [];
      setHmrcResponses(existingHmrc);

      setOutcomeSubmittedValue(
        loaded.submitted_claim_value != null
          ? String(loaded.submitted_claim_value)
          : ""
      );
      setOutcomeReceivedValue(
        loaded.received_claim_value != null
          ? String(loaded.received_claim_value)
          : ""
      );

      const existingScheme =
        ((loaded as any).scheme_type as string | null) ??
        ((loaded as any).scheme as string | null) ??
        "";
      setSchemeDraft(existingScheme || "");

      const claimProjects =
        (loaded.projects as ClaimProject[] | null) ?? [];
      setProjects(claimProjects);

      // Reset client-side aggregated cost state
      setClientCostTotalsByType({});
      setClientTotalCost(0);
      setClientCostEntryCount(0);
      setClientProjectCostSummary({});
      setClientEvidenceByProject({});

      // Load client-side cost advice from linked sidekick projects
      const sidekickIds = claimProjects
        .map((p) => p.source_sidekick_project_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

      if (sidekickIds.length > 0) {
        try {
          const [adviceResults, evidenceResults] = await Promise.all([
            Promise.all(
              sidekickIds.map(async (sidekickId) => {
                const advice =
                  (await sidekickCostAdviceService.getByProject(sidekickId)) ??
                  [];
                return { sidekickId, advice };
              })
            ),
            Promise.all(
              sidekickIds.map(async (sidekickId) => {
                try {
                  const evidenceItems =
                    (await sidekickEvidenceService.getEvidenceByProject(
                      sidekickId
                    )) ?? [];
                  return { sidekickId, evidenceItems };
                } catch (e) {
                  console.error(
                    "[ClaimDetailPage.loadClaim] Error loading client evidence for sidekick project",
                    { sidekickId, error: e }
                  );
                  return { sidekickId, evidenceItems: [] };
                }
              })
            ),
          ]);

          const adviceMap = new Map<string, any[]>();
          adviceResults.forEach(({ sidekickId, advice }) => {
            adviceMap.set(sidekickId, advice);
          });

          const evidenceMap = new Map<string, any[]>();
          evidenceResults.forEach(({ sidekickId, evidenceItems }) => {
            evidenceMap.set(sidekickId, evidenceItems);
          });

          const totalsByType: Record<
            string,
            { total: number; count: number }
          > = {};
          let overallTotal = 0;
          let overallCount = 0;

          const projectSummaries: {
            [projectId: string]: {
              total: number;
              count: number;
              byType: Record<string, { total: number; count: number }>;
            };
          } = {};

          const projectEvidence: Record<
            string,
            Array<{
              id: string;
              projectId: string;
              title: string | null;
              type: string;
              createdAt: string;
              externalUrl?: string | null;
              body?: string | null;
            }>
          > = {};

          claimProjects.forEach((project) => {
            const sidekickId = project.source_sidekick_project_id;
            if (!sidekickId) return;

            const adviceItems = adviceMap.get(sidekickId) ?? [];
            const evidenceItems = evidenceMap.get(sidekickId) ?? [];

            if (adviceItems.length) {
              let projectTotal = 0;
              let projectCount = 0;
              const projectByType: Record<
                string,
                { total: number; count: number }
              > = {};

              adviceItems.forEach((item: any) => {
                const type =
                  (item.cost_type as string | null | undefined) || "other";
                const amount = Number(item.amount || 0);
                if (!Number.isFinite(amount) || amount <= 0) {
                  return;
                }

                // Global totals by type
                if (!totalsByType[type]) {
                  totalsByType[type] = { total: 0, count: 0 };
                }
                totalsByType[type].total += amount;
                totalsByType[type].count += 1;

                // Per-project totals
                if (!projectByType[type]) {
                  projectByType[type] = { total: 0, count: 0 };
                }
                projectByType[type].total += amount;
                projectByType[type].count += 1;

                projectTotal += amount;
                projectCount += 1;
                overallTotal += amount;
                overallCount += 1;
              });

              if (projectCount > 0) {
                projectSummaries[project.id] = {
                  total: projectTotal,
                  count: projectCount,
                  byType: projectByType,
                };
              }
            }

            if (evidenceItems.length) {
              projectEvidence[project.id] = evidenceItems.map((item: any) => ({
                id: item.id as string,
                projectId: project.id,
                title: (item.title as string | null | undefined) ?? null,
                type: (item.type as string) || "note",
                createdAt: item.created_at as string,
                externalUrl:
                  (item.external_url as string | null | undefined) ?? null,
                body: (item.body as string | null | undefined) ?? null,
              }));
            }
          });

          if (overallCount > 0) {
            setClientCostTotalsByType(totalsByType);
            setClientTotalCost(overallTotal);
            setClientCostEntryCount(overallCount);
            setClientProjectCostSummary(projectSummaries);
          }

          setClientEvidenceByProject(projectEvidence);
        } catch (clientSideError) {
          console.error(
            "[ClaimDetailPage.loadClaim] Error loading client cost advice / evidence:",
            clientSideError
          );
        }
      }
    } catch (error) {
      console.error("Error loading claim:", error);
      toast({
        title: "Error loading claim",
        description:
          "We could not load the latest details for this claim. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingProjects(false);
    }
  };

  // Load claim details when id is available
  useEffect(() => {
    if (!id || typeof id !== "string") return;
    void loadClaim(id);
  }, [id, toast]);

  // Placeholder QA submission handler so the button works without breaking the build
  const handleSubmitForQa = async (): Promise<void> => {
    toast({
      title: "QA workflow",
      description:
        "Submit for QA is not fully wired yet. The workflow will be completed in a later iteration.",
    });
  };

  // Main Companion analysis for the claim (separate from HMRC responses helper)
  const handleGenerateAnalysis = async (): Promise<void> => {
    if (!claim) return;

    try {
      setLoadingAnalysis(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast({
          title: "Not authenticated",
          description:
            "You need to be logged in to generate Companion analysis for this claim.",
          variant: "destructive",
        });
        setLoadingAnalysis(false);
        return;
      }

      const response = await fetch("/api/claims/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          claimId: claim.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI analysis");
      }

      const data = await response.json();
      setAiAnalysis(data.analysis);

      toast({
        title: "Analysis ready",
        description: "AI Companion analysis has been generated for this claim.",
      });
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI analysis for this claim.",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleGenerateDraftPack = async (): Promise<void> => {
    if (!claim) return;

    try {
      setGeneratingDraft(true);

      // Get current Supabase session so we can pass the JWT to the API
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/rd/claims/${encodeURIComponent(
          claim.id
        )}/pdf/draft`,
        {
          method: "POST",
          headers: session?.access_token
            ? {
                Authorization: `Bearer ${session.access_token}`,
              }
            : undefined,
        }
      );

      const text = await response.text();
      let parsed: { ok: boolean; error?: string; pdf_url?: string } | null = null;

      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }

      if (!response.ok || !parsed || !parsed.ok) {
        const message =
          parsed?.error ||
          (text && text.length < 500 ? text : "Failed to generate draft pack");
        toast({
          title: "Draft pack generation failed",
          description: message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Draft pack generated",
        description: "The draft R&D claim pack PDF has been saved for this claim.",
      });

      // Optionally refetch claim or update local state if you display draft_pdf_url
    } catch (error: any) {
      console.error("Error generating draft pack:", error);
      toast({
        title: "Draft pack generation failed",
        description:
          error?.message || "An unexpected error occurred while generating the draft pack.",
        variant: "destructive",
      });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleFinaliseClaimPack = async (): Promise<void> => {
    if (!claim) return;

    setFinalisingPack(true);
    setFinaliseSummary(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast({
          title: "Not authenticated",
          description:
            "You need to be logged in again before finalising the claim pack.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `/api/rd/claims/${claim.id}/finalise-pack`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const raw = await response.text();
      let data: any = null;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (parseError) {
          console.error(
            "Unexpected non-JSON response from finalise-pack:",
            {
              raw,
              parseError,
            }
          );
        }
      }

      if (response.status === 401) {
        toast({
          title: "Not authorised",
          description:
            (data && (data.error || data.message)) ||
            "Your session may have expired or you do not have access to finalise this claim.",
          variant: "destructive",
        });
        return;
      }

      if (!response.ok || !data || data.ok !== true) {
        const message =
          (data && (data.error || data.message)) ||
          `Failed to finalise claim pack (status ${response.status})`;

        toast({
          title: "Error finalising claim pack",
          description: message,
          variant: "destructive",
        });

        return;
      }

      if (data && typeof data === "object") {
        if ("summary" in data) {
          setFinaliseSummary((data as any).summary);
        } else {
          setFinaliseSummary(data);
        }
      }

      toast({
        title: "Claim pack finalised",
        description:
          (data && ((data as any).summaryText || (data as any).message)) ||
          "Projects locked and claim pack is ready for submission.",
      });
    } catch (error: any) {
      console.error("Error finalising claim pack:", error);

      toast({
        title: "Error finalising claim pack",
        description:
          error?.message ||
          "An unexpected error occurred while finalising the pack.",
        variant: "destructive",
      });
    } finally {
      setFinalisingPack(false);
    }
  };

  const handleDownloadDraftPdf = async (): Promise<void> => {
    if (!claim) return;

    try {
      setDownloadingDraftPdf(true);

      // Ensure we have a valid Supabase session/JWT for the API call
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast({
          title: "Not authenticated",
          description:
            "You need to be logged in to download the draft claim pack.",
          variant: "destructive",
        });
        setDownloadingDraftPdf(false);
        return;
      }

      const response = await fetch(
        `/api/rd/claims/${claim.id}/pdf/draft`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const raw = await response.text();
      let data: any = null;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (parseError) {
          console.error(
            "Unexpected non-JSON response from draft PDF API:",
            {
              raw,
              parseError,
            }
          );
        }
      }

      if (!response.ok || !data || data.ok !== true) {
        const message =
          (data && (data.error || data.message)) ||
          `Failed to generate draft PDF (status ${response.status})`;

        toast({
          title: "Error downloading draft pack",
          description: message,
          variant: "destructive",
        });
        return;
      }

      const pdfPath = (data as { pdf_url?: string }).pdf_url;

      if (!pdfPath) {
        toast({
          title: "Error downloading draft pack",
          description: "Draft PDF generated but no file path was returned.",
          variant: "destructive",
        });
        return;
      }

      // Draft PDFs are stored in the Draft-Claims bucket (final packs use Submitted-Claims)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("Draft-Claims")
        .download(pdfPath);

      if (downloadError || !fileData) {
        console.error(
          "Error downloading draft PDF from storage:",
          downloadError
        );
        toast({
          title: "Error downloading draft pack",
          description:
            downloadError?.message ||
            "Failed to download the draft PDF from storage.",
          variant: "destructive",
        });
        return;
      }

      const url = window.URL.createObjectURL(fileData);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claim-${claim.id}-draft-pack.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Draft pack downloaded",
        description: "Draft claim PDF has been downloaded.",
      });
    } catch (error: any) {
      console.error("Unexpected error downloading draft PDF:", error);
      toast({
        title: "Error downloading draft pack",
        description:
          error?.message ||
          "An unexpected error occurred while downloading the draft PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingDraftPdf(false);
    }
  };

  const handleDownloadFinalPdf = async (): Promise<void> => {
    if (!claim) return;

    try {
      setDownloadingFinalPdf(true);

      const response = await fetch(
        `/api/rd/claims/${claim.id}/pdf/final`,
        {
          method: "POST",
        }
      );

      const raw = await response.text();
      let data: any = null;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (parseError) {
          console.error(
            "Unexpected non-JSON response from final PDF API:",
            {
              raw,
              parseError,
            }
          );
        }
      }

      if (!response.ok || !data || data.ok !== true) {
        const message =
          (data && (data.error || data.message)) ||
          `Failed to generate final PDF (status ${response.status})`;

        toast({
          title: "Error downloading final pack",
          description: message,
          variant: "destructive",
        });
        return;
      }

      const pdfPath = (data as { pdf_url?: string }).pdf_url;

      if (!pdfPath) {
        toast({
          title: "Error downloading final pack",
          description: "Final PDF generated but no file path was returned.",
          variant: "destructive",
        });
        return;
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("Submitted-Claims")
        .download(pdfPath);

      if (downloadError || !fileData) {
        console.error(
          "Error downloading final PDF from storage:",
          downloadError
        );
        toast({
          title: "Error downloading final pack",
          description:
            downloadError?.message ||
            "Failed to download the final PDF from storage.",
          variant: "destructive",
        });
        return;
      }

      const url = window.URL.createObjectURL(fileData);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claim-${claim.id}-final-pack.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Final pack downloaded",
        description: "Final claim PDF has been downloaded.",
      });
    } catch (error: any) {
      console.error("Unexpected error downloading final PDF:", error);
      toast({
        title: "Error downloading final pack",
        description:
          error?.message ||
          "An unexpected error occurred while downloading the final PDF.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFinalPdf(false);
    }
  };

  const handleHmrcCompanion = async (): Promise<void> => {
    if (!claim) return;

    try {
      setLoadingHmrcAnalysis(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast({
          title: "Not authenticated",
          description: "You need to be logged in to use Companion on HMRC responses.",
          variant: "destructive",
        });
        setLoadingHmrcAnalysis(false);
        return;
      }

      const response = await fetch("/api/claims/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          claimId: claim.id,
          hmrcResponses,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate HMRC response analysis");
      }

      const data = await response.json();
      setHmrcAnalysis(data.analysis);

      toast({
        title: "Companion ready",
        description: "HMRC responses have been reviewed. See suggestions below.",
      });
    } catch (error) {
      console.error("Error generating HMRC response analysis:", error);
      toast({
        title: "Error",
        description: "Failed to generate Companion suggestions for HMRC responses",
        variant: "destructive",
      });
    } finally {
      setLoadingHmrcAnalysis(false);
    }
  };

  const handleSendAnalysis = async () => {
    if (!claim || !profile || !aiAnalysis || !sendTo) return;

    try {
      setSendingMessage(true);

      // Use messageService to handle message creation and recipient linking
      await messageService.sendMessage(
        claim.org_id,
        [sendTo], // recipientIds
        `AI Analysis: ${claim.organisations?.name} - FY ${claim.claim_year}`, // subject
        aiAnalysis, // body
        undefined, // parentMessageId
        { entity_type: "claim", entity_id: claim.id } // context
      );

      toast({ title: "Success", description: "AI analysis sent successfully" });
      setShowSendAnalysisDialog(false);
      setSendTo("");
    } catch (error) {
      console.error("Error sending analysis:", error);
      toast({
        title: "Error",
        description: "Failed to send analysis",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!claim || !selectedFile || !profile) return;

    try {
      setUploadingDocument(true);
      const projectId =
        documentProjectId === "none" ? null : documentProjectId || null;

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${claim.id}_${Date.now()}.${fileExt}`;
      const filePath = `claim_documents/${fileName}`;

      // Upload to evidence-files storage bucket
      const { error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record with project assignment
      await claimService.createDocument({
        claim_id: claim.id,
        org_id: claim.org_id,
        project_id: projectId,
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
      setDocumentProjectId("");
      if (id && typeof id === "string") loadClaim(id);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDownloadDocument = async (doc: ClaimDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("evidence-files")
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "Success", description: "Document downloaded" });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleQaApprove = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setQaActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "final_signoff" as any,
        qa_completed_at: new Date().toISOString(),
      });

      const recipients = [
        claim.bd_owner_id,
        claim.technical_lead_id,
        claim.cost_lead_id,
      ].filter(Boolean) as string[];

      if (recipients.length > 0) {
        await messageService.sendMessage(
          claim.org_id,
          recipients,
          `Claim QA approved: ${claim.organisations?.name || ""} - FY ${
            claim.claim_year
          }`,
          `QA reviewer has approved this claim for client review.${
            qaFeedback ? `\n\nQA notes:\n${qaFeedback}` : ""
          }`,
          undefined,
          { entity_type: "claim", entity_id: claim.id }
        );
      }

      toast({
        title: "QA approved",
        description: "Claim is now ready to be issued to the client for comment.",
      });

      setQaFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error approving QA:", error);
      toast({
        title: "Error",
        description: "Failed to record QA approval",
        variant: "destructive",
      });
    } finally {
      setQaActionLoading(false);
    }
  };

  const handleQaReturnWithComments = async (): Promise<void> => {
    if (!claim || !profile) return;

    if (!qaFeedback.trim()) {
      toast({
        title: "Add feedback",
        description: "Please add comments before returning the claim.",
        variant: "destructive",
      });
      return;
    }

    try {
      setQaActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "in_progress" as any,
        qa_completed_at: new Date().toISOString(),
      });

      const recipients = [
        claim.bd_owner_id,
        claim.technical_lead_id,
        claim.cost_lead_id,
      ].filter(Boolean) as string[];

      if (recipients.length > 0) {
        await messageService.sendMessage(
          claim.org_id,
          recipients,
          `Claim returned with QA comments: ${claim.organisations?.name || ""} - FY ${
            claim.claim_year
          }`,
          qaFeedback,
          undefined,
          { entity_type: "claim", entity_id: claim.id }
        );
      }

      toast({
        title: "Returned with comments",
        description: "QA feedback has been sent to the delivery team.",
      });

      setQaFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error returning claim with QA comments:", error);
      toast({
        title: "Error",
        description: "Failed to return claim with comments",
        variant: "destructive",
      });
    } finally {
      setQaActionLoading(false);
    }
  };

  const handleIssueToClient = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setClientActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "client_review" as any,
        client_review_requested_at: new Date().toISOString(),
      });

      toast({
        title: "Issued to client",
        description: "Claim has been issued to the client for comment.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error issuing claim to client:", error);
      toast({
        title: "Error",
        description: "Failed to issue claim to client",
        variant: "destructive",
      });
    } finally {
      setClientActionLoading(false);
    }
  };

  const handleClientApprove = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setClientActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "ready_to_file" as any,
        client_review_completed_at: new Date().toISOString(),
      });

      toast({
        title: "Client approved",
        description: "Client approval recorded. Claim is ready to file with HMRC.",
      });

      setClientFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error recording client approval:", error);
      toast({
        title: "Error",
        description: "Failed to record client approval",
        variant: "destructive",
      });
    } finally {
      setClientActionLoading(false);
    }
  };

  const handleClientComments = async (): Promise<void> => {
    if (!claim || !profile) return;

    if (!clientFeedback.trim()) {
      toast({
        title: "Add client comments",
        description: "Please add the client feedback before recording.",
        variant: "destructive",
      });
      return;
    }

    try {
      setClientActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "in_progress" as any,
        client_review_completed_at: new Date().toISOString(),
      });

      const recipients = [
        claim.bd_owner_id,
        claim.technical_lead_id,
        claim.cost_lead_id,
      ].filter(Boolean) as string[];

      if (recipients.length > 0) {
        await messageService.sendMessage(
          claim.org_id,
          recipients,
          `Client comments on claim: ${claim.organisations?.name || ""} - FY ${
            claim.claim_year
          }`,
          clientFeedback,
          undefined,
          { entity_type: "claim", entity_id: claim.id }
        );
      }

      toast({
        title: "Client comments recorded",
        description: "Client feedback has been logged. Claim moved back to draft.",
      });

      setClientFeedback("");
      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error recording client comments:", error);
      toast({
        title: "Error",
        description: "Failed to record client comments",
        variant: "destructive",
      });
    } finally {
      setClientActionLoading(false);
    }
  };

  const handleIssueToHmrc = async (): Promise<void> => {
    if (!claim || !profile) return;

    try {
      setHmrcActionLoading(true);

      await claimService.updateClaim(claim.id, {
        status: "submitted_hmrc" as any,
        actual_submission_date: new Date().toISOString().slice(0, 10),
      });

      try {
        const response = await fetch(
          `/api/claims/${claim.id}/export-submission`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const text = await response.text();
          console.error(
            "Failed to export submission PDF:",
            response.status,
            text
          );
          toast({
            title: "Submission exported with warning",
            description:
              "Claim was marked as submitted to HMRC, but the submission PDF could not be generated.",
            variant: "destructive",
          });
        } else {
          const data = await response.json();
          console.log("Submission PDF exported:", data);

          toast({
            title: "Issued to HMRC",
            description:
              "Claim has been marked as submitted to HMRC and a submission PDF has been generated.",
          });
        }
      } catch (exportError) {
        console.error("Error exporting submission PDF:", exportError);
        toast({
          title: "Submission exported with warning",
          description:
            "Claim was marked as submitted to HMRC, but the submission PDF could not be generated.",
          variant: "destructive",
        });
      }

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error issuing claim to HMRC:", error);
      toast({
        title: "Error",
        description: "Failed to mark claim as submitted to HMRC",
        variant: "destructive",
      });
    } finally {
      setHmrcActionLoading(false);
    }
  };

  const handleExportHmrcResponsePdf = async (): Promise<void> => {
    if (!claim) return;

    try {
      const response = await fetch(
        `/api/claims/${claim.id}/export-response`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error(
          "Failed to export HMRC response PDF:",
          response.status,
          text
        );
        toast({
          title: "Error",
          description: "Failed to export HMRC response PDF",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      console.log("HMRC response PDF exported:", data);

      toast({
        title: "Response PDF exported",
        description:
          "HMRC response pack has been generated and stored in submitted claims.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error exporting HMRC response PDF:", error);
      toast({
        title: "Error",
        description: "Unexpected error generating HMRC response PDF",
        variant: "destructive",
      });
    }
  };

  const handleAddHmrcResponseRow = () => {
    setHmrcResponses((prev) => [
      ...prev,
      { question: "", team_response: "" },
    ]);
  };

  const handleHmrcResponseChange = (
    index: number,
    field: "question" | "team_response",
    value: string
  ) => {
    setHmrcResponses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveHmrcResponses = async (): Promise<void> => {
    if (!claim) return;

    try {
      const cleaned = hmrcResponses.filter(
        (item) =>
          item.question.trim() !== "" || item.team_response.trim() !== ""
      );

      await claimService.updateClaim(claim.id, {
        hmrc_responses: cleaned as any,
        status:
          claim.status === "submitted_hmrc"
            ? ("hmrc_feedback" as any)
            : ((claim.status || "hmrc_feedback") as any),
      });

      toast({
        title: "HMRC responses saved",
        description: "Responses have been saved to this claim.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error saving HMRC responses:", error);
      toast({
        title: "Error",
        description: "Failed to save HMRC responses",
        variant: "destructive",
      });
    }
  };

  const handleSaveOutcome = async (): Promise<void> => {
    if (!claim) return;

    try {
      const submitted =
        outcomeSubmittedValue.trim() === ""
          ? null
          : Number.parseFloat(outcomeSubmittedValue);
      const received =
        outcomeReceivedValue.trim() === ""
          ? null
          : Number.parseFloat(outcomeReceivedValue);

      await claimService.updateClaim(claim.id, {
        submitted_claim_value: submitted as any,
        received_claim_value: received as any,
      });

      toast({
        title: "Outcome saved",
        description: "Submitted and received values have been updated.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error saving claim outcome:", error);
      toast({
        title: "Error",
        description: "Failed to save outcome values",
        variant: "destructive",
      });
    }
  };

  const handleMarkClaimCompleted = async (): Promise<void> => {
    if (!claim) return;

    try {
      await claimService.updateClaim(claim.id, {
        status: "completed" as any,
      });

      toast({
        title: "Claim completed",
        description:
          "Claim has been marked as completed and archived in the system.",
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error) {
      console.error("Error marking claim completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark claim as completed",
        variant: "destructive",
      });
    }
  };

  const handleSaveScheme = async (): Promise<void> => {
    if (!claim) return;

    if (!schemeDraft) {
      toast({
        title: "Select scheme",
        description: "Please choose a scheme type before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingScheme(true);

      const nextScheme = schemeDraft;

      const updated = await claimService.updateClaim(
        claim.id,
        {
          scheme_type: nextScheme,
          scheme: nextScheme,
        } as any
      );

      setClaim((previous) =>
        previous
          ? ({
              ...previous,
              scheme_type: updated.scheme_type ?? nextScheme,
              scheme: (updated as any).scheme ?? nextScheme,
            } as ClaimWithDetails)
          : previous
      );

      toast({
        title: "Scheme updated",
        description: `R&amp;D scheme type has been set to ${nextScheme}.`,
      });

      if (id && typeof id === "string") {
        await loadClaim(id);
      }
    } catch (error: any) {
      console.error("Error saving scheme type:", error);
      const message =
        error?.message ||
        error?.details ||
        "Failed to update scheme type";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingScheme(false);
    }
  };

  const handleSaveCost = async (): Promise<void> => {
    if (!claim || !id || typeof id !== "string") {
      setShowCostDialog(false);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        claim_id: claim.id,
        cost_type: costForm.cost_type,
        description: costForm.description?.trim() || null,
        amount: Number(costForm.amount || 0),
        cost_date: costForm.cost_date || null,
        project_id: costForm.project_id || null,
      };

      if (editingCost) {
        await claimService.updateCost(editingCost.id, payload);
      } else {
        await claimService.addCostToClaim(payload);
      }

      await loadClaim(id);

      toast({
        title: editingCost ? "Cost updated" : "Cost added",
        description: "The cost entry has been saved for this claim.",
      });

      setShowCostDialog(false);
      setEditingCost(null);
      setCostForm({
        cost_type: "staff",
        description: "",
        amount: "",
        cost_date: "",
        project_id: "",
      });
    } catch (error) {
      console.error("Error saving cost:", error);
      toast({
        title: "Error saving cost",
        description:
          "We could not save this cost entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSchemeMultipliers = (
    scheme: string
  ): { lowMultiplier: number; highMultiplier: number } => {
    switch (scheme) {
      case "SME":
        return { lowMultiplier: 0.18, highMultiplier: 0.26 };
      case "RDEC":
        return { lowMultiplier: 0.08, highMultiplier: 0.16 };
      case "Hybrid":
        return { lowMultiplier: 0.12, highMultiplier: 0.22 };
      default:
        return { lowMultiplier: 0.15, highMultiplier: 0.3 };
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
            <Button
              variant="ghost"
              onClick={() => router.push("/staff/claims")}
              className="text-slate-200 hover:text-white hover:bg-slate-800/80"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
                  {claim.organisations?.name || "Unknown Client"}
                </h1>
                <MessageWidget
                  entityType="claim"
                  entityId={claim.id}
                  entityName={`${claim.organisations?.name || "Claim"} - FY ${claim.claim_year}`}
                />
              </div>
              <p className="text-sm text-slate-400">
                FY {claim.claim_year} • {claim.organisations?.organisation_code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(claim.status || "draft")}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Claim summary */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Claim summary
              </p>
              <p className="text-sm text-slate-300">
                FY {claim.claim_year}
              </p>
              <div>{getStatusBadge(claim.status || "draft")}</div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Dates
              </p>
              <p className="text-xs text-slate-500">Created</p>
              <p className="text-sm text-slate-300">
                {claim.created_at ? format(new Date(claim.created_at), "PPP") : "N/A"}
              </p>
              <p className="text-xs text-slate-500">
                Last updated
              </p>
              <p className="text-sm text-slate-300">
                {claim.updated_at ? format(new Date(claim.updated_at), "PPP") : "N/A"}
              </p>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Projects
              </p>
              <p className="text-2xl font-semibold text-slate-50">
                {claim.projects ? claim.projects.length : 0}
              </p>
              <p className="text-xs text-slate-500">
                linked to this claim
              </p>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-none">
            <CardContent className="pt-6 space-y-2">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Documents
              </p>
              <p className="text-2xl font-semibold text-slate-50">
                {claim.documents ? claim.documents.length : 0}
              </p>
              <p className="text-xs text-slate-500">
                uploaded against this claim
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="companion">Companion</TabsTrigger>
          </TabsList>

          {/* OVERVIEW – full-width content */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Claim information */}
            <Card>
              <CardHeader>
                <CardTitle>Claim Information</CardTitle>
                <CardDescription>Key details about this claim.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Claim Year
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {claim.claim_year}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Status
                    </dt>
                    <dd className="mt-1">
                      {getStatusBadge(claim.status || "draft")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {claim.created_at
                        ? format(new Date(claim.created_at), "PPP")
                        : "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      Last Updated
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {claim.updated_at
                        ? format(new Date(claim.updated_at), "PPP")
                        : "N/A"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Team assignment (simple for now) */}
            <Card>
              <CardHeader>
                <CardTitle>Team Assignment</CardTitle>
                <CardDescription>
                  Who is responsible for this claim.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Team assignment details will be expanded here in a later
                  iteration.
                </p>
              </CardContent>
            </Card>

            {/* Filing & Approval Workflow – full-width card */}
            <Card>
              <CardHeader>
                <CardTitle>Filing &amp; Approval Workflow</CardTitle>
                <CardDescription>
                  Manage internal QA, client review and HMRC submission steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Claim pack actions */}
                <div className="space-y-3 rounded-md border border-border/60 bg-background/40 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        Claim pack actions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Generate draft narratives for each project, then lock
                        them when the claim is ready to be issued.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleGenerateDraftPack}
                        disabled={generatingDraft}
                      >
                        {generatingDraft ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating drafts...
                          </>
                        ) : (
                          <>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate draft claim
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleFinaliseClaimPack}
                        disabled={finalisingPack}
                      >
                        {finalisingPack ? (
                          <>
                            <Lock className="mr-2 h-4 w-4 animate-spin" />
                            Finalising...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Finalise claim pack
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadDraftPdf}
                        disabled={downloadingDraftPdf}
                      >
                        {downloadingDraftPdf ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Downloading draft...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download draft pack
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadFinalPdf}
                        disabled={downloadingFinalPdf}
                      >
                        {downloadingFinalPdf ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Downloading final...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download final pack
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  {(draftSummary || finaliseSummary) && (
                    <div className="mt-2 grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                      {draftSummary && (
                        <div>
                          <p className="font-semibold text-foreground">
                            Draft generation summary
                          </p>
                          <p>
                            Projects: {draftSummary.total_projects ?? 0} •
                            Generated: {draftSummary.generated_count ?? 0} •
                            Skipped: {draftSummary.skipped_count ?? 0} •
                            Errors: {draftSummary.error_count ?? 0}
                          </p>
                        </div>
                      )}
                      {finaliseSummary && (
                        <div>
                          <p className="font-semibold text-foreground">
                            Finalisation summary
                          </p>
                          <p>
                            Locked:{" "}
                            {finaliseSummary.locked_projects_count ?? 0} •{" "}
                            Already final:{" "}
                            {finaliseSummary.already_final_count ?? 0} •
                            Missing: {finaliseSummary.missing_count ?? 0}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 1 – Internal QA signoff */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Step 1 – Internal QA signoff
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assign an internal admin reviewer and submit this claim for
                      QA signoff.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1">
                      <Label htmlFor="qa-admin">Assign QA reviewer (admin)</Label>
                      <Select
                        value={selectedQaAdmin}
                        onValueChange={setSelectedQaAdmin}
                      >
                        <SelectTrigger id="qa-admin">
                          <SelectValue placeholder="Select admin reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {qaAdmins.map((admin) => (
                            <SelectItem key={admin.id} value={admin.id}>
                              {admin.full_name ?? admin.email ?? "Admin"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The selected admin will receive a message with a link to
                        this claim to review and approve.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={submittingQa || !selectedQaAdmin}
                      onClick={handleSubmitForQa}
                    >
                      {submittingQa ? "Submitting..." : "Submit for QA signoff"}
                    </Button>
                  </div>
                </div>

                {/* Step 2 – Client review */}
                <div className="space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold">
                      Step 2 – Client review and comments
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Once QA is complete, issue this claim to the client for
                      review and comments.
                    </p>
                  </div>

                  {claim.status === "final_signoff" && (
                    <Button
                      variant="secondary"
                      disabled={clientActionLoading}
                      onClick={handleIssueToClient}
                    >
                      {clientActionLoading
                        ? "Issuing..."
                        : "Issue to client for comment"}
                    </Button>
                  )}

                  {claim.status === "client_review" && (
                    <div className="flex flex-col gap-3 md:w-56">
                      <Button
                        variant="secondary"
                        disabled={clientActionLoading}
                        onClick={handleClientApprove}
                      >
                        {clientActionLoading
                          ? "Saving..."
                          : "Client approved – ready to file"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={
                          clientActionLoading || !clientFeedback.trim()
                        }
                        onClick={handleClientComments}
                      >
                        Client comments – back to draft
                      </Button>
                    </div>
                  )}
                </div>

                {/* Step 3 – HMRC submission */}
                <div className="space-y-4 border-t border-border pt-4">
                  <div>
                    <p className="text-sm font-semibold">
                      Step 3 – HMRC submission
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Once the client has approved, issue this claim to HMRC and
                      track any queries and outcomes.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    {claim.status === "ready_to_file" && (
                      <Button
                        variant="secondary"
                        disabled={hmrcActionLoading}
                        onClick={handleIssueToHmrc}
                      >
                        {hmrcActionLoading ? "Submitting..." : "Issue to HMRC"}
                      </Button>
                    )}
                    {claim.actual_submission_date && (
                      <p className="text-xs text-muted-foreground">
                        Submitted to HMRC on{" "}
                        <span className="font-semibold">
                          {format(
                            new Date(claim.actual_submission_date),
                            "PPP"
                          )}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* HMRC responses section */}
                  <div className="mt-6 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          HMRC responses &amp; queries
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Log questions from HMRC and your team&apos;s responses.
                          Use the Companion tab or the Companion button to help
                          draft responses.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={loadingHmrcAnalysis}
                        onClick={() => {
                          void handleHmrcCompanion();
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {loadingHmrcAnalysis ? "Reviewing..." : "Ask Companion"}
                      </Button>
                    </div>

                    {hmrcAnalysis && (
                      <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">
                          Companion suggestions on HMRC responses
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {hmrcAnalysis}
                        </p>
                      </div>
                    )}

                    {loadingHmrcAnalysis && !hmrcAnalysis && (
                      <p className="text-xs text-muted-foreground">
                        Reviewing HMRC responses...
                      </p>
                    )}

                    <div className="space-y-3">
                      {hmrcResponses.map((item, index) => (
                        <div
                          key={index}
                          className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Exchange {index + 1}
                            </span>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">
                                HMRC question / point
                              </Label>
                              <Textarea
                                rows={3}
                                value={item.question}
                                onChange={(e) =>
                                  handleHmrcResponseChange(
                                    index,
                                    "question",
                                    e.target.value
                                  )
                                }
                                placeholder="Paste the HMRC question or point here..."
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Team response / counter
                              </Label>
                              <Textarea
                                rows={3}
                                value={item.team_response}
                                onChange={(e) =>
                                  handleHmrcResponseChange(
                                    index,
                                    "team_response",
                                    e.target.value
                                  )
                                }
                                placeholder="Draft your response to HMRC..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddHmrcResponseRow}
                      >
                        Add another response
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveHmrcResponses}
                      >
                        Save responses
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportHmrcResponsePdf}
                      >
                        Export response PDF
                      </Button>
                    </div>
                  </div>

                  {/* Outcome section */}
                  <div className="mt-6 space-y-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Claim outcome &amp; ratios
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Record the submitted and received values to track
                        realisation ratios for sales.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="submitted-value">
                          Submitted claim value (£)
                        </Label>
                        <Input
                          id="submitted-value"
                          type="number"
                          value={outcomeSubmittedValue}
                          onChange={(e) =>
                            setOutcomeSubmittedValue(e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="received-value">
                          Received value (£)
                        </Label>
                        <Input
                          id="received-value"
                          type="number"
                          value={outcomeReceivedValue}
                          onChange={(e) =>
                            setOutcomeReceivedValue(e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col justify-end">
                        {outcomeSubmittedValue && outcomeReceivedValue ? (
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Realisation vs submitted
                            </p>
                            <p className="text-lg font-semibold">
                              {(
                                (Number(outcomeReceivedValue) /
                                  Math.max(
                                    Number(outcomeSubmittedValue),
                                    1
                                  )) *
                                100
                              ).toFixed(1)}
                              %
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Enter both values to see the realised percentage.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSaveOutcome}
                      >
                        Save outcome
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={claim.status === "completed"}
                        onClick={handleMarkClaimCompleted}
                      >
                        Mark claim completed
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROJECTS – simple list using ProjectCard */}
          <TabsContent value="projects" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Projects</h2>
              <Button size="sm" onClick={() => setShowAddProject(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add project
              </Button>
            </div>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No projects linked to this claim yet.
              </p>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* COSTS – editable with summary */}
          <TabsContent value="costs" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Costs</h2>
              <Button size="sm" onClick={() => { setEditingCost(null); setCostForm({ cost_type: "staff", description: "", amount: "", cost_date: "", project_id: "" }); setShowCostDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add cost
              </Button>
            </div>
            {(() => {
              const costs = claim?.costs || [];
              const hasClaimCosts = costs.length > 0;

              const costTotalsByTypeFromClaim = costs.reduce<
                Record<string, { total: number; count: number }>
              >((acc, cost) => {
                const type = (cost.cost_type as string) || "other";
                const amount = Number(cost.amount || 0);

                if (!acc[type]) {
                  acc[type] = { total: 0, count: 0 };
                }

                acc[type].total += amount;
                acc[type].count += 1;
                return acc;
              }, {});

              const totalClaimCostFromClaim =
                (claim?.total_costs as number | null | undefined) ??
                Object.values(costTotalsByTypeFromClaim).reduce(
                  (sum, entry) => sum + entry.total,
                  0
                );

              const effectiveCostTotalsByType = hasClaimCosts
                ? costTotalsByTypeFromClaim
                : clientCostTotalsByType;

              const effectiveTotalClaimCost = hasClaimCosts
                ? totalClaimCostFromClaim
                : clientTotalCost;

              const effectiveCostEntryCount = hasClaimCosts
                ? costs.length
                : clientCostEntryCount;

              const costTypeLabels: Record<string, string> = {
                staff: "Staff",
                subcontractor: "Subcontractors",
                consumables: "Consumables",
                software: "Software",
                other: "Other",
              };

              const orderedCostTypes: string[] = [
                "staff",
                "subcontractor",
                "consumables",
                "software",
                "other",
              ];

              const schemeType =
                ((claim as any)?.scheme_type as string | null | undefined) ??
                ((claim as any)?.scheme as string | null | undefined) ??
                null;

              const schemeForCalc = schemeType || schemeDraft || "";

              const { lowMultiplier, highMultiplier } =
                getSchemeMultipliers(schemeForCalc);

              const indicativeLow = effectiveTotalClaimCost * lowMultiplier;
              const indicativeHigh = effectiveTotalClaimCost * highMultiplier;

              const projectSummaries: Record<
                string,
                {
                  total: number;
                  count: number;
                  byType: Record<string, { total: number; count: number }>;
                }
              > = {};

              if (hasClaimCosts) {
                (costs as any[]).forEach((cost) => {
                  const projectId =
                    (cost.project_id as string | null | undefined) || null;
                  if (!projectId) return;

                  const amount = Number(cost.amount || 0);
                  const type =
                    ((cost.cost_type as string | null | undefined) ||
                      "other") as string;

                  if (!projectSummaries[projectId]) {
                    projectSummaries[projectId] = {
                      total: 0,
                      count: 0,
                      byType: {},
                    };
                  }

                  projectSummaries[projectId].total += amount;
                  projectSummaries[projectId].count += 1;

                  if (!projectSummaries[projectId].byType[type]) {
                    projectSummaries[projectId].byType[type] = {
                      total: 0,
                      count: 0,
                    };
                  }

                  projectSummaries[projectId].byType[type].total += amount;
                  projectSummaries[projectId].byType[type].count += 1;
                });
              } else {
                Object.entries(clientProjectCostSummary).forEach(
                  ([projectId, summary]) => {
                    projectSummaries[projectId] = {
                      total: summary.total,
                      count: summary.count,
                      byType: summary.byType || {},
                    };
                  }
                );
              }

              const hasProjectLevelCosts =
                Object.keys(projectSummaries).length > 0;

              return (
                <>
                  {/* Existing summary card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Costs</CardTitle>
                      <CardDescription>
                        Scheme type and aggregated qualifying costs for this
                        claim.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Scheme type
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {schemeType || "Not set"}
                          </p>
                          {!schemeType && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Once scheme type is recorded on the claim it will
                              show here.
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Total qualifying costs
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {formatCurrency(effectiveTotalClaimCost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Number of cost entries
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {effectiveCostEntryCount}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Totals by cost heading
                        </p>
                        {effectiveCostEntryCount === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No cost entries have been recorded for this claim
                            yet.
                          </p>
                        ) : (
                          <div className="overflow-hidden rounded-md border bg-background/40">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Heading</TableHead>
                                  <TableHead className="text-right">
                                    Entries
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Total cost
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderedCostTypes.map((type) => {
                                  const entry = effectiveCostTotalsByType[type];
                                  if (!entry) return null;
                                  return (
                                    <TableRow key={type}>
                                      <TableCell className="font-medium">
                                        {costTypeLabels[type] || type}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {entry.count}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(entry.total)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Totals by project
                        </p>
                        {!hasProjectLevelCosts ? (
                          <p className="text-sm text-muted-foreground">
                            No project-level costs have been recorded for this
                            claim yet.
                          </p>
                        ) : (
                          <div className="overflow-hidden rounded-md border bg-background/40">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Project</TableHead>
                                  <TableHead className="text-right">
                                    Staff
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Subcontractors
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Consumables
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Total cost
                                  </TableHead>
                                  <TableHead className="text-right">
                                    Estimated benefit
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {projects.map((project) => {
                                  const summary = projectSummaries[project.id];
                                  if (!summary) return null;

                                  const staffTotal =
                                    summary.byType["staff"]?.total ?? 0;
                                  const subcontractorTotal =
                                    summary.byType["subcontractor"]?.total ?? 0;
                                  const consumablesTotal =
                                    summary.byType["consumables"]?.total ?? 0;

                                  const projectLow =
                                    summary.total * lowMultiplier;
                                  const projectHigh =
                                    summary.total * highMultiplier;

                                  return (
                                    <TableRow key={project.id}>
                                      <TableCell className="font-medium">
                                        {project.name}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {staffTotal > 0
                                          ? formatCurrency(staffTotal)
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {subcontractorTotal > 0
                                          ? formatCurrency(subcontractorTotal)
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {consumablesTotal > 0
                                          ? formatCurrency(consumablesTotal)
                                          : "—"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(summary.total)}
                                      </TableCell>
                                      <TableCell className="text-right text-xs">
                                        {summary.total > 0 ? (
                                          <>
                                            {formatCurrency(projectLow)} –{" "}
                                            {formatCurrency(projectHigh)}
                                          </>
                                        ) : (
                                          "—"
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Indicative R&amp;D benefit for this claim
                        </p>
                        {effectiveTotalClaimCost > 0 ? (
                          <>
                            <p className="text-sm font-semibold">
                              {formatCurrency(indicativeLow)} –{" "}
                              {formatCurrency(indicativeHigh)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Based on typical relief levels
                              {schemeForCalc
                                ? ` for the ${schemeForCalc} scheme`
                                : ""}{" "}
                              applied to the total qualifying costs recorded on
                              this tab. Actual benefit will depend on the
                              company&apos;s detailed tax position.
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            Add costs to this claim to see an indicative R&amp;D
                            benefit range based on the selected scheme.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Update scheme type
                        </p>
                        <div className="flex flex-col gap-2 md:flex-row md:items-end">
                          <div className="flex-1">
                            <Label htmlFor="scheme-type-select">
                              Scheme
                            </Label>
                            <Select
                              value={schemeDraft}
                              onValueChange={(value) =>
                                setSchemeDraft(value)
                              }
                            >
                              <SelectTrigger id="scheme-type-select">
                                <SelectValue placeholder="Select scheme type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SME">SME</SelectItem>
                                <SelectItem value="RDEC">RDEC</SelectItem>
                                <SelectItem value="Hybrid">
                                  Hybrid / mixed
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="secondary"
                            className="md:self-end"
                            disabled={savingScheme || !schemeDraft}
                            onClick={handleSaveScheme}
                          >
                            {savingScheme ? "Saving..." : "Save scheme"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          This scheme label is shown on project cost advice and
                          used when interpreting typical relief levels.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detailed cost list */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Individual cost entries</CardTitle>
                      <CardDescription>
                        View and manage each cost item contributing to this
                        claim.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {costs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No costs recorded yet. Use &quot;Add cost&quot; to
                          start capturing qualifying expenditure.
                        </p>
                      ) : (
                        <div className="overflow-hidden rounded-md border bg-background/40">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead className="text-right">
                                  Amount
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costs.map((cost: any) => (
                                <TableRow key={cost.id}>
                                  <TableCell>
                                    {cost.cost_date
                                      ? format(
                                          new Date(cost.cost_date),
                                          "dd MMM yyyy"
                                        )
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="max-w-xs truncate">
                                    {cost.description || "—"}
                                  </TableCell>
                                  <TableCell>
                                    {costTypeLabels[
                                      (cost.cost_type as string) || "other"
                                    ] || cost.cost_type || "Other"}
                                  </TableCell>
                                  <TableCell>
                                    {projects.find(
                                      (p) => p.id === cost.project_id
                                    )?.name || "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(
                                      Number(cost.amount || 0)
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Add/Edit cost dialog */}
                  <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCost ? "Edit cost" : "Add cost"}
                        </DialogTitle>
                        <DialogDescription>
                          Capture qualifying R&amp;D expenditure for this claim.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={costForm.cost_type}
                            onValueChange={(value) =>
                              setCostForm((prev) => ({
                                ...prev,
                                cost_type: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="subcontractor">
                                Subcontractor
                              </SelectItem>
                              <SelectItem value="consumables">
                                Consumables
                              </SelectItem>
                              <SelectItem value="software">Software</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={costForm.description}
                            onChange={(e) =>
                              setCostForm((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Short description of the cost"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Amount (£)</Label>
                            <Input
                              type="number"
                              value={costForm.amount}
                              onChange={(e) =>
                                setCostForm((prev) => ({
                                  ...prev,
                                  amount: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={costForm.cost_date}
                              onChange={(e) =>
                                setCostForm((prev) => ({
                                  ...prev,
                                  cost_date: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Project</Label>
                          <Select
                            value={costForm.project_id}
                            onValueChange={(value) =>
                              setCostForm((prev) => ({
                                ...prev,
                                project_id: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                Not linked to a specific project
                              </SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowCostDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCost}>
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              );
            })()}
          </TabsContent>

          {/* EVIDENCE – document list and upload */}
          <TabsContent value="evidence" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Evidence</h2>
              <Button size="sm" onClick={() => setShowDocumentDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload document
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Claim documents</CardTitle>
                <CardDescription>
                  Supporting evidence and working papers linked to this claim.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!claim.documents || claim.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No documents uploaded for this claim yet.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border bg-background/40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead className="text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claim.documents.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="max-w-xs truncate">
                              {doc.title || doc.file_name || "Untitled"}
                            </TableCell>
                            <TableCell className="capitalize">
                              {doc.doc_type || "supporting_evidence"}
                            </TableCell>
                            <TableCell>
                              {projects.find(
                                (p) => p.id === doc.project_id
                              )?.name || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  handleDownloadDocument(doc as any)
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold">
                    Client evidence from Sidekick
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Evidence items the client has shared against linked Sidekick
                    projects. These are read-only here; update them from the
                    client project workspace.
                  </p>
                  {Object.keys(clientEvidenceByProject).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No client-side evidence has been recorded for the linked
                      projects yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project) => {
                        const items = clientEvidenceByProject[project.id];
                        if (!items || items.length === 0) return null;
                        return (
                          <div
                            key={project.id}
                            className="rounded-md border border-border/60 bg-background/40 p-3"
                          >
                            <p className="text-xs font-semibold mb-2">
                              {project.name}
                            </p>
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded border border-border/40 bg-background/60 p-2 text-xs"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] capitalize"
                                      >
                                        {item.type}
                                      </Badge>
                                      {item.title && (
                                        <span className="font-medium truncate max-w-[220px]">
                                          {item.title}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(item.createdAt).toLocaleDateString(
                                        "en-GB"
                                      )}
                                    </span>
                                  </div>
                                  {item.body && (
                                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
                                      {item.body}
                                    </p>
                                  )}
                                  {item.externalUrl && (
                                    <a
                                      href={item.externalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 inline-block text-[11px] text-blue-500 hover:underline break-all"
                                    >
                                      {item.externalUrl}
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upload document dialog */}
            <Dialog
              open={showDocumentDialog}
              onOpenChange={setShowDocumentDialog}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload document</DialogTitle>
                  <DialogDescription>
                    Add supporting evidence against this claim or a specific
                    project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>File</Label>
                    <Input
                      type="file"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                  <div>
                    <Label>Document type</Label>
                    <Select
                      value={documentType}
                      onValueChange={setDocumentType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="supporting_evidence">
                          Supporting evidence
                        </SelectItem>
                        <SelectItem value="working_paper">
                          Working paper
                        </SelectItem>
                        <SelectItem value="submission_pack">
                          Submission pack
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Project (optional)</Label>
                    <Select
                      value={documentProjectId}
                      onValueChange={setDocumentProjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to a project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Not linked to a specific project
                        </SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDocumentDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={uploadingDocument || !selectedFile}
                    onClick={() => {
                      void handleDocumentUpload();
                    }}
                  >
                    {uploadingDocument ? "Uploading..." : "Upload"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* COMPANION – AI analysis */}
          <TabsContent value="companion" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>AI Companion Analysis</CardTitle>
                  <CardDescription>
                    Generate and share AI-powered insights for this claim.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {aiAnalysis && (
                    <Dialog
                      open={showSendAnalysisDialog}
                      onOpenChange={setShowSendAnalysisDialog}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Users className="mr-2 h-4 w-4" />
                          Send analysis
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send AI analysis</DialogTitle>
                          <DialogDescription>
                            Send this AI analysis as a message to a team member.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Recipient</Label>
                            <Select value={sendTo} onValueChange={setSendTo}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recipient..." />
                              </SelectTrigger>
                              <SelectContent>
                                {claim.bd_owner_id && (
                                  <SelectItem value={claim.bd_owner_id}>
                                    BD owner
                                  </SelectItem>
                                )}
                                {claim.technical_lead_id && (
                                  <SelectItem value={claim.technical_lead_id}>
                                    Technical lead
                                  </SelectItem>
                                )}
                                {claim.cost_lead_id && (
                                  <SelectItem value={claim.cost_lead_id}>
                                    Cost lead
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Preview</Label>
                            <div className="mt-2 max-h-64 overflow-y-auto rounded-md bg-muted p-3 text-sm">
                              {aiAnalysis}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setShowSendAnalysisDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSendAnalysis}
                            disabled={!sendTo || sendingMessage}
                          >
                            {sendingMessage ? "Sending..." : "Send"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button
                    size="sm"
                    onClick={handleGenerateAnalysis}
                    disabled={loadingAnalysis}
                  >
                    {loadingAnalysis ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Generate analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!aiAnalysis && !loadingAnalysis && (
                  <p className="text-sm text-muted-foreground">
                    No analysis yet. Click &quot;Generate analysis&quot; to
                    create an AI summary of this claim for internal or client
                    use.
                  </p>
                )}
                {loadingAnalysis && (
                  <p className="text-sm text-muted-foreground">
                    Generating analysis...
                  </p>
                )}
                {aiAnalysis && !loadingAnalysis && (
                  <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                    {aiAnalysis}
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