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

    if (error) {
      console.error("Error creating evidence:", error);
      throw new Error(error.message || "Failed to create evidence");
    }
    return evidence;
  },

  async createEvidenceNote(
    projectId: string,
    payload: { title: string; body: string | null }
  ): Promise<SidekickEvidenceItem> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    return this.createEvidence({
      project_id: projectId,
      created_by: user.id,
      type: "note",
      title: payload.title,
      body: payload.body,
    } as SidekickEvidenceInsert);
  },

  async createEvidenceFile(
    projectId: string,
    file: File,
    payload: { title: string; description: string | null }
  ): Promise<SidekickEvidenceItem> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const filePath = await this.uploadFile(file, projectId);

    return this.createEvidence({
      project_id: projectId,
      created_by: user.id,
      type: "file",
      title: payload.title,
      body: payload.description,
      file_path: filePath,
    } as SidekickEvidenceInsert);
  },

  async createEvidenceLink(
    projectId: string,
    payload: { title: string; url: string; description: string | null }
  ): Promise<SidekickEvidenceItem> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    return this.createEvidence({
      project_id: projectId,
      created_by: user.id,
      type: "link",
      title: payload.title,
      body: payload.description,
      external_url: payload.url,
    } as SidekickEvidenceInsert);
  },

  async getEvidenceById(evidenceId: string): Promise<SidekickEvidenceItem> {
    const { data, error } = await supabase
      .from("sidekick_evidence_items")
      .select("*")
      .eq("id", evidenceId)
      .single();

    if (error) {
      console.error("Error fetching evidence:", error);
      throw new Error(error.message || "Failed to fetch evidence");
    }
    return data;
  },

  async getEvidenceByProject(projectId: string): Promise<SidekickEvidenceItem[]> {
    const { data, error } = await supabase
      .from("sidekick_evidence_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching evidence:", error);
      throw new Error(error.message || "Failed to fetch evidence");
    }
    return data || [];
  },

  async getEvidenceByCompany(companyId: string): Promise<SidekickEvidenceItem[]> {
    const { data, error } = await supabase
      .from("sidekick_evidence_items")
      .select(`
        *,
        sidekick_projects!inner(company_id, name)
      `)
      .eq("sidekick_projects.company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching evidence by company:", error);
      throw new Error(error.message || "Failed to fetch evidence");
    }
    return data || [];
  },

  async updateEvidence(evidenceId: string, updates: Partial<SidekickEvidenceInsert>): Promise<SidekickEvidenceItem> {
    const { data, error } = await supabase
      .from("sidekick_evidence_items")
      .update(updates)
      .eq("id", evidenceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating evidence:", error);
      throw new Error(error.message || "Failed to update evidence");
    }
    return data;
  },

  async deleteEvidence(evidenceId: string): Promise<void> {
    const { error } = await supabase
      .from("sidekick_evidence_items")
      .delete()
      .eq("id", evidenceId);

    if (error) {
      console.error("Error deleting evidence:", error);
      throw new Error(error.message || "Failed to delete evidence");
    }
  },

  async uploadFile(file: File, projectId: string): Promise<string> {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;
      const filePath = `sidekick-evidence/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        throw new Error(uploadError.message || "Failed to upload file");
      }

      return filePath;
    } catch (error: any) {
      console.error("File upload error:", error);
      throw new Error(error.message || "Failed to upload file");
    }
  },

  async getSignedUrl(filePath: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from("evidence-files")
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error("Error creating signed URL:", error);
        throw new Error(error.message || "Failed to get file URL");
      }

      return data.signedUrl;
    } catch (error: any) {
      console.error("Signed URL error:", error);
      throw new Error(error.message || "Failed to get file URL");
    }
  }
};