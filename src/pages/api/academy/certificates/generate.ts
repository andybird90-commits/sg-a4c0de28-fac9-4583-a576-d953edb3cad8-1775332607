import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { supabaseServer } from "@/integrations/supabase/serverClient";
import { getCertificationEligibility, createCertificateRecord } from "@/services/academyCertificationService";
import { buildAcademyCertificatePdf } from "@/lib/pdf/academyCertificate";

function deriveNameFromEmail(email: string | null): string | undefined {
  if (!email) {
    return undefined;
  }
  const [localPart] = email.split("@");
  if (!localPart) {
    return undefined;
  }
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }
  const capitalised = segments.map((segment) => {
    const lower = segment.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return capitalised.join(" ");
}

function derivePersonName(
  rawFullName: string | undefined | null,
  email: string | null,
): string {
  const full = rawFullName?.trim();
  if (full) {
    const looksLikeEmail = full.includes("@");
    const looksLikeHandle = !full.includes(" ") && /[._-]/.test(full);

    if (!looksLikeEmail && !looksLikeHandle) {
      return full;
    }

    const fromFull = deriveNameFromEmail(
      looksLikeEmail ? full : `${full}@placeholder.local`,
    );
    if (fromFull) {
      return fromFull;
    }
  }

  const fromEmail = deriveNameFromEmail(email);
  if (fromEmail) {
    return fromEmail;
  }

  return "Certified Agent";
}

function generateCertificateId(): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `RD-${timestamp}-${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const authHeader = req.headers.authorization;
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

  if (!token) {
    res.status(401).json({ error: "Unauthenticated." });
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser(token);

  if (userError || !user) {
    res.status(401).json({ error: "Unauthenticated." });
    return;
  }

  const userId = user.id;
  const metadataFullName =
    (user.user_metadata && (user.user_metadata.full_name as string | undefined)) || undefined;
  const recipientName = derivePersonName(metadataFullName, user.email ?? null);

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

  let logoPngData: Uint8Array | undefined;
  let crestPngData: Uint8Array | undefined;

  try {
    const logoPath = path.join(process.cwd(), "public", "RDTAXHEADER_1_.png");
    const buffer = fs.readFileSync(logoPath);
    logoPngData = new Uint8Array(buffer);
  } catch {
    logoPngData = undefined;
  }

  try {
    const crestPath = path.join(process.cwd(), "public", "rd_crest.png");
    const crestBuffer = fs.readFileSync(crestPath);
    crestPngData = new Uint8Array(crestBuffer);
  } catch {
    crestPngData = undefined;
  }

  const pdfBytes = await buildAcademyCertificatePdf({
    recipientName,
    completionDate: new Date(completedAt).toLocaleDateString("en-GB"),
    certificateId,
    logoPngData,
    crestPngData,
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