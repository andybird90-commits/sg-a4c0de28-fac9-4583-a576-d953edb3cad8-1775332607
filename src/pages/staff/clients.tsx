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
  fee_percent: client.fee_percent !== null && client.fee_percent !== undefined ? String(client.fee_percent) : "",
  year_end_month: client.year_end_month || "",
  ref_by: client.ref_by || "",
  comments: client.comments || ""
});

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

  const handleStartCIF = (prospect: Prospect) => {
    const companyNumber = prospect.company_number || "";
    router.push(
      companyNumber
        ? `/staff/cif?companyNumber=${encodeURIComponent(companyNumber)}`
        : "/staff/cif"
    );
  };

  const handleOpenClientDetail = (client: ClientToBeOnboarded) => {
    setSelectedClient(client);
    setClientForm(createClientFormState(client));
    setClientDialogOpen(true);
  };

  const handleClientFieldChange = (field: keyof ClientFormState, value: string) => {
    setClientForm((prev) => (prev ? { ...prev, [field]: value } : prev));
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

  const enrichProspect = async (prospect: Prospect, options?: { suppressToast?: boolean }) => {
    if (!prospect.company_number) {
      if (!options?.suppressToast) {
        toast({
          title: "Company number required",
          description: "Add a Companies House number before enriching this client.",
          variant: "destructive"
        });
      }
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

      const registeredAddress = lookupData.registered_address
        ? [
            lookupData.registered_address.address_line_1,
            lookupData.registered_address.address_line_2,
            lookupData.registered_address.locality,
            lookupData.registered_address.postal_code,
            lookupData.registered_address.country
          ]
            .filter(Boolean)
            .join(", ")
        : null;

      const numberOfDirectors =
        lookupData.officers && lookupData.officers.active_count
          ? lookupData.officers.active_count
          : null;

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

  const handleBulkEnrich = async () => {
    if (bulkState.running) {
      return;
    }

    const candidates = prospectsToOnboard.filter((p) => !!p.company_number);

    if (candidates.length === 0) {
      toast({
        title: "No clients to enrich",
        description: "Add company numbers to RD Companion prospects before running bulk enrichment.",
        variant: "destructive"
      });
      return;
    }

    setBulkState({ running: true, total: candidates.length, completed: 0 });

    for (const prospect of candidates) {
      await enrichProspect(prospect, { suppressToast: true });
      setBulkState((prev) => ({
        ...prev,
        completed: prev.completed + 1
      }));
    }

    setBulkState((prev) => ({ ...prev, running: false }));

    toast({
      title: "Bulk enrichment complete",
      description: `Enriched ${candidates.length} client${candidates.length === 1 ? "" : "s"}.`
    });

    await loadProspects();
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

  if (!isStaff) {
    return null;
  }

  const bulkProgress =
    bulkState.total > 0 ? Math.round((bulkState.completed / bulkState.total) * 100) : 0;

  const totalToOnboardCount = clientsToOnboard.length + prospectsToOnboard.length;
  const hasClientsToOnboard = clientsToOnboard.length > 0;
  const hasProspectsToOnboard = prospectsToOnboard.length > 0;

  const toOnboardSearch = searchToOnboard.trim().toLowerCase();
  const onboardedSearch = searchOnboarded.trim().toLowerCase();

  const sortFactorToOnboard = sortToOnboard === "name-asc" ? 1 : -1;
  const sortFactorOnboarded = sortOnboarded === "name-asc" ? 1 : -1;

  const filteredClientsToOnboard = clientsToOnboard
    .filter((client) => {
      if (!toOnboardSearch) return true;
      const haystack = [
        client.company_name,
        client.company_number,
        client.contact_name,
        client.email
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(toOnboardSearch);
    })
    .sort((a, b) => {
      const nameA = (a.company_name || "").toLowerCase();
      const nameB = (b.company_name || "").toLowerCase();
      if (nameA < nameB) return -1 * sortFactorToOnboard;
      if (nameA > nameB) return 1 * sortFactorToOnboard;
      return 0;
    });

  const filteredProspectsToOnboard = prospectsToOnboard
    .filter((prospect) => {
      if (!toOnboardSearch) return true;
      const haystack = [
        prospect.company_name,
        prospect.company_number,
        prospect.company_status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(toOnboardSearch);
    })
    .sort((a, b) => {
      const nameA = (a.company_name || "").toLowerCase();
      const nameB = (b.company_name || "").toLowerCase();
      if (nameA < nameB) return -1 * sortFactorToOnboard;
      if (nameA > nameB) return 1 * sortFactorToOnboard;
      return 0;
    });

  const filteredProspectsOnboarded = prospectsOnboarded
    .filter((prospect) => {
      if (!onboardedSearch) return true;
      const haystack = [
        prospect.company_name,
        prospect.company_number,
        prospect.company_status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(onboardedSearch);
    })
    .sort((a, b) => {
      const nameA = (a.company_name || "").toLowerCase();
      const nameB = (b.company_name || "").toLowerCase();
      if (nameA < nameB) return -1 * sortFactorOnboarded;
      if (nameA > nameB) return 1 * sortFactorOnboarded;
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
                {totalToOnboardCount > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {totalToOnboardCount} client
                    {totalToOnboardCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search clients..."
                    value={searchToOnboard}
                    onChange={(e) => setSearchToOnboard(e.target.value)}
                    className="max-w-xs"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Sort by</span>
                    <select
                      value={sortToOnboard}
                      onChange={(e) =>
                        setSortToOnboard(e.target.value === "name-desc" ? "name-desc" : "name-asc")
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={handleBulkEnrich}
                      disabled={loading || bulkState.running}
                    >
                      {bulkState.running ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Bulk enriching...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Bulk Enrich
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Runs enrichment for all RD Companion prospects with a Companies House number.
                    </p>
                  </div>
                </div>

                {bulkState.running && (
                  <div className="space-y-1">
                    <Progress value={bulkProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {bulkState.completed} of {bulkState.total} enriched ({bulkProgress}%)
                    </p>
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading clients...
                  </div>
                ) : !hasClientsToOnboard && !hasProspectsToOnboard ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No clients awaiting onboarding. Add prospects or imported clients to see them here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hasClientsToOnboard && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-700">
                          Imported clients to be onboarded
                        </p>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                          {filteredClientsToOnboard.map((client) => (
                            <Card
                              key={client.id}
                              className="border border-slate-200 hover:shadow-sm transition-shadow cursor-pointer hover:bg-slate-50"
                              onClick={() => handleOpenClientDetail(client)}
                            >
                              <CardContent className="py-3 px-4">
                                <p className="font-semibold text-sm">
                                  {client.company_name}
                                </p>
                                {client.company_number && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Company no. {client.company_number}
                                  </p>
                                )}
                                {client.contact_name && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Contact: {client.contact_name}
                                  </p>
                                )}
                                {client.email && (
                                  <p className="text-xs text-muted-foreground mt-0.5 break-all">
                                    {client.email}
                                  </p>
                                )}
                                {client.address && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {client.address}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasProspectsToOnboard && (
                      <div className="space-y-2">
                        {hasClientsToOnboard && (
                          <p className="text-xs font-medium text-slate-700 pt-2 border-t border-slate-100">
                            Prospects in RD Companion
                          </p>
                        )}
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
                                className="border border-slate-200 hover:shadow-sm transition-shadow"
                              >
                                <CardContent className="py-3 px-4 flex items-start justify-between gap-4">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm">
                                        {prospect.company_name}
                                      </p>
                                      {isEnriched && (
                                        <Badge variant="outline" className="text-xs">
                                          Enriched
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {prospect.company_number
                                        ? `Company no. ${prospect.company_number}`
                                        : "No company number set"}
                                    </p>
                                    {prospect.company_status && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        Status: {prospect.company_status}
                                      </p>
                                    )}
                                    {prospect.registered_address && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {prospect.registered_address}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2 items-end">
                                    <Button
                                      size="sm"
                                      className="w-36"
                                      onClick={() => handleStartCIF(prospect)}
                                    >
                                      <Play className="h-3 w-3 mr-1" />
                                      Start CIF
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="w-36"
                                      onClick={() => void enrichProspect(prospect)}
                                      disabled={state === "loading"}
                                    >
                                      {state === "loading" ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          Enriching...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="h-3 w-3 mr-1" />
                                          Enrich
                                        </>
                                      )}
                                    </Button>
                                    {isAdmin && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-36 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => void handleDeleteProspect(prospect)}
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                {prospectsOnboarded.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {prospectsOnboarded.length} client
                    {prospectsOnboarded.length === 1 ? "" : "s"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Input
                    placeholder="Search onboarded clients..."
                    value={searchOnboarded}
                    onChange={(e) => setSearchOnboarded(e.target.value)}
                    className="max-w-xs"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Sort by</span>
                    <select
                      value={sortOnboarded}
                      onChange={(e) =>
                        setSortOnboarded(e.target.value === "name-desc" ? "name-desc" : "name-asc")
                      }
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="name-asc">Name A–Z</option>
                      <option value="name-desc">Name Z–A</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Loading clients...
                  </div>
                ) : filteredProspectsOnboarded.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No onboarded clients yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProspectsOnboarded.map((prospect) => (
                      <Card
                        key={prospect.id}
                        className="border border-slate-200 hover:shadow-sm transition-shadow"
                      >
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-sm">
                              {prospect.company_name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {prospect.company_number
                                ? `Company no. ${prospect.company_number}`
                                : "No company number recorded"}
                            </p>
                            {prospect.company_status && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Status: {prospect.company_status}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/staff/cif")}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            View CIFs
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {clientForm?.company_name || "Client details"}
              </DialogTitle>
              <DialogDescription>
                View and edit details for this imported client. Changes are saved to the
                clients_to_be_onboarded table.
              </DialogDescription>
            </DialogHeader>
            {clientForm && (
              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-700">Company name</p>
                  <Input
                    value={clientForm.company_name}
                    onChange={(e) => handleClientFieldChange("company_name", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Contact name</p>
                    <Input
                      value={clientForm.contact_name}
                      onChange={(e) => handleClientFieldChange("contact_name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Title</p>
                    <Input
                      value={clientForm.title}
                      onChange={(e) => handleClientFieldChange("title", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Email</p>
                    <Input
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => handleClientFieldChange("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Phone</p>
                    <Input
                      value={clientForm.phone}
                      onChange={(e) => handleClientFieldChange("phone", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Landline</p>
                    <Input
                      value={clientForm.landline}
                      onChange={(e) => handleClientFieldChange("landline", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Company number</p>
                    <Input
                      value={clientForm.company_number}
                      onChange={(e) => handleClientFieldChange("company_number", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">UTR</p>
                    <Input
                      value={clientForm.utr}
                      onChange={(e) => handleClientFieldChange("utr", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Fee percentage</p>
                    <Input
                      value={clientForm.fee_percent}
                      onChange={(e) => handleClientFieldChange("fee_percent", e.target.value)}
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Year end month</p>
                    <Input
                      value={clientForm.year_end_month}
                      onChange={(e) => handleClientFieldChange("year_end_month", e.target.value)}
                      placeholder="e.g. March"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-700">Referred by</p>
                    <Input
                      value={clientForm.ref_by}
                      onChange={(e) => handleClientFieldChange("ref_by", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-700">Address</p>
                  <Textarea
                    value={clientForm.address}
                    onChange={(e) => handleClientFieldChange("address", e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-700">Comments</p>
                  <Textarea
                    value={clientForm.comments}
                    onChange={(e) => handleClientFieldChange("comments", e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteClientFromDialog}
                disabled={clientDeleting || clientSaving}
              >
                {clientDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete client"
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setClientDialogOpen(false);
                    setSelectedClient(null);
                    setClientForm(null);
                  }}
                  disabled={clientSaving || clientDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveClient}
                  disabled={clientSaving || clientDeleting}
                >
                  {clientSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StaffLayout>
    </>
  );
}