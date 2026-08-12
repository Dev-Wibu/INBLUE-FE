/**
 * User Feedback Detail Page — "Assessment Dossier" v2
 *
 * Displays detailed mentor review received by the user after an interview session.
 * Visual language matches the Mentor portal Review Detail page:
 * single dark-glass surface, hero block with ambient glow, STAR method bento grid,
 * and sticky side summary.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorReviewById } from "@/hooks/useMentorReview";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Hash,
  Lightbulb,
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

const GLASS_SURFACE = cn(
  "rounded-xl border border-slate-200/80 bg-white p-4 transition-all",
  "dark:border-slate-800 dark:bg-slate-900"
);

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

const STAR_CARD_ICON = {
  situation: Target,
  task: ClipboardList,
  action: Zap,
  result: CheckCircle2,
};

const STAR_INK = {
  situation: "text-sky-600 dark:text-sky-300",
  task: "text-indigo-600 dark:text-indigo-300",
  action: "text-purple-600 dark:text-purple-300",
  result: "text-amber-600 dark:text-amber-300",
};

export function FeedbackDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const reviewId = Number(id);
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const { data: review, isLoading } = useMentorReviewById(reviewId);
  const mentorId = review?.mentor?.id || review?.session?.userId2 || 0;
  const { data: mentorInfo } = useMentorById(mentorId);

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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("general.back")}
        </Button>
        <div className={cn(GLASS_SURFACE, "flex flex-col items-center gap-3 py-16 text-center")}>
          <Star className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noReviewsFound")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("common.thisReviewDoesNotExistOrHasBeenR")}
          </p>
        </div>
      </div>
    );
  }

  // Access guard: review must belong to current candidate
  if (!currentUser?.id || (review.session?.userId && review.session.userId !== currentUser.id)) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/user?tab=overview")}
          className="text-slate-600 dark:text-slate-300">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t("common.backToTheList")}
        </Button>
        <div className={cn(GLASS_SURFACE, "flex flex-col items-center gap-3 py-16 text-center")}>
          <User className="h-12 w-12 text-slate-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noAccess")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("common.youCantSeeReviewsThatDontBelong")}
          </p>
        </div>
      </div>
    );
  }

  const mentorName =
    review.mentor?.name ||
    mentorInfo?.name ||
    (mentorId ? t("common.mentorWithId", { id: mentorId }) : t("common.mentor"));
  const mentorAvatarUrl = review.mentor?.avatarUrl || mentorInfo?.avatarUrl;
  const mentorExpertise = review.mentor?.expertise || mentorInfo?.expertise;
  const mentorCompany = review.mentor?.currentCompany || mentorInfo?.currentCompany;

  const reviewEndedAt = review.session?.endTime1
    ? treatZuluAsVietnamLocal(review.session.endTime1)
    : null;
  const reviewStartedAt = review.session?.startTime1
    ? treatZuluAsVietnamLocal(review.session.startTime1)
    : null;

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

  const starCards: Array<{
    key: "situation" | "task" | "action" | "result";
    label: string;
    value?: string | null;
  }> = [
    { key: "situation", label: t("common.situation"), value: review.situationNote },
    { key: "task", label: t("common.mission"), value: review.taskNote },
    { key: "action", label: t("common.act"), value: review.actionNote },
    { key: "result", label: t("common.result"), value: review.resultNote },
  ];

  const additionalItems = [
    {
      key: "strength",
      label: t("common.strengths"),
      icon: ThumbsUp,
      value: review.strength,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "weakness",
      label: t("common.pointsForImprovement"),
      icon: Wrench,
      value: review.weakness,
      tone: "text-rose-600 dark:text-rose-400",
    },
    {
      key: "improve",
      label: t("common.suggestedImprovements1"),
      icon: Lightbulb,
      value: review.improve,
      tone: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  const sessionRoomName = review.session?.roomName;
  const sessionId = review.session?.id;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* Top action bar */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5 text-slate-600 dark:text-slate-300">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("general.back")}
        </Button>
        {sessionId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/user/mock-interview/history/${sessionId}`)}
            className="gap-1.5 text-xs">
            {t("common.viewSessionDetails")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </motion.div>

      {/* Hero Banner */}
      <motion.div
        {...fadeUp(0.05)}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* Avatar */}
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16">
              <AvatarImage src={mentorAvatarUrl} alt={mentorName} />
              <AvatarFallback className="bg-slate-100 text-lg font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {mentorName?.charAt(0) || "M"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-indigo-600 uppercase dark:bg-indigo-950 dark:text-indigo-400">
                  <Star className="h-3 w-3" aria-hidden />
                  {t("userFeedback.evaluationContent")}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  #{review.id}
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
                {t("common.reviewDetails1")} #{review.id}
              </h1>
              <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                  <User className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                  {mentorName}
                </p>
                {mentorExpertise && (
                  <p className="flex items-center gap-2 text-xs">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    {mentorExpertise}
                  </p>
                )}
                {mentorCompany && (
                  <p className="flex items-center gap-2 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                    {mentorCompany}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rating Trophy Block */}
          <div className="flex items-center gap-4 self-start lg:self-end">
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.overallRating")}
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

      {/* Body Grid Layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-4">
          {/* STAR Method Section */}
          <motion.section {...fadeUp(0.1)} className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                  {t("userFeedback.evaluationContent")} (STAR)
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("userFeedback.evaluationFromMentorAfterInterview")}
                </p>
              </div>
            </div>

            {starCards.every((c) => !c.value) ? (
              <div className={GLASS_SURFACE}>
                <p className="text-sm text-slate-500 italic">
                  {t("userFeedback.thereIsNoDetailedReview")}
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
                  const ink = STAR_INK[card.key];
                  return (
                    <motion.article
                      key={card.key}
                      variants={cardMotion}
                      className="rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
                            "bg-slate-100 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                          )}>
                          <Icon className={cn("h-4 w-4", ink)} aria-hidden />
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-[10px] font-semibold tracking-[0.06em] uppercase",
                              ink
                            )}>
                            {card.label}
                          </p>
                          <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {String(card.key).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {card.value}
                      </p>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </motion.section>

          {/* Additional Comments Section */}
          <motion.section {...fadeUp(0.15)} className="space-y-3">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {t("common.strengths")} & {t("common.suggestedImprovements1")}
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
                        <Icon className={cn("h-4 w-4", item.tone)} aria-hidden />
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
          </motion.section>

          {/* Session Context Section */}
          <motion.section {...fadeUp(0.2)} className={GLASS_SURFACE}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 ring-inset dark:bg-emerald-500/15 dark:text-emerald-300">
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
                value={sessionId ? `#${sessionId}` : "—"}
              />
              <InfoRow
                icon={Building2}
                label={t("common.roomName1")}
                value={sessionRoomName || (sessionId ? `Session ${sessionId}` : "—")}
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
            {sessionId && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/user/mock-interview/history/${sessionId}`)}
                  className="text-xs">
                  {t("common.viewSessionDetails")}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </motion.section>
        </div>

        {/* Side Summary */}
        <motion.aside
          {...fadeUp(0.25)}
          className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          {/* Overall Rating Breakdown */}
          <div className={GLASS_SURFACE}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.overallRating")}
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
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="mt-1.5 flex items-center gap-2 text-xs" aria-hidden>
                <span className="w-5 text-slate-500 dark:text-slate-400">{star}★</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                    style={{ width: `${rating === star ? 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Card */}
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

          {/* Quick Actions Card */}
          <div className={GLASS_SURFACE}>
            <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.quickActions")}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {sessionId && (
                <button
                  type="button"
                  onClick={() => navigate(`/user/mock-interview/history/${sessionId}`)}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm text-slate-700 transition-all hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-emerald-500/10">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-3.5 w-3.5 text-emerald-500" />
                    {t("common.viewSessionDetails")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 p-3 text-sm text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-sky-500/10">
                <span className="flex items-center gap-2">
                  <ArrowLeft className="h-3.5 w-3.5 text-sky-500" />
                  {t("general.back")}
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 group-hover:text-sky-500" />
              </button>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

// ---------- Helper Component ----------
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
