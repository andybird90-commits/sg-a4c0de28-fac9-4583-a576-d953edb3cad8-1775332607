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

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normaliseChannelForDb(
  channel: Channel | null | undefined
): "email" | "call" | "face_to_face" | null {
  if (!channel) return null;
  if (channel === "email" || channel === "call" || channel === "face_to_face") {
    return channel;
  }
  return null;
}

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
  recommendationStatus?:
    | "clear"
    | "exploratory"
    | "limited signal but strategically directional";
  businessUnitTargetingRequired?: boolean;
  namedContactRequired?: boolean;
  phoneUseRule?: string;
  likelyStakeholderClass?: string;
}

interface EnterpriseIndicators {
  major_brand_match: boolean;
  plc_like_name: boolean;
  public_sector_or_agency: boolean;
  procurement_signals: boolean;
  defence_or_aerospace: boolean;
  regulated_infrastructure_or_utility: boolean;
  corporate_site_signals: boolean;
  multinational_signals: boolean;
  indicator_count: number;
}

function detectEnterpriseIndicators(input: {
  companyName: string;
  sicCodes: string[] | null;
  webContext: string;
  hasLinkedinCompanyPage: boolean;
  isClearlyCorporate: boolean;
  hasCorporateSiteSignals: boolean;
  hasMultinationalSignals: boolean;
}): EnterpriseIndicators {
  const nameLower = input.companyName.toLowerCase();
  const nameNoPunct = nameLower.replace(/[^a-z0-9\s]/g, " ");

  const MAJOR_BRAND_KEYWORDS: string[] = [
    "airbus",
    "airbus defence and space",
    "bae systems",
    "bae",
    "rolls-royce",
    "siemens",
    "jacobs",
    "atkins",
    "atkinsréalis",
    "arup",
    "mace",
    "kier",
    "skanska",
    "ng bailey",
    "national grid",
    "bt group",
    "vodafone",
    "network rail",
  ];

  const majorBrandMatch =
    MAJOR_BRAND_KEYWORDS.some((keyword) => nameLower.includes(keyword)) ||
    /\bbae\b/.test(nameNoPunct);

  const plcLikeName =
    nameLower.includes(" plc") ||
    nameLower.includes(" holdings") ||
    nameLower.includes(" group") ||
    nameLower.includes(" limited company") ||
    nameLower.includes(" public limited");

  const sic = input.sicCodes ?? [];
  const hasDefenceOrAerospaceSic = sic.some((code) =>
    ["30", "33"].some((prefix) => code.startsWith(prefix))
  );

  const hasEnergyOrUtilitySic = sic.some((code) =>
    ["35", "36", "37", "42"].some((prefix) => code.startsWith(prefix))
  );

  const contextLower = input.webContext.toLowerCase();

  const publicSectorOrAgency =
    /\b(agency|department|ministry|authority|council|commission|public body|government|gov\.uk|crown|nhs|service)\b/.test(
      nameNoPunct
    ) ||
    /\b(agency|department|ministry|authority|council|commission|public body|government|gov\.uk|crown|nhs|service)\b/.test(
      contextLower
    );

  const procurementSignals =
    /\b(procurement|tender|framework|supplier portal|supplier|contracting)\b/.test(
      contextLower
    ) || input.hasCorporateSiteSignals;

  const defenceOrAerospace =
    hasDefenceOrAerospaceSic ||
    contextLower.includes("defence") ||
    contextLower.includes("defense") ||
    contextLower.includes("aerospace") ||
    contextLower.includes("ministry of defence") ||
    contextLower.includes("mod");

  const regulatedInfraOrUtility =
    hasEnergyOrUtilitySic ||
    contextLower.includes("nuclear") ||
    contextLower.includes("utility") ||
    contextLower.includes("utilities") ||
    contextLower.includes("infrastructure") ||
    contextLower.includes("rail") ||
    contextLower.includes("railway") ||
    contextLower.includes("airport") ||
    contextLower.includes("airline") ||
    contextLower.includes("highways") ||
    contextLower.includes("water");

  const corporateSiteSignals =
    input.hasCorporateSiteSignals ||
    contextLower.includes("investors") ||
    contextLower.includes("annual report") ||
    contextLower.includes("governance") ||
    contextLower.includes("global presence") ||
    contextLower.includes("our locations") ||
    contextLower.includes("supplier portal") ||
    contextLower.includes("procurement");

  const multinationalSignals =
    input.hasMultinationalSignals ||
    contextLower.includes("global") ||
    contextLower.includes("worldwide") ||
    contextLower.includes("international") ||
    contextLower.includes("multinational");

  let indicatorCount = 0;
  if (majorBrandMatch) indicatorCount += 1;
  if (plcLikeName || input.isClearlyCorporate || input.hasLinkedinCompanyPage) {
    indicatorCount += 1;
  }
  if (publicSectorOrAgency) indicatorCount += 1;
  if (procurementSignals) indicatorCount += 1;
  if (defenceOrAerospace) indicatorCount += 1;
  if (regulatedInfraOrUtility) indicatorCount += 1;
  if (corporateSiteSignals) indicatorCount += 1;
  if (multinationalSignals) indicatorCount += 1;

  return {
    major_brand_match: majorBrandMatch,
    plc_like_name: plcLikeName,
    public_sector_or_agency: publicSectorOrAgency,
    procurement_signals: procurementSignals,
    defence_or_aerospace: defenceOrAerospace,
    regulated_infrastructure_or_utility: regulatedInfraOrUtility,
    corporate_site_signals: corporateSiteSignals,
    multinational_signals: multinationalSignals,
    indicator_count: indicatorCount,
  };
}

