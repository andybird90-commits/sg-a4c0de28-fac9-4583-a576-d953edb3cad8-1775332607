import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, ArrowRight, Sparkles, Loader2, RefreshCw, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { SidekickResearchPanel } from "@/components/staff/cif/SidekickResearchPanel";
import { clientFeeReconciliationService } from "@/services/clientFeeReconciliationService";
import { organisationNotificationStatusService } from "@/services/organisationNotificationStatusService";
import type { NotificationStatusState } from "@/services/organisationNotificationStatusService";
import { clientCrmService, type CrmKpiSummary } from "@/services/clientCrmService";

type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ClientToBeOnboarded = Database["public"]["Tables"]["clients_to_be_onboarded"]["Row"];

interface EnrichmentState {
  [prospectId: string]: "idle" | "loading" | "success" | "error";
}

interface BulkState {
  running: boolean;
  total: number;
  completed: number;
}

interface ClientFormState {
  company_name: string;
  contact_name: string;
  title: string;
  email: string;
  phone: string;
  landline: string;
  address: string;
  company_number: string;
  utr: string;
  fee_percent: string;
  year_end_month: string;
  ref_by: string;
  comments: string;
}

const createClientFormState = (client: ClientToBeOnboarded): ClientFormState => ({
  company_name: client.company_name || "",
  contact_name: client.contact_name || "",
  title: client.title || "",
  email: client.email || "",
  phone: client.phone || "",
  landline: client.landline || "",
  address: client.address || "",
  company_number: client.company_number || "",
  utr: client.utr || "",
  fee_percent:
    client.fee_percent !== null && client.fee_percent !== undefined ? String(client.fee_percent) : "",
  year_end_month: client.year_end_month || "",
  ref_by: client.ref_by || "",
  comments: client.comments || ""
});

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isValidCompaniesHouseNumber = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return false;
  const compact = cleaned.replace(/\s+/g, "");
  // Typical Companies House numbers are 6–8 alphanumeric characters (e.g. 07399692, SC256359)
  return /^[A-Z0-9]{6,8}$/.test(compact);
};

