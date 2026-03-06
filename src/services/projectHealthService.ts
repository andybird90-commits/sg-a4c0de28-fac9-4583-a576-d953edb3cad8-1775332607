import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Json = Database["public"]["Tables"]["project_health_scores"]["Row"]["reasons_json"];

type ProjectHealthRecord = Database["public"]["Tables"]["project_health_scores"]["Row"];

type ClaimProjectId = string;
type ClaimProjectRow = Database["public"]["Tables"]["claim_projects"]["Row"];

interface ProjectSignals {
  experimentsCount: number;
  uncertaintyMentions: number;
  iterationMentions: number;
  investigationPhases: number;
  engineeringLanguageHits: number;
  evidenceCount: number;
  narrativeCompletenessScore: number;
  timelineItemsCount: number;
  costMappingSignals: number;
  voiceNoteCount: number;
  reasons: string[];
  signalsList: string[];
}

function normaliseText(input: string | null | undefined): string {
  if (!input) {
    return "";
  }
  return input.toLowerCase();
}

function keywordCount(text: string, keywords: string[]): number {
  if (!text) {
    return 0;
  }
  const lowered = text.toLowerCase();
  let count = 0;
  for (const keyword of keywords) {
    if (lowered.includes(keyword.toLowerCase())) {
      count += 1;
    }
  }
  return count;
}

