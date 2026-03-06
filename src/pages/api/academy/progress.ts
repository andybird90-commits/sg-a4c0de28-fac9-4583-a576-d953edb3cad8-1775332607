import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import type { Database } from "@/integrations/supabase/types";

type ModuleProgressRow = Database["public"]["Tables"]["academy_module_progress"]["Row"];

interface ModuleProgressResponseItem {
  moduleId: string;
  quizPassed: boolean;
  completedAt: string | null;
  lastScore: number | null;
}

interface ModuleProgressResponse {
  modules: ModuleProgressResponseItem[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ModuleProgressResponse>,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({
      modules: [],
      error: "Method not allowed.",
    });
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser();

  if (userError || !user) {
    res.status(200).json({
      modules: [],
      error: undefined,
    });
    return;
  }

  const { data, error } = await supabaseServer
    .from("academy_module_progress")
    .select("module_id, quiz_passed, completed_at, last_score")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching academy module progress", error);
    res.status(500).json({
      modules: [],
      error: "Unable to load module progress.",
    });
    return;
  }

  const rows = data ?? [];

  const modules: ModuleProgressResponseItem[] = rows.map((row) => ({
    moduleId: row.module_id,
    quizPassed: row.quiz_passed,
    completedAt: row.completed_at,
    lastScore: row.last_score,
  }));

  res.status(200).json({
    modules,
  });
}