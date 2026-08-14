import { describe, expect, it } from "vitest";
import { getSessionJoinAvailability, SESSION_EARLY_JOIN_WINDOW_MS } from "./session-join";

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

  it("requires both a joinable status and an online room", () => {
    expect(
      getSessionJoinAvailability({ ...session, status: "COMPLETED" }, joinTimestamp).canJoin
    ).toBe(false);
    expect(
      getSessionJoinAvailability({ ...session, roomUrl: "OFFLINE" }, joinTimestamp).canJoin
    ).toBe(false);
  });
});
