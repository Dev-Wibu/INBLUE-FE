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
import { motion } from "framer-motion";
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

const STAR_HUE: Record<"situation" | "task" | "action" | "result", string> = {
  situation: "from-sky-500/10 to-transparent",
  task: "from-indigo-500/10 to-transparent",
  action: "from-blue-500/10 to-transparent",
  result: "from-cyan-500/10 to-transparent",
};

const STAR_INK: Record<"situation" | "task" | "action" | "result", string> = {
  situation: "text-sky-600 dark:text-sky-300",
  task: "text-indigo-600 dark:text-indigo-300",
  action: "text-blue-600 dark:text-blue-300",
  result: "text-cyan-600 dark:text-cyan-300",
};

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

const gridStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const cardMotion = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
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
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Top action bar */}
      <motion.div {...fadeUp(0)} className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/mentor?tab=reviews")}
          className="gap-1.5 text-slate-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("common.backToTheList")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (typeof reviewSessionId === "number") {
              navigate(`/mentor/sessions/${reviewSessionId}/review`);
            }
          }}
          disabled={typeof reviewSessionId !== "number"}
          className="ml-auto">
          {t("common.editReview")}
        </Button>
      </motion.div>

      {/* Hero */}
      <motion.div
        {...fadeUp(0.05)}
        className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200/70 ring-inset dark:ring-white/5">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-purple-500/15 dark:from-sky-500/25 dark:via-indigo-500/15 dark:to-purple-500/15"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent dark:from-slate-950 dark:via-slate-950/40 dark:to-transparent"
        />
        <div
          aria-hidden
          className="absolute -top-24 -left-12 h-72 w-72 rounded-full bg-sky-400/30 opacity-60 blur-3xl dark:bg-sky-500/30"
        />
        <div
          aria-hidden
          className="absolute -right-12 -bottom-24 h-72 w-72 rounded-full bg-purple-300/20 opacity-50 blur-3xl dark:bg-purple-500/20"
        />

        <div className="relative grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 -m-2 rounded-full bg-gradient-to-br from-sky-400/40 to-purple-400/40 opacity-60 blur-xl"
              />
              <Avatar className="relative h-20 w-20 ring-2 ring-white/10">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="bg-sky-100 text-2xl font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                  {studentName?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
            </div>
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
              <h1 className="mt-1.5 text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {studentName}
              </h1>
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
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
          <div className="flex items-center gap-4 self-start lg:self-end">
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("mentorReviews.overallAssessment")}
              </p>
              <p className="text-[44px] leading-none font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {rating}
                <span className="ml-0.5 text-base font-medium text-slate-400">/5</span>
              </p>
              <StarRating value={rating} readOnly size="sm" />
              {reviewEndedAt && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <TimeAgo date={String(reviewEndedAt)} />
                </p>
              )}
            </div>
            <div
              className={cn(
                "rounded-2xl p-3 ring-1 backdrop-blur-md ring-inset",
                ratingTone === "emerald" &&
                  "bg-emerald-500/15 ring-emerald-400/30 dark:bg-emerald-500/20",
                ratingTone === "teal" && "bg-teal-500/15 ring-teal-400/30 dark:bg-teal-500/20",
                ratingTone === "sky" && "bg-sky-500/15 ring-sky-400/30 dark:bg-sky-500/20",
                ratingTone === "amber" && "bg-amber-500/15 ring-amber-400/30 dark:bg-amber-500/20",
                ratingTone === "rose" && "bg-rose-500/15 ring-rose-400/30 dark:bg-rose-500/20"
              )}>
              <Trophy
                className={cn(
                  "h-8 w-8",
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
      </motion.div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-4">
          {/* STAR method */}
          <motion.section {...fadeUp(0.1)} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                  {t("mentorReviews.detailedAssessmentStarMethod")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("mentorReviews.starContentYouSentTo")}
                </p>
              </div>
            </div>
            {starCards.every((c) => !c.value) ? (
              <div className={GLASS_SURFACE}>
                <p className="text-sm text-slate-500 italic">
                  {t("mentorReviews.theStudentHasNotFilled")}
                </p>
              </div>
            ) : (
              <motion.div
                variants={gridStagger}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2">
                {starCards.map((card) => {
                  if (!card.value) return null;
                  const Icon = STAR_CARD_ICON[card.key];
                  const hue = STAR_HUE[card.key];
                  const ink = STAR_INK[card.key];
                  return (
                    <motion.article
                      key={card.key}
                      variants={cardMotion}
                      className={cn(
                        "relative overflow-hidden rounded-2xl p-5 ring-1 transition-all ring-inset hover:-translate-y-0.5",
                        "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
                        "dark:bg-white/[0.03] dark:ring-white/5"
                      )}>
                      <div
                        aria-hidden
                        className={cn(
                          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                          hue
                        )}
                      />
                      <div className="relative flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
                            "bg-slate-900/[0.04] ring-slate-900/10",
                            "dark:bg-white/[0.05] dark:ring-white/10"
                          )}>
                          <Icon className={cn("h-4 w-4", ink)} aria-hidden />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-[10px] font-semibold tracking-[0.08em] uppercase",
                              ink
                            )}>
                            {card.label}
                          </p>
                          <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {String(card.key).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <p className="relative mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {card.value}
                      </p>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </motion.section>

          {/* Additional comments */}
          <motion.section {...fadeUp(0.15)} className="space-y-3">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {t("mentorReviews.additionalComments")}
            </h2>
            <motion.div
              variants={gridStagger}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {additionalItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.key} variants={cardMotion} className={GLASS_SURFACE}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
                          "bg-slate-900/[0.04] ring-slate-900/10",
                          "dark:bg-white/[0.05] dark:ring-white/10"
                        )}>
                        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" aria-hidden />
                      </div>
                      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                        {item.label}
                      </p>
                    </div>
                    {item.value ? (
                      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {item.value}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 italic">—</p>
                    )}
                  </motion.article>
                );
              })}
            </motion.div>
            {!review.strength && !review.weakness && !review.improve && (
              <p className="text-sm text-slate-500 italic">
                {t("mentorReviews.noAdditionalComments")}
              </p>
            )}
          </motion.section>

          {/* Session info */}
          <motion.section {...fadeUp(0.2)} className={GLASS_SURFACE}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 ring-inset dark:bg-sky-500/15 dark:text-sky-300">
                <CalendarClock className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.sessionInformation1")}
              </p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow
                icon={Hash}
                label={t("common.sessionCode1")}
                value={review.session?.id ? `#${review.session.id}` : "—"}
              />
              <InfoRow
                icon={Building2}
                label={t("common.roomName1")}
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
                  className="text-xs">
                  {t("common.viewSessionDetails")}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </motion.section>
        </div>

        {/* Side summary */}
        <motion.aside
          {...fadeUp(0.25)}
          className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div className={GLASS_SURFACE}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("mentorReviews.overallAssessment")}
            </p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {rating}
              </span>
              <span className="text-sm font-medium text-slate-400">/5</span>
            </p>
            <div className="mt-2">
              <StarRating value={rating} readOnly size="md" />
            </div>
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="mt-1.5 flex items-center gap-2 text-xs" aria-hidden>
                <span className="w-5 text-slate-500 dark:text-slate-400">{star}★</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                    style={{ width: `${rating === star ? 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={GLASS_SURFACE}>
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
                  <span className="text-slate-500 dark:text-slate-400">{t("common.endTime")}:</span>
                  <TimeAgo date={String(reviewEndedAt)} />
                </div>
              )}
            </div>
          </div>

          {studentEmail && (
            <div className={GLASS_SURFACE}>
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
        </motion.aside>
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
    <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3 w-3" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}
