import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid evidence ID" });
  }

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

    // Generate signed URLs for all files
    const filesWithUrls = await Promise.all(
      evidence.evidence_files.map(async (file: any) => {
        const { data: signedUrlData } = await supabase.storage
          .from("rd-sidekick")
          .createSignedUrl(file.storage_path, 3600);

        return {
          ...file,
          signed_url: signedUrlData?.signedUrl
        };
      })
    );

    return res.status(200).json({
      ...evidence,
      evidence_files: filesWithUrls
    });
  } catch (error) {
    console.error("Error exporting evidence:", error);
    return res.status(500).json({ error: "Failed to export evidence" });
  }
}