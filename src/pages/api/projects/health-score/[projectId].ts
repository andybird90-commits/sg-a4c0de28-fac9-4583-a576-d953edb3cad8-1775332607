import type { NextApiRequest, NextApiResponse } from "next";
import { recalculateProjectHealth, getCachedProjectHealth } from "@/services/projectHealthService";

type HealthScoreResponse = {
  innovation_density_score: number | null;
  documentation_strength: number | null;
  overall_health_score: number | null;
  health_rating: string | null;
  risk_level: string | null;
  reasons_json: unknown | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthScoreResponse | { error: string }>,
): Promise<void> {
  const { projectId } = req.query;

  if (!projectId || typeof projectId !== "string") {
    res.status(400).json({ error: "Missing projectId" });
    return;
  }

  try {
    if (req.method === "GET") {
      const cached = await getCachedProjectHealth(projectId);

      if (!cached) {
        const calculated = await recalculateProjectHealth(projectId);
        if (!calculated) {
          res.status(500).json({ error: "Unable to calculate project health" });
          return;
        }

        res.status(200).json({
          innovation_density_score: calculated.innovation_density_score,
          documentation_strength: calculated.documentation_strength,
          overall_health_score: calculated.overall_health_score,
          health_rating: calculated.health_rating,
          risk_level: calculated.risk_level,
          reasons_json: calculated.reasons_json,
        });
        return;
      }

      res.status(200).json({
        innovation_density_score: cached.innovation_density_score,
        documentation_strength: cached.documentation_strength,
        overall_health_score: cached.overall_health_score,
        health_rating: cached.health_rating,
        risk_level: cached.risk_level,
        reasons_json: cached.reasons_json,
      });
      return;
    }

    if (req.method === "POST") {
      const recalculated = await recalculateProjectHealth(projectId);
      if (!recalculated) {
        res.status(500).json({ error: "Unable to recalculate project health" });
        return;
      }

      res.status(200).json({
        innovation_density_score: recalculated.innovation_density_score,
        documentation_strength: recalculated.documentation_strength,
        overall_health_score: recalculated.overall_health_score,
        health_rating: recalculated.health_rating,
        risk_level: recalculated.risk_level,
        reasons_json: recalculated.reasons_json,
      });
      return;
    }

    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Project health API error", error);
    res.status(500).json({ error: "Unexpected error" });
  }
}