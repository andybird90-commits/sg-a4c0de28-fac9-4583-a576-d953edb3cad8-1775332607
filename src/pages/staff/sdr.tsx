import React, { useState, useEffect, ChangeEvent } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Loader2, Upload, PhoneCall, XCircle, RefreshCcw } from "lucide-react";

type SdrProspect = Tables<"sdr_prospects">;

interface BdmUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function StaffSDRPage(): JSX.Element {
  const { user, loading: appLoading } = useApp();
  const [prospects, setProspects] = useState<SdrProspect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<SdrProspect | null>(null);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [bdmUsers, setBdmUsers] = useState<BdmUser[]>([]);
  const [booking, setBooking] = useState(false);
  const [bookingBdmId, setBookingBdmId] = useState("");
  const [bookingStart, setBookingStart] = useState("");
  const [bookingDuration, setBookingDuration] = useState(30);
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkEnrichedCount, setBulkEnrichedCount] = useState(0);
  const [bulkEnrichTotal, setBulkEnrichTotal] = useState(0);
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [minScoreFilter, setMinScoreFilter] = useState<string>("");

  useEffect(() => {
    if (!user || appLoading) {
      return;
    }
    void loadProspects();
    void loadBdmUsers();
  }, [user, appLoading]);

  const loadProspects = async (): Promise<void> => {
    if (!user) return;
    try {
      setLoadingProspects(true);
      const { data, error } = await supabase
        .from("sdr_prospects")
        .select("*")
        .eq("created_by", user.id)
        .order("rd_viability_score", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading SDR prospects:", error);
        return;
      }

      const list: SdrProspect[] = (data as SdrProspect[]) || [];
      setProspects(list);
      if (!selectedProspect && list.length > 0) {
        setSelectedProspect(list[0]);
      }
    } finally {
      setLoadingProspects(false);
    }
  };

  const loadBdmUsers = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, internal_role")
        .or("role.in.(bdm,admin),internal_role.in.(bdm,admin)")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error loading BDM users:", error);
        return;
      }

      const mapped: BdmUser[] = (data || []).map((p: any) => ({
        id: p.id as string,
        full_name: (p.full_name as string) || (p.email as string | null),
        email: p.email as string | null,
      }));
      setBdmUsers(mapped);
      if (mapped.length > 0 && !bookingBdmId) {
        setBookingBdmId(mapped[0].id);
      }
    } catch (err) {
      console.error("Unexpected error loading BDM users:", err);
    }
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setUploading(false);
        return;
      }

      const rows = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const companyName = parts[0];
        const companyNumber = parts.length > 1 ? parts[1] || null : null;
        return {
          created_by: user.id as string,
          company_name: companyName,
          company_number: companyNumber,
        };
      });

      const { error } = await supabase.from("sdr_prospects").insert(rows);
      if (error) {
        console.error("Error inserting SDR prospects from CSV:", error);
        return;
      }

      await loadProspects();
    } catch (err) {
      console.error("Error processing CSV upload:", err);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleEnrich = async (prospect: SdrProspect): Promise<void> => {
    try {
      setEnrichingId(prospect.id as string);
      const response = await fetch("/api/sdr/enrich", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospectId: prospect.id,
        }),
      });

      if (!response.ok) {
        console.error("Failed to enrich prospect:", await response.text());
        return;
      }

      const updated = (await response.json()) as SdrProspect;
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? updated : p))
      );
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect(updated);
      }
    } catch (err) {
      console.error("Unexpected error enriching prospect:", err);
    } finally {
      setEnrichingId(null);
    }
  };

  const handleBulkEnrich = (): void => {
    if (bulkEnriching) {
      return;
    }

    const queue = prospects.filter((p) => !p.ai_dossier_json);

    if (queue.length === 0) {
      return;
    }

    setBulkEnriching(true);
    setBulkEnrichedCount(0);
    setBulkEnrichTotal(queue.length);

    const processNext = async (index: number): Promise<void> => {
      if (index >= queue.length) {
        setBulkEnriching(false);
        setBulkEnrichTotal(0);
        return;
      }

      const prospect = queue[index];

      await handleEnrich(prospect);
      setBulkEnrichedCount(index + 1);

      if (index < queue.length - 1) {
        setTimeout(() => {
          void processNext(index + 1);
        }, 5000);
      } else {
        setBulkEnriching(false);
        setBulkEnrichTotal(0);
      }
    };

    void processNext(0);
  };

  const handleMarkOutcome = async (
    prospect: SdrProspect,
    status: "not_interested" | "contacted"
  ): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("sdr_prospects")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prospect.id)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error updating SDR prospect outcome:", error);
        return;
      }

      const updated = data as SdrProspect | null;
      if (!updated) return;

      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? updated : p))
      );
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect(updated);
      }
    } catch (err) {
      console.error("Unexpected error updating SDR prospect outcome:", err);
    }
  };

  const handleBookCall = async (): Promise<void> => {
    if (!selectedProspect || !bookingBdmId || !bookingStart) {
      return;
    }

    try {
      setBooking(true);
      const response = await fetch("/api/sdr/book-bdm-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospectId: selectedProspect.id,
          bdmUserId: bookingBdmId,
          startIso: bookingStart,
          durationMinutes: bookingDuration,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to book BDM call:", result);
        return;
      }

      if (result.updatedProspect) {
        const updated = result.updatedProspect as SdrProspect;
        setProspects((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        setSelectedProspect(updated);
      }
    } catch (err) {
      console.error("Unexpected error booking BDM call:", err);
    } finally {
      setBooking(false);
    }
  };

  const renderScoreBadge = (score: number | null): JSX.Element => {
    if (score == null) {
      return <Badge variant="outline">Not scored</Badge>;
    }
    let variant: "default" | "secondary" | "destructive" = "secondary";
    if (score >= 80) {
      variant = "default";
    } else if (score < 50) {
      variant = "destructive";
    }
    return (
      <Badge variant={variant}>
        R&amp;D score: {score.toFixed(1)} / 100
      </Badge>
    );
  };

  const getDossier = (prospect: SdrProspect | null): any | null => {
    if (!prospect || !prospect.ai_dossier_json) return null;
    return prospect.ai_dossier_json as any;
  };

  const dossier = getDossier(selectedProspect);
  const enrichedProspects = prospects.filter(
    (prospect) => !!prospect.ai_dossier_json
  );

  const minScoreValue =
    minScoreFilter.trim() === ""
      ? null
      : Number.parseFloat(minScoreFilter.trim());

  const filteredEnrichedProspects = enrichedProspects.filter((prospect) => {
    if (minScoreValue == null || Number.isNaN(minScoreValue)) {
      return true;
    }
    const score = (prospect.rd_viability_score as number | null) ?? null;
    if (score == null) return false;
    return score >= minScoreValue;
  });

  const sortedEnrichedProspects = [...filteredEnrichedProspects].sort(
    (a, b) => {
      const aScore = (a.rd_viability_score as number | null) ?? 0;
      const bScore = (b.rd_viability_score as number | null) ?? 0;
      return sortDirection === "desc" ? bScore - aScore : aScore - bScore;
    }
  );

  const unenrichedCount = prospects.filter(
    (prospect) => !prospect.ai_dossier_json
  ).length;

  const callQueue = sortedEnrichedProspects
    .filter((prospect) => {
      const status = (prospect.status as string | null) ?? "";
      const blockedStatuses = ["not_interested", "contacted"];
      return (
        !prospect.bdm_call_scheduled_at && !blockedStatuses.includes(status)
      );
    })
    .slice(0, 10);

  return (
    <StaffLayout title="SDR" fullWidth>
      <div className="mx-auto flex w-full max-w-none flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            SDR Radar
          </h1>
          <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
            Upload prospect companies, let the assistant build R&amp;D dossiers, then
            rank and book BDM discovery calls from a single workspace.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.7fr_2.3fr_1fr]">
          {/* Left column: upload + ranked prospects */}
          <div className="space-y-4">
            <Card className="w-full max-w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Prospect upload
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Upload a CSV with one company per line (name, optional company
                    number).
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:text-sm">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload CSV"}
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                    disabled={uploading}
                  />
                </label>
              </CardHeader>
            </Card>

            <Card className="flex h-[700px] w-full max-w-full flex-col overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Ranked prospects
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={loadProspects}
                  disabled={loadingProspects}
                  aria-label="Refresh prospects"
                >
                  {loadingProspects ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 overflow-y-auto">
                {loadingProspects && prospects.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading prospects…
                  </div>
                ) : prospects.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No SDR prospects yet. Upload a CSV to get started.
                  </p>
                ) : (
                  prospects.map((prospect) => (
                    <button
                      key={prospect.id as string}
                      type="button"
                      onClick={() => setSelectedProspect(prospect)}
                      className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition hover:bg-slate-50 ${
                        selectedProspect?.id === prospect.id
                          ? "border-slate-900 bg-slate-900/5"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {prospect.company_name}
                          </p>
                          {prospect.company_number ? (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Company no: {prospect.company_number}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {renderScoreBadge(
                            (prospect.rd_viability_score as number | null) ?? null
                          )}
                          <Badge variant="outline" className="text-[11px]">
                            {prospect.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle column: enriched dossiers */}
          <Card className="flex h-[700px] w-full max-w-full flex-col overflow-hidden">
            <CardHeader className="space-y-2">
              <div className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Enriched dossiers
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    Prospects that already have an AI-generated R&amp;D dossier. Use
                    the controls below to sort and filter by R&amp;D score.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkEnrich}
                  disabled={bulkEnriching || unenrichedCount === 0}
                >
                  {bulkEnriching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {bulkEnrichTotal > 0
                        ? `Bulk enriching ${bulkEnrichedCount}/${bulkEnrichTotal}`
                        : "Bulk enriching"}
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      {unenrichedCount > 0
                        ? `Bulk enrich ${unenrichedCount} prospect${
                            unenrichedCount === 1 ? "" : "s"
                          }`
                        : "Bulk enrich"}
                    </>
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Sort:</span>
                  <Button
                    variant={sortDirection === "desc" ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSortDirection("desc")}
                  >
                    Highest first
                  </Button>
                  <Button
                    variant={sortDirection === "asc" ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setSortDirection("asc")}
                  >
                    Lowest first
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Min score:</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(e.target.value)}
                    className="h-7 w-20 px-2 py-1 text-xs"
                  />
                </div>
                <span className="ml-auto text-slate-500">
                  {sortedEnrichedProspects.length} result
                  {sortedEnrichedProspects.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {sortedEnrichedProspects.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No enriched dossiers yet. Use the Enrich button on a prospect or run
                  a bulk enrich.
                </p>
              ) : (
                <div className="w-full max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead className="w-32">R&amp;D score</TableHead>
                        <TableHead className="w-28">Status</TableHead>
                        <TableHead className="w-40">BDM call</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEnrichedProspects.map((prospect) => (
                        <TableRow
                          key={prospect.id as string}
                          className="cursor-pointer"
                          onClick={() => setSelectedProspect(prospect)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900">
                                {prospect.company_name}
                              </span>
                              {prospect.company_number ? (
                                <span className="text-xs text-slate-500">
                                  Company no: {prospect.company_number}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {prospect.rd_viability_score != null ? (
                              <span>
                                {(prospect.rd_viability_score as number).toFixed(1)} / 100
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Not scored</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px]">
                              {prospect.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {prospect.bdm_call_scheduled_at ? (
                              <span className="text-xs text-slate-500">
                                {new Date(
                                  prospect.bdm_call_scheduled_at as string
                                ).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500">Not booked</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: dossier */}
          <Card className="flex h-[700px] w-full max-w-full flex-col overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">
                Dossier
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 w-full max-w-full overflow-y-auto overflow-x-hidden">
              <div className="flex w-full max-w-full flex-col gap-4">
                {!selectedProspect ? (
                  <p className="text-sm text-slate-500">
                    Select a prospect on the left to view its dossier.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          {selectedProspect.company_name}
                        </h2>
                        {selectedProspect.company_number ? (
                          <p className="text-xs text-slate-500">
                            Company no: {selectedProspect.company_number}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderScoreBadge(
                          (selectedProspect.rd_viability_score as number | null) ?? null
                        )}
                        {selectedProspect.estimated_claim_band ? (
                          <Badge variant="outline">
                            Band: {selectedProspect.estimated_claim_band}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 sm:items-end">
                      <div className="min-w-[9rem] flex-1 space-y-1">
                        <label className="block text-xs font-medium text-slate-600">
                          BDM
                        </label>
                        <select
                          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          value={bookingBdmId}
                          onChange={(e) => setBookingBdmId(e.target.value)}
                        >
                          {bdmUsers.map((bdm) => (
                            <option key={bdm.id} value={bdm.id}>
                              {bdm.full_name || bdm.email || "Unnamed user"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-[11rem] flex-[1.2] space-y-1">
                        <label className="block text-xs font-medium text-slate-600">
                          Start (your local time)
                        </label>
                        <Input
                          type="datetime-local"
                          value={bookingStart}
                          onChange={(e) => setBookingStart(e.target.value)}
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="block text-xs font-medium text-slate-600">
                          Duration (min)
                        </label>
                        <Input
                          type="number"
                          min={15}
                          max={180}
                          value={bookingDuration}
                          onChange={(e) =>
                            setBookingDuration(
                              Number.isNaN(parseInt(e.target.value, 10))
                                ? 30
                                : parseInt(e.target.value, 10)
                            )
                          }
                        />
                      </div>
                      <div className="flex items-end w-full sm:w-auto">
                        <Button
                          size="sm"
                          className="w-full sm:w-auto sm:ml-1"
                          disabled={booking || !bookingBdmId || !bookingStart}
                          onClick={handleBookCall}
                        >
                          {booking ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Booking…
                            </>
                          ) : (
                            <>
                              <PhoneCall className="mr-2 h-4 w-4" />
                              Book BDM call
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {selectedProspect?.bdm_call_scheduled_at && (
                      <p className="mt-2 text-xs text-slate-500">
                        BDM call scheduled at{" "}
                        {new Date(
                          selectedProspect.bdm_call_scheduled_at as string
                        ).toLocaleString()}{" "}
                        {selectedProspect.bdm_call_teams_link
                          ? ` • Teams: ${selectedProspect.bdm_call_teams_link}`
                          : null}
                      </p>
                    )}

                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Book BDM call
                      </h3>
                      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
                        <div className="w-full space-y-1 md:min-w-[9rem] md:flex-1">
                          <label className="block text-xs font-medium text-slate-600">
                            BDM
                          </label>
                          <select
                            className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            value={bookingBdmId}
                            onChange={(e) => setBookingBdmId(e.target.value)}
                          >
                            {bdmUsers.map((bdm) => (
                              <option key={bdm.id} value={bdm.id}>
                                {bdm.full_name || bdm.email || "Unnamed user"}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full space-y-1 md:min-w-[11rem] md:flex-[1.2]">
                          <label className="block text-xs font-medium text-slate-600">
                            Start (your local time)
                          </label>
                          <Input
                            type="datetime-local"
                            value={bookingStart}
                            onChange={(e) => setBookingStart(e.target.value)}
                          />
                        </div>
                        <div className="w-full space-y-1 md:w-28">
                          <label className="block text-xs font-medium text-slate-600">
                            Duration (min)
                          </label>
                          <Input
                            type="number"
                            min={15}
                            max={180}
                            value={bookingDuration}
                            onChange={(e) =>
                              setBookingDuration(
                                Number.isNaN(parseInt(e.target.value, 10))
                                  ? 30
                                  : parseInt(e.target.value, 10)
                              )
                            }
                          />
                        </div>
                        <div className="flex items-end w-full md:w-auto">
                          <Button
                            size="sm"
                            className="w-full sm:w-auto sm:ml-1"
                            disabled={booking || !bookingBdmId || !bookingStart}
                            onClick={handleBookCall}
                          >
                            {booking ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Booking…
                              </>
                            ) : (
                              <>
                                <PhoneCall className="mr-2 h-4 w-4" />
                                Book BDM call
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="mt-6 w-full">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Next 10 calls
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Highest-scoring enriched prospects without a booked BDM call. As you
                mark calls done, new ones automatically appear so you always have the
                next 10 ready.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {callQueue.length} of {sortedEnrichedProspects.length} prospects in call
              queue
            </p>
          </CardHeader>
          <CardContent>
            {callQueue.length === 0 ? (
              <p className="text-sm text-slate-500">
                There are no enriched prospects waiting for a call. Enrich more
                prospects or update outcomes to see new calls here.
              </p>
            ) : (
              <div className="space-y-3">
                {callQueue.map((prospect, index) => {
                  const prospectDossier = getDossier(prospect);
                  const score =
                    (prospect.rd_viability_score as number | null) ?? null;

                  return (
                    <div
                      key={prospect.id as string}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500">
                              Call #{index + 1}
                            </span>
                            {score != null && renderScoreBadge(score)}
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                            {prospect.company_name}
                          </p>
                          {prospect.company_number ? (
                            <p className="text-xs text-slate-500">
                              Company no: {prospect.company_number}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">
                            Status:{" "}
                            <span className="font-medium">
                              {prospect.status.replace(/_/g, " ")}
                            </span>
                          </p>
                        </div>

                        <div className="flex-1 space-y-1">
                          {prospectDossier?.call_script_intro ||
                          prospectDossier?.call_script_main ? (
                            <>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Call script
                              </p>
                              {prospectDossier?.call_script_intro ? (
                                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                                  {prospectDossier.call_script_intro}
                                </p>
                              ) : null}
                              {prospectDossier?.call_script_main ? (
                                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                                  {prospectDossier.call_script_main}
                                </p>
                              ) : null}
                            </>
                          ) : prospectDossier?.rd_summary ? (
                            <>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                R&amp;D summary
                              </p>
                              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                                {prospectDossier.rd_summary}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-slate-500">
                              No script available yet. Enrich the dossier to generate
                              one.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            if (typeof window !== "undefined") {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                          }}
                        >
                          View in dossier panel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs"
                          onClick={() =>
                            void handleMarkOutcome(prospect, "contacted")
                          }
                        >
                          Mark call done
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}