import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SidekickProjectComment = Database["public"]["Tables"]["sidekick_project_comments"]["Row"];
type SidekickProjectCommentInsert = Database["public"]["Tables"]["sidekick_project_comments"]["Insert"];

export const sidekickCommentService = {
  async createComment(data: SidekickProjectCommentInsert): Promise<SidekickProjectComment> {
    const { data: comment, error } = await supabase
      .from("sidekick_project_comments")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return comment;
  },

  async addComment(
    projectId: string,
    payload: { body: string; author_role: string }
  ): Promise<SidekickProjectComment> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    return this.createComment({
      project_id: projectId,
      author_id: user.id,
      author_role: payload.author_role,
      body: payload.body,
    } as SidekickProjectCommentInsert);
  },

  async getCommentsByProject(projectId: string): Promise<SidekickProjectComment[]> {
    const { data, error } = await supabase
      .from("sidekick_project_comments")
      .select(`
        *,
        profiles!sidekick_project_comments_author_id_fkey (
          email,
          full_name
        )
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};