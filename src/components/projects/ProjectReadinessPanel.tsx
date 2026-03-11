import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ClipboardList, FileText, Wallet, RefreshCw, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      icon: <FileText className="h-4 w-4 text-orange-400" />
    },
    {
      label: "Evidence",
      value: evidenceScore,
      max: 5,
      description:
        evidenceCount > 0
          ? "Good supporting material in place."
          : "Upload specs, drawings or emails that show the work.",
      icon: <ClipboardList className="h-4 w-4 text-sky-400" />
    },
    {
      label: "Costs",
      value: costScore,
      max: 5,
      description:
        costCount > 0
          ? "Costs advised for this project."
          : "Add your best-view costs. We can refine them later.",
      icon: <Wallet className="h-4 w-4 text-emerald-400" />
    }
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
    <Card className="border-slate-800 bg-slate-900/70 text-slate-50">
      <CardHeader className="pb-4 border-b border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-50">
              R&D Readiness
            </CardTitle>
            <p className="mt-1 text-xs text-slate-300">
              A quick view of how complete this project looks for an RDtax
              claim.
            </p>
          </div>
          <div className="flex flex-col items-end text-right gap-1">
            <div>
              <span className="text-[11px] text-slate-300 block">
                Overall
              </span>
              <span className="text-xl font-semibold leading-none">
                {overallScore}/5
              </span>
            </div>
            {isAwaitingClientReview && (
              <span className="mt-1 inline-flex items-center rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-[2px] text-[11px] font-medium text-purple-100">
                Ready for your review
              </span>
            )}
            {isLinkedToCompanion && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-300">
                <Link2 className="h-3 w-3" />
                <span>Linked to RD Companion</span>
              </div>
            )}
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2 py-[2px] text-[11px] font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
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
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((score) => (
            <div
              key={score.label}
              className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {score.icon}
                  <span className="text-xs font-semibold">
                    {score.label}
                  </span>
                </div>
                <span className="text-xs font-semibold">
                  {score.value}/{score.max}
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    score.label === "R&D story" && "bg-orange-500",
                    score.label === "Evidence" && "bg-sky-500",
                    score.label === "Costs" && "bg-emerald-500"
                  )}
                  style={{
                    width: `${(score.value / score.max) * 100}%`
                  }}
                />
              </div>
              <p className="mt-3 text-[11px] leading-snug text-slate-100">
                {score.description}
              </p>
            </div>
          ))}
        </div>

        {missingItems.length > 0 && (
          <div className="mt-2 rounded-xl border border-amber-500/40 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              What would strengthen this project?
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-100">
              {missingItems.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-1.5">
                  <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-slate-500" />
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