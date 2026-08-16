import { describe, expect, it } from "vitest";
import {
  MENTOR_REVIEW_NOTE_MAX_LENGTH,
  hasOverlongMentorReviewNote,
} from "./mentor-review-validation";

describe("hasOverlongMentorReviewNote", () => {
  it("accepts notes at the database varchar limit", () => {
    expect(
      hasOverlongMentorReviewNote({ situationNote: "a".repeat(MENTOR_REVIEW_NOTE_MAX_LENGTH) })
    ).toBe(false);
  });

  it("rejects any mentor review note over the database varchar limit", () => {
    expect(
      hasOverlongMentorReviewNote({ improve: "a".repeat(MENTOR_REVIEW_NOTE_MAX_LENGTH + 1) })
    ).toBe(true);
  });
});
