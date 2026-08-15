import { MentorScoreDisplay } from "@/components/review/MentorScoreDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useUserById } from "@/hooks/useApplication";
import { useCurrentMentorProfile, useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackBySession } from "@/hooks/useMentorFeedback";
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { normalizeFiveStarRating } from "@/lib/rating";
import { getSessionJoinAvailability } from "@/lib/session-join";
import { getSessionMentorId, isSessionMentor } from "@/lib/session-mentor";
import { getSessionStatusBadge } from "@/lib/status-utils";
import { MentorDetailHeader, MentorDetailPage } from "@/pages/Mentor/components/MentorDetailLayout";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Hash,
  LogIn,
  LogOut,
  MessageSquareText,
  Pencil,
  Timer,
  UserRound,
  UsersRound,
  Video,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface MentorRouteState {
  returnTo?: string;
}

const getSafeReturnTo = (state: unknown): string => {
  const returnTo = (state as MentorRouteState | null)?.returnTo;
  return typeof returnTo === "string" &&
    (returnTo.startsWith("/mentor/") || returnTo.startsWith("/mentor?"))
    ? returnTo
    : "/mentor?tab=sessions";
};

const formatDuration = (duration?: number, durationSeconds?: number): string => {
  if (typeof duration === "number" && duration > 0) return `${duration} min`;
  if (typeof durationSeconds !== "number" || durationSeconds <= 0) return "-";
  return `${Math.max(1, Math.round(durationSeconds / 60))} min`;
};

