import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { sidekickProjectService } from "@/services/sidekickProjectService";
import { sidekickEvidenceService } from "@/services/sidekickEvidenceService";
import { sidekickCommentService } from "@/services/sidekickCommentService";
import { feasibilityService, type FeasibilityAnalysis } from "@/services/feasibilityService";
import { claimService } from "@/services/claimService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Lightbulb, FileText, MessageSquare, Send, Upload, Link as LinkIcon, Trash2, ExternalLink, Sparkles, Edit, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { MessageWidget } from "@/components/MessageWidget";
import { sidekickCostAdviceService, type SidekickCostAdvice } from "@/services/sidekickCostAdviceService";
import { sidekickTimelineService, type SidekickTimelineItem } from "@/services/sidekickTimelineService";
import { toast } from "@/hooks/use-toast";
import { useCallback } from "react";
import { ProjectPhaseTimeline } from "@/components/projects/ProjectPhaseTimeline";
import { ProjectReadinessPanel } from "@/components/projects/ProjectReadinessPanel";
import { ProjectCostSummary } from "@/components/projects/ProjectCostSummary";
import { ProjectHistoryPanel } from "@/components/projects/ProjectHistoryPanel";
import { ProjectGantt } from "@/components/projects/ProjectGantt";
import { ProjectVoiceNotes } from "@/components/projects/ProjectVoiceNotes";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type SidekickEvidenceItem = Database["public"]["Tables"]["sidekick_evidence_items"]["Row"];
type SidekickProjectComment = Database["public"]["Tables"]["sidekick_project_comments"]["Row"] & {
  author?: { email: string };
};

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];
type SidekickTimelineItemRow = Database["public"]["Tables"]["sidekick_project_timeline_items"]["Row"];

type ApprovalSectionStatus = "approved" | "needs_revision";
type ApprovalSections = {
  basic_info: ApprovalSectionStatus;
  technical_understanding: ApprovalSectionStatus;
  challenges: ApprovalSectionStatus;
  qualifying_activities: ApprovalSectionStatus;
};

const getTechnicalPlaceholders = (sector?: string | null) => {
  const normalised = (sector || "").toLowerCase();

  if (normalised.includes("software") || normalised.includes("saas")) {
    return {
      baseline:
        "E.g. Existing web app with monolith backend and basic reporting; users manage data manually in spreadsheets alongside the system...",
      change:
        "E.g. Introducing event-driven architecture, new analytics service, or real-time collaboration features...",
      innovation:
        "E.g. Solving scaling / performance constraints, complex multi-tenant rules, or novel data processing that goes beyond standard libraries...",
    };
  }

  if (
    normalised.includes("manufacturing") ||
    normalised.includes("engineering") ||
    normalised.includes("mechanical")
  ) {
    return {
      baseline:
        "E.g. Current machine line uses standard components and manual settings to achieve throughput X with known tolerances...",
      change:
        "E.g. Redesigning tooling, integrating new sensors, or updating control logic to reach new performance or quality targets...",
      innovation:
        "E.g. New combination of materials, control strategies or process parameters that are not standard in your industry...",
    };
  }

  return {
    baseline:
      "Describe how things worked before this project started. Mention key components, technologies, or processes.",
    change:
      "Explain what you are changing or creating in this project – the new design, feature, or approach.",
    innovation:
      "Explain what makes this technically difficult or different from standard practice in your field.",
  };
};

