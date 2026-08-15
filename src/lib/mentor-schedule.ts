export const MENTOR_SCHEDULE_MIN_LEAD_MS = 5 * 60 * 1000;

export function isMentorScheduleTimeValid(startTime: Date | null, now: Date = new Date()): boolean {
  return Boolean(
    startTime &&
    Number.isFinite(startTime.getTime()) &&
    startTime.getTime() >= now.getTime() + MENTOR_SCHEDULE_MIN_LEAD_MS
  );
}
