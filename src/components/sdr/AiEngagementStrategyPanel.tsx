import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SdrProspect = Database["public"]["Tables"]["sdr_prospects"]["Row"];

type Channel = "email" | "call" | "face_to_face" | "linkedin" | "research";

interface EngagementPreference {
  mode: "standard" | "enterprise";
  primaryRoute?: string;
  secondaryRoute?: string | null;
  recommendedPersona: string;
  tone: string;
  gatekeeperRisk: "Low" | "Medium" | "High";
  directColdCallRecommended: boolean;
  confidence: number;
  rationale: string[];
  suggestedSequence: string[];
  whatNotToDo: string[];
  primaryAccessModel?: string;
  deliveryChannelGuidance?: string;
  recommendationStatus?: "clear" | "exploratory" | "limited signal but strategically directional";
  businessUnitTargetingRequired?: boolean;
  namedContactRequired?: boolean;
  phoneUseRule?: string;
  likelyStakeholderClass?: string;
}

interface EngagementStrategyJson {
  recommended_access_strategy: string;
  recommended_first_channel: Channel;
  fallback_channel: Channel;
  confidence: string | null;
  account_persona: string | null;
  account_tier: string | null;
  gatekeeper_risk_score: number;
  organisational_complexity_score: number;
  named_contact_required: boolean;
  named_contact_found: boolean;
  warm_route_potential_score: number;
  credibility_threshold_score: number;
  direct_cold_call_recommended: boolean;
  channel_scores: {
    email: number;
    call: number;
    face_to_face: number;
    linkedin: number;
    research: number;
  };
  reason_codes: string[];
  evidence_summary: string[];
  route_rationale: string;
  stakeholder_hypothesis: string;
  suggested_subject_line: string;
  suggested_first_email: string;
  suggested_call_purpose: string;
  next_best_action: string;
  engagement_preference?: EngagementPreference;
  refresh_timestamp?: string;
  source_status?: {
    companiesHouse?: { ok: boolean; error?: string };
    braveWeb?: { ok: boolean; error?: string };
    internal?: { ok: boolean; error?: string };
    openai?: { ok: boolean; error?: string };
  };
  warnings?: string[];
  assumptions?: string[];
  missing_information?: string[];
}

interface AiEngagementStrategyPanelProps {
  prospect: SdrProspect | null;
  onProspectUpdated: (prospect: SdrProspect) => void;
  onGenerateStrategy: (prospectId: string, mode: "refresh" | "full_live") => Promise<void>;
  generating: boolean;
}

