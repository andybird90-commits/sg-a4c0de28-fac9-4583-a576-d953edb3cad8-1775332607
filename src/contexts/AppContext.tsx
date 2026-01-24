import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[AppContext] Initial session:", session ? "exists" : "none");
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[AppContext] Auth state changed:", _event, session?.user?.email);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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