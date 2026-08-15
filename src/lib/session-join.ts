import { toTimestamp } from "@/lib/formatting";

export const SESSION_EARLY_JOIN_WINDOW_MS = 15 * 60 * 1000;
export const SESSION_LATE_JOIN_WINDOW_MS = 15 * 60 * 1000;

const JOINABLE_STATUSES = new Set(["SCHEDULED", "PAID", "ONGOING"]);

interface SessionJoinInput {
  joinTime?: string | null;
  roomUrl?: string | null;
  status?: string | null;
}

export interface SessionJoinAvailability {
  canJoin: boolean;
  joinTimestamp: number | null;
  opensAt: number | null;
  closesAt: number | null;
  isBeforeJoinWindow: boolean;
  isAfterJoinWindow: boolean;
  hasRoom: boolean;
  hasJoinableStatus: boolean;
}

export function getSessionJoinAvailability(
  session: SessionJoinInput,
  now = Date.now()
): SessionJoinAvailability {
  const joinTimestamp = toTimestamp(session.joinTime);
  const opensAt = joinTimestamp !== null ? joinTimestamp - SESSION_EARLY_JOIN_WINDOW_MS : null;
  const closesAt = joinTimestamp !== null ? joinTimestamp + SESSION_LATE_JOIN_WINDOW_MS : null;
  const isBeforeJoinWindow = opensAt !== null && now < opensAt;
  const isAfterJoinWindow = closesAt !== null && now > closesAt;
  const hasRoom = Boolean(session.roomUrl && session.roomUrl !== "OFFLINE");
  const hasJoinableStatus = JOINABLE_STATUSES.has(session.status || "");
  const hasScheduledTime = joinTimestamp !== null;
  const isOngoing = session.status === "ONGOING";

  return {
    canJoin:
      hasJoinableStatus &&
      hasRoom &&
      (isOngoing || (hasScheduledTime && !isBeforeJoinWindow && !isAfterJoinWindow)),
    joinTimestamp,
    opensAt,
    closesAt,
    isBeforeJoinWindow,
    isAfterJoinWindow,
    hasRoom,
    hasJoinableStatus,
  };
}
