import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { Database } from "@/integrations/supabase/types";
import type { HmrcInspectorMode } from "@/services/hmrcInspectorService";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TypedSupabaseClient = SupabaseClient<Database>;
type HmrcInspectorFindingInsert =
  Database["public"]["Tables"]["hmrc_inspector_findings"]["Insert"];

interface InspectorAiTurnResponseFinding {
  category:
    | "advance"
    | "baseline"
    | "uncertainty"
    | "systematic_investigation"
    | "evidence"
    | "costs"
    | "timeline"
    | "narrative_alignment";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  recommendation: string;
  project_id?: string | null;
  source_refs_json?: HmrcInspectorFindingInsert["source_refs_json"];
}

interface InspectorAiTurnResponse {
  inspector_response: string;
  advisor_hint: string;
  new_findings: InspectorAiTurnResponseFinding[];
  score_adjustment: number;
}

function getServerSupabaseClient(req: NextApiRequest): {
  client: TypedSupabaseClient;
  hasAuth: boolean;
} {
  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file."
    );
  }

  if (!accessToken) {
    return {
      client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY),
      hasAuth: false,
    };
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return { client, hasAuth: true };
}

const INSPECTOR_SYSTEM_PROMPT = `
You are simulating an HMRC-style reviewer examining a UK R&D tax claim.

Your role is to test whether the claim is well supported.

You should:
- ask short, precise questions
- challenge ambiguity
- focus on technological uncertainty, systematic investigation, evidence support, and cost logic
- escalate when an answer is vague, unsupported, or sounds like routine engineering
- identify weaknesses in a structured way

You are not training the user.
You are reviewing the claim.

At the same time, generate separate internal advisor guidance to help the user strengthen the claim.

Do not use marketing language.
Do not praise weak answers.
Do not ask multiple unrelated questions at once.
`.trim();

function getModeInstructions(mode: HmrcInspectorMode): string {
  if (mode === "strict") {
    return `
Mode: STRICT

Act as a sceptical HMRC inspector. Challenge weak evidence and vague descriptions more aggressively. Be firm but professional. Do not accept routine engineering framed as uncertainty.
`.trim();
  }

  if (mode === "aggressive") {
    return `
Mode: AGGRESSIVE

Assume the claim is weak until proven otherwise. Focus on:
- disproportional or poorly supported costs
- vague or generic narratives
- uncertainty that sounds like routine engineering
- gaps in evidence and timeline coherence

Remain professional, but push hard on weaknesses. Do not soften your questions.
`.trim();
  }

  return `
Mode: STANDARD

Act as a realistic HMRC compliance reviewer. Probe unclear areas with balanced, professional tone. Focus on the core BEIS principles and the quality of support.
`.trim();
}

