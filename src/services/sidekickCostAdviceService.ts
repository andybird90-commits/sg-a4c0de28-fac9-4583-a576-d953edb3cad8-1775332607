import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SidekickCostAdvice = Database["public"]["Tables"]["sidekick_project_cost_advice"]["Row"];
type SidekickCostAdviceInsert = Database["public"]["Tables"]["sidekick_project_cost_advice"]["Insert"];

class SidekickCostAdviceService {
  async getByProject(projectId: string): Promise<SidekickCostAdvice[]> {
    const { data, error } = await supabase
      .from("sidekick_project_cost_advice")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[sidekickCostAdviceService.getByProject] Error:", error);
      throw error;
    }

    return data ?? [];
  }

  async createAdvice(input: {
    project_id: string;
    created_by: string;
    cost_type: SidekickCostAdvice["cost_type"];
    amount: number;
    description?: string | null;
    notes?: string | null;
  }): Promise<SidekickCostAdvice | null> {
    const payload: SidekickCostAdviceInsert = {
      project_id: input.project_id,
      created_by: input.created_by,
      cost_type: input.cost_type,
      amount: input.amount,
      description: input.description ?? null,
      notes: input.notes ?? null,
    };

    const { data, error } = await supabase
      .from("sidekick_project_cost_advice")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[sidekickCostAdviceService.createAdvice] Error:", error);
      throw error;
    }

    return data ?? null;
  }

  async deleteAdvice(id: string): Promise<void> {
    const { error } = await supabase
      .from("sidekick_project_cost_advice")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[sidekickCostAdviceService.deleteAdvice] Error:", error);
      throw error;
    }
  }
}

export type { SidekickCostAdvice };
export const sidekickCostAdviceService = new SidekickCostAdviceService();