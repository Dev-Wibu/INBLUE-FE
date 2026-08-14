import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { normalizeFiveStarRating } from "@/lib/rating";
import { getSessionJoinAvailability } from "@/lib/session-join";
import { getSessionMentorId, isSessionMentor } from "@/lib/session-mentor";
import { getSessionStatusBadge } from "@/lib/status-utils";
import {
  MentorDetailHeader,
  MentorDetailPage,
  MentorDetailPanel,
} from "@/pages/Mentor/components/MentorDetailLayout";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowUpRight,
  Calendar,
  Clock3,
  CreditCard,
  FileText,
  Hash,
  MessageSquare,
  Pencil,
  Play,
  Star,
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
  if (typeof durationSeconds !== "number" || durationSeconds <= 0) return "—";
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
};

interface DetailRowProps {
  icon: typeof Calendar;
  label: string;
  value: React.ReactNode;
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-6 border-b border-slate-100 px-5 py-3 last:border-b-0 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="min-w-0 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}

interface ReviewFieldProps {
  label: string;
  value?: string;
}

function ReviewField({ label, value }: ReviewFieldProps) {
  return (
    <div className="min-w-0 border-b border-slate-100 py-4 last:border-b-0 dark:border-slate-800">
      <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{value?.trim() || "—"}</p>
    </div>
  );
}

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
    if (!session || !isAllowed) {
      navigate("/mentor?tab=sessions", { replace: true });
    }
  }, [isAllowed, navigate, session, sessionLoading]);

  if (sessionLoading) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <Skeleton className="h-24" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-96" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </div>
    );
  }

  if (!session || !isAllowed) return null;

  const statusBadge = getSessionStatusBadge(session.status);
  const canJoinRoom = getSessionJoinAvailability(session).canJoin;
  const canReview = session.status === "COMPLETED";
  const candidateFeedback = session.mentorFeedback;

  const goToReview = () => {
    const path = mentorReview
      ? `/mentor/sessions/${session.id}/review/view`
      : `/mentor/sessions/${session.id}/review`;
    navigate(path, { state: nestedRouteState });
  };
  const parentLabel = returnTo.includes("/students/")
    ? t("common.students")
    : returnTo.includes("/reviews/") || returnTo.includes("/feedback/")
      ? t("common.reviewAndFeedback")
      : t("mentorSessions.interviewSessions");

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
                onClick={goToReview}
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

      <MentorDetailPanel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700">
              <AvatarImage src={studentInfo?.avatarUrl} alt={studentInfo?.name} />
              <AvatarFallback className="rounded-lg bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {studentInfo?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900 dark:text-white">
                {studentInfo?.name || t("common.students")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  {studentInfo?.email || `#${session.userId}`}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  {mentorInfo?.name || t("common.mentor")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Hash className="h-3.5 w-3.5" />
            <span className="max-w-[320px] truncate font-mono">
              {session.roomName || t("common.interviewSession")}
            </span>
          </div>
        </div>
      </MentorDetailPanel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("common.sessionInformation")}
              </h2>
            </div>
            <DetailRow
              icon={Calendar}
              label={t("common.appointmentTime")}
              value={formatDateTime(session.joinTime)}
            />
            <DetailRow
              icon={Play}
              label={t("mentorSessions.startTime")}
              value={formatDateTime(session.startTime1)}
            />
            <DetailRow
              icon={Clock3}
              label={t("common.duration1")}
              value={formatDuration(session.duration, session.durationSeconds1)}
            />
            <DetailRow
              icon={CreditCard}
              label={t("common.totalPrice")}
              value={
                typeof session.totalPrice === "number" && session.totalPrice > 0
                  ? formatCurrency(session.totalPrice)
                  : "—"
              }
            />
            {session.recordUrl && (
              <DetailRow
                icon={Video}
                label={t("mentorSessions.recording")}
                value={
                  <a
                    href={session.recordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400">
                    {t("common.open")}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                }
              />
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("mentorReviews.detailedAssessmentStarMethod")}
                </h2>
              </div>
              {mentorReview && (
                <div className="flex shrink-0 items-center gap-2">
                  <StarRating
                    value={normalizeFiveStarRating(mentorReview.rating)}
                    readOnly
                    size="sm"
                  />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {normalizeFiveStarRating(mentorReview.rating).toFixed(1)}/5
                  </span>
                </div>
              )}
            </div>

            {reviewLoading ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : mentorReview ? (
              <div className="grid px-5 md:grid-cols-2 md:gap-x-8">
                <ReviewField
                  label={t("mentorReviews.situation")}
                  value={mentorReview.situationNote}
                />
                <ReviewField label={t("mentorReviews.tasks")} value={mentorReview.taskNote} />
                <ReviewField label={t("mentorReviews.action")} value={mentorReview.actionNote} />
                <ReviewField label={t("mentorReviews.result")} value={mentorReview.resultNote} />
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                <MessageSquare className="h-7 w-7 text-slate-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t("mentorSessions.youHaventSubmittedAReview")}
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:col-span-4">
          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <MessageSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("mentorSessions.candidateFeedback")}
              </h2>
            </div>
            {candidateFeedback ? (
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {studentInfo?.name || t("common.students")}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {normalizeFiveStarRating(candidateFeedback.rating).toFixed(1)}
                      <span className="ml-1 text-xs font-medium text-slate-500">/5</span>
                    </p>
                  </div>
                  <StarRating
                    value={normalizeFiveStarRating(candidateFeedback.rating)}
                    readOnly
                    size="sm"
                  />
                </div>
                <p className="border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  {candidateFeedback.comment || t("common.noDataAvailable")}
                </p>
              </div>
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                <MessageSquare className="h-7 w-7 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("mentorSessions.candidateHasNotLeftFeedbackYet")}
                </p>
              </div>
            )}
          </section>

          {mentorReview && (
            <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("common.evaluate")}
                </h2>
              </div>
              <div className="px-5">
                <ReviewField label={t("mentorSessions.strengths")} value={mentorReview.strength} />
                <ReviewField
                  label={t("mentorSessions.pointsForImprovement")}
                  value={mentorReview.weakness}
                />
                <ReviewField
                  label={t("common.suggestedImprovements")}
                  value={mentorReview.improve}
                />
              </div>
            </section>
          )}
        </aside>
      </div>
    </MentorDetailPage>
  );
}
