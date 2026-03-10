import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH = 297 * MM_TO_PT;
const A4_HEIGHT = 210 * MM_TO_PT;
const MARGIN = 30 * MM_TO_PT;

export interface AcademyCertificatePayload {
  recipientName: string;
  completionDate: string;
  certificateId: string;
  logoPngData?: Uint8Array;
  crestPngData?: Uint8Array;
}

interface TextLine {
  text: string;
  font: PDFFont;
  size: number;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const lineWidth = font.widthOfTextAtSize(testLine, size);
    if (lineWidth > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

export async function buildAcademyCertificatePdf(
  payload: AcademyCertificatePayload,
): Promise<Uint8Array> {
  const { recipientName, completionDate, certificateId, logoPngData, crestPngData } = payload;

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

  if (logoPngData) {
    const logoImage = await pdfDoc.embedPng(logoPngData);
    const targetWidth = 160;
    const scale = targetWidth / logoImage.width;
    const targetHeight = logoImage.height * scale;

    const logoX = width - MARGIN - targetWidth;
    const logoY = height - MARGIN - targetHeight;

    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: targetWidth,
      height: targetHeight,
    });
  }

  if (crestPngData) {
    const crestImage = await pdfDoc.embedPng(crestPngData);
    const targetWidth = 130;
    const scale = targetWidth / crestImage.width;
    const targetHeight = crestImage.height * scale;

    const crestX = width - MARGIN - targetWidth;
    const crestY = MARGIN;

    page.drawImage(crestImage, {
      x: crestX,
      y: crestY,
      width: targetWidth,
      height: targetHeight,
    });
  }

  const title = "Certified R&D Tax Agent";
  const titleSize = 28;
  const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);

  page.drawText(title, {
    x: MARGIN,
    y: height - MARGIN - 30,
    size: titleSize,
    font: fontBold,
    color: accentColor,
  });

  const subtitle = "RD Agent Academy – Foundation Certificate";
  const subtitleSize = 14;
  const subtitleWidth = font.widthOfTextAtSize(subtitle, subtitleSize);

  page.drawText(subtitle, {
    x: MARGIN,
    y: height - MARGIN - 60,
    size: subtitleSize,
    font,
    color: textColor,
  });

  const contentMaxWidth = width - MARGIN * 2;
  const baseLineHeight = 18;

  const intro = "This certifies that";
  const paragraph =
    "has successfully completed the RD Agent Academy Foundation programme covering R&D tax legislation, claim preparation, evidence assessment, and HMRC enquiry defence.";

  const paragraphLines = wrapText(paragraph, font, 12, contentMaxWidth);

  const dateLabel = `Completion Date: ${completionDate || "DD/MM/YYYY"}`;
  const idLabel = `Certificate ID: ${certificateId}`;

  const contentLines: TextLine[] = [
    { text: intro, font, size: 12 },
    { text: recipientName || "Recipient Name", font: fontBold, size: 20 },
    ...paragraphLines.map((line) => ({
      text: line,
      font,
      size: 12,
    })),
    { text: "", font, size: 12 },
    { text: dateLabel, font, size: 11 },
    { text: idLabel, font, size: 11 },
  ];

  const contentHeight = contentLines.length * baseLineHeight;
  const centerY = height / 2;
  let y = centerY + contentHeight / 2;

  for (const line of contentLines) {
    if (line.text) {
      page.drawText(line.text, {
        x: MARGIN,
        y,
        size: line.size,
        font: line.font,
        color: textColor,
      });
    }
    y -= baseLineHeight;
  }

  const footerText = "RD TAX – Raising Funds for Businesses";
  const footerSize = 10;
  const footerWidth = font.widthOfTextAtSize(footerText, footerSize);

  page.drawText(footerText, {
    x: width / 2 - footerWidth / 2,
    y: MARGIN + 14,
    size: footerSize,
    font,
    color: textColor,
  });

  const disclaimerText =
    "This certificate is an internal document of RDTax Ltd and is intended for business training only.";
  const disclaimerSize = 8;
  const disclaimerWidth = font.widthOfTextAtSize(disclaimerText, disclaimerSize);

  page.drawText(disclaimerText, {
    x: width / 2 - disclaimerWidth / 2,
    y: MARGIN,
    size: disclaimerSize,
    font,
    color: textColor,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}