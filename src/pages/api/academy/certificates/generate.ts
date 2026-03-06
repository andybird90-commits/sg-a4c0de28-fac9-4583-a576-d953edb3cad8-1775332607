import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import { getCertificationEligibility, createCertificateRecord } from "@/services/academyCertificationService";
import { buildAcademyCertificatePdf } from "@/lib/pdf/academyCertificate";
import QRCode from "qrcode";

function generateCertificateId(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `RD-${timestamp}-${random}`;
}

function toBaseUrl(req: NextApiRequest): string {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser();

  if (userError || !user) {
    res.status(401).json({ error: "Unauthenticated." });
    return;
  }

  const userId = user.id;
  const recipientName =
    (user.user_metadata && (user.user_metadata.full_name as string | undefined)) ||
    (user.email as string | undefined) ||
    "Certified Agent";

  const eligibility = await getCertificationEligibility(userId);

  if (!eligibility.eligible) {
    res.status(400).json({
      error: "Not eligible for certification.",
      reason: eligibility.reason ?? "All modules must be completed and quizzes passed.",
    });
    return;
  }

  const certificateId = generateCertificateId();
  const completedAt = new Date().toISOString();

  const baseUrl = toBaseUrl(req);
  const verificationUrl = `${baseUrl}/api/academy/certificates/${encodeURIComponent(certificateId)}`;

  let qrPngData: Uint8Array | undefined;
  try {
    const dataUrl = await QRCode.toDataURL(verificationUrl);
    const base64 = dataUrl.split(",")[1] || "";
    const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
    qrPngData = bytes;
  } catch (e) {
    qrPngData = undefined;
  }

  const pdfBytes = await buildAcademyCertificatePdf({
    recipientName,
    completionDate: new Date(completedAt).toLocaleDateString("en-GB"),
    certificateId,
    verificationUrl,
    qrPngData,
  });

  const { error: recordError } = await createCertificateRecord({
    userId,
    recipientName,
    certificateId,
    verificationCode: certificateId,
    completedAt,
  });

  if (recordError) {
    res.status(500).json({ error: recordError });
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="rd-agent-certificate-${certificateId}.pdf"`);
  res.status(200).send(Buffer.from(pdfBytes));
}