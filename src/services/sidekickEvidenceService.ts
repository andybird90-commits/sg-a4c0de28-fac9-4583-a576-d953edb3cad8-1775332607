import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SidekickEvidenceItem = Database["public"]["Tables"]["sidekick_evidence_items"]["Row"];
type SidekickEvidenceInsert = Database["public"]["Tables"]["sidekick_evidence_items"]["Insert"];

export const sidekickEvidenceService = {
  async createEvidence(data: SidekickEvidenceInsert): Promise<SidekickEvidenceItem> {
    const { data: evidence, error } = await supabase
      .from("sidekick_evidence_items")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return evidence;
  },

  async getEvidenceByProject(projectId: string): Promise<SidekickEvidenceItem[]> {
    const { data, error } = await supabase
      .from("sidekick_evidence_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateEvidence(evidenceId: string, updates: Partial<SidekickEvidenceInsert>): Promise<SidekickEvidenceItem> {
    const { data, error } = await supabase
      .from("sidekick_evidence_items")
      .update(updates)
      .eq("id", evidenceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvidence(evidenceId: string): Promise<void> {
    const { error } = await supabase
      .from("sidekick_evidence_items")
      .delete()
      .eq("id", evidenceId);

    if (error) throw error;
  },

  async uploadFile(file: File, projectId: string): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${projectId}/${Date.now()}.${fileExt}`;
    const filePath = `sidekick-evidence/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("evidence-files")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("evidence-files")
      .getPublicUrl(filePath);

    return filePath;
  },
};