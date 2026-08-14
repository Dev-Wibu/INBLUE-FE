/**
 * Mentor Sessions Page — Admin UI Pattern
 * Redesigned to match Admin table layout pattern
 */

import { ReloadButton, SortButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import { cn } from "@/lib/utils";
import { MentorQuickStat } from "@/pages/Mentor/Common";
import { useAuthStore } from "@/stores/authStore";
import { Calendar, Check, Search, Star, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type SortableSession = Session & {
  sessionSortValue: number;
};

type SessionStatus = "all" | "SCHEDULED" | "PAID" | "ONGOING" | "COMPLETED" | "DRAFT";

const getSessionSortValue = (session: Session): number => {
  const joinTime = session.joinTime ? new Date(session.joinTime).getTime() : 0;
  if (joinTime > 0) return joinTime;
  const startTime = session.startTime1 ? new Date(session.startTime1).getTime() : 0;
  if (startTime > 0) return startTime;
  return typeof session.id === "number" ? session.id : 0;
};

const matchesSessionSearch = (session: Session, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return !!(
    session.id?.toString().includes(normalizedQuery) ||
    session.userId?.toString().includes(normalizedQuery) ||
    session.roomName?.toLowerCase().includes(normalizedQuery) ||
    session.roomUrl?.toLowerCase().includes(normalizedQuery)
  );
};

function getStatusBadgeClass(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case "SCHEDULED":
      return {
        bg: "bg-sky-100 dark:bg-sky-500/20",
        text: "text-sky-700 dark:text-sky-300",
        dot: "bg-sky-500",
      };
    case "PAID":
      return {
        bg: "bg-purple-100 dark:bg-purple-500/20",
        text: "text-purple-700 dark:text-purple-300",
        dot: "bg-purple-500",
      };
    case "ONGOING":
      return {
        bg: "bg-amber-100 dark:bg-amber-500/20",
        text: "text-amber-700 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    case "COMPLETED":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-500/20",
        text: "text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
      };
    case "REJECTED":
    case "CANCELED":
      return {
        bg: "bg-slate-100 dark:bg-slate-500/20",
        text: "text-slate-700 dark:text-slate-300",
        dot: "bg-slate-500",
      };
    default:
      return {
        bg: "bg-slate-100 dark:bg-slate-500/20",
        text: "text-slate-700 dark:text-slate-300",
        dot: "bg-slate-500",
      };
  }
}

export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus>("all");

  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    isRefetching: sessionsRefetching,
    refetch: refetchSessions,
  } = useSessions();
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useMentorReviews();
  const updateStatusMutation = useUpdateSessionStatus();
  const { data: currentMentorProfile } = useCurrentMentorProfile();

  const isLoading = sessionsLoading || reviewsLoading;

  const mentorSessions = useMemo(() => {
    const userId = user?.id;
    const mentorProfileId =
      currentMentorProfile?.id != null
        ? typeof currentMentorProfile.id === "string"
          ? parseInt(currentMentorProfile.id, 10)
          : currentMentorProfile.id
        : undefined;
    const candidates = [userId, mentorProfileId].filter(
      (id): id is number => typeof id === "number" && Number.isFinite(id)
    );
    if (candidates.length === 0) return [];
    return [...allSessions]
      .filter((session) => {
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

  const filteredSessions = useMemo(() => {
    return mentorSessions.filter((session) => {
      if (!matchesSessionSearch(session, searchQuery)) return false;
      if (statusFilter !== "all" && session.status !== statusFilter) return false;
      return true;
    });
  }, [mentorSessions, searchQuery, statusFilter]);

  const sortableSessions = useMemo<SortableSession[]>(
    () =>
      filteredSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredSessions]
  );

  const { sortedData, getSortProps } = useSortable(sortableSessions);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_sessions_mentorsessionspage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });

  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);

  const scheduledCount = mentorSessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "PAID" || s.status === "ONGOING"
  ).length;
  const completedCount = mentorSessions.filter((s) => s.status === "COMPLETED").length;

  const handleAcceptSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({ sessionId: session.id, isApproved: true });
    }
  };
  const handleRejectSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({ sessionId: session.id, isApproved: false });
    }
  };

  // ---------- render ----------
  return (
    <div className="flex flex-col bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
      {/* Header Card - Admin Pattern */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/15">
              <Video className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                {t("mentorSessions.interviewSessions")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {currentMentorProfile?.name ?? user?.name ?? ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Quick stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {scheduledCount}
                </span>
                <span className="text-xs text-slate-500">{t("common.comingSoon")}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {completedCount}
                </span>
                <span className="text-xs text-slate-500">{t("general.completed")}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {mentorSessions.length}
                </span>
                <span className="text-xs text-slate-500">{t("common.totalSession")}</span>
              </div>
            </div>
            <ReloadButton
              onReload={async () => {
                await Promise.all([refetchSessions(), refetchReviews()]);
              }}
              isLoading={sessionsRefetching}
              tooltip={t("mentorSessions.reloadInterviewSessionList")}
              className="h-9 w-9"
            />
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("mentorSessions.searchByRoomNameOrId")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pr-4 pl-11 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            ["all", t("common.allStatus"), mentorSessions.length],
            [
              "SCHEDULED",
              t("common.comingSoon"),
              mentorSessions.filter((s) => s.status === "SCHEDULED").length,
            ],
            ["PAID", t("common.paid"), mentorSessions.filter((s) => s.status === "PAID").length],
            [
              "ONGOING",
              t("common.ongoing"),
              mentorSessions.filter((s) => s.status === "ONGOING").length,
            ],
            ["COMPLETED", t("general.completed"), completedCount],
          ].map(([value, label, count]) => (
            <button
              key={value}
              onClick={() => {
                setStatusFilter(value as SessionStatus);
                pagination.goToFirstPage();
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                statusFilter === value
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              )}>
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        {/* Left - Table */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-12" />
              <Skeleton className="mt-2 h-12" />
              <Skeleton className="mt-2 h-12" />
            </div>
          ) : mentorSessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Video className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">
                {t("common.noInterviewSessionYet")}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900">
                      <TableHead className="w-[80px] pl-5 font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("id")}>{t("common.id")}</SortButton>
                      </TableHead>
                      <TableHead className="min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.roomName")}
                      </TableHead>
                      <TableHead className="w-[120px] min-w-[120px] px-5 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.status")}
                      </TableHead>
                      <TableHead className="w-[150px] min-w-[150px] px-5 font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("sessionSortValue")}>
                          {t("common.time")}
                        </SortButton>
                      </TableHead>
                      <TableHead className="w-[100px] min-w-[100px] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.review")}
                      </TableHead>
                      <TableHead className="w-[200px] min-w-[200px] pr-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Search className="h-6 w-6 text-slate-400" />
                            <p className="text-sm text-slate-500">
                              {t("mentorSessions.thereIsNoProperInterview")}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageData.map((session) => {
                        const statusBadge = getStatusBadgeClass(session.status || "");
                        const hasReview =
                          typeof session.id === "number" && reviewBySessionId.has(session.id);
                        return (
                          <TableRow
                            key={session.id}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/80">
                            <TableCell className="py-3.5 pl-5">
                              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                                #{session.id}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {session.roomName || `Session ${session.id}`}
                              </p>
                              {session.roomUrl && (
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {session.roomUrl}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                                  statusBadge.bg,
                                  statusBadge.text
                                )}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", statusBadge.dot)} />
                                {session.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {session.startTime1 ? (
                                <div className="flex flex-col">
                                  <span>{new Date(session.startTime1).toLocaleDateString()}</span>
                                  <span className="text-xs text-slate-400">
                                    {new Date(session.startTime1).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              ) : session.status === "DRAFT" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {t("common.draft")}
                                </span>
                              ) : session.status === "REJECTED" || session.status === "CANCELED" ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                                  {t("common.canceled")}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-center">
                              {hasReview ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                  <Check className="h-3 w-3" />
                                  {t("common.done")}
                                </span>
                              ) : session.status === "COMPLETED" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                  {t("common.pending")}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (typeof session.id === "number") {
                                      navigate(`/mentor/sessions/${session.id}`);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                  {t("common.view")}
                                </button>
                                {session.status === "DRAFT" && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcceptSession(session);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-all hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                      {t("common.accept")}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRejectSession(session);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300">
                                      {t("common.reject")}
                                    </button>
                                  </>
                                )}
                                {!hasReview && session.status === "COMPLETED" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (typeof session.id === "number") {
                                        navigate(`/mentor/sessions/${session.id}/review`);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-all hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    {t("common.writeReview")}
                                  </button>
                                )}
                                {hasReview && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (typeof session.id === "number") {
                                        navigate(`/mentor/sessions/${session.id}/review`);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                    {t("common.editReview")}
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {sortedData.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3 dark:border-t-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("common.showing", {
                      start: pagination.startIndex + 1,
                      end: Math.min(pagination.endIndex + 1, sortedData.length),
                      total: sortedData.length,
                    })}
                  </p>
                  <PaginationControl
                    pagination={pagination}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      pagination.goToFirstPage();
                    }}
                    pageSizeOptions={[5, 10, 20, 50]}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Right side cards - Stats */}
        <aside className="hidden lg:flex lg:flex-col lg:gap-4 xl:sticky xl:top-4 xl:self-start">
          {/* Total sessions card */}
          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                  {t("mentorOverview.totalSessions")}
                </p>
                <p className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                    {mentorSessions.length}
                  </span>
                  <span className="text-sm text-slate-500">sessions</span>
                </p>
              </div>
            </div>
          </div>

          {/* 3 quick stats grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <MentorQuickStat
              index={1}
              icon={Calendar}
              label={t("common.comingSoon")}
              value={scheduledCount}
              tone="indigo"
            />
            <MentorQuickStat
              index={2}
              icon={Check}
              label={t("general.completed")}
              value={completedCount}
              tone="emerald"
            />
            <MentorQuickStat
              index={3}
              icon={Star}
              label={t("common.totalReview")}
              value={reviews.length}
              tone="amber"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
