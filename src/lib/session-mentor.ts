/**
 * Helpers for resolving the mentor ID of a session across API response shapes.
 *
 * Background:
 * The backend `SessionDetailResponse` (returned by `GET /api/sessions/{id}`)
 * exposes the mentor via the `mentorId` field. Older / list-shaped responses
 * (`Session`, `GET /api/sessions/...` collections) expose it via `userId2`
 * (the DB column name). Some BE responses include both, but `SessionDetailResponse`
 * only includes `mentorId`.
 *
 * Code must use these helpers instead of reading `.userId2` directly, otherwise
 * permission checks silently fail with `undefined !== userId` and the UI blocks
 * legitimate mentor actions (e.g. write feedback).
 */

export interface SessionLike {
  mentorId?: number | null;
  userId2?: number | null;
}

/**
 * Returns the mentor ID for a session, preferring `mentorId` (current API shape)
 * and falling back to `userId2` (legacy / list-shape responses).
 *
 * Returns `undefined` if neither field is populated.
 */
export function getSessionMentorId(session: SessionLike | null | undefined): number | undefined {
  if (!session) return undefined;
  if (session.mentorId != null) return session.mentorId;
  if (session.userId2 != null) return session.userId2;
  return undefined;
}

/**
 * Returns `true` if the given user ID matches the mentor of the session.
 * Uses the same fallback as `getSessionMentorId`.
 */
export function isSessionMentor(
  session: SessionLike | null | undefined,
  userId: number | null | undefined
): boolean {
  if (userId == null) return false;
  const mentorId = getSessionMentorId(session);
  return mentorId === userId;
}

/**
 * Returns a label string for the mentor (e.g. "Mentor #4") or the provided
 * fallback when the mentor ID cannot be resolved.
 */
export function getSessionMentorLabel(
  session: SessionLike | null | undefined,
  fallback: string
): string {
  const mentorId = getSessionMentorId(session);
  return mentorId != null ? `Mentor #${mentorId}` : fallback;
}
