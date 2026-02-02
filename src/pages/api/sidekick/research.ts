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
    // In a real implementation with Brave Search API key:
    // 1. Call Brave Search API with `companyName`
    // 2. Feed search results to OpenAI to summarize

    // For now, we will use OpenAI to generate a summary based on its knowledge base
    // This provides "simulated" research if we don't have live web access configured yet.
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ 
        summary: "API Key missing. Unable to perform AI research at this time." 
      });
    }

    const prompt = `
      You are an expert business researcher helping an R&D tax specialist.
      
      Please provide a concise professional summary for the company: "${companyName}" (Company Number: ${companyNumber || "N/A"}).
      
      Focus on:
      1. What they do (Industry/Sector)
      2. Likely technical activities or technologies they use
      3. Any potential areas for R&D (Research and Development)
      
      Keep it under 150 words. Use professional tone.
      If the company is very small or unknown, provide general insights based on their name/industry type.
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful business research assistant." },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
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