import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";

/**
 * SIDEKICK TRANSFER TO CONEXA
 *
 * This is the integration hook for transferring Sidekick projects to Conexa RD Pro.
 *
 * FUTURE INTEGRATION TODO:
 * 1. Create a new project in Conexa RD Pro via API
 * 2. Transfer feasibility analysis results
 * 3. Transfer all evidence items (notes, files, links)
 * 4. Transfer comments/feedback history
 * 5. Set conexa_project_id to the real Conexa project ID
 * 6. Notify client and RD staff of successful transfer
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { project_id, staff_user_id } = req.body as {
      project_id?: string;
      staff_user_id?: string;
    };

    if (!project_id || !staff_user_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get project with company details
    const { data: project, error: projectError } = await supabaseServer
      .from("sidekick_projects")
      .select(
        `
        *,
        organisations!inner(
          id,
          name,
          linked_conexa_company_id,
          linked_conexa_company_name
        )
      `
      )
      .eq("id", project_id)
      .single();

    if (projectError) throw projectError;

    // Validate project can be transferred
    if (!["ready_for_review", "in_review"].includes(project.status)) {
      return res.status(400).json({
        error: "Project must be in review to transfer",
      });
    }

    if (!project.organisations.linked_conexa_company_id) {
      return res.status(400).json({
        error: "Company must be verified and linked to Conexa first",
      });
    }

    // TODO: FUTURE INTEGRATION
    // const conexaProjectId = await createConexaProject({
    //   company_id: project.organisations.linked_conexa_company_id,
    //   name: project.name,
    //   description: project.description,
    //   sector: project.sector,
    //   stage: project.stage,
    // });

    // For now, use the linked company ID as placeholder
    const placeholderConexaProjectId =
      project.organisations.linked_conexa_company_id;

    // Mark project as transferred
    const { error: updateError } = await supabaseServer
      .from("sidekick_projects")
      .update({
        status: "transferred",
        conexa_project_id: placeholderConexaProjectId,
        reviewed_by_user_id: staff_user_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project_id);

    if (updateError) throw updateError;

    // Add system comment about transfer
    await supabaseServer.from("sidekick_project_comments").insert({
      project_id,
      author_id: staff_user_id,
      author_role: "rd_staff",
      body: `Project transferred to Conexa RD Pro for company: ${project.organisations.linked_conexa_company_name}`,
    });

    return res.status(200).json({
      success: true,
      message: "Project transferred to Conexa successfully",
      conexa_project_id: placeholderConexaProjectId,
    });
  } catch (error: any) {
    console.error("Error transferring project:", error);
    return res
      .status(500)
      .json({ error: error?.message || "Internal server error" });
  }
}