import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { companyName, companyNumber, industry } = req.body;

  if (!companyName) {
    return res.status(400).json({ message: "Company name is required" });
  }

  try {
    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    let searchContext = "";

    // 1. Perform Brave Search if API key is available
    if (braveApiKey) {
      try {
        const query = `"${companyName}" ${companyNumber ? companyNumber : ""} business activities products services`;
        const braveRes = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
          {
            headers: {
              "Accept": "application/json",
              "X-Subscription-Token": braveApiKey,
            },
          }
        );

        if (braveRes.ok) {
          const braveData = await braveRes.json();
          const results = braveData.web?.results || [];
          searchContext = results
            .map((r: any) => `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`)
            .join("\n\n");
        }
      } catch (err) {
        console.error("Brave search failed:", err);
        // Fallback to no context
      }
    }

    if (!openaiApiKey) {
      return res.status(200).json({ 
        summary: "AI research requires an OpenAI API key. Please configure it in settings." 
      });
    }

    // 2. Generate Comprehensive Feasibility Analysis using OpenAI
    const prompt = `
      You are an expert R&D tax credit feasibility analyst for UK companies.
      
      Company: "${companyName}"
      Company Number: ${companyNumber || "N/A"}
      Industry/SIC: ${industry || "Unknown"}

      ${searchContext ? `Here is recent web search information about the company:\n${searchContext}` : "No web search results available."}
      
      Provide a comprehensive feasibility assessment in the following JSON structure:
      
      {
        "feasibility_summary": "Brief 2-3 sentence overview of R&D potential",
        "estimated_claim_band": "0-25k" | "25k-50k" | "50k-100k" | "100k-250k" | "250k+",
        "claim_rationale": "Explain why this claim band based on company size, sector, typical R&D intensity",
        "core_business": "What do they actually do? (Products/Services)",
        "technical_environment": "Technologies, systems, processes, or scientific fields they operate in. Be specific (e.g. bespoke logistics optimisation platform using Python + React + optimisation algorithms; in-house lab work in polymer chemistry).",
        "rd_indicators": [
          "List 3-5 specific areas where R&D likely occurs",
          "Focus on: product development, process innovation, technical challenges",
          "Each bullet should be a concrete theme or initiative, not a generic statement"
        ],
        "previous_claims_likelihood": "high" | "medium" | "low",
        "prenotification_required": true | false,
        "prenotification_reason": "Why prenotification may be needed (or not)",
        "key_questions": [
          "3-6 very specific questions to ask in the feasibility meeting",
          "Each question MUST clearly reference at least one element from technical_environment or rd_indicators (e.g. a system, technology, product line, process, or R&D theme you described)",
          "Avoid generic R&D questions that could apply to any company; make them feel tailored to this client"
        ],
        "risk_flags": [
          "Any red flags or concerns (e.g., low-margin sector, compliance history)"
        ],
        "recommended_next_steps": [
          "Actionable steps for the BD team"
        ]
      }

      When generating technical_environment and rd_indicators, be as concrete and company-specific as possible.

      When generating key_questions:
      - First, carefully read your own technical_environment and rd_indicators fields.
      - Identify the main technologies, systems, product areas, and R&D themes you have described.
      - For each major theme, write at least one question that probes uncertainty, technical difficulty, or future plans in that exact area.
      - Explicitly name those technologies/systems/themes in the questions (e.g. refer to their logistics optimisation platform, data analytics tooling, bespoke ERP, lab work area, etc.).
      - Do NOT use boilerplate questions like "What specific projects have involved R&D in the past year?" unless there is truly no usable technical detail to reference.

      Base your estimates on:
      - Company size indicators (if available from search)
      - Industry typical R&D intensity
      - Type of technical work implied by business description
      - UK R&D tax credit norms (min £3.5k claim value for CT600 route)
      
      **CRITICAL FEASIBILITY RULES:**
      - Minimum viable claim: £3.5k (for CT600 route)
      - Preferred: Evidence of previous R&D claims
      - Prenotification: Required if first claim AND accounts filed, OR if large claim increase
      
      Be realistic and conservative. Only high estimates (£100k+) if clear evidence of significant technical staff/activities.
      
      Return ONLY valid JSON, no markdown formatting.
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
          { role: "system", content: "You are a UK R&D tax credit feasibility analyst. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON response
    let analysisData;
    try {
      // Remove markdown code fences if present
      const cleanResponse = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysisData = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      analysisData = {
        feasibility_summary: aiResponse,
        estimated_claim_band: "0-25k",
        claim_rationale: "Unable to estimate - manual review required"
      };
    }

    console.log("Returning analysis data:", JSON.stringify(analysisData, null, 2));
    res.status(200).json(analysisData);
  } catch (error) {
    console.error("Research API error:", error);
    res.status(500).json({ message: "Failed to generate research summary" });
  }
}