import type { NextApiRequest, NextApiResponse } from "next";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { supabaseServer } from "@/integrations/supabase/serverClient";

type Data =
  | { ok: true; path: string }
  | { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
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

  const {
    data: claim,
    error: claimError,
  } = await supabaseServer
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) {
    console.error("Error loading claim for submission export:", claimError);
    res
      .status(500)
      .json({ ok: false, error: "Failed to load claim for export" });
    return;
  }

  if (!claim) {
    res.status(404).json({ ok: false, error: "Claim not found" });
    return;
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();
    const fontSize = 12;

    const lines: string[] = [];

    lines.push("R&D Claim Submission");
    lines.push("");
    lines.push(`Claim ID: ${claim.id}`);
    if ((claim as any).claim_year) {
      lines.push(`Claim year: ${(claim as any).claim_year}`);
    }
    if ((claim as any).status) {
      lines.push(`Status: ${(claim as any).status}`);
    }
    if ((claim as any).submitted_claim_value != null) {
      lines.push(
        `Submitted value: £${(claim as any).submitted_claim_value.toLocaleString()}`
      );
    }
    if ((claim as any).received_claim_value != null) {
      lines.push(
        `Received value: £${(claim as any).received_claim_value.toLocaleString()}`
      );
    }
    lines.push("");
    lines.push(
      `Exported at: ${new Date().toISOString().replace("T", " ").slice(0, 19)}`
    );

    let y = height - 50;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font,
      });
      y -= fontSize + 4;
    }

    const pdfBytes = await pdfDoc.save();
    const filePath = `claims/${claimId}/submission.pdf`;

    const bucket = "Submitted-Claims";
    const { error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(filePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading submission PDF:", uploadError);
      res
        .status(500)
        .json({ ok: false, error: "Failed to upload submission PDF" });
      return;
    }

    const { error: updateError } = await supabaseServer
      .from("claims")
      .update({
        hmrc_submission_pdf_path: filePath,
      })
      .eq("id", claimId);

    if (updateError) {
      console.error("Error saving submission PDF path:", updateError);
      res
        .status(500)
        .json({ ok: false, error: "Failed to save submission PDF path" });
      return;
    }

    res.status(200).json({ ok: true, path: filePath });
  } catch (error) {
    console.error("Unexpected error exporting submission PDF:", error);
    res
      .status(500)
      .json({ ok: false, error: "Failed to generate submission PDF" });
  }
}