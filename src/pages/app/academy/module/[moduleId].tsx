import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuestionType = "multiple_choice" | "true_false" | "scenario";

interface ScenarioOption {
  id: string;
  label: string;
  isCorrect: boolean;
  explanation: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  options: ScenarioOption[];
}

interface QuizOption {
  id: string;
  label: string;
}

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: QuizOption[];
  correctOptionId?: string;
  correctAnswer?: boolean;
  explanation: string;
}

interface LessonContent {
  overview: string;
  keyConcepts: string[];
  realExamples: string[];
  commonMistakes: string[];
}

interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  lesson: LessonContent;
  scenario: Scenario;
  exercisePrompt: string;
  quiz: QuizQuestion[];
}

const MODULES: ModuleConfig[] = [
  {
    id: "rd-fundamentals",
    title: "R&D Fundamentals",
    description:
      "Understand the legal framework behind UK R&D tax relief including BEIS guidelines and HMRC CIRD rules.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module introduces the statutory basis for UK R&D tax relief and how the concept of technological uncertainty is interpreted in practice.",
      keyConcepts: [
        "BEIS Guidelines set out the definition of R&D for tax purposes, separate from accounting treatment.",
        "Technological uncertainty focuses on whether a competent professional could easily work out the solution.",
        "Advances are measured against the baseline of knowledge and capability in the wider field, not just the company.",
      ],
      realExamples: [
        "Developing a new algorithm that materially improves processing speed beyond what is publicly known, where the solution is not obvious.",
        "Re‑engineering a manufacturing process to achieve tolerances that current industry methods cannot reliably deliver.",
      ],
      commonMistakes: [
        "Describing commercial or product uncertainty (e.g. market fit, customer adoption) instead of technological uncertainty.",
        "Simply listing features rather than explaining why the underlying problem was hard to solve.",
        "Failing to reference the existing baseline of industry knowledge or publicly available techniques.",
      ],
    },
    scenario: {
      id: "manufacturing-automation",
      title: "Manufacturing Automation Project",
      description:
        "A manufacturer is introducing new robotics to automate a manual assembly process. Off‑the‑shelf robots exist, but the company needs to handle very delicate components at a speed that current vendor specifications do not support. The engineering team is experimenting with custom end‑effectors and control algorithms to avoid component damage while maintaining throughput.",
      options: [
        {
          id: "option-a",
          label:
            "This is likely qualifying R&D because the team is resolving uncertainties about how to achieve performance beyond what current robotic systems can reliably deliver.",
          isCorrect: true,
          explanation:
            "The project appears to push beyond the stated capabilities of existing robots. If competent professionals could not easily predict how to achieve the required speed without damage, there is a credible technological uncertainty.",
        },
        {
          id: "option-b",
          label:
            "This is not qualifying R&D because robotics already exist and the company is only implementing standard vendor solutions.",
          isCorrect: false,
          explanation:
            "Simply using off‑the‑shelf robots would not normally qualify. However, here the facts state that the required performance is beyond vendor specifications, suggesting non‑trivial technical challenges.",
        },
        {
          id: "option-c",
          label:
            "This is qualifying R&D because any automation is automatically treated as an R&D project for tax purposes.",
          isCorrect: false,
          explanation:
            "Automation is not automatically R&D. It only qualifies when there is genuine technological uncertainty about achieving the required capability or performance.",
        },
      ],
    },
    exercisePrompt:
      "Write a short paragraph (3–5 sentences) explaining the technological uncertainty in the manufacturing automation scenario above. Focus on why a competent professional could not easily predict the solution.",
    quiz: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "What is the primary test for technological uncertainty in UK R&D tax relief?",
        options: [
          {
            id: "a",
            label: "Whether the project was commercially risky for the company.",
          },
          {
            id: "b",
            label: "Whether a competent professional could easily work out how to achieve the desired outcome.",
          },
          {
            id: "c",
            label: "Whether the project used any form of automation or software.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "The BEIS guidelines emphasise whether a competent professional, using existing knowledge, could readily deduce the solution.",
      },
      {
        id: "q2",
        type: "true_false",
        question: "True or false: If a project fails, it is automatically qualifying R&D.",
        correctAnswer: false,
        explanation:
          "Failure alone does not make work R&D. The work must seek an advance in science or technology and address genuine technological uncertainties.",
      },
      {
        id: "q3",
        type: "multiple_choice",
        question:
          "In R&D tax terms, how should you normally describe the 'advance' in a software project?",
        options: [
          {
            id: "a",
            label: "By listing new user‑facing features delivered in the product.",
          },
          {
            id: "b",
            label: "By explaining how the underlying technical solution goes beyond existing industry capabilities.",
          },
          {
            id: "c",
            label: "By describing the increase in revenue the product generated.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "The advance should be described in terms of underlying science or technology, not commercial outcomes or surface‑level features.",
      },
      {
        id: "q4",
        type: "scenario",
        question:
          "A company integrates a standard payment gateway API into their website with minimal changes. Is this likely to be qualifying R&D?",
        options: [
          { id: "a", label: "Yes, because it involves software development." },
          { id: "b", label: "No, because it is routine implementation of known technology." },
        ],
        correctOptionId: "b",
        explanation:
          "Routine integration of well‑understood APIs rarely involves genuine technological uncertainty.",
      },
      {
        id: "q5",
        type: "true_false",
        question:
          "True or false: Commercial risk (e.g. whether a product will sell) is different from technological risk in the context of R&D.",
        correctAnswer: true,
        explanation:
          "R&D focuses on resolving technological uncertainties, not purely commercial uncertainties.",
      },
    ],
  },
  // Other modules can reuse the same structure but with tailored content later.
];

interface ScenarioState {
  selectedOptionId: string | null;
  showExplanation: boolean;
}

interface ExerciseFeedback {
  technicalClarity: number;
  uncertaintyEvidence: number;
  scientificExplanation: number;
  marketingLanguage: number;
  summary: string;
  suggestions: string[];
}

interface QuizState {
  answers: Record<string, string | boolean>;
  submitted: boolean;
  scorePercent: number;
  passed: boolean;
}

function evaluateExerciseResponse(response: string): ExerciseFeedback {
  const text = response.toLowerCase();
  const hasUncertainty = text.includes("uncertain") || text.includes("uncertainty");
  const hasBaseline = text.includes("existing") || text.includes("current") || text.includes("industry");
  const hasTechnical = text.includes("algorithm") || text.includes("tolerance") || text.includes("performance");
  const hasMarketing =
    text.includes("innovative") ||
    text.includes("market-leading") ||
    text.includes("cutting-edge") ||
    text.includes("revolutionary");

  const technicalClarity = hasTechnical ? 4 : 2;
  const uncertaintyEvidence = hasUncertainty ? 4 : 2;
  const scientificExplanation = hasBaseline ? 4 : 2;
  const marketingLanguage = hasMarketing ? 2 : 4;

  const suggestions: string[] = [];

  if (!hasUncertainty) {
    suggestions.push("Explicitly state what was uncertain from a technological perspective.");
  }
  if (!hasBaseline) {
    suggestions.push("Reference the existing baseline of industry or vendor capability.");
  }
  if (!hasTechnical) {
    suggestions.push("Use more specific technical language to describe the problem and solution attempts.");
  }
  if (hasMarketing) {
    suggestions.push("Reduce marketing phrases and focus on objective technical facts.");
  }

  const summary =
    "This AI-style review looks at how clearly you describe the technological uncertainty and how focused you are on technical detail rather than marketing language.";

  return {
    technicalClarity,
    uncertaintyEvidence,
    scientificExplanation,
    marketingLanguage,
    summary,
    suggestions,
  };
}

function calculateModuleProgress(scenarioState: ScenarioState, quizState: QuizState, exerciseSubmitted: boolean): number {
  let completedSegments = 0;
  const totalSegments = 4;

  if (scenarioState.selectedOptionId) {
    completedSegments += 1;
  }
  if (exerciseSubmitted) {
    completedSegments += 1;
  }
  if (quizState.submitted) {
    completedSegments += 1;
  }
  // Lesson considered completed once user is on this page
  completedSegments += 1;

  return Math.round((completedSegments / totalSegments) * 100);
}

export default function AcademyModulePage() {
  const router = useRouter();
  const { moduleId } = router.query;

  const moduleConfig: ModuleConfig | undefined = useMemo(() => {
    if (typeof moduleId !== "string") return undefined;
    return MODULES.find((m) => m.id === moduleId);
  }, [moduleId]);

  const [scenarioState, setScenarioState] = useState<ScenarioState>({
    selectedOptionId: null,
    showExplanation: false,
  });

  const [exerciseText, setExerciseText] = useState<string>("");
  const [exerciseFeedback, setExerciseFeedback] = useState<ExerciseFeedback | null>(null);
  const [exerciseSubmitted, setExerciseSubmitted] = useState<boolean>(false);

  const [quizState, setQuizState] = useState<QuizState>({
    answers: {},
    submitted: false,
    scorePercent: 0,
    passed: false,
  });

  const readableName =
    moduleConfig?.title ||
    (typeof moduleId === "string"
      ? moduleId
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "Module");

  const progressPercent = moduleConfig
    ? calculateModuleProgress(scenarioState, quizState, exerciseSubmitted)
    : 0;

  const certificationStatus = progressPercent === 100 ? "Completed" : "In Progress";

  const handleScenarioSelect = (optionId: string) => {
    setScenarioState({
      selectedOptionId: optionId,
      showExplanation: true,
    });
  };

  const handleExerciseSubmit = () => {
    if (!exerciseText.trim()) {
      return;
    }
    const feedback = evaluateExerciseResponse(exerciseText);
    setExerciseFeedback(feedback);
    setExerciseSubmitted(true);
  };

  const handleQuizAnswerChange = (questionId: string, value: string | boolean) => {
    setQuizState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value,
      },
      submitted: false,
      scorePercent: 0,
      passed: false,
    }));
  };

  const handleQuizSubmit = () => {
    if (!moduleConfig) return;

    const { quiz } = moduleConfig;
    let correct = 0;

    quiz.forEach((q) => {
      const answer = quizState.answers[q.id];

      if (q.type === "multiple_choice" || q.type === "scenario") {
        if (typeof answer === "string" && answer === q.correctOptionId) {
          correct += 1;
        }
      } else if (q.type === "true_false") {
        if (typeof answer === "boolean" && answer === q.correctAnswer) {
          correct += 1;
        }
      }
    });

    const scorePercent = quiz.length === 0 ? 0 : Math.round((correct / quiz.length) * 100);
    const passed = scorePercent >= 70;

    setQuizState((prev) => ({
      ...prev,
      submitted: true,
      scorePercent,
      passed,
    }));
  };

  if (!moduleConfig) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#020617] text-slate-100">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <Card className="border-slate-800 bg-[#020817]">
              <CardHeader>
                <CardTitle className="text-lg text-slate-50">Module not found</CardTitle>
                <CardDescription className="text-slate-400">
                  We could not find this RD Agent Academy module.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]">
                  <Link href="/app/academy">Back to RD Agent Academy</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <SEO
        title={`${readableName} - RD Agent Academy`}
        description={moduleConfig.description}
      />
      <Layout>
        <div className="min-h-screen bg-[#020617] text-slate-100">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6b35]">
                  RD Agent Academy
                </p>
                <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">
                  {moduleConfig.title}
                </h1>
                <p className="max-w-3xl text-sm text-slate-400 sm:text-base">
                  {moduleConfig.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>
                    Estimated time:{" "}
                    <span className="font-medium text-slate-200">
                      {moduleConfig.estimatedTime}
                    </span>
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:inline-block" />
                  <span>
                    Certification status:{" "}
                    <span className="font-medium text-slate-200">
                      {certificationStatus}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <div className="w-full min-w-[220px] max-w-xs rounded-xl border border-slate-800 bg-[#020817] p-3 shadow-professional-md">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                    <span>Module progress</span>
                    <span className="font-semibold text-slate-100">
                      {progressPercent}%
                    </span>
                  </div>
                  <Progress
                    value={progressPercent}
                    className="h-2 bg-slate-900 [&>div]:bg-[#ff6b35]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push("/app/academy")}
                    className="border-slate-700 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Back to Academy
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(260px,1fr)]">
              {/* Main content column */}
              <div className="space-y-6">
                {/* Lesson content */}
                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Lesson Content
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Work through the lesson, then apply what you have learned in the scenarios,
                      exercise, and quiz.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-200">
                    <p className="text-slate-200">{moduleConfig.lesson.overview}</p>

                    <Accordion type="multiple" className="mt-2 space-y-2">
                      <AccordionItem value="key-concepts" className="border-slate-800">
                        <AccordionTrigger className="text-sm text-slate-100">
                          Key Concepts
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-slate-200">
                          <ul className="list-inside list-disc space-y-1">
                            {moduleConfig.lesson.keyConcepts.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="real-examples" className="border-slate-800">
                        <AccordionTrigger className="text-sm text-slate-100">
                          Real Claim Examples
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-slate-200">
                          <ul className="list-inside list-disc space-y-1">
                            {moduleConfig.lesson.realExamples.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="common-mistakes" className="border-slate-800">
                        <AccordionTrigger className="text-sm text-slate-100">
                          Common Mistakes
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-slate-200">
                          <ul className="list-inside list-disc space-y-1">
                            {moduleConfig.lesson.commonMistakes.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                {/* Scenario section */}
                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Interactive Scenario
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Read the scenario and choose the best answer. You will see an AI-style
                      explanation after you respond.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-200">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">
                          {moduleConfig.scenario.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px]",
                            scenarioState.selectedOptionId
                              ? "border-emerald-500/60 text-emerald-300"
                              : "border-slate-700 text-slate-300"
                          )}
                        >
                          {scenarioState.selectedOptionId ? "Answered" : "Not answered yet"}
                        </Badge>
                      </div>
                      <p className="text-slate-200">{moduleConfig.scenario.description}</p>
                    </div>

                    <div className="space-y-2">
                      {moduleConfig.scenario.options.map((option) => {
                        const isSelected = scenarioState.selectedOptionId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleScenarioSelect(option.id)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                              isSelected
                                ? option.isCorrect
                                  ? "border-emerald-500/70 bg-emerald-500/5"
                                  : "border-red-500/70 bg-red-500/5"
                                : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
                            )}
                          >
                            <span className="mt-0.5 text-xs text-slate-400">
                              {option.id.toUpperCase().slice(-1)}
                            </span>
                            <span className="text-slate-100">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {scenarioState.showExplanation && (
                      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200">
                        <p className="mb-2 font-semibold text-slate-100">
                          AI explanation
                        </p>
                        {moduleConfig.scenario.options
                          .filter((o) => o.id === scenarioState.selectedOptionId)
                          .map((o) => (
                            <p key={o.id} className="mb-2">
                              {o.explanation}
                            </p>
                          ))}
                        <p className="text-[11px] text-slate-500">
                          This explanation is generated according to pre‑defined training rules and
                          is designed to mirror how an AI tutor would justify the answer.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Exercise section */}
                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Practical Exercise
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Practice writing R&amp;D‑style explanations. Submit your answer to receive
                      structured AI‑style feedback.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-200">
                    <p>{moduleConfig.exercisePrompt}</p>
                    <textarea
                      value={exerciseText}
                      onChange={(e) => setExerciseText(e.target.value)}
                      className="min-h-[140px] w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#ff6b35] focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
                      placeholder="Type your response here..."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        This exercise is not stored yet – it is for practice and immediate
                        feedback.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleExerciseSubmit}
                        disabled={!exerciseText.trim()}
                        className="bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]"
                      >
                        Get AI Feedback
                      </Button>
                    </div>

                    {exerciseFeedback && (
                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200">
                        <p className="mb-2 font-semibold text-slate-100">
                          AI‑style feedback
                        </p>
                        <p className="mb-3 text-slate-300">{exerciseFeedback.summary}</p>
                        <div className="mb-3 grid gap-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Technical clarity</span>
                              <span className="font-semibold">
                                {exerciseFeedback.technicalClarity}/4
                              </span>
                            </div>
                            <Progress
                              value={(exerciseFeedback.technicalClarity / 4) * 100}
                              className="h-1.5 bg-slate-900 [&>div]:bg-[#ff6b35]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Evidence of uncertainty</span>
                              <span className="font-semibold">
                                {exerciseFeedback.uncertaintyEvidence}/4
                              </span>
                            </div>
                            <Progress
                              value={(exerciseFeedback.uncertaintyEvidence / 4) * 100}
                              className="h-1.5 bg-slate-900 [&>div]:bg-[#ff6b35]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Scientific framing</span>
                              <span className="font-semibold">
                                {exerciseFeedback.scientificExplanation}/4
                              </span>
                            </div>
                            <Progress
                              value={(exerciseFeedback.scientificExplanation / 4) * 100}
                              className="h-1.5 bg-slate-900 [&>div]:bg-[#ff6b35]"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span>Avoidance of marketing language</span>
                              <span className="font-semibold">
                                {exerciseFeedback.marketingLanguage}/4
                              </span>
                            </div>
                            <Progress
                              value={(exerciseFeedback.marketingLanguage / 4) * 100}
                              className="h-1.5 bg-slate-900 [&>div]:bg-[#ff6b35]"
                            />
                          </div>
                        </div>
                        {exerciseFeedback.suggestions.length > 0 && (
                          <div>
                            <p className="mb-1 font-medium text-slate-100">
                              Suggestions for improvement
                            </p>
                            <ul className="list-inside list-disc space-y-1 text-slate-300">
                              {exerciseFeedback.suggestions.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="mt-3 text-[11px] text-slate-500">
                          This feedback is generated using local scoring rules to mimic how an AI
                          tutor would respond. We can later connect this to a live AI endpoint.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quiz section */}
                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Assessment Quiz
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Answer the questions to check your understanding. A score of 70% or higher
                      will mark this module as passed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-slate-200">
                    <div className="space-y-4">
                      {moduleConfig.quiz.map((q, index) => (
                        <div
                          key={q.id}
                          className="rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                                Question {index + 1}
                              </span>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                {q.type === "multiple_choice"
                                  ? "Multiple choice"
                                  : q.type === "true_false"
                                  ? "True / False"
                                  : "Scenario analysis"}
                              </span>
                            </div>
                          </div>
                          <p className="mb-3 text-slate-100">{q.question}</p>

                          {q.type === "multiple_choice" || q.type === "scenario" ? (
                            <div className="space-y-2">
                              {q.options?.map((opt) => {
                                const selected = quizState.answers[q.id] === opt.id;
                                const showResult = quizState.submitted;
                                const isCorrect = opt.id === q.correctOptionId;

                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleQuizAnswerChange(q.id, opt.id)}
                                    className={cn(
                                      "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                                      selected
                                        ? "border-[#ff6b35] bg-[#ff6b35]/10"
                                        : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
                                    )}
                                  >
                                    <span className="mt-0.5 text-xs text-slate-400">
                                      {opt.id.toUpperCase()}
                                    </span>
                                    <span className="text-slate-100">{opt.label}</span>
                                    {showResult && isCorrect && (
                                      <span className="ml-auto text-[11px] font-semibold text-emerald-400">
                                        Correct
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant={
                                  quizState.answers[q.id] === true ? "default" : "outline"
                                }
                                onClick={() => handleQuizAnswerChange(q.id, true)}
                                className={cn(
                                  "px-4 text-xs",
                                  quizState.answers[q.id] === true
                                    ? "bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]"
                                    : "border-slate-700 text-slate-200 hover:bg-slate-800"
                                )}
                              >
                                True
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  quizState.answers[q.id] === false ? "default" : "outline"
                                }
                                onClick={() => handleQuizAnswerChange(q.id, false)}
                                className={cn(
                                  "px-4 text-xs",
                                  quizState.answers[q.id] === false
                                    ? "bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]"
                                    : "border-slate-700 text-slate-200 hover:bg-slate-800"
                                )}
                              >
                                False
                              </Button>
                            </div>
                          )}

                          {quizState.submitted && (
                            <p className="mt-3 text-xs text-slate-300">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1 text-xs text-slate-400">
                        {quizState.submitted ? (
                          <>
                            <p>
                              Score:{" "}
                              <span className="font-semibold text-slate-100">
                                {quizState.scorePercent}%
                              </span>
                            </p>
                            <p>
                              Status:{" "}
                              <span
                                className={cn(
                                  "font-semibold",
                                  quizState.passed ? "text-emerald-400" : "text-amber-300"
                                )}
                              >
                                {quizState.passed ? "Passed" : "Below pass threshold (70%)"}
                              </span>
                            </p>
                          </>
                        ) : (
                          <p>
                            Answer all questions, then submit to see your score and detailed
                            explanations.
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={handleQuizSubmit}
                        className="bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]"
                      >
                        Submit Quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right-hand sidebar */}
              <aside className="space-y-4">
                <Card className="border-slate-800 bg-[#020817] shadow-professional-md">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50">
                      Module Overview
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Track your progress through this RD Agent Academy module.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs text-slate-200">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Lesson</span>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/60 text-[11px] text-emerald-300"
                        >
                          Completed on view
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Scenario</span>
                        <span className="text-[11px] text-slate-300">
                          {scenarioState.selectedOptionId ? "Answered" : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Exercise</span>
                        <span className="text-[11px] text-slate-300">
                          {exerciseSubmitted ? "Submitted" : "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Quiz</span>
                        <span className="text-[11px] text-slate-300">
                          {quizState.submitted
                            ? quizState.passed
                              ? "Passed"
                              : "Attempted"
                            : "Not started"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="mb-1 text-xs font-medium text-slate-100">
                        Module completion
                      </p>
                      <Progress
                        value={progressPercent}
                        className="h-2 bg-slate-900 [&>div]:bg-[#ff6b35]"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        This module is treated as complete in the academy dashboard once all
                        segments are finished and the quiz is passed. We can later sync this
                        status to Supabase for reporting and certificates.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}