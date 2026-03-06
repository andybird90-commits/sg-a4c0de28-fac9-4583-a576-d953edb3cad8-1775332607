import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import {
  buildRdClaimTechnicalDossier,
  type DossierProject,
  type DossierProjectEvidenceItem,
  type DossierCostSummary,
} from "@/lib/pdf/rdClaimDossier";

type FinalPdfSuccessResponse = {
  ok: true;
  pdf_url: string;
  generated_at: string;
  page_count: number;
};

type FinalPdfErrorResponse = {
  ok: false;
  error: string;
  missing_project_ids?: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FinalPdfSuccessResponse | FinalPdfErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const claimId = req.query.id as string | undefined;

  if (!claimId) {
    res.status(400).json({ ok: false, error: "Missing claim id" });
    return;
  }

  try {
    const { data: claim, error: claimError } = await supabaseServer
      .from("claims")
      .select("id, org_id, claim_year, period_start, period_end, status, final_pdf_url")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError || !claim) {
      res.status(404).json({ ok: false, error: "Claim not found" });
      return;
    }

    if (claim.status !== "ready_to_file") {
      res.status(400).json({
        ok: false,
        error:
          "Claim is not marked as ready. Please finalise narratives before generating the final PDF.",
      });
      return;
    }

    const { data: organisation, error: orgError } = await supabaseServer
      .from("organisations")
      .select("id, name, organisation_code")
      .eq("id", claim.org_id)
      .maybeSingle();

    if (orgError || !organisation) {
      console.error("Error loading organisation in final PDF handler:", orgError);
      res.status(500).json({
        ok: false,
        error: "Failed to load organisation for claim",
      });
      return;
    }

    const { data: projectsData, error: projectsError } = await supabaseServer
      .from("claim_projects")
      .select(
        "id, name, rd_theme, start_date, end_date, technical_reviewer, source_project_id"
      )
      .eq("claim_id", claim.id)
      .is("deleted_at", null);

    if (projectsError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load claim projects",
      });
      return;
    }

    const projects = projectsData || [];
    const projectIds = projects.map((p) => p.id);

    const { data: narrativeStates, error: statesError } =
      await supabaseServer
        .from("rd_project_narrative_state")
        .select("id, claim_project_id, final_narrative_id")
        .in(
          "claim_project_id",
          projectIds.length > 0
            ? projectIds
            : ["00000000-0000-0000-0000-000000000000"]
        );

    if (statesError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load narrative state",
      });
      return;
    }

    const { data: narrativesData, error: narrativesError } = await supabaseServer
      .from("rd_project_narratives")
      .select(
        "id, claim_project_id, status, version_number, advance_sought, baseline_knowledge, technological_uncertainty, work_undertaken, outcome"
      )
      .in(
        "claim_project_id",
        projectIds.length > 0
          ? projectIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    if (narrativesError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load narratives",
      });
      return;
    }

    const stateByProjectId = new Map<
      string,
      {
        id: string;
        claim_project_id: string;
        final_narrative_id: string | null;
      }
    >();
    (narrativeStates || []).forEach((s) => {
      stateByProjectId.set(s.claim_project_id, s as any);
    });

    const narrativesById = new Map<
      string,
      {
        id: string;
        claim_project_id: string;
        status: string;
        version_number: number;
        advance_sought: string;
        baseline_knowledge: string;
        technological_uncertainty: string;
        work_undertaken: string;
        outcome: string;
      }
    >();
    (narrativesData || []).forEach((n) => {
      narrativesById.set(n.id, n as any);
    });

    const missingProjectIds: string[] = [];

    projects.forEach((project) => {
      const state = stateByProjectId.get(project.id);
      if (!state || !state.final_narrative_id) {
        missingProjectIds.push(project.id);
      }
    });

    if (missingProjectIds.length > 0) {
      res.status(400).json({
        ok: false,
        error:
          "Some projects are missing final narratives. Please complete them before generating the final PDF.",
        missing_project_ids: missingProjectIds,
      });
      return;
    }

    const leadIds = Array.from(
      new Set(
        projects
          .map((p) => p.technical_reviewer)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    let leadsById = new Map<string, { id: string; full_name: string | null }>();
    if (leadIds.length > 0) {
      const { data: leadsData, error: leadsError } = await supabaseServer
        .from("profiles")
        .select("id, full_name")
        .in("id", leadIds);

      if (leadsError) {
        console.error("Error loading lead engineer profiles in final PDF handler:", leadsError);
      } else {
        leadsById = new Map(
          (leadsData || []).map((p) => [p.id as string, p as { id: string; full_name: string | null }])
        );
      }
    }

    const { data: costsData, error: costsError } = await supabaseServer
      .from("claim_costs")
      .select("cost_type, amount")
      .eq("claim_id", claim.id);

    if (costsError) {
      console.error("Error loading claim costs in final PDF handler:", costsError);
      res.status(500).json({
        ok: false,
        error: "Failed to load claim costs",
      });
      return;
    }

    const costAccumulator: DossierCostSummary = {
      staff: 0,
      externallyProvidedWorkers: 0,
      subcontractor: 0,
      consumables: 0,
      software: 0,
      totalQualifying: 0,
    };

    (costsData || []).forEach((c) => {
      const amount = Number(c.amount || 0);
      switch (c.cost_type) {
        case "staff":
          costAccumulator.staff += amount;
          break;
        case "subcontractor":
          costAccumulator.subcontractor += amount;
          break;
        case "consumables":
          costAccumulator.consumables += amount;
          break;
        case "software":
          costAccumulator.software += amount;
          break;
        default:
          break;
      }
      costAccumulator.totalQualifying += amount;
    });

    const sourceProjectIds = Array.from(
      new Set(
        projects
          .map((p) => p.source_project_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    const { data: claimEvidence, error: claimEvidenceError } = await supabaseServer
      .from("rd_claim_evidence")
      .select("id, claim_id, project_id, sidekick_evidence_id, type, description, tag")
      .eq("claim_id", claim.id)
      .in(
        "project_id",
        sourceProjectIds.length > 0
          ? sourceProjectIds
          : ["00000000-0000-0000-0000-000000000000"]
      );

    if (claimEvidenceError) {
      console.error("Error loading rd_claim_evidence in final PDF handler:", claimEvidenceError);
    }

    const sidekickEvidenceIds = Array.from(
      new Set(
        (claimEvidence || [])
          .map((e) => e.sidekick_evidence_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      )
    );

    let sidekickEvidenceById = new Map<
      string,
      { id: string; title: string | null; body: string | null; file_path: string | null; type: string }
    >();

    if (sidekickEvidenceIds.length > 0) {
      const { data: sidekickEvidence, error: sidekickError } = await supabaseServer
        .from("sidekick_evidence_items")
        .select("id, title, body, file_path, type")
        .in("id", sidekickEvidenceIds);

      if (sidekickError) {
        console.error(
          "Error loading sidekick_evidence_items in final PDF handler:",
          sidekickError
        );
      } else {
        sidekickEvidenceById = new Map(
          (sidekickEvidence || []).map((e) => [
            e.id as string,
            e as {
              id: string;
              title: string | null;
              body: string | null;
              file_path: string | null;
              type: string;
            },
          ])
        );
      }
    }

    const evidenceByClaimProjectId = new Map<string, DossierProjectEvidenceItem[]>();

    (claimEvidence || []).forEach((e, index) => {
      const projectSourceId = e.project_id;
      if (!projectSourceId) return;

      const claimProject = projects.find(
        (p) => p.source_project_id && p.source_project_id === projectSourceId
      );
      if (!claimProject) return;

      const key = claimProject.id;
      const list = evidenceByClaimProjectId.get(key) || [];

      const linked = e.sidekick_evidence_id
        ? sidekickEvidenceById.get(e.sidekick_evidence_id as string)
        : null;

      const title = linked?.title || e.tag || e.type || "Evidence item";
      const caption = linked?.body || e.description || "";
      const filePath = linked?.file_path || "";
      const isImage =
        !!filePath &&
        /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(filePath);

      const evidenceCode = `E${index + 1}`;

      list.push({
        code: evidenceCode,
        title,
        caption,
        isImage,
      });

      evidenceByClaimProjectId.set(key, list);
    });

    const dossierProjects: DossierProject[] = projects.map((project) => {
      const state = stateByProjectId.get(project.id);
      const narrativeId = state?.final_narrative_id || null;
      const narrative = narrativeId ? narrativesById.get(narrativeId) : undefined;
      const leadProfile =
        project.technical_reviewer &&
        leadsById.get(project.technical_reviewer as string);

      return {
        id: project.id,
        name: project.name || "Untitled project",
        field: project.rd_theme || null,
        startDate: project.start_date ? String(project.start_date) : null,
        endDate: project.end_date ? String(project.end_date) : null,
        leadEngineer: leadProfile?.full_name || null,
        narrative: narrative
          ? {
              advance_sought: narrative.advance_sought,
              baseline_knowledge: narrative.baseline_knowledge,
              technological_uncertainty: narrative.technological_uncertainty,
              work_undertaken: narrative.work_undertaken,
              outcome: narrative.outcome,
            }
          : undefined,
        evidence: evidenceByClaimProjectId.get(project.id) || [],
      };
    });

    const keyTechnologyFields = Array.from(
      new Set(
        dossierProjects
          .map((p) => p.field)
          .filter((f): f is string => !!f && f.trim().length > 0)
      )
    );

    const generatedAt = new Date().toISOString();

    const { pdfBytes, pageCount } = await buildRdClaimTechnicalDossier({
      mode: "final",
      claim: {
        id: claim.id,
        claimYear: (claim as any).claim_year ?? null,
        periodStart: claim.period_start ? String(claim.period_start) : null,
        periodEnd: claim.period_end ? String(claim.period_end) : null,
      },
      organisation: {
        name: organisation.name,
        companyNumber: organisation.organisation_code || null,
      },
      projects: dossierProjects,
      costs: costAccumulator,
      keyTechnologyFields,
      generatedAt,
    });

    const filePath = `claims/${claimId}/final-pack.pdf`;
    const bucket = "Submitted-Claims";

    const { error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(filePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading final PDF:", uploadError);
      res
        .status(500)
        .json({ ok: false, error: "Failed to upload final PDF" });
      return;
    }

    const { error: updateError } = await supabaseServer
      .from("claims")
      .update({
        final_pdf_url: filePath,
      })
      .eq("id", claimId);

    if (updateError) {
      console.error("Error saving final PDF path:", updateError);
      res
        .status(500)
        .json({ ok: false, error: "Failed to save final PDF path" });
      return;
    }

    const generatedAtIso = generatedAt;
    const pageCountValue = pageCount;

    const { error: auditError } = await supabaseServer
      .from("rd_audit_log")
      .insert({
        claim_id: claim.id,
        project_id: null,
        action: "pdf_final",
        actor_user_id: null,
        details_json: {
          pdf_path: filePath,
          page_count: pageCountValue,
        },
      });

    if (auditError) {
      console.error("Failed to write rd_audit_log for pdf_final:", auditError);
    }

    const responseBody: FinalPdfSuccessResponse = {
      ok: true,
      pdf_url: filePath,
      generated_at: generatedAtIso,
      page_count: pageCountValue,
    };

    res.status(200).json(responseBody);
  } catch (error: any) {
    console.error("Unexpected error generating final PDF:", error);
    res.status(500).json({
      ok: false,
      error:
        error?.message || "Failed to generate final R&D claim PDF pack",
    });
  }
}