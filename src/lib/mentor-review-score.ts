export const MENTOR_REVIEW_SCORE_MIN = 0;
export const MENTOR_REVIEW_SCORE_MAX = 100;

export type MentorReviewScoreBand = "excellent" | "strong" | "meets" | "developing" | "low";
export type MentorReviewScoreRange = "all" | "excellent" | "strong" | "meets" | "developing";

export function normalizeMentorReviewScore(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return MENTOR_REVIEW_SCORE_MIN;
  return Math.min(MENTOR_REVIEW_SCORE_MAX, Math.max(MENTOR_REVIEW_SCORE_MIN, numericValue));
}

export function isValidMentorReviewScore(value: unknown, requirePositive = false): boolean {
  const numericValue = typeof value === "number" ? value : Number(value);
  return (
    Number.isFinite(numericValue) &&
    numericValue >= (requirePositive ? 1 : MENTOR_REVIEW_SCORE_MIN) &&
    numericValue <= MENTOR_REVIEW_SCORE_MAX
  );
}

export function formatMentorReviewScore(value: unknown): string {
  const score = normalizeMentorReviewScore(value);
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function getMentorReviewScoreBand(value: unknown): MentorReviewScoreBand {
  const score = normalizeMentorReviewScore(value);
  if (score >= 90) return "excellent";
  if (score >= 75) return "strong";
  if (score >= 60) return "meets";
  if (score >= 40) return "developing";
  return "low";
}

export function calculateAverageMentorReviewScore(
  reviews: Array<{ rating?: number | null }>
): number {
  const scores = reviews
    .map((review) => review.rating)
    .filter((rating): rating is number => isValidMentorReviewScore(rating));
  if (scores.length === 0) return 0;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function matchesMentorReviewScoreRange(
  value: unknown,
  range: MentorReviewScoreRange
): boolean {
  if (range === "all") return true;
  const score = normalizeMentorReviewScore(value);
  if (range === "excellent") return score >= 90;
  if (range === "strong") return score >= 75 && score < 90;
  if (range === "meets") return score >= 60 && score < 75;
  return score < 60;
}
