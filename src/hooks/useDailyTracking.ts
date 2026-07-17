import DailyIframe from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseDailyTrackingOptions {
  roomUrl: string | null | undefined;
  roomName: string | null | undefined;
  userId: number | null | undefined;
  token: string | null | undefined;
  /** `false` for student, `true` for mentor. */
  isMentor?: boolean;
  /** When true, the call is created but you must call `join()` yourself. */
  manualJoin?: boolean;
  enabled?: boolean;
}

export interface UseDailyTrackingResult {
  joinError: string | null;
  joinedAt: Date | null;
  leftAt: Date | null;
  callObject: ReturnType<typeof DailyIframe.createCallObject> | null;
  join: () => Promise<void>;
  leave: () => Promise<void>;
}

/**
 * Track student/mentor time-in-room for a Daily.co session.
 *
 * Listening on `joined-meeting` we POST /api/sessions/join-session so
 * BE can stamp `startTime1/2` on the Session row. Listening on
 * `left-meeting` is informational only — BE is updated via Daily's
 * webhook (`POST /api/sessions/webhooks/dailyco`), not by the FE.
 *
 * startTime is only set the first time the user joins. Refreshes and
 * re-joins keep the original timestamp so the duration is correct.
 */
export function useDailyTracking({
  roomUrl,
  roomName,
  userId,
  token,
  isMentor = false,
  manualJoin = false,
  enabled = true,
}: UseDailyTrackingOptions): UseDailyTrackingResult {
  const callRef = useRef<ReturnType<typeof DailyIframe.createCallObject> | null>(null);
  const [joinedAt, setJoinedAt] = useState<Date | null>(null);
  const [leftAt, setLeftAt] = useState<Date | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const apiBase = (() => {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) {
      return String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, "");
    }
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  })();

  const callTrackApi = useCallback(
    async (participantId: string) => {
      if (!roomName || !userId || !token) return;
      try {
        const res = await fetch(`${apiBase}/api/sessions/join-session`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionName: roomName,
            userId,
            participantId,
            mentor: isMentor,
          }),
        });
        if (!res.ok && res.status !== 200) {
          let msg = `Failed: ${res.status}`;
          try {
            const data = (await res.json()) as { message?: string };
            if (data?.message) msg = data.message;
          } catch {
            // body may be empty
          }
          console.error("[useDailyTracking] join-session failed:", msg);
          setJoinError(msg);
          return;
        }
        setJoinedAt(new Date());
        setJoinError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        console.error("[useDailyTracking] join-session exception:", msg);
        setJoinError(msg);
      }
    },
    [apiBase, isMentor, roomName, token, userId]
  );

  useEffect(() => {
    if (!enabled) return;
    if (!roomUrl || roomUrl === "OFFLINE") return;
    if (!token) return;

    // Build the call object. We keep it mounted across re-joins so we
    // don't lose the participantId mapping.
    const call = DailyIframe.createCallObject({
      url: roomUrl,
      // public room — no token needed
    });
    callRef.current = call;

    const handleJoined = () => {
      const local = call.participants()?.local;
      const participantId = local?.session_id;
      if (!participantId) return;
      void callTrackApi(participantId);
    };

    const handleLeft = () => {
      setLeftAt(new Date());
    };

    const handleError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Daily call error";
      console.error("[useDailyTracking] daily error:", msg);
      setJoinError(msg);
    };

    call.on("joined-meeting", handleJoined);
    call.on("left-meeting", handleLeft);
    call.on("error", handleError);

    if (!manualJoin) {
      void call.join().catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Unable to join Daily room";
        console.error("[useDailyTracking] join() failed:", msg);
        setJoinError(msg);
      });
    }

    return () => {
      try {
        call.off("joined-meeting", handleJoined);
        call.off("left-meeting", handleLeft);
        call.off("error", handleError);
        void call.leave().catch(() => undefined);
        call.destroy();
      } finally {
        callRef.current = null;
      }
    };
  }, [callTrackApi, enabled, manualJoin, roomUrl, token]);

  const join = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    await call.join();
  }, []);

  const leave = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    await call.leave();
  }, []);

  return {
    joinError,
    joinedAt,
    leftAt,
    callObject: callRef.current,
    join,
    leave,
  };
}
