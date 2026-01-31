import { useState, useEffect } from "react";
import { profileService } from "@/services/profileService";
import { isStaff, type ProfileWithOrg } from "@/lib/auth/roles";

/**
 * Hook to check if current user is staff
 * Returns loading state and staff status
 */
export function useStaffStatus() {
  const [loading, setLoading] = useState(true);
  const [staffProfile, setStaffProfile] = useState<ProfileWithOrg | null>(null);
  const [isStaffUser, setIsStaffUser] = useState(false);

  useEffect(() => {
    async function checkStaffStatus() {
      try {
        const profile = await profileService.getCurrentUserProfileWithOrg();
        setStaffProfile(profile);
        setIsStaffUser(isStaff(profile));
      } catch (error) {
        console.error("Error checking staff status:", error);
        setStaffProfile(null);
        setIsStaffUser(false);
      } finally {
        setLoading(false);
      }
    }

    checkStaffStatus();
  }, []);

  return {
    loading,
    isStaff: isStaffUser,
    profile: staffProfile
  };
}