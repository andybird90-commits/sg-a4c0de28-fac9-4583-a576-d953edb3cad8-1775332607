import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const SYSTEM_PROMPT = `You are RD Companion, a private feasibility assistant available exclusively to companies that are Companion Enabled.
The presence of the "Companion Enabled" badge means the business has opted into a structured, intelligent idea-assessment framework backed by RD's expertise in:

- Building services & MEP design
- Energy systems and decarbonisation
- Digital engineering tools, SaaS platforms, automation and AI
- Commercial and delivery strategy for technical projects
- UK-centric regulatory and operational environments

Your role is to evaluate feasibility, not to invent ideas.
You take the user's raw idea and run it through a consistent feasibility analysis that Companion Enabled companies rely on.

For every idea, you must:

1. Clarify the idea – Restate it cleanly and identify the core problem, outcome or mechanism.
2. Assess technical feasibility – Is it buildable using today's technology, known engineering principles, and realistic resources?
3. Assess commercial feasibility – Identify plausible target users/customers, market rationale, and potential value creation routes.
4. Assess delivery feasibility – Consider timeline realism, complexity, required skills, integrations, supply chain issues, or specialist partners.
5. Identify risks and constraints – Technical, operational, commercial, and regulatory.
6. Flag R&D tax potential – Only at a high level. Indicate if the idea appears to contain technical uncertainty or advancement, but do not provide tax advice.
7. Recommend next actions – 3 to 7 practical steps suitable for the early stage of an idea. No vague waffle.

Your tone must stay:
- Pragmatic
- Clear
- Non-hyped
- UK-contextual
- Helpful without being a substitute for professional legal, tax or financial advice

Do not propose new inventions or new features not present in the original idea.
Do not provide legal/financial/tax advice.
Where appropriate, remind the user that deeper validation requires specialist engagement.

Return all responses in valid JSON format matching the schema exactly.`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create Supabase client with the user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { ideaDescription, sector, stage, projectId } = req.body;

    if (!ideaDescription) {
      return res.status(400).json({ error: "Idea description is required" });
    }

    // Get user's organisation
    const { data: orgUser } = await supabase
      .from("organisation_users")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (!orgUser) {
      return res.status(400).json({ error: "User not linked to organisation" });
    }

    const userPrompt = `I have a new idea and I want a quick feasibility evaluation.

IDEA DESCRIPTION:
${ideaDescription}

${sector ? `SECTOR: ${sector}` : ""}
${stage ? `STAGE: ${stage}` : ""}

Please analyse this idea using the RD Companion Feasibility Engine structure.

Return only valid JSON using the following schema:

{
  "idea_title": "",
  "summary": "",
  "sector_guess": "",
  "technical": {
    "rating": "low|medium|high",
    "reasoning": "",
    "key_constraints": []
  },
  "commercial": {
    "rating": "low|medium|high",
    "reasoning": "",
    "target_customers": [],
    "revenue_ideas": []
  },
  "delivery": {
    "complexity": "low|medium|high",
    "timeframe_guess_months": null,
    "key_dependencies": []
  },
  "risk_regulatory": {
    "notable_risks": [],
    "potential_regulatory_issues": []
  },
  "rd_tax": {
    "flag": "yes|maybe|no",
    "reasoning": ""
  },
  "next_actions": []
}`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      throw new Error(errorData.error?.message || "OpenAI API error");
    }

    const openaiData = await openaiResponse.json();
    const analysisJson = JSON.parse(openaiData.choices[0].message.content);

    // Store in database
    const { data: analysis, error: dbError } = await supabase
      .from("feasibility_analyses")
      .insert({
        user_id: user.id,
        organisation_id: orgUser.org_id,
        project_id: projectId || null,
        idea_description: ideaDescription,
        sector,
        stage,
        idea_title: analysisJson.idea_title,
        summary: analysisJson.summary,
        sector_guess: analysisJson.sector_guess,
        technical_rating: analysisJson.technical?.rating,
        technical_reasoning: analysisJson.technical?.reasoning,
        technical_constraints: analysisJson.technical?.key_constraints || [],
        commercial_rating: analysisJson.commercial?.rating,
        commercial_reasoning: analysisJson.commercial?.reasoning,
        target_customers: analysisJson.commercial?.target_customers || [],
        revenue_ideas: analysisJson.commercial?.revenue_ideas || [],
        delivery_complexity: analysisJson.delivery?.complexity,
        delivery_timeframe_months: analysisJson.delivery?.timeframe_guess_months,
        delivery_dependencies: analysisJson.delivery?.key_dependencies || [],
        notable_risks: analysisJson.risk_regulatory?.notable_risks || [],
        regulatory_issues: analysisJson.risk_regulatory?.potential_regulatory_issues || [],
        rd_tax_flag: analysisJson.rd_tax?.flag,
        rd_tax_reasoning: analysisJson.rd_tax?.reasoning,
        next_actions: analysisJson.next_actions || []
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error("Feasibility analysis error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}