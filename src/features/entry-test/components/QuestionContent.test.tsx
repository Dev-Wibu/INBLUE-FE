import { describe, expect, it } from "vitest";

import { parseQuestionContent } from "../utils/question-content";

describe("parseQuestionContent", () => {
  it("separates prose and fenced code even when the fence is inline", () => {
    expect(
      parseQuestionContent(
        "Explain this: ```java public class Demo { void run() {} } ``` then describe `run()`."
      )
    ).toEqual([
      { type: "text", value: "Explain this:" },
      {
        type: "code",
        language: "JAVA",
        value: "public class Demo { void run() {} }",
      },
      { type: "text", value: "then describe `run()`." },
    ]);
  });

  it("keeps a regular question as prose", () => {
    expect(parseQuestionContent("What is dependency injection?")).toEqual([
      { type: "text", value: "What is dependency injection?" },
    ]);
  });
});
