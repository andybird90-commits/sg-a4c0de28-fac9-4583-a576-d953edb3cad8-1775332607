import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, type } = req.body;

    if (!prompt || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are RD Companion, an AI assistant helping R&D tax credit consultants with ${type} analysis. Provide clear, concise, and actionable insights. Be helpful but always remind users that this is preliminary guidance.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error("OpenAI API error:", error);
      throw new Error("Failed to get AI response");
    }

    const data = await openaiResponse.json();
    const response = data.choices[0]?.message?.content || "No response generated";

    return res.status(200).json({ response });
  } catch (error) {
    console.error("Sidekick API error:", error);
    return res.status(500).json({ 
      error: "Failed to get AI assistance",
      response: "I apologize, but I'm having trouble connecting right now. Please try again in a moment."
    });
  }
}