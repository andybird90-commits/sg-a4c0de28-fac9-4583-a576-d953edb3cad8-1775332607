import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Json } from "@/integrations/supabase/types";

type Channel = "email" | "call" | "face_to_face";
type ConfidenceLevel = "high" | "medium" | "low";
type AccountPersona =
  | "owner_led_practical_sme"
  | "operationally_stretched_growth_company"
  | "formal_mid_market_business"
  | "technical_engineering_led_business"
  | "procurement_or_compliance_led_organisation"
  | "relationship_led_local_business";

interface ChannelScores {
  email: number;
  call: number;
  face_to_face: number;
}

interface SupportingScores {
  digital_maturity_score: number;
  relationship_score: number;
  local_visit_score: number;
  decision_maker_access_score: number;
  education_need_score: number;
  commercial_value_score: number;
  urgency_trigger_score: number;
}

interface TextualStrategyFields {
  reason_codes: string[];
  evidence_summary: string[];
  suggested_opener: string;
  suggested_subject_line: string;
  suggested_call_opener: string;
  suggested_meeting_angle: string;
  next_best_action: string;
}

interface EngagementStrategy extends TextualStrategyFields {
  recommended_first_touch: Channel;
  fallback_touch: Channel;
  confidence: ConfidenceLevel;
  account_persona: AccountPersona;
  channel_scores: ChannelScores;
  supporting_scores: SupportingScores;
}

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function derivePersona(input: {
  companyAgeYears: number | null;
  numberOfDirectors: number | null;
  sicCodes: string[] | null;
  hasWebsite: boolean;
  isClearlyCorporate: boolean;
  isTechnicalSector: boolean;
  isLocalRelationshipBusiness: boolean;
}): AccountPersona {
  const { companyAgeYears, numberOfDirectors, sicCodes, hasWebsite, isClearlyCorporate, isTechnicalSector, isLocalRelationshipBusiness } = input;
  const directors = numberOfDirectors ?? 0;
  const age = companyAgeYears ?? 0;
  const sic = sicCodes ?? [];
  const hasManyDirectors = directors >= 4;
  const isYoungGrowth = age > 0 && age <= 10;
  const hasConstructionLikeSic = sic.some((code) => code.startsWith("41") || code.startsWith("42") || code.startsWith("43"));
  const hasManufacturingSic = sic.some((code) => code.startsWith("25") || code.startsWith("26") || code.startsWith("27") || code.startsWith("28") || code.startsWith("29") || code.startsWith("30"));
  if (isTechnicalSector || hasManufacturingSic) {
    return "technical_engineering_led_business";
  }
  if (isLocalRelationshipBusiness || hasConstructionLikeSic) {
    return "relationship_led_local_business";
  }
  if (!hasManyDirectors && directors <= 2 && !isClearlyCorporate) {
    return "owner_led_practical_sme";
  }
  if (isYoungGrowth && hasWebsite && !isClearlyCorporate) {
    return "operationally_stretched_growth_company";
  }
  if (isClearlyCorporate || hasManyDirectors) {
    return "formal_mid_market_business";
  }
  return "formal_mid_market_business";
}

function computeSupportingScores(input: {
  hasWebsite: boolean;
  hasContactSignal: boolean;
  hasDirectPhoneSignal: boolean;
  companyAgeYears: number | null;
  numberOfDirectors: number | null;
  isTechnicalSector: boolean;
  isLocalRelationshipBusiness: boolean;
  filingConfidenceScore: number | null;
}): SupportingScores {
  let digital = 30;
  let relationship = 30;
  let localVisit = 20;
  let decisionAccess = 40;
  let educationNeed = 40;
  let commercialValue = 40;
  let urgency = 30;
  if (input.hasWebsite) {
    digital += 25;
  }
  if (input.hasContactSignal) {
    digital += 10;
  }
  if (input.isTechnicalSector) {
    educationNeed += 15;
    commercialValue += 10;
  }
  const directors = input.numberOfDirectors ?? 0;
  if (directors <= 2) {
    decisionAccess += 25;
    relationship += 10;
  } else if (directors >= 5) {
    decisionAccess -= 10;
  }
  const age = input.companyAgeYears ?? 0;
  if (age >= 5 && age <= 20) {
    commercialValue += 15;
  }
  if (input.isLocalRelationshipBusiness) {
    relationship += 20;
    localVisit += 30;
  }
  if (input.hasDirectPhoneSignal) {
    decisionAccess += 15;
    relationship += 10;
  }
  if (typeof input.filingConfidenceScore === "number") {
    const filing = clampScore(input.filingConfidenceScore);
    urgency += filing >= 70 ? 15 : filing <= 40 ? -10 : 0;
  }
  return {
    digital_maturity_score: clampScore(digital),
    relationship_score: clampScore(relationship),
    local_visit_score: clampScore(localVisit),
    decision_maker_access_score: clampScore(decisionAccess),
    education_need_score: clampScore(educationNeed),
    commercial_value_score: clampScore(commercialValue),
    urgency_trigger_score: clampScore(urgency),
  };
}

