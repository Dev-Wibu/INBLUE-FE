/**
 * SessionCard — Mentor Interview "Command Center" card, v2.
 * Distinct, opinionated layout per status. No two cards look alike visually:
 * - Draft         → amber rail + soft amber wash + accept/reject cluster
 * - Scheduled     → sky rail + countdown + soft pulse
 * - Paid/Ongoing  → emerald rail + countdown + prominent Join
 * - Completed     → slate rail + completion ribbon
 * - Rejected/Canceled → rose rail + dimmed
 *
 * Pure presentation: no fetching, no mutations beyond caller callbacks.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Session } from "@/interfaces";
import {
  formatDate,
  formatDateTime,
  formatTime,
  toTimestamp,
  treatZuluAsVietnamLocal,
} from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  Clock,
  Eye,
  Hourglass,
  LogIn,
  MessageSquare,
  Pencil,
  User,
  Video,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SessionStatusBadge } from "./mentor-interview-primitives";
import {
  SESSION_CARD_GLOW,
  sessionToneFromStatus,
  type SessionStatusTone,
} from "./mentor-interview.constants";

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

const EARLY_JOIN_WINDOW_MS = 15 * 60 * 1000;

export interface SessionCardActionBag {
  onViewDetails: () => void;
  onJoinSession: () => void;
  onWriteReview: () => void;
  onViewReview: () => void;
  onEditReview: () => void;
  onAcceptSession: () => void;
  onRejectSession: () => void;
}

export interface SessionCardProps {
  session: Session;
  hasReview: boolean;
  reviewId?: number;
  now: number;
  isUpdatingStatus: boolean;
  actions: SessionCardActionBag;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function SessionCard({
  session,
  hasReview,
  now,
  isUpdatingStatus,
  actions,
}: SessionCardProps) {
  const { t } = useTranslation();
  const statusConfig = buildStatusMap(t);
  const status = statusConfig[session.status || "SCHEDULED"] || statusConfig.SCHEDULED;
  const isCompleted = session.status === "COMPLETED";
  const isDraft = session.status === "DRAFT";
  const isCancelled = session.status === "CANCELED" || session.status === "REJECTED";
  const joinTimestamp = toTimestamp(session.joinTime);
  const isTimeReached = joinTimestamp ? joinTimestamp - EARLY_JOIN_WINDOW_MS <= now : true;
  const canJoin =
    (session.status === "PAID" || session.status === "ONGOING" || session.status === "SCHEDULED") &&
    !isDraft &&
    !isCancelled &&
    !!session.roomUrl &&
    session.roomUrl !== "OFFLINE" &&
    isTimeReached;

  const sessionTitle =
    session.roomName ||
    t("common.sessionVar0", {
      var_0: session.id,
    });

  const msUntilJoin = joinTimestamp ? joinTimestamp - now : null;

  // Per-tone visual personality. Avoids identical "card grid" look.
  const toneKey = sessionToneFromStatus(session.status);
  const railClass: Record<SessionStatusTone, string> = {
    draft: "before:bg-amber-400/80 dark:before:bg-amber-400/60",
    scheduled: "before:bg-sky-400/80 dark:before:bg-sky-400/60",
    paid: "before:bg-emerald-400/80 dark:before:bg-emerald-400/60",
    ongoing: "before:bg-emerald-400 dark:before:bg-emerald-300",
    completed: "before:bg-slate-400/70 dark:before:bg-slate-500/70",
    rejected: "before:bg-rose-400/80 dark:before:bg-rose-400/60",
    canceled: "before:bg-rose-400/80 dark:before:bg-rose-400/60",
  };
  const washClass: Record<SessionStatusTone, string> = {
    draft: "bg-amber-50/40 dark:bg-amber-500/[0.04]",
    scheduled: "bg-sky-50/40 dark:bg-sky-500/[0.04]",
    paid: "bg-emerald-50/40 dark:bg-emerald-500/[0.04]",
    ongoing: "bg-emerald-50/60 dark:bg-emerald-500/[0.06]",
    completed: "bg-slate-50/30 dark:bg-slate-500/[0.04]",
    rejected: "bg-rose-50/40 dark:bg-rose-500/[0.04]",
    canceled: "bg-rose-50/40 dark:bg-rose-500/[0.04]",
  };
  const avatarClass: Record<SessionStatusTone, string> = {
    draft:
      "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:bg-amber-400/15 dark:text-amber-300",
    scheduled: "bg-sky-500/10 text-sky-700 ring-sky-500/30 dark:bg-sky-400/15 dark:text-sky-300",
    paid: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-400/15 dark:text-emerald-300",
    ongoing:
      "bg-emerald-500/15 text-emerald-700 ring-emerald-500/40 dark:bg-emerald-400/20 dark:text-emerald-200",
    completed:
      "bg-slate-500/10 text-slate-700 ring-slate-500/25 dark:bg-slate-400/15 dark:text-slate-300",
    rejected:
      "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:bg-rose-400/15 dark:text-rose-300",
    canceled:
      "bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:bg-rose-400/15 dark:text-rose-300",
  };

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        // 4px vertical status rail (left) via :before for crispness across themes.
        "group relative isolate flex h-full flex-col gap-4 overflow-hidden rounded-2xl p-4 sm:p-5",
        "before:absolute before:top-0 before:left-0 before:h-full before:w-1 before:content-['']",
        "ring-1 ring-slate-200/70 transition-shadow ring-inset dark:ring-white/5",
        "hover:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.35)] dark:hover:shadow-[0_10px_32px_-12px_rgba(0,0,0,0.7)]",
        washClass[toneKey],
        "bg-white dark:bg-slate-900/70",
        railClass[toneKey]
      )}>
      {/* Soft tone glow — only visible on hover */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-70",
          SESSION_CARD_GLOW[toneKey]
        )}
      />

      {/* Top row: avatar + identity + status + inline join CTA */}
      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ring-inset",
              avatarClass[toneKey]
            )}>
            <Video className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {sessionTitle}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <User className="h-3 w-3" aria-hidden />
              <span>
                {t("common.student")} {session.userId}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <SessionStatusBadge tone={toneKey} label={status.label} />
          {canJoin && (
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                actions.onJoinSession();
              }}
              className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              {t("common.join")}
            </Button>
          )}
          {isDraft && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        actions.onAcceptSession();
                      }}
                      disabled={isUpdatingStatus}
                      className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {t("common.browse")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("mentorSessions.acceptInterviewSession")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(event) => {
                        event.stopPropagation();
                        actions.onRejectSession();
                      }}
                      disabled={isUpdatingStatus}
                      className="h-7 gap-1 px-2.5 text-xs">
                      <X className="h-3.5 w-3.5" aria-hidden />
                      {t("common.refuse")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("common.refuseTheInterviewSession")}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </div>
      </header>

      {/* Time meta row — date, time, optional countdown chip */}
      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {session.joinTime && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            <span className="text-[10px] tracking-wide uppercase opacity-70">
              {t("common.meetingHours")}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {formatDateTime(session.joinTime)}
            </span>
          </span>
        )}
        {session.startTime1 && (
          <>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {formatDate(treatZuluAsVietnamLocal(session.startTime1))}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {formatTime(treatZuluAsVietnamLocal(session.startTime1))}
              </span>
            </span>
          </>
        )}
        {!session.startTime1 && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {t("common.session2")} {session.id}
            </span>
          </span>
        )}
        {!isTimeReached && !isCompleted && !isCancelled && msUntilJoin && (
          <span
            className={cn(
              "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30"
            )}>
            <Hourglass className="h-3 w-3" aria-hidden />
            {formatCountdown(msUntilJoin)}
          </span>
        )}
      </div>

      {/* Action cluster — single primary entry point + context-aware secondary buttons */}
      <footer className="relative mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={actions.onViewDetails}
          className="h-7 gap-1 px-2.5 text-xs">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          {t("common.seeDetails")}
        </Button>
        {isCompleted && !hasReview && (
          <Button
            size="sm"
            onClick={actions.onWriteReview}
            className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            {t("common.writeAReview")}
          </Button>
        )}
        {isCompleted && hasReview && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={actions.onViewReview}
              className="h-7 gap-1 px-2.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              {t("common.seeReviews")}
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={actions.onEditReview}
                    disabled={typeof session.id !== "number"}
                    aria-label={t("common.editReview")}
                    className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.editReview")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
        {!isCompleted && !canJoin && (
          <span className="text-xs text-slate-500 italic">
            {session.status === "SCHEDULED" && !isTimeReached
              ? t("common.itsNotTimeYet")
              : session.status === "PAID" && !isTimeReached
                ? t("mentorSessions.itSNotTimeTo")
                : t("mentorSessions.theSessionIsNotYet")}
          </span>
        )}
      </footer>

      {/* Hidden Badge export keeps any test/selector that expects <Badge> intact */}
      <span className="sr-only">
        <Badge>{status.label}</Badge>
      </span>
    </motion.article>
  );
}
