import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

type Claim = Database["public"]["Tables"]["claims"]["Row"];
type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

type StartFromSidekickRequest = {
  orgId?: string;
  claimYear?: number;
  sidekickProjectIds?: string[];
  userId?: string;
};

type StartFromSidekickResponse =
  | {
      claim: Claim;
      claimProjects: ClaimProject[];
    }
  | {
      error: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StartFromSidekickResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { orgId, claimYear, sidekickProjectIds, userId } =
    req.body as StartFromSidekickRequest;

  if (!orgId || !claimYear || !Array.isArray(sidekickProjectIds) || sidekickProjectIds.length === 0) {
    res.status(400).json({
      error: "orgId, claimYear and at least one sidekickProjectId are required",
    });
    return;
  }

  try {
    const { data: claim, error: claimError } = await supabaseServer
      .from("claims")
      .insert({
        org_id: orgId,
        claim_year: claimYear,
      })
      .select("*")
      .single();

    if (claimError || !claim) {
      console.error("[start-from-sidekick] Error creating claim:", claimError);
      res.status(500).json({ error: "Failed to create claim" });
      return;
    }

    const { data: sidekickProjects, error: sidekickError } = await supabaseServer
      .from("sidekick_projects")
      .select("*")
      .in("id", sidekickProjectIds);

    if (sidekickError) {
      console.error(
        "[start-from-sidekick] Error loading sidekick projects:",
        sidekickError
      );
      res.status(500).json({ error: "Failed to load projects" });
      return;
    }

    const projectsArray = Array.isArray(sidekickProjects)
      ? sidekickProjects
      : [];

    if (projectsArray.length === 0) {
      res.status(400).json({ error: "No matching Sidekick projects found" });
      return;
    }

    const nowIso = new Date().toISOString();

    const claimProjectInserts = projectsArray.map((p) => ({
      claim_id: claim.id,
      org_id: orgId,
      name: p.name,
      description: p.description,
      rd_theme: p.sector,
      start_date: p.start_date,
      end_date: p.end_date,
      source_sidekick_project_id: p.id,
      created_by: userId ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    }));

    const { data: insertedClaimProjects, error: claimProjectsError } =
      await supabaseServer
        .from("claim_projects")
        .insert(claimProjectInserts)
        .select("*");

    if (claimProjectsError) {
      console.error(
        "[start-from-sidekick] Error creating claim projects:",
        claimProjectsError
      );
      res.status(500).json({ error: "Failed to create claim projects" });
      return;
    }

    const { error: updateSidekickError } = await supabaseServer
      .from("sidekick_projects")
      .update({
        claim_id: claim.id,
        accepted_at: nowIso,
      })
      .in("id", sidekickProjectIds);

    if (updateSidekickError) {
      console.error(
        "[start-from-sidekick] Error updating sidekick projects:",
        updateSidekickError
      );
      // Non-fatal: we still return success for the claim creation itself
    }

    res.status(200).json({
      claim,
      claimProjects: (insertedClaimProjects as ClaimProject[]) || [],
    });
  } catch (error) {
    console.error("[start-from-sidekick] Unexpected error:", error);
    res.status(500).json({ error: "Unexpected error starting claim" });
  }
}