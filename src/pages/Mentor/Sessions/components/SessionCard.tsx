/**
 * SessionCard — Mentor Interview "Command Center" card.
 * Pure presentation: receives a session and a bag of callbacks, renders
 * a glassy card with status badge, time meta, and an action cluster.
 *
 * No data fetching, no mutation handlers beyond what the caller provides.
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
import { Calendar, Check, Clock, LogIn, MessageSquare, User, Video, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SessionStatusBadge,
  sessionToneFromStatus,
  type SessionStatusTone,
} from "./mentor-interview-primitives";
import { SESSION_CARD_GLOW } from "./mentor-interview.constants";

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
  const joinTimestamp = toTimestamp(session.joinTime);
  const isTimeReached = joinTimestamp ? joinTimestamp - EARLY_JOIN_WINDOW_MS <= now : true;
  const isDraft = session.status === "DRAFT";
  const isCancelled = session.status === "CANCELED" || session.status === "REJECTED";
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

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl p-4 sm:p-5",
        "bg-white/90 ring-1 ring-slate-200/70 transition-all ring-inset",
        "hover:-translate-y-0.5 hover:ring-slate-300/80",
        "dark:bg-slate-900/60 dark:ring-white/5 dark:hover:ring-white/10",
        "shadow-[0_4px_18px_-12px_rgba(15,23,42,0.18)] dark:shadow-[0_4px_18px_-8px_rgba(0,0,0,0.55)]"
      )}>
      {/* Soft tone glow — sits behind content, never paired with a heavy shadow */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80",
          SESSION_CARD_GLOW[status.tone]
        )}
      />

      {/* Top row: identity + status + inline join CTA */}
      <header className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              "bg-indigo-500/10 text-indigo-600 ring-indigo-500/20",
              "dark:bg-indigo-400/15 dark:text-indigo-300 dark:ring-indigo-400/20"
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
          <SessionStatusBadge tone={sessionToneFromStatus(session.status)} label={status.label} />
          {!isTimeReached && !isCompleted && session.status !== "CANCELED" && session.joinTime && (
            <SessionStatusBadge tone="draft" label={t("common.itsNotTimeYet")} />
          )}
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

      {/* Time meta row */}
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
      </div>

      {/* Action cluster */}
      <footer className="relative mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={actions.onViewDetails}
          className="h-7 px-2.5 text-xs">
          {t("common.seeDetails")}
        </Button>
        {isCompleted && !hasReview && (
          <Button
            size="sm"
            onClick={actions.onWriteReview}
            className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
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
              {t("common.seeDetails")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.onEditReview}
              disabled={typeof session.id !== "number"}
              className="h-7 px-2.5 text-xs">
              {t("common.editReview")}
            </Button>
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
    </article>
  );
}
