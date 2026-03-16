import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { prospectId } = req.body as { prospectId?: string };

  if (!prospectId) {
    return res.status(400).json({ message: "prospectId is required" });
  }

  try {
    const { data: prospect, error: prospectError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .select("id, company_name, company_number, website")
      .eq("id", prospectId)
      .maybeSingle();

    if (prospectError || !prospect) {
      console.error("Error loading SDR prospect for enrichment:", prospectError);
      return res.status(404).json({ message: "Prospect not found" });
    }

    const companyName: string = prospect.company_name as string;
    const companyNumber: string | null = (prospect.company_number as string | null) ?? null;
    const website: string | null = (prospect.website as string | null) ?? null;

    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    let searchContext = "";

    if (braveApiKey) {
      try {
        const queryParts = [`"${companyName}"`];
        if (companyNumber) queryParts.push(companyNumber);
        queryParts.push("UK company R&D technology products services manufacturing engineering");
        const query = queryParts.join(" ");

        const braveRes = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
            query
          )}&count=5`,
          {
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": braveApiKey,
            },
          }
        );

        if (braveRes.ok) {
          const braveData = (await braveRes.json()) as any;
          const results = braveData.web?.results || [];
          searchContext = results
            .map(
              (r: any) =>
                `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`
            )
            .join("\n\n");
        }
      } catch (err) {
        console.error("Brave search for SDR enrichment failed:", err);
      }
    }

    if (!openaiApiKey) {
      return res.status(200).json({
        message: "OpenAI API key not configured",
      });
    }

    const prompt = `
You are generating an R&D dossier for UK outbound SDRs qualifying companies for R&D tax relief.

Company: "${companyName}"
Company Number: ${companyNumber || "N/A"}
Website: ${website || "Unknown"}
Search context:
${searchContext || "No external search data available."}

Produce a concise JSON dossier with the following shape:

{
  "website": "https://example.com or null",
  "rd_viability_score": 0-100 number,
  "estimated_claim_band": "0-25k" | "25k-50k" | "50k-100k" | "100k-250k" | "250k+",
  "rd_summary": "2-4 sentence overview of R&D potential in plain English",
  "what_they_do": "Clear description of core products/services and business model",
  "technical_focus": "Key technologies, engineering domains, and systems they work on",
  "where_rd_is_happening": "Where R&D is most likely taking place (teams, products, processes)",
  "rd_tax_fit": "Hypotheses on why they are or are not a good fit for UK R&D tax relief",
  "questions_to_validate": [
    "3-6 very specific questions an SDR should ask",
    "Each question should reference concrete systems, products, or technical themes you described"
  ],
  "call_script_intro": "Short opening script personalised to this company and sector",
  "call_script_main": "Follow-up lines and prompts to explore R&D in more depth",
  "confidence_note": "Short note on how confident this is and what needs validating"
}

Rules:
- Base the rd_viability_score and estimated_claim_band on size/sector/complexity implied by the context.
- Be realistic and conservative: 90+ only for clearly R&D-intensive companies.
- Always return valid JSON only. No markdown or extra commentary.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert UK R&D tax analyst generating SDR-ready dossiers. Always respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    const data = (await response.json()) as any;
    const rawContent: string = data.choices?.[0]?.message?.content || "{}";

    let dossier: any;
    try {
      const clean = rawContent
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      dossier = JSON.parse(clean);
    } catch (parseError) {
      console.error("Failed to parse SDR dossier JSON:", parseError, rawContent);
      dossier = {
        rd_summary: rawContent,
        rd_viability_score: null,
        estimated_claim_band: null,
        confidence_note:
          "AI response could not be parsed as structured JSON; manual review required.",
      };
    }

    const scoreValue =
      typeof dossier.rd_viability_score === "number"
        ? dossier.rd_viability_score
        : null;
    const claimBand =
      typeof dossier.estimated_claim_band === "string"
        ? dossier.estimated_claim_band
        : null;

    const { data: updated, error: updateError } = await (supabaseServer as any)
      .from("sdr_prospects")
      .update({
        ai_dossier_json: dossier,
        rd_viability_score: scoreValue,
        estimated_claim_band: claimBand,
        last_enriched_at: new Date().toISOString(),
        enrichment_error: null,
        status: "enriched",
        updated_at: new Date().toISOString(),
      })
      .eq("id", prospectId)
      .select()
      .single();

    if (updateError) {
      console.error("Error saving SDR dossier:", updateError);
      return res.status(500).json({ message: "Failed to save dossier" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Unexpected SDR enrichment error:", error);
    return res.status(500).json({ message: "Failed to generate SDR dossier" });
  }
}