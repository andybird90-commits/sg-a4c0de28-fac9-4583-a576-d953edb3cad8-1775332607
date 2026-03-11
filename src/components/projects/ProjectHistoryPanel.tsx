import type { FC } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface HistoryEvent {
  id: string;
  label: string;
  date: Date;
  meta?: string;
}

interface ProjectHistoryPanelProps {
  projectCreatedAt?: string | null;
  feasibilityCreatedAt?: string | null;
  claimWorkflowStatus?: string | null;
  evidence: { id: string; created_at: string }[];
  costs: { id: string; created_at: string }[];
}

const safeParseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDate = (date: Date): string =>
  date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

export const ProjectHistoryPanel: FC<ProjectHistoryPanelProps> = ({
  projectCreatedAt,
  feasibilityCreatedAt,
  claimWorkflowStatus,
  evidence,
  costs
}) => {
  const events: HistoryEvent[] = [];

  const createdDate = safeParseDate(projectCreatedAt);
  if (createdDate) {
    events.push({
      id: "project-created",
      label: "Project created",
      date: createdDate
    });
  }

  const feasibilityDate = safeParseDate(feasibilityCreatedAt);
  if (feasibilityDate) {
    events.push({
      id: "feasibility",
      label: "Feasibility analysis completed",
      date: feasibilityDate
    });
  }

  if (evidence.length > 0) {
    const latestEvidence = evidence
      .map((item) => safeParseDate(item.created_at))
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (latestEvidence) {
      events.push({
        id: "evidence",
        label: "Evidence added",
        date: latestEvidence,
        meta: `${evidence.length} item${evidence.length > 1 ? "s" : ""}`
      });
    }
  }

  if (costs.length > 0) {
    const latestCost = costs
      .map((item) => safeParseDate(item.created_at))
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (latestCost) {
      events.push({
        id: "costs",
        label: "Costs advised",
        date: latestCost,
        meta: `${costs.length} entr${costs.length > 1 ? "ies" : "y"}`
      });
    }
  }

  if (claimWorkflowStatus === "approved") {
    const approvedEventDate =
      events.length > 0
        ? events
            .map((e) => e.date)
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : new Date();
    events.push({
      id: "approved",
      label: "Claim approved",
      date: approvedEventDate
    });
  } else if (claimWorkflowStatus === "cancelled") {
    const cancelledEventDate =
      events.length > 0
        ? events
            .map((e) => e.date)
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : new Date();
    events.push({
      id: "cancelled",
      label: "Project cancelled",
      date: cancelledEventDate
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card className="border border-slate-200 bg-slate-100/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">
            Activity history
          </h3>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">
            As you add R&amp;D details, evidence and costs, we&apos;ll show a
            simple history of what has happened on this project.
          </p>
        ) : (
          <ol className="space-y-3 text-xs">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3">
                <div className="mt-[5px] h-2 w-2 rounded-full bg-slate-500" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {event.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDate(event.date)}
                    </span>
                    {event.meta && (
                      <span className="rounded-full border border-slate-300 bg-slate-800 px-2 py-[1px] text-[10px] text-slate-50">
                        {event.meta}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
};