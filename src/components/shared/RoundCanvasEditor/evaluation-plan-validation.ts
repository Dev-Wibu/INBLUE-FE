import type { UIEvaluationPlan } from "./types";

export const EVALUATION_SCORE_MAX = 100;
export const METRIC_CODE_MAX_LENGTH = 50;
export const METRIC_NAME_MAX_LENGTH = 100;
export const METRIC_DESCRIPTION_MAX_LENGTH = 500;
export const EVALUATION_INSTRUCTION_MAX_LENGTH = 1000;

export type EvaluationValidationCode =
  | "required"
  | "invalidCode"
  | "duplicateCode"
  | "tooLong"
  | "invalidWeight"
  | "invalidMaxScore"
  | "invalidMinimumScore"
  | "requiredMinimumScore"
  | "invalidTotalWeight";

export interface EvaluationMetricValidationErrors {
  code?: EvaluationValidationCode;
  name?: EvaluationValidationCode;
  description?: EvaluationValidationCode;
  weight?: EvaluationValidationCode;
  maxScore?: EvaluationValidationCode;
  minimumScore?: EvaluationValidationCode;
}

export interface EvaluationPlanValidationResult {
  isValid: boolean;
  metricErrors: EvaluationMetricValidationErrors[];
  totalWeight?: EvaluationValidationCode;
  scoringInstruction?: EvaluationValidationCode;
  passRule?: EvaluationValidationCode;
}

const METRIC_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

export function validateEvaluationPlan(plan?: UIEvaluationPlan): EvaluationPlanValidationResult {
  const metrics = plan?.metrics ?? [];
  if (metrics.length === 0) {
    return { isValid: true, metricErrors: [] };
  }

  const normalizedCodes = metrics.map((metric) => metric.code?.trim().toUpperCase() ?? "");
  const duplicateCodes = new Set(
    normalizedCodes.filter(
      (code, index) => code.length > 0 && normalizedCodes.indexOf(code) !== index
    )
  );

  const metricErrors = metrics.map<EvaluationMetricValidationErrors>((metric, index) => {
    const errors: EvaluationMetricValidationErrors = {};
    const code = metric.code?.trim() ?? "";
    const name = metric.name?.trim() ?? "";
    const description = metric.description?.trim() ?? "";
    const weight = metric.weight;
    const maxScore = metric.maxScore;
    const minimumScore = metric.minimumScore;

    if (!code) errors.code = "required";
    else if (code.length > METRIC_CODE_MAX_LENGTH) errors.code = "tooLong";
    else if (!METRIC_CODE_PATTERN.test(code)) errors.code = "invalidCode";
    else if (duplicateCodes.has(normalizedCodes[index])) errors.code = "duplicateCode";

    if (!name) errors.name = "required";
    else if (name.length > METRIC_NAME_MAX_LENGTH) errors.name = "tooLong";

    if (!description) errors.description = "required";
    else if (description.length > METRIC_DESCRIPTION_MAX_LENGTH) {
      errors.description = "tooLong";
    }

    if (!Number.isFinite(weight) || Number(weight) <= 0 || Number(weight) > 100) {
      errors.weight = "invalidWeight";
    }

    if (
      !Number.isFinite(maxScore) ||
      Number(maxScore) <= 0 ||
      Number(maxScore) > EVALUATION_SCORE_MAX
    ) {
      errors.maxScore = "invalidMaxScore";
    }

    if (
      !Number.isFinite(minimumScore) ||
      Number(minimumScore) < 0 ||
      Number(minimumScore) > Number(maxScore)
    ) {
      errors.minimumScore = "invalidMinimumScore";
    } else if (metric.required && Number(minimumScore) <= 0) {
      errors.minimumScore = "requiredMinimumScore";
    }

    return errors;
  });

  const totalWeight = metrics.reduce((sum, metric) => sum + Number(metric.weight ?? 0), 0);
  const totalWeightError =
    Number.isFinite(totalWeight) && Math.abs(totalWeight - 100) < 0.01
      ? undefined
      : "invalidTotalWeight";
  const scoringInstruction = plan?.scoringInstruction?.trim() ?? "";
  const passRule = plan?.passRule?.trim() ?? "";
  const scoringInstructionError = !scoringInstruction
    ? "required"
    : scoringInstruction.length > EVALUATION_INSTRUCTION_MAX_LENGTH
      ? "tooLong"
      : undefined;
  const passRuleError = !passRule
    ? "required"
    : passRule.length > EVALUATION_INSTRUCTION_MAX_LENGTH
      ? "tooLong"
      : undefined;

  const isValid =
    !totalWeightError &&
    !scoringInstructionError &&
    !passRuleError &&
    metricErrors.every((errors) => Object.keys(errors).length === 0);

  return {
    isValid,
    metricErrors,
    totalWeight: totalWeightError,
    scoringInstruction: scoringInstructionError,
    passRule: passRuleError,
  };
}
