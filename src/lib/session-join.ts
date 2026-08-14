import type { Session } from "@/interfaces";
import { toTimestamp } from "@/lib/formatting";

export const SESSION_EARLY_JOIN_WINDOW_MS = 15 * 60 * 1000;

const JOINABLE_STATUSES = new Set(["SCHEDULED", "PAID", "ONGOING"]);

export interface SessionJoinAvailability {
  canJoin: boolean;
  joinTimestamp: number | null;
  opensAt: number | null;
  isBeforeJoinWindow: boolean;
  hasRoom: boolean;
  hasJoinableStatus: boolean;
}

export function getSessionJoinAvailability(
  session: Pick<Session, "joinTime" | "roomUrl" | "status">,
  now = Date.now()
): SessionJoinAvailability {
  const joinTimestamp = toTimestamp(session.joinTime);
  const opensAt = joinTimestamp ? joinTimestamp - SESSION_EARLY_JOIN_WINDOW_MS : null;
  const isBeforeJoinWindow = opensAt !== null && now < opensAt;
  const hasRoom = Boolean(session.roomUrl && session.roomUrl !== "OFFLINE");
  const hasJoinableStatus = JOINABLE_STATUSES.has(session.status || "");

  return {
    canJoin: hasJoinableStatus && hasRoom && !isBeforeJoinWindow,
    joinTimestamp,
    opensAt,
    isBeforeJoinWindow,
    hasRoom,
    hasJoinableStatus,
  };
}
