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
    .select("id, hmrc_responses, hmrc_response_pdf_paths")
    .eq("id", claimId)
    .maybeSingle();

  if (claimError) {
    console.error("Error loading claim for response export:", claimError);
    res
      .status(500)
      .json({ ok: false, error: "Failed to load claim for response export" });
    return;
  }

  if (!claim) {
    res.status(404).json({ ok: false, error: "Claim not found" });
    return;
  }

  const responses = ((claim as any).hmrc_responses ?? []) as {
    question?: string;
    teamResponse?: string;
    counterPoint?: string;
  }[];

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();
    const fontSize = 11;

    const lines: string[] = [];

    lines.push("HMRC Response Pack");
    lines.push("");
    lines.push(`Claim ID: ${claim.id}`);
    lines.push("");

    if (responses.length === 0) {
      lines.push("No responses have been recorded for this claim yet.");
    } else {
      responses.forEach((r, index) => {
        lines.push(`Response ${index + 1}`);
        if (r.question) {
          lines.push(`HMRC Question: ${r.question}`);
        }
        if (r.teamResponse) {
          lines.push(`Team Response: ${r.teamResponse}`);
        }
        if (r.counterPoint) {
          lines.push(`Counter Point: ${r.counterPoint}`);
        }
        lines.push("");
      });
    }

    lines.push(
      `Exported at: ${new Date().toISOString().replace("T", " ").slice(0, 19)}`
    );

    let y = height - 50;
    for (const line of lines) {
      if (y < 50) {
        // start a new page if we run out of space
        const newPage = pdfDoc.addPage();
        y = newPage.getSize().height - 50;
        (page as any) = newPage;
      }
      page.drawText(line, {
        x: 50,
        y,
        size: fontSize,
        font,
      });
      y -= fontSize + 4;
    }

    const pdfBytes = await pdfDoc.save();

    const existingPaths =
      ((claim as any).hmrc_response_pdf_paths as string[] | null) ?? [];
    const responseIndex = existingPaths.length + 1;
    const filePath = `claims/${claimId}/response-${responseIndex}-claim-${claimId}.pdf`;

    const { error: uploadError } = await supabaseServer.storage
      .from("submitted-claims")
      .upload(filePath, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading response PDF:", uploadError);
      res
        .status(500)
        .json({ ok: false, error: "Failed to upload response PDF" });
      return;
    }

    const { error: updateError } = await supabaseServer
      .from("claims")
      .update({
        hmrc_response_pdf_paths: [...existingPaths, filePath],
      })
      .eq("id", claimId);

    if (updateError) {
      console.error("Error saving response PDF path:", updateError);
      res
        .status(500)
        .json({ ok: false, error: "Failed to save response PDF path" });
      return;
    }

    res.status(200).json({ ok: true, path: filePath });
  } catch (error) {
    console.error("Unexpected error exporting response PDF:", error);
    res
      .status(500)
      .json({ ok: false, error: "Failed to generate response PDF" });
  }
}