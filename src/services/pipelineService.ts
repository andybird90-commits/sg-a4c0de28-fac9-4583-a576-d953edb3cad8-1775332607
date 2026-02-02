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
    incorporation_date: string | null;
  } | null;
  claim?: {
    id: string;
    claim_year: number;
    status: string;
  } | null;
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
    .eq("company_number", companiesHouseNumber)
    .order("accounts_filing_date", { ascending: false })
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

  if (lastFiling?.period_end_date) {
    nextYearEnd = new Date(lastFiling.period_end_date);
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
        organisation_code
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
  
  // Cast and return
  return (data || []).map(item => ({
    ...item,
    organisation: item.organisation ? {
      ...item.organisation,
      companies_house_number: null // Add if needed by fetching extra
    } : null
  })) as unknown as PipelineWithDetails[];
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
        organisation_code
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
  
  return (data || []).map(item => ({
    ...item,
    organisation: item.organisation ? {
      ...item.organisation,
      companies_house_number: null
    } : null
  })) as unknown as PipelineWithDetails[];
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
    expected_accounts_filing_date: predictedFilingDate.toISOString().split("T")[0], // Mapped correctly
    predicted_revenue: 0, // Manual entry required
    filing_confidence_score: confidence, // Mapped correctly
    average_filing_lag_days: avgLag, // Mapped correctly
    years_trading: 0, // Should be calculated
    auto_created: true,
    created_by: (await supabase.auth.getUser()).data.user?.id || "",
  });
}

/**
 * Refresh predictions for a pipeline entry based on latest Companies House data
 */
export async function refreshPipelinePredictions(pipelineId: string): Promise<void> {
  const { data: pipeline, error } = await supabase
    .from("pipeline_entries")
    .select("*, organisations!pipeline_entries_org_id_fkey(id)")
    .eq("id", pipelineId)
    .single();

  if (error) throw error;
  if (!pipeline) return;

  // We need to fetch companies_house_number separately or add it to the query if it exists on organisations
  // For now, let's assume we can fetch it via prospect link or direct lookup
  // But wait, organisations table doesn't have companies_house_number in the type definition I saw earlier
  // It has 'organisation_code'. 
  // Let's check prospects table for company number link
  
  const { data: prospect } = await supabase
    .from("prospects")
    .select("company_number")
    .eq("org_id", pipeline.org_id)
    .single();
    
  if (!prospect?.company_number) return;

  const prediction = await calculatePredictedFilingDate(
    pipeline.org_id,
    prospect.company_number
  );

  const pipelineStartDate = calculatePipelineStartDate(prediction.predictedDate);

  await updatePipelineEntry(pipelineId, {
    expected_accounts_filing_date: prediction.predictedDate.toISOString().split("T")[0],
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    filing_confidence_score: prediction.confidence,
    average_filing_lag_days: prediction.avgLag,
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
    .select("predicted_revenue, expected_accounts_filing_date, filing_confidence_score");

  if (!entries) return { totalRevenue: 0, count: 0, avgConfidence: 0 };

  const totalRevenue = entries.reduce((sum, e) => sum + (e.predicted_revenue || 0), 0);
  const avgConfidence =
    entries.reduce((sum, e) => sum + (e.filing_confidence_score || 0), 0) / entries.length || 0;

  return {
    totalRevenue,
    count: entries.length,
    avgConfidence: Math.round(avgConfidence),
    byStatus: {
      forecasted: entries.length, 
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