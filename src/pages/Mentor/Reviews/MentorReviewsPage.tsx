/**
 * Mentor Reviews List Page — Admin UI Pattern Sync
 * Matches Admin Review Management page design patterns
 */

import { ReloadButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { SortButton } from "@/components/shared/SortButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews, type MentorReview } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import {
  MentorEmptyState,
  MentorListRow,
  MentorQuickStat,
  MentorSortCluster,
} from "@/pages/Mentor/Common";
import { motion } from "framer-motion";
import { Search, Star, Trophy, type LucideIcon } from "lucide-react";
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

const rowMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
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

  // Filter by mentor ID using session.userId2 (since API returns mentor=null)
  // Based on API response pattern: session.userId2 = mentor's user ID
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

  const { sortedData, getSortProps } = useSortable(sortableReviews, {
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

  // Distribution chart (count per 1..5 stars) — used in side panel.
  const distribution = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
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

  // ---------- render ----------
  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
        {/* Stat Summary & Control Card - Admin Pattern */}
        <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("mentorMentordashboard.reviewSent")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t("mentorReviews.viewTheAssessmentsYouSent")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              {[
                [reviews.length, t("common.totalRating")],
                [avgStarRating, t("common.averageStarRating")],
                [fiveStarCount, t("common.fiveStars")],
              ].map(([value, label], index) => (
                <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                  {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                  <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                    <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                      {value}
                    </span>
                    <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search row - Admin Pattern */}
          <form
            onSubmit={(event) => event.preventDefault()}
            className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder={t("mentorReviews.searchByStudentEmailInterview")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  pagination.goToFirstPage();
                }}
                className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
              />
            </div>
            <ReloadButton
              onReload={async () => {
                await refetch();
              }}
              isLoading={isRefetching}
              tooltip={t("common.reloadReviewList")}
              className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          </form>

          {/* Rating filter pills - Admin Pattern */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {t("common.evaluate", "Đánh giá")}:
            </span>
            {[
              ["all", t("common.allStatus", "Tất cả")],
              ["high", t("common.fiveStars", "5 sao")],
              ["medium", t("common.threeToFourStars", "3-4 sao")],
              ["low", t("common.oneToTwoStars", "1-2 sao")],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRatingFilter(value as "all" | "high" | "medium" | "low");
                  pagination.goToFirstPage();
                }}
                className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                  ratingFilter === value
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content - Table Layout like Admin */}
        <div className="flex flex-1 flex-col gap-5 xl:flex-row xl:gap-6">
          {/* LEFT - Table */}
          <div className="relative z-10 flex flex-1 flex-col gap-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : reviews.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                <MentorEmptyState
                  icon={Star}
                  title={t("common.thereAreNoReviewsYet")}
                  description={t("mentorReviews.youHaveNotSentAny")}
                  tone="emerald"
                />
              </div>
            ) : (
              <>
                {/* Sort cluster */}
                {sortedData.length > 0 && (
                  <MentorSortCluster>
                    <SortButton {...getSortProps("rating")}>{t("common.evaluate")}</SortButton>
                    <SortButton {...getSortProps("newestSortValue")}>
                      {t("common.latest")}
                    </SortButton>
                  </MentorSortCluster>
                )}

                {/* Table Card */}
                {pageData.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                    <MentorEmptyState
                      icon={Search}
                      title={t("common.thereAreNoReviewsYet")}
                      description={t("mentorReviews.youHaveNotSentAny")}
                      tone="emerald"
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-col gap-2 p-4">
                      {pageData.map((review) => {
                        const rating = review.rating || 0;
                        return (
                          <motion.div key={review.id} variants={rowMotion}>
                            <MentorListRow
                              tone={
                                rating === 5
                                  ? "emerald"
                                  : rating >= 3
                                    ? "sky"
                                    : rating >= 1
                                      ? "amber"
                                      : "indigo"
                              }
                              onClick={() => {
                                if (review.id) navigate(`/mentor/reviews/${review.id}`);
                              }}
                              ariaLabel={review.user?.name || `Review #${review.id ?? ""}`}
                              actionSlot={<ReviewRowTrailing review={review} t={t} />}>
                              <Avatar className="h-10 w-10 shrink-0 ring-1 ring-white/10">
                                <AvatarImage src={review.user?.avatarUrl} alt={review.user?.name} />
                                <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                  {review.user?.name?.charAt(0) || "S"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {review.user?.name || `Review #${review.id}`}
                                  </p>
                                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                    #{review.id}
                                  </span>
                                </div>
                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="truncate">
                                    {review.session?.roomName || "—"}
                                  </span>
                                  {review.session?.endTime1 && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600">·</span>
                                      <TimeAgo
                                        date={String(
                                          treatZuluAsVietnamLocal(review.session.endTime1)
                                        )}
                                        prefix={false}
                                      />
                                    </>
                                  )}
                                </p>
                              </div>
                            </MentorListRow>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {sortedData.length > 0 && (
                      <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 dark:border-t-slate-800 dark:bg-slate-900">
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
                  </div>
                )}
              </>
            )}
          </div>

          {/* RIGHT - Side stats panel */}
          <SidePanel
            isLoading={isLoading}
            avgStarRating={avgStarRating}
            distribution={distribution}
            totalReviews={reviews.length}
            fiveStarCount={fiveStarCount}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- side panel ----------
function SidePanel({
  isLoading,
  avgStarRating,
  distribution,
  totalReviews,
  fiveStarCount,
  t,
}: {
  isLoading: boolean;
  avgStarRating: string;
  distribution: Array<{ star: number; count: number; pct: number }>;
  totalReviews: number;
  fiveStarCount: number;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  return (
    <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
      {/* Distribution card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className={
          "relative overflow-hidden rounded-2xl p-5 ring-1 ring-inset " +
          "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm " +
          "dark:bg-white/[0.03] dark:ring-white/5"
        }>
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-emerald-400/15 opacity-60 blur-3xl dark:bg-emerald-500/20"
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium tracking-widest text-indigo-500 uppercase dark:text-indigo-400">
                {t("common.averageStarRating")}
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                  {isLoading ? "—" : avgStarRating}
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/5</span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {distribution.map((row) => (
              <div key={row.star} className="flex items-center gap-2">
                <span className="w-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {row.star}★
                </span>
                <div
                  className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60"
                  role="progressbar"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(row.count / maxCount) * 100}%` }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  />
                </div>
                <span className="w-7 text-right text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 2 quick stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <MentorQuickStat
          index={1}
          icon={Star as LucideIcon}
          label={t("common.totalRating")}
          value={isLoading ? "—" : totalReviews}
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
  );
}

// ---------- per-row trailing slot ----------
function ReviewRowTrailing({
  review,
  t,
}: {
  review: MentorReview;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const rating = review.rating || 0;
  return (
    <div className="hidden items-center gap-4 sm:flex">
      <div className="text-center">
        <p className="text-[10px] font-semibold tracking-[0.06em] text-slate-500 uppercase dark:text-slate-400">
          {t("common.evaluate")}
        </p>
        <p className="text-base font-bold tracking-[-0.02em] text-slate-900 dark:text-slate-100">
          {rating}
          <span className="ml-0.5 text-[10px] font-medium text-slate-400">/5</span>
        </p>
      </div>
      <StarRating value={rating} readOnly size="sm" />
    </div>
  );
}