const getChallengePlaceholders = (sector?: string | null) => {
  const normalised = (sector || "").toLowerCase();

  if (normalised.includes("software") || normalised.includes("saas")) {
    return {
      uncertainties:
        "E.g. Unsure whether the new architecture would meet latency targets under peak load, or how a new algorithm would behave with edge cases...",
      knowledge:
        "E.g. Reviewed framework docs, performance benchmarks, prior internal projects, and third‑party blog posts / research...",
      workDone:
        "E.g. Built load‑test harnesses, ran A/B tests, created prototypes to validate algorithms, iterated on schema designs...",
    };
  }

  if (
    normalised.includes("manufacturing") ||
    normalised.includes("engineering") ||
    normalised.includes("mechanical")
  ) {
    return {
      uncertainties:
        "E.g. Unsure whether a new material or geometry would handle stresses, or how equipment would perform at new operating points...",
      knowledge:
        "E.g. Checked supplier datasheets, design codes, prior builds, and spoke with specialists before committing to the new route...",
      workDone:
        "E.g. Built and tested prototypes, ran simulations, carried out trial runs at different settings, inspected failures and iterated...",
    };
  }

  return {
    uncertainties:
      "What did you not know at the outset? Think performance limits, behaviour under certain conditions, or integration issues.",
    knowledge:
      "What guidance, standards, previous projects, or supplier information did you look at before starting?",
    workDone:
      "Describe the main tests, trials, modelling, or prototyping you carried out and what you were trying to learn from each.",
  };
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { user } = useApp();
  const [project, setProject] = useState<SidekickProject | null>(null);
  const [claimProject, setClaimProject] = useState<ClaimProject | null>(null);
  const [evidence, setEvidence] = useState<SidekickEvidenceItem[]>([]);
  const [comments, setComments] = useState<SidekickProjectComment[]>([]);
  const [feasibilityAnalysis, setFeasibilityAnalysis] = useState<FeasibilityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [feasibilityLoading, setFeasibilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runningFeasibility, setRunningFeasibility] = useState(false);

  // Dialog and workflow state
  const [sendToTeamDialog, setSendToTeamDialog] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [recallDialog, setRecallDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [editingProject, setEditingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [deletingEvidence, setDeletingEvidence] = useState<string | null>(null);

  // Project edit fields
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDescription, setEditProjectDescription] = useState("");
  const [editProjectSector, setEditProjectSector] = useState("");
  const [editProjectStage, setEditProjectStage] = useState("");

  // Evidence form state
  const [evidenceType, setEvidenceType] = useState<"" | "note" | "file" | "link">("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceBody, setEvidenceBody] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");

  // Comment form state
  const [commentBody, setCommentBody] = useState("");

  // Review / approval state
  const [approvalSections, setApprovalSections] = useState<ApprovalSections>({
    basic_info: "approved",
    technical_understanding: "approved",
    challenges: "approved",
    qualifying_activities: "approved",
  });
  const [revisionFeedback, setRevisionFeedback] = useState("");

  const [rdTechnicalUnderstanding, setRdTechnicalUnderstanding] = useState<string>("");
  const [rdChallenges, setRdChallenges] = useState<string>("");
  const [rdActivities, setRdActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState<string>("");
  const [savingRdDetails, setSavingRdDetails] = useState<boolean>(false);

  const [costAdvice, setCostAdvice] = useState<SidekickCostAdvice[]>([]);
  const [isLoadingCostAdvice, setIsLoadingCostAdvice] = useState(false);
  const [isSubmittingCostAdvice, setIsSubmittingCostAdvice] = useState(false);
  const [costType, setCostType] = useState<string>("");
  const [costAmount, setCostAmount] = useState<string>("");
  const [costDescription, setCostDescription] = useState<string>("");
  const [costNotes, setCostNotes] = useState<string>("");
  const [editingCostId, setEditingCostId] = useState<string | null>(null);

  const [timelineItems, setTimelineItems] = useState<SidekickTimelineItemRow[]>([]);
  const [newTimelineName, setNewTimelineName] = useState<string>("");
  const [newTimelineStart, setNewTimelineStart] = useState<string>("");
  const [newTimelineEnd, setNewTimelineEnd] = useState<string>("");
  const [isSavingTimeline, setIsSavingTimeline] = useState<boolean>(false);

  const [technicalBaseline, setTechnicalBaseline] = useState<string>("");
  const [technicalChange, setTechnicalChange] = useState<string>("");
  const [technicalInnovation, setTechnicalInnovation] = useState<string>("");

  const [challengeUncertainties, setChallengeUncertainties] = useState<string>("");
  const [challengeKnowledge, setChallengeKnowledge] = useState<string>("");
  const [challengeWorkDone, setChallengeWorkDone] = useState<string>("");
  const [isSyncingReadiness, setIsSyncingReadiness] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("feasibility");
  const [rdDetailsTab, setRdDetailsTab] = useState<string>("technical");

  const loadCostAdvice = useCallback(
    async (projectId: string) => {
      setIsLoadingCostAdvice(true);
      try {
        const data = (await sidekickCostAdviceService.getByProject(projectId)) ?? [];
        setCostAdvice(data);
      } catch (error) {
        console.error("Failed to load cost advice", error);
        toast({
          title: "Could not load costs",
          description: "There was a problem loading the costs shared for this project.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCostAdvice(false);
      }
    },
    [toast]
  );

  const refreshClaimProject = useCallback(
    async (sidekickProjectId: string) => {
      try {
        const response = await fetch(
          `/api/projects/by-sidekick?sidekickProjectId=${encodeURIComponent(
            sidekickProjectId
          )}`
        );

        if (!response.ok) {
          let errorMessage = "Failed to refresh claim project";

          try {
            const contentType = response.headers.get("content-type") || "";

            if (contentType.includes("application/json")) {
              const errorBody = (await response.json()) as { error?: string };
              if (errorBody?.error) {
                errorMessage = errorBody.error;
              }
            } else {
              const text = await response.text();
              if (text) {
                errorMessage = text;
              }
            }
          } catch (parseError) {
            console.error(
              "Error parsing error response in refreshClaimProject:",
              parseError
            );
          }

          console.error("Error refreshing claim project:", errorMessage);
          toast({
            title: "Error refreshing claim project",
            description: errorMessage,
            variant: "destructive",
          });

          return;
        }

        const data = (await response.json()) as {
          claimProject: ClaimProject | null;
          approvalSections?: Partial<ApprovalSections> | null;
        };

        setClaimProject(data.claimProject ?? null);

        if (data.claimProject) {
          setRdTechnicalUnderstanding(
            data.claimProject.technical_understanding ?? ""
          );
          setRdChallenges(
            data.claimProject.challenges_uncertainties ?? ""
          );
          setRdActivities(
            Array.isArray(data.claimProject.qualifying_activities)
              ? data.claimProject.qualifying_activities
              : []
          );
        } else {
          setRdTechnicalUnderstanding("");
          setRdChallenges("");
          setRdActivities([]);
        }

        if (data.approvalSections) {
          setApprovalSections((prev) => ({
            ...prev,
            ...data.approvalSections,
          }));
        }

        // Initialise guided fields from existing combined text (if present)
        const tech = data.claimProject?.technical_understanding ?? "";
        if (tech && !technicalBaseline && !technicalChange && !technicalInnovation) {
          setTechnicalBaseline(tech);
        }

        const chall = data.claimProject?.challenges_uncertainties ?? "";
        if (chall && !challengeUncertainties && !challengeKnowledge && !challengeWorkDone) {
          setChallengeUncertainties(chall);
        }
      } catch (error) {
        console.error("Unexpected error refreshing claim project:", error);
        toast({
          title: "Error refreshing claim project",
          description:
            "An unexpected error occurred while refreshing the claim project.",
          variant: "destructive",
        });
      }
    },
    [setClaimProject, setApprovalSections, toast]
  );

  const handleAddActivity = (): void => {
    const value = newActivity.trim();
    if (!value) return;
    if (rdActivities.includes(value)) {
      setNewActivity("");
      return;
    }
    setRdActivities((prev) => [...prev, value]);
    setNewActivity("");
  };

  const handleRemoveActivity = (index: number): void => {
    setRdActivities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRdDetails = async (): Promise<void> => {
    if (!project) return;

    setSavingRdDetails(true);
    try {
      // Compose structured text for staff-side fields
      const technical_understanding =
        `Baseline / current system:\n${technicalBaseline.trim() || "Not provided."}\n\n` +
        `Change or new development:\n${technicalChange.trim() || "Not provided."}\n\n` +
        `Innovation / why this is different:\n${technicalInnovation.trim() || "Not provided."}`;

      const challenges_uncertainties =
        `Uncertainties at the start:\n${challengeUncertainties.trim() || "Not provided."}\n\n` +
        `Existing knowledge and information considered:\n${challengeKnowledge.trim() || "Not provided."}\n\n` +
        `Work done to resolve the uncertainties (tests, experiments, iterations):\n${challengeWorkDone.trim() || "Not provided."}`;

      const qualifyingActivities =
        rdActivities && rdActivities.length > 0 ? rdActivities : null;

      const response = await fetch("/api/projects/update-rd-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sidekickProjectId: project.id,
          technical_understanding,
          challenges_uncertainties,
          qualifying_activities: qualifyingActivities,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.toLowerCase().includes("application/json");

      if (!response.ok) {
        let errorMessage = "Failed to save R&D details.";

        if (isJson) {
          try {
            const errorBody = (await response.json()) as { error?: string };
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          } catch (parseError) {
            console.error("Error parsing error JSON from update-rd-details:", parseError);
          }
        } else {
          try {
            const text = await response.text();
            if (text) {
              errorMessage = text.slice(0, 500);
            }
          } catch (parseError) {
            console.error("Error reading error text from update-rd-details:", parseError);
          }
        }

        toast({
          title: "Could not save R&D details",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      let updatedClaim: ClaimProject | null = null;
      if (isJson) {
        try {
          const data = (await response.json()) as { claimProject?: ClaimProject };
          if (data?.claimProject) {
            updatedClaim = data.claimProject;
          }
        } catch (parseError) {
          console.error("Error parsing success JSON from update-rd-details:", parseError);
        }
      }

      if (updatedClaim) {
        setClaimProject(updatedClaim);
      }

      toast({
        title: "R&D details saved",
        description: "Your R&D story has been saved for the R&D team.",
      });
    } catch (error) {
      console.error("Unexpected error saving R&D details:", error);
      toast({
        title: "Could not save R&D details",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingRdDetails(false);
    }
  };

  const handleSyncReadiness = useCallback(async () => {
    if (!project) return;

    setIsSyncingReadiness(true);
    try {
      const [projectData, evidenceData, commentsData] = await Promise.all([
        sidekickProjectService.getProjectById(project.id),
        sidekickEvidenceService.getEvidenceByProject(project.id),
        sidekickCommentService.getCommentsByProject(project.id),
      ]);

      setProject(projectData);
      setEvidence(evidenceData);
      setComments(commentsData);

      await Promise.all([
        refreshClaimProject(project.id),
        loadCostAdvice(project.id),
        (async () => {
          try {
            const analyses = await feasibilityService.getAnalysesByProject(project.id);
            if (analyses && analyses.length > 0) {
              const sortedAnalyses = analyses.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
              setFeasibilityAnalysis(sortedAnalyses[0]);
            } else {
              setFeasibilityAnalysis(null);
            }
          } catch (feasibilityError) {
            console.error("Error fetching feasibility analysis in sync:", feasibilityError);
          }
        })(),
        (async () => {
          try {
            const items = await sidekickTimelineService.getByProject(project.id);
            setTimelineItems(items);
          } catch (timelineError) {
            console.error("Error fetching timeline items in sync:", timelineError);
          }
        })(),
      ]);

      toast({
        title: "Synced with RD Companion",
        description: "Latest project details and readiness have been updated.",
      });
    } catch (error) {
      console.error("Error syncing readiness:", error);
      toast({
        title: "Could not sync",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncingReadiness(false);
    }
  }, [project, refreshClaimProject, loadCostAdvice, toast]);

  useEffect(() => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!id || !user || !router.isReady) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch project, evidence, and comments
        const [projectData, evidenceData, commentsData] = await Promise.all([
          sidekickProjectService.getProjectById(id as string),
          sidekickEvidenceService.getEvidenceByProject(id as string),
          sidekickCommentService.getCommentsByProject(id as string),
        ]);

        setProject(projectData);
        setEvidence(evidenceData);
        setComments(commentsData);

        // Load linked claim project (server-side, using service role)
        await refreshClaimProject(id as string);

        // Fetch feasibility analysis separately
        setFeasibilityLoading(true);
        try {
          const analyses = await feasibilityService.getAnalysesByProject(id as string);
          if (analyses && analyses.length > 0) {
            const sortedAnalyses = analyses.sort((a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setFeasibilityAnalysis(sortedAnalyses[0]);
          } else {
            setFeasibilityAnalysis(null);
          }
        } catch (feasibilityError) {
          console.error("Error fetching feasibility analysis:", feasibilityError);
          setFeasibilityAnalysis(null);
        } finally {
          setFeasibilityLoading(false);
        }

        if (projectData?.id) {
          void loadCostAdvice(projectData.id);
          try {
            const items = await sidekickTimelineService.getByProject(projectData.id);
            setTimelineItems(items);
          } catch (timelineError) {
            console.error("Error fetching timeline items:", timelineError);
          }
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, router.isReady, loadCostAdvice, refreshClaimProject]);

  const handleRunFeasibility = async () => {
    if (!project || !user) return;
    setRunningFeasibility(true);
    try {
      const analysis = await feasibilityService.runFeasibilityForProject(project.id);
      if (analysis) {
        setFeasibilityAnalysis(analysis);
        toast({
          title: "Feasibility analysis complete",
          description: "You can now review the latest feasibility assessment.",
        });
      }
    } catch (error) {
      console.error("Error running feasibility analysis:", error);
      toast({
        title: "Could not run feasibility analysis",
        description: "Please try again or contact support if the problem continues.",
        variant: "destructive",
      });
    } finally {
      setRunningFeasibility(false);
    }
  };

  const handleSendToTeam = useCallback(async () => {
    if (!project || !user) {
      toast({
        title: "Cannot send project",
        description: "Missing project or user information.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/projects/send-to-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sidekickProjectId: project.id,
          userId: user.id,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const isJson = contentType.toLowerCase().includes("application/json");

      if (response.ok) {
        let message = "Project sent to team successfully.";

        if (isJson) {
          try {
            const data = (await response.json()) as { message?: string };
            if (data && typeof data === "object" && data.message) {
              message = data.message;
            }
          } catch (parseError) {
            console.error(
              "Error parsing JSON success response from send-to-team:",
              parseError
            );
          }
        }

        toast({
          title: "Project sent",
          description: message,
        });

        await refreshClaimProject(project.id);
        return;
      }

      let errorMessage = "Failed to send project to team.";

      if (isJson) {
        try {
          const errorBody = (await response.json()) as {
            error?: string;
            message?: string;
          };
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          } else if (errorBody?.message) {
            errorMessage = errorBody.message;
          }
        } catch (parseError) {
          console.error(
            "Error parsing JSON error response from send-to-team:",
            parseError
          );
        }
      } else {
        try {
          const text = await response.text();
          if (text) {
            // Avoid dumping huge HTML; keep a short snippet
            errorMessage = text.slice(0, 500);
          }
        } catch (parseError) {
          console.error(
            "Error reading text error response from send-to-team:",
            parseError
          );
        }
      }

      toast({
        title: "Error sending project to team",
        description: errorMessage,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Network error sending project to team:", error);
      toast({
        title: "Network error",
        description:
          "There was a problem sending the project to the team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [project, user, toast, refreshClaimProject]);

  const handleApproveProject = async () => {
    if (!project || !claimProject) return;
    setSubmitting(true);
    try {
      const allApproved = Object.values(approvalSections).every(
        (status) => status === "approved"
      );
      const nextStatus = allApproved ? "approved" : "revision_requested";

      await claimService.updateProjectApproval(
        claimProject.id,
        nextStatus,
        approvalSections,
        revisionFeedback || null
      );

      await refreshClaimProject(project.id);
      setReviewDialog(false);

      toast({
        title: allApproved ? "Project approved" : "Feedback sent",
        description: allApproved
          ? "The R&D team will now prepare the claim."
          : "Your revision feedback has been sent to the R&D team.",
      });
    } catch (error) {
      console.error("Error approving project:", error);
      toast({
        title: "Could not submit review",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelProject = async () => {
    if (!project || !claimProject || !cancelReason.trim() || !user) return;
    setSubmitting(true);
    try {
      await claimService.cancelProject(claimProject.id, cancelReason.trim(), user.id);
      await refreshClaimProject(project.id);
      setCancelDialog(false);
      setCancelReason("");
      toast({
        title: "Project cancelled",
        description: "The R&D team has been notified.",
      });
    } catch (error) {
      console.error("Error cancelling project:", error);
      toast({
        title: "Could not cancel project",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecallFromTeam = async () => {
    if (!claimProject || !user || !project) return;

    setSubmitting(true);
    try {
      const updated = await claimService.recallProjectToClient(
        claimProject.id,
        user.id
      );

      setClaimProject(updated);
      setRecallDialog(false);

      toast({
        title: "Project brought back to you",
        description:
          "You can now make changes before sending it to the R&D team again.",
      });
    } catch (error) {
      console.error("Error recalling project from team:", error);
      toast({
        title: "Could not bring project back",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!project || !user) return;

    if (!evidenceTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please add a short title for this evidence item.",
        variant: "destructive",
      });
      return;
    }

    if (!evidenceType) {
      toast({
        title: "Choose a type",
        description: "Select whether this is a note, file, or link.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let newEvidence: SidekickEvidenceItem | null = null;

      if (evidenceType === "note") {
        newEvidence = await sidekickEvidenceService.createEvidenceNote(project.id, {
          title: evidenceTitle,
          body: evidenceBody || null,
        });
      } else if (evidenceType === "file") {
        if (!evidenceFile) {
          toast({
            title: "File required",
            description: "Choose a file to upload.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        newEvidence = await sidekickEvidenceService.createEvidenceFile(project.id, evidenceFile, {
          title: evidenceTitle,
          description: evidenceBody || null,
        });
      } else if (evidenceType === "link") {
        if (!evidenceUrl.trim()) {
          toast({
            title: "URL required",
            description: "Enter the external link for this evidence.",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
        newEvidence = await sidekickEvidenceService.createEvidenceLink(project.id, {
          title: evidenceTitle,
          url: evidenceUrl.trim(),
          description: evidenceBody || null,
        });
      }

      if (newEvidence) {
        setEvidence((prev) => [newEvidence!, ...prev]);
      }

      setEvidenceType("");
      setEvidenceTitle("");
      setEvidenceBody("");
      setEvidenceFile(null);
      setEvidenceUrl("");

      toast({
        title: "Evidence added",
        description: "Your evidence has been saved for the R&D team.",
      });
    } catch (error) {
      console.error("Error adding evidence:", error);
      toast({
        title: "Could not add evidence",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!project || !user || !commentBody.trim()) return;
    setSubmitting(true);
    try {
      const comment = await sidekickCommentService.addComment(project.id, {
        body: commentBody.trim(),
        author_role: "client",
      });

      if (comment) {
        setComments((prev) => [comment, ...prev]);
      }
      setCommentBody("");

      toast({
        title: "Comment posted",
        description: "Your message has been shared with the R&D team.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Could not add comment",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProject = async () => {
    if (!project) return;

    setSubmitting(true);
    try {
      await sidekickProjectService.updateProject(project.id, {
        name: editProjectName,
        description: editProjectDescription || null,
        sector: editProjectSector || null,
        stage: editProjectStage || null,
      });

      const updated = await sidekickProjectService.getProjectById(project.id);
      setProject(updated);
      setEditingProject(false);
      toast({
        title: "Project updated",
        description: "Your project details have been saved.",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Failed to update project",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !window.confirm("Are you sure you want to delete this project? This will also delete all evidence and comments. This action cannot be undone.")) return;

    setDeletingProject(true);
    try {
      await sidekickProjectService.deleteProject(project.id);
      alert("Project deleted successfully");
      router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project");
    } finally {
      setDeletingProject(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!project || !window.confirm("Are you sure you want to delete this evidence item?")) return;

    setDeletingEvidence(evidenceId);
    try {
      await sidekickEvidenceService.deleteEvidence(evidenceId);
      const evidenceData = await sidekickEvidenceService.getEvidenceByProject(project.id);
      setEvidence(evidenceData);
      alert("Evidence deleted successfully!");
    } catch (error) {
      console.error("Error deleting evidence:", error);
      alert("Failed to delete evidence");
    } finally {
      setDeletingEvidence(null);
    }
  };

  const resetCostAdviceForm = () => {
    setCostType("");
    setCostAmount("");
    setCostDescription("");
    setCostNotes("");
    setEditingCostId(null);
  };

  const handleSubmitCostAdvice = async () => {
    if (!project || !user) return;

    if (!costType) {
      toast({
        title: "Choose a cost type",
        description: "Please select the type of cost you are advising.",
        variant: "destructive",
      });
      return;
    }

    if (!costAmount) {
      toast({
        title: "Enter an amount",
        description: "Please add an estimated amount for this cost.",
        variant: "destructive",
      });
      return;
    }

    const numericAmount = Number(costAmount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Amount looks incorrect",
        description: "Please enter a positive number for the amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingCostAdvice(true);
    try {
      if (editingCostId) {
        const updated = await sidekickCostAdviceService.updateAdvice(editingCostId, {
          cost_type: costType,
          amount: numericAmount,
          description: costDescription || null,
          notes: costNotes || null,
        });

        setCostAdvice((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );

        toast({
          title: "Cost advice updated",
          description: "Your changes have been saved.",
        });
      } else {
        const created = await sidekickCostAdviceService.createAdvice({
          project_id: project.id,
          cost_type: costType,
          amount: numericAmount,
          description: costDescription || null,
          notes: costNotes || null,
          created_by: user.id,
        });

        setCostAdvice((prev) => [created, ...prev]);

        toast({
          title: "Cost advice saved",
          description: "Your estimate has been shared with the R&D team.",
        });
      }

      resetCostAdviceForm();
    } catch (error) {
      console.error("Error saving cost advice:", error);
      toast({
        title: "Could not save cost advice",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCostAdvice(false);
    }
  };

  const handleCancelEditCostAdvice = () => {
    resetCostAdviceForm();
  };

  const handleEditCostAdvice = (item: SidekickCostAdvice) => {
    setCostType(item.cost_type || "");
    setCostAmount(
      typeof item.amount === "number" ? String(item.amount) : item.amount || ""
    );
    setCostDescription(item.description || "");
    setCostNotes(item.notes || "");
    setEditingCostId(item.id);
  };

  const handleDeleteCostAdvice = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this cost advice?")) return;

    setIsSubmittingCostAdvice(true);
    try {
      await sidekickCostAdviceService.deleteAdvice(id);
      setCostAdvice((prev) => prev.filter((item) => item.id !== id));

      if (editingCostId === id) {
        resetCostAdviceForm();
      }

      toast({
        title: "Cost advice deleted",
        description: "This cost will no longer be used by the R&D team.",
      });
    } catch (error) {
      console.error("Error deleting cost advice:", error);
      toast({
        title: "Could not delete cost advice",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingCostAdvice(false);
    }
  };

  const handleAddTimelineItem = async (): Promise<void> => {
    if (!project) return;

    const name = newTimelineName.trim();
    if (!name) {
      toast({
        title: "Add an activity name",
        description: "Give the activity a short, clear label.",
        variant: "destructive",
      });
      return;
    }

    if (!newTimelineStart || !newTimelineEnd) {
      toast({
        title: "Start and finish required",
        description: "Choose both a start and finish date for this activity.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(newTimelineStart);
    const end = new Date(newTimelineEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast({
        title: "Dates look invalid",
        description: "Please check the start and finish dates.",
        variant: "destructive",
      });
      return;
    }

    if (end.getTime() < start.getTime()) {
      toast({
        title: "Finish before start",
        description: "The finish date must be on or after the start date.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTimeline(true);
    try {
      const created: SidekickTimelineItem = await sidekickTimelineService.createItem({
        project_id: project.id,
        name,
        start_date: newTimelineStart,
        end_date: newTimelineEnd,
      });

      setTimelineItems((prev) =>
        [...prev, created].sort((a, b) => {
          const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
          const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
          return aDate - bDate;
        })
      );

      setNewTimelineName("");
      setNewTimelineStart("");
      setNewTimelineEnd("");

      toast({
        title: "Activity added",
        description: "Your project timeline has been updated.",
      });
    } catch (error) {
      console.error("Error adding timeline activity:", error);
      toast({
        title: "Could not add activity",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTimeline(false);
    }
  };

  const handleDeleteTimelineItem = async (id: string): Promise<void> => {
    if (!window.confirm("Remove this activity from the timeline?")) return;

    try {
      await sidekickTimelineService.deleteItem(id);
      setTimelineItems((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Activity removed",
        description: "The timeline has been updated.",
      });
    } catch (error) {
      console.error("Error deleting timeline activity:", error);
      toast({
        title: "Could not remove activity",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSLAStatus = () => {
    if (!claimProject?.due_date) return null;
    
    const now = new Date();
    const dueDate = new Date(claimProject.due_date);
    const hoursLeft = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) {
      return { label: "Overdue", color: "bg-red-500", icon: XCircle };
    } else if (hoursLeft < 24) {
      return { label: `${Math.floor(hoursLeft)}h left`, color: "bg-orange-500", icon: AlertCircle };
    } else {
      return { label: `${Math.floor(hoursLeft / 24)}d left`, color: "bg-green-500", icon: Clock };
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Loading project...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Project not found</p>
          <Link href="/projects">
            <Button variant="ghost">Back to Projects</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const workflowStatus = claimProject?.workflow_status || project.status;
  const isDraftLikeStatus =
    !claimProject?.workflow_status ||
    claimProject.workflow_status === "draft" ||
    claimProject.workflow_status === "revision_requested";

  const canEdit = !claimProject || isDraftLikeStatus;
  const canSendToTeam =
    workflowStatus === "draft" || workflowStatus === "revision_requested";
  const needsClientReview =
    claimProject && claimProject.workflow_status === "awaiting_client_review";
  const isApproved = claimProject && claimProject.workflow_status === "approved";
  const canRecallFromTeam =
    claimProject?.workflow_status === "submitted_to_team" ||
    claimProject?.workflow_status === "team_in_progress";
  const canEditTimeline =
    !claimProject ||
    (claimProject.workflow_status !== "approved" &&
      claimProject.workflow_status !== "cancelled");
  const slaStatus = getSLAStatus();

  const sector = project.sector ?? null;
  const technicalPlaceholders = getTechnicalPlaceholders(sector);
  const challengePlaceholders = getChallengePlaceholders(sector);

  const clientTechnicalChars =
    technicalBaseline.trim().length +
    technicalChange.trim().length +
    technicalInnovation.trim().length;

  const clientChallengeChars =
    challengeUncertainties.trim().length +
    challengeKnowledge.trim().length +
    challengeWorkDone.trim().length;

  // Require a reasonable amount of client-entered content before we treat
  // technical story / challenges as "present" for readiness scoring.
  const hasClientTechnical = clientTechnicalChars >= 300;
  const hasClientChallenges = clientChallengeChars >= 300;

  const latestStaffComment =
    comments && comments.length > 0
      ? comments
          .filter((comment) => comment.author_role === "rd_staff")
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )[0] ?? null
      : null;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500",
    submitted_to_team: "bg-blue-600",
    team_in_progress: "bg-blue-600",
    awaiting_client_review: "bg-purple-600",
    approved: "bg-green-600",
    revision_requested: "bg-yellow-500",
    cancelled: "bg-red-500",
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    submitted_to_team: "With R&D team",
    team_in_progress: "R&D in progress",
    awaiting_client_review: "Awaiting your review",
    approved: "Approved",
    revision_requested: "Revisions requested",
    cancelled: "Cancelled",
  };

  return (
    <>
      <SEO
        title={`${project.name} - RD Sidekick`}
        description={project.description || "Project details"}
      />
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Link href="/projects">
            <Button variant="ghost" className="mb-4 sm:mb-6" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 break-words">{project.name}</h1>
              {project.description && (
                <p className="text-sm sm:text-base text-muted-foreground mb-3 break-words">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={statusColors[workflowStatus] || "bg-gray-500"}>
                  {statusLabels[workflowStatus] || workflowStatus}
                </Badge>
                {slaStatus && claimProject?.workflow_status === "team_in_progress" && (
                  <Badge className={slaStatus.color} variant="outline">
                    <slaStatus.icon className="h-3 w-3 mr-1" />
                    {slaStatus.label}
                  </Badge>
                )}
                {project.sector && <Badge variant="outline" className="text-xs">{project.sector}</Badge>}
                {project.stage && <Badge variant="outline" className="text-xs">{project.stage}</Badge>}
                <MessageWidget
                  entityType="project"
                  entityId={project.id}
                  entityName={project.name}
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
              {canEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditProjectName(project.name ?? "");
                    setEditProjectDescription(project.description ?? "");
                    setEditProjectSector(project.sector ?? "");
                    setEditProjectStage(project.stage ?? "");
                    setEditingProject(true);
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {canSendToTeam && (
                <Button 
                  onClick={() => setSendToTeamDialog(true)}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Send to Team</span>
                  <span className="sm:hidden">Send</span>
                </Button>
              )}
              {needsClientReview && (
                <Button 
                  onClick={() => setReviewDialog(true)}
                  size="sm"
                  className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Review Team's Work</span>
                  <span className="sm:hidden">Review</span>
                </Button>
              )}
              {canRecallFromTeam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecallDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Bring back to edit</span>
                  <span className="sm:hidden">Take back</span>
                </Button>
              )}
              {claimProject && claimProject.workflow_status !== "cancelled" && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setCancelDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1.3fr)]">
            <ProjectPhaseTimeline
              workflowStatus={workflowStatus}
              hasFeasibility={Boolean(feasibilityAnalysis)}
              hasTechnical={Boolean(
                technicalBaseline ||
                  technicalChange ||
                  technicalInnovation ||
                  rdTechnicalUnderstanding
              )}
              hasChallenges={Boolean(
                challengeUncertainties ||
                  challengeKnowledge ||
                  challengeWorkDone ||
                  rdChallenges
              )}
              hasActivities={rdActivities.length > 0}
              hasEvidence={evidence.length > 0}
              hasCosts={costAdvice.length > 0}
              createdAt={project.created_at}
              dueDate={claimProject?.due_date ?? null}
            />
            <ProjectReadinessPanel
              hasTechnical={hasClientTechnical}
              hasChallenges={hasClientChallenges}
              activityCount={rdActivities.length}
              evidenceCount={evidence.length}
              costCount={costAdvice.length}
              workflowStatus={workflowStatus}
              isLinkedToCompanion={Boolean(claimProject)}
              onSync={handleSyncReadiness}
              isSyncing={isSyncingReadiness}
            />
          </div>

          <div className="mt-4 sm:mt-6 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            <ProjectCostSummary items={costAdvice} />
            <ProjectHistoryPanel
              projectCreatedAt={project.created_at}
              feasibilityCreatedAt={feasibilityAnalysis?.created_at ?? null}
              claimWorkflowStatus={claimProject?.workflow_status ?? null}
              evidence={evidence}
              costs={costAdvice}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Project timeline (Gantt)</CardTitle>
              <CardDescription className="text-sm">
                Capture the key activities for this project with start and finish dates. This helps your R&amp;D team
                understand how work was sequenced across the accounting period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)] items-start">
                <div className="space-y-4">
                  {canEditTimeline && (
                    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:p-4">
                      <h3 className="text-sm font-semibold text-slate-100">Add timeline activity</h3>
                      <p className="text-xs text-slate-400">
                        Add design phases, experiments, prototyping rounds, or testing windows. You can keep it high level.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="timeline-name" className="text-xs">
                          Activity name
                        </Label>
                        <Input
                          id="timeline-name"
                          value={newTimelineName}
                          onChange={(e) => setNewTimelineName(e.target.value)}
                          placeholder="e.g. Prototype rig build, control algorithm testing"
                          className="text-xs sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="timeline-start" className="text-xs">
                            Start date
                          </Label>
                          <Input
                            id="timeline-start"
                            type="date"
                            value={newTimelineStart}
                            onChange={(e) => setNewTimelineStart(e.target.value)}
                            className="text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timeline-end" className="text-xs">
                            Finish date
                          </Label>
                          <Input
                            id="timeline-end"
                            type="date"
                            value={newTimelineEnd}
                            onChange={(e) => setNewTimelineEnd(e.target.value)}
                            className="text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddTimelineItem}
                          disabled={isSavingTimeline}
                        >
                          {isSavingTimeline ? "Adding..." : "Add activity"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!canEditTimeline && (
                    <p className="text-xs text-muted-foreground">
                      The timeline is locked because this project&apos;s claim has been approved or cancelled. 
                      If you need to update activities, please speak to your R&amp;D advisor to reopen the claim.
                    </p>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-100">Activities</h3>
                    {timelineItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No activities added yet. Use the form above to add design, build, test, or analysis phases.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {timelineItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-100 truncate">
                                {item.name || "Untitled activity"}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {item.start_date
                                  ? new Date(item.start_date).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "No start date"}{" "}
                                –{" "}
                                {item.end_date
                                  ? new Date(item.end_date).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "No end date"}
                              </p>
                            </div>
                            {canEditTimeline && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="flex-shrink-0"
                                onClick={() => handleDeleteTimelineItem(item.id)}
                                aria-label="Delete activity"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-100">Visual timeline</h3>
                  <ProjectGantt
                    items={timelineItems.map((item) => ({
                      id: item.id,
                      name: item.name || "Untitled activity",
                      start_date: item.start_date,
                      end_date: item.end_date,
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col gap-3">
              <div className="md:hidden">
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
                    <SelectItem value="feasibility">Feasibility</SelectItem>
                    <SelectItem value="rd-details">R&amp;D Details</SelectItem>
                    <SelectItem value="evidence">Evidence</SelectItem>
                    <SelectItem value="voice-notes">Voice Notes</SelectItem>
                    <SelectItem value="comments">Comments</SelectItem>
                    <SelectItem value="costs">Costs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TabsList className="w-full justify-start bg-slate-950/80 border border-slate-800 px-1 py-1 rounded-lg hidden md:flex">
                <TabsTrigger value="feasibility" className="px-3 sm:px-4">
                  Feasibility
                </TabsTrigger>
                <TabsTrigger value="rd-details" className="px-3 sm:px-4">
                  R&amp;D Details
                </TabsTrigger>
                <TabsTrigger value="evidence" className="px-3 sm:px-4">
                  Evidence
                </TabsTrigger>
                <TabsTrigger value="voice-notes" className="px-3 sm:px-4">
                  Voice Notes
                </TabsTrigger>
                <TabsTrigger value="comments" className="px-3 sm:px-4">
                  Comments
                </TabsTrigger>
                <TabsTrigger value="costs" className="px-3 sm:px-4">
                  Costs
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="feasibility">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Feasibility Analysis</CardTitle>
                  <CardDescription className="text-sm">
                    AI-powered feasibility assessment for this project
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feasibilityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  ) : feasibilityAnalysis ? (
                    <div className="space-y-4">
                      {feasibilityAnalysis.summary && (
                        <div className="p-3 sm:p-4 rounded-lg bg-slate-900 border border-slate-700">
                          <h3 className="font-semibold text-sm sm:text-base mb-2 flex items-center gap-2 text-slate-50">
                            <Sparkles className="h-4 w-4 text-[#ff6b35]" />
                            Analysis Summary
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-200 break-words">
                            {feasibilityAnalysis.summary}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        {feasibilityAnalysis.technical_rating && (
                          <div className="p-3 sm:p-4 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">
                              Technical Feasibility
                            </div>
                            <div className="text-lg sm:text-xl font-bold">
                              {feasibilityAnalysis.technical_rating}
                            </div>
                            {feasibilityAnalysis.technical_reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">
                                {feasibilityAnalysis.technical_reasoning}
                              </p>
                            )}
                          </div>
                        )}
                        {feasibilityAnalysis.commercial_rating && (
                          <div className="p-3 sm:p-4 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">
                              Commercial Viability
                            </div>
                            <div className="text-lg sm:text-xl font-bold">
                              {feasibilityAnalysis.commercial_rating}
                            </div>
                            {feasibilityAnalysis.commercial_reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">
                                {feasibilityAnalysis.commercial_reasoning}
                              </p>
                            )}
                          </div>
                        )}
                        {feasibilityAnalysis.rd_tax_flag && (
                          <div className="p-3 sm:p-4 border rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">
                              R&D Tax Eligibility
                            </div>
                            <div className="text-lg sm:text-xl font-bold">
                              {feasibilityAnalysis.rd_tax_flag}
                            </div>
                            {feasibilityAnalysis.rd_tax_reasoning && (
                              <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">
                                {feasibilityAnalysis.rd_tax_reasoning}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => router.push(`/feasibility/${feasibilityAnalysis.id}`)}
                        className="w-full sm:w-auto"
                        size="sm"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Feasibility Report
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        No feasibility analysis yet
                      </p>
                      <Button onClick={handleRunFeasibility} disabled={runningFeasibility} size="sm">
                        {runningFeasibility ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Running Analysis...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Run Feasibility Analysis
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rd-details">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>R&amp;D Details</CardTitle>
                  <CardDescription>
                    Capture the core information our team needs to assess this work for R&amp;D relief.
                    Work through each section; you don&apos;t need perfect wording, just describe things in your own words.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Tabs value={rdDetailsTab} onValueChange={setRdDetailsTab} className="space-y-6">
                    <div className="md:hidden mb-3">
                      <Select value={rdDetailsTab} onValueChange={setRdDetailsTab}>
                        <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-100">
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950 border-slate-800 text-slate-100">
                          <SelectItem value="technical">Technical Details</SelectItem>
                          <SelectItem value="challenges">Challenges</SelectItem>
                          <SelectItem value="activities">Qualifying Activities</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <TabsList className="bg-slate-900 hidden md:inline-flex">
                      <TabsTrigger value="technical">Technical Details</TabsTrigger>
                      <TabsTrigger value="challenges">Challenges</TabsTrigger>
                      <TabsTrigger value="activities">Qualifying Activities</TabsTrigger>
                    </TabsList>

                    <TabsContent value="technical" className="pt-4 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">1. Baseline / current system</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {technicalPlaceholders.baseline}
                        </p>
                        <Textarea
                          className="mt-2 min-h-[120px]"
                          placeholder="E.g. Existing setup, current tools or systems in use, and any limitations you are aware of."
                          value={technicalBaseline}
                          onChange={(e) => setTechnicalBaseline(e.target.value)}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">2. Change or new development</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {technicalPlaceholders.change}
                        </p>
                        <Textarea
                          className="mt-2 min-h-[120px]"
                          placeholder="E.g. New feature, architecture, component, control logic, or process you are introducing."
                          value={technicalChange}
                          onChange={(e) => setTechnicalChange(e.target.value)}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">3. Innovation / why this is different</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {technicalPlaceholders.innovation}
                        </p>
                        <Textarea
                          className="mt-2 min-h-[120px]"
                          placeholder="E.g. Why this goes beyond routine work or standard configurations in your field."
                          value={technicalInnovation}
                          onChange={(e) => setTechnicalInnovation(e.target.value)}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="challenges" className="pt-4 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">1. Uncertainties at the start</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {challengePlaceholders.uncertainties}
                        </p>
                        <Textarea
                          className="mt-2 min-h-[120px]"
                          placeholder="E.g. Key technical questions you were unsure about before starting."
                          value={challengeUncertainties}
                          onChange={(e) => setChallengeUncertainties(e.target.value)}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">2. Existing knowledge and information</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {challengePlaceholders.knowledge}
                        </p>
                        <Textarea
                          className="mt-2 min-h-[120px]"
                          placeholder="E.g. Design codes, datasheets, internal knowledge, previous projects, or external research you drew on."
                          value={challengeKnowledge}
                          onChange={(e) => setChallengeKnowledge(e.target.value)}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">
                          3. Work done to resolve the uncertainties (tests, experiments, iterations)
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {challengePlaceholders.workDone}
                        </p>
                        <Textarea
                          className="mt-2 min-h-[120px]"
                          placeholder="E.g. Prototypes built, simulations run, trial runs at different settings, inspected failures and iterated..."
                          value={challengeWorkDone}
                          onChange={(e) => setChallengeWorkDone(e.target.value)}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="activities" className="pt-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">Qualifying R&amp;D activities</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          List the main pieces of work that involved overcoming technical uncertainty. Each item should be a distinct activity
                          (e.g. &quot;Prototype intake design and testing&quot;, &quot;Control algorithm modelling&quot;).
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {rdActivities.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No activities added yet. Use the box below to add activities such as
                            experiments, design iterations, or investigations.
                          </p>
                        ) : (
                          rdActivities.map((activity, index) => (
                            <span
                              key={`${activity}-${index}`}
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs bg-background/40"
                            >
                              <span className="mr-2">{activity}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveActivity(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label="Remove activity"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={newActivity}
                          onChange={(e) => setNewActivity(e.target.value)}
                          placeholder="e.g. Prototype engine mounting tests, CFD simulations, control algorithm tuning"
                          className="text-sm"
                        />
                        <Button
                          type="button"
                          onClick={handleAddActivity}
                          disabled={!newActivity.trim()}
                          size="sm"
                        >
                          Add activity
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveRdDetails} disabled={savingRdDetails}>
                      {savingRdDetails ? "Saving..." : "Save R&D details"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="evidence">
              <div className="space-y-4 sm:space-y-6">
                {canEdit && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Add Evidence</CardTitle>
                      <CardDescription className="text-sm">
                        Upload files, add notes, or link external resources
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant={evidenceType === "note" ? "default" : "outline"}
                          onClick={() => setEvidenceType("note")}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Note
                        </Button>
                        <Button
                          type="button"
                          variant={evidenceType === "file" ? "default" : "outline"}
                          onClick={() => setEvidenceType("file")}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          File
                        </Button>
                        <Button
                          type="button"
                          variant={evidenceType === "link" ? "default" : "outline"}
                          onClick={() => setEvidenceType("link")}
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Link
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="evidenceTitle" className="text-sm">
                            Title
                          </Label>
                          <Input
                            id="evidenceTitle"
                            value={evidenceTitle}
                            onChange={(e) => setEvidenceTitle(e.target.value)}
                            placeholder="Brief title for this evidence"
                            className="text-sm"
                          />
                        </div>

                        {evidenceType === "note" && (
                          <div>
                            <Label htmlFor="evidenceBody" className="text-sm">
                              Description
                            </Label>
                            <Textarea
                              id="evidenceBody"
                              value={evidenceBody}
                              onChange={(e) => setEvidenceBody(e.target.value)}
                              placeholder="Describe your evidence..."
                              rows={4}
                              className="text-sm resize-none"
                            />
                          </div>
                        )}

                        {evidenceType === "file" && (
                          <div>
                            <Label htmlFor="evidenceFile" className="text-sm">
                              Upload File
                            </Label>
                            <Input
                              id="evidenceFile"
                              type="file"
                              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                              className="text-sm"
                            />
                          </div>
                        )}

                        {evidenceType === "link" && (
                          <div>
                            <Label htmlFor="evidenceUrl" className="text-sm">
                              External URL
                            </Label>
                            <Input
                              id="evidenceUrl"
                              value={evidenceUrl}
                              onChange={(e) => setEvidenceUrl(e.target.value)}
                              placeholder="https://..."
                              className="text-sm"
                            />
                          </div>
                        )}

                        <Button
                          onClick={handleAddEvidence}
                          disabled={submitting}
                          className="w-full sm:w-auto"
                          size="sm"
                        >
                          {submitting ? "Adding..." : "Add Evidence"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">
                      Evidence Items ({evidence.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {evidence.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No evidence yet. Add your first evidence item above.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {evidence.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="secondary" className="text-xs">
                                    {item.type}
                                  </Badge>
                                  {item.title && (
                                    <h4 className="font-medium text-sm break-words">
                                      {item.title}
                                    </h4>
                                  )}
                                </div>
                                {item.body && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 break-words line-clamp-2">
                                    {item.body}
                                  </p>
                                )}
                                {item.external_url && (
                                  <a
                                    href={item.external_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline break-all"
                                  >
                                    {item.external_url}
                                  </a>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteEvidence(item.id)}
                                  disabled={deletingEvidence === item.id}
                                  className="flex-shrink-0"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="voice-notes" className="mt-6">
              {project && (
                <ProjectVoiceNotes projectId={project.id} />
              )}
            </TabsContent>

            <TabsContent value="comments" className="mt-6 space-y-6">
              <div className="space-y-4 sm:space-y-6">
                {latestStaffComment && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-[#ff6b35]" />
                        From your RDtax team
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Latest summary or feedback shared by your R&amp;D specialists.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(latestStaffComment.created_at).toLocaleDateString("en-GB")}
                      </p>
                      <p className="text-sm break-words whitespace-pre-wrap">
                        {latestStaffComment.body}
                      </p>
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Add Comment</CardTitle>
                    <CardDescription className="text-sm">
                      Share updates or respond to RD staff feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Write a comment..."
                      rows={4}
                      className="text-sm resize-none"
                    />
                    <Button 
                      onClick={handleAddComment} 
                      disabled={submitting || !commentBody.trim()}
                      className="w-full sm:w-auto"
                      size="sm"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitting ? "Posting..." : "Post Comment"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">
                      Comments ({comments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No comments yet. Start the conversation!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-3 sm:p-4 border rounded-lg">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant={
                                    comment.author_role === "rd_staff" ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {comment.author_role === "rd_staff" ? "RD Staff" : "Client"}
                                </Badge>
                                {comment.author?.email && (
                                  <span className="text-xs text-muted-foreground break-all">
                                    {comment.author.email}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm break-words whitespace-pre-wrap">
                              {comment.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="costs" className="mt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Advise costs for this project</CardTitle>
                    <CardDescription>
                      Share your best view of the costs linked to this project. The R&D team will
                      review and use these when preparing the claim.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cost-type">Cost type</Label>
                        <Select value={costType} onValueChange={setCostType}>
                          <SelectTrigger id="cost-type">
                            <SelectValue placeholder="Choose a cost type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="subcontractor">Subcontractor</SelectItem>
                            <SelectItem value="consumables">Consumables / materials</SelectItem>
                            <SelectItem value="software">Software</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cost-amount">Estimated amount</Label>
                        <Input
                          id="cost-amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={costAmount}
                          onChange={(e) => setCostAmount(e.target.value)}
                          placeholder="e.g. 12000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cost-description">What does this cover?</Label>
                        <Textarea
                          id="cost-description"
                          value={costDescription}
                          onChange={(e) => setCostDescription(e.target.value)}
                          placeholder="Briefly describe the staff time, subcontractor work, materials, or other costs."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cost-notes">Notes for the R&D team (optional)</Label>
                        <Textarea
                          id="cost-notes"
                          value={costNotes}
                          onChange={(e) => setCostNotes(e.target.value)}
                          placeholder="Anything that will help the team interpret this number, such as assumptions or ranges."
                          rows={2}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={handleSubmitCostAdvice}
                          disabled={isSubmittingCostAdvice || !project}
                        >
                          {isSubmittingCostAdvice
                            ? editingCostId
                              ? "Updating..."
                              : "Saving..."
                            : editingCostId
                            ? "Update cost advice"
                            : "Save cost advice"}
                        </Button>
                        {editingCostId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEditCostAdvice}
                            disabled={isSubmittingCostAdvice}
                          >
                            Cancel edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Costs shared so far</CardTitle>
                    <CardDescription>
                      These are the costs you or your colleagues have advised for this project.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingCostAdvice ? (
                      <p className="text-sm text-muted-foreground">Loading costs...</p>
                    ) : costAdvice.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No costs advised yet. Add your first estimate on the left.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {costAdvice.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border bg-card px-4 py-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="capitalize">
                                      {item.cost_type.replace("_", " ")}
                                    </Badge>
                                    <span className="font-medium">
                                      £
                                      {Number(item.amount).toLocaleString("en-GB", {
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(item.created_at).toLocaleDateString("en-GB")}
                                  </span>
                                </div>
                                {item.description && (
                                  <p className="mt-1 text-muted-foreground">{item.description}</p>
                                )}
                                {item.notes && (
                                  <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 pl-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCostAdvice(item)}
                                  aria-label="Edit cost"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCostAdvice(item.id)}
                                  aria-label="Delete cost"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Send to Team Dialog */}
          <Dialog open={sendToTeamDialog} onOpenChange={setSendToTeamDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Project to R&D Team?</DialogTitle>
                <DialogDescription>
                  Your project will be sent to your R&D team for technical review. They have 3 business days to complete their review and send it back to you.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendToTeamDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendToTeam} disabled={submitting}>
                  {submitting ? "Sending..." : "Send to Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Review Dialog with Partial Approval */}
          <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Review Team's Work</DialogTitle>
                <DialogDescription>
                  Review each section and approve or request changes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.basic_info === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          basic_info: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Basic Information</h4>
                      <p className="text-sm text-muted-foreground">Project name, description, sector, stage</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.technical_understanding === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          technical_understanding: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Technical Understanding</h4>
                      <p className="text-sm text-muted-foreground">Team's technical analysis and approach</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.challenges === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          challenges: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Challenges & Uncertainties</h4>
                      <p className="text-sm text-muted-foreground">Technical challenges and risk assessment</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      checked={approvalSections.qualifying_activities === "approved"}
                      onCheckedChange={(checked) => 
                        setApprovalSections(prev => ({
                          ...prev,
                          qualifying_activities: checked ? "approved" : "needs_revision"
                        }))
                      }
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">Qualifying Activities</h4>
                      <p className="text-sm text-muted-foreground">R&D activities and eligibility assessment</p>
                    </div>
                  </div>
                </div>

                {Object.values(approvalSections).some(s => s === "needs_revision") && (
                  <div className="space-y-2">
                    <Label>Feedback for sections needing revision</Label>
                    <Textarea
                      value={revisionFeedback}
                      onChange={(e) => setRevisionFeedback(e.target.value)}
                      placeholder="Explain what needs to be changed..."
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleApproveProject}
                  disabled={submitting || (Object.values(approvalSections).some(s => s === "needs_revision") && !revisionFeedback.trim())}
                >
                  {submitting ? "Submitting..." : Object.values(approvalSections).every(s => s === "approved") ? "Approve All" : "Submit Feedback"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Recall From Team Dialog */}
          <Dialog open={recallDialog} onOpenChange={setRecallDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bring project back to you?</DialogTitle>
                <DialogDescription>
                  This will pause work by the R&amp;D team and move the project back to your draft list so you can make further changes.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 text-sm text-muted-foreground">
                You can send the project back to the team again whenever you are ready.
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRecallDialog(false)}>
                  Keep with team
                </Button>
                <Button onClick={handleRecallFromTeam} disabled={submitting}>
                  {submitting ? "Bringing back..." : "Bring back to edit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Cancel Dialog */}
          <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Project?</DialogTitle>
                <DialogDescription>
                  Please provide a reason for cancelling this project
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  rows={4}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelDialog(false)}>
                  Keep Project
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelProject}
                  disabled={submitting || !cancelReason.trim()}
                >
                  {submitting ? "Cancelling..." : "Cancel Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    </>
  );
}