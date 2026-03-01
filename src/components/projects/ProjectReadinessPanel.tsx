import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ClipboardList, FileText, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectReadinessPanelProps {
  hasTechnical: boolean;
  hasChallenges: boolean;
  activityCount: number;
  evidenceCount: number;
  costCount: number;
  workflowStatus: string;
}

interface Score {
  label: string;
  value: number;
  max: number;
  description: string;
  icon: JSX.Element;
}

const clamp = (value: number, max: number): number =>
  Math.max(0, Math.min(value, max));

export const ProjectReadinessPanel: FC<ProjectReadinessPanelProps> = ({
  hasTechnical,
  hasChallenges,
  activityCount,
  evidenceCount,
  costCount,
  workflowStatus,
}) => {
  const rdStoryScore = clamp(
    (hasTechnical ? 2 : 0) +
      (hasChallenges ? 2 : 0) +
      (activityCount > 0 ? 1 : 0),
    5
  );
  const evidenceScore = clamp(
    evidenceCount === 0 ? 0 : evidenceCount < 3 ? 2 : evidenceCount < 6 ? 4 : 5,
    5
  );
  const costScore = clamp(
    costCount === 0 ? 0 : costCount < 2 ? 3 : 5,
    5
  );

  const overallScore = Math.round(
    (rdStoryScore + evidenceScore + costScore) / 3
  );

  const scores: Score[] = [
    {
      label: "R&D story",
      value: rdStoryScore,
      max: 5,
      description:
        hasTechnical && hasChallenges
          ? "Core R&D story captured."
          : "Add more detail so we can tell a strong R&D story.",
      icon: <FileText className="h-4 w-4 text-orange-400" />,
    },
    {
      label: "Evidence",
      value: evidenceScore,
      max: 5,
      description:
        evidenceCount > 0
          ? "Good supporting material in place."
          : "Upload specs, drawings or emails that show the work.",
      icon: <ClipboardList className="h-4 w-4 text-sky-400" />,
    },
    {
      label: "Costs",
      value: costScore,
      max: 5,
      description:
        costCount > 0
          ? "Costs advised for this project."
          : "Add your best-view costs. We can refine them later.",
      icon: <Wallet className="h-4 w-4 text-emerald-400" />,
    },
  ];

  const missingItems: string[] = [];
  if (!hasTechnical) {
    missingItems.push("Describe the current system and what you are changing.");
  }
  if (!hasChallenges) {
    missingItems.push(
      "Explain the technical uncertainties and main challenges you faced."
    );
  }
  if (activityCount === 0) {
    missingItems.push(
      "List at least one R&D activity (tests, trials or design iterations)."
    );
  }
  if (evidenceCount === 0) {
    missingItems.push(
      "Upload at least one piece of evidence such as a spec, diagram or test result."
    );
  }
  if (costCount === 0) {
    missingItems.push("Add estimated staff, subcontractor or materials costs.");
  }

  const isAwaitingClientReview =
    workflowStatus === "awaiting_client_review" ||
    workflowStatus === "revision_requested";

  return (
    <Card className="bg-slate-950/60 border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-100">
              R&D Readiness
            </CardTitle>
            <p className="mt-1 text-xs text-slate-400">
              A quick view of how complete this project looks for an RDtax
              claim.
            </p>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-slate-400">Overall</span>
            <span className="text-lg font-semibold text-slate-50 leading-none">
              {overallScore}/5
            </span>
            {isAwaitingClientReview && (
              <span className="mt-1 rounded-full bg-purple-500/15 px-2 py-[2px] text-[10px] font-medium text-purple-200 border border-purple-500/40">
                Ready for your review
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((score) => (
            <div
              key={score.label}
              className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {score.icon}
                  <span className="text-xs font-medium text-slate-100">
                    {score.label}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-50">
                  {score.value}/{score.max}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    "h-full rounded-full",
                    score.label === "R&D story" && "bg-orange-500",
                    score.label === "Evidence" && "bg-sky-500",
                    score.label === "Costs" && "bg-emerald-500"
                  )}
                  style={{
                    width: `${(score.value / score.max) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-snug text-slate-400">
                {score.description}
              </p>
            </div>
          ))}
        </div>

        {missingItems.length > 0 && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              What would strengthen this project?
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-300">
              {missingItems.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-1.5">
                  <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};