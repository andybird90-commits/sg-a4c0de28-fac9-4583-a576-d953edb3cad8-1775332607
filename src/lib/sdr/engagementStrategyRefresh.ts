import type { NextApiRequest } from "next";

export type EngagementStrategyRunMode = "refresh" | "full_live";

export interface CompaniesHouseEnrichment {
  company_profile: Record<string, unknown> | null;
  sic_codes: string[];
  incorporation_date: string | null;
  company_status: string | null;
  officers: {
    active_count: number | null;
    items: Array<Record<string, unknown>>;
  };
  filing_history: {
    total_count: number | null;
    items: Array<Record<string, unknown>>;
  };
}

export interface BraveWebEvidenceItem {
  title: string;
  url: string;
  snippet: string;
  evidence_tags: string[];
}

export interface BraveWebEnrichment {
  queries: string[];
  items: BraveWebEvidenceItem[];
}

export interface InternalContextPack {
  dossier_summary?: string | null;
  crm_notes?: string | null;
  known_contacts?: Array<Record<string, unknown>>;
  prior_outreach?: Array<Record<string, unknown>>;
  prior_strategy_runs?: Array<Record<string, unknown>>;
  claim_context?: Record<string, unknown> | null;
}

export interface StrategyEvidenceFlags {
  hasNamedDecisionMaker: boolean;
  hasTechnicalSignals: boolean;
  hasInnovationSignals: boolean;
  hasGatekeeperIndicators: boolean;
  hasMultiSitePresence: boolean;
  hasGroupStructure: boolean;
  hasPublicSectorSignals: boolean;
  hasProcurementSignals: boolean;
}

export interface StrategyEvidencePack {
  companyIdentity: {
    companyId: string;
    companyName: string;
    companyNumber: string | null;
    website: string | null;
  };
  companiesHouse: CompaniesHouseEnrichment | null;
  webEvidence: BraveWebEnrichment | null;
  internalContext: InternalContextPack;
  evidenceFlags: StrategyEvidenceFlags;
  sourceStatus: {
    companiesHouse: { ok: boolean; error?: string };
    braveWeb: { ok: boolean; error?: string };
    internal: { ok: boolean; error?: string };
    openai: { ok: boolean; error?: string };
  };
  refresh_timestamp: string;
}

export interface OpenAiEngagementStrategyOutput {
  primary_route: string;
  secondary_route: string;
  gatekeeper_risk: "Low" | "Medium" | "High";
  confidence: number;
  suggested_target_persona: string;
  suggested_secondary_persona: string;
  recommended_tone: string;
  why_this_approach: string;
  suggested_first_touch_sequence: Array<{ step: number; action: string; reason: string }>;
  what_not_to_do: string[];
  call_readiness: string;
  email_readiness: string;
  named_contact_strategy: string;
  switchboard_strategy: string;
  evidence_summary: string[];
  assumptions: string[];
  missing_information: string[];
}

function safeJsonParse(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error";
    return { ok: false, error: message };
  }
}

function extractJsonObject(raw: string): string | null {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return raw.slice(first, last + 1);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function computeEvidenceFlags(input: {
  companyName: string;
  companiesHouse: CompaniesHouseEnrichment | null;
  webEvidence: BraveWebEnrichment | null;
  internalContext: InternalContextPack;
}): StrategyEvidenceFlags {
  const nameLower = input.companyName.toLowerCase();

  const webText = (input.webEvidence?.items ?? [])
    .map((i) => `${i.title}\n${i.snippet}\n${i.evidence_tags.join(" ")}`)
    .join("\n")
    .toLowerCase();

  const ch = input.companiesHouse;

  const hasPublicSectorSignals =
    /\b(agency|department|ministry|authority|council|commission|public body|government|gov\.uk|nhs|crown)\b/.test(
      nameLower
    ) || /\b(agency|department|ministry|authority|council|commission|public body|government|gov\.uk|nhs|crown)\b/.test(webText);

  const hasProcurementSignals =
    /\b(procurement|tender|framework|supplier portal|rfp|itt|contracting)\b/.test(webText);

  const hasGroupStructure =
    /\b(group|holdings|plc|subsidiar|divisional|business unit)\b/.test(nameLower) ||
    /\b(group|holdings|plc|subsidiar|divisional|business unit)\b/.test(webText);

  const hasGatekeeperIndicators =
    /\b(switchboard|reception|gatekeeper|procurement|supplier portal|framework)\b/.test(webText) ||
    hasPublicSectorSignals ||
    hasProcurementSignals;

  const hasTechnicalSignals =
    /\b(engineering|software|manufactur|aerospace|space|satellite|defence|defense|robot|electronics|materials|r\&d|innovation)\b/.test(
      webText
    );

  const hasInnovationSignals =
    /\b(innovation|research|r\&d|technology|laborator|programme|program|capability)\b/.test(webText);

  const hasNamedDecisionMaker =
    /\b(head of|director of|chief|cto|cfo|vp|vice president|programme director|program director)\b/.test(webText);

  const hasMultiSitePresence =
    /\b(locations|our offices|sites|worldwide|global presence)\b/.test(webText);

  const internalOk = input.internalContext != null;

  return {
    hasNamedDecisionMaker,
    hasTechnicalSignals,
    hasInnovationSignals,
    hasGatekeeperIndicators,
    hasMultiSitePresence,
    hasGroupStructure,
    hasPublicSectorSignals,
    hasProcurementSignals,
  };
}

async function fetchCompaniesHouseJson(companyNumber: string, path: string): Promise<{ ok: true; json: any } | { ok: false; error: string }> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) return { ok: false, error: "COMPANIES_HOUSE_API_KEY is not set" };

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const url = `https://api.company-information.service.gov.uk/company/${companyNumber}${path}`;

  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) return { ok: false, error: `Companies House request failed (${res.status})` };

  const json = await res.json();
  return { ok: true, json };
}

