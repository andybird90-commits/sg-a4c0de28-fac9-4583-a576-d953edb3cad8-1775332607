import type { FC } from "react";

export interface ProjectGanttItem {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

interface ProjectGanttProps {
  items: ProjectGanttItem[];
}

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const d = new Date(value);
  const time = d.getTime();
  if (Number.isNaN(time)) return null;
  return time;
}

export const ProjectGantt: FC<ProjectGanttProps> = ({ items }) => {
  const validItems = items
    .map((item) => {
      const start = parseDate(item.start_date);
      const end = parseDate(item.end_date);
      if (start === null || end === null) return null;
      return { ...item, start, end };
    })
    .filter(
      (item): item is ProjectGanttItem & { start: number; end: number } =>
        Boolean(item)
    )
    .sort((a, b) => a.start - b.start);

  if (validItems.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No timeline activities yet. Add activities with start and finish dates
        to see a simple Gantt view.
      </p>
    );
  }

  const minStart = validItems.reduce(
    (min, item) => Math.min(min, item.start),
    validItems[0].start
  );
  const maxEnd = validItems.reduce(
    (max, item) => Math.max(max, item.end),
    validItems[0].end
  );
  const span = Math.max(maxEnd - minStart, 24 * 60 * 60 * 1000);

  const formatShortDate = (timestamp: number): string => {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-GB", {
      year: "2-digit",
      month: "short",
      day: "2-digit"
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between px-1 text-[11px] text-muted-foreground">
        <span>{formatShortDate(minStart)}</span>
        <span>{formatShortDate(maxEnd)}</span>
      </div>
      <div className="space-y-3">
        {validItems.map((item) => {
          const offsetRatio = (item.start - minStart) / span;
          const widthRatio = (item.end - item.start) / span;
          const leftPercent = Math.max(0, Math.min(100, offsetRatio * 100));
          const widthPercent = Math.max(
            3,
            Math.min(100 - leftPercent, widthRatio * 100)
          );

          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {item.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatShortDate(item.start)} – {formatShortDate(item.end)}
                </p>
              </div>
              <div className="flex-1">
                <div className="relative h-3 rounded-full bg-slate-200">
                  <div
                    className="absolute top-0 h-3 rounded-full bg-slate-500"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};