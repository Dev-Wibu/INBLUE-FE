import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { localizeRoundInstruction, localizeRoundName } from "./round-localization";

const translations: Record<string, Record<string, string>> = {
  "task.takeTheoryQuiz": {
    en: "Take the theory multiple-choice test.",
    vi: "Làm bài kiểm tra trắc nghiệm lý thuyết.",
    ja: "理論の選択式テストを受けてください。",
  },
  "task.interviewWithMentor": {
    en: "Conduct a direct interview with a Mentor.",
    vi: "Thực hiện phỏng vấn trực tiếp với Mentor.",
    ja: "メンターと直接面接を行ってください。",
  },
  "userApplication.mentorReview.mentorReview": {
    en: "MENTOR REVIEW",
    vi: "ĐÁNH GIÁ MENTOR",
    ja: "メンター評価",
  },
  "common.roundType.CV_SCREENING": {
    en: "CV Screening",
    vi: "Lọc CV",
    ja: "CV審査",
  },
  "common.roundType.EMAIL_SIMULATOR": {
    en: "Email Simulator",
    vi: "Mô phỏng Email",
    ja: "メールシミュレーター",
  },
  "common.roundType.QUIZ": {
    en: "Quiz",
    vi: "Trắc nghiệm",
    ja: "クイズ",
  },
  "common.roundType.CODING": {
    en: "Coding",
    vi: "Lập trình",
    ja: "コーディング",
  },
  "common.roundType.CODE_REVIEW": {
    en: "Code Review",
    vi: "Đánh giá Code",
    ja: "コードレビュー",
  },
  "common.roundType.AI_INTERVIEW": {
    en: "AI Interview",
    vi: "Phỏng vấn AI",
    ja: "AI面接",
  },
  "common.roundType.MENTOR_REVIEW": {
    en: "Mentor Interview",
    vi: "Đánh giá Mentor",
    ja: "メンター面接",
  },
  "common.roundType.MENTROR_REVIEW": {
    en: "Mentor Interview",
    vi: "Đánh giá Mentor",
    ja: "メンター面接",
  },
  "adminInterviewTemplate.mentorReview.title": {
    en: "Mentor Evaluation",
    vi: "Đánh giá Mentor",
    ja: "メンター評価",
  },
};

const t = ((key: string, options?: { lng?: string }) => {
  return translations[key]?.[options?.lng ?? "en"] ?? key;
}) as unknown as TFunction;

describe("round localization", () => {
  it("localizes persisted quiz instructions", () => {
    expect(localizeRoundInstruction("Làm bài kiểm tra trắc nghiệm lý thuyết.", "QUIZ", t)).toBe(
      "Take the theory multiple-choice test."
    );
  });

  it("localizes persisted mentor instructions", () => {
    expect(
      localizeRoundInstruction("Thực hiện phỏng vấn trực tiếp với Mentor.", "MENTROR_REVIEW", t)
    ).toBe("Conduct a direct interview with a Mentor.");
  });

  it("keeps custom instructions and labels unchanged", () => {
    expect(localizeRoundInstruction("Review the portfolio carefully.", "QUIZ", t)).toBe(
      "Review the portfolio carefully."
    );
    expect(localizeRoundName("Architecture Interview", "MENTOR_REVIEW", t)).toBe(
      "Architecture Interview"
    );
  });

  it("localizes the built-in mentor round name", () => {
    expect(localizeRoundName("ĐÁNH GIÁ MENTOR", "MENTOR_REVIEW", t)).toBe("MENTOR REVIEW");
  });

  it("localizes persisted candidate round names", () => {
    expect(localizeRoundName("Round 1: CV Screening", "CV_SCREENING", t)).toBe("CV Screening");
    expect(localizeRoundName("Mô phỏng Email", "EMAIL_SIMULATOR", t)).toBe("Email Simulator");
    expect(localizeRoundName("Trắc nghiệm", "QUIZ", t)).toBe("Quiz");
    expect(localizeRoundName("Lập trình", "CODING", t)).toBe("Coding");
    expect(localizeRoundName("Đánh giá Code", "CODE_REVIEW", t)).toBe("Code Review");
    expect(localizeRoundName("Phỏng vấn AI", "AI_INTERVIEW", t)).toBe("AI Interview");
  });
});
