import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SidekickCostAdvice = Database["public"]["Tables"]["sidekick_project_cost_advice"]["Row"];
export type SidekickCostAdviceInsert = Database["public"]["Tables"]["sidekick_project_cost_advice"]["Insert"];

class SidekickCostAdviceService {
  async getByProject(projectId: string): Promise<SidekickCostAdvice[] | null> {
    const { data, error } = await supabase
      .from("sidekick_project_cost_advice")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[sidekickCostAdviceService.getByProject] Error:", error);
      throw error;
    }

    return data;
  }

  async createAdvice(payload: SidekickCostAdviceInsert): Promise<SidekickCostAdvice> {
    const { data, error } = await supabase
      .from("sidekick_project_cost_advice")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[sidekickCostAdviceService.createAdvice] Error:", error);
      throw error;
    }

    return data;
  }

  async updateAdvice(id: string, updates: Partial<SidekickCostAdviceInsert>): Promise<SidekickCostAdvice> {
    const { data, error } = await supabase
      .from("sidekick_project_cost_advice")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[sidekickCostAdviceService.updateAdvice] Error:", error);
      throw error;
    }

    return data;
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

export const sidekickCostAdviceService = new SidekickCostAdviceService();