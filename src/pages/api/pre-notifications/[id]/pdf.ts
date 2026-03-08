import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import PDFDocument from "pdfkit";

type OrganisationNotificationStatus =
  Database["public"]["Tables"]["organisation_notification_status"]["Row"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const { data, error } = await supabase
    .from("organisation_notification_status")
    .select(
      `
      *,
      organisation:organisations(id, name, organisation_code, incorporation_date)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching pre-notification record", error);
    res.status(500).json({ error: "Failed to load pre-notification record" });
    return;
  }

  if (!data) {
    res.status(404).json({ error: "Pre-notification not found" });
    return;
  }

  const row = data as OrganisationNotificationStatus & {
    organisation?: {
      id: string;
      name: string | null;
      organisation_code: string | null;
      incorporation_date: string | null;
    } | null;
  };

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="pre-notification-${row.organisation_id || "organisation"}.pdf"`
  );

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  const orgName = row.organisation?.name || "Unknown organisation";
  const accountingPeriod =
    row.accounting_period_start && row.accounting_period_end
      ? `${new Date(row.accounting_period_start).toLocaleDateString("en-GB")} – ${new Date(
          row.accounting_period_end
        ).toLocaleDateString("en-GB")}`
      : "Not specified";

  doc.fontSize(18).text("R&D HMRC Pre-notification", { align: "left" });
  doc.moveDown();

  doc.fontSize(12).text(`Company: ${orgName}`);
  doc.moveDown(0.5);

  doc.text(`Accounting Period: ${accountingPeriod}`);
  doc.moveDown();

  if (row.internal_rd_contact_name || row.internal_rd_contact_email) {
    doc.text("Contact:");
    if (row.internal_rd_contact_name) {
      doc.text(row.internal_rd_contact_name);
    }
    if (row.internal_rd_contact_email) {
      doc.text(row.internal_rd_contact_email);
    }
    doc.moveDown();
  }

  doc.text("Agent:");
  doc.text("RD Companion");
  doc.moveDown();

  doc.text("Summary of R&D Activities:");
  doc.moveDown(0.5);
  doc.text(
    row.organisation_rd_summary ||
      "During the accounting period the company undertook research and development activities relating to...",
    {
      align: "left"
    }
  );

  if (row.notes) {
    doc.moveDown();
    doc.text("Internal Notes:");
    doc.moveDown(0.5);
    doc.text(row.notes, { align: "left" });
  }

  doc.end();
}