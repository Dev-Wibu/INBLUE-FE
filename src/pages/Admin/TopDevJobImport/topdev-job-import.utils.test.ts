import { describe, expect, it } from "vitest";

import {
  plainText,
  resolveDisplayedLevel,
  splitSkills,
  toImportPayload,
} from "./topdev-job-import.utils";

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

  it("keeps the selected search level when a preview omits requestedLevel", () => {
    const payload = toImportPayload(
      {
        title: "Backend internship",
        companyName: "Inblue",
      },
      "INTERN"
    );

    expect(payload.requestedLevel).toBe("INTERN");
  });

  it("prefers the preview level over the filter fallback", () => {
    const payload = toImportPayload(
      {
        title: "Junior Java Developer",
        companyName: "Inblue",
        requestedLevel: "JUNIOR",
      },
      "INTERN"
    );

    expect(payload.requestedLevel).toBe("JUNIOR");
  });

  it("shows the persisted level for an imported job instead of the current search level", () => {
    const importedPreview = {
      title: "Sales Manager",
      companyName: "Example",
      sourceJobId: "2123568",
      isExist: true,
      requestedLevel: "MIDDLE" as const,
    };

    expect(resolveDisplayedLevel(importedPreview, "INTERN")).toBe("INTERN");
    expect(resolveDisplayedLevel(importedPreview)).toBeUndefined();
  });

  it("shows the requested level as the future import level for an available job", () => {
    expect(
      resolveDisplayedLevel({
        title: "Backend internship",
        companyName: "Example",
        isExist: false,
        requestedLevel: "INTERN",
      })
    ).toBe("INTERN");
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
