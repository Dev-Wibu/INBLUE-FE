export type AiInterviewScoreScale = "ten" | "hundred" | "auto";

const SCORE_MIN = 0;
const SCORE_MAX = 100;

/**
 * Converts legacy AI Interview scores to the product-wide display scale
 * (0-100). Session overallScore is already stored on 100. The auto scale is
 * only for legacy finalScore values where a missing HR score leaves the source
 * ambiguous.
 */
export function normalizeAiInterviewScore(
  value: unknown,
  scale: AiInterviewScoreScale = "ten"
): number | null {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const scoreOnHundred =
    scale === "ten" || (scale === "auto" && numericValue <= 10) ? numericValue * 10 : numericValue;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, scoreOnHundred));
}

export function normalizeAiInterviewSessionScore(value: unknown): number | null {
  return normalizeAiInterviewScore(value, "hundred");
}

export function formatAiInterviewScore(
  value: unknown,
  scale: AiInterviewScoreScale = "ten"
): string | null {
  const score = normalizeAiInterviewScore(value, scale);
  return score === null ? null : String(Math.round(score));
}
