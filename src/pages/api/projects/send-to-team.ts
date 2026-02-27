import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

type SuccessResponse = {
  project: ClaimProject;
};

type ErrorResponse = {
  error: string;
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

  if (!sidekickProjectId || !userId) {
    res.status(400).json({ error: "Missing sidekickProjectId or userId" });
    return;
  }

  try {
    const { data: projects, error: fetchError } = await supabaseServer
      .from("claim_projects")
      .select("*")
      .eq("source_sidekick_project_id", sidekickProjectId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[api/projects/send-to-team] Error fetching claim project:", fetchError);
      res.status(500).json({ error: "Failed to load linked claim project" });
      return;
    }

    const claimProject = (projects && projects.length > 0
      ? projects[0]
      : null) as ClaimProject | null;

    if (!claimProject) {
      res.status(404).json({
        error: "No linked claim project found for this Sidekick project. Please ask your R&D team to attach it to a claim.",
      });
      return;
    }

    const previousStatus = (claimProject.workflow_status ||
      "draft") as string;

    if (
      claimProject.workflow_status &&
      claimProject.workflow_status !== "draft" &&
      claimProject.workflow_status !== "revision_requested"
    ) {
      res.status(400).json({
        error: "This project has already been sent to the R&D team or is no longer in draft.",
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

    if (updateError || !updated) {
      console.error("[api/projects/send-to-team] Error updating claim project:", updateError);
      res.status(500).json({ error: "Failed to update project workflow status" });
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
    }

    res.status(200).json({ project: updated as ClaimProject });
  } catch (err) {
    console.error("[api/projects/send-to-team] Unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}