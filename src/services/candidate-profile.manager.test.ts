import { describe, expect, it } from "vitest";

import { normalizeCandidateProfiles } from "./candidate-profile.manager";

describe("normalizeCandidateProfiles", () => {
  it("keeps only the newest version when profile content is duplicated", () => {
    const profiles = normalizeCandidateProfiles([
      { id: 1, targetRole: "FE", targetLevel: "INTERN", updatedAt: "2026-01-01T00:00:00Z" },
      { id: 2, targetRole: "FE", targetLevel: "INTERN", updatedAt: "2026-02-01T00:00:00Z" },
      { id: 3, targetRole: "BE", targetLevel: "JUNIOR", updatedAt: "2026-02-01T00:00:00Z" },
    ]);

    expect(profiles.map((profile) => profile.id)).toEqual([2, 3]);
  });
});
