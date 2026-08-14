/**
 * Mentor Reviews List Page — Admin UI Pattern
 * Redesigned to match Admin table layout pattern
 */

import { ReloadButton } from "@/components/shared";
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
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews, type MentorReview } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { MentorQuickStat } from "@/pages/Mentor/Common";
import type { LucideIcon } from "lucide-react";
import { Search, Star, Trophy, Users, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type SortableReview = MentorReview & {
  newestSortValue: number;
};

const toSessionTimestamp = (value?: string) => {
  return toTimestamp(value) ?? 0;
};

const getReviewNewestSortValue = (review: MentorReview) => {
  const endTime = toSessionTimestamp(review.session?.endTime1);
  if (endTime > 0) return endTime;
  const startTime = toSessionTimestamp(review.session?.startTime1);
  if (startTime > 0) return startTime;
  return typeof review.id === "number" ? review.id : 0;
};

// ---------- main ----------
export function MentorReviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: mentorProfile } = useCurrentMentorProfile();
  const mentorId =
    typeof mentorProfile?.id === "string" ? parseInt(mentorProfile.id, 10) : mentorProfile?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const { data: allReviews = [], isLoading, isRefetching, refetch } = useMentorReviews();

  // Filter by mentor ID using session.userId2
  const reviews = useMemo(() => {
    if (!mentorId) return [];
    return allReviews.filter((review) => review.session?.userId2 === mentorId);
  }, [allReviews, mentorId]);

  const filteredReviews = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return reviews.filter((review) => {
      if (normalizedSearch) {
        const matchesSearch =
          review.user?.name?.toLowerCase().includes(normalizedSearch) ||
          review.user?.email?.toLowerCase().includes(normalizedSearch) ||
          review.session?.roomName?.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) return false;
      }
      const rating = review.rating || 0;
      if (ratingFilter === "high" && rating < 5) return false;
      if (ratingFilter === "medium" && (rating < 3 || rating > 4)) return false;
      if (ratingFilter === "low" && rating > 2) return false;
      return true;
    });
  }, [ratingFilter, reviews, searchQuery]);

  const sortableReviews = useMemo<SortableReview[]>(
    () =>
      filteredReviews.map((review) => ({
        ...review,
        newestSortValue: getReviewNewestSortValue(review),
      })),
    [filteredReviews]
  );

  const { sortedData } = useSortable(sortableReviews, {
    defaultSort: { key: "newestSortValue", direction: "desc" },
    noSortBehavior: "preserve",
    tieBreaker: { key: "newestSortValue", direction: "desc" },
  });

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_reviews_mentorreviewspage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });

  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );

  // Distribution chart
  const distribution = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r: { rating?: number }) => {
      const rating = r.rating;
      if (rating && rating >= 1 && rating <= 5) {
        counts[rating as 1 | 2 | 3 | 4 | 5] += 1;
      }
    });
    const total = reviews.length || 1;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star as 1 | 2 | 3 | 4 | 5],
      pct: (counts[star as 1 | 2 | 3 | 4 | 5] / total) * 100,
    }));
  }, [reviews]);

  const avgStarRating = useMemo(() => {
    const valid = reviews.filter(
      (r: { rating?: number }) => typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5
    );
    if (valid.length === 0) return "N/A";
    const total = valid.reduce((sum, r) => sum + (r.rating || 0), 0);
    return (total / valid.length).toFixed(1);
  }, [reviews]);

  const fiveStarCount = reviews.filter((r: { rating?: number }) => r.rating === 5).length;
  const uniqueStudents = new Set(
    reviews.map((review) => review.user?.id).filter((id): id is number => typeof id === "number")
  );

  // ---------- render ----------
  return (
    <div className="flex flex-col bg-slate-50 p-4 md:p-6 lg:p-8 dark:bg-slate-950">
      {/* Header Card - Admin Pattern */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/15">
              <Trophy className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                {t("mentorReviews.reviewsSent")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorReviews.reviewsYouHaveWritten")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Quick stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {avgStarRating}
                </span>
                <span className="text-xs text-slate-500">/5</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {uniqueStudents.size}
                </span>
                <span className="text-xs text-slate-500">{t("common.student")}</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {reviews.length}
                </span>
                <span className="text-xs text-slate-500">{t("common.review")}</span>
              </div>
            </div>
            <ReloadButton
              onReload={async () => {
                await refetch();
              }}
              isLoading={isRefetching}
              tooltip={t("mentorReviews.reloadReviewList")}
              className="h-9 w-9"
            />
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              placeholder={t("mentorReviews.searchByStudentNameOrSession")}
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
            onClick={() => setRatingFilter("all")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "all"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.allPoints")} ({reviews.length})
          </button>
          <button
            onClick={() => setRatingFilter("high")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "high"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.fiveStars")} ({fiveStarCount})
          </button>
          <button
            onClick={() => setRatingFilter("medium")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "medium"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.threeToFourStars")} (
            {
              reviews.filter((r) => {
                const rating = r.rating || 0;
                return rating >= 3 && rating <= 4;
              }).length
            }
            )
          </button>
          <button
            onClick={() => setRatingFilter("low")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              ratingFilter === "low"
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}>
            {t("common.oneToTwoStars")} (
            {
              reviews.filter((r) => {
                const rating = r.rating || 0;
                return rating >= 1 && rating <= 2;
              }).length
            }
            )
          </button>
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
          ) : reviews.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">{t("common.noReviewsFound")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900">
                      <TableHead className="min-w-[200px] pl-5 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.student")}
                      </TableHead>
                      <TableHead className="min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.session")}
                      </TableHead>
                      <TableHead className="w-[140px] min-w-[140px] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.rating")}
                      </TableHead>
                      <TableHead className="w-[180px] min-w-[180px] px-5 font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.latest")}
                      </TableHead>
                      <TableHead className="w-[100px] min-w-[100px] pr-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-48 text-center">
                          <p className="text-sm text-slate-500">{t("common.noReviewsFound")}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageData.map((review) => {
                        const rating = review.rating || 0;
                        return (
                          <TableRow
                            key={review.id}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/80">
                            <TableCell className="py-3.5 pl-5">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <AvatarImage
                                    src={review.user?.avatarUrl}
                                    alt={review.user?.name}
                                  />
                                  <AvatarFallback className="rounded-lg bg-sky-100 text-xs font-semibold text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                                    {review.user?.name?.charAt(0) || "S"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {review.user?.name || t("common.student")}
                                  </p>
                                  {review.user?.email && (
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                      {review.user.email}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {review.session?.roomName || "—"}
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
                                    {rating.toFixed(1)}
                                  </span>
                                </div>
                                <StarRating value={rating} readOnly size="sm" />
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                              {review.session?.endTime1 ? (
                                <TimeAgo
                                  date={String(treatZuluAsVietnamLocal(review.session.endTime1))}
                                  prefix={false}
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (review.id) navigate(`/mentor/reviews/${review.id}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100/90 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950/90">
                                  {t("common.view")}
                                </button>
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
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
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

          {/* 2 quick stats */}
          <div className="grid grid-cols-2 gap-2.5">
            <MentorQuickStat
              index={1}
              icon={Star as LucideIcon}
              label={t("common.totalRating")}
              value={isLoading ? "—" : reviews.length}
              caption={t("mentorReviews.reviewsYouVeSentTo")}
              tone="indigo"
            />
            <MentorQuickStat
              index={2}
              icon={Trophy as LucideIcon}
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
