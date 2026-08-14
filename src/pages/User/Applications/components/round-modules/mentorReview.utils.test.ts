import { describe, expect, it } from "vitest";
import {
  collectEmbeddedMentors,
  mergeMentorResponses,
  resolveSelectedMentor,
} from "./mentorReview.utils";

describe("mentor review display utilities", () => {
  it("collects assigned and review mentors from existing response data", () => {
    expect(
      collectEmbeddedMentors(
        {
          assignedMentors: [{ id: 7, name: "Mai Anh" }],
        },
        {
          mentorReview: {
            mentor: { id: 9, name: "Tuan Tran", avatarUrl: "/mentor-9.png" },
          },
        }
      )
    ).toEqual([
      { id: 7, name: "Mai Anh" },
      { id: 9, name: "Tuan Tran", avatarUrl: "/mentor-9.png" },
    ]);
  });

  it("supports legacy assignment and flat session mentor shapes", () => {
    expect(
      collectEmbeddedMentors(
        { assigned_mentors: [{ id: 3, name: "Legacy Mentor" }] },
        { mentorId: 5, mentorName: "Session Mentor", mentorAvatar: "/mentor-5.png" }
      )
    ).toEqual([
      { id: 3, name: "Legacy Mentor" },
      { id: 5, name: "Session Mentor", avatarUrl: "/mentor-5.png" },
    ]);
  });

  it("merges richer fetched fields without erasing embedded identity data", () => {
    expect(
      mergeMentorResponses(
        [{ id: 4, name: "Embedded Name", avatarUrl: "/avatar.png" }],
        [{ id: 4, currentCompany: "Inblue", name: undefined }]
      )
    ).toEqual([
      {
        id: 4,
        name: "Embedded Name",
        avatarUrl: "/avatar.png",
        currentCompany: "Inblue",
      },
    ]);
  });

  it("resolves the selected mentor by any available id", () => {
    const mentors = [
      { id: 11, name: "First" },
      { id: 12, name: "Selected" },
    ];

    expect(resolveSelectedMentor(mentors, null, 12)?.name).toBe("Selected");
  });

  it("uses the only available mentor when the selected id is absent", () => {
    expect(resolveSelectedMentor([{ id: 20, name: "Only Mentor" }], null)?.name).toBe(
      "Only Mentor"
    );
    expect(
      resolveSelectedMentor(
        [
          { id: 20, name: "First" },
          { id: 21, name: "Second" },
        ],
        null
      )
    ).toBeNull();
  });
});
