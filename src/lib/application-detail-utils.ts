import type { components } from "../../schema-from-be";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type SubmissionData = components["schemas"]["SubmissionData"];

/**
 * Round types that do NOT require HR scoring.
 * These rounds are auto-graded by backend and should be hidden from HR grading UI.
 */
export const AUTO_GRADED_ROUND_TYPES = [
  "QUIZ",
  "CV_SCREENING",
  "EMAIL_SIMULATOR",
  "CODE_REVIEW",
  "AI_INTERVIEW",
] as const;

/**
 * Round types that require HR scoring.
 */
export const HR_SCORING_REQUIRED_ROUND_TYPES = ["CODING", "MENTOR_REVIEW", "CV_SCREENING"] as const;

/**
 * Infer the round type from ApplicationDetail submission data.
 * This is a heuristic since ApplicationDetail doesn't contain roundType directly.
 */
export function inferRoundType(detail: ApplicationDetail): string | null {
  const data = detail.submissionData as SubmissionData | undefined;
  if (!data) return null;

  if (data.quizAnswers && data.quizAnswers.length > 0) {
    return "QUIZ";
  }
  if (data.codeSubmissions && data.codeSubmissions.length > 0) {
    return "CODING";
  }
  if (data.codeReviewSubmissions && data.codeReviewSubmissions.length > 0) {
    return "CODE_REVIEW";
  }
  if (data.textContent) {
    if (
      data.textContent.includes("To:") ||
      data.textContent.includes("Subject:") ||
      data.textContent.includes("Dear") ||
      data.textContent.includes("Kính gửi")
    ) {
      return "EMAIL_SIMULATOR";
    }
  }
  return null;
}

/**
 * Check if an ApplicationDetail is a QUIZ round.
 * QUIZ rounds have quizAnswers in their submissionData.
 * Backend auto-grades QUIZ and calls moveToNextRound() automatically.
 */
export function isQuizRound(detail: ApplicationDetail): boolean {
  const data = detail.submissionData as SubmissionData | undefined;
  return (
    data?.quizAnswers !== undefined && data?.quizAnswers !== null && data?.quizAnswers.length > 0
  );
}

/**
 * Check if an ApplicationDetail is a round that should NOT be graded by HR.
 * Auto-graded rounds include: QUIZ, CODE_REVIEW, EMAIL_SIMULATOR
 * These rounds are handled by backend automatically.
 */
export function isAutoGradedRound(detail: ApplicationDetail): boolean {
  const inferredType = inferRoundType(detail);
  if (inferredType === "QUIZ") return true;
  if (inferredType === "CODE_REVIEW") return true;
  if (inferredType === "EMAIL_SIMULATOR") return true;

  // IMPORTANT: CV_SCREENING has AI feedback but requires human HR review
  // Do NOT auto-filter CV rounds even if they have finalScore
  // The fallback below was incorrectly filtering CV_SCREENING as auto-graded
  // CV_SCREENING rounds need human scoring, not backend automation

  return false;
}

/**
 * Filter out auto-graded rounds (like QUIZ) from a list of ApplicationDetails.
 * These rounds should not appear in HR grading UI because:
 * - Backend auto-grades them and calls moveToNextRound() automatically
 * - Calling hr-score endpoint on them causes double round advancement
 *
 * Bug scenario: Vòng 3 = Quiz, Vòng 4 = Coding
 * - Quiz tự động chấm điểm + moveToNextRound() → Application sang vòng 4
 * - Nếu FE hiển thị Quiz trong danh sách HR chấm → HR click "Chấm"
 * - hr-score được gọi cho Quiz → nhảy thêm 1 vòng → bỏ qua Coding (vòng 4)
 */
export function filterOutAutoGradedRounds(details: ApplicationDetail[]): ApplicationDetail[] {
  return details.filter((detail) => !isAutoGradedRound(detail));
}

/**
 * Check if an ApplicationDetail needs HR scoring.
 * Returns true only for rounds that:
 * - Are NOT auto-graded (not QUIZ, etc.)
 * - Have status AI_EVALUATED
 * - Have no existing hrScore
 */
export function needsHrScoring(detail: ApplicationDetail): boolean {
  if (isAutoGradedRound(detail)) return false;
  return (
    detail.status === "AI_EVALUATED" && (detail.hrScore === undefined || detail.hrScore === null)
  );
}
