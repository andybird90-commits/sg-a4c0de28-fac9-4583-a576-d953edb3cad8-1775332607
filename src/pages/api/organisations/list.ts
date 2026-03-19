import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

type OrganisationListItem = {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
};

type ApiResponse =
  | { ok: true; organisations: OrganisationListItem[] }
  | { ok: false; message: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ ok: false, message: "Missing authorization token" });
    return;
  }

  try {
    const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !authData?.user) {
      res.status(401).json({ ok: false, message: "Invalid or expired session" });
      return;
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerProfileError } = await supabaseServer
      .from("profiles")
      .select("id, internal_role")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileError || !callerProfile) {
      res.status(403).json({ ok: false, message: "Unable to validate permissions" });
      return;
    }

    const internalRole = callerProfile.internal_role;
    const allowed = internalRole === "admin" || internalRole === "director";

    if (!allowed) {
      res.status(403).json({ ok: false, message: "Insufficient permissions" });
      return;
    }

    const { data, error } = await supabaseServer
      .from("organisations")
      .select("id, name, organisation_code, sidekick_enabled")
      .order("name", { ascending: true });

    if (error) {
      res.status(500).json({ ok: false, message: "Failed to load organisations" });
      return;
    }

    res.status(200).json({ ok: true, organisations: (data ?? []) as OrganisationListItem[] });
  } catch (e) {
    res.status(500).json({ ok: false, message: "Failed to load organisations" });
  }
}