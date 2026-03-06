import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

type DifficultyLevel = "standard" | "strict" | "aggressive";

interface ChatMessage {
  id: number;
  role: "inspector" | "user";
  content: string;
}

interface SimulationConfig {
  claimSize: string;
  sector: string;
  difficulty: DifficultyLevel;
}

interface SimulationResult {
  score: number;
  outcome: "accepted" | "clarification" | "challenged";
  strengths: string[];
  weaknesses: string[];
  advice: string[];
}

const INITIAL_INSPECTOR_QUESTION =
  "To begin, please explain the technological advance your project was seeking to achieve, in clear technical terms.";

function getNextInspectorQuestion(
  difficulty: DifficultyLevel,
  turnIndex: number,
  lastUserMessage: string
): string {
  const trimmed = lastUserMessage.toLowerCase();

  const mentionsUncertainty =
    trimmed.includes("uncertainty") || trimmed.includes("uncertain") || trimmed.includes("unknown");
  const mentionsBaseline =
    trimmed.includes("baseline") ||
    trimmed.includes("state of the art") ||
    trimmed.includes("existing") ||
    trimmed.includes("current system");
  const mentionsTesting =
    trimmed.includes("experiment") ||
    trimmed.includes("testing") ||
    trimmed.includes("prototype") ||
    trimmed.includes("trial");
  const mentionsEvidence =
    trimmed.includes("evidence") ||
    trimmed.includes("logs") ||
    trimmed.includes("documentation") ||
    trimmed.includes("meeting notes") ||
    trimmed.includes("tickets");

  const standardQuestions = [
    "What specific scientific or technological uncertainties existed at the start of this project?",
    "How did a competent professional in the field view these uncertainties before the work commenced?",
    "What systematic work did you undertake to resolve these uncertainties (for example experiments, prototypes, or trials)?",
    "What contemporaneous evidence do you hold to support this claim (for example design documents, technical logs, or meeting notes)?",
    "How did you determine which costs relate directly to the qualifying R&D activities?"
  ];

  const strictFollowUps = [
    "You mentioned uncertainty, but can you distinguish clearly between commercial risk and scientific or technological uncertainty for this project?",
    "Please explain how you established the baseline of knowledge or capability in the field before you began this work.",
    "Describe how you documented your experiments or iterations while the work was being carried out.",
    "To what extent were the difficulties you faced simply routine engineering rather than advancing knowledge or capability in the field?"
  ];

  const aggressiveFollowUps = [
    "Your response still sounds largely commercial in nature. Where exactly was the advance in science or technology, beyond standard industry practice?",
    "Why should HMRC accept that a competent professional could not readily deduce the solution from publicly available information?",
    "You have referred to documentation in general terms. Point to specific, dated evidence a third party could review to corroborate your description.",
    "Several of your statements sound like marketing language. Reframe them in neutral, technical terms that focus on uncertainty and systematic investigation."
  ];

  if (difficulty === "standard") {
    if (turnIndex < standardQuestions.length) {
      return standardQuestions[turnIndex];
    }
    return "Is there anything else you wish to add to help HMRC understand why this work qualifies as R&D for tax purposes?";
  }

  if (difficulty === "strict") {
    if (!mentionsUncertainty && turnIndex >= 1) {
      return "You have not clearly described the technological uncertainty. Please set out, in technical terms, what could not be readily resolved at the outset.";
    }
    if (!mentionsBaseline && turnIndex >= 2) {
      return "Explain the baseline you started from: what was already known or available, and why that did not already solve the problem.";
    }
    if (!mentionsTesting && turnIndex >= 3) {
      return "You have not described any systematic investigation. What experiments, tests, or prototypes did you run, and how did they inform your decisions?";
    }
    if (!mentionsEvidence && turnIndex >= 4) {
      return "Please list the specific pieces of contemporaneous evidence that support your description (for example, ticket references, log exports, or design documents).";
    }
    const index = Math.min(turnIndex, strictFollowUps.length - 1);
    return strictFollowUps[index];
  }

  if (!mentionsUncertainty && turnIndex >= 1) {
    return "You have still not explained a concrete technological uncertainty. Describe precisely what was not known or easily resolved at the start, without using sales or marketing language.";
  }
  if (!mentionsBaseline && turnIndex >= 2) {
    return "You have not identified a baseline. What was the starting point, and how can we be sure you were not simply deploying well-understood solutions?";
  }
  if (!mentionsTesting && turnIndex >= 3) {
    return "Your description lacks systematic investigation. Tell me specifically what experiments or technical trials you carried out and how they addressed the uncertainty.";
  }
  if (!mentionsEvidence && turnIndex >= 4) {
    return "Without contemporaneous evidence, this description is not persuasive. Identify named documents, logs or records you would be willing to share to support the claim.";
  }

  const index = Math.min(turnIndex, aggressiveFollowUps.length - 1);
  return aggressiveFollowUps[index];
}