async function fetchProjectSignals(projectId: ClaimProjectId): Promise<ProjectSignals> {
  const reasons: string[] = [];
  const signalsList: string[] = [];

  const { data: project, error: projectError } = await supabase
    .from("claim_projects")
    .select(
      [
        "id",
        "description",
        "rd_theme",
        "technical_understanding",
        "challenges_uncertainties",
        "qualifying_activities",
        "advance_in_science",
        "staff_cost",
        "subcontractor_cost",
        "consumables_cost",
        "software_cost",
      ].join(","),
    )
    .eq("id", projectId)
    .maybeSingle();

  const projectRow: ClaimProjectRow | null =
    project && typeof project === "object"
      ? ((project as unknown) as ClaimProjectRow)
      : null;

  if (projectError) {
    console.error("Project health engine: error loading claim_project", projectError);
  }

  const narrativeTextParts: string[] = [];

  if (projectRow) {
    narrativeTextParts.push(
      projectRow.description ?? "",
      projectRow.rd_theme ?? "",
      projectRow.technical_understanding ?? "",
      projectRow.challenges_uncertainties ?? "",
      projectRow.advance_in_science ?? "",
    );
    if (Array.isArray(projectRow.qualifying_activities)) {
      narrativeTextParts.push((projectRow.qualifying_activities as string[]).join(" "));
    }
  }

  const narrativeText = normaliseText(narrativeTextParts.join("\n\n"));

  const { data: narratives, error: narrativesError } = await supabase
    .from("rd_project_narratives")
    .select("advance_sought, baseline_knowledge, technological_uncertainty, work_undertaken, outcome")
    .eq("claim_project_id", projectId);

  if (narrativesError) {
    console.error("Project health engine: error loading narratives", narrativesError);
  }

  if (narratives && narratives.length > 0) {
    for (const n of narratives) {
      narrativeTextParts.push(
        n.advance_sought,
        n.baseline_knowledge,
        n.technological_uncertainty,
        n.work_undertaken,
        n.outcome,
      );
    }
  }

  const extendedNarrativeText = normaliseText(narrativeTextParts.join("\n\n"));

  const uncertaintyMentions =
    keywordCount(extendedNarrativeText, [
      "technological uncertainty",
      "uncertainty whether",
      "not known how",
      "could not be readily deduced",
      "uncertain whether",
    ]) +
    keywordCount(extendedNarrativeText, ["risk", "unproven", "novel approach"]);

  const experimentsCount =
    keywordCount(extendedNarrativeText, [
      "experiment",
      "experimentation",
      "testing",
      "test plan",
      "prototype",
      "trial",
      "a/b",
      "ab test",
    ]);

  const iterationMentions =
    keywordCount(extendedNarrativeText, [
      "iteration",
      "iterated",
      "v1",
      "v2",
      "v3",
      "phase 1",
      "phase 2",
      "prototype 1",
      "prototype 2",
      "refactor",
      "reworked",
    ]);

  const engineeringLanguageHits = keywordCount(extendedNarrativeText, [
    "algorithm",
    "latency",
    "throughput",
    "architecture",
    "integration",
    "performance",
    "scalability",
    "stability",
    "bug",
    "defect",
    "debug",
    "root cause",
  ]);

  const { data: timelines, error: timelinesError } = await supabase
    .from("project_status_history")
    .select("id, notes")
    .eq("claim_project_id", projectId);

  if (timelinesError) {
    console.error("Project health engine: error loading status history", timelinesError);
  }

  let investigationPhases = 0;
  if (timelines && timelines.length > 0) {
    for (const t of timelines) {
      const notes = normaliseText((t as { notes: string | null }).notes);
      if (
        keywordCount(notes, [
          "investigation",
          "discovery",
          "feasibility",
          "prototype",
          "exploratory",
          "spike",
        ]) > 0
      ) {
        investigationPhases += 1;
      }
    }
  }

  const { data: evidenceItems, error: evidenceError } = await supabase
    .from("evidence_items")
    .select("id")
    .eq("project_id", projectId);

  if (evidenceError) {
    console.error("Project health engine: error loading evidence_items", evidenceError);
  }

  const evidenceCount = evidenceItems?.length ?? 0;

  const { data: claimDocuments, error: docsError } = await supabase
    .from("claim_documents")
    .select("id, doc_type")
    .eq("project_id", projectId);

  if (docsError) {
    console.error("Project health engine: error loading claim_documents", docsError);
  }

  let costMappingSignals = 0;
  if (claimDocuments && claimDocuments.length > 0) {
    for (const d of claimDocuments as { doc_type: string }[]) {
      if (
        ["cost_breakdown", "timesheets", "invoices"].includes(
          (d.doc_type ?? "").toLowerCase(),
        )
      ) {
        costMappingSignals += 1;
      }
    }
  }

  const { data: timesheets, error: timesheetsError } = await supabase
    .from("timesheet_entries")
    .select("id")
    .eq("claim_id", projectRow?.claim_id ?? null);

  if (timesheetsError) {
    console.error("Project health engine: error loading timesheet_entries", timesheetsError);
  }

  if ((timesheets?.length ?? 0) > 0) {
    costMappingSignals += 1;
  }

  const { data: voiceNotes, error: voiceError } = await supabase
    .from("project_voice_notes")
    .select("id, transcript_cleaned, ai_summary")
    .eq("project_id", projectRow?.source_sidekick_project_id ?? null);

  if (voiceError) {
    console.error("Project health engine: error loading project_voice_notes", voiceError);
  }

  const voiceNoteCount = voiceNotes?.length ?? 0;
  if (voiceNotes && voiceNotes.length > 0) {
    for (const vn of voiceNotes as {
      transcript_cleaned: string | null;
      ai_summary: string | null;
    }[]) {
      const combined = normaliseText(
        (vn.transcript_cleaned ?? "") + "\n" + (vn.ai_summary ?? ""),
      );
      if (
        keywordCount(combined, [
          "experiment",
          "testing",
          "prototype",
          "uncertainty",
          "unknown",
          "investigation",
        ]) > 0
      ) {
        reasons.push("Voice notes reference experiments, prototypes or uncertainty.");
        signalsList.push("Experimentation language found in voice notes");
      }
    }
  }

  let narrativeCompletenessScore = 0;
  if (narratives && narratives.length > 0) {
    const latest = narratives[narratives.length - 1] as {
      advance_sought: string | null;
      baseline_knowledge: string | null;
      technological_uncertainty: string | null;
      work_undertaken: string | null;
      outcome: string | null;
    };

    const sections = [
      latest.advance_sought,
      latest.baseline_knowledge,
      latest.technological_uncertainty,
      latest.work_undertaken,
      latest.outcome,
    ];

    const filled = sections.filter((s) => s && s.trim().length > 80).length;
    narrativeCompletenessScore = Math.round((filled / 5) * 100);

    if (filled >= 4) {
      reasons.push("Project narrative is largely complete across HMRC sections.");
      signalsList.push("Comprehensive narrative across HMRC sections");
    } else if (filled >= 2) {
      reasons.push("Project narrative is partially complete; some sections are thin.");
    } else {
      reasons.push("Project narrative is sparse; key sections need strengthening.");
    }
  }

  return {
    experimentsCount,
    uncertaintyMentions,
    iterationMentions,
    investigationPhases,
    engineeringLanguageHits,
    evidenceCount,
    narrativeCompletenessScore,
    timelineItemsCount: timelines?.length ?? 0,
    costMappingSignals,
    voiceNoteCount,
    reasons,
    signalsList,
  };
}

