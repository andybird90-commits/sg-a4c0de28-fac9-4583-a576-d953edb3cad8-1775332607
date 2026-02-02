import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PipelineEntry = Database["public"]["Tables"]["pipeline_entries"]["Row"];
type PipelineInsert = Database["public"]["Tables"]["pipeline_entries"]["Insert"];
type PipelineUpdate = Database["public"]["Tables"]["pipeline_entries"]["Update"];
type CompaniesHouseFiling = Database["public"]["Tables"]["companies_house_filings"]["Row"];

export interface PipelineWithDetails extends PipelineEntry {
  organisation?: {
    id: string;
    name: string;
    organisation_code: string | null;
    companies_house_number: string | null;
  };
  claim?: {
    id: string;
    claim_year: string;
    status: string;
  };
}

/**
 * Calculate predicted filing date based on Companies House history
 */
export async function calculatePredictedFilingDate(
  orgId: string,
  companiesHouseNumber: string
): Promise<{ predictedDate: Date; confidence: number; avgLag: number }> {
  // Get filing history
  const { data: filings, error } = await supabase
    .from("companies_house_filings")
    .select("*")
    .eq("companies_house_number", companiesHouseNumber)
    .order("accounts_date", { ascending: false })
    .limit(5);

  if (error) throw error;

  // Calculate average lag
  let avgLag = 60; // Default 60 days
  if (filings && filings.length > 0) {
    const lags = filings.map((f) => f.filing_lag_days || 0).filter((l) => l > 0);
    if (lags.length > 0) {
      avgLag = Math.round(lags.reduce((a, b) => a + b, 0) / lags.length);
    }
  }

  // Get company age (years trading)
  const { data: orgData } = await supabase
    .from("organisations")
    .select("incorporation_date")
    .eq("id", orgId)
    .single();

  let yearsTrading = 0;
  if (orgData?.incorporation_date) {
    const incDate = new Date(orgData.incorporation_date);
    yearsTrading = Math.max(0, new Date().getFullYear() - incDate.getFullYear());
  }

  // Calculate confidence based on filing history and years trading
  const filingHistoryCount = filings?.length || 0;
  let confidence = Math.min(filingHistoryCount * 15, 60); // Max 60 from history
  confidence += Math.min(yearsTrading * 5, 30); // Max 30 from age
  confidence = Math.max(20, Math.min(100, confidence)); // Clamp 20-100

  // Calculate predicted filing date
  // Assume next year end is 12 months from last year end (or use fiscal year end)
  const lastFiling = filings?.[0];
  let nextYearEnd: Date;

  if (lastFiling?.year_end_date) {
    nextYearEnd = new Date(lastFiling.year_end_date);
    nextYearEnd.setFullYear(nextYearEnd.getFullYear() + 1);
  } else {
    // Default to March 31 next year if no history
    nextYearEnd = new Date(new Date().getFullYear() + 1, 2, 31); // March 31
  }

  // Add average lag to get predicted filing date
  const predictedDate = new Date(nextYearEnd);
  predictedDate.setDate(predictedDate.getDate() + avgLag);

  return { predictedDate, confidence, avgLag };
}

/**
 * Calculate pipeline start date (1 month before predicted filing)
 */
export function calculatePipelineStartDate(predictedFilingDate: Date): Date {
  const pipelineDate = new Date(predictedFilingDate);
  pipelineDate.setMonth(pipelineDate.getMonth() - 1);
  return pipelineDate;
}

/**
 * Get all pipeline entries with organization details
 */
export async function getAllPipelineEntries(): Promise<PipelineWithDetails[]> {
  const { data, error } = await supabase
    .from("pipeline_entries")
    .select(`
      *,
      organisation:organisations!pipeline_entries_org_id_fkey(
        id,
        name,
        organisation_code,
        companies_house_number
      ),
      claim:claims!pipeline_entries_claim_id_fkey(
        id,
        claim_year,
        status
      )
    `)
    .order("pipeline_start_date", { ascending: true });

  if (error) {
    console.error("Error fetching pipeline entries:", error);
    throw error;
  }

  return (data || []) as PipelineWithDetails[];
}

/**
 * Get pipeline entries filtered by date range
 */
export async function getPipelineByDateRange(
  startDate: string,
  endDate: string
): Promise<PipelineWithDetails[]> {
  const { data, error } = await supabase
    .from("pipeline_entries")
    .select(`
      *,
      organisation:organisations!pipeline_entries_org_id_fkey(
        id,
        name,
        organisation_code,
        companies_house_number
      ),
      claim:claims!pipeline_entries_claim_id_fkey(
        id,
        claim_year,
        status
      )
    `)
    .gte("pipeline_start_date", startDate)
    .lte("pipeline_start_date", endDate)
    .order("pipeline_start_date", { ascending: true });

  if (error) throw error;
  return (data || []) as PipelineWithDetails[];
}

