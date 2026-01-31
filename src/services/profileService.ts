import { supabase } from "@/integrations/supabase/client";
import type { ProfileWithOrg } from "@/lib/auth/roles";

/**
 * Profile Service
 * Handles fetching user profiles with organisation information
 */

export const profileService = {
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

      // Fetch profile with organisation info
      // Using LEFT JOIN to get organisation details if user belongs to one
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          internal_role,
          organisation_users!inner(
            organisations(
              organisation_code,
              name
            )
          )
        `)
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      if (!profile) {
        return null;
      }

      // Extract organisation info from the nested structure
      const orgUsers = profile.organisation_users as any;
      const org = Array.isArray(orgUsers) && orgUsers.length > 0 
        ? orgUsers[0]?.organisations 
        : null;

      return {
        id: profile.id,
        email: profile.email || "",
        full_name: profile.full_name,
        internal_role: profile.internal_role as any,
        organisation_code: org?.organisation_code || null,
        organisation_name: org?.name || null
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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          internal_role,
          organisation_users!inner(
            organisations(
              organisation_code,
              name
            )
          )
        `)
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      // Extract organisation info from the nested structure
      const orgUsers = profile.organisation_users as any;
      const org = Array.isArray(orgUsers) && orgUsers.length > 0 
        ? orgUsers[0]?.organisations 
        : null;

      return {
        id: profile.id,
        email: profile.email || "",
        full_name: profile.full_name,
        internal_role: profile.internal_role as any,
        organisation_code: org?.organisation_code || null,
        organisation_name: org?.name || null
      };
    } catch (error) {
      console.error("Error in getUserProfileWithOrg:", error);
      return null;
    }
  }
};