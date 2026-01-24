import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EvidenceItem = Database["public"]["Tables"]["evidence_items"]["Row"];
type EvidenceFile = Database["public"]["Tables"]["evidence_files"]["Row"];

export interface EvidenceWithFiles extends EvidenceItem {
  evidence_files: EvidenceFile[];
  project_name?: string;
}

export const evidenceService = {
  async getEvidence(
    orgId: string,
    projectId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<EvidenceWithFiles[]> {
    let query = supabase
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*),
        projects (name)
      `)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    if (fromDate) {
      query = query.gte("created_at", fromDate);
    }

    if (toDate) {
      query = query.lte("created_at", toDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching evidence:", error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      ...item,
      project_name: item.projects?.name || null,
      evidence_files: item.evidence_files || []
    })) as EvidenceWithFiles[];
  },

  async getEvidenceById(id: string): Promise<EvidenceWithFiles | null> {
    const { data, error } = await supabase
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*),
        projects (name)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching evidence by ID:", error);
      throw error;
    }

    if (!data) return null;

    return {
      ...data,
      project_name: data.projects?.name || null,
      evidence_files: data.evidence_files || []
    } as EvidenceWithFiles;
  },

  async createEvidence(evidence: {
    org_id: string;
    project_id?: string;
    type: string;
    description?: string;
    tag?: string;
    location?: string;
    claim_year?: number;
  }): Promise<EvidenceItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("evidence_items")
      .insert({
        ...evidence,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating evidence:", error);
      throw error;
    }

    return data as EvidenceItem;
  },

  async uploadEvidenceFile(
    evidenceId: string,
    file: File
  ): Promise<EvidenceFile> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${evidenceId}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("evidence-files")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      throw uploadError;
    }

    const { data, error } = await supabase
      .from("evidence_files")
      .insert({
        evidence_id: evidenceId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating evidence file record:", error);
      throw error;
    }

    return data as EvidenceFile;
  },

  async getSignedUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from("evidence-files")
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error("Error creating signed URL:", error);
      throw error;
    }

    return data.signedUrl;
  },

  async deleteEvidence(id: string): Promise<void> {
    const { error } = await supabase
      .from("evidence_items")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting evidence:", error);
      throw error;
    }
  },

  async deleteFile(fileId: string, filePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from("evidence-files")
      .remove([filePath]);

    if (storageError) {
      console.error("Error removing file from storage:", storageError);
      throw storageError;
    }

    const { error: dbError } = await supabase
      .from("evidence_files")
      .delete()
      .eq("id", fileId);

    if (dbError) {
      console.error("Error deleting file record:", dbError);
      throw dbError;
    }
  }
};