function evaluateSimulation(messages: ChatMessage[], config: SimulationConfig): SimulationResult {
  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content.toLowerCase());
  const allText = userMessages.join(" ");

  let score = 40;

  const hasUncertainty =
    allText.includes("uncertainty") ||
    allText.includes("uncertain") ||
    allText.includes("unknown") ||
    allText.includes("technical risk");
  const hasAdvance =
    allText.includes("advance") ||
    allText.includes("improve") ||
    allText.includes("enhance") ||
    allText.includes("capability");
  const hasBaseline =
    allText.includes("baseline") ||
    allText.includes("state of the art") ||
    allText.includes("existing") ||
    allText.includes("current system");
  const hasCompetentProfessional =
    allText.includes("competent professional") || allText.includes("knowledgeable expert");
  const hasSystematicWork =
    allText.includes("experiment") ||
    allText.includes("testing") ||
    allText.includes("prototype") ||
    allText.includes("iteration") ||
    allText.includes("trial");
  const hasEvidence =
    allText.includes("evidence") ||
    allText.includes("logs") ||
    allText.includes("tickets") ||
    allText.includes("documentation") ||
    allText.includes("meeting notes");
  const usesMarketingLanguage =
    allText.includes("innovative") ||
    allText.includes("market-leading") ||
    allText.includes("cutting-edge") ||
    allText.includes("disruptive");

  if (hasUncertainty) score += 10;
  if (hasAdvance) score += 10;
  if (hasBaseline) score += 10;
  if (hasCompetentProfessional) score += 8;
  if (hasSystematicWork) score += 10;
  if (hasEvidence) score += 8;
  if (!usesMarketingLanguage) score += 4;

  if (config.difficulty === "strict") score -= 5;
  if (config.difficulty === "aggressive") score -= 10;

  score = Math.max(0, Math.min(100, score));

  let outcome: SimulationResult["outcome"];
  if (score >= 75) {
    outcome = "accepted";
  } else if (score >= 55) {
    outcome = "clarification";
  } else {
    outcome = "challenged";
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const advice: string[] = [];

  if (hasUncertainty) {
    strengths.push("You referred explicitly to technological uncertainty rather than only commercial risk.");
  } else {
    weaknesses.push("You did not clearly describe a specific scientific or technological uncertainty.");
    advice.push(
      "State explicitly what could not be readily resolved at the start of the project, in technical terms."
    );
  }

  if (hasAdvance) {
    strengths.push("You attempted to describe the technological advance sought by the project.");
  } else {
    weaknesses.push("You did not explain what new capability or knowledge the project aimed to achieve.");
    advice.push(
      "Describe how your solution goes beyond existing practice, not just that it is 'better' or 'faster'."
    );
  }

  if (hasBaseline) {
    strengths.push("You recognised the importance of describing the baseline or starting point.");
  } else {
    weaknesses.push("You did not establish the baseline of existing knowledge or solutions.");
    advice.push(
      "Explain what a competent professional would have considered as available options before your project began."
    );
  }

  if (hasSystematicWork) {
    strengths.push("You described systematic investigative work (experiments, testing, or prototypes).");
  } else {
    weaknesses.push("You did not clearly describe systematic investigative work to resolve the uncertainty.");
    advice.push(
      "Set out the experiments, trials, or technical iterations that were undertaken and how they informed decisions."
    );
  }

  if (hasEvidence) {
    strengths.push("You referenced contemporaneous evidence that could support the claim.");
  } else {
    weaknesses.push("You mentioned little or no contemporaneous evidence to support your description.");
    advice.push(
      "Identify specific logs, tickets, design documents, or meeting notes you could provide if requested."
    );
  }

  if (usesMarketingLanguage) {
    weaknesses.push("Your responses relied on marketing language rather than neutral technical description.");
    advice.push(
      "Remove words like 'innovative' or 'market-leading' and focus on concrete uncertainties, methods, and outcomes."
    );
  }

  if (strengths.length === 0) {
    strengths.push("You engaged with the questions and provided narrative responses HMRC could review.");
  }

  return {
    score,
    outcome,
    strengths,
    weaknesses,
    advice
  };
}

