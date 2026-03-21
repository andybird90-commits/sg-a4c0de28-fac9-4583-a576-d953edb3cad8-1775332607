import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import OpenAI from "openai";
import { z } from "zod";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function getOpenAIClient() {
  if (!OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

function getServerSupabaseClient(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing Supabase environment variables. Please check your .env.local file.");
  }

  if (!accessToken) {
    return {
      client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY),
      hasAuth: false
    };
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });

  return { client, hasAuth: true };
}

const PageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string()
});

const RequestSchema = z.object({
  claimId: z.string().min(1),
  sourceFileId: z.string().min(1),
  pages: z.array(PageSchema).min(1),
  filename: z.string().min(1),
  fileType: z.string().min(1)
});

const ParsedLineSchema = z.object({
  lineIndex: z.number().int().nonnegative(),
  rawName: z.string().nullable(),
  normalisedName: z.string().nullable(),
  category: z.enum(["supplier", "subcontractor", "staff", "unknown"]),
  referenceText: z.string().nullable(),
  debitTotal: z.number().nullable(),
  creditTotal: z.number().nullable(),
  netTotal: z.number().nullable(),
  vatTotal: z.number().nullable(),
  grossTotal: z.number().nullable(),
  sourcePage: z.number().int().positive().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  include: z.boolean(),
  notes: z.string().nullable(),
  rawExtraction: z.unknown()
});

const ResponseSchema = z.object({
  lines: z.array(ParsedLineSchema),
  notes: z.string().optional()
});

type ParsedLine = z.infer<typeof ParsedLineSchema>;
type Page = z.infer<typeof PageSchema>;

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function stripMarkdownCodeFence(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
}

function extractLikelyJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

function safeJsonParseFromModelOutput(raw: string): unknown {
  const cleaned = extractLikelyJsonObject(stripMarkdownCodeFence(raw || ""));
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function normalizeOpenAIError(err: unknown): { message: string; hint?: string } {
  const anyErr = err as any;
  const msg = String(anyErr?.message || anyErr?.error?.message || "OpenAI request failed");
  const lower = msg.toLowerCase();

  if (lower.includes("context length") || lower.includes("maximum context") || lower.includes("too large")) {
    return {
      message: "Document is too large to parse in one go",
      hint: "Try a smaller PDF, or re-parse after trimming pages/text (the UI now auto-trims very large documents)."
    };
  }

  if (lower.includes("rate limit") || lower.includes("429")) {
    return {
      message: "OpenAI rate limit reached",
      hint: "Wait a moment and try again."
    };
  }

  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) {
    return {
      message: "OpenAI authentication failed",
      hint: "Check OPENAI_API_KEY in environment variables."
    };
  }

  return { message: msg };
}

