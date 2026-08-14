export function normalizeFiveStarRating(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;

  const fiveStarValue = numericValue > 5 ? numericValue / 2 : numericValue;
  return Math.min(5, Math.max(0, fiveStarValue));
}
