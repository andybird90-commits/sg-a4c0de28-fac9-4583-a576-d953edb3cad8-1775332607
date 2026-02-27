import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    res.status(400).json({ connected: false, error: "Missing userId" });
    return;
  }

  try {
    const { data, error } = await supabaseServer
      .from("calendar_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "m365")
      .maybeSingle();

    if (error) {
      console.error("Error checking calendar account status:", error);
      res.status(500).json({ connected: false, error: "Failed to check calendar status" });
      return;
    }

    res.status(200).json({ connected: !!data });
  } catch (statusError) {
    console.error("Unexpected error in calendar status handler:", statusError);
    res.status(500).json({ connected: false, error: "Unexpected error" });
  }
}