import { supabase } from "@/integrations/supabase/client";
import { offlineQueue } from "@/lib/offlineQueue";

// Define strict types based on the schema we created
export type EvidenceItem = {
  id: string;
  org_id: string;
  project_id: string | null;
  created_by: string;
  type: 'image' | 'document' | 'note' | 'audio' | 'video';
  description: string | null;
  tag: string | null;
  claim_year: number | null;
  created_at: string;
};

export type EvidenceFile = {
  id: string;
  evidence_id: string;
  org_id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export interface EvidenceWithFiles extends EvidenceItem {
  evidence_files: EvidenceFile[];
  creator_name?: string;
  project_name?: string;
}

export const evidenceService = {
  async getEvidenceList(orgId: string, projectId?: string, fromDate?: string, toDate?: string): Promise<EvidenceWithFiles[]> {
    // Cast supabase to any to bypass schema type restriction for 'sidekick'
    let query = (supabase as any)
      .schema("sidekick")
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*)
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

    const { data: evidenceData, error: evidenceError } = await query;

    if (evidenceError) throw evidenceError;
    if (!evidenceData) return [];

    // Fetch related public data separately
    const userIds = [...new Set(evidenceData.map((item: any) => item.created_by))] as string[];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    
    const projectIds = [...new Set(evidenceData.map((item: any) => item.project_id).filter(Boolean))] as string[];
    let projects: any[] = [];
    if (projectIds.length > 0) {
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);
      projects = projectData || [];
    }

    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);
    const projectsMap = new Map(projects?.map((p: any) => [p.id, p.name]) || []);

    return evidenceData.map((item: any) => ({
      ...item,
      creator_name: profilesMap.get(item.created_by) || "Unknown",
      project_name: item.project_id ? (projectsMap.get(item.project_id) || "Unknown Project") : "No Project"
    })) as EvidenceWithFiles[];
  },

  async getEvidenceById(id: string): Promise<EvidenceWithFiles | null> {
    const { data, error } = await (supabase as any)
      .schema("sidekick")
      .from("evidence_items")
      .select(`
        *,
        evidence_files (*)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    let creatorName = "Unknown";
    let projectName = "No Project";

    if (data.created_by) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.created_by)
        .single();
      if (profile) creatorName = profile.full_name || "Unknown";
    }

    if (data.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", data.project_id)
        .single();
      if (project) projectName = project.name;
    }

    return {
      ...data,
      creator_name: creatorName,
      project_name: projectName
    } as EvidenceWithFiles;
  },

  async createEvidence(evidence: Partial<EvidenceItem>): Promise<EvidenceItem> {
    // Check for offline status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineId = `offline_${crypto.randomUUID()}`;
      const offlineItem = {
        ...evidence,
        id: offlineId,
        created_at: new Date().toISOString()
      } as EvidenceItem;

      offlineQueue.addItem({
        id: offlineId,
        action: "create_evidence",
        payload: evidence,
        timestamp: Date.now()
      });

      // Return local optimistic version
      return offlineItem;
    }

    const { data, error } = await (supabase as any)
      .schema("sidekick")
      .from("evidence_items")
      .insert(evidence)
      .select()
      .single();

    if (error) throw error;
    return data as EvidenceItem;
  },

  async deleteEvidence(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .schema("sidekick")
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error("Cannot upload files while offline. Please try again when connected.");
    }

    const fileId = crypto.randomUUID();
    const extension = file.name.split(".").pop();
    const storagePath = `org/${orgId}/evidence/${evidenceId}/${fileId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("rd-sidekick")
      .upload(storagePath, file);

    if (uploadError) throw uploadError;

    const { data, error } = await (supabase as any)
      .schema("sidekick")
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
    return data as EvidenceFile;
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

    const { error } = await (supabase as any)
      .schema("sidekick")
      .from("evidence_files")
      .delete()
      .eq("id", fileId);

    if (error) throw error;
  }
};