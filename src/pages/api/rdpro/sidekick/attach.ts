import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { sidekick_company_id, conexa_company_id, staff_user_id } = req.body as {
      sidekick_company_id?: string;
      conexa_company_id?: string;
      staff_user_id?: string;
    };

    if (!sidekick_company_id || !conexa_company_id || !staff_user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get Conexa company name
    const { data: conexaCompany, error: conexaError } = await supabaseServer
      .from("organisations")
      .select("name")
      .eq("id", conexa_company_id)
      .single();

    if (conexaError) throw conexaError;

    // Update Sidekick company with link
    const { error: updateError } = await supabaseServer
      .from("organisations")
      .update({
        linked_conexa_company_id: conexa_company_id,
        linked_conexa_company_name: conexaCompany?.name ?? null,
        linked_at: new Date().toISOString(),
        linked_by_user_id: staff_user_id,
        sidekick_enabled: true,
      })
      .eq("id", sidekick_company_id);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      message: "Business verified and linked successfully",
    });
  } catch (error: any) {
    console.error("Error linking company:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Internal server error" });
  }
}