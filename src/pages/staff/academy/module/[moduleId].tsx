import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { StaffLayout } from "@/components/staff/StaffLayout";
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
  {
    id: "claim-writing-mastery",
    title: "Claim Writing Mastery",
    description:
      "Learn how to write strong technical narratives that clearly demonstrate technological uncertainty and advancement.",
    estimatedTime: "60–90 min",
    lesson: {
      overview:
        "This module focuses on turning raw technical information into structured narratives that align with the BEIS tests and HMRC reading habits.",
      keyConcepts: [
        "Good narratives clearly separate context, baseline knowledge, advance sought, and technological uncertainty.",
        "HMRC reviewers scan for explicit references to competent professionals, baseline knowledge, and why the solution was not readily deducible.",
        "Narratives must tie back to the underlying evidence and cost schedule rather than existing in isolation.",
      ],
      realExamples: [
        "Rewriting a marketing‑style paragraph into a balanced, technical explanation that HMRC can follow step by step.",
        "Adding a short section describing failed approaches so that systematic R&D work is evidenced, not just the successful outcome.",
      ],
      commonMistakes: [
        "Over‑using vague phrases such as 'cutting‑edge' or 'innovative' without concrete technical detail.",
        "Focusing on commercial risk (deadlines, sales targets) instead of explaining why the solution was hard for a competent professional.",
        "Failing to connect staff, software, and subcontractor costs to the specific activities described in the narrative.",
      ],
    },
    scenario: {
      id: "software-rewrite-narrative",
      title: "Software Platform Rebuild Narrative",
      description:
        "You receive a first‑draft project description: 'We rebuilt our platform to be faster and more scalable using modern cloud technologies. This was cutting‑edge and very important commercially.' You need to turn this into something HMRC can rely on.",
      options: [
        {
          id: "option-a",
          label:
            "Rewrite to explain the previous architecture, specific performance constraints, why known patterns were insufficient, and how the team systematically experimented with different designs.",
          isCorrect: true,
          explanation:
            "HMRC needs to understand the baseline, the advance, and the uncertainties. Explaining the architecture and experiments moves the narrative from marketing to technical evidence.",
        },
        {
          id: "option-b",
          label:
            "Add stronger adjectives about innovation and stress that the company is a market leader using cutting‑edge cloud technology.",
          isCorrect: false,
          explanation:
            "More marketing language does not help. Without technical detail and reference to uncertainty, the narrative remains weak.",
        },
        {
          id: "option-c",
          label:
            "Shorten the description to one sentence focusing only on the cost of the rebuild and the expected ROI.",
          isCorrect: false,
          explanation:
            "Cost and ROI may be relevant commercially, but they do not explain whether the work meets the BEIS R&D tests.",
        },
      ],
    },
    exercisePrompt:
      "Take a short marketing‑style paragraph about a project you have worked on and rewrite it into a BEIS‑aligned R&D narrative. Clearly separate context, baseline, advance, and technological uncertainty.",
    quiz: [
      {
        id: "cwm-q1",
        type: "multiple_choice",
        question: "Which element is most important in an R&D narrative for HMRC?",
        options: [
          {
            id: "a",
            label: "A detailed explanation of the commercial benefits and expected ROI.",
          },
          {
            id: "b",
            label:
              "A clear description of the technological uncertainties and why they could not readily be resolved by a competent professional.",
          },
          {
            id: "c",
            label: "A full history of the company and its market positioning.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "Commercial context can be useful, but the central test is technological uncertainty relative to a competent professional baseline.",
      },
      {
        id: "cwm-q2",
        type: "true_false",
        question:
          "True or false: It is acceptable for an R&D narrative to contain minor technical inaccuracies if it makes the work sound more advanced.",
        correctAnswer: false,
        explanation:
          "Narratives must be factually accurate and grounded in the actual work performed. Overstatement or technical inaccuracies increase enquiry risk.",
      },
      {
        id: "cwm-q3",
        type: "multiple_choice",
        question:
          "Which structure is generally most effective for an R&D project write‑up?",
        options: [
          {
            id: "a",
            label: "Objectives, commercial benefits, list of features, conclusion.",
          },
          {
            id: "b",
            label:
              "Business context, baseline and competent professional view, advance sought, technological uncertainties, systematic work and outcomes.",
          },
          {
            id: "c",
            label: "Introduction, project management timeline, budget, final result.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "This structure mirrors how BEIS defines R&D and how HMRC typically reviews claims.",
      },
      {
        id: "cwm-q4",
        type: "scenario",
        question:
          "You are editing a draft that repeatedly states the project was 'innovative' but gives little technical detail. What is the best next step?",
        options: [
          {
            id: "a",
            label:
              "Ask the technical team to describe at least one specific problem that was hard to solve and the approaches they tried.",
          },
          {
            id: "b",
            label: "Add more adjectives to emphasise how innovative the work was.",
          },
          {
            id: "c",
            label: "Delete all references to uncertainty to avoid confusing HMRC.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "You need concrete technical detail and evidence of uncertainty. Simply adding adjectives weakens the narrative.",
      },
      {
        id: "cwm-q5",
        type: "true_false",
        question:
          "True or false: Describing failed approaches and dead ends can strengthen an R&D narrative.",
        correctAnswer: true,
        explanation:
          "Evidence of systematic investigation, including failed approaches, helps demonstrate genuine technological uncertainty and R&D activity.",
      },
    ],
  },
  {
    id: "evidence-assessment",
    title: "Evidence Assessment",
    description:
      "Identify and organise the correct supporting evidence to strengthen a claim.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module helps you recognise, prioritise, and organise the documents and data HMRC find most persuasive in R&D enquiries.",
      keyConcepts: [
        "Contemporaneous, technical records are usually stronger than retrospective summaries.",
        "Different evidence types support different BEIS tests: advance, uncertainty, systematic work, and costs.",
        "Quality matters more than volume; a small, well‑organised pack beats a large, unfocused dump of files.",
      ],
      realExamples: [
        "Using Jira tickets and test reports to evidence the experimental work undertaken during a software project.",
        "Indexing design documents, lab notes, and trial results so that each HMRC question can quickly be mapped to a specific item.",
      ],
      commonMistakes: [
        "Relying mainly on high‑level slide decks and marketing collateral as 'evidence'.",
        "Failing to link staff timesheets or sampling logic back to the projects and uncertainties described in the narrative.",
        "Providing excessive raw data without any indexing or explanation of relevance.",
      ],
    },
    scenario: {
      id: "evidence-pack-selection",
      title: "Building an Evidence Pack",
      description:
        "You have limited time with a client and need to assemble an evidence pack for a software R&D claim. The client has shared a large folder containing design documents, Git logs, tickets, marketing slides, and board packs.",
      options: [
        {
          id: "option-a",
          label:
            "Prioritise technical design docs, relevant tickets, and test results, then supplement with a simple index explaining how they link to each project.",
          isCorrect: true,
          explanation:
            "Technical, contemporaneous records directly support the BEIS tests. An index helps HMRC navigate the pack efficiently.",
        },
        {
          id: "option-b",
          label:
            "Send all available documents to HMRC in a zip file without review so they can decide what is relevant.",
          isCorrect: false,
          explanation:
            "Unfiltered document dumps frustrate reviewers and can surface inconsistencies or irrelevant material.",
        },
        {
          id: "option-c",
          label:
            "Rely mainly on marketing and board slides because they are already nicely formatted and client‑approved.",
          isCorrect: false,
          explanation:
            "Marketing and board material rarely provides the technical detail HMRC needs for R&D assessments.",
        },
      ],
    },
    exercisePrompt:
      "List the 5–8 strongest evidence items you would request for a typical software R&D project and explain briefly which BEIS test each item supports.",
    quiz: [
      {
        id: "ea-q1",
        type: "multiple_choice",
        question:
          "Which of the following is usually the strongest evidence of systematic R&D work?",
        options: [
          {
            id: "a",
            label: "A slide showing forecast R&D tax savings.",
          },
          {
            id: "b",
            label: "A sequence of tickets showing experiments, failures, and design changes.",
          },
          {
            id: "c",
            label: "A marketing brochure describing the final product features.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "Ticket histories can show the experimental, iterative nature of work in a way that aligns well with BEIS tests.",
      },
      {
        id: "ea-q2",
        type: "true_false",
        question:
          "True or false: Timesheets are always required for an R&D claim to be accepted.",
        correctAnswer: false,
        explanation:
          "Timesheets are helpful, but HMRC can accept other forms of evidence for staffing effort if they are consistent and well‑documented.",
      },
      {
        id: "ea-q3",
        type: "multiple_choice",
        question:
          "Which evidence type most directly supports the 'advance in science or technology' test?",
        options: [
          { id: "a", label: "Signed engagement letters with the client." },
          { id: "b", label: "Technical design documents explaining limitations of existing approaches." },
          { id: "c", label: "Invoices from subcontractors." },
        ],
        correctOptionId: "b",
        explanation:
          "Design documents can show how the project seeks to move beyond the existing baseline of knowledge or capability.",
      },
      {
        id: "ea-q4",
        type: "scenario",
        question:
          "HMRC asks how staff time percentages were determined. Which response is best supported by evidence?",
        options: [
          {
            id: "a",
            label:
              "Explain that percentages were estimated 'by feel' without any documented basis.",
          },
          {
            id: "b",
            label:
              "Reference a combination of timesheets, ticket volumes, and manager interviews, with a short note explaining the sampling method.",
          },
          {
            id: "c",
            label:
              "State that apportionments were based on commercial priorities and that no further detail is necessary.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "A transparent, documented sampling approach gives HMRC something concrete to evaluate.",
      },
      {
        id: "ea-q5",
        type: "true_false",
        question:
          "True or false: Providing a clear index or contents page for the evidence pack is unnecessary if all documents are included.",
        correctAnswer: false,
        explanation:
          "A simple index helps HMRC navigate the evidence and reduces the risk that important items are missed.",
      },
    ],
  },
  {
    id: "permitted-costs",
    title: "Permitted Costs & Apportionment",
    description:
      "Understand which UK R&D costs qualify, which do not, and how to apportion staff and overheads defensibly.",
    estimatedTime: "45–60 min",
    lesson: {
      overview:
        "This module focuses on which UK R&D costs are normally qualifying, which are excluded, and how to document sensible apportionments that HMRC can follow.",
      keyConcepts: [
        "Only certain categories of expenditure qualify for UK R&D relief – for example staffing costs, certain EPWs, subcontractors, consumables, software, and relevant cloud or data costs.",
        "Costs must be attributable to qualifying R&D activities; apportionment is often required where staff or assets are only partly involved.",
        "Clear, documented methodology for apportionments is more important than false precision.",
      ],
      realExamples: [
        "Splitting a developer’s salary 60/40 between qualifying R&D work on an experimental feature and non‑qualifying business‑as‑usual maintenance.",
        "Separating hosting and cloud costs for R&D test environments from those relating to steady‑state production usage.",
      ],
      commonMistakes: [
        "Including sales, marketing, and general admin salaries as qualifying R&D staffing costs.",
        "Treating all subcontractor invoices as qualifying without checking whether the work itself was R&D.",
        "Using arbitrary, undocumented percentages for staff time or overheads.",
      ],
    },
    scenario: {
      id: "cost-categories-schedule",
      title: "Building a Cost Schedule",
      description:
        "You are preparing a cost schedule for a software R&D project. The client provides: developer and architect salaries, a QA contractor invoice, cloud hosting bills for production and test environments, sales commission payments, and a generic marketing campaign budget.",
      options: [
        {
          id: "option-a",
          label:
            "Include developer and architect salaries with an apportionment, include the QA contractor and R&D‑related test environment costs, exclude sales commissions and general marketing.",
          isCorrect: true,
          explanation:
            "Technical staff and directly related testing and environments can qualify where linked to R&D activities. Sales commissions and generic marketing spend are normally excluded.",
        },
        {
          id: "option-b",
          label:
            "Include all items because they all relate to the same product the R&D project supported.",
          isCorrect: false,
          explanation:
            "Commercial costs such as sales commission and broad marketing do not become qualifying simply because they support a product that benefited from R&D.",
        },
        {
          id: "option-c",
          label:
            "Exclude the QA contractor because testing is not considered R&D, but include sales and marketing as they are crucial for the success of the innovation.",
          isCorrect: false,
          explanation:
            "Testing can be an integral part of systematic R&D work. Sales and marketing are generally not qualifying R&D expenditure.",
        },
      ],
    },
    exercisePrompt:
      "Draft a short note (4–6 sentences) explaining how you would determine and document staff time apportionments for a mixed R&D / BAU software team working on several projects.",
    quiz: [
      {
        id: "pc-q1",
        type: "multiple_choice",
        question:
          "Which of the following cost types is most likely to be qualifying R&D expenditure in the UK?",
        options: [
          {
            id: "a",
            label: "Salary costs of developers working on resolving technological uncertainties.",
          },
          {
            id: "b",
            label: "Sales commission on contracts won after the new product launch.",
          },
          {
            id: "c",
            label: "General corporate branding and awareness marketing spend.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "Staffing costs for employees directly and actively engaged in resolving technological uncertainties are a core qualifying category.",
      },
      {
        id: "pc-q2",
        type: "true_false",
        question:
          "True or false: 100% of a developer’s salary can always be treated as qualifying R&D expenditure if they worked on at least one R&D project during the year.",
        correctAnswer: false,
        explanation:
          "Where staff work on a mix of qualifying and non‑qualifying activities, a reasonable apportionment should be made and documented.",
      },
      {
        id: "pc-q3",
        type: "multiple_choice",
        question:
          "Which description best fits an 'externally provided worker' (EPW) for UK R&D tax purposes?",
        options: [
          {
            id: "a",
            label:
              "An individual supplied by a staff provider to work under the company’s supervision, where the company pays the provider for their time.",
          },
          {
            id: "b",
            label: "Any subcontractor performing fixed‑price project work offsite.",
          },
          {
            id: "c",
            label: "A temporary admin assistant hired to cover reception during holidays.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "EPWs are individuals provided by a staff provider who work under the company’s direction; they are treated differently from subcontracted project work.",
      },
      {
        id: "pc-q4",
        type: "scenario",
        question:
          "HMRC asks how you arrived at staff apportionment percentages for a project. Which response is most appropriate?",
        options: [
          {
            id: "a",
            label:
              "Explain that the percentages were chosen because they gave a sensible claim size and no further detail is available.",
          },
          {
            id: "b",
            label:
              "Provide a short methodology note referencing sample timesheets, ticket volumes, and manager interviews, with a short note explaining the sampling method.",
          },
          {
            id: "c",
            label:
              "State that apportionments were based on commercial priorities and that no further detail is necessary.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "HMRC expects a reasonable, documented basis for apportionments that can be understood and, if necessary, challenged.",
      },
      {
        id: "pc-q5",
        type: "true_false",
        question:
          "True or false: Success‑based fees paid to an R&D adviser are normally qualifying R&D expenditure for UK tax relief.",
        correctAnswer: false,
        explanation:
          "Success‑based adviser fees are generally not treated as qualifying R&D expenditure in their own right, even though they relate to the claim.",
      },
    ],
  },
  {
    id: "hmrc-enquiry-simulator",
    title: "HMRC Enquiry Simulator",
    description: "Practice responding to HMRC enquiries through interactive AI‑driven simulations.",
    estimatedTime: "60 min",
    lesson: {
      overview:
        "This module prepares you for HMRC enquiries by explaining why enquiries are opened, what typical letters look like, and how to respond in a calm, structured way.",
      keyConcepts: [
        "Enquiries may be random or risk‑based, but the principles of a good response are the same.",
        "Responses should address each HMRC question directly and explicitly, cross‑referencing evidence and BEIS tests.",
        "Tone matters: factual, balanced explanations are more effective than defensive or argumentative language.",
      ],
      realExamples: [
        "An enquiry triggered by a large year‑on‑year increase in qualifying costs where a clear, structured response avoided any adjustment.",
        "A case where vague initial responses led to further questioning until a more detailed, BEIS‑aligned explanation was provided.",
      ],
      commonMistakes: [
        "Responding only partially to HMRC questions or ignoring points that are uncomfortable.",
        "Introducing new, unsupported technical claims in an attempt to 'strengthen' the case.",
        "Allowing correspondence to become emotional or confrontational instead of staying factual.",
      ],
    },
    scenario: {
      id: "enquiry-letter-response",
      title: "First HMRC Enquiry Letter",
      description:
        "You receive an enquiry letter asking why projects in a particular claim should qualify as R&D and requesting evidence to support staff apportionments. The original narratives are fairly high‑level.",
      options: [
        {
          id: "option-a",
          label:
            "Prepare a structured response that restates the BEIS tests, clarifies the technological uncertainties, and attaches a focused evidence pack with an index.",
          isCorrect: true,
          explanation:
            "This approach addresses HMRC's questions clearly and provides the material they need to reach a conclusion.",
        },
        {
          id: "option-b",
          label:
            "Reply briefly stating that the work is clearly R&D and that all details were already included in the original claim.",
          isCorrect: false,
          explanation:
            "This is likely to be seen as unhelpful and may prolong or escalate the enquiry.",
        },
        {
          id: "option-c",
          label:
            "Ignore the letter initially in the hope that HMRC will close the enquiry without further action.",
          isCorrect: false,
          explanation:
            "Missing deadlines or failing to engage increases risk and may lead to adjustments or penalties.",
        },
      ],
    },
    exercisePrompt:
      "Draft a short opening paragraph you could use in a response to an HMRC enquiry, setting a professional tone and explaining how your letter is structured.",
    quiz: [
      {
        id: "hes-q1",
        type: "multiple_choice",
        question:
          "Which of the following is the best way to structure a response to an HMRC enquiry letter?",
        options: [
          {
            id: "a",
            label:
              "Provide a single long narrative covering all points in one blended paragraph.",
          },
          {
            id: "b",
            label:
              "Respond point‑by‑point, using HMRC's question numbers as headings and cross‑referencing relevant evidence.",
          },
          {
            id: "c",
            label:
              "Send the client a copy of the letter and ask them to respond directly without your involvement.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "Point‑by‑point responses make it easy for HMRC to see that each question has been addressed.",
      },
      {
        id: "hes-q2",
        type: "true_false",
        question:
          "True or false: You should avoid referencing the BEIS definition of R&D in an enquiry response because HMRC already know it.",
        correctAnswer: false,
        explanation:
          "Briefly anchoring your explanation back to the BEIS tests helps frame your arguments in the language HMRC expects.",
      },
      {
        id: "hes-q3",
        type: "multiple_choice",
        question:
          "Which situation most likely increases the risk of an enquiry being opened?",
        options: [
          {
            id: "a",
            label: "The company has claimed R&D relief at a consistent level for several years.",
          },
          {
            id: "b",
            label:
              "Qualifying costs have more than doubled year‑on‑year without a clear accompanying explanation.",
          },
          {
            id: "c",
            label: "The claim was submitted a few days before the filing deadline.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "Large, unexplained movements in claim size can attract attention and lead to enquiries.",
      },
      {
        id: "hes-q4",
        type: "scenario",
        question:
          "HMRC questions staff apportionments and asks how you arrived at the percentages. Which response is most appropriate?",
        options: [
          {
            id: "a",
            label:
              "Explain that the percentages were based on documented sampling using tickets and time records, and attach a short methodology note.",
          },
          {
            id: "b",
            label:
              "State that the percentages are commercially sensitive and cannot be shared.",
          },
          {
            id: "c",
            label:
              "Respond that the client simply 'felt' the percentages were correct without further detail.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "HMRC expects a reasonable, documented basis for apportionments that can be understood and, if necessary, challenged.",
      },
      {
        id: "hes-q5",
        type: "true_false",
        question:
          "True or false: It is sometimes appropriate to concede part of a claim if new information shows that certain costs are weakly supported.",
        correctAnswer: true,
        explanation:
          "A sensible, evidence‑based concession can build credibility and help protect the stronger parts of a claim.",
      },
    ],
  },
  {
    id: "ai-claim-critique",
    title: "AI Claim Critique",
    description:
      "Upload draft claims and receive AI analysis highlighting weaknesses and improvement opportunities.",
    estimatedTime: "30–45 min",
    lesson: {
      overview:
        "This module explains how to use AI tools inside RD Companion to review and improve claims while maintaining professional and regulatory standards.",
      keyConcepts: [
        "AI can help spot vague language, missing references to uncertainty, and weak evidence mapping, but it must not replace professional judgement.",
        "All AI‑generated suggestions must be checked against the underlying facts and documents.",
        "Firms should adopt clear guidelines for when and how AI can be used in preparing R&D claims.",
      ],
      realExamples: [
        "Using AI to highlight paragraphs that focus too heavily on commercial benefits rather than technological uncertainty.",
        "Rejecting an AI suggestion that introduced a claim of using complex machine learning where the project actually relied on simpler techniques.",
      ],
      commonMistakes: [
        "Copy‑pasting AI output into a claim without checking for technical accuracy or consistency with evidence.",
        "Allowing AI to invent experiments or evidence that never occurred.",
        "Relying on AI risk scores without understanding the underlying reasoning.",
      ],
    },
    scenario: {
      id: "ai-suggestion-review",
      title: "Reviewing AI Suggestions",
      description:
        "You run a draft narrative through the AI critique tool. It correctly flags some vague wording but also suggests adding a reference to 'proprietary deep learning algorithms' where the project in fact used standard regression models.",
      options: [
        {
          id: "option-a",
          label:
            "Keep the helpful suggestions about clarity but remove or rewrite any technically inaccurate AI suggestions.",
          isCorrect: true,
          explanation:
            "Human review must filter AI output so that only factually accurate, evidence‑backed improvements are adopted.",
        },
        {
          id: "option-b",
          label:
            "Accept all AI suggestions to maximise the apparent complexity of the project.",
          isCorrect: false,
          explanation:
            "Over‑stating technical complexity creates risk and can undermine credibility if challenged.",
        },
        {
          id: "option-c",
          label:
            "Abandon AI tools entirely because they occasionally make incorrect suggestions.",
          isCorrect: false,
          explanation:
            "The goal is to use AI as an assistant, not as a replacement for human judgement. Managed correctly, it can still add value.",
        },
      ],
    },
    exercisePrompt:
      "Run a short draft paragraph (or imagine one) through an AI lens: write down three questions you would ask yourself to check whether the AI's suggestions are factually accurate and properly evidenced.",
    quiz: [
      {
        id: "aiq-q1",
        type: "multiple_choice",
        question:
          "What is the safest way to use AI when preparing an R&D claim narrative?",
        options: [
          {
            id: "a",
            label:
              "Use AI to draft and submit narratives without human review to save time.",
          },
          {
            id: "b",
            label:
              "Use AI to generate suggestions and critique, then have a qualified adviser review and edit the final narrative.",
          },
          {
            id: "c",
            label:
              "Avoid AI entirely because it is not allowed in R&D tax work.",
          },
        ],
        correctOptionId: "b",
        explanation:
          "AI can assist, but responsibility for accuracy and compliance remains with the human adviser.",
      },
      {
        id: "aiq-q2",
        type: "true_false",
        question:
          "True or false: If AI suggests adding details that are not supported by the evidence, you may include them as long as they are technically plausible.",
        correctAnswer: false,
        explanation:
          "Every statement in a claim must be supported by facts and evidence, not just technical plausibility.",
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
            label: "Inventing additional R&D projects to increase the size of the claim.",
          },
          {
            id: "c",
            label: "Suggesting that all projects should be described as 'ground‑breaking'.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "Spotting vague or commercial language can help you tighten narratives while staying within the facts.",
      },
      {
        id: "aiq-q4",
        type: "scenario",
        question:
          "The AI critique tool flags that a project description does not mention any failed approaches. In reality, the team tried several prototypes that did not work. What should you do?",
        options: [
          {
            id: "a",
            label:
              "Update the narrative to briefly describe the failed approaches and what was learned from them.",
          },
          {
            id: "b",
            label:
              "Ignore the suggestion because failure is embarrassing for the client.",
          },
          {
            id: "c",
            label:
              "Delete the project from the claim altogether.",
          },
        ],
        correctOptionId: "a",
        explanation:
          "Describing failed approaches can strengthen the case for genuine technological uncertainty and systematic investigation.",
      },
      {
        id: "aiq-q5",
        type: "true_false",
        question:
          "True or false: You should keep a record of how AI tools were used in claim preparation as part of your working papers.",
        correctAnswer: true,
        explanation:
          "Documenting how AI was used helps demonstrate that you have appropriate controls and that final responsibility rests with human reviewers.",
      },
    ],
  },
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

function calculateModuleProgress(
  scenarioState: ScenarioState,
  quizState: QuizState,
  exerciseSubmitted: boolean
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
  completedSegments += 1;

  return Math.round((completedSegments / totalSegments) * 100);
}

export default function StaffAcademyModulePage() {
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

  const persistModuleProgress = async (scorePercent: number, passed: boolean): Promise<void> => {
    if (!moduleConfig) return;

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

  const handleQuizSubmit = async () => {
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
                    onClick={() => router.push("/staff/academy")}
                    className="border-slate-700 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Back to Academy
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(260px,1fr)]">
              <div className="space-y-6">
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
      </StaffLayout>
    </>
  );
}