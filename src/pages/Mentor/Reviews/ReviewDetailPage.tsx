/**
 * Mentor Review Detail Page — student hero + 4 STAR cards + 3 columns
 * of additional comments. UI-only refresh; data + access checks preserved.
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
import { PanelSurface, SectionHeading } from "../Sessions/components";

type StarCardTone = "sky" | "indigo" | "emerald" | "amber";

const STAR_CARD_TONE: Record<"situation" | "task" | "action" | "result", StarCardTone> = {
  situation: "sky",
  task: "indigo",
  action: "emerald",
  result: "amber",
};

const STAR_CARD_ICON: Record<keyof typeof STAR_CARD_TONE, typeof Target> = {
  situation: Target,
  task: ClipboardList,
  action: Zap,
  result: CheckCircle2,
};

const heroMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};

const childMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
};

const gridStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const cardMotion = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
};

const STAR_TONE_CLASS: Record<
  StarCardTone,
  { surface: string; ink: string; ring: string; chip: string; icon: string }
> = {
  sky: {
    surface: "bg-sky-500/8 ring-sky-500/20 dark:bg-sky-500/10",
    ink: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: "text-sky-600 dark:text-sky-400",
  },
  indigo: {
    surface: "bg-indigo-500/8 ring-indigo-500/20 dark:bg-indigo-500/10",
    ink: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-500/20",
    chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  emerald: {
    surface: "bg-emerald-500/8 ring-emerald-500/20 dark:bg-emerald-500/10",
    ink: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    surface: "bg-amber-500/8 ring-amber-500/20 dark:bg-amber-500/10",
    ink: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
  },
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (!review) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
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
    key: keyof typeof STAR_CARD_TONE;
    label: string;
    value?: string | null;
  }> = [
    { key: "situation", label: t("mentorReviews.situation"), value: review.situationNote },
    { key: "task", label: t("mentorReviews.tasks"), value: review.taskNote },
    { key: "action", label: t("mentorReviews.action"), value: review.actionNote },
    { key: "result", label: t("mentorReviews.result"), value: review.resultNote },
  ];

  return (
    <motion.div
      className="space-y-5"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show">
      {/* Top action bar — single source of truth, no duplicated header */}
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

      {/* Student + review hero — single panel, two columns */}
      <motion.div variants={heroMotion}>
        <PanelSurface className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-amber-300/20 opacity-60 blur-3xl dark:bg-amber-500/20"
          />
          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-amber-400/40">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="bg-amber-100 text-base font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  {studentName.charAt(0) || "H"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-semibold tracking-[0.08em] text-amber-700 uppercase dark:text-amber-300">
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

            {/* Overall rating block */}
            <div
              className={cn(
                "rounded-2xl p-4 text-center ring-1 ring-inset sm:min-w-[180px]",
                "bg-amber-500/8 ring-amber-500/25",
                "dark:bg-amber-500/10"
              )}>
              <p className="text-[10px] font-semibold tracking-[0.08em] text-amber-700 uppercase dark:text-amber-300">
                {t("mentorReviews.overallAssessment")}
              </p>
              <p className="mt-1 text-4xl font-bold tracking-[-0.03em] text-amber-700 dark:text-amber-300">
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

      {/* STAR method cards — 4 distinct cards, not a vertical stack */}
      <motion.section variants={childMotion} className="space-y-3">
        <SectionHeading
          title={t("mentorReviews.detailedAssessmentStarMethod")}
          subtitle={t("mentorReviews.starContentYouSentTo")}
        />
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
            className="grid gap-3 sm:grid-cols-2">
            {starCards.map((card) => {
              if (!card.value) return null;
              const tone = STAR_TONE_CLASS[STAR_CARD_TONE[card.key]];
              const Icon = STAR_CARD_ICON[card.key];
              return (
                <motion.article
                  key={card.key}
                  variants={cardMotion}
                  className={cn(
                    "rounded-2xl p-4 ring-1 transition-all ring-inset hover:-translate-y-0.5",
                    tone.surface,
                    tone.ring
                  )}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset",
                          tone.surface,
                          tone.ring
                        )}>
                        <Icon className={cn("h-4 w-4", tone.icon)} aria-hidden />
                      </div>
                      <p
                        className={cn(
                          "text-[10px] font-semibold tracking-[0.08em] uppercase",
                          tone.ink
                        )}>
                        {card.label}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                        tone.chip
                      )}>
                      {card.key}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {card.value}
                  </p>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </motion.section>

      {/* Additional comments — 3 distinct cards side-by-side */}
      <motion.section variants={childMotion} className="space-y-3">
        <SectionHeading title={t("mentorReviews.additionalComments")} />
        <motion.div
          variants={gridStagger}
          initial="hidden"
          animate="show"
          className="grid gap-3 lg:grid-cols-3">
          {[
            {
              key: "strength",
              label: t("common.strengths"),
              icon: ThumbsUp,
              value: review.strength,
              toneClass: STAR_TONE_CLASS.emerald,
            },
            {
              key: "weakness",
              label: t("common.pointsForImprovement"),
              icon: Wrench,
              value: review.weakness,
              toneClass: STAR_TONE_CLASS.amber,
            },
            {
              key: "improve",
              label: t("common.suggestedImprovements"),
              icon: Lightbulb,
              value: review.improve,
              toneClass: STAR_TONE_CLASS.indigo,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.key}
                variants={cardMotion}
                className={cn(
                  "rounded-2xl p-4 ring-1 ring-inset",
                  item.toneClass.surface,
                  item.toneClass.ring
                )}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset",
                      item.toneClass.surface,
                      item.toneClass.ring
                    )}>
                    <Icon className={cn("h-4 w-4", item.toneClass.icon)} aria-hidden />
                  </div>
                  <p
                    className={cn(
                      "text-[10px] font-semibold tracking-[0.08em] uppercase",
                      item.toneClass.ink
                    )}>
                    {item.label}
                  </p>
                </div>
                {item.value ? (
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
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
