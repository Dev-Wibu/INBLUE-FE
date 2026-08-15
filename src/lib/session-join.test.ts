import { describe, expect, it } from "vitest";
import {
  getSessionJoinAvailability,
  SESSION_EARLY_JOIN_WINDOW_MS,
  SESSION_LATE_JOIN_WINDOW_MS,
} from "./session-join";

const joinTime = "2026-08-15T10:00:00.000Z";
const joinTimestamp = new Date(joinTime).getTime();
const session = {
  status: "SCHEDULED" as const,
  roomUrl: "https://example.daily.co/interview",
  joinTime,
};

describe("getSessionJoinAvailability", () => {
  it("keeps the room locked before the 15-minute window", () => {
    const result = getSessionJoinAvailability(
      session,
      joinTimestamp - SESSION_EARLY_JOIN_WINDOW_MS - 1
    );

    expect(result.canJoin).toBe(false);
    expect(result.isBeforeJoinWindow).toBe(true);
  });

  it("opens the room exactly 15 minutes before the appointment", () => {
    const result = getSessionJoinAvailability(
      session,
      joinTimestamp - SESSION_EARLY_JOIN_WINDOW_MS
    );

    expect(result.canJoin).toBe(true);
    expect(result.isBeforeJoinWindow).toBe(false);
  });

  it("keeps the room open through 15 minutes after the appointment", () => {
    const result = getSessionJoinAvailability(session, joinTimestamp + SESSION_LATE_JOIN_WINDOW_MS);

    expect(result.canJoin).toBe(true);
    expect(result.isAfterJoinWindow).toBe(false);
  });

  it("locks the room after the 15-minute late window", () => {
    const result = getSessionJoinAvailability(
      session,
      joinTimestamp + SESSION_LATE_JOIN_WINDOW_MS + 1
    );

    expect(result.canJoin).toBe(false);
    expect(result.isAfterJoinWindow).toBe(true);
  });

  it("allows an ongoing room when stale schedule data says it has not opened yet", () => {
    const result = getSessionJoinAvailability(
      { ...session, status: "ONGOING", joinTime: "2026-08-16 22:00:00.000" },
      new Date("2026-08-15T22:39:00+07:00").getTime()
    );

    expect(result.canJoin).toBe(true);
    expect(result.isBeforeJoinWindow).toBe(true);
  });

  it("allows an ongoing online room even when its scheduled time is missing", () => {
    const result = getSessionJoinAvailability(
      { ...session, status: "ONGOING", joinTime: undefined },
      joinTimestamp
    );

    expect(result.canJoin).toBe(true);
  });

  it("requires both a joinable status and an online room", () => {
    expect(
      getSessionJoinAvailability({ ...session, status: "COMPLETED" }, joinTimestamp).canJoin
    ).toBe(false);
    expect(
      getSessionJoinAvailability({ ...session, roomUrl: "OFFLINE" }, joinTimestamp).canJoin
    ).toBe(false);
    expect(
      getSessionJoinAvailability({ ...session, joinTime: undefined }, joinTimestamp).canJoin
    ).toBe(false);
  });
});