function applyEnterpriseFallback(params: {
  strategy: EngagementStrategy;
  enterpriseIndicators: EnterpriseIndicators;
  isTechnicalSector: boolean;
  isDefenceOrAerospaceOrRegulated: boolean;
  hasDirectPhoneSignal: boolean;
}): EngagementStrategy {
  const {
    strategy,
    enterpriseIndicators,
    isTechnicalSector,
    isDefenceOrAerospaceOrRegulated,
    hasDirectPhoneSignal,
  } = params;

  const strongEnterpriseSignals =
    enterpriseIndicators.major_brand_match ||
    enterpriseIndicators.public_sector_or_agency ||
    enterpriseIndicators.procurement_signals ||
    enterpriseIndicators.indicator_count >= 2;

  const isEnterpriseTier =
    strategy.account_tier === "enterprise_complex" || strongEnterpriseSignals;

  if (!isEnterpriseTier) {
    return strategy;
  }

  const updated: EngagementStrategy = { ...strategy };

  updated.account_tier = "enterprise_complex";
  const isEnterpriseLikeForPersona =
    enterpriseIndicators.indicator_count >= 2 ||
    enterpriseIndicators.major_brand_match ||
    enterpriseIndicators.public_sector_or_agency ||
    enterpriseIndicators.procurement_signals;

  if (
    isEnterpriseLikeForPersona &&
    (updated.account_persona === "owner_led_practical_sme" ||
      updated.account_persona === "relationship_led_local_business")
  ) {
    if (
      enterpriseIndicators.defence_or_aerospace ||
      enterpriseIndicators.regulated_infrastructure_or_utility ||
      isTechnicalSector
    ) {
      updated.account_persona = "technical_engineering_led_business";
    } else {
      updated.account_persona = "formal_mid_market_business";
    }
  }

  updated.gatekeeper_risk_score = Math.max(
    clampScore(updated.gatekeeper_risk_score),
    80
  );
  updated.organisational_complexity_score = Math.max(
    clampScore(updated.organisational_complexity_score),
    85
  );
  updated.credibility_threshold_score = Math.max(
    clampScore(updated.credibility_threshold_score),
    75
  );

  const hasNamedContact = updated.named_contact_found === true;
  const hasDirectAccess = hasNamedContact && hasDirectPhoneSignal;

  updated.named_contact_required = !hasDirectAccess;

  updated.direct_cold_call_recommended = false;

  if (!hasDirectAccess && updated.recommended_access_strategy === "direct_call") {
    updated.recommended_first_channel = "research";
    updated.recommended_access_strategy = "named_contact_research_first";
    updated.fallback_channel =
      updated.channel_scores.email >= updated.channel_scores.linkedin
        ? "email"
        : "linkedin";
  }

  if (!updated.next_best_action || updated.next_best_action === "") {
    updated.next_best_action = "map_stakeholders_then_send_insight_led_email";
  }

  return updated;
}

