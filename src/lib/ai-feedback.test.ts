import { describe, expect, it } from "vitest";
import { getAiEvaluationScore, joinMetricResults, normalizeAiFeedback } from "./ai-feedback";

describe("AI feedback contract", () => {
  it("prefers structured feedback and preserves nullable metric values", () => {
    const result = normalizeAiFeedback(
      {
        aiFeedback: { generalComment: "legacy" },
        structuredAiFeedback: {
          overallScore: 0,
          overallFeedback: "structured",
          metricResults: [
            { code: "A3", score: 0, weightedScore: 0, passed: false },
            { code: "A1", score: 40, weightedScore: 12, passed: true },
          ],
        },
      },
      {
        evaluationPlan: {
          metrics: [
            { code: "A1", name: "Clarity" },
            { code: "A3", name: "Language" },
          ],
        },
      }
    );

    expect(result?.source).toBe("structured");
    expect(result?.overallScore).toBe(0);
    expect(result?.metricResults.map((metric) => metric.code)).toEqual(["A3", "A1"]);
    expect(result?.metricResults[0]).toMatchObject({
      score: 0,
      weightedScore: 0,
      passed: false,
      definition: { code: "A3", name: "Language" },
    });
  });

  it("keeps unknown metric codes without guessing a definition", () => {
    const [metric] = joinMetricResults(
      [{ code: "NEW", passed: null }],
      [{ code: "A1", name: "Clarity" }]
    );
    expect(metric).toMatchObject({ code: "NEW", passed: null, definition: null });
  });

  it("removes backend placeholder text from metric metadata", () => {
    const [metric] = joinMetricResults(
      [{ code: "A1", score: 40 }],
      [{ code: "A1", name: "Tone", description: "None" }]
    );

    expect(metric.definition).toMatchObject({ code: "A1", name: "Tone" });
    expect(metric.definition?.description).toBeUndefined();
  });

  it("falls back to legacy feedback without converting extraMetrics", () => {
    const result = normalizeAiFeedback({
      structuredAiFeedback: {},
      aiFeedback: {
        generalComment: "legacy",
        extraMetrics: { Tone: { score: 4 } },
      },
    });
    expect(result).toMatchObject({
      source: "legacy",
      overallFeedback: "legacy",
      metricResults: [],
      legacyExtraMetrics: { Tone: { score: 4 } },
    });
  });

  it("does not use finalScore as an AI score", () => {
    expect(
      getAiEvaluationScore({
        aiScore: undefined,
        aiFeedback: undefined,
        structuredAiFeedback: undefined,
      })
    ).toBeNull();
    expect(
      getAiEvaluationScore({
        aiScore: undefined,
        aiFeedback: undefined,
        structuredAiFeedback: { overallScore: 45 },
      })
    ).toBe(45);
  });
});