async function buildClaimInspectorContext(
  supabase: TypedSupabaseClient,
  claimId: string
): Promise<string> {
  const { data: rawClaim, error: claimError } = await supabase
    .from("claims")
    .select(
      `
      id,
      name,
      status,
      claim_year,
      total_costs,
      organisations!claims_org_id_fkey(name),
      projects:claim_projects(
        id,
        name,
        rd_theme,
        challenges_uncertainties,
        qualifying_activities
      )
    `
    )
    .eq("id", claimId)
    .maybeSingle();

  if (claimError || !rawClaim) {
    console.error("HMRC Inspector: error loading claim for context", claimError);
    throw new Error("Unable to load claim for inspector context");
  }

  const claim: any = rawClaim;
  const projects: any[] = Array.isArray(claim.projects) ? claim.projects : [];
  const projectIds = projects.map((p) => p.id).filter(Boolean);

  const healthByProject: Record<
    string,
    {
      innovation_density_score: number | null;
      documentation_strength: number | null;
      overall_health_score: number | null;
    }
  > = {};

  if (projectIds.length > 0) {
    const { data: healthRows, error: healthError } = await supabase
      .from("project_health_scores")
      .select(
        "project_id, innovation_density_score, documentation_strength, overall_health_score"
      )
      .in("project_id", projectIds);

    if (healthError) {
      console.error(
        "HMRC Inspector: error loading project health for context",
        healthError
      );
    } else if (healthRows) {
      for (const row of healthRows as {
        project_id: string | null;
        innovation_density_score: number | null;
        documentation_strength: number | null;
        overall_health_score: number | null;
      }[]) {
        if (!row.project_id) continue;
        healthByProject[row.project_id] = {
          innovation_density_score:
            typeof row.innovation_density_score === "number"
              ? row.innovation_density_score
              : null,
          documentation_strength:
            typeof row.documentation_strength === "number"
              ? row.documentation_strength
              : null,
          overall_health_score:
            typeof row.overall_health_score === "number"
              ? row.overall_health_score
              : null,
        };
      }
    }
  }

  const companyName = claim.organisations?.name || "Unknown company";
  const projectSummaries = projects
    .map((p, index) => {
      const health = healthByProject[p.id];
      return `
${index + 1}. ${p.name || "Unnamed project"}
   - R&D theme: ${p.rd_theme || "Not specified"}
   - Uncertainties: ${
     p.challenges_uncertainties || "Not clearly documented"
   }
   - Qualifying activities: ${
     p.qualifying_activities || "Not clearly documented"
   }
   - Innovation density score: ${
     health?.innovation_density_score ?? "not scored"
   }
   - Documentation strength: ${
     health?.documentation_strength ?? "not scored"
   }
   - Overall health score: ${health?.overall_health_score ?? "not scored"}
`.trim();
    })
    .join("\n\n");

  const summaryText = `
Claim ID: ${claim.id}
Company: ${companyName}
Claim year: ${claim.claim_year ?? "Not specified"}
Status: ${claim.status ?? "Unknown"}
Total costs (if recorded): £${
    typeof claim.total_costs === "number"
      ? claim.total_costs.toLocaleString()
      : "not recorded"
  }

Projects:
${projectSummaries || "No projects recorded for this claim."}
`.trim();

  return summaryText;
}

