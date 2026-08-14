/**
 * Mentor Review Detail Page — v4 "Assessment Dossier".
 * Aligned with the new Feedback Detail page: hero with rating trophy +
 * 2-column desktop layout (main content + sticky summary).
 *
 * UI-only refresh. All data + access checks preserved.
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
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Hash,
  Lightbulb,
  Mail,
  Sparkles,
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

const STAR_CARD_ICON: Record<"situation" | "task" | "action" | "result", typeof Target> = {
  situation: Target,
  task: ClipboardList,
  action: Zap,
  result: CheckCircle2,
};

const GLASS_SURFACE = cn(
  "rounded-2xl p-5 ring-1 ring-inset transition-all",
  "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
  "dark:bg-white/[0.03] dark:ring-white/5"
);

const STAR_INK: Record<"situation" | "task" | "action" | "result", string> = {
  situation: "text-sky-600 dark:text-sky-300",
  task: "text-indigo-600 dark:text-indigo-300",
  action: "text-blue-600 dark:text-blue-300",
  result: "text-cyan-600 dark:text-cyan-300",
};

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
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-44" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (!review) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <div className={cn(GLASS_SURFACE, "flex flex-col items-center gap-3 py-16 text-center")}>
          <Star className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="font-semibold">{t("common.noReviewsFound")}</h3>
          <p className="text-sm text-slate-500">{t("common.thisReviewDoesNotExistOrHasBeenR")}</p>
        </div>
      </div>
    );
  }
  if (!currentUser?.id || review.session?.userId2 !== currentUser.id) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/mentor?tab=reviews")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className={cn(GLASS_SURFACE, "flex flex-col items-center gap-3 py-16 text-center")}>
          <User className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="font-semibold">{t("common.noAccess")}</h3>
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

  const starCards: Array<{
    key: "situation" | "task" | "action" | "result";
    label: string;
    value?: string | null;
  }> = [
    { key: "situation", label: t("mentorReviews.situation"), value: review.situationNote },
    { key: "task", label: t("mentorReviews.tasks"), value: review.taskNote },
    { key: "action", label: t("mentorReviews.action"), value: review.actionNote },
    { key: "result", label: t("mentorReviews.result"), value: review.resultNote },
  ];

  const additionalItems = [
    {
      key: "strength",
      label: t("common.strengths"),
      icon: ThumbsUp,
      value: review.strength,
    },
    {
      key: "weakness",
      label: t("common.pointsForImprovement"),
      icon: Wrench,
      value: review.weakness,
    },
    {
      key: "improve",
      label: t("common.suggestedImprovements"),
      icon: Lightbulb,
      value: review.improve,
    },
  ];

  const rating = review.rating || 0;
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

  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-col gap-5 p-4 md:p-6 lg:p-8">
        {/* ── TOP SUBHEADER BAR (Admin Pattern) ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/mentor?tab=reviews")}
              className="h-9 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span>{t("common.backToTheList")}</span>
            </Button>

            <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
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
            className="rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
            {t("common.editReview")}
          </Button>
        </div>

        {/* ── MAIN CONTENT 2-COLUMN DASHBOARD ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-purple-500/15 dark:from-sky-500/25 dark:via-indigo-500/15 dark:to-purple-500/15"
              />
              <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Avatar className="h-16 w-16 shrink-0 ring-2 ring-white/10">
                    <AvatarImage src={studentAvatarUrl} alt={studentName} />
                    <AvatarFallback className="bg-sky-100 text-xl font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                      {studentName?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] text-sky-600 uppercase ring-1 ring-sky-500/20 ring-inset dark:text-sky-300">
                        <Sparkles className="h-3 w-3" aria-hidden />
                        {t("mentorReviews.studentInformation")}
                      </span>
                      {review.id && (
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          #{review.id}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                      {studentName}
                    </h1>
                    <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-slate-600 dark:text-slate-400">
                      {studentEmail && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" aria-hidden />
                          {studentEmail}
                        </p>
                      )}
                      {studentUniversity && (
                        <p className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                          {studentUniversity}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating block */}
                <div className="flex items-center gap-3 self-start sm:self-end">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                      {t("common.evaluate")}
                    </p>
                    <p className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-base font-medium text-slate-400">/5</span>
                    </p>
                    <StarRating value={rating} readOnly size="sm" />
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl p-3 ring-1 backdrop-blur-md ring-inset",
                      ratingTone === "emerald" &&
                        "bg-emerald-500/15 ring-emerald-400/30 dark:bg-emerald-500/20",
                      ratingTone === "teal" &&
                        "bg-teal-500/15 ring-teal-400/30 dark:bg-teal-500/20",
                      ratingTone === "sky" && "bg-sky-500/15 ring-sky-400/30 dark:bg-sky-500/20",
                      ratingTone === "amber" &&
                        "bg-amber-500/15 ring-amber-400/30 dark:bg-amber-500/20",
                      ratingTone === "rose" && "bg-rose-500/15 ring-rose-400/30 dark:bg-rose-500/20"
                    )}>
                    <Trophy
                      className={cn(
                        "h-7 w-7",
                        ratingTone === "emerald" && "fill-emerald-400 text-emerald-400",
                        ratingTone === "teal" && "fill-teal-400 text-teal-400",
                        ratingTone === "sky" && "fill-sky-400 text-sky-400",
                        ratingTone === "amber" && "fill-amber-400 text-amber-400",
                        ratingTone === "rose" && "fill-rose-400 text-rose-400"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STAR Section */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t("mentorReviews.detailedAssessmentStarMethod")}</span>
                </h2>
              </div>

              {starCards.every((c) => !c.value) ? (
                <p className="rounded-2xl border border-slate-200/90 bg-white p-5 text-sm text-slate-500 shadow-xs dark:border-slate-800/80 dark:bg-slate-900 dark:text-slate-400">
                  {t("mentorReviews.theStudentHasNotFilled")}
                </p>
              ) : (
                <div className="relative space-y-6 pl-8 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {starCards
                    .filter((c) => c.value)
                    .map((card) => {
                      const Icon = STAR_CARD_ICON[card.key];
                      return (
                        <div key={card.key} className="relative flex gap-4">
                          <div
                            className={cn(
                              "absolute -left-8 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold",
                              "bg-white ring-1 ring-slate-200/90 dark:bg-slate-900 dark:ring-slate-800"
                            )}>
                            <Icon className={cn("h-3.5 w-3.5", STAR_INK[card.key])} />
                          </div>
                          <div className="flex-1 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                            <div className="mb-2 flex items-center gap-2">
                              <h3 className={cn("text-sm font-bold", STAR_INK[card.key])}>
                                {card.label}
                              </h3>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                              {card.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Additional Comments */}
            {additionalItems.some((item) => item.value) && (
              <div className="space-y-5">
                <h2 className="flex items-center gap-2 border-b border-slate-200/80 pb-3 text-base font-bold text-slate-900 dark:border-slate-800/80 dark:text-white">
                  <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t("mentorReviews.additionalComments")}</span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {additionalItems
                    .filter((item) => item.value)
                    .map((item) => {
                      const Icon = item.icon;
                      const tone =
                        item.key === "strength"
                          ? { header: "text-emerald-600 dark:text-emerald-400" }
                          : item.key === "weakness"
                            ? { header: "text-rose-600 dark:text-rose-400" }
                            : { header: "text-indigo-600 dark:text-indigo-400" };
                      return (
                        <div
                          key={item.key}
                          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                          <div
                            className={cn(
                              "mb-2.5 flex items-center gap-2 text-xs font-bold",
                              tone.header
                            )}>
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                            {item.value}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Session info */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 ring-inset dark:bg-sky-500/15 dark:text-sky-300">
                  <CalendarClock className="h-4 w-4" aria-hidden />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                  {t("common.sessionInformation")}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow
                  icon={Hash}
                  label={t("common.sessionCode")}
                  value={review.session?.id ? `#${review.session.id}` : "—"}
                />
                <InfoRow
                  icon={Building2}
                  label={t("common.roomName")}
                  value={
                    review.session?.roomName ||
                    (review.session?.id ? `Session ${review.session.id}` : "—")
                  }
                />
                <InfoRow
                  icon={Clock}
                  label={t("common.startTime")}
                  value={reviewStartedAt ? <TimeAgo date={String(reviewStartedAt)} /> : "—"}
                />
                <InfoRow
                  icon={Clock}
                  label={t("common.endTime")}
                  value={reviewEndedAt ? <TimeAgo date={String(reviewEndedAt)} /> : "—"}
                />
              </div>
              {reviewSessionId && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/mentor/sessions/${reviewSessionId}`)}
                    className="rounded-xl border border-slate-200/90 bg-white text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                    {t("common.viewSessionDetails")}
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sticky Summary */}
          <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
            {/* Rating summary */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.evaluate")}
              </p>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                  {rating.toFixed(1)}
                </span>
                <span className="text-base font-medium text-slate-400">/5</span>
              </p>
              <div className="mt-2">
                <StarRating value={rating} readOnly size="md" />
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.timeline")}
              </p>
              <div className="mt-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                {reviewStartedAt && (
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("common.startTime")}:
                    </span>
                    <TimeAgo date={String(reviewStartedAt)} />
                  </div>
                )}
                {reviewEndedAt && (
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    <span className="text-slate-500 dark:text-slate-400">
                      {t("common.endTime")}:
                    </span>
                    <TimeAgo date={String(reviewEndedAt)} />
                  </div>
                )}
              </div>
            </div>

            {/* Student info */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("mentorReviews.studentInformation")}
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 ring-1 ring-slate-100 dark:ring-slate-800">
                    <AvatarImage src={studentAvatarUrl} alt={studentName} />
                    <AvatarFallback className="bg-sky-50 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                      {studentName?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {studentName}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {studentEmail}
                    </p>
                  </div>
                </div>
                {studentUniversity && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{studentUniversity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            {studentEmail && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                  {t("common.quickActions")}
                </p>
                <a
                  href={`mailto:${studentEmail}`}
                  className="group mt-3 flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-sky-500/10">
                  <span className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-sky-500" />
                    {t("common.sendEmail")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-sky-500" />
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

// ---------- helpers ----------
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Star;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3 w-3" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
