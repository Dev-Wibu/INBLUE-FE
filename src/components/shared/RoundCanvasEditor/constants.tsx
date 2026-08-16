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

export interface PrebuiltProcessTemplate {
  id: string | number;
  name: string;
  category?: string;
  description: string;
  roundCount: number;
  badgeColor?: string;
  rounds: UIRound[];
}

export const getPrebuiltProcessTemplates = (
  t: (key: string) => string
): PrebuiltProcessTemplate[] => [
  {
    id: "fullstack-std",
    name: "Quy trình Full-Stack Tiêu chuẩn",
    category: "Developer",
    description: "CV → AI Interview → Quiz → Coding → Code Review → Mentor",
    roundCount: 6,
    badgeColor:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    rounds: [
      {
        roundOrder: 1,
        name: t("adminInterviewTemplate.cvScreening.title"),
        roundType: "CV_SCREENING",
        passThreshold: 60,
        configData: { instruction: t("cv.uploadPdfOnly"), submissionFormat: "pdf" },
      },
      {
        roundOrder: 2,
        name: t("adminInterviewTemplate.aiInterview.title"),
        roundType: "AI_INTERVIEW",
        passThreshold: 65,
        configData: { instruction: t("task.interviewWithAI"), timeLimitMinutes: 20 },
      },
      {
        roundOrder: 3,
        name: t("adminInterviewTemplate.quiz.title"),
        roundType: "QUIZ",
        passThreshold: 70,
        configData: {
          instruction: t("task.takeTheoryQuiz"),
          timeLimitMinutes: 25,
          quizQuestions: [],
        },
      },
      {
        roundOrder: 4,
        name: t("adminInterviewTemplate.coding.title"),
        roundType: "CODING",
        passThreshold: 70,
        configData: {
          instruction: t("task.completeCodingExercises"),
          timeLimitMinutes: 60,
          codingProblemsId: [],
        },
      },
      {
        roundOrder: 5,
        name: t("adminInterviewTemplate.codeReview.title"),
        roundType: "CODE_REVIEW",
        passThreshold: 70,
        configData: {
          instruction: t("task.reviewSourceCode"),
          timeLimitMinutes: 30,
          codeReviewProblemsId: [],
          codeReviewProblems: [],
        },
      },
      {
        roundOrder: 6,
        name: t("adminInterviewTemplate.mentorReview.title"),
        roundType: "MENTOR_REVIEW",
        passThreshold: 75,
        configData: { instruction: t("task.interviewWithMentor") },
      },
    ],
  },
  {
    id: "dev-standard",
    name: "Quy trình Lập trình viên Backend / Frontend",
    category: "Engineering",
    description: "CV → Quiz → Coding → Code Review → Mentor",
    roundCount: 5,
    badgeColor:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    rounds: [
      {
        roundOrder: 1,
        name: t("adminInterviewTemplate.cvScreening.title"),
        roundType: "CV_SCREENING",
        passThreshold: 60,
        configData: { instruction: t("cv.uploadPdfOnly"), submissionFormat: "pdf" },
      },
      {
        roundOrder: 2,
        name: t("adminInterviewTemplate.quiz.title"),
        roundType: "QUIZ",
        passThreshold: 65,
        configData: {
          instruction: t("task.takeTheoryQuiz"),
          timeLimitMinutes: 20,
          quizQuestions: [],
        },
      },
      {
        roundOrder: 3,
        name: t("adminInterviewTemplate.coding.title"),
        roundType: "CODING",
        passThreshold: 70,
        configData: {
          instruction: t("task.completeCodingExercises"),
          timeLimitMinutes: 45,
          codingProblemsId: [],
        },
      },
      {
        roundOrder: 4,
        name: t("adminInterviewTemplate.codeReview.title"),
        roundType: "CODE_REVIEW",
        passThreshold: 70,
        configData: {
          instruction: t("task.reviewSourceCode"),
          timeLimitMinutes: 30,
          codeReviewProblemsId: [],
          codeReviewProblems: [],
        },
      },
      {
        roundOrder: 5,
        name: t("adminInterviewTemplate.mentorReview.title"),
        roundType: "MENTOR_REVIEW",
        passThreshold: 75,
        configData: { instruction: t("task.interviewWithMentor") },
      },
    ],
  },
  {
    id: "fresher-intern",
    name: "Quy trình Fresher / Intern Developer",
    category: "Junior",
    description: "CV → Quiz → Phỏng vấn AI → Mentor",
    roundCount: 4,
    badgeColor:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    rounds: [
      {
        roundOrder: 1,
        name: t("adminInterviewTemplate.cvScreening.title"),
        roundType: "CV_SCREENING",
        passThreshold: 50,
        configData: { instruction: t("cv.uploadPdfOnly"), submissionFormat: "pdf" },
      },
      {
        roundOrder: 2,
        name: t("adminInterviewTemplate.quiz.title"),
        roundType: "QUIZ",
        passThreshold: 60,
        configData: {
          instruction: t("task.takeTheoryQuiz"),
          timeLimitMinutes: 20,
          quizQuestions: [],
        },
      },
      {
        roundOrder: 3,
        name: t("adminInterviewTemplate.aiInterview.title"),
        roundType: "AI_INTERVIEW",
        passThreshold: 65,
        configData: { instruction: t("task.interviewWithAI"), timeLimitMinutes: 15 },
      },
      {
        roundOrder: 4,
        name: t("adminInterviewTemplate.mentorReview.title"),
        roundType: "MENTOR_REVIEW",
        passThreshold: 70,
        configData: { instruction: t("task.interviewWithMentor") },
      },
    ],
  },
  {
    id: "fast-track",
    name: "Quy trình Tuyển dụng Rút gọn",
    category: "Fast Track",
    description: "CV → Coding → Mentor",
    roundCount: 3,
    badgeColor:
      "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    rounds: [
      {
        roundOrder: 1,
        name: t("adminInterviewTemplate.cvScreening.title"),
        roundType: "CV_SCREENING",
        passThreshold: 60,
        configData: { instruction: t("cv.uploadPdfOnly"), submissionFormat: "pdf" },
      },
      {
        roundOrder: 2,
        name: t("adminInterviewTemplate.coding.title"),
        roundType: "CODING",
        passThreshold: 70,
        configData: {
          instruction: t("task.completeCodingExercises"),
          timeLimitMinutes: 45,
          codingProblemsId: [],
        },
      },
      {
        roundOrder: 3,
        name: t("adminInterviewTemplate.mentorReview.title"),
        roundType: "MENTOR_REVIEW",
        passThreshold: 75,
        configData: { instruction: t("task.interviewWithMentor") },
      },
    ],
  },
  {
    id: "softskills-focus",
    name: "Quy trình Đánh giá Kỹ năng Mềm",
    category: "Operations",
    description: "CV → AI Interview → Email Simulator → Mentor",
    roundCount: 4,
    badgeColor:
      "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    rounds: [
      {
        roundOrder: 1,
        name: t("adminInterviewTemplate.cvScreening.title"),
        roundType: "CV_SCREENING",
        passThreshold: 60,
        configData: { instruction: t("cv.uploadPdfOnly"), submissionFormat: "pdf" },
      },
      {
        roundOrder: 2,
        name: t("adminInterviewTemplate.aiInterview.title"),
        roundType: "AI_INTERVIEW",
        passThreshold: 70,
        configData: { instruction: t("task.interviewWithAI"), timeLimitMinutes: 20 },
      },
      {
        roundOrder: 3,
        name: t("adminInterviewTemplate.emailSimulator.title"),
        roundType: "EMAIL_SIMULATOR",
        passThreshold: 70,
        configData: { instruction: t("task.replyComplaintEmail"), timeLimitMinutes: 20 },
      },
      {
        roundOrder: 4,
        name: t("adminInterviewTemplate.mentorReview.title"),
        roundType: "MENTOR_REVIEW",
        passThreshold: 75,
        configData: { instruction: t("task.interviewWithMentor") },
      },
    ],
  },
];
