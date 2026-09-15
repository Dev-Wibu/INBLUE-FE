import type { components } from "../../schema-from-be";

export type ApplicationDetail = components["schemas"]["ApplicationDetail"];
export type EvaluationMetric = components["schemas"]["EvaluationMetric"];

export interface NormalizedMetricResult {
  code: string | null;
  score: number | null;
  weightedScore: number | null;
  passed: boolean | null;
  evidence: string | null;
  feedback: string | null;
  definition: EvaluationMetric | null;
}

export interface NormalizedAiFeedback {
  source: "structured" | "legacy";
  overallScore: number | null;
  overallFeedback: string | null;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string | null;
  metricResults: NormalizedMetricResult[];
  legacyExtraMetrics: Record<string, unknown> | null;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const placeholder = text.toLowerCase();
  return placeholder === "none" ||
    placeholder === "null" ||
    placeholder === "undefined" ||
    placeholder === "n/a"
    ? null
    : text;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getEvaluationMetrics(value: unknown): EvaluationMetric[] {
  const config = parseObject(value);
  const evaluationPlan = parseObject(config?.evaluationPlan);
  return Array.isArray(evaluationPlan?.metrics)
    ? (evaluationPlan.metrics.filter(
        (metric): metric is EvaluationMetric => Boolean(metric) && typeof metric === "object"
      ) as EvaluationMetric[])
    : [];
}

export function joinMetricResults(
  value: unknown,
  evaluationMetrics: EvaluationMetric[] = []
): NormalizedMetricResult[] {
  if (!Array.isArray(value)) return [];

  const definitionsByCode = new Map(
    evaluationMetrics
      .filter((metric) => typeof metric.code === "string")
      .map((metric) => [metric.code as string, metric])
  );

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const code = nullableString(item.code);
      const rawDefinition = code ? (definitionsByCode.get(code) ?? null) : null;
      const definition = rawDefinition
        ? {
            ...rawDefinition,
            name: nullableString(rawDefinition.name) ?? undefined,
            description: nullableString(rawDefinition.description) ?? undefined,
          }
        : null;
      return {
        code,
        score: nullableNumber(item.score),
        weightedScore: nullableNumber(item.weightedScore),
        passed: nullableBoolean(item.passed),
        evidence: nullableString(item.evidence),
        feedback: nullableString(item.feedback),
        definition,
      };
    });
}

function hasStructuredData(
  value: Record<string, unknown> | null
): value is Record<string, unknown> {
  if (!value) return false;
  return (
    nullableNumber(value.overallScore) !== null ||
    nullableString(value.overallFeedback) !== null ||
    nullableString(value.improvementAdvice) !== null ||
    stringArray(value.strengths).length > 0 ||
    stringArray(value.weaknesses).length > 0 ||
    (Array.isArray(value.metricResults) && value.metricResults.length > 0)
  );
}

export function normalizeAiFeedback(
  detail: Pick<ApplicationDetail, "structuredAiFeedback" | "aiFeedback"> | null | undefined,
  roundConfig?: unknown
): NormalizedAiFeedback | null {
  const structured = parseObject(detail?.structuredAiFeedback);
  if (hasStructuredData(structured)) {
    return {
      source: "structured",
      overallScore: nullableNumber(structured.overallScore),
      overallFeedback: nullableString(structured.overallFeedback),
      strengths: stringArray(structured.strengths),
      weaknesses: stringArray(structured.weaknesses),
      improvementAdvice: nullableString(structured.improvementAdvice),
      metricResults: joinMetricResults(structured.metricResults, getEvaluationMetrics(roundConfig)),
      legacyExtraMetrics: null,
    };
  }

  const legacy = parseObject(detail?.aiFeedback);
  if (!legacy) return null;
  const extraMetrics = parseObject(legacy.extraMetrics);
  const normalized: NormalizedAiFeedback = {
    source: "legacy",
    overallScore: null,
    overallFeedback: nullableString(legacy.generalComment),
    strengths: stringArray(legacy.strengths),
    weaknesses: stringArray(legacy.weaknesses),
    improvementAdvice: null,
    metricResults: [],
    legacyExtraMetrics: extraMetrics,
  };

  return normalized.overallFeedback ||
    normalized.strengths.length > 0 ||
    normalized.weaknesses.length > 0 ||
    normalized.legacyExtraMetrics
    ? normalized
    : null;
}

export function getAiEvaluationScore(
  detail:
    | Pick<ApplicationDetail, "structuredAiFeedback" | "aiFeedback" | "aiScore">
    | null
    | undefined
): number | null {
  const feedback = normalizeAiFeedback(detail);
  if (feedback?.source === "structured" && feedback.overallScore !== null) {
    return feedback.overallScore;
  }
  return nullableNumber(detail?.aiScore);
}
