import { useTranslation } from "react-i18next";
/**
 * Mentor Given Feedback List Page
 * Displays all feedbacks that mentor has received from students
 */

import { FeedbackCard, FeedbackStats } from "@/components/feedback";
import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarRating } from "@/components/ui/star-rating";
import { useMentorFeedbacksForCurrentUser, type MentorFeedback } from "@/hooks/useMentorFeedback";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp } from "@/lib/formatting";
import { Filter, Inbox, MessageSquare, Search, TrendingUp, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
const toSessionTimestamp = (value?: string) => {
  return toTimestamp(value) ?? 0;
};
const getFeedbackNewestSortValue = (feedback: MentorFeedback) => {
  const endTime = toSessionTimestamp(feedback.session?.endTime1);
  if (endTime > 0) {
    return endTime;
  }
  const startTime = toSessionTimestamp(feedback.session?.startTime1);
  if (startTime > 0) {
    return startTime;
  }
  return typeof feedback.id === "number" ? feedback.id : 0;
};
type FeedbackRatingFilter = "all" | "low" | "medium" | "high";
type SortableFeedback = MentorFeedback & {
  idSortValue: number;
  newestSortValue: number;
  ratingSortValue: number;
  studentNameSortValue: string;
};
export function GivenFeedbackListPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<FeedbackRatingFilter>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<MentorFeedback | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // 2026-08-02: use the Mentor-aware hook because BE's
  //   `/api/mentor-feedbacks/mentor/{id}` filters by Mentor.id (bảng mentor
  //   PK), NOT User.id. Passing `user.id` (= JWT sub) silently returns `[]`
  //   when Mentor.id != User.id. Resolves via `useCurrentMentorProfile`.
  const {
    data: feedbacks = [],
    isLoading,
    isRefetching,
    refetch,
  } = useMentorFeedbacksForCurrentUser();

  // Calculate stats - only star ratings (1-5)
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

  // Get unique students
  const uniqueStudents = new Set(
    feedbacks
      .map((feedback) => feedback.user?.id ?? feedback.session?.userId)
      .filter((id): id is number => typeof id === "number")
  );
  const filteredFeedbacks = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return feedbacks.filter((feedback) => {
      if (normalizedSearch) {
        const matchesSearch =
          feedback.user?.name?.toLowerCase().includes(normalizedSearch) ||
          feedback.user?.email?.toLowerCase().includes(normalizedSearch) ||
          feedback.comment?.toLowerCase().includes(normalizedSearch) ||
          feedback.session?.roomName?.toLowerCase().includes(normalizedSearch);
        if (!matchesSearch) {
          return false;
        }
      }
      const rating = feedback.rating || 0;
      if (ratingFilter === "low" && rating > 2) {
        return false;
      }
      if (ratingFilter === "medium" && (rating < 3 || rating > 4)) {
        return false;
      }
      if (ratingFilter === "high" && rating < 5) {
        return false;
      }
      return true;
    });
  }, [feedbacks, ratingFilter, searchQuery]);
  const sortableFeedbacks = useMemo<SortableFeedback[]>(() => {
    return filteredFeedbacks.map((feedback) => ({
      ...feedback,
      idSortValue: typeof feedback.id === "number" ? feedback.id : 0,
      newestSortValue: getFeedbackNewestSortValue(feedback),
      ratingSortValue: feedback.rating || 0,
      studentNameSortValue: feedback.user?.name?.toLowerCase() || "",
    }));
  }, [filteredFeedbacks]);
  const { sortedData, getSortProps } = useSortable(sortableFeedbacks, {
    defaultSort: {
      key: "newestSortValue",
      direction: "desc",
    },
    noSortBehavior: "preserve",
    tieBreaker: {
      key: "idSortValue",
      direction: "desc",
    },
  });
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_feedback_givenfeedbacklistpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });
  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );
  const handleOpenDetail = (feedback: MentorFeedback) => {
    setSelectedFeedback(feedback);
    setIsDetailOpen(true);
  };
  return (
    <div className="flex flex-col gap-6">
      {/* Header — elevated gradient hero */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50/80 via-white to-pink-50/80 p-5 shadow-sm dark:border-rose-900/40 dark:from-rose-950/40 dark:via-slate-900 dark:to-pink-950/40">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-rose-300/40 to-pink-300/40 blur-3xl dark:from-rose-700/30 dark:to-pink-700/30" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30">
              <Inbox className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("mentorFeedback.feedbackReceived")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("mentorFeedback.feedbackFromStudentsSentTo")}
              </p>
            </div>
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

      {/* Stats — elevated with gradients + icon badges + hover lift */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/40 to-white p-4 transition-all hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 dark:border-indigo-900/40 dark:from-slate-950/40 dark:via-indigo-950/20 dark:to-slate-950/40 dark:hover:border-indigo-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.totalResponse")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shadow-indigo-500/30 transition-transform group-hover:scale-110">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {totalFeedbacks}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorFeedback.feedbackStudentsSendToYou")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-indigo-500/5 blur-2xl dark:bg-indigo-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/40 to-white p-4 transition-all hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 dark:border-emerald-900/40 dark:from-slate-950/40 dark:via-emerald-950/20 dark:to-slate-950/40 dark:hover:border-emerald-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.averageStarRating")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30 transition-transform group-hover:scale-110">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {avgStarRating}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorOverview.basedOnSubmittedReviews")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/5 blur-2xl dark:bg-emerald-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-sky-100/80 bg-gradient-to-br from-white via-sky-50/40 to-white p-4 transition-all hover:border-sky-200 hover:shadow-md hover:shadow-sky-500/5 dark:border-sky-900/40 dark:from-slate-950/40 dark:via-sky-950/20 dark:to-slate-950/40 dark:hover:border-sky-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("mentorFeedback.numberOfStudents")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/30 transition-transform group-hover:scale-110">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {uniqueStudents.size}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("mentorFeedback.numberOfStudents")}
          </p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-sky-500/5 blur-2xl dark:bg-sky-500/10" />
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-amber-100/80 bg-gradient-to-br from-white via-amber-50/40 to-white p-4 transition-all hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/5 dark:border-amber-900/40 dark:from-slate-950/40 dark:via-amber-950/20 dark:to-slate-950/40 dark:hover:border-amber-800">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {t("common.5StarRating")}
            </p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30 transition-transform group-hover:scale-110">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {feedbacks.filter((f: { rating?: number }) => f.rating === 5).length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("common.fiveStars")}</p>
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-amber-500/5 blur-2xl dark:bg-amber-500/10" />
        </div>
      </div>

      {/* Feedback Stats Chart */}
      {feedbacks.length > 0 && <FeedbackStats feedbacks={feedbacks} />}

      {/* Feedback List — elevated card */}
      <div className="space-y-4 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-xs dark:border-slate-800 dark:from-slate-950/40 dark:to-slate-900/30">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("mentorFeedback.searchByNameEmailFeedback")}
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
              setRatingFilter(value as FeedbackRatingFilter);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="w-[200px] border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
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
            <SortButton {...getSortProps("newestSortValue")}>{t("common.latest")}</SortButton>
            <SortButton {...getSortProps("ratingSortValue")}>
              {t("mentorFeedback.ratingScore")}
            </SortButton>
            <SortButton {...getSortProps("studentNameSortValue")}>
              {t("mentorFeedback.studentName")}
            </SortButton>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 py-3">
            <div className="h-24 animate-pulse rounded-xl bg-white dark:bg-slate-950/40" />
            <div className="h-24 animate-pulse rounded-xl bg-white dark:bg-slate-950/40" />
            <div className="h-24 animate-pulse rounded-xl bg-white dark:bg-slate-950/40" />
          </div>
        ) : sortedData.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={t("common.noResponseYet")}
            description={t("mentorFeedback.youHaveNotReceivedAny")}
          />
        ) : (
          <>
            <div className="space-y-2">
              {pageData.map((feedback: MentorFeedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  showUser
                  showMentor={false}
                  showSession
                  onClick={() => handleOpenDetail(feedback)}
                />
              ))}
            </div>

            <PaginationControl
              pagination={pagination}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                pagination.goToFirstPage();
              }}
            />
          </>
        )}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("common.feedbackDetails")}
              {selectedFeedback?.id}
            </DialogTitle>
            <DialogDescription>
              {t("mentorFeedback.feedbackFrom")}{" "}
              {selectedFeedback?.user?.name || t("general.student")} {t("mentorFeedback.sentToYou")}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <StarRating value={selectedFeedback.rating || 0} readOnly size="lg" />
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("mentorFeedback.responseContent")}
                </h4>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedFeedback.comment || t("mentorFeedback.studentsHaveNotLeftDetailed")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">{t("common.sessionCode")}</span>{" "}
                  <span className="font-medium">
                    #{selectedFeedback.session?.id || t("common.noDataAvailable")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{t("common.roomName")}</span>{" "}
                  <span className="font-medium">
                    {selectedFeedback.session?.roomName || t("common.noDataAvailable")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{t("mentorFeedback.students")}</span>{" "}
                  <span className="font-medium">
                    {selectedFeedback.user?.name ||
                      (selectedFeedback.session?.userId
                        ? t("common.studentVar0", {
                            var_0: selectedFeedback.session.userId,
                          })
                        : t("common.noDataAvailable"))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">{t("mentorFeedback.studentEmail")}</span>{" "}
                  <span className="font-medium">
                    {selectedFeedback.user?.email || t("common.noDataAvailable")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