export default function EnquirySimulatorPage() {
  const [claimSize, setClaimSize] = useState<string>("");
  const [sector, setSector] = useState<string>("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("standard");
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [inspectorTurns, setInspectorTurns] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const canStart = claimSize !== "" && sector !== "" && difficulty !== undefined;

  const maxInspectorTurns = useMemo(() => {
    if (difficulty === "aggressive") return 8;
    if (difficulty === "strict") return 7;
    return 6;
  }, [difficulty]);

  const handleStart = () => {
    if (!canStart) return;

    const config: SimulationConfig = {
      claimSize,
      sector,
      difficulty
    };

    setSimulationConfig(config);
    setSimulationStarted(true);
    setIsComplete(false);
    setResult(null);
    setMessages([
      {
        id: 1,
        role: "inspector",
        content:
          "You are responding to an HMRC compliance officer reviewing your R&D claim. Please answer clearly and concisely.",
      },
      {
        id: 2,
        role: "inspector",
        content: INITIAL_INSPECTOR_QUESTION,
      },
    ]);
    setInspectorTurns(2);
    setCurrentInput("");
  };

  const handleSend = () => {
    if (!simulationStarted || isComplete || currentInput.trim() === "") {
      return;
    }

    const nextId = messages.length > 0 ? messages[messages.length - 1].id + 1 : 1;
    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: currentInput.trim(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentInput("");

    if (inspectorTurns >= maxInspectorTurns) {
      const evaluation = evaluateSimulation(updatedMessages, simulationConfig!);
      setResult(evaluation);
      setIsComplete(true);
      return;
    }

    const inspectorId = userMessage.id + 1;
    const nextQuestion = getNextInspectorQuestion(
      difficulty,
      inspectorTurns,
      userMessage.content
    );

    const inspectorMessage: ChatMessage = {
      id: inspectorId,
      role: "inspector",
      content: nextQuestion,
    };

    setMessages([...updatedMessages, inspectorMessage]);
    setInspectorTurns(inspectorTurns + 1);
  };

  const defensibilityLabel = useMemo(() => {
    if (!result) return "";
    if (result.outcome === "accepted") return "Claim likely accepted";
    if (result.outcome === "clarification") return "Claim requires clarification";
    return "Claim likely challenged";
  }, [result]);

  const difficultyLabel = useMemo(() => {
    if (difficulty === "standard") return "Standard";
    if (difficulty === "strict") return "Strict";
    return "Aggressive Inspector";
  }, [difficulty]);

  const claimSummaryText = useMemo(() => {
    if (!simulationConfig) {
      return "Configure a simulation to see a summarised R&D claim profile here.";
    }

    const base =
      simulationConfig.sector === "software"
        ? "A software development project seeking to improve system performance and reliability."
        : simulationConfig.sector === "manufacturing"
        ? "A manufacturing process project introducing new automation and quality control methods."
        : simulationConfig.sector === "life_sciences"
        ? "A life sciences project developing improved diagnostic or treatment processes."
        : simulationConfig.sector === "engineering"
        ? "An engineering project delivering new capabilities in design, control, or monitoring systems."
        : "A multi-disciplinary project delivering improvements beyond routine practice.";

    const sizeText =
      simulationConfig.claimSize === "small"
        ? "The claim size is relatively modest, with tightly scoped qualifying activities."
        : simulationConfig.claimSize === "medium"
        ? "The claim covers a material programme of work across several phases."
        : "The claim is large and strategically important, with multiple workstreams and contributors.";

    const difficultyText =
      simulationConfig.difficulty === "standard"
        ? "The enquiry is expected to focus on clarifying the technological advance, uncertainty, and evidence."
        : simulationConfig.difficulty === "strict"
        ? "The enquiry is detailed, with close attention to baseline, competent professional judgement, and documentation."
        : "The enquiry is adversarial, challenging whether the work goes beyond routine engineering or implementation.";

    return `${base} ${sizeText} ${difficultyText}`;
  }, [simulationConfig]);

  const progressPercent = useMemo(() => {
    if (!simulationStarted) return 0;
    const userTurns = messages.filter((m) => m.role === "user").length;
    const totalTurns = maxInspectorTurns;
    const raw = Math.min(100, Math.round((userTurns / totalTurns) * 100));
    return raw;
  }, [messages, simulationStarted, maxInspectorTurns]);

  return (
    <Layout>
      <SEO
        title="HMRC Enquiry Simulator | RD Agent Academy"
        description="Practice defending R&D tax claims through simulated HMRC inspector questioning."
      />
      <div className="min-h-screen bg-[#020617] text-slate-100">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto space-y-6">
          <header className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#ff6b35]/40 text-[#ff6b35] text-xs">
                Training Simulation
              </Badge>
              <span className="text-xs text-slate-400">RD Agent Academy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">
              HMRC Enquiry Simulator
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-3xl">
              Practice responding to simulated HMRC inspector questions about an R&amp;D claim.
              Use this environment to strengthen your explanations of technological advance,
              uncertainty, and supporting evidence.
            </p>
          </header>

          <Card className="bg-[#050b16] border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-50">Simulation Setup</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-400">
                Configure the profile of the claim and the tone of the inspector before starting the
                simulation.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-medium text-slate-200">
                  Claim Size
                </label>
                <Select
                  value={claimSize}
                  onValueChange={setClaimSize}
                >
                  <SelectTrigger className="bg-slate-950/30 border-slate-800 text-xs sm:text-sm">
                    <SelectValue placeholder="Select claim size" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b16] border-slate-800 text-slate-100">
                    <SelectItem value="small">Small (&lt; £50k qualifying costs)</SelectItem>
                    <SelectItem value="medium">Medium (£50k–£250k qualifying costs)</SelectItem>
                    <SelectItem value="large">Large (&gt; £250k qualifying costs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-medium text-slate-200">
                  Sector
                </label>
                <Select
                  value={sector}
                  onValueChange={setSector}
                >
                  <SelectTrigger className="bg-slate-950/30 border-slate-800 text-xs sm:text-sm">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b16] border-slate-800 text-slate-100">
                    <SelectItem value="software">Software &amp; Digital</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing &amp; Engineering</SelectItem>
                    <SelectItem value="life_sciences">Life Sciences</SelectItem>
                    <SelectItem value="engineering">Industrial Engineering</SelectItem>
                    <SelectItem value="other">Other / Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-medium text-slate-200">
                  Difficulty Level
                </label>
                <Select
                  value={difficulty}
                  onValueChange={(value: DifficultyLevel) => setDifficulty(value)}
                >
                  <SelectTrigger className="bg-slate-950/30 border-slate-800 text-xs sm:text-sm">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b16] border-slate-800 text-slate-100">
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="aggressive">Aggressive Inspector</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col justify-end sm:col-span-1 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Exchange Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress
                  value={progressPercent}
                  className="h-1.5 bg-slate-900"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] text-slate-950 hover:from-[#ff814f] hover:to-[#ffa25c]"
                    disabled={!canStart}
                    onClick={handleStart}
                  >
                    {simulationStarted ? "Restart Simulation" : "Start Simulation"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-1">
              <Card className="bg-[#050b16] border-slate-800 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-50">Claim Summary</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    A high-level profile of the simulated claim you are defending.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs sm:text-sm text-slate-300">
                  <p className="leading-relaxed">
                    {claimSummaryText}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div className="space-y-1">
                      <div className="text-slate-500">Configured Size</div>
                      <div className="text-slate-100">
                        {claimSize === "small"
                          ? "Small"
                          : claimSize === "medium"
                          ? "Medium"
                          : claimSize === "large"
                          ? "Large"
                          : "Not selected"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-500">Sector</div>
                      <div className="text-slate-100 capitalize">
                        {sector ? sector.replace("_", " ") : "Not selected"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-500">Enquiry Tone</div>
                      <div className="text-slate-100">{difficultyLabel}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-slate-500">Expected Depth</div>
                      <div className="text-slate-100">
                        {difficulty === "standard"
                          ? "Clarification-focused"
                          : difficulty === "strict"
                          ? "Detail-heavy review"
                          : "Adversarial challenge"}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 mt-2 text-[11px] text-slate-400">
                    Use this summary to keep your responses anchored to a clear project description and
                    qualifying R&amp;D story.
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <Card className="bg-[#050b16] border-slate-800 h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm text-slate-50">Enquiry Conversation</CardTitle>
                      <CardDescription className="text-xs text-slate-400">
                        Respond as if you were dealing with a live HMRC enquiry. Keep your language neutral,
                        technical, and evidence-based.
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className="border-slate-700 text-[10px] text-slate-200"
                      >
                        Inspector: {difficultyLabel}
                      </Badge>
                      {isComplete && result && (
                        <Badge
                          variant="secondary"
                          className="bg-slate-900 border-slate-700 text-[10px] text-slate-100"
                        >
                          Simulation Complete
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 h-[420px]">
                  <ScrollArea className="flex-1 rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                    {messages.length === 0 && (
                      <div className="text-xs text-slate-500">
                        Configure the simulation above and press{" "}
                        <span className="font-semibold text-slate-300">Start Simulation</span> to
                        begin an enquiry conversation.
                      </div>
                    )}
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs sm:text-sm leading-relaxed ${
                            message.role === "user"
                              ? "bg-[#ff6b35] text-slate-950 rounded-br-sm"
                              : "bg-slate-900 text-slate-100 border border-slate-800 rounded-bl-sm"
                          }`}
                        >
                          <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
                            {message.role === "user" ? "You" : "HMRC Inspector"}
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>

                  <div className="space-y-2">
                    <Textarea
                      value={currentInput}
                      disabled={!simulationStarted || isComplete}
                      onChange={(event) => setCurrentInput(event.target.value)}
                      placeholder={
                        simulationStarted
                          ? "Type your response to the inspector here..."
                          : "Start a simulation to begin responding to HMRC questions."
                      }
                      className="min-h-[80px] text-xs sm:text-sm bg-slate-950/40 border-slate-800 placeholder:text-slate-600"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-500">
                        Aim for specific, factual descriptions: technological advance, uncertainty, systematic
                        work, and evidence.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={!simulationStarted || isComplete || currentInput.trim() === ""}
                        className="bg-slate-100 text-slate-950 hover:bg-white/90"
                      >
                        {isComplete ? "Simulation Finished" : "Send Response"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {result && (
            <Card className="bg-[#050b16] border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm text-slate-50">
                      Simulation Result
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Review the defensibility of your responses and how you might strengthen a real enquiry.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                        Defensibility Score
                      </div>
                      <div className="text-lg font-semibold text-slate-50">
                        {result.score}
                        <span className="text-xs text-slate-500 ml-1">/ 100</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border-slate-700 ${
                        result.outcome === "accepted"
                          ? "text-emerald-300"
                          : result.outcome === "clarification"
                          ? "text-amber-300"
                          : "text-red-300"
                      }`}
                    >
                      {defensibilityLabel}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3 text-xs sm:text-sm">
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-100">Strengths</h3>
                  {result.strengths.length === 0 ? (
                    <p className="text-slate-500">
                      No specific strengths identified. Focus on grounding your description in the BEIS / HMRC
                      criteria.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {result.strengths.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-100">Weaknesses</h3>
                  {result.weaknesses.length === 0 ? (
                    <p className="text-slate-500">
                      No major weaknesses detected based on this simple rubric. A real HMRC officer may still
                      probe further.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {result.weaknesses.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-slate-100">Advice for Improvement</h3>
                  {result.advice.length === 0 ? (
                    <p className="text-slate-500">
                      Continue refining your ability to separate commercial narrative from technical R&amp;D
                      description, and ensure you can point to concrete evidence.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                      {result.advice.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-800 mt-2">
                    This simulator uses a simple local scoring rubric, not a live HMRC model. Use it to rehearse
                    structured answers that align with BEIS guidance and HMRC CIRD language.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}