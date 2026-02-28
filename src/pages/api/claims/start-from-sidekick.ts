import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

type Claim = Database["public"]["Tables"]["claims"]["Row"];
type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

type StartFromSidekickProject = {
  id: string;
  name: string | null;
  description: string | null;
  sector: string | null;
  start_date: string | null;
  end_date: string | null;
};

type StartFromSidekickRequest = {
  orgId?: string;
  claimYear?: number;
  projects?: StartFromSidekickProject[];
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

  const { orgId, claimYear, projects, userId } =
    req.body as StartFromSidekickRequest;

  const projectsArray = Array.isArray(projects) ? projects : [];

  if (!orgId || !claimYear || projectsArray.length === 0) {
    res.status(400).json({
      error:
        "orgId, claimYear and at least one project with Sidekick details are required",
    });
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    const claimId = randomUUID();

    const { error: claimError } = await supabaseServer.from("claims").insert({
      id: claimId,
      org_id: orgId,
      claim_year: claimYear,
      bd_owner_id: userId ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (claimError) {
      console.error("[start-from-sidekick] Error creating claim:", claimError);
      res.status(500).json({
        error: `claims insert: ${
          (claimError as any)?.message ||
          (claimError as any)?.details ||
          "Failed to create claim"
        }`,
      });
      return;
    }

    const claimProjectInserts = projectsArray.map((p) => ({
      claim_id: claimId,
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

    const { error: claimProjectsError } = await supabaseServer
      .from("claim_projects")
      .insert(claimProjectInserts);

    if (claimProjectsError) {
      console.error(
        "[start-from-sidekick] Error creating claim projects:",
        claimProjectsError
      );
      res.status(500).json({
        error: `claim_projects insert: ${
          (claimProjectsError as any)?.message ||
          (claimProjectsError as any)?.details ||
          "Failed to create claim projects"
        }`,
      });
      return;
    }

    const sidekickProjectIds = projectsArray.map((p) => p.id);

    if (sidekickProjectIds.length > 0) {
      const { error: updateSidekickError } = await supabaseServer
        .from("sidekick_projects")
        .update({
          claim_id: claimId,
          accepted_at: nowIso,
        })
        .in("id", sidekickProjectIds);

      if (updateSidekickError) {
        console.error(
          "[start-from-sidekick] Error updating sidekick projects:",
          updateSidekickError
        );
        // Non-fatal: claim and claim projects were created successfully
      }
    }

    const claimForResponse = {
      id: claimId,
      org_id: orgId,
      claim_year: claimYear,
    } as Claim;

    res.status(200).json({
      claim: claimForResponse,
      claimProjects: [] as ClaimProject[],
    });
  } catch (error) {
    console.error("[start-from-sidekick] Unexpected error:", error);
    res.status(500).json({ error: "Unexpected error starting claim" });
  }
}