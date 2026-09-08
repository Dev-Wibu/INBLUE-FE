import { describe, expect, it } from "vitest";
import { toEvaluationPlanPayload } from "./evaluation-plan-payload";

describe("toEvaluationPlanPayload", () => {
  it("preserves every evaluation plan field in a detached request payload", () => {
    const source = {
      metrics: [
        {
          code: " TECH_DEPTH ",
          name: " Technical depth ",
          description: " Spring and database knowledge ",
          weight: 100,
          maxScore: 100,
          required: true,
          minimumScore: 60,
        },
      ],
      scoringInstruction: " Score each metric on 0-100. ",
      passRule: " Weighted score must reach the round threshold. ",
    };

    const payload = toEvaluationPlanPayload(source);

    expect(payload).toEqual({
      metrics: [
        {
          code: "TECH_DEPTH",
          name: "Technical depth",
          description: "Spring and database knowledge",
          weight: 100,
          maxScore: 100,
          required: true,
          minimumScore: 60,
        },
      ],
      scoringInstruction: "Score each metric on 0-100.",
      passRule: "Weighted score must reach the round threshold.",
    });
    expect(payload).not.toBe(source);
    expect(payload?.metrics).not.toBe(source.metrics);
  });

  it("preserves an explicit null for legacy rounds without a plan", () => {
    expect(toEvaluationPlanPayload(undefined)).toBeNull();
  });

  it("preserves a null minimum score returned for an optional AI metric", () => {
    const payload = toEvaluationPlanPayload({
      metrics: [
        {
          code: "EDGE_CASES",
          name: "Edge cases",
          description: "Handle exceptional input",
          weight: 100,
          maxScore: 100,
          required: false,
          minimumScore: null,
        },
      ],
      scoringInstruction: "Score on 0-100",
      passRule: "Meet the threshold",
    });

    expect(payload?.metrics?.[0].minimumScore).toBeNull();
  });
});
