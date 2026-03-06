import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface ClaimCritiqueInput {
  technicalNarrative: string;
  projectSummary: string;
  costBreakdown: string;
}

export interface ClaimCritiqueSectionAnalysis {
  title: string;
  score: number;
  commentary: string;
  suggestions: string[];
}

export interface ClaimCritiqueResult {
  overallScore: number;
  sections: ClaimCritiqueSectionAnalysis[];
  riskFlags: string[];
}

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH = 210 * MM_TO_PT;
const A4_HEIGHT = 297 * MM_TO_PT;
const MARGIN_TOP = 25 * MM_TO_PT;
const MARGIN_BOTTOM = 25 * MM_TO_PT;
const MARGIN_LEFT = 22 * MM_TO_PT;
const MARGIN_RIGHT = 22 * MM_TO_PT;

const TITLE_SIZE = 20;
const SECTION_TITLE_SIZE = 14;
const BODY_SIZE = 11;
const BODY_LINE_HEIGHT = 14;

function drawWrappedText(params: {
  page: any;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: any;
  size: number;
  lineHeight: number;
  minY: number;
  pdfDoc: PDFDocument;
}): { page: any; y: number } {
  const { maxWidth, font, size, lineHeight, minY, pdfDoc } = params;
  let page = params.page;
  const x = params.x;
  let y = params.y;

  const paragraphs = params.text.split(/\n+/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const lineWidth = font.widthOfTextAtSize(testLine, size);

      if (lineWidth > maxWidth && line) {
        if (y <= minY) {
          page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
          const sizeInfo = page.getSize();
          y = sizeInfo.height - MARGIN_TOP;
        }
        page.drawText(line, { x, y, size, font });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (y <= minY) {
        page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
        const sizeInfo = page.getSize();
        y = sizeInfo.height - MARGIN_TOP;
      }
      page.drawText(line, { x, y, size, font });
      y -= lineHeight;
    }

    y -= lineHeight * 0.5;
  }

  return { page, y };
}

export async function buildClaimCritiqueReport(
  input: ClaimCritiqueInput,
  analysis: ClaimCritiqueResult,
  generatedAt: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  const title = "AI Claim Critique Report";
  const titleWidth = font.widthOfTextAtSize(title, TITLE_SIZE);

  page.drawText(title, {
    x: width / 2 - titleWidth / 2,
    y,
    size: TITLE_SIZE,
    font,
  });

  y -= TITLE_SIZE + 8;

  const metaLine = `Generated: ${generatedAt}`;
  page.drawText(metaLine, {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  y -= BODY_LINE_HEIGHT * 1.5;

  const scoreLabel = "Overall Claim Quality Score";
  page.drawText(scoreLabel, {
    x: MARGIN_LEFT,
    y,
    size: SECTION_TITLE_SIZE,
    font,
  });

  y -= SECTION_TITLE_SIZE + 4;

  const scoreText = `${analysis.overallScore.toFixed(1)} / 10`;
  page.drawText(scoreText, {
    x: MARGIN_LEFT,
    y,
    size: BODY_SIZE + 2,
    font,
  });

  y -= BODY_LINE_HEIGHT * 1.5;

  // Sections
  for (const section of analysis.sections) {
    if (y <= MARGIN_BOTTOM + 80) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const sizeInfo = page.getSize();
      y = sizeInfo.height - MARGIN_TOP;
    }

    const heading = `${section.title} (${section.score.toFixed(1)} / 10)`;
    page.drawText(heading, {
      x: MARGIN_LEFT,
      y,
      size: SECTION_TITLE_SIZE,
      font,
    });

    y -= SECTION_TITLE_SIZE + 4;

    const wrap1 = drawWrappedText({
      page,
      text: section.commentary,
      x: MARGIN_LEFT,
      y,
      maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
      font,
      size: BODY_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      minY: MARGIN_BOTTOM + 60,
      pdfDoc,
    });

    page = wrap1.page;
    y = wrap1.y - BODY_LINE_HEIGHT * 0.5;

    if (section.suggestions.length > 0) {
      const suggestionsLabel = "Suggested improvements:";
      page.drawText(suggestionsLabel, {
        x: MARGIN_LEFT,
        y,
        size: BODY_SIZE,
        font,
      });
      y -= BODY_LINE_HEIGHT;

      for (const suggestion of section.suggestions) {
        const bulletText = `• ${suggestion}`;
        const wrap2 = drawWrappedText({
          page,
          text: bulletText,
          x: MARGIN_LEFT + 10,
          y,
          maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
          font,
          size: BODY_SIZE,
          lineHeight: BODY_LINE_HEIGHT,
          minY: MARGIN_BOTTOM + 60,
          pdfDoc,
        });
        page = wrap2.page;
        y = wrap2.y;
      }
    }

    y -= BODY_LINE_HEIGHT;
  }

  // Risk flags
  if (y <= MARGIN_BOTTOM + 80) {
    page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const sizeInfo = page.getSize();
    y = sizeInfo.height - MARGIN_TOP;
  }

  page.drawText("Risk Flags", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_TITLE_SIZE,
    font,
  });

  y -= SECTION_TITLE_SIZE + 4;

  if (analysis.riskFlags.length === 0) {
    page.drawText("No major risk flags identified by the simple rubric used in this report.", {
      x: MARGIN_LEFT,
      y,
      size: BODY_SIZE,
      font,
    });
    y -= BODY_LINE_HEIGHT;
  } else {
    for (const flag of analysis.riskFlags) {
      const wrap = drawWrappedText({
        page,
        text: `• ${flag}`,
        x: MARGIN_LEFT,
        y,
        maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
        font,
        size: BODY_SIZE,
        lineHeight: BODY_LINE_HEIGHT,
        minY: MARGIN_BOTTOM + 60,
        pdfDoc,
      });
      page = wrap.page;
      y = wrap.y;
    }
  }

  // Original inputs appendix
  if (y <= MARGIN_BOTTOM + 80) {
    page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const sizeInfo = page.getSize();
    y = sizeInfo.height - MARGIN_TOP;
  }

  page.drawText("Appendix: Submitted Text", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_TITLE_SIZE,
    font,
  });

  y -= SECTION_TITLE_SIZE + 8;

  const sectionsForAppendix: { label: string; text: string }[] = [
    { label: "Technical narrative", text: input.technicalNarrative || "(none provided)" },
    { label: "Project summary", text: input.projectSummary || "(none provided)" },
    { label: "Cost breakdown", text: input.costBreakdown || "(none provided)" },
  ];

  for (const block of sectionsForAppendix) {
    if (y <= MARGIN_BOTTOM + 80) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      const sizeInfo = page.getSize();
      y = sizeInfo.height - MARGIN_TOP;
    }

    page.drawText(block.label, {
      x: MARGIN_LEFT,
      y,
      size: BODY_SIZE + 1,
      font,
    });
    y -= BODY_LINE_HEIGHT;

    const wrap = drawWrappedText({
      page,
      text: block.text,
      x: MARGIN_LEFT,
      y,
      maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
      font,
      size: BODY_SIZE,
      lineHeight: BODY_LINE_HEIGHT,
      minY: MARGIN_BOTTOM + 60,
      pdfDoc,
    });

    page = wrap.page;
    y = wrap.y - BODY_LINE_HEIGHT;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}