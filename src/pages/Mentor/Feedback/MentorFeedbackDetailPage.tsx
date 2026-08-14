/**
 * Mentor Feedback Detail Page — Admin UI Pattern
 * Clean, professional layout without gradients or excessive decorations
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackById } from "@/hooks/useMentorFeedback";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarClock,
  ChevronRight,
  Clock,
  Inbox,
  Mail,
  MessageSquare,
  Star,
  User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

export function MentorFeedbackDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackId = Number(id);
  const requestedReturnTo = (location.state as { returnTo?: string } | null)?.returnTo;
  const returnTo =
    typeof requestedReturnTo === "string" && requestedReturnTo.startsWith("/mentor/")
      ? requestedReturnTo
      : "/mentor?tab=feedback";
  const currentUser = useAuthStore((state) => state.user);

  const { data: feedback, isLoading } = useMentorFeedbackById(feedbackId);
  const studentId = feedback?.user?.id ?? feedback?.session?.userId;
  const mentorId = feedback?.mentor?.id ?? feedback?.session?.userId2;

  const { data: studentInfo } = useUserById(typeof studentId === "number" ? studentId : 0);
  const { data: mentorInfo } = useMentorById(typeof mentorId === "number" ? mentorId : 0);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(returnTo)}
          className="h-9 w-fit rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <Inbox className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noResponseFound")}
          </h3>
          <p className="text-sm text-slate-500">{t("common.thisFeedbackDoesNotExistOrHasBeenR")}</p>
        </div>
      </div>
    );
  }

  // Access guard
  const isOwner =
    !currentUser?.id ||
    (mentorId && currentUser.id === mentorId) ||
    (feedback.mentor?.id != null && currentUser.id === feedback.mentor.id);
  if (!isOwner) {
    return (
      <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(returnTo)}
          className="h-9 w-fit rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <User className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noAccess")}
          </h3>
          <p className="text-sm text-slate-500">{t("common.youCantSeeFeedbackThatDoesntBelong")}</p>
        </div>
      </div>
    );
  }

  const rating = feedback.rating || 0;
  const ratingTone =
    rating >= 5
      ? "emerald"
      : rating >= 4
        ? "teal"
        : rating >= 3
          ? "sky"
          : rating >= 2
            ? "amber"
            : "rose";

  const studentName =
    feedback.user?.name ||
    studentInfo?.name ||
    (studentId ? t("common.studentVar0", { var_0: studentId }) : t("common.students"));
  const studentEmail = feedback.user?.email || studentInfo?.email;
  const studentAvatarUrl = feedback.user?.avatarUrl || studentInfo?.avatarUrl;

  const sessionRoomName = feedback.session?.roomName;
  const sessionStartTime = feedback.session?.startTime1
    ? treatZuluAsVietnamLocal(feedback.session.startTime1)
    : null;
  const sessionEndTime = feedback.session?.endTime1
    ? treatZuluAsVietnamLocal(feedback.session.endTime1)
    : null;
  const sessionStatus = feedback.session?.status;

  const mentorName = feedback.mentor?.name || mentorInfo?.name || currentUser?.name || "—";
  const mentorCompany = feedback.mentor?.currentCompany || mentorInfo?.currentCompany || null;

  return (
    <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
      {/* Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(returnTo)}
            className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            {t("common.feedbackDetails")} · {studentName}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Student Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/15">
                <User className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("common.student")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("mentorFeedback.feedbackFrom")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Avatar className="h-12 w-12 rounded-lg border border-slate-100 dark:border-slate-800">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="rounded-lg bg-rose-100 text-sm font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  {studentName?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900 dark:text-white">
                  {studentName}
                </p>
                {studentEmail && (
                  <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    {studentEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rating Display */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("common.rating")}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <Star
                    className={cn(
                      "h-8 w-8",
                      ratingTone === "emerald" && "text-emerald-500",
                      ratingTone === "teal" && "text-teal-500",
                      ratingTone === "sky" && "text-sky-500",
                      ratingTone === "amber" && "text-amber-500",
                      ratingTone === "rose" && "text-rose-500"
                    )}
                  />
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">
                    {rating.toFixed(1)}
                  </span>
                  <span className="text-lg text-slate-400">/5</span>
                </div>
                <div className="mt-2">
                  <StarRating value={rating} readOnly size="md" />
                </div>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15">
                <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("common.feedback")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("common.description")}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              {feedback.comment ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                  {feedback.comment}
                </p>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  {t("mentorFeedback.studentsHaveNotLeftDetailed")}
                </p>
              )}
            </div>
          </div>

          {/* Session Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <CalendarClock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("common.session")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("common.sessionInformation")}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Building2 className="h-3.5 w-3.5" />
                  {t("common.roomName")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {sessionRoomName || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {t("common.startTime")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {sessionStartTime ? <TimeAgo date={String(sessionStartTime)} /> : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {t("common.endTime")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {sessionEndTime ? <TimeAgo date={String(sessionEndTime)} /> : "—"}
                </p>
              </div>
              {sessionStatus && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t("common.status")}
                  </div>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {sessionStatus}
                  </p>
                </div>
              )}
            </div>
            {feedback.session?.id && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/mentor/sessions/${feedback.session?.id}`, { state: { returnTo } })
                  }
                  className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
                  {t("common.viewSessionDetails")}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary */}
        <aside className="flex flex-col gap-4">
          {/* Mentor Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.mentor")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-lg border border-slate-100 dark:border-slate-800">
                <AvatarImage
                  src={feedback.mentor?.avatarUrl || mentorInfo?.avatarUrl}
                  alt={mentorName}
                />
                <AvatarFallback className="rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {mentorName?.charAt(0) || "M"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {mentorName}
                </p>
                {mentorCompany && (
                  <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {mentorCompany}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.timeline")}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {sessionStartTime && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t("common.startTime")}</p>
                    <TimeAgo date={String(sessionStartTime)} className="text-sm font-medium" />
                  </div>
                </div>
              )}
              {sessionEndTime && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t("common.endTime")}</p>
                    <TimeAgo date={String(sessionEndTime)} className="text-sm font-medium" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
