import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

type ClaimProject = Database["public"]["Tables"]["claim_projects"]["Row"];

type SuccessResponse = {
  project: ClaimProject | null;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;
  const sidekickProjectId = Array.isArray(id) ? id[0] : id;

  if (!sidekickProjectId) {
    res.status(400).json({ error: "Missing sidekick project id" });
    return;
  }

  try {
    const { data, error } = await supabaseServer
      .from("claim_projects")
      .select("*")
      .eq("source_sidekick_project_id", sidekickProjectId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[api/projects/by-sidekick] Error fetching claim project:", error);
      res.status(500).json({ error: "Failed to load linked claim project" });
      return;
    }

    const project = (data && data.length > 0 ? data[0] : null) as ClaimProject | null;
    res.status(200).json({ project });
  } catch (err) {
    console.error("[api/projects/by-sidekick] Unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}