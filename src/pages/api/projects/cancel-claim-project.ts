import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

type CancelClaimProjectRequest = {
  claimProjectId?: string;
  sidekickProjectId?: string;
  reason?: string | null;
};

type CancelClaimProjectResponse = { success: true } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CancelClaimProjectResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { claimProjectId, sidekickProjectId } =
    req.body as CancelClaimProjectRequest;

  if (!claimProjectId && !sidekickProjectId) {
    return res
      .status(400)
      .json({ error: "Missing claimProjectId or sidekickProjectId" });
  }

  try {
    const supabase = supabaseServer;

    if (claimProjectId) {
      const { error: deleteClaimError } = await supabase
        .from("claim_projects")
        .delete()
        .eq("id", claimProjectId);

      if (deleteClaimError) {
        console.error(
          "[api/projects/cancel-claim-project] Delete claim_projects error:",
          {
            claimProjectId,
            error: deleteClaimError,
          }
        );
        return res
          .status(500)
          .json({ error: "Failed to delete claim project" });
      }
    }

    if (sidekickProjectId) {
      const { error: deleteSidekickError } = await supabase
        .from("sidekick_projects")
        .delete()
        .eq("id", sidekickProjectId);

      if (deleteSidekickError) {
        console.error(
          "[api/projects/cancel-claim-project] Delete sidekick_projects error:",
          {
            sidekickProjectId,
            error: deleteSidekickError,
          }
        );
        return res
          .status(500)
          .json({ error: "Failed to delete Sidekick project" });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(
      "[api/projects/cancel-claim-project] Unexpected error:",
      error
    );
    return res
      .status(500)
      .json({ error: "Unexpected error while deleting project" });
  }
}