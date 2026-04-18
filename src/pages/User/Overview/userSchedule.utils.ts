import type { Session } from "@/interfaces";
import { formatTime, parseBackendDate, toVietnamDateKey } from "@/lib/formatting";

export const USER_CALENDAR_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "PAID",
  "ONGOING",
  "COMPLETED",
  "REJECTED",
  "CANCELED",
] as const;

const USER_CALENDAR_STATUS_SET = new Set<string>(USER_CALENDAR_STATUSES);

export interface UserCalendarSession {
  session: Session;
  joinDate: Date;
  dateKey: string;
  timestamp: number;
}

export const isUserCalendarStatus = (status?: string): boolean => {
  return status ? USER_CALENDAR_STATUS_SET.has(status) : false;
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

export const buildUserCalendarSessions = (sessions: Session[]): UserCalendarSession[] => {
  return sessions
    .filter((session) => isUserCalendarStatus(session.status))
    .reduce<UserCalendarSession[]>((result, session) => {
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

export const groupUserCalendarByDate = (
  items: UserCalendarSession[]
): Map<string, UserCalendarSession[]> => {
  const grouped = new Map<string, UserCalendarSession[]>();

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
