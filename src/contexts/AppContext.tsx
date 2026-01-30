import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { organisationService, type UserOrganisation } from "@/services/organisationService";

interface AppContextType {
  user: any;
  loading: boolean;
  organisations: UserOrganisation[];
  currentOrg: UserOrganisation | null;
  setCurrentOrg: (org: UserOrganisation) => void;
  refreshOrganisations: () => Promise<void>;
  organisationsLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organisations, setOrganisations] = useState<UserOrganisation[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrganisation | null>(null);
  const [organisationsLoading, setOrganisationsLoading] = useState(false);

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

    const checkUser = async () => {
      try {
        const session = await authService.validateSession();
        
        if (!session) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error fetching user:", userError);
          // Handle 403 or session errors
          if (userError.status === 403 || userError.message?.includes("session") || userError.message?.includes("JWT")) {
            await authService.clearInvalidSession();
            setUser(null);
            setLoading(false);
            // Redirect to login if not already there
            if (typeof window !== "undefined" && window.location.pathname !== '/auth/login') {
              window.location.href = '/auth/login';
            }
            return;
          }
          setUser(null);
          setLoading(false);
          return;
        }

        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setUser({
            id: authUser.id,
            email: authUser.email!,
            fullName: profile.full_name,
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
        // Handle any unexpected errors
        if (error?.status === 403 || error?.message?.includes("session")) {
          await authService.clearInvalidSession();
          if (typeof window !== "undefined" && window.location.pathname !== '/auth/login') {
            window.location.href = '/auth/login';
          }
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setOrganisations([]);
        setCurrentOrg(null);
      } else if (event === "SIGNED_IN" && session) {
        checkUser();
      } else if (event === "TOKEN_REFRESHED") {
        checkUser();
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