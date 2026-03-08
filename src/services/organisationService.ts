import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Explicitly define types to avoid deep instantiation recursion
export type Organisation = {
  id: string;
  name: string;
  organisation_code: string;
  sidekick_enabled: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  company_id: string; // Changed from org_id to match schema
  name: string;
  description: string | null;
  sector: string | null;
  stage: string | null;
  status: string;
  is_active: boolean; // Computed or derived if not in schema (schema has status='draft')
  created_at: string;
};

export interface UserOrganisation extends Organisation {
  role: string;
}

export const organisationService = {
  async getUserOrganisations(): Promise<UserOrganisation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Query organisation_users with explicit join to organisations table
    const { data, error } = await supabase
      .from("organisation_users")
      .select(`
        role,
        organisations!organisation_users_org_id_fkey (
          id,
          name,
          organisation_code,
          sidekick_enabled,
          created_at
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching user organisations:", error);
      throw error;
    }

    // Transform the nested data structure into flat UserOrganisation objects
    return (data || []).map((item: any) => ({
      id: item.organisations.id,
      name: item.organisations.name,
      organisation_code: item.organisations.organisation_code,
      sidekick_enabled: item.organisations.sidekick_enabled,
      created_at: item.organisations.created_at,
      role: item.role
    })) as UserOrganisation[];
  },

  async getOrganisationById(orgId: string): Promise<Organisation | null> {
    const { data, error } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) throw error;
    return data as Organisation;
  },

  async getOrganisationByCode(code: string): Promise<Organisation | null> {
    try {
      const { data, error } = await supabase
        .from("organisations")
        .select("*")
        .ilike("organisation_code", code)
        .maybeSingle();

      if (error) {
        console.error("Error fetching organisation by code:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception in getOrganisationByCode:", err);
      return null;
    }
  },

  async getAllOrganisations(): Promise<Organisation[]> {
    const { data, error } = await supabase
      .from("organisations")
      .select("id, name, organisation_code, sidekick_enabled, created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching all organisations:", error);
      throw error;
    }

    return (data || []) as Organisation[];
  },

  async joinOrganisation(orgId: string, role: string = "client"): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("organisation_users")
      .insert({
        org_id: orgId,
        user_id: user.id,
        role: role
      });

    if (error) throw error;
  },

  async getProjects(orgId: string, activeOnly = true): Promise<Project[]> {
    // Note: Schema uses 'company_id', not 'organisation_id' or 'org_id'
    const query = supabase
      .from("sidekick_projects")
      .select("*")
      .eq("company_id", orgId)
      .order("created_at", { ascending: false });

    // Schema uses 'status' not 'is_active'. Filter for non-archived if needed, 
    // or just return all for now. The previous code assumed 'is_active'.
    // Let's assume 'draft', 'needs_changes', 'review' are active.
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Map to Project type
    return (data || []).map((p: any) => ({
      ...p,
      is_active: p.status !== 'archived' // Derive is_active
    })) as Project[];
  },

  async createProject(orgId: string, project: Partial<Project> & { tags?: string[] }): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Remove 'tags' and 'is_active' as they are not in schema
    // Map 'name', 'description' directly
    // Use 'company_id' for org link
    
    const { tags, is_active, ...projectData } = project;

    const { data, error } = await supabase
      .from("sidekick_projects")
      .insert({
        company_id: orgId,
        created_by: user.id,
        name: projectData.name || "New Project",
        description: projectData.description,
        sector: projectData.sector,
        stage: projectData.stage,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      is_active: data.status !== 'archived'
    } as Project;
  },

  /**
   * Generate a unique organisation code
   */
  async generateOrganisationCode(name: string): Promise<string> {
    // Remove spaces, special characters, and convert to uppercase
    // Take first 8 letters of company name
    let baseCode = name
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars and spaces
      .toUpperCase()
      .substring(0, 8);

    // If less than 8 characters, pad with random letters
    if (baseCode.length < 8) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      while (baseCode.length < 8) {
        baseCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    // Check if code already exists
    const { data: existing } = await supabase
      .from("organisations")
      .select("id")
      .eq("organisation_code", baseCode)
      .single();

    // If exists, append a number
    if (existing) {
      let counter = 1;
      let newCode = baseCode;
      while (existing) {
        newCode = baseCode.substring(0, 6) + String(counter).padStart(2, '0');
        const { data: check } = await supabase
          .from("organisations")
          .select("id")
          .eq("organisation_code", newCode)
          .single();
        if (!check) break;
        counter++;
      }
      return newCode;
    }

    return baseCode;
  }
};