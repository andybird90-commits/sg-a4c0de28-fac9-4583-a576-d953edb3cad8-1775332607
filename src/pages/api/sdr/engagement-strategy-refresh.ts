import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import {
  buildEvidencePack,
  runOpenAiEngagementStrategy,
  type EngagementStrategyRunMode,
  type StrategyEvidencePack,
  type OpenAiEngagementStrategyOutput,
} from "@/lib/sdr/engagementStrategyRefresh";

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
    }
  | {
      ok: false;
      message: string;
      detail?: unknown;
    };

function isRunMode(value: unknown): value is EngagementStrategyRunMode {
  return value === "refresh" || value === "full_live";
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
  const mode: EngagementStrategyRunMode = isRunMode(body?.mode) ? body.mode : "refresh";

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

    const { data: latestRun } =
      mode === "refresh"
        ? await (supabaseServer as any)
            .from("sdr_engagement_strategy_runs")
            .select("evidence_pack, created_at")
            .eq("prospect_id", prospectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };

    let reuseEvidence: { companiesHouse?: any; webEvidence?: any } | null = null;
    if (latestRun?.evidence_pack && typeof latestRun.evidence_pack === "object") {
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

    const internalContext = {
      dossier_summary: typeof (prospect as any)?.dossier_summary === "string" ? (prospect as any).dossier_summary : null,
      crm_notes: typeof (prospect as any)?.crm_notes === "string" ? (prospect as any).crm_notes : null,
      known_contacts: Array.isArray((prospect as any)?.known_contacts) ? (prospect as any).known_contacts : [],
      prior_outreach: Array.isArray((prospect as any)?.prior_outreach) ? (prospect as any).prior_outreach : [],
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

    evidencePack.sourceStatus.openai = openAiResult.ok
      ? { ok: true }
      : { ok: false, error: openAiResult.error };

    const strategyOutput = openAiResult.ok ? openAiResult.value : null;
    if (!openAiResult.ok) {
      warnings.push(`OpenAI strategy reasoning unavailable: ${openAiResult.error}`);
    }

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

    const { error: updateError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .update({
        engagement_strategy_json: {
          refresh_timestamp: evidencePack.refresh_timestamp,
          source_status: evidencePack.sourceStatus,
          warnings,
          evidence_summary: strategyOutput?.evidence_summary ?? [],
          assumptions: strategyOutput?.assumptions ?? [],
          missing_information: strategyOutput?.missing_information ?? [],
          strategy_output: strategyOutput,
        },
        engagement_generated_at: refreshedAt,
        engagement_ai_generation_status: openAiResult.ok ? "success" : "partial",
        updated_at: refreshedAt,
      })
      .eq("id", prospectId);

    if (updateError) {
      res.status(500).json({ ok: false, message: "Failed to update prospect with latest strategy", detail: updateError });
      return;
    }

    res.status(200).json({
      ok: true,
      prospectId,
      runMode: mode,
      refreshedAt,
      sourceStatus: evidencePack.sourceStatus,
      warnings,
      evidencePack,
      strategyOutput,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "Failed to refresh engagement strategy",
      detail: error instanceof Error ? { name: error.name, message: error.message } : error,
    });
  }
}