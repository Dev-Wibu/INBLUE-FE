import type { UserScheduleEventDto } from "@/hooks/useUserSchedule";
import type { Session } from "@/interfaces";
import { formatTime, parseBackendDate, toVietnamDateKey } from "@/lib/formatting";
import i18n from "@/lib/i18n";

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

export interface SessionStatusConfig {
  label: string;
  dot: string;
  badgeClass: string;
}

const t = (key: string) => i18n.t(key) as string;

export const getSessionStatusConfig = (status?: string): SessionStatusConfig => {
  const configs: Record<string, SessionStatusConfig> = {
    DRAFT: {
      label: t("common.waitingForApproval"),
      dot: "bg-amber-500",
      badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    SCHEDULED: {
      label: t("common.comingSoon"),
      dot: "bg-blue-500",
      badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    PAID: {
      label: t("common.paid"),
      dot: "bg-emerald-500",
      badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    ONGOING: {
      label: t("common.ongoing"),
      dot: "bg-green-500",
      badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    },
    COMPLETED: {
      label: t("general.completed"),
      dot: "bg-slate-400",
      badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    REJECTED: {
      label: t("common.rejected"),
      dot: "bg-red-500",
      badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    CANCELED: {
      label: t("common.canceled"),
      dot: "bg-rose-500",
      badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
  };
  return configs[status || "SCHEDULED"] || configs.SCHEDULED;
};

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

/**
 * Transform UserScheduleEventDto from /api/users/schedule to Session-like format
 * for use with existing calendar components
 */
export const transformScheduleEventToSession = (event: UserScheduleEventDto): Session => {
  return {
    id: event.sessionId || 0,
    roomName: event.title || event.jobTitle || "Schedule Event",
    joinTime: event.start,
    status: mapEventStatusToSession(event.status),
    roomUrl: event.roomUrl,
    // Map eventType to determine type
    kioskId: event.kioskId,
  };
};

/**
 * Map schedule event status to session status
 */
export const mapEventStatusToSession = (status?: string): Session["status"] => {
  const statusMap: Record<string, Session["status"]> = {
    SCHEDULED: "SCHEDULED",
    PENDING: "DRAFT",
    ONGOING: "ONGOING",
    IN_PROGRESS: "ONGOING",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELED",
    CANCELED: "CANCELED",
    REJECTED: "REJECTED",
    PAID: "PAID",
    DRAFT: "DRAFT",
    // Kiosk statuses
    AWAITING_MENTOR: "SCHEDULED",
    MENTOR_ASSIGNED: "SCHEDULED",
    ROOM_CREATED: "PAID",
    // AI Interview statuses
    CREATED: "DRAFT",
  };
  return statusMap[status || ""] || "SCHEDULED";
};

/**
 * Build calendar items from schedule events
 */
export const buildCalendarSessionsFromEvents = (
  events: UserScheduleEventDto[]
): UserCalendarSession[] => {
  return events
    .filter((event) => event.start && event.status !== "CANCELLED" && event.status !== "CANCELED")
    .reduce<UserCalendarSession[]>((result, event) => {
      const startDate = parseBackendDate(event.start);
      if (!startDate) {
        return result;
      }

      const sessionLike = transformScheduleEventToSession(event);
      result.push({
        session: sessionLike as Session,
        joinDate: startDate,
        dateKey: toDateKey(startDate),
        timestamp: startDate.getTime(),
      });
      return result;
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp);
};
