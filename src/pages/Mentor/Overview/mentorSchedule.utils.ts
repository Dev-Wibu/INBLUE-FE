import type { Session } from "@/interfaces";
import { formatTime, parseBackendDate, toVietnamDateKey } from "@/lib/formatting";

export const MENTOR_CALENDAR_STATUSES = ["SCHEDULED", "PAID", "ONGOING", "COMPLETED"] as const;

const MENTOR_CALENDAR_STATUS_SET = new Set<string>(MENTOR_CALENDAR_STATUSES);

export interface MentorCalendarSession {
  session: Session;
  joinDate: Date;
  dateKey: string;
  timestamp: number;
}

export const isMentorCalendarStatus = (status?: string): boolean => {
  return status ? MENTOR_CALENDAR_STATUS_SET.has(status) : false;
};

export const parseJoinDate = (joinTime?: string): Date | undefined => {
  return parseBackendDate(joinTime) || undefined;
};

export const toDateKey = (date: Date): string => {
  return toVietnamDateKey(date) || "";
};

export const formatCalendarTime = (joinTime?: string): string => {
  return formatTime(joinTime, "--:--");
};

export const buildMentorCalendarSessions = (
  sessions: Session[],
  mentorId?: number
): MentorCalendarSession[] => {
  if (!mentorId) {
    return [];
  }

  return sessions
    .filter((session) => session.userId2 === mentorId)
    .filter((session) => isMentorCalendarStatus(session.status))
    .reduce<MentorCalendarSession[]>((result, session) => {
      const joinDate = parseJoinDate(session.joinTime);
      if (!joinDate) {
        return result;
      }

      result.push({
        session,
        joinDate,
        dateKey: toDateKey(joinDate),
        timestamp: joinDate.getTime(),
      });
      return result;
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp);
};

export const groupMentorCalendarByDate = (
  items: MentorCalendarSession[]
): Map<string, MentorCalendarSession[]> => {
  const grouped = new Map<string, MentorCalendarSession[]>();

  for (const item of items) {
    const current = grouped.get(item.dateKey) ?? [];
    current.push(item);
    grouped.set(item.dateKey, current);
  }

  for (const [, dayItems] of grouped) {
    dayItems.sort((a, b) => a.timestamp - b.timestamp);
  }

  return grouped;
};
