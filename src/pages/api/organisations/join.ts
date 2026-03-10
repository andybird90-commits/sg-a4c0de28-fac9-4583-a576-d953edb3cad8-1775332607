import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

interface JoinOrganisationRequestBody {
  orgId?: string;
  userId?: string;
  role?: string;
}

interface JoinOrganisationSuccessResponse {
  success: true;
}

interface JoinOrganisationErrorResponse {
  success: false;
  error: string;
}

type JoinOrganisationResponse =
  | JoinOrganisationSuccessResponse
  | JoinOrganisationErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JoinOrganisationResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
    return;
  }

  const { orgId, userId, role }: JoinOrganisationRequestBody = req.body ?? {};

  if (!orgId || !userId) {
    res.status(400).json({
      success: false,
      error: "orgId and userId are required",
    });
    return;
  }

  const safeRole = role && role.trim().length > 0 ? role : "client";

  try {
    const { error } = await supabaseServer.from("organisation_users").insert({
      org_id: orgId,
      user_id: userId,
      role: safeRole,
    });

    if (error) {
      console.error("[api/organisations/join] Insert error:", error);
      res.status(500).json({
        success: false,
        error:
          (error as any)?.message ||
          (error as any)?.details ||
          "Failed to join organisation",
      });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[api/organisations/join] Unexpected error:", err);
    res.status(500).json({
      success: false,
      error: "Unexpected server error while joining organisation",
    });
  }
}