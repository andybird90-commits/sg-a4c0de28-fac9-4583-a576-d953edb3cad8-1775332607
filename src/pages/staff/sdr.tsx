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
  Loader2,
  Upload,
  PhoneCall,
  XCircle,
  RefreshCcw,
} from "lucide-react";

type SdrProspect = Tables<"sdr_prospects">;

interface BdmUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default function StaffSDRPage() {
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

  useEffect(() => {
    if (!user || appLoading) {
      return;
    }
    void loadProspects();
    void loadBdmUsers();
  }, [user, appLoading]);

  const loadProspects = async () => {
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

      const list = data || [];
      setProspects(list);
      if (!selectedProspect && list.length > 0) {
        setSelectedProspect(list[0]);
      }
    } finally {
      setLoadingProspects(false);
    }
  };

  const loadBdmUsers = async () => {
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
        full_name: (p.full_name as string) || p.email,
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

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

      if (lines.length === 0) {
        setUploading(false);
        return;
      }

      const rows = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const companyName = parts[0];
        const companyNumber = parts.length > 1 ? parts[1] || null : null;
        return {
          created_by: user.id,
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
      event.target.value = "";
    }
  };

  const handleEnrich = async (prospect: SdrProspect) => {
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

      const updated = await response.json();
      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? { ...p, ...updated } as SdrProspect : p))
      );
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect((prev) => (prev ? ({ ...prev, ...updated } as SdrProspect) : prev));
      }
    } catch (err) {
      console.error("Unexpected error enriching prospect:", err);
    } finally {
      setEnrichingId(null);
    }
  };

  const handleMarkOutcome = async (
    prospect: SdrProspect,
    status: "not_interested" | "contacted"
  ) => {
    try {
      const { data, error } = await supabase
        .from("sdr_prospects")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prospect.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating SDR prospect outcome:", error);
        return;
      }

      setProspects((prev) =>
        prev.map((p) => (p.id === prospect.id ? (data as SdrProspect) : p))
      );
      if (selectedProspect?.id === prospect.id) {
        setSelectedProspect(data as SdrProspect);
      }
    } catch (err) {
      console.error("Unexpected error updating SDR prospect outcome:", err);
    }
  };

  const handleBookCall = async () => {
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
        setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSelectedProspect(updated);
      }
    } catch (err) {
      console.error("Unexpected error booking BDM call:", err);
    } finally {
      setBooking(false);
    }
  };

  const renderScoreBadge = (score: number | null) => {
    if (score == null) {
      return <Badge variant="outline">Not scored</Badge>;
    }
    let variant: "default" | "secondary" | "destructive" = "secondary";
    if (score &gt;= 80) {
      variant = "default";
    } else if (score &lt; 50) {
      variant = "destructive";
    }
    return (
      &lt;Badge variant={variant}&gt;
        R&amp;D score: {score.toFixed(1)} / 100
      &lt;/Badge&gt;
    );
  };

  const getDossier = (prospect: SdrProspect | null): any | null =&gt; {
    if (!prospect || !prospect.ai_dossier_json) return null;
    return prospect.ai_dossier_json as any;
  };

  const dossier = getDossier(selectedProspect);

  return (
    &lt;StaffLayout title="SDR"&gt;
      &lt;div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8"&gt;
        &lt;header className="space-y-2"&gt;
          &lt;h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl"&gt;
            SDR Radar
          &lt;/h1&gt;
          &lt;p className="max-w-2xl text-sm text-slate-600 sm:text-base"&gt;
            Upload prospect companies, let the assistant build R&amp;D dossiers, then rank and
            book BDM discovery calls from a single workspace.
          &lt;/p&gt;
        &lt;/header&gt;

        &lt;section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"&gt;
          &lt;div className="space-y-4"&gt;
            &lt;Card&gt;
              &lt;CardHeader className="flex flex-row items-center justify-between space-y-0"&gt;
                &lt;div&gt;
                  &lt;CardTitle className="text-base font-semibold text-slate-900"&gt;
                    Prospect upload
                  &lt;/CardTitle&gt;
                  &lt;p className="mt-1 text-xs text-slate-500 sm:text-sm"&gt;
                    Upload a CSV with one company per line (name, optional company number).
                  &lt;/p&gt;
                &lt;/div&gt;
                &lt;label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:text-sm"&gt;
                  &lt;Upload className="h-4 w-4" /&gt;
                  {uploading ? "Uploading…" : "Upload CSV"}
                  &lt;Input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                    disabled={uploading}
                  /&gt;
                &lt;/label&gt;
              &lt;/CardHeader&gt;
            &lt;/Card&gt;

            &lt;Card className="h-[520px] overflow-hidden"&gt;
              &lt;CardHeader className="flex flex-row items-center justify-between space-y-0"&gt;
                &lt;CardTitle className="text-base font-semibold text-slate-900"&gt;
                  Ranked prospects
                &lt;/CardTitle&gt;
                &lt;Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={loadProspects}
                  disabled={loadingProspects}
                  aria-label="Refresh prospects"
                &gt;
                  {loadingProspects ? (
                    &lt;Loader2 className="h-4 w-4 animate-spin" /&gt;
                  ) : (
                    &lt;RefreshCcw className="h-4 w-4" /&gt;
                  )}
                &lt;/Button&gt;
              &lt;/CardHeader&gt;
              &lt;CardContent className="h-[460px] space-y-2 overflow-y-auto"&gt;
                {loadingProspects &amp;&amp; prospects.length === 0 ? (
                  &lt;div className="flex h-full items-center justify-center text-sm text-slate-500"&gt;
                    &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt;
                    Loading prospects…
                  &lt;/div&gt;
                ) : prospects.length === 0 ? (
                  &lt;p className="text-sm text-slate-500"&gt;
                    No SDR prospects yet. Upload a CSV to get started.
                  &lt;/p&gt;
                ) : (
                  prospects.map((prospect) =&gt; (
                    &lt;button
                      key={prospect.id as string}
                      type="button"
                      onClick={() =&gt; setSelectedProspect(prospect)}
                      className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition hover:bg-slate-50 ${
                        selectedProspect?.id === prospect.id
                          ? "border-slate-900 bg-slate-900/5"
                          : "border-slate-200 bg-white"
                      }`}
                    &gt;
                      &lt;div className="flex items-center justify-between gap-2"&gt;
                        &lt;div className="min-w-0"&gt;
                          &lt;p className="truncate text-sm font-semibold text-slate-900"&gt;
                            {prospect.company_name}
                          &lt;/p&gt;
                          {prospect.company_number ? (
                            &lt;p className="mt-0.5 text-xs text-slate-500"&gt;
                              Company no: {prospect.company_number}
                            &lt;/p&gt;
                          ) : null}
                        &lt;/div&gt;
                        &lt;div className="flex flex-col items-end gap-1"&gt;
                          {renderScoreBadge(
                            prospect.rd_viability_score as number | null
                          )}
                          &lt;Badge variant="outline" className="text-[11px]"&gt;
                            {prospect.status.replace(/_/g, " ")}
                          &lt;/Badge&gt;
                        &lt;/div&gt;
                      &lt;/div&gt;
                    &lt;/button&gt;
                  ))
                )}
              &lt;/CardContent&gt;
            &lt;/Card&gt;
          &lt;/div&gt;

          &lt;Card className="h-[620px] overflow-hidden"&gt;
            &lt;CardHeader&gt;
              &lt;CardTitle className="text-base font-semibold text-slate-900"&gt;
                Dossier
              &lt;/CardTitle&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent className="flex h-[560px] flex-col gap-4 overflow-y-auto"&gt;
              {!selectedProspect ? (
                &lt;p className="text-sm text-slate-500"&gt;
                  Select a prospect on the left to view its dossier.
                &lt;/p&gt;
              ) : (
                &lt;&gt;
                  &lt;div className="flex flex-wrap items-center justify-between gap-2"&gt;
                    &lt;div&gt;
                      &lt;h2 className="text-lg font-semibold text-slate-900"&gt;
                        {selectedProspect.company_name}
                      &lt;/h2&gt;
                      {selectedProspect.company_number ? (
                        &lt;p className="text-xs text-slate-500"&gt;
                          Company no: {selectedProspect.company_number}
                        &lt;/p&gt;
                      ) : null}
                    &lt;/div&gt;
                    &lt;div className="flex flex-wrap items-center gap-2"&gt;
                      {renderScoreBadge(
                        selectedProspect.rd_viability_score as number | null
                      )}
                      {selectedProspect.estimated_claim_band ? (
                        &lt;Badge variant="outline"&gt;
                          Band: {selectedProspect.estimated_claim_band}
                        &lt;/Badge&gt;
                      ) : null}
                    &lt;/div&gt;
                  &lt;/div&gt;

                  &lt;div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3"&gt;
                    &lt;Button
                      size="sm"
                      variant="outline"
                      onClick={() =&gt; handleEnrich(selectedProspect)}
                      disabled={!!enrichingId}
                    &gt;
                      {enrichingId === selectedProspect.id ? (
                        &lt;&gt;
                          &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt;
                          Enriching…
                        &lt;/&gt;
                      ) : (
                        &lt;&gt;
                          &lt;RefreshCcw className="mr-2 h-4 w-4" /&gt;
                          Enrich / refresh dossier
                        &lt;/&gt;
                      )}
                    &lt;/Button&gt;
                    &lt;Button
                      size="sm"
                      variant="outline"
                      onClick={() =&gt; handleMarkOutcome(selectedProspect, "not_interested")}
                    &gt;
                      &lt;XCircle className="mr-2 h-4 w-4" /&gt;
                      Mark not interested
                    &lt;/Button&gt;
                  &lt;/div&gt;

                  {dossier ? (
                    &lt;div className="space-y-3 text-sm text-slate-700"&gt;
                      {dossier.rd_summary ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            R&amp;D summary
                          &lt;/h3&gt;
                          &lt;p className="mt-1 whitespace-pre-line"&gt;{dossier.rd_summary}&lt;/p&gt;
                        &lt;/section&gt;
                      ) : null}

                      {dossier.what_they_do ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            What they do
                          &lt;/h3&gt;
                          &lt;p className="mt-1 whitespace-pre-line"&gt;{dossier.what_they_do}&lt;/p&gt;
                        &lt;/section&gt;
                      ) : null}

                      {dossier.technical_focus ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            Technical focus
                          &lt;/h3&gt;
                          &lt;p className="mt-1 whitespace-pre-line"&gt;
                            {dossier.technical_focus}
                          &lt;/p&gt;
                        &lt;/section&gt;
                      ) : null}

                      {dossier.where_rd_is_happening ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            Where R&amp;D is likely happening
                          &lt;/h3&gt;
                          &lt;p className="mt-1 whitespace-pre-line"&gt;
                            {dossier.where_rd_is_happening}
                          &lt;/p&gt;
                        &lt;/section&gt;
                      ) : null}

                      {dossier.rd_tax_fit ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            R&amp;D tax fit (hypotheses)
                          &lt;/h3&gt;
                          &lt;p className="mt-1 whitespace-pre-line"&gt;{dossier.rd_tax_fit}&lt;/p&gt;
                        &lt;/section&gt;
                      ) : null}

                      {Array.isArray(dossier.questions_to_validate) &amp;&amp;
                      dossier.questions_to_validate.length &gt; 0 ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            Questions to validate quickly
                          &lt;/h3&gt;
                          &lt;ul className="mt-1 list-disc space-y-1 pl-4"&gt;
                            {dossier.questions_to_validate.map((q: string, idx: number) =&gt; (
                              &lt;li key={idx}&gt;{q}&lt;/li&gt;
                            ))}
                          &lt;/ul&gt;
                        &lt;/section&gt;
                      ) : null}

                      {dossier.call_script_intro || dossier.call_script_main ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            Call script
                          &lt;/h3&gt;
                          {dossier.call_script_intro ? (
                            &lt;p className="mt-1 whitespace-pre-line"&gt;
                              {dossier.call_script_intro}
                            &lt;/p&gt;
                          ) : null}
                          {dossier.call_script_main ? (
                            &lt;p className="mt-2 whitespace-pre-line"&gt;
                              {dossier.call_script_main}
                            &lt;/p&gt;
                          ) : null}
                        &lt;/section&gt;
                      ) : null}

                      {dossier.confidence_note ? (
                        &lt;section&gt;
                          &lt;h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                            Confidence note
                          &lt;/h3&gt;
                          &lt;p className="mt-1 whitespace-pre-line text-xs text-slate-500"&gt;
                            {dossier.confidence_note}
                          &lt;/p&gt;
                        &lt;/section&gt;
                      ) : null}
                    &lt;/div&gt;
                  ) : (
                    &lt;p className="text-sm text-slate-500"&gt;
                      No dossier yet. Click &quot;Enrich / refresh dossier&quot; to generate one.
                    &lt;/p&gt;
                  )}

                  &lt;div className="mt-4 border-t border-slate-100 pt-3"&gt;
                    &lt;h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500"&gt;
                      Book BDM call
                    &lt;/h3&gt;
                    &lt;div className="flex flex-col gap-3 sm:flex-row sm:items-end"&gt;
                      &lt;div className="flex-1 space-y-1"&gt;
                        &lt;label className="block text-xs font-medium text-slate-600"&gt;
                          BDM
                        &lt;/label&gt;
                        &lt;select
                          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                          value={bookingBdmId}
                          onChange={(e) =&gt; setBookingBdmId(e.target.value)}
                        &gt;
                          {bdmUsers.map((bdm) =&gt; (
                            &lt;option key={bdm.id} value={bdm.id}&gt;
                              {bdm.full_name || bdm.email || "Unnamed user"}
                            &lt;/option&gt;
                          ))}
                        &lt;/select&gt;
                      &lt;/div&gt;
                      &lt;div className="flex-1 space-y-1"&gt;
                        &lt;label className="block text-xs font-medium text-slate-600"&gt;
                          Start (your local time)
                        &lt;/label&gt;
                        &lt;Input
                          type="datetime-local"
                          value={bookingStart}
                          onChange={(e) =&gt; setBookingStart(e.target.value)}
                        /&gt;
                      &lt;/div&gt;
                      &lt;div className="w-28 space-y-1"&gt;
                        &lt;label className="block text-xs font-medium text-slate-600"&gt;
                          Duration (min)
                        &lt;/label&gt;
                        &lt;Input
                          type="number"
                          min={15}
                          max={180}
                          value={bookingDuration}
                          onChange={(e) =&gt;
                            setBookingDuration(parseInt(e.target.value || "30", 10))
                          }
                        /&gt;
                      &lt;/div&gt;
                      &lt;Button
                        size="sm"
                        className="sm:ml-1"
                        disabled={booking || !bookingBdmId || !bookingStart}
                        onClick={handleBookCall}
                      &gt;
                        {booking ? (
                          &lt;&gt;
                            &lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt;
                            Booking…
                          &lt;/&gt;
                        ) : (
                          &lt;&gt;
                            &lt;PhoneCall className="mr-2 h-4 w-4" /&gt;
                            Book BDM call
                          &lt;/&gt;
                        )}
                      &lt;/Button&gt;
                    &lt;/div&gt;
                    {selectedProspect.bdm_call_scheduled_at &amp;&amp; (
                      &lt;p className="mt-2 text-xs text-slate-500"&gt;
                        BDM call scheduled at{" "}
                        {new Date(
                          selectedProspect.bdm_call_scheduled_at as string
                        ).toLocaleString()}{" "}
                        {selectedProspect.bdm_call_teams_link
                          ? ` • Teams: ${selectedProspect.bdm_call_teams_link}`
                          : null}
                      &lt;/p&gt;
                    )}
                  &lt;/div&gt;
                &lt;/&gt;
              )}
            &lt;/CardContent&gt;
          &lt;/Card&gt;
        &lt;/section&gt;
      &lt;/div&gt;
    &lt;/StaffLayout&gt;
  );
}