/**
 * Create a pipeline entry
 */
export async function createPipelineEntry(
  entry: PipelineInsert
): Promise<PipelineEntry> {
  const { data, error } = await supabase
    .from("pipeline_entries")
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a pipeline entry
 */
export async function updatePipelineEntry(
  id: string,
  updates: PipelineUpdate
): Promise<PipelineEntry> {
  const { data, error } = await supabase
    .from("pipeline_entries")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a pipeline entry
 */
export async function deletePipelineEntry(id: string): Promise<void> {
  const { error } = await supabase.from("pipeline_entries").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Auto-create pipeline entry for a claim (called when claim is enabled)
 */
export async function autoCreatePipelineEntry(
  claimId: string,
  orgId: string,
  companiesHouseNumber: string | null
): Promise<PipelineEntry | null> {
  // Check if pipeline entry already exists
  const { data: existing } = await supabase
    .from("pipeline_entries")
    .select("id")
    .eq("claim_id", claimId)
    .single();

  if (existing) {
    console.log("Pipeline entry already exists for claim:", claimId);
    return null;
  }

  // Calculate predictions
  let predictedFilingDate: Date;
  let confidence: number;
  let avgLag: number;

  if (companiesHouseNumber) {
    const prediction = await calculatePredictedFilingDate(orgId, companiesHouseNumber);
    predictedFilingDate = prediction.predictedDate;
    confidence = prediction.confidence;
    avgLag = prediction.avgLag;
  } else {
    // No Companies House number - use defaults
    predictedFilingDate = new Date();
    predictedFilingDate.setMonth(predictedFilingDate.getMonth() + 3);
    confidence = 20;
    avgLag = 60;
  }

  const pipelineStartDate = calculatePipelineStartDate(predictedFilingDate);

  // Create pipeline entry
  return createPipelineEntry({
    org_id: orgId,
    claim_id: claimId,
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    predicted_filing_date: predictedFilingDate.toISOString().split("T")[0],
    predicted_revenue: 0, // Manual entry required
    confidence_score: confidence,
    filing_lag_days: avgLag,
    status: "forecasted",
    auto_created: true,
  });
}

/**
 * Refresh predictions for a pipeline entry based on latest Companies House data
 */
export async function refreshPipelinePredictions(pipelineId: string): Promise<void> {
  const { data: pipeline, error } = await supabase
    .from("pipeline_entries")
    .select("*, organisations!pipeline_entries_org_id_fkey(companies_house_number, id)")
    .eq("id", pipelineId)
    .single();

  if (error) throw error;
  if (!pipeline) return;

  const org = (pipeline as any).organisations;
  if (!org?.companies_house_number) return;

  const prediction = await calculatePredictedFilingDate(
    org.id,
    org.companies_house_number
  );

  const pipelineStartDate = calculatePipelineStartDate(prediction.predictedDate);

  await updatePipelineEntry(pipelineId, {
    predicted_filing_date: prediction.predictedDate.toISOString().split("T")[0],
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    confidence_score: prediction.confidence,
    filing_lag_days: prediction.avgLag,
  });
}

/**
 * Batch refresh all pipeline predictions
 */
export async function refreshAllPipelinePredictions(): Promise<void> {
  const { data: pipelines } = await supabase
    .from("pipeline_entries")
    .select("id")
    .eq("auto_created", true);

  if (!pipelines) return;

  for (const pipeline of pipelines) {
    try {
      await refreshPipelinePredictions(pipeline.id);
    } catch (error) {
      console.error(`Failed to refresh pipeline ${pipeline.id}:`, error);
    }
  }
}

/**
 * Get pipeline summary stats
 */
export async function getPipelineSummary() {
  const { data: entries } = await supabase
    .from("pipeline_entries")
    .select("predicted_revenue, status, confidence_score");

  if (!entries) return { totalRevenue: 0, count: 0, avgConfidence: 0 };

  const totalRevenue = entries.reduce((sum, e) => sum + (e.predicted_revenue || 0), 0);
  const avgConfidence =
    entries.reduce((sum, e) => sum + (e.confidence_score || 0), 0) / entries.length || 0;

  return {
    totalRevenue,
    count: entries.length,
    avgConfidence: Math.round(avgConfidence),
    byStatus: {
      forecasted: entries.filter((e) => e.status === "forecasted").length,
      in_progress: entries.filter((e) => e.status === "in_progress").length,
      completed: entries.filter((e) => e.status === "completed").length,
    },
  };
}

export const pipelineService = {
  getAllPipelineEntries,
  getPipelineByDateRange,
  createPipelineEntry,
  updatePipelineEntry,
  deletePipelineEntry,
  autoCreatePipelineEntry,
  refreshPipelinePredictions,
  refreshAllPipelinePredictions,
  getPipelineSummary,
  calculatePredictedFilingDate,
  calculatePipelineStartDate,
};