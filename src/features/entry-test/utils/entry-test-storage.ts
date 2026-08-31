import type { EntryTestDraftV1 } from "../types/entry-test.types";

export const draftStorageKey = (userId: number, attemptId: number) =>
  `inblue:entry-test:draft:v1:${userId}:${attemptId}`;

export const activeAttemptStorageKey = (userId: number) =>
  `inblue:entry-test:active-attempt:v1:${userId}`;

export function saveEntryTestDraft(draft: EntryTestDraftV1) {
  localStorage.setItem(draftStorageKey(draft.userId, draft.attemptId), JSON.stringify(draft));
  localStorage.setItem(activeAttemptStorageKey(draft.userId), String(draft.attemptId));
}

export function loadEntryTestDraft(userId: number, attemptId: number) {
  const raw = localStorage.getItem(draftStorageKey(userId, attemptId));
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<EntryTestDraftV1>;
    if (
      value.version !== 1 ||
      value.userId !== userId ||
      value.attemptId !== attemptId ||
      !value.testSnapshot ||
      !Number.isFinite(value.deadlineEpochMs)
    ) {
      return null;
    }
    return value as EntryTestDraftV1;
  } catch {
    return null;
  }
}

export function getActiveAttemptId(userId: number) {
  const value = Number(localStorage.getItem(activeAttemptStorageKey(userId)));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function clearEntryTestDraft(userId: number, attemptId: number) {
  localStorage.removeItem(draftStorageKey(userId, attemptId));
  if (getActiveAttemptId(userId) === attemptId) {
    localStorage.removeItem(activeAttemptStorageKey(userId));
  }
}
