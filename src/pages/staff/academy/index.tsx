import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ModuleStatus = "not_started" | "in_progress" | "completed";

interface AcademyModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: "foundation" | "advanced";
}

const FOUNDATION_MODULES: AcademyModule[] = [
  {
    id: "rd-fundamentals",
    title: "R&D Fundamentals",
    description:
      "Understand the legal framework behind UK R&D tax relief including BEIS guidelines and HMRC CIRD rules.",
    duration: "15–30 min",
    level: "foundation",
  },
  {
    id: "claim-writing-mastery",
    title: "Claim Writing Mastery",
    description:
      "Learn how to write strong technical narratives that clearly demonstrate technological uncertainty and advancement.",
    duration: "15–30 min",
    level: "foundation",
  },
  {
    id: "evidence-assessment",
    title: "Evidence Assessment",
    description: "Identify and organise the correct supporting evidence to strengthen a claim.",
    duration: "15–30 min",
    level: "foundation",
  },
  {
    id: "permitted-costs",
    title: "Permitted Costs & Apportionment",
    description:
      "Understand which UK R&D costs qualify, which do not, and how to apportion staff and overheads defensibly.",
    duration: "15–30 min",
    level: "foundation",
  },
  {
    id: "hmrc-enquiry-simulator",
    title: "HMRC Enquiry Simulator",
    description: "Practice responding to HMRC enquiries through interactive AI-driven simulations.",
    duration: "15–30 min",
    level: "foundation",
  },
  {
    id: "ai-claim-critique",
    title: "AI Claim Critique",
    description:
      "Upload draft claims and receive AI analysis highlighting weaknesses and improvement opportunities.",
    duration: "15–30 min",
    level: "foundation",
  },
];

const ADVANCED_MODULES: AcademyModule[] = [
  {
    id: "sector-software-digital",
    title: "Sector Deep Dive: Software & Digital",
    description:
      "Apply BEIS tests to SaaS, platforms, data and AI projects, and separate genuine R&D from routine delivery.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "sector-manufacturing-engineering",
    title: "Sector Deep Dive: Manufacturing & Engineering",
    description:
      "Assess R&D in materials, tolerances, automation and robotics, including complex process-improvement borderline cases.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "advanced-sampling-apportionment",
    title: "Advanced Sampling & Apportionment Methods",
    description:
      "Design statistically sensible, HMRC-ready sampling and apportionment frameworks for staff time and costs.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "risk-governance-file-quality",
    title: "Risk Management & File Governance",
    description:
      "Build a gold-standard review and governance process so every file can withstand enquiry-level scrutiny.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "enquiry-case-studies-outcomes",
    title: "HMRC Enquiry Case Studies & Outcomes",
    description:
      "Work through anonymised enquiry cases to understand what triggered them and what resolved them.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "commercials-pricing-communication",
    title: "Commercials, Pricing & Client Communication",
    description:
      "Link technical quality to pricing, scope control and difficult client conversations in R&D advisory.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "ai-enabled-practice-operations",
    title: "AI-Enabled Practice Operations",
    description:
      "Design safe AI workflows across your R&D practice, from drafting to evidence discovery and internal QA.",
    duration: "15–30 min",
    level: "advanced",
  },
  {
    id: "ethics-professional-standards",
    title: "Ethics & Professional Standards in R&D Advisory",
    description:
      "Handle borderline claims, conflicts and disengagements while protecting the firm and the adviser personally.",
    duration: "15–30 min",
    level: "advanced",
  },
];

interface CertificationStatus {
  loading: boolean;
  eligible: boolean;
  reason?: string;
}

interface ModuleProgressSummary {
  moduleId: string;
  quizPassed: boolean;
  completedAt: string | null;
  lastScore: number | null;
}

interface AcademyModuleWithStatus extends AcademyModule {
  status: ModuleStatus;
  lastScore: number | null;
}

async function getAcademyAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function useCertificationStatus(): [CertificationStatus, () => Promise<void>] {
  const [status, setStatus] = useState<CertificationStatus>({
    loading: true,
    eligible: false,
  });

  const refresh = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const headers = await getAcademyAuthHeaders();
      const response = await fetch("/api/academy/certification/status", {
        headers,
      });
      if (!response.ok) {
        setStatus({
          loading: false,
          eligible: false,
          reason: "Unable to load certification status.",
        });
        return;
      }
      const json = await response.json();
      setStatus({
        loading: false,
        eligible: json.eligible,
        reason: json.reason,
      });
    } catch {
      setStatus({
        loading: false,
        eligible: false,
        reason: "Unable to load certification status.",
      });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return [status, refresh];
}

function useModuleProgress(): [ModuleProgressSummary[], boolean] {
  const [progress, setProgress] = useState<ModuleProgressSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const headers = await getAcademyAuthHeaders();

        const response = await fetch("/api/academy/progress", {
          headers,
        });

        if (!response.ok) {
          setProgress([]);
          return;
        }

        const json = await response.json();
        const modules = Array.isArray(json.modules) ? json.modules : [];

        setProgress(
          modules.map((item: any) => ({
            moduleId: item.moduleId,
            quizPassed: Boolean(item.quizPassed),
            completedAt: item.completedAt ?? null,
            lastScore:
              typeof item.lastScore === "number" ? item.lastScore : item.lastScore ?? null,
          })),
        );
      } catch {
        setProgress([]);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  return [progress, loading];
}

