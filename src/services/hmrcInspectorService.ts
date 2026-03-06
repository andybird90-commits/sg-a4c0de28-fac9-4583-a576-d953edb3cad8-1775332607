import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HmrcInspectorMode = "standard" | "strict" | "aggressive";
export type HmrcInspectorStatus = "active" | "completed";
export type HmrcInspectorRiskLevel = "low" | "medium" | "high";

export type HmrcInspectorSession =
  Database["public"]["Tables"]["hmrc_inspector_sessions"]["Row"];
export type HmrcInspectorMessage =
  Database["public"]["Tables"]["hmrc_inspector_messages"]["Row"];
export type HmrcInspectorFinding =
  Database["public"]["Tables"]["hmrc_inspector_findings"]["Row"];

export interface StartInspectorPayload {
  claimId: string;
  mode: HmrcInspectorMode;
  userId: string;
}

export interface InspectorAiTurnRequest {
  sessionId: string;
  claimId: string;
}

export interface InspectorAiTurnResponseFinding {
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
  source_refs_json?: unknown;
}

export interface InspectorAiTurnResponse {
  inspector_response: string;
  advisor_hint: string;
  new_findings: InspectorAiTurnResponseFinding[];
  score_adjustment: number;
}

export interface ClaimInspectorSummary {
  latestStatus: "not_run" | "in_progress" | "completed";
  latestScore: number | null;
  latestRiskLevel: HmrcInspectorRiskLevel | null;
  lastRunAt: string | null;
}

export async function startInspectorSession(
  payload: StartInspectorPayload
): Promise<HmrcInspectorSession> {
  const { claimId, mode, userId } = payload;

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

  if (existing) {
    return existing as HmrcInspectorSession;
  }

  const { data: session, error } = await supabase
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

  if (error) {
    console.error("HMRC Inspector: error creating session", error);
    throw error;
  }

  return session as HmrcInspectorSession;
}

export async function getInspectorSession(
  sessionId: string
): Promise<HmrcInspectorSession | null> {
  const { data, error } = await supabase
    .from("hmrc_inspector_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("HMRC Inspector: error loading session", error);
    throw error;
  }

  return (data as HmrcInspectorSession | null) ?? null;
}

export async function getLatestInspectorSummaryForClaim(
  claimId: string
): Promise<ClaimInspectorSummary> {
  const { data, error } = await supabase
    .from("hmrc_inspector_sessions")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error(
      "HMRC Inspector: error loading latest session for claim",
      error
    );
    return {
      latestStatus: "not_run",
      latestScore: null,
      latestRiskLevel: null,
      lastRunAt: null,
    };
  }

  const latest = (data?.[0] as HmrcInspectorSession | undefined) ?? undefined;

  if (!latest) {
    return {
      latestStatus: "not_run",
      latestScore: null,
      latestRiskLevel: null,
      lastRunAt: null,
    };
  }

  const latestStatus: ClaimInspectorSummary["latestStatus"] =
    latest.status === "completed" ? "completed" : "in_progress";

  return {
    latestStatus,
    latestScore: typeof latest.overall_score === "number"
      ? latest.overall_score
      : null,
    latestRiskLevel:
      (latest.risk_level as HmrcInspectorRiskLevel | null) ?? null,
    lastRunAt: latest.updated_at ?? latest.created_at ?? null,
  };
}

export async function listInspectorMessages(
  sessionId: string
): Promise<HmrcInspectorMessage[]> {
  const { data, error } = await supabase
    .from("hmrc_inspector_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("HMRC Inspector: error loading messages", error);
    throw error;
  }

  return (data ?? []) as HmrcInspectorMessage[];
}

export async function listInspectorFindings(
  sessionId: string
): Promise<HmrcInspectorFinding[]> {
  const { data, error } = await supabase
    .from("hmrc_inspector_findings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("HMRC Inspector: error loading findings", error);
    throw error;
  }

  return (data ?? []) as HmrcInspectorFinding[];
}

export async function appendInspectorMessage(
  sessionId: string,
  role: HmrcInspectorMessage["role"],
  messageText: string
): Promise<void> {
  const { error } = await supabase.from("hmrc_inspector_messages").insert({
    session_id: sessionId,
    role,
    message_text: messageText,
  });

  if (error) {
    console.error("HMRC Inspector: error appending message", error);
    throw error;
  }
}

export async function appendInspectorFindings(
  sessionId: string,
  claimId: string,
  findings: InspectorAiTurnResponseFinding[]
): Promise<void> {
  if (!findings.length) return;

  const rows = findings.map((finding) => ({
    session_id: sessionId,
    claim_id: claimId,
    project_id: finding.project_id ?? null,
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    recommendation: finding.recommendation,
    source_refs_json: finding.source_refs_json ?? null,
  }));

  const { error } = await supabase
    .from("hmrc_inspector_findings")
    .insert(rows);

  if (error) {
    console.error("HMRC Inspector: error inserting findings", error);
    throw error;
  }
}

export async function applyScoreAdjustment(
  sessionId: string,
  adjustment: number
): Promise<HmrcInspectorSession | null> {
  const { data: current, error: loadError } = await supabase
    .from("hmrc_inspector_sessions")
    .select("overall_score")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) {
    console.error(
      "HMRC Inspector: error loading current score before adjustment",
      loadError
    );
    throw loadError;
  }

  const baseScore =
    typeof current?.overall_score === "number"
      ? current.overall_score
      : 100;
  const nextScore = Math.max(0, Math.min(100, baseScore + adjustment));

  let riskLevel: HmrcInspectorRiskLevel;
  if (nextScore >= 80) {
    riskLevel = "low";
  } else if (nextScore >= 60) {
    riskLevel = "medium";
  } else {
    riskLevel = "high";
  }

  const { data: updated, error } = await supabase
    .from("hmrc_inspector_sessions")
    .update({
      overall_score: nextScore,
      risk_level: riskLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("HMRC Inspector: error updating score", error);
    throw error;
  }

  return (updated as HmrcInspectorSession | null) ?? null;
}

export async function completeInspectorSession(
  sessionId: string,
  summary: string
): Promise<HmrcInspectorSession | null> {
  const { data: current, error: loadError } = await supabase
    .from("hmrc_inspector_sessions")
    .select("overall_score")
    .eq("id", sessionId)
    .maybeSingle();

  if (loadError) {
    console.error(
      "HMRC Inspector: error loading session before completion",
      loadError
    );
    throw loadError;
  }

  const score =
    typeof current?.overall_score === "number"
      ? current.overall_score
      : 0;

  let riskLevel: HmrcInspectorRiskLevel;
  if (score >= 80) {
    riskLevel = "low";
  } else if (score >= 60) {
    riskLevel = "medium";
  } else {
    riskLevel = "high";
  }

  const { data: updated, error } = await supabase
    .from("hmrc_inspector_sessions")
    .update({
      status: "completed",
      risk_level: riskLevel,
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("HMRC Inspector: error completing session", error);
    throw error;
  }

  return (updated as HmrcInspectorSession | null) ?? null;
}