function computeChannelScores(persona: AccountPersona, supporting: SupportingScores, signals: { hasDirectPhoneSignal: boolean; hasWebsite: boolean; isLocalRelationshipBusiness: boolean }): ChannelScores {
  let email = 50;
  let call = 50;
  let face = 40;
  if (persona === "formal_mid_market_business" || persona === "procurement_or_compliance_led_organisation") {
    email += 20;
    call -= 5;
  }
  if (persona === "owner_led_practical_sme" || persona === "relationship_led_local_business") {
    call += 15;
  }
  if (persona === "technical_engineering_led_business") {
    email += 10;
    call += 10;
  }
  if (persona === "operationally_stretched_growth_company") {
    call += 10;
    email += 5;
  }
  if (signals.hasDirectPhoneSignal) {
    call += 15;
  }
  if (signals.hasWebsite) {
    email += 10;
  }
  if (signals.isLocalRelationshipBusiness) {
    face += 20;
    call += 10;
  }
  email += (supporting.digital_maturity_score - 50) * 0.4;
  call += (supporting.decision_maker_access_score - 50) * 0.4 + (supporting.relationship_score - 50) * 0.2;
  face += (supporting.local_visit_score - 50) * 0.6 + (supporting.commercial_value_score - 50) * 0.2;
  return {
    email: clampScore(email),
    call: clampScore(call),
    face_to_face: clampScore(face),
  };
}

function pickChannels(scores: ChannelScores): { primary: Channel; secondary: Channel } {
  const entries: { key: Channel; value: number }[] = [
    { key: "email", value: scores.email },
    { key: "call", value: scores.call },
    { key: "face_to_face", value: scores.face_to_face },
  ];
  entries.sort((a, b) => b.value - a.value);
  const primary = entries[0].key;
  const secondary = entries[1].key;
  return { primary, secondary };
}

function computeConfidence(evidenceStrength: number): ConfidenceLevel {
  if (evidenceStrength >= 0.7) return "high";
  if (evidenceStrength >= 0.4) return "medium";
  return "low";
}

