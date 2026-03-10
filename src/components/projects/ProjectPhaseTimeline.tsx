import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type StepStatus = "complete" | "current" | "upcoming";

interface ProjectPhaseTimelineProps {
  workflowStatus: string;
  hasFeasibility: boolean;
  hasTechnical: boolean;
  hasChallenges: boolean;
  hasActivities: boolean;
  hasEvidence: boolean;
  hasCosts: boolean;
  createdAt?: string | null;
  dueDate?: string | null;
}

interface PhaseConfig {
  key: string;
  label: string;
  description: string;
}

interface Phase extends PhaseConfig {
  status: StepStatus;
}

const PHASES: PhaseConfig[] = [
{
  key: "feasibility",
  label: "Idea & Feasibility",
  description: "Initial idea captured and feasibility checked."
},
{
  key: "rdDetails",
  label: "R&D Details",
  description: "Technical story and challenges described."
},
{
  key: "evidence",
  label: "Evidence",
  description: "Documents, drawings and notes uploaded."
},
{
  key: "costs",
  label: "Costs",
  description: "Best-view costs advised for this project."
},
{
  key: "review",
  label: "RDtax Review",
  description: "RDtax team reviewing and refining your claim."
},
{
  key: "finalised",
  label: "Claim Finalised",
  description: "Claim approved or marked as complete."
}];


const formatDate = (value?: string | null): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

export const ProjectPhaseTimeline: FC<ProjectPhaseTimelineProps> = ({
  workflowStatus,
  hasFeasibility,
  hasTechnical,
  hasChallenges,
  hasActivities,
  hasEvidence,
  hasCosts,
  createdAt,
  dueDate
}) => {
  const completionFlags: Record<string, boolean> = {
    feasibility: hasFeasibility,
    rdDetails: hasTechnical || hasChallenges || hasActivities,
    evidence: hasEvidence,
    costs: hasCosts,
    review:
    workflowStatus === "submitted_to_team" ||
    workflowStatus === "team_in_progress" ||
    workflowStatus === "awaiting_client_review" ||
    workflowStatus === "revision_requested",
    finalised: workflowStatus === "approved" || workflowStatus === "cancelled"
  };

  const order = PHASES.map((p) => p.key);
  let firstIncompleteIndex = order.findIndex((key) => !completionFlags[key]);
  if (firstIncompleteIndex === -1) {
    firstIncompleteIndex = order.length - 1;
  }

  const phases: Phase[] = PHASES.map((phase, index) => {
    const isComplete = completionFlags[phase.key];
    let status: StepStatus;

    if (isComplete) {
      status = "complete";
    } else if (index === firstIncompleteIndex) {
      status = "current";
    } else {
      status = "upcoming";
    }

    return { ...phase, status };
  });

  const createdLabel = formatDate(createdAt);
  const dueLabel = formatDate(dueDate);

  return (
    <Card className="bg-slate-950/60 border-slate-800" style={{ backgroundColor: "#f3f4f6" }}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-100" style={{ color: "#1a1a1a" }}>
              Project Journey
            </CardTitle>
            <p className="mt-1 text-xs text-slate-400" style={{ color: "#1a1a1a" }}>
              See where this project is in the RDtax process and what comes next.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {createdLabel &&
            <span className="text-slate-500" style={{ color: "#1a1a1a" }}>Started {createdLabel}</span>
            }
            {dueLabel &&
            <span className="inline-flex items-center rounded-full bg-slate-900 px-2 py-1 text-[11px] text-slate-200 border border-slate-700">
                <Clock className="mr-1 h-3 w-3 text-orange-400" />
                Target {dueLabel}
              </span>
            }
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" style={{ backgroundColor: "#00000000" }}>
          {phases.map((phase) => {
            const icon =
            phase.status === "complete" ?
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
            phase.status === "current" ?
            <AlertCircle className="h-4 w-4 text-orange-400" /> :

            <Circle className="h-3 w-3 text-slate-600" />;


            return (
              <li
                key={phase.key}
                className={cn(
                  "rounded-lg border px-3 py-2 h-full",
                  phase.status === "complete" &&
                  "border-emerald-500/50 bg-emerald-950/40",
                  phase.status === "current" &&
                  "border-orange-500/60 bg-slate-950",
                  phase.status === "upcoming" &&
                  "border-slate-800 bg-slate-950/40"
                )} style={{ backgroundColor: "#f3f4f6", color: "#1a1a1a" }}>
                
                <div className="flex items-start gap-2">
                  <div className="mt-[2px]">{icon}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100" style={{ color: "#1a1a1a" }}>
                        {phase.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-[1px] text-[10px] font-medium",
                          phase.status === "complete" &&
                          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40",
                          phase.status === "current" &&
                          "bg-orange-500/10 text-orange-300 border border-orange-500/60",
                          phase.status === "upcoming" &&
                          "bg-slate-800 text-slate-300 border border-slate-700"
                        )} style={{ color: "#1a1a1a" }}>
                        
                        {phase.status === "complete" ?
                        "Complete" :
                        phase.status === "current" ?
                        "In focus" :
                        "Later"}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-400" style={{ color: "#1a1a1a" }}>
                      {phase.description}
                    </p>
                  </div>
                </div>
              </li>);

          })}
        </ol>
      </CardContent>
    </Card>);

};