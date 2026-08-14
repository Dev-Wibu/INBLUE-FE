import { describe, expect, it } from "vitest";
import { normalizeFiveStarRating } from "./rating";

describe("normalizeFiveStarRating", () => {
  it("coerces numeric strings without concatenating totals", () => {
    expect(normalizeFiveStarRating("4")).toBe(4);
  });

  it("maps legacy ten-point values onto five stars", () => {
    expect(normalizeFiveStarRating(10)).toBe(5);
    expect(normalizeFiveStarRating(8)).toBe(4);
  });

  it("clamps invalid and out-of-range values", () => {
    expect(normalizeFiveStarRating(undefined)).toBe(0);
    expect(normalizeFiveStarRating(100)).toBe(5);
  });
});
