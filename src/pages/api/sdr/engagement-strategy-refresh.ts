import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import {
  buildEvidencePack,
  runOpenAiEngagementStrategy,
  type EngagementStrategyRunMode,
  type StrategyEvidencePack,
  type OpenAiEngagementStrategyOutput,
} from "@/lib/sdr/engagementStrategyRefresh";

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

type ApiResponse =
  | {
      ok: true;
      prospectId: string;
      runMode: EngagementStrategyRunMode;
      refreshedAt: string;
      sourceStatus: StrategyEvidencePack["sourceStatus"];
      warnings: string[];
      evidencePack: StrategyEvidencePack;
      strategyOutput: OpenAiEngagementStrategyOutput | null;
      prospect: unknown;
    }
  | {
      ok: false;
      message: string;
      detail?: unknown;
    };

function isRunMode(value: unknown): value is EngagementStrategyRunMode {
  return value === "refresh" || value === "full_live";
}

function confidenceToLevel(value: number): ConfidenceLevel {
  if (!Number.isFinite(value)) return "low";
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

function gatekeeperRiskToScore(value: OpenAiEngagementStrategyOutput["gatekeeper_risk"]): number {
  if (value === "High") return 85;
  if (value === "Medium") return 60;
  return 25;
}

function choosePersonaFromEvidence(input: {
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
  companyName: string;
}): AccountPersona {
  const { evidenceFlags } = input;

  if (evidenceFlags.hasPublicSectorSignals || evidenceFlags.hasProcurementSignals) {
    return "procurement_or_compliance_led_organisation";
  }

  if (evidenceFlags.hasTechnicalSignals || evidenceFlags.hasInnovationSignals) {
    return "technical_engineering_led_business";
  }

  const nameLower = input.companyName.toLowerCase();
  const looksLocal =
    /\b(ltd|limited)\b/.test(nameLower) &&
    !/\b(plc|group|holdings)\b/.test(nameLower) &&
    !evidenceFlags.hasGroupStructure;

  if (looksLocal && !evidenceFlags.hasMultiSitePresence) {
    return "formal_mid_market_business";
  }

  return "formal_mid_market_business";
}

function chooseAccountTier(input: {
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
  gatekeeperRisk: OpenAiEngagementStrategyOutput["gatekeeper_risk"];
}): AccountTier {
  const enterpriseSignals =
    input.evidenceFlags.hasPublicSectorSignals ||
    input.evidenceFlags.hasProcurementSignals ||
    input.evidenceFlags.hasGroupStructure ||
    input.evidenceFlags.hasMultiSitePresence ||
    input.gatekeeperRisk === "High";

  if (enterpriseSignals) return "enterprise_complex";
  return "mid_market_structured";
}

function pickPrimaryAccessModel(input: {
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
  internalContext: StrategyEvidencePack["internalContext"];
  gatekeeperRisk: OpenAiEngagementStrategyOutput["gatekeeper_risk"];
}): EngagementPreference["primaryAccessModel"] {
  const { evidenceFlags, internalContext, gatekeeperRisk } = input;

  const hasWarmSignals =
    Array.isArray(internalContext.known_contacts) && internalContext.known_contacts.length > 0;

  if (hasWarmSignals) {
    return "Referral / partner-led access route";
  }

  if (evidenceFlags.hasNamedDecisionMaker) {
    return "Named-contact-first outreach";
  }

  if (evidenceFlags.hasPublicSectorSignals || evidenceFlags.hasProcurementSignals) {
    return "Authority-led introduction path";
  }

  if (evidenceFlags.hasGroupStructure || evidenceFlags.hasMultiSitePresence || gatekeeperRisk === "High") {
    return "Stakeholder-mapped account-based outreach";
  }

  return "Business-unit-specific relevance sequence";
}

function buildLikelyStakeholderClass(input: {
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
  gatekeeperRisk: OpenAiEngagementStrategyOutput["gatekeeper_risk"];
  confidence: number;
}): string {
  const { evidenceFlags, gatekeeperRisk, confidence } = input;

  if (confidence < 0.35) {
    if (evidenceFlags.hasPublicSectorSignals) {
      return "Relevant directorate/programme lead plus commercial/procurement routing owner; validate the internal owner of innovation/R&D-type work before outbound.";
    }
    return "Identify the business unit that owns innovation/technical delivery, then map the sponsor function (finance/tax/commercial) tied to that activity.";
  }

  if (evidenceFlags.hasPublicSectorSignals) {
    return "Programme/directorate leadership linked to technical delivery plus commercial/procurement routing owner; secure a named stakeholder path before outreach.";
  }

  if (evidenceFlags.hasTechnicalSignals || evidenceFlags.hasInnovationSignals) {
    if (gatekeeperRisk === "High") {
      return "Engineering/programme/innovation ownership within the relevant business unit, with a finance/tax sponsor aligned to that activity.";
    }
    return "Engineering/programme lead or innovation owner closest to delivery, plus finance sponsor who can validate commercial fit.";
  }

  if (evidenceFlags.hasProcurementSignals) {
    return "Commercial/procurement gatekeeper path plus the business-unit leader who actually owns delivery/innovation; avoid generic top-level routes.";
  }

  return "Business-unit leader tied to delivery/innovation, with finance/commercial sponsorship aligned to outcomes.";
}

function buildPhoneUseRule(input: {
  gatekeeperRisk: OpenAiEngagementStrategyOutput["gatekeeper_risk"];
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
}): string {
  const { gatekeeperRisk, evidenceFlags } = input;

  if (gatekeeperRisk === "High" || evidenceFlags.hasProcurementSignals || evidenceFlags.hasPublicSectorSignals) {
    return "Routing only until a named stakeholder is identified; do not use phone for blind pitching.";
  }

  if (gatekeeperRisk === "Medium") {
    return "Follow-up only after relevance is established via email/LinkedIn; use phone to support routing, not to open cold.";
  }

  return "Appropriate for direct outreach if a named stakeholder is known; otherwise use to confirm routing after email context.";
}

function buildDeliveryGuidance(input: {
  gatekeeperRisk: OpenAiEngagementStrategyOutput["gatekeeper_risk"];
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
}): string {
  const { gatekeeperRisk, evidenceFlags } = input;

  if (gatekeeperRisk === "High" || evidenceFlags.hasProcurementSignals || evidenceFlags.hasPublicSectorSignals) {
    return "Use email only once relevance is anchored to a named stakeholder or business unit. Use phone only to verify routing or support follow-up, not as a blind first-touch pitch.";
  }

  return "Use email as the default delivery mechanism once you have a likely stakeholder hypothesis; use phone selectively as a follow-up or routing tool rather than a generic first-touch pitch.";
}

function buildRecommendationStatus(confidence: number): EngagementPreference["recommendationStatus"] {
  if (!Number.isFinite(confidence) || confidence < 0.35) return "exploratory";
  if (confidence < 0.7) return "limited signal but strategically directional";
  return "clear";
}

function buildEngagementPreference(input: {
  pack: StrategyEvidencePack;
  output: OpenAiEngagementStrategyOutput;
}): EngagementPreference {
  const { pack, output } = input;

  const isEnterprise =
    pack.evidenceFlags.hasPublicSectorSignals ||
    pack.evidenceFlags.hasProcurementSignals ||
    pack.evidenceFlags.hasGroupStructure ||
    pack.evidenceFlags.hasMultiSitePresence ||
    pack.evidenceFlags.hasGatekeeperIndicators ||
    output.gatekeeper_risk === "High";

  const recommendationStatus = buildRecommendationStatus(output.confidence);

  const likelyStakeholderClass = buildLikelyStakeholderClass({
    evidenceFlags: pack.evidenceFlags,
    gatekeeperRisk: output.gatekeeper_risk,
    confidence: output.confidence,
  });

  if (isEnterprise) {
    const primaryAccessModel = pickPrimaryAccessModel({
      evidenceFlags: pack.evidenceFlags,
      internalContext: pack.internalContext,
      gatekeeperRisk: output.gatekeeper_risk,
    });

    const businessUnitTargetingRequired =
      pack.evidenceFlags.hasGroupStructure ||
      pack.evidenceFlags.hasMultiSitePresence ||
      pack.evidenceFlags.hasPublicSectorSignals ||
      pack.evidenceFlags.hasProcurementSignals ||
      output.gatekeeper_risk === "High";

    return {
      mode: "enterprise",
      recommendedPersona:
        output.suggested_target_persona && output.suggested_target_persona.trim() !== ""
          ? output.suggested_target_persona
          : likelyStakeholderClass,
      tone:
        output.recommended_tone && output.recommended_tone.trim() !== ""
          ? output.recommended_tone
          : "Strategic, credibility-first guidance on reaching the right stakeholders in a gatekept organisation.",
      gatekeeperRisk: output.gatekeeper_risk,
      directColdCallRecommended: false,
      confidence: output.confidence,
      rationale: output.why_this_approach ? [output.why_this_approach] : [],
      suggestedSequence: Array.isArray(output.suggested_first_touch_sequence)
        ? output.suggested_first_touch_sequence
            .map((s) => `${s.step}. ${s.action} — ${s.reason}`.trim())
            .filter(Boolean)
        : [],
      whatNotToDo:
        Array.isArray(output.what_not_to_do) && output.what_not_to_do.length > 0
          ? output.what_not_to_do
          : [
              "Do not call the main switchboard and pitch blindly.",
              "Do not ask generic questions like 'who handles R&D tax?'.",
              "Do not assume the first responder is the correct stakeholder.",
              "Do not use a generic SDR script; tailor to the relevant business unit and context.",
              "Do not treat channel availability as proof a channel is strategically appropriate.",
            ],
      primaryAccessModel,
      deliveryChannelGuidance: buildDeliveryGuidance({
        gatekeeperRisk: output.gatekeeper_risk,
        evidenceFlags: pack.evidenceFlags,
      }),
      recommendationStatus,
      businessUnitTargetingRequired,
      namedContactRequired: true,
      phoneUseRule: buildPhoneUseRule({
        gatekeeperRisk: output.gatekeeper_risk,
        evidenceFlags: pack.evidenceFlags,
      }),
      likelyStakeholderClass,
    };
  }

  const primaryRoute =
    output.primary_route && output.primary_route.trim() !== "" ? output.primary_route : "Email first";

  const secondaryRoute =
    output.secondary_route && output.secondary_route.trim() !== "" ? output.secondary_route : null;

  return {
    mode: "standard",
    primaryRoute,
    secondaryRoute,
    recommendedPersona:
      output.suggested_target_persona && output.suggested_target_persona.trim() !== ""
        ? output.suggested_target_persona
        : "A likely operational/finance/technical decision maker aligned to R&D activity",
    tone:
      output.recommended_tone && output.recommended_tone.trim() !== ""
        ? output.recommended_tone
        : "Credibility-first, low-pressure, insight-led and relevant to the prospect’s context",
    gatekeeperRisk: output.gatekeeper_risk,
    directColdCallRecommended: false,
    confidence: output.confidence,
    rationale: output.why_this_approach ? [output.why_this_approach] : [],
    suggestedSequence: Array.isArray(output.suggested_first_touch_sequence)
      ? output.suggested_first_touch_sequence
          .map((s) => `${s.step}. ${s.action} — ${s.reason}`.trim())
          .filter(Boolean)
      : [],
    whatNotToDo:
      Array.isArray(output.what_not_to_do) && output.what_not_to_do.length > 0
        ? output.what_not_to_do
        : [],
  };
}

function pickDeliveryChannels(input: {
  preference: EngagementPreference;
  evidenceFlags: StrategyEvidencePack["evidenceFlags"];
}): { primary: Channel; fallback: Channel; accessStrategy: AccessStrategy } {
  const { preference, evidenceFlags } = input;

  if (preference.mode === "enterprise") {
    const accessStrategy: AccessStrategy = evidenceFlags.hasNamedDecisionMaker
      ? "linkedin_plus_email"
      : "named_contact_research_first";
    return { primary: "research", fallback: "email", accessStrategy };
  }

  return { primary: "email", fallback: "linkedin", accessStrategy: "insight_led_email" };
}

function deriveReasonCodes(flags: StrategyEvidencePack["evidenceFlags"]): string[] {
  const codes: string[] = [];
  if (flags.hasPublicSectorSignals) codes.push("public_sector_signals");
  if (flags.hasProcurementSignals) codes.push("procurement_signals");
  if (flags.hasGroupStructure) codes.push("group_structure");
  if (flags.hasGatekeeperIndicators) codes.push("gatekeeper_indicators");
  if (flags.hasMultiSitePresence) codes.push("multi_site_presence");
  if (flags.hasNamedDecisionMaker) codes.push("named_decision_maker_signal");
  if (flags.hasTechnicalSignals) codes.push("technical_signals");
  if (flags.hasInnovationSignals) codes.push("innovation_signals");
  return codes;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const body = req.body as { prospectId?: string; mode?: EngagementStrategyRunMode };
  const prospectId = body?.prospectId;
  const mode: EngagementStrategyRunMode = isRunMode(body?.mode) ? body.mode : "full_live";

  if (!prospectId) {
    res.status(400).json({ ok: false, message: "prospectId is required" });
    return;
  }

  const refreshedAt = new Date().toISOString();

  try {
    const { data: prospect, error: prospectError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .select("*")
      .eq("id", prospectId)
      .maybeSingle();

    if (prospectError || !prospect) {
      res.status(404).json({ ok: false, message: "Prospect not found", detail: prospectError });
      return;
    }

    const { data: recentRuns } = await (supabaseServer as any)
      .from("sdr_engagement_strategy_runs")
      .select("evidence_pack, strategy_output, warnings, source_status, created_at, run_mode")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(5);

    const latestRun = Array.isArray(recentRuns) ? recentRuns[0] : null;

    let reuseEvidence: { companiesHouse?: any; webEvidence?: any } | null = null;
    if (mode === "refresh" && latestRun?.evidence_pack && typeof latestRun.evidence_pack === "object") {
      const createdAt = typeof latestRun.created_at === "string" ? new Date(latestRun.created_at) : null;
      const ageMs = createdAt ? Date.now() - createdAt.getTime() : Number.POSITIVE_INFINITY;
      const within24h = Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000;

      if (within24h) {
        const pack = latestRun.evidence_pack as any;
        reuseEvidence = {
          companiesHouse: pack?.companiesHouse ?? null,
          webEvidence: pack?.webEvidence ?? null,
        };
      }
    }

    const dossier = (prospect as any).ai_dossier_json;
    const dossierSummary =
      dossier && typeof dossier === "object"
        ? (typeof dossier.rd_summary === "string" ? dossier.rd_summary : null)
        : null;

    const internalContext = {
      dossier_summary: dossierSummary,
      crm_notes: typeof (prospect as any)?.crm_notes === "string" ? (prospect as any).crm_notes : null,
      known_contacts: Array.isArray((prospect as any)?.known_contacts) ? (prospect as any).known_contacts : [],
      prior_outreach: Array.isArray((prospect as any)?.prior_outreach) ? (prospect as any).prior_outreach : [],
      prior_strategy_runs: Array.isArray(recentRuns)
        ? recentRuns.map((r: any) => ({
            created_at: r.created_at,
            run_mode: r.run_mode,
            warnings: r.warnings,
            source_status: r.source_status,
            strategy_output: r.strategy_output,
          }))
        : [],
      claim_context: typeof (prospect as any)?.claim_context === "object" ? (prospect as any).claim_context : null,
    };

    const { pack: evidencePack, warnings } = await buildEvidencePack({
      req,
      prospect,
      internalContext,
      mode,
      reuseEvidence,
    });

    const openAiResult = await runOpenAiEngagementStrategy(evidencePack);

    if (openAiResult.ok === false) {
      evidencePack.sourceStatus.openai = { ok: false, error: openAiResult.error };
      warnings.push(`OpenAI strategy reasoning unavailable: ${openAiResult.error}`);
    } else {
      evidencePack.sourceStatus.openai = { ok: true };
    }

    const strategyOutput = openAiResult.ok === true ? openAiResult.value : null;

    let engagementPreference: EngagementPreference | null = null;
    if (strategyOutput) {
      engagementPreference = buildEngagementPreference({ pack: evidencePack, output: strategyOutput });
    }

    const confidenceValue = strategyOutput ? confidenceToLevel(strategyOutput.confidence) : "low";

    const accountTier = strategyOutput
      ? chooseAccountTier({ evidenceFlags: evidencePack.evidenceFlags, gatekeeperRisk: strategyOutput.gatekeeper_risk })
      : "mid_market_structured";

    const personaValue = strategyOutput
      ? choosePersonaFromEvidence({ evidenceFlags: evidencePack.evidenceFlags, companyName: evidencePack.companyIdentity.companyName })
      : "formal_mid_market_business";

    const delivery = engagementPreference
      ? pickDeliveryChannels({ preference: engagementPreference, evidenceFlags: evidencePack.evidenceFlags })
      : { primary: "email" as Channel, fallback: "linkedin" as Channel, accessStrategy: "insight_led_email" as AccessStrategy };

    const strategyJson = {
      recommended_access_strategy: delivery.accessStrategy,
      recommended_first_channel: delivery.primary,
      fallback_channel: delivery.fallback,
      confidence: confidenceValue,
      account_persona: personaValue,
      account_tier: accountTier,
      gatekeeper_risk_score: strategyOutput ? gatekeeperRiskToScore(strategyOutput.gatekeeper_risk) : 50,
      organisational_complexity_score: accountTier === "enterprise_complex" ? 85 : 55,
      named_contact_required: engagementPreference?.mode === "enterprise",
      named_contact_found: evidencePack.evidenceFlags.hasNamedDecisionMaker,
      warm_route_potential_score: Array.isArray(internalContext.known_contacts) && internalContext.known_contacts.length > 0 ? 70 : 35,
      credibility_threshold_score: accountTier === "enterprise_complex" ? 75 : 55,
      direct_cold_call_recommended: false,
      channel_scores: {
        email: delivery.primary === "email" ? 75 : 60,
        call: delivery.primary === "call" ? 65 : 25,
        face_to_face: 30,
        linkedin: 55,
        research: delivery.primary === "research" ? 80 : 45,
      },
      reason_codes: deriveReasonCodes(evidencePack.evidenceFlags),
      evidence_summary: strategyOutput?.evidence_summary ?? [],
      route_rationale: strategyOutput?.why_this_approach ?? "",
      stakeholder_hypothesis: strategyOutput?.suggested_target_persona ?? "",
      suggested_subject_line: "",
      suggested_first_email: "",
      suggested_call_purpose: strategyOutput?.call_readiness ?? "",
      next_best_action:
        engagementPreference?.mode === "enterprise" && (strategyOutput?.confidence ?? 0) < 0.35
          ? "identify_business_unit_and_named_stakeholder_before_outbound"
          : engagementPreference?.mode === "enterprise"
          ? "map_stakeholders_then_send_insight_led_email"
          : "send_concise_email_then_follow_up_if_warm",
      engagement_preference: engagementPreference ?? undefined,
      refresh_timestamp: evidencePack.refresh_timestamp,
      source_status: evidencePack.sourceStatus,
      warnings,
      assumptions: strategyOutput?.assumptions ?? [],
      missing_information: strategyOutput?.missing_information ?? [],
      openai_strategy_output: strategyOutput ?? null,
    };

    const { error: insertError } = await (supabaseServer as any)
      .from("sdr_engagement_strategy_runs")
      .insert({
        prospect_id: prospectId,
        run_mode: mode,
        source_status: evidencePack.sourceStatus,
        evidence_pack: evidencePack,
        strategy_output: strategyOutput,
        warnings,
      });

    if (insertError) {
      res.status(500).json({ ok: false, message: "Failed to save strategy run", detail: insertError });
      return;
    }

    const { data: updatedProspect, error: updateError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .update({
        engagement_strategy_json: strategyJson,
        engagement_recommended_first_touch: "email",
        engagement_fallback_touch: "email",
        engagement_confidence: confidenceValue,
        engagement_account_persona: personaValue,
        engagement_reason_codes: strategyJson.reason_codes,
        engagement_evidence_summary: strategyJson.evidence_summary,
        engagement_suggested_call_opener: strategyOutput?.call_readiness ?? null,
        engagement_suggested_opener: strategyOutput?.email_readiness ?? null,
        engagement_suggested_meeting_angle: strategyJson.stakeholder_hypothesis,
        engagement_next_best_action: strategyJson.next_best_action,
        engagement_generated_at: refreshedAt,
        engagement_generated_from_version: `refresh-orchestrator:${mode}`,
        engagement_ai_generation_status: strategyOutput ? "success" : "error",
        updated_at: refreshedAt,
      })
      .eq("id", prospectId)
      .select("*")
      .maybeSingle();

    if (updateError || !updatedProspect) {
      res.status(500).json({ ok: false, message: "Failed to update prospect with latest strategy", detail: updateError });
      return;
    }

    console.log("SDR engagement strategy refresh", {
      prospectId,
      mode,
      sourceStatus: evidencePack.sourceStatus,
      warningsCount: warnings.length,
    });

    res.status(200).json({
      ok: true,
      prospectId,
      runMode: mode,
      refreshedAt,
      sourceStatus: evidencePack.sourceStatus,
      warnings,
      evidencePack,
      strategyOutput,
      prospect: updatedProspect,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to refresh engagement strategy",
      detail: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }
}