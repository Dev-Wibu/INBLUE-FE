import { useTranslation } from "react-i18next";
/**
 * Mentor Reviews Page
 * Displays reviews written by mentor for students
 */

import { ReviewList, ReviewStats } from "@/components/review";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { ReloadButton } from "@/components/shared/ReloadButton";
import { SortButton } from "@/components/shared/SortButton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews, type MentorReview } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp } from "@/lib/formatting";
import { Filter, Search, Send, Star, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
type SortableReview = MentorReview & {
  newestSortValue: number;
};
const toSessionTimestamp = (value?: string) => {
  return toTimestamp(value) ?? 0;
};
const getReviewNewestSortValue = (review: MentorReview) => {
  const endTime = toSessionTimestamp(review.session?.endTime1);
  if (endTime > 0) {
    return endTime;
  }
  const startTime = toSessionTimestamp(review.session?.startTime1);
  if (startTime > 0) {
    return startTime;
  }
  return typeof review.id === "number" ? review.id : 0;
};
export function MentorReviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: mentorProfile } = useCurrentMentorProfile();
  const mentorId =
    typeof mentorProfile?.id === "string" ? parseInt(mentorProfile.id, 10) : mentorProfile?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<"all" | "high" | "medium" | "low">("all");

  // Fetch ALL reviews and filter client-side
  const { data: allReviews = [], isLoading, isRefetching, refetch } = useMentorReviews();

  // Filter by mentor ID using session.userId2 (since API returns mentor=null)
  // Based on API response pattern: session.userId2 = mentor's user ID
  const reviews = useMemo(() => {
    if (!mentorId) return [];
    console.log("[MentorReviewsPage] Filtering reviews", {
      mentorId,
      totalReviews: allReviews.length,
    });
    return allReviews.filter((review) => {
      // Match by session.userId2 (the mentor's user ID in session)
      const sessionMentorId = review.session?.userId2;
      const matches = sessionMentorId === mentorId;
      if (!matches) {
        console.log("[MentorReviewsPage] Review does not match", {
          reviewId: review.id,
          sessionId: review.session?.id,
          sessionMentorId,
          lookingFor: mentorId,
        });
      }
      return matches;
    });
  }, [allReviews, mentorId]);
  const filteredReviews = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return reviews.filter((review) => {
      if (normalizedSearch) {
        const matchesSearch =
          review.user?.name?.toLowerCase().includes(normalizedSearch) ||
          review.user?.email?.toLowerCase().includes(normalizedSearch) ||
          review.session?.roomName?.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) {
          return false;
        }
      }
      const rating = review.rating || 0;
      if (ratingFilter === "high" && rating < 5) {
        return false;
      }
      if (ratingFilter === "medium" && (rating < 3 || rating > 4)) {
        return false;
      }
      if (ratingFilter === "low" && rating > 2) {
        return false;
      }
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

  // Apply sorting
  const { sortedData, getSortProps } = useSortable(sortableReviews, {
    defaultSort: {
      key: "newestSortValue",
      direction: "desc",
    },
    noSortBehavior: "preserve",
    tieBreaker: {
      key: "newestSortValue",
      direction: "desc",
    },
  });

  // Apply pagination
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_reviews_mentorreviewspage_tsx_pagesize",
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
  return (
    <div className="flex flex-col gap-6">
      {/* Header — elevated gradient hero */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/80 p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/40">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-300/40 blur-3xl dark:from-emerald-700/30 dark:to-teal-700/30" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30">
              <Send className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("common.reviewSubmitted")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorReviews.viewTheAssessmentsYouSent")}
              </p>
            </div>
          </div>
          <ReloadButton
            onReload={async () => {
              await refetch();
            }}
            isLoading={isRefetching}
            tooltip={t("common.reloadReviewList")}
          />
        </div>
      </div>

      {/* Stats — elevated with gradients + icon badges + hover lift */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/40 to-white p-4 transition-all hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 dark:border-indigo-900/40 dark:from-slate-950/40 dark:via-indigo-950/20 dark:to-slate-950/40 dark:hover:border-indigo-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.totalRating")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/30 transition-transform group-hover:scale-110">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {reviews.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorReviews.reviewsYouVeSentTo")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-indigo-500/5 blur-2xl dark:bg-indigo-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/40 to-white p-4 transition-all hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/5 dark:border-amber-900/40 dark:from-slate-950/40 dark:via-amber-950/20 dark:to-slate-950/40 dark:hover:border-amber-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.averageStarRating")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 transition-transform group-hover:scale-110">
              <Star className="h-4 w-4 fill-current" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {(() => {
              const starReviews = reviews.filter(
                (r: { rating?: number }) =>
                  typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5
              );
              return starReviews.length > 0
                ? (
                    starReviews.reduce(
                      (sum: number, r: { rating?: number }) => sum + (r.rating || 0),
                      0
                    ) / starReviews.length
                  ).toFixed(1)
                : "N/A";
            })()}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorOverview.basedOnSubmittedReviews")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-amber-500/5 blur-2xl dark:bg-amber-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/40 to-white p-4 transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 dark:border-emerald-900/40 dark:from-slate-950/40 dark:via-emerald-950/20 dark:to-slate-950/40 dark:hover:border-emerald-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.5StarRating")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30 transition-transform group-hover:scale-110">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {reviews.filter((r: { rating?: number }) => r.rating === 5).length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("common.fiveStars")}</p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/5 blur-2xl dark:bg-emerald-500/10" />
        </div>
      </div>

      {/* Review Stats Chart */}
      {reviews.length > 0 && <ReviewStats reviews={reviews} />}

      {/* Review List — elevated card */}
      <div className="space-y-4 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-xs dark:border-slate-800 dark:from-slate-950/40 dark:to-slate-900/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("mentorReviews.searchByStudentEmailInterview")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="border-slate-200 bg-white pl-9 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <Select
            value={ratingFilter}
            onValueChange={(value) => {
              setRatingFilter(value as "all" | "high" | "medium" | "low");
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="w-[180px] border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <SelectValue placeholder={t("common.filterByScore")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allPoints")}</SelectItem>
              <SelectItem value="high">{t("common.fiveStars")}</SelectItem>
              <SelectItem value="medium">{t("common.threeToFourStars")}</SelectItem>
              <SelectItem value="low">{t("common.oneToTwoStars")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Controls */}
        {sortedData.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-700/80">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5" />
              {t("common.sortBy")}
            </span>
            <SortButton {...getSortProps("rating")}>{t("common.evaluate")}</SortButton>
            <SortButton {...getSortProps("newestSortValue")}>{t("common.latest")}</SortButton>
          </div>
        )}

        {sortedData.length === 0 ? (
          <EmptyState
            icon={Star}
            title={t("common.thereAreNoReviewsYet")}
            description={t("mentorReviews.youHaveNotSentAny")}
          />
        ) : (
          <>
            <ReviewList
              reviews={pageData}
              isLoading={isLoading}
              showUser
              showMentor={false}
              onSelect={(review) => {
                if (review.id) {
                  navigate(`/mentor/reviews/${review.id}`);
                }
              }}
              emptyTitle={t("common.thereAreNoReviewsYet")}
              emptyDescription={t("mentorReviews.youHaveNotSentAny")}
            />

            {/* Pagination */}
            <PaginationControl
              pagination={pagination}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                pagination.goToFirstPage();
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </>
        )}
      </div>
    </div>
  );
}
