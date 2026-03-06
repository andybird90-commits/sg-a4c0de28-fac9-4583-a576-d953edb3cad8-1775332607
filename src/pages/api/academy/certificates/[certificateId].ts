import type { NextApiRequest, NextApiResponse } from "next";
import { getCertificateByPublicId } from "@/services/academyCertificationService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { certificateId } = req.query;

  if (typeof certificateId !== "string") {
    res.status(400).json({ error: "Invalid certificate ID." });
    return;
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const { data, error } = await getCertificateByPublicId(certificateId);

  if (error) {
    res.status(500).json({ error: "Error fetching certificate." });
    return;
  }

  if (!data) {
    res.status(404).json({ valid: false, message: "Certificate not found." });
    return;
  }

  res.status(200).json({
    valid: true,
    recipientName: data.recipient_name,
    certificateId: data.certificate_id,
    completedAt: data.completed_at,
  });
}