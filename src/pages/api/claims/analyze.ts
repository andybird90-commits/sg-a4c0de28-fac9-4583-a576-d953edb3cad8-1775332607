import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getServerSupabaseClient(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  const accessToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Please check your .env.local file."
    );
  }

  if (!accessToken) {
    return {
      client: createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY),
      hasAuth: false,
    };
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  return { client, hasAuth: true };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    return res
      .status(200)
      .json({ ok: true, message: "AI analysis endpoint ready" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { client: supabase, hasAuth } = getServerSupabaseClient(req);

    if (!hasAuth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { claimId } = req.body;

    if (!claimId) {
      return res.status(400).json({ error: "Claim ID is required" });
    }

    const { data: rawClaim, error: claimError } = await supabase
      .from("claims")
      .select(
        `
        *,
        organisations!claims_org_id_fkey(name, organisation_code),
        projects:claim_projects(
          id,
          name,
          description,
          rd_theme,
          technical_understanding,
          challenges_uncertainties,
          qualifying_activities,
          start_date,
          end_date
        ),
        costs:claim_costs(
          cost_type,
          description,
          amount,
          cost_date
        ),
        documents:claim_documents(
          doc_type,
          title,
          file_name
        )
      `
      )
      .eq("id", claimId)
      .single();

    if (claimError || !rawClaim) {
      return res.status(404).json({ error: "Claim not found" });
    }

    const claim = rawClaim as any;

    const claimSummary = {
      company: claim.organisations?.name || "Unknown",
      claimYear: claim.claim_year,
      status: claim.status,
      totalCosts: claim.total_costs || 0,
      projectCount: claim.projects?.length || 0,
      projects:
        claim.projects?.map((p: any) => ({
          name: p.name,
          description: p.description,
          rdTheme: p.rd_theme,
          technicalUnderstanding: p.technical_understanding,
          challenges: p.challenges_uncertainties,
          qualifyingActivities: p.qualifying_activities,
          dateRange:
            p.start_date && p.end_date
              ? `${p.start_date} to ${p.end_date}`
              : "Not specified",
        })) || [],
      costBreakdown:
        claim.costs?.reduce((acc: any, cost: any) => {
          acc[cost.cost_type] = (acc[cost.cost_type] || 0) + cost.amount;
          return acc;
        }, {}) || {},
      documentCount: claim.documents?.length || 0,
      documentTypes: [
        ...new Set(claim.documents?.map((d: any) => d.doc_type) || []),
      ],
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert R&D tax credit advisor analyzing UK R&D claims. Provide constructive, actionable feedback on the claim quality, completeness, and areas for improvement. Focus on:
          
1. Technical Quality: Assess the technical understanding, R&D qualification, and innovation described
2. Documentation Completeness: Evaluate if sufficient evidence and documentation exists
3. Cost Justification: Review if costs are appropriate and well-categorized
4. Risk Assessment: Identify potential HMRC challenges or audit risks
5. Improvement Opportunities: Provide specific, actionable recommendations

Be professional, concise, and focus on value-adding insights. Format your response in clear sections with bullet points.`,
        },
        {
          role: "user",
          content: `Analyze this R&D claim:

Company: ${claimSummary.company}
Claim Year: ${claimSummary.claimYear}
Status: ${claimSummary.status}
Total Costs: £${claimSummary.totalCosts.toLocaleString()}
Number of Projects: ${claimSummary.projectCount}
Documents Uploaded: ${claimSummary.documentCount}

Projects:
${
  claimSummary.projects
    .map(
      (p: any, i: number) => `
${i + 1}. ${p.name}
   - Description: ${p.description || "Not provided"}
   - R&D Theme: ${p.rdTheme || "Not specified"}
   - Technical Understanding: ${p.technicalUnderstanding || "Not documented"}
   - Challenges & Uncertainties: ${p.challenges || "Not documented"}
   - Date Range: ${p.dateRange}
`
    )
    .join("\n")
}

Cost Breakdown:
${
  Object.entries(claimSummary.costBreakdown)
    .map(
      ([type, amount]) => `- ${type}: £${(amount as number).toLocaleString()}`
    )
    .join("\n") || "No costs recorded"
}

Document Types: ${
            claimSummary.documentTypes.join(", ") || "None uploaded"
          }

Please provide a comprehensive analysis with specific recommendations for improvement.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis =
      completion.choices[0]?.message?.content ||
      "Unable to generate analysis";

    return res.status(200).json({
      analysis,
      claimSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error analyzing claim:", error);
    return res.status(500).json({
      error: "Failed to analyze claim",
      details: error.message,
    });
  }
}