/**
 * Mentor Review Detail Page — v3 "Assessment Dossier".
 * max-w-6xl wrapper, single dark-glass tone, bigger STAR cards, less
 * saturated palette. No "fruit salad" 4-color blocks.
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
  Calendar,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  Mail,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { PanelSurface } from "../Sessions/components";

const STAR_CARD_ICON: Record<"situation" | "task" | "action" | "result", typeof Target> = {
  situation: Target,
  task: ClipboardList,
  action: Zap,
  result: CheckCircle2,
};

// Single dark-glass surface, reused for every inner card. No more
// sky/indigo/emerald/amber rainbow.
const GLASS_SURFACE = cn(
  "rounded-2xl p-5 ring-1 ring-inset transition-all hover:-translate-y-0.5",
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

const heroMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

const childMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

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
  const { id } = useParams<{
    id: string;
  }>();
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
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
        <PanelSurface>
          <div className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("common.noReviewsFound")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("common.thisReviewDoesNotExistOrHasBeenR")}
            </p>
          </div>
        </PanelSurface>
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
        <PanelSurface>
          <div className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("common.noAccess")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("common.youCantSeeReviewsThatDontBelong")}
            </p>
          </div>
        </PanelSurface>
      </div>
    );
  }

  const reviewEndedAt = review.session?.endTime1
    ? treatZuluAsVietnamLocal(review.session.endTime1)
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

  return (
    <motion.div
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show">
      {/* Top action bar */}
      <motion.div variants={childMotion} className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate("/mentor?tab=reviews")}
          className="gap-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("common.backToTheList")}
        </Button>
        <Button
          variant="outline"
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

      {/* Student + rating hero */}
      <motion.div variants={heroMotion}>
        <PanelSurface className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-sky-300/15 opacity-60 blur-3xl dark:bg-sky-500/15"
          />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-sky-400/30">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="bg-slate-200/60 text-base font-semibold text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
                  {studentName.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                  {t("mentorReviews.studentInformation")}
                </p>
                <h1
                  className="text-xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-2xl dark:text-slate-100"
                  style={{ textWrap: "balance" }}>
                  {studentName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {studentEmail && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden />
                      {studentEmail}
                    </span>
                  )}
                  {studentUniversity && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {studentUniversity}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rating block — neutral dark glass, no amber accent */}
            <div
              className={cn(
                "rounded-2xl p-4 text-center ring-1 backdrop-blur ring-inset sm:min-w-[200px]",
                "bg-slate-900/[0.04] ring-slate-900/10",
                "dark:bg-white/[0.05] dark:ring-white/10"
              )}>
              <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                {t("mentorReviews.overallAssessment")}
              </p>
              <p className="mt-1 text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                {review.rating || 0}
                <span className="ml-1 text-base font-medium opacity-60">/5</span>
              </p>
              <div className="mt-1 flex justify-center">
                <StarRating value={review.rating || 0} readOnly size="sm" />
              </div>
              {reviewEndedAt ? (
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <TimeAgo date={String(reviewEndedAt)} />
                </p>
              ) : null}
            </div>
          </div>
        </PanelSurface>
      </motion.div>

      {/* STAR method — 2x2 with bigger cards, single dark glass + gradient tint */}
      <motion.section variants={childMotion} className="space-y-3">
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
          <PanelSurface>
            <p className="p-5 text-sm text-slate-500 italic">
              {t("mentorReviews.theStudentHasNotFilled")}
            </p>
          </PanelSurface>
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
                  {/* Per-card gradient tint — very subtle, on a neutral base */}
                  <div
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                      hue
                    )}
                  />
                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
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

      {/* Additional comments — 3 cols, balanced, single tone */}
      <motion.section variants={childMotion} className="space-y-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
            {t("mentorReviews.additionalComments")}
          </h2>
        </div>
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
          <p className="text-sm text-slate-500 italic">{t("mentorReviews.noAdditionalComments")}</p>
        )}
      </motion.section>

      {/* Session meta strip */}
      <motion.section variants={childMotion}>
        <PanelSurface variant="flat" className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                {t("common.sessionCode1")}
              </span>
              <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200">
                #{review.session?.id}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                {t("common.roomName1")}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {review.session?.roomName ||
                  t("common.sessionVar0", {
                    var_0: review.session?.id,
                  })}
              </span>
            </span>
          </div>
        </PanelSurface>
      </motion.section>
    </motion.div>
  );
}
