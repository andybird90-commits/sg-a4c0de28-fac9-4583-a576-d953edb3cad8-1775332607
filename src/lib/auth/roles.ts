/**
 * Staff Detection and Role Utilities
 * 
 * BUSINESS RULES:
 * - Staff users have a non-NULL `internal_role` in their profiles table
 * - Available internal_role values: bd, technical, commercial, ops, director, admin
 * - Staff users are redirected to /staff area
 * - Client users (internal_role = NULL) use the normal client dashboard
 */

export type InternalRole = "bd" | "technical" | "commercial" | "ops" | "director" | "admin";

export interface ProfileWithOrg {
  id: string;
  email: string;
  full_name: string | null;
  internal_role: InternalRole | null;
  organisation_code: string | null;
  organisation_name: string | null;
}

/**
 * Check if a user is staff based on their profile
 * @param profile - User profile with organisation info
 * @returns true if user is staff (has internal_role)
 */
export function isStaff(profile: ProfileWithOrg | null): boolean {
  if (!profile) return false;
  
  // Staff detection: user has a non-NULL internal_role
  return profile.internal_role !== null && profile.internal_role !== undefined;
}

/**
 * Get display name for internal role
 */
export function getInternalRoleDisplayName(role: InternalRole | null): string {
  if (!role) return "Client";
  
  const roleMap: Record<InternalRole, string> = {
    bd: "Business Development",
    technical: "Technical",
    commercial: "Commercial",
    ops: "Operations",
    director: "Director",
    admin: "Admin"
  };
  
  return roleMap[role] || role;
}

/**
 * Constants for staff organisation codes
 * Adjust these if the actual codes differ in your database
 */
export const STAFF_ORG_CODES = {
  RDTAX: "RDTAX",
  RDMANDE: "RDMANDE"
} as const;

/**
 * Check if an organisation code is a staff organisation
 */
export function isStaffOrganisation(orgCode: string | null): boolean {
  if (!orgCode) return false;
  return orgCode === STAFF_ORG_CODES.RDTAX || orgCode === STAFF_ORG_CODES.RDMANDE;
}