import type { NextApiRequest, NextApiResponse } from "next";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseServer } from "@/integrations/supabase/serverClient";

type DraftPdfSuccessResponse = {
  ok: true;
  pdf_url: string;
  generated_at: string;
  page_count: number;
  signed_url?: string;
};

type DraftPdfErrorResponse = {
  ok: false;
  error: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getBearerToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string") return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length);
}

/**
 * Per-request Supabase client used only for AUTH (getUser),
 * not for database/storage operations (those use supabaseServer to bypass RLS).
 */
function getSupabaseAuthClientForRequest(req: NextApiRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const token = getBearerToken(req);

  if (!token) {
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
    return { client, token: null as string | null };
  }

  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return { client, token };
}

async function getAuthContext(req: NextApiRequest): Promise<{
  userId: string | null;
  profile: { id: string; internal_role: string | null } | null;
}> {
  const { client: supabase, token } = getSupabaseAuthClientForRequest(req);

  if (!token) {
    return { userId: null, profile: null };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { userId: null, profile: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, internal_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { userId: user.id, profile: null };
  }

  return { userId: user.id, profile: profile as { id: string; internal_role: string | null } };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DraftPdfSuccessResponse | DraftPdfErrorResponse>
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
    console.log("rd/pdf/draft handler env", {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    const { userId, profile } = await getAuthContext(req);

    if (!userId) {
      res
        .status(401)
        .json({ ok: false, error: "Unauthorized: missing or invalid token" });
      return;
    }

    // All DB and storage operations below use supabaseServer (service role) to bypass RLS.
    const { data: claim, error: claimError } = await supabaseServer
      .from("claims")
      .select("id, org_id, claim_year, period_start, period_end, status")
      .eq("id", claimId)
      .maybeSingle();

    if (claimError || !claim) {
      console.error("Error loading claim in draft PDF handler:", claimError);
      res.status(404).json({ ok: false, error: "Claim not found" });
      return;
    }

    const { data: projects, error: projectsError } = await supabaseServer
      .from("claim_projects")
      .select("id, name")
      .eq("claim_id", claim.id)
      .is("deleted_at", null);

    if (projectsError) {
      console.error("Error loading claim projects in draft PDF handler:", projectsError);
      res.status(500).json({
        ok: false,
        error: "Failed to load claim projects",
      });
      return;
    }

    const projectIds = (projects || []).map((p) => p.id);

    const { data: narrativeStates, error: statesError } = await supabaseServer
      .from("rd_project_narrative_state")
      .select("id, claim_project_id, current_narrative_id, final_narrative_id")
      .in("claim_project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"]);

    if (statesError) {
      console.error("Error loading narrative state in draft PDF handler:", statesError);
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
      .in("claim_project_id", projectIds.length > 0 ? projectIds : ["00000000-0000-0000-0000-000000000000"]);

    if (narrativesError) {
      console.error("Error loading narratives in draft PDF handler:", narrativesError);
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
        current_narrative_id: string | null;
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

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const titlePage = pdfDoc.addPage();
    const { width, height } = titlePage.getSize();
    const titleFontSize = 18;
    const lineHeight = 16;

    let y = height - 80;

    titlePage.drawText("Draft R&D Claim Pack", {
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
      titlePage.drawText(`Accounting period: ${periodParts.join(" to ")}`, {
        x: 50,
        y,
        size: 12,
        font,
      });
      y -= lineHeight;
    }

    y -= lineHeight;

    titlePage.drawText("Status: DRAFT – NOT FOR SUBMISSION", {
      x: 50,
      y,
      size: 12,
      font,
    });

    titlePage.drawText("DRAFT – NOT FOR SUBMISSION", {
      x: width / 4,
      y: height / 2,
      size: 24,
      font,
    });

    for (const project of projects || []) {
      const projPage = pdfDoc.addPage();
      const { width: pw, height: ph } = projPage.getSize();
      let py = ph - 60;

      projPage.drawText("DRAFT – NOT FOR SUBMISSION", {
        x: pw / 4,
        y: ph / 2,
        size: 20,
        font,
      });

      projPage.drawText(`Project: ${project.name}`, {
        x: 50,
        y: py,
        size: 14,
        font,
      });
      py -= 24;

      const state = stateByProjectId.get(project.id);
      let narrativeId: string | null = null;

      if (state?.current_narrative_id) {
        narrativeId = state.current_narrative_id;
      } else if (state?.final_narrative_id) {
        narrativeId = state.final_narrative_id;
      }

      if (!narrativeId) {
        projPage.drawText("No narrative selected yet for this project.", {
          x: 50,
          y: py,
          size: 12,
          font,
        });
        continue;
      }

      const narrative = narrativesById.get(narrativeId);

      if (!narrative) {
        projPage.drawText(
          "Narrative referenced in state could not be loaded.",
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

    const pdfBytes = await pdfDoc.save();
    const filePath = `claims/${claimId}/draft-pack.pdf`;
    const bucket = "Draft-Claims";

    const { error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(filePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading draft PDF:", uploadError);
      res.status(500).json({
        ok: false,
        error:
          (uploadError as any)?.message
            ? `storage upload: ${(uploadError as any).message}`
            : "Failed to upload draft PDF",
      });
      return;
    }

    const { error: updateError } = await supabaseServer
      .from("claims")
      .update({
        draft_pdf_url: filePath,
      })
      .eq("id", claimId);

    if (updateError) {
      console.error("Error saving draft PDF path:", updateError);
      res
        .status(500)
        .json({
          ok: false,
          error: (updateError as any)?.message
            ? `claims update: ${(updateError as any).message}`
            : "Failed to save draft PDF path",
        });
      return;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseServer
      .storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 10);

    if (signedUrlError) {
      console.error(
        "Error creating signed URL for draft PDF:",
        signedUrlError
      );
    }

    const generatedAt = new Date().toISOString();
    const pageCount = pdfDoc.getPageCount();

    const isInternalStaff =
      profile &&
      typeof profile.internal_role === "string" &&
      profile.internal_role !== "";

    if (isInternalStaff && userId) {
      const { error: auditError } = await supabaseServer
        .from("rd_audit_log")
        .insert({
          claim_id: claim.id,
          project_id: null,
          action: "pdf_draft",
          actor_user_id: userId,
          details_json: {
            pdf_path: filePath,
            page_count: pageCount,
          },
        });

      if (auditError) {
        console.error(
          "Failed to write rd_audit_log for pdf_draft:",
          auditError
        );
        // Do not fail the whole request on audit error, but log context.
      }
    } else {
      console.warn(
        "Skipping rd_audit_log insert for pdf_draft because user is not internal staff or missing profile",
        { userId, profile }
      );
    }

    const responseBody: DraftPdfSuccessResponse = {
      ok: true,
      pdf_url: filePath,
      generated_at: generatedAt,
      page_count: pageCount,
      signed_url: signedUrlData?.signedUrl,
    };

    res.status(200).json(responseBody);
  } catch (error: any) {
    console.error("Unexpected error generating draft PDF:", error);
    res.status(500).json({
      ok: false,
      error: error?.message
        ? `unexpected: ${error.message}`
        : "Failed to generate draft R&D claim PDF pack",
    });
  }
}