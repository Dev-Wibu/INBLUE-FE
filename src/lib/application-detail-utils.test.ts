import { describe, expect, it } from "vitest";
import type { components } from "../../schema-from-be";
import { inferRoundType } from "./application-detail-utils";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

describe("inferRoundType", () => {
  it("recognizes custom Vietnamese AI interview names before submission heuristics", () => {
    const detail = {
      roundName: "Phỏng vấn chuyên sâu & Đánh giá năng lực hành vi",
      submissionData: { quizAnswers: [{ isCorrect: true }] },
    } as ApplicationDetail;

    expect(inferRoundType(detail)).toBe("AI_INTERVIEW");
  });
});
