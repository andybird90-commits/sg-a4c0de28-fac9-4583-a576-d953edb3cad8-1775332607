import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import { recalculateProjectHealth } from "@/services/projectHealthService";

type WarmCacheError = {
  projectId: string;
  message: string;
};

type WarmCacheResponse = {
  processed: number;
  errors: WarmCacheError[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WarmCacheResponse | { error: string }>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const {
      data: claimProjects,
      error: claimProjectsError,
    } = await supabaseServer.from("claim_projects").select("id");

    if (claimProjectsError) {
      console.error(
        "Warm health cache: failed to load claim_projects",
        claimProjectsError,
      );
      res.status(500).json({ error: "Failed to load claim projects" });
      return;
    }

    const errors: WarmCacheError[] = [];
    let processed = 0;

    const rows = (claimProjects || []) as { id: string }[];

    for (const row of rows) {
      try {
        const result = await recalculateProjectHealth(row.id);
        if (!result) {
          errors.push({
            projectId: row.id,
            message: "Unable to recalculate project health",
          });
        } else {
          processed += 1;
        }
      } catch (error) {
        console.error(
          "Warm health cache: error recalculating project health",
          row.id,
          error,
        );
        errors.push({
          projectId: row.id,
          message: "Unexpected error during recalculation",
        });
      }
    }

    res.status(200).json({ processed, errors });
  } catch (error) {
    console.error("Warm health cache: unexpected error", error);
    res.status(500).json({ error: "Unexpected error" });
  }
}