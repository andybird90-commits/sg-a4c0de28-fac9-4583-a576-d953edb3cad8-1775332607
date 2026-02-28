import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

type SuccessResponse = {
  project: ClaimProject;
};

type ErrorResponse = {
  error: string;
  debug?: Record<string, unknown>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { sidekickProjectId, userId } = req.body as {
    sidekickProjectId?: string;
    userId?: string;
  };

  console.log("[api/projects/send-to-team] Incoming body:", req.body);

  if (!sidekickProjectId || !userId) {
    res.status(400).json({ error: "Missing sidekickProjectId or userId" });
    return;
  }

  try {
    let claimProject: ClaimProject | null = null;

    const {
      data: projectsBySource,
      error: fetchErrorBySource,
    } = await supabaseServer
      .from("claim_projects")
      .select("*")
      .eq("source_sidekick_project_id", sidekickProjectId)
      .order("created_at", { ascending: false })
      .limit(1);

    const bySourceCount = projectsBySource?.length ?? 0;

    console.log("[api/projects/send-to-team] Query by source_sidekick_project_id:", {
      sidekickProjectId,
      count: bySourceCount,
      error: fetchErrorBySource,
    });

    if (fetchErrorBySource) {
      console.error(
        "[api/projects/send-to-team] Error fetching claim project by source_sidekick_project_id:",
        fetchErrorBySource
      );
      res.status(500).json({
        error: "Failed to load linked claim project",
        debug: {
          stage: "by_source",
          sidekickProjectId,
          fetchErrorBySource,
        },
      });
      return;
    }

    if (projectsBySource && projectsBySource.length > 0) {
      claimProject = projectsBySource[0] as ClaimProject;
    }

    let byIdCount = 0;
    let fetchErrorById: unknown = null;

    if (!claimProject) {
      const {
        data: projectsById,
        error,
      } = await supabaseServer
        .from("claim_projects")
        .select("*")
        .eq("id", sidekickProjectId)
        .order("created_at", { ascending: false })
        .limit(1);

      fetchErrorById = error;
      byIdCount = projectsById?.length ?? 0;

      console.log("[api/projects/send-to-team] Query by id (fallback):", {
        sidekickProjectId,
        count: byIdCount,
        error: fetchErrorById,
      });

      if (fetchErrorById) {
        console.error(
          "[api/projects/send-to-team] Error fetching claim project by id:",
          fetchErrorById
        );
        res.status(500).json({
          error: "Failed to load linked claim project",
          debug: {
            stage: "by_id",
            sidekickProjectId,
            fetchErrorById,
          },
        });
        return;
      }

      if (projectsById && projectsById.length > 0) {
        claimProject = projectsById[0] as ClaimProject;
      }
    }

    if (!claimProject) {
      console.warn(
        "[api/projects/send-to-team] No claim project found for Sidekick project id:",
        sidekickProjectId
      );
      res.status(404).json({
        error:
          "No linked claim project found for this Sidekick project. Please ask your R&D team to attach it to a claim.",
        debug: {
          sidekickProjectId,
          bySourceCount,
          byIdCount,
        },
      });
      return;
    }

    const previousStatus = (claimProject.workflow_status || "draft") as string;

    if (
      claimProject.workflow_status &&
      claimProject.workflow_status !== "draft" &&
      claimProject.workflow_status !== "revision_requested"
    ) {
      console.warn(
        "[api/projects/send-to-team] Project already sent or not in draft:",
        {
          id: claimProject.id,
          workflow_status: claimProject.workflow_status,
        }
      );
      res.status(400).json({
        error:
          "This project has already been sent to the R&D team or is no longer in draft.",
      });
      return;
    }

    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseServer
      .from("claim_projects")
      .update({
        workflow_status: "submitted_to_team",
        submitted_to_team_at: now,
        updated_at: now,
      })
      .eq("id", claimProject.id)
      .select()
      .single();

    console.log("[api/projects/send-to-team] Update result:", {
      id: claimProject.id,
      error: updateError,
      updated,
    });

    if (updateError || !updated) {
      console.error(
        "[api/projects/send-to-team] Error updating claim project:",
        updateError
      );
      res
        .status(500)
        .json({ error: "Failed to update project workflow status" });
      return;
    }

    const { error: historyError } = await supabaseServer
      .from("project_status_history")
      .insert({
        claim_project_id: claimProject.id,
        from_status: previousStatus,
        to_status: "submitted_to_team",
        changed_by: userId,
        notes: "Client submitted project for team review",
      });

    if (historyError) {
      console.error(
        "[api/projects/send-to-team] Failed to log status history:",
        historyError
      );
    } else {
      console.log(
        "[api/projects/send-to-team] Status history logged successfully for project:",
        claimProject.id
      );
    }

    res.status(200).json({ project: updated as ClaimProject });
  } catch (err) {
    console.error("[api/projects/send-to-team] Unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}