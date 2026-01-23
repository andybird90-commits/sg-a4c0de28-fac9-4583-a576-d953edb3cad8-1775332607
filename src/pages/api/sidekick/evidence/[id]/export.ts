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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Evidence ID is required" });
  }

  try {
    // Fetch the evidence item with all files
    const { data: evidence, error } = await supabaseAdmin
      .schema("sidekick")
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching evidence:", error);
      return res.status(500).json({ error: "Failed to fetch evidence" });
    }

    if (!evidence) {
      return res.status(404).json({ error: "Evidence not found" });
    }

    // Generate signed URLs for all files (valid for 1 hour)
    const filesWithUrls = await Promise.all(
      (evidence.evidence_files || []).map(async (file: any) => {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from("rd-sidekick")
          .createSignedUrl(file.storage_path, 3600);

        return {
          ...file,
          signed_url: signedUrlData?.signedUrl || null
        };
      })
    );

    // Return the evidence record with signed URLs
    // RD Pro can use these URLs to download and import the files
    return res.status(200).json({
      message: "Evidence ready for export",
      data: {
        ...evidence,
        evidence_files: filesWithUrls
      },
      export_instructions: {
        note: "Use the signed_url field to download each file. URLs expire in 1 hour.",
        next_steps: "RD Pro should download these files and import them into its own storage system."
      }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}