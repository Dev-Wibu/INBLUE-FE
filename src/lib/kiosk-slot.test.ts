import { describe, expect, it } from "vitest";
import { isFutureKioskSlot } from "./kiosk-slot";

describe("isFutureKioskSlot", () => {
  const now = new Date("2026-08-16T10:00:00+07:00");

  it("rejects a slot earlier today", () => {
    expect(isFutureKioskSlot("2026-08-16T09:30:00+07:00", now)).toBe(false);
  });

  it("accepts a later slot today", () => {
    expect(isFutureKioskSlot("2026-08-16T10:30:00+07:00", now)).toBe(true);
  });

  it("rejects malformed timestamps", () => {
    expect(isFutureKioskSlot("not-a-date", now)).toBe(false);
  });
});
