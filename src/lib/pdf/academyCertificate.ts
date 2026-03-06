import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH = 297 * MM_TO_PT;
const A4_HEIGHT = 210 * MM_TO_PT;
const MARGIN = 30 * MM_TO_PT;

export interface AcademyCertificatePayload {
  recipientName: string;
  completionDate: string;
  certificateId: string;
  verificationUrl: string;
  qrPngData?: Uint8Array;
}

export async function buildAcademyCertificatePdf(payload: AcademyCertificatePayload): Promise<Uint8Array> {
  const { recipientName, completionDate, certificateId, verificationUrl, qrPngData } = payload;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const borderColor = rgb(0.15, 0.25, 0.4);
  const accentColor = rgb(0.25, 0.45, 0.8);
  const textColor = rgb(0.1, 0.1, 0.1);

  page.drawRectangle({
    x: MARGIN / 2,
    y: MARGIN / 2,
    width: width - MARGIN,
    height: height - MARGIN,
    borderColor,
    borderWidth: 2,
    color: rgb(1, 1, 1),
  });

  const title = "Certified R&D Tax Agent";
  const titleSize = 28;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);

  page.drawText(title, {
    x: width / 2 - titleWidth / 2,
    y: height - MARGIN - 20,
    size: titleSize,
    font: fontBold,
    color: accentColor,
  });

  const subtitle = "RD Agent Academy";
  const subtitleSize = 14;
  const subtitleWidth = font.widthOfTextAtSize(subtitle, subtitleSize);

  page.drawText(subtitle, {
    x: width / 2 - subtitleWidth / 2,
    y: height - MARGIN - 50,
    size: subtitleSize,
    font,
    color: textColor,
  });

  const bodyYStart = height - MARGIN - 100;
  let y = bodyYStart;

  const intro = "This certifies that";
  page.drawText(intro, {
    x: MARGIN,
    y,
    size: 12,
    font,
    color: textColor,
  });

  y -= 24;

  const nameSize = 20;
  page.drawText(recipientName || "Recipient Name", {
    x: MARGIN,
    y,
    size: nameSize,
    font: fontBold,
    color: textColor,
  });

  y -= 30;

  const paragraph =
    "has successfully completed the RD Agent Academy programme covering R&D tax legislation, claim preparation, evidence assessment, and HMRC enquiry defence.";

  const maxWidth = width - MARGIN * 2 - 160;
  const lineHeight = 16;
  const words = paragraph.split(/\s+/);
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const lineWidth = font.widthOfTextAtSize(testLine, 12);
    if (lineWidth > maxWidth && line) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 12,
        font,
        color: textColor,
      });
      y -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 12,
      font,
      color: textColor,
    });
    y -= lineHeight;
  }

  y -= 20;

  const dateLabel = "Completion Date:";
  const dateValue = completionDate || "DD/MM/YYYY";
  page.drawText(dateLabel, {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
  });
  page.drawText(` ${dateValue}`, {
    x: MARGIN + fontBold.widthOfTextAtSize(dateLabel, 11),
    y,
    size: 11,
    font,
    color: textColor,
  });

  y -= 18;

  const idLabel = "Certificate ID:";
  const idValue = certificateId;
  page.drawText(idLabel, {
    x: MARGIN,
    y,
    size: 11,
    font: fontBold,
    color: textColor,
  });
  page.drawText(` ${idValue}`, {
    x: MARGIN + fontBold.widthOfTextAtSize(idLabel, 11),
    y,
    size: 11,
    font,
    color: textColor,
  });

  if (qrPngData) {
    const qrImage = await pdfDoc.embedPng(qrPngData);
    const qrSize = 120;
    const qrX = width - MARGIN - qrSize;
    const qrY = height / 2 - qrSize / 2;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    const verifyLabel = "Scan to verify certificate";
    const verifyWidth = font.widthOfTextAtSize(verifyLabel, 10);
    page.drawText(verifyLabel, {
      x: qrX + qrSize / 2 - verifyWidth / 2,
      y: qrY - 14,
      size: 10,
      font,
      color: textColor,
    });

    const verifyUrlDisplay = verificationUrl || "";
    if (verifyUrlDisplay) {
      const urlSize = 8;
      const maxUrlWidth = qrSize + 40;
      const urlWords = verifyUrlDisplay.split(/\s+/);
      let urlLine = "";
      let urlY = qrY - 28;

      for (const word of urlWords) {
        const testLine = urlLine ? `${urlLine} ${word}` : word;
        const lineWidth = font.widthOfTextAtSize(testLine, urlSize);
        if (lineWidth > maxUrlWidth && urlLine) {
          page.drawText(urlLine, {
            x: qrX + qrSize / 2 - maxUrlWidth / 2,
            y: urlY,
            size: urlSize,
            font,
            color: textColor,
          });
          urlY -= 10;
          urlLine = word;
        } else {
          urlLine = testLine;
        }
      }
      if (urlLine) {
        page.drawText(urlLine, {
          x: qrX + qrSize / 2 - maxUrlWidth / 2,
          y: urlY,
          size: urlSize,
          font,
          color: textColor,
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}