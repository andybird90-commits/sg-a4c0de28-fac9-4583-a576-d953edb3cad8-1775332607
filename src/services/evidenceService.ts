import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type EvidenceItem = Database["sidekick"]["Tables"]["evidence_items"]["Row"];
type EvidenceItemInsert = Database["sidekick"]["Tables"]["evidence_items"]["Insert"];
type EvidenceFile = Database["sidekick"]["Tables"]["evidence_files"]["Row"];

export interface EvidenceWithFiles extends EvidenceItem {
  evidence_files: EvidenceFile[];
  creator_name?: string;
  project_name?: string;
}

export const evidenceService = {
  async getEvidenceList(orgId: string, projectId?: string, fromDate?: string, toDate?: string): Promise<EvidenceWithFiles[]> {
    let query = supabase
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*),
        profiles!evidence_items_created_by_fkey (full_name),
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

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      creator_name: item.profiles?.full_name || "Unknown",
      project_name: item.projects?.name || "No Project"
    }));
  },

  async getEvidenceById(id: string): Promise<EvidenceWithFiles | null> {
    const { data, error } = await supabase
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*),
        profiles!evidence_items_created_by_fkey (full_name),
        projects (name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) return null;

    return {
      ...data,
      creator_name: data.profiles?.full_name || "Unknown",
      project_name: data.projects?.name || "No Project"
    };
  },

  async createEvidence(evidence: EvidenceItemInsert): Promise<EvidenceItem> {
    const { data, error } = await supabase
      .from("evidence_items")
      .insert(evidence)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvidence(id: string): Promise<void> {
    const { error } = await supabase
      .from("evidence_items")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async uploadFile(
    orgId: string,
    evidenceId: string,
    file: File
  ): Promise<EvidenceFile> {
    const fileId = crypto.randomUUID();
    const extension = file.name.split(".").pop();
    const storagePath = `org/${orgId}/evidence/${evidenceId}/${fileId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("rd-sidekick")
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from("evidence_files")
      .insert({
        evidence_id: evidenceId,
        org_id: orgId,
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from("rd-sidekick")
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  },

  async deleteFile(fileId: string, storagePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from("rd-sidekick")
      .remove([storagePath]);

    if (storageError) throw storageError;

    const { error } = await supabase
      .from("evidence_files")
      .delete()
      .eq("id", fileId);

    if (error) throw error;
  }
};