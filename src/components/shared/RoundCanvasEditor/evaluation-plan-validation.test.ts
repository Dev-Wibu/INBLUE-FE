import { describe, expect, it } from "vitest";
import { validateEvaluationPlan } from "./evaluation-plan-validation";

const validPlan = {
  metrics: [
    {
      code: "TECH_DEPTH",
      name: "Technical depth",
      description: "Evaluate technical depth",
      weight: 60,
      maxScore: 100,
      required: true,
      minimumScore: 60,
    },
    {
      code: "COMMUNICATION",
      name: "Communication",
      description: "Evaluate communication",
      weight: 40,
      maxScore: 100,
      required: false,
      minimumScore: 0,
    },
  ],
  scoringInstruction: "Score each metric on a 0-100 scale.",
  passRule: "Weighted score must meet the round threshold.",
};

describe("validateEvaluationPlan", () => {
  it("accepts a complete plan on the product-wide 0-100 scale", () => {
    expect(validateEvaluationPlan(validPlan).isValid).toBe(true);
  });

  it("allows a round without structured metrics", () => {
    expect(validateEvaluationPlan({ metrics: [] }).isValid).toBe(true);
  });

  it("rejects duplicate and malformed metric codes", () => {
    const result = validateEvaluationPlan({
      ...validPlan,
      metrics: [
        { ...validPlan.metrics[0], code: "TECH DEPTH" },
        { ...validPlan.metrics[1], code: "TECH DEPTH" },
      ],
    });

    expect(result.metricErrors[0].code).toBe("invalidCode");
    expect(result.isValid).toBe(false);
  });

  it("rejects duplicate valid codes", () => {
    const result = validateEvaluationPlan({
      ...validPlan,
      metrics: validPlan.metrics.map((metric) => ({ ...metric, code: "TECH_DEPTH" })),
    });

    expect(result.metricErrors.every((error) => error.code === "duplicateCode")).toBe(true);
  });

  it("rejects invalid weights and totals", () => {
    const result = validateEvaluationPlan({
      ...validPlan,
      metrics: [
        { ...validPlan.metrics[0], weight: 0 },
        { ...validPlan.metrics[1], weight: 20 },
      ],
    });

    expect(result.metricErrors[0].weight).toBe("invalidWeight");
    expect(result.totalWeight).toBe("invalidTotalWeight");
  });

  it("rejects scores outside 0-100 and a required zero minimum", () => {
    const overMax = validateEvaluationPlan({
      ...validPlan,
      metrics: [{ ...validPlan.metrics[0], weight: 100, maxScore: 101, minimumScore: 102 }],
    });
    const requiredZero = validateEvaluationPlan({
      ...validPlan,
      metrics: [{ ...validPlan.metrics[0], weight: 100, minimumScore: 0 }],
    });

    expect(overMax.metricErrors[0].maxScore).toBe("invalidMaxScore");
    expect(overMax.metricErrors[0].minimumScore).toBe("invalidMinimumScore");
    expect(requiredZero.metricErrors[0].minimumScore).toBe("requiredMinimumScore");
  });

  it("accepts a null minimum score for an optional AI metric", () => {
    const result = validateEvaluationPlan({
      ...validPlan,
      metrics: [
        {
          ...validPlan.metrics[0],
          weight: 100,
          required: false,
          minimumScore: null,
        },
      ],
    });

    expect(result.metricErrors[0].minimumScore).toBeUndefined();
    expect(result.isValid).toBe(true);
  });

  it("requires descriptions, scoring instructions, and pass rules", () => {
    const result = validateEvaluationPlan({
      ...validPlan,
      metrics: validPlan.metrics.map((metric) => ({ ...metric, description: "" })),
      scoringInstruction: "",
      passRule: "",
    });

    expect(result.metricErrors[0].description).toBe("required");
    expect(result.scoringInstruction).toBe("required");
    expect(result.passRule).toBe("required");
  });
});
