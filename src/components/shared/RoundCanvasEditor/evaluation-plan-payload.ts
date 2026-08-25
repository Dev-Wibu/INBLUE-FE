import type { UIEvaluationPlan } from "./types";

/** Creates a request-safe copy so editor state is never shared with an API payload. */
export function toEvaluationPlanPayload(
  evaluationPlan?: UIEvaluationPlan
): UIEvaluationPlan | undefined {
  if (!evaluationPlan) return undefined;

  return {
    metrics: (evaluationPlan.metrics ?? []).map((metric) => ({
      code: metric.code?.trim(),
      name: metric.name?.trim(),
      description: metric.description?.trim(),
      weight: metric.weight,
      maxScore: metric.maxScore,
      required: metric.required ?? false,
      minimumScore: metric.minimumScore,
    })),
    scoringInstruction: evaluationPlan.scoringInstruction?.trim(),
    passRule: evaluationPlan.passRule?.trim(),
  };
}
