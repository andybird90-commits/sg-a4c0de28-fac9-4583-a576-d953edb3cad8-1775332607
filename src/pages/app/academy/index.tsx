import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface AcademyModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: "not_started" | "in_progress" | "completed";
}

const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: "rd-fundamentals",
    title: "R&D Fundamentals",
    description:
      "Understand the legal framework behind UK R&D tax relief including BEIS guidelines and HMRC CIRD rules.",
    duration: "45–60 min",
    status: "in_progress",
  },
  {
    id: "claim-writing-mastery",
    title: "Claim Writing Mastery",
    description:
      "Learn how to write strong technical narratives that clearly demonstrate technological uncertainty and advancement.",
    duration: "60–90 min",
    status: "not_started",
  },
  {
    id: "evidence-assessment",
    title: "Evidence Assessment",
    description:
      "Identify and organise the correct supporting evidence to strengthen a claim.",
    duration: "45–60 min",
    status: "not_started",
  },
  {
    id: "hmrc-enquiry-simulator",
    title: "HMRC Enquiry Simulator",
    description:
      "Practice responding to HMRC enquiries through interactive AI-driven simulations.",
    duration: "60 min",
    status: "not_started",
  },
  {
    id: "ai-claim-critique",
    title: "AI Claim Critique",
    description:
      "Upload draft claims and receive AI analysis highlighting weaknesses and improvement opportunities.",
    duration: "30–45 min",
    status: "not_started",
  },
];

interface CertificationStatus {
  loading: boolean;
  eligible: boolean;
  reason?: string;
}

function useCertificationStatus(): [CertificationStatus, () => Promise<void>] {
  const [status, setStatus] = useState<CertificationStatus>({
    loading: true,
    eligible: false,
  });

  const refresh = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch("/api/academy/certification/status");
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

function getStatusLabel(status: AcademyModule["status"]): string {
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

function getStatusChipClasses(status: AcademyModule["status"]): string {
  switch (status) {
    case "completed":
      return "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40";
    case "in_progress":
      return "bg-amber-500/10 text-amber-300 border border-amber-500/40";
    case "not_started":
    default:
      return "bg-slate-800 text-slate-200 border border-slate-700";
  }
}

export default function RdAgentAcademyPage() {
  const { user } = useApp();
  const [certStatus] = useCertificationStatus();

  const totals = useMemo(() => {
    const total = ACADEMY_MODULES.length;
    const completed = ACADEMY_MODULES.filter((m) => m.status === "completed").length;
    const inProgress = ACADEMY_MODULES.filter((m) => m.status === "in_progress").length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const certificationStatus = completed === total ? "Completed" : "In Progress";

    return { total, completed, inProgress, percent, certificationStatus };
  }, []);

  return (
    <>
      <SEO
        title="RD Agent Academy"
        description="Professional training for R&D tax advisers. Learn legislation, claim writing, evidence assessment, and HMRC enquiry defence."
      />
      <Layout>
        <div className="min-h-screen bg-[#020617] text-slate-100">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-8">
              <h1 className="mb-3 text-3xl font-semibold text-slate-50 sm:text-4xl">
                RD Agent Academy
              </h1>
              <p className="max-w-3xl text-sm text-slate-400 sm:text-base">
                Professional training for R&amp;D tax advisers. Learn legislation, claim writing,
                evidence assessment, and HMRC enquiry defence.
              </p>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(280px,1fr)]">
              <div className="space-y-6">
                <Card className="bg-[#020817] border-slate-800 shadow-professional-md">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-50">
                        Your Academy Progress
                      </CardTitle>
                      <CardDescription className="text-slate-400">
                        {user?.email
                          ? `Learning profile for ${user.email}`
                          : "Track your progress through the RD Agent curriculum."}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="rounded-full bg-slate-900 px-3 py-1 text-slate-200 border border-slate-700">
                        Modules Completed:{" "}
                        <span className="font-semibold">
                          {totals.completed} / {totals.total}
                        </span>
                      </div>
                      <div className="rounded-full bg-slate-900 px-3 py-1 text-slate-200 border border-slate-700">
                        Certification:{" "}
                        <span className="font-semibold">{totals.certificationStatus}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>Overall Progress</span>
                        <span className="font-medium text-slate-200">
                          {totals.percent}% complete
                        </span>
                      </div>
                      <Progress
                        value={totals.percent}
                        className="h-2 bg-slate-900 [&>div]:bg-[#ff6b35]"
                      />
                      <p className="text-xs text-slate-500">
                        Complete all modules and pass the final assessment to unlock your RD Agent
                        Certification.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-50">Training Modules</h2>
                    <p className="text-xs text-slate-400 sm:text-sm">
                      {totals.completed} of {totals.total} modules completed
                      {totals.inProgress > 0 && ` · ${totals.inProgress} in progress`}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {ACADEMY_MODULES.map((module) => (
                      <Card
                        key={module.id}
                        className="flex flex-col justify-between border-slate-800 bg-[#020817] transition-colors hover:border-[#ff6b35]/60 hover:shadow-professional-lg"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="mb-1 text-base text-slate-50 sm:text-lg">
                            {module.title}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-400 sm:text-sm">
                            {module.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="px-6 pb-4 pt-0">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span>Estimated duration</span>
                              <span className="font-medium text-slate-200">
                                {module.duration}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Status</span>
                              <span
                                className={
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium " +
                                  getStatusChipClasses(module.status)
                                }
                              >
                                {module.status === "completed"
                                  ? "Completed"
                                  : module.status === "in_progress"
                                  ? "In Progress"
                                  : "Not Started"}
                              </span>
                            </div>
                            <Link href={`/app/academy/module/${module.id}`} passHref>
                              <Button className="mt-1 w-full bg-[#ff6b35] text-slate-950 text-sm hover:bg-[#ff8c42]">
                                {getStatusLabel(module.status)}
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <Card className="bg-[#020817] border-slate-800 shadow-professional-md">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50">
                      Your Certification
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Track your progress toward becoming a certified RD Agent.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-2xl">
                        🎓
                      </div>
                      <div className="text-xs text-slate-300">
                        <p className="mb-1 font-medium text-slate-100">
                          Certification Requirements
                        </p>
                        <ul className="list-inside list-disc space-y-1">
                          <li>Complete all core modules</li>
                          <li>Pass the final knowledge assessment</li>
                          <li>Demonstrate applied case study understanding</li>
                        </ul>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <p className="font-medium">Progress toward certification</p>
                      <div className="flex items-center justify-between">
                        <span>Modules completed</span>
                        <span className="font-semibold">
                          {totals.completed} / {totals.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Certification status</span>
                        <span className="font-semibold">{totals.certificationStatus}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Complete all modules and pass the final assessment to receive the RD Agent
                      Certification.
                    </p>

                    <Button
                      variant="outline"
                      className="w-full border-[#ff6b35] text-sm text-[#ff6b35] hover:bg-[#ff6b35]/10"
                    >
                      View Certification Requirements
                    </Button>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}