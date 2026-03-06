import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface DossierClaimInfo {
  id: string;
  claimYear: number | null;
  periodStart: string | null;
  periodEnd: string | null;
}

interface DossierOrganisationInfo {
  name: string;
  companyNumber: string | null;
}

export interface DossierProjectEvidenceItem {
  code: string;
  title: string;
  caption: string;
  isImage: boolean;
}

export interface DossierProject {
  id: string;
  name: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  leadEngineer: string | null;
  narrative?: {
    advance_sought: string;
    baseline_knowledge: string;
    technological_uncertainty: string;
    work_undertaken: string;
    outcome: string;
  };
  evidence: DossierProjectEvidenceItem[];
}

export interface DossierCostSummary {
  staff: number;
  externallyProvidedWorkers: number;
  subcontractor: number;
  consumables: number;
  software: number;
  totalQualifying: number;
}

export interface BuildDossierOptions {
  mode: "draft" | "final";
  claim: DossierClaimInfo;
  organisation: DossierOrganisationInfo;
  projects: DossierProject[];
  costs: DossierCostSummary;
  keyTechnologyFields: string[];
  generatedAt: string;
}

const MM_TO_PT = 72 / 25.4;
const A4_WIDTH = 210 * MM_TO_PT;
const A4_HEIGHT = 297 * MM_TO_PT;

const MARGIN_TOP = 25 * MM_TO_PT;
const MARGIN_BOTTOM = 25 * MM_TO_PT;
const MARGIN_LEFT = 22 * MM_TO_PT;
const MARGIN_RIGHT = 22 * MM_TO_PT;

const REPORT_TITLE_SIZE = 32;
const SECTION_HEADER_SIZE = 18;
const SUBHEADER_SIZE = 14;
const BODY_SIZE = 11;
const CAPTION_SIZE = 9;

const BODY_LINE_HEIGHT = 14;
const SECTION_SPACING = 12 * MM_TO_PT;

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Not specified";
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – (ongoing)`;
  return `Until ${end}`;
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "£0.00";
  }
  const rounded = Math.round(amount * 100) / 100;
  return `£${rounded.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normaliseFigureReferences(text: string): string {
  if (!text) return "";
  return text.replace(/\[E(\d+)\]/g, "Figure E$1");
}

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
  mode: "draft" | "final";
}): { page: any; y: number } {
  const { page: initialPage, text, x, maxWidth, font, size, lineHeight, minY, pdfDoc, mode } = params;
  let page = initialPage;
  let y = params.y;
  const paragraphs = normaliseFigureReferences(text).split(/\n+/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const lineWidth = font.widthOfTextAtSize(testLine, size);

      if (lineWidth > maxWidth && line) {
        if (y <= minY) {
          const pageInfo = ensureSpaceOrAddPage({
            pdfDoc,
            page,
            y,
            minY,
            font,
            mode,
          });
          page = pageInfo.page;
          y = pageInfo.y;
        }
        page.drawText(line, {
          x,
          y,
          size,
          font,
        });
        y -= lineHeight;
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) {
      if (y <= minY) {
        const pageInfo = ensureSpaceOrAddPage({
          pdfDoc,
          page,
          y,
          minY,
          font,
          mode,
        });
        page = pageInfo.page;
        y = pageInfo.y;
      }
      page.drawText(line, {
        x,
        y,
        size,
        font,
      });
      y -= lineHeight;
    }

    y -= lineHeight * 0.5;
  }

  return { page, y };
}

function createA4Page(pdfDoc: PDFDocument): any {
  return pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
}

function ensureSpaceOrAddPage(args: {
  pdfDoc: PDFDocument;
  page: any;
  y: number;
  minY: number;
  font: any;
  mode: "draft" | "final";
}): { page: any; y: number } {
  const { pdfDoc, mode } = args;
  let page = args.page;
  let y = args.y;
  const minY = args.minY;

  if (y <= minY) {
    page = createA4Page(pdfDoc);
    const { height } = page.getSize();
    y = height - MARGIN_TOP;
    if (mode === "draft") {
      drawDraftWatermarkOnPage(page, args.font);
    }
  }

  return { page, y };
}

function drawDraftWatermarkOnPage(page: any, font: any): void {
  const { width, height } = page.getSize();
  const watermarkText = "DRAFT – NOT FOR SUBMISSION";
  const watermarkSize = 40;
  const textWidth = font.widthOfTextAtSize(watermarkText, watermarkSize);

  page.drawText(watermarkText, {
    x: (width - textWidth) / 2,
    y: height / 2,
    size: watermarkSize,
    font,
    color: rgb(0.8, 0.8, 0.8),
    rotate: { type: "degrees", angle: 30 },
    opacity: 0.2,
  });
}

function addCoverPage(params: {
  pdfDoc: PDFDocument;
  font: any;
  organisation: DossierOrganisationInfo;
  claim: DossierClaimInfo;
  generatedAt: string;
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, organisation, claim, generatedAt, mode } = params;
  const page = createA4Page(pdfDoc);
  const { width, height } = page.getSize();

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  const centerX = width / 2;
  let y = height - MARGIN_TOP - 40;

  const titleLine1 = "R&D Tax Relief";
  const titleLine2 = "Technical Project Report";

  const titleWidth1 = font.widthOfTextAtSize(titleLine1, REPORT_TITLE_SIZE);
  const titleWidth2 = font.widthOfTextAtSize(titleLine2, REPORT_TITLE_SIZE);

  page.drawText(titleLine1, {
    x: centerX - titleWidth1 / 2,
    y,
    size: REPORT_TITLE_SIZE,
    font,
  });

  y -= REPORT_TITLE_SIZE + 10;

  page.drawText(titleLine2, {
    x: centerX - titleWidth2 / 2,
    y,
    size: REPORT_TITLE_SIZE,
    font,
  });

  y -= 16;

  const ruleWidth = Math.max(titleWidth1, titleWidth2) + 40;
  const ruleX = centerX - ruleWidth / 2;
  page.drawLine({
    start: { x: ruleX, y },
    end: { x: ruleX + ruleWidth, y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  y -= 40;

  const companyName = organisation.name || "Company";
  const companyNumber =
    organisation.companyNumber && organisation.companyNumber.trim().length > 0
      ? `Company Number: ${organisation.companyNumber}`
      : "";
  const periodLabel = formatDateRange(claim.periodStart, claim.periodEnd);
  const periodText = `Accounting Period: ${periodLabel}`;

  const lines = [companyName, companyNumber, periodText].filter(
    (line) => line.length > 0
  );

  for (const line of lines) {
    const textWidth = font.widthOfTextAtSize(line, SUBHEADER_SIZE);
    page.drawText(line, {
      x: centerX - textWidth / 2,
      y,
      size: SUBHEADER_SIZE,
      font,
    });
    y -= SUBHEADER_SIZE + 8;
  }

  const bottomY = MARGIN_BOTTOM + 30;
  const generatedBy = "Generated by RD Tax";
  const generatedByWidth = font.widthOfTextAtSize(generatedBy, BODY_SIZE);

  page.drawText(generatedBy, {
    x: centerX - generatedByWidth / 2,
    y: bottomY + BODY_LINE_HEIGHT,
    size: BODY_SIZE,
    font,
  });

  const generatedText = `Generated: ${generatedAt}`;
  const generatedTextWidth = font.widthOfTextAtSize(
    generatedText,
    BODY_SIZE
  );

  page.drawText(generatedText, {
    x: centerX - generatedTextWidth / 2,
    y: bottomY,
    size: BODY_SIZE,
    font,
  });
}

function addExecutiveSummary(params: {
  pdfDoc: PDFDocument;
  font: any;
  projects: DossierProject[];
  costs: DossierCostSummary;
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, projects, costs, mode } = params;
  const page = createA4Page(pdfDoc);
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  page.drawText("Executive Summary", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_HEADER_SIZE,
    font,
  });

  y -= SECTION_HEADER_SIZE + 12;

  const summaryText =
    "This report summarises the research and development activities undertaken during the accounting period and describes the technological advances sought, uncertainties encountered, and systematic work performed.";

  const bodyResult = drawWrappedText({
    page,
    text: summaryText,
    x: MARGIN_LEFT,
    y,
    maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
    font,
    size: BODY_SIZE,
    lineHeight: BODY_LINE_HEIGHT,
    minY: MARGIN_BOTTOM + 80,
    pdfDoc,
    mode,
  });

  y = bodyResult.y - 10;

  const colProject = MARGIN_LEFT;
  const colField = MARGIN_LEFT + 170;
  const colDuration = MARGIN_LEFT + 320;
  const colLead = MARGIN_LEFT + 420;

  const headerY = y;
  page.drawText("Project", {
    x: colProject,
    y: headerY,
    size: SUBHEADER_SIZE,
    font,
  });
  page.drawText("Technological Field", {
    x: colField,
    y: headerY,
    size: SUBHEADER_SIZE,
    font,
  });
  page.drawText("Duration", {
    x: colDuration,
    y: headerY,
    size: SUBHEADER_SIZE,
    font,
  });
  page.drawText("Lead", {
    x: colLead,
    y: headerY,
    size: SUBHEADER_SIZE,
    font,
  });

  y = headerY - BODY_LINE_HEIGHT;

  for (const project of projects) {
    const minY = MARGIN_BOTTOM + 60;
    if (y <= minY) {
      const pageInfo = ensureSpaceOrAddPage({
        pdfDoc,
        page,
        y,
        minY,
        font,
        mode,
      });
      y = pageInfo.y;
      const newPage = pageInfo.page;
      page.drawText = newPage.drawText.bind(newPage);
      const headerLineY = y;
      newPage.drawText("Project", {
        x: colProject,
        y: headerLineY,
        size: SUBHEADER_SIZE,
        font,
      });
      newPage.drawText("Technological Field", {
        x: colField,
        y: headerLineY,
        size: SUBHEADER_SIZE,
        font,
      });
      newPage.drawText("Duration", {
        x: colDuration,
        y: headerLineY,
        size: SUBHEADER_SIZE,
        font,
      });
      newPage.drawText("Lead", {
        x: colLead,
        y: headerLineY,
        size: SUBHEADER_SIZE,
        font,
      });
      y = headerLineY - BODY_LINE_HEIGHT;
    }

    const duration = formatDateRange(project.startDate, project.endDate);

    page.drawText(project.name || "Untitled project", {
      x: colProject,
      y,
      size: BODY_SIZE,
      font,
    });
    page.drawText(project.field || "Not specified", {
      x: colField,
      y,
      size: BODY_SIZE,
      font,
    });
    page.drawText(duration, {
      x: colDuration,
      y,
      size: BODY_SIZE,
      font,
    });
    page.drawText(project.leadEngineer || "Not specified", {
      x: colLead,
      y,
      size: BODY_SIZE,
      font,
    });

    y -= BODY_LINE_HEIGHT;
  }

  const totalProjects = projects.length;
  const totalQualifying = costs.totalQualifying;

  y -= BODY_LINE_HEIGHT * 1.5;

  const summaryBullets = [
    `Total projects in claim: ${totalProjects}`,
    `Total qualifying expenditure: ${formatCurrency(totalQualifying)}`,
  ];

  for (const bullet of summaryBullets) {
    if (y <= MARGIN_BOTTOM + 40) {
      const pageInfo = ensureSpaceOrAddPage({
        pdfDoc,
        page,
        y,
        minY: MARGIN_BOTTOM + 80,
        font,
        mode,
      });
      y = pageInfo.y;
      page.drawText = pageInfo.page.drawText.bind(pageInfo.page);
    }
    page.drawText(`• ${bullet}`, {
      x: MARGIN_LEFT,
      y,
      size: BODY_SIZE,
      font,
    });
    y -= BODY_LINE_HEIGHT;
  }
}

function addProjectPages(params: {
  pdfDoc: PDFDocument;
  font: any;
  projects: DossierProject[];
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, projects, mode } = params;

  for (const project of projects) {
    let page = createA4Page(pdfDoc);
    const { width, height } = page.getSize();
    let y = height - MARGIN_TOP;

    if (mode === "draft") {
      drawDraftWatermarkOnPage(page, font);
    }

    const cardX = MARGIN_LEFT;
    const cardWidth = width - MARGIN_LEFT - MARGIN_RIGHT;
    const cardHeight = 80;
    const cardYTop = y;

    page.drawRectangle({
      x: cardX,
      y: cardYTop - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });

    let innerY = cardYTop - 18;

    const projectTitle = project.name || "Untitled project";
    page.drawText(projectTitle, {
      x: cardX + 12,
      y: innerY,
      size: SUBHEADER_SIZE,
      font,
    });

    innerY -= SUBHEADER_SIZE + 4;

    const fieldText = `Field: ${project.field || "Not specified"}`;
    const durationText = `Duration: ${formatDateRange(
      project.startDate,
      project.endDate
    )}`;
    const leadText = `Lead Engineer: ${
      project.leadEngineer || "Not specified"
    }`;

    page.drawText(fieldText, {
      x: cardX + 12,
      y: innerY,
      size: BODY_SIZE,
      font,
    });
    innerY -= BODY_LINE_HEIGHT;

    page.drawText(durationText, {
      x: cardX + 12,
      y: innerY,
      size: BODY_SIZE,
      font,
    });
    innerY -= BODY_LINE_HEIGHT;

    page.drawText(leadText, {
      x: cardX + 12,
      y: innerY,
      size: BODY_SIZE,
      font,
    });

    y = cardYTop - cardHeight - 24;

    const sections: { title: string; value: string }[] = [
      {
        title: "Technological Advance Sought",
        value: project.narrative?.advance_sought || "(not provided)",
      },
      {
        title: "Baseline Knowledge",
        value: project.narrative?.baseline_knowledge || "(not provided)",
      },
      {
        title: "Scientific or Technological Uncertainty",
        value:
          project.narrative?.technological_uncertainty || "(not provided)",
      },
      {
        title: "Work Undertaken",
        value: project.narrative?.work_undertaken || "(not provided)",
      },
      {
        title: "Outcome",
        value: project.narrative?.outcome || "(not provided)",
      },
    ];

    for (const section of sections) {
      const minYForSection = MARGIN_BOTTOM + SECTION_SPACING + 60;
      if (y <= minYForSection) {
        const pageInfo = ensureSpaceOrAddPage({
          pdfDoc,
          page,
          y,
          minY: minYForSection,
          font,
          mode,
        });
        page = pageInfo.page;
        const sizeInfo = page.getSize();
        y = sizeInfo.height - MARGIN_TOP;
      }

      page.drawText(section.title, {
        x: MARGIN_LEFT,
        y,
        size: SECTION_HEADER_SIZE,
        font,
      });

      y -= SECTION_HEADER_SIZE + 4;

      page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: sizeInfo(page).width - MARGIN_RIGHT, y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      y -= BODY_LINE_HEIGHT;

      const wrapResult = drawWrappedText({
        page,
        text: section.value,
        x: MARGIN_LEFT,
        y,
        maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
        font,
        size: BODY_SIZE,
        lineHeight: BODY_LINE_HEIGHT,
        minY: MARGIN_BOTTOM + 60,
        pdfDoc,
        mode,
      });

      page = wrapResult.page;
      y = wrapResult.y;

      y -= SECTION_SPACING;
    }
  }
}

function addCostSummary(params: {
  pdfDoc: PDFDocument;
  font: any;
  costs: DossierCostSummary;
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, costs, mode } = params;
  let page = createA4Page(pdfDoc);
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  page.drawText("Claim Cost Summary", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_HEADER_SIZE,
    font,
  });

  y -= SECTION_HEADER_SIZE + 12;

  const colCategory = MARGIN_LEFT;
  const colAmount = width - MARGIN_RIGHT - 160;

  page.drawText("Category", {
    x: colCategory,
    y,
    size: SUBHEADER_SIZE,
    font,
  });
  page.drawText("Amount (£)", {
    x: colAmount,
    y,
    size: SUBHEADER_SIZE,
    font,
  });

  y -= BODY_LINE_HEIGHT;

  const rows: { label: string; amount: number }[] = [
    { label: "Staff Costs", amount: costs.staff },
    {
      label: "Externally Provided Workers",
      amount: costs.externallyProvidedWorkers,
    },
    { label: "Subcontractors", amount: costs.subcontractor },
    { label: "Consumables", amount: costs.consumables },
    { label: "Software", amount: costs.software },
  ];

  for (const row of rows) {
    const minY = MARGIN_BOTTOM + 60;
    if (y <= minY) {
      const pageInfo = ensureSpaceOrAddPage({
        pdfDoc,
        page,
        y,
        minY,
        font,
        mode,
      });
      page = pageInfo.page;
      const sizeInfo = page.getSize();
      y = sizeInfo.height - MARGIN_TOP;

      page.drawText("Category", {
        x: colCategory,
        y,
        size: SUBHEADER_SIZE,
        font,
      });
      page.drawText("Amount (£)", {
        x: colAmount,
        y,
        size: SUBHEADER_SIZE,
        font,
      });

      y -= BODY_LINE_HEIGHT;
    }

    page.drawText(row.label, {
      x: colCategory,
      y,
      size: BODY_SIZE,
      font,
    });

    const amountText = formatCurrency(row.amount);
    const amountWidth = font.widthOfTextAtSize(amountText, BODY_SIZE);

    page.drawText(amountText, {
      x: colAmount + 140 - amountWidth,
      y,
      size: BODY_SIZE,
      font,
    });

    y -= BODY_LINE_HEIGHT;
  }

  const minYForTotal = MARGIN_BOTTOM + 60;
  if (y <= minYForTotal) {
    const pageInfo = ensureSpaceOrAddPage({
      pdfDoc,
      page,
      y,
      minY: minYForTotal,
      font,
      mode,
    });
    page = pageInfo.page;
    const sizeInfo = page.getSize();
    y = sizeInfo.height - MARGIN_TOP;
  }

  page.drawLine({
    start: { x: colCategory, y },
    end: { x: width - MARGIN_RIGHT, y },
    thickness: 0.7,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= BODY_LINE_HEIGHT;

  const totalLabel = "TOTAL QUALIFYING EXPENDITURE";
  const totalAmountText = formatCurrency(costs.totalQualifying);
  const totalAmountWidth = font.widthOfTextAtSize(totalAmountText, BODY_SIZE);

  page.drawText(totalLabel, {
    x: colCategory,
    y,
    size: BODY_SIZE,
    font,
  });

  page.drawText(totalAmountText, {
    x: colAmount + 140 - totalAmountWidth,
    y,
    size: BODY_SIZE,
    font,
  });
}

function addEvidenceAppendix(params: {
  pdfDoc: PDFDocument;
  font: any;
  projects: DossierProject[];
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, projects, mode } = params;

  let page = createA4Page(pdfDoc);
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  page.drawText("Supporting Evidence", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_HEADER_SIZE,
    font,
  });

  y -= SECTION_HEADER_SIZE + 16;

  for (const project of projects) {
    const minYForProject = MARGIN_BOTTOM + 80;
    if (y <= minYForProject) {
      const pageInfo = ensureSpaceOrAddPage({
        pdfDoc,
        page,
        y,
        minY: minYForProject,
        font,
        mode,
      });
      page = pageInfo.page;
      const sizeInfo = page.getSize();
      y = sizeInfo.height - MARGIN_TOP;
    }

    page.drawText(project.name || "Untitled project", {
      x: MARGIN_LEFT,
      y,
      size: SUBHEADER_SIZE,
      font,
    });

    y -= SUBHEADER_SIZE + 8;

    if (!project.evidence || project.evidence.length === 0) {
      page.drawText(
        "No specific evidence items have been linked to this project.",
        {
          x: MARGIN_LEFT,
          y,
          size: BODY_SIZE,
          font,
        }
      );
      y -= BODY_LINE_HEIGHT * 2;
      continue;
    }

    for (const item of project.evidence) {
      const minYForItem = MARGIN_BOTTOM + 80;
      if (y <= minYForItem) {
        const pageInfo = ensureSpaceOrAddPage({
          pdfDoc,
          page,
          y,
          minY: minYForItem,
          font,
          mode,
        });
        page = pageInfo.page;
        const sizeInfo = page.getSize();
        y = sizeInfo.height - MARGIN_TOP;
      }

      const heading = `Figure ${item.code} – ${item.title}`;
      page.drawText(heading, {
        x: MARGIN_LEFT,
        y,
        size: BODY_SIZE,
        font,
      });

      y -= BODY_LINE_HEIGHT;

      const captionResult = drawWrappedText({
        page,
        text:
          normaliseFigureReferences(item.caption) || "(no caption provided)",
        x: MARGIN_LEFT,
        y,
        maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
        font,
        size: CAPTION_SIZE,
        lineHeight: BODY_LINE_HEIGHT - 2,
        minY: MARGIN_BOTTOM + 60,
        pdfDoc,
        mode,
      });

      page = captionResult.page;
      y = captionResult.y;

      if (item.isImage) {
        const thumbHeight = 50;
        const thumbWidth = 90;
        const thumbYTop = y;
        page.drawRectangle({
          x: MARGIN_LEFT,
          y: thumbYTop - thumbHeight,
          width: thumbWidth,
          height: thumbHeight,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
        });
        page.drawText("Image evidence preview", {
          x: MARGIN_LEFT + thumbWidth + 8,
          y: thumbYTop - 18,
          size: CAPTION_SIZE,
          font,
        });
        y = thumbYTop - thumbHeight - BODY_LINE_HEIGHT;
      } else {
        y -= BODY_LINE_HEIGHT * 0.5;
      }

      y -= BODY_LINE_HEIGHT;
    }

    y -= BODY_LINE_HEIGHT;
  }
}

function addFootersAndPageNumbers(params: {
  pdfDoc: PDFDocument;
  font: any;
  organisation: DossierOrganisationInfo;
  claim: DossierClaimInfo;
}): void {
  const { pdfDoc, font, organisation, claim } = params;
  const pageCount = pdfDoc.getPageCount();

  const periodLabel = formatDateRange(claim.periodStart, claim.periodEnd);
  const footerLeftText = `Accounting Period: ${periodLabel}`;
  const headerRightText = "R&D Technical Dossier";

  for (let i = 0; i < pageCount; i += 1) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    if (i > 0) {
      const headerY = height - MARGIN_TOP + BODY_LINE_HEIGHT;
      const headerLeft = organisation.name || "Company";
      const headerLeftWidth = font.widthOfTextAtSize(
        headerLeft,
        BODY_SIZE
      );
      page.drawText(headerLeft, {
        x: MARGIN_LEFT,
        y: headerY,
        size: BODY_SIZE,
        font,
      });

      const headerRightWidth = font.widthOfTextAtSize(
        headerRightText,
        BODY_SIZE
      );
      page.drawText(headerRightText, {
        x: width - MARGIN_RIGHT - headerRightWidth,
        y: headerY,
        size: BODY_SIZE,
        font,
      });

      page.drawLine({
        start: { x: MARGIN_LEFT, y: headerY - 4 },
        end: { x: width - MARGIN_RIGHT, y: headerY - 4 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    }

    const footerY = MARGIN_BOTTOM - BODY_LINE_HEIGHT;

    page.drawText(footerLeftText, {
      x: MARGIN_LEFT,
      y: footerY,
      size: BODY_SIZE,
      font,
    });

    const pageNumberText = `${i + 1}`;
    const pageNumberWidth = font.widthOfTextAtSize(
      pageNumberText,
      BODY_SIZE
    );
    page.drawText(pageNumberText, {
      x: width / 2 - pageNumberWidth / 2,
      y: footerY,
      size: BODY_SIZE,
      font,
    });

    const claimText = `Claim ID: ${claim.id}`;
    const claimWidth = font.widthOfTextAtSize(claimText, BODY_SIZE);
    page.drawText(claimText, {
      x: width - MARGIN_RIGHT - claimWidth,
      y: footerY,
      size: BODY_SIZE,
      font,
    });
  }
}

export async function buildRdClaimTechnicalDossier(
  options: BuildDossierOptions
): Promise<{ pdfBytes: Uint8Array; pageCount: number }> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  addCoverPage({
    pdfDoc,
    font,
    organisation: options.organisation,
    claim: options.claim,
    generatedAt: options.generatedAt,
    mode: options.mode,
  });

  addExecutiveSummary({
    pdfDoc,
    font,
    projects: options.projects,
    costs: options.costs,
    mode: options.mode,
  });

  addProjectPages({
    pdfDoc,
    font,
    projects: options.projects,
    mode: options.mode,
  });

  addCostSummary({
    pdfDoc,
    font,
    costs: options.costs,
    mode: options.mode,
  });

  addEvidenceAppendix({
    pdfDoc,
    font,
    projects: options.projects,
    mode: options.mode,
  });

  addFootersAndPageNumbers({
    pdfDoc,
    font,
    organisation: options.organisation,
    claim: options.claim,
  });

  const pdfBytes = await pdfDoc.save();
  const pageCount = pdfDoc.getPageCount();

  return { pdfBytes, pageCount };
}