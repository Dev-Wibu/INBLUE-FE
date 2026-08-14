/**
 * Mentor Given Feedback List Page — Admin UI Pattern Sync
 * Matches Admin Feedback Management page design patterns
 */

import { ReloadButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { SortButton } from "@/components/shared/SortButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useMentorFeedbacksForCurrentUser, type MentorFeedback } from "@/hooks/useMentorFeedback";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import {
  MentorEmptyState,
  MentorListRow,
  MentorQuickStat,
  MentorSortCluster,
} from "@/pages/Mentor/Common";
import { motion } from "framer-motion";
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

// ---------- motion ----------
const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.06, ease: "easeOut" as const },
  },
};

const rowMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
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

  // Distribution chart
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
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ---------- Page Header ---------- */}
      <div className="flex flex-col gap-5 p-4 md:p-6 lg:p-8">
        {/* Stat summary card */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-500/15">
              <Inbox className="h-5 w-5 text-rose-500" />
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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold tracking-[-0.03em] text-slate-900 dark:text-white">
                {isLoading ? "—" : totalFeedbacks}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("common.totalResponse")}
              </p>
            </div>
            <ReloadButton
              onReload={async () => {
                await refetch();
              }}
              isLoading={isRefetching}
              tooltip={t("mentorFeedback.reloadSubmittedResponses")}
            />
          </div>
        </div>

        {/* Search + filter row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Admin-style search input */}
          <div className="relative h-[46px] min-w-0 flex-1">
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
              className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-sm placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:placeholder:text-slate-500"
            />
          </div>
          {/* Admin-style filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleFilterSelect("all")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                ratingFilter === "all"
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}>
              {t("common.allPoints")} ({feedbacks.length})
            </button>
            <button
              onClick={() => handleFilterSelect("high")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                ratingFilter === "high"
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}>
              {t("common.fiveStars")} ({fiveStarCount})
            </button>
            <button
              onClick={() => handleFilterSelect("medium")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                ratingFilter === "medium"
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}>
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
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                ratingFilter === "low"
                  ? "border-indigo-500 bg-indigo-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}>
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
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20">
                <X className="inline h-3 w-3" /> {t("common.clearFilter")}
              </button>
            )}
          </div>
        </div>

        {/* Main content grid: list + side panel */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,280px)]">
          {/* LEFT - Feedback list */}
          <div>
            {isLoading ? (
              <div className="space-y-2 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-16 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <MentorEmptyState
                  icon={Inbox}
                  title={t("common.noResponseYet")}
                  description={t("mentorFeedback.youHaveNotReceivedAny")}
                  tone="rose"
                />
              </div>
            ) : (
              <>
                {sortedData.length > 0 && (
                  <MentorSortCluster>
                    <SortButton {...getSortProps("newestSortValue")}>
                      {t("common.latest")}
                    </SortButton>
                    <SortButton {...getSortProps("ratingSortValue")}>
                      {t("mentorFeedback.ratingScore")}
                    </SortButton>
                    <SortButton {...getSortProps("studentNameSortValue")}>
                      {t("mentorFeedback.studentName")}
                    </SortButton>
                  </MentorSortCluster>
                )}

                {pageData.length === 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-16 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <MentorEmptyState
                      icon={Search}
                      title={t("common.noResponseYet")}
                      description={t("mentorFeedback.youHaveNotReceivedAny")}
                      tone="rose"
                    />
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <motion.div
                      variants={listMotion}
                      initial={false}
                      animate="show"
                      className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                      {pageData.map((feedback) => {
                        const rating = feedback.rating || 0;
                        return (
                          <motion.div key={feedback.id} variants={rowMotion}>
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
                                if (feedback.id) navigate(`/mentor/feedback/${feedback.id}`);
                              }}
                              ariaLabel={feedback.user?.name || `Feedback #${feedback.id ?? ""}`}
                              actionSlot={<FeedbackRowTrailing feedback={feedback} t={t} />}>
                              <Avatar className="h-10 w-10 shrink-0 ring-1 ring-white/10">
                                <AvatarImage
                                  src={feedback.user?.avatarUrl}
                                  alt={feedback.user?.name}
                                />
                                <AvatarFallback className="bg-rose-100 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                                  {feedback.user?.name?.charAt(0) || "S"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {feedback.user?.name || `Feedback #${feedback.id}`}
                                  </p>
                                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                    #{feedback.id}
                                  </span>
                                </div>
                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="truncate">
                                    {feedback.session?.roomName || "—"}
                                  </span>
                                  {feedback.session?.endTime1 && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600">·</span>
                                      <TimeAgo
                                        date={String(
                                          treatZuluAsVietnamLocal(feedback.session.endTime1)
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
                    </motion.div>

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
            totalFeedbacks={totalFeedbacks}
            uniqueStudents={uniqueStudents.size}
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
  totalFeedbacks,
  uniqueStudents,
  fiveStarCount,
  t,
}: {
  isLoading: boolean;
  avgStarRating: string;
  distribution: Array<{ star: number; count: number; pct: number }>;
  totalFeedbacks: number;
  uniqueStudents: number;
  fiveStarCount: number;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  return (
    <aside className="flex w-full flex-col gap-4 xl:sticky xl:top-4 xl:w-[280px] xl:self-start">
      {/* Distribution card - Admin Pattern */}
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
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
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
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-500 to-pink-400"
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
          value={isLoading ? "—" : uniqueStudents}
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
  );
}

// ---------- per-row trailing slot ----------
function FeedbackRowTrailing({
  feedback,
  t,
}: {
  feedback: MentorFeedback;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}) {
  const rating = feedback.rating || 0;
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
