import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type FinalisePackProjectError = {
  project_id: string;
  message: string;
};

type FinalisePackSuccessResponse = {
  ok: true;
  claimId: string;
  locked_projects_count: number;
  already_final_count: number;
  missing_count: number;
  errors: FinalisePackProjectError[];
};

type FinalisePackErrorResponse = {
  ok: false;
  error: string;
};

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
    return { client, token: null as string | null };
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
  res: NextApiResponse<FinalisePackSuccessResponse | FinalisePackErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
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

    const internalRole = (profile?.internal_role as string | null) || null;
    const allowedRoles = ["director", "admin", "manager"];

    if (!internalRole || !allowedRoles.includes(internalRole)) {
      res.status(403).json({
        ok: false,
        error:
          "Forbidden: only directors, managers or admins can finalise a claim pack",
      });
      return;
    }

    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("id, org_id, status")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError || !claim) {
      res.status(404).json({ ok: false, error: "Claim not found" });
      return;
    }

    if (!["draft", "draft_in_progress", "draft_ready"].includes(claim.status)) {
      res.status(400).json({
        ok: false,
        error:
          "Claim is not in a draft state. Only draft claims can be finalised.",
      });
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organisation_users")
      .select("role")
      .eq("org_id", claim.org_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError || !membership) {
      res.status(403).json({
        ok: false,
        error: "Forbidden: user is not a member of this organisation",
      });
      return;
    }

    const { data: projects, error: projectsError } = await supabase
      .from("claim_projects")
      .select("id, name")
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
        error: "Claim has no projects to finalise",
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

    const { data: narratives, error: narrativesError } = await supabase
      .from("rd_project_narratives")
      .select(
        "id, claim_project_id, status, version_number, technological_uncertainty, work_undertaken"
      )
      .in("claim_project_id", projectIds);

    if (narrativesError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load narratives",
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
        technological_uncertainty: string | null;
        work_undertaken: string | null;
      }
    >();
    (narratives || []).forEach((n) => {
      narrativesById.set(n.id, n as any);
    });

    let lockedCount = 0;
    let alreadyFinalCount = 0;
    let missingCount = 0;
    const errors: FinalisePackProjectError[] = [];

    for (const project of projects) {
      const projectId = project.id;
      const state = stateByProjectId.get(projectId);

      let targetNarrativeId: string | null = null;

      if (state?.final_narrative_id) {
        targetNarrativeId = state.final_narrative_id;
      } else if (state?.current_narrative_id) {
        targetNarrativeId = state.current_narrative_id;
      }

      if (!targetNarrativeId) {
        missingCount += 1;
        errors.push({
          project_id: projectId,
          message:
            "No current or final narrative found for this project. Please generate or select a narrative before finalising.",
        });
        continue;
      }

      const narrative = narrativesById.get(targetNarrativeId);

      if (!narrative) {
        missingCount += 1;
        errors.push({
          project_id: projectId,
          message:
            "Narrative referenced in state could not be loaded. Please regenerate the narrative.",
        });
        continue;
      }

      if (narrative.status === "final") {
        alreadyFinalCount += 1;
        continue;
      }

      const techUnc = (narrative.technological_uncertainty || "").trim();
      const workUnd = (narrative.work_undertaken || "").trim();

      if (!techUnc || !workUnd) {
        missingCount += 1;
        errors.push({
          project_id: projectId,
          message:
            "Narrative is missing required sections (technological uncertainty and/or work undertaken). Please complete before finalising.",
        });
        continue;
      }

      const { error: updateNarrativeError } = await supabase
        .from("rd_project_narratives")
        .update({ status: "final" })
        .eq("id", narrative.id);

      if (updateNarrativeError) {
        errors.push({
          project_id: projectId,
          message:
            updateNarrativeError.message ||
            "Failed to update narrative status to final",
        });
        continue;
      }

      const upsertPayload = {
        claim_project_id: projectId,
        final_narrative_id: narrative.id,
      };

      const { error: stateUpsertError } = await supabase
        .from("rd_project_narrative_state")
        .upsert(upsertPayload, {
          onConflict: "claim_project_id",
        });

      if (stateUpsertError) {
        errors.push({
          project_id: projectId,
          message:
            stateUpsertError.message ||
            "Failed to update narrative state with final narrative",
        });
        continue;
      }

      const { error: auditError } = await supabase.from("rd_audit_log").insert({
        claim_id: claim.id,
        project_id: projectId,
        action: "finalise",
        actor_user_id: userId,
        details_json: {
          narrative_id: narrative.id,
          version_number: narrative.version_number,
        },
      });

      if (auditError) {
        console.error(
          "Failed to write rd_audit_log for finalise-pack:",
          auditError
        );
      }

      lockedCount += 1;
    }

    if (missingCount > 0) {
      res.status(200).json({
        ok: true,
        claimId: claim.id,
        locked_projects_count: lockedCount,
        already_final_count: alreadyFinalCount,
        missing_count: missingCount,
        errors,
      });
      return;
    }

    const { error: statusUpdateError } = await supabase
      .from("claims")
      .update({ status: "ready_to_file" })
      .eq("id", claim.id);

    if (statusUpdateError) {
      console.error(
        "Failed to update claim status to ready_to_file:",
        statusUpdateError
      );
    }

    const responseBody: FinalisePackSuccessResponse = {
      ok: true,
      claimId: claim.id,
      locked_projects_count: lockedCount,
      already_final_count: alreadyFinalCount,
      missing_count: missingCount,
      errors,
    };

    res.status(200).json(responseBody);
  } catch (error: any) {
    console.error("Error in finalise-pack handler:", error);
    res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Failed to finalise narratives and mark claim as ready",
    });
  }
}