async function getCompaniesHouseSnapshot(
  req: NextApiRequest,
  companyNumber: string | null
): Promise<{ snapshot: any | null; filingConfidenceScore: number | null }> {
  if (!companyNumber) {
    return { snapshot: null, filingConfidenceScore: null };
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `http://${req.headers.host}`;
  try {
    const res = await fetch(
      `${baseUrl}/api/companies-house/lookup?number=${encodeURIComponent(companyNumber)}&includeHistory=true`
    );
    if (!res.ok) {
      return { snapshot: null, filingConfidenceScore: null };
    }
    const data = await res.json();
    const filingConfidenceScore =
      typeof data?.filing_history?.confidence_score === "number"
        ? data.filing_history.confidence_score
        : typeof data?.filing_history?.average_filing_lag_days === "number"
        ? 100 - Math.min(100, Math.max(0, data.filing_history.average_filing_lag_days))
        : null;
    return { snapshot: data, filingConfidenceScore };
  } catch {
    return { snapshot: null, filingConfidenceScore: null };
  }
}

async function getWebSignals(companyName: string): Promise<{ hasWebsite: boolean; hasContactSignal: boolean; hasDirectPhoneSignal: boolean; isClearlyCorporate: boolean; isLocalRelationshipBusiness: boolean; rawContext: string }> {
  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_SEARCH_API;
  if (!braveApiKey) {
    return {
      hasWebsite: false,
      hasContactSignal: false,
      hasDirectPhoneSignal: false,
      isClearlyCorporate: false,
      isLocalRelationshipBusiness: false,
      rawContext: "",
    };
  }
  try {
    const queryParts = [`"${companyName}"`, "UK company contact details R&D tax innovation"];
    const query = queryParts.join(" ");
    const braveRes = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveApiKey as string,
        },
      }
    );
    if (!braveRes.ok) {
      return {
        hasWebsite: false,
        hasContactSignal: false,
        hasDirectPhoneSignal: false,
        isClearlyCorporate: false,
        isLocalRelationshipBusiness: false,
        rawContext: "",
      };
    }
    const braveData = (await braveRes.json()) as any;
    const results = Array.isArray(braveData?.web?.results) ? braveData.web.results : [];
    const contextLines: string[] = [];
    let hasWebsite = false;
    let hasContactSignal = false;
    let hasDirectPhoneSignal = false;
    let isClearlyCorporate = false;
    let isLocalRelationshipBusiness = false;
    for (const r of results) {
      const title: string = r.title || "";
      const description: string = r.description || "";
      const url: string = r.url || "";
      contextLines.push(`Title: ${title}\nDescription: ${description}\nURL: ${url}`);
      if (url.includes("http")) {
        hasWebsite = true;
      }
      const lower = `${title} ${description} ${url}`.toLowerCase();
      if (lower.includes("contact") || lower.includes("enquire") || lower.includes("get in touch")) {
        hasContactSignal = true;
      }
      if (lower.includes("tel:") || lower.includes("phone") || lower.includes("call us")) {
        hasDirectPhoneSignal = true;
      }
      if (lower.includes("plc") || lower.includes("group") || lower.includes("holdings") || lower.includes("corporate")) {
        isClearlyCorporate = true;
      }
      if (lower.includes("local") || lower.includes("regional") || lower.includes("family run") || lower.includes("community")) {
        isLocalRelationshipBusiness = true;
      }
    }
    return {
      hasWebsite,
      hasContactSignal,
      hasDirectPhoneSignal,
      isClearlyCorporate,
      isLocalRelationshipBusiness,
      rawContext: contextLines.join("\n\n"),
    };
  } catch {
    return {
      hasWebsite: false,
      hasContactSignal: false,
      hasDirectPhoneSignal: false,
      isClearlyCorporate: false,
      isLocalRelationshipBusiness: false,
      rawContext: "",
    };
  }
}

