import React, { useMemo, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type SdrProspect = Tables<"sdr_prospects">;

type Channel = "email" | "call" | "face_to_face" | "linkedin" | "research";
type ConfidenceLevel = "high" | "medium" | "low";
type AccountPersona =
  | "owner_led_practical_sme"
  | "operationally_stretched_growth_company"
  | "formal_mid_market_business"
  | "technical_engineering_led_business"
  | "procurement_or_compliance_led_organisation"
  | "relationship_led_local_business";

type AccountTier = "direct_access" | "mid_market_structured" | "enterprise_complex";

type AccessStrategy =
  | "direct_call"
  | "insight_led_email"
  | "named_contact_research_first"
  | "linkedin_plus_email"
  | "referral_or_warm_intro"
  | "divisional_entry_point"
  | "event_or_network_route"
  | "local_meeting_pursuit"
  | "direct_email_to_decision_maker"
  | "nurture_before_outreach";

interface ChannelScores {
  email: number;
  call: number;
  face_to_face: number;
  linkedin: number;
  research: number;
}

interface EngagementStrategyJson {
  recommended_access_strategy: AccessStrategy;
  recommended_first_channel: Channel;
  fallback_channel: Channel;
  confidence: ConfidenceLevel;
  account_persona: AccountPersona;
  account_tier: AccountTier;
  gatekeeper_risk_score: number;
  organisational_complexity_score: number;
  named_contact_required: boolean;
  named_contact_found: boolean;
  warm_route_potential_score: number;
  credibility_threshold_score: number;
  channel_scores: ChannelScores;
  reason_codes: string[];
  evidence_summary: string[];
  route_rationale: string;
  stakeholder_hypothesis: string;
  suggested_subject_line: string;
  suggested_first_email: string;
  suggested_call_purpose: string;
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
  if (value === "call") return "Call";
  if (value === "linkedin") return "LinkedIn";
  if (value === "research") return "Research / stakeholder mapping";
  return value;
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

function formatAccountTier(value: AccountTier | null): string {
  if (!value) return "";
  if (value === "direct_access") return "Direct access";
  if (value === "mid_market_structured") return "Mid-market / structured";
  return "Enterprise / complex";
}

function formatAccessStrategy(value: AccessStrategy | null): string {
  if (!value) return "";
  const map: Record<AccessStrategy, string> = {
    direct_call: "Direct call",
    insight_led_email: "Insight-led email",
    named_contact_research_first: "Named contact research first",
    linkedin_plus_email: "LinkedIn plus email",
    referral_or_warm_intro: "Referral or warm introduction",
    divisional_entry_point: "Divisional entry point",
    event_or_network_route: "Event or network-based route",
    local_meeting_pursuit: "Local meeting pursuit",
    direct_email_to_decision_maker: "Direct email to decision maker",
    nurture_before_outreach: "Nurture before outreach",
  };
  return map[value] || value;
}

function formatRisk(score: number | null): string {
  if (score == null || Number.isNaN(score)) return "Not scored";
  const value = clamp(score);
  let label = "Medium";
  if (value < 40) label = "Low";
  else if (value >= 70) label = "High";
  return `${label} (${value}/100)`;
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export function AiEngagementStrategyPanel(
  props: AiEngagementStrategyPanelProps
): JSX.Element | null {
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
    setOverrideValue(
      (prospect.engagement_observed_real_preference as string | null) ?? ""
    );
    setOverrideNotes(
      (prospect.engagement_observed_preference_notes as string | null) ?? ""
    );
  }, [prospect?.id]);

  if (!prospect) {
    return null;
  }

  const livePreference: Channel | null =
    ((prospect.engagement_observed_real_preference as Channel | null) ??
      (strategy ? strategy.recommended_first_channel : null)) || null;

  const observedLabel =
    (prospect.engagement_observed_real_preference as string | null) != null &&
    (prospect.engagement_observed_real_preference as string | null) !== ""
      ? "Human confirmed preference"
      : "AI recommended first channel";

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

  const personaValue =
    (prospect.engagement_account_persona as AccountPersona | null) ??
    (strategy?.account_persona ?? null);
  const confidenceValue =
    (prospect.engagement_confidence as ConfidenceLevel | null) ??
    (strategy?.confidence ?? null);

  const accountTierValue = strategy?.account_tier ?? null;
  const accessStrategyValue = strategy?.recommended_access_strategy ?? null;

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
            {accessStrategyValue && (
              <Badge variant="secondary" className="text-xs">
                {formatAccessStrategy(accessStrategyValue)}
              </Badge>
            )}
            {accountTierValue && (
              <Badge variant="outline" className="text-xs">
                {formatAccountTier(accountTierValue)}
              </Badge>
            )}
            {personaValue && (
              <Badge variant="outline" className="text-xs">
                {formatPersona(personaValue)}
              </Badge>
            )}
            {confidenceValue && (
              <Badge variant="secondary" className="text-xs">
                {formatConfidence(confidenceValue)}
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
          This AI access strategy focuses on the most credible route into the
          account based on public signals. It is not a confirmed client
          preference and should be combined with SDR judgement and human
          feedback.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        {strategy ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recommended access strategy
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatAccessStrategy(strategy.recommended_access_strategy)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  First channel
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatChannelLabel(strategy.recommended_first_channel)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fallback channel
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {formatChannelLabel(strategy.fallback_channel)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gatekeeper risk
                </p>
                <p className="text-sm text-slate-800">
                  {formatRisk(strategy.gatekeeper_risk_score)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Organisational complexity
                </p>
                <p className="text-sm text-slate-800">
                  {formatRisk(strategy.organisational_complexity_score)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Named contact
                </p>
                <p className="text-sm text-slate-800">
                  Required: {strategy.named_contact_required ? "Yes" : "No"} ·
                  Found: {strategy.named_contact_found ? "Yes" : "No"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why this route
              </p>
              {strategy.route_rationale ? (
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.route_rationale}
                </p>
              ) : null}
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
                  Stakeholder hypothesis
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.stakeholder_hypothesis ||
                    "No stakeholder hypothesis generated yet."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested first email
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.suggested_first_email ||
                    "No first email suggestion generated yet."}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested subject line
                </p>
                <p className="text-sm text-slate-700 break-words">
                  {strategy.suggested_subject_line ||
                    "No subject line generated yet."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Suggested call purpose
                </p>
                <p className="whitespace-pre-line text-sm text-slate-700">
                  {strategy.suggested_call_purpose ||
                    "No call purpose generated yet."}
                </p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Next best action
                </p>
                <p className="whitespace-pre-line break-words text-sm text-slate-800">
                  {strategy.next_best_action || "Not specified"}
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
                AI suggested{" "}
                {formatChannelLabel(strategy.recommended_first_channel)} first
                via {formatAccessStrategy(strategy.recommended_access_strategy)}{" "}
                route.
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
                <option value="linkedin">LinkedIn first</option>
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
                Last tested channel:{" "}
                {formatChannelLabel(
                  prospect.engagement_last_tested_channel as Channel
                )}
                {prospect.engagement_last_tested_outcome
                  ? ` · Outcome: ${String(
                      prospect.engagement_last_tested_outcome
                    )}`
                  : ""}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}