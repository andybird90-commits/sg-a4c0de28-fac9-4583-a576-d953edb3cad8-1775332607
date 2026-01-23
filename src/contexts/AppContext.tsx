import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { organisationService, type UserOrganisation } from "@/services/organisationService";

interface AppContextType {
  user: User | null;
  organisations: UserOrganisation[];
  currentOrg: UserOrganisation | null;
  setCurrentOrg: (org: UserOrganisation) => void;
  loading: boolean;
  refreshOrganisations: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organisations, setOrganisations] = useState<UserOrganisation[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<UserOrganisation | null>(null);
  const [loading, setLoading] = useState(true);

  const setCurrentOrg = (org: UserOrganisation) => {
    setCurrentOrgState(org);
    localStorage.setItem("currentOrgId", org.id);
  };

  const refreshOrganisations = async () => {
    try {
      const orgs = await organisationService.getUserOrganisations();
      setOrganisations(orgs);

      const savedOrgId = localStorage.getItem("currentOrgId");
      if (savedOrgId) {
        const savedOrg = orgs.find(o => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrgState(savedOrg);
          return;
        }
      }

      if (orgs.length > 0) {
        setCurrentOrgState(orgs[0]);
        localStorage.setItem("currentOrgId", orgs[0].id);
      }
    } catch (error) {
      console.error("Error loading organisations:", error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshOrganisations();
    } else {
      setOrganisations([]);
      setCurrentOrgState(null);
    }
  }, [user]);

  return (
    <AppContext.Provider value={{ user, organisations, currentOrg, setCurrentOrg, loading, refreshOrganisations }}>
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