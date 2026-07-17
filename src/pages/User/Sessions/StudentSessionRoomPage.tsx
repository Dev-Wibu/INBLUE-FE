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
 *   - Polls /api/sessions/{id} every 10s while ONGOING so we react when
 *     the Daily.co webhook flips status ONGOING -> COMPLETED.
 *
 * 2026-07-18 redesign — bring parity with the mentor page:
 *   - Dynamic status badge (color reflects status)
 *   - Participant timeline (you + mentor joined/left)
 *   - "View feedback" CTA on COMPLETED, mirroring the mentor "Write review"
 *   - Wait-for-peer indicator while ONGOING but no mentor startTime2 yet
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import {
  SESSION_QUERY_KEYS,
  useJoinSession,
  useLeaveSession,
  useSessionById,
} from "@/hooks/useSession";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Hourglass,
  Settings,
  User as UserIcon,
  Video,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type StatusKey = "ONGOING" | "PAID" | "SCHEDULED" | "COMPLETED" | "CANCELED" | "REJECTED" | "DRAFT";

const STATUS_STYLES: Record<StatusKey, string> = {
  ONGOING:
    "bg-green-100 text-green-700 ring-green-200 dark:bg-green-900/40 dark:text-green-300 dark:ring-green-800",
  PAID: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800",
  SCHEDULED:
    "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800",
  COMPLETED:
    "bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  CANCELED:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800",
  REJECTED:
    "bg-red-100 text-red-700 ring-red-200 dark:bg-red-900/40 dark:text-red-300 dark:ring-red-800",
  DRAFT:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800",
};

const STATUS_ICON: Record<StatusKey, JSX.Element> = {} as never as Record<StatusKey, JSX.Element>;

