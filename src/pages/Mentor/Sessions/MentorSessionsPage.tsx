/**
 * Mentor Sessions Page
 * Displays mentor's interview sessions with option to join video call or write reviews
 */

import { PaginationControl } from "@/components/shared/PaginationControl";
import { ReloadButton } from "@/components/shared/ReloadButton";
import { SortButton } from "@/components/shared/SortButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import {
  formatDate,
  formatDateTime,
  formatTime,
  toTimestamp,
  treatZuluAsVietnamLocal,
} from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  Calendar,
  Check,
  Clock,
  Filter,
  LogIn,
  MessageSquare,
  Search,
  User,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type SessionListTab = "draft" | "others";
type DraftTimeFilter = "all" | "hasJoinTime" | "noJoinTime";
type OtherStatusFilter =
  | "all"
  | "SCHEDULED"
  | "PAID"
  | "ONGOING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELED";
type SortableSession = Session & {
  sessionSortValue: number;
};

const getStatusConfig = (
  t: (key: string) => string
): Record<string, { label: string; badgeClass: string }> => ({
  DRAFT: {
    label: t("common.waitingForApproval"),
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  SCHEDULED: {
    label: t("common.comingSoon"),
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  PAID: {
    label: t("common.paid"),
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  ONGOING: {
    label: t("common.ongoing"),
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  COMPLETED: {
    label: t("general.completed"),
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  REJECTED: {
    label: t("common.rejected"),
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
  CANCELED: {
    label: t("common.canceled"),
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  },
});
const getSessionSortValue = (session: Session): number => {
  const joinTimeSort = toTimestamp(session.joinTime);
  if (typeof joinTimeSort === "number") {
    return joinTimeSort;
  }
  const startTimeSort = toTimestamp(session.startTime1);
  if (typeof startTimeSort === "number") {
    return startTimeSort;
  }
  return typeof session.id === "number" ? session.id : 0;
};
const matchesSessionSearch = (session: Session, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  const roomNameMatch = session.roomName?.toLowerCase().includes(normalizedQuery) ?? false;
  const roomUrlMatch = session.roomUrl?.toLowerCase().includes(normalizedQuery) ?? false;
  return (
    session.id?.toString().includes(normalizedQuery) ||
    session.userId?.toString().includes(normalizedQuery) ||
    session.userId2?.toString().includes(normalizedQuery) ||
    roomNameMatch ||
    roomUrlMatch
  );
};
interface SessionCardProps {
  session: Session;
  hasReview: boolean;
  reviewId?: number;
  now: number;
  onViewDetails: () => void;
  onJoinSession: () => void;
  onWriteReview: () => void;
  onViewReview: () => void;
  onEditReview: () => void;
  onAcceptSession: () => void;
  onRejectSession: () => void;
  isUpdatingStatus: boolean;
}
function SessionCard({
  session,
  hasReview,
  reviewId,
  now,
  onViewDetails,
  onJoinSession,
  onWriteReview,
  onViewReview,
  onEditReview,
  onAcceptSession,
  onRejectSession,
  isUpdatingStatus,
}: SessionCardProps) {
  const { t } = useTranslation();
  const statusConfig = useMemo(() => getStatusConfig(t), [t]);
  const status = statusConfig[session.status || "SCHEDULED"] || statusConfig.SCHEDULED;
  const isCompleted = session.status === "COMPLETED";
  // 2026-07-17: Mentor Interview (RoundType.MENTROR_REVIEW) sessions are
  //   persisted with status SCHEDULED until the first peer joins. The
  //   earliest 'canJoin' moment is 15 minutes before `joinTime` so the
  //   mentor can test their device; it's also allowed once the time has
  //   passed regardless of the persisted status (BE may be slow to flip
  //   to ONGOING after the webhook returns).
  // COMPLETED is intentionally NOT in the allowlist — once the room is
  // closed by Daily.co the URL is dead.
  const joinTimestamp = toTimestamp(session.joinTime);
  const earlyJoinWindowMs = 15 * 60 * 1000;
  // Three cases:
  //   1. joinTime set + within 15 min of now → can join
  //   2. joinTime set + past → can join (BE may not have flipped status)
  //   3. joinTime set + future + > 15 min away → cannot join yet
  //   4. joinTime null → allow join by default (legacy sessions)
  const isTimeReached = joinTimestamp ? joinTimestamp - earlyJoinWindowMs <= now : true;
  const isDraft = session.status === "DRAFT";
  const isCancelled = session.status === "CANCELED" || session.status === "REJECTED";
  const canJoin =
    (session.status === "PAID" || session.status === "ONGOING" || session.status === "SCHEDULED") &&
    !isDraft &&
    !isCancelled &&
    !!session.roomUrl &&
    session.roomUrl !== "OFFLINE" &&
    isTimeReached;
  return (
    <div className="group space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-indigo-800 dark:hover:shadow-indigo-500/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
            <Video className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {session.roomName ||
                t("common.sessionVar0", {
                  var_0: session.id,
                })}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <User className="h-3 w-3" />
              {t("common.student")}
              {session.userId}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <Badge className={cn("border-0", status.badgeClass)}>{status.label}</Badge>
          {!isTimeReached && !isCompleted && session.status !== "CANCELED" && session.joinTime && (
            <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="mr-1 h-3 w-3" />
              {t("common.itsNotTimeYet")}
            </Badge>
          )}
          {/* Always expose a Join button for SCHEDULED Mentor Interview
              sessions within 15 minutes of the scheduled start, even
              before BE flips status to ONGOING. */}
          {canJoin && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onJoinSession();
              }}
              className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
              <LogIn className="h-3.5 w-3.5" />
              {t("common.join")}
            </Button>
          )}
          {isDraft && (
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcceptSession();
                      }}
                      disabled={isUpdatingStatus}
                      className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                      {t("common.browse")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("mentorSessions.acceptInterviewSession")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRejectSession();
                      }}
                      disabled={isUpdatingStatus}
                      className="h-7 gap-1 px-2.5 text-xs">
                      <X className="h-3.5 w-3.5" />
                      {t("common.refuse")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("common.refuseTheInterviewSession")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {session.joinTime && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t("common.meetingHours")} {formatDateTime(session.joinTime)}
          </span>
        )}
        {session.startTime1 && (
          <>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(treatZuluAsVietnamLocal(session.startTime1))}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(treatZuluAsVietnamLocal(session.startTime1))}
            </span>
          </>
        )}
        {!session.startTime1 && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t("common.session2")}
            {session.id}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onViewDetails} className="h-7 px-2.5 text-xs">
          {t("common.seeDetails")}
        </Button>
        {isCompleted && !hasReview && (
          <Button
            size="sm"
            onClick={onWriteReview}
            className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("common.writeAReview")}
          </Button>
        )}
        {isCompleted && hasReview && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewReview}
              disabled={!reviewId}
              className="h-7 gap-1 px-2.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              {t("common.seeDetails")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEditReview}
              disabled={typeof session.id !== "number"}
              className="h-7 px-2.5 text-xs">
              {t("common.editReview")}
            </Button>
          </>
        )}
        {!isCompleted && !canJoin && (
          <span className="text-xs text-slate-500 italic">
            {/* Mentor Interview sessions start in SCHEDULED with no
                upfront payment; the only blocking condition is the
                15-minute pre-join window not yet being open. */}
            {session.status === "SCHEDULED" && !isTimeReached
              ? t("common.itsNotTimeYet")
              : session.status === "PAID" && !isTimeReached
                ? t("mentorSessions.itSNotTimeTo")
                : t("mentorSessions.theSessionIsNotYet")}
          </span>
        )}
      </div>
    </div>
  );
}
export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  // Default to "others" tab since the "Approval" (draft) tab is hidden per requirement.
  // Draft logic is preserved in code for future use.
  const [activeTab, setActiveTab] = useState<SessionListTab>("others");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftTimeFilter, setDraftTimeFilter] = useState<DraftTimeFilter>("all");
  const [otherStatusFilter, setOtherStatusFilter] = useState<OtherStatusFilter>("all");
  // 2026-08-02: BE SecurityConfig permitAll + mentor also has admin role in
  //   this project, so the admin endpoint still works for the Sessions tab
  //   and `useSessions()` was returning data before. `useUserSessions()` was
  //   returning `[]` for user 15 (likely BE filter behaves differently than
  //   documented for the test case where userId == userId2). Keeping the
  //   admin endpoint for now; FE-side mentor filter (below) still narrows to
  //   the mentor's own sessions.
  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    isRefetching: sessionsRefetching,
    refetch: refetchSessions,
  } = useSessions();
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    isRefetching: reviewsRefetching,
    refetch: refetchReviews,
  } = useMentorReviews();
  const updateStatusMutation = useUpdateSessionStatus();
  // 2026-07-28: User.id (from JWT sub) is NOT the same as Mentor.id. The
  //   admin assignment stores the Mentor.id in `session.mentorId` /
  //   `session.userId`, so we resolve the mentor profile for the current
  //   auth user and use BOTH ids when filtering.
  const { data: currentMentorProfile } = useCurrentMentorProfile();

  // Current time state for joinTime-based blocking (updates every 5s).
  // 2026-07-17 mentor-interview: Mentor Interview sessions can be joined
  //   from 15 minutes before `joinTime`; the card uses this to surface
  //   the 'Join' button quickly around that moment.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);
  const isLoading = sessionsLoading || reviewsLoading;

  // Keep source data deterministic so default sort always yields newest-first consistently.
  // 2026-07-28: Mentor sessions store the Mentor.id (NOT User.id) under
  //   userId/userId2/mentorId. User.id != Mentor.id, so we resolve the
  //   mentor profile for the current auth user and match against both ids.
  const mentorSessions = useMemo(() => {
    const userId = user?.id;
    const mentorProfileId =
      currentMentorProfile?.id != null
        ? typeof currentMentorProfile.id === "string"
          ? parseInt(currentMentorProfile.id, 10)
          : currentMentorProfile.id
        : undefined;
    const all = [...allSessions];
    return all
      .filter((session: Session) => {
        const candidates = [userId, mentorProfileId].filter(
          (id): id is number => typeof id === "number" && Number.isFinite(id)
        );
        if (candidates.length === 0) return false;
        const sessionIds = [session.userId, session.userId2, session.mentorId]
          .filter((id): id is number => typeof id === "number")
          .map((id) => String(id));
        return candidates.some((id) => sessionIds.includes(String(id)));
      })
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }, [allSessions, user, currentMentorProfile]);

  // Get session IDs that already have mentor reviews
  const reviewBySessionId = useMemo(() => {
    const reviewMap = new Map<number, number>();
    reviews.forEach((review) => {
      if (typeof review.session?.id === "number" && typeof review.id === "number") {
        reviewMap.set(review.session.id, review.id);
      }
    });
    return reviewMap;
  }, [reviews]);
  const reviewSessionIds = useMemo(() => new Set(reviewBySessionId.keys()), [reviewBySessionId]);
  const draftSessions = useMemo(
    () => mentorSessions.filter((session) => session.status === "DRAFT"),
    [mentorSessions]
  );
  const otherSessions = useMemo(
    () => mentorSessions.filter((session) => session.status !== "DRAFT"),
    [mentorSessions]
  );
  const filteredDraftSessions = useMemo(
    () =>
      draftSessions.filter((session) => {
        if (!matchesSessionSearch(session, searchQuery)) {
          return false;
        }
        if (draftTimeFilter === "hasJoinTime") {
          return !!session.joinTime;
        }
        if (draftTimeFilter === "noJoinTime") {
          return !session.joinTime;
        }
        return true;
      }),
    [draftSessions, draftTimeFilter, searchQuery]
  );
  const filteredOtherSessions = useMemo(
    () =>
      otherSessions.filter((session) => {
        if (!matchesSessionSearch(session, searchQuery)) {
          return false;
        }
        if (otherStatusFilter !== "all") {
          return session.status === otherStatusFilter;
        }
        return true;
      }),
    [otherSessions, otherStatusFilter, searchQuery]
  );
  const sortableDraftSessions = useMemo<SortableSession[]>(
    () =>
      filteredDraftSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredDraftSessions]
  );
  const sortableOtherSessions = useMemo<SortableSession[]>(
    () =>
      filteredOtherSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredOtherSessions]
  );
  const activeSessions = activeTab === "draft" ? sortableDraftSessions : sortableOtherSessions;

  // Apply sorting
  const { sortedData, getSortProps } = useSortable(activeSessions);

  // Apply pagination
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_sessions_mentorsessionspage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });

  // Get current page data
  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);
  const handleJoinSession = (session: Session) => {
    if (session.roomUrl) {
      navigate(`/mentor/sessions/room/${session.id}`);
    }
  };
  const handleWriteReview = (session: Session) => {
    navigate(`/mentor/sessions/${session.id}/review`);
  };
  const handleViewDetails = (session: Session) => {
    if (typeof session.id === "number") {
      navigate(`/mentor/sessions/${session.id}`);
    }
  };
  const handleViewReview = (reviewId: number) => {
    navigate(`/mentor/reviews/${reviewId}`);
  };
  const handleEditReview = (sessionId: number) => {
    navigate(`/mentor/sessions/${sessionId}/review`);
  };
  const handleAcceptSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({
        sessionId: session.id,
        isApproved: true,
      });
    }
  };
  const handleRejectSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({
        sessionId: session.id,
        isApproved: false,
      });
    }
  };

  const scheduledCount = mentorSessions.filter(
    (s: Session) => s.status === "SCHEDULED" || s.status === "PAID" || s.status === "ONGOING"
  ).length;
  const completedCount = mentorSessions.filter((s: Session) => s.status === "COMPLETED").length;
  const waitingForReviewCount = mentorSessions.filter(
    (s: Session) =>
      s.status === "COMPLETED" && typeof s.id === "number" && !reviewSessionIds.has(s.id)
  ).length;
  return (
    <div className="flex flex-col gap-6">
      {/* Header — elevated gradient hero */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 p-5 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-sky-950/40">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-300/40 to-sky-300/40 blur-3xl dark:from-indigo-700/30 dark:to-sky-700/30" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30">
              <Video className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("mentorSessions.interviewSession")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorSessions.manageInterviewSessionsAndSend")}
              </p>
            </div>
          </div>
          <ReloadButton
            onReload={async () => {
              await Promise.all([refetchSessions(), refetchReviews()]);
            }}
            isLoading={sessionsRefetching || reviewsRefetching}
            tooltip={t("mentorSessions.reloadInterviewSessionList")}
          />
        </div>
      </div>

      {/* Stats — elevated with gradients + icon badges + hover lift */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/40 to-white p-4 transition-all hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 dark:border-indigo-900/40 dark:from-slate-950/40 dark:via-indigo-950/20 dark:to-slate-950/40 dark:hover:border-indigo-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.totalSession")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/30 transition-transform group-hover:scale-110">
              <Video className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {mentorSessions.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {completedCount} {t("general.completed").toLowerCase()}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-indigo-500/5 blur-2xl dark:bg-indigo-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/40 to-white p-4 transition-all hover:border-sky-200 hover:shadow-md hover:shadow-sky-500/5 dark:border-sky-900/40 dark:from-slate-950/40 dark:via-sky-950/20 dark:to-slate-950/40 dark:hover:border-sky-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.comingSoon")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/30 transition-transform group-hover:scale-110">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {scheduledCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("common.scheduled")}, {t("common.paid")}, {t("common.ongoing")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-sky-500/5 blur-2xl dark:bg-sky-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/40 to-white p-4 transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 dark:border-emerald-900/40 dark:from-slate-950/40 dark:via-emerald-950/20 dark:to-slate-950/40 dark:hover:border-emerald-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("general.completed")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30 transition-transform group-hover:scale-110">
              <Check className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {completedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorOverview.complete")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/5 blur-2xl dark:bg-emerald-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/40 to-white p-4 transition-all hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/5 dark:border-amber-900/40 dark:from-slate-950/40 dark:via-amber-950/20 dark:to-slate-950/40 dark:hover:border-amber-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.waitingForReview")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 transition-transform group-hover:scale-110">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {waitingForReviewCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("common.waitingForReview")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-amber-500/5 blur-2xl dark:bg-amber-500/10" />
        </div>
      </div>

      {/* Session List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : mentorSessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title={t("common.noInterviewSessionYet")}
          description={t("common.youHaveNotHadAnyInterviewSessions")}
        />
      ) : (
        <>
          {/* Filters — elevated card with subtle gradient */}
          <div className="space-y-4 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-xs dark:border-slate-800 dark:from-slate-950/40 dark:to-slate-900/30">
            <Tabs
              value={activeTab}
              onValueChange={(tab) => {
                setActiveTab(tab as SessionListTab);
                pagination.goToFirstPage();
              }}>
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="others">
                  {t("mentorSessions.remainingSessions")}
                  {otherSessions.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    pagination.goToFirstPage();
                  }}
                  placeholder={t("mentorSessions.searchBySessionIdStudent")}
                  className="border-slate-200 bg-white pl-9 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <Select
                value={otherStatusFilter}
                onValueChange={(value) => {
                  setOtherStatusFilter(value as OtherStatusFilter);
                  pagination.goToFirstPage();
                }}>
                <SelectTrigger className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <SelectValue placeholder={t("common.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                  <SelectItem value="SCHEDULED">{t("common.comingSoon")}</SelectItem>
                  <SelectItem value="PAID">{t("common.paid")}</SelectItem>
                  <SelectItem value="ONGOING">{t("common.ongoing")}</SelectItem>
                  <SelectItem value="COMPLETED">{t("general.completed")}</SelectItem>
                  <SelectItem value="REJECTED">{t("common.rejected")}</SelectItem>
                  <SelectItem value="CANCELED">{t("common.canceled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Filter className="h-3.5 w-3.5" />
                {t("common.sortBy")}
              </span>
              <SortButton {...getSortProps("id")}>{t("common.id")}</SortButton>
              <SortButton {...getSortProps("sessionSortValue")}>{t("common.time")}</SortButton>
              <SortButton {...getSortProps("status")}>{t("common.status")}</SortButton>
              {(searchQuery || draftTimeFilter !== "all" || otherStatusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setDraftTimeFilter("all");
                    setOtherStatusFilter("all");
                    pagination.goToFirstPage();
                  }}
                  className="ml-auto h-7 text-xs">
                  {t("common.clearFilter")}
                </Button>
              )}
            </div>
          </div>

          {sortedData.length === 0 ? (
            <EmptyState
              icon={Video}
              title={
                activeTab === "draft"
                  ? t("mentorSessions.thereAreNoSuitablePending")
                  : t("mentorSessions.thereIsNoProperInterview")
              }
              description={t("mentorSessions.tryChangingYourSearchKeywords")}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {pageData.map((session) => (
                  // Prefer opening existing review detail when available.
                  <SessionCard
                    key={session.id}
                    session={session}
                    hasReview={typeof session.id === "number" && reviewSessionIds.has(session.id)}
                    reviewId={
                      typeof session.id === "number" ? reviewBySessionId.get(session.id) : undefined
                    }
                    now={now}
                    onViewDetails={() => handleViewDetails(session)}
                    onJoinSession={() => handleJoinSession(session)}
                    onWriteReview={() => handleWriteReview(session)}
                    onViewReview={() => {
                      if (typeof session.id !== "number") return;
                      const reviewId = reviewBySessionId.get(session.id);
                      if (reviewId) {
                        handleViewReview(reviewId);
                      }
                    }}
                    onEditReview={() => {
                      if (typeof session.id === "number") {
                        handleEditReview(session.id);
                      }
                    }}
                    onAcceptSession={() => handleAcceptSession(session)}
                    onRejectSession={() => handleRejectSession(session)}
                    isUpdatingStatus={updateStatusMutation.isPending}
                  />
                ))}
              </div>

              {/* Pagination */}
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  pagination.goToFirstPage();
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
