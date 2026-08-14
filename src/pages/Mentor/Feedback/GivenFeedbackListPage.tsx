/**
 * Mentor Given Feedback List Page — Admin UI Pattern
 * Redesigned to match Admin table layout pattern
 */

import { ReloadButton, SortButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeAgo } from "@/components/ui/time-ago";
import { useMentorFeedbacksForCurrentUser, type MentorFeedback } from "@/hooks/useMentorFeedback";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { MentorQuickStat } from "@/pages/Mentor/Common";
import { Inbox, MessageSquare, Search, Star, TrendingUp, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type FeedbackRatingFilter = "all" | "low" | "medium" | "high";
type SortableFeedback = MentorFeedback & {
  idSortValue: number;
  newestSortValue: number;
  ratingSortValue: number;
  studentNameSortValue: string;
};

const toSessionTimestamp = (value?: string) => toTimestamp(value) ?? 0;

const getFeedbackNewestSortValue = (feedback: MentorFeedback) => {
  const endTime = toSessionTimestamp(feedback.session?.endTime1);
  if (endTime > 0) return endTime;
  const startTime = toSessionTimestamp(feedback.session?.startTime1);
  if (startTime > 0) return startTime;
  return typeof feedback.id === "number" ? feedback.id : 0;
};

// ---------- main ----------
export function GivenFeedbackListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<FeedbackRatingFilter>("all");

  const {
    data: feedbacks = [],
    isLoading,
    isRefetching,
    refetch,
  } = useMentorFeedbacksForCurrentUser();

  const totalFeedbacks = feedbacks.length;
  const starFeedbacks = feedbacks.filter(
    (f: { rating?: number }) => typeof f.rating === "number" && f.rating >= 1 && f.rating <= 5
  );
  const avgStarRating =
    starFeedbacks.length > 0
      ? (
          starFeedbacks.reduce((sum: number, f: { rating?: number }) => sum + (f.rating || 0), 0) /
          starFeedbacks.length
        ).toFixed(1)
      : "N/A";

  const uniqueStudents = new Set(
    feedbacks
      .map((feedback) => feedback.user?.id ?? feedback.session?.userId)
      .filter((id): id is number => typeof id === "number")
  );

  const fiveStarCount = feedbacks.filter((f: { rating?: number }) => f.rating === 5).length;

  const filteredFeedbacks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return feedbacks.filter((feedback) => {
      if (normalizedSearch) {
        const matchesSearch =
          feedback.user?.name?.toLowerCase().includes(normalizedSearch) ||
          feedback.user?.email?.toLowerCase().includes(normalizedSearch) ||
          feedback.comment?.toLowerCase().includes(normalizedSearch) ||
          feedback.session?.roomName?.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
      }
      const rating = feedback.rating || 0;
      if (ratingFilter === "low" && rating > 2) return false;
      if (ratingFilter === "medium" && (rating < 3 || rating > 4)) return false;
      if (ratingFilter === "high" && rating < 5) return false;
      return true;
    });
  }, [feedbacks, ratingFilter, searchQuery]);

  const sortableFeedbacks = useMemo<SortableFeedback[]>(
    () =>
      filteredFeedbacks.map((feedback) => ({
        ...feedback,
        idSortValue: typeof feedback.id === "number" ? feedback.id : 0,
        newestSortValue: getFeedbackNewestSortValue(feedback),
        ratingSortValue: feedback.rating || 0,
        studentNameSortValue: feedback.user?.name?.toLowerCase() || "",
      })),
    [filteredFeedbacks]
  );

  const { sortedData, getSortProps } = useSortable(sortableFeedbacks, {
    defaultSort: { key: "newestSortValue", direction: "desc" },
    noSortBehavior: "preserve",
    tieBreaker: { key: "idSortValue", direction: "desc" },
  });

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_feedback_givenfeedbacklistpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });

  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );

  const distribution = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    feedbacks.forEach((f: { rating?: number }) => {
      const r = f.rating;
      if (r && r >= 1 && r <= 5) counts[r as 1 | 2 | 3 | 4 | 5] += 1;
    });
    const total = feedbacks.length || 1;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star as 1 | 2 | 3 | 4 | 5],
      pct: (counts[star as 1 | 2 | 3 | 4 | 5] / total) * 100,
    }));
  }, [feedbacks]);

  const handleFilterSelect = (id: string) => {
    setRatingFilter(id as FeedbackRatingFilter);
    pagination.goToFirstPage();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setRatingFilter("all");
    pagination.goToFirstPage();
  };

  const isDirty = !!searchQuery || ratingFilter !== "all";

  return (
    <div className="flex flex-col bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
      {/* Header Card - Admin Pattern */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/15">
              <Inbox className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                {t("mentorFeedback.feedbackReceived")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorFeedback.feedbackFromStudentsSentTo")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Quick stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {totalFeedbacks}
                </span>
                <span className="text-xs text-slate-500">{t("common.totalResponse")}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {uniqueStudents.size}
                </span>
                <span className="text-xs text-slate-500">
                  {t("mentorFeedback.numberOfStudents")}
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {avgStarRating}
                </span>
                <span className="text-xs text-slate-500">/5</span>
              </div>
            </div>
            <ReloadButton
              onReload={async () => {
                await refetch();
              }}
              isLoading={isRefetching}
              tooltip={t("mentorFeedback.reloadSubmittedResponses")}
              className="h-9 w-9"
            />
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              placeholder={t("mentorFeedback.searchByNameEmailFeedback")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 text-sm focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleFilterSelect("all")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "all"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.allPoints")} ({feedbacks.length})
          </button>
          <button
            onClick={() => handleFilterSelect("high")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "high"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.fiveStars")} ({fiveStarCount})
          </button>
          <button
            onClick={() => handleFilterSelect("medium")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "medium"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.threeToFourStars")} (
            {
              feedbacks.filter((f) => {
                const rating = f.rating || 0;
                return rating >= 3 && rating <= 4;
              }).length
            }
            )
          </button>
          <button
            onClick={() => handleFilterSelect("low")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "low"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.oneToTwoStars")} (
            {
              feedbacks.filter((f) => {
                const rating = f.rating || 0;
                return rating >= 1 && rating <= 2;
              }).length
            }
            )
          </button>
          {isDirty && (
            <button
              onClick={handleClearFilters}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              <X className="mr-1 inline h-3 w-3" />
              {t("common.clearFilter")}
            </button>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        {/* Left - Table */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isLoading ? (
            <div className="flex-1 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="mt-2 h-12" />
              <Skeleton className="mt-2 h-12" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">{t("common.noResponseYet")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900">
                      <TableHead className="w-[80px] pl-5 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.id")}
                      </TableHead>
                      <TableHead className="min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("studentNameSortValue")}>
                          {t("common.student")}
                        </SortButton>
                      </TableHead>
                      <TableHead className="min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.session")}
                      </TableHead>
                      <TableHead className="w-[120px] min-w-[120px] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("ratingSortValue")}>
                          {t("common.rating")}
                        </SortButton>
                      </TableHead>
                      <TableHead className="w-[150px] min-w-[150px] px-5 font-semibold text-slate-700 dark:text-slate-200">
                        <SortButton {...getSortProps("newestSortValue")}>
                          {t("common.latest")}
                        </SortButton>
                      </TableHead>
                      <TableHead className="w-[100px] min-w-[100px] pr-5 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-48 text-center">
                          <p className="text-sm text-slate-500">{t("common.noResponseYet")}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageData.map((feedback) => {
                        const rating = feedback.rating || 0;
                        return (
                          <TableRow
                            key={feedback.id}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/80">
                            <TableCell className="py-3.5 pl-5">
                              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                                #{feedback.id}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <AvatarImage
                                    src={feedback.user?.avatarUrl}
                                    alt={feedback.user?.name}
                                  />
                                  <AvatarFallback className="rounded-lg bg-rose-100 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                                    {feedback.user?.name?.charAt(0) || "S"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {feedback.user?.name || `Feedback #${feedback.id}`}
                                  </p>
                                  {feedback.user?.email && (
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                      {feedback.user.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {feedback.session?.roomName || "—"}
                            </TableCell>
                            <TableCell className="px-5 py-3.5">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  <span
                                    className={cn(
                                      "text-sm font-bold",
                                      rating >= 4
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : rating >= 3
                                          ? "text-sky-600 dark:text-sky-400"
                                          : "text-amber-600 dark:text-amber-400"
                                    )}>
                                    {rating}
                                  </span>
                                </div>
                                <StarRating value={rating} readOnly size="sm" />
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {feedback.session?.endTime1 ? (
                                <TimeAgo
                                  date={String(treatZuluAsVietnamLocal(feedback.session.endTime1))}
                                  prefix={false}
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (feedback.id) navigate(`/mentor/feedback/${feedback.id}`);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100/90 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950/90">
                                {t("common.view")}
                              </button>
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

        {/* Right - Stats Panel */}
        <aside className="hidden lg:flex lg:w-[280px] lg:flex-col lg:gap-4 xl:sticky xl:top-4 xl:self-start">
          {/* Rating Distribution card */}
          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
                  {t("common.averageStarRating")}
                </p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-white">
                    {isLoading ? "—" : avgStarRating}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/5</span>
                </p>
              </div>
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              {distribution.map((row) => (
                <div key={row.star} className="flex items-center gap-2">
                  <span className="w-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {row.star}★
                  </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 to-pink-400"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3 quick stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <MentorQuickStat
              index={1}
              icon={MessageSquare}
              label={t("common.totalResponse")}
              value={isLoading ? "—" : totalFeedbacks}
              caption={t("mentorFeedback.feedbackStudentsSendToYou")}
              tone="indigo"
            />
            <MentorQuickStat
              index={2}
              icon={Users}
              label={t("mentorFeedback.numberOfStudents")}
              value={isLoading ? "—" : uniqueStudents.size}
              caption={t("mentorFeedback.numberOfStudents")}
              tone="sky"
            />
            <MentorQuickStat
              index={3}
              icon={TrendingUp}
              label={t("common.5StarRating")}
              value={isLoading ? "—" : fiveStarCount}
              caption={t("common.fiveStars")}
              tone="emerald"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
