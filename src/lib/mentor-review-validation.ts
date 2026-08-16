export const MENTOR_REVIEW_NOTE_MAX_LENGTH = 255;

export const MENTOR_REVIEW_TEXT_FIELDS = [
  "situationNote",
  "taskNote",
  "actionNote",
  "resultNote",
  "strength",
  "weakness",
  "improve",
] as const;

export type MentorReviewTextFieldName = (typeof MENTOR_REVIEW_TEXT_FIELDS)[number];

export function hasOverlongMentorReviewNote(
  review: Partial<Record<MentorReviewTextFieldName, string | undefined>>
): boolean {
  return MENTOR_REVIEW_TEXT_FIELDS.some(
    (field) => (review[field]?.trim().length ?? 0) > MENTOR_REVIEW_NOTE_MAX_LENGTH
  );
}