function buildAmountSnippetsFromPages(
  pages: Page[],
  opts?: { maxSnippets?: number; windowChars?: number }
): string[] {
  const maxSnippets = opts?.maxSnippets ?? 240;
  const windowChars = opts?.windowChars ?? 64;

  const amountRegex = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;

  const snippets: string[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    const raw = (p.text || "").replace(/\s+/g, " ").trim();
    if (!raw) continue;

    amountRegex.lastIndex = 0;
    let match: RegExpExecArray | null = null;

    while ((match = amountRegex.exec(raw)) !== null) {
      const start = Math.max(0, match.index - windowChars);
      const end = Math.min(raw.length, match.index + match[0].length + windowChars);
      const snippet = raw.slice(start, end).replace(/\s+/g, " ").trim();

      const key = `p${p.pageNumber}:${snippet.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      snippets.push(`Page ${p.pageNumber}: ${snippet}`);
      if (snippets.length >= maxSnippets) return snippets;
    }
  }

  return snippets;
}

function parseMoneyAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function cleanContactName(raw: string): string {
  const withoutLeadingDashes = raw.replace(/^\s*[-–—]+\s*/g, "").trim();
  const withoutTrailingDashes = withoutLeadingDashes.replace(/\s*[-–—]+\s*$/g, "").trim();
  const withoutDotFillers = withoutTrailingDashes.replace(/[.]{2,}/g, " ").replace(/\s+/g, " ").trim();
  return withoutDotFillers;
}

function parseAgedPayablesRowsFromPages(pages: Page[]): ParsedLine[] {
  const amountRegex = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;
  const amountOnce = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/;
  const out: ParsedLine[] = [];
  const monthTokenRegex =
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;
  const monthTokenStrict = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;
  const yearToken = /\b20\d{2}\b/;

  const seen = new Set<string>();

  function looksLikeAgedPayablesDoc(allTextLower: string): boolean {
    if (!allTextLower.includes("aged payables")) return false;
    if (!allTextLower.includes("summary")) return false;
    return (
      allTextLower.includes("ageing by due date") ||
      allTextLower.includes("percentage of total") ||
      allTextLower.includes("total aged payables") ||
      allTextLower.includes("contact current")
    );
  }

  function looksLikeMonthHeader(line: string): boolean {
    const lower = line.toLowerCase();
    monthTokenRegex.lastIndex = 0;
    const monthHits = Array.from(lower.matchAll(monthTokenRegex)).length;
    if (monthHits < 2) return false;

    if (
      lower.includes("contact") ||
      lower.includes("current") ||
      lower.includes("older") ||
      lower.includes("total") ||
      yearToken.test(lower)
    ) {
      return true;
    }

    const stripped = lower
      .replace(monthTokenRegex, " ")
      .replace(yearToken, " ")
      .replace(/[^a-z]/g, "")
      .trim();
    return stripped.length === 0;
  }

  function looksLikeTotalOrSummaryLine(line: string): boolean {
    const lower = line.toLowerCase();
    return (
      lower.startsWith("total aged payables") ||
      lower === "total" ||
      lower.startsWith("total ") ||
      lower.startsWith("percentage of total") ||
      lower.startsWith("aged payables summary") ||
      lower.startsWith("ageing by due date") ||
      lower === "aged payables"
    );
  }

  function hasRealNameWords(name: string): boolean {
    const lower = name.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!lower) return false;
    const words = lower.split(" ").filter(Boolean);
    const nonMonthWords = words.filter((w) => !monthTokenStrict.test(w));
    const lettersOnly = lower.replace(/[^a-z]/g, "");
    if (lettersOnly.length < 3) return false;
    if (nonMonthWords.length === 0) return false;
    return true;
  }

  function stripNonNameChars(raw: string): string {
    return raw.replace(/[0-9£.,\s]/g, "").replace(/[-–—]/g, "").trim();
  }

  function looksLikeNamePrefixOnly(line: string): boolean {
    const lower = line.toLowerCase();
    if (!line) return false;
    if (looksLikeTotalOrSummaryLine(line) || looksLikeMonthHeader(line)) return false;
    if (lower.includes("page ") || lower.startsWith("as at ")) return false;
    amountRegex.lastIndex = 0;
    if (amountRegex.test(line)) return false;
    const lettersOnly = stripNonNameChars(line);
    if (lettersOnly.length < 4) return false;
    if (!/[a-z]/i.test(line)) return false;
    return true;
  }

  function normalizeMergedAgedPayablesLine(line: string): string {
    let next = (line || "").replace(/\s+/g, " ").trim();
    if (!next) return next;

    const lower = next.toLowerCase();
    const hasAmount = amountOnce.test(next);

    if (hasAmount) {
      const summaryIdx = lower.indexOf("aged payables summary");
      if (summaryIdx > 0) {
        next = next.slice(0, summaryIdx).trim();
      }

      next = next
        .replace(/\s+page\s+\d+\s+of\s+\d+\s*$/i, "")
        .replace(/\s+\d{1,2}\s+[A-Za-z]{3}\s+20\d{2}\s*$/i, "")
        .trim();

      const hasHeaderTokens =
        lower.includes("contact current") ||
        lower.includes("ageing by due date") ||
        looksLikeMonthHeader(next);

      if (hasHeaderTokens && lower.includes("aged payables")) {
        const idx = lower.lastIndexOf("aged payables");
        if (idx >= 0) {
          next = next.slice(idx + "aged payables".length).trim();
        }
      }
    }

    next = next.replace(/^\s*(?:aged\s*)?(?:payables|ayables)\s+/i, "");
    return next;
  }

  const allTextLower = pages.map((p) => p.text || "").join("\n").toLowerCase();
  const shouldTreatAsAgedPayables = looksLikeAgedPayablesDoc(allTextLower);

  for (const p of pages) {
    const rawText = (p.text || "").replace(/\r/g, "\n");
    const lines = rawText
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    let pendingPrefix: string | null = null;

    for (const line of lines) {
      const workingLine = shouldTreatAsAgedPayables ? normalizeMergedAgedPayablesLine(line) : line;
      if (!workingLine) {
        pendingPrefix = null;
        continue;
      }

      const lower = workingLine.toLowerCase();
      const isFooterLike =
        lower.startsWith("aged payables summary") ||
        lower.startsWith("page ") ||
        (/page\s+\d+\s+of\s+\d+/.test(lower) && !amountOnce.test(workingLine));

      if (
        lower.startsWith("as at ") ||
        isFooterLike ||
        looksLikeTotalOrSummaryLine(workingLine) ||
        looksLikeMonthHeader(workingLine)
      ) {
        pendingPrefix = null;
        continue;
      }

      amountRegex.lastIndex = 0;
      const matches = Array.from(workingLine.matchAll(amountRegex));
      if (matches.length === 0) {
        if (shouldTreatAsAgedPayables && looksLikeNamePrefixOnly(workingLine)) {
          const cleaned = cleanContactName(workingLine);
          pendingPrefix = cleaned && hasRealNameWords(cleaned) ? cleaned : null;
        }
        continue;
      }

      const first = matches[0];
      const last = matches[matches.length - 1];
      const firstIdx = typeof first.index === "number" ? first.index : -1;
      const lastAmountRaw = last?.[0] ?? "";

      if (firstIdx <= 0) continue;

      const namePartRaw = workingLine.slice(0, firstIdx).trim();
      const contactName = cleanContactName(namePartRaw);
      let finalName = contactName;
      if ((!finalName || finalName.length < 3 || !hasRealNameWords(finalName)) && pendingPrefix) {
        finalName = pendingPrefix;
      } else if (pendingPrefix) {
        const startsLower = /^[a-z]/.test(finalName);
        const short = finalName.length < 12;
        if (startsLower || short) {
          finalName = `${pendingPrefix} ${finalName}`.replace(/\s+/g, " ").trim();
        }
      }
      pendingPrefix = null;

      if (!finalName || finalName.length < 3) continue;

      if (/^[\d£.,\-\s]+$/.test(finalName)) continue;
      if (finalName.replace(/[^A-Za-z]/g, "").length < 2) continue;
      if (!hasRealNameWords(finalName)) continue;

      const total = parseMoneyAmount(lastAmountRaw);
      if (total === null) continue;

      const dedupeKey = `${finalName.toLowerCase()}|${total.toFixed(2)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      out.push({
        lineIndex: out.length,
        rawName: finalName,
        normalisedName: finalName,
        category: "supplier",
        referenceText: workingLine,
        debitTotal: total,
        creditTotal: null,
        netTotal: total,
        vatTotal: null,
        grossTotal: null,
        sourcePage: p.pageNumber,
        confidence: 0.75,
        include: true,
        notes: "Heuristic table parse (Aged Payables Summary). Please review headings vs totals.",
        rawExtraction: { page: p.pageNumber, line: workingLine, monthHits: 0, matchedAmounts: matches.map((m) => m[0]) }
      });
    }
  }

  return out;
}

function parseAgedPayablesSummaryTable(pages: Page[]): ParsedLine[] {
  const amountRegex = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;
  const amountOnce = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/;
  const monthTokenRegex = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;
  const monthTokenStrict = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;

  const out: ParsedLine[] = [];
  const seen = new Set<string>();

  const cleanMergedFooter = (line: string): string => {
    const normal = (line || "").replace(/\s+/g, " ").trim();
    if (!normal) return normal;

    const lower = normal.toLowerCase();
    if (amountOnce.test(normal)) {
      const idx = lower.indexOf("aged payables summary");
      if (idx > 0) {
        return normal
          .slice(0, idx)
          .replace(/\s+page\s+\d+\s+of\s+\d+\s*$/i, "")
          .trim();
      }
    }

    return normal.replace(/\s+page\s+\d+\s+of\s+\d+\s*$/i, "").trim();
  };

  const splitCandidateLines = (rawText: string): string[] => {
    const baseLines = (rawText || "")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((l) => cleanMergedFooter(l))
      .filter(Boolean);

    const contactStartRegex =
      /(?:^|\s)([A-Z][A-Za-z0-9&()'.,/\\\- ]{2,120}?)\s+(?=(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g;

    const expanded: string[] = [];
    for (const line of baseLines) {
      const normal = line.replace(/\s+/g, " ").trim();
      if (normal.length < 240) {
        expanded.push(normal);
        continue;
      }

      amountRegex.lastIndex = 0;
      const moneyHits = Array.from(normal.matchAll(amountRegex)).length;
      if (moneyHits < 6) {
        expanded.push(normal);
        continue;
      }

      contactStartRegex.lastIndex = 0;
      const starts: number[] = [];
      let m: RegExpExecArray | null = null;
      while ((m = contactStartRegex.exec(normal)) !== null) {
        const idx = m.index + (m[0].startsWith(" ") ? 1 : 0);
        starts.push(idx);
        if (starts.length > 30) break;
      }

      const uniqueStarts = Array.from(new Set(starts)).sort((a, b) => a - b);
      if (uniqueStarts.length < 2) {
        expanded.push(normal);
        continue;
      }

      for (let i = 0; i < uniqueStarts.length; i += 1) {
        const start = uniqueStarts[i];
        const end = i + 1 < uniqueStarts.length ? uniqueStarts[i + 1] : normal.length;
        const seg = normal.slice(start, end).trim();
        if (seg) expanded.push(seg);
      }
    }

    return expanded;
  };

  const skipLine = (line: string): boolean => {
    const lower = line.toLowerCase();

    if (!lower) return true;

    if (
      lower.startsWith("aged payables summary") ||
      lower === "aged payables summary" ||
      lower.startsWith("as at ") ||
      lower.startsWith("ageing by due date") ||
      lower.startsWith("contact ") ||
      (lower.includes("page ") && !amountOnce.test(line)) ||
      lower.startsWith("total aged payables") ||
      lower === "total" ||
      lower.startsWith("total ") ||
      lower.startsWith("percentage of total")
    ) {
      return true;
    }

    monthTokenRegex.lastIndex = 0;
    const monthHits = Array.from(lower.matchAll(monthTokenRegex)).length;
    if (monthHits >= 2 && (lower.includes("current") || lower.includes("older") || lower.includes("total"))) {
      return true;
    }

    const letters = lower.replace(/[^a-z]/g, "");
    const digits = lower.replace(/[^0-9]/g, "");
    if (letters.length === 0 && digits.length > 0) return true;

    const onlyPunctOrDashes = /^[\s\-–—.]+$/.test(line.trim());
    if (onlyPunctOrDashes) return true;

    return false;
  };

  const hasRealName = (name: string): boolean => {
    const lower = name.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!lower) return false;

    const words = lower.split(" ").filter(Boolean);
    if (words.length === 0) return false;

    const nonMonth = words.filter((w) => !monthTokenStrict.test(w));
    const lettersOnly = lower.replace(/[^a-z]/g, "");
    if (lettersOnly.length < 3) return false;
    if (nonMonth.length === 0) return false;

    return true;
  };

  for (const p of pages) {
    const rawText = (p.text || "").replace(/\r/g, "\n");

    const lines = splitCandidateLines(rawText);

    for (const line of lines) {
      if (skipLine(line)) continue;

      amountRegex.lastIndex = 0;
      const matches = Array.from(line.matchAll(amountRegex));
      if (matches.length < 1) continue;

      const first = matches[0];
      const last = matches[matches.length - 1];
      const firstIdx = typeof first.index === "number" ? first.index : -1;
      if (firstIdx <= 0) continue;

      const namePartRaw = line.slice(0, firstIdx).trim();
      const contactName = cleanContactName(namePartRaw).replace(/\s*[-–—]+\s*$/g, "").trim();
      if (!contactName) continue;

      if (!/[a-z]/i.test(contactName)) continue;
      if (!hasRealName(contactName)) continue;

      const totalRaw = last?.[0] ?? "";
      const total = parseMoneyAmount(totalRaw);
      if (total === null) continue;

      const dedupeKey = `${contactName.toLowerCase()}|${total.toFixed(2)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      out.push({
        lineIndex: out.length,
        rawName: contactName,
        normalisedName: contactName.replace(/\s+/g, " ").trim(),
        category: "supplier",
        referenceText: line,
        debitTotal: total,
        creditTotal: null,
        netTotal: total,
        vatTotal: null,
        grossTotal: null,
        sourcePage: p.pageNumber,
        confidence: 0.9,
        include: true,
        notes: "Aged Payables Summary table parse (contact + total column).",
        rawExtraction: { page: p.pageNumber, line, amounts: matches.map((m) => m[0]) }
      });
    }
  }

  return out;
}

function parseTotalAgedPayablesFromPages(pages: Page[]): number | null {
  const amountRegex = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;
  for (const p of pages) {
    const rawText = (p.text || "").replace(/\r/g, "\n");
    const lines = rawText
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!lower.startsWith("total aged payables")) continue;
      amountRegex.lastIndex = 0;
      const matches = Array.from(line.matchAll(amountRegex));
      const last = matches[matches.length - 1]?.[0];
      if (!last) continue;
      const n = parseMoneyAmount(last);
      if (n !== null) return n;
    }
  }
  return null;
}

function mergeAgedPayablesLines(a: ParsedLine[], b: ParsedLine[]): ParsedLine[] {
  const bestByKey = new Map<string, ParsedLine>();
  const keyFor = (l: ParsedLine): string => {
    const name = (l.normalisedName || l.rawName || "").toLowerCase().trim();
    const amt = l.netTotal ?? l.debitTotal ?? null;
    const amtKey = typeof amt === "number" && Number.isFinite(amt) ? amt.toFixed(2) : "null";
    const pageKey = l.sourcePage ? `p${l.sourcePage}` : "p?";
    return `${name}|${amtKey}|${pageKey}`;
  };

  const take = (l: ParsedLine) => {
    const key = keyFor(l);
    const prev = bestByKey.get(key);
    if (!prev) {
      bestByKey.set(key, l);
      return;
    }
    const prevC = prev.confidence ?? 0;
    const nextC = l.confidence ?? 0;
    if (nextC > prevC) bestByKey.set(key, l);
  };

  for (const l of a) take(l);
  for (const l of b) take(l);

  return Array.from(bestByKey.values()).sort((x, y) => (x.sourcePage ?? 0) - (y.sourcePage ?? 0));
}

function heuristicLinesFromPages(pages: Page[]): ParsedLine[] {
  const agedPayables = parseAgedPayablesRowsFromPages(pages);
  if (agedPayables.length > 0) {
    return agedPayables.slice(0, 120);
  }

  const snippets = buildAmountSnippetsFromPages(pages, { maxSnippets: 120, windowChars: 80 });
  const lines: ParsedLine[] = [];

  for (let i = 0; i < snippets.length; i += 1) {
    const s = snippets[i];
    const match = s.match(/(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/);
    const amount = match ? parseMoneyAmount(match[0]) : null;

    const pageMatch = s.match(/^Page\s+(\d+):\s*/i);
    const pageNumber = pageMatch?.[1] ? Number(pageMatch[1]) : null;

    const withoutPrefix = s.replace(/^Page\s+\d+:\s*/i, "");
    const beforeAmount =
      match && match.index !== undefined ? withoutPrefix.slice(0, match.index).trim() : withoutPrefix.trim();
    const rawName = beforeAmount ? beforeAmount.slice(-80).trim() : null;

    lines.push({
      lineIndex: i,
      rawName: rawName || null,
      normalisedName: rawName ? rawName.replace(/\s+/g, " ").trim() : null,
      category: "unknown",
      referenceText: withoutPrefix.slice(0, 220),
      debitTotal: amount,
      creditTotal: null,
      netTotal: null,
      vatTotal: null,
      grossTotal: null,
      sourcePage: pageNumber && Number.isFinite(pageNumber) ? pageNumber : null,
      confidence: 0.2,
      include: true,
      notes: "Heuristic fallback (OpenAI parse timed out). Please review.",
      rawExtraction: { snippet: s }
    });
  }

  return lines.slice(0, 90);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Apportion structure endpoint ready" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY is not configured",
        hint: "Set OPENAI_API_KEY in your environment variables (.env.local in Softgen settings) and restart the server."
      });
    }

    const { client: supabase, hasAuth } = getServerSupabaseClient(req);
    if (!hasAuth) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const parsedReq = RequestSchema.safeParse(req.body);
    if (!parsedReq.success) {
      return res.status(400).json({ ok: false, error: "Invalid request", details: parsedReq.error.flatten() });
    }

    const { claimId, sourceFileId, pages, filename, fileType } = parsedReq.data;

    const allLower = pages.map((p) => p.text || "").join("\n").toLowerCase();
    if (allLower.includes("aged payables") && allLower.includes("summary")) {
      const tableLines = parseAgedPayablesSummaryTable(pages);
      const heuristicLines = parseAgedPayablesRowsFromPages(pages);
      const merged = mergeAgedPayablesLines(tableLines, heuristicLines).slice(0, 2000);

      if (merged.length > 0) {
        const reportedTotal = parseTotalAgedPayablesFromPages(pages);
        const capturedSum = merged.reduce((acc, l) => {
          const n = l.netTotal ?? l.debitTotal ?? null;
          return acc + (typeof n === "number" && Number.isFinite(n) ? n : 0);
        }, 0);

        const discrepancy =
          typeof reportedTotal === "number" && Number.isFinite(reportedTotal)
            ? Math.abs(reportedTotal - capturedSum)
            : null;

        const discrepancyNote =
          discrepancy !== null && discrepancy > 0.5
            ? `Sanity check: Total Aged Payables=${reportedTotal.toFixed(
                2
              )} vs captured sum=${capturedSum.toFixed(2)} (diff=${discrepancy.toFixed(2)}).`
            : undefined;

        return res.status(200).json({
          ok: true,
          degraded: true,
          claimId,
          sourceFileId,
          result: {
            lines: merged,
            notes: [
              "Detected an Aged Payables Summary table. Parsed using Aged Payables table extractor (with merged-line recovery).",
              discrepancyNote
            ]
              .filter(Boolean)
              .join(" ")
          }
        });
      }
    }

    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("id, org_id, claim_year")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError) {
      console.error("[apportion.structure] claim lookup error", claimError);
      return res.status(500).json({ ok: false, error: "Failed to load claim" });
    }

    if (!claim) {
      return res.status(404).json({ ok: false, error: "Claim not found" });
    }

    const snippets = buildAmountSnippetsFromPages(pages, { maxSnippets: 240, windowChars: 72 });
    const fallbackLines = heuristicLinesFromPages(pages);

    const combinedText = pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join("\n\n");

    const maxCombinedChars = 20000;
    const combinedTextForPrompt =
      combinedText.length > maxCombinedChars ? combinedText.slice(0, maxCombinedChars) : combinedText;

    const promptBody =
      snippets.length > 0
        ? `Amount-centric snippets (faster to parse than full OCR text):\n${snippets.map((s) => `- ${s}`).join("\n")}`
        : `Extracted text by page:\n${combinedTextForPrompt}`;

    const system = `You are a careful extraction engine. Your job is to convert text extracted from a financial/staff cost document into structured line items.

Hard rules:
- Never invent values. If a value is not present, set it to null and reduce confidence.
- Do not infer VAT/gross if not explicit.
- If a row is ambiguous, set category="unknown", include=true, add notes, and lower confidence.
- Preserve rawName exactly as seen when possible. Provide normalisedName (trimmed, simplified) when possible.
- Do NOT wrap your output in markdown or code fences. No \`\`\` blocks.
- Return at most 60 lines.

Return STRICT JSON only with:
{
  "lines": [
    {
      "lineIndex": number,
      "rawName": string|null,
      "normalisedName": string|null,
      "category": "supplier"|"subcontractor"|"staff"|"unknown",
      "referenceText": string|null,
      "debitTotal": number|null,
      "creditTotal": number|null,
      "netTotal": number|null,
      "vatTotal": number|null,
      "grossTotal": number|null,
      "sourcePage": number|null,
      "confidence": number|null,
      "include": boolean,
      "notes": string|null,
      "rawExtraction": object
    }
  ],
  "notes": string
}`;

    const user = `Document:
- filename: ${filename}
- fileType: ${fileType}
- note: input may be trimmed and/or converted into snippets around amounts to avoid timeouts

${promptBody}

Task:
1) Identify distinct cost lines.
2) For each line: name/supplier/staff label; debit/credit totals if shown; net if shown (prefer explicit net).
3) Include sourcePage and a confidence score (0..1).
4) Set rawExtraction to contain the exact snippets you used, e.g. { "snippets": ["..."] }.`;

    let completionContent = "";
    try {
      const completionPromise = openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" } as any
      });

      const timeoutMs = 8000;
      const completion = await Promise.race([
        completionPromise,
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("OpenAI request timed out")), timeoutMs);
        })
      ]);

      completionContent = (completion as any).choices[0]?.message?.content ?? "";
    } catch (err: unknown) {
      const normalized = normalizeOpenAIError(err);
      console.error("[apportion.structure] OpenAI error", err);

      if (fallbackLines.length > 0) {
        return res.status(200).json({
          ok: true,
          degraded: true,
          claimId,
          sourceFileId,
          result: {
            lines: fallbackLines,
            notes: `Heuristic fallback used: ${normalized.message}`
          }
        });
      }

      const isTimeout = String((err as any)?.message || "").toLowerCase().includes("timed out");
      return res.status(isTimeout ? 504 : 502).json({
        ok: false,
        error: normalized.message,
        hint:
          normalized.hint ??
          (isTimeout
            ? "The parser took too long. Try re-parsing (it may succeed on a subsequent attempt), or upload a smaller/split PDF."
            : undefined)
      });
    }

    const json = safeJsonParseFromModelOutput(completionContent);

    const validated = ResponseSchema.safeParse(json);
    if (!validated.success) {
      console.error("[apportion.structure] Invalid AI JSON", {
        sourceFileId,
        claimId,
        contentPreview: completionContent.slice(0, 400),
        error: validated.error.flatten()
      });

      if (fallbackLines.length > 0) {
        return res.status(200).json({
          ok: true,
          degraded: true,
          claimId,
          sourceFileId,
          result: {
            lines: fallbackLines,
            notes: "Heuristic fallback used: model returned invalid JSON"
          }
        });
      }

      return res.status(422).json({
        ok: false,
        error: "Parser returned invalid structure",
        hint: "The parser output was incomplete/invalid (often due to very long documents). Try re-parsing, upload a smaller PDF, or split the document into sections.",
        contentPreview: completionContent.slice(0, 400)
      });
    }

    return res.status(200).json({
      ok: true,
      degraded: false,
      claimId,
      sourceFileId,
      result: validated.data
    });
  } catch (error: any) {
    console.error("[apportion.structure] Unexpected error", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to structure extracted content",
      hint: "Check server logs for the underlying error (e.g. OpenAI failure, request too large, or auth).",
      details: error?.message ?? "Unknown error"
    });
  }
}