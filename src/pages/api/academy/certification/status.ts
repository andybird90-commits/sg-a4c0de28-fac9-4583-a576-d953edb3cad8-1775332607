import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import { getCertificationEligibility } from "@/services/academyCertificationService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser();

  if (error || !user) {
    res.status(200).json({
      eligible: false,
      reason: "Sign in to view certification status.",
    });
    return;
  }

  const eligibility = await getCertificationEligibility(user.id);

  res.status(200).json({
    eligible: eligibility.eligible,
    reason: eligibility.reason,
  });
}