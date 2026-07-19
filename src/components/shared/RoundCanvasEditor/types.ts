export type RoundType =
  | "CV_SCREENING"
  | "EMAIL_SIMULATOR"
  | "QUIZ"
  | "CODING"
  | "CODE_REVIEW"
  | "MENTROR_REVIEW"
  | "MENTOR_REVIEW"
  | "AI_INTERVIEW";

export interface UIRoundConfig {
  instruction?: string;
  submissionFormat?: string;
  timeLimitMinutes?: number;
  maxScore?: number;
  aiSystemPrompt?: string;
  evaluationCriteria?: string;
  quizQuestions?: {
    questionText?: string;
    options?: string[];
    correctAnswer?: string;
    points?: number;
  }[];
  codingProblemsId?: number[];
  codingProblems?: { problemId?: number; title?: string; difficulty?: string }[];
  codeReviewProblemsId?: number[];
  codeReviewProblems?: {
    problemId?: number;
    title?: string;
    difficulty?: string;
    language?: string;
  }[];
}

export interface UIRound {
  id?: number;
  name?: string;
  roundOrder?: number;
  roundType?: RoundType;
  passThreshold?: number;
  configData?: UIRoundConfig;
}
