import type { FC } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";

interface CostItem {
  id: string;
  cost_type: string | null;
  amount: number | string;
}

interface ProjectCostSummaryProps {
  items: CostItem[];
  schemeLabel?: string | null;
}

export const ProjectCostSummary: FC<ProjectCostSummaryProps> = ({
  items,
  schemeLabel
}) => {
  if (!items || items.length === 0) {
    return (
      <Card className="bg-slate-950/60 border-slate-800">
        <CardHeader style={{ backgroundColor: "#ffffff" }}>
          <CardTitle className="flex items-center gap-2 text-sm text-slate-100" style={{ backgroundColor: "#ffffff" }}>
            <Wallet className="h-4 w-4 text-emerald-400" />
            Project Costs
          </CardTitle>
        </CardHeader>
        <CardContent style={{ backgroundColor: "#ffffff" }}>
          <p className="text-xs text-slate-400" style={{ color: "#1a1a1a" }}>
            Share your best-view costs for this project. Even rough estimates
            help us size the claim and follow up with the right questions.
          </p>
          <p className="mt-2 text-[11px] text-slate-500" style={{ color: "#1a1a1a" }}>
            {schemeLabel ?
            `This project is currently tagged under the ${schemeLabel} scheme. The RDtax team will refine these figures as part of claim preparation.` :
            "Once the scheme (e.g. SME, RDEC) is confirmed, the RDtax team will refine these figures as part of claim preparation."}
          </p>
        </CardContent>
      </Card>);

  }

  const totalsByType: Record<string, number> = {};
  let total = 0;

  items.forEach((item) => {
    const key = (item.cost_type || "other").toLowerCase();
    const numeric =
    typeof item.amount === "number" ?
    item.amount :
    Number.parseFloat(item.amount);
    const safeAmount = Number.isFinite(numeric) ? numeric : 0;
    total += safeAmount;
    totalsByType[key] = (totalsByType[key] || 0) + safeAmount;
  });

  const entries = Object.entries(totalsByType).sort((a, b) => b[1] - a[1]);

  const indicativeLow = total * 0.15;
  const indicativeHigh = total * 0.3;

  return (
    <Card className="bg-slate-950/60 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm text-slate-100">
            <Wallet className="h-4 w-4 text-emerald-400" />
            Project Costs
          </CardTitle>
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Indicative total</div>
            <div className="text-base font-semibold text-slate-50">
              £
              {total.toLocaleString("en-GB", {
                maximumFractionDigits: 0
              })}
            </div>
            {schemeLabel &&
            <div className="mt-0.5 text-[11px] text-slate-400">
                Scheme: {schemeLabel}
              </div>
            }
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="space-y-2">
          {entries.map(([type, value]) => {
            const percentage = total > 0 ? value / total * 100 : 0;
            const label = type.replace("_", " ");
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {label}
                    </Badge>
                    <span className="text-slate-300">
                      £
                      {value.toLocaleString("en-GB", {
                        maximumFractionDigits: 0
                      })}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    {Math.round(percentage)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${percentage}%` }} />
                  
                </div>
              </div>);

          })}
        </div>
        {total > 0 &&
        <div className="pt-1 border-t border-slate-800/60 mt-2 pt-2 space-y-1">
            <div className="text-[11px] text-slate-400">
              Rough indication of potential R&amp;D tax benefit
              {schemeLabel ? ` (${schemeLabel} scheme)` : ""}
            </div>
            <div className="text-sm font-medium text-slate-50">
              £
              {indicativeLow.toLocaleString("en-GB", {
              maximumFractionDigits: 0
            })}{" "}
              – £
              {indicativeHigh.toLocaleString("en-GB", {
              maximumFractionDigits: 0
            })}
            </div>
            <p className="text-[10px] text-slate-500">
              This is a broad range based on typical relief levels
              {schemeLabel ? ` for the ${schemeLabel} scheme` : ""}. Your actual
              benefit will depend on your specific circumstances and tax
              position.
            </p>
          </div>
        }
        <p className="pt-1 text-[11px] text-slate-400">
          These figures are for guidance only and will be refined by your RDtax
          team as part of the claim preparation.
        </p>
      </CardContent>
    </Card>);

};