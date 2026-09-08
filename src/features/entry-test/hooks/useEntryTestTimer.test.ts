import { describe, expect, it } from "vitest";

import { formatRemainingTime, getRemainingMs } from "./useEntryTestTimer";

describe("entry test timer", () => {
  it("uses an absolute deadline and never becomes negative", () => {
    expect(getRemainingMs(10_000, 4_000)).toBe(6_000);
    expect(getRemainingMs(10_000, 12_000)).toBe(0);
  });

  it("formats a stable clock", () => {
    expect(formatRemainingTime(3_661_000)).toBe("01:01:01");
  });
});
