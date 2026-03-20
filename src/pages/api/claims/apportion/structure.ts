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

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, message: "Apportion structure endpoint ready" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured",
        hint: "Set OPENAI_API_KEY in your environment variables (.env.local in Softgen settings) and restart the server."
      });
    }

    const { client: supabase, hasAuth } = getServerSupabaseClient(req);
    if (!hasAuth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsedReq = RequestSchema.safeParse(req.body);
    if (!parsedReq.success) {
      return res.status(400).json({ error: "Invalid request", details: parsedReq.error.flatten() });
    }

    const { claimId, sourceFileId, pages, filename, fileType } = parsedReq.data;

    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("id, org_id, claim_year")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError) {
      console.error("[apportion.structure] claim lookup error", claimError);
      return res.status(500).json({ error: "Failed to load claim" });
    }

    if (!claim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const combinedText = pages
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join("\n\n");

    const system = `You are a careful extraction engine. Your job is to convert text extracted from a financial/staff cost document into structured line items.

Hard rules:
- Never invent values. If a value is not present, set it to null and reduce confidence.
- Do not infer VAT/gross if not explicit.
- If a row is ambiguous, set category="unknown", include=true, add notes, and lower confidence.
- Preserve rawName exactly as seen when possible. Provide normalisedName (trimmed, simplified) when possible.

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
  ]
}`;

    const user = `Document:
- filename: ${filename}
- fileType: ${fileType}

Extracted text by page:
${combinedText}

Task:
1) Identify distinct cost lines.
2) For each line: name/supplier/staff label; debit/credit totals if shown; net if shown (prefer explicit net).
3) Include sourcePage and a confidence score (0..1).
4) Set rawExtraction to contain the exact snippets you used, e.g. { "snippets": ["..."] }.`;

    let completionContent = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });
      completionContent = completion.choices[0]?.message?.content ?? "";
    } catch (err: unknown) {
      const normalized = normalizeOpenAIError(err);
      console.error("[apportion.structure] OpenAI error", err);
      return res.status(502).json({
        ok: false,
        error: normalized.message,
        hint: normalized.hint
      });
    }

    const json = safeJsonParse(completionContent);

    const validated = ResponseSchema.safeParse(json);
    if (!validated.success) {
      console.error("[apportion.structure] Invalid AI JSON", {
        sourceFileId,
        claimId,
        contentPreview: completionContent.slice(0, 400),
        error: validated.error.flatten()
      });
      return res.status(422).json({
        ok: false,
        error: "Parser returned invalid structure",
        hint: "Try re-parse or upload a clearer scan",
        contentPreview: completionContent.slice(0, 400)
      });
    }

    return res.status(200).json({
      ok: true,
      claimId,
      sourceFileId,
      result: validated.data
    });
  } catch (error: any) {
    console.error("[apportion.structure] Unexpected error", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to structure extracted content",
      details: error?.message ?? "Unknown error"
    });
  }
}