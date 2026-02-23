import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { organisationService, type UserOrganisation } from "@/services/organisationService";
import { profileService } from "@/services/profileService";
import { isStaff as checkIsStaff, type ProfileWithOrg } from "@/lib/auth/roles";
import { isAdmin as checkIsAdmin } from "@/lib/auth/roles";

interface AppContextType {
  user: any;
  loading: boolean;
  organisations: UserOrganisation[];
  currentOrg: UserOrganisation | null;
  setCurrentOrg: (org: UserOrganisation) => void;
  refreshOrganisations: () => Promise<void>;
  organisationsLoading: boolean;
  isStaff: boolean;
  profileWithOrg: ProfileWithOrg | null;
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organisations, setOrganisations] = useState<UserOrganisation[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrganisation | null>(null);
  const [organisationsLoading, setOrganisationsLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [profileWithOrg, setProfileWithOrg] = useState<ProfileWithOrg | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Handler to update currentOrg and save to localStorage
  const handleSetCurrentOrg = (org: UserOrganisation) => {
    setCurrentOrg(org);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedOrgId", org.id);
    }
  };

  const refreshOrganisations = async () => {
    if (!user) {
      setOrganisations([]);
      setCurrentOrg(null);
      return;
    }

    try {
      setOrganisationsLoading(true);
      const orgs = await organisationService.getUserOrganisations();
      setOrganisations(orgs);

      // Try to restore last selected org from localStorage
      const savedOrgId = typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") : null;
      if (savedOrgId) {
        const savedOrg = orgs.find((org) => org.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrg(savedOrg);
          return;
        }
      }

      // Auto-select if only one org
      if (orgs.length === 1) {
        setCurrentOrg(orgs[0]);
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedOrgId", orgs[0].id);
        }
      } else if (orgs.length === 0) {
        setCurrentOrg(null);
      }
    } catch (error) {
      console.error("Error fetching organisations:", error);
      setOrganisations([]);
      setCurrentOrg(null);
    } finally {
      setOrganisationsLoading(false);
    }
  };

  useEffect(() => {
    // Setup global error handler for 403 errors
    authService.setupGlobalErrorHandler();

    let retryCount = 0;
    const maxRetries = 2;

    const checkUser = async () => {
      try {
        const session = await authService.validateSession();
        
        if (!session) {
          setUser(null);
          setIsStaff(false);
          setProfileWithOrg(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error fetching user:", userError);
          
          // Retry on network errors
          if (userError.message?.includes("Failed to fetch") && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying user fetch (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            return checkUser();
          }
          
          // Handle 403 or session errors
          if (userError.status === 403 || userError.message?.includes("session") || userError.message?.includes("JWT")) {
            await authService.clearInvalidSession();
            setUser(null);
            setIsStaff(false);
            setProfileWithOrg(null);
            setIsAdmin(false);
            setLoading(false);
            // Redirect to login if not already there
            if (typeof window !== "undefined" && window.location.pathname !== '/auth/login') {
              window.location.href = '/auth/login';
            }
            return;
          }
          setUser(null);
          setIsStaff(false);
          setProfileWithOrg(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        if (!authUser) {
          setUser(null);
          setIsStaff(false);
          setProfileWithOrg(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Reset retry count on success
        retryCount = 0;

        // Fetch profile with organisation info for staff detection
        const profile = await profileService.getCurrentUserProfileWithOrg();
        console.log("[AppContext] Profile fetched:", profile);
        setProfileWithOrg(profile);
        
        // Determine if user is staff
        const staffStatus = checkIsStaff(profile);
        console.log("[AppContext] Staff status:", staffStatus);
        setIsStaff(staffStatus);

        // Determine if user is admin
        const adminStatus = checkIsAdmin(profile);
        console.log("[AppContext] Admin status:", adminStatus);
        setIsAdmin(adminStatus);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profileData) {
          setUser({
            id: authUser.id,
            email: authUser.email!,
            fullName: profileData.full_name,
          });

          // Fetch organisations using the service
          try {
            setOrganisationsLoading(true);
            const orgs = await organisationService.getUserOrganisations();
            setOrganisations(orgs);

            if (orgs.length > 0) {
              const savedOrgId = localStorage.getItem("selectedOrgId");
              const savedOrg = orgs.find((o) => o.id === savedOrgId);
              setCurrentOrg(savedOrg || orgs[0]);
              if (savedOrg || orgs.length === 1) {
                localStorage.setItem("selectedOrgId", (savedOrg || orgs[0]).id);
              }
            }
          } catch (orgError) {
            console.error("Error fetching organisations:", orgError);
          } finally {
            setOrganisationsLoading(false);
          }
        }
      } catch (error: any) {
        console.error("Error in checkUser:", error);
        
        // Retry on network errors
        if (error?.message?.includes("Failed to fetch") && retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying checkUser (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return checkUser();
        }
        
        // Handle any unexpected errors
        if (error?.status === 403 || error?.message?.includes("session")) {
          await authService.clearInvalidSession();
          if (typeof window !== "undefined" && window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }
        setUser(null);
        setIsStaff(false);
        setProfileWithOrg(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AppContext] Auth state change:", event);
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setOrganisations([]);
        setCurrentOrg(null);
        setIsStaff(false);
        setProfileWithOrg(null);
        setIsAdmin(false);
      } else if (event === "SIGNED_IN" && session) {
        // Re-check user and fetch profile
        await checkUser();
      } else if (event === "TOKEN_REFRESHED") {
        await checkUser();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && !organisationsLoading) {
      console.log("[AppContext] User set, refreshing organisations");
      refreshOrganisations();
    } else if (!user) {
      console.log("[AppContext] User cleared, resetting organisations");
      setOrganisations([]);
      setCurrentOrg(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedOrgId"); // Use consistent key
      }
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        organisations,
        currentOrg,
        setCurrentOrg: handleSetCurrentOrg,
        refreshOrganisations,
        organisationsLoading,
        isStaff,
        profileWithOrg,
        isAdmin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}