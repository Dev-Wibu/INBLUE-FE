import type { TFunction } from "i18next";

const SUPPORTED_LOCALES = ["en", "vi", "ja"] as const;

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .toLocaleLowerCase();
}

function getTranslationVariants(key: string, t: TFunction): Set<string> {
  return new Set(SUPPORTED_LOCALES.map((lng) => normalizeText(t(key, { lng }))).filter(Boolean));
}

function isBuiltInValue(value: unknown, keys: string[], t: TFunction): boolean {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return false;

  return keys.some((key) => getTranslationVariants(key, t).has(normalizedValue));
}

function normalizeRoundType(roundType: string | null | undefined): string {
  return normalizeText(roundType)
    .replace(/[\s-]+/g, "_")
    .toUpperCase()
    .replace("MENTROR", "MENTOR");
}

const ROUND_NAME_KEYS: Record<string, string[]> = {
  CV_SCREENING: ["common.roundType.CV_SCREENING", "userApplication.cvScreening.roundLabel"],
  EMAIL_SIMULATOR: [
    "common.roundType.EMAIL_SIMULATOR",
    "userApplication.emailSimulator.roundLabel",
  ],
  QUIZ: ["common.roundType.QUIZ", "userApplication.quiz.roundLabel"],
  CODING: ["common.roundType.CODING", "userApplication.coding.roundLabel"],
  CODE_REVIEW: ["common.roundType.CODE_REVIEW", "userApplication.codeReview.codeReviewRound"],
  AI_INTERVIEW: ["common.roundType.AI_INTERVIEW", "userApplication.aiInterview.roundLabel"],
  MENTOR_REVIEW: [
    "userApplication.mentorReview.mentorReview",
    "common.roundType.MENTOR_REVIEW",
    "common.roundType.MENTROR_REVIEW",
    "adminInterviewTemplate.mentorReview.title",
  ],
};

const ROUND_INSTRUCTION_KEYS: Record<string, string[]> = {
  CV_SCREENING: [
    "userApplicationhistory.cvInstructionDefault",
    "userApplication.cvScreening.noDataUploadHint",
  ],
  EMAIL_SIMULATOR: [
    "task.replyComplaintEmail",
    "userApplication.emailSimulator.emailInstructionDefault",
  ],
  QUIZ: ["task.takeTheoryQuiz", "userApplication.quiz.examInstructionsDefault"],
  CODING: ["task.completeCodingExercises", "userApplication.coding.examInstructions"],
  CODE_REVIEW: ["task.reviewSourceCode", "userApplication.codeReview.codeReviewInstructions"],
  AI_INTERVIEW: ["task.interviewWithAI", "userApplication.aiInterview.roundDescription"],
  MENTOR_REVIEW: ["task.interviewWithMentor"],
};

function matchesBuiltInRoundName(value: string, roundType: string): boolean {
  switch (roundType) {
    case "CV_SCREENING":
      return /\b(cv|resume|curriculum vitae)\b.*\b(screen|screening|review)|lọc\s+cv/.test(value);
    case "EMAIL_SIMULATOR":
      return /email\s*(simulator|simulation)|mô\s*phỏng\s*email/.test(value);
    case "QUIZ":
      return /\bquiz\b|trắc\s*nghiệm|theory/.test(value);
    case "CODING":
      return /\bcoding\b|lập\s*trình/.test(value);
    case "CODE_REVIEW":
      return /code\s*review|review\s*(đoạn|source|mã)|đánh\s*giá\s*mã/.test(value);
    case "AI_INTERVIEW":
      return /ai\s*interview|interview\s*ai|phỏng\s*vấn\s*ai/.test(value);
    case "MENTOR_REVIEW":
      return /mentor\s*(review|interview)|đánh\s*giá\s*mentor|phỏng\s*vấn\s*mentor/.test(value);
    default:
      return false;
  }
}

function matchesBuiltInInstruction(value: string, roundType: string): boolean {
  switch (roundType) {
    case "CV_SCREENING":
      return /(upload|submit|tải|nộp).*(cv|resume).*(pdf)/.test(value);
    case "AI_INTERVIEW":
      return /interview.*(ai|kiosk)|phỏng\s*vấn.*ai/.test(value);
    case "MENTOR_REVIEW":
      return /interview.*mentor|phỏng\s*vấn.*mentor/.test(value);
    case "QUIZ":
      return /quiz|trắc\s*nghiệm|lý\s*thuyết/.test(value);
    case "CODING":
      return /coding|programming|lập\s*trình/.test(value);
    case "CODE_REVIEW":
      return /code\s*review|review.*code|review.*mã|mã\s*nguồn/.test(value);
    case "EMAIL_SIMULATOR":
      return /email.*(complaint|customer|khách)|phản\s*hồi.*email/.test(value);
    default:
      return false;
  }
}

/**
 * Translates built-in instructions persisted by older templates while keeping
 * custom instructions authored by an admin intact.
 */
export function localizeRoundInstruction(
  instruction: unknown,
  roundType: string | null | undefined,
  t: TFunction
): string {
  const rawInstruction = typeof instruction === "string" ? instruction.trim() : "";
  if (!rawInstruction) return "";

  const normalizedValue = normalizeText(rawInstruction);
  const type =
    normalizeRoundType(roundType) ||
    Object.keys(ROUND_INSTRUCTION_KEYS).find((candidate) =>
      matchesBuiltInInstruction(normalizedValue, candidate)
    ) ||
    "";
  const instructionKeys = ROUND_INSTRUCTION_KEYS[type] ?? [];
  if (
    instructionKeys.some((key) => isBuiltInValue(rawInstruction, [key], t)) ||
    matchesBuiltInInstruction(normalizedValue, type)
  ) {
    return t(instructionKeys[0]);
  }

  return rawInstruction;
}

/**
 * Translates the standard mentor round label without changing custom round
 * names that may have been configured for a particular job description.
 */
export function localizeRoundName(
  name: unknown,
  roundType: string | null | undefined,
  t: TFunction
): string {
  const rawName = typeof name === "string" ? name.trim() : "";
  if (!rawName) {
    return rawName;
  }

  const normalizedValue = normalizeText(rawName);
  const type =
    normalizeRoundType(roundType) ||
    Object.keys(ROUND_NAME_KEYS).find((candidate) =>
      matchesBuiltInRoundName(normalizedValue, candidate)
    ) ||
    "";
  const builtInNameKeys = ROUND_NAME_KEYS[type] ?? [];
  if (
    builtInNameKeys.some((key) => isBuiltInValue(rawName, [key], t)) ||
    matchesBuiltInRoundName(normalizedValue, type)
  ) {
    return t(builtInNameKeys[0] ?? `common.roundType.${type}`);
  }

  return rawName;
}
