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
      const { data, error } = await supabase
        .from("evidence_items")
        .select(`
          *,
          evidence_files (*),
          projects (name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Evidence not found" });

      const filesWithUrls = await Promise.all(
        (data.evidence_files || []).map(async (file: any) => {
          try {
            const { data: urlData } = await supabase.storage
              .from("evidence-files")
              .createSignedUrl(file.file_path, 3600);

            return {
              ...file,
              signed_url: urlData?.signedUrl || null
            };
          } catch (err) {
            console.error("Error creating signed URL:", err);
            return { ...file, signed_url: null };
          }
        })
      );

      return res.status(200).json({
        ...data,
        project_name: data.projects?.name || null,
        evidence_files: filesWithUrls
      });
    } catch (error: any) {
      console.error("Error fetching evidence:", error);
      return res.status(500).json({ error: "Failed to fetch evidence" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}