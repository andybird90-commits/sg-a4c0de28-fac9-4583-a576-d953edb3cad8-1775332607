import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PipelineEntry = Database["public"]["Tables"]["pipeline_entries"]["Row"];
type PipelineInsert = Database["public"]["Tables"]["pipeline_entries"]["Insert"];
type PipelineUpdate = Database["public"]["Tables"]["pipeline_entries"]["Update"];
type CompaniesHouseFiling = Database["public"]["Tables"]["companies_house_filings"]["Row"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ClientToBeOnboarded = Database["public"]["Tables"]["clients_to_be_onboarded"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type OrganisationInsert = Database["public"]["Tables"]["organisations"]["Insert"];

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
): Promise<{ predictedDate: Date; confidence: number; avgLag: number; yearsTrading: number }> {
  const { data: filings, error } = await supabase
    .from("companies_house_filings")
    .select("*")
    .eq("company_number", companiesHouseNumber)
    .order("accounts_filing_date", { ascending: false })
    .limit(5);

  if (error) {
    throw error;
  }

  const safeFilings = (filings || []) as CompaniesHouseFiling[];

  // Only use filings where we have both year end and filing date
  const filingsWithDates = safeFilings.filter(
    (f) => f.period_end_date && f.accounts_filing_date
  );

  // 1) Days lag per year (year end -> filing), then average across years
  let avgLag = 60;
  let lags: number[] = [];

  if (filingsWithDates.length > 0) {
    lags = filingsWithDates
      .map((f) => {
        const yearEnd = new Date(f.period_end_date as string);
        const filingDate = new Date(f.accounts_filing_date as string);
        const msDiff = filingDate.getTime() - yearEnd.getTime();
        const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));
        return daysDiff > 0 ? daysDiff : 0;
      })
      .filter((l) => l > 0);

    if (lags.length > 0) {
      avgLag = Math.round(
        lags.reduce((a, b) => a + b, 0) / lags.length
      );
    }
  }

  // 2) Years trading from filings (based on period_end_date year span)
  let yearsTradingFromFilings = 0;
  if (filingsWithDates.length > 0) {
    const years = filingsWithDates.map((f) =>
      new Date(f.period_end_date as string).getFullYear()
    );
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    yearsTradingFromFilings = maxYear - minYear + 1;
  }

  // 3) Company age from incorporation date as fallback/upper bound
  const { data: orgData } = await supabase
    .from("organisations")
    .select("incorporation_date")
    .eq("id", orgId)
    .single();

  let yearsTradingFromIncorporation = 0;
  if (orgData?.incorporation_date) {
    const incDate = new Date(orgData.incorporation_date);
    const now = new Date();
    yearsTradingFromIncorporation = Math.max(
      0,
      now.getFullYear() -
        incDate.getFullYear() -
        (now <
        new Date(
          incDate.getFullYear() +
            (now.getFullYear() - incDate.getFullYear()),
          incDate.getMonth(),
          incDate.getDate()
        )
          ? 1
          : 0)
    );
  }

  const yearsTrading = Math.max(
    yearsTradingFromFilings,
    yearsTradingFromIncorporation
  );

  // 4) Confidence: based on number of years filed and average lag
  const yearsFiled = yearsTradingFromFilings || safeFilings.length;
  let confidence = 30;

  if (yearsFiled > 0) {
    confidence += Math.min(yearsFiled * 10, 40);
  }

  if (yearsTrading > 0) {
    confidence += Math.min(yearsTrading * 5, 20);
  }

  if (avgLag <= 90) {
    confidence += 5;
  } else if (avgLag >= 180) {
    confidence -= 5;
  }

  confidence = Math.max(20, Math.min(100, confidence));

  // 5) Predicted filing date:
  //    next year end (based on most recent period_end_date) + average lag
  const lastFiling = safeFilings[0];
  let nextYearEnd: Date;

  if (lastFiling?.period_end_date) {
    nextYearEnd = new Date(lastFiling.period_end_date);
    nextYearEnd.setFullYear(nextYearEnd.getFullYear() + 1);
  } else {
    // Default to 31 March next year if no history at all
    nextYearEnd = new Date(new Date().getFullYear() + 1, 2, 31);
  }

  const predictedDate = new Date(nextYearEnd);
  predictedDate.setDate(predictedDate.getDate() + avgLag);

  return { predictedDate, confidence, avgLag, yearsTrading };
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
  let yearsTrading = 0;

  if (companiesHouseNumber) {
    const prediction = await calculatePredictedFilingDate(orgId, companiesHouseNumber);
    predictedFilingDate = prediction.predictedDate;
    confidence = prediction.confidence;
    avgLag = prediction.avgLag;
    yearsTrading = prediction.yearsTrading;
  } else {
    // No Companies House number - use defaults
    predictedFilingDate = new Date();
    predictedFilingDate.setMonth(predictedFilingDate.getMonth() + 3);
    confidence = 20;
    avgLag = 60;

    // Fallback years trading from organisation incorporation_date if available
    const { data: orgData } = await supabase
      .from("organisations")
      .select("incorporation_date")
      .eq("id", orgId)
      .single();

    if (orgData?.incorporation_date) {
      const incDate = new Date(orgData.incorporation_date);
      const now = new Date();
      yearsTrading = Math.max(
        0,
        now.getFullYear() - incDate.getFullYear() - (now < new Date(incDate.getFullYear() + (now.getFullYear() - incDate.getFullYear()), incDate.getMonth(), incDate.getDate()) ? 1 : 0)
      );
    }
  }

  const pipelineStartDate = calculatePipelineStartDate(predictedFilingDate);

  // Create pipeline entry
  return createPipelineEntry({
    org_id: orgId,
    claim_id: claimId,
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    expected_accounts_filing_date: predictedFilingDate.toISOString().split("T")[0],
    predicted_revenue: 0,
    filing_confidence_score: confidence,
    average_filing_lag_days: avgLag,
    years_trading: yearsTrading,
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

  const orgId = (pipeline as any).org_id as string;

  // We need to fetch companies_house_number separately or add it to the query if it exists on organisations
  const { data: prospect } = await supabase
    .from("prospects")
    .select("company_number")
    .eq("org_id", orgId)
    .single();
    
  if (!prospect?.company_number) return;

  const prediction = await calculatePredictedFilingDate(
    orgId,
    prospect.company_number
  );

  const pipelineStartDate = calculatePipelineStartDate(prediction.predictedDate);

  await updatePipelineEntry(pipelineId, {
    expected_accounts_filing_date: prediction.predictedDate.toISOString().split("T")[0],
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    filing_confidence_score: prediction.confidence,
    average_filing_lag_days: prediction.avgLag,
    years_trading: prediction.yearsTrading,
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
    .select("predicted_revenue, expected_accounts_filing_date, filing_confidence_score, pipeline_start_date");

  if (!entries) return { 
    totalRevenue: 0, 
    count: 0, 
    avgConfidence: 0,
    byMonth: {},
    byQuarter: {} 
  };

  const totalRevenue = entries.reduce((sum, e) => sum + (e.predicted_revenue || 0), 0);
  const avgConfidence =
    entries.reduce((sum, e) => sum + (e.filing_confidence_score || 0), 0) / (entries.length || 1);

  // Calculate by Month and Quarter
  const byMonth: Record<string, number> = {};
  const byQuarter: Record<string, number> = {};

  entries.forEach(entry => {
    if (entry.predicted_revenue && entry.expected_accounts_filing_date) {
      const date = new Date(entry.expected_accounts_filing_date);
      const revenue = entry.predicted_revenue;
      
      // Monthly: "Jan 2024"
      const monthKey = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      byMonth[monthKey] = (byMonth[monthKey] || 0) + revenue;

      // Quarterly: "Q1 2024"
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const quarterKey = `Q${quarter} ${date.getFullYear()}`;
      byQuarter[quarterKey] = (byQuarter[quarterKey] || 0) + revenue;
    }
  });

  return {
    totalRevenue,
    count: entries.length,
    avgConfidence: Math.round(avgConfidence),
    byMonth,
    byQuarter,
    byStatus: {
      forecasted: entries.length, 
    },
  };
}

const isValidCompaniesHouseNumber = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const cleaned = value.trim().toUpperCase();
  if (!cleaned) return false;
  const compact = cleaned.replace(/\s+/g, "");
  return /^[A-Z0-9]{6,8}$/.test(compact);
};

async function ensurePlaceholderOrganisationForClient(
  client: ClientToBeOnboarded
): Promise<string | null> {
  const name = client.company_name?.trim();
  if (!name) {
    return null;
  }

  const placeholderCode = `PL-${client.id.slice(0, 8)}`;

  const { data: existing, error: existingError } = await supabase
    .from("organisations")
    .select("id")
    .eq("organisation_code", placeholderCode)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing placeholder organisation:", existingError);
  }

  if (existing?.id) {
    return existing.id;
  }

  const insertPayload: OrganisationInsert = {
    name,
    organisation_code: placeholderCode,
  };

  if ("companies_house_number" in ({} as Organisation) && client.company_number) {
    (insertPayload as any).companies_house_number = client.company_number;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("organisations")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating placeholder organisation for imported client:", insertError);
    return null;
  }

  return inserted.id;
}

async function upsertPipelineEntryForClient(
  orgId: string,
  claimId: string | null,
  companyNumber: string | null,
  createdBy: string
): Promise<void> {
  // Only skip when there is no company number at all; allow broader formats
  if (!companyNumber) {
    return;
  }

  const prediction = await calculatePredictedFilingDate(orgId, companyNumber);
  const pipelineStartDate = calculatePipelineStartDate(prediction.predictedDate);

  const { data: existing, error: existingError } = await supabase
    .from("pipeline_entries")
    .select("id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (existingError) {
    console.error("Error checking existing pipeline entry:", existingError);
  }

  const payload: PipelineUpdate = {
    org_id: orgId,
    claim_id: claimId,
    expected_accounts_filing_date: prediction.predictedDate.toISOString().split("T")[0],
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    filing_confidence_score: prediction.confidence,
    average_filing_lag_days: prediction.avgLag,
    years_trading: prediction.yearsTrading,
  } as PipelineUpdate;

  if (existing?.id) {
    await updatePipelineEntry(existing.id, payload);
  } else {
    const insertPayload: PipelineInsert = {
      ...(payload as any),
      predicted_revenue: 0,
      auto_created: true,
      created_by: createdBy,
    } as PipelineInsert;

    await createPipelineEntry(insertPayload);
  }
}

export async function syncPipelineFromClients(): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("Error getting current user for pipeline sync:", authError);
  }

  const userId = authData?.user?.id || "";

  const { data: importedClients, error: importedError } = await supabase
    .from("clients_to_be_onboarded")
    .select("id, company_name, company_number");

  if (importedError) {
    console.error("Error loading imported clients for pipeline sync:", importedError);
  }

  const { data: prospects, error: prospectsError } = await supabase
    .from("prospects")
    .select("id, org_id, company_number");

  if (prospectsError) {
    console.error("Error loading prospects for pipeline sync:", prospectsError);
  }

  const { data: claims, error: claimsError } = await supabase
    .from("claims")
    .select("id, org_id");

  if (claimsError) {
    console.error("Error loading claims for pipeline sync:", claimsError);
  }

  const claimByOrgId = new Map<string, string>();
  (claims || []).forEach((claim) => {
    if (claim.org_id && !claimByOrgId.has(claim.org_id)) {
      claimByOrgId.set(claim.org_id, claim.id);
    }
  });

  // Imported clients -> placeholder organisations, no claim_id (not yet onboarded)
  for (const client of importedClients || []) {
    // Only require a non-empty company number now
    if (!client.company_number) {
      continue;
    }

    const orgId = await ensurePlaceholderOrganisationForClient(
      client as ClientToBeOnboarded
    );
    if (!orgId) {
      continue;
    }
    await upsertPipelineEntryForClient(orgId, null, client.company_number, userId);
  }

  // Prospects -> real organisations, may have claim_id (onboarded)
  for (const prospect of prospects || []) {
    // Keep org_id requirement; just require a non-empty company number
    if (!prospect.org_id || !prospect.company_number) {
      continue;
    }
    const claimId = claimByOrgId.get(prospect.org_id) || null;
    await upsertPipelineEntryForClient(
      prospect.org_id,
      claimId,
      prospect.company_number,
      userId
    );
  }
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
  syncPipelineFromClients,
};