function computeEngagementPreference(input: {
  strategy: EngagementStrategy;
  persona: AccountPersona;
  accountTier: AccountTier;
  enterpriseIndicators: EnterpriseIndicators;
  accessMeta: {
    gatekeeperRiskScore: number;
    organisationalComplexityScore: number;
    warmRoutePotentialScore: number;
    credibilityThresholdScore: number;
    namedContactRequired: boolean;
  };
  supportingScores: SupportingScores;
  isTechnicalSector: boolean;
  isDefenceOrAerospaceOrRegulated: boolean;
  hasWebsite: boolean;
  hasContactSignal: boolean;
  hasDirectPhoneSignal: boolean;
  hasLinkedinPresence: boolean;
  hasLinkedinNamedContact: boolean;
  isLocalRelationshipBusiness: boolean;
  evidenceStrength: number;
}): EngagementPreference {
  const {
    strategy,
    persona,
    accountTier,
    enterpriseIndicators,
    accessMeta,
    supportingScores,
    isTechnicalSector,
    isDefenceOrAerospaceOrRegulated,
    hasWebsite,
    hasContactSignal,
    hasDirectPhoneSignal,
    hasLinkedinPresence,
    hasLinkedinNamedContact,
    isLocalRelationshipBusiness,
    evidenceStrength,
  } = input;

  const enterpriseScaleScore =
    accountTier === "enterprise_complex" ||
    enterpriseIndicators.major_brand_match ||
    enterpriseIndicators.indicator_count >= 2
      ? 90
      : accountTier === "mid_market_structured"
      ? 65
      : 30;

  const gatekeeperRiskScore = clampScore(accessMeta.gatekeeperRiskScore);

  const ownerManagedScore =
    persona === "owner_led_practical_sme"
      ? 85
      : persona === "relationship_led_local_business"
      ? 75
      : 20;

  const directAccessScore =
    (hasLinkedinNamedContact ? 30 : 0) +
    (hasDirectPhoneSignal ? 35 : 0) +
    (hasContactSignal ? 10 : 0);

  const relationshipLedScore = supportingScores.relationship_score;

  const technicalRelevanceScore = isTechnicalSector
    ? 60
    : supportingScores.education_need_score;

  const likelyEmailReceptivenessScore =
    supportingScores.digital_maturity_score +
    (hasWebsite ? 10 : 0) +
    (hasLinkedinPresence ? 10 : 0);

  const likelyPhoneReceptivenessScore =
    (hasDirectPhoneSignal ? 40 : 0) +
    (ownerManagedScore > 70 ? 20 : 0) -
    (enterpriseScaleScore > 70 ? 20 : 0) -
    (gatekeeperRiskScore > 70 ? 30 : 0);

  const dataWeak = evidenceStrength < 0.35;

  const gatekeeperRiskBand: EngagementPreference["gatekeeperRisk"] =
    gatekeeperRiskScore >= 70
      ? "High"
      : gatekeeperRiskScore >= 40
      ? "Medium"
      : "Low";

  const isEnterpriseAccessMode =
    enterpriseIndicators.major_brand_match ||
    enterpriseIndicators.indicator_count >= 2 ||
    enterpriseIndicators.public_sector_or_agency ||
    enterpriseIndicators.procurement_signals ||
    isDefenceOrAerospaceOrRegulated ||
    (enterpriseScaleScore >= 75 && gatekeeperRiskScore >= 70);

  if (isEnterpriseAccessMode) {
    const businessUnitTargetingRequired =
      enterpriseScaleScore >= 75 ||
      enterpriseIndicators.major_brand_match ||
      enterpriseIndicators.indicator_count >= 2;

    let recommendationStatus: EngagementPreference["recommendationStatus"];
    if (evidenceStrength < 0.35) {
      recommendationStatus = "exploratory";
    } else if (evidenceStrength < 0.7) {
      recommendationStatus = "limited signal but strategically directional";
    } else {
      recommendationStatus = "clear";
    }

    let primaryAccessModel = "Stakeholder-mapped account-based outreach";
    if (accessMeta.namedContactRequired && hasLinkedinNamedContact) {
      primaryAccessModel = "Named-contact-first outreach";
    } else if (
      accessMeta.warmRoutePotentialScore >= 60 &&
      (hasLinkedinPresence || hasContactSignal)
    ) {
      primaryAccessModel = "Authority-led introduction path";
    } else if (businessUnitTargetingRequired) {
      primaryAccessModel = "Business-unit-specific relevance sequence";
    }

    const namedContactRequired = true;

    let phoneUseRule = "Routing only until named stakeholder identified";
    if (!hasDirectPhoneSignal) {
      phoneUseRule =
        "Avoid as first touch; use only to support routing once a stakeholder path exists.";
    } else if (gatekeeperRiskScore >= 80) {
      phoneUseRule =
        "Routing only; do not use phone for blind pitching or generic discovery.";
    }

    let likelyStakeholderClass =
      "Finance, tax, or commercial sponsorship tied to the relevant technical or innovation activity.";
    if (isDefenceOrAerospaceOrRegulated || isTechnicalSector) {
      likelyStakeholderClass =
        "Engineering, programme, innovation, or finance/tax ownership linked to the relevant business area.";
    }

    const recommendedPersonaText =
      "Finance, tax, engineering, or innovation leadership within the relevant business unit.";
    const tone =
      "Strategic, credibility-first guidance on how to reach the right stakeholders in a complex, gatekept organisation.";

    const rationale: string[] = [];
    const suggestedSequence: string[] = [];
    const whatNotToDo: string[] = [];

    if (recommendationStatus === "exploratory") {
      rationale.push(
        "Signals confirm a complex, gatekept organisation but available data is limited, so the recommendation focuses on direction rather than a hard prescription.",
        "Treat early work as discovery of the right business unit and stakeholders, not as a pure outbound volume play.",
        "Channel availability (email, phone, LinkedIn) is less important than mapping who actually owns R&D, innovation, or tax in the relevant area."
      );
      suggestedSequence.push(
        "Identify the most relevant business unit or programme for R&D or innovation (e.g. defence platform, engineering division, or specific programme).",
        "Map likely stakeholders across engineering, programme leadership, and finance/tax within that unit.",
        "Craft a short, authority-led note that anchors on relevance to that business unit, not generic R&D tax language.",
        "Use email or LinkedIn only once a named stakeholder path is clear; use phone solely to verify routing, not to deliver a blind pitch."
      );
    } else {
      rationale.push(
        "Signals indicate an enterprise or heavily structured organisation with high gatekeeper risk and layered decision-making.",
        "Generic switchboard outreach or untargeted email blasts are unlikely to reach the right stakeholder or be taken seriously.",
        "A stakeholder-mapped, account-based approach that focuses on the right business unit and named contacts is more credible and commercially realistic."
      );
      suggestedSequence.push(
        "Identify the business unit or programme most aligned to the R&D or innovation context you care about.",
        "Map 3–5 likely stakeholders across engineering/programme leadership and finance/tax within that unit.",
        "Use internal networks, LinkedIn, and existing clients/partners to validate and prioritise named contacts.",
        "Send a concise, insight-led email to a chosen stakeholder that anchors on sector- and business-unit relevance.",
        "Follow up selectively with email or LinkedIn, and only use phone to route to a named person, not to deliver a generic pitch."
      );
    }

    whatNotToDo.push(
      "Do not call the main switchboard and pitch blindly.",
      "Do not ask generic questions like 'who handles R&D tax?' or 'who is responsible for innovation claims?'.",
      "Do not assume the first responder is the correct stakeholder or decision maker.",
      "Do not use a generic SDR script; tailor language to the business unit, programmes, and technical context.",
      "Do not treat channel availability as proof that a channel is strategically appropriate."
    );

    return {
      mode: "enterprise",
      primaryRoute: undefined,
      secondaryRoute: null,
      recommendedPersona: recommendedPersonaText,
      tone,
      gatekeeperRisk: gatekeeperRiskBand,
      directColdCallRecommended: false,
      confidence: evidenceStrength,
      rationale,
      suggestedSequence,
      whatNotToDo,
      primaryAccessModel,
      deliveryChannelGuidance:
        "Use email or LinkedIn only after relevance is anchored to a named stakeholder or business unit. Use phone strictly for routing or to support agreed follow-up, not as a blind first-touch pitch.",
      recommendationStatus,
      businessUnitTargetingRequired,
      namedContactRequired,
      phoneUseRule,
      likelyStakeholderClass,
    };
  }

  // STANDARD MODE (SME / MID-MARKET) – channel-first, but still context-aware

  const isRelationshipLed =
    relationshipLedScore >= 65 || isLocalRelationshipBusiness;

  const hasStrongDirectAccess = directAccessScore >= 55 && gatekeeperRiskScore < 70;

  let primaryRoute = "Email first";
  let secondaryRoute: string | null = null;
  let recommendedPersona =
    "Finance, tax, engineering, or innovation stakeholder best aligned to R&D activity";
  const tone =
    "Credibility-first, low-pressure, insight-led and relevant to the prospect's context";
  let directColdCallRecommended = false;
  const rationale: string[] = [];
  const suggestedSequence: string[] = [];
  const whatNotToDo: string[] = [];

  if (dataWeak) {
    primaryRoute = "Email first";
    secondaryRoute = hasLinkedinPresence ? "LinkedIn-assisted outreach" : null;
    directColdCallRecommended = false;

    rationale.push(
      "Available signals are limited, so the recommendation is exploratory and focuses on low-friction channels.",
      "Email allows you to test relevance and interest without overcommitting to a hard call.",
      "LinkedIn can be used to validate stakeholders and add light-touch familiarity if profiles exist."
    );

    suggestedSequence.push(
      "Identify a likely stakeholder in finance, tax, engineering, or innovation.",
      "Send a concise, authority-led email that anchors on relevance to their sector and R&D profile.",
      "Lightly follow up via email or LinkedIn rather than phone until a named contact engages."
    );

    whatNotToDo.push(
      "Do not bombard with calls without prior email context.",
      "Do not oversell the complexity or size of the opportunity on first touch.",
      "Do not assume the first response as the final decision; expect some internal routing."
    );

    return {
      mode: "standard",
      primaryRoute,
      secondaryRoute,
      recommendedPersona,
      tone,
      gatekeeperRisk: gatekeeperRiskBand,
      directColdCallRecommended,
      confidence: evidenceStrength,
      rationale,
      suggestedSequence,
      whatNotToDo,
    };
  }

  if (ownerManagedScore >= 70) {
    if (hasStrongDirectAccess && likelyPhoneReceptivenessScore > 30) {
      primaryRoute = "Email first";
      secondaryRoute = "Switchboard or direct call as follow-up";
      directColdCallRecommended = true;

      recommendedPersona =
        "Owner, Managing Director, or a senior operational/finance decision maker";

      rationale.push(
        "Signals point to an owner-managed or relationship-led organisation with relatively low formal gatekeeping.",
        "A direct but respectful email to the MD/owner, followed by a considered call, is likely to be acceptable.",
        "Phone can work here, but only after you have anchored relevance and avoided a generic sales pitch."
      );

      suggestedSequence.push(
        "Send a concise, practical email to the MD/owner focusing on R&D relevance and outcomes.",
        "If no response, follow up with a short, respectful call to the same person or direct line.",
        "Use the call to confirm fit and interest, not to deliver a full technical explanation.",
        "Agree a short follow-up meeting or call if there is clear interest."
      );

      whatNotToDo.push(
        "Do not bombard with calls without email context.",
        "Do not oversell the complexity or size of the opportunity on first touch.",
        "Do not rely solely on generic web forms as the main route into the organisation."
      );
    } else {
      primaryRoute = "Email first";
      secondaryRoute = isRelationshipLed
        ? "Face-to-face / meeting request"
        : hasLinkedinPresence
        ? "LinkedIn-assisted outreach"
        : null;
      directColdCallRecommended = false;

      recommendedPersona =
        "Owner, Managing Director, or senior operational/finance decision maker";

      rationale.push(
        "Owner-managed signals are present, but direct access or phone receptiveness is not strong enough to justify a cold call first.",
        "A well-structured email allows the owner to absorb the proposition on their terms.",
        "If relationship signals are strong, moving towards a meeting request after email makes sense."
      );

      suggestedSequence.push(
        "Send a clear, practical email to the MD/owner focusing on R&D relevance and time-efficiency.",
        "If there is positive engagement, suggest a short exploratory meeting or call.",
        "Optionally use LinkedIn or a mutual contact to warm up the outreach."
      );

      whatNotToDo.push(
        "Do not rely solely on generic web forms as the main route into the organisation.",
        "Do not treat the first response as the final decision; expect some internal routing.",
        "Do not open with aggressive or volume-driven sales language."
      );
    }

    return {
      mode: "standard",
      primaryRoute,
      secondaryRoute,
      recommendedPersona,
      tone,
      gatekeeperRisk: gatekeeperRiskBand,
      directColdCallRecommended,
      confidence: evidenceStrength,
      rationale,
      suggestedSequence,
      whatNotToDo,
    };
  }

  const isMidMarket =
    accountTier === "mid_market_structured" ||
    (enterpriseScaleScore >= 50 && enterpriseScaleScore < 75);

  if (isMidMarket) {
    primaryRoute = hasLinkedinNamedContact
      ? "Direct named email outreach"
      : "Email first";
    secondaryRoute = hasLinkedinPresence
      ? "LinkedIn-assisted outreach"
      : "Warm intro / referral route";
    directColdCallRecommended = false;

    recommendedPersona =
      "Finance, tax, engineering, or innovation stakeholder best aligned to R&D activity";

    rationale.push(
      "Signals do not strongly favour phone or events, so email and light-touch LinkedIn are the safest initial channels.",
      "Using named contacts where possible is more effective than generic or form-based approaches."
    );

    suggestedSequence.push(
      "Research and identify a likely stakeholder in finance, tax, engineering, or innovation.",
      "Send a concise, relevant email that frames R&D tax as an enabler rather than a compliance burden.",
      "Use LinkedIn or mutual contacts to add light familiarity if profiles are available.",
      "Follow up once or twice with additional relevance or proof points, rather than escalating to repeated calls."
    );

    whatNotToDo.push(
      "Do not rely solely on generic web forms as the main route into the organisation.",
      "Do not treat the first response as the final decision; expect some internal routing.",
      "Do not open with aggressive or volume-driven sales language."
    );

    return {
      mode: "standard",
      primaryRoute,
      secondaryRoute,
      recommendedPersona,
      tone,
      gatekeeperRisk: gatekeeperRiskBand,
      directColdCallRecommended,
      confidence: evidenceStrength,
      rationale,
      suggestedSequence,
      whatNotToDo,
    };
  }

  primaryRoute = "Email first";
  secondaryRoute = hasLinkedinPresence
    ? "LinkedIn-assisted outreach"
    : "Warm intro / referral route";
  directColdCallRecommended = false;

  recommendedPersona =
    "Finance, tax, engineering, or innovation stakeholder best aligned to R&D activity";

  rationale.push(
    "Signals do not strongly favour phone or events, so email and light-touch LinkedIn are the safest initial channels.",
    "Using named contacts where possible is more effective than generic or form-based approaches."
  );

  suggestedSequence.push(
    "Research and identify a likely stakeholder in finance, tax, engineering, or innovation.",
    "Send a concise, relevant email that frames R&D tax as an enabler rather than a compliance burden.",
    "Use LinkedIn or mutual contacts to add light familiarity if profiles are available.",
    "Follow up once or twice with additional relevance or proof points, rather than escalating to repeated calls."
  );

  whatNotToDo.push(
    "Do not rely solely on generic web forms as the main route into the organisation.",
    "Do not treat the first response as the final decision; expect some internal routing.",
    "Do not open with aggressive or volume-driven sales language."
  );

  return {
    mode: "standard",
    primaryRoute,
    secondaryRoute,
    recommendedPersona,
    tone,
    gatekeeperRisk: gatekeeperRiskBand,
    directColdCallRecommended,
    confidence: evidenceStrength,
    rationale,
    suggestedSequence,
    whatNotToDo,
  };
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
      console.error("SDR engagement-strategy: prospect fetch failed", {
        prospectId,
        error: prospectError,
      });
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
      hasCorporateSiteSignals,
      hasMultinationalSignals,
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

    const enterpriseIndicators = detectEnterpriseIndicators({
      companyName,
      sicCodes,
      webContext: rawContext,
      hasLinkedinCompanyPage,
      isClearlyCorporate,
      hasCorporateSiteSignals,
      hasMultinationalSignals,
    });

    let persona = derivePersona({
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

    let accountTier = computeAccountTier({
      persona,
      isClearlyCorporate,
      numberOfDirectors,
      companyAgeYears,
      isTechnicalSector,
      hasLinkedinCompanyPage,
    });

    if (enterpriseIndicators.public_sector_or_agency) {
      accountTier = "enterprise_complex";
    }

    const isEnterpriseLikeForPersona =
      enterpriseIndicators.indicator_count >= 2 ||
      enterpriseIndicators.major_brand_match;

    if (
      isEnterpriseLikeForPersona &&
      (persona === "owner_led_practical_sme" ||
        persona === "relationship_led_local_business")
    ) {
      if (
        enterpriseIndicators.defence_or_aerospace ||
        enterpriseIndicators.regulated_infrastructure_or_utility ||
        isTechnicalSector
      ) {
        persona = "technical_engineering_led_business";
      } else {
        persona = "formal_mid_market_business";
      }
    }

    const isDefenceOrAerospaceOrRegulated =
      enterpriseIndicators.defence_or_aerospace ||
      enterpriseIndicators.regulated_infrastructure_or_utility;

    const accessMeta = computeAccessMeta({
      accountTier,
      hasDirectPhoneSignal,
      hasContactSignal,
      isLocalRelationshipBusiness:
        Boolean(chAddressLocality) || isLocalRelationshipBusiness,
      hasLinkedinPresence,
      hasLinkedinCompanyPage,
      isClearlyEnterpriseBrand:
        enterpriseIndicators.indicator_count >= 2 ||
        enterpriseIndicators.major_brand_match,
      isDefenceOrAerospaceOrRegulated,
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
      isClearlyEnterpriseBrand:
        enterpriseIndicators.indicator_count >= 2 ||
        enterpriseIndicators.major_brand_match,
      isDefenceOrAerospaceOrRegulated,
      gatekeeperRiskScore: accessMeta.gatekeeperRiskScore,
    });

    const { primary, secondary, accessStrategy } = pickChannels(
      channelScores,
      accountTier,
      hasLinkedinNamedContact,
      accessMeta.gatekeeperRiskScore,
      hasDirectPhoneSignal,
      isEnterpriseLikeForPersona
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

    const directColdCallRecommendedBase =
      accountTier === "direct_access" &&
      hasDirectPhoneSignal &&
      !hasLinkedinNamedContact &&
      enterpriseIndicators.indicator_count < 2 &&
      !enterpriseIndicators.major_brand_match;

    let skeleton: EngagementStrategy = {
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
      direct_cold_call_recommended: directColdCallRecommendedBase,
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
          enterpriseIndicators,
          directColdCallRecommended: directColdCallRecommendedBase,
          linkedinSignalSummary,
        },
        skeleton,
      });
    }

    skeleton = {
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

    const strategyWithEnterprise = applyEnterpriseFallback({
      strategy: skeleton,
      enterpriseIndicators,
      isTechnicalSector,
      isDefenceOrAerospaceOrRegulated,
      hasDirectPhoneSignal,
    });

    const engagementPreference = computeEngagementPreference({
      strategy: strategyWithEnterprise,
      persona,
      accountTier,
      enterpriseIndicators,
      accessMeta,
      supportingScores,
      isTechnicalSector,
      isDefenceOrAerospaceOrRegulated,
      hasWebsite: hasWebsite || Boolean(prospectRecord.website),
      hasContactSignal,
      hasDirectPhoneSignal,
      hasLinkedinPresence,
      hasLinkedinNamedContact,
      isLocalRelationshipBusiness:
        Boolean(chAddressLocality) || isLocalRelationshipBusiness,
      evidenceStrength,
    });

    const strategy = {
      ...strategyWithEnterprise,
      engagement_preference: engagementPreference,
    };

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .update({
        engagement_strategy_json: strategy as unknown,
        engagement_recommended_first_touch: normaliseChannelForDb(
          strategy.recommended_first_channel
        ),
        engagement_fallback_touch: normaliseChannelForDb(
          strategy.fallback_channel
        ),
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
        engagement_generated_from_version:
          "v2-access-strategy-enterprise-guardrails-engagement-pref",
        engagement_ai_generation_status: "success",
        updated_at: nowIso,
      })
      .eq("id", prospectId)
      .select("*")
      .maybeSingle();

    if (updateError || !updated) {
      console.error("SDR engagement-strategy: failed to save strategy", {
        prospectId,
        error: updateError,
      });
      res
        .status(500)
        .json({
          message: "Failed to save engagement strategy",
          error: updateError,
        });
      return;
    }

    res.status(200).json({ strategy, prospect: updated });
  } catch (error) {
    console.error("SDR engagement-strategy: unhandled error", error);
    res.status(500).json({
      message: "Failed to generate engagement strategy",
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
    });
  }
}

