import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

type Data =
  | { claimProject: unknown }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { sidekickProjectId, technical_understanding, challenges_uncertainties, qualifying_activities } =
    req.body as {
      sidekickProjectId?: string;
      technical_understanding?: string | null;
      challenges_uncertainties?: string | null;
      qualifying_activities?: string[] | null;
    };

  if (!sidekickProjectId) {
    res.status(400).json({ error: "Missing sidekickProjectId" });
    return;
  }

  const { data: claimProject, error: fetchError } = await supabaseServer
    .from("claim_projects")
    .select("*")
    .eq("source_sidekick_project_id", sidekickProjectId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching claim project for R&D details:", fetchError);
    res.status(500).json({ error: "Failed to load claim project" });
    return;
  }

  if (!claimProject) {
    res.status(404).json({
      error:
        "No linked claim project found. Send this project to the R&D team first, then add R&D details.",
    });
    return;
  }

  const safeActivities =
    Array.isArray(qualifying_activities) && qualifying_activities.length > 0
      ? qualifying_activities
      : null;

  const { data: updated, error: updateError } = await supabaseServer
    .from("claim_projects")
    .update({
      technical_understanding:
        typeof technical_understanding === "string"
          ? technical_understanding
          : null,
      challenges_uncertainties:
        typeof challenges_uncertainties === "string"
          ? challenges_uncertainties
          : null,
      qualifying_activities: safeActivities,
      updated_at: new Date().toISOString(),
    })
    .eq("id", claimProject.id)
    .select("*")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("Error updating R&D details on claim project:", updateError);
    res.status(500).json({ error: "Failed to save R&D details" });
    return;
  }

  res.status(200).json({ claimProject: updated });
}