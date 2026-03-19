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

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ success: false, error: "Missing authorization token" });
    return;
  }

  const {
    orgId,
    userId,
    role,
    replaceExisting,
  }: JoinOrganisationRequestBody & { replaceExisting?: boolean } = req.body ?? {};

  if (!orgId || !userId) {
    res.status(400).json({
      success: false,
      error: "orgId and userId are required",
    });
    return;
  }

  const safeRole = role && role.trim().length > 0 ? role : "client";

  try {
    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !authData?.user) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired session",
      });
      return;
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerProfileError } = await supabaseServer
      .from("profiles")
      .select("id, internal_role")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileError || !callerProfile) {
      res.status(403).json({ success: false, error: "Unable to validate permissions" });
      return;
    }

    const internalRole = callerProfile.internal_role;
    const allowed = internalRole === "admin" || internalRole === "director";

    if (!allowed) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }

    if (replaceExisting) {
      const { error: deleteError } = await supabaseServer
        .from("organisation_users")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        console.error("[api/organisations/join] Delete existing memberships error:", deleteError);
        res.status(500).json({ success: false, error: "Failed to replace organisation membership" });
        return;
      }
    }

    const { error: insertError } = await supabaseServer.from("organisation_users").insert({
      org_id: orgId,
      user_id: userId,
      role: safeRole,
    });

    if (insertError) {
      console.error("[api/organisations/join] Insert error:", insertError);
      res.status(500).json({
        success: false,
        error:
          (insertError as any)?.message ||
          (insertError as any)?.details ||
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