import { describe, expect, it } from "vitest";
import {
  calculateAverageMentorReviewScore,
  formatMentorReviewScore,
  getMentorReviewScoreBand,
  isValidMentorReviewScore,
  matchesMentorReviewScoreRange,
  normalizeMentorReviewScore,
} from "./mentor-review-score";

describe("mentor review score", () => {
  it("clamps values to the backend 0-100 scale", () => {
    expect(normalizeMentorReviewScore(-5)).toBe(0);
    expect(normalizeMentorReviewScore(72.5)).toBe(72.5);
    expect(normalizeMentorReviewScore(120)).toBe(100);
    expect(normalizeMentorReviewScore(undefined)).toBe(0);
  });

  it("validates required scores independently from display normalization", () => {
    expect(isValidMentorReviewScore(0)).toBe(true);
    expect(isValidMentorReviewScore(0, true)).toBe(false);
    expect(isValidMentorReviewScore(100, true)).toBe(true);
    expect(isValidMentorReviewScore(101)).toBe(false);
  });

  it("formats whole and decimal scores without a percent sign", () => {
    expect(formatMentorReviewScore(84)).toBe("84");
    expect(formatMentorReviewScore(84.25)).toBe("84.3");
  });

  it("calculates averages from valid scores only", () => {
    expect(calculateAverageMentorReviewScore([{ rating: 80 }, { rating: 90 }])).toBe(85);
    expect(calculateAverageMentorReviewScore([{ rating: 75 }, {}, { rating: 150 }])).toBe(75);
  });

  it("maps score bands and range filters consistently", () => {
    expect(getMentorReviewScoreBand(92)).toBe("excellent");
    expect(getMentorReviewScoreBand(76)).toBe("strong");
    expect(getMentorReviewScoreBand(64)).toBe("meets");
    expect(getMentorReviewScoreBand(48)).toBe("developing");
    expect(matchesMentorReviewScoreRange(91, "excellent")).toBe(true);
    expect(matchesMentorReviewScoreRange(74, "strong")).toBe(false);
  });
});
