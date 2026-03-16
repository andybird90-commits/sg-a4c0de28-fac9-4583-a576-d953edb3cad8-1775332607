import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PipelineEntry = Database["public"]["Tables"]["pipeline_entries"]["Row"];
type PipelineInsert = Database["public"]["Tables"]["pipeline_entries"]["Insert"];
type PipelineUpdate = Database["public"]["Tables"]["pipeline_entries"]["Update"];
type CompaniesHouseFiling =
  Database["public"]["Tables"]["companies_house_filings"]["Row"];
type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
type ClientToBeOnboarded =
  Database["public"]["Tables"]["clients_to_be_onboarded"]["Row"];
type Organisation = Database["public"]["Tables"]["organisations"]["Row"];
type OrganisationInsert =
  Database["public"]["Tables"]["organisations"]["Insert"];

export interface PipelineWithDetails extends PipelineEntry {
  organisation?:
    | {
        id: string;
        name: string;
        organisation_code: string | null;
        incorporation_date: string | null;
      }
    | null;
  claim?:
    | {
        id: string;
        claim_year: number;
        status: string;
      }
    | null;
}

export interface MissingCompanyNumberClient {
  id: string;
  name: string;
  source: "imported" | "prospect";
  org_id?: string | null;
}

function parseYearEndMonthToNumber(
  value: string | null | undefined
): number | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
    return numeric;
  }

  const map: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  return map[trimmed] ?? null;
}

/**
 * Given a year-end month and an average lag (days), find the earliest
 * upcoming filing date (year end + lag) that is in the future relative to "now".
 */
function getNextFilingDateFromYearEndMonth(
  yearEndMonth: string,
  avgLagDays: number
): Date {
  const monthNumber = parseYearEndMonthToNumber(yearEndMonth);
  const now = new Date();

  if (!monthNumber) {
    const fallbackYearEnd = new Date(now.getFullYear() + 1, 2, 31);
    const fallbackFiling = new Date(fallbackYearEnd);
    fallbackFiling.setDate(fallbackFiling.getDate() + avgLagDays);
    return fallbackFiling;
  }

  const monthIndex = monthNumber - 1;
  let year = now.getFullYear() - 1;
  let filingDate: Date | null = null;

  for (let i = 0; i < 6; i += 1) {
    const yearEnd = new Date(year, monthIndex + 1, 0);
    const candidate = new Date(yearEnd);
    candidate.setDate(candidate.getDate() + avgLagDays);

    if (candidate >= now) {
      filingDate = candidate;
      break;
    }

    year += 1;
  }

  if (!filingDate) {
    const yearEnd = new Date(year, monthIndex + 1, 0);
    filingDate = new Date(yearEnd);
    filingDate.setDate(filingDate.getDate() + avgLagDays);
  }

  return filingDate;
}

/**
 * Calculate predicted filing date based on Companies House history.
 * If there is no filing history, fall back to year_end_month where available.
 */
