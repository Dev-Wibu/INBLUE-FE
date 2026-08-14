import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackBySession } from "@/hooks/useMentorFeedback";
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { getSessionJoinAvailability } from "@/lib/session-join";
import { getSessionMentorId, isSessionMentor } from "@/lib/session-mentor";
import { getSessionStatusBadge } from "@/lib/status-utils";
import { MentorDetailHeader, MentorDetailPage } from "@/pages/Mentor/components/MentorDetailLayout";
import { MentorReviewReport } from "@/pages/Mentor/components/MentorReviewReport";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowUpRight,
  Calendar,
  Clock3,
  CreditCard,
  Hash,
  Pencil,
  Play,
  UserRound,
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
  const numericSessionId = Number(sessionId);
  const { data: session, isLoading: sessionLoading } = useSessionById(numericSessionId);
  const mentorId = session ? getSessionMentorId(session) : undefined;
  const { data: mentorInfo } = useMentorById(mentorId || 0);
  const { data: mentorReview, isLoading: reviewLoading } =
    useMentorReviewBySession(numericSessionId);
  const { data: candidateFeedback } = useMentorFeedbackBySession(numericSessionId);
  const { data: studentInfo } = useUserById(session?.userId ?? 0, !!session?.userId);
  const isAllowed = isSessionMentor(session, user?.id);
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
    if (sessionLoading) return;
    if (!session || !isAllowed) navigate("/mentor?tab=sessions", { replace: true });
  }, [isAllowed, navigate, session, sessionLoading]);

  if (sessionLoading) {
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

      {reviewLoading ? (
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="h-[620px] lg:col-span-8" />
          <Skeleton className="h-[480px] lg:col-span-4" />
        </div>
      ) : mentorReview ? (
        <MentorReviewReport
          review={mentorReview}
          sessionId={session.id || numericSessionId}
          roomName={session.roomName}
          joinedAt={session.joinTime || session.startTime1}
          mentor={mentor}
          candidate={candidate}
          candidateFeedback={candidateFeedback}
        />
      ) : (
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
                  icon={Play}
                  label={t("mentorSessions.startTime")}
                  value={formatDateTime(session.startTime1)}
                />
                <SessionMetric
                  icon={Clock3}
                  label={t("common.duration1")}
                  value={formatDuration(session.duration, session.durationSeconds1)}
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
                {session.recordUrl && (
                  <a
                    href={session.recordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                    {t("common.open")}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>
            </section>
          </div>
          <aside className="space-y-6 lg:col-span-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
                {t("common.status")}
              </p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <Badge variant={statusBadge.variant} className={statusBadge.className}>
                  {statusBadge.label}
                </Badge>
                <span className="text-xs text-slate-500">{formatDateTime(session.joinTime)}</span>
              </div>
            </section>
            <PersonPanel label={t("common.candidate")} person={candidate} tone="sky" />
            <PersonPanel label={t("common.mentor")} person={mentor} tone="indigo" />
          </aside>
        </div>
      )}
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
