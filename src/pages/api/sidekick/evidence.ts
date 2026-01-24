import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

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
    let query = supabase
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*),
        projects (name)
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

    if (error) throw error;

    const evidence = (data || []).map((item: any) => ({
      ...item,
      project_name: item.projects?.name || null
    }));

    return res.status(200).json(evidence);
  } catch (error: any) {
    console.error("Error fetching evidence:", error);
    return res.status(500).json({ error: "Failed to fetch evidence" });
  }
}