export async function runCompaniesHouseEnrichment(companyNumber: string | null): Promise<
  { ok: true; value: CompaniesHouseEnrichment } | { ok: false; error: string }
> {
  if (!companyNumber) return { ok: false, error: "No company number available" };

  const profile = await fetchCompaniesHouseJson(companyNumber, "");
  if (!profile.ok) return { ok: false, error: profile.error };

  const officers = await fetchCompaniesHouseJson(companyNumber, "/officers");
  const filingHistory = await fetchCompaniesHouseJson(companyNumber, "/filing-history");

  const sicCodes: string[] = Array.isArray(profile.json?.sic_codes) ? profile.json.sic_codes : [];

  const enrichment: CompaniesHouseEnrichment = {
    company_profile: typeof profile.json === "object" ? profile.json : null,
    sic_codes: sicCodes,
    incorporation_date: typeof profile.json?.date_of_creation === "string" ? profile.json.date_of_creation : null,
    company_status: typeof profile.json?.company_status === "string" ? profile.json.company_status : null,
    officers: {
      active_count:
        officers.ok && Array.isArray(officers.json?.items)
          ? officers.json.items.filter((o: any) => !o?.resigned_on).length
          : null,
      items: officers.ok && Array.isArray(officers.json?.items) ? officers.json.items.slice(0, 15) : [],
    },
    filing_history: {
      total_count: filingHistory.ok && typeof filingHistory.json?.total_count === "number" ? filingHistory.json.total_count : null,
      items: filingHistory.ok && Array.isArray(filingHistory.json?.items) ? filingHistory.json.items.slice(0, 15) : [],
    },
  };

  return { ok: true, value: enrichment };
}

async function braveWebSearch(query: string): Promise<{ ok: true; items: BraveWebEvidenceItem[] } | { ok: false; error: string }> {
  const apiKey =
    process.env.BRAVE_SEARCH_API_KEY ||
    process.env.BRAVE_API_KEY ||
    process.env.BRAVE_SUBSCRIPTION_TOKEN;

  if (!apiKey) return { ok: false, error: "Brave API key is not set" };

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "8");

  const res = await fetch(url.toString(), {
    headers: {
      "X-Subscription-Token": apiKey,
      "Accept": "application/json",
    },
  });

  if (!res.ok) return { ok: false, error: `Brave search failed (${res.status})` };

  const json: any = await res.json();
  const results: any[] = Array.isArray(json?.web?.results) ? json.web.results : [];

  const items: BraveWebEvidenceItem[] = results
    .map((r) => {
      const title = typeof r?.title === "string" ? r.title : "";
      const urlValue = typeof r?.url === "string" ? r.url : "";
      const snippet = typeof r?.description === "string" ? r.description : "";

      const combined = `${title}\n${snippet}\n${urlValue}`.toLowerCase();
      const tags: string[] = [];
      if (combined.includes("tender") || combined.includes("procurement") || combined.includes("framework")) tags.push("procurement");
      if (combined.includes("team") || combined.includes("leadership") || combined.includes("director")) tags.push("leadership");
      if (combined.includes("contact") || combined.includes("email") || combined.includes("phone")) tags.push("contact_route");
      if (combined.includes("innovation") || combined.includes("research") || combined.includes("r&d")) tags.push("innovation");
      if (combined.includes("supplier portal")) tags.push("supplier_portal");
      if (combined.includes("gov.uk") || combined.includes("agency") || combined.includes("department")) tags.push("public_sector");

      return { title, url: urlValue, snippet, evidence_tags: tags };
    })
    .filter((i) => i.url && i.title)
    .slice(0, 20);

  return { ok: true, items };
}

