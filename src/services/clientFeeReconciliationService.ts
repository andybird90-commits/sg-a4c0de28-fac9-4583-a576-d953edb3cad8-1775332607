import type { Database } from "@/integrations/supabase/types";

type ClientToBeOnboardedRow =
  Database["public"]["Tables"]["clients_to_be_onboarded"]["Row"];

export type UploadedFeeRow = {
  rawName: string;
  normalisedName: string;
  averageClaimFee: number;
};

export type InternalClient = {
  id: string;
  companyName: string;
  normalisedName: string;
};

type MatchCandidate = {
  client: InternalClient;
  score: number;
};

export type ExactMatch = {
  uploaded: UploadedFeeRow;
  client: InternalClient;
};

export type SuggestedMatch = {
  uploaded: UploadedFeeRow;
  best: MatchCandidate;
  alternatives: MatchCandidate[];
};

export type AmbiguousMatch = {
  uploaded: UploadedFeeRow;
  candidates: MatchCandidate[];
};

export type NoMatch = {
  uploaded: UploadedFeeRow;
};

export type ReconciliationResult = {
  exactMatches: ExactMatch[];
  suggestedMatches: SuggestedMatch[];
  ambiguousMatches: AmbiguousMatch[];
  noMatches: NoMatch[];
};

/**
 * Normalise a client name according to RD Group rules:
 * - Uppercase
 * - Replace & with AND
 * - Trim
 * - Remove trailing legal suffixes
 * - Remove punctuation (. , ' / -)
 * - Collapse multiple spaces
 * - Strip trailing MONTH YYYY
 */
export function normaliseClientName(input: string | null | undefined): string {
  if (!input) return "";

  let name = input.toUpperCase();

  name = name.replace(/&/g, "AND");
  name = name.trim();

  name = name.replace(
    /\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4}\s*$/,
    ""
  );

  name = name.replace(/[.,'\/-]/g, " ");

  name = name.replace(
    /\s+\b(LTD|LIMITED|PLC|LLP|COMPANY|CO|INC|CORPORATION)\b\.?\s*$/,
    ""
  );

  name = name.replace(/\s+/g, " ").trim();

  return name;
}

/**
 * Very simple CSV parser for the fee file:
 * - Assumes header row: "Client Name,Average Claim Fee"
 * - Two columns only
 */
export function parseAverageFeeCsv(csvText: string): UploadedFeeRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return [];

  const dataLines = lines.slice(1);

  const rows: UploadedFeeRow[] = [];

  for (const line of dataLines) {
    const parts = line.split(",");
    if (parts.length < 2) continue;

    const rawName = parts[0].trim();
    const feeStr = parts.slice(1).join(",").trim();
    const fee = Number(feeStr);
    if (!rawName || Number.isNaN(fee)) continue;

    rows.push({
      rawName,
      normalisedName: normaliseClientName(rawName),
      averageClaimFee: fee,
    });
  }

  return rows;
}

/**
 * Build internal client objects from clients_to_be_onboarded rows.
 */
export function buildInternalClients(
  rows: ClientToBeOnboardedRow[]
): InternalClient[] {
  return rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    normalisedName: normaliseClientName(row.company_name),
  }));
}

/**
 * Basic Levenshtein distance for fuzzy matching.
 */
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Convert Levenshtein distance into similarity score in [0, 1].
 */
function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

/**
 * Core reconciliation engine:
 * - exactMatches: same normalised name
 * - suggestedMatches: one clear best match above high threshold
 * - ambiguousMatches: multiple close matches, requires user choice
 * - noMatches: no sufficiently close internal client
 */
export function reconcileFeesWithClients(
  uploaded: UploadedFeeRow[],
  internalClients: InternalClient[]
): ReconciliationResult {
  const exactMatches: ExactMatch[] = [];
  const suggestedMatches: SuggestedMatch[] = [];
  const ambiguousMatches: AmbiguousMatch[] = [];
  const noMatches: NoMatch[] = [];

  const highThreshold = 0.9;
  const closeThreshold = 0.8;
  const clearGap = 0.1;

  for (const row of uploaded) {
    const exact = internalClients.find(
      (c) => c.normalisedName === row.normalisedName
    );
    if (exact) {
      exactMatches.push({ uploaded: row, client: exact });
      continue;
    }

    const candidates: MatchCandidate[] = internalClients
      .map((client) => ({
        client,
        score: similarityScore(row.normalisedName, client.normalisedName),
      }))
      .filter((c) => c.score >= closeThreshold)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      noMatches.push({ uploaded: row });
      continue;
    }

    const best = candidates[0];
    const second = candidates[1];

    if (
      best.score >= highThreshold &&
      (!second || best.score - second.score >= clearGap)
    ) {
      suggestedMatches.push({
        uploaded: row,
        best,
        alternatives: candidates.slice(1, 5),
      });
    } else {
      ambiguousMatches.push({
        uploaded: row,
        candidates: candidates.slice(0, 5),
      });
    }
  }

  return { exactMatches, suggestedMatches, ambiguousMatches, noMatches };
}