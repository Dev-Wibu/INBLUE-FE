/**
 * Mentor Session — Review View (session-scoped) v2.
 * "Mentor Report" — bold hero with the rating as a prominent signature
 * feature, full STAR notes as a connected narrative path (each step
 * leads to the next), and additional comments as a 3-column bento.
 * Back button returns to the session detail page (session context).
 *
 * UI-only refresh. All data + access checks preserved.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useUserById } from "@/hooks/useApplication";
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  Mail,
  MessageSquare,
  Sparkles,
  Stamp,
  Star,
  Target,
  ThumbsUp,
  User,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { PanelSurface } from "../Sessions/components";

// ---------- dynamic STAR card config (kept local for fast-refresh) ----------

type StarKey = "situation" | "task" | "action" | "result";

const STAR_CARD: Record<
  StarKey,
  {
    Icon: LucideIcon;
    hue: "sky" | "indigo" | "blue" | "cyan";
    step: string;
    titleKey: string;
    subtitleKey: string;
  }
> = {
  situation: {
    Icon: Target,
    hue: "sky",
    step: "01",
    titleKey: "mentorReviews.situation",
    subtitleKey: "compReview.promptSituation",
  },
  task: {
    Icon: ClipboardList,
    hue: "indigo",
    step: "02",
    titleKey: "mentorReviews.tasks",
    subtitleKey: "compReview.promptTask",
  },
  action: {
    Icon: Zap,
    hue: "blue",
    step: "03",
    titleKey: "mentorReviews.action",
    subtitleKey: "compReview.promptAction",
  },
  result: {
    Icon: CheckCircle2,
    hue: "cyan",
    step: "04",
    titleKey: "mentorReviews.result",
    subtitleKey: "compReview.promptResult",
  },
};

const HUE_ACCENT: Record<
  "sky" | "indigo" | "blue" | "cyan" | "emerald" | "rose" | "violet",
  { rail: string; icon: string; badge: string; ring: string; bg: string }
> = {
  sky: {
    rail: "from-sky-400/60 via-sky-400/30 to-transparent",
    icon: "text-sky-600 dark:text-sky-300",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    ring: "ring-sky-500/20",
    bg: "bg-sky-500/5",
  },
  indigo: {
    rail: "from-indigo-400/60 via-indigo-400/30 to-transparent",
    icon: "text-indigo-600 dark:text-indigo-300",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200",
    ring: "ring-indigo-500/20",
    bg: "bg-indigo-500/5",
  },
  blue: {
    rail: "from-blue-400/60 via-blue-400/30 to-transparent",
    icon: "text-blue-600 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-200",
    ring: "ring-blue-500/20",
    bg: "bg-blue-500/5",
  },
  cyan: {
    rail: "from-cyan-400/60 via-cyan-400/30 to-transparent",
    icon: "text-cyan-600 dark:text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
    ring: "ring-cyan-500/20",
    bg: "bg-cyan-500/5",
  },
  emerald: {
    rail: "from-emerald-400/60 via-emerald-400/30 to-transparent",
    icon: "text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
  rose: {
    rail: "from-rose-400/60 via-rose-400/30 to-transparent",
    icon: "text-rose-600 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
    ring: "ring-rose-500/20",
    bg: "bg-rose-500/5",
  },
  violet: {
    rail: "from-violet-400/60 via-violet-400/30 to-transparent",
    icon: "text-violet-600 dark:text-violet-300",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
    ring: "ring-violet-500/20",
    bg: "bg-violet-500/5",
  },
};

// ---------- motion variants ----------

const heroMotion = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const childMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

const starStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const starCardMotion = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

// ---------- helpers ----------

function getHueLabel(hue: "sky" | "indigo" | "blue" | "cyan") {
  return HUE_ACCENT[hue];
}

export function MentorSessionReviewViewPage() {
  const { t } = useTranslation();
  const { sessionId: sessionIdParam } = useParams<{
    sessionId: string;
  }>();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const { data: session, isLoading: sessionLoading } = useSessionById(sessionId);
  const { data: review, isLoading: reviewLoading } = useMentorReviewBySession(sessionId);

  const studentUserId = session?.userId ?? review?.user?.id ?? 0;
  const { data: studentInfo } = useUserById(studentUserId);

  const studentName =
    review?.user?.name ||
    studentInfo?.name ||
    (studentUserId ? t("common.studentVar0", { var_0: studentUserId }) : t("common.students"));
  const studentEmail = review?.user?.email || studentInfo?.email;
  // @ts-expect-error: Backend Swagger schema mismatch - university not in User type
  const studentUniversity = review?.user?.university || studentInfo?.university;
  const studentAvatarUrl = review?.user?.avatarUrl || studentInfo?.avatarUrl;

  if (sessionLoading || reviewLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/mentor?tab=sessions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <PanelSurface>
          <div className="py-12 text-center">
            <Star className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-4 font-semibold">{t("common.noInterviewSessionsFound")}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {t("common.thisInterviewSessionDoesNotExistOr")}
            </p>
          </div>
        </PanelSurface>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/mentor/sessions/${sessionId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("general.back")}
        </Button>
        <PanelSurface>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/60">
              <MessageSquare className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {t("mentorSessions.thereAreNoReviewsSubmitted")}
            </h3>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t("mentorSessions.youHaventSubmittedAReview")}
            </p>
            <Button
              size="sm"
              className="mt-1 gap-1.5"
              onClick={() => navigate(`/mentor/sessions/${sessionId}/review`)}>
              <Star className="h-4 w-4" aria-hidden />
              {t("common.writeAReview")}
            </Button>
          </div>
        </PanelSurface>
      </div>
    );
  }

  const reviewEndedAt = session.endTime1 ? treatZuluAsVietnamLocal(session.endTime1) : null;
  const rating = typeof review.rating === "number" ? review.rating : 0;

  const starCards: Array<{ key: StarKey; value?: string | null }> = [
    { key: "situation", value: review.situationNote },
    { key: "task", value: review.taskNote },
    { key: "action", value: review.actionNote },
    { key: "result", value: review.resultNote },
  ];

  const additionalItems = [
    {
      key: "strength",
      label: t("common.strengths"),
      icon: ThumbsUp,
      hue: "emerald" as const,
      value: review.strength,
    },
    {
      key: "weakness",
      label: t("common.pointsForImprovement"),
      icon: Wrench,
      hue: "rose" as const,
      value: review.weakness,
    },
    {
      key: "improve",
      label: t("common.suggestedImprovements"),
      icon: Lightbulb,
      hue: "violet" as const,
      value: review.improve,
    },
  ];

  return (
    <motion.div
      className="mx-auto flex w-full max-w-7xl flex-col gap-5"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show">
      {/* Top action bar — Back stays in session context */}
      <motion.div variants={childMotion} className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mentor/sessions/${sessionId}`)}
          className="gap-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("common.backToTheSession")}
        </Button>
        <span className="ml-2 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {t("mentorSessions.reviewOfSession")}
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span>{session.roomName || t("common.interviewSession")}</span>
        </span>
        <Button
          variant="outline"
          onClick={() => navigate(`/mentor/sessions/${sessionId}/review`)}
          className="ml-auto gap-1.5">
          <Star className="h-3.5 w-3.5" aria-hidden />
          {t("common.editReview")}
        </Button>
      </motion.div>

      {/* HERO — "Mentor Report" certificate-style */}
      <motion.div variants={heroMotion}>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 ring-1 ring-inset sm:p-8",
            "bg-gradient-to-br from-slate-900/[0.05] via-slate-500/[0.04] to-slate-900/[0.05]",
            "ring-slate-200/70 backdrop-blur",
            "dark:from-white/[0.05] dark:via-white/[0.02] dark:to-white/[0.05] dark:ring-white/5"
          )}>
          {/* Background orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-sky-400/15 opacity-60 blur-3xl dark:bg-sky-500/20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-violet-400/15 opacity-60 blur-3xl dark:bg-violet-500/15"
          />
          {/* Dotted grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(rgba(148,163,184,0.45) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          {/* Watermark stamp */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-6 hidden -translate-y-1/2 opacity-[0.06] sm:block">
            <Stamp className="h-44 w-44 text-slate-700 dark:text-slate-200" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-5">
              <Avatar className="h-16 w-16 ring-2 ring-sky-400/40 sm:h-20 sm:w-20">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="bg-slate-200/60 text-lg font-semibold text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
                  {(studentName || "S").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                  {t("mentorReviews.mentorReviewReport")}
                </p>
                <h1
                  className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-3xl dark:text-slate-100"
                  style={{ textWrap: "balance" }}>
                  {studentName}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
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
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden />
                    {session.roomName || t("common.interviewSession")}
                  </span>
                </div>
              </div>
            </div>

            {/* Rating score — bold, signature */}
            <div
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-2xl p-5 ring-1 backdrop-blur-sm ring-inset",
                "bg-slate-900/[0.04] ring-slate-900/10",
                "dark:bg-white/[0.05] dark:ring-white/10",
                "lg:min-w-[200px]"
              )}>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                {t("mentorReviews.overallAssessment")}
              </p>
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={rating}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.28, ease: "easeOut" as const }}
                    className="text-5xl font-bold tracking-[-0.05em] text-slate-900 sm:text-6xl dark:text-slate-100">
                    {rating.toFixed(1)}
                  </motion.span>
                </AnimatePresence>
                <span className="text-base font-medium text-slate-500 dark:text-slate-400">/5</span>
              </div>
              <StarRating value={rating} readOnly size="md" />
              {reviewEndedAt ? (
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <TimeAgo date={String(reviewEndedAt)} />
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      {/* STAR path — 4 timeline-style cards connected by arrows */}
      <motion.section variants={childMotion} className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
              STAR
            </p>
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {t("mentorReviews.detailedAssessmentStarMethod")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t("mentorReviews.starContentYouSentTo")}
            </p>
          </div>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {starCards.filter((c) => c.value).length} / 4 {t("compReview.evaluationStatistics")}
          </span>
        </div>

        {starCards.every((c) => !c.value) ? (
          <PanelSurface>
            <p className="p-5 text-sm text-slate-500 italic">
              {t("mentorReviews.theStudentHasNotFilled")}
            </p>
          </PanelSurface>
        ) : (
          <motion.div
            variants={starStagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2">
            {starCards.map((card, idx) => {
              if (!card.value) return null;
              const cfg = STAR_CARD[card.key];
              const accent = getHueLabel(cfg.hue);
              const Icon = cfg.Icon;
              const isLast = idx === starCards.filter((s) => s.value).length - 1;
              return (
                <motion.article
                  key={card.key}
                  variants={starCardMotion}
                  className={cn(
                    "group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 ring-1 backdrop-blur-sm ring-inset sm:p-6",
                    "bg-slate-500/[0.04] ring-slate-200/70",
                    "dark:bg-white/[0.03] dark:ring-white/5",
                    "transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_24px_-12px_rgba(15,23,42,0.25)]",
                    "dark:hover:shadow-[0_6px_24px_-10px_rgba(0,0,0,0.5)]"
                  )}>
                  {/* Step number watermark */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute -top-2 -right-2 font-mono text-[80px] leading-none font-bold opacity-[0.05] sm:text-[100px]",
                      accent.icon
                    )}>
                    {cfg.step}
                  </span>
                  {/* Top accent bar */}
                  <div
                    aria-hidden
                    className={cn(
                      "absolute inset-x-4 top-0 h-[3px] rounded-full bg-gradient-to-r",
                      accent.rail
                    )}
                  />
                  <header className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                        accent.badge,
                        accent.ring
                      )}>
                      <Icon className={cn("h-5 w-5", accent.icon)} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                        {t("common.stepNumber", { number: cfg.step })}
                      </p>
                      <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                        {t(cfg.titleKey)}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t(cfg.subtitleKey)}
                      </p>
                    </div>
                  </header>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {card.value}
                  </p>
                  {!isLast && (
                    <ArrowRight
                      className={cn(
                        "absolute -bottom-2 left-1/2 hidden h-4 w-4 -translate-x-1/2 translate-y-full text-slate-300 md:hidden",
                        "dark:text-slate-600"
                      )}
                      aria-hidden
                    />
                  )}
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </motion.section>

      {/* Additional comments — 3 cols, each with strong accent top bar */}
      <motion.section variants={childMotion} className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
            {t("mentorReviews.additionalComments")}
          </p>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
            {t("mentorReviews.additionalComments")}
          </h2>
        </div>
        <motion.div
          variants={starStagger}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {additionalItems.map((item) => {
            const Icon = item.icon;
            const accent = HUE_ACCENT[item.hue];
            return (
              <motion.article
                key={item.key}
                variants={starCardMotion}
                className={cn(
                  "group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5 ring-1 backdrop-blur-sm ring-inset",
                  "bg-slate-500/[0.04] ring-slate-200/70",
                  "dark:bg-white/[0.03] dark:ring-white/5",
                  "transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_24px_-12px_rgba(15,23,42,0.25)]",
                  "dark:hover:shadow-[0_6px_24px_-10px_rgba(0,0,0,0.5)]"
                )}>
                <div
                  aria-hidden
                  className={cn(
                    "absolute inset-x-4 top-0 h-[3px] rounded-full bg-gradient-to-r",
                    accent.rail
                  )}
                />
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
                      accent.badge,
                      accent.ring
                    )}>
                    <Icon className={cn("h-4 w-4", accent.icon)} aria-hidden />
                  </span>
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                    {item.label}
                  </p>
                </div>
                {item.value ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {item.value}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500 italic">—</p>
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
              <User className="h-3.5 w-3.5" aria-hidden />
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                {t("mentorReviews.candidate")}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{studentName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">
                {t("common.roomName1")}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {session.roomName || t("common.interviewSession")}
              </span>
            </span>
          </div>
        </PanelSurface>
      </motion.section>
    </motion.div>
  );
}
