import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SourceFile = Database["public"]["Tables"]["claim_apportionment_source_files"]["Row"];
type SourceFileInsert = Database["public"]["Tables"]["claim_apportionment_source_files"]["Insert"];
type ApportionLine = Database["public"]["Tables"]["claim_apportionment_lines"]["Row"];
type ApportionLineInsert = Database["public"]["Tables"]["claim_apportionment_lines"]["Insert"];
type Apportionment = Database["public"]["Tables"]["claim_apportionments"]["Row"];
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
  async listSourceFiles(claimId: string): Promise<SourceFile[]> {
    const { data, error } = await supabase
      .from("claim_apportionment_source_files")
      .select("*")
      .eq("claim_id", claimId)
      .order("uploaded_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async createSourceFile(input: SourceFileInsert): Promise<SourceFile> {
    const { data, error } = await supabase
      .from("claim_apportionment_source_files")
      .insert(input)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateSourceFile(sourceFileId: string, patch: Partial<SourceFile>): Promise<void> {
    const { error } = await supabase
      .from("claim_apportionment_source_files")
      .update({ ...patch })
      .eq("id", sourceFileId);

    if (error) throw error;
  },

  async deleteSourceFile(sourceFileId: string): Promise<void> {
    const { error } = await supabase
      .from("claim_apportionment_source_files")
      .delete()
      .eq("id", sourceFileId);

    if (error) throw error;
  },

  async listLinesForSource(sourceFileId: string): Promise<ApportionLine[]> {
    const { data, error } = await supabase
      .from("claim_apportionment_lines")
      .select("*")
      .eq("source_file_id", sourceFileId)
      .order("line_index", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  async upsertParsedLines(params: {
    claimId: string;
    orgId: string;
    sourceFileId: string;
    lines: ParsedLineInput[];
  }): Promise<void> {
    const payload: ApportionLineInsert[] = params.lines.map((l) => ({
      claim_id: params.claimId,
      org_id: params.orgId,
      source_file_id: params.sourceFileId,
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

    const { error } = await supabase
      .from("claim_apportionment_lines")
      .upsert(payload, { onConflict: "source_file_id,line_index" });

    if (error) throw error;
  },

  async listApportionmentsForClaim(claimId: string): Promise<Apportionment[]> {
    const { data, error } = await supabase
      .from("claim_apportionments")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  async upsertApportionment(input: ApportionmentInsert): Promise<Apportionment> {
    const { data, error } = await supabase
      .from("claim_apportionments")
      .upsert({ ...input, updated_at: nowIso() })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateApportionment(id: string, patch: ApportionmentUpdate): Promise<Apportionment> {
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
  }
};