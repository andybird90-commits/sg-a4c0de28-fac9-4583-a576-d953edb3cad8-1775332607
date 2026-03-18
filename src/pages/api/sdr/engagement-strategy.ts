import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

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
  route_rationale: string;
  stakeholder_hypothesis: string;
  suggested_subject_line: string;
  suggested_first_email: string;
  suggested_call_purpose: string;
  next_best_action: string;
}

interface EngagementStrategy extends TextualStrategyFields {
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
  const {
    companyAgeYears,
    numberOfDirectors,
    sicCodes,
    hasWebsite,
    isClearlyCorporate,
    isTechnicalSector,
    isLocalRelationshipBusiness,
  } = input;

  const directors = numberOfDirectors ?? 0;
  const age = companyAgeYears ?? 0;
  const sic = sicCodes ?? [];

  const hasManyDirectors = directors >= 4;
  const isYoungGrowth = age > 0 && age <= 10;

  const hasConstructionLikeSic = sic.some(
    (code) => code.startsWith("41") || code.startsWith("42") || code.startsWith("43")
  );
  const hasManufacturingSic = sic.some(
    (code) =>
      code.startsWith("25") ||
      code.startsWith("26") ||
      code.startsWith("27") ||
      code.startsWith("28") ||
      code.startsWith("29") ||
      code.startsWith("30")
  );

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
  hasLinkedinPresence: boolean;
  hasLinkedinCompanyPage: boolean;
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

  if (input.hasLinkedinPresence) {
    digital += 15;
    relationship += 5;
  }

