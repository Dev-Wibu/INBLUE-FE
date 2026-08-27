import type { UIEvaluationPlan } from "./types";

export function normalizeEvaluationPlan(
  evaluationPlan?: UIEvaluationPlan | null
): UIEvaluationPlan | undefined {
  if (!evaluationPlan) return undefined;

  return {
    metrics: (evaluationPlan.metrics ?? []).map((metric) => ({
      code: metric.code,
      name: metric.name,
      description: metric.description,
      weight: metric.weight,
      maxScore: metric.maxScore,
      required: metric.required ?? false,
      minimumScore: metric.minimumScore == null ? null : metric.minimumScore,
    })),
    scoringInstruction: evaluationPlan.scoringInstruction,
    passRule: evaluationPlan.passRule,
  };
}
