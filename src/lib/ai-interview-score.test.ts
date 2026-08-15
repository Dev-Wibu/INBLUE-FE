import { describe, expect, it } from "vitest";
import { formatAiInterviewScore, normalizeAiInterviewScore } from "./ai-interview-score";

describe("AI Interview score normalization", () => {
  it("converts legacy detail scores from ten to hundred", () => {
    expect(normalizeAiInterviewScore(5.8125, "ten")).toBe(58.125);
    expect(formatAiInterviewScore(5.8125, "ten")).toBe("58");
  });

  it("keeps session scores that are already on hundred", () => {
    expect(normalizeAiInterviewScore(58.125, "hundred")).toBe(58.125);
    expect(formatAiInterviewScore(58.125, "hundred")).toBe("58");
  });

  it("auto-detects legacy final scores only when they are on ten", () => {
    expect(formatAiInterviewScore(6, "auto")).toBe("60");
    expect(formatAiInterviewScore(58, "auto")).toBe("58");
  });

  it("clamps scores and rejects invalid values", () => {
    expect(normalizeAiInterviewScore(-1, "hundred")).toBe(0);
    expect(normalizeAiInterviewScore(120, "hundred")).toBe(100);
    expect(normalizeAiInterviewScore("not-a-score", "hundred")).toBeNull();
  });
});
