import { useTranslation } from "react-i18next";
/**
 * Mentor Given Feedback List Page
 * Displays all feedbacks that mentor has received from students
 */

import { FeedbackCard, FeedbackStats } from "@/components/feedback";
import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingCardList } from "@/components/ui/loading-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarRating } from "@/components/ui/star-rating";
import { useMentorFeedbacksByMentor, type MentorFeedback } from "@/hooks/useMentorFeedback";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { toTimestamp } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { MessageSquare, TrendingUp, Users } from "lucide-react";
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
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<FeedbackRatingFilter>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<MentorFeedback | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const {
    data: feedbacks = [],
    isLoading,
    isRefetching,
    refetch,
  } = useMentorFeedbacksByMentor(user?.id || 0);

  // Calculate stats
  const totalFeedbacks = feedbacks.length;
  const avgRating =
    totalFeedbacks > 0
      ? (
          feedbacks.reduce(
            (
              sum: number,
              f: {
                rating?: number;
              }
            ) => sum + (f.rating || 0),
            0
          ) / totalFeedbacks
        ).toFixed(1)
      : "0.0";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("mentorFeedback.feedbackReceived")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("mentorFeedback.feedbackFromStudentsSentTo")}
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {t("common.totalResponse")}
            </CardDescription>
            <CardTitle className="text-2xl">{totalFeedbacks}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              {t("mentorFeedback.averageScoreForEvaluation")}
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{avgRating}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {t("mentorFeedback.numberOfStudents")}
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">{uniqueStudents.size}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>{t("common.5StarRating")}</CardDescription>
            <CardTitle className="text-2xl text-[#FFD700]">
              {feedbacks.filter((f: { rating?: number }) => f.rating === 5).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Feedback Stats Chart */}
      {feedbacks.length > 0 && <FeedbackStats feedbacks={feedbacks} />}

      {/* Filters */}
      <Card className="border-emerald-100 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t("common.filter")}</CardTitle>
            <div className="flex items-center gap-2">
              <SortButton {...getSortProps("newestSortValue")}>{t("common.latest")}</SortButton>
              <SortButton {...getSortProps("ratingSortValue")}>
                {t("mentorFeedback.ratingScore")}
              </SortButton>
              <SortButton {...getSortProps("studentNameSortValue")}>
                {t("mentorFeedback.studentName")}
              </SortButton>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-60 flex-1">
              <Input
                placeholder={t("mentorFeedback.searchByNameEmailFeedback")}
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  pagination.goToFirstPage();
                }}
              />
            </div>
            <Select
              value={ratingFilter}
              onValueChange={(value) => {
                setRatingFilter(value as FeedbackRatingFilter);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("common.filterByScore")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allPoints")}</SelectItem>
                <SelectItem value="high">5 sao</SelectItem>
                <SelectItem value="medium">3-4 sao</SelectItem>
                <SelectItem value="low">1-2 sao</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card className="border-emerald-100 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            <CardTitle>{t("common.responseList")}</CardTitle>
          </div>
          <CardDescription>
            {t("common.show")} {sortedData.length} / {feedbacks.length}{" "}
            {t("mentorFeedback.feedbackStudentsSendToYou")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingCardList count={4} />
          ) : sortedData.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t("common.noResponseYet")}
              description={t("mentorFeedback.youHaveNotReceivedAny")}
            />
          ) : (
            <>
              <div className="space-y-4">
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

              {sortedData.length > 0 && (
                <PaginationControl
                  pagination={pagination}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    pagination.goToFirstPage();
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

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
