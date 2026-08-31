import { beforeEach, describe, expect, it } from "vitest";

import { loadEntryTestDraft, saveEntryTestDraft } from "./entry-test-storage";

describe("entry test storage", () => {
  beforeEach(() => localStorage.clear());

  it("rejects a draft belonging to another user", () => {
    saveEntryTestDraft({
      version: 1,
      userId: 7,
      attemptId: 10,
      entryTestId: 2,
      timeLimitMinutes: 60,
      deadlineEpochMs: Date.now() + 1000,
      currentSection: "COMMON_QUIZ",
      currentItemId: null,
      quizDrafts: {},
      codingDrafts: {},
      testSnapshot: {
        attemptId: 10,
        entryTestId: 2,
        timeLimitMinutes: 60,
        selectedLanguagesJson: [],
        sectionConfigs: [],
        commonQuizItemsJson: [],
        specificQuizItemsJson: [],
        specificCodingItemsJson: [],
      },
      savedAt: new Date().toISOString(),
    });

    expect(loadEntryTestDraft(8, 10)).toBeNull();
  });
});
