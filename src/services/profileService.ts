import { supabase } from "@/integrations/supabase/client";
import type { ProfileWithOrg } from "@/lib/auth/roles";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  internal_role?: string | null;
}

/**
 * Profile Service
 * Handles fetching user profiles with organisation information
 */

export const profileService = {
  /**
   * Get all profiles for @mentions
   */
  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, internal_role")
      .order("full_name");

    if (error) {
      console.error("Error fetching all profiles:", error);
      return [];
    }

    return data || [];
  },

  /**
   * Get current user's profile with organisation information
   * Returns combined profile + organisation data needed for staff detection
   */
  async getCurrentUserProfileWithOrg(): Promise<ProfileWithOrg | null> {
    try {
      // Get current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Error fetching auth user:", authError);
        return null;
      }

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, internal_role, role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      if (!profile) {
        return null;
      }

      // Fetch organisation data separately via organisation_users table
      const { data: orgUsers, error: orgError } = await supabase
        .from("organisation_users")
        .select(`
          organisations (
            organisation_code,
            name
          )
        `)
        .eq("user_id", user.id)
        .limit(1);

      console.log("Profile query result:", { profile, orgUsers, orgError });

      // Extract organisation info
      let organisationCode = null;
      let organisationName = null;

      if (orgUsers && orgUsers.length > 0) {
        const org = (orgUsers[0] as any).organisations;
        if (org) {
          organisationCode = org.organisation_code;
          organisationName = org.name;
        }
      }

      return {
        id: profile.id,
        email: profile.email || "",
        full_name: profile.full_name,
        role: (profile as any).role ?? null,
        internal_role: profile.internal_role as any,
        organisation_code: organisationCode,
        organisation_name: organisationName
      };
    } catch (error) {
      console.error("Error in getCurrentUserProfileWithOrg:", error);
      return null;
    }
  },

  /**
   * Get any user's profile with organisation information by user ID
   */
  async getUserProfileWithOrg(userId: string): Promise<ProfileWithOrg | null> {
    try {
      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, internal_role, role")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      // Fetch organisation data separately via organisation_users table
      const { data: orgUsers, error: orgError } = await supabase
        .from("organisation_users")
        .select(`
          organisations (
            organisation_code,
            name
          )
        `)
        .eq("user_id", userId)
        .limit(1);

      console.log("Profile query result:", { profile, orgUsers, orgError });

      // Extract organisation info
      let organisationCode = null;
      let organisationName = null;

      if (orgUsers && orgUsers.length > 0) {
        const org = (orgUsers[0] as any).organisations;
        if (org) {
          organisationCode = org.organisation_code;
          organisationName = org.name;
        }
      }

      return {
        id: profile.id,
        email: profile.email || "",
        full_name: profile.full_name,
        role: (profile as any).role ?? null,
        internal_role: profile.internal_role as any,
        organisation_code: organisationCode,
        organisation_name: organisationName
      };
    } catch (error) {
      console.error("Error in getUserProfileWithOrg:", error);
      return null;
    }
  }
};