  if (input.hasLinkedinCompanyPage) {
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
    if (filing >= 70) {
      urgency += 15;
    } else if (filing <= 40) {
      urgency -= 10;
    }
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

function computeAccountTier(input: {
  persona: AccountPersona;
  isClearlyCorporate: boolean;
  numberOfDirectors: number | null;
  companyAgeYears: number | null;
  isTechnicalSector: boolean;
  hasLinkedinCompanyPage: boolean;
}): AccountTier {
  const directors = input.numberOfDirectors ?? 0;
  const age = input.companyAgeYears ?? 0;

  if (
    input.isClearlyCorporate ||
    directors >= 6 ||
    (directors >= 4 && age >= 8) ||
    (input.isTechnicalSector && input.hasLinkedinCompanyPage)
  ) {
    return "enterprise_complex";
  }

  if (
    directors >= 3 ||
    input.persona === "formal_mid_market_business" ||
    input.persona === "procurement_or_compliance_led_organisation"
  ) {
    return "mid_market_structured";
  }

  return "direct_access";
}

function computeAccessMeta(input: {
  accountTier: AccountTier;
  hasDirectPhoneSignal: boolean;
  hasContactSignal: boolean;
  isLocalRelationshipBusiness: boolean;
  hasLinkedinPresence: boolean;
  hasLinkedinCompanyPage: boolean;
}): {
  gatekeeperRiskScore: number;
  organisationalComplexityScore: number;
  warmRoutePotentialScore: number;
  credibilityThresholdScore: number;
  namedContactRequired: boolean;
} {
  let gatekeeper = 30;
  let complexity = 30;
  let warmRoute = 20;
  let credibility = 40;

  if (input.accountTier === "enterprise_complex") {
    gatekeeper += 45;
    complexity += 50;
    credibility += 30;
  } else if (input.accountTier === "mid_market_structured") {
    gatekeeper += 25;
    complexity += 25;
    credibility += 15;
  } else {
    gatekeeper -= 10;
    complexity -= 10;
  }

  if (input.hasDirectPhoneSignal) {
    gatekeeper -= 15;
  }
  if (input.hasContactSignal) {
    gatekeeper -= 10;
  }

  if (input.isLocalRelationshipBusiness) {
    warmRoute += 25;
  }
  if (input.hasLinkedinPresence) {
    warmRoute += 20;
  }
  if (input.hasLinkedinCompanyPage) {
    warmRoute += 15;
  }

  warmRoute = clampScore(warmRoute);
  gatekeeper = clampScore(gatekeeper);
  complexity = clampScore(complexity);
  credibility = clampScore(credibility);

  const namedContactRequired =
    input.accountTier !== "direct_access" && gatekeeper >= 50;

  return {
    gatekeeperRiskScore: gatekeeper,
    organisationalComplexityScore: complexity,
    warmRoutePotentialScore: warmRoute,
    credibilityThresholdScore: credibility,
    namedContactRequired,
  };
}

function computeChannelScores(
  persona: AccountPersona,
  supporting: SupportingScores,
  signals: {
    hasDirectPhoneSignal: boolean;
    hasWebsite: boolean;
    isLocalRelationshipBusiness: boolean;
    hasLinkedinPresence: boolean;
    hasLinkedinCompanyPage: boolean;
    accountTier: AccountTier;
    namedContactFound: boolean;
  }
): ChannelScores {
  let email = 50;
  let call = 50;
  let face = 40;

  if (
    persona === "formal_mid_market_business" ||
    persona === "procurement_or_compliance_led_organisation"
  ) {
    email += 20;
    call -= 5;
  }

  if (
    persona === "owner_led_practical_sme" ||
    persona === "relationship_led_local_business"
  ) {
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
  call +=
    (supporting.decision_maker_access_score - 50) * 0.4 +
    (supporting.relationship_score - 50) * 0.2;
  face +=
    (supporting.local_visit_score - 50) * 0.6 +
    (supporting.commercial_value_score - 50) * 0.2;

  let linkedin = 40;
  if (signals.hasLinkedinPresence) {
    linkedin += 20;
  }
  if (signals.hasLinkedinCompanyPage) {
    linkedin += 20;
  }
  if (signals.accountTier !== "direct_access") {
    linkedin += 10;
  }
  if (signals.namedContactFound) {
    linkedin += 15;
  }

  let research = 20;
  if (signals.accountTier === "enterprise_complex") {
    research += 50;
  } else if (signals.accountTier === "mid_market_structured") {
    research += 30;
  }
  if (!signals.namedContactFound) {
    research += 15;
  }

  return {
    email: clampScore(email),
    call: clampScore(call),
    face_to_face: clampScore(face),
    linkedin: clampScore(linkedin),
    research: clampScore(research),
  };
}

function pickChannels(
  scores: ChannelScores,
  accountTier: AccountTier,
  namedContactFound: boolean,
  gatekeeperRiskScore: number
): { primary: Channel; secondary: Channel; accessStrategy: AccessStrategy } {
  const entries: { key: Channel; value: number }[] = [
    { key: "email", value: scores.email },
    { key: "call", value: scores.call },
    { key: "face_to_face", value: scores.face_to_face },
    { key: "linkedin", value: scores.linkedin },
    { key: "research", value: scores.research },
  ];

  entries.sort((a, b) => b.value - a.value);

  let primary: Channel = entries[0].key;
  let secondary: Channel = entries[1].key;

  let accessStrategy: AccessStrategy = "direct_call";

  if (
    accountTier === "enterprise_complex" &&
    !namedContactFound &&
    gatekeeperRiskScore >= 60
  ) {
    primary = "research";
    secondary = scores.linkedin >= scores.email ? "linkedin" : "email";
    accessStrategy = "named_contact_research_first";
  } else if (accountTier === "enterprise_complex") {
    if (scores.linkedin >= scores.email) {
      primary = "linkedin";
      secondary = scores.email >= scores.call ? "email" : "call";
      accessStrategy = "linkedin_plus_email";
    } else {
      primary = "email";
      secondary = scores.linkedin >= scores.call ? "linkedin" : "call";
      accessStrategy = "insight_led_email";
    }
  } else if (accountTier === "mid_market_structured") {
    if (primary === "call" && gatekeeperRiskScore >= 50) {
      primary = "email";
      secondary = "call";
      accessStrategy = "insight_led_email";
    } else if (primary === "email") {
      accessStrategy = "direct_email_to_decision_maker";
    } else if (primary === "call") {
      accessStrategy = "direct_call";
    } else if (primary === "face_to_face") {
      accessStrategy = "local_meeting_pursuit";
    } else if (primary === "linkedin") {
      accessStrategy = "linkedin_plus_email";
    } else {
      accessStrategy = "nurture_before_outreach";
    }
  } else {
    // direct_access
    if (primary === "call") {
      accessStrategy = "direct_call";
    } else if (primary === "face_to_face") {
      accessStrategy = "local_meeting_pursuit";
    } else if (primary === "email") {
      accessStrategy = "direct_email_to_decision_maker";
    } else {
      accessStrategy = "nurture_before_outreach";
    }
  }

  return { primary, secondary, accessStrategy };
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

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || `http://${req.headers.host as string}`;

  try {
    const res = await fetch(
      `${baseUrl}/api/companies-house/lookup?number=${encodeURIComponent(
        companyNumber
      )}&includeHistory=true`
    );

    if (!res.ok) {
      return { snapshot: null, filingConfidenceScore: null };
    }

    const data = await res.json();

    const filingConfidenceScore =
      typeof data?.filing_history?.confidence_score === "number"
        ? data.filing_history.confidence_score
        : typeof data?.filing_history?.average_filing_lag_days === "number"
        ? 100 -
          Math.min(
            100,
            Math.max(0, data.filing_history.average_filing_lag_days as number)
          )
        : null;

    return { snapshot: data, filingConfidenceScore };
  } catch {
    return { snapshot: null, filingConfidenceScore: null };
  }
}

async function getWebSignals(
  companyName: string
): Promise<{
  hasWebsite: boolean;
  hasContactSignal: boolean;
  hasDirectPhoneSignal: boolean;
  isClearlyCorporate: boolean;
  isLocalRelationshipBusiness: boolean;
  hasLinkedinPresence: boolean;
  hasLinkedinCompanyPage: boolean;
  hasLinkedinNamedContact: boolean;
  linkedinSignalSummary: string;
  rawContext: string;
}> {
  const braveApiKey =
    process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_SEARCH_API;

  if (!braveApiKey) {
    return {
      hasWebsite: false,
      hasContactSignal: false,
      hasDirectPhoneSignal: false,
      isClearlyCorporate: false,
      isLocalRelationshipBusiness: false,
      hasLinkedinPresence: false,
      hasLinkedinCompanyPage: false,
      hasLinkedinNamedContact: false,
      linkedinSignalSummary: "",
      rawContext: "",
    };
  }

  try {
    const queryParts = [
      `"${companyName}"`,
      "UK company contact details R&D tax innovation LinkedIn",
    ];
    const query = queryParts.join(" ");

    const braveRes = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
        query
      )}&count=5`,
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
        hasLinkedinPresence: false,
        hasLinkedinCompanyPage: false,
        hasLinkedinNamedContact: false,
        linkedinSignalSummary: "",
        rawContext: "",
      };
    }

    const braveData = (await braveRes.json()) as any;
    const results = Array.isArray(braveData?.web?.results)
      ? (braveData.web.results as any[])
      : [];

    const contextLines: string[] = [];
    const linkedinLines: string[] = [];

    let hasWebsite = false;
    let hasContactSignal = false;
    let hasDirectPhoneSignal = false;
    let isClearlyCorporate = false;
    let isLocalRelationshipBusiness = false;
    let hasLinkedinPresence = false;
    let hasLinkedinCompanyPage = false;
    let hasLinkedinNamedContact = false;

    for (const r of results) {
      const title: string = r.title || "";
      const description: string = r.description || "";
      const url: string = r.url || "";

      const line = `Title: ${title}\nDescription: ${description}\nURL: ${url}`;
      contextLines.push(line);

      const lower = `${title} ${description} ${url}`.toLowerCase();

      if (url.includes("http")) {
        hasWebsite = true;
      }

      if (
        lower.includes("contact") ||
        lower.includes("enquire") ||
        lower.includes("get in touch")
      ) {
        hasContactSignal = true;
      }

      if (
        lower.includes("tel:") ||
        lower.includes("phone") ||
        lower.includes("call us")
      ) {
        hasDirectPhoneSignal = true;
      }

      if (
        lower.includes("plc") ||
        lower.includes("group") ||
        lower.includes("holdings") ||
        lower.includes("corporate")
      ) {
        isClearlyCorporate = true;
      }

      if (
        lower.includes("local") ||
        lower.includes("regional") ||
        lower.includes("family run") ||
        lower.includes("community")
      ) {
        isLocalRelationshipBusiness = true;
      }

      if (lower.includes("linkedin") || url.toLowerCase().includes("linkedin.com")) {
        hasLinkedinPresence = true;
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("linkedin.com/company/")) {
          hasLinkedinCompanyPage = true;
        }
        if (
          lowerUrl.includes("linkedin.com/in/") ||
          lowerUrl.includes("linkedin.com/pub/")
        ) {
          hasLinkedinNamedContact = true;
        }
        linkedinLines.push(line);
      }
    }

    const linkedinSignalSummary = linkedinLines.join("\n\n");
    const rawContext = contextLines.join("\n\n");

    return {
      hasWebsite,
      hasContactSignal,
      hasDirectPhoneSignal,
      isClearlyCorporate,
      isLocalRelationshipBusiness,
      hasLinkedinPresence,
      hasLinkedinCompanyPage,
      hasLinkedinNamedContact,
      linkedinSignalSummary,
      rawContext,
    };
  } catch {
    return {
      hasWebsite: false,
      hasContactSignal: false,
      hasDirectPhoneSignal: false,
      isClearlyCorporate: false,
      isLocalRelationshipBusiness: false,
      hasLinkedinPresence: false,
      hasLinkedinCompanyPage: false,
      hasLinkedinNamedContact: false,
      linkedinSignalSummary: "",
      rawContext: "",
    };
  }
}

async function getTextualFields(
  openaiApiKey: string,
  payload: {
    enriched: {
      companyName: string;
      companyNumber: string | null;
      chSnapshot: any | null;
      webContext: string;
      persona: AccountPersona;
      accountTier: AccountTier;
      supportingScores: SupportingScores;
      channelScores: ChannelScores;
      recommendedAccessStrategy: AccessStrategy;
      recommendedFirstChannel: Channel;
      fallbackChannel: Channel;
      confidence: ConfidenceLevel;
      hasLinkedinPresence: boolean;
      hasLinkedinCompanyPage: boolean;
      hasLinkedinNamedContact: boolean;
      gatekeeperRiskScore: number;
      organisationalComplexityScore: number;
      warmRoutePotentialScore: number;
      credibilityThresholdScore: number;
      namedContactRequired: boolean;
    };
    skeleton: EngagementStrategy;
  }
): Promise<TextualStrategyFields> {
  const systemMessage =
    "You are generating a realistic B2B account access strategy for an R&D tax consultancy SDR workflow. Your job is not just to pick email vs call; it is to recommend the most credible and realistic route into the account, based on evidence of organisational complexity, gatekeepers, named contacts, digital presence and sector. Use only the supplied evidence. Do not invent facts. Return strict JSON only.";

  const specMessage = [
    "Your job IS to determine the most credible and realistic route into an account based on:",
    "- organisational complexity",
    "- likely gatekeeper barriers",
    "- named contact availability",
    "- digital presence",
    "- sector style",
    "- commercial credibility needed",
    "- likely friction of generic outreach",
    "",
    "IMPORTANT RULES",
    "- Do not invent facts.",
    "- Use only supplied evidence.",
    "- Do not assume that a company being relationship-led means a generic cold call will work.",
    "- Distinguish between relationship value and accessibility.",
    "- Large, structured, defence, government-adjacent, infrastructure, utility, aerospace, or major corporate accounts often require a named-contact or divisional strategy first.",
    "- If no named contact is found and gatekeeper risk is high, do not recommend a generic cold call.",
    "- Do not generate scripts that would obviously fail at reception or switchboard.",
    "- Prefer realistic access strategy over simplistic contact preference.",
    "- Return strict JSON only.",
    "- No markdown.",
    "- No prose outside JSON.",
    "",
    "VALID VALUES",
    "",
    "recommended_access_strategy:",
    "- direct_call",
    "- insight_led_email",
    "- named_contact_research_first",
    "- linkedin_plus_email",
    "- referral_or_warm_intro",
    "- divisional_entry_point",
    "- event_or_network_route",
    "- local_meeting_pursuit",
    "- direct_email_to_decision_maker",
    "- nurture_before_outreach",
    "",
    "recommended_first_channel:",
    "- email",
    "- call",
    "- face_to_face",
    "- linkedin",
    "- research",
    "",
    "fallback_channel:",
    "- email",
    "- call",
    "- face_to_face",
    "- linkedin",
    "- research",
    "",
    "confidence:",
    "- high",
    "- medium",
    "- low",
    "",
    "account_tier:",
    "- direct_access",
    "- mid_market_structured",
    "- enterprise_complex",
    "",
    "account_persona:",
    "- owner_led_practical_sme",
    "- operationally_stretched_growth_company",
    "- formal_mid_market_business",
    "- technical_engineering_led_business",
    "- procurement_or_compliance_led_organisation",
    "- relationship_led_local_business",
    "",
    "SCORING RULES",
    "- All scores must be integers from 0 to 100.",
    "- reason_codes must be short snake_case labels.",
    "- evidence_summary must contain 3 to 5 concise evidence-based statements.",
    "- suggested messaging must be commercially credible.",
    "- For enterprise_complex accounts with no named contact, next_best_action should usually begin with research or stakeholder mapping, not generic calling.",
    "",
    "You are given two objects:",
    "- enriched_company_data: the evidence and context.",
    "- proposed_strategy: a pre-computed skeleton strategy containing recommended_access_strategy, channels, scores, tiers and booleans.",
    "",
    "You MUST:",
    "- Preserve all non-text fields from proposed_strategy exactly as provided (scores, booleans, persona, tier, channels).",
    "- Only refine the following text fields:",
    "  - reason_codes",
    "  - evidence_summary",
    "  - route_rationale",
    "  - stakeholder_hypothesis",
    "  - suggested_subject_line",
    "  - suggested_first_email",
    "  - suggested_call_purpose",
    "  - next_best_action",
    "",
    "Do not change numeric values, account_tier, account_persona, recommended_access_strategy, recommended_first_channel, fallback_channel or channel_scores.",
    "",
    "Return exactly this JSON shape (all fields present):",
    "{",
    '  "recommended_access_strategy": "",',
    '  "recommended_first_channel": "",',
    '  "fallback_channel": "",',
    '  "confidence": "",',
    '  "account_tier": "",',
    '  "account_persona": "",',
    '  "gatekeeper_risk_score": 0,',
    '  "organisational_complexity_score": 0,',
    '  "named_contact_required": false,',
    '  "named_contact_found": false,',
    '  "warm_route_potential_score": 0,',
    '  "credibility_threshold_score": 0,',
    '  "channel_scores": {',
    '    "email": 0,',
    '    "call": 0,',
    '    "face_to_face": 0,',
    '    "linkedin": 0,',
    '    "research": 0',
    "  },",
    '  "reason_codes": [],',
    '  "evidence_summary": [],',
    '  "route_rationale": "",',
    '  "stakeholder_hypothesis": "",',
    '  "suggested_subject_line": "",',
    '  "suggested_first_email": "",',
    '  "suggested_call_purpose": "",',
    '  "next_best_action": ""',
    "}",
    "",
    "INPUT DATA",
    JSON.stringify({
      enriched_company_data: {
        company_name: payload.enriched.companyName,
        company_number: payload.enriched.companyNumber,
        companies_house_snapshot: payload.enriched.chSnapshot,
        web_search_context: payload.enriched.webContext,
        persona: payload.enriched.persona,
        account_tier: payload.enriched.accountTier,
        supporting_scores: payload.enriched.supportingScores,
        web_linkedin_signals: {
          has_linkedin_presence: payload.enriched.hasLinkedinPresence,
          has_linkedin_company_page: payload.enriched.hasLinkedinCompanyPage,
          has_linkedin_named_contact: payload.enriched.hasLinkedinNamedContact,
        },
      },
      proposed_strategy: payload.skeleton,
    }),
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
        { role: "user", content: specMessage },
      ],
      temperature: 0.4,
      max_tokens: 900,
    }),
  });

  const data = (await response.json()) as any;
  const rawContent: string = data?.choices?.[0]?.message?.content || "{}";

  try {
    const clean = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(clean) as Partial<
      EngagementStrategy & {
        reason_codes: unknown;
        evidence_summary: unknown;
      }
    >;

    const reasonCodes = Array.isArray(parsed.reason_codes)
      ? parsed.reason_codes.map((x) => String(x)).slice(0, 12)
      : [];

    const evidenceSummary = Array.isArray(parsed.evidence_summary)
      ? parsed.evidence_summary.map((x) => String(x)).slice(0, 8)
      : [];

    return {
      reason_codes: reasonCodes,
      evidence_summary: evidenceSummary,
      route_rationale: parsed.route_rationale
        ? String(parsed.route_rationale)
        : "",
      stakeholder_hypothesis: parsed.stakeholder_hypothesis
        ? String(parsed.stakeholder_hypothesis)
        : "",
      suggested_subject_line: parsed.suggested_subject_line
        ? String(parsed.suggested_subject_line)
        : "",
      suggested_first_email: parsed.suggested_first_email
        ? String(parsed.suggested_first_email)
        : "",
      suggested_call_purpose: parsed.suggested_call_purpose
        ? String(parsed.suggested_call_purpose)
        : "",
      next_best_action: parsed.next_best_action
        ? String(parsed.next_best_action)
        : "",
    };
  } catch {
    return {
      reason_codes: [],
      evidence_summary: [],
      route_rationale: "",
      stakeholder_hypothesis: "",
      suggested_subject_line: "",
      suggested_first_email: "",
      suggested_call_purpose: "",
      next_best_action: "",
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const { prospectId } = req.body as { prospectId?: string };

  if (!prospectId) {
    res.status(400).json({ message: "prospectId is required" });
    return;
  }

  try {
    const { data: prospect, error: prospectError } = await (supabaseServer as any)
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
      res.status(404).json({ message: "Prospect not found" });
      return;
    }

    const prospectRecord = prospect as any;

    const companyName: string = prospectRecord.company_name as string;
    const companyNumber: string | null =
      (prospectRecord.company_number as string | null) ?? null;

    const { snapshot: chSnapshot, filingConfidenceScore } =
      await getCompaniesHouseSnapshot(req, companyNumber);

    const sicCodes: string[] | null = Array.isArray(chSnapshot?.sic_codes)
      ? (chSnapshot.sic_codes as string[])
      : null;

    const companyAgeYears: number | null =
      typeof chSnapshot?.company_age_years === "number"
        ? (chSnapshot.company_age_years as number)
        : null;

    const numberOfDirectors: number | null =
      typeof chSnapshot?.officers?.active_count === "number"
        ? (chSnapshot.officers.active_count as number)
        : null;

    const chAddressLocality: string | null =
      typeof chSnapshot?.registered_address?.locality === "string"
        ? (chSnapshot.registered_address.locality as string)
        : null;

    const webSignals = await getWebSignals(companyName);

    const {
      hasWebsite,
      hasContactSignal,
      hasDirectPhoneSignal,
      isClearlyCorporate,
      isLocalRelationshipBusiness,
      hasLinkedinPresence,
      hasLinkedinCompanyPage,
      hasLinkedinNamedContact,
      linkedinSignalSummary,
      rawContext,
    } = webSignals;

    const isTechnicalSector =
      (sicCodes ?? []).some(
        (code) =>
          code.startsWith("26") ||
          code.startsWith("27") ||
          code.startsWith("28") ||
          code.startsWith("29") ||
          code.startsWith("30")
      ) ||
      (sicCodes ?? []).some(
        (code) => code.startsWith("62") || code.startsWith("72")
      );

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
      hasLinkedinPresence,
      hasLinkedinCompanyPage,
      companyAgeYears,
      numberOfDirectors,
      isTechnicalSector,
      isLocalRelationshipBusiness,
      filingConfidenceScore,
    });

    const accountTier = computeAccountTier({
      persona,
      isClearlyCorporate,
      numberOfDirectors,
      companyAgeYears,
      isTechnicalSector,
      hasLinkedinCompanyPage,
    });

    const accessMeta = computeAccessMeta({
      accountTier,
      hasDirectPhoneSignal,
      hasContactSignal,
      isLocalRelationshipBusiness:
        Boolean(chAddressLocality) || isLocalRelationshipBusiness,
      hasLinkedinPresence,
      hasLinkedinCompanyPage,
    });

    const channelScores = computeChannelScores(persona, supportingScores, {
      hasDirectPhoneSignal,
      hasWebsite: hasWebsite || Boolean(prospectRecord.website),
      isLocalRelationshipBusiness:
        Boolean(chAddressLocality) || isLocalRelationshipBusiness,
      hasLinkedinPresence,
      hasLinkedinCompanyPage,
      accountTier,
      namedContactFound: hasLinkedinNamedContact,
    });

    const { primary, secondary, accessStrategy } = pickChannels(
      channelScores,
      accountTier,
      hasLinkedinNamedContact,
      accessMeta.gatekeeperRiskScore
    );

    const evidenceSignals: boolean[] = [];
    if (companyAgeYears !== null) evidenceSignals.push(true);
    if (numberOfDirectors !== null) evidenceSignals.push(true);
    if ((sicCodes ?? []).length > 0) evidenceSignals.push(true);
    if (hasWebsite || Boolean(prospectRecord.website)) evidenceSignals.push(true);
    if (hasContactSignal) evidenceSignals.push(true);
    if (hasDirectPhoneSignal) evidenceSignals.push(true);
    if (hasLinkedinPresence) evidenceSignals.push(true);
    if (typeof filingConfidenceScore === "number") evidenceSignals.push(true);

    const evidenceStrength =
      evidenceSignals.length === 0
        ? 0
        : Math.min(1, evidenceSignals.length / 8);

    const confidence = computeConfidence(evidenceStrength);

    const openaiApiKey = process.env.OPENAI_API_KEY;

    const skeleton: EngagementStrategy = {
      recommended_access_strategy: accessStrategy,
      recommended_first_channel: primary,
      fallback_channel: secondary,
      confidence,
      account_persona: persona,
      account_tier: accountTier,
      gatekeeper_risk_score: accessMeta.gatekeeperRiskScore,
      organisational_complexity_score: accessMeta.organisationalComplexityScore,
      named_contact_required: accessMeta.namedContactRequired,
      named_contact_found: hasLinkedinNamedContact,
      warm_route_potential_score: accessMeta.warmRoutePotentialScore,
      credibility_threshold_score: accessMeta.credibilityThresholdScore,
      channel_scores: channelScores,
      reason_codes: [],
      evidence_summary: [],
      route_rationale: "",
      stakeholder_hypothesis: "",
      suggested_subject_line: "",
      suggested_first_email: "",
      suggested_call_purpose: "",
      next_best_action: "",
    };

    let textual: TextualStrategyFields = {
      reason_codes: [],
      evidence_summary: [],
      route_rationale: "",
      stakeholder_hypothesis: "",
      suggested_subject_line: "",
      suggested_first_email: "",
      suggested_call_purpose: "",
      next_best_action: "",
    };

    if (openaiApiKey) {
      textual = await getTextualFields(openaiApiKey, {
        enriched: {
          companyName,
          companyNumber,
          chSnapshot,
          webContext: rawContext,
          persona,
          accountTier,
          supportingScores,
          channelScores,
          recommendedAccessStrategy: accessStrategy,
          recommendedFirstChannel: primary,
          fallbackChannel: secondary,
          confidence,
          hasLinkedinPresence,
          hasLinkedinCompanyPage,
          hasLinkedinNamedContact,
          gatekeeperRiskScore: accessMeta.gatekeeperRiskScore,
          organisationalComplexityScore: accessMeta.organisationalComplexityScore,
          warmRoutePotentialScore: accessMeta.warmRoutePotentialScore,
          credibilityThresholdScore: accessMeta.credibilityThresholdScore,
          namedContactRequired: accessMeta.namedContactRequired,
        },
        skeleton,
      });
    }

    const strategy: EngagementStrategy = {
      ...skeleton,
      reason_codes: textual.reason_codes,
      evidence_summary: textual.evidence_summary,
      route_rationale: textual.route_rationale,
      stakeholder_hypothesis: textual.stakeholder_hypothesis,
      suggested_subject_line: textual.suggested_subject_line,
      suggested_first_email: textual.suggested_first_email,
      suggested_call_purpose: textual.suggested_call_purpose,
      next_best_action: textual.next_best_action,
    };

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .update({
        engagement_strategy_json: strategy as unknown,
        engagement_recommended_first_touch: strategy.recommended_first_channel,
        engagement_fallback_touch: strategy.fallback_channel,
        engagement_confidence: strategy.confidence,
        engagement_account_persona: strategy.account_persona,
        engagement_email_score: strategy.channel_scores.email,
        engagement_call_score: strategy.channel_scores.call,
        engagement_face_to_face_score: strategy.channel_scores.face_to_face,
        engagement_digital_maturity_score:
          supportingScores.digital_maturity_score,
        engagement_relationship_score: supportingScores.relationship_score,
        engagement_local_visit_score: supportingScores.local_visit_score,
        engagement_decision_maker_access_score:
          supportingScores.decision_maker_access_score,
        engagement_education_need_score:
          supportingScores.education_need_score,
        engagement_commercial_value_score:
          supportingScores.commercial_value_score,
        engagement_urgency_trigger_score: supportingScores.urgency_trigger_score,
        engagement_reason_codes: strategy.reason_codes,
        engagement_evidence_summary: strategy.evidence_summary,
        engagement_suggested_opener: strategy.suggested_first_email,
        engagement_suggested_subject_line: strategy.suggested_subject_line,
        engagement_suggested_call_opener: strategy.suggested_call_purpose,
        engagement_suggested_meeting_angle: strategy.stakeholder_hypothesis,
        engagement_next_best_action: strategy.next_best_action,
        engagement_generated_at: nowIso,
        engagement_generated_from_version: "v2-access-strategy",
        engagement_ai_generation_status: "success",
        updated_at: nowIso,
      })
      .eq("id", prospectId)
      .select("*")
      .maybeSingle();

    if (updateError || !updated) {
      res
        .status(500)
        .json({ message: "Failed to save engagement strategy", strategy });
      return;
    }

    res.status(200).json({ strategy, prospect: updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to generate engagement strategy" });
  }
}