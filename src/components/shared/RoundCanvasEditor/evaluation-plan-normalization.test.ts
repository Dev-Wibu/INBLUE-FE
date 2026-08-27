import { describe, expect, it } from "vitest";
import { normalizeEvaluationPlan } from "./evaluation-plan-normalization";

describe("normalizeEvaluationPlan", () => {
  it("keeps AI metrics and accepts a null minimum score for optional metrics", () => {
    const result = normalizeEvaluationPlan({
      metrics: [
        {
          code: "CODE_CORRECTNESS",
          name: "Tính đúng đắn",
          description: "Mã nguồn giải quyết đúng yêu cầu",
          weight: 70,
          maxScore: 100,
          required: true,
          minimumScore: 70,
        },
        {
          code: "EDGE_CASES",
          name: "Xử lý trường hợp biên",
          description: "Khả năng xử lý dữ liệu null và lỗi API",
          weight: 30,
          maxScore: 100,
          required: false,
          minimumScore: null,
        },
      ],
      scoringInstruction: "Chấm điểm theo thang 0-100.",
      passRule: "Đạt tổng điểm từ 70 trở lên.",
    });

    expect(result?.metrics).toHaveLength(2);
    expect(result?.metrics?.[0]).toMatchObject({
      code: "CODE_CORRECTNESS",
      minimumScore: 70,
    });
    expect(result?.metrics?.[1]).toMatchObject({
      code: "EDGE_CASES",
      required: false,
      minimumScore: null,
    });
  });

  it("normalizes a missing metrics array to an empty array", () => {
    expect(normalizeEvaluationPlan({ scoringInstruction: "Score", passRule: "Pass" })).toEqual({
      metrics: [],
      scoringInstruction: "Score",
      passRule: "Pass",
    });
  });
});
