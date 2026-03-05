import type { NextApiRequest, NextApiResponse } from "next";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { supabaseServer } from "@/integrations/supabase/serverClient";

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
      .select("id, org_id, claim_year, period_start, period_end, status")
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

    const { data: projects, error: projectsError } = await supabaseServer
      .from("claim_projects")
      .select("id, name")
      .eq("claim_id", claim.id)
      .is("deleted_at", null);

    if (projectsError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load claim projects",
      });
      return;
    }

    const projectIds = (projects || []).map((p) => p.id);

    const { data: narrativeStates, error: statesError } =
      await supabaseServer
        .from("rd_project_narrative_state")
        .select("id, claim_project_id, final_narrative_id")
        .in("claim_project_id", projectIds);

    if (statesError) {
      res.status(500).json({
        ok: false,
        error: "Failed to load narrative state",
      });
      return;
    }

    const { data: narratives, error: narrativesError } = await supabaseServer
      .from("rd_project_narratives")
      .select(
        "id, claim_project_id, status, version_number, advance_sought, baseline_knowledge, technological_uncertainty, work_undertaken, outcome"
      )
      .in("claim_project_id", projectIds);

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
        advance_sought: string | null;
        baseline_knowledge: string | null;
        technological_uncertainty: string | null;
        work_undertaken: string | null;
        outcome: string | null;
      }
    >();
    (narratives || []).forEach((n) => {
      narrativesById.set(n.id, n as any);
    });

    const missingProjectIds: string[] = [];

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const titlePage = pdfDoc.addPage();
    const { width, height } = titlePage.getSize();
    const titleFontSize = 18;
    const lineHeight = 16;

    let y = height - 80;

    titlePage.drawText("Final R&D Claim Pack", {
      x: 50,
      y,
      size: titleFontSize,
      font,
    });
    y -= titleFontSize + 20;

    titlePage.drawText(`Claim ID: ${claim.id}`, {
      x: 50,
      y,
      size: 12,
      font,
    });
    y -= lineHeight;

    if ((claim as any).claim_year) {
      titlePage.drawText(`Claim year: ${(claim as any).claim_year}`, {
        x: 50,
        y,
        size: 12,
        font,
      });
      y -= lineHeight;
    }

    const periodParts: string[] = [];
    if (claim.period_start) periodParts.push(String(claim.period_start));
    if (claim.period_end) periodParts.push(String(claim.period_end));

    if (periodParts.length > 0) {
      titlePage.drawText(
        `Accounting period: ${periodParts.join(" to ")}`,
        {
          x: 50,
          y,
          size: 12,
          font,
        }
      );
      y -= lineHeight;
    }

    y -= lineHeight;

    titlePage.drawText("Status: READY TO FILE", {
      x: 50,
      y,
      size: 12,
      font,
    });

    for (const project of projects || []) {
      const projPage = pdfDoc.addPage();
      const { width: pw, height: ph } = projPage.getSize();
      let py = ph - 60;

      projPage.drawText(`Project: ${project.name}`, {
        x: 50,
        y: py,
        size: 14,
        font,
      });
      py -= 24;

      const state = stateByProjectId.get(project.id);
      const narrativeId = state?.final_narrative_id || null;

      if (!narrativeId) {
        missingProjectIds.push(project.id);
        projPage.drawText(
          "No final narrative set for this project.",
          {
            x: 50,
            y: py,
            size: 12,
            font,
          }
        );
        continue;
      }

      const narrative = narrativesById.get(narrativeId);

      if (!narrative || narrative.status !== "final") {
        missingProjectIds.push(project.id);
        projPage.drawText(
          "Narrative is not in final status for this project.",
          {
            x: 50,
            y: py,
            size: 12,
            font,
          }
        );
        continue;
      }

      const sections: { label: string; value: string | null }[] = [
        { label: "Advance sought", value: narrative.advance_sought },
        { label: "Baseline knowledge", value: narrative.baseline_knowledge },
        {
          label: "Technological uncertainty",
          value: narrative.technological_uncertainty,
        },
        {
          label: "Work undertaken",
          value: narrative.work_undertaken,
        },
        { label: "Outcome", value: narrative.outcome },
      ];

      for (const section of sections) {
        if (py < 80) {
          py = 80;
        }

        projPage.drawText(section.label + ":", {
          x: 50,
          y: py,
          size: 12,
          font,
        });
        py -= lineHeight;

        const text = (section.value || "").trim() || "(not provided)";
        const wrapped = text.split("\n");
        for (const line of wrapped) {
          projPage.drawText(line, {
            x: 60,
            y: py,
            size: 11,
            font,
          });
          py -= lineHeight;
        }

        py -= lineHeight / 2;
      }
    }

    if (missingProjectIds.length > 0) {
      res.status(400).json({
        ok: false,
        error:
          "Some projects are missing final narratives. Please complete them before generating the final PDF.",
        missing_project_ids: missingProjectIds,
      });
      return;
    }

    const pdfBytes = await pdfDoc.save();
    const filePath = `claims/${claimId}/final-pack.pdf`;

    const { error: uploadError } = await supabaseServer.storage
      .from("submitted-claims")
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

    const generatedAt = new Date().toISOString();
    const pageCount = pdfDoc.getPageCount();

    const { error: auditError } = await supabaseServer
      .from("rd_audit_log")
      .insert({
        claim_id: claim.id,
        project_id: null,
        action: "pdf_final",
        actor_user_id: null,
        details_json: {
          pdf_path: filePath,
          page_count: pageCount,
        },
      });

    if (auditError) {
      console.error("Failed to write rd_audit_log for pdf_final:", auditError);
    }

    const responseBody: FinalPdfSuccessResponse = {
      ok: true,
      pdf_url: filePath,
      generated_at: generatedAt,
      page_count: pageCount,
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