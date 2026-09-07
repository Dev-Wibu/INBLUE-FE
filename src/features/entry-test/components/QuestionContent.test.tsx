import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseQuestionContent } from "../utils/question-content";
import { QuestionContent } from "./QuestionContent";

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

  it("normalizes escaped newlines in backend code blocks", () => {
    expect(
      parseQuestionContent("Example:\n```java\\npublic class Main {\\n  return;\\n}\\n```")
    ).toEqual([
      { type: "text", value: "Example:" },
      { type: "code", language: "JAVA", value: "public class Main {\n  return;\n}" },
    ]);
  });
});

describe("QuestionContent", () => {
  it("emphasizes only explicitly quoted technical terms", () => {
    render(
      <QuestionContent
        codeLabel="Code"
        text={'In Java MVC, the \\"Controller\\" should \\"forward\\" results to the \\"View\\".'}
      />
    );

    expect(screen.getByText('"Controller"').tagName).toBe("STRONG");
    expect(screen.getByText('"forward"').tagName).toBe("STRONG");
    expect(screen.getByText('"View"').tagName).toBe("STRONG");
  });

  it("does not emphasize capitalized Vietnamese answer fragments without markup", () => {
    const { container } = render(
      <QuestionContent
        codeLabel="Code"
        text="Tuy nhiên: A. Không kiểm tra kết nối B. Không đóng kết nối C. Sử dụng JDBC D. Không xử lý ngoại lệ"
      />
    );

    expect(container.querySelectorAll("strong")).toHaveLength(0);
    expect(container.querySelectorAll("code")).toHaveLength(0);
  });
});
