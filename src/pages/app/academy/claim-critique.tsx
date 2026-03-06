import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildClaimCritiqueReport, type ClaimCritiqueInput, type ClaimCritiqueResult, type ClaimCritiqueSectionAnalysis } from "@/lib/pdf/claimCritiqueReport";

type AnalysisDimension = "advance" | "uncertainty" | "evidence" | "costs";

interface LocalAnalysis extends ClaimCritiqueResult {
  dimensionSections: Record<AnalysisDimension, ClaimCritiqueSectionAnalysis>;
}

function analyseClaim(input: ClaimCritiqueInput): LocalAnalysis {
  const narrative = (input.technicalNarrative || "").toLowerCase();
  const summary = (input.projectSummary || "").toLowerCase();
  const costs = (input.costBreakdown || "").toLowerCase();

  const all = `${narrative} ${summary}`;

  const mentionsAdvance =
    all.includes("advance") ||
    all.includes("advancement") ||
    all.includes("improve") ||
    all.includes("enhance") ||
    all.includes("capability");

  const mentionsUncertainty =
    all.includes("uncertainty") ||
    all.includes("uncertain") ||
    all.includes("unknown") ||
    all.includes("technical risk") ||
    all.includes("scientific risk");

  const mentionsBaseline =
    all.includes("baseline") ||
    all.includes("state of the art") ||
    all.includes("existing") ||
    all.includes("current system") ||
    all.includes("prior art");

  const mentionsTesting =
    all.includes("experiment") ||
    all.includes("testing") ||
    all.includes("prototype") ||
    all.includes("trial") ||
    all.includes("iteration");

  const mentionsEvidence =
    all.includes("evidence") ||
    all.includes("logs") ||
    all.includes("tickets") ||
    all.includes("documentation") ||
    all.includes("meeting notes") ||
    all.includes("repository") ||
    all.includes("jira") ||
    all.includes("confluence");

  const marketingLanguage =
    all.includes("innovative") ||
    all.includes("cutting-edge") ||
    all.includes("market leading") ||
    all.includes("world class") ||
    all.includes("disruptive");

  const costKeywordsGood =
    costs.includes("staff") ||
    costs.includes("payroll") ||
    costs.includes("externally provided") ||
    costs.includes("subcontract") ||
    costs.includes("consumable") ||
    costs.includes("software");

  const costKeywordsRisk =
    costs.includes("marketing") ||
    costs.includes("sales") ||
    costs.includes("overhead") ||
    costs.includes("rent") ||
    costs.includes("director dividend");

  const advanceScoreBase = mentionsAdvance ? 7 : 3;
  const advanceScore = Math.min(10, advanceScoreBase + (mentionsBaseline ? 2 : 0) + (mentionsTesting ? 1 : 0));

  const uncertaintyScoreBase = mentionsUncertainty ? 6 : 2;
  const uncertaintyScore = Math.min(10, uncertaintyScoreBase + (mentionsBaseline ? 2 : 0) + (mentionsTesting ? 2 : 0));

  const evidenceScoreBase = mentionsEvidence ? 6 : 3;
  const evidenceScore = Math.min(10, evidenceScoreBase + (mentionsTesting ? 2 : 0) - (marketingLanguage ? 1 : 0));

  const costsScoreBase = costKeywordsGood ? 6 : 4;
  const costsScore = Math.max(
    0,
    Math.min(10, costsScoreBase - (costKeywordsRisk ? 3 : 0))
  );

  const overallScore = Math.max(
    0,
    Math.min(10, (advanceScore + uncertaintyScore + evidenceScore + costsScore) / 4)
  );

  const sections: ClaimCritiqueSectionAnalysis[] = [];
  const dimensionSections: Record<AnalysisDimension, ClaimCritiqueSectionAnalysis> = {} as Record<
    AnalysisDimension,
    ClaimCritiqueSectionAnalysis
  >;

  const advanceSuggestions: string[] = [];
  let advanceComment =
    "You have described the project objectives. Strengthen this by framing them explicitly as a technological advance in the field rather than commercial goals.";

  if (!mentionsAdvance) {
    advanceSuggestions.push(
      "State clearly what capability was not previously available and how the project sought to extend the state of the art."
    );
    advanceComment =
      "The narrative does not clearly articulate a technological advance. It focuses more on commercial improvement or general benefit.";
  }
  if (!mentionsBaseline) {
    advanceSuggestions.push(
      "Add a short baseline paragraph explaining existing solutions or methods and why they were insufficient."
    );
  }
  if (!mentionsTesting) {
    advanceSuggestions.push(
      "Link the advance to specific experiments or iterations that were required to achieve it."
    );
  }

  const advanceSection: ClaimCritiqueSectionAnalysis = {
    title: "Technological Advance",
    score: advanceScore,
    commentary: advanceComment,
    suggestions: advanceSuggestions,
  };
  sections.push(advanceSection);
  dimensionSections.advance = advanceSection;

  const uncertaintySuggestions: string[] = [];
  let uncertaintyComment =
    "There is some indication of difficulty, but the scientific or technological uncertainty is not described as clearly as it could be.";

  if (!mentionsUncertainty) {
    uncertaintySuggestions.push(
      "Introduce a dedicated paragraph headed 'Scientific or technological uncertainty' and describe what could not be readily resolved at the outset."
    );
    uncertaintyComment =
      "The draft does not explicitly describe a scientific or technological uncertainty. HMRC expects this to be clearly set out.";
  }
  if (!mentionsBaseline) {
    uncertaintySuggestions.push(
      "Explain why a competent professional could not simply apply existing knowledge or solutions to resolve the problem."
    );
  }
  if (!mentionsTesting) {
    uncertaintySuggestions.push(
      "Connect the uncertainty to the systematic work undertaken to resolve it (experiments, prototypes, or trials)."
    );
  }

  const uncertaintySection: ClaimCritiqueSectionAnalysis = {
    title: "Technological Uncertainty",
    score: uncertaintyScore,
    commentary: uncertaintyComment,
    suggestions: uncertaintySuggestions,
  };
  sections.push(uncertaintySection);
  dimensionSections.uncertainty = uncertaintySection;

  const evidenceSuggestions: string[] = [];
  let evidenceComment =
    "There is some reference to evidence or documentation. Strengthen this by pointing to specific, dated records that a reviewer could inspect.";

  if (!mentionsEvidence) {
    evidenceSuggestions.push(
      "List specific forms of contemporaneous evidence, such as ticket IDs, Git commits, test logs, design documents, or meeting notes."
    );
    evidenceComment =
      "The draft narrative contains little or no reference to contemporaneous evidence. This weakens the defensibility of the claim.";
  }
  if (!mentionsTesting) {
    evidenceSuggestions.push(
      "Describe how testing and experiments were recorded (for example, in version control, issue trackers, or test harness output)."
    );
  }
  if (marketingLanguage) {
    evidenceSuggestions.push(
      "Reduce or remove marketing language when describing evidence. Focus instead on factual records and who created them."
    );
  }

  const evidenceSection: ClaimCritiqueSectionAnalysis = {
    title: "Evidence Strength",
    score: evidenceScore,
    commentary: evidenceComment,
    suggestions: evidenceSuggestions,
  };
  sections.push(evidenceSection);
  dimensionSections.evidence = evidenceSection;

  const costSuggestions: string[] = [];
  let costComment =
    "The cost breakdown appears to reference appropriate R&D categories. Ensure each category is reconcilable back to payroll or invoices.";

  if (!costKeywordsGood) {
    costSuggestions.push(
      "Break costs down into standard HMRC categories such as staff, externally provided workers, subcontractors, consumables, and software."
    );
    costComment =
      "The cost description does not clearly use standard HMRC R&D categories. This can make the claim harder to review.";
  }
  if (costKeywordsRisk) {
    costSuggestions.push(
      "Remove or clearly exclude non-qualifying categories such as marketing, sales, overheads, rent, or dividends from the R&D schedules."
    );
    costComment =
      "Some of the described costs look non-qualifying for R&D relief (for example marketing, sales, overheads, rent, or dividends). These should be removed or ring-fenced.";
  }

  const costSection: ClaimCritiqueSectionAnalysis = {
    title: "Cost Eligibility",
    score: costsScore,
    commentary: costComment,
    suggestions: costSuggestions,
  };
  sections.push(costSection);
  dimensionSections.costs = costSection;

  const riskFlags: string[] = [];

  if (!mentionsUncertainty) {
    riskFlags.push(
      "No clear description of scientific or technological uncertainty. HMRC could argue the work is routine rather than R&D."
    );
  }
  if (!mentionsEvidence) {
    riskFlags.push(
      "Limited or no contemporaneous evidence referenced. This may weaken the claim in the event of an enquiry."
    );
  }
  if (marketingLanguage) {
    riskFlags.push(
      "Narrative contains marketing language (for example 'innovative', 'cutting-edge'). HMRC prefers neutral, technical description."
    );
  }
  if (costKeywordsRisk) {
    riskFlags.push(
      "Cost breakdown appears to include non-qualifying categories such as marketing, sales, overheads, or similar."
    );
  }

  return {
    overallScore,
    sections,
    riskFlags,
    dimensionSections,
  };
}