export function MentorSessionDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const user = useAuthStore((state) => state.user);
  const { data: currentMentorProfile, isLoading: mentorProfileLoading } = useCurrentMentorProfile();
  const numericSessionId = Number(sessionId);
  const { data: session, isLoading: sessionLoading } = useSessionById(numericSessionId);
  const mentorId = session ? getSessionMentorId(session) : undefined;
  const { data: mentorInfo } = useMentorById(mentorId || 0);
  const { data: mentorReview, isLoading: reviewLoading } =
    useMentorReviewBySession(numericSessionId);
  const { data: candidateFeedback, isLoading: feedbackLoading } =
    useMentorFeedbackBySession(numericSessionId);
  const { data: studentInfo } = useUserById(session?.userId ?? 0, !!session?.userId);
  const isAllowed = isSessionMentor(session, currentMentorProfile?.id);
  const returnTo = getSafeReturnTo(location.state);
  const hasInternalReturn = Boolean((location.state as MentorRouteState | null)?.returnTo);
  const currentSessionPath = `/mentor/sessions/${numericSessionId}`;
  const nestedRouteState = { returnTo: currentSessionPath } satisfies MentorRouteState;

  const goBack = () => {
    if (hasInternalReturn) {
      navigate(-1);
      return;
    }
    navigate(returnTo, { replace: true });
  };

  useEffect(() => {
    if (sessionLoading || mentorProfileLoading) return;
    if (!session || !isAllowed) navigate("/mentor?tab=sessions", { replace: true });
  }, [isAllowed, mentorProfileLoading, navigate, session, sessionLoading]);

  if (sessionLoading || mentorProfileLoading) {
    return (
      <MentorDetailPage>
        <Skeleton className="h-20 rounded-[20px]" />
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-[620px] lg:col-span-8" />
          <Skeleton className="h-[480px] lg:col-span-4" />
        </div>
      </MentorDetailPage>
    );
  }

  if (!session || !isAllowed) return null;

  const statusBadge = getSessionStatusBadge(session.status);
  const canJoinRoom = getSessionJoinAvailability(session).canJoin;
  const canReview = session.status === "COMPLETED";
  const parentLabel = returnTo.includes("/students/")
    ? t("common.students")
    : returnTo.includes("/reviews/") || returnTo.includes("/feedback/")
      ? t("common.reviewAndFeedback")
      : t("mentorSessions.interviewSessions");
  const candidate = {
    id: session.userId,
    name: mentorReview?.user?.name || studentInfo?.name,
    email: mentorReview?.user?.email || studentInfo?.email,
    avatarUrl: mentorReview?.user?.avatarUrl || studentInfo?.avatarUrl,
  };
  const mentor = {
    id: mentorId,
    name: mentorReview?.mentor?.name || mentorInfo?.name || user?.name,
    email: mentorReview?.mentor?.email || mentorInfo?.email || user?.email,
    avatarUrl: mentorReview?.mentor?.avatarUrl || mentorInfo?.avatarUrl || user?.avatarUrl,
  };

  return (
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={goBack}
        backLabel={t("general.back")}
        parentLabel={parentLabel}
        title={`${t("common.interviewSession")} #${session.id}`}
        badge={
          <Badge variant={statusBadge.variant} className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        }
        actions={
          <>
            {canJoinRoom && (
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/mentor/sessions/room/${session.id}`, { state: nestedRouteState })
                }
                className="h-9 rounded-xl bg-emerald-600 px-3 font-semibold text-white hover:bg-emerald-700">
                <Video className="h-4 w-4" />
                {t("common.enterTheInterviewRoom")}
              </Button>
            )}
            {canReview && (
              <Button
                size="sm"
                variant={mentorReview ? "outline" : "default"}
                onClick={() =>
                  navigate(`/mentor/sessions/${session.id}/review/view`, {
                    state: { ...nestedRouteState, edit: Boolean(mentorReview) },
                  })
                }
                className={
                  mentorReview
                    ? "h-9 rounded-xl px-3 font-semibold"
                    : "h-9 rounded-xl bg-indigo-600 px-3 font-semibold text-white hover:bg-indigo-700"
                }>
                <Pencil className="h-4 w-4" />
                {mentorReview ? t("common.editReview") : t("common.writeAReview")}
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <section className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Video className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                {t("common.sessionInformation")}
              </h2>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                #{session.id}
              </span>
            </div>
            <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
              <SessionMetric
                icon={Calendar}
                label={t("common.appointmentTime")}
                value={formatDateTime(session.joinTime)}
              />
              <SessionMetric
                icon={Clock3}
                label={t("common.duration1")}
                value={formatDuration(session.duration)}
              />
              <SessionMetric
                icon={CreditCard}
                label={t("common.totalPrice")}
                value={
                  typeof session.totalPrice === "number" && session.totalPrice > 0
                    ? formatCurrency(session.totalPrice)
                    : "-"
                }
              />
              <SessionMetric
                icon={CheckCircle2}
                label={t("common.status")}
                value={statusBadge.label}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <UsersRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                {t("mentorSessions.sessionTimeline")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("mentorSessions.sessionTimelineDescription")}
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <AttendanceRow
                label={t("mentorSessions.candidateAttendance")}
                startTime={session.startTime1}
                endTime={session.endTime1}
                duration={session.durationSeconds1}
              />
              <AttendanceRow
                label={t("mentorSessions.mentorAttendance")}
                startTime={session.startTime2}
                endTime={session.endTime2}
                duration={session.durationSeconds2}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <Hash className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{t("common.room")}</p>
                <p className="mt-1 truncate font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {session.roomName || "-"}
                </p>
              </div>
              {session.recordUrl ? (
                <a
                  href={session.recordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                  {t("mentorSessions.recording")}
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : (
                <span className="ml-auto text-xs font-medium text-slate-400">
                  {t("mentorSessions.notRecorded")}
                </span>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-4">
          <PersonPanel label={t("common.candidate")} person={candidate} tone="sky" />
          <PersonPanel label={t("common.mentor")} person={mentor} tone="indigo" />

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <MessageSquareText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {t("mentorSessions.reviewStatus")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("mentorSessions.reviewStatusDescription")}
              </p>
            </div>

            {reviewLoading || feedbackLoading ? (
              <div className="space-y-4 p-5">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t("mentorSessions.mentorReviewSubmitted")}
                      </p>
                      <div className="mt-2">
                        {mentorReview ? (
                          <MentorScoreDisplay value={mentorReview.rating} />
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">
                            {t("common.pending")}
                          </span>
                        )}
                      </div>
                    </div>
                    {mentorReview && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 text-indigo-600 dark:text-indigo-400"
                        onClick={() =>
                          navigate(`/mentor/reviews/${mentorReview.id}`, {
                            state: nestedRouteState,
                          })
                        }>
                        {t("mentorSessions.openReviewDetails")}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t("mentorSessions.candidateFeedbackReceived")}
                      </p>
                      <div className="mt-2">
                        {candidateFeedback ? (
                          <StarRating
                            value={normalizeFiveStarRating(candidateFeedback.rating)}
                            readOnly
                            size="sm"
                            showValue
                            color="sky"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">
                            {t("common.pending")}
                          </span>
                        )}
                      </div>
                    </div>
                    {candidateFeedback?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 shrink-0 px-2 text-indigo-600 dark:text-indigo-400"
                        onClick={() =>
                          navigate(`/mentor/feedback/${candidateFeedback.id}`, {
                            state: nestedRouteState,
                          })
                        }>
                        {t("mentorSessions.openFeedbackDetails")}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </MentorDetailPage>
  );
}

function SessionMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-24 items-center gap-3 border-b border-slate-100 p-5 last:border-b-0 sm:border-r dark:border-slate-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function PersonPanel({
  label,
  person,
  tone,
}: {
  label: string;
  person: { id?: number; name?: string; email?: string; avatarUrl?: string };
  tone: "sky" | "indigo";
}) {
  const name = person.name || (person.id ? `#${person.id}` : label);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-bold text-slate-400 uppercase">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar className="h-11 w-11 border border-slate-200 dark:border-slate-700">
          <AvatarImage src={person.avatarUrl} alt={name} />
          <AvatarFallback
            className={
              tone === "sky"
                ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            }>
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
            <UserRound className="h-3.5 w-3.5" />
            {person.email || `ID: #${person.id || "-"}`}
          </p>
        </div>
      </div>
    </section>
  );
}

function AttendanceRow({
  label,
  startTime,
  endTime,
  duration,
}: {
  label: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(150px,1fr)_repeat(3,minmax(0,1fr))] sm:items-center">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
      <AttendanceMetric
        icon={LogIn}
        label={t("mentorSessions.startTime")}
        value={formatDateTime(startTime)}
      />
      <AttendanceMetric
        icon={LogOut}
        label={t("mentorSessions.endTime")}
        value={formatDateTime(endTime)}
      />
      <AttendanceMetric
        icon={Timer}
        label={t("common.duration1")}
        value={formatDuration(undefined, duration)}
      />
    </div>
  );
}

function AttendanceMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LogIn;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}
