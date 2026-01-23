import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role client for API routes (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { org_id, project_id, from, to } = req.query;

  if (!org_id || typeof org_id !== "string") {
    return res.status(400).json({ error: "org_id is required" });
  }

  try {
    let query = supabaseAdmin
      .schema("sidekick")
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*)
      `)
      .eq("org_id", org_id)
      .order("created_at", { ascending: false });

    if (project_id && typeof project_id === "string") {
      query = query.eq("project_id", project_id);
    }

    if (from && typeof from === "string") {
      query = query.gte("created_at", from);
    }

    if (to && typeof to === "string") {
      query = query.lte("created_at", to);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching evidence:", error);
      return res.status(500).json({ error: "Failed to fetch evidence" });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}