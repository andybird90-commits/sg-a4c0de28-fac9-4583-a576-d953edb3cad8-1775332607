import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { claim_id, org_id, evidence_ids } = req.body;

  if (!claim_id || !org_id || !evidence_ids || !Array.isArray(evidence_ids)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch evidence details from Sidekick
    const evidencePromises = evidence_ids.map(id =>
      (supabase as any)
        .schema("sidekick")
        .from("evidence_items")
        .select("*")
        .eq("id", id)
        .single()
    );

    const evidenceResults = await Promise.all(evidencePromises);
    
    // Prepare claim evidence records
    const claimEvidenceRecords = evidenceResults
      .filter(result => result.data && !result.error)
      .map(result => ({
        claim_id,
        org_id,
        sidekick_evidence_id: result.data.id,
        project_id: result.data.project_id || null,
        type: result.data.type,
        description: result.data.description,
        tag: result.data.tag,
        attached_by: user.id
      }));

    // Insert claim evidence records
    const { data, error } = await supabase
      .from("rd_claim_evidence")
      .insert(claimEvidenceRecords)
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      attached_count: data.length,
      data
    });
  } catch (error: any) {
    console.error("Error attaching evidence:", error);
    return res.status(500).json({ 
      error: "Failed to attach evidence",
      details: error.message 
    });
  }
}