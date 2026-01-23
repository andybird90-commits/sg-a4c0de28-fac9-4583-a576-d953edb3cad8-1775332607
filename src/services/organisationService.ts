import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type OrganisationUser = Database["public"]["Tables"]["organisation_users"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

export interface UserOrganisation extends Organisation {
  role: string;
}

export const organisationService = {
  async getUserOrganisations(): Promise<UserOrganisation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("organisation_users")
      .select(`
        role,
        organisations (*)
      `)
      .eq("user_id", user.id);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item.organisations,
      role: item.role
    }));
  },

  async getOrganisationById(orgId: string): Promise<Organisation | null> {
    const { data, error } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) throw error;
    return data;
  },

  async getOrganisationByCode(code: string): Promise<Organisation | null> {
    const { data, error } = await supabase
      .from("organisations")
      .select("*")
      .eq("code", code)
      .single();

    if (error) return null;
    return data;
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
    return data || [];
  }
};