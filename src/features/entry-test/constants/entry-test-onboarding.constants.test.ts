import { describe, expect, it } from "vitest";

import {
  entryTestLevels,
  entryTestRoles,
  entryTestSkillsByRole,
} from "./entry-test-onboarding.constants";

describe("entry test onboarding options", () => {
  it("offers a broad, unique skill set for every career direction", () => {
    for (const { value: role } of entryTestRoles) {
      const skills = entryTestSkillsByRole[role];

      expect(skills.length).toBeGreaterThanOrEqual(25);
      expect(new Set(skills).size).toBe(skills.length);
    }
  });

  it("does not offer Middle as a target level", () => {
    expect(entryTestLevels.map(({ value }) => value)).toEqual(["INTERN", "FRESHER", "JUNIOR"]);
  });
});
