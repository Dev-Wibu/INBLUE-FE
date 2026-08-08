/**
 * Mentor Sessions Page — "Interview Command Center" entry.
 * UI-only refresh: layout, bento stats, command-bar, session cards.
 * Logic (filters, sort, pagination, mutations, navigation) is preserved.
 */

import { PaginationControl } from "@/components/shared/PaginationControl";
import { ReloadButton } from "@/components/shared/ReloadButton";
import { SortButton } from "@/components/shared/SortButton";
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
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SessionCard, StatsPanel, buildMentorInterviewTiles } from "./components";
import { toTimestampSafe } from "./components/mentor-interview.constants";

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

export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<SessionListTab>("others");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftTimeFilter, setDraftTimeFilter] = useState<DraftTimeFilter>("all");
  const [otherStatusFilter, setOtherStatusFilter] = useState<OtherStatusFilter>("all");

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

  const { sortedData, getSortProps } = useSortable(activeSessions);

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

  const statsTiles = buildMentorInterviewTiles({
    total: mentorSessions.length,
    upcoming: scheduledCount,
    completed: completedCount,
    waitingForReview: waitingForReviewCount,
    t,
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Command Center header — compact, not a "dashboard hero". */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/95 via-indigo-500/90 to-sky-500/85 p-5 text-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.35)] ring-1 ring-white/10 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.18),transparent_45%)]"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
              <Video className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h1
                className="text-2xl font-bold tracking-[-0.02em] sm:text-[1.65rem]"
                style={{ textWrap: "balance" }}>
                {t("mentorSessions.interviewSession")}
              </h1>
              <p className="max-w-xl text-sm text-white/80">
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
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10"
          />
        </div>
      </div>

      {/* Bento stats: asymmetric, anchor tile + 3 supporting tiles. */}
      <StatsPanel tiles={statsTiles} />

      {/* Session list area */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
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
          {/* Command bar: tabs, search, status filter, sort. */}
          <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 sm:p-5 dark:bg-slate-900/60 dark:ring-white/5">
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
                <Search
                  className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
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

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-3 dark:border-slate-700/70">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Filter className="h-3.5 w-3.5" aria-hidden />
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
            <div className="rounded-2xl bg-white p-2 ring-1 ring-slate-200/70 dark:bg-slate-900/60 dark:ring-white/5">
              <EmptyState
                icon={Video}
                title={
                  activeTab === "draft"
                    ? t("mentorSessions.thereAreNoSuitablePending")
                    : t("mentorSessions.thereIsNoProperInterview")
                }
                description={t("mentorSessions.tryChangingYourSearchKeywords")}
              />
            </div>
          ) : (
            <>
              <motion.div
                key={`${activeTab}-${otherStatusFilter}-${searchQuery}`}
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
