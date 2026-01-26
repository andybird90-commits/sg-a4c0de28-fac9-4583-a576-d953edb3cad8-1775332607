import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SidekickProject = Database["public"]["Tables"]["sidekick_projects"]["Row"];
type SidekickProjectInsert = Database["public"]["Tables"]["sidekick_projects"]["Insert"];
type SidekickProjectUpdate = Database["public"]["Tables"]["sidekick_projects"]["Update"];

export const sidekickProjectService = {
  async createProject(data: SidekickProjectInsert): Promise<SidekickProject> {
    const { data: project, error } = await supabase
      .from("sidekick_projects")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return project;
  },

  async getProjectsByOrganisation(organisationId: string): Promise<SidekickProject[]> {
    const { data, error } = await supabase
      .from("sidekick_projects")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getProjectById(projectId: string): Promise<SidekickProject | null> {
    const { data, error } = await supabase
      .from("sidekick_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  },

  async updateProject(projectId: string, updates: SidekickProjectUpdate): Promise<SidekickProject> {
    const { data, error } = await supabase
      .from("sidekick_projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markReadyForReview(projectId: string): Promise<SidekickProject> {
    return this.updateProject(projectId, {
      status: "ready_for_review",
      ready_for_review_at: new Date().toISOString(),
    });
  },

  async getProjectsForReview(statusFilter?: string): Promise<SidekickProject[]> {
    let query = supabase
      .from("sidekick_projects")
      .select("*, organisations(name, sidekick_enabled, linked_conexa_company_name)");

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    } else {
      query = query.in("status", ["ready_for_review", "in_review", "needs_changes"]);
    }

    const { data, error } = await query.order("ready_for_review_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async deleteProject(projectId: string): Promise<void> {
    const { error } = await supabase
      .from("sidekick_projects")
      .delete()
      .eq("id", projectId);

    if (error) throw error;
  },
};