export async function calculatePredictedFilingDate(
  orgId: string,
  companiesHouseNumber: string,
  yearEndMonth?: string | null
): Promise<{
  predictedDate: Date;
  confidence: number;
  avgLag: number;
  yearsTrading: number;
}> {
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

  const filingsWithDates = safeFilings.filter(
    (f) => f.period_end_date && f.accounts_filing_date
  );

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
      avgLag = Math.round(lags.reduce((a, b) => a + b, 0) / lags.length);
    }
  }

  let yearsTradingFromFilings = 0;
  const filingsWithPeriodEnd = safeFilings.filter((f) => f.period_end_date);

  if (filingsWithPeriodEnd.length > 0) {
    const years = filingsWithPeriodEnd.map((f) =>
      new Date(f.period_end_date as string).getFullYear()
    );
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    yearsTradingFromFilings = maxYear - minYear + 1;
  }

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

  let predictedDate: Date;

  const lastFiling = safeFilings[0];

  if (lastFiling?.period_end_date) {
    const nextYearEnd = new Date(lastFiling.period_end_date);
    nextYearEnd.setFullYear(nextYearEnd.getFullYear() + 1);
    predictedDate = new Date(nextYearEnd);
    predictedDate.setDate(predictedDate.getDate() + avgLag);
  } else if (yearEndMonth) {
    predictedDate = getNextFilingDateFromYearEndMonth(yearEndMonth, avgLag);
  } else {
    const defaultYearEnd = new Date(new Date().getFullYear() + 1, 2, 31);
    predictedDate = new Date(defaultYearEnd);
    predictedDate.setDate(predictedDate.getDate() + avgLag);
  }

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
    .select(
      `
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
    `
    )
    .order("pipeline_start_date", { ascending: true });

  if (error) {
    console.error("Error fetching pipeline entries:", error);
    throw error;
  }

  return (data || []).map((item) => ({
    ...item,
    organisation: item.organisation
      ? {
          ...item.organisation,
          companies_house_number: null,
        }
      : null,
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
    .select(
      `
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
    `
    )
    .gte("pipeline_start_date", startDate)
    .lte("pipeline_start_date", endDate)
    .order("pipeline_start_date", { ascending: true });

  if (error) throw error;

  return (data || []).map((item) => ({
    ...item,
    organisation: item.organisation
      ? {
          ...item.organisation,
          companies_house_number: null,
        }
      : null,
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
  const { error } = await supabase
    .from("pipeline_entries")
    .delete()
    .eq("id", id);
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
  const { data: existing } = await supabase
    .from("pipeline_entries")
    .select("id")
    .eq("claim_id", claimId)
    .single();

  if (existing) {
    console.log("Pipeline entry already exists for claim:", claimId);
    return null;
  }

  let predictedFilingDate: Date;
  let confidence: number;
  let avgLag: number;
  let yearsTrading = 0;

  if (companiesHouseNumber) {
    const prediction = await calculatePredictedFilingDate(
      orgId,
      companiesHouseNumber
    );
    predictedFilingDate = prediction.predictedDate;
    confidence = prediction.confidence;
    avgLag = prediction.avgLag;
    yearsTrading = prediction.yearsTrading;
  } else {
    predictedFilingDate = new Date();
    predictedFilingDate.setMonth(predictedFilingDate.getMonth() + 3);
    confidence = 20;
    avgLag = 60;

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
  }

  const pipelineStartDate = calculatePipelineStartDate(predictedFilingDate);

  return createPipelineEntry({
    org_id: orgId,
    claim_id: claimId,
    pipeline_start_date: pipelineStartDate.toISOString().split("T")[0],
    expected_accounts_filing_date:
      predictedFilingDate.toISOString().split("T")[0],
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
export async function refreshPipelinePredictions(
  pipelineId: string
): Promise<void> {
  const { data: pipeline, error } = await supabase
    .from("pipeline_entries")
    .select("*, organisations!pipeline_entries_org_id_fkey(id)")
    .eq("id", pipelineId)
    .single();

  if (error) throw error;
  if (!pipeline) return;

  const orgId = (pipeline as any).org_id as string;

  const { data: prospectRows } = await supabase
    .from("prospects")
    .select("company_number")
    .eq("org_id", orgId);

  const companiesHouseNumber =
    Array.isArray(prospectRows) && prospectRows.length > 0
      ? prospectRows[0]?.company_number || null
      : null;

  if (!companiesHouseNumber) return;

  const prediction = await calculatePredictedFilingDate(
    orgId,
    companiesHouseNumber
  );

  const pipelineStartDate = calculatePipelineStartDate(prediction.predictedDate);

  await updatePipelineEntry(pipelineId, {
    expected_accounts_filing_date:
      prediction.predictedDate.toISOString().split("T")[0],
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
    } catch (err) {
      console.error(`Failed to refresh pipeline ${pipeline.id}:`, err);
    }
  }
}

/**
 * Get list of clients/prospects that are missing a company number.
 * These are skipped when building the pipeline.
 */
export async function getClientsMissingCompanyNumber(): Promise<
  MissingCompanyNumberClient[]
> {
  const missing: MissingCompanyNumberClient[] = [];

  type ImportedClientRow = {
    id: string;
    company_name: string;
    company_number: string | null;
  };

  const { data: imported, error: importedError } = await supabase
    .from("clients_to_be_onboarded")
    .select("id, company_name, company_number");

  if (importedError) {
    console.error(
      "Error loading imported clients for missing company number list:",
      importedError
    );
  } else {
    (imported as ImportedClientRow[] | null | undefined)?.forEach((client) => {
      const num = client.company_number || "";
      if (!num.trim()) {
        missing.push({
          id: client.id,
          name: client.company_name,
          source: "imported",
        });
      }
    });
  }

  type ProspectRow = {
    id: string;
    org_id: string | null;
    company_number: string | null;
  };

  const { data: prospects, error: prospectsError } = await supabase
    .from("prospects")
    .select("id, org_id, company_number");

  if (prospectsError) {
    console.error(
      "Error loading prospects for missing company number list:",
      prospectsError
    );
  } else {
    const prospectRows = (prospects || []) as ProspectRow[];
    const missingProspects = prospectRows.filter((prospect) => {
      const num = prospect.company_number || "";
      return !num.trim();
    });

    const orgIds = Array.from(
      new Set(
        missingProspects
          .map((p) => p.org_id)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0
          )
      )
    );

    let orgNameById = new Map<string, string>();
    if (orgIds.length > 0) {
      const { data: orgs, error: orgsError } = await supabase
        .from("organisations")
        .select("id, name")
        .in("id", orgIds);

      if (orgsError) {
        console.error(
          "Error loading organisations for missing company number list:",
          orgsError
        );
      } else {
        orgNameById = new Map(
          (orgs || []).map((org) => [org.id as string, org.name as string])
        );
      }
    }

    missingProspects.forEach((prospect) => {
      const name =
        (prospect.org_id && orgNameById.get(prospect.org_id)) ||
        prospect.org_id ||
        "Unknown organisation";
      missing.push({
        id: prospect.id,
        name,
        source: "prospect",
        org_id: prospect.org_id,
      });
    });
  }

  return missing;
}

/**
 * Get pipeline summary stats
 */
export async function getPipelineSummary() {
  const { data: entries } = await supabase
    .from("pipeline_entries")
    .select(
      "predicted_revenue, expected_accounts_filing_date, filing_confidence_score, pipeline_start_date"
    );

  if (!entries)
    return {
      totalRevenue: 0,
      count: 0,
      avgConfidence: 0,
      byMonth: {},
      byQuarter: {},
    };

  const totalRevenue = entries.reduce(
    (sum, e) => sum + (e.predicted_revenue || 0),
    0
  );
  const avgConfidence =
    entries.reduce(
      (sum, e) => sum + (e.filing_confidence_score || 0),
      0
    ) / (entries.length || 1);

  const byMonth: Record<string, number> = {};
  const byQuarter: Record<string, number> = {};

  entries.forEach((entry) => {
    if (entry.predicted_revenue && entry.expected_accounts_filing_date) {
      const date = new Date(entry.expected_accounts_filing_date);
      const revenue = entry.predicted_revenue;

      const monthKey = date.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
      byMonth[monthKey] = (byMonth[monthKey] || 0) + revenue;

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

export interface UpcomingClientFiling {
  pipelineId: string;
  orgId: string | null;
  clientName: string;
  organisationCode: string | null;
  expectedFilingDate: string | null;
  predictedRevenue: number | null;
  confidence: number | null;
  daysUntilFiling: number | null;
}

export async function getUpcomingClientFilings(
  windowDays = 30
): Promise<UpcomingClientFiling[]> {
  const today = new Date();
  const end = new Date(today.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const formatDate = (d: Date): string => d.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("pipeline_entries")
    .select(
      `
      id,
      org_id,
      expected_accounts_filing_date,
      predicted_revenue,
      filing_confidence_score,
      organisations:organisations!pipeline_entries_org_id_fkey(
        id,
        name,
        organisation_code
      )
    `
    )
    .gte("expected_accounts_filing_date", formatDate(today))
    .lte("expected_accounts_filing_date", formatDate(end))
    .order("expected_accounts_filing_date", { ascending: true });

  if (error) {
    console.error("Error fetching upcoming client filings:", error);
    return [];
  }

  const nowMs = today.getTime();

  return (data || [])
    .map((row: any): UpcomingClientFiling => {
      const expected = row.expected_accounts_filing_date as string | null;
      let daysUntil: number | null = null;
      if (expected) {
        const d = new Date(expected);
        if (!Number.isNaN(d.getTime())) {
          daysUntil = Math.max(
            0,
            Math.round((d.getTime() - nowMs) / (1000 * 60 * 60 * 24))
          );
        }
      }

      const org =
        (row.organisations as
          | {
              id: string;
              name: string;
              organisation_code: string | null;
            }
          | null
          | undefined) ?? null;

      return {
        pipelineId: row.id as string,
        orgId: (row.org_id as string | null) ?? null,
        clientName: org?.name || "Unknown client",
        organisationCode: org?.organisation_code ?? null,
        expectedFilingDate: expected,
        predictedRevenue:
          typeof row.predicted_revenue === "number"
            ? row.predicted_revenue
            : null,
        confidence:
          typeof row.filing_confidence_score === "number"
            ? row.filing_confidence_score
            : null,
        daysUntilFiling: daysUntil,
      };
    })
    .sort((a, b) => {
      if (!a.expectedFilingDate || !b.expectedFilingDate) return 0;
      return a.expectedFilingDate.localeCompare(b.expectedFilingDate);
    });
}

const isValidCompaniesHouseNumber = (
  value: string | null | undefined
): boolean => {
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
    console.error(
      "Error checking existing placeholder organisation:",
      existingError
    );
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
    console.error(
      "Error creating placeholder organisation for imported client:",
      insertError
    );
    return null;
  }

  return inserted.id;
}

async function upsertPipelineEntryForClient(
  orgId: string,
  claimId: string | null,
  companyNumber: string | null,
  createdBy: string,
  yearEndMonth?: string | null
): Promise<void> {
  if (!companyNumber) {
    return;
  }

  const prediction = await calculatePredictedFilingDate(
    orgId,
    companyNumber,
    yearEndMonth
  );
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
    expected_accounts_filing_date:
      prediction.predictedDate.toISOString().split("T")[0],
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

  type ImportedClientRow = {
    id: string;
    company_name: string;
    company_number: string | null;
    year_end_month: string | null;
  };

  const { data: importedClients, error: importedError } = await supabase
    .from("clients_to_be_onboarded")
    .select("id, company_name, company_number, year_end_month");

  if (importedError) {
    console.error(
      "Error loading imported clients for pipeline sync:",
      importedError
    );
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

  type CifRecordRow = {
    prospect_id: string;
    year_end_month: string | null;
  };

  const { data: cifRecords, error: cifError } = await supabase
    .from("cif_records")
    .select("prospect_id, year_end_month");

  const yearEndByProspectId = new Map<string, string | null>();

  if (cifError) {
    console.error(
      "Error loading CIF records for pipeline sync:",
      cifError
    );
  } else {
    (cifRecords || ([] as CifRecordRow[])).forEach((record) => {
      if (record.prospect_id) {
        yearEndByProspectId.set(
          record.prospect_id,
          record.year_end_month ?? null
        );
      }
    });
  }

  const importedRows = (importedClients || []) as ImportedClientRow[];

  for (const client of importedRows) {
    if (!client.company_number || !isValidCompaniesHouseNumber(client.company_number)) {
      continue;
    }

    const orgId = await ensurePlaceholderOrganisationForClient(
      client as ClientToBeOnboarded
    );
    if (!orgId) {
      continue;
    }

    await upsertPipelineEntryForClient(
      orgId,
      null,
      client.company_number,
      userId,
      client.year_end_month
    );
  }

  type ProspectRow = {
    id: string;
    org_id: string | null;
    company_number: string | null;
  };

  const prospectRows = (prospects || []) as ProspectRow[];

  for (const prospect of prospectRows) {
    if (!prospect.org_id || !prospect.company_number) {
      continue;
    }

    if (!isValidCompaniesHouseNumber(prospect.company_number)) {
      continue;
    }

    const claimId = claimByOrgId.get(prospect.org_id) || null;
    const yearEndMonth = yearEndByProspectId.get(prospect.id) ?? null;

    await upsertPipelineEntryForClient(
      prospect.org_id,
      claimId,
      prospect.company_number,
      userId,
      yearEndMonth
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
  getUpcomingClientFilings,
  calculatePredictedFilingDate,
  calculatePipelineStartDate,
  syncPipelineFromClients,
  getClientsMissingCompanyNumber,
};