export default function ClaimCritiquePage() {
  const [technicalNarrative, setTechnicalNarrative] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [costBreakdown, setCostBreakdown] = useState("");
  const [analysis, setAnalysis] = useState<LocalAnalysis | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const canAnalyse = useMemo(() => {
    return technicalNarrative.trim().length > 0;
  }, [technicalNarrative]);

  const handleRunAnalysis = () => {
    if (!canAnalyse) return;
    setIsAnalysing(true);

    const input: ClaimCritiqueInput = {
      technicalNarrative: technicalNarrative.trim(),
      projectSummary: projectSummary.trim(),
      costBreakdown: costBreakdown.trim(),
    };

    const result = analyseClaim(input);
    setAnalysis(result);
    setIsAnalysing(false);
  };

  const handleDownloadPdf = async () => {
    if (!analysis) return;
    setIsDownloading(true);

    const input: ClaimCritiqueInput = {
      technicalNarrative: technicalNarrative.trim(),
      projectSummary: projectSummary.trim(),
      costBreakdown: costBreakdown.trim(),
    };

    const generatedAt = new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      const pdfBytes = await buildClaimCritiqueReport(input, analysis, generatedAt);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "ai-claim-critique.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const qualityLabel = useMemo(() => {
    if (!analysis) return "";
    if (analysis.overallScore >= 8) return "Strong, defensible draft";
    if (analysis.overallScore >= 6) return "Reasonable, needs refinement";
    if (analysis.overallScore >= 4) return "Weak, significant improvements required";
    return "High risk of challenge";
  }, [analysis]);

  return (
    <Layout>
      <SEO
        title="AI Claim Critique | RD Agent Academy"
        description="Upload R&D claim drafts and receive AI-style critique against HMRC guidance."
      />
      <div className="min-h-screen bg-[#020617] text-slate-100">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
          <header className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 text-xs">
                AI Training Tool
              </Badge>
              <span className="text-xs text-slate-400">RD Agent Academy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">
              AI Claim Critique
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-3xl">
              Paste a draft technical narrative, project summary, and cost breakdown to receive instant,
              AI-style critique against HMRC R&amp;D guidance. Use this to strengthen claims before submission
              or internal review.
            </p>
          </header>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-[#050b16] border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-50">
                    Claim Draft Inputs
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Provide enough detail for the critique engine to assess technological advance, uncertainty,
                    evidence, and cost eligibility.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-200">
                      Technical narrative
                    </label>
                    <Textarea
                      value={technicalNarrative}
                      onChange={(event) => setTechnicalNarrative(event.target.value)}
                      placeholder="Paste the draft technical narrative for the claim here. Focus on advance, uncertainty, and work undertaken."
                      className="min-h-[140px] text-xs sm:text-sm bg-slate-950/40 border-slate-800 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-200">
                      Project summary (optional)
                    </label>
                    <Textarea
                      value={projectSummary}
                      onChange={(event) => setProjectSummary(event.target.value)}
                      placeholder="Provide a short commercial and technical summary of the project and its context."
                      className="min-h-[100px] text-xs sm:text-sm bg-slate-950/40 border-slate-800 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-200">
                      Cost breakdown (optional)
                    </label>
                    <Textarea
                      value={costBreakdown}
                      onChange={(event) => setCostBreakdown(event.target.value)}
                      placeholder="Summarise the cost categories and amounts (for example staff, EPWs, subcontractors, consumables, software)."
                      className="min-h-[80px] text-xs sm:text-sm bg-slate-950/40 border-slate-800 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-slate-500">
                      This tool uses a local rules-based rubric inspired by HMRC guidance. It does not replace
                      professional judgement or a live enquiry.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleRunAnalysis}
                      disabled={!canAnalyse || isAnalysing}
                      className="bg-emerald-400 text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                    >
                      {isAnalysing ? "Analysing..." : "Run AI Claim Critique"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {analysis && (
                <Card className="bg-[#050b16] border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-50">
                      Highlighted Issues in Your Draft
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Key weaknesses and risk areas identified by the rubric, mapped back to HMRC R&amp;D
                      concepts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs sm:text-sm">
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {analysis.sections.flatMap((section) =>
                        section.suggestions.map((suggestion, index) => (
                          <li key={`${section.title}-${index}`}>
                            <span className="text-slate-400">
                              [{section.title}]{" "}
                            </span>
                            {suggestion}
                          </li>
                        ))
                      )}
                    </ul>
                    {analysis.riskFlags.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 mt-2 space-y-1.5">
                        <div className="text-[11px] font-medium text-red-300">
                          Risk flags
                        </div>
                        <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                          {analysis.riskFlags.map((flag, index) => (
                            <li key={index}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card className="bg-[#050b16] border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-50">
                    Claim Quality Score
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Overall defensibility based on technological advance, uncertainty, evidence, and costs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-semibold text-slate-50">
                      {analysis ? analysis.overallScore.toFixed(1) : "--"}
                    </div>
                    <div className="text-xs text-slate-500">/ 10</div>
                  </div>
                  <Progress
                    value={analysis ? (analysis.overallScore / 10) * 100 : 0}
                    className="h-1.5 bg-slate-900"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{analysis ? qualityLabel : "Run a critique to see a quality assessment."}</span>
                    {analysis && (
                      <Badge
                        variant="outline"
                        className={`border-slate-700 text-[10px] ${
                          analysis.overallScore >= 7.5
                            ? "text-emerald-300"
                            : analysis.overallScore >= 5.5
                            ? "text-amber-300"
                            : "text-red-300"
                        }`}
                      >
                        {analysis.overallScore >= 7.5
                          ? "Claim likely accepted"
                          : analysis.overallScore >= 5.5
                          ? "Claim requires clarification"
                          : "Claim likely challenged"}
                      </Badge>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-800 mt-2 text-[11px] text-slate-500">
                    Aim to push drafts into the 7.5+ range before internal review or submission. Use the
                    suggestions and section-by-section scores below to prioritise edits.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#050b16] border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-50">
                    Section-by-Section Analysis
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Breakdown of how the draft performs against core HMRC R&amp;D concepts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScrollArea className="h-[260px] pr-2">
                    <div className="space-y-3">
                      {analysis ? (
                        analysis.sections.map((section) => (
                          <div
                            key={section.title}
                            className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-medium text-slate-100">
                                {section.title}
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-semibold text-slate-50">
                                  {section.score.toFixed(1)}
                                </span>
                                <span className="text-[10px] text-slate-500">/ 10</span>
                              </div>
                            </div>
                            <Progress
                              value={(section.score / 10) * 100}
                              className="h-1.5 bg-slate-900"
                            />
                            <p className="text-[11px] text-slate-400">
                              {section.commentary}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Run a critique to see how the draft scores on technological advance, uncertainty,
                          evidence, and cost eligibility.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-[#050b16] border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-50">
                    Export Critique Report
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Download a PDF copy of the critique to share with colleagues or attach to internal
                    review workflows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    size="sm"
                    className="w-full bg-slate-100 text-slate-950 hover:bg-white/90 disabled:opacity-60"
                    disabled={!analysis || isDownloading}
                    onClick={handleDownloadPdf}
                  >
                    {isDownloading ? "Generating PDF..." : "Download Critique as PDF"}
                  </Button>
                  <p className="text-[11px] text-slate-500">
                    The PDF includes the overall score, section-by-section analysis, risk flags, and an
                    appendix with the submitted text. This helps document review rationale in case of future
                    enquiries.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}