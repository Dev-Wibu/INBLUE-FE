/**
 * Mentor Session Detail Page — "Interview Dossier" v3.
 * Tighter, denser, single-tone dark glass layout. No per-card colored
 * backgrounds (amber/emerald/rose/indigo blocks removed) — replaced
 * with one neutral dark glass ramp + thin status indicator dots.
 *
 * max-w-6xl wrapper so content fills the screen on wider monitors
 * without stretching the empty sides.
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
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Hash,
  Link2,
  MessageSquare,
  Sparkles,
  Star,
  Timer,
  User,
  Video,
} from "lucide-react";
import { useEffect } from "react";
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

const heroMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

const childMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } },
};

// Single neutral "dark glass" surface — reused for every inner card so
// the page reads as one continuous dossier, not a fruit salad of color
// blocks. Status is conveyed via a small dot/ring on the left rail
// instead of a full-card background.
const GLASS_SURFACE = cn(
  "rounded-xl p-4 ring-1 ring-inset",
  "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
  "dark:bg-white/[0.03] dark:ring-white/5"
);

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

  const statusMap = buildStatusMap(t);
  const fallbackStatus = statusMap.SCHEDULED;

  useEffect(() => {
    if (sessionLoading) {
      return;
    }
    if (!session || !isAllowed) {
      navigate("/mentor?tab=sessions", {
        replace: true,
      });
    }
  }, [isAllowed, navigate, session, sessionLoading]);

  if (sessionLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!session || !isAllowed) {
    return null;
  }

  const status = statusMap[session.status || "SCHEDULED"] || fallbackStatus;
  const canJoinRoom =
    (session.status === "PAID" || session.status === "ONGOING" || session.status === "SCHEDULED") &&
    typeof session.roomUrl === "string" &&
    session.roomUrl !== "OFFLINE";
  const canReview = session.status === "COMPLETED";

  const sessionTitle =
    session.roomName ||
    t("common.sessionVar0", {
      var_0: session.id,
    });

  const candidateFeedback = session.mentorFeedback;
  const rating = typeof mentorReview?.rating === "number" ? mentorReview.rating : 0;

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
          className="gap-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
          onClick={() => navigate("/mentor?tab=sessions")}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("common.returnToTheSessionList")}
        </Button>
      </motion.div>

      {/* HERO — title + meta chips + status, single dark glass surface */}
      <motion.div variants={heroMotion}>
        <PanelSurface className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-sky-400/15 opacity-60 blur-3xl dark:bg-sky-500/20"
          />
          <div className="relative flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 ring-1 ring-inset",
                    "bg-slate-900/[0.04] ring-slate-900/10",
                    "dark:bg-white/[0.05] dark:text-slate-300 dark:ring-white/10"
                  )}>
                  <Video className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <h1
                    className="text-xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-2xl dark:text-slate-100"
                    style={{ textWrap: "balance" }}>
                    {sessionTitle}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("mentorSessions.detailsOfMentorInterviewSession")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900/[0.04] px-2.5 py-1 font-mono text-xs font-medium text-slate-600 ring-1 ring-slate-900/10 ring-inset dark:bg-white/[0.05] dark:text-slate-300 dark:ring-white/10">
                  {t("common.code")}
                  {session.id || "-"}
                </span>
                <SessionStatusBadge
                  tone={sessionToneFromStatus(session.status)}
                  label={status.label}
                />
              </div>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2">
              <MetaChip
                icon={<Hash className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.sessionCode")}
                value={`#${session.id || "-"}`}
              />
              <MetaChip
                icon={<User className="h-3.5 w-3.5" aria-hidden />}
                label={t("mentorFeedback.students")}
                value={`#${session.userId || "-"}`}
              />
              <MetaChip
                icon={<User className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.mentor")}
                value={
                  mentorInfo?.name ||
                  (mentorId != null ? t("common.mentorWithId", { id: mentorId }) : "-")
                }
              />
              <MetaChip
                icon={<Calendar className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.appointmentTime")}
                value={formatDateTime(session.joinTime)}
              />
              <MetaChip
                icon={<Timer className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.duration1")}
                value={
                  typeof session.duration === "number" && session.duration > 0
                    ? t("general.minutes", { var_0: session.duration })
                    : "-"
                }
              />
              <MetaChip
                icon={<CreditCard className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.totalPrice")}
                value={
                  typeof session.totalPrice === "number" && session.totalPrice > 0
                    ? formatCurrency(session.totalPrice)
                    : "-"
                }
              />
              {session.transactionCode && (
                <MetaChip
                  icon={<CreditCard className="h-3.5 w-3.5" aria-hidden />}
                  label={t("common.transactionCode1")}
                  value={session.transactionCode}
                />
              )}
              {session.recordUrl && (
                <MetaChip
                  icon={<Link2 className="h-3.5 w-3.5" aria-hidden />}
                  label={t("mentorSessions.recording")}
                  value={
                    <a
                      href={session.recordUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 underline-offset-2 hover:underline dark:text-sky-300">
                      {t("common.open")}
                    </a>
                  }
                />
              )}
            </div>
          </div>
        </PanelSurface>
      </motion.div>

      {/* 2-column dossier: 8/4 split, denser than before */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        {/* LEFT — act-fast + your review */}
        <motion.div variants={childMotion} className="flex flex-col gap-5">
          {/* Act-fast action bar — same dark glass surface as everything else */}
          <PanelSurface className="overflow-hidden">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                  {t("common.actFast")}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {canJoinRoom
                    ? t("mentorSessions.itSMeetingTime")
                    : canReview
                      ? t("mentorSessions.evaluateStudentsAfterTheInterview")
                      : t("mentorSessions.thisSessionIsCurrentlyOnly")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canJoinRoom && (
                  <Button
                    className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => navigate(`/mentor/sessions/room/${session.id}`)}>
                    <Video className="h-4 w-4" aria-hidden />
                    {t("common.enterTheInterviewRoom")}
                  </Button>
                )}
                {canReview && !mentorReview && (
                  <Button
                    className="gap-2 bg-sky-600 text-white hover:bg-sky-700"
                    onClick={() => navigate(`/mentor/sessions/${session.id}/review`)}>
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    {t("common.writeAReview")}
                  </Button>
                )}
                {canReview && mentorReview?.id && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate(`/mentor/sessions/${session.id}/review`)}>
                    {t("common.editReview")}
                  </Button>
                )}
                {!canJoinRoom && !canReview && (
                  <p className="text-sm text-slate-500">
                    {t("mentorSessions.thisSessionIsCurrentlyOnly")}
                  </p>
                )}
              </div>
            </div>
          </PanelSurface>

          {/* Your review snapshot — STAR narrative + 3-col additional */}
          <PanelSurface>
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
                      "bg-slate-900/[0.04] ring-slate-900/10",
                      "dark:bg-white/[0.05] dark:ring-white/10"
                    )}>
                    <Star className="h-5 w-5 text-amber-500" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                      {t("mentorSessions.yourReview")}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t("mentorSessions.overviewOfAssessmentContentSent")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mentorReview?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/mentor/sessions/${session.id}/review/view`)}
                      className="gap-1.5 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                      {t("common.seeReviewDetails")}
                    </Button>
                  )}
                </div>
              </div>

              {reviewLoading ? (
                <Skeleton className="h-28" />
              ) : !mentorReview ? (
                <div
                  className={cn(
                    "ring-dashed rounded-xl p-5 text-center text-sm text-slate-500 ring-1 ring-inset",
                    "ring-slate-300/70 dark:text-slate-400 dark:ring-slate-700/70"
                  )}>
                  {t("mentorSessions.thereAreNoReviewsSubmitted")}
                </div>
              ) : (
                <>
                  {/* Rating hero strip */}
                  <div
                    className={cn(
                      GLASS_SURFACE,
                      "flex flex-wrap items-center justify-between gap-3"
                    )}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                        {rating > 0 ? rating.toFixed(1) : "-"}
                      </span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        /5
                      </span>
                      <span className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                        {t("mentorReviews.overallAssessment")}
                      </span>
                    </div>
                    <StarRating value={rating} readOnly size="md" />
                  </div>

                  {/* STAR notes — stacked narrative, full text visible */}
                  {(mentorReview.situationNote ||
                    mentorReview.taskNote ||
                    mentorReview.actionNote ||
                    mentorReview.resultNote) && (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                        STAR
                      </p>
                      {(
                        [
                          {
                            key: "S",
                            label: t("mentorReviews.situation"),
                            value: mentorReview.situationNote,
                          },
                          {
                            key: "T",
                            label: t("mentorReviews.tasks"),
                            value: mentorReview.taskNote,
                          },
                          {
                            key: "A",
                            label: t("mentorReviews.action"),
                            value: mentorReview.actionNote,
                          },
                          {
                            key: "R",
                            label: t("mentorReviews.result"),
                            value: mentorReview.resultNote,
                          },
                        ] as const
                      )
                        .filter((row) => row.value && row.value.trim().length > 0)
                        .map((row) => (
                          <div key={row.key} className={cn(GLASS_SURFACE, "flex gap-3 p-4")}>
                            <span
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                                "bg-slate-900/[0.06] text-slate-700",
                                "dark:bg-white/[0.06] dark:text-slate-200"
                              )}>
                              {row.key}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                                {row.label}
                              </p>
                              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                                {row.value}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Strengths / Improvement / Suggestions — 3 cols */}
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className={GLASS_SURFACE}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                        {t("mentorSessions.strengths")}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {mentorReview.strength || "-"}
                      </p>
                    </div>
                    <div className={GLASS_SURFACE}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                        {t("mentorSessions.pointsForImprovement")}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {mentorReview.weakness || "-"}
                      </p>
                    </div>
                    <div className={GLASS_SURFACE}>
                      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                        {t("common.suggestedImprovements")}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                        {mentorReview.improve || "-"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </PanelSurface>
        </motion.div>

        {/* RIGHT — candidate feedback dossier + timeline, single tone */}
        <motion.aside variants={childMotion} className="flex flex-col gap-5">
          <PanelSurface className="overflow-hidden">
            <div className="flex flex-col gap-3 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 ring-1 ring-white/10">
                  <AvatarImage
                    src={studentInfo?.avatarUrl}
                    alt={studentInfo?.name ?? t("common.students")}
                  />
                  <AvatarFallback className="bg-slate-200/60 text-xs font-semibold text-slate-700 dark:bg-slate-700/40 dark:text-slate-200">
                    {(studentInfo?.name || "S").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                    {t("mentorSessions.candidateFeedback")}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {studentInfo?.name || t("common.students")}
                  </p>
                </div>
              </div>

              {candidateFeedback ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                      {typeof candidateFeedback.rating === "number"
                        ? candidateFeedback.rating.toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      /5
                    </span>
                    <StarRating
                      value={
                        typeof candidateFeedback.rating === "number" ? candidateFeedback.rating : 0
                      }
                      readOnly
                      size="sm"
                    />
                  </div>
                  <div className={GLASS_SURFACE}>
                    <p className="text-xs leading-relaxed text-slate-600 italic dark:text-slate-300">
                      {candidateFeedback.comment
                        ? `“${candidateFeedback.comment}”`
                        : t("common.noDataAvailable")}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "ring-dashed rounded-xl p-5 text-center ring-1 ring-inset",
                    "ring-slate-300/70 dark:ring-slate-700/70"
                  )}>
                  <Sparkles className="mx-auto h-5 w-5 text-slate-400" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {t("mentorSessions.candidateHasNotLeftFeedbackYet")}
                  </p>
                </div>
              )}
            </div>
          </PanelSurface>

          {/* Timeline strip */}
          <PanelSurface variant="flat" className="p-5">
            <p className="mb-3 text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
              {t("common.timeline")}
            </p>
            <div className="flex flex-col gap-2 text-xs">
              {session.startTime1 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500/70" aria-hidden />
                    {t("mentorSessions.startTime")}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatDateTime(session.startTime1)}
                  </span>
                </div>
              )}
              {session.endTime1 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                    {t("mentorSessions.endTime")}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatDateTime(session.endTime1)}
                  </span>
                </div>
              )}
              {session.joinTime && (
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500/70" aria-hidden />
                    {t("common.appointmentTime")}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {formatDateTime(session.joinTime)}
                  </span>
                </div>
              )}
            </div>
          </PanelSurface>
        </motion.aside>
      </div>
    </motion.div>
  );
}
