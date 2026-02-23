import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Sparkles } from "lucide-react";

type SidekickAnalysis = {
  feasibility_summary?: unknown;
  estimated_claim_band?: unknown;
  claim_rationale?: unknown;
  core_business?: unknown;
  technical_environment?: unknown;
  rd_indicators?: unknown;
  previous_claims_likelihood?: unknown;
  prenotification_required?: unknown;
  prenotification_reason?: unknown;
  key_questions?: unknown;
  risk_flags?: unknown;
  recommended_next_steps?: unknown;
};

interface SidekickResearchPanelProps {
  analysisData: SidekickAnalysis | null;
  fallbackText?: string;
}

function normalizeToText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return null;
}

function normalizeToList(value: unknown): string[] | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);

    return items.length > 0 ? items : null;
  }

  if (typeof value === "string") {
    const parts = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return parts.length > 1 ? parts : null;
  }

  return null;
}

function ResearchSection(props: { title: string; value: unknown }) {
  const { title, value } = props;
  const list = normalizeToList(value);
  const text = normalizeToText(value);

  if (!list && !text) {
    return null;
  }

  return (
    <section className="space-y-1">
      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
        {title}
      </h4>
      {list && list.length > 1 ? (
        <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-100/90">
          {list.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        text && (
          <p className="text-sm text-blue-800 dark:text-blue-100/90 whitespace-pre-wrap">
            {text}
          </p>
        )
      )}
    </section>
  );
}

export function SidekickResearchPanel(props: SidekickResearchPanelProps) {
  const { analysisData, fallbackText } = props;

  if (!analysisData && !fallbackText) {
    return null;
  }

  const summaryText =
    normalizeToText((analysisData && analysisData.feasibility_summary) ?? null) ??
    (fallbackText && fallbackText.trim().length > 0 ? fallbackText : null);

  const hasAnyDetail =
    summaryText !== null ||
    normalizeToText(analysisData?.estimated_claim_band) !== null ||
    normalizeToText(analysisData?.claim_rationale) !== null ||
    normalizeToText(analysisData?.core_business) !== null ||
    normalizeToText(analysisData?.technical_environment) !== null ||
    normalizeToText(analysisData?.previous_claims_likelihood) !== null ||
    normalizeToText(analysisData?.prenotification_required) !== null ||
    normalizeToText(analysisData?.prenotification_reason) !== null ||
    normalizeToText(analysisData?.risk_flags) !== null ||
    normalizeToText(analysisData?.recommended_next_steps) !== null ||
    normalizeToText(analysisData?.key_questions) !== null ||
    normalizeToText(analysisData?.rd_indicators) !== null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          <CardTitle className="text-base">RD Companion Research</CardTitle>
        </div>
        <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-200/80">
          This is an AI-generated overview to help you prepare your feasibility
          call. Use it as a guide and always confirm details directly with the
          client.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
        {!hasAnyDetail ? (
          <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-100">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <p>
              No detailed research was returned for this company. You can still
              continue with the call using your usual discovery questions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaryText && (
              <section className="space-y-1">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  High-level summary
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-100/90 whitespace-pre-wrap">
                  {summaryText}
                </p>
              </section>
            )}

            <ResearchSection
              title="Potential claim size"
              value={analysisData?.estimated_claim_band}
            />

            <ResearchSection
              title="Why this might qualify"
              value={analysisData?.claim_rationale}
            />

            <ResearchSection
              title="What the business does"
              value={analysisData?.core_business}
            />

            <ResearchSection
              title="Technical environment"
              value={analysisData?.technical_environment}
            />

            <ResearchSection
              title="Indicators of R&amp;D activity"
              value={analysisData?.rd_indicators}
            />

            <ResearchSection
              title="Previous claim likelihood"
              value={analysisData?.previous_claims_likelihood}
            />

            <ResearchSection
              title="HMRC pre-notification"
              value={
                analysisData?.prenotification_required ??
                analysisData?.prenotification_reason
              }
            />

            <ResearchSection
              title="Key questions to ask"
              value={analysisData?.key_questions}
            />

            <ResearchSection
              title="Risks or points to watch"
              value={analysisData?.risk_flags}
            />

            <ResearchSection
              title="Suggested next steps"
              value={analysisData?.recommended_next_steps}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}