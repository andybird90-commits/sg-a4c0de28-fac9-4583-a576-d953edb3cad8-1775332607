import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuestionType = "multiple_choice" | "true_false";

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

interface LessonContent {
  overview: string;
  keyConcepts: string[];
  realExamples: string[];
  commonMistakes: string[];
}

type ModuleLevel = "foundation" | "advanced";

interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  level: ModuleLevel;
  lesson: LessonContent;
  scenario: Scenario;
  exercisePrompt: string;
  quiz: QuizQuestion[];
}

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

interface CertificationStatus {
  loading: boolean;
  eligible: boolean;
}

const MODULES: ModuleConfig[] = [
  {
    id: "rd-fundamentals",
    level: "foundation",
    title: "R&D Fundamentals",
    description:
      "Understand the statutory definition of R&D for tax purposes and how BEIS and HMRC interpret technological uncertainty.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module introduces the statutory basis for UK R&D tax relief and how the concept of technological uncertainty is interpreted in practice.",
      keyConcepts: [
        "BEIS Guidelines define R&D for tax purposes separately from accounting or marketing concepts.",
        "Technological uncertainty is judged from the perspective of a competent professional in the field.",
        "The baseline is the wider state of knowledge in the industry, not just the company’s starting point.",
      ],
      realExamples: [
        "Developing an algorithm that achieves materially better performance than publicly documented techniques, where the solution path was not obvious.",
        "Re‑engineering a manufacturing process to reach tolerances that existing industry methods could not reliably achieve.",
      ],
      commonMistakes: [
        "Describing commercial uncertainty (e.g. will customers buy this?) instead of technological uncertainty.",
        "Listing features rather than explaining why solving the underlying technical problem was hard.",
        "Failing to describe the baseline of available knowledge or vendor capability.",
      ],
    },
    scenario: {
      id: "manufacturing-automation",
      title: "Manufacturing Automation Project",
      description:
        "A manufacturer introduces new robotics to automate a delicate assembly process. Off‑the‑shelf robots exist, but the components are so fragile that vendor‑specified grippers damage them at required throughput. The engineering team experiments with custom end‑effectors and control algorithms to achieve speed without breakage.",
      options: [
        {
          id: "a",
          label:
            "This is likely qualifying R&D because the team is resolving uncertainties about how to achieve performance beyond what current robotic systems can reliably deliver.",
          isCorrect: true,
          explanation:
            "The facts suggest a genuine uncertainty about whether and how robots can meet the performance requirement without damage. If competent professionals could not readily predict the solution, this is classic technological uncertainty.",
        },
        {
          id: "b",
          label:
            "This is not qualifying R&D because robotics already exist and the company is merely implementing vendor technology.",
          isCorrect: false,
          explanation:
            "Simply using off‑the‑shelf robots is not R&D, but here the project is pushing beyond vendor specifications, which can create qualifying uncertainty.",
        },
        {
          id: "c",
          label:
            "This is automatically qualifying R&D because any automation is treated as R&D for tax purposes.",
          isCorrect: false,
          explanation:
            "Automation is not automatically R&D. The key question is whether there was genuine technological uncertainty about achieving the required capability.",
        },
      ],
    },
    exercisePrompt:
      "Write a short paragraph (3–5 sentences) explaining the technological uncertainty in the automation scenario above. Focus on why a competent professional could not easily predict the solution.",
    quiz: [
      {
        id: "rd-q1",
        type: "multiple_choice",
        question: "What is the core test for technological uncertainty in UK R&D tax relief?",
        options: [
          { id: "a", label: "Whether the project was commercially risky for the company." },
          {
            id: "b",
            label: "Whether a competent professional could readily work out how to achieve the desired result.",
          },
          { id: "c", label: "Whether the project involved any automation or software." },
        ],
        correctOptionId: "b",
        explanation:
          "The BEIS test focuses on what a competent professional could readily deduce using existing knowledge and capability.",
      },
      {
        id: "rd-q2",
        type: "true_false",
        question: "True or false: A failed project is automatically qualifying R&D.",
        correctAnswer: false,
        explanation:
          "Failure alone is not sufficient. The work must seek an advance in science or technology and involve genuine technological uncertainty.",
      },
      {
        id: "rd-q3",
        type: "multiple_choice",
        question:
          "In a software project, how should the 'advance' normally be described in an R&D narrative?",
        options: [
          { id: "a", label: "In terms of new features and user interface." },
          { id: "b", label: "In terms of underlying technical performance or capability gains." },
          { id: "c", label: "In terms of revenue and market share improvement." },
        ],
        correctOptionId: "b",
        explanation:
          "The advance is about underlying science or technology, not commercial outcomes or surface features.",
      },
    ],
  },
  {
    id: "claim-writing-mastery",
    level: "foundation",
    title: "Claim Writing Mastery",
    description:
      "Turn raw technical detail into clear, BEIS‑aligned narratives that HMRC can follow and challenge if needed.",
    estimatedTime: "60–90 min",
    lesson: {
      overview:
        "This module focuses on structuring R&D narratives so that HMRC can clearly see how each BEIS test is satisfied.",
      keyConcepts: [
        "Effective narratives separate context, baseline, advance, and technological uncertainty.",
        "HMRC readers skim; headers, signposting and concise explanations materially affect enquiry risk.",
        "Narratives must be anchored in evidence and cost schedules, not written in isolation.",
      ],
      realExamples: [
        "Rewriting a marketing paragraph into a technically accurate explanation that explicitly references competent professionals.",
        "Adding a short section on failed approaches to show systematic investigation.",
      ],
      commonMistakes: [
        "Over‑using vague terms like 'innovative' instead of specific technical detail.",
        "Describing commercial objectives instead of technological obstacles.",
        "Omitting how staff, subcontractor and software costs map to the work described.",
      ],
    },
    scenario: {
      id: "software-rewrite",
      title: "Software Platform Rebuild Narrative",
      description:
        "You receive: 'We rebuilt our platform using modern cloud technologies. It is more scalable and innovative.' You must convert this into something HMRC can rely on.",
      options: [
        {
          id: "a",
          label:
            "Explain the legacy architecture, specific performance constraints, and why known patterns did not obviously meet the requirements.",
          isCorrect: true,
          explanation:
            "HMRC needs to understand the baseline, the advance, and the uncertainties. You must anchor the narrative in concrete technical detail.",
        },
        {
          id: "b",
          label:
            "Add stronger adjectives about innovation and leadership in the market to impress HMRC.",
          isCorrect: false,
          explanation:
            "More marketing language weakens the file. HMRC is interested in technical substance, not hype.",
        },
        {
          id: "c",
          label:
            "Focus entirely on ROI and payback period because HMRC mainly care about value for money.",
          isCorrect: false,
          explanation:
            "Commercial outcomes are secondary to whether the BEIS R&D tests are met.",
        },
      ],
    },
    exercisePrompt:
      "Take a short marketing‑style description of a project you know (or imagine one). Rewrite it into 4–6 sentences following the structure: context, baseline, advance sought, technological uncertainty.",
    quiz: [
      {
        id: "cwm-q1",
        type: "multiple_choice",
        question: "Which element is most important in an R&D narrative for HMRC?",
        options: [
          { id: "a", label: "Detailed commercial benefits and ROI." },
          {
            id: "b",
            label:
              "A clear description of the technological uncertainties and how they were investigated.",
          },
          { id: "c", label: "The company’s market positioning and brand strength." },
        ],
        correctOptionId: "b",
        explanation:
          "HMRC needs to understand the uncertainties and the systematic work done to resolve them.",
      },
      {
        id: "cwm-q2",
        type: "true_false",
        question:
          "True or false: Describing failed approaches can strengthen an R&D narrative.",
        correctAnswer: true,
        explanation:
          "Evidence of systematic investigation, including dead ends, supports the BEIS tests.",
      },
      {
        id: "cwm-q3",
        type: "multiple_choice",
        question: "Which structure best fits a strong technical narrative?",
        options: [
          { id: "a", label: "Objectives, features, marketing impact." },
          {
            id: "b",
            label:
              "Business context, baseline and competent professional view, advance sought, uncertainties, systematic work and outcomes.",
          },
          { id: "c", label: "Timeline, budget, final client testimonial." },
        ],
        correctOptionId: "b",
        explanation:
          "This mirrors BEIS and makes it easy for HMRC to map the narrative to the tests.",
      },
    ],
  },
  {
    id: "evidence-assessment",
    level: "foundation",
    title: "Evidence Assessment",
    description:
      "Design lean, persuasive evidence packs that support each BEIS test without overwhelming HMRC.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module covers how to identify, prioritise and organise evidence that directly supports the BEIS definition of R&D.",
      keyConcepts: [
        "Contemporaneous technical records are more persuasive than retrospective summaries.",
        "Different evidence types support different tests: advance, uncertainty, systematic work, and costs.",
        "An indexed, curated pack beats a raw document dump every time.",
      ],
      realExamples: [
        "Using ticket histories, design docs and test reports to evidence systematic experimentation.",
        "Creating a simple evidence index so that every HMRC question can be linked to specific documents.",
      ],
      commonMistakes: [
        "Relying mainly on marketing decks as 'evidence'.",
        "Forgetting to tie apportionment logic back to R&D projects and narratives.",
        "Sending unfiltered file dumps without explanation or indexing.",
      ],
    },
    scenario: {
      id: "evidence-pack",
      title: "Building an Evidence Pack",
      description:
        "A client sends a large folder of documents: design notes, tickets, Git logs, slide decks and board papers. HMRC has requested evidence focused on uncertainty and systematic work.",
      options: [
        {
          id: "a",
          label:
            "Curate technical documents (designs, tickets, test outputs) and prepare a short index mapping each to BEIS tests.",
          isCorrect: true,
          explanation:
            "This directly supports the tests and helps HMRC navigate quickly.",
        },
        {
          id: "b",
          label:
            "Forward the entire folder as‑is and let HMRC decide what is relevant.",
          isCorrect: false,
          explanation:
            "Unfiltered dumps waste reviewer time and can surface unhelpful material.",
        },
        {
          id: "c",
          label:
            "Rely mainly on slide decks because they are already formatted and client‑approved.",
          isCorrect: false,
          explanation:
            "Slides rarely contain the level of technical detail HMRC needs.",
        },
      ],
    },
    exercisePrompt:
      "List the 5–8 strongest evidence items you would request for a typical software R&D project, and note which BEIS test each supports (advance, uncertainty, systematic work, costs).",
    quiz: [
      {
        id: "ea-q1",
        type: "multiple_choice",
        question:
          "Which is usually the strongest evidence of systematic R&D work in a software project?",
        options: [
          { id: "a", label: "A slide summarising expected R&D tax savings." },
          {
            id: "b",
            label: "A series of tickets showing experiments, failures and design changes.",
          },
          { id: "c", label: "A marketing brochure describing the final product." },
        ],
        correctOptionId: "b",
        explanation:
          "Ticket histories can show the iterative, investigative nature of work very clearly.",
      },
      {
        id: "ea-q2",
        type: "true_false",
        question:
          "True or false: An evidence index is unnecessary if you provide a lot of material.",
        correctAnswer: false,
        explanation:
          "An index makes it far easier for HMRC to find the right items and reduces enquiry friction.",
      },
      {
        id: "ea-q3",
        type: "multiple_choice",
        question:
          "Which evidence most directly supports the 'advance in science or technology' test?",
        options: [
          { id: "a", label: "Engagement letters with the client." },
          {
            id: "b",
            label:
              "Design documents explaining why existing approaches or vendor products were not sufficient.",
          },
          { id: "c", label: "Invoices from subcontractors." },
        ],
        correctOptionId: "b",
        explanation:
          "These documents show how the project sought to move beyond the existing baseline.",
      },
    ],
  },
  {
    id: "permitted-costs",
    level: "foundation",
    title: "Permitted Costs & Apportionment",
    description:
      "Go beyond simple lists of cost categories and design apportionment approaches HMRC can follow.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module explains which UK R&D cost categories qualify, which do not, and how to design and document apportionments.",
      keyConcepts: [
        "Only specific cost categories qualify (staffing, EPWs, qualifying subcontractors, consumables, certain software and cloud).",
        "Apportionments should be grounded in real data (time records, ticket volumes, usage metrics) where possible.",
        "Documentation of methodology matters more than false precision.",
      ],
      realExamples: [
        "Splitting developer time between experimental features and BAU maintenance using ticket sampling.",
        "Separating cloud spend on R&D test environments from steady‑state production usage.",
      ],
      commonMistakes: [
        "Including sales and general admin salaries as R&D staff costs.",
        "Treating all subcontractor spend as qualifying by default.",
        "Using arbitrary percentages with no documented basis.",
      ],
    },
    scenario: {
      id: "cost-schedule",
      title: "Building a Cost Schedule",
      description:
        "You are preparing a cost schedule for a software project. Inputs: developer and architect salaries, a QA contractor invoice, cloud hosting for production and test environments, sales commission payments, and a generic marketing campaign.",
      options: [
        {
          id: "a",
          label:
            "Include technical staff with apportionment, include QA contractor and R&D‑related test environment costs, exclude sales commissions and generic marketing.",
          isCorrect: true,
          explanation:
            "These decisions align with typical UK R&D rules when linked properly to qualifying activities.",
        },
        {
          id: "b",
          label:
            "Include all items because they ultimately support the same product.",
          isCorrect: false,
          explanation:
            "Commercial support costs do not automatically qualify just because they relate to the product.",
        },
        {
          id: "c",
          label:
            "Exclude QA because testing is not R&D, but include sales commissions because they are success‑based.",
          isCorrect: false,
          explanation:
            "Testing can be integral to systematic R&D. Sales commissions are normally out of scope.",
        },
      ],
    },
    exercisePrompt:
      "Draft a short note (4–6 sentences) explaining how you would determine and document staff time apportionments for a mixed R&D / BAU software team working across multiple projects.",
    quiz: [
      {
        id: "pc-q1",
        type: "multiple_choice",
        question:
          "Which of the following is most likely to be qualifying R&D expenditure?",
        options: [
          {
            id: "a",
            label: "Salary costs of developers resolving technological uncertainties.",
          },
          { id: "b", label: "Sales commission on contracts won after launch." },
          { id: "c", label: "General corporate branding spend." },
        ],
        correctOptionId: "a",
        explanation:
          "Core staffing costs for people directly and actively engaged in R&D are central to the rules.",
      },
      {
        id: "pc-q2",
        type: "true_false",
        question:
          "True or false: If a developer works on one R&D project during the year, 100% of their salary can always be claimed.",
        correctAnswer: false,
        explanation:
          "Where staff split their time between qualifying and non‑qualifying work, a reasonable apportionment is expected.",
      },
      {
        id: "pc-q3",
        type: "multiple_choice",
        question: "Which description best fits an Externally Provided Worker (EPW)?",
        options: [
          {
            id: "a",
            label:
              "An individual supplied by a staff provider to work under the company’s supervision, with time charged to the company.",
          },
          {
            id: "b",
            label: "Any subcontractor performing a fixed‑price project offsite.",
          },
          {
            id: "c",
            label: "A temporary admin assistant covering reception.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "EPWs are a specific construct and have distinct rules compared to subcontractors.",
      },
    ],
  },
  {
    id: "hmrc-enquiry-simulator",
    level: "foundation",
    title: "HMRC Enquiry Simulator",
    description:
      "Practice responding to enquiry letters with structured, BEIS‑aligned explanations and evidence.",
    estimatedTime: "60 min",
    lesson: {
      overview:
        "This module prepares you for HMRC enquiries: why they are opened, how letters are structured, and how to respond effectively.",
      keyConcepts: [
        "Enquiries can be random or risk‑based, but a good response is always structured and evidence‑backed.",
        "Point‑by‑point replies using HMRC’s own numbering reduce friction and follow‑up.",
        "Tone matters: factual and balanced is more effective than defensive or argumentative.",
      ],
      realExamples: [
        "An enquiry triggered by a step‑change in qualifying costs but closed quickly due to a clear response.",
        "A case where vague answers escalated the enquiry until a proper technical narrative was provided.",
      ],
      commonMistakes: [
        "Ignoring parts of HMRC questions because they feel uncomfortable.",
        "Introducing new unsupported technical claims in an attempt to strengthen the file.",
        "Allowing correspondence to become emotional rather than factual.",
      ],
    },
    scenario: {
      id: "first-letter",
      title: "First HMRC Enquiry Letter",
      description:
        "HMRC questions why several projects qualify and asks for evidence around staff apportionments. The original narratives are quite high‑level.",
      options: [
        {
          id: "a",
          label:
            "Prepare a point‑by‑point response referencing the BEIS tests and attaching a curated evidence pack with an index.",
          isCorrect: true,
          explanation:
            "This directly addresses HMRC’s concerns and makes review as easy as possible.",
        },
        {
          id: "b",
          label:
            "Reply briefly that the work is clearly R&D and everything was already in the original claim.",
          isCorrect: false,
          explanation:
            "This is likely to be seen as evasive and may prolong or intensify the enquiry.",
        },
        {
          id: "c",
          label:
            "Delay responding in the hope that HMRC will close the enquiry.",
          isCorrect: false,
          explanation:
            "Missing deadlines or failing to engage increases risk and can lead to adjustments or penalties.",
        },
      ],
    },
    exercisePrompt:
      "Draft a short opening paragraph for an HMRC enquiry response letter. Set a professional tone and explain how your letter is structured.",
    quiz: [
      {
        id: "hes-q1",
        type: "multiple_choice",
        question:
          "What is generally the best structure for responding to an HMRC enquiry letter?",
        options: [
          {
            id: "a",
            label: "One long narrative covering all questions in a single block.",
          },
          {
            id: "b",
            label:
              "Point‑by‑point responses using HMRC’s question numbers as headings, with cross‑references to evidence.",
          },
          {
            id: "c",
            label:
              "A short response telling HMRC that all information was in the original claim.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "This structure makes it obvious that every question has been answered and how.",
      },
      {
        id: "hes-q2",
        type: "true_false",
        question:
          "True or false: It is sometimes appropriate to concede weaker parts of a claim in an enquiry.",
        correctAnswer: true,
        explanation:
          "Reasonable concessions can strengthen your credibility and help protect the stronger elements.",
      },
      {
        id: "hes-q3",
        type: "multiple_choice",
        question:
          "Which scenario is most likely to increase the risk of an enquiry being opened?",
        options: [
          {
            id: "a",
            label: "Claims are at a similar level to previous years with clear narratives.",
          },
          {
            id: "b",
            label:
              "Qualifying costs have doubled year‑on‑year with minimal explanation of why.",
          },
          {
            id: "c",
            label: "The claim was submitted a few days before deadline.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "Large unexplained movements can trigger risk‑based enquiries.",
      },
    ],
  },
  {
    id: "ai-claim-critique",
    level: "foundation",
    title: "AI Claim Critique",
    description:
      "Use AI safely to critique and improve narratives without losing professional control or accuracy.",
    estimatedTime: "30–45 min",
    lesson: {
      overview:
        "This module explains how to use AI tools inside RD Companion to review claims while maintaining regulatory and ethical standards.",
      keyConcepts: [
        "AI is a drafting and critique assistant, not a decision‑maker.",
        "All AI suggestions must be checked against underlying facts and evidence.",
        "Firms should define clear policies for where AI is allowed in the workflow.",
      ],
      realExamples: [
        "Using AI to flag vague wording that focuses on commercial benefits instead of technical uncertainty.",
        "Rejecting AI suggestions that introduce unsupported references to advanced techniques.",
      ],
      commonMistakes: [
        "Copy‑pasting AI output without checking for factual accuracy.",
        "Allowing AI to invent experiments or evidence that never occurred.",
        "Relying on AI 'risk scores' without understanding the reasoning.",
      ],
    },
    scenario: {
      id: "ai-suggestions",
      title: "Reviewing AI Suggestions",
      description:
        "You run a narrative through the AI critique tool. It correctly highlights vague wording, but suggests adding references to 'proprietary deep learning' where the project actually used simple regression models.",
      options: [
        {
          id: "a",
          label:
            "Adopt the clarity suggestions but remove or rewrite technically inaccurate AI suggestions.",
          isCorrect: true,
          explanation:
            "Human reviewers must filter AI output so that only factually accurate improvements are adopted.",
        },
        {
          id: "b",
          label:
            "Accept all AI suggestions to make the project sound more advanced.",
          isCorrect: false,
          explanation:
            "Over‑stating complexity increases enquiry risk and can damage credibility.",
        },
        {
          id: "c",
          label:
            "Stop using AI entirely because it sometimes makes mistakes.",
          isCorrect: false,
          explanation:
            "The goal is controlled use, not total avoidance. Managed correctly, AI adds real value.",
        },
      ],
    },
    exercisePrompt:
      "Imagine you have run a draft through the AI critique tool. Write down three questions you would ask yourself to check that its suggestions are factually accurate and properly evidenced.",
    quiz: [
      {
        id: "aiq-q1",
        type: "multiple_choice",
        question:
          "What is the safest way to use AI when preparing an R&D claim narrative?",
        options: [
          {
            id: "a",
            label: "Use AI to draft and submit narratives without human review.",
          },
          {
            id: "b",
            label:
              "Use AI to generate suggestions and critique, then have a qualified adviser review and edit the final narrative.",
          },
          { id: "c", label: "Avoid AI completely in R&D tax work." },
        ],
        correctOptionId: "b",
        explanation:
          "Responsibility for accuracy and compliance always remains with the human adviser.",
      },
      {
        id: "aiq-q2",
        type: "true_false",
        question:
          "True or false: You may add AI‑suggested technical details even if they are not evidenced, as long as they are plausible.",
        correctAnswer: false,
        explanation:
          "All claims must be evidence‑backed; plausibility is not enough.",
      },
      {
        id: "aiq-q3",
        type: "multiple_choice",
        question:
          "Which type of AI feedback is usually most helpful to incorporate?",
        options: [
          {
            id: "a",
            label: "Highlighting sentences that are vague or purely commercial in tone.",
          },
          {
            id: "b",
            label: "Inventing additional R&D projects to increase claim size.",
          },
          { id: "c", label: "Labeling every project as 'ground‑breaking'." },
        ],
        correctOptionId: "a",
        explanation:
          "Tightening vague language while staying factual typically strengthens the file.",
      },
    ],
  },
  // Advanced modules – content pitched at a more senior/practice‑design level
  {
    id: "sector-software-digital",
    level: "advanced",
    title: "Sector Deep Dive: Software & Digital",
    description:
      "Disentangle genuine software R&D from routine delivery across SaaS, platforms, data and AI projects.",
    estimatedTime: "60–90 min",
    lesson: {
      overview:
        "This module looks at how BEIS tests apply in modern software and digital projects, with a focus on separating real R&D from 'just building the product'.",
      keyConcepts: [
        "Common non‑qualifying patterns: simple CRUD apps, standard integrations, re‑skins and migrations.",
        "Where genuine uncertainty often lives: new algorithms, scalability at extreme loads, complex data pipelines, novel architectures.",
        "How to evidence software R&D using repositories, tickets, design docs and observability data.",
      ],
      realExamples: [
        "Borderline case: migration from on‑prem to cloud with some performance tuning — when it is and isn’t R&D.",
        "Clear R&D: designing a new concurrency model to meet latency targets that off‑the‑shelf stacks cannot meet.",
      ],
      commonMistakes: [
        "Treating any use of AI/ML buzzwords as R&D without understanding the actual work.",
        "Writing narratives that focus on product features instead of underlying technical problems.",
        "Undervaluing infrastructure work (e.g. observability, resilience) that actually contains the uncertainty.",
      ],
    },
    scenario: {
      id: "saas-borderline",
      title: "Borderline SaaS Project",
      description:
        "A SaaS vendor rebuilt its reporting module. The team switched from a simple SQL layer to a new query engine to support complex ad‑hoc analytics with strict latency SLAs. Multiple indexing and caching strategies were trialled.",
      options: [
        {
          id: "a",
          label:
            "Likely qualifying R&D if competent professionals could not readily predict which architecture would satisfy the latency and query flexibility constraints.",
          isCorrect: true,
          explanation:
            "The facts point to genuine uncertainty about achieving the required performance characteristics, beyond routine development.",
        },
        {
          id: "b",
          label:
            "Automatically non‑qualifying because it sits inside an existing SaaS product.",
          isCorrect: false,
          explanation:
            "Being part of an existing product does not rule out R&D; the key is technological uncertainty relative to the field.",
        },
        {
          id: "c",
          label:
            "Qualifying R&D solely because analytics and big data are involved.",
          isCorrect: false,
          explanation:
            "Use of buzzwords alone is irrelevant; BEIS tests must still be met.",
        },
      ],
    },
    exercisePrompt:
      "Draft a short outline for a software R&D project file in your sector. Identify 2–3 clearly non‑qualifying activities that must be ring‑fenced out of the narrative and cost base.",
    quiz: [
      {
        id: "sd-q1",
        type: "multiple_choice",
        question:
          "Which of the following is most likely to be non‑qualifying in a SaaS project?",
        options: [
          {
            id: "a",
            label: "Re‑skin of an existing UI with no material technical change.",
          },
          {
            id: "b",
            label:
              "Developing a new distributed caching strategy to meet previously unattainable latency targets.",
          },
          {
            id: "c",
            label:
              "Experimenting with new data structures to reduce storage and query costs at scale.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "Pure UI re‑skins usually lack technological uncertainty and are typically non‑qualifying.",
      },
      {
        id: "sd-q2",
        type: "true_false",
        question:
          "True or false: Any project involving machine learning automatically qualifies as R&D.",
        correctAnswer: false,
        explanation:
          "ML can involve R&D, but routine implementation of known models to well‑understood problems may not involve genuine uncertainty.",
      },
    ],
  },
  {
    id: "sector-manufacturing-engineering",
    level: "advanced",
    title: "Sector Deep Dive: Manufacturing & Engineering",
    description:
      "Assess R&D in physical products, processes, tolerances, automation and robotics with a focus on borderline cases.",
    estimatedTime: "60–90 min",
    lesson: {
      overview:
        "This module explores where manufacturing and engineering R&D typically arises and how to distinguish it from standard engineering work.",
      keyConcepts: [
        "Distinction between routine engineering improvement and advances in overall knowledge or capability.",
        "Common R&D themes: novel materials, extreme tolerances, new joining methods, automation at performance extremes.",
        "Evidence in this sector often comes from lab notebooks, test rigs, trial reports and FEA/CFD output.",
      ],
      realExamples: [
        "Iteratively refining a welding process to achieve a new combination of strength and weight.",
        "Non‑qualifying: repeating a vendor’s published guidance to set up a standard production line.",
      ],
      commonMistakes: [
        "Treating every continuous improvement project as R&D.",
        "Failing to capture experiment logs and test rig data contemporaneously.",
        "Confusing commercial cost‑down initiatives with technological uncertainty.",
      ],
    },
    scenario: {
      id: "tolerance-case",
      title: "Tight Tolerance Machining",
      description:
        "A precision engineering firm attempts to machine a component with tolerances well beyond current catalogue capabilities. They experiment with new tooling, coolants and toolpaths, logging vibration and temperature data.",
      options: [
        {
          id: "a",
          label:
            "Potentially qualifying R&D if the tolerances were not achievable using known techniques and required systematic experimentation.",
          isCorrect: true,
          explanation:
            "Pushing beyond known tolerances with uncertain feasibility and multiple experiments is classic R&D in this sector.",
        },
        {
          id: "b",
          label:
            "Non‑qualifying because machining is a mature field and all advances are now incremental.",
          isCorrect: false,
          explanation:
            "Even in mature fields there can be genuine advances where the outcome is not readily deducible.",
        },
        {
          id: "c",
          label:
            "Automatically qualifying because tight tolerances are always R&D.",
          isCorrect: false,
          explanation:
            "The key is whether achieving those tolerances involved technological uncertainty relative to the field.",
        },
      ],
    },
    exercisePrompt:
      "List three examples of borderline engineering projects and note what extra information you would need to classify them as R&D or not.",
    quiz: [
      {
        id: "me-q1",
        type: "multiple_choice",
        question:
          "Which is most likely to be qualifying R&D in an engineering business?",
        options: [
          {
            id: "a",
            label: "Installing an off‑the‑shelf CNC machine using vendor settings.",
          },
          {
            id: "b",
            label:
              "Developing a new machining strategy to produce a part that vendors state is not currently achievable.",
          },
          { id: "c", label: "Routine maintenance of existing production lines." },
        ],
        correctOptionId: "b",
        explanation:
          "This scenario suggests genuine uncertainty about achieving the required specification.",
      },
    ],
  },
  {
    id: "advanced-sampling-apportionment",
    level: "advanced",
    title: "Advanced Sampling & Apportionment Methods",
    description:
      "Design robust, explainable sampling and apportionment frameworks for staff time and costs.",
    estimatedTime: "60–90 min",
    lesson: {
      overview:
        "This module goes deeper into how to design sampling approaches that balance rigour with practicality in real‑world R&D practices.",
      keyConcepts: [
        "Trade‑offs between precision, cost of data collection and auditability.",
        "Using multiple data sources (timesheets, tickets, commits, deployments) to triangulate staff effort.",
        "How to document sampling logic so HMRC can challenge assumptions without discarding the whole methodology.",
      ],
      realExamples: [
        "Hybrid sampling using ticket volumes plus manager interviews for teams without perfect timesheets.",
        "Segmenting staff into activity cohorts (e.g. core R&D, mixed role, BAU) with different evidence requirements.",
      ],
      commonMistakes: [
        "Using a single arbitrary percentage across all staff without justification.",
        "Failing to segregate BAU and R&D environments in cloud cost apportionment.",
        "Over‑engineering sampling to three decimal places that cannot be practically evidenced.",
      ],
    },
    scenario: {
      id: "sampling-framework",
      title: "Designing a Sampling Framework",
      description:
        "A 40‑person engineering team works across multiple projects, only some of which are R&D. Timesheets are partial; ticket data is more complete. Management wants a defensible framework without forcing full daily time tracking.",
      options: [
        {
          id: "a",
          label:
            "Propose a cohort‑based sampling approach using a mix of tickets, deployment data and structured manager interviews, documented in a short methodology note.",
          isCorrect: true,
          explanation:
            "This balances rigour with practicality and gives HMRC something concrete to evaluate.",
        },
        {
          id: "b",
          label:
            "Apply a flat 70% R&D apportionment to all technical staff because 'that feels about right'.",
          isCorrect: false,
          explanation:
            "Ungrounded percentages with no evidence are a common source of challenge.",
        },
        {
          id: "c",
          label:
            "Abandon sampling and simply claim 0% to avoid any risk.",
          isCorrect: false,
          explanation:
            "Well‑designed sampling can significantly de‑risk claims without needing absolute precision.",
        },
      ],
    },
    exercisePrompt:
      "Sketch a sampling approach for a 20‑person mixed software team with partial timesheets and good ticket data. State what you would document for HMRC.",
    quiz: [
      {
        id: "asa-q1",
        type: "multiple_choice",
        question:
          "Which is the strongest basis for staff apportionment in most R&D practices?",
        options: [
          {
            id: "a",
            label: "A documented, data‑backed sampling methodology that can be explained and repeated.",
          },
          { id: "b", label: "A single percentage chosen by the sales team." },
          { id: "c", label: "Whatever percentage results in a target claim size." },
        ],
        correctOptionId: "a",
        explanation:
          "HMRC cares more about transparency and evidence than absolute precision.",
      },
    ],
  },
  {
    id: "risk-governance-file-quality",
    level: "advanced",
    title: "Risk Management & File Governance",
    description:
      "Build file standards, QA processes and governance that can withstand enquiry‑level scrutiny.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module is about how a firm structures its governance so that every file is 'enquiry‑ready' by design.",
      keyConcepts: [
        "Defining what a gold‑standard file looks like (narratives, evidence index, sampling note, review sign‑offs).",
        "Risk‑rating files and triaging extra review effort for higher‑risk situations.",
        "Designing QA workflows that are realistic for fee levels and delivery models.",
      ],
      realExamples: [
        "Implementing a traffic‑light risk system based on sector, claim size and novelty.",
        "Creating lightweight peer review templates that can be completed in under 30 minutes.",
      ],
      commonMistakes: [
        "Relying on one senior reviewer without scalable processes.",
        "Treating QA as a tick‑box exercise detached from real risk.",
        "Failing to document decisions on borderline projects and disengagements.",
      ],
    },
    scenario: {
      id: "file-governance",
      title: "Designing a File Governance Standard",
      description:
        "Your firm has grown quickly. Files look very different between advisers and there is no consistent sign‑off trail. HMRC enquiries are increasing.",
      options: [
        {
          id: "a",
          label:
            "Define a standard file structure, introduce a risk‑rating step, and require sign‑offs proportionate to risk level.",
          isCorrect: true,
          explanation:
            "This approach systematically links governance effort to where it matters most.",
        },
        {
          id: "b",
          label:
            "Ask each adviser to keep doing what works for them; standardisation reduces flexibility.",
          isCorrect: false,
          explanation:
            "Inconsistent files are hard to defend at scale and increase firm‑level risk.",
        },
        {
          id: "c",
          label:
            "Focus governance only on template wording and ignore evidence and sampling standards.",
          isCorrect: false,
          explanation:
            "Templates help, but risk lives in facts, evidence and judgements, not just wording.",
        },
      ],
    },
    exercisePrompt:
      "Write a one‑page outline of what a 'gold‑standard' R&D file should contain in your firm, including review and sign‑off steps.",
    quiz: [
      {
        id: "rg-q1",
        type: "multiple_choice",
        question:
          "Which files should generally receive the most intensive QA in an R&D practice?",
        options: [
          {
            id: "a",
            label: "Low‑value, repeat claims in sectors you know well.",
          },
          {
            id: "b",
            label:
              "High‑value or novel claims, or those in sectors with active HMRC focus.",
          },
          { id: "c", label: "All files to exactly the same level, regardless of risk." },
        ],
        correctOptionId: "b",
        explanation:
          "Risk‑based QA focuses scarce senior time where it has most impact.",
      },
    ],
  },
  {
    id: "enquiry-case-studies-outcomes",
    level: "advanced",
    title: "HMRC Enquiry Case Studies & Outcomes",
    description:
      "Analyse anonymised enquiry cases to understand what triggered them and what resolved them.",
    estimatedTime: "60–75 min",
    lesson: {
      overview:
        "This module walks through realistic enquiry case studies to surface patterns in triggers, weak points and effective responses.",
      keyConcepts: [
        "Common enquiry triggers: step‑changes in claim size, sector focus, weak narratives or evidence gaps.",
        "How early engagement and well‑structured responses change enquiry trajectories.",
        "When to concede versus when to stand firm – and how to document those decisions.",
      ],
      realExamples: [
        "A large software claim with vague narratives that triggered a deep dive into sampling.",
        "A manufacturing case where strong lab data and logs led to a quick, favourable closure.",
      ],
      commonMistakes: [
        "Assuming every enquiry means the file is weak.",
        "Treating each enquiry as unique instead of building pattern awareness.",
        "Failing to feed lessons learned back into templates and training.",
      ],
    },
    scenario: {
      id: "case-study",
      title: "Case Study: Rapidly Growing Claim",
      description:
        "A client’s qualifying costs have tripled in two years due to aggressive product development. Narratives and evidence have not kept pace. HMRC opens an enquiry.",
      options: [
        {
          id: "a",
          label:
            "Strengthen narratives, complete a robust sampling note, and proactively explain the growth with supporting data.",
          isCorrect: true,
          explanation:
            "You need to close the gap between growth in costs and the quality of the file.",
        },
        {
          id: "b",
          label:
            "Argue that the growth is 'obvious' because the company is scaling, without further explanation.",
          isCorrect: false,
          explanation:
            "HMRC needs specifics, not generic growth stories.",
        },
        {
          id: "c",
          label:
            "Blame HMRC for unfair targeting and adopt a confrontational tone.",
          isCorrect: false,
          explanation:
            "Tone matters; confrontational approaches seldom improve outcomes.",
        },
      ],
    },
    exercisePrompt:
      "Write a short 'lessons learned' note for your firm based on an imaginary enquiry case: what triggered it, what went well, and what should change in your templates or processes.",
    quiz: [
      {
        id: "ecs-q1",
        type: "multiple_choice",
        question:
          "Which pattern most often contributes to avoidable enquiries?",
        options: [
          { id: "a", label: "Consistent claim sizes with strong evidence." },
          {
            id: "b",
            label:
              "Rapid growth in claim size without corresponding improvements in narratives and evidence.",
          },
          { id: "c", label: "Occasional small claims in low‑risk sectors." },
        ],
        correctOptionId: "b",
        explanation:
          "Large, unexplained changes can trigger risk‑based enquiries.",
      },
    ],
  },
  {
    id: "commercials-pricing-communication",
    level: "advanced",
    title: "Commercials, Pricing & Client Communication",
    description:
      "Connect technical quality, risk and pricing to run a sustainable, de‑risked R&D practice.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module links delivery quality to how you price, scope and communicate with clients.",
      keyConcepts: [
        "Pricing models (contingent, fixed, hybrid) each create different behaviours and risks.",
        "Scoping discipline is critical: what is in, what is out, and how changes are handled.",
        "Clear communication about uncertainty, evidence and record‑keeping reduces friction later.",
      ],
      realExamples: [
        "Moving a client from 'no win, no fee' to hybrid pricing with clearer expectations.",
        "Using a scope letter to avoid pressure to stretch borderline projects into claims.",
      ],
      commonMistakes: [
        "Letting pricing drive technical decisions instead of the other way round.",
        "Over‑promising claim sizes in marketing and then trying to deliver at any cost.",
        "Avoiding difficult conversations about weak evidence or borderline work.",
      ],
    },
    scenario: {
      id: "pricing-scope",
      title: "Scope and Pricing Tension",
      description:
        "A client expects every borderline project to be claimed because your marketing emphasised high success rates. Your technical team is uncomfortable.",
      options: [
        {
          id: "a",
          label:
            "Reset expectations using a clear explanation of BEIS tests, risk appetite, and how pricing reflects the work required for quality.",
          isCorrect: true,
          explanation:
            "Aligning expectations early reduces pressure to over‑claim and supports sustainable pricing.",
        },
        {
          id: "b",
          label:
            "Quietly include all borderline projects to keep the client happy.",
          isCorrect: false,
          explanation:
            "Short‑term appeasement can create significant regulatory and reputational risk.",
        },
        {
          id: "c",
          label:
            "Refuse to discuss pricing; it is a sales issue, not a technical one.",
          isCorrect: false,
          explanation:
            "Pricing and technical risk are tightly linked; advisers must have a view.",
        },
      ],
    },
    exercisePrompt:
      "Create a short script (bullet points) for explaining to a new client how your firm balances opportunity, risk and pricing in R&D claims.",
    quiz: [
      {
        id: "cpc-q1",
        type: "multiple_choice",
        question:
          "Which pricing behaviour most increases long‑term risk in an R&D practice?",
        options: [
          {
            id: "a",
            label:
              "Consistently under‑promising and over‑delivering on claim size.",
          },
          {
            id: "b",
            label:
              "Aggressively promising large claims on a pure success‑fee basis, regardless of evidence quality.",
          },
          { id: "c", label: "Charging more for high‑risk, complex claims." },
        ],
        correctOptionId: "b",
        explanation:
          "This creates pressure to stretch borderline projects into claims, increasing enquiry risk.",
      },
    ],
  },
  {
    id: "ai-enabled-practice-operations",
    level: "advanced",
    title: "AI‑Enabled Practice Operations",
    description:
      "Design safe, high‑leverage AI workflows across intake, drafting, evidence and QA.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module focuses on how to operationalise AI safely at firm level rather than just for individual advisers.",
      keyConcepts: [
        "Mapping where AI adds value (e.g. drafting, critique, evidence surfacing) and where human judgement must dominate.",
        "Designing guardrails: red‑flag checks, mandatory human review, and forbidden use‑cases.",
        "Measuring impact and continuously improving prompts, templates and workflows.",
      ],
      realExamples: [
        "Using AI to pre‑structure client discovery notes and map them to BEIS tests.",
        "Deploying an internal 'AI playbook' that documents allowed and disallowed uses.",
      ],
      commonMistakes: [
        "Allowing uncontrolled AI use with no audit trail.",
        "Treating AI outputs as 'the truth' instead of suggestions.",
        "Ignoring regulator and professional body guidance on AI and client data.",
      ],
    },
    scenario: {
      id: "ai-workflow-design",
      title: "Designing an AI Workflow",
      description:
        "Your firm wants to use RD Companion’s AI features more deeply. Some advisers are enthusiastic, others are sceptical or worried.",
      options: [
        {
          id: "a",
          label:
            "Define a set of approved AI workflows, mandatory human checks, and a log of where AI was used per file.",
          isCorrect: true,
          explanation:
            "This balances innovation with control and builds a defensible audit trail.",
        },
        {
          id: "b",
          label:
            "Allow each adviser to decide individually how they use AI, without central guidance.",
          isCorrect: false,
          explanation:
            "Inconsistent and opaque AI usage is hard to defend if challenged.",
        },
        {
          id: "c",
          label:
            "Ban AI entirely so you never have to explain it to HMRC or regulators.",
          isCorrect: false,
          explanation:
            "This may forgo material efficiency gains and is unlikely to be sustainable.",
        },
      ],
    },
    exercisePrompt:
      "Design a one‑page 'AI usage policy' for your R&D team covering allowed uses, required reviews and prohibited activities.",
    quiz: [
      {
        id: "aiop-q1",
        type: "multiple_choice",
        question:
          "Which control is most important when using AI at scale in an R&D firm?",
        options: [
          { id: "a", label: "A blanket statement that 'AI was used'." },
          {
            id: "b",
            label:
              "A clear policy on where AI can be used, mandatory human review, and logging of key AI‑assisted steps.",
          },
          { id: "c", label: "Relying on vendor marketing about safety." },
        ],
        correctOptionId: "b",
        explanation:
          "Policies and logs demonstrate that AI is being used under professional control.",
      },
    ],
  },
  {
    id: "ethics-professional-standards",
    level: "advanced",
    title: "Ethics & Professional Standards in R&D Advisory",
    description:
      "Handle borderline claims, conflicts and disengagements while protecting clients, the firm and you personally.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module covers ethical decision‑making and professional standards in R&D advisory work.",
      keyConcepts: [
        "Distinguishing 'client advocacy' from misrepresentation.",
        "Identifying and managing conflicts of interest (including success‑fee incentives).",
        "When and how to disengage from clients whose expectations are incompatible with compliant advice.",
      ],
      realExamples: [
        "Choosing not to claim on projects where evidence is irrecoverably weak, despite client pressure.",
        "Agreeing internal escalation thresholds for high‑risk, borderline cases.",
      ],
      commonMistakes: [
        "Allowing fee pressure to override technical judgement.",
        "Documenting only 'happy path' decisions and not the debates behind them.",
        "Treating disengagements as purely commercial decisions rather than ethical ones.",
      ],
    },
    scenario: {
      id: "borderline-ethics",
      title: "Borderline Client Pressure",
      description:
        "A key client insists that multiple projects with weak evidence must be claimed, and hints they will take their business elsewhere if you push back.",
      options: [
        {
          id: "a",
          label:
            "Explain your professional obligations, document the advice, and if necessary disengage rather than over‑claim.",
          isCorrect: true,
          explanation:
            "Ethical and professional standards require you to prioritise compliant advice over short‑term revenue.",
        },
        {
          id: "b",
          label:
            "Agree to include everything to preserve the relationship and hope HMRC does not enquire.",
          isCorrect: false,
          explanation:
            "This creates regulatory, reputational and personal risk.",
        },
        {
          id: "c",
          label:
            "Ignore internal escalation policies because this is a 'special' client.",
          isCorrect: false,
          explanation:
            "Consistency is essential; exceptions undermine your governance model.",
        },
      ],
    },
    exercisePrompt:
      "Write a short decision‑making checklist you would use before agreeing to include a borderline project in a claim.",
    quiz: [
      {
        id: "eps-q1",
        type: "multiple_choice",
        question:
          "Which action best aligns with professional standards when dealing with borderline projects?",
        options: [
          {
            id: "a",
            label:
              "Escalate internally, document the reasoning, and if necessary decline to include the project.",
          },
          { id: "b", label: "Leave the decision entirely to the client." },
          { id: "c", label: "Decide based purely on short‑term revenue impact." },
        ],
        correctOptionId: "a",
        explanation:
          "Documented, escalated decisions protect both clients and the firm.",
      },
    ],
  },
];

function evaluateExerciseResponse(response: string): ExerciseFeedback {
  const text = response.toLowerCase();
  const hasUncertainty = text.includes("uncertain") || text.includes("uncertainty");
  const hasBaseline =
    text.includes("baseline") ||
    text.includes("existing") ||
    text.includes("current") ||
    text.includes("industry");
  const hasTechnical =
    text.includes("algorithm") ||
    text.includes("architecture") ||
    text.includes("tolerance") ||
    text.includes("performance") ||
    text.includes("data");
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
    suggestions.push(
      "Use more specific technical language to describe the problem, constraints and solution attempts.",
    );
  }
  if (hasMarketing) {
    suggestions.push("Reduce marketing phrases and focus on objective technical facts.");
  }

  const summary =
    "This AI-style review looks at how clearly you describe technological uncertainty and how focused you are on technical facts rather than marketing language.";

  return {
    technicalClarity,
    uncertaintyEvidence,
    scientificExplanation,
    marketingLanguage,
    summary,
    suggestions,
  };
}

function calculateModuleProgress(
  scenarioState: ScenarioState,
  quizState: QuizState,
  exerciseSubmitted: boolean,
): number {
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
  completedSegments += 1; // lesson viewed

  return Math.round((completedSegments / totalSegments) * 100);
}

export default function StaffAcademyModulePage() {
  const router = useRouter();
  const { moduleId } = router.query;

  const moduleConfig: ModuleConfig | undefined = useMemo(() => {
    if (typeof moduleId !== "string") return undefined;
    return MODULES.find((m) => m.id === moduleId);
  }, [moduleId]);

  const [certStatus, setCertStatus] = useState<CertificationStatus>({
    loading: true,
    eligible: false,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/academy/certification/status");
        if (!res.ok) {
          setCertStatus({ loading: false, eligible: false });
          return;
        }
        const json = await res.json();
        setCertStatus({
          loading: false,
          eligible: Boolean(json.eligible),
        });
      } catch {
        setCertStatus({ loading: false, eligible: false });
      }
    };

    void fetchStatus();
  }, []);

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

  const isAdvancedModule = moduleConfig?.level === "advanced";
  const foundationCertified = certStatus.eligible;
  const advancedViewOnly = Boolean(isAdvancedModule && !foundationCertified);

  const persistModuleProgress = async (scorePercent: number, passed: boolean): Promise<void> => {
    if (!moduleConfig) return;

    // Advanced modules are view-only until Foundation is achieved: do not persist progress.
    if (moduleConfig.level === "advanced" && !foundationCertified) {
      return;
    }

    try {
      await fetch("/api/academy/update-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moduleId: moduleConfig.id,
          lastScore: scorePercent,
          quizPassed: passed,
          completedAt: passed ? new Date().toISOString() : null,
        }),
      });
    } catch (error) {
      console.error("Failed to persist academy module progress", error);
    }
  };

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

  const certificationStatusLabel = progressPercent === 100 ? "Completed" : "In Progress";

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

  const handleQuizSubmit = async () => {
    if (!moduleConfig) return;

    const { quiz } = moduleConfig;
    let correct = 0;

    quiz.forEach((q) => {
      const answer = quizState.answers[q.id];

      if (q.type === "multiple_choice") {
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

    await persistModuleProgress(scorePercent, passed);
  };

  if (!moduleConfig) {
    return (
      <StaffLayout title="RD Agent Academy">
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
                  <Link href="/staff/academy">Back to RD Agent Academy</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </StaffLayout>
    );
  }

  return (
    <>
      <SEO
        title={`${readableName} - RD Agent Academy`}
        description={moduleConfig.description}
      />
      <StaffLayout title={moduleConfig.title}>
        <div className="min-h-screen bg-[#020617] text-slate-100">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff6b35]">
                  RD Agent Academy ·{" "}
                  {moduleConfig.level === "foundation" ? "Foundation" : "Advanced"}
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
                    Module status:{" "}
                    <span className="font-medium text-slate-200">
                      {certificationStatusLabel}
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
                    onClick={() => router.push("/staff/academy")}
                    className="border-slate-700 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Back to Academy
                  </Button>
                </div>
              </div>
            </div>

            {advancedViewOnly && (
              <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-xs text-amber-100">
                <p className="font-medium text-amber-200">
                  View‑only mode for Advanced module
                </p>
                <p className="mt-1">
                  You can read and practice this advanced module. Quiz results will only be
                  recorded and count toward Advanced certification once you have completed all
                  Foundation modules and earned your Foundation Certificate.
                </p>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(260px,1fr)]">
              <div className="space-y-6">
                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Lesson Content
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Work through the key concepts, then apply what you have learned in the
                      scenario, exercise and quiz.
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

                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Interactive Scenario
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Read the scenario and choose the best answer. You will see an AI‑style
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
                              : "border-slate-700 text-slate-300",
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
                                : "border-slate-800 bg-slate-950/40 hover:border-slate-600",
                            )}
                          >
                            <span className="mt-0.5 text-xs text-slate-400">
                              {option.id.toUpperCase()}
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
                          This explanation is generated using local scoring rules to mimic how an
                          AI tutor would justify the answer.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

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
                        This exercise is not stored in your file – it is for practice and
                        immediate feedback.
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

                <Card className="border-slate-800 bg-[#020817]">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-50 sm:text-lg">
                      Assessment Quiz
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Answer the questions to check your understanding. A score of 70% or higher
                      will mark this module as passed. For advanced modules, scores are only stored
                      once you have completed Foundation.
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
                                {q.type === "multiple_choice" ? "Multiple choice" : "True / False"}
                              </span>
                            </div>
                          </div>
                          <p className="mb-3 text-slate-100">{q.question}</p>

                          {q.type === "multiple_choice" ? (
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
                                        : "border-slate-800 bg-slate-950/40 hover:border-slate-600",
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
                                variant={quizState.answers[q.id] === true ? "default" : "outline"}
                                onClick={() => handleQuizAnswerChange(q.id, true)}
                                className={cn(
                                  "px-4 text-xs",
                                  quizState.answers[q.id] === true
                                    ? "bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]"
                                    : "border-slate-700 text-slate-200 hover:bg-slate-800",
                                )}
                              >
                                True
                              </Button>
                              <Button
                                type="button"
                                variant={quizState.answers[q.id] === false ? "default" : "outline"}
                                onClick={() => handleQuizAnswerChange(q.id, false)}
                                className={cn(
                                  "px-4 text-xs",
                                  quizState.answers[q.id] === false
                                    ? "bg-[#ff6b35] text-slate-950 hover:bg-[#ff8c42]"
                                    : "border-slate-700 text-slate-200 hover:bg-slate-800",
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
                                  quizState.passed ? "text-emerald-400" : "text-amber-300",
                                )}
                              >
                                {quizState.passed ? "Passed" : "Below pass threshold (70%)"}
                              </span>
                            </p>
                            {advancedViewOnly && (
                              <p className="mt-1 text-[11px] text-amber-200">
                                As this is an Advanced module and your Foundation Certification is
                                not yet complete, this score is not recorded in the academy
                                dashboard. You can still use it for practice.
                              </p>
                            )}
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
                        This page tracks your progress through lesson, scenario, exercise and quiz.
                        For advanced modules, quiz results are only written to your academy record
                        once you hold the Foundation Certification.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </StaffLayout>
    </>
  );
}