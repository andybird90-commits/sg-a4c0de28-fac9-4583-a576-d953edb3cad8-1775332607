import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

type PipelineRow = {
  org_id: string | null;
  predicted_revenue: number | null;
  expected_accounts_filing_date: string | null;
  filing_confidence_score: number | null;
  organisations:
    | {
        name: string;
        organisation_code: string | null;
      }
    | null;
};

function csvEscape(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replace(/"/g, "\"\"")}"`;
  }
  return raw;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  const startDate =
    typeof req.query.startDate === "string" && req.query.startDate.trim()
      ? req.query.startDate.trim()
      : "1900-01-01";

  const endDate =
    typeof req.query.endDate === "string" && req.query.endDate.trim()
      ? req.query.endDate.trim()
      : "2999-12-31";

  const minConfidenceRaw =
    typeof req.query.minConfidence === "string" ? Number(req.query.minConfidence) : 0;
  const minConfidence = Number.isFinite(minConfidenceRaw) ? minConfidenceRaw : 0;

  const { data, error } = await supabaseServer
    .from("pipeline_entries")
    .select(
      `
      org_id,
      predicted_revenue,
      expected_accounts_filing_date,
      filing_confidence_score,
      organisations:organisations!pipeline_entries_org_id_fkey(
        name,
        organisation_code
      )
    `
    )
    .gte("pipeline_start_date", startDate)
    .lte("pipeline_start_date", endDate)
    .gte("filing_confidence_score", minConfidence)
    .order("expected_accounts_filing_date", { ascending: true });

  if (error) {
    console.error("predicted-revenue-by-client csv export failed:", error);
    res.status(500).json({ message: "Failed to generate CSV export" });
    return;
  }

  const rows = (data || []) as unknown as PipelineRow[];

  type Aggregate = {
    orgId: string;
    clientName: string;
    organisationCode: string | null;
    predictedRevenue: number;
    nextExpectedFilingDate: string | null;
    maxConfidenceScore: number | null;
    entryCount: number;
  };

  const byOrg = new Map<string, Aggregate>();

  for (const row of rows) {
    const orgId = row.org_id;
    if (!orgId) continue;

    const existing = byOrg.get(orgId);

    const predictedRevenue =
      typeof row.predicted_revenue === "number" && Number.isFinite(row.predicted_revenue)
        ? row.predicted_revenue
        : 0;

    const expected = typeof row.expected_accounts_filing_date === "string" ? row.expected_accounts_filing_date : null;

    const confidence =
      typeof row.filing_confidence_score === "number" && Number.isFinite(row.filing_confidence_score)
        ? row.filing_confidence_score
        : null;

    const clientName = row.organisations?.name || "Unknown client";
    const organisationCode = row.organisations?.organisation_code ?? null;

    if (!existing) {
      byOrg.set(orgId, {
        orgId,
        clientName,
        organisationCode,
        predictedRevenue,
        nextExpectedFilingDate: expected,
        maxConfidenceScore: confidence,
        entryCount: 1,
      });
      continue;
    }

    existing.predictedRevenue += predictedRevenue;
    existing.entryCount += 1;

    if (expected) {
      if (!existing.nextExpectedFilingDate || expected < existing.nextExpectedFilingDate) {
        existing.nextExpectedFilingDate = expected;
      }
    }

    if (confidence !== null) {
      existing.maxConfidenceScore =
        existing.maxConfidenceScore === null ? confidence : Math.max(existing.maxConfidenceScore, confidence);
    }

    if (!existing.organisationCode && organisationCode) {
      existing.organisationCode = organisationCode;
    }
    if (existing.clientName === "Unknown client" && clientName !== "Unknown client") {
      existing.clientName = clientName;
    }
  }

  const aggregated = Array.from(byOrg.values()).sort((a, b) =>
    a.clientName.localeCompare(b.clientName, "en-GB", { sensitivity: "base" })
  );

  const header = [
    "client_name",
    "organisation_code",
    "predicted_revenue_gbp",
    "next_expected_filing_date",
    "max_confidence_score",
    "entry_count",
  ];

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const item of aggregated) {
    lines.push(
      [
        csvEscape(item.clientName),
        csvEscape(item.organisationCode ?? ""),
        csvEscape(Math.round(item.predictedRevenue)),
        csvEscape(item.nextExpectedFilingDate ?? ""),
        csvEscape(item.maxConfidenceScore ?? ""),
        csvEscape(item.entryCount),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="predicted-revenue-by-client-${today}.csv"`
  );
  res.status(200).send(csv);
}