function getStatusLabel(status: ModuleStatus): string {
  switch (status) {
    case "completed":
      return "Review Module";
    case "in_progress":
      return "Continue Module";
    case "not_started":
    default:
      return "Start Module";
  }
}

function getStatusChipClasses(status: ModuleStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "in_progress":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "not_started":
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function getModuleStatusFromProgress(
  moduleId: string,
  progress: ModuleProgressSummary[],
): ModuleStatus {
  const record = progress.find((item) => item.moduleId === moduleId);
  if (!record) {
    return "not_started";
  }

  const hasPassedQuiz = record.quizPassed;
  const hasSufficientScore = record.lastScore !== null && record.lastScore >= 70;

  if (hasPassedQuiz || hasSufficientScore) {
    return "completed";
  }

  return "in_progress";
}

export default function StaffRdAgentAcademyPage() {
  const { user } = useApp();
  const [certStatus, refreshStatus] = useCertificationStatus();
  const [moduleProgress, moduleProgressLoading] = useModuleProgress();

  const foundationTotals = useMemo(() => {
    const statuses: ModuleStatus[] = FOUNDATION_MODULES.map((module) =>
      getModuleStatusFromProgress(module.id, moduleProgress),
    );

    const total = statuses.length;
    const completed = statuses.filter((status) => status === "completed").length;
    const inProgress = statuses.filter((status) => status === "in_progress").length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, inProgress, percent };
  }, [moduleProgress]);

  const advancedTotals = useMemo(() => {
    const statuses: ModuleStatus[] = ADVANCED_MODULES.map((module) =>
      getModuleStatusFromProgress(module.id, moduleProgress),
    );

    const total = statuses.length;
    const completed = statuses.filter((status) => status === "completed").length;
    const inProgress = statuses.filter((status) => status === "in_progress").length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, inProgress, percent };
  }, [moduleProgress]);

  const handleGenerateCertificate = async () => {
    const headers = await getAcademyAuthHeaders();

    const response = await fetch("/api/academy/certificates/generate", {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      await refreshStatus();
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rd-agent-certificate.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    await refreshStatus();
  };

  const foundationCertified = certStatus.eligible;

  return (
    <>
      <SEO
        title="RD Agent Academy"
        description="Professional training for R&D tax advisers. Learn legislation, claim writing, evidence assessment, and HMRC enquiry defence."
      />
      <StaffLayout title="RD Agent Academy">
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-8">
              <h1 className="mb-3 text-3xl font-semibold text-foreground sm:text-4xl">
                RD Agent Academy
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                Professional training for R&amp;D tax advisers. Learn legislation, claim writing,
                evidence assessment, and HMRC enquiry defence.
              </p>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(280px,1fr)]">
              <div className="space-y-6">
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        Your Academy Progress
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {user?.email
                          ? `Learning profile for ${user.email}`
                          : "Track your progress through the RD Agent curriculum."}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                        Foundation Modules:{" "}
                        <span className="font-semibold text-foreground">
                          {foundationTotals.completed} / {foundationTotals.total}
                        </span>
                      </div>
                      <div className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                        Foundation Certification:{" "}
                        <span className="font-semibold text-foreground">
                          {foundationCertified ? "Completed" : "In Progress"}
                        </span>
                      </div>
                      <div className="rounded-full border border-border bg-muted px-3 py-1 text-muted-foreground">
                        Advanced Modules:{" "}
                        <span className="font-semibold text-foreground">
                          {advancedTotals.completed} / {advancedTotals.total}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Foundation track progress</span>
                          <span className="font-medium text-foreground">
                            {foundationTotals.percent}% complete
                          </span>
                        </div>
                        <Progress
                          value={foundationTotals.percent}
                          className="h-2 bg-muted [&>div]:bg-primary"
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Advanced track progress</span>
                          <span className="font-medium text-foreground">
                            {advancedTotals.percent}% complete
                          </span>
                        </div>
                        <Progress
                          value={advancedTotals.percent}
                          className="h-2 bg-muted [&>div]:bg-slate-400"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Complete all foundation modules and pass their assessments to unlock credit
                        for the Advanced RD Agent track. You can still view advanced content before
                        then, but quiz results will not count until Foundation is complete.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                      Foundation Modules
                    </h2>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {foundationTotals.completed} of {foundationTotals.total} modules completed
                      {foundationTotals.inProgress > 0 && ` · ${foundationTotals.inProgress} in progress`}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {FOUNDATION_MODULES.map((module) => {
                      const status = getModuleStatusFromProgress(module.id, moduleProgress);
                      return (
                        <Card
                          key={module.id}
                          className="flex flex-col justify-between border-border bg-card transition-colors hover:border-primary/60 hover:shadow-professional-lg"
                        >
                          <CardHeader className="pb-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Foundation
                              </CardTitle>
                            </div>
                            <CardTitle className="mb-1 text-base text-foreground sm:text-lg">
                              {module.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                              {module.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="px-6 pb-4 pt-0">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Estimated duration</span>
                                <span className="font-medium text-foreground">
                                  {module.duration}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Status</span>
                                <span
                                  className={
                                    "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                                    getStatusChipClasses(status)
                                  }
                                >
                                  {status === "completed"
                                    ? "Completed"
                                    : status === "in_progress"
                                    ? "In Progress"
                                    : "Not Started"}
                                </span>
                              </div>
                              <Link href={`/staff/academy/module/${module.id}`} passHref>
                                <Button className="mt-1 w-full bg-primary text-sm text-primary-foreground hover:bg-orange-500">
                                  {moduleProgressLoading ? "Loading…" : getStatusLabel(status)}
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        Advanced Modules
                      </h2>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        Unlocks for certification credit after completing all foundation modules.
                        You can still open and study these modules in view-only mode beforehand.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      {advancedTotals.completed} of {advancedTotals.total} modules completed
                      {advancedTotals.inProgress > 0 && ` · ${advancedTotals.inProgress} in progress`}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {ADVANCED_MODULES.map((module) => {
                      const status = getModuleStatusFromProgress(module.id, moduleProgress);
                      const lockedForCredit = !foundationCertified;

                      return (
                        <Card
                          key={module.id}
                          className="flex flex-col justify-between border-border bg-card transition-colors hover:border-primary/60 hover:shadow-professional-lg"
                        >
                          <CardHeader className="pb-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                Advanced
                              </CardTitle>
                              {lockedForCredit && (
                                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                  Certification locked
                                </span>
                              )}
                            </div>
                            <CardTitle className="mb-1 text-base text-foreground sm:text-lg">
                              {module.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                              {module.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="px-6 pb-4 pt-0">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Estimated duration</span>
                                <span className="font-medium text-foreground">
                                  {module.duration}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Status</span>
                                <span
                                  className={
                                    "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                                    (lockedForCredit
                                      ? "bg-muted text-muted-foreground border border-border"
                                      : getStatusChipClasses(status))
                                  }
                                >
                                  {lockedForCredit
                                    ? "View only (no credit yet)"
                                    : status === "completed"
                                    ? "Completed"
                                    : status === "in_progress"
                                    ? "In Progress"
                                    : "Not Started"}
                                </span>
                              </div>
                              <Link href={`/staff/academy/module/${module.id}`} passHref>
                                <Button
                                  className={
                                    "mt-1 w-full text-sm " +
                                    (lockedForCredit
                                      ? "border border-border bg-muted text-foreground hover:bg-muted"
                                      : "bg-primary text-primary-foreground hover:bg-orange-500")
                                  }
                                >
                                  {lockedForCredit
                                    ? "View module content"
                                    : moduleProgressLoading
                                    ? "Loading…"
                                    : getStatusLabel(status)}
                                </Button>
                              </Link>
                              {lockedForCredit && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  You can read and practice this module now. Quiz results will only
                                  count toward Advanced certification after you complete all
                                  Foundation modules.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <Card className="bg-card border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground">
                      Your Foundation Certification
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Track your progress toward becoming a certified RD Agent (Foundation).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-10 items-center justify-center rounded-md border border-border bg-muted text-2xl">
                        🎓
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p className="mb-1 font-medium text-foreground">
                          Foundation Certification
                        </p>
                        <ul className="list-inside list-disc space-y-1">
                          <li>Complete all 6 foundation modules</li>
                          <li>Pass each module assessment</li>
                          <li>Unlock access to Advanced track credit</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Foundation progress</p>
                      <div className="flex items-center justify-between">
                        <span>Modules completed</span>
                        <span className="font-semibold text-foreground">
                          {foundationTotals.completed} / {foundationTotals.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Certification status</span>
                        <span className="font-semibold text-foreground">
                          {foundationCertified ? "Completed" : "In Progress"}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Complete all foundation modules and pass the final assessments to receive the
                      RD Agent Foundation Certification and unlock advanced certification credit.
                    </p>

                    <Button
                      variant="outline"
                      className="w-full border-primary text-sm text-primary hover:bg-primary/10"
                      disabled={certStatus.loading || !foundationCertified}
                      onClick={handleGenerateCertificate}
                    >
                      {certStatus.loading
                        ? "Checking eligibility…"
                        : foundationCertified
                        ? "Generate Foundation Certificate"
                        : "Certification Locked"}
                    </Button>
                    {!certStatus.loading && !foundationCertified && certStatus.reason && (
                      <p className="text-[11px] text-muted-foreground">{certStatus.reason}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base text-foreground">
                      Advanced Certification
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Advanced RD Agent certification for experienced advisers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <p>To qualify for Advanced certification you will need to:</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>Hold the Foundation Certification</li>
                      <li>Complete any 6 of the 8 advanced modules</li>
                      <li>Pass each selected module assessment</li>
                    </ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Advanced module content is always viewable. Quiz results for advanced modules
                      start counting toward certification once your Foundation Certificate is
                      achieved.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </StaffLayout>
    </>
  );
}