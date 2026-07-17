import { useTranslation } from "react-i18next";
/**
 * StudentSessionRoomPage.tsx
 * Active video call room for student mentor-review sessions.
 * Route: /user/sessions/room/:sessionId
 *
 * Mirrors MentorSessionRoomPage:
 *   - Renders Daily.co iframe inline via <VideoCallProvider>/<VideoCallRoom>
 *     so we can listen to `joined-meeting` and POST
 *     /api/sessions/join-session (sets startTime1).
 *   - Polls /api/sessions/{id} so we react when Daily.co webhook flips
 *     status ONGOING -> COMPLETED.
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import {
  SESSION_QUERY_KEYS,
  useJoinSession,
  useLeaveSession,
  useSessionById,
} from "@/hooks/useSession";
import { formatDateTime, formatTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Calendar, Clock, Settings, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function StudentSessionRoomPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [hasJoinedTracking, setHasJoinedTracking] = useState(false);
  // Cache the local Daily.co participantId so we can pass it to /leave-session
  //   when the user exits (best-effort: BE primary signal is via the Daily.co
  //   webhook, but this guarantees endTime* is written even when the user
  //   closes the tab without a clean Daily.co leave event).
  const [joinedParticipantId, setJoinedParticipantId] = useState<string | null>(null);
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const numericSessionId = Number(sessionId);
  const {
    data: session,
    isLoading,
    error,
    refetch: refetchSession,
  } = useSessionById(numericSessionId);
  const joinSessionMutation = useJoinSession();
  const leaveSessionMutation = useLeaveSession();

  const canJoin =
    session &&
    (session.status === "PAID" || session.status === "ONGOING" || session.status === "SCHEDULED") &&
    session.roomUrl &&
    user;

  // When Daily reports we joined, POST /api/sessions/join-session so BE
  // stamps `startTime1` on the Session row. Then invalidate the detail
  // query so the info panel below reflects the new `participantId1` /
  // `startTime1` without a manual refresh.
  //
  // 2026-07-18: payload mirrors the legacy mock-interview flow exactly —
  //   send BOTH `mentor` AND `isMentor` (legacy alias) so BE has no
  //   ambiguity about whether this flag means "this participant is the
  //   mentor" or "this session has a mentor assigned". `mentor: true`
  //   here reflects the SESSION-LEVEL meaning — when a session carries
  //   a mentorId, both participants send `mentor: true` and the BE
  //   controller stamps startTime1/2 based on userId/participantId.
  const handleJoined = async (participantId: string) => {
    if (hasJoinedTracking || !session?.roomName || !user?.id) return;
    try {
      await joinSessionMutation.mutateAsync({
        sessionName: session.roomName,
        userId: user.id,
        participantId,
        mentor: true,
        isMentor: true,
      });
    } catch {
      // mutation toast handles errors; we still want to record that we tried
    }
    queryClient.invalidateQueries({
      queryKey: SESSION_QUERY_KEYS.byId(numericSessionId),
    });
    setHasJoinedTracking(true);
    setJoinedParticipantId(participantId);
  };

  // 2026-07-18: mirror the mock-interview leave flow. We fire-and-forget
  //   POST /leave-session so endTime1 is written even if Daily.co's
  //   webhook hasn't been delivered yet. The mutation tolerates 404/5xx
  //   so the user is never blocked.
  const handleLeave = () => {
    if (
      hasJoinedTracking &&
      joinedParticipantId &&
      session?.roomName &&
      typeof user?.id === "number"
    ) {
      void leaveSessionMutation.mutate({
        sessionName: session.roomName,
        sessionId: numericSessionId,
        userId: user.id,
        participantId: joinedParticipantId,
        mentor: true,
        isMentor: true,
      });
    }
    if (!Number.isNaN(numericSessionId)) {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.byId(numericSessionId),
      });
    }
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    navigate(-1);
  };

  const handleError = (errorMessage: string) => {
    console.error("[StudentSessionRoomPage] video call error:", errorMessage);
  };

  const handleRoomUnavailable = (reason: string) => {
    console.warn("[StudentSessionRoomPage] room-unavailable, refetching", { reason });
    void refetchSession();
  };

  const handlePeerLeft = () => {
    void refetchSession();
  };

  const handlePeerCountUpdated = (_info: { participantCount: number; localIsAlone: boolean }) => {
    if (_info.localIsAlone) {
      void refetchSession();
    }
  };

  useEffect(() => {
    if (!isLoading && !session) {
      navigate(-1);
    }
  }, [isLoading, session, navigate]);

  useEffect(() => {
    if (session?.status !== "ONGOING") return;
    const interval = window.setInterval(() => {
      void refetchSession();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [session?.status, refetchSession]);

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-4">
        <Skeleton className="h-8 w-48" />
        <div className="mt-4">
          <Skeleton className="h-[70vh] w-full rounded-lg" />
        </div>
        <div className="mt-4">
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container max-w-4xl py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{t("common.noInterviewSessionsFoundPleaseTry")}</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
      </div>
    );
  }

  if (!canJoin) {
    return (
      <div className="container max-w-4xl py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.unableToParticipate")}</AlertTitle>
          <AlertDescription>
            {session.status === "DRAFT" && t("common.theInterviewSessionHasNotBeenAppro")}
            {session.status === "SCHEDULED" && t("mentorSessions.theInterviewSessionHasNot1")}
            {session.status === "REJECTED" && t("common.thisInterviewSessionHasBeenDeclined")}
            {session.status === "COMPLETED" && t("common.thisInterviewSessionHasEnded")}
            {session.status === "CANCELED" && t("common.thisInterviewSessionHasBeenCancelle")}
            {!session.roomUrl &&
              session.status !== "DRAFT" &&
              session.status !== "REJECTED" &&
              session.status !== "COMPLETED" &&
              session.status !== "CANCELED" &&
              t("common.theMeetingRoomHasNotBeenCreatedYe")}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-4">
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <h1 className="text-2xl font-bold">{t("userMentorReview.interviewRoomTitle")}</h1>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeviceCheckOpen(true)}
            className="gap-2">
            <Settings className="h-4 w-4" />
            {t("common.checkTheDevice")}
          </Button>
        </div>
      </div>

      <DeviceCheckDialog
        isOpen={isDeviceCheckOpen}
        onOpenChange={setIsDeviceCheckOpen}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        onConfirm={() => {
          setIsDeviceCheckOpen(false);
          setHasConfirmedDevices(true);
        }}
      />

      {hasConfirmedDevices ? (
        <div className="w-full">
          <VideoCallProvider>
            <VideoCallRoom
              roomUrl={session.roomUrl!}
              userName={displayName.trim() || user?.name || t("common.candidate")}
              onLeave={handleLeave}
              onError={handleError}
              onJoined={handleJoined}
              onParticipantLeft={handlePeerLeft}
              onParticipantCountUpdated={handlePeerCountUpdated}
              onRoomUnavailable={handleRoomUnavailable}
              className="h-[80vh] w-full"
            />
          </VideoCallProvider>
        </div>
      ) : (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed">
          <Settings className="h-12 w-12 text-slate-400" />
          <p className="text-lg font-medium text-slate-600">
            {t("common.pleaseCheckYourEquipmentBeforeParti")}
          </p>
          <Button onClick={() => setIsDeviceCheckOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            {t("common.checkTheDevice")}
          </Button>
        </div>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{t("common.interviewSessionInformation")}</CardTitle>
          <CardDescription>{t("common.interviewDetails")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="text-muted-foreground h-4 w-4 shrink-0" />
              <span>
                {t("common.room")} {session.roomName}
              </span>
            </div>
            {session.joinTime && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>
                  {t("common.meetingHours")} {formatDateTime(session.joinTime)}
                </span>
              </div>
            )}
            {session.startTime1 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>
                  {t("common.begin")} {formatTime(treatZuluAsVietnamLocal(session.startTime1))}
                </span>
              </div>
            )}
            {typeof session.durationSeconds1 === "number" && session.durationSeconds1 > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>
                  {t("common.duration1")} {Math.floor(session.durationSeconds1 / 60)}{" "}
                  {t("common.minute")}
                </span>
              </div>
            )}
            {session.startTime2 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>
                  {t("userMentorReview.mentorJoined")}:{" "}
                  {formatTime(treatZuluAsVietnamLocal(session.startTime2))}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
