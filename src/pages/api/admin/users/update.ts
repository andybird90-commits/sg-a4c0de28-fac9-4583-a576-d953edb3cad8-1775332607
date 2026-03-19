import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

const ALLOWED_INTERNAL_ROLES = ["bd", "technical", "commercial", "ops", "director", "admin"] as const;
type AllowedInternalRole = (typeof ALLOWED_INTERNAL_ROLES)[number];

const ALLOWED_PROFILE_ROLES = ["bdm", "feasibility", "admin", "finance", "hybrid"] as const;
type AllowedProfileRole = (typeof ALLOWED_PROFILE_ROLES)[number];

type ApiResponse =
  | { ok: true; user: { id: string; email: string | null; full_name: string | null; internal_role: string | null; role: string | null } }
  | { ok: false; message: string; detail?: unknown };

function parseBearerToken(req: NextApiRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [kind, token] = header.split(" ");
  if (kind?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function isAllowedInternalRole(value: unknown): value is AllowedInternalRole {
  return typeof value === "string" && (ALLOWED_INTERNAL_ROLES as readonly string[]).includes(value);
}

function isAllowedProfileRole(value: unknown): value is AllowedProfileRole {
  return typeof value === "string" && (ALLOWED_PROFILE_ROLES as readonly string[]).includes(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const token = parseBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, message: "Missing Authorization token" });
    return;
  }

  const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
  const caller = authData?.user ?? null;

  if (authError || !caller) {
    res.status(401).json({ ok: false, message: "Invalid session", detail: authError });
    return;
  }

  const { data: callerProfile, error: callerProfileError } = await (supabaseServer as any)
    .from("profiles")
    .select("id, internal_role")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerProfileError || !callerProfile) {
    res.status(403).json({ ok: false, message: "Unable to validate caller permissions", detail: callerProfileError });
    return;
  }

  const callerInternalRole = (callerProfile.internal_role as string | null) ?? null;
  if (callerInternalRole !== "admin" && callerInternalRole !== "director") {
    res.status(403).json({ ok: false, message: "Access denied" });
    return;
  }

  const body = req.body as { userId?: string; internal_role?: string | null; role?: string | null };
  const userId = body?.userId;

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ ok: false, message: "userId is required" });
    return;
  }

  const internalRoleRaw = body?.internal_role ?? null;
  const roleRaw = body?.role ?? null;

  const internal_role: AllowedInternalRole | null =
    internalRoleRaw === null ? null : isAllowedInternalRole(internalRoleRaw) ? internalRoleRaw : null;

  const role: AllowedProfileRole | null =
    roleRaw === null ? null : isAllowedProfileRole(roleRaw) ? roleRaw : null;

  if (internalRoleRaw !== null && internal_role === null) {
    res.status(400).json({
      ok: false,
      message: "Invalid internal_role value",
      detail: { allowed: ALLOWED_INTERNAL_ROLES, received: internalRoleRaw },
    });
    return;
  }

  if (roleRaw !== null && role === null) {
    res.status(400).json({
      ok: false,
      message: "Invalid role value",
      detail: { allowed: ALLOWED_PROFILE_ROLES, received: roleRaw },
    });
    return;
  }

  const { data: updated, error: updateError } = await (supabaseServer as any)
    .from("profiles")
    .update({
      internal_role,
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, email, full_name, internal_role, role")
    .maybeSingle();

  if (updateError || !updated) {
    res.status(500).json({ ok: false, message: "Failed to update user roles", detail: updateError });
    return;
  }

  res.status(200).json({ ok: true, user: updated });
}