function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function deriveRiskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { client: supabase, hasAuth } = getServerSupabaseClient(req);

    if (!hasAuth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = authData.user.id;

    const { claimId, mode } = req.body as {
      claimId?: string;
      mode?: HmrcInspectorMode;
    };

    if (!claimId || !mode) {
      return res
        .status(400)
        .json({ error: "Missing claimId or mode for inspector start" });
    }

    if (!["standard", "strict", "aggressive"].includes(mode)) {
      return res.status(400).json({ error: "Invalid inspector mode" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("hmrc_inspector_sessions")
      .select("*")
      .eq("claim_id", claimId)
      .eq("status", "active")
      .maybeSingle();

    if (existingError) {
      console.error(
        "HMRC Inspector: error loading existing active session",
        existingError
      );
    }

    let session = existing;

    if (!session) {
      const { data: created, error: createError } = await supabase
        .from("hmrc_inspector_sessions")
        .insert({
          claim_id: claimId,
          created_by_user_id: userId,
          mode,
          status: "active",
          overall_score: 100,
        })
        .select("*")
        .single();

      if (createError || !created) {
        console.error(
          "HMRC Inspector: error creating new session",
          createError
        );
        return res
          .status(500)
          .json({ error: "Failed to create inspector session" });
      }

      session = created;
    }

    const claimContext = await buildClaimInspectorContext(supabase, claimId);

    const modeInstructions = getModeInstructions(mode);

    const userPrompt = `
You are starting a new HMRC-style enquiry into this specific UK R&D claim.

Claim context:
${claimContext}

Task:
1. Identify the MOST likely weakness or area of concern in this claim (do not be generic).
2. Ask ONE short, precise question focused on that weakness.
3. Generate separate internal advisor guidance to help the adviser strengthen this area.

Rules:
- Focus on technological advance, baseline knowledge, uncertainty, systematic investigation, evidence support, timeline coherence, or qualifying cost logic.
- Do NOT ask multiple unrelated questions at once.
- Do NOT be theatrical or emotional.
- Do NOT provide training-style explanations in the inspector question.

Return STRICT JSON with this exact shape:

{
  "inspector_response": "next inspector message to the claimant/adviser",
  "advisor_hint": "private internal guidance for the adviser only",
  "new_findings": [
    {
      "category": "advance | baseline | uncertainty | systematic_investigation | evidence | costs | timeline | narrative_alignment",
      "severity": "low | medium | high",
      "title": "short issue label",
      "description": "clear explanation of the weakness",
      "recommendation": "concrete steps to strengthen the claim",
      "project_id": "optional project id if applicable"
    }
  ],
  "score_adjustment": -10
}

Ensure the JSON is valid and contains at least one finding when you detect a weakness.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: INSPECTOR_SYSTEM_PROMPT,
        },
        {
          role: "system",
          content: modeInstructions,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("HMRC Inspector: empty AI response on start");
      return res
        .status(500)
        .json({ error: "Inspector did not return a response" });
    }

    let parsed: InspectorAiTurnResponse;

    try {
      parsed = JSON.parse(content) as InspectorAiTurnResponse;
    } catch (parseError) {
      console.error("HMRC Inspector: failed to parse JSON response", content);
      return res
        .status(500)
        .json({ error: "Inspector returned invalid JSON response" });
    }

    const inspectorMessage = parsed.inspector_response?.trim();
    const advisorHint = parsed.advisor_hint?.trim() || "";
    const findings = Array.isArray(parsed.new_findings)
      ? parsed.new_findings
      : [];
    const scoreAdjustment =
      typeof parsed.score_adjustment === "number"
        ? parsed.score_adjustment
        : 0;

    if (inspectorMessage) {
      const { error: insertInspectorError } = await supabase
        .from("hmrc_inspector_messages")
        .insert({
          session_id: session.id,
          role: "inspector",
          message_text: inspectorMessage,
        });

      if (insertInspectorError) {
        console.error(
          "HMRC Inspector: error saving inspector message",
          insertInspectorError
        );
      }
    }

    if (advisorHint) {
      const { error: insertAdvisorError } = await supabase
        .from("hmrc_inspector_messages")
        .insert({
          session_id: session.id,
          role: "advisor",
          message_text: advisorHint,
        });

      if (insertAdvisorError) {
        console.error(
          "HMRC Inspector: error saving advisor hint",
          insertAdvisorError
        );
      }
    }

    if (findings.length > 0) {
      const rows: HmrcInspectorFindingInsert[] = findings.map(
        (f): HmrcInspectorFindingInsert => ({
          session_id: session.id as string,
          claim_id: claimId,
          project_id: f.project_id ?? null,
          category: f.category,
          severity: f.severity,
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
          source_refs_json: f.source_refs_json ?? null,
        })
      );

      const { error: findingsError } = await supabase
        .from("hmrc_inspector_findings")
        .insert(rows);

      if (findingsError) {
        console.error(
          "HMRC Inspector: error inserting findings on start",
          findingsError
        );
      }
    }

    const currentScore =
      typeof session.overall_score === "number"
        ? session.overall_score
        : 100;
    const nextScore = clampScore(currentScore + scoreAdjustment);
    const riskLevel = deriveRiskLevel(nextScore);

    const { data: updatedSession, error: updateError } = await supabase
      .from("hmrc_inspector_sessions")
      .update({
        overall_score: nextScore,
        risk_level: riskLevel,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error(
        "HMRC Inspector: error updating session score on start",
        updateError
      );
    }

    return res.status(200).json({
      session: updatedSession || session,
      inspector_response: inspectorMessage,
      advisor_hint: advisorHint,
      new_findings: findings,
      overall_score: nextScore,
      risk_level: riskLevel,
    });
  } catch (error: any) {
    console.error("HMRC Inspector: start handler error", error);
    return res.status(500).json({
      error: "Failed to start HMRC Inspector session",
      details: error.message,
    });
  }
}