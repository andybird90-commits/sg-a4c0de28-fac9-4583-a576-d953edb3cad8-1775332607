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
  const withoutTrailingDashes = raw.replace(/\s*[-–—]+\s*$/g, "").trim();
  const withoutDotFillers = withoutTrailingDashes.replace(/[.]{2,}/g, " ").replace(/\s+/g, " ").trim();
  return withoutDotFillers;
}

function parseAgedPayablesRowsFromPages(pages: Page[]): ParsedLine[] {
  const amountRegex = /(?:£\s*)?\d{1,3}(?:,\d{3})*(?:\.\d{2})/g;
  const out: ParsedLine[] = [];

  for (const p of pages) {
    const rawText = (p.text || "").replace(/\r/g, "\n");
    const lines = rawText
      .split("\n")
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.startsWith("aged payables summary") ||
        lower.startsWith("contact current") ||
        lower.startsWith("as at ") ||
        lower.includes("page ") ||
        lower === "aged payables" ||
        lower.startsWith("total aged payables") ||
        lower === "total" ||
        lower.startsWith("percentage of total")
      ) {
        continue;
      }

      amountRegex.lastIndex = 0;
      const matches = Array.from(line.matchAll(amountRegex));
      if (matches.length === 0) continue;

      const first = matches[0];
      const last = matches[matches.length - 1];
      const firstIdx = typeof first.index === "number" ? first.index : -1;
      const lastAmountRaw = last?.[0] ?? "";

      if (firstIdx <= 0) continue;

      const namePartRaw = line.slice(0, firstIdx).trim();
      const contactName = cleanContactName(namePartRaw);
      if (!contactName || contactName.length < 3) continue;

      if (/^[\d£.,\-\s]+$/.test(contactName)) continue;

      const total = parseMoneyAmount(lastAmountRaw);
      if (total === null) continue;

      out.push({
        lineIndex: out.length,
        rawName: contactName,
        normalisedName: contactName,
        category: "supplier",
        referenceText: line,
        debitTotal: total,
        creditTotal: null,
        netTotal: total,
        vatTotal: null,
        grossTotal: null,
        sourcePage: p.pageNumber,
        confidence: 0.75,
        include: true,
        notes: "Heuristic table parse (Aged Payables Summary). Please review headings vs totals.",
        rawExtraction: { page: p.pageNumber, line }
      });
    }
  }

  return out;
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