// Helper functions

async function getCompaniesHouseSnapshot(
  _req: NextApiRequest,
  companyNumber: string | null
): Promise<{ snapshot: any | null; filingConfidenceScore: number }> {
  if (!companyNumber) {
    return { snapshot: null, filingConfidenceScore: 0 };
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return { snapshot: null, filingConfidenceScore: 0 };
  }

  const auth = Buffer.from(`${apiKey}:`).toString("base64");

  try {
    const companyResponse = await fetch(
      `https://api.company-information.service.gov.uk/company/${companyNumber}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    if (!companyResponse.ok) {
      return { snapshot: null, filingConfidenceScore: 0 };
    }

    const companyData: any = await companyResponse.json();

    const dateOfCreation = companyData.date_of_creation
      ? new Date(companyData.date_of_creation)
      : null;
    const companyAgeYears =
      dateOfCreation != null
        ? Math.floor(
            (Date.now() - dateOfCreation.getTime()) /
              (1000 * 60 * 60 * 24 * 365.25)
          )
        : null;

    let activeDirectorCount: number | null = null;

    try {
      const officersResponse = await fetch(
        `https://api.company-information.service.gov.uk/company/${companyNumber}/officers`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (officersResponse.ok) {
        const officersData: any = await officersResponse.json();
        const activeOfficers = (officersData.items || []).filter(
          (officer: any) => !officer.resigned_on
        );
        activeDirectorCount = activeOfficers.length;
      }
    } catch {
      activeDirectorCount = null;
    }

    const snapshot = {
      sic_codes: companyData.sic_codes || [],
      company_age_years: companyAgeYears,
      officers: {
        active_count: activeDirectorCount,
      },
      registered_address: {
        locality:
          companyData.registered_office_address?.locality || null,
      },
    };

    let filingConfidenceScore = 0;
    if (companyAgeYears != null) filingConfidenceScore += 0.3;
    if ((snapshot.sic_codes as string[]).length > 0) filingConfidenceScore += 0.3;
    if (activeDirectorCount != null && activeDirectorCount > 0) {
      filingConfidenceScore += 0.4;
    }
    if (filingConfidenceScore > 1) filingConfidenceScore = 1;

    return { snapshot, filingConfidenceScore };
  } catch {
    return { snapshot: null, filingConfidenceScore: 0 };
  }
}