const getRegisteredAddressFromEnrichment = (data: any): string | null => {
  if (!data) return null;

  if (data.registered_address) {
    return [
      data.registered_address.address_line_1,
      data.registered_address.address_line_2,
      data.registered_address.locality,
      data.registered_address.postal_code,
      data.registered_address.country
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (data.registered_office_address) {
    return [
      data.registered_office_address.address_line_1,
      data.registered_office_address.address_line_2,
      data.registered_office_address.locality,
      data.registered_office_address.postal_code,
      data.registered_office_address.country
    ]
      .filter(Boolean)
      .join(", ");
  }

  return null;
};

export default function StaffClients() {
  const router = useRouter();
  const { isStaff, isAdmin } = useApp();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [prospectsToOnboard, setProspectsToOnboard] = useState<Prospect[]>([]);
  const [prospectsOnboarded, setProspectsOnboarded] = useState<Prospect[]>([]);
  const [clientsToOnboard, setClientsToOnboard] = useState<ClientToBeOnboarded[]>([]);
  const [enrichmentState, setEnrichmentState] = useState<EnrichmentState>({});
  const [bulkState, setBulkState] = useState<BulkState>({ running: false, total: 0, completed: 0 });
  const [selectedClient, setSelectedClient] = useState<ClientToBeOnboarded | null>(null);
  const [clientForm, setClientForm] = useState<ClientFormState | null>(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientDeleting, setClientDeleting] = useState(false);
  const [clientEnrichment, setClientEnrichment] = useState<any | null>(null);
  const [clientEnrichmentLoading, setClientEnrichmentLoading] = useState(false);
  const [clientEnrichmentError, setClientEnrichmentError] = useState<string | null>(null);
  const [clientResearchLoading, setClientResearchLoading] = useState(false);
  const [clientAnalysisData, setClientAnalysisData] = useState<any | null>(null);
  const [clientResearchFallbackText, setClientResearchFallbackText] = useState("");
  const [clientSidekickLoading, setClientSidekickLoading] = useState(false);
  const [notificationStatuses, setNotificationStatuses] = useState<
    Record<string, NotificationStatusState>
  >({});
  const [crmKpis, setCrmKpis] = useState<CrmKpiSummary | null>(null);
  const [crmKpisLoading, setCrmKpisLoading] = useState(false);

  const [searchToOnboard, setSearchToOnboard] = useState<string>("");
  const [sortToOnboard, setSortToOnboard] = useState<"name-asc" | "name-desc">("name-asc");
  const [searchOnboarded, setSearchOnboarded] = useState<string>("");
  const [sortOnboarded, setSortOnboarded] = useState<"name-asc" | "name-desc">("name-asc");

  useEffect(() => {
    if (!isStaff) {
      router.push("/home");
      return;
    }
    void loadProspects();
    void loadCrmKpis();
  }, [isStaff]);

  const loadProspects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading prospects:", error);
        toast({
          title: "Error loading clients",
          description: "Unable to load client list from the server.",
          variant: "destructive"
        });
        setProspectsToOnboard([]);
        setProspectsOnboarded([]);
        setClientsToOnboard([]);
        return;
      }

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients_to_be_onboarded")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) {
        console.error("Error loading clients_to_be_onboarded:", clientsError);
        toast({
          title: "Error loading clients to be onboarded",
          description: "Unable to load imported clients from the server.",
          variant: "destructive"
        });
        setClientsToOnboard([]);
      } else {
        setClientsToOnboard(clientsData || []);
      }

      const all = data || [];

      const toOnboard = all.filter((p) => !p.org_id);
      const onboarded = all.filter((p) => p.org_id);

      setProspectsToOnboard(toOnboard);
      setProspectsOnboarded(onboarded);
    } catch (error) {
      console.error("Unexpected error loading prospects:", error);
      toast({
        title: "Error loading clients",
        description: "An unexpected error occurred while loading clients.",
        variant: "destructive"
      });
      setProspectsToOnboard([]);
      setProspectsOnboarded([]);
      setClientsToOnboard([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCrmKpis = async () => {
    setCrmKpisLoading(true);
    try {
      const data = await clientCrmService.getCrmKpis();
      setCrmKpis(data);
    } catch (error) {
      console.error("Error loading CRM KPIs:", error);
    } finally {
      setCrmKpisLoading(false);
    }
  };

  const loadClientEnrichment = async (client: ClientToBeOnboarded) => {
    if (!client.company_number || !isValidCompaniesHouseNumber(client.company_number)) {
      setClientEnrichment(null);
      setClientEnrichmentError(null);
      setClientEnrichmentLoading(false);
      setClientAnalysisData(null);
      setClientResearchFallbackText("");
      setClientResearchLoading(false);
      setClientSidekickLoading(false);
      return;
    }

    setClientEnrichmentLoading(true);
    setClientEnrichmentError(null);
    setClientEnrichment(null);
    setClientAnalysisData(null);
    setClientResearchFallbackText("");
    setClientResearchLoading(true);
    setClientSidekickLoading(true);

    try {
      const res = await fetch(
        `/api/companies-house/lookup?number=${encodeURIComponent(
          client.company_number
        )}&includeHistory=true`
      );

      if (!res.ok) {
        throw new Error(`Companies House lookup failed with status ${res.status}`);
      }

      const data: any = await res.json();
      setClientEnrichment(data);

      try {
        const researchRes = await fetch("/api/sidekick/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: data.company_name || client.company_name,
            companyNumber: data.company_number || client.company_number,
            industry: Array.isArray(data.sic_codes) ? data.sic_codes[0] : undefined
          })
        });

        if (researchRes.ok) {
          const researchData = await researchRes.json();
          setClientAnalysisData(researchData);

          const summary =
            typeof researchData?.feasibility_summary === "string"
              ? researchData.feasibility_summary.trim()
              : "";
          if (summary) {
            setClientResearchFallbackText(summary);
          }
        } else {
          console.error(
            "Sidekick research returned non-OK status for imported client:",
            researchRes.status
          );
        }
      } catch (researchError) {
        console.error("Error loading AI research for imported client:", researchError);
      } finally {
        setClientSidekickLoading(false);
      }
    } catch (error) {
      console.error("Error loading Companies House enrichment for imported client:", error);
      setClientEnrichment(null);
      setClientEnrichmentError("Unable to load Companies House details for this client.");
      // Ensure we also clear the Sidekick loading state if CH lookup fails before research runs
      setClientSidekickLoading(false);
    } finally {
      setClientEnrichmentLoading(false);
      setClientResearchLoading(false);
    }
  };

  const handleStartCIF = (prospect: Prospect) => {
    const companyNumber = prospect.company_number || "";
    router.push(
      companyNumber ?
      `/staff/cif?companyNumber=${encodeURIComponent(companyNumber)}` :
      "/staff/cif"
    );
  };

  const handleOpenClientDetail = (client: ClientToBeOnboarded) => {
    setSelectedClient(client);
    setClientForm(createClientFormState(client));
    setClientDialogOpen(true);
    void loadClientEnrichment(client);
  };

  const handleClientFieldChange = (field: keyof ClientFormState, value: string) => {
    setClientForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSaveClient = async () => {
    if (!selectedClient || !clientForm) return;

    if (!clientForm.company_name.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name before saving.",
        variant: "destructive"
      });
      return;
    }

    setClientSaving(true);
    try {
      let feePercentValue: number | null = null;
      if (clientForm.fee_percent.trim()) {
        const numericPart = clientForm.fee_percent.replace(/[^0-9.]/g, "");
        const parsed = Number(numericPart);
        if (!Number.isNaN(parsed)) {
          feePercentValue = parsed;
        }
      }

      const updatePayload: Partial<ClientToBeOnboarded> = {
        company_name: clientForm.company_name.trim(),
        contact_name: clientForm.contact_name.trim() || null,
        title: clientForm.title.trim() || null,
        email: clientForm.email.trim() || null,
        phone: clientForm.phone.trim() || null,
        landline: clientForm.landline.trim() || null,
        address: clientForm.address.trim() || null,
        company_number: clientForm.company_number.trim() || null,
        utr: clientForm.utr.trim() || null,
        fee_percent: feePercentValue,
        year_end_month: clientForm.year_end_month.trim() || null,
        ref_by: clientForm.ref_by.trim() || null,
        comments: clientForm.comments.trim() || null
      };

      const { error } = await supabase
        .from("clients_to_be_onboarded")
        .update(updatePayload)
        .eq("id", selectedClient.id);

      if (error) {
        console.error("Error updating client_to_be_onboarded:", error);
        toast({
          title: "Update failed",
          description: "Unable to save changes to this client.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Client updated",
        description: "The client details have been saved."
      });

      setClientDialogOpen(false);
      setSelectedClient(null);
      setClientForm(null);
      await loadProspects();
    } catch (error) {
      console.error("Unexpected error updating client_to_be_onboarded:", error);
      toast({
        title: "Update failed",
        description: "An unexpected error occurred while saving this client.",
        variant: "destructive"
      });
    } finally {
      setClientSaving(false);
    }
  };

  const handleDeleteClientFromDialog = async () => {
    if (!selectedClient) return;
    const confirmed = window.confirm(
      `Delete client "${selectedClient.company_name}" from clients to be onboarded? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setClientDeleting(true);
    try {
      const { error } = await supabase
        .from("clients_to_be_onboarded")
        .delete()
        .eq("id", selectedClient.id);

      if (error) {
        console.error("Error deleting client_to_be_onboarded:", error);
        toast({
          title: "Delete failed",
          description: "Unable to delete this client.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Client deleted",
        description: "The client has been removed from clients to be onboarded."
      });

      setClientDialogOpen(false);
      setSelectedClient(null);
      setClientForm(null);
      await loadProspects();
    } catch (error) {
      console.error("Unexpected error deleting client_to_be_onboarded:", error);
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred while deleting this client.",
        variant: "destructive"
      });
    } finally {
      setClientDeleting(false);
    }
  };

  const enrichProspect = async (prospect: Prospect, options?: {suppressToast?: boolean;}) => {
    if (!prospect.company_number || !isValidCompaniesHouseNumber(prospect.company_number)) {
      if (!options?.suppressToast) {
        toast({
          title: "Valid company number required",
          description: "The company number for this client appears to be invalid. Please correct it before enriching.",
          variant: "destructive"
        });
      }
      console.warn("Skipping enrichment for prospect with invalid company number", {
        id: prospect.id,
        company_name: prospect.company_name,
        company_number: prospect.company_number
      });
      return;
    }

    setEnrichmentState((prev) => ({ ...prev, [prospect.id]: "loading" }));

    try {
      // 1. Companies House lookup
      const lookupRes = await fetch(
        `/api/companies-house/lookup?number=${encodeURIComponent(prospect.company_number)}&includeHistory=true`
      );

      if (!lookupRes.ok) {
        console.error("Companies House lookup failed:", lookupRes.status, lookupRes.statusText);
        throw new Error("Companies House lookup failed");
      }

      const lookupData: any = await lookupRes.json();

      const registeredAddress = lookupData.registered_address ?
      [
      lookupData.registered_address.address_line_1,
      lookupData.registered_address.address_line_2,
      lookupData.registered_address.locality,
      lookupData.registered_address.postal_code,
      lookupData.registered_address.country].

      filter(Boolean).
      join(", ") :
      null;

      const numberOfDirectors =
      lookupData.officers && lookupData.officers.active_count ?
      lookupData.officers.active_count :
      null;

      // 2. AI research (optional enrichment data)
      let aiResearchData: any = null;
      try {
        const aiRes = await fetch("/api/sidekick/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: lookupData.company_name || prospect.company_name,
            companyNumber: lookupData.company_number || prospect.company_number,
            industry: Array.isArray(lookupData.sic_codes) ? lookupData.sic_codes[0] : undefined
          })
        });

        if (aiRes.ok) {
          aiResearchData = await aiRes.json();
        }
      } catch (aiError) {
        console.error("AI research enrichment failed:", aiError);
      }

      // 3. Update prospect record
      const { error: updateError } = await supabase
      .from("prospects")
      .update({
        company_name: lookupData.company_name || prospect.company_name,
        company_status: lookupData.company_status || prospect.company_status,
        registered_address: registeredAddress,
        sic_codes: lookupData.sic_codes || prospect.sic_codes,
        incorporation_date: lookupData.date_of_creation || prospect.incorporation_date,
        number_of_directors: numberOfDirectors,
        last_accounts_date: lookupData.last_accounts_date || prospect.last_accounts_date,
        ai_research_data: aiResearchData || null,
        last_enriched_at: new Date().toISOString()
      } as Partial<Prospect>)
      .eq("id", prospect.id);

      if (updateError) {
        console.error("Error updating prospect after enrichment:", updateError);
        throw updateError;
      }

      setEnrichmentState((prev) => ({ ...prev, [prospect.id]: "success" }));

      if (!options?.suppressToast) {
        toast({
          title: "Client enriched",
          description: `Company details updated for ${lookupData.company_name || prospect.company_name}.`
        });
      }

      await loadProspects();
    } catch (error) {
      console.error("Error enriching prospect:", error);
      setEnrichmentState((prev) => ({ ...prev, [prospect.id]: "error" }));
      if (!options?.suppressToast) {
        toast({
          title: "Enrichment failed",
          description: "Unable to enrich this client. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const enrichImportedClient = async (
    client: ClientToBeOnboarded,
    options?: { suppressToast?: boolean }
  ) => {
    if (!client.company_number || !isValidCompaniesHouseNumber(client.company_number)) {
      if (!options?.suppressToast) {
        toast({
          title: "Valid company number required",
          description: "The company number for this imported client appears to be invalid. Please correct it before enriching.",
          variant: "destructive"
        });
      }
      console.warn("Skipping enrichment for imported client with invalid company number", {
        id: client.id,
        company_name: client.company_name,
        company_number: client.company_number
      });
      return;
    }

    try {
      console.log("Enriching imported client", {
        id: client.id,
        company_name: client.company_name,
        company_number: client.company_number
      });

      const lookupRes = await fetch(
        `/api/companies-house/lookup?number=${encodeURIComponent(client.company_number)}&includeHistory=true`
      );

      if (!lookupRes.ok) {
        console.error("Companies House lookup failed for imported client:", lookupRes.status, lookupRes.statusText);
        throw new Error("Companies House lookup failed");
      }

      const lookupData: any = await lookupRes.json();

      const registeredAddress = lookupData.registered_address ?
      [
      lookupData.registered_address.address_line_1,
      lookupData.registered_address.address_line_2,
      lookupData.registered_address.locality,
      lookupData.registered_address.postal_code,
      lookupData.registered_address.country].

      filter(Boolean).
      join(", ") :
      null;

      const updatePayload: Partial<ClientToBeOnboarded> = {
        company_name: lookupData.company_name || client.company_name,
        address: registeredAddress || client.address || null,
        company_number: lookupData.company_number || client.company_number
      };

      const { error: updateError } = await supabase
      .from("clients_to_be_onboarded")
      .update(updatePayload)
      .eq("id", client.id);

      if (updateError) {
        console.error("Error updating imported client after enrichment:", updateError);
        throw updateError;
      }

      if (!options?.suppressToast) {
        toast({
          title: "Client enriched",
          description: `Company details updated for ${lookupData.company_name || client.company_name}.`
        });
      }
    } catch (error) {
      console.error("Error enriching imported client:", error);
      if (!options?.suppressToast) {
        toast({
          title: "Enrichment failed",
          description: "Unable to enrich this imported client. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleBulkEnrich = async () => {
    // Prevent double-runs
    if (bulkState.running) {
      console.log("Bulk enrich click ignored because a run is already in progress");
      return;
    }

    console.log("Bulk enrich starting", {
      prospectsToOnboardCount: prospectsToOnboard.length,
      clientsToOnboardCount: clientsToOnboard.length
    });

    const prospectCandidates = prospectsToOnboard.filter(
      (p) => isValidCompaniesHouseNumber(p.company_number)
    );
    const importedCandidates = clientsToOnboard.filter(
      (c) => isValidCompaniesHouseNumber(c.company_number)
    );

    console.log("Bulk enrich candidates", {
      prospectCandidateCount: prospectCandidates.length,
      importedCandidateCount: importedCandidates.length,
      prospectCandidateIds: prospectCandidates.map((c) => c.id),
      importedCandidateIds: importedCandidates.map((c) => c.id)
    });

    if (prospectCandidates.length === 0 && importedCandidates.length === 0) {
      console.log(
        "Bulk enrich: no candidates found (no imported clients or RD prospects with valid company_number)"
      );
      toast({
        title: "No clients to enrich",
        description:
        "Add valid Companies House numbers to clients to be onboarded or RD Companion prospects before running bulk enrichment.",
        variant: "destructive"
      });
      return;
    }

    const total = prospectCandidates.length + importedCandidates.length;

    toast({
      title: "Bulk enrichment started",
      description: `Running enrichment for ${total} client${total === 1 ? "" : "s"}.`
    });

    setBulkState({ running: true, total, completed: 0 });

    try {
      for (const client of importedCandidates) {
        console.log("Bulk enriching imported client", {
          id: client.id,
          company_name: client.company_name,
          company_number: client.company_number
        });

        await enrichImportedClient(client, { suppressToast: true });
        await delay(2000);

        setBulkState((prev) => {
          const nextCompleted = prev.completed + 1;
          console.log("Bulk enrich progress (imported)", {
            completed: nextCompleted,
            total: prev.total
          });
          return {
            ...prev,
            completed: nextCompleted
          };
        });
      }

      for (const prospect of prospectCandidates) {
        console.log("Bulk enriching RD prospect", {
          id: prospect.id,
          company_name: prospect.company_name,
          company_number: prospect.company_number
        });

        await enrichProspect(prospect, { suppressToast: true });
        await delay(2000);

        setBulkState((prev) => {
          const nextCompleted = prev.completed + 1;
          console.log("Bulk enrich progress (prospects)", {
            completed: nextCompleted,
            total: prev.total
          });
          return {
            ...prev,
            completed: nextCompleted
          };
        });
      }

      console.log("Bulk enrichment loop complete");

      toast({
        title: "Bulk enrichment complete",
        description: `Enriched ${total} client${total === 1 ? "" : "s"}.`
      });
    } catch (error) {
      console.error("Bulk enrichment failed", error);
      toast({
        title: "Bulk enrichment failed",
        description:
        "An error occurred while running bulk enrichment. Please check the console for details.",
        variant: "destructive"
      });
    } finally {
      console.log("Bulk enrichment finished, resetting running flag and reloading prospects");
      setBulkState((prev) => ({ ...prev, running: false }));
      await loadProspects();
    }
  };

  const handleDeleteProspect = async (prospect: Prospect) => {
    const confirmed = window.confirm(
      `Delete prospect "${prospect.company_name}" from clients to be onboarded? This cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    try {
      const { error } = await supabase
      .from("prospects")
      .delete()
      .eq("id", prospect.id);

      if (error) {
        console.error("Error deleting prospect:", error);
        toast({
          title: "Delete failed",
          description: "Unable to delete this client. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Client deleted",
        description: `${prospect.company_name} has been removed from clients to be onboarded.`
      });

      await loadProspects();
    } catch (error) {
      console.error("Unexpected error deleting prospect:", error);
      toast({
        title: "Delete failed",
        description: "An unexpected error occurred while deleting this client.",
        variant: "destructive"
      });
    }
  };

  const handleStartImportedClientCIF = (client: ClientToBeOnboarded) => {
    if (!client.company_number) {
      toast({
        title: "Company number required",
        description: "Add a Companies House number before starting a CIF for this client.",
        variant: "destructive"
      });
      return;
    }

    router.push(
      `/staff/cif?companyNumber=${encodeURIComponent(client.company_number)}`
    );
  };

  const filteredProspectsOnboarded = prospectsOnboarded.
  filter((prospect) => {
    if (!onboardedSearch) return true;
    const haystack = [
    prospect.company_name,
    prospect.company_number,
    prospect.company_status].

    filter(Boolean).
    join(" ").
    toLowerCase();
    return haystack.includes(onboardedSearch);
  }).
  sort((a, b) => {
    const nameA = (a.company_name || "").toLowerCase();
    const nameB = (b.company_name || "").toLowerCase();
    if (nameA < nameB) return -1 * sortFactorOnboarded;
    if (nameA > nameB) return 1 * sortFactorOnboarded;
    return 0;
  });

  useEffect(() => {
    const loadNotificationStatuses = async () => {
      try {
        const orgIds = Array.from(
          new Set(
            prospectsOnboarded.
            map((p) => p.org_id).
            filter((id): id is string => Boolean(id))
          )
        );
        if (orgIds.length === 0) return;

        const statuses =
        await organisationNotificationStatusService.getAllStatusesWithOrg();

        const map: Record<string, NotificationStatusState> = {};
        for (const row of statuses) {
          if (!row.organisation_id || !row.status) continue;
          if (!orgIds.includes(row.organisation_id)) continue;
          if (!map[row.organisation_id]) {
            map[row.organisation_id] = row.status as NotificationStatusState;
          }
        }
        setNotificationStatuses(map);
      } catch (error) {
        console.error(
          "Failed to load organisation notification statuses for clients",
          error
        );
      }
    };

    if (prospectsOnboarded.length > 0) {
      void loadNotificationStatuses();
    }
  }, [prospectsOnboarded]);

  if (!isStaff) {
    return null;
  }

  const bulkProgress =
  bulkState.total > 0 ? Math.round(bulkState.completed / bulkState.total * 100) : 0;

  const totalToOnboardCount = clientsToOnboard.length + prospectsToOnboard.length;
  const hasClientsToOnboard = clientsToOnboard.length > 0;
  const hasProspectsToOnboard = prospectsToOnboard.length > 0;

  const toOnboardSearch = searchToOnboard.trim().toLowerCase();
  const onboardedSearch = searchOnboarded.trim().toLowerCase();

  const sortFactorToOnboard = sortToOnboard === "name-asc" ? 1 : -1;
  const sortFactorOnboarded = sortOnboarded === "name-asc" ? 1 : -1;

  const filteredClientsToOnboard = clientsToOnboard.
  filter((client) => {
    if (!toOnboardSearch) return true;
    const haystack = [
    client.company_name,
    client.company_number,
    client.contact_name,
    client.email].

    filter(Boolean).
    join(" ").
    toLowerCase();
    return haystack.includes(toOnboardSearch);
  }).
  sort((a, b) => {
    const nameA = (a.company_name || "").toLowerCase();
    const nameB = (b.company_name || "").toLowerCase();
    if (nameA < nameB) return -1 * sortFactorToOnboard;
    if (nameA > nameB) return 1 * sortFactorToOnboard;
    return 0;
  });

  const filteredProspectsToOnboard = prospectsToOnboard.
  filter((prospect) => {
    if (!toOnboardSearch) return true;
    const haystack = [
    prospect.company_name,
    prospect.company_number,
    prospect.company_status].

    filter(Boolean).
    join(" ").
    toLowerCase();
    return haystack.includes(toOnboardSearch);
  }).
  sort((a, b) => {
    const nameA = (a.company_name || "").toLowerCase();
    const nameB = (b.company_name || "").toLowerCase();
    if (nameA < nameB) return -1 * sortFactorToOnboard;
    if (nameA > nameB) return 1 * sortFactorToOnboard;
    return 0;
  });

  return (
    <>
      <SEO
        title="Clients - Staff Portal"
        description="Manage client onboarding and R&D engagement"
      />

      <StaffLayout>
        <div className="p-6 lg:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-1">
                Clients
              </h1>
              <p className="text-slate-600">
                Manage clients to be onboarded and clients already onboarded
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProspects()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {crmKpisLoading && !crmKpis && (
            <p className="text-sm text-muted-foreground">
              Loading relationship insights…
            </p>
          )}

          {crmKpis && (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>No contact in 30 days</CardDescription>
                  <CardTitle className="text-2xl">
                    {crmKpis.noContactIn30Days}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Clients without any logged activity in the last 30 days.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Follow-ups due today</CardDescription>
                  <CardTitle className="text-2xl">
                    {crmKpis.followUpsDueToday}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Activities with follow-up dates scheduled for today.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Onboarding/CIF in progress</CardDescription>
                  <CardTitle className="text-2xl">
                    {crmKpis.onboardingInProgress}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Clients with CIFs not yet approved or archived.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active claim clients</CardDescription>
                  <CardTitle className="text-2xl">
                    {crmKpis.activeClaimClients}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Organisations with at least one open R&amp;D claim.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>High-priority dossiers</CardDescription>
                  <CardTitle className="text-2xl">
                    {crmKpis.highPriorityDossiers}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Active client dossiers with confidence score ≥ 70.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overdue tasks</CardDescription>
                  <CardTitle className="text-2xl">
                    {crmKpis.overdueTasks}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Open client tasks with due dates in the past.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Clients to be onboarded */}
            <Card className="border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Clients to be onboarded</CardTitle>
                    <CardDescription>
                      Prospects without an organisation yet. Start CIFs and enrich details.
                    </CardDescription>
                  </div>
                </div>
                {totalToOnboardCount > 0 &&
                <Badge variant="outline" className="ml-2">
                    {totalToOnboardCount} client
                    {totalToOnboardCount === 1 ? "" : "s"}
                  </Badge>
                }
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search clients..."
                    value={searchToOnboard}
                    onChange={(e) => setSearchToOnboard(e.target.value)}
                    className="max-w-xs" />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Sort by</span>
                    <select
                      value={sortToOnboard}
                      onChange={(e) =>
                      setSortToOnboard(e.target.value === "name-desc" ? "name-desc" : "name-asc")
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                      
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      console.log("Bulk Enrich button clicked");
                      void handleBulkEnrich();
                    }}
                    disabled={loading || bulkState.running}>
                    
                    {bulkState.running ?
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Bulk enriching...
                      </> :

                    <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Bulk Enrich
                      </>
                    }
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Runs enrichment for all clients to be onboarded (imported and RD Companion prospects) that have a Companies House number.
                  </p>
                </div>

                <div className="space-y-1">
                  <Progress
                    value={bulkState.total > 0 ? bulkProgress : 0}
                    className="h-2" />
                  
                  <p className="text-xs text-muted-foreground">
                    {bulkState.running ?
                    `${bulkState.completed} of ${bulkState.total} enriched (${bulkProgress}%)` :
                    bulkState.total > 0 ?
                    `Last run enriched ${bulkState.total} client${bulkState.total === 1 ? "" : "s"}.` :
                    "Bulk enrichment has not been run yet."}
                  </p>
                </div>

                {loading ?
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading clients...
                  </div> :
                !hasClientsToOnboard && !hasProspectsToOnboard ?
                <div className="py-8 text-center text-sm text-muted-foreground">
                    No clients awaiting onboarding. Add prospects or imported clients to see them here.
                  </div> :

                <div className="space-y-4">
                    {hasClientsToOnboard &&
                  <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-700">
                          Imported clients to be onboarded
                        </p>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {filteredClientsToOnboard.map((client) =>
                      <Card
                        key={client.id}
                        className="border border-border bg-[#0F1D2D] text-secondary-foreground hover:bg-[#14273A] hover:border-border hover:shadow-professional-md transition-colors cursor-pointer"
                        onClick={() => handleOpenClientDetail(client)}>
                        
                              <CardContent className="py-3 px-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-semibold text-sm">
                                      {client.company_name}
                                    </p>
                                    {client.company_number &&
                              <p className="text-xs text-muted-foreground mt-1" style={{ color: "#ffffff" }}>
                                        Company no. {client.company_number}
                                      </p>
                              }
                                    {client.contact_name &&
                              <p className="text-xs text-muted-foreground mt-0.5" style={{ color: "#ffffff" }}>
                                        Contact: {client.contact_name}
                                      </p>
                              }
                                    {client.email &&
                              <p className="text-xs text-muted-foreground mt-0.5 break-all" style={{ color: "#ffffff" }}>
                                        {client.email}
                                      </p>
                              }
                                    {client.address &&
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" style={{ color: "#ffffff" }}>
                                        {client.address}
                                      </p>
                              }
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartImportedClientCIF(client);
                                }}>
                                
                                      <Play className="h-3 w-3 mr-1" />
                                      Start CIF
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                      )}
                        </div>
                      </div>
                  }

                    {hasProspectsToOnboard &&
                  <div className="space-y-2">
                        {hasClientsToOnboard &&
                    <p className="text-xs font-medium text-slate-700 pt-2 border-t border-slate-100">
                            Prospects in RD Companion
                          </p>
                    }
                        <div className="space-y-3">
                          {filteredProspectsToOnboard.map((prospect) => {
                        const state = enrichmentState[prospect.id] || "idle";
                        const isEnriched =
                        !!prospect.company_status ||
                        !!prospect.registered_address ||
                        !!prospect.last_accounts_date;

                        return (
                          <Card
                            key={prospect.id}
                            className="border border-slate-200 hover:shadow-sm transition-shadow">
                            
                                <CardContent className="py-3 px-4 flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">
                                        {prospect.company_name}
                                      </p>
                                      {isEnriched &&
                                  <Badge variant="outline" className="text-xs">
                                          Enriched
                                        </Badge>
                                  }
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {prospect.company_number ?
                                  `Company no. ${prospect.company_number}` :
                                  "No company number set"}
                                    </p>
                                    {prospect.company_status &&
                                <p className="text-xs text-muted-foreground mt-0.5">
                                        Status: {prospect.company_status}
                                      </p>
                                }
                                    {prospect.registered_address &&
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {prospect.registered_address}
                                      </p>
                                }
                                  </div>
                                  <div className="flex flex-col gap-2 items-end">
                                    <Button
                                  size="sm"
                                  className="w-36"
                                  onClick={() => handleStartCIF(prospect)}>
                                  
                                      <Play className="h-3 w-3 mr-1" />
                                      Start CIF
                                    </Button>
                                    <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-36"
                                  onClick={() => void enrichProspect(prospect)}
                                  disabled={state === "loading"}>
                                  
                                      {state === "loading" ?
                                  <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Enriching...
                                        </> :

                                  <>
                                          <Sparkles className="h-3 w-3 mr-1" />
                                          Enrich
                                        </>
                                  }
                                    </Button>
                                    {isAdmin &&
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-36 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => void handleDeleteProspect(prospect)}>
                                  
                                        Delete
                                      </Button>
                                }
                                  </div>
                                </CardContent>
                              </Card>);

                      })}
                        </div>
                      </div>
                  }
                  </div>
                }
              </CardContent>
            </Card>

            {/* Clients onboarded */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500 text-white">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Clients onboarded</CardTitle>
                    <CardDescription>
                      Prospects that have been converted into active client organisations.
                    </CardDescription>
                  </div>
                </div>
                {prospectsOnboarded.length > 0 &&
                <Badge variant="outline" className="ml-2">
                    {prospectsOnboarded.length} client
                    {prospectsOnboarded.length === 1 ? "" : "s"}
                  </Badge>
                }
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search onboarded clients..."
                    value={searchOnboarded}
                    onChange={(e) => setSearchOnboarded(e.target.value)}
                    className="max-w-xs" />
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Sort by</span>
                    <select
                      value={sortOnboarded}
                      onChange={(e) =>
                      setSortOnboarded(e.target.value === "name-desc" ? "name-desc" : "name-asc")
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                      
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                    </select>
                  </div>
                </div>

                {loading ?
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading clients...
                  </div> :
                filteredProspectsOnboarded.length === 0 ?
                <div className="py-8 text-center text-sm text-muted-foreground">
                    No onboarded clients yet.
                  </div> :

                <div className="space-y-3">
                    {filteredProspectsOnboarded.map((prospect) =>
                  <Card
                    key={prospect.id}
                    className="border border-slate-200 hover:shadow-sm transition-shadow">
                    
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm flex items-center gap-2">
                              {prospect.company_name}
                              {prospect.org_id &&
                          (() => {
                            const status = notificationStatuses[prospect.org_id];
                            if (
                            status === "required" ||
                            status === "overdue" ||
                            status === "unclear")
                            {
                              return (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] px-1.5 py-0.5 rounded-full">
                                  
                                        PRE
                                      </Badge>);

                            }
                            return null;
                          })()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {prospect.company_number ?
                          `Company no. ${prospect.company_number}` :
                          "No company number recorded"}
                            </p>
                            {prospect.company_status &&
                        <p className="text-xs text-muted-foreground mt-0.5">
                                Status: {prospect.company_status}
                              </p>
                        }
                          </div>
                          <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push("/staff/cif")}>
                        
                            <ArrowRight className="h-3 w-3 mr-1" />
                            View CIFs
                          </Button>
                        </CardContent>
                      </Card>
                  )}
                  </div>
                }
              </CardContent>
            </Card>
          </div>

          <Dialog open={clientDialogOpen} onOpenChange={(open) => {
            setClientDialogOpen(open);
            if (!open) {
              setSelectedClient(null);
              setClientForm(null);
              setClientEnrichment(null);
              setClientEnrichmentError(null);
              setClientEnrichmentLoading(false);
              setClientSidekickLoading(false);
              setClientAnalysisData(null);
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              {selectedClient &&
              <>
                  <DialogHeader>
                    <DialogTitle>{selectedClient.company_name}</DialogTitle>
                    <DialogDescription>
                      View and edit details for this imported client. Changes are saved to the{" "}
                      <code className="font-mono">clients_to_be_onboarded</code> table.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-2 space-y-4 overflow-y-auto pr-1 flex-1">
                    {/* Sidekick research panel */}
                    {clientSidekickLoading &&
                  <div className="rounded-lg border bg-gradient-to-b from-sky-50 to-sky-100 p-4 text-sm text-slate-800 shadow-sm">
                        <div className="font-medium mb-1">RD Companion is researching this company…</div>
                        <p className="text-slate-700">
                          Analysing industry, size, and public information to provide background detail similar to the CIF creation flow.
                        </p>
                      </div>
                  }

                    {clientAnalysisData &&
                  <div className="rounded-lg border bg-gradient-to-b from-sky-50 to-sky-100 p-4 shadow-sm">
                        <SidekickResearchPanel
                      analysisData={clientAnalysisData}
                      fallbackText={clientResearchFallbackText} />
                    
                      </div>
                  }

                    {/* Companies House enrichment block */}
                    <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-800">
                      <div className="font-semibold mb-2">Enriched company details</div>
                      {clientEnrichmentLoading &&
                    <p className="text-slate-700">Looking up Companies House details for this client…</p>
                    }
                      {clientEnrichmentError &&
                    <p className="text-sm text-red-600">{clientEnrichmentError}</p>
                    }
                      {!clientEnrichmentLoading && !clientEnrichmentError &&
                    <>
                          <p>
                            <span className="font-medium">Company name:</span>{" "}
                            {clientEnrichment?.company_name || selectedClient.company_name || "Not available"}
                          </p>
                          {(clientEnrichment?.company_number || selectedClient.company_number) &&
                      <p>
                              <span className="font-medium">Company number:</span>{" "}
                              {clientEnrichment?.company_number || selectedClient.company_number}
                            </p>
                      }
                          {clientEnrichment?.company_status &&
                      <p>
                              <span className="font-medium">Status:</span>{" "}
                              {clientEnrichment.company_status}
                            </p>
                      }
                          {(clientEnrichment?.registered_office_address || selectedClient.address) &&
                      <p>
                              <span className="font-medium">Registered address:</span>{" "}
                              {clientEnrichment?.registered_office_address ?
                        getRegisteredAddressFromEnrichment(clientEnrichment) :
                        selectedClient.address}
                            </p>
                      }
                          {clientEnrichment?.date_of_creation &&
                      <p>
                              <span className="font-medium">Incorporated:</span>{" "}
                              {clientEnrichment.date_of_creation}
                            </p>
                      }
                          {clientEnrichment?.last_accounts_date &&
                      <p>
                              <span className="font-medium">Last accounts filed:</span>{" "}
                              {clientEnrichment.last_accounts_date}
                            </p>
                      }
                          {!clientEnrichment && !selectedClient.company_number && !selectedClient.address &&
                      <p className="text-slate-700">
                              No enrichment data saved yet. Make sure this client has a valid Companies House number
                              and run enrichment from the clients list to pull in details.
                            </p>
                      }
                        </>
                    }
                    </div>

                    {/* Editable client form */}
                    {clientForm &&
                  <div className="space-y-3 py-2">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Company name</label>
                          <Input
                        value={clientForm.company_name}
                        onChange={(e) => handleClientFieldChange("company_name", e.target.value)} />
                      
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Contact name</label>
                            <Input
                          value={clientForm.contact_name || ""}
                          onChange={(e) => handleClientFieldChange("contact_name", e.target.value)} />
                        
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Title</label>
                            <Input
                          value={clientForm.title || ""}
                          onChange={(e) => handleClientFieldChange("title", e.target.value)} />
                        
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Email</label>
                            <Input
                          value={clientForm.email || ""}
                          onChange={(e) => handleClientFieldChange("email", e.target.value)} />
                        
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Phone</label>
                            <Input
                          value={clientForm.phone || ""}
                          onChange={(e) => handleClientFieldChange("phone", e.target.value)} />
                        
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Landline</label>
                          <Input
                        value={clientForm.landline || ""}
                        onChange={(e) => handleClientFieldChange("landline", e.target.value)} />
                      
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Address</label>
                          <Textarea
                        value={clientForm.address || ""}
                        onChange={(e) => handleClientFieldChange("address", e.target.value)}
                        rows={3} />
                      
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Company number</label>
                            <Input
                          value={clientForm.company_number || ""}
                          onChange={(e) => handleClientFieldChange("company_number", e.target.value)} />
                        
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">UTR</label>
                            <Input
                          value={clientForm.utr || ""}
                          onChange={(e) => handleClientFieldChange("utr", e.target.value)} />
                        
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Fee percentage</label>
                            <Input
                          type="number"
                          step="0.1"
                          value={clientForm.fee_percent ?? ""}
                          onChange={(e) =>
                          handleClientFieldChange(
                            "fee_percent",
                            e.target.value
                          )
                          } />
                        
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700">Year end month</label>
                            <Input
                          value={clientForm.year_end_month || ""}
                          onChange={(e) => handleClientFieldChange("year_end_month", e.target.value)} />
                        
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Referred by</label>
                          <Input
                        value={clientForm.ref_by || ""}
                        onChange={(e) => handleClientFieldChange("ref_by", e.target.value)} />
                      
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Comments</label>
                          <Textarea
                        value={clientForm.comments || ""}
                        onChange={(e) => handleClientFieldChange("comments", e.target.value)}
                        rows={4} />
                      
                        </div>
                      </div>
                  }
                  </div>
                </>
              }
            </DialogContent>
          </Dialog>
        </div>
      </StaffLayout>
    </>);

}