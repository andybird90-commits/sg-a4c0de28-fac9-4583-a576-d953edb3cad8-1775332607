import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TimelineRow = Database["public"]["Tables"]["sidekick_project_timeline_items"]["Row"];
type TimelineInsert = Database["public"]["Tables"]["sidekick_project_timeline_items"]["Insert"];
type TimelineUpdate = Database["public"]["Tables"]["sidekick_project_timeline_items"]["Update"];

export type SidekickTimelineItem = TimelineRow;

export const sidekickTimelineService = {
  async getByProject(projectId: string): Promise<SidekickTimelineItem[]> {
    const { data, error } = await supabase
      .from("sidekick_project_timeline_items")
      .select("*")
      .eq("project_id", projectId)
      .order("start_date", { ascending: true });

    if (error) {
      console.error("[sidekickTimelineService.getByProject] Error:", error);
      throw error;
    }

    return (data as SidekickTimelineItem[]) || [];
  },

  async createItem(input: {
    project_id: string;
    name: string;
    start_date: string;
    end_date: string;
  }): Promise<SidekickTimelineItem> {
    const payload: TimelineInsert = {
      project_id: input.project_id,
      name: input.name,
      start_date: input.start_date,
      end_date: input.end_date,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? "",
    };

    const { data, error } = await supabase
      .from("sidekick_project_timeline_items")
      .insert(payload)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[sidekickTimelineService.createItem] Error:", error);
      throw error;
    }

    if (!data) {
      throw new Error("Failed to create timeline item");
    }

    return data as SidekickTimelineItem;
  },

  async updateItem(
    id: string,
    updates: Partial<Pick<SidekickTimelineItem, "name" | "start_date" | "end_date">>
  ): Promise<SidekickTimelineItem> {
    const payload: TimelineUpdate = {
      name: updates.name ?? undefined,
      start_date: updates.start_date ?? undefined,
      end_date: updates.end_date ?? undefined,
    };

    const { data, error } = await supabase
      .from("sidekick_project_timeline_items")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[sidekickTimelineService.updateItem] Error:", error);
      throw error;
    }

    if (!data) {
      throw new Error("Failed to update timeline item");
    }

    return data as SidekickTimelineItem;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from("sidekick_project_timeline_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[sidekickTimelineService.deleteItem] Error:", error);
      throw error;
    }
  },
};