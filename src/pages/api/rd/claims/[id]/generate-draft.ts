import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import OpenAI from "openai";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai =
  OPENAI_API_KEY != null && OPENAI_API_KEY !== ""
    ? new OpenAI({ apiKey: OPENAI_API_KEY })
    : null;

type GenerateDraftPerProjectResult = {
  project_id: string;
  result: "generated" | "skipped_existing_draft" | "error";
  narrative_id?: string;
  message?: string;
};

type GenerateDraftResponseBody =
  | {
      ok: true;
      claimId: string;
      total_projects: number;
      generated_count: number;
      skipped_count: number;
      error_count: number;
      per_project: GenerateDraftPerProjectResult[];
    }
  | { ok: false; error: string };

function getBearerToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string") return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length);
}

function getSupabaseForRequest(req: NextApiRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const token = getBearerToken(req);

  if (!token) {
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    return { client, token: null };
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return { client, token };
}

async function getAuthContext(req: NextApiRequest) {
  const { client: supabase, token } = getSupabaseForRequest(req);

  if (!token) {
    return { supabase, userId: null as string | null, profile: null as any };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { supabase, userId: null as string | null, profile: null as any };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, internal_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { supabase, userId: user.id, profile: null as any };
  }

  return { supabase, userId: user.id, profile };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateDraftResponseBody>
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!openai) {
    res.status(500).json({
      ok: false,
      error: "OpenAI is not configured. Missing OPENAI_API_KEY.",
    });
    return;
  }

  try {
    const claimId = req.query.id as string | undefined;

    if (!claimId) {
      res.status(400).json({ ok: false, error: "Missing claim id" });
      return;
    }

    const { supabase, userId, profile } = await getAuthContext(req);

    if (!userId) {
      res
        .status(401)
        .json({ ok: false, error: "Unauthorized: missing or invalid token" });
      return;
    }

    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(
        "id, org_id, claim_year, period_start, period_end, status, scheme_type"
      )
      .eq("id", claimId)
      .maybeSingle();

    if (claimError || !claim) {
      res.status(404).json({ ok: false, error: "Claim not found" });
      return;
    }

    const internalRole = profile?.internal_role as string | null;
    const isInternalStaff = internalRole !== null && internalRole !== "";

    const { data: membership, error: membershipError } = await supabase
      .from("organisation_users")
      .select("role")
      .eq("org_id", claim.org_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) {
      console.error(
        "Error checking organisation membership in generate-draft:",
        membershipError
      );
      res.status(500).json({
        ok: false,
        error: "Failed to verify organisation membership",
      });
      return;
    }

    const membershipRole = (membership?.role as string | null) ?? null;

    const isOrgClientOrEmployee =
      membershipRole === "client" ||
      membershipRole === "employee" ||
      membershipRole === "admin";

    if (!isInternalStaff && !isOrgClientOrEmployee) {
      res.status(403).json({
        ok: false,
        error: "Forbidden: user is not allowed to generate drafts for claim",
      });
      return;
    }

    const { data: projects, error: projectsError } = await supabase
      .from("claim_projects")
      .select(
        "id, name, rd_theme, description, technical_understanding, challenges_uncertainties, qualifying_activities, start_date, end_date"
      )
      .eq("claim_id", claim.id)
      .is("deleted_at", null);

    if (projectsError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load claim projects",
      });
      return;
    }

    if (!projects || projects.length === 0) {
      res.status(400).json({
        ok: false,
        error: "Claim has no projects to generate narratives for",
      });
      return;
    }

    const projectIds = projects.map((p) => p.id);

    const { data: narrativeStates, error: statesError } = await supabase
      .from("rd_project_narrative_state")
      .select("id, claim_project_id, current_narrative_id, final_narrative_id")
      .in("claim_project_id", projectIds);

    if (statesError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load narrative state",
      });
      return;
    }

    const { data: existingNarratives, error: narrativesError } = await supabase
      .from("rd_project_narratives")
      .select("id, claim_project_id, status, version_number")
      .in("claim_project_id", projectIds);

    if (narrativesError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load existing narratives",
      });
      return;
    }

    const stateByProjectId = new Map<
      string,
      {
        id: string;
        claim_project_id: string;
        current_narrative_id: string | null;
        final_narrative_id: string | null;
      }
    >();
    (narrativeStates || []).forEach((s) => {
      stateByProjectId.set(s.claim_project_id, s as any);
    });

    const narrativesById = new Map<
      string,
      {
        id: string;
        claim_project_id: string;
        status: string;
        version_number: number;
      }
    >();
    const maxVersionByProject = new Map<string, number>();

    (existingNarratives || []).forEach((n) => {
      narrativesById.set(n.id, n as any);
      const currentMax = maxVersionByProject.get(n.claim_project_id) ?? 0;
      if (n.version_number > currentMax) {
        maxVersionByProject.set(n.claim_project_id, n.version_number);
      }
    });

    const perProjectResults: GenerateDraftPerProjectResult[] = [];
    let generatedCount = 0;
    const skippedCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      const projectId = project.id;

      try {
        const periodTextParts: string[] = [];
        if (claim.period_start) {
          periodTextParts.push(String(claim.period_start));
        }
        if (claim.period_end) {
          periodTextParts.push(String(claim.period_end));
        }

        const qualifyingActivitiesText = Array.isArray(
          project.qualifying_activities
        )
          ? (project.qualifying_activities as string[]).join("; ")
          : project.qualifying_activities || "";

        const userContent = `
Generate a UK R&D technical narrative draft for the following project.

Return STRICT JSON only, with this exact shape and keys:
{
  "advance_sought": "...",
  "baseline_knowledge": "...",
  "technological_uncertainty": "...",
  "work_undertaken": "...",
  "outcome": "..."
}

Do NOT include any markdown, explanations, or extra keys.

Company / claim:
- Claim year: ${claim.claim_year}
- Accounting period: ${periodTextParts.join(" to ") || "Not specified"}
- Scheme type (if known): ${claim.scheme_type || "Not specified"}

Project:
- Name: ${project.name}
- Theme: ${project.rd_theme || "Not specified"}
- Description: ${project.description || "Not provided"}
- Technical understanding: ${
          project.technical_understanding || "Not documented"
        }
- Challenges & uncertainties: ${
          project.challenges_uncertainties || "Not documented"
        }
- Qualifying activities: ${
          qualifyingActivitiesText || "Not explicitly listed"
        }
- Date range: ${
          project.start_date && project.end_date
            ? `${project.start_date} to ${project.end_date}`
            : "Not specified"
        }
`.trim();

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          max_tokens: 1000,
          messages: [
            {
              role: "system",
              content:
                "You are an expert UK R&D tax technical writer. Produce concise, high-quality narratives that clearly evidence eligibility. Always respond with STRICT JSON only, no markdown.",
            },
            {
              role: "user",
              content: userContent,
            },
          ],
        });

        const rawContent =
          completion.choices[0]?.message?.content?.trim() || "";

        let cleaned = rawContent;
        if (cleaned.startsWith("```")) {
          const firstNewline = cleaned.indexOf("\n");
          const lastFence = cleaned.lastIndexOf("```");
          if (firstNewline !== -1 && lastFence !== -1) {
            cleaned = cleaned.slice(firstNewline + 1, lastFence).trim();
          }
        }

        let parsed: {
          advance_sought: string;
          baseline_knowledge: string;
          technological_uncertainty: string;
          work_undertaken: string;
          outcome: string;
        };

        try {
          parsed = JSON.parse(cleaned);
        } catch (parseError: any) {
          throw new Error(
            `Failed to parse OpenAI JSON for project ${project.name}: ${parseError.message || String(
              parseError
            )}`
          );
        }

        const nextVersion =
          (maxVersionByProject.get(projectId) ?? 0) + 1;

        const { data: inserted, error: insertError } = await supabase
          .from("rd_project_narratives")
          .insert({
            claim_project_id: projectId,
            status: "draft",
            version_number: nextVersion,
            generated_by: "ai",
            advance_sought: parsed.advance_sought,
            baseline_knowledge: parsed.baseline_knowledge,
            technological_uncertainty: parsed.technological_uncertainty,
            work_undertaken: parsed.work_undertaken,
            outcome: parsed.outcome,
            created_by: userId,
          })
          .select("id, claim_project_id, status, version_number")
          .single();

        if (insertError || !inserted) {
          throw new Error(
            insertError?.message ||
              "Failed to save generated narrative to database"
          );
        }

        maxVersionByProject.set(projectId, inserted.version_number);
        narrativesById.set(inserted.id, inserted as any);

        const nowIso = new Date().toISOString();

        const upsertPayload = {
          claim_project_id: projectId,
          current_narrative_id: inserted.id,
          last_edited_by: userId,
          last_edited_at: nowIso,
        };

        const { error: stateUpsertError } = await supabase
          .from("rd_project_narrative_state")
          .upsert(upsertPayload, {
            onConflict: "claim_project_id",
          });

        if (stateUpsertError) {
          throw new Error(
            stateUpsertError.message ||
              "Failed to update narrative state for project"
          );
        }

        const { error: auditError } = await supabase
          .from("rd_audit_log")
          .insert({
            claim_id: claim.id,
            project_id: projectId,
            action: "generate_draft",
            actor_user_id: userId,
            details_json: {
              narrative_id: inserted.id,
              version_number: inserted.version_number,
              generated_by: "ai",
              scheme_type: claim.scheme_type,
            },
          });

        if (auditError) {
          console.error(
            "Failed to write rd_audit_log for generate_draft:",
            auditError
          );
        }

        perProjectResults.push({
          project_id: projectId,
          result: "generated",
          narrative_id: inserted.id,
        });
        generatedCount += 1;
      } catch (projectError: any) {
        console.error(
          "Error generating draft narrative for project",
          project.id,
          projectError
        );
        perProjectResults.push({
          project_id: projectId,
          result: "error",
          message:
            projectError?.message ||
            "Unexpected error generating draft narrative",
        });
        errorCount += 1;
      }
    }

    const nonDraftTerminalStatuses = [
      "ready_to_file",
      "submitted_hmrc",
      "hmrc_feedback",
      "completed",
    ];

    if (!nonDraftTerminalStatuses.includes(claim.status)) {
      const { error: statusUpdateError } = await supabase
        .from("claims")
        .update({
          status: "draft_in_progress",
        })
        .eq("id", claim.id);

      if (statusUpdateError) {
        console.error(
          "Failed to update claim status to draft_in_progress:",
          statusUpdateError
        );
      }
    }

    const responseBody: GenerateDraftResponseBody = {
      ok: true,
      claimId: claim.id,
      total_projects: projects.length,
      generated_count: generatedCount,
      skipped_count: skippedCount,
      error_count: errorCount,
      per_project: perProjectResults,
    };

    res.status(200).json(responseBody);
  } catch (error: any) {
    console.error("Error in generate-draft handler:", error);
    res.status(500).json({
      ok: false,
      error:
        error?.message || "Failed to generate draft narratives for this claim",
    });
  }
}