function calculateInnovationDensity(signals: ProjectSignals): {
  innovationDensityScore: number;
  experimentationScore: number;
  uncertaintyScore: number;
  iterationScore: number;
} {
  const experimentationScore = Math.min(signals.experimentsCount * 10, 30);
  const uncertaintyScore = Math.min(signals.uncertaintyMentions * 10, 30);
  const iterationScore = Math.min(
    (signals.iterationMentions + signals.investigationPhases) * 10,
    25,
  );
  const engineeringScore = Math.min(signals.engineeringLanguageHits * 5, 15);

  const innovationDensityScore = Math.min(
    experimentationScore + uncertaintyScore + iterationScore + engineeringScore,
    100,
  );

  return {
    innovationDensityScore,
    experimentationScore,
    uncertaintyScore,
    iterationScore,
  };
}

function calculateDocumentationStrength(
  signals: ProjectSignals,
): {
  documentationStrength: number;
  evidenceScore: number;
  timelineScore: number;
  narrativeScore: number;
  costSupportScore: number;
} {
  const evidenceScore =
    signals.evidenceCount > 0 ? Math.min(signals.evidenceCount * 10, 25) : 0;

  const narrativeScore = Math.min(signals.narrativeCompletenessScore, 25);

  const timelineScore =
    signals.timelineItemsCount > 0
      ? Math.min(signals.timelineItemsCount * 5, 20)
      : 0;

  const costSupportScore =
    signals.costMappingSignals > 0
      ? Math.min(signals.costMappingSignals * 10, 20)
      : 0;

  const voiceNoteBonus = Math.min(signals.voiceNoteCount * 2, 10);

  const documentationStrength = Math.min(
    evidenceScore +
      narrativeScore +
      timelineScore +
      costSupportScore +
      voiceNoteBonus,
    100,
  );

  return {
    documentationStrength,
    evidenceScore,
    timelineScore,
    narrativeScore,
    costSupportScore,
  };
}

function deriveOverallScores(
  innovationDensityScore: number,
  documentationStrength: number,
): {
  overallHealthScore: number;
  healthRating: ProjectHealthRecord["health_rating"];
  riskLevel: ProjectHealthRecord["risk_level"];
} {
  const overall = Math.round(
    innovationDensityScore * 0.5 + documentationStrength * 0.5,
  );

  let healthRating: ProjectHealthRecord["health_rating"] = "weak";
  if (overall >= 85) {
    healthRating = "excellent";
  } else if (overall >= 70) {
    healthRating = "strong";
  } else if (overall >= 55) {
    healthRating = "moderate";
  }

  let riskLevel: ProjectHealthRecord["risk_level"] = "high";
  if (healthRating === "excellent" || healthRating === "strong") {
    riskLevel = "low";
  } else if (healthRating === "moderate") {
    riskLevel = "medium";
  }

  return {
    overallHealthScore: overall,
    healthRating,
    riskLevel,
  };
}

export async function recalculateProjectHealth(
  projectId: ClaimProjectId,
): Promise<ProjectHealthRecord | null> {
  const signals = await fetchProjectSignals(projectId);

  const innovation = calculateInnovationDensity(signals);
  const documentation = calculateDocumentationStrength(signals);
  const overall = deriveOverallScores(
    innovation.innovationDensityScore,
    documentation.documentationStrength,
  );

  const reasons: Json = {
    summary: [
      ...signals.reasons,
      overall.healthRating === "excellent"
        ? "Project shows strong experimentation signals with robust documentation."
        : overall.healthRating === "strong"
        ? "Project has solid R&D characteristics with generally good documentation."
        : overall.healthRating === "moderate"
        ? "R&D signals are present but documentation and/or uncertainty evidence could be stronger."
        : "Weak R&D and/or documentation signals detected; project may be high risk.",
    ],
    signals: signals.signalsList,
  } as Json;

  const { data, error } = await supabase
    .from("project_health_scores")
    .upsert(
      {
        project_id: projectId,
        innovation_density_score: innovation.innovationDensityScore,
        experimentation_score: innovation.experimentationScore,
        uncertainty_score: innovation.uncertaintyScore,
        iteration_score: innovation.iterationScore,
        documentation_strength: documentation.documentationStrength,
        evidence_score: documentation.evidenceScore,
        timeline_score: documentation.timelineScore,
        narrative_score: documentation.narrativeScore,
        cost_support_score: documentation.costSupportScore,
        overall_health_score: overall.overallHealthScore,
        health_rating: overall.healthRating,
        risk_level: overall.riskLevel,
        reasons_json: reasons,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Project health engine: error upserting project_health_scores", error);
    return null;
  }

  return data as ProjectHealthRecord;
}

export async function getCachedProjectHealth(
  projectId: ClaimProjectId,
): Promise<ProjectHealthRecord | null> {
  const { data, error } = await supabase
    .from("project_health_scores")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Project health engine: error loading cached score", error);
    return null;
  }

  return data as ProjectHealthRecord | null;
}