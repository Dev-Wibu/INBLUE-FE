import { describe, expect, it } from "vitest";
import { filterSessionsForMentor, getSessionMentorId, isSessionMentor } from "./session-mentor";

describe("session mentor ownership", () => {
  it("resolves both current and legacy mentor fields", () => {
    expect(getSessionMentorId({ mentorId: 12, userId2: 9 })).toBe(12);
    expect(getSessionMentorId({ userId2: 9 })).toBe(9);
  });

  it("filters only by Mentor.id and ignores unrelated candidate IDs", () => {
    const sessions = [
      { id: 1, userId: 42, mentorId: 8 },
      { id: 2, userId: 8, mentorId: 21 },
      { id: 3, userId: 7, userId2: 8 },
    ];

    expect(filterSessionsForMentor(sessions, 8).map((session) => session.id)).toEqual([1, 3]);
    expect(isSessionMentor(sessions[1], 8)).toBe(false);
  });

  it("returns no sessions until the mentor profile is resolved", () => {
    expect(filterSessionsForMentor([{ mentorId: 1 }], undefined)).toEqual([]);
  });
});
