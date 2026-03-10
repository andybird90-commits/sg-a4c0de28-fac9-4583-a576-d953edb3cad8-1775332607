import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

interface UpdateProgressBody {
  moduleId?: string;
  lastScore?: number;
  quizPassed?: boolean;
  completedAt?: string | null;
}

interface UpdateProgressResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateProgressResponse>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ success: false, error: "Method not allowed." });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser(token);

  if (userError || !user) {
    res.status(401).json({ success: false, error: "Not authenticated." });
    return;
  }

  const { moduleId, lastScore, quizPassed, completedAt } = req.body as UpdateProgressBody;

  if (!moduleId) {
    res.status(400).json({ success: false, error: "moduleId is required." });
    return;
  }

  try {
    const { error } = await supabaseServer
      .from("academy_module_progress")
      .upsert(
        {
          user_id: user.id,
          module_id: moduleId,
          last_score: typeof lastScore === "number" ? Math.round(lastScore) : null,
          quiz_passed: Boolean(quizPassed),
          completed_at: completedAt ?? null,
        },
        {
          onConflict: "user_id,module_id",
        },
      );

    if (error) {
      console.error("Error updating module progress", error);
      res.status(500).json({ success: false, error: "Failed to update module progress." });
      return;
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error("Unexpected error updating module progress", e);
    res.status(500).json({ success: false, error: "Unexpected error." });
  }
}