import { supabase } from "@/integrations/supabase/client";

export interface ProjectVoiceNote {
  id: string;
  project_id: string | null;
  org_id?: string | null;
  created_by_user_id?: string | null;
  original_audio_url?: string | null;
  transcript_raw?: string | null;
  transcript_cleaned?: string | null;
  ai_summary?: string | null;
  detected_project_name?: string | null;
  detection_confidence?: number | null;
  manually_confirmed?: boolean | null;
  created_at: string;
  updated_at?: string | null;
}

const supabaseAny = supabase as unknown as {
  from: (table: string) => any;
};

export const voiceNoteService = {
  async getByProject(projectId: string): Promise<ProjectVoiceNote[]> {
    const { data, error } = await supabaseAny
      .from("project_voice_notes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching project voice notes:", error);
      throw new Error(error.message || "Failed to load voice notes");
    }

    return (data as ProjectVoiceNote[]) ?? [];
  },

  async updateTranscript(id: string, transcript: string): Promise<ProjectVoiceNote> {
    const { data, error } = await supabaseAny
      .from("project_voice_notes")
      .update({
        transcript_cleaned: transcript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating transcript:", error);
      throw new Error(error.message || "Failed to update transcript");
    }

    return data as ProjectVoiceNote;
  },

  async moveToProject(id: string, newProjectId: string): Promise<ProjectVoiceNote> {
    const { data, error } = await supabaseAny
      .from("project_voice_notes")
      .update({
        project_id: newProjectId,
        manually_confirmed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error moving voice note:", error);
      throw new Error(error.message || "Failed to move voice note");
    }

    return data as ProjectVoiceNote;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabaseAny
      .from("project_voice_notes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting voice note:", error);
      throw new Error(error.message || "Failed to delete voice note");
    }
  },
};