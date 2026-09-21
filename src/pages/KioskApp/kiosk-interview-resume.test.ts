import { describe, expect, it } from "vitest";
import { buildKioskResumeMessages } from "./kiosk-interview-resume";

describe("buildKioskResumeMessages", () => {
  it("starts empty without a session response rather than showing another candidate's messages", () => {
    expect(buildKioskResumeMessages(undefined, undefined)).toEqual([]);
  });
  it("restores previous questions and answers before the current question", () => {
    const messages = buildKioskResumeMessages(
      {
        currentQuestionIndex: 2,
        currentQuestionText: "Câu hỏi hiện tại",
        chatHistory: [
          {
            phaseName: "Technical",
            questionOrder: 1,
            questionText: "Câu hỏi cũ",
            answerText: "Câu trả lời cũ",
            submittedAt: "2026-09-18T15:55:00",
            type: "BLUEPRINT",
          },
        ],
      },
      {
        phaseName: "Technical",
        currentQuestionIndex: 2,
        totalQuestionsInPhase: 3,
        questionContent: "Câu hỏi hiện tại",
        questionType: "FOLLOW_UP",
      }
    );

    expect(messages.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: "ai", content: "Câu hỏi cũ" },
      { role: "user", content: "Câu trả lời cũ" },
      { role: "ai", content: "Câu hỏi hiện tại" },
    ]);
    expect(messages[0]?.timestamp).toBe("15:55");
  });

  it("does not duplicate the current question when cache already contains it", () => {
    const messages = buildKioskResumeMessages(
      {
        chatHistory: [{ questionText: "Current question", answerText: "Saved answer" }],
      },
      { questionContent: " current   question " }
    );

    expect(messages.filter((message) => message.role === "ai")).toHaveLength(1);
  });
});
