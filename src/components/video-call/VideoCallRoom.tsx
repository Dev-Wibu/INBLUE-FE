import { useTranslation } from "react-i18next";
/**
 * VideoCallRoom.tsx
 * Main video call room component using Daily.co iframe (createFrame)
 * Matches VideoCall-Fe: full Daily.co UI with pre-call lobby, device settings, call controls
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useVideoCall } from "./useVideoCall";
interface VideoCallRoomProps {
  roomUrl: string;
  userName: string;
  onLeave?: () => void;
  onError?: (_error: string) => void;
  onJoined?: (_participantId: string) => void;
  /**
   * 2026-07-13 v062: granular Daily.co callbacks. Each is best-effort.
   */
  onParticipantJoined?: (_p: import("./VideoCallContext").ParticipantPayload) => void;
  onParticipantLeft?: (_p: import("./VideoCallContext").ParticipantPayload) => void;
  onParticipantCountUpdated?: (_info: { participantCount: number; localIsAlone: boolean }) => void;
  /**
   * 2026-07-13 v063: fired only when the Daily.co error is classified as
   *   `room-unavailable` (exp-room / "no longer available"). Lets the page
   *   react without parsing the human-readable error string.
   */
  onRoomUnavailable?: (_reason: string) => void;
  className?: string;
}
export function VideoCallRoom({
  roomUrl,
  userName,
  onLeave,
  onError,
  onJoined,
  onParticipantJoined,
  onParticipantLeft,
  onParticipantCountUpdated,
  onRoomUnavailable,
  className,
}: VideoCallRoomProps) {
  const { t } = useTranslation();
  const { joinRoom, roomState, error, errorReason, callObject } = useVideoCall();
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCalledOnJoined = useRef(false);
  const hasStartedJoin = useRef(false);

  // 2026-07-13 v062: stable callbacks object so joinRoom doesn't re-fire
  // on each render. Only its identity changes if any of the 3 deps changes.
  const videoCallbacks = useMemo(
    () =>
      onParticipantJoined || onParticipantLeft || onParticipantCountUpdated
        ? {
            ...(onParticipantJoined ? { onParticipantJoined } : {}),
            ...(onParticipantLeft ? { onParticipantLeft } : {}),
            ...(onParticipantCountUpdated ? { onParticipantCountUpdated } : {}),
          }
        : undefined,
    [onParticipantJoined, onParticipantLeft, onParticipantCountUpdated]
  );

  // Reset flags when roomUrl changes (new room)
  useEffect(() => {
    hasCalledOnJoined.current = false;
    hasStartedJoin.current = false;
  }, [roomUrl]);

  // Join room on mount - pass container element for iframe
  useEffect(() => {
    if (
      roomUrl &&
      userName &&
      roomState === "idle" &&
      containerRef.current &&
      !hasStartedJoin.current
    ) {
      hasStartedJoin.current = true;
      joinRoom(roomUrl, userName, containerRef.current, videoCallbacks);
    }
  }, [roomUrl, userName, roomState, joinRoom, videoCallbacks]);

  // Handle error callback
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // 2026-07-13 v063: forward machine-readable "room-unavailable" to consumers
  //   so they can refetch the session when BE returned a stale roomUrl.
  const hasFiredRoomUnavailable = useRef(false);
  useEffect(() => {
    if (
      errorReason === "room-unavailable" &&
      onRoomUnavailable &&
      !hasFiredRoomUnavailable.current
    ) {
      hasFiredRoomUnavailable.current = true;
      onRoomUnavailable(errorReason);
    }
    if (errorReason !== "room-unavailable") {
      // Reset so a subsequent exp-room (after refetch) re-fires.
      hasFiredRoomUnavailable.current = false;
    }
  }, [errorReason, onRoomUnavailable]);

  // Handle joined callback - fire only once per room
  useEffect(() => {
    if (roomState === "joined" && callObject && onJoined && !hasCalledOnJoined.current) {
      const localParticipant = callObject.participants()?.local;
      if (localParticipant?.session_id) {
        hasCalledOnJoined.current = true;
        onJoined(localParticipant.session_id);
      }
    }
  }, [roomState, callObject, onJoined]);

  // Handle leave callback
  const handleLeave = useCallback(() => {
    onLeave?.();
  }, [onLeave]);
  const normalizedError = (error || "").toLowerCase();
  const isRoomUnavailableError =
    normalizedError.includes("room is no longer available") ||
    normalizedError.includes(t("compVideoCall.noLongerAvailable")) ||
    normalizedError.includes(t("compVideoCall.expired")) ||
    normalizedError.includes("exp-room");

  // Trigger leave callback when room state becomes "left"
  useEffect(() => {
    if (roomState === "left") {
      handleLeave();
    }
  }, [roomState, handleLeave]);

  // Render error state
  if (roomState === "error") {
    if (isRoomUnavailableError) {
      return (
        <div
          className={cn(
            "w-full rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
            className
          )}>
          <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 rounded-full bg-red-100 p-4 dark:bg-red-900">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {t("compVideoCall.meetingRoomsAreNoLonger")}
            </h3>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
              {t("compVideoCall.thisRoomLinkHasExpired")}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="default" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("compVideoCall.reloadTheRoom")}
              </Button>
              <Button variant="outline" onClick={handleLeave}>
                {t("common.returnToTheSessionList")}
              </Button>
            </div>

            <p className="text-muted-foreground mt-4 text-xs">
              {t("compVideoCall.ifTheErrorPersistsPlease")}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "border-border w-full rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900",
          className
        )}>
        <div className="flex flex-col items-center justify-center p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("compVideoCall.connectionError")}</AlertTitle>
            <AlertDescription>
              {error || t("compVideoCall.anErrorOccurredWhileConnecting")}
            </AlertDescription>
          </Alert>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("common.retry")}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLeave}>
              {t("general.back")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render left state
  if (roomState === "left") {
    return (
      <div
        className={cn(
          "border-border w-full rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900",
          className
        )}>
        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <p className="text-muted-foreground text-lg">
            {t("compVideoCall.youHaveLeftTheMeeting")}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "border-border relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-slate-900",
        className
      )}>
      <div ref={containerRef} className="relative flex-1 overflow-hidden" />
    </div>
  );
}
