import { Bot, Code2, Eye, FileText, HelpCircle, Mail, UserCheck } from "lucide-react";
import React from "react";
import type { RoundType, UIRoundConfig } from "./types";

export const getAvailableRoundsTemplates = (
  t: (key: string) => string
): {
  type: RoundType;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  defaultConfig: UIRoundConfig;
}[] => [
  {
    type: "CV_SCREENING",
    title: t("adminInterviewTemplate.cvScreening.title"),
    description: t("adminInterviewTemplate.cvScreening.description"),
    color: "text-blue-500 border-blue-500/20",
    bgColor: "bg-blue-500/10",
    icon: <FileText className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("cv.uploadPdfOnly"),
      submissionFormat: "pdf",
    },
  },
  {
    type: "EMAIL_SIMULATOR",
    title: t("adminInterviewTemplate.emailSimulator.title"),
    description: t("adminInterviewTemplate.emailSimulator.description"),
    color: "text-purple-500 border-purple-500/20",
    bgColor: "bg-purple-500/10",
    icon: <Mail className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("task.replyComplaintEmail"),
      timeLimitMinutes: 15,
    },
  },
  {
    type: "QUIZ",
    title: t("adminInterviewTemplate.quiz.title"),
    description: t("adminInterviewTemplate.quiz.description"),
    color: "text-amber-500 border-amber-500/20",
    bgColor: "bg-amber-500/10",
    icon: <HelpCircle className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("task.takeTheoryQuiz"),
      timeLimitMinutes: 20,
      quizQuestions: [],
    },
  },
  {
    type: "CODING",
    title: t("adminInterviewTemplate.coding.title"),
    description: t("adminInterviewTemplate.coding.description"),
    color: "text-emerald-500 border-emerald-500/20",
    bgColor: "bg-emerald-500/10",
    icon: <Code2 className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("task.completeCodingExercises"),
      timeLimitMinutes: 45,
      codingProblemsId: [],
    },
  },
  {
    type: "CODE_REVIEW",
    title: t("adminInterviewTemplate.codeReview.title"),
    description: t("adminInterviewTemplate.codeReview.description"),
    color: "text-teal-500 border-teal-500/20",
    bgColor: "bg-teal-500/10",
    icon: <Eye className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("task.reviewSourceCode"),
      timeLimitMinutes: 30,
      codeReviewProblemsId: [],
      codeReviewProblems: [],
    },
  },
  {
    type: "MENTROR_REVIEW",
    title: t("adminInterviewTemplate.mentorReview.title"),
    description: t("adminInterviewTemplate.mentorReview.description"),
    color: "text-rose-500 border-rose-500/20",
    bgColor: "bg-rose-500/10",
    icon: <UserCheck className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("task.interviewWithMentor"),
    },
  },
  {
    type: "AI_INTERVIEW",
    title: t("adminInterviewTemplate.aiInterview.title"),
    description: t("adminInterviewTemplate.aiInterview.description"),
    color: "text-indigo-500 border-indigo-500/20",
    bgColor: "bg-indigo-500/10",
    icon: <Bot className="h-5 w-5" />,
    defaultConfig: {
      instruction: t("task.interviewWithAI"),
      timeLimitMinutes: 20,
      aiSystemPrompt: t("task.techRecruiterRole"),
      evaluationCriteria: t("task.evaluationCriteria"),
    },
  },
];
