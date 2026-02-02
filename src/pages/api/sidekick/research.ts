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

    // 2. Generate Summary using OpenAI
    const prompt = `
      You are an expert R&D tax specialist researcher.
      
      Company: "${companyName}"
      ID: ${companyNumber || "N/A"}
      Industry/SIC: ${industry || "Unknown"}

      ${searchContext ? `Here is recent web search information about the company:\n${searchContext}` : "No web search results available."}
      
      Based on this (and your internal knowledge if the company is well-known), provide a professional summary for a Client Intake Form.
      
      Structure the summary to cover:
      1. **Core Business**: What do they actually do? (Products/Services)
      2. **Technical Environment**: Likely technologies, manufacturing processes, or scientific fields they operate in.
      3. **Potential R&D Indicators**: Highlight specific areas where R&D might occur (e.g., developing bespoke software, overcoming engineering challenges, new material formulations).
      
      Keep it concise (under 200 words), professional, and focused on identifying technical complexity.
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
          { role: "system", content: "You are a helpful business research assistant for R&D tax credits." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
      }),
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "No research information available.";

    res.status(200).json({ summary });
  } catch (error) {
    console.error("Research API error:", error);
    res.status(500).json({ message: "Failed to generate research summary" });
  }
}