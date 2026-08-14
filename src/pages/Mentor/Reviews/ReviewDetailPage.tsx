/**
 * Mentor Review Detail Page — Admin UI Pattern
 * Clean, professional layout without gradients or excessive decorations
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useMentorReviewById } from "@/hooks/useMentorReview";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { chatManager } from "@/services/chat.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Hash,
  Lightbulb,
  Mail,
  Star,
  Target,
  ThumbsUp,
  Trophy,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export function ReviewDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const reviewId = Number(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { data: review, isLoading } = useMentorReviewById(reviewId);
  const studentId = review?.user?.id || review?.session?.userId || 0;
  const { data: studentInfo } = useQuery({
    queryKey: ["mentor-review-student", studentId],
    queryFn: async () => {
      const response = await chatManager.getUserDetail(studentId);
      return response.success ? response.data : null;
    },
    enabled: !!review && studentId > 0,
    staleTime: 5 * 60 * 1000,
  });
  const studentName =
    review?.user?.name ||
    studentInfo?.name ||
    (studentId ? t("common.studentVar0", { var_0: studentId }) : t("common.students"));
  const studentEmail = review?.user?.email || studentInfo?.email;
  // @ts-expect-error: Backend Swagger schema mismatch - university not in User type
  const studentUniversity = review?.user?.university || studentInfo?.university;
  const studentAvatarUrl = review?.user?.avatarUrl || studentInfo?.avatarUrl;
  const reviewSessionId = review?.session?.id;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!review) {
    return (
      <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <Star className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noReviewsFound")}
          </h3>
          <p className="text-sm text-slate-500">{t("common.thisReviewDoesNotExistOrHasBeenR")}</p>
        </div>
      </div>
    );
  }
  if (!currentUser?.id || review.session?.userId2 !== currentUser.id) {
    return (
      <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
        <Button variant="ghost" onClick={() => navigate("/mentor?tab=reviews")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <User className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noAccess")}
          </h3>
          <p className="text-sm text-slate-500">{t("common.youCantSeeReviewsThatDontBelong")}</p>
        </div>
      </div>
    );
  }

  const reviewEndedAt = review.session?.endTime1
    ? treatZuluAsVietnamLocal(review.session.endTime1)
    : null;
  const reviewStartedAt = review.session?.startTime1
    ? treatZuluAsVietnamLocal(review.session.startTime1)
    : null;

  const starCards = [
    { label: t("mentorReviews.situation"), value: review.situationNote, icon: Target },
    { label: t("mentorReviews.tasks"), value: review.taskNote, icon: ClipboardList },
    { label: t("mentorReviews.action"), value: review.actionNote, icon: Zap },
    { label: t("mentorReviews.result"), value: review.resultNote, icon: CheckCircle2 },
  ];

  const additionalItems = [
    { label: t("common.strengths"), value: review.strength, icon: ThumbsUp, color: "emerald" },
    {
      label: t("common.pointsForImprovement"),
      value: review.weakness,
      icon: Wrench,
      color: "rose",
    },
    {
      label: t("common.suggestedImprovements"),
      value: review.improve,
      icon: Lightbulb,
      color: "indigo",
    },
  ];

  const rating = review.rating || 0;

  return (
    <div className="flex flex-col gap-5 bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
      {/* Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/mentor?tab=reviews")}
            className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="text-base font-bold text-slate-900 dark:text-white">
            {t("mentorReviews.reviewDetail")} #{review.id}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (typeof reviewSessionId === "number") {
              navigate(`/mentor/sessions/${reviewSessionId}/review`);
            }
          }}
          disabled={typeof reviewSessionId !== "number"}
          className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
          {t("common.editReview")}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Student Info Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/15">
                <User className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("common.student")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("mentorReviews.studentInformation")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Avatar className="h-12 w-12 rounded-lg border border-slate-100 dark:border-slate-800">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="rounded-lg bg-sky-100 text-sm font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
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
                {studentUniversity && (
                  <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    {studentUniversity}
                  </p>
                )}
              </div>
              {studentId && (
                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  #{studentId}
                </span>
              )}
            </div>
          </div>

          {/* STAR Assessment */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15">
                <Star className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("mentorReviews.starMethod")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("mentorReviews.detailedAssessment")}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {starCards.map((card, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                    <card.icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {card.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {card.value || "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Comments */}
          {additionalItems.some((item) => item.value) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Trophy className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("common.additional")}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("mentorReviews.additionalComments")}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {additionalItems
                  .filter((item) => item.value)
                  .map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-lg border p-3",
                        item.color === "emerald" &&
                          "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950",
                        item.color === "rose" &&
                          "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950",
                        item.color === "indigo" &&
                          "border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950"
                      )}>
                      <p
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-semibold",
                          item.color === "emerald" && "text-emerald-700 dark:text-emerald-300",
                          item.color === "rose" && "text-rose-700 dark:text-rose-300",
                          item.color === "indigo" && "text-indigo-700 dark:text-indigo-300"
                        )}>
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                        {item.value}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Session Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Hash className="h-3.5 w-3.5" />
                  {t("common.sessionCode")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  #{review.session?.id || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("common.roomName")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {review.session?.roomName || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {t("common.startTime")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {reviewStartedAt ? <TimeAgo date={String(reviewStartedAt)} /> : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  {t("common.endTime")}
                </div>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                  {reviewEndedAt ? <TimeAgo date={String(reviewEndedAt)} /> : "—"}
                </p>
              </div>
            </div>
            {reviewSessionId && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/mentor/sessions/${reviewSessionId}`)}
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
          {/* Rating Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.rating")}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {rating.toFixed(1)}
                </span>
                <span className="text-lg text-slate-400">/5</span>
              </div>
            </div>
            <div className="mt-3">
              <StarRating value={rating} readOnly size="md" />
            </div>
          </div>

          {/* Timeline Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("common.timeline")}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {reviewStartedAt && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t("common.startTime")}</p>
                    <TimeAgo date={String(reviewStartedAt)} className="text-sm font-medium" />
                  </div>
                </div>
              )}
              {reviewEndedAt && (
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
                    <div className="h-2 w-2 rounded-full bg-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t("common.endTime")}</p>
                    <TimeAgo date={String(reviewEndedAt)} className="text-sm font-medium" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {studentEmail && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("common.quickActions")}
              </p>
              <a
                href={`mailto:${studentEmail}`}
                className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t("common.sendEmail")}
                </span>
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
