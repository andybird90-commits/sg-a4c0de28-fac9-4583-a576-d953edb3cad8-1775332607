import type { FC } from "react";
import { AlertTriangle, ClipboardList, FileText, Link2, RefreshCw, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProjectReadinessPanelProps {
  hasTechnical: boolean;
  hasChallenges: boolean;
  activityCount: number;
  evidenceCount: number;
  costCount: number;
  workflowStatus: string;
  isLinkedToCompanion?: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
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
  isLinkedToCompanion = false,
  onSync,
  isSyncing = false
}) => {
  const rdStoryScore = clamp(
    (hasTechnical ? 2 : 0) +
      (hasChallenges ? 2 : 0) +
      (activityCount > 0 ? 1 : 0),
    5
  );

  const evidenceScore = clamp(
    evidenceCount === 0
      ? 0
      : evidenceCount < 3
        ? 2
        : evidenceCount < 6
          ? 4
          : 5,
    5
  );

  const costScore = clamp(costCount === 0 ? 0 : costCount < 2 ? 3 : 5, 5);

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
      icon: <FileText className="h-4 w-4 text-orange-500" />
    },
    {
      label: "Evidence",
      value: evidenceScore,
      max: 5,
      description:
        evidenceCount > 0
          ? "Good supporting material in place."
          : "Upload specs, drawings or emails that show the work.",
      icon: <ClipboardList className="h-4 w-4 text-sky-500" />
    },
    {
      label: "Costs",
      value: costScore,
      max: 5,
      description:
        costCount > 0
          ? "Costs advised for this project."
          : "Add your best-view costs. We can refine them later.",
      icon: <Wallet className="h-4 w-4 text-emerald-500" />
    }
  ];

  const missingItems: string[] = [];
  if (!hasTechnical) {
    missingItems.push(
      "Describe the current system and what you are changing."
    );
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
    missingItems.push(
      "Add estimated staff, subcontractor or materials costs."
    );
  }

  const isAwaitingClientReview =
    workflowStatus === "awaiting_client_review" ||
    workflowStatus === "revision_requested";

  return (
    <Card className="border border-slate-200 bg-slate-50 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-900">
            R&amp;D Readiness
          </CardTitle>
          <p className="mt-1 text-xs text-slate-600">
            A quick view of how complete this project looks for an RDtax claim.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <div>
            <span className="block text-[11px] text-slate-500">Overall</span>
            <span className="text-xl font-semibold leading-none text-slate-900">
              {overallScore}/5
            </span>
          </div>

          {isAwaitingClientReview && (
            <span className="mt-1 inline-flex items-center rounded-full border border-purple-300 bg-purple-50 px-2 py-[2px] text-[11px] font-medium text-purple-700">
              Ready for your review
            </span>
          )}

          {isLinkedToCompanion && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-600">
              <Link2 className="h-3 w-3" />
              <span>Linked to RD Companion</span>
            </div>
          )}

          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-[2px] text-[11px] font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw
                className={cn(
                  "h-3 w-3",
                  isSyncing && "animate-spin"
                )}
              />
              <span>{isSyncing ? "Syncing…" : "Sync"}</span>
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Stacked mobile-style cards on all breakpoints */}
        <div className="space-y-3">
          {scores.map((score) => (
            <div
              key={score.label}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {score.icon}
                  <span className="text-sm font-semibold">
                    {score.label}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {score.value}/{score.max}
                </span>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full",
                    score.label === "R&D story" && "bg-orange-500",
                    score.label === "Evidence" && "bg-sky-500",
                    score.label === "Costs" && "bg-emerald-500"
                  )}
                  style={{
                    width: `${(score.value / score.max) * 100}%`
                  }}
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-700">
                {score.description}
              </p>
            </div>
          ))}
        </div>

        {missingItems.length > 0 && (
          <div className="mt-1 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-slate-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>What would strengthen this project?</span>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs text-slate-700">
              {missingItems.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
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