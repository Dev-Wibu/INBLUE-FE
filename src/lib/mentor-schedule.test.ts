import { describe, expect, it } from "vitest";
import { isMentorScheduleTimeValid } from "./mentor-schedule";

describe("isMentorScheduleTimeValid", () => {
  const now = new Date("2026-08-15T10:00:00+07:00");

  it("rejects past times and times less than five minutes ahead", () => {
    expect(isMentorScheduleTimeValid(new Date("2026-08-15T09:30:00+07:00"), now)).toBe(false);
    expect(isMentorScheduleTimeValid(new Date("2026-08-15T10:04:59+07:00"), now)).toBe(false);
  });

  it("accepts a start time at least five minutes ahead", () => {
    expect(isMentorScheduleTimeValid(new Date("2026-08-15T10:05:00+07:00"), now)).toBe(true);
  });

  it("rejects a missing or invalid date", () => {
    expect(isMentorScheduleTimeValid(null, now)).toBe(false);
    expect(isMentorScheduleTimeValid(new Date("invalid"), now)).toBe(false);
  });
});