function formatPersonaLabel(persona: string | null | undefined): string {
  if (!persona) return "Unknown";

  const map: Record<string, string> = {
    owner_led_practical_sme: "Owner-led practical SME",
    operationally_stretched_growth_company:
      "Operationally stretched growth company",
    formal_mid_market_business: "Formal mid-market business",
    technical_engineering_led_business: "Technical, engineering-led business",
    procurement_or_compliance_led_organisation:
      "Procurement or compliance-led organisation",
    relationship_led_local_business: "Relationship-led local business",
  };

  return map[persona] ?? persona.replace(/_/g, " ");
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

  useEffect(() => {
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
  }, [prospect?.id, prospect]);

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

  const handleGenerateClick = async (mode: "refresh" | "full_live"): Promise<void> => {
    if (!prospect || generating) return;
    await onGenerateStrategy(prospect.id as string, mode);
  };

  const personaValue =
    (prospect.engagement_account_persona as string | null) ??
    (strategy?.account_persona ?? null);
  const confidenceValue =
    (prospect.engagement_confidence as string | null) ??
    (strategy?.confidence ?? null);

  const accountTierValue = strategy?.account_tier ?? null;
  const accessStrategyValue = strategy?.recommended_access_strategy ?? null;

  const engagementPreference = strategy?.engagement_preference as
    | EngagementPreference
    | undefined;

  const sourceStatus = strategy?.source_status ?? null;
  const warnings = Array.isArray(strategy?.warnings) ? strategy?.warnings : [];
  const lastRefreshed =
    strategy?.refresh_timestamp ??
    ((prospect.engagement_generated_at as string | null) ?? null);

  const sourceBadge = (label: string, ok?: boolean, error?: string): JSX.Element => {
    const variant = ok === false ? "destructive" : ok === true ? "secondary" : "outline";
    const text =
      ok === false ? `${label}: failed` : ok === true ? `${label}: ok` : `${label}: unknown`;
    return (
      <Badge variant={variant} title={ok === false && error ? error : undefined}>
        {text}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Channel preference</CardTitle>
            <p className="text-xs text-muted-foreground">
              How this prospect appears to respond in practice.
            </p>
            {lastRefreshed && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Last refreshed: {new Date(lastRefreshed).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleGenerateClick("refresh")}
              disabled={generating || !prospect.id}
              className="inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              title="Re-run OpenAI using recent evidence if available (cost-controlled)."
            >
              {generating ? "Refreshing…" : "Refresh strategy"}
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateClick("full_live")}
              disabled={generating || !prospect.id}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              title="Forces live Companies House + live web evidence + OpenAI."
            >
              {generating ? "Refreshing…" : "Full live re-run"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {sourceStatus && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {sourceBadge("Companies House", sourceStatus.companiesHouse?.ok, sourceStatus.companiesHouse?.error)}
              {sourceBadge("Web", sourceStatus.braveWeb?.ok, sourceStatus.braveWeb?.error)}
              {sourceBadge("Internal", sourceStatus.internal?.ok, sourceStatus.internal?.error)}
              {sourceBadge("OpenAI", sourceStatus.openai?.ok, sourceStatus.openai?.error)}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="font-semibold">Warnings</div>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Live working preference
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="secondary">
                  {strategy?.recommended_first_channel ?? "unknown"}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  AI recommended first channel
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-xs uppercase text-muted-foreground">
              Observed working preference
            </div>
            <div className="flex flex-col gap-2">
              <input
                className="w-full rounded-md border px-2 py-1 text-xs"
                placeholder="e.g. Email after LinkedIn touch, or MD prefers direct call"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
              />
              <textarea
                className="min-h-[60px] w-full rounded-md border px-2 py-1 text-xs"
                placeholder="Notes on how this prospect actually engages in practice"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveOverride}
                  disabled={savingOverride}
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingOverride ? "Saving…" : "Save observed preference"}
                </button>
              </div>
            </div>
          </div>

          {accessStrategyValue && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">
                  AI recommended access strategy
                </div>
                <div className="text-xs">
                  {accessStrategyValue.replace(/_/g, " ")}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Engagement Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!engagementPreference ? (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                No engagement preference has been generated yet for this
                prospect.
              </p>
              <p className="text-muted-foreground">
                Use “Full live re-run” to recompute strategy using live Companies House + web evidence plus internal context.
              </p>
            </div>
          ) : engagementPreference.mode === "enterprise" ? (
            <>
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Primary access model
                </div>
                <div className="font-medium">
                  {engagementPreference.primaryAccessModel ?? "Stakeholder-mapped account-based outreach"}
                </div>
              </div>

              {engagementPreference.deliveryChannelGuidance && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Delivery channel guidance
                  </div>
                  <div>{engagementPreference.deliveryChannelGuidance}</div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {engagementPreference.recommendationStatus && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Recommendation status
                    </div>
                    <div>{engagementPreference.recommendationStatus}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Business unit targeting required
                  </div>
                  <div>{engagementPreference.businessUnitTargetingRequired ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Named contact required
                  </div>
                  <div>{engagementPreference.namedContactRequired ? "Yes" : "No"}</div>
                </div>
              </div>

              {engagementPreference.phoneUseRule && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Phone use rule
                  </div>
                  <div>{engagementPreference.phoneUseRule}</div>
                </div>
              )}

              {engagementPreference.likelyStakeholderClass && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Likely stakeholder class
                  </div>
                  <div>{engagementPreference.likelyStakeholderClass}</div>
                </div>
              )}

              <Separator />

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="why">
                  <AccordionTrigger className="text-sm">
                    Why this approach?
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc space-y-1 pl-5">
                      {engagementPreference.rationale.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="sequence">
                  <AccordionTrigger className="text-sm">
                    Suggested first-touch sequence
                  </AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal space-y-1 pl-5">
                      {engagementPreference.suggestedSequence.map(
                        (step, index) => (
                          <li key={index}>{step}</li>
                        )
                      )}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
                {engagementPreference.whatNotToDo.length > 0 && (
                  <AccordionItem value="what-not-to-do">
                    <AccordionTrigger className="text-sm">
                      What not to do
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc space-y-1 pl-5">
                        {engagementPreference.whatNotToDo.map(
                          (warning, index) => (
                            <li key={index}>{warning}</li>
                          )
                        )}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Primary route
                  </div>
                  <div className="font-medium">
                    {engagementPreference.primaryRoute ?? "Email first"}
                  </div>
                </div>
                {engagementPreference.secondaryRoute && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Secondary route
                    </div>
                    <div>{engagementPreference.secondaryRoute}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Gatekeeper risk
                  </div>
                  <Badge
                    variant={
                      engagementPreference.gatekeeperRisk === "High"
                        ? "destructive"
                        : engagementPreference.gatekeeperRisk === "Medium"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {engagementPreference.gatekeeperRisk}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Confidence
                  </div>
                  <div>
                    {(engagementPreference.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <Separator />

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="why">
                  <AccordionTrigger className="text-sm">
                    Why this approach?
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc space-y-1 pl-5">
                      {engagementPreference.rationale.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="sequence">
                  <AccordionTrigger className="text-sm">
                    Suggested first-touch sequence
                  </AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal space-y-1 pl-5">
                      {engagementPreference.suggestedSequence.map(
                        (step, index) => (
                          <li key={index}>{step}</li>
                        )
                      )}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {!engagementPreference.directColdCallRecommended && (
                <p className="text-xs text-muted-foreground">
                  Direct cold calling is not recommended as a first touch for
                  this profile; treat phone as a follow-on or routing tool once
                  a named stakeholder has been identified.
                </p>
              )}
            </>
          )}

          {Array.isArray(strategy?.evidence_summary) && strategy.evidence_summary.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Evidence summary</div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {strategy.evidence_summary.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {Array.isArray(strategy?.assumptions) && strategy.assumptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Assumptions</div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {strategy.assumptions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {Array.isArray(strategy?.missing_information) && strategy.missing_information.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">Missing information</div>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {strategy.missing_information.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}