export async function runBraveEnrichment(input: {
  companyName: string;
  website: string | null;
  companyNumber: string | null;
}): Promise<{ ok: true; value: BraveWebEnrichment } | { ok: false; error: string }> {
  const queries: string[] = [];

  const base = input.companyName;
  queries.push(`${base} official website`);
  queries.push(`${base} leadership team contact`);
  queries.push(`${base} procurement tender framework supplier portal`);
  queries.push(`${base} innovation research programme`);
  if (input.website) queries.push(`${base} site:${new URL(input.website).hostname} contact`);
  if (input.companyNumber) queries.push(`${base} ${input.companyNumber}`);

  const collected: BraveWebEvidenceItem[] = [];
  for (const q of queries.slice(0, 5)) {
    const res = await braveWebSearch(q);
    if (!res.ok) continue;
    collected.push(...res.items);
  }

  const uniqueByUrl = new Map<string, BraveWebEvidenceItem>();
  for (const item of collected) {
    if (!uniqueByUrl.has(item.url)) uniqueByUrl.set(item.url, item);
  }

  return {
    ok: true,
    value: { queries, items: Array.from(uniqueByUrl.values()).slice(0, 25) },
  };
}

function buildOpenAiPrompt(evidencePack: StrategyEvidencePack): string {
  return [
    "You are generating a commercially realistic first-touch engagement strategy for an R&D tax consultancy.",
    "",
    "Your task is to determine the best outreach route for this company using ALL provided evidence:",
    "- Companies House data",
    "- web research evidence",
    "- internal CRM/dossier history",
    "- known contacts and prior interactions",
    "",
    "You must not default to generic advice.",
    "You must infer the most commercially credible route based on the evidence.",
    "",
    "Output STRICT JSON only. No markdown.",
    "",
    "Required JSON shape:",
    "{",
    '  "primary_route": "",',
    '  "secondary_route": "",',
    '  "gatekeeper_risk": "Low | Medium | High",',
    '  "confidence": 0,',
    '  "suggested_target_persona": "",',
    '  "suggested_secondary_persona": "",',
    '  "recommended_tone": "",',
    '  "why_this_approach": "",',
    '  "suggested_first_touch_sequence": [',
    '    {"step": 1, "action": "", "reason": ""},',
    '    {"step": 2, "action": "", "reason": ""},',
    '    {"step": 3, "action": "", "reason": ""}',
    "  ],",
    '  "what_not_to_do": [""],',
    '  "call_readiness": "",',
    '  "email_readiness": "",',
    '  "named_contact_strategy": "",',
    '  "switchboard_strategy": "",',
    '  "evidence_summary": [""],',
    '  "assumptions": [""],',
    '  "missing_information": [""]',
    "}",
    "",
    "Rules:",
    "- Base the answer on evidence, not generic SDR best practice alone",
    "- Distinguish between directly evidenced facts and inferred conclusions",
    "- Prefer named stakeholder routes when evidence supports them",
    "- For complex organisations, avoid recommending blind cold calling as the first touch unless strongly justified",
    "- If a company appears procurement-heavy, defence-linked, enterprise-scale, group-structured, or gatekeeper-screened, reflect that in the route",
    "- Confidence must reflect evidence quality, not optimism",
    "",
    "EVIDENCE PACK (JSON):",
    JSON.stringify(evidencePack),
  ].join("\n");
}

export async function runOpenAiEngagementStrategy(evidencePack: StrategyEvidencePack): Promise<
  { ok: true; value: OpenAiEngagementStrategyOutput; raw: string } | { ok: false; error: string; raw?: string }
> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OPENAI_API_KEY is not set" };

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = buildOpenAiPrompt(evidencePack);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "You are a senior strategic account access advisor." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const json: any = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      typeof json?.error?.message === "string"
        ? json.error.message
        : `OpenAI request failed (${res.status})`;
    return { ok: false, error: message };
  }

  const raw = typeof json?.choices?.[0]?.message?.content === "string" ? json.choices[0].message.content : "";
  const parsed = safeJsonParse(raw);

  let candidate: unknown = null;
  if (parsed.ok) {
    candidate = parsed.value;
  } else {
    const extracted = extractJsonObject(raw);
    if (!extracted) return { ok: false, error: `OpenAI output was not valid JSON (${parsed.error})`, raw };
    const parsed2 = safeJsonParse(extracted);
    if (!parsed2.ok) return { ok: false, error: `OpenAI output was not valid JSON (${parsed2.error})`, raw };
    candidate = parsed2.value;
  }

  if (!candidate || typeof candidate !== "object") {
    return { ok: false, error: "OpenAI output was not a JSON object", raw };
  }

  const obj = candidate as any;

  const output: OpenAiEngagementStrategyOutput = {
    primary_route: String(obj.primary_route ?? ""),
    secondary_route: String(obj.secondary_route ?? ""),
    gatekeeper_risk: (obj.gatekeeper_risk === "High" || obj.gatekeeper_risk === "Medium" || obj.gatekeeper_risk === "Low")
      ? obj.gatekeeper_risk
      : "Medium",
    confidence: clamp01(Number(obj.confidence ?? 0)),
    suggested_target_persona: String(obj.suggested_target_persona ?? ""),
    suggested_secondary_persona: String(obj.suggested_secondary_persona ?? ""),
    recommended_tone: String(obj.recommended_tone ?? ""),
    why_this_approach: String(obj.why_this_approach ?? ""),
    suggested_first_touch_sequence: Array.isArray(obj.suggested_first_touch_sequence)
      ? obj.suggested_first_touch_sequence
          .map((s: any) => ({
            step: Number(s?.step ?? 0),
            action: String(s?.action ?? ""),
            reason: String(s?.reason ?? ""),
          }))
          .filter((s: any) => s.step >= 1 && s.action)
          .slice(0, 6)
      : [],
    what_not_to_do: Array.isArray(obj.what_not_to_do) ? obj.what_not_to_do.map((x: any) => String(x)).filter(Boolean).slice(0, 12) : [],
    call_readiness: String(obj.call_readiness ?? ""),
    email_readiness: String(obj.email_readiness ?? ""),
    named_contact_strategy: String(obj.named_contact_strategy ?? ""),
    switchboard_strategy: String(obj.switchboard_strategy ?? ""),
    evidence_summary: Array.isArray(obj.evidence_summary) ? obj.evidence_summary.map((x: any) => String(x)).filter(Boolean).slice(0, 12) : [],
    assumptions: Array.isArray(obj.assumptions) ? obj.assumptions.map((x: any) => String(x)).filter(Boolean).slice(0, 12) : [],
    missing_information: Array.isArray(obj.missing_information) ? obj.missing_information.map((x: any) => String(x)).filter(Boolean).slice(0, 12) : [],
  };

  return { ok: true, value: output, raw };
}

export async function buildEvidencePack(params: {
  req: NextApiRequest;
  prospect: any;
  internalContext: InternalContextPack;
  mode: EngagementStrategyRunMode;
  reuseEvidence?: { companiesHouse?: CompaniesHouseEnrichment | null; webEvidence?: BraveWebEnrichment | null } | null;
}): Promise<{ pack: StrategyEvidencePack; warnings: string[] }> {
  const companyId = String(params.prospect?.id ?? "");
  const companyName = String(params.prospect?.company_name ?? "");
  const companyNumber =
    typeof params.prospect?.company_number === "string" ? params.prospect.company_number : null;
  const website = typeof params.prospect?.website === "string" ? params.prospect.website : null;

  const warnings: string[] = [];
  const refresh_timestamp = new Date().toISOString();

  let companiesHouse: CompaniesHouseEnrichment | null = params.reuseEvidence?.companiesHouse ?? null;
  let webEvidence: BraveWebEnrichment | null = params.reuseEvidence?.webEvidence ?? null;

  const sourceStatus: StrategyEvidencePack["sourceStatus"] = {
    companiesHouse: { ok: false },
    braveWeb: { ok: false },
    internal: { ok: true },
    openai: { ok: false },
  };

  if (!params.reuseEvidence?.companiesHouse || params.mode === "full_live") {
    const ch = await runCompaniesHouseEnrichment(companyNumber);
    if (ch.ok) {
      companiesHouse = ch.value;
      sourceStatus.companiesHouse = { ok: true };
    } else {
      sourceStatus.companiesHouse = { ok: false, error: ch.error };
      warnings.push(`Live Companies House enrichment unavailable: ${ch.error}`);
    }
  } else {
    sourceStatus.companiesHouse = { ok: true };
  }

  if (!params.reuseEvidence?.webEvidence || params.mode === "full_live") {
    const brave = await runBraveEnrichment({ companyName, website, companyNumber });
    if (brave.ok) {
      webEvidence = brave.value;
      sourceStatus.braveWeb = { ok: true };
    } else {
      sourceStatus.braveWeb = { ok: false, error: brave.error };
      warnings.push(`Live web enrichment unavailable: ${brave.error}`);
    }
  } else {
    sourceStatus.braveWeb = { ok: true };
  }

  const evidenceFlags = computeEvidenceFlags({
    companyName,
    companiesHouse,
    webEvidence,
    internalContext: params.internalContext,
  });

  const pack: StrategyEvidencePack = {
    companyIdentity: { companyId, companyName, companyNumber, website },
    companiesHouse,
    webEvidence,
    internalContext: params.internalContext,
    evidenceFlags,
    sourceStatus,
    refresh_timestamp,
  };

  return { pack, warnings };
}