async function getWebSignals(
  _companyName: string
): Promise<{
  hasWebsite: boolean;
  hasContactSignal: boolean;
  hasDirectPhoneSignal: boolean;
  isClearlyCorporate: boolean;
  isLocalRelationshipBusiness: boolean;
  hasLinkedinPresence: boolean;
  hasLinkedinCompanyPage: boolean;
  hasLinkedinNamedContact: boolean;
  hasCorporateSiteSignals: boolean;
  hasMultinationalSignals: boolean;
  linkedinSignalSummary: string;
  rawContext: string;
}> {
  return {
    hasWebsite: false,
    hasContactSignal: false,
    hasDirectPhoneSignal: false,
    isClearlyCorporate: false,
    isLocalRelationshipBusiness: false,
    hasLinkedinPresence: false,
    hasLinkedinCompanyPage: false,
    hasLinkedinNamedContact: false,
    hasCorporateSiteSignals: false,
    hasMultinationalSignals: false,
    linkedinSignalSummary: "",
    rawContext: "",
  };
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
  const hasMultipleSic = (sicCodes ?? []).length > 1;

  if (
    isLocalRelationshipBusiness &&
    directors <= 3 &&
    !isClearlyCorporate &&
    age < 30
  ) {
    return "relationship_led_local_business";
  }

  if (
    !isClearlyCorporate &&
    directors <= 3 &&
    age < 25 &&
    !hasMultipleSic
  ) {
    return "owner_led_practical_sme";
  }

  if (isTechnicalSector) {
    return "technical_engineering_led_business";
  }

  if (isClearlyCorporate || directors >= 5 || hasMultipleSic || hasWebsite) {
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
  filingConfidenceScore: number;
}): SupportingScores {
  const {
    hasWebsite,
    hasContactSignal,
    hasDirectPhoneSignal,
    hasLinkedinPresence,
    hasLinkedinCompanyPage,
    companyAgeYears,
    numberOfDirectors,
    isTechnicalSector,
    isLocalRelationshipBusiness,
    filingConfidenceScore,
  } = input;

  let digitalMaturity = 20;
  if (hasWebsite) digitalMaturity += 30;
  if (hasLinkedinPresence) digitalMaturity += 20;
  if (hasLinkedinCompanyPage) digitalMaturity += 20;
  if (digitalMaturity > 100) digitalMaturity = 100;

  let relationshipScore = 40;
  if (isLocalRelationshipBusiness) relationshipScore += 25;
  if (numberOfDirectors != null && numberOfDirectors <= 3) {
    relationshipScore += 10;
  }
  if (relationshipScore > 100) relationshipScore = 100;

  let localVisitScore = isLocalRelationshipBusiness ? 70 : 20;
  if (!hasWebsite && isLocalRelationshipBusiness) {
    localVisitScore += 10;
  }
  if (localVisitScore > 100) localVisitScore = 100;

  let decisionMakerAccess = 30;
  if (hasDirectPhoneSignal) decisionMakerAccess += 30;
  if (hasContactSignal) decisionMakerAccess += 20;
  if (
    numberOfDirectors != null &&
    numberOfDirectors <= 3 &&
    !hasLinkedinCompanyPage
  ) {
    decisionMakerAccess += 20;
  }
  if (decisionMakerAccess > 100) decisionMakerAccess = 100;

  let educationNeed = isTechnicalSector ? 40 : 60;
  if (companyAgeYears != null && companyAgeYears < 5) {
    educationNeed += 10;
  }
  if (educationNeed > 100) educationNeed = 100;

  let commercialValue = 40;
  if (companyAgeYears != null && companyAgeYears >= 5) {
    commercialValue += 20;
  }
  if (isTechnicalSector) commercialValue += 20;
  if (numberOfDirectors != null && numberOfDirectors >= 5) {
    commercialValue += 10;
  }
  if (commercialValue > 100) commercialValue = 100;

  let urgency = 20;
  if (filingConfidenceScore > 0.5) urgency += 20;
  if (companyAgeYears != null && companyAgeYears < 10) {
    urgency += 10;
  }
  if (urgency > 100) urgency = 100;

  return {
    digital_maturity_score: clampScore(digitalMaturity),
    relationship_score: clampScore(relationshipScore),
    local_visit_score: clampScore(localVisitScore),
    decision_maker_access_score: clampScore(decisionMakerAccess),
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
  const {
    persona,
    isClearlyCorporate,
    numberOfDirectors,
    companyAgeYears,
    isTechnicalSector,
    hasLinkedinCompanyPage,
  } = input;

  const directors = numberOfDirectors ?? 0;
  const age = companyAgeYears ?? 0;

  if (
    isClearlyCorporate &&
    (directors >= 20 || age >= 20 || hasLinkedinCompanyPage)
  ) {
    return "enterprise_complex";
  }

  if (
    isClearlyCorporate ||
    directors >= 10 ||
    (age >= 10 && (isTechnicalSector || hasLinkedinCompanyPage))
  ) {
    return "mid_market_structured";
  }

  if (
    persona === "owner_led_practical_sme" ||
    persona === "relationship_led_local_business"
  ) {
    return "direct_access";
  }

  return "mid_market_structured";
}

function computeAccessMeta(input: {
  accountTier: AccountTier;
  hasDirectPhoneSignal: boolean;
  hasContactSignal: boolean;
  isLocalRelationshipBusiness: boolean;
  hasLinkedinPresence: boolean;
  hasLinkedinCompanyPage: boolean;
  isClearlyEnterpriseBrand: boolean;
  isDefenceOrAerospaceOrRegulated: boolean;
}): {
  gatekeeperRiskScore: number;
  organisationalComplexityScore: number;
  warmRoutePotentialScore: number;
  credibilityThresholdScore: number;
  namedContactRequired: boolean;
} {
  const {
    accountTier,
    hasDirectPhoneSignal,
    hasContactSignal,
    isLocalRelationshipBusiness,
    hasLinkedinPresence,
    hasLinkedinCompanyPage,
    isClearlyEnterpriseBrand,
    isDefenceOrAerospaceOrRegulated,
  } = input;

  let gatekeeper = 20;
  let complexity = 20;
  let credibility = 30;

  if (accountTier === "enterprise_complex" || isClearlyEnterpriseBrand) {
    gatekeeper = 80;
    complexity = 85;
    credibility = 75;
  } else if (accountTier === "mid_market_structured") {
    gatekeeper = 55;
    complexity = 60;
    credibility = 55;
  }

  if (isDefenceOrAerospaceOrRegulated) {
    gatekeeper += 10;
    complexity += 10;
    credibility += 10;
  }

  if (gatekeeper > 100) gatekeeper = 100;
  if (complexity > 100) complexity = 100;
  if (credibility > 100) credibility = 100;

  let warmRoute = 30;
  if (isLocalRelationshipBusiness) warmRoute += 25;
  if (hasLinkedinPresence || hasLinkedinCompanyPage) {
    warmRoute += 20;
  }
  if (warmRoute > 100) warmRoute = 100;

  const namedContactRequired =
    accountTier !== "direct_access" ||
    isClearlyEnterpriseBrand ||
    gatekeeper >= 60;

  return {
    gatekeeperRiskScore: clampScore(gatekeeper),
    organisationalComplexityScore: clampScore(complexity),
    warmRoutePotentialScore: clampScore(warmRoute),
    credibilityThresholdScore: clampScore(credibility),
    namedContactRequired,
  };
}

function computeChannelScores(
  persona: AccountPersona,
  supportingScores: SupportingScores,
  ctx: {
    hasDirectPhoneSignal: boolean;
    hasWebsite: boolean;
    isLocalRelationshipBusiness: boolean;
    hasLinkedinPresence: boolean;
    hasLinkedinCompanyPage: boolean;
    accountTier: AccountTier;
    namedContactFound: boolean;
    isClearlyEnterpriseBrand: boolean;
    isDefenceOrAerospaceOrRegulated: boolean;
    gatekeeperRiskScore: number;
  }
): ChannelScores {
  const {
    hasDirectPhoneSignal,
    hasWebsite,
    isLocalRelationshipBusiness,
    hasLinkedinPresence,
    hasLinkedinCompanyPage,
    accountTier,
    namedContactFound,
    isClearlyEnterpriseBrand,
    isDefenceOrAerospaceOrRegulated,
    gatekeeperRiskScore,
  } = ctx;

  let email = 50 + supportingScores.digital_maturity_score / 2;
  let linkedin = hasLinkedinPresence ? 50 : 30;
  if (hasLinkedinCompanyPage) linkedin += 10;

  let research = 40;
  if (accountTier !== "direct_access" || isClearlyEnterpriseBrand) {
    research += 30;
  }
  if (isDefenceOrAerospaceOrRegulated) {
    research += 20;
  }

  let call = 20;
  if (
    accountTier === "direct_access" &&
    hasDirectPhoneSignal &&
    gatekeeperRiskScore < 50 &&
    !isClearlyEnterpriseBrand
  ) {
    call = 60 + supportingScores.relationship_score / 3;
  }

  let faceToFace = 20;
  if (isLocalRelationshipBusiness) {
    faceToFace = 50 + supportingScores.relationship_score / 4;
  }

  if (namedContactFound && hasLinkedinPresence) {
    linkedin += 10;
    email += 10;
  }

  return {
    email: clampScore(email),
    call: clampScore(call),
    face_to_face: clampScore(faceToFace),
    linkedin: clampScore(linkedin),
    research: clampScore(research),
  };
}

function pickChannels(
  scores: ChannelScores,
  accountTier: AccountTier,
  namedContactFound: boolean,
  gatekeeperRiskScore: number,
  hasDirectPhoneSignal: boolean,
  isEnterpriseLike: boolean
): { primary: Channel; secondary: Channel; accessStrategy: AccessStrategy } {
  const enterpriseLike =
    accountTier === "enterprise_complex" || isEnterpriseLike;
  const highlyGatekept = gatekeeperRiskScore >= 70;

  if (enterpriseLike || highlyGatekept) {
    const primary: Channel = "research";
    const secondary: Channel =
      scores.email >= scores.linkedin ? "email" : "linkedin";
    const accessStrategy: AccessStrategy = namedContactFound
      ? "linkedin_plus_email"
      : "named_contact_research_first";
    return { primary, secondary, accessStrategy };
  }

  if (accountTier === "mid_market_structured") {
    if (namedContactFound) {
      const primary: Channel =
        scores.email >= scores.linkedin ? "email" : "linkedin";
      const secondary: Channel =
        primary === "email" ? "linkedin" : "email";
      const accessStrategy: AccessStrategy = "direct_email_to_decision_maker";
      return { primary, secondary, accessStrategy };
    }

    const primary: Channel = "email";
    const secondary: Channel = hasDirectPhoneSignal ? "call" : "linkedin";
    const accessStrategy: AccessStrategy = "insight_led_email";
    return { primary, secondary, accessStrategy };
  }

  if (accountTier === "direct_access") {
    if (
      hasDirectPhoneSignal &&
      gatekeeperRiskScore < 50 &&
      scores.call >= scores.email
    ) {
      const primary: Channel = "call";
      const secondary: Channel = "email";
      const accessStrategy: AccessStrategy = "direct_call";
      return { primary, secondary, accessStrategy };
    }

    const primary: Channel = "email";
    const secondary: Channel = hasDirectPhoneSignal ? "call" : "linkedin";
    const accessStrategy: AccessStrategy = "insight_led_email";
    return { primary, secondary, accessStrategy };
  }

  const primary: Channel = "email";
  const secondary: Channel = "linkedin";
  const accessStrategy: AccessStrategy = "nurture_before_outreach";
  return { primary, secondary, accessStrategy };
}

function computeConfidence(evidenceStrength: number): ConfidenceLevel {
  if (evidenceStrength >= 0.75) return "high";
  if (evidenceStrength >= 0.5) return "medium";
  return "low";
}

async function getTextualFields(
  _openaiApiKey: string,
  params: { enriched: any; skeleton: EngagementStrategy }
): Promise<TextualStrategyFields> {
  const { enriched, skeleton } = params;
  const {
    companyName,
    companyNumber,
    chSnapshot,
    webContext,
    persona,
    accountTier,
    supportingScores,
    channelScores,
    recommendedAccessStrategy,
    recommendedFirstChannel,
    fallbackChannel,
    confidence,
    hasLinkedinPresence,
    hasLinkedinCompanyPage,
    hasLinkedinNamedContact,
    gatekeeperRiskScore,
    organisationalComplexityScore,
    warmRoutePotentialScore,
    credibilityThresholdScore,
    namedContactRequired,
    enterpriseIndicators,
    directColdCallRecommended,
    linkedinSignalSummary,
  } = enriched;

  const reasonCodes: string[] = [];
  const evidenceSummary: string[] = [];

  if (enterpriseIndicators.indicator_count >= 2) {
    reasonCodes.push("enterprise_scale");
  }
  if (enterpriseIndicators.defence_or_aerospace) {
    reasonCodes.push("defence_or_aerospace");
  }
  if (enterpriseIndicators.regulated_infrastructure_or_utility) {
    reasonCodes.push("regulated_infrastructure_or_utility");
  }
  if (hasLinkedinPresence || hasLinkedinCompanyPage) {
    reasonCodes.push("digital_presence");
  }
  if (directColdCallRecommended) {
    reasonCodes.push("direct_access_call_possible");
  }

  const personaForSummary =
    skeleton.account_persona ?? (persona as string | null);

  evidenceSummary.push(
    `Persona: ${String(personaForSummary ?? "").replace(
      /_/g,
      " "
    )}, tier: ${String(accountTier).replace(/_/g, " ")}.`
  );
  evidenceSummary.push(
    `Email score: ${channelScores.email}, call score: ${channelScores.call}, LinkedIn score: ${channelScores.linkedin}, research score: ${channelScores.research}.`
  );
  evidenceSummary.push(
    `Gatekeeper risk: ${gatekeeperRiskScore}, organisational complexity: ${organisationalComplexityScore}, credibility threshold: ${credibilityThresholdScore}.`
  );
  evidenceSummary.push(`Overall confidence: ${confidence}.`);

  const isEnterpriseLike =
    accountTier === "enterprise_complex" ||
    enterpriseIndicators.indicator_count >= 2;

  let routeRationale =
    "This route balances credibility, relevance, and practical access to the right stakeholder.";
  if (isEnterpriseLike) {
    routeRationale =
      "This route treats the organisation as a complex, gatekept enterprise and focuses on named stakeholders rather than generic switchboard outreach.";
  }

  let stakeholderHypothesis = skeleton.stakeholder_hypothesis;
  if (!stakeholderHypothesis || stakeholderHypothesis.trim() === "") {
    if (isEnterpriseLike) {
      stakeholderHypothesis =
        "Divisional finance, tax, engineering programme, innovation or technical leadership (e.g. engineering director, head of tax, R&D programme manager, divisional FD).";
    } else {
      stakeholderHypothesis =
        "Owner, managing director, or a senior finance/operations/technical decision maker.";
    }
  }

  let suggestedSubjectLine =
    skeleton.suggested_subject_line ||
    "Exploring R&D and innovation opportunities in your organisation";
  if (isEnterpriseLike) {
    suggestedSubjectLine = `R&D, innovation and value for ${companyName}`;
  }

  let suggestedFirstEmail = skeleton.suggested_first_email;
  if (!suggestedFirstEmail || suggestedFirstEmail.trim() === "") {
    suggestedFirstEmail =
      "Hi,\n\nWe work with organisations in your sector to make sure their R&D and innovation activity is properly recognised and supported. Based on public information, it looks like there may be relevant programmes or engineering work within your group.\n\nIf appropriate, I would welcome a short conversation with the right person in finance, tax, engineering or innovation to sense-check fit and see whether a more detailed discussion would be worthwhile.\n\nBest regards,\n";
  }

  let suggestedCallPurpose = skeleton.suggested_call_purpose;
  if (!suggestedCallPurpose || suggestedCallPurpose.trim() === "") {
    suggestedCallPurpose = isEnterpriseLike
      ? "Confirm who owns R&D / innovation / tax within the relevant division and agree a short, focused call to explore fit."
      : "Confirm fit, answer initial questions, and agree a short follow-up conversation if there is interest.";
  }

  let nextBestAction = skeleton.next_best_action;
  if (!nextBestAction || nextBestAction.trim() === "") {
    if (isEnterpriseLike) {
      nextBestAction = "map_stakeholders_then_send_insight_led_email";
    } else {
      nextBestAction = "send_practical_email_then_follow_up_call_if_warm";
    }
  }

  return {
    reason_codes: reasonCodes,
    evidence_summary: evidenceSummary,
    route_rationale: routeRationale,
    stakeholder_hypothesis: stakeholderHypothesis,
    suggested_subject_line: suggestedSubjectLine,
    suggested_first_email: suggestedFirstEmail,
    suggested_call_purpose: suggestedCallPurpose,
    next_best_action: nextBestAction,
  };
}