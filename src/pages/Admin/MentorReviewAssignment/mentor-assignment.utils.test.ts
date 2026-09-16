import type { Mentor } from "@/interfaces";
import { describe, expect, it } from "vitest";
import { mergeAndRankMentors } from "./mentor-assignment.utils";

describe("mergeAndRankMentors", () => {
  it("keeps all active mentors and ranks recommendations first", () => {
    const mentors: Mentor[] = [
      { id: 1, name: "No Match", active: true },
      { id: 2, name: "Best Match", active: true, currentCompany: "Inblue" },
      { id: 3, name: "Inactive", active: false },
    ];
    const recommendations: Mentor[] = [{ id: 2, name: "Best Match", matchPercent: 82.5 }];

    const result = mergeAndRankMentors(mentors, recommendations);

    expect(result.map((mentor) => mentor.id)).toEqual([2, 1]);
    expect(result[0]).toMatchObject({ matchPercent: 82.5, currentCompany: "Inblue" });
  });

  it("sorts unmatched mentors by name after all matched mentors", () => {
    const result = mergeAndRankMentors(
      [
        { id: 1, name: "Zed", active: true },
        { id: 2, name: "An", active: true },
        { id: 3, name: "Binh", active: true },
      ],
      [
        { id: 3, matchPercent: 40 },
        { id: 1, matchPercent: 70 },
      ]
    );

    expect(result.map((mentor) => mentor.id)).toEqual([1, 3, 2]);
  });
});
