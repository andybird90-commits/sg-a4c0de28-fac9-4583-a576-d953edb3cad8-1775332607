import { supabase } from "@/integrations/supabase/client";

export interface BulkProject {
  id: string;
  org_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  sector: string | null;
  stage: string | null;
  created_at: string;
}

export type BulkProjectInsert = Omit<BulkProject, "id" | "created_at">;

export interface BulkProjectUpload {
  id: string;
  bulk_project_id: string;
  upload_type: string;
  file_name: string;
  file_path: string;
  bucket_name: string;
  mime_type: string | null;
  file_size_bytes: number;
  created_by: string;
  created_at: string;
}

export type BulkProjectUploadInsert = Omit<BulkProjectUpload, "id" | "created_at">;

const BULK_EVIDENCE_BUCKET = "bulk-project-evidence";
const BULK_FINANCIAL_BUCKET = "bulk-project-financials";

export type BulkProjectWithUploads = BulkProject & {
  bulk_project_uploads?: BulkProjectUpload[];
};

export const bulkProjectService = {
  async createProject(params: {
    orgId: string;
    createdBy: string;
    name: string;
    description?: string;
    sector?: string;
    stage?: string;
  }): Promise<BulkProject> {
    const payload: BulkProjectInsert = {
      org_id: params.orgId,
      created_by: params.createdBy,
      name: params.name,
      description: params.description || null,
      sector: params.sector || null,
      stage: params.stage || null
    };

    const { data, error } = await (supabase as any)
      .from("bulk_projects")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("[bulkProjectService.createProject] Error:", error);
      throw error;
    }

    return data;
  },

  async getProjectsForOrganisation(orgId: string): Promise<BulkProjectWithUploads[]> {
    const { data, error } = await (supabase as any)
      .from("bulk_projects")
      .select("*, bulk_project_uploads(*)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[bulkProjectService.getProjectsForOrganisation] Error:", error);
      throw error;
    }

    return (data as BulkProjectWithUploads[]) || [];
  },

  async getUploadsForProject(bulkProjectId: string): Promise<BulkProjectUpload[]> {
    const { data, error } = await (supabase as any)
      .from("bulk_project_uploads")
      .select("*")
      .eq("bulk_project_id", bulkProjectId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[bulkProjectService.getUploadsForProject] Error:", error);
      throw error;
    }

    return data || [];
  },

  async uploadFile(params: {
    bulkProjectId: string;
    createdBy: string;
    type: "evidence" | "financial";
    file: File;
  }): Promise<BulkProjectUpload> {
    const bucketName =
      params.type === "evidence" ? BULK_EVIDENCE_BUCKET : BULK_FINANCIAL_BUCKET;

    const fileExt = params.file.name.split(".").pop() || "bin";
    const safeName = params.file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${params.bulkProjectId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase
      .storage
      .from(bucketName)
      .upload(path, params.file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("[bulkProjectService.uploadFile] Storage upload error:", uploadError);
      throw uploadError;
    }

    const record: BulkProjectUploadInsert = {
      bulk_project_id: params.bulkProjectId,
      upload_type: params.type,
      file_name: params.file.name,
      file_path: path,
      bucket_name: bucketName,
      mime_type: params.file.type || `application/octet-stream`,
      file_size_bytes: params.file.size,
      created_by: params.createdBy
    };

    const { data, error } = await (supabase as any)
      .from("bulk_project_uploads")
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error("[bulkProjectService.uploadFile] DB insert error:", error);
      throw error;
    }

    return data;
  },

  async downloadUpload(upload: BulkProjectUpload): Promise<void> {
    const { data, error } = await supabase
      .storage
      .from(upload.bucket_name)
      .download(upload.file_path);

    if (error || !data) {
      console.error("[bulkProjectService.downloadUpload] Download error:", error);
      throw error || new Error("File not found");
    }

    const url = window.URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = upload.file_name || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};