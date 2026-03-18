import React, { useMemo, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type SdrProspect = Tables<"sdr_prospects">;

type Channel = "email" | "call" | "face_to_face";
type ConfidenceLevel = "high" | "medium" | "low";
type AccountPersona =
  | "owner_led_practical_sme"
  | "operationally_stretched_growth_company"
  | "formal_mid_market_business"
  | "technical_engineering_led_business"
  | "procurement_or_compliance_led_organisation"
  | "relationship_led_local_business";

interface EngagementStrategyJson {
  recommended_first_touch: Channel;
  fallback_touch: Channel;
  confidence: ConfidenceLevel;
  account_persona: AccountPersona;
  channel_scores: {
    email: number;
    call: number;
    face_to_face: number;
  };
  supporting_scores: {
    digital_maturity_score: number;
    relationship_score: number;
    local_visit_score: number;
    decision_maker_access_score: number;
    education_need_score: number;
    commercial_value_score: number;
    urgency_trigger_score: number;
  };
  reason_codes: string[];
  evidence_summary: string[];
  suggested_opener: string;
  suggested_subject_line: string;
  suggested_call_opener: string;
  suggested_meeting_angle: string;
  next_best_action: string;
}

interface AiEngagementStrategyPanelProps {
  prospect: SdrProspect | null;
  onProspectUpdated: (prospect: SdrProspect) => void;
  onGenerateStrategy: (prospectId: string) => Promise<void>;
  generating: boolean;
}

function formatChannelLabel(value: Channel): string {
  if (value === "face_to_face") return "Face to face";
  if (value === "email") return "Email";
  return "Call";
}

function formatConfidence(value: ConfidenceLevel | null): string {
  if (!value) return "";
  if (value === "high") return "High confidence";
  if (value === "medium") return "Medium confidence";
  return "Low confidence";
}

function formatPersona(value: AccountPersona | null): string {
  if (!value) return "";
  const map: Record<AccountPersona, string> = {
    owner_led_practical_sme: "Owner-led practical SME",
    operationally_stretched_growth_company: "Operationally stretched growth company",
    formal_mid_market_business: "Formal mid-market business",
    technical_engineering_led_business: "Technical engineering-led business",
    procurement_or_compliance_led_organisation: "Procurement / compliance-led organisation",
    relationship_led_local_business: "Relationship-led local business",
  };
  return map[value] || value;
}

export function AiEngagementStrategyPanel(props: AiEngagementStrategyPanelProps): JSX.Element | null {
  const { prospect, onProspectUpdated, onGenerateStrategy, generating } = props;
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState<string>("");
  const [overrideNotes, setOverrideNotes] = useState<string>("");

  const strategy = useMemo<EngagementStrategyJson | null>(() => {
    if (!prospect || !prospect.engagement_strategy_json) return null;

    const value = prospect.engagement_strategy_json as unknown;
    if (!value || typeof value !== "object") {
      return null;
    }

    return value as EngagementStrategyJson;
  }, [prospect]);

  React.useEffect(() => {
    if (!prospect) {
      setOverrideValue("");
      setOverrideNotes("");
      return;
    }
    setOverrideValue((prospect.engagement_observed_real_preference as string | null) ?? "");
    setOverrideNotes((prospect.engagement_observed_preference_notes as string | null) ?? "");
  }, [prospect?.id]);

  if (!prospect) {
    return null;
  }

  const livePreference: Channel | null =
    ((prospect.engagement_observed_real_preference as Channel | null) ??
      (strategy ? strategy.recommended_first_touch : null)) || null;

  const observedLabel =
    (prospect.engagement_observed_real_preference as string | null) != null &&
    (prospect.engagement_observed_real_preference as string | null) !== ""
      ? "Human confirmed preference"
      : "AI recommended first touch";

  const handleSaveOverride = async (): Promise<void> => {
    if (!prospect) return;
    setSavingOverride(true);
    try {
      const { data, error } = await supabase
        .from("sdr_prospects")
        .update({
          engagement_observed_real_preference: overrideValue || null,
          engagement_observed_preference_notes: overrideNotes || null,
        })
        .eq("id", prospect.id)
        .select("*")
        .maybeSingle();
      if (error || !data) {
        return;
      }
      onProspectUpdated(data as SdrProspect);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleGenerateClick = async (): Promise<void> => {
    if (!prospect || generating) return;
    await onGenerateStrategy(prospect.id as string);
  };

  const personaValue = (prospect.engagement_account_persona as AccountPersona | null) ?? (strategy?.account_persona ?? null);
  const confidenceValue =
    (prospect.engagement_confidence as ConfidenceLevel | null) ?? (strategy?.confidence ?? null);

  return (
    <Card className="mt-6 border-slate-200">
      <CardHeader className="flex flex-col gap-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-slate-900">
            AI Engagement Strategy
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {livePreference && (
              <Badge variant="default" className="text-xs">
                {observedLabel}: {formatChannelLabel(livePreference)}
              </Badge>
            )}
            {confidenceValue && (
              <Badge variant="secondary" className="text-xs">
                {formatConfidence(confidenceValue)}
              </Badge>
            )}
            {personaValue && (
              <Badge variant="outline" className="text-xs">
                {formatPersona(personaValue)}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateClick}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating
                </>
              ) : strategy ? (
                "Refresh strategy"
              ) : (
                "Generate strategy"
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Recommended first touch is an AI suggestion based on Companies House and public web
          signals. It is not a confirmed client preference.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {strategy ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recommended first touch
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatChannelLabel(strategy.recommended_first_touch)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fallback touch
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatChannelLabel(strategy.fallback_touch)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next best action
                </p>
                <p className="text-sm text-slate-800">
                  {strategy.next_best_action || "Not specified"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why this recommendation
              </p>
              {strategy.evidence_summary && strategy.evidence_summary.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {strategy.evidence_summary.slice(0, 5).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  No detailed evidence summary available for this prospect yet.
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested opener
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.suggested_opener || "No opener generated yet."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested meeting angle
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.suggested_meeting_angle || "No meeting angle generated yet."}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested email subject line
                </p>
                <p className="text-sm text-slate-700">
                  {strategy.suggested_subject_line || "No subject line generated yet."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested call opener
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.suggested_call_opener || "No call opener generated yet."}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            No AI engagement strategy has been generated yet for this prospect.
          </p>
        )}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Human confirmed preference
            </p>
            {strategy && (
              <p className="text-[11px] text-slate-500">
                AI suggested {formatChannelLabel(strategy.recommended_first_touch)} first.
              </p>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Observed real preference
              </label>
              <select
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
              >
                <option value="">Not set</option>
                <option value="email">Email first</option>
                <option value="call">Call first</option>
                <option value="face_to_face">Face to face</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">
                Preference notes
              </label>
              <Textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="min-h-[60px] text-sm"
                placeholder="E.g. client consistently replies to email but rarely answers calls."
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveOverride}
              disabled={savingOverride}
            >
              {savingOverride ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save human preference"
              )}
            </Button>
            {prospect.engagement_last_tested_channel && (
              <p className="text-[11px] text-slate-500">
                Last tested channel: {formatChannelLabel(prospect.engagement_last_tested_channel as Channel)}
                {prospect.engagement_last_tested_outcome
                  ? ` · Outcome: ${String(prospect.engagement_last_tested_outcome)}`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}