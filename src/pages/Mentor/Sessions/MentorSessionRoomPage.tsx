import { useTranslation } from "react-i18next";
/**
 * MentorSessionRoomPage.tsx
 * Active video call room for mentor sessions
 * Route: /mentor/sessions/room/:sessionId
 *
 * 2026-07-28 UI parity with StudentSessionRoomPage:
 *   - Same sticky-sidebar layout: video left, info cards right
 *   - Two-column participant timeline (mentor + candidate)
 *   - Status badge with colored ring + dot
 *   - "Waiting for candidate" indicator
 *   - "Write review" CTA on COMPLETED (kept)
 *   - All join/leave/poll logic untouched — UI-only refresh
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { SESSION_QUERY_KEYS, useJoinSession, useSessionById } from "@/hooks/useSession";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { getSessionJoinAvailability } from "@/lib/session-join";
import { isSessionMentor } from "@/lib/session-mentor";
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
import React, { useEffect, useState } from "react";
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

export function MentorSessionRoomPage() {
  const { t, i18n } = useTranslation();
  const { sessionId } = useParams<{
    sessionId: string;
  }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [hasJoinedTracking, setHasJoinedTracking] = useState(false);
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const numericSessionId = Number(sessionId);
  const {
    data: session,
    isLoading,
    error,
    refetch: refetchSession,
  } = useSessionById(numericSessionId);
  const joinSessionMutation = useJoinSession();
  // 2026-07-28: User.id (from JWT sub) is NOT the same as Mentor.id. BE
  //   stores the Mentor.id on the Session row (in `mentorId` / `userId`)
  //   and validates join-session against it, so we resolve the mentor
  //   profile for the current auth user and send its id instead of user.id.
  // 2026-07-28: Per `frontend_tracking_session_time.md` § 2.1 and § 11,
  //   leave-tracking is exclusively the responsibility of Daily.co's
  //   webhook (`POST /api/sessions/webhooks/dailyco`). BE has no
  //   `/leave-session` endpoint registered in its current swagger, so
  //   FE deliberately does NOT POST any leave signal — attempting to do
  //   so just produces 404 noise. EndTime* will arrive via the webhook
  //   and become visible on the next 10s polling tick.
  const { data: currentMentorProfile, isLoading: mentorProfileLoading } = useCurrentMentorProfile();
  const mentorProfileId =
    currentMentorProfile?.id != null
      ? typeof currentMentorProfile.id === "string"
        ? parseInt(currentMentorProfile.id, 10)
        : currentMentorProfile.id
      : undefined;

  // Validate session and user.
  // For Mentor Interview (RoundType.MENTROR_REVIEW) the session is created
  // with status SCHEDULED (see BE doc Phase 4). PAID/ONGOING are reserved
  // for paid mock-interview sessions, so we accept both shapes here.
  const canJoin = Boolean(
    session &&
    user &&
    isSessionMentor(session, mentorProfileId) &&
    getSessionJoinAvailability(session, currentTime).canJoin
  );

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Handle when mentor joins the call (callback from VideoCallRoom)
  const handleJoined = async (participantId: string) => {
    if (hasJoinedTracking || !session?.roomName || !mentorProfileId) return;

    // Track join via API. BE returns HTTP 200 with an empty body — we
    // invalidate the session-detail query so the page picks up the new
    // `participantId2` + `startTime2` on the next render instead of waiting
    // for a manual refresh.
    // 2026-07-18: send both `mentor` AND `isMentor` (legacy alias) — see
    //   JoinSessionRequest comment in session.manager.ts. BE has historically
    //   needed both keys to disambiguate intent.
    // 2026-07-28: prefer Mentor.id over User.id when the mentor profile is
    //   available, because BE's join-session validator compares the payload
    //   userId against `session.mentorId` (which BE stores as Mentor.id,
    //   not User.id). Falls back to user.id if the profile hasn't loaded yet
    //   so we don't deadlock on race conditions.
    await joinSessionMutation.mutateAsync({
      sessionName: session.roomName,
      userId: mentorProfileId,
      participantId,
      mentor: true,
      isMentor: true,
    });
    queryClient.invalidateQueries({
      queryKey: SESSION_QUERY_KEYS.byId(numericSessionId),
    });
    setHasJoinedTracking(true);
  };

  // Handle when mentor leaves the call
  // 2026-07-13 fix: invalidate queries so the list page picks up
  //   status changes (BE may flip ONGOING -> COMPLETED any time,
  //   including via Daily.co webhook from the peer leaving).
  // 2026-07-28: leave-tracking is exclusively the Daily.co webhook's
  //   responsibility (see frontend_tracking_session_time.md section 4 /
  //   section 2.1). FE just polls to pick up the new
  //   endTime*/durationSeconds*. We do NOT call POST /leave-session
  //   because BE doesn't expose it and the tracking doc explicitly
  //   tells FE not to.
  const handleLeave = () => {
    if (!Number.isNaN(numericSessionId)) {
      queryClient.invalidateQueries({
        queryKey: SESSION_QUERY_KEYS.byId(numericSessionId),
      });
    }
    queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: ["sessions"] });
    navigate("/mentor?tab=sessions");
  };

  // Handle errors from video call
  const handleError = () => undefined;

  // 2026-07-13 v063: same as student page — when Daily.co reports the
  //   room URL is dead, BE may have handed us a stale roomUrl. Force a
  //   refetch so the page can flip to "session has ended" without F5.
  const handleRoomUnavailable = () => {
    void refetchSession();
  };

  // 2026-07-13 v062: when the peer leaves, BE will eventually flip
  //   status (via Daily.co webhook). Trigger a refetch so the UI can
  //   react in real time instead of waiting for the 10s poll.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handlePeerLeft = (_payload: { participantId: string; isLocal?: boolean }) => {
    void refetchSession();
  };

  const handlePeerCountUpdated = (_info: { participantCount: number; localIsAlone: boolean }) => {
    // 2026-08-02 fix: refetch whenever peer count changes — we use this to
    //   catch the candidate just joining (participantCount 1 -> 2) so the
    //   right-hand "Candidate" card picks up the new `startTime1` from BE
    //   without waiting for the 10s poll. Same goes for the peer leaving
    //   (participantCount 2 -> 1) so `endTime1` shows up.
    void _info;
    void refetchSession();
  };

  // Redirect if session is not available
  useEffect(() => {
    if (
      !isLoading &&
      !mentorProfileLoading &&
      (!session || !isSessionMentor(session, mentorProfileId))
    ) {
      navigate("/mentor?tab=sessions", { replace: true });
    }
  }, [isLoading, mentorProfileId, mentorProfileLoading, navigate, session]);

  // 2026-07-13 fix: polling backup — while inside the room, BE may flip
  //   status ONGOING -> COMPLETED at any moment (e.g. when peer leaves
  //   and Daily.co webhook fires), or may write `startTime1` / `endTime1`
  //   for the candidate while the mentor has been sitting in the room
  //   (status can still be SCHEDULED at that point — student join is what
  //   flips it to ONGOING). Without a refresh we keep rendering stale
  //   data: the right-hand "Candidate" card stays empty until F5.
  //   Poll unconditionally every 10s while mounted (mirrors
  //   StudentSessionRoomPage).
  useEffect(() => {
    const interval = window.setInterval(() => {
      void refetchSession();
    }, 10_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [refetchSession]);

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

  // For mentors: own start/end = startTime2/endTime2; peer (candidate) = startTime1/endTime1.
  const peerJoined = Boolean(session?.startTime1);
  const myStart = session?.startTime2 ?? null;
  const myEnd = session?.endTime2 ?? null;
  const peerStart = session?.startTime1 ?? null;
  const peerEnd = session?.endTime1 ?? null;
  const myDurationSeconds =
    typeof session?.durationSeconds2 === "number" ? session.durationSeconds2 : null;
  const peerDurationSeconds =
    typeof session?.durationSeconds1 === "number" ? session.durationSeconds1 : null;

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
    }).format(new Date(treatZuluAsVietnamLocal(zulu) as string));
  };

  // Show "waiting for candidate" while ONGOING but startTime1 hasn't been
  // written yet by the candidate's join-session call.
  const isWaitingForCandidate = sessionStatus === "ONGOING" && !peerStart && Boolean(myStart);

  if (isLoading || mentorProfileLoading) {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6 xl:px-10 xl:py-8 2xl:px-12">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center gap-3 lg:mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/mentor?tab=sessions")}
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </Button>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl xl:text-4xl">
            {t("mentorSessions.interviewRoomMentor")}
          </h1>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${statusStyle}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {sessionStatus === "COMPLETED" && (
              <Button
                size="sm"
                onClick={() => navigate(`/mentor/sessions/${sessionId}/review/view`)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {t("common.writeAReview")}
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

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main video area — video takes remaining width on xl+, sidebar is fixed px */}
          <div className="min-w-0">
            {hasConfirmedDevices ? (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <CardContent className="p-0">
                  <VideoCallProvider>
                    <VideoCallRoom
                      roomUrl={session.roomUrl!}
                      userName={displayName.trim() || user?.name || t("common.mentor")}
                      onLeave={handleLeave}
                      onError={handleError}
                      onJoined={handleJoined}
                      onParticipantLeft={handlePeerLeft}
                      onParticipantCountUpdated={handlePeerCountUpdated}
                      onRoomUnavailable={handleRoomUnavailable}
                      className="h-[60vh] min-h-[420px] w-full sm:h-[68vh] lg:h-[72svh] lg:min-h-[560px] xl:h-[calc(100vh-220px)] xl:min-h-[640px] 2xl:h-[calc(100vh-200px)]"
                    />
                  </VideoCallProvider>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed bg-white dark:bg-slate-900">
                <CardContent className="flex h-[60vh] min-h-[420px] flex-col items-center justify-center gap-4 lg:h-[72svh] lg:min-h-[560px] xl:h-[calc(100vh-220px)] xl:min-h-[640px]">
                  <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                    <Video className="h-10 w-10 text-slate-500" />
                  </div>
                  <div className="space-y-1 px-4 text-center">
                    <p className="text-base font-semibold text-slate-700 sm:text-lg dark:text-slate-200">
                      {t("common.pleaseCheckYourEquipmentBeforeParti")}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("common.pleaseCheckYourEquipmentBeforeParti")}
                    </p>
                  </div>
                  <Button onClick={() => setIsDeviceCheckOpen(true)} className="gap-2">
                    <Settings className="h-4 w-4" />
                    {t("common.checkTheDevice")}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Participant timeline — mirrors student page info card, but
                with a people-focused 2-column layout (mentor + candidate). */}
            <Card className="mt-4 border-slate-200 shadow-sm lg:mt-6 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserIcon className="h-4 w-4" />
                  {t("common.interviewSessionInformation")}
                </CardTitle>
                <CardDescription>{t("common.interviewDetails")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:gap-4">
                  {/* You (mentor) column */}
                  <ParticipantRow
                    name={user?.name ?? t("common.mentor")}
                    role={t("common.mentor")}
                    joinedAt={formatJoinedAt(myStart)}
                    leftAt={formatJoinedAt(myEnd)}
                    durationSeconds={myDurationSeconds}
                    active={isWaitingForCandidate === false && sessionStatus === "ONGOING"}
                    tone="mentor"
                  />
                  {/* Candidate column */}
                  <ParticipantRow
                    name={t("common.candidate")}
                    role={t("userMentorReview.student")}
                    joinedAt={formatJoinedAt(peerStart)}
                    leftAt={formatJoinedAt(peerEnd)}
                    durationSeconds={peerDurationSeconds}
                    active={peerJoined && sessionStatus === "ONGOING"}
                    tone={peerJoined ? "student" : "muted"}
                  />
                </div>

                <Separator />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-4">
                  <InfoCell
                    icon={<UserIcon className="h-4 w-4" />}
                    label={t("common.room")}
                    value={session.roomName ?? "—"}
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

          {/* Sidebar — session status + waiting indicator + supporting info.
              Sticky on xl+ so it stays in view while mentor watches the
              video. */}
          <aside className="space-y-4 lg:space-y-6 xl:sticky xl:top-4 xl:self-start">
            <Card className="border-slate-200 shadow-sm dark:border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hourglass className="h-4 w-4" />
                  {t("common.candidate")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isWaitingForCandidate ? (
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
          <div className="mt-4 flex flex-wrap justify-end gap-2 lg:mt-6">
            <Badge variant="secondary" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("common.itsOver")}
            </Badge>
            <Button
              onClick={() => navigate(`/mentor/sessions/${sessionId}/review/view`)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {t("common.writeAReview")}
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
  const { t } = useTranslation();
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
      {tone === "student" ? t("common.online") : t("common.live")}
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
          <dt className="text-slate-500 dark:text-slate-400">{t("common.inLabel")}</dt>
          <dd className="font-mono">{joinedAt}</dd>
        </div>
        {leftAt !== "—" && (
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">{t("common.outLabel")}</dt>
            <dd className="font-mono">{leftAt}</dd>
          </div>
        )}
        {durationSeconds !== null && durationSeconds > 0 && (
          <div className="flex items-center justify-between">
            <dt className="text-slate-500 dark:text-slate-400">{t("common.duration")}</dt>
            <dd className="font-mono">
              {Math.floor(durationSeconds / 60)}
              {t("common.minutesShort")} {durationSeconds % 60}
              {t("common.secondsShort")}
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
