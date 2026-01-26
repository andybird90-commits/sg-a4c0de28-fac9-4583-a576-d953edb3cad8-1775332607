import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { organisationService, type UserOrganisation } from "@/services/organisationService";

interface AppContextType {
  user: any;
  loading: boolean;
  organisations: UserOrganisation[];
  currentOrg: UserOrganisation | null;
  orgLoading: boolean;
  setCurrentOrg: (org: UserOrganisation) => void;
  refreshOrganisations: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organisations, setOrganisations] = useState<UserOrganisation[]>([]);
  const [currentOrg, setCurrentOrg] = useState<UserOrganisation | null>(null);
  const [orgLoading, setOrgLoading] = useState(false);

  const refreshOrganisations = async () => {
    if (!user) {
      console.log("[AppContext] No user, skipping org refresh");
      return;
    }

    console.log("[AppContext] Refreshing organisations for user:", user.email);
    setOrgLoading(true);
    try {
      const orgs = await organisationService.getUserOrganisations();
      console.log("[AppContext] Fetched organisations:", orgs);
      setOrganisations(orgs);

      // Auto-select first org if none selected
      if (orgs.length > 0 && !currentOrg) {
        console.log("[AppContext] Auto-selecting first org:", orgs[0].name);
        setCurrentOrg(orgs[0]);
        // Store in localStorage for persistence
        localStorage.setItem("currentOrgId", orgs[0].id);
      } else if (orgs.length > 0 && currentOrg) {
        // Try to restore from localStorage
        const savedOrgId = localStorage.getItem("currentOrgId");
        if (savedOrgId) {
          const savedOrg = orgs.find((o) => o.id === savedOrgId);
          if (savedOrg) {
            console.log("[AppContext] Restoring saved org:", savedOrg.name);
            setCurrentOrg(savedOrg);
          }
        }
      }
    } catch (error) {
      console.error("[AppContext] Error fetching organisations:", error);
    } finally {
      setOrgLoading(false);
    }
  };

  useEffect(() => {
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
          if (userError.message?.includes("session") || userError.message?.includes("JWT")) {
            await authService.clearInvalidSession();
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
            const orgs = await organisationService.getUserOrganisations();
            setOrganisations(orgs);

            if (orgs.length > 0) {
              const savedOrgId = localStorage.getItem("currentOrgId");
              const savedOrg = orgs.find((o) => o.id === savedOrgId);
              setCurrentOrg(savedOrg || orgs[0]);
            }
          } catch (orgError) {
            console.error("Error fetching organisations:", orgError);
          }
        }
      } catch (error) {
        console.error("Error in checkUser:", error);
        await authService.clearInvalidSession();
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
    if (user && !orgLoading) {
      console.log("[AppContext] User set, refreshing organisations");
      refreshOrganisations();
    } else if (!user) {
      console.log("[AppContext] User cleared, resetting organisations");
      setOrganisations([]);
      setCurrentOrg(null);
      localStorage.removeItem("currentOrgId");
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        organisations,
        currentOrg,
        orgLoading,
        setCurrentOrg: (org) => {
          console.log("[AppContext] Setting current org:", org.name);
          setCurrentOrg(org);
          localStorage.setItem("currentOrgId", org.id);
        },
        refreshOrganisations,
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