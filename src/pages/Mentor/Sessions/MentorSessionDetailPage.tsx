/**
 * Mentor Session Detail Page — "Command Center" hero + meta + actions.
 * UI-only refresh. All data fetching, navigation, and access logic
 * preserved exactly.
 */

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Clock,
  CreditCard,
  MessageSquare,
  Star,
  User,
  Video,
} from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  MetaChip,
  PanelSurface,
  SectionHeading,
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
      <div className="space-y-5">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-[260px]" />
        <Skeleton className="h-[220px]" />
      </div>
    );
  }
  if (!session || !isAllowed) {
    return null;
  }

  const status = statusMap[session.status || "SCHEDULED"] || fallbackStatus;
  const canJoinRoom =
    (session.status === "PAID" || session.status === "ONGOING") &&
    typeof session.roomUrl === "string";
  const canReview = session.status === "COMPLETED";

  const sessionTitle =
    session.roomName ||
    t("common.sessionVar0", {
      var_0: session.id,
    });

  return (
    <motion.div
      className="space-y-5"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show">
      {/* Back button — single source of truth, no duplicated header */}
      <motion.div variants={childMotion}>
        <Button
          variant="ghost"
          className="w-fit gap-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
          onClick={() => navigate("/mentor?tab=sessions")}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("common.returnToTheSessionList")}
        </Button>
      </motion.div>

      {/* Hero panel: identity + status + meta chips */}
      <motion.div variants={heroMotion}>
        <PanelSurface className="relative overflow-hidden">
          {/* Decorative glow kept small, no heavy shadow stacking */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-indigo-400/20 opacity-60 blur-3xl dark:bg-indigo-500/25"
          />
          <div className="relative flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
                    "bg-indigo-500/10 text-indigo-600 ring-indigo-500/25",
                    "dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/25"
                  )}>
                  <Video className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <h1
                    className="text-xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-2xl dark:text-slate-100"
                    style={{ textWrap: "balance" }}>
                    {sessionTitle}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("mentorSessions.detailsOfMentorInterviewSession")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t("common.code")}
                  {session.id || "-"}
                </span>
                <SessionStatusBadge
                  tone={sessionToneFromStatus(session.status)}
                  label={status.label}
                />
              </div>
            </div>

            {/* Meta chips — one row of distinct atoms, not a uniform grid of grey cards */}
            <div className="flex flex-wrap gap-2">
              <MetaChip
                icon={<Calendar className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.sessionCode")}
                value={`#${session.id || "-"}`}
              />
              <MetaChip
                icon={<User className="h-3.5 w-3.5" aria-hidden />}
                label={t("mentorFeedback.students")}
                value={`#${session.userId || "-"}`}
                tone="indigo"
              />
              <MetaChip
                icon={<User className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.mentor")}
                value={
                  mentorInfo?.name ||
                  (mentorId != null ? t("common.mentorWithId", { id: mentorId }) : "-")
                }
                tone="emerald"
              />
              <MetaChip
                icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
                label={t("common.appointmentTime")}
                value={formatDateTime(session.joinTime)}
                tone="sky"
              />
              <MetaChip
                icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
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
                tone="amber"
              />
              {session.transactionCode && (
                <MetaChip
                  icon={<CreditCard className="h-3.5 w-3.5" aria-hidden />}
                  label={t("common.transactionCode1")}
                  value={session.transactionCode}
                />
              )}
            </div>
          </div>
        </PanelSurface>
      </motion.div>

      {/* Act-fast action bar — distinct visual treatment, not a generic "card" */}
      <motion.div variants={childMotion}>
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
                  className="gap-2"
                  onClick={() => navigate(`/mentor/sessions/${session.id}/review`)}>
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  {t("common.writeAReview")}
                </Button>
              )}

              {canReview && mentorReview?.id && (
                <>
                  <Button
                    variant="secondary"
                    className="gap-2"
                    onClick={() => navigate(`/mentor/reviews/${mentorReview.id}`)}>
                    <MessageSquare className="h-4 w-4" aria-hidden />
                    {t("mentorSessions.seeReviews")}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate(`/mentor/sessions/${session.id}/review`)}>
                    {t("common.editReview")}
                  </Button>
                </>
              )}

              {!canJoinRoom && !canReview && (
                <p className="text-sm text-slate-500">
                  {t("mentorSessions.thisSessionIsCurrentlyOnly")}
                </p>
              )}
            </div>
          </div>
        </PanelSurface>
      </motion.div>

      {/* Your review snapshot */}
      <motion.div variants={childMotion}>
        <PanelSurface>
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <SectionHeading
              title={
                <span className="inline-flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" aria-hidden />
                  {t("mentorSessions.yourReview")}
                </span>
              }
              subtitle={t("mentorSessions.overviewOfAssessmentContentSent")}
            />

            {reviewLoading ? (
              <Skeleton className="h-28" />
            ) : !mentorReview ? (
              <p className="text-sm text-slate-500">
                {t("mentorSessions.thereAreNoReviewsSubmitted")}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <div
                  className={cn(
                    "rounded-xl p-3 ring-1 ring-inset",
                    "bg-amber-500/8 ring-amber-500/20",
                    "dark:bg-amber-500/10"
                  )}>
                  <p className="text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
                    {t("mentorReviews.overallAssessment")}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-amber-700 dark:text-amber-300">
                    {typeof mentorReview.rating === "number" ? mentorReview.rating.toFixed(1) : "-"}
                    <span className="ml-1 text-sm font-medium opacity-70">/5</span>
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-3 ring-1 ring-inset",
                    "bg-emerald-500/8 ring-emerald-500/20",
                    "dark:bg-emerald-500/10"
                  )}>
                  <p className="text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
                    {t("mentorSessions.strengths")}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-700 dark:text-slate-300">
                    {mentorReview.strength || "-"}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-xl p-3 ring-1 ring-inset",
                    "bg-rose-500/8 ring-rose-500/20",
                    "dark:bg-rose-500/10"
                  )}>
                  <p className="text-[10px] font-semibold tracking-wide text-rose-700 uppercase dark:text-rose-300">
                    {t("mentorSessions.pointsForImprovement")}
                  </p>
                  <p className="mt-1 line-clamp-3 text-xs text-slate-700 dark:text-slate-300">
                    {mentorReview.weakness || "-"}
                  </p>
                </div>
              </div>
            )}

            {mentorReview?.id && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/mentor/reviews/${mentorReview.id}`)}>
                  {t("common.seeReviewDetails")}
                </Button>
              </div>
            )}
          </div>
        </PanelSurface>
      </motion.div>
    </motion.div>
  );
}