export function StudentSessionRoomPage() {
  const { t, i18n } = useTranslation();
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

  const sessionStatus = (session?.status ?? "DRAFT") as StatusKey;
  const statusStyle = STATUS_STYLES[sessionStatus] ?? STATUS_STYLES.DRAFT;
  const statusLabel = (() => {
    switch (sessionStatus) {
      case "ONGOING":
        return t("common.ongoing");
      case "PAID":
        return t("common.paid");
      case "SCHEDULED":
        return t("common.scheduled");
      case "COMPLETED":
        return t("common.itsOver");
      case "CANCELED":
        return t("common.canceled");
      case "REJECTED":
        return t("common.refused");
      case "DRAFT":
        return t("common.draft");
      default:
        return sessionStatus;
    }
  })();

  const peerJoined = Boolean(session?.startTime2);
  const myStart = session?.startTime1 ?? null;
  const myEnd = session?.endTime1 ?? null;
  const peerStart = session?.startTime2 ?? null;
  const peerEnd = session?.endTime2 ?? null;
  const myDurationSeconds =
    typeof session?.durationSeconds1 === "number" ? session.durationSeconds1 : null;
  const peerDurationSeconds =
    typeof session?.durationSeconds2 === "number" ? session.durationSeconds2 : null;

  const localLanguage = (i18n.resolvedLanguage ?? i18n.language ?? "vi").toLowerCase();
  const localeTag = localLanguage.startsWith("ja")
    ? "ja-JP"
    : localLanguage.startsWith("en")
      ? "en-US"
      : "vi-VN";

  const formatJoinedAt = (zulu?: string | null): string => {
    if (!zulu) return "—";
    return new Intl.DateTimeFormat(localeTag, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(treatZuluAsVietnamLocal(zulu)));
  };

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
  // 2026-07-18 (rev 2): the flag is PER-USER (this participant IS the
  //   mentor), not session-level. Sending `mentor: true` from a student
  //   account returns 403 "Mentor ID không khớp với Session" because the
  //   BE controller compares userId against the session's mentorId.
  //   Mock interview sends `isMentor: false` for student users, which
  //   matches how BE has historically distinguished the two flows.
  const handleJoined = async (participantId: string) => {
    if (hasJoinedTracking || !session?.roomName || !user?.id) return;
    try {
      await joinSessionMutation.mutateAsync({
        sessionName: session.roomName,
        userId: user.id,
        participantId,
        mentor: false,
        isMentor: false,
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
        mentor: false,
        isMentor: false,
      });
    }
    if (!Number.isNaN(numericSessionId)) {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.byId(numericSessionId),
      });
    }
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    navigate("/user/sessions");
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
      navigate("/user/sessions");
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
      <div className="container max-w-7xl py-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-6 h-[70vh] w-full rounded-2xl" />
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
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

  // Show "waiting for mentor" while ONGOING but startTime2 hasn't been
  // written yet by the mentor's join-session call.
  const isWaitingForMentor = sessionStatus === "ONGOING" && !peerStart && Boolean(myStart);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container max-w-7xl py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/user/sessions")}
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("userMentorReview.interviewRoomTitle")}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {sessionStatus === "COMPLETED" && (
              <Button size="sm" onClick={() => navigate("/user/sessions")} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("common.viewFeedback")}
              </Button>
            )}
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

        {/* Device Check Dialog - auto-opens on entry, requires confirmation */}
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main video area — spans 2 columns on lg+ */}
          <div className="lg:col-span-2">
            {hasConfirmedDevices ? (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <CardContent className="p-0">
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
                      className="h-[70vh] w-full"
                    />
                  </VideoCallProvider>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed bg-white dark:bg-slate-900">
                <CardContent className="flex h-[60vh] flex-col items-center justify-center gap-4">
                  <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <Video className="h-10 w-10 text-slate-500" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                      {t("common.pleaseCheckYourEquipmentBeforeParti")}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("userMentorReview.roomReadyDesc")}
                    </p>
                  </div>
                  <Button onClick={() => setIsDeviceCheckOpen(true)} className="gap-2">
                    <Settings className="h-4 w-4" />
                    {t("common.checkTheDevice")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Participant timeline — mirrors mentor page info card, but
                with a people-focused 2-column layout (me + mentor). */}
            <Card className="mt-6 border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserIcon className="h-4 w-4" />
                  {t("common.interviewSessionInformation")}
                </CardTitle>
                <CardDescription>{t("common.interviewDetails")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* You column */}
                  <ParticipantRow
                    name={user?.name ?? t("common.candidate")}
                    role={t("userMentorReview.student")}
                    joinedAt={formatJoinedAt(myStart)}
                    leftAt={formatJoinedAt(myEnd)}
                    durationSeconds={myDurationSeconds}
                    active={isWaitingForMentor === false && sessionStatus === "ONGOING"}
                    tone="student"
                  />
                  {/* Mentor column */}
                  <ParticipantRow
                    name={t("userMentorReview.mentor")}
                    role={t("userMentorReview.mentor")}
                    joinedAt={formatJoinedAt(peerStart)}
                    leftAt={formatJoinedAt(peerEnd)}
                    durationSeconds={peerDurationSeconds}
                    active={peerJoined && sessionStatus === "ONGOING"}
                    tone={peerJoined ? "mentor" : "muted"}
                  />
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-3">
                  <InfoCell
                    icon={<UserIcon className="h-4 w-4" />}
                    label={t("common.room")}
                    value={session.roomName}
                  />
                  {session.joinTime && (
                    <InfoCell
                      icon={<Calendar className="h-4 w-4" />}
                      label={t("common.meetingHours")}
                      value={formatDateTime(session.joinTime)}
                    />
                  )}
                  {session.duration && (
                    <InfoCell
                      icon={<Clock className="h-4 w-4" />}
                      label={t("userMentorReview.duration")}
                      value={`${session.duration} ${t("common.minute")}`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — session status + waiting indicator + supporting info */}
          <aside className="space-y-6">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hourglass className="h-4 w-4" />
                  {t("userMentorReview.mentor")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isWaitingForMentor ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <Hourglass className="h-4 w-4 animate-pulse" />
                      <span className="font-medium">
                        {t("userMentorReview.awaitingMentorTitle")}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      {t("userMentorReview.awaitingMentorDesc")}
                    </p>
                  </div>
                ) : !peerJoined && sessionStatus === "PAID" ? (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t("userMentorReview.timingNotRecorded")}
                  </p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("userMentorReview.joinedAt")}
                      </span>
                      <span className="font-medium">{formatJoinedAt(peerStart)}</span>
                    </div>
                    {peerEnd && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          {t("userMentorReview.leftAt")}
                        </span>
                        <span className="font-medium">{formatJoinedAt(peerEnd)}</span>
                      </div>
                    )}
                    {peerDurationSeconds !== null && peerDurationSeconds > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          {t("userMentorReview.duration")}
                        </span>
                        <span className="font-medium">
                          {Math.floor(peerDurationSeconds / 60)} {t("common.minute")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {t("userMentorReview.youJoined")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myStart ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("userMentorReview.joinedAt")}
                      </span>
                      <span className="font-medium">{formatJoinedAt(myStart)}</span>
                    </div>
                    {myEnd && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          {t("userMentorReview.leftAt")}
                        </span>
                        <span className="font-medium">{formatJoinedAt(myEnd)}</span>
                      </div>
                    )}
                    {myDurationSeconds !== null && myDurationSeconds > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">
                          {t("userMentorReview.duration")}
                        </span>
                        <span className="font-medium">
                          {Math.floor(myDurationSeconds / 60)} {t("common.minute")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t("userMentorReview.timingNotRecorded")}
                  </p>
                )}
              </CardContent>
            </Card>

            {(sessionStatus === "CANCELED" || sessionStatus === "REJECTED") && (
              <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
                <CardContent className="flex items-start gap-3 pt-6">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {sessionStatus === "REJECTED"
                      ? t("common.thisInterviewSessionHasBeenDeclined")
                      : t("common.thisInterviewSessionHasBeenCancelle")}
                  </p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        {/* Action footer — only show on terminal states */}
        {sessionStatus === "COMPLETED" && (
          <div className="mt-6 flex justify-end gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("common.itsOver")}
            </Badge>
            <Button onClick={() => navigate("/user/sessions")} className="gap-2">
              {t("common.viewFeedback")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ParticipantRowProps {
  name: string;
  role: string;
  joinedAt: string;
  leftAt: string;
  durationSeconds: number | null;
  active: boolean;
  tone: "student" | "mentor" | "muted";
}

function ParticipantRow({
  name,
  role,
  joinedAt,
  leftAt,
  durationSeconds,
  active,
  tone,
}: ParticipantRowProps) {
  const ringClass =
    tone === "student"
      ? "ring-blue-200 dark:ring-blue-800"
      : tone === "mentor"
        ? "ring-emerald-200 dark:ring-emerald-800"
        : "ring-slate-200 dark:ring-slate-800";
  const dotClass =
    tone === "student" ? "bg-blue-500" : tone === "mentor" ? "bg-emerald-500" : "bg-slate-400";
  const badge = active ? (
    <Badge variant="outline" className={`gap-1.5 border-current ${ringClass}`}>
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${dotClass}`} />
      {tone === "student" ? "online" : "live"}
    </Badge>
  ) : null;
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ring-1 ring-inset dark:bg-slate-900 ${ringClass}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${dotClass}`} />
          <span className="text-sm font-semibold">{name}</span>
        </div>
        {badge}
      </div>
      <p className="text-xs tracking-wide text-slate-500 uppercase dark:text-slate-400">{role}</p>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500 dark:text-slate-400">In</dt>
          <dd className="font-mono">{joinedAt}</dd>
        </div>
        {leftAt !== "—" && (
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Out</dt>
            <dd className="font-mono">{leftAt}</dd>
          </div>
        )}
        {durationSeconds !== null && durationSeconds > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Duration</dt>
            <dd className="font-mono">
              {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

interface InfoCellProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoCell({ icon, label, value }: InfoCellProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );
}

// Status icon mapping (currently unused but kept for future inline icons next to badges)
void STATUS_ICON;
