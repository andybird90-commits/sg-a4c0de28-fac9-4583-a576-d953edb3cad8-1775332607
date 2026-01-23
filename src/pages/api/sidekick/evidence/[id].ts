import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid evidence ID" });
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await (supabase as any)
        .schema("sidekick")
        .from("evidence_items")
        .select(`
          *,
          evidence_files (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Evidence not found" });

      return res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching evidence:", error);
      return res.status(500).json({ error: "Failed to fetch evidence" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}