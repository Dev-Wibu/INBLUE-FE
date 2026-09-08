import { describe, expect, it } from "vitest";
import { getJobSkillTags, parseJobSkillTags } from "./job-skills";

describe("job skill tags", () => {
  it("prefers the backend skillTags field", () => {
    expect(getJobSkillTags({ skillTags: ["Java", " Spring Boot "], skills: ["Legacy"] })).toEqual([
      "Java",
      "Spring Boot",
    ]);
  });

  it("supports legacy skills and removes empty duplicates", () => {
    expect(getJobSkillTags({ skills: ["React", "react", "", null] })).toEqual(["React"]);
  });

  it("parses comma, semicolon and line separated input", () => {
    expect(parseJobSkillTags("Java, Spring Boot; SQL\nDocker")).toEqual([
      "Java",
      "Spring Boot",
      "SQL",
      "Docker",
    ]);
  });
});
