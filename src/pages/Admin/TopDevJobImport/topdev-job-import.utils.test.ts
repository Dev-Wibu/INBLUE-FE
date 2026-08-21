import { describe, expect, it } from "vitest";

import { plainText, splitSkills, toImportPayload } from "./topdev-job-import.utils";

describe("TopDev import utilities", () => {
  it("removes preview-only fields from the import payload", () => {
    const payload = toImportPayload({
      title: "  Java Developer  ",
      companyName: "  Inblue  ",
      sourceJobId: "jd-1",
      isExist: false,
      existingJobDescriptionId: 99,
      postedAt: "2026-08-20",
      validThrough: "2026-09-20",
    });

    expect(payload.title).toBe("Java Developer");
    expect(payload.companyName).toBe("Inblue");
    expect(payload).not.toHaveProperty("isExist");
    expect(payload).not.toHaveProperty("existingJobDescriptionId");
    expect(payload).not.toHaveProperty("postedAt");
    expect(payload).not.toHaveProperty("validThrough");
  });

  it("normalizes skills from common separators", () => {
    expect(splitSkills("Java, Spring Boot; Docker | AWS")).toEqual([
      "Java",
      "Spring Boot",
      "Docker",
      "AWS",
    ]);
  });

  it("converts crawled HTML to readable plain text", () => {
    expect(plainText("<p>Build APIs &amp; services</p><p>Write tests</p>")).toBe(
      "Build APIs & services\n\nWrite tests"
    );
  });
});
