/**
 * Mentor Sessions Page — "Interview Command Deck" v2.
 * UI-only refresh: compact dark hero, status track with live filter pills,
 * command-bar, and personality-rich session cards. Logic (filters, sort,
 * pagination, mutations, navigation) is preserved.
 */

import { PaginationControl } from "@/components/shared/PaginationControl";
import { SortButton } from "@/components/shared/SortButton";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Check, Clock4, MessageSquare, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  CommandBar,
  type CommandBarStatus,
  HeroCommand,
  SessionCard,
  StatusTrack,
  type StatusTrackItem,
} from "./components";
import { toTimestampSafe } from "./components/mentor-interview.constants";

type SortableSession = Session & {
  sessionSortValue: number;
};

const getSessionSortValue = (session: Session): number => {
  const joinTimeSort = toTimestampSafe(session.joinTime);
  if (typeof joinTimeSort === "number") {
    return joinTimeSort;
  }
  const startTimeSort = toTimestampSafe(session.startTime1);
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

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05, ease: "easeOut" as const },
  },
};

const cardMotion = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
};

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

export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [otherStatusFilter, setOtherStatusFilter] = useState<CommandBarStatus>("all");

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
  const { data: currentMentorProfile } = useCurrentMentorProfile();

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);
  const isLoading = sessionsLoading || reviewsLoading;

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

  const filteredOtherSessions = useMemo(() => {
    return otherSessions.filter((session) => {
      if (!matchesSessionSearch(session, searchQuery)) {
        return false;
      }
      // Status-track filter takes precedence for "waiting" because it has its own semantic.
      if (trackFilter === "waiting") {
        return (
          session.status === "COMPLETED" &&
          typeof session.id === "number" &&
          !reviewSessionIds.has(session.id)
        );
      }
      if (otherStatusFilter !== "all") {
        return session.status === otherStatusFilter;
      }
      return true;
    });
  }, [otherSessions, searchQuery, otherStatusFilter, trackFilter, reviewSessionIds]);

  const sortableOtherSessions = useMemo<SortableSession[]>(
    () =>
      filteredOtherSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredOtherSessions]
  );

  const { sortedData, getSortProps } = useSortable(sortableOtherSessions);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_sessions_mentorsessionspage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });

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

  // Up Next spotlight — nearest SCHEDULED/PAID/ONGOING session.
  const upcomingSessions = useMemo(() => {
    return mentorSessions
      .filter((s: Session) => ["SCHEDULED", "PAID", "ONGOING"].includes(s.status ?? ""))
      .filter((s: Session) => typeof toTimestampSafe(s.joinTime) === "number")
      .sort(
        (a: Session, b: Session) =>
          (toTimestampSafe(a.joinTime) ?? 0) - (toTimestampSafe(b.joinTime) ?? 0)
      );
  }, [mentorSessions]);
  const nextSession = upcomingSessions[0] ?? null;
  const nextMs = nextSession ? toTimestampSafe(nextSession.joinTime) : null;
  const upNextPayload =
    nextSession && nextMs
      ? {
          title: nextSession.roomName || t("common.sessionVar0", { var_0: nextSession.id }),
          whenLabel: nextSession.joinTime ? new Date(nextSession.joinTime).toLocaleString() : "",
          countdownLabel: nextMs > now ? formatCountdown(nextMs - now) : t("common.ongoing"),
          studentLabel: `${t("common.student")} ${nextSession.userId ?? ""}`.trim(),
        }
      : null;

  // Status track items — 4 pills with counts and active state. Click to filter.
  const statusItems: StatusTrackItem[] = useMemo(
    () => [
      {
        id: "all",
        label: t("common.allStatus"),
        count: otherSessions.length,
        icon: Video,
        tone: "indigo",
        active: trackFilter === "all",
      },
      {
        id: "upcoming",
        label: t("common.comingSoon"),
        count: scheduledCount,
        icon: Calendar,
        tone: "sky",
        pulse: true,
        active: trackFilter === "upcoming",
      },
      {
        id: "completed",
        label: t("general.completed"),
        count: completedCount,
        icon: Check,
        tone: "emerald",
        active: trackFilter === "completed",
      },
      {
        id: "waiting",
        label: t("common.waitingForReview"),
        count: waitingForReviewCount,
        icon: MessageSquare,
        tone: "amber",
        active: trackFilter === "waiting",
      },
    ],
    [t, otherSessions.length, scheduledCount, completedCount, waitingForReviewCount, trackFilter]
  );

  const statusOptions = useMemo(
    () => [
      {
        value: "all" as CommandBarStatus,
        label: t("common.allStatus"),
        count: otherSessions.length,
      },
      {
        value: "SCHEDULED" as CommandBarStatus,
        label: t("common.comingSoon"),
        count: scheduledCount,
      },
      { value: "PAID" as CommandBarStatus, label: t("common.paid") },
      { value: "ONGOING" as CommandBarStatus, label: t("common.ongoing") },
      {
        value: "COMPLETED" as CommandBarStatus,
        label: t("general.completed"),
        count: completedCount,
      },
    ],
    [t, otherSessions.length, scheduledCount, completedCount]
  );

  const handleTrackSelect = (id: string) => {
    setTrackFilter(id);
    if (id !== "all") {
      // Reset granular status filter when switching to a track filter,
      // because "waiting" has its own semantic that's status-track scoped.
      setOtherStatusFilter("all");
    }
    pagination.goToFirstPage();
  };

  return (
    <div className="flex min-h-full flex-col gap-5">
      {/* Command Deck hero — compact, dense, dark. No oversized gradient. */}
      <HeroCommand
        mentorName={currentMentorProfile?.name ?? user?.name ?? undefined}
        onReload={async () => {
          await Promise.all([refetchSessions(), refetchReviews()]);
        }}
        isReloading={sessionsRefetching || reviewsRefetching}
        reloadTooltip={t("mentorSessions.reloadInterviewSessionList")}
        totalSessions={mentorSessions.length}
        upNext={upNextPayload}
      />

      {/* Status track — 4 clickable filter pills with live counts */}
      <StatusTrack items={statusItems} onSelect={handleTrackSelect} />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : mentorSessions.length === 0 ? (
        <div className="rounded-2xl bg-white p-2 ring-1 ring-slate-200/70 dark:bg-slate-900/60 dark:ring-white/5">
          <EmptyState
            icon={Video}
            title={t("common.noInterviewSessionYet")}
            description={t("common.youHaveNotHadAnyInterviewSessions")}
          />
        </div>
      ) : (
        <>
          {/* Pending (draft) sessions — quiet, small block, never the main act */}
          {draftSessions.length > 0 && (
            <section
              aria-label={t("common.waitingForApproval")}
              className="rounded-2xl bg-white/60 p-3 ring-1 ring-amber-500/20 ring-inset dark:bg-amber-500/[0.04] dark:ring-amber-500/20">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Clock4 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                  <h2 className="text-xs font-semibold tracking-[0.06em] text-amber-700 uppercase dark:text-amber-300">
                    {t("common.waitingForApproval")} · {draftSessions.length}
                  </h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {draftSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    hasReview={false}
                    now={now}
                    isUpdatingStatus={updateStatusMutation.isPending}
                    actions={{
                      onViewDetails: () => handleViewDetails(session),
                      onJoinSession: () => handleJoinSession(session),
                      onWriteReview: () => handleWriteReview(session),
                      onViewReview: () => undefined,
                      onEditReview: () => undefined,
                      onAcceptSession: () => handleAcceptSession(session),
                      onRejectSession: () => handleRejectSession(session),
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Command bar — single sticky strip. Skipped when track is "waiting" (no granular filter needed). */}
          {trackFilter !== "waiting" && (
            <CommandBar
              searchValue={searchQuery}
              onSearchChange={(value) => {
                setSearchQuery(value);
                pagination.goToFirstPage();
              }}
              status={otherStatusFilter}
              onStatusChange={(value) => {
                setOtherStatusFilter(value);
                pagination.goToFirstPage();
              }}
              statusOptions={statusOptions}
              sortSlot={
                <>
                  <SortButton {...getSortProps("id")}>{t("common.id")}</SortButton>
                  <SortButton {...getSortProps("sessionSortValue")}>{t("common.time")}</SortButton>
                  <SortButton {...getSortProps("status")}>{t("common.status")}</SortButton>
                </>
              }
              onClear={() => {
                setSearchQuery("");
                setOtherStatusFilter("all");
                pagination.goToFirstPage();
              }}
            />
          )}

          {sortedData.length === 0 ? (
            <div className="rounded-2xl bg-white p-2 ring-1 ring-slate-200/70 dark:bg-slate-900/60 dark:ring-white/5">
              <EmptyState
                icon={Video}
                title={
                  trackFilter === "waiting"
                    ? t("common.noInterviewSessionYet")
                    : t("mentorSessions.thereIsNoProperInterview")
                }
                description={t("mentorSessions.tryChangingYourSearchKeywords")}
              />
            </div>
          ) : (
            <>
              <motion.div
                key={`${trackFilter}-${otherStatusFilter}-${searchQuery}`}
                variants={listMotion}
                initial="hidden"
                animate="show"
                className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3")}>
                <AnimatePresence initial={false}>
                  {pageData.map((session) => (
                    <motion.div
                      key={session.id}
                      variants={cardMotion}
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
                      layout="position">
                      <SessionCard
                        session={session}
                        hasReview={
                          typeof session.id === "number" && reviewSessionIds.has(session.id)
                        }
                        now={now}
                        isUpdatingStatus={updateStatusMutation.isPending}
                        actions={{
                          onViewDetails: () => handleViewDetails(session),
                          onJoinSession: () => handleJoinSession(session),
                          onWriteReview: () => handleWriteReview(session),
                          onViewReview: () => {
                            if (typeof session.id !== "number") return;
                            const reviewId = reviewBySessionId.get(session.id);
                            if (reviewId) {
                              handleViewReview(reviewId);
                            }
                          },
                          onEditReview: () => {
                            if (typeof session.id === "number") {
                              handleEditReview(session.id);
                            }
                          },
                          onAcceptSession: () => handleAcceptSession(session),
                          onRejectSession: () => handleRejectSession(session),
                        }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <PaginationControl
                  pagination={pagination}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    pagination.goToFirstPage();
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
