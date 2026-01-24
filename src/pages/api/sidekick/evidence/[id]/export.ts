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
      // Fetch evidence with files
      const { data: evidence, error: evidenceError } = await (supabase as any)
        .schema("sidekick")
        .from("evidence_items")
        .select(`
          *,
          evidence_files (*)
        `)
        .eq("id", id)
        .single();

      if (evidenceError) throw evidenceError;
      if (!evidence) return res.status(404).json({ error: "Evidence not found" });

      // Generate signed URLs for files
      if (evidence.evidence_files && evidence.evidence_files.length > 0) {
        const filesWithUrls = await Promise.all(
          evidence.evidence_files.map(async (file: any) => {
            const { data: signedUrl } = await (supabase as any)
              .schema("sidekick")
              .storage
              .from("evidence-files")
              .createSignedUrl(file.file_path, 3600); // 1 hour expiry

            return {
              ...file,
              signed_url: signedUrl?.signedUrl || null
            };
          })
        );

        evidence.evidence_files = filesWithUrls;
      }

      return res.status(200).json(evidence);
    } catch (error) {
      console.error("Error fetching evidence for export:", error);
      return res.status(500).json({ error: "Failed to fetch evidence" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}