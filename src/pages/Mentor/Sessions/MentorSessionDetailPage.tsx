/**
 * Mentor Session Detail Page — "Interview Dossier" v4.
 *
 * Bold hero with student avatar halo + status badge + bento KPI strip.
 * Full-width layout (max-w-7xl) that fills the screen instead of
 * clustering content in the middle, with asymmetric bento sections for
 * Act-fast, Your review (compact summary), STAR preview, Candidate
 * feedback, and Timeline.
 *
 * "Your review" is intentionally compact here — the full content lives
 * in /mentor/sessions/:id/review/view. This page surfaces the *signal*
 * (rating + 1-line summary + 2-3 quick stats) and points to the detail
 * page for the full text.
 *
 * UI-only refresh. All data + access checks preserved exactly.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useUserById } from "@/hooks/useApplication";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { getSessionMentorId, isSessionMentor } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CreditCard,
  Hash,
  Link2,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  Video,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  MetaChip,
  PanelSurface,
  SessionStatusBadge,
  sessionToneFromStatus,
  type SessionStatusTone,
} from "./components";

type StatusConfig = { label: string; tone: SessionStatusTone };

function buildStatusMap(t: (_key: string) => string): Record<string, StatusConfig> {
  return {
    DRAFT: { label: t("common.waitingForApproval"), tone: "draft" },
    SCHEDULED: { label: t("common.comingSoon"), tone: "scheduled" },
    PAID: { label: t("common.paid"), tone: "paid" },
    ONGOING: { label: t("common.ongoing"), tone: "ongoing" },
    COMPLETED: { label: t("general.completed"), tone: "completed" },
    REJECTED: { label: t("common.rejected"), tone: "rejected" },
    CANCELED: { label: t("common.canceled"), tone: "canceled" },
  };
}

// ---------- shared surface tokens ----------

const METRIC_TILE = cn(
  "flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
);

const CHIP_LABEL_CLS =
  "text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400";

// ---------- motion variants ----------

const childMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

const cardPop = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: "easeOut" as const } },
};

// ---------- KPI tiles ----------

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  accent?: "sky" | "indigo" | "emerald" | "amber" | "violet";
  meta?: React.ReactNode;
}

const ACCENT_RING: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  sky: "bg-sky-100 dark:bg-sky-500/15",
  indigo: "bg-indigo-100 dark:bg-indigo-500/15",
  emerald: "bg-emerald-100 dark:bg-emerald-500/15",
  amber: "bg-amber-100 dark:bg-amber-500/15",
  violet: "bg-violet-100 dark:bg-violet-500/15",
};

const ACCENT_ICON: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  sky: "text-sky-600 dark:text-sky-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  violet: "text-violet-600 dark:text-violet-300",
};

function KpiTile({ icon: Icon, label, value, accent = "indigo", meta }: KpiTileProps) {
  return (
    <div className={METRIC_TILE}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            ACCENT_RING[accent]
          )}>
          <Icon className={cn("h-4 w-4", ACCENT_ICON[accent])} aria-hidden />
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        {meta && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p>}
      </div>
    </div>
  );
}

// ---------- compact STAR preview row ----------

interface StarPreviewRowProps {
  letter: string;
  label: string;
  summary?: string;
  hue: "sky" | "indigo" | "blue" | "cyan";
}

const HUE_BAR: Record<StarPreviewRowProps["hue"], string> = {
  sky: "bg-sky-500/70",
  indigo: "bg-indigo-500/70",
  blue: "bg-blue-500/70",
  cyan: "bg-cyan-500/70",
};

const HUE_DOT: Record<StarPreviewRowProps["hue"], string> = {
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
};

function StarPreviewRow({ letter, label, summary, hue }: StarPreviewRowProps) {
  const filled = !!summary && summary.trim().length > 0;
  return (
    <div className="group flex items-center gap-3">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors",
          filled
            ? HUE_BAR[hue] + " text-white"
            : "bg-slate-200/70 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400"
        )}>
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-xs",
            filled
              ? "text-slate-700 dark:text-slate-200"
              : "text-slate-400 italic dark:text-slate-500"
          )}>
          {filled ? summary : "—"}
        </p>
      </div>
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          filled ? HUE_DOT[hue] : "bg-slate-300 dark:bg-slate-600"
        )}
        aria-hidden
      />
    </div>
  );
}

// ---------- PAGE ----------

export function MentorSessionDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId } = useParams<{
    sessionId: string;
  }>();
  const user = useAuthStore((state) => state.user);
  const numericSessionId = Number(sessionId);
  const { data: session, isLoading: sessionLoading } = useSessionById(numericSessionId);
  const mentorId = session ? getSessionMentorId(session) : undefined;
  const { data: mentorInfo } = useMentorById(mentorId || 0);
  const { data: mentorReview, isLoading: reviewLoading } =
    useMentorReviewBySession(numericSessionId);
  const { data: studentInfo } = useUserById(session?.userId ?? 0, !!session?.userId);
  const isAllowed = isSessionMentor(session, user?.id);
  const reduceMotion = useReducedMotion();

  const statusMap = buildStatusMap(t);
  const fallbackStatus = statusMap.SCHEDULED;

  useEffect(() => {
    if (sessionLoading) return;
    if (!session || !isAllowed) {
      navigate("/mentor?tab=sessions", { replace: true });
    }
  }, [isAllowed, navigate, session, sessionLoading]);

  const rating = typeof mentorReview?.rating === "number" ? mentorReview.rating : 0;

  // One-line summary built from the strongest available STAR field.
  const starSummary = useMemo(() => {
    if (!mentorReview) return null;
    const candidates = [
      mentorReview.resultNote,
      mentorReview.actionNote,
      mentorReview.taskNote,
      mentorReview.situationNote,
    ];
    return candidates.find((s) => s && s.trim().length > 0)?.trim();
  }, [mentorReview]);

  const starRows: StarPreviewRowProps[] = mentorReview
    ? [
        {
          letter: "S",
          label: t("mentorReviews.situation"),
          summary: mentorReview.situationNote,
          hue: "sky",
        },
        {
          letter: "T",
          label: t("mentorReviews.tasks"),
          summary: mentorReview.taskNote,
          hue: "indigo",
        },
        {
          letter: "A",
          label: t("mentorReviews.action"),
          summary: mentorReview.actionNote,
          hue: "blue",
        },
        {
          letter: "R",
          label: t("mentorReviews.result"),
          summary: mentorReview.resultNote,
          hue: "cyan",
        },
      ]
    : [];

  if (sessionLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (!session || !isAllowed) return null;

  const status = statusMap[session.status || "SCHEDULED"] || fallbackStatus;
  const canJoinRoom =
    (session.status === "PAID" || session.status === "ONGOING" || session.status === "SCHEDULED") &&
    typeof session.roomUrl === "string" &&
    session.roomUrl !== "OFFLINE";
  const canReview = session.status === "COMPLETED";

  const candidateFeedback = session.mentorFeedback;
  const candidateRating =
    typeof candidateFeedback?.rating === "number" ? candidateFeedback.rating : null;

  const renderStars = (value: number, size: "sm" | "md" = "md") => (
    <StarRating value={value} readOnly size={size} />
  );

  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-col gap-5 p-4 md:p-6 lg:p-8">
        <motion.div
          className="flex w-full flex-col gap-5"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
          }}
          initial="hidden"
          animate="show">
          {/* Top action bar - Admin Pattern */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/mentor?tab=sessions")}
              className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t("common.backToTheList")}
            </Button>
            <div className="flex items-center gap-2">
              {canReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/mentor/sessions/${session.id}/review`)}
                  className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
                  {t("common.writeReview")}
                </Button>
              )}
              {candidateFeedback && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/mentor/sessions/${session.id}/review/view`)}
                  className="h-9 rounded-lg border-slate-200 text-xs font-medium dark:border-slate-700">
                  {t("common.viewReview")}
                </Button>
              )}
            </div>
          </div>

          {/* Session Info Card - Admin Pattern */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 rounded-xl border border-slate-100 dark:border-slate-800">
                  <AvatarImage src={studentInfo?.avatarUrl} alt={studentInfo?.name} />
                  <AvatarFallback className="rounded-xl bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {studentInfo?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("common.interviewSession")}
                  </p>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {studentInfo?.name || t("common.students")}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{session.roomName || "—"}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span>{mentorInfo?.name || t("common.mentor")}</span>
                  </div>
                </div>
              </div>
              <SessionStatusBadge
                tone={sessionToneFromStatus(session.status)}
                label={status.label}
              />
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              icon={Calendar}
              label={t("common.appointmentTime")}
              value={formatDateTime(session.joinTime)}
              accent="indigo"
            />
            <KpiTile
              icon={Timer}
              label={t("common.duration1")}
              value={
                typeof session.duration === "number" && session.duration > 0
                  ? t("general.minutes", { var_0: session.duration })
                  : "—"
              }
              accent="emerald"
            />
            <KpiTile
              icon={CreditCard}
              label={t("common.totalPrice")}
              value={
                typeof session.totalPrice === "number" && session.totalPrice > 0
                  ? formatCurrency(session.totalPrice)
                  : "—"
              }
              accent="amber"
              meta={session.transactionCode ?? undefined}
            />
            <KpiTile
              icon={Hash}
              label={t("common.roomName1")}
              value={session.roomName || t("common.interviewSession")}
              accent="sky"
            />
          </div>

          {/* Bento — main content + side rail */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
            {/* LEFT — Act-fast + Your review (compact) + STAR preview */}
            <motion.div variants={childMotion} className="flex flex-col gap-5">
              {/* Act-fast — bold CTA strip with gradient edges */}
              <ActFastBar
                canJoinRoom={canJoinRoom}
                canReview={canReview}
                hasReview={!!mentorReview}
                onJoin={() => navigate(`/mentor/sessions/room/${session.id}`)}
                onWrite={() => navigate(`/mentor/sessions/${session.id}/review`)}
                onEdit={() => navigate(`/mentor/sessions/${session.id}/review`)}
                onView={() => navigate(`/mentor/sessions/${session.id}/review/view`)}
                t={t}
              />

              {/* Bento: Your review summary + STAR preview */}
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Your review summary — compact, signal-first */}
                <PanelSurface className="relative overflow-hidden">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-amber-300/10 opacity-60 blur-3xl dark:bg-amber-500/15"
                  />
                  <div className="relative flex flex-col gap-4 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
                            "bg-slate-900/[0.04] ring-slate-900/10",
                            "dark:bg-white/[0.05] dark:ring-white/10"
                          )}>
                          <Star className="h-4 w-4 text-amber-500" aria-hidden />
                        </div>
                        <div>
                          <p className={CHIP_LABEL_CLS}>{t("mentorSessions.yourReview")}</p>
                          <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                            {rating > 0
                              ? t("mentorSessions.youScoredCandidateWith", {
                                  var_0: rating.toFixed(1),
                                })
                              : t("mentorSessions.thereAreNoReviewsSubmitted")}
                          </p>
                        </div>
                      </div>
                      {mentorReview?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/mentor/sessions/${session.id}/review/view`)}
                          className="gap-1.5 text-xs">
                          {t("common.seeReviewDetails")}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>

                    {reviewLoading ? (
                      <Skeleton className="h-20" />
                    ) : !mentorReview ? (
                      <div
                        className={cn(
                          "ring-dashed rounded-xl p-5 text-center ring-1 ring-inset",
                          "ring-slate-300/70 dark:ring-slate-700/70"
                        )}>
                        <Wand2 className="mx-auto h-5 w-5 text-slate-400" aria-hidden />
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {t("mentorSessions.youHaventSubmittedAReview")}
                        </p>
                        {canReview && (
                          <Button
                            size="sm"
                            className="mt-3 gap-1.5 bg-sky-600 text-white hover:bg-sky-700"
                            onClick={() => navigate(`/mentor/sessions/${session.id}/review`)}>
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                            {t("common.writeAReview")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                              {rating.toFixed(1)}
                            </span>
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                              /5
                            </span>
                          </div>
                          {renderStars(rating, "md")}
                        </div>
                        {starSummary && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {starSummary}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {mentorReview.strength && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.04em] uppercase ring-1 ring-inset",
                                "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
                                "dark:text-emerald-300"
                              )}>
                              <ThumbsUpTiny />
                              {t("mentorSessions.strengths")}
                            </span>
                          )}
                          {mentorReview.weakness && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.04em] uppercase ring-1 ring-inset",
                                "bg-rose-500/10 text-rose-700 ring-rose-500/20",
                                "dark:text-rose-300"
                              )}>
                              <WrenchTiny />
                              {t("mentorSessions.pointsForImprovement")}
                            </span>
                          )}
                          {mentorReview.improve && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.04em] uppercase ring-1 ring-inset",
                                "bg-violet-500/10 text-violet-700 ring-violet-500/20",
                                "dark:text-violet-300"
                              )}>
                              <LightbulbTiny />
                              {t("common.suggestedImprovements")}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </PanelSurface>

                {/* STAR preview — 4 compact rows, full content in detail page */}
                <PanelSurface className="relative overflow-hidden">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -left-12 h-40 w-40 rounded-full bg-sky-300/10 opacity-60 blur-3xl dark:bg-sky-500/15"
                  />
                  <div className="relative flex flex-col gap-4 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
                            "bg-slate-900/[0.04] ring-slate-900/10",
                            "dark:bg-white/[0.05] dark:ring-white/10"
                          )}>
                          <Target className="h-4 w-4 text-sky-500" aria-hidden />
                        </div>
                        <div>
                          <p className={CHIP_LABEL_CLS}>{t("common.star")}</p>
                          <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                            {t("mentorReviews.detailedAssessmentStarMethod")}
                          </p>
                        </div>
                      </div>
                      {mentorReview?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/mentor/sessions/${session.id}/review/view`)}
                          className="gap-1 text-xs text-slate-500 dark:text-slate-400">
                          {t("common.seeReviewDetails")}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      )}
                    </div>

                    {reviewLoading ? (
                      <Skeleton className="h-40" />
                    ) : starRows.length === 0 ? (
                      <div
                        className={cn(
                          "ring-dashed rounded-xl p-5 text-center ring-1 ring-inset",
                          "ring-slate-300/70 dark:ring-slate-700/70"
                        )}>
                        <Sparkles className="mx-auto h-5 w-5 text-slate-400" aria-hidden />
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {t("mentorSessions.youHaventSubmittedAReview")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {starRows.map((row) => (
                          <StarPreviewRow key={row.letter} {...row} />
                        ))}
                      </div>
                    )}
                  </div>
                </PanelSurface>
              </div>
            </motion.div>

            {/* RIGHT — Candidate feedback + Timeline */}
            <motion.aside variants={childMotion} className="flex flex-col gap-5">
              {/* Candidate feedback */}
              <PanelSurface className="relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full bg-emerald-300/10 opacity-60 blur-3xl dark:bg-emerald-500/15"
                />
                <div className="relative flex flex-col gap-4 p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-emerald-400/30">
                      <AvatarImage
                        src={studentInfo?.avatarUrl}
                        alt={studentInfo?.name ?? t("common.students")}
                      />
                      <AvatarFallback className="bg-slate-200/60 text-sm font-semibold text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
                        {(studentInfo?.name || "S").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className={CHIP_LABEL_CLS}>{t("mentorSessions.candidateFeedback")}</p>
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {studentInfo?.name || t("common.students")}
                      </p>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {candidateFeedback ? (
                      <motion.div
                        key="filled"
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.24, ease: "easeOut" as const }}
                        className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                            {candidateRating != null ? candidateRating.toFixed(1) : "—"}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            /5
                          </span>
                          {renderStars(candidateRating || 0, "sm")}
                        </div>
                        <blockquote
                          className={cn(
                            "relative rounded-xl p-4 ring-1 ring-inset",
                            "bg-slate-500/[0.04] ring-slate-200/70",
                            "dark:bg-white/[0.03] dark:ring-white/5"
                          )}>
                          <span
                            aria-hidden
                            className="absolute -top-2 left-3 text-3xl leading-none text-slate-300 dark:text-slate-600">
                            “
                          </span>
                          <p className="text-xs leading-relaxed text-slate-700 italic dark:text-slate-300">
                            {candidateFeedback.comment || t("common.noDataAvailable")}
                          </p>
                        </blockquote>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                        transition={{ duration: 0.24, ease: "easeOut" as const }}
                        className={cn(
                          "ring-dashed rounded-xl p-5 text-center ring-1 ring-inset",
                          "ring-slate-300/70 dark:ring-slate-700/70"
                        )}>
                        <Sparkles className="mx-auto h-5 w-5 text-slate-400" aria-hidden />
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {t("mentorSessions.candidateHasNotLeftFeedbackYet")}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </PanelSurface>

              {/* Timeline */}
              <PanelSurface variant="flat" className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className={CHIP_LABEL_CLS}>{t("common.timeline")}</p>
                  <TrendingUp className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  {session.joinTime && (
                    <TimelineRow
                      label={t("common.appointmentTime")}
                      value={formatDateTime(session.joinTime)}
                      dot="bg-indigo-500/70"
                    />
                  )}
                  {session.startTime1 && (
                    <TimelineRow
                      label={t("mentorSessions.startTime")}
                      value={formatDateTime(session.startTime1)}
                      dot="bg-sky-500/70"
                    />
                  )}
                  {session.endTime1 && (
                    <TimelineRow
                      label={t("mentorSessions.endTime")}
                      value={formatDateTime(session.endTime1)}
                      dot="bg-slate-400"
                    />
                  )}
                </div>
                {session.recordUrl && (
                  <div className="mt-4">
                    <MetaChip
                      icon={<Link2 className="h-3.5 w-3.5" aria-hidden />}
                      label={t("mentorSessions.recording")}
                      value={
                        <a
                          href={session.recordUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 underline-offset-2 hover:underline dark:text-sky-300">
                          {t("common.open")}
                          <ArrowUpRight className="h-3 w-3" aria-hidden />
                        </a>
                      }
                    />
                  </div>
                )}
              </PanelSurface>
            </motion.aside>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function TimelineRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/40 px-3 py-2 dark:border-slate-700/40">
      <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
        {label}
      </span>
      <span className="font-mono text-xs font-medium text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

function ActFastBar({
  canJoinRoom,
  canReview,
  hasReview,
  onJoin,
  onWrite,
  onEdit,
  onView,
  t,
}: {
  canJoinRoom: boolean;
  canReview: boolean;
  hasReview: boolean;
  onJoin: () => void;
  onWrite: () => void;
  onEdit: () => void;
  onView: () => void;
  t: (_key: string) => string;
}) {
  const headline = canJoinRoom
    ? t("mentorSessions.itSMeetingTime")
    : canReview
      ? t("mentorSessions.evaluateStudentsAfterTheInterview")
      : t("mentorSessions.thisSessionIsCurrentlyOnly");

  return (
    <motion.div
      variants={cardPop}
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 ring-1 ring-inset sm:p-6",
        "bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10",
        "ring-slate-200/70 backdrop-blur-sm",
        "dark:from-indigo-500/15 dark:via-sky-500/10 dark:to-emerald-500/15 dark:ring-white/5"
      )}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
              "bg-indigo-500/15 text-indigo-600 ring-indigo-500/20",
              "dark:bg-indigo-500/20 dark:text-indigo-300"
            )}>
            <Zap className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className={CHIP_LABEL_CLS}>{t("common.actFast")}</p>
            <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {headline}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canJoinRoom && (
            <Button
              className="gap-2 bg-emerald-600 text-white shadow-[0_4px_18px_-8px_rgba(16,185,129,0.6)] hover:bg-emerald-700"
              onClick={onJoin}>
              <Video className="h-4 w-4" aria-hidden />
              {t("common.enterTheInterviewRoom")}
            </Button>
          )}
          {canReview && !hasReview && (
            <Button
              className="gap-2 bg-sky-600 text-white shadow-[0_4px_18px_-8px_rgba(2,132,199,0.6)] hover:bg-sky-700"
              onClick={onWrite}>
              <MessageSquare className="h-4 w-4" aria-hidden />
              {t("common.writeAReview")}
            </Button>
          )}
          {canReview && hasReview && (
            <>
              <Button variant="outline" className="gap-2" onClick={onEdit}>
                <MessageSquare className="h-4 w-4" aria-hidden />
                {t("common.editReview")}
              </Button>
              <Button
                variant="ghost"
                className="gap-2 text-slate-600 dark:text-slate-300"
                onClick={onView}>
                {t("common.seeReviewDetails")}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Tiny inline icons for tag pills (compact, no extra imports needed)
function ThumbsUpTiny() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4">
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0 4-9a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 16.7 19H7V11z" />
    </svg>
  );
}
function WrenchTiny() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-2.3-2.3 3-3z" />
    </svg>
  );
}
function LightbulbTiny() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4">
      <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </svg>
  );
}
