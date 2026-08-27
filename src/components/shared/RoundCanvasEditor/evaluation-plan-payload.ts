import { normalizeEvaluationPlan } from "./evaluation-plan-normalization";
import type { UIEvaluationPlan } from "./types";

/** Creates a request-safe copy so editor state is never shared with an API payload. */
export function toEvaluationPlanPayload(
  evaluationPlan?: UIEvaluationPlan
): UIEvaluationPlan | undefined {
  const normalizedPlan = normalizeEvaluationPlan(evaluationPlan);
  if (!normalizedPlan) return undefined;

  return {
    metrics: (normalizedPlan.metrics ?? []).map((metric) => ({
      code: metric.code?.trim(),
      name: metric.name?.trim(),
      description: metric.description?.trim(),
      weight: metric.weight,
      maxScore: metric.maxScore,
      required: metric.required ?? false,
      minimumScore: metric.minimumScore,
    })),
    scoringInstruction: normalizedPlan.scoringInstruction?.trim(),
    passRule: normalizedPlan.passRule?.trim(),
  };
}
