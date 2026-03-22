import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SourceRow = Database["public"]["Tables"]["claim_apportionment_sources"]["Row"];
type SourceInsert = Database["public"]["Tables"]["claim_apportionment_sources"]["Insert"];
type SourceUpdate = Database["public"]["Tables"]["claim_apportionment_sources"]["Update"];

type LineRow = Database["public"]["Tables"]["claim_apportionment_lines"]["Row"];
type LineInsert = Database["public"]["Tables"]["claim_apportionment_lines"]["Insert"];

type ApportionmentRow = Database["public"]["Tables"]["claim_apportionments"]["Row"];
type ApportionmentInsert = Database["public"]["Tables"]["claim_apportionments"]["Insert"];
type ApportionmentUpdate = Database["public"]["Tables"]["claim_apportionments"]["Update"];

export type ApportionmentStatus = "draft" | "reviewed" | "approved" | "excluded";
export type ApportionLineCategory = "supplier" | "subcontractor" | "staff" | "unknown";

export type ParsedLineInput = {
  lineIndex: number;
  rawName: string | null;
  normalisedName: string | null;
  category: ApportionLineCategory;
  referenceText: string | null;
  debitTotal: number | null;
  creditTotal: number | null;
  netTotal: number | null;
  vatTotal: number | null;
  grossTotal: number | null;
  sourcePage: number | null;
  confidence: number | null;
  include: boolean;
  notes: string | null;
  rawExtraction: unknown;
};

function nowIso(): string {
  return new Date().toISOString();
}

export const claimApportionmentService = {
  async listSourcesForClaim(claimId: string): Promise<SourceRow[]> {
    const { data, error } = await supabase
      .from("claim_apportionment_sources")
      .select("*")
      .eq("claim_id", claimId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async createSource(payload: any) {
    const { data, error } = await supabase.from("claim_apportionment_sources").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },

  async updateSource(sourceId: string, patch: SourceUpdate): Promise<SourceRow> {
    const { data, error } = await supabase
      .from("claim_apportionment_sources")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", sourceId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSource(sourceId: string): Promise<void> {
    const { error } = await supabase
      .from("claim_apportionment_sources")
      .delete()
      .eq("id", sourceId);

    if (error) throw error;
  },

  async listLinesForSource(sourceId: string): Promise<LineRow[]> {
    const { data, error } = await supabase
      .from("claim_apportionment_lines")
      .select("*")
      .eq("source_id", sourceId)
      .order("line_index", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async upsertParsedLines(params: {
    claimId: string;
    orgId: string;
    sourceId: string;
    lines: ParsedLineInput[];
  }): Promise<void> {
    const payload: LineInsert[] = params.lines.map((l) => ({
      claim_id: params.claimId,
      org_id: params.orgId,
      source_id: params.sourceId,
      line_index: l.lineIndex,
      raw_name: l.rawName,
      normalised_name: l.normalisedName,
      category: l.category,
      reference_text: l.referenceText,
      debit_total: l.debitTotal,
      credit_total: l.creditTotal,
      net_total: l.netTotal,
      vat_total: l.vatTotal,
      gross_total: l.grossTotal,
      source_page: l.sourcePage,
      confidence: l.confidence,
      include: l.include,
      notes: l.notes,
      raw_extraction: l.rawExtraction as any,
      updated_at: nowIso()
    }));

    const { error: clearError } = await supabase
      .from("claim_apportionment_lines")
      .delete()
      .eq("source_id", params.sourceId);

    if (clearError) throw clearError;

    const { error } = await supabase
      .from("claim_apportionment_lines")
      .upsert(payload, { onConflict: "source_id,line_index" });

    if (error) throw error;
  },

  async listApportionmentsForClaim(claimId: string): Promise<ApportionmentRow[]> {
    const { data, error } = await supabase
      .from("claim_apportionments")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async upsertApportionment(input: ApportionmentInsert): Promise<ApportionmentRow> {
    const { data, error } = await supabase
      .from("claim_apportionments")
      .upsert({ ...input, updated_at: nowIso() })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateApportionment(id: string, patch: ApportionmentUpdate): Promise<ApportionmentRow> {
    const { data, error } = await supabase
      .from("claim_apportionments")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async linkPushedCost(params: {
    apportionmentId: string;
    claimCostId: string;
    pushedBy: string | null;
    snapshot: unknown;
  }): Promise<void> {
    const { error } = await supabase.from("claim_apportionment_cost_links").upsert(
      {
        apportionment_id: params.apportionmentId,
        claim_cost_id: params.claimCostId,
        pushed_by: params.pushedBy,
        pushed_at: nowIso(),
        push_snapshot: params.snapshot as any
      },
      { onConflict: "apportionment_id" }
    );

    if (error) throw error;
  },

  async getCostLinkByApportionment(apportionmentId: string): Promise<{ claim_cost_id: string | null } | null> {
    const { data, error } = await supabase
      .from("claim_apportionment_cost_links")
      .select("claim_cost_id")
      .eq("apportionment_id", apportionmentId)
      .maybeSingle();

    if (error) throw error;
    return data ?? null;
  },

  async clearWorkingApportionmentsForSource(params: {
    claimId: string;
    sourceId: string;
    keepApproved?: boolean;
  }): Promise<number> {
    const keepApproved = params.keepApproved !== false;

    const { data: rows, error: listError } = await supabase
      .from("claim_apportionments")
      .select("id, status")
      .eq("claim_id", params.claimId)
      .eq("source_id", params.sourceId);

    if (listError) throw listError;

    const idsToDelete = (rows ?? [])
      .filter((r) => (keepApproved ? r.status !== "approved" : true))
      .map((r) => r.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (idsToDelete.length === 0) return 0;

    // Batch delete to avoid URL length limits for huge documents
    const CHUNK_SIZE = 50;
    for (let i = 0; i < idsToDelete.length; i += CHUNK_SIZE) {
      const chunk = idsToDelete.slice(i, i + CHUNK_SIZE);
      
      const { error: linkDeleteError } = await supabase
        .from("claim_apportionment_cost_links")
        .delete()
        .in("apportionment_id", chunk);

      if (linkDeleteError) throw linkDeleteError;

      const { error: deleteError } = await supabase
        .from("claim_apportionments")
        .delete()
        .in("id", chunk);

      if (deleteError) throw deleteError;
    }

    return idsToDelete.length;
  }
};