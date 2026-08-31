import { describe, expect, it } from "vitest";

import { buildSubmitPayload, normalizeCareerLanguages } from "./entry-test-payload";

describe("entry test payload", () => {
  it("normalizes career languages in a stable order", () => {
    expect(normalizeCareerLanguages([" JAVA ", "SPRING_BOOT", "JAVA", ""])).toEqual([
      "JAVA",
      "SPRING_BOOT",
    ]);
  });

  it("only submits unique items from the current attempt", () => {
    const payload = buildSubmitPayload(
      [
        {
          itemId: "COMMON-1",
          questionBankId: 1,
          questionText: "Question",
          options: [],
          categoryName: null,
          difficulty: null,
          maxScore: 2,
          displayOrder: 1,
        },
      ],
      [],
      { "COMMON-1": "B", "OLD-1": "A" },
      {}
    );

    expect(payload).toEqual({
      answers: [{ itemId: "COMMON-1", answerJson: { selectedOption: "B" } }],
    });
  });
});
