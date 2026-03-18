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
}

interface AiEngagementStrategyPanelProps {
  prospect: SdrProspect | null;
  onProspectUpdated: (prospect: SdrProspect) => void;
  onGenerateStrategy: (prospectId: string) => Promise<void>;
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

  const handleGenerateClick = async (): Promise<void> => {
    if (!prospect || generating) return;
    await onGenerateStrategy(prospect.id as string);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Channel preference</CardTitle>
            <p className="text-xs text-muted-foreground">
              How this prospect appears to respond in practice.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={generating || !prospect.id}
            className="inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Refreshing…" : "Refresh AI strategy"}
          </button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Live working preference
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{livePreference ?? "Unknown"}</Badge>
                <span className="text-xs text-muted-foreground">
                  {observedLabel}
                </span>
              </div>
            </div>

            {personaValue && (
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Account persona
                </div>
                <div className="text-xs">
                  {formatPersonaLabel(personaValue)}
                </div>
              </div>
            )}

            {accountTierValue && (
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Account tier
                </div>
                <Badge variant="outline" className="text-xs">
                  {accountTierValue.replace(/_/g, " ")}
                </Badge>
              </div>
            )}

            {confidenceValue && (
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  AI confidence
                </div>
                <Badge variant="secondary" className="text-xs">
                  {confidenceValue}
                </Badge>
              </div>
            )}
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
                Refresh the AI strategy to infer a route into the account based
                on the latest enrichment. For major enterprises this focuses on
                access strategy and stakeholder mapping, not just channel
                choice.
              </p>
            </div>
          ) : engagementPreference.mode === "enterprise" ? (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Primary access model
                  </div>
                  <div className="font-medium">
                    {engagementPreference.primaryAccessModel ??
                      "Stakeholder-mapped account-based outreach"}
                  </div>
                </div>
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
                    Confidence
                  </div>
                  <div>
                    {(engagementPreference.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Suggested target persona
                </div>
                <div>{engagementPreference.recommendedPersona}</div>
              </div>

              {engagementPreference.likelyStakeholderClass && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Likely stakeholder class
                  </div>
                  <div>{engagementPreference.likelyStakeholderClass}</div>
                </div>
              )}

              {engagementPreference.deliveryChannelGuidance && (
                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Delivery channel guidance
                  </div>
                  <div>{engagementPreference.deliveryChannelGuidance}</div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Business unit targeting required
                  </div>
                  <div>
                    {engagementPreference.businessUnitTargetingRequired
                      ? "Yes"
                      : "No"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Named contact required
                  </div>
                  <div>
                    {engagementPreference.namedContactRequired ? "Yes" : "No"}
                  </div>
                </div>
                {engagementPreference.phoneUseRule && (
                  <div>
                    <div className="text-xs uppercase text-muted-foreground">
                      Phone use rule
                    </div>
                    <div>{engagementPreference.phoneUseRule}</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Recommended tone
                </div>
                <div>{engagementPreference.tone}</div>
              </div>

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

              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Suggested target persona
                </div>
                <div>{engagementPreference.recommendedPersona}</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">
                  Recommended tone
                </div>
                <div>{engagementPreference.tone}</div>
              </div>

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

              {!engagementPreference.directColdCallRecommended && (
                <p className="text-xs text-muted-foreground">
                  Direct cold calling is not recommended as a first touch for
                  this profile; treat phone as a follow-on or routing tool once
                  a named stakeholder has been identified.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}