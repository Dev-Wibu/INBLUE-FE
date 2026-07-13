import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * Custom hooks for Session operations
 * Uses React Query for server state
 */

import type { Session } from "@/interfaces";
import { getNormalizedErrorMessage } from "@/lib/error-normalizer";
import type { JoinSessionRequest, SessionCreationRequest } from "@/services/session.manager";
import { sessionManager } from "@/services/session.manager";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Query Keys
export const SESSION_QUERY_KEYS = {
  all: ["sessions"] as const,
  byId: (id: number) => ["sessions", id] as const,
  byUser: (userId: number) => ["sessions", "user", userId] as const,
};

/**
 * Hook to fetch all sessions
 */
export const useSessions = () => {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.all,
    queryFn: async (): Promise<Session[]> => {
      const response = await sessionManager.getAll();
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        }
        // If paginated response, extract items array
        if ("items" in response.data && Array.isArray(response.data.items)) {
          return response.data.items;
        }
      }
      return [];
    },
  });
};

/**
 * Hook to fetch session by ID
 */
export const useSessionById = (id: number) => {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.byId(id),
    queryFn: async () => {
      const response = await sessionManager.getById(id);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || t("common.noInterviewSessionsFound"));
    },
    enabled: !!id,
  });
};

/**
 * Hook to fetch sessions for current user
 */
export const useUserSessions = () => {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.byUser(user?.id || 0),
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await sessionManager.getByUserId(user.id);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!user?.id,
  });
};

/**
 * Hook to fetch sessions by user ID
 */
export const useSessionsByUserId = (userId: number) => {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.byUser(userId),
    queryFn: async () => {
      if (!userId) return [];
      const response = await sessionManager.getByUserId(userId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: !!userId,
  });
};

/**
 * Hook to fetch completed sessions for current user (for review/feedback)
 */
export const useCompletedUserSessions = () => {
  const { data: sessions = [], ...rest } = useUserSessions();

  // Filter completed sessions
  const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
  return {
    data: completedSessions,
    ...rest,
  };
};

/**
 * Hook to create a session
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SessionCreationRequest) => {
      const response = await sessionManager.create(data);
      if (!response.success) {
        throw new Error(response.error || t("general.unableToCreateInterviewSession"));
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.all,
      });
      toast.success(t("general.scheduleRequestSentWaitFor"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToCreateInterviewSession")));
    },
  });
};

/**
 * Hook to update a session
 */
export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Session> }) => {
      const response = await sessionManager.update(id, data);
      if (!response.success) {
        throw new Error(response.error || t("general.unableToUpdateInterviewSession"));
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.byId(variables.id),
      });
      toast.success(t("general.updatedInterviewSession"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToUpdateInterviewSession")));
    },
  });
};

/**
 * Hook to cancel a session
 */
export const useCancelSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await sessionManager.delete(id);
      if (!response.success) {
        throw new Error(response.error || t("general.interviewSessionsCannotBeCanceled"));
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.all,
      });
      toast.success(t("general.interviewSessionCanceled"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.interviewSessionsCannotBeCanceled")));
    },
  });
};

/**
 * Hook to join a session (for tracking purposes with Daily.co)
 *
 * Notes from the v062 verification (2026-07-13):
 *   - BE returns HTTP 200 with an empty body. We treat any 2xx as success.
 *   - We also invalidate the matching session-detail query so any caller
 *     that polls via `useSessionById` picks up the new participantId /
 *     startTime without an extra GET. This is the "optimistic confirmation"
 *     pattern recommended by BE team.
 */
export const useJoinSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: JoinSessionRequest) => {
      const response = await sessionManager.joinSession(data);
      if (!response.success) {
        throw new Error(response.error || t("general.unableToAttendInterviewSession"));
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.all,
      });
      // Best-effort: invalidate the session-by-*Id view if we can resolve
      // it. joinSession doesn't return the sessionId, but `roomName` is
      // unique per session, so we cannot map back without a stored id. The
      // common path is for the caller (the room page) to also invalidate
      // SESSION_QUERY_KEYS.byId manually after mutation.
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success(t("general.participatedInTheInterviewSession"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToAttendInterviewSession")));
    },
  });
};

// Re-export types
export type { JoinSessionRequest, LeaveSessionRequest, Session, SessionCreationRequest };

// /**
//  * Hook to record that a participant left the Daily.co room.
//  *
//  * 2026-07-13 v062: BE may or may not expose a `POST /api/sessions/leave-session`
//  * route — the primary signal for "this participant ended the call" arrives via
//  * the Daily.co webhook (which BE receives on its own side and writes to
//  * endTime*/durationSeconds*). This hook exists so the FE can:
//  *   1. Fire-and-forget a hint to BE so endTime1 / endTime2 are guaranteed
//  *      up-to-date *before* BE's webhook is processed (best-effort).
//  *   2. Tolerate 404 / 5xx gracefully so FE never blocks user navigation
//  *      on a backend that hasn't shipped the endpoint yet.
//  *   3. Invalidate cached session data so the list page can read the new
//  *      endTime / duration / status as soon as BE has acknowledged.
//  */
export const useLeaveSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: LeaveSessionRequest) => {
      try {
        const response = await sessionManager.leaveSession(data);
        // Treat any 2xx, 404, or 405 as "ok" — BE may not have the endpoint yet.
        if (
          response.success ||
          response.error?.toLowerCase().includes("not found") ||
          response.error?.toLowerCase().includes("method not allowed")
        ) {
          return true;
        }
        return false;
      } catch (err: unknown) {
        // Backend unavailable (network/server) — don't block FE navigation.

        console.warn("[useLeaveSession] non-fatal error", err);
        return false;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
};

/**
 * Hook to approve or reject a DRAFT session
 * Uses GET /api/sessions/update-status?sessionId=X&isApproved=Y
 */
export const useUpdateSessionStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, isApproved }: { sessionId: number; isApproved: boolean }) => {
      const response = await sessionManager.updateStatus(sessionId, isApproved);
      if (!response.success) {
        throw new Error(response.error || t("general.unableToUpdateInterviewSession1"));
      }
      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.all,
      });
      toast.success(
        variables.isApproved
          ? t("general.interviewSessionApprovedSuccessfully")
          : t("common.refusedTheInterviewSession")
      );
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToUpdateInterviewSession1")));
    },
  });
};

/**
 * Hook to create payment checkout URL for a session
 * Uses GET /api/sessions/make-payment?sessionId=X
 */
export const useMakeSessionPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await sessionManager.makePayment(sessionId);
      if (!response.success || !response.data) {
        throw new Error(response.error || t("general.unableToCreatePaymentLink"));
      }
      return response.data;
    },
    onSuccess: (_checkoutUrl, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.all,
      });
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.byId(sessionId),
      });
      toast.success(t("general.createdAPaymentLinkFor"));
    },
    onError: (error: Error) => {
      toast.error(getNormalizedErrorMessage(error, t("general.unableToCreatePaymentLink")));
    },
  });
};
