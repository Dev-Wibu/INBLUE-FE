import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { sessionManager } from "@/services/session.manager";

export type MentorRoundButtonState =
  | "NOT_YET"
  | "CAN_JOIN"
  | "IN_SESSION"
  | "WAIT_REVIEW"
  | "RATE_MENTOR"
  | "DONE";

export interface MentorRoundSessionView {
  id: number;
  status: string;
  joinTime: string | null;
  startTime1: string | null;
  endTime1: string | null;
  startTime2: string | null;
  endTime2: string | null;
  roomUrl: string | null;
  mentorId: number | null;
  hasMentorReview: boolean;
  hasMentorFeedback: boolean;
}

const SESSION_DETAIL_POLL_MS = 5_000;

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELED", "REJECTED"]);

function isJoinable(status: string | undefined | null): boolean {
  if (!status) return false;
  // Student can join as long as the session has a room and is not done.
  return status === "SCHEDULED" || status === "PAID" || status === "ONGOING";
}

function buildView(raw: unknown): MentorRoundSessionView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : Number(r.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    status: typeof r.status === "string" ? r.status : "",
    joinTime: typeof r.joinTime === "string" ? r.joinTime : null,
    startTime1: (r.startTime1 as string | null | undefined) ?? null,
    endTime1: (r.endTime1 as string | null | undefined) ?? null,
    startTime2: (r.startTime2 as string | null | undefined) ?? null,
    endTime2: (r.endTime2 as string | null | undefined) ?? null,
    roomUrl: (r.roomUrl as string | null | undefined) ?? null,
    mentorId: typeof r.mentorId === "number" ? r.mentorId : null,
    hasMentorReview: r.mentorReview != null && typeof r.mentorReview === "object",
    hasMentorFeedback: r.mentorFeedback != null && typeof r.mentorFeedback === "object",
  };
}

function computeState(view: MentorRoundSessionView | null): MentorRoundButtonState {
  if (!view) return "NOT_YET";
  const status = view.status;
  if (status === "CANCELED" || status === "REJECTED") return "NOT_YET";
  const now = Date.now();
  const joinTs = view.joinTime ? new Date(view.joinTime).getTime() : NaN;
  const studentJoined = !!view.startTime1;
  const studentLeft = !!view.endTime1;

  // Future joinTime and not yet completed → hide everything behind a countdown.
  if (Number.isFinite(joinTs) && now < joinTs && status !== "COMPLETED") {
    return "NOT_YET";
  }

  // Session is COMPLETED — drive state off the review/feedback flags.
  if (status === "COMPLETED") {
    if (!view.hasMentorReview) return "WAIT_REVIEW";
    if (view.hasMentorReview && !view.hasMentorFeedback) return "RATE_MENTOR";
    return "DONE";
  }

  // Active session: student hasn't left yet → rejoin.
  if (studentJoined && !studentLeft && status === "ONGOING") {
    return "IN_SESSION";
  }

  // Student has joined but BE hasn't marked COMPLETED yet (webhook pending).
  if (studentLeft && !TERMINAL_STATUSES.has(status)) {
    return "CAN_JOIN";
  }

  if (isJoinable(status)) return "CAN_JOIN";
  return "NOT_YET";
}

export interface UseMentorRoundButtonStateOptions {
  /** Optional override for the polling cadence (ms). Defaults to 5s. */
  pollIntervalMs?: number;
  /** Skip the network call entirely (e.g. when sessionId is invalid). */
  enabled?: boolean;
}

export interface UseMentorRoundButtonStateResult {
  state: MentorRoundButtonState;
  session: MentorRoundSessionView | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useMentorRoundButtonState(
  sessionId: number | null | undefined,
  options: UseMentorRoundButtonStateOptions = {}
): UseMentorRoundButtonStateResult {
  const { pollIntervalMs = SESSION_DETAIL_POLL_MS, enabled = true } = options;
  const queryClient = useQueryClient();
  const safeId =
    typeof sessionId === "number" && Number.isFinite(sessionId) && sessionId > 0 ? sessionId : null;

  const queryKey = useMemo(() => ["mentor-round-session", safeId] as const, [safeId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: enabled && safeId !== null,
    queryFn: async (): Promise<MentorRoundSessionView | null> => {
      if (safeId === null) return null;
      const response = await sessionManager.getById(safeId);
      if (!response.success || !response.data) {
        // Treat "not found" as a soft signal — caller's UI can fall back.
        return null;
      }
      return buildView(response.data);
    },
    // The session-detail endpoint is cheap but should be cached briefly.
    staleTime: 2_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Lightweight polling: keep the toggle fresh while the interview is in
  // progress. We stop polling once the session reaches a terminal state to
  // avoid hammering BE.
  useEffect(() => {
    if (!enabled || safeId === null) return;
    const status = data?.status;
    if (status && TERMINAL_STATUSES.has(status)) return;
    const interval = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey });
    }, pollIntervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, safeId, data?.status, pollIntervalMs, queryClient, queryKey]);

  return {
    state: computeState(data ?? null),
    session: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: () => {
      void refetch();
    },
  };
}

/**
 * Convenience helper: derive a human-readable countdown string from a
 * session's `joinTime`. Returns null when no joinTime is available.
 */
export function formatCountdownUntil(joinTime: string | null | undefined): string | null {
  if (!joinTime) return null;
  const target = new Date(joinTime).getTime();
  if (Number.isNaN(target)) return null;
  const diffMs = target - Date.now();
  if (diffMs <= 0) return null;
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) {
    return `${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }
  return `${seconds} giây`;
}

export const __testables = { computeState, buildView };
