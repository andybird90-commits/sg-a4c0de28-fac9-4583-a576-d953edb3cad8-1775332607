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
  org_id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
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
        .eq("organisation_code", code.trim().toLowerCase())
        .single();

      if (error) {
        console.error("Error fetching organisation by code:", error);
        return null;
      }
      
      return data as Organisation;
    } catch (err) {
      console.error("Exception in getOrganisationByCode:", err);
      return null;
    }
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

  async getProjects(orgId: string, activeOnly: boolean = true): Promise<Project[]> {
    let query = supabase
      .from("projects")
      .select("*")
      .eq("org_id", orgId)
      .order("name", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Project[];
  }
};