async function getTextualFields(
  openaiApiKey: string,
  payload: {
    companyName: string;
    companyNumber: string | null;
    chSnapshot: any | null;
    webContext: string;
    persona: AccountPersona;
    channelScores: ChannelScores;
    supportingScores: SupportingScores;
    recommended: Channel;
    fallback: Channel;
    confidence: ConfidenceLevel;
  }
): Promise<TextualStrategyFields> {
  const systemMessage =
    "You are an expert UK R&D tax SDR coach. You receive structured evidence and scoring and must generate an AI engagement strategy that is practical, explainable, and safe. Use only the evidence provided. Distinguish between evidence and inference in your wording. Recommend the least-friction, most practical first touch. Never claim to know a client's personal preference. Return strict JSON only with the required keys. Do not include markdown.";
  const userPayload = {
    company_name: payload.companyName,
    company_number: payload.companyNumber,
    companies_house_snapshot: payload.chSnapshot,
    web_search_context: payload.webContext,
    persona: payload.persona,
    channel_scores: payload.channelScores,
    supporting_scores: payload.supportingScores,
    recommended_first_touch: payload.recommended,
    fallback_touch: payload.fallback,
    confidence: payload.confidence,
  };
  const userMessage = [
    "You are given:",
    "- Basic company identifiers",
    "- A Companies House snapshot where available",
    "- Public web search context from Brave",
    "- Pre-computed channel and supporting scores",
    "- A provisional recommended first touch and fallback touch",
    "- A confidence level that already reflects evidence quality",
    "",
    "Rules:",
    "- Use only the evidence supplied. Do not invent extra facts or data points.",
    "- Distinguish clearly between observed evidence and your inference in the explanations.",
    "- Recommend the least-friction first touch from the options already provided.",
    "- Prioritise practical SDR usefulness over theory.",
    "- Confidence must reflect evidence quality, not certainty theatre.",
    "- If evidence is weak, keep explanations cautious rather than pretending certainty.",
    "",
    "You must return a JSON object with exactly these keys:",
    "reason_codes: string[] (machine friendly tags for why this approach makes sense, 3–8 items).",
    "evidence_summary: string[] (3–5 short human-readable bullets explaining the recommendation).",
    "suggested_opener: string (concise SDR guidance paragraph for the first touch, matching the recommended first touch).",
    "suggested_subject_line: string (email-style subject line, even if call-first is recommended).",
    "suggested_call_opener: string (spoken opener for a call).",
    "suggested_meeting_angle: string (how to frame a short consultative meeting).",
    "next_best_action: string (simple sequence like 'call_then_follow_with_email', 'email_then_book_meeting_if_positive', or similar).",
    "",
    "Do not include channel scores or supporting scores in the JSON; they are already stored elsewhere.",
    "Return strict JSON only. No markdown, no comments, no trailing text.",
    "",
    "Input payload:",
    JSON.stringify(userPayload),
  ].join("\n");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 900,
    }),
  });
  const data = (await response.json()) as any;
  const rawContent: string = data?.choices?.[0]?.message?.content || "{}";
  try {
    const clean = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean) as Partial<TextualStrategyFields>;
    const reasonCodes = Array.isArray(parsed.reason_codes) ? parsed.reason_codes.map((x) => String(x)).slice(0, 12) : [];
    const evidenceSummary = Array.isArray(parsed.evidence_summary) ? parsed.evidence_summary.map((x) => String(x)).slice(0, 8) : [];
    return {
      reason_codes: reasonCodes,
      evidence_summary: evidenceSummary,
      suggested_opener: parsed.suggested_opener ? String(parsed.suggested_opener) : "",
      suggested_subject_line: parsed.suggested_subject_line ? String(parsed.suggested_subject_line) : "",
      suggested_call_opener: parsed.suggested_call_opener ? String(parsed.suggested_call_opener) : "",
      suggested_meeting_angle: parsed.suggested_meeting_angle ? String(parsed.suggested_meeting_angle) : "",
      next_best_action: parsed.next_best_action ? String(parsed.next_best_action) : "",
    };
  } catch {
    return {
      reason_codes: [],
      evidence_summary: [],
      suggested_opener: "",
      suggested_subject_line: "",
      suggested_call_opener: "",
      suggested_meeting_angle: "",
      next_best_action: "",
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { prospectId } = req.body as { prospectId?: string };
  if (!prospectId) {
    return res.status(400).json({ message: "prospectId is required" });
  }
  try {
    const { data: prospect, error: prospectError } = await supabaseServer
      .from("sdr_prospects")
      .select(
        [
          "id",
          "company_name",
          "company_number",
          "website",
          "engagement_strategy_json",
          "engagement_observed_real_preference",
          "engagement_observed_preference_notes",
          "engagement_last_tested_channel",
          "engagement_last_tested_outcome",
        ].join(",")
      )
      .eq("id", prospectId)
      .maybeSingle();
    if (prospectError || !prospect) {
      return res.status(404).json({ message: "Prospect not found" });
    }

    const prospectRecord = prospect as any;

    const companyName: string = prospectRecord.company_name as string;
    const companyNumber: string | null = (prospectRecord.company_number as string | null) ?? null;
    const { snapshot: chSnapshot, filingConfidenceScore } = await getCompaniesHouseSnapshot(req, companyNumber);
    const sicCodes: string[] | null = Array.isArray(chSnapshot?.sic_codes) ? (chSnapshot.sic_codes as string[]) : null;
    const companyAgeYears: number | null =
      typeof chSnapshot?.company_age_years === "number" ? chSnapshot.company_age_years : null;
    const numberOfDirectors: number | null =
      typeof chSnapshot?.officers?.active_count === "number" ? chSnapshot.officers.active_count : null;
    const chAddressLocality: string | null =
      typeof chSnapshot?.registered_address?.locality === "string"
        ? (chSnapshot.registered_address.locality as string)
        : null;
    const { hasWebsite, hasContactSignal, hasDirectPhoneSignal, isClearlyCorporate, isLocalRelationshipBusiness, rawContext } =
      await getWebSignals(companyName);
    const isTechnicalSector =
      (sicCodes ?? []).some((code) => code.startsWith("26") || code.startsWith("27") || code.startsWith("28") || code.startsWith("29") || code.startsWith("30")) ||
      (sicCodes ?? []).some((code) => code.startsWith("62") || code.startsWith("72"));
    const persona = derivePersona({
      companyAgeYears,
      numberOfDirectors,
      sicCodes,
      hasWebsite: hasWebsite || Boolean(prospectRecord.website),
      isClearlyCorporate,
      isTechnicalSector,
      isLocalRelationshipBusiness,
    });
    const supportingScores = computeSupportingScores({
      hasWebsite: hasWebsite || Boolean(prospectRecord.website),
      hasContactSignal,
      hasDirectPhoneSignal,
      companyAgeYears,
      numberOfDirectors,
      isTechnicalSector,
      isLocalRelationshipBusiness,
      filingConfidenceScore,
    });
    const channelScores = computeChannelScores(persona, supportingScores, {
      hasDirectPhoneSignal,
      hasWebsite: hasWebsite || Boolean(prospectRecord.website),
      isLocalRelationshipBusiness: Boolean(chAddressLocality) || isLocalRelationshipBusiness,
    });
    const { primary, secondary } = pickChannels(channelScores);
    const evidenceSignals: boolean[] = [];
    if (companyAgeYears !== null) evidenceSignals.push(true);
    if (numberOfDirectors !== null) evidenceSignals.push(true);
    if ((sicCodes ?? []).length > 0) evidenceSignals.push(true);
    if (hasWebsite || Boolean(prospectRecord.website)) evidenceSignals.push(true);
    if (hasContactSignal) evidenceSignals.push(true);
    if (hasDirectPhoneSignal) evidenceSignals.push(true);
    if (typeof filingConfidenceScore === "number") evidenceSignals.push(true);
    const evidenceStrength = evidenceSignals.length === 0 ? 0 : Math.min(1, evidenceSignals.length / 7);
    const confidence = computeConfidence(evidenceStrength);
    const openaiApiKey = process.env.OPENAI_API_KEY;
    let textual: TextualStrategyFields = {
      reason_codes: [],
      evidence_summary: [],
      suggested_opener: "",
      suggested_subject_line: "",
      suggested_call_opener: "",
      suggested_meeting_angle: "",
      next_best_action: "",
    };
    if (openaiApiKey) {
      textual = await getTextualFields(openaiApiKey, {
        companyName,
        companyNumber,
        chSnapshot,
        webContext: rawContext,
        persona,
        channelScores,
        supportingScores,
        recommended: primary,
        fallback: secondary,
        confidence,
      });
    }
    const strategy: EngagementStrategy = {
      recommended_first_touch: primary,
      fallback_touch: secondary,
      confidence,
      account_persona: persona,
      channel_scores: channelScores,
      supporting_scores: supportingScores,
      reason_codes: textual.reason_codes,
      evidence_summary: textual.evidence_summary,
      suggested_opener: textual.suggested_opener,
      suggested_subject_line: textual.suggested_subject_line,
      suggested_call_opener: textual.suggested_call_opener,
      suggested_meeting_angle: textual.suggested_meeting_angle,
      next_best_action: textual.next_best_action,
    };
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseServer
      .from("sdr_prospects")
      .update({
        engagement_strategy_json: strategy as unknown as Json,
        engagement_recommended_first_touch: strategy.recommended_first_touch,
        engagement_fallback_touch: strategy.fallback_touch,
        engagement_confidence: strategy.confidence,
        engagement_account_persona: strategy.account_persona,
        engagement_email_score: strategy.channel_scores.email,
        engagement_call_score: strategy.channel_scores.call,
        engagement_face_to_face_score: strategy.channel_scores.face_to_face,
        engagement_digital_maturity_score: strategy.supporting_scores.digital_maturity_score,
        engagement_relationship_score: strategy.supporting_scores.relationship_score,
        engagement_local_visit_score: strategy.supporting_scores.local_visit_score,
        engagement_decision_maker_access_score: strategy.supporting_scores.decision_maker_access_score,
        engagement_education_need_score: strategy.supporting_scores.education_need_score,
        engagement_commercial_value_score: strategy.supporting_scores.commercial_value_score,
        engagement_urgency_trigger_score: strategy.supporting_scores.urgency_trigger_score,
        engagement_reason_codes: strategy.reason_codes,
        engagement_evidence_summary: strategy.evidence_summary,
        engagement_suggested_opener: strategy.suggested_opener,
        engagement_suggested_subject_line: strategy.suggested_subject_line,
        engagement_suggested_call_opener: strategy.suggested_call_opener,
        engagement_suggested_meeting_angle: strategy.suggested_meeting_angle,
        engagement_next_best_action: strategy.next_best_action,
        engagement_generated_at: nowIso,
        engagement_generated_from_version: "v1",
        engagement_ai_generation_status: "success",
        updated_at: nowIso,
      })
      .eq("id", prospectId)
      .select("*")
      .maybeSingle();
    if (updateError || !updated) {
      return res.status(500).json({ message: "Failed to save engagement strategy", strategy });
    }
    return res.status(200).json({ strategy, prospect: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate engagement strategy" });
  }
}