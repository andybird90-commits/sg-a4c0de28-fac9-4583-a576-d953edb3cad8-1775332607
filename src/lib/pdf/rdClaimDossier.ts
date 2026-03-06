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

const TITLE_SIZE = 28;
const SECTION_HEADER_SIZE = 16;
const BODY_SIZE = 11;
const LINE_HEIGHT = 14;

const MARGIN_LEFT = 60;
const MARGIN_RIGHT = 60;
const MARGIN_TOP = 80;
const MARGIN_BOTTOM = 60;

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Not specified";
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start} – (ongoing)`;
  return `Until ${end}`;
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "£0";
  }
  const rounded = Math.round(amount * 100) / 100;
  return `£${rounded.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
}): number {
  const { page, text, x, maxWidth, font, size, lineHeight } = params;
  let { y } = params;

  const paragraphs = text.split(/\n+/);

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const lineWidth = font.widthOfTextAtSize(testLine, size);

      if (lineWidth > maxWidth && line) {
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
      page.drawText(line, {
        x,
        y,
        size,
        font,
      });
      y -= lineHeight;
    }

    // Extra space between paragraphs
    y -= lineHeight * 0.5;
  }

  return y;
}

function ensureSpaceOrAddPage(args: {
  pdfDoc: PDFDocument;
  page: any;
  y: number;
  minY: number;
  font: any;
  mode: "draft" | "final";
}): { page: any; y: number } {
  const { pdfDoc, mode, font } = args;
  let { page, y, minY } = args;

  if (y <= minY) {
    page = pdfDoc.addPage();
    const { height } = page.getSize();
    y = height - MARGIN_TOP;

    if (mode === "draft") {
      drawDraftWatermarkOnPage(page, font);
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
    color: rgb(0.9, 0.9, 0.9),
    rotate: { type: "degrees", angle: 45 },
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
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  const centerX = width / 2;

  const companyName = organisation.name || "Company";
  const companyNumber =
    organisation.companyNumber && organisation.companyNumber.trim().length > 0
      ? `Company Number: ${organisation.companyNumber}`
      : "";

  let y = height - 160;

  const titleLines = [companyName, "R&D Tax Relief Technical Report"];
  for (const [index, line] of titleLines.entries()) {
    const size = index === 0 ? TITLE_SIZE : TITLE_SIZE;
    const textWidth = font.widthOfTextAtSize(line, size);
    page.drawText(line, {
      x: centerX - textWidth / 2,
      y,
      size,
      font,
    });
    y -= size + 20;
  }

  if (companyNumber) {
    const textWidth = font.widthOfTextAtSize(companyNumber, BODY_SIZE);
    page.drawText(companyNumber, {
      x: centerX - textWidth / 2,
      y,
      size: BODY_SIZE,
      font,
    });
    y -= BODY_SIZE + 16;
  }

  const periodLabel = formatDateRange(claim.periodStart, claim.periodEnd);
  const periodText = `Accounting Period: ${periodLabel}`;
  const periodWidth = font.widthOfTextAtSize(periodText, BODY_SIZE);
  page.drawText(periodText, {
    x: centerX - periodWidth / 2,
    y,
    size: BODY_SIZE,
    font,
  });
  y -= BODY_SIZE + 40;

  const preparedBy = "Prepared by:";
  const preparedByWidth = font.widthOfTextAtSize(preparedBy, BODY_SIZE);
  page.drawText(preparedBy, {
    x: centerX - preparedByWidth / 2,
    y,
    size: BODY_SIZE,
    font,
  });
  y -= BODY_SIZE + 4;

  const preparedByName = "Conexa RD Companion";
  const preparedByNameWidth = font.widthOfTextAtSize(
    preparedByName,
    SECTION_HEADER_SIZE
  );
  page.drawText(preparedByName, {
    x: centerX - preparedByNameWidth / 2,
    y,
    size: SECTION_HEADER_SIZE,
    font,
  });

  const footerY = 40;
  const footerLeft = `Generated: ${generatedAt}`;
  const footerRight = `Claim ID: ${claim.id}`;

  page.drawText(footerLeft, {
    x: MARGIN_LEFT,
    y: footerY,
    size: BODY_SIZE,
    font,
  });

  const footerRightWidth = font.widthOfTextAtSize(footerRight, BODY_SIZE);
  page.drawText(footerRight, {
    x: width - MARGIN_RIGHT - footerRightWidth,
    y: footerY,
    size: BODY_SIZE,
    font,
  });
}

function addExecutiveSummary(params: {
  pdfDoc: PDFDocument;
  font: any;
  projects: DossierProject[];
  costs: DossierCostSummary;
  keyTechnologyFields: string[];
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, projects, costs, keyTechnologyFields, mode } = params;
  const page = pdfDoc.addPage();
  const { height } = page.getSize();
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

  const summaryParagraph =
    "This document summarises the research and development activities undertaken during the accounting period and the technological uncertainties addressed.";

  y = drawWrappedText({
    page,
    text: summaryParagraph,
    x: MARGIN_LEFT,
    y,
    maxWidth: page.getSize().width - MARGIN_LEFT - MARGIN_RIGHT,
    font,
    size: BODY_SIZE,
    lineHeight: LINE_HEIGHT,
  });

  y -= 10;

  const totalProjects = projects.length;
  const totalQualifying = costs.totalQualifying;
  const techFields =
    keyTechnologyFields.length > 0
      ? keyTechnologyFields.join(", ")
      : "Not specified";

  const bullets = [
    `Total Projects in Claim: ${totalProjects}`,
    `Total Qualifying Expenditure: ${formatCurrency(totalQualifying)}`,
    `Key Technology Fields: ${techFields}`,
  ];

  for (const bullet of bullets) {
    page.drawText(`• ${bullet}`, {
      x: MARGIN_LEFT,
      y,
      size: BODY_SIZE,
      font,
    });
    y -= LINE_HEIGHT;
  }

  y -= LINE_HEIGHT;

  const tableHeaderY = y;
  const colProject = MARGIN_LEFT;
  const colField = colProject + 220;
  const colDates = colField + 180;

  const headers = [
    { text: "Project", x: colProject },
    { text: "Field", x: colField },
    { text: "Dates", x: colDates },
  ];

  for (const header of headers) {
    page.drawText(header.text, {
      x: header.x,
      y: tableHeaderY,
      size: BODY_SIZE,
      font,
    });
  }

  let rowY = tableHeaderY - LINE_HEIGHT;

  for (const project of projects) {
    if (rowY <= MARGIN_BOTTOM + LINE_HEIGHT * 2) {
      break;
    }

    const periodText = formatDateRange(project.startDate, project.endDate);

    page.drawText(project.name || "Untitled project", {
      x: colProject,
      y: rowY,
      size: BODY_SIZE,
      font,
    });

    page.drawText(project.field || "Not specified", {
      x: colField,
      y: rowY,
      size: BODY_SIZE,
      font,
    });

    page.drawText(periodText, {
      x: colDates,
      y: rowY,
      size: BODY_SIZE,
      font,
    });

    rowY -= LINE_HEIGHT;
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
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - MARGIN_TOP;

    if (mode === "draft") {
      drawDraftWatermarkOnPage(page, font);
    }

    const cardHeight = 60;
    const cardY = y;
    const cardX = MARGIN_LEFT;
    const cardWidth = width - MARGIN_LEFT - MARGIN_RIGHT;

    page.drawRectangle({
      x: cardX,
      y: cardY - cardHeight,
      width: cardWidth,
      height: cardHeight,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
      borderOpacity: 1,
    });

    const cardInnerY = cardY - 18;

    const projectTitle = project.name || "Untitled project";
    page.drawText(projectTitle, {
      x: cardX + 12,
      y: cardInnerY,
      size: SECTION_HEADER_SIZE,
      font,
    });

    const fieldText = project.field ? project.field : "Field: Not specified";
    const durationText = `Duration: ${formatDateRange(
      project.startDate,
      project.endDate
    )}`;
    const leadText = `Lead Engineer: ${
      project.leadEngineer || "Not specified"
    }`;

    const metaY = cardInnerY - 18;
    page.drawText(fieldText, {
      x: cardX + 12,
      y: metaY,
      size: BODY_SIZE,
      font,
    });

    page.drawText(durationText, {
      x: cardX + 220,
      y: metaY,
      size: BODY_SIZE,
      font,
    });

    page.drawText(leadText, {
      x: cardX + 420,
      y: metaY,
      size: BODY_SIZE,
      font,
    });

    y = cardY - cardHeight - 24;

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
        title: "Scientific / Technological Uncertainty",
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
      const minY = MARGIN_BOTTOM + LINE_HEIGHT * 6;
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
      }

      page.drawText(section.title, {
        x: MARGIN_LEFT,
        y,
        size: SECTION_HEADER_SIZE,
        font,
      });
      y -= SECTION_HEADER_SIZE + 6;

      y = drawWrappedText({
        page,
        text: section.value,
        x: MARGIN_LEFT,
        y,
        maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
        font,
        size: BODY_SIZE,
        lineHeight: LINE_HEIGHT,
      });

      y -= LINE_HEIGHT;
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
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  page.drawText("Cost Summary", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_HEADER_SIZE,
    font,
  });
  y -= SECTION_HEADER_SIZE + 16;

  const colCategory = MARGIN_LEFT;
  const colAmount = width - MARGIN_RIGHT - 160;

  page.drawText("Cost Category", {
    x: colCategory,
    y,
    size: BODY_SIZE,
    font,
  });
  page.drawText("Amount", {
    x: colAmount,
    y,
    size: BODY_SIZE,
    font,
  });

  y -= LINE_HEIGHT;

  const rows: { label: string; amount: number }[] = [
    { label: "Staff Costs", amount: costs.staff },
    {
      label: "Externally Provided Workers",
      amount: costs.externallyProvidedWorkers,
    },
    { label: "Subcontractors", amount: costs.subcontractor },
    { label: "Consumables", amount: costs.consumables },
    { label: "Software", amount: costs.software },
    { label: "Total Qualifying Expenditure", amount: costs.totalQualifying },
  ];

  for (const row of rows) {
    if (y <= MARGIN_BOTTOM + LINE_HEIGHT * 2) {
      y = height / 2;
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

    y -= LINE_HEIGHT;
  }
}

function addEvidenceAppendix(params: {
  pdfDoc: PDFDocument;
  font: any;
  projects: DossierProject[];
  mode: "draft" | "final";
}): void {
  const { pdfDoc, font, projects, mode } = params;

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - MARGIN_TOP;

  if (mode === "draft") {
    drawDraftWatermarkOnPage(page, font);
  }

  page.drawText("Evidence Appendix", {
    x: MARGIN_LEFT,
    y,
    size: SECTION_HEADER_SIZE,
    font,
  });
  y -= SECTION_HEADER_SIZE + 20;

  for (const project of projects) {
    const minY = MARGIN_BOTTOM + LINE_HEIGHT * 6;
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
    }

    page.drawText(project.name || "Untitled project", {
      x: MARGIN_LEFT,
      y,
      size: SECTION_HEADER_SIZE,
      font,
    });
    y -= SECTION_HEADER_SIZE + 8;

    if (!project.evidence || project.evidence.length === 0) {
      page.drawText("No specific evidence items have been linked to this project.", {
        x: MARGIN_LEFT,
        y,
        size: BODY_SIZE,
        font,
      });
      y -= LINE_HEIGHT * 2;
      continue;
    }

    for (const item of project.evidence) {
      const minItemY = MARGIN_BOTTOM + LINE_HEIGHT * 5;
      if (y <= minItemY) {
        const pageInfo = ensureSpaceOrAddPage({
          pdfDoc,
          page,
          y,
          minY: minItemY,
          font,
          mode,
        });
        y = pageInfo.y;
      }

      const heading = `Figure ${item.code} – ${item.title}`;
      page.drawText(heading, {
        x: MARGIN_LEFT,
        y,
        size: BODY_SIZE,
        font,
      });
      y -= LINE_HEIGHT;

      y = drawWrappedText({
        page,
        text: item.caption || "(no caption provided)",
        x: MARGIN_LEFT,
        y,
        maxWidth: width - MARGIN_LEFT - MARGIN_RIGHT,
        font,
        size: BODY_SIZE,
        lineHeight: LINE_HEIGHT,
      });

      if (item.isImage) {
        const thumbY = y;
        page.drawRectangle({
          x: MARGIN_LEFT,
          y: thumbY - 40,
          width: 80,
          height: 40,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
        });
        page.drawText("Image evidence", {
          x: MARGIN_LEFT + 90,
          y: thumbY - 16,
          size: BODY_SIZE,
          font,
        });
        y = thumbY - 50;
      } else {
        y -= LINE_HEIGHT * 0.5;
      }

      y -= LINE_HEIGHT * 0.5;
    }

    y -= LINE_HEIGHT;
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
  const footerLeftBase = `${organisation.name} – Accounting Period: ${periodLabel}`;

  for (let i = 0; i < pageCount; i += 1) {
    const page = pdfDoc.getPage(i);
    const { width } = page.getSize();
    const footerY = 30;

    const footerLeft = footerLeftBase;
    const footerRight = `Page ${i + 1} of ${pageCount}`;

    page.drawText(footerLeft, {
      x: MARGIN_LEFT,
      y: footerY,
      size: BODY_SIZE,
      font,
    });

    const rightWidth = font.widthOfTextAtSize(footerRight, BODY_SIZE);
    page.drawText(footerRight, {
      x: width - MARGIN_RIGHT - rightWidth,
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
    keyTechnologyFields: options.keyTechnologyFields,
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