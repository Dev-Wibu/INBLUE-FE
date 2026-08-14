import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorFeedbacksForCurrentUser, type MentorFeedback } from "@/hooks/useMentorFeedback";
import { useMentorReviews, type MentorReview } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { formatDate, toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { Eye, MessageSquareText, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

type ReviewFeedbackRow = {
  key: string;
  sessionId?: number;
  review?: MentorReview;
  feedback?: MentorFeedback;
  idSortValue: number;
  newestSortValue: number;
  candidateNameSortValue: string;
  mentorRatingSortValue: number;
};

const getSessionId = (item: MentorReview | MentorFeedback): number | undefined => {
  const rawId =
    item.session?.id ||
    (item as Record<string, unknown>).sessionId ||
    (item as Record<string, unknown>).session_id;
  const sessionId = Number(rawId);
  return Number.isFinite(sessionId) && sessionId > 0 ? sessionId : undefined;
};

const getNewestTimestamp = (review?: MentorReview, feedback?: MentorFeedback): number => {
  const values = [
    feedback?.updatedAt,
    feedback?.createdAt,
    review?.session?.endTime1,
    feedback?.session?.endTime1,
    review?.session?.startTime1,
    feedback?.session?.startTime1,
  ];
  for (const value of values) {
    const timestamp = toTimestamp(value);
    if (timestamp != null) return timestamp;
  }
  return Math.max(review?.id ?? 0, feedback?.id ?? 0);
};

const getDisplayDate = (row: ReviewFeedbackRow): string => {
  const value =
    row.feedback?.updatedAt ||
    row.feedback?.createdAt ||
    row.review?.session?.endTime1 ||
    row.feedback?.session?.endTime1 ||
    row.review?.session?.startTime1 ||
    row.feedback?.session?.startTime1;
  return value ? formatDate(treatZuluAsVietnamLocal(value)) : "—";
};

export function MentorReviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");

  const { data: mentorProfile } = useCurrentMentorProfile();
  const mentorId = Number(mentorProfile?.id);
  const {
    data: allReviews = [],
    isLoading: reviewsLoading,
    isRefetching: reviewsRefetching,
    refetch: refetchReviews,
  } = useMentorReviews();
  const {
    data: feedbacks = [],
    isLoading: feedbacksLoading,
    isRefetching: feedbacksRefetching,
    refetch: refetchFeedbacks,
  } = useMentorFeedbacksForCurrentUser();

  const reviews = useMemo(() => {
    if (!mentorId) return [];
    return allReviews.filter((review) => review.session?.userId2 === mentorId);
  }, [allReviews, mentorId]);

  const rows = useMemo<ReviewFeedbackRow[]>(() => {
    const rowMap = new Map<string, ReviewFeedbackRow>();

    reviews.forEach((review) => {
      const sessionId = getSessionId(review);
      const key = sessionId ? `session-${sessionId}` : `review-${review.id}`;
      rowMap.set(key, {
        key,
        sessionId,
        review,
        idSortValue: sessionId ?? review.id ?? 0,
        newestSortValue: getNewestTimestamp(review),
        candidateNameSortValue: review.user?.name?.toLowerCase() ?? "",
        mentorRatingSortValue: review.rating ?? 0,
      });
    });

    feedbacks.forEach((feedback) => {
      const sessionId = getSessionId(feedback);
      const key = sessionId ? `session-${sessionId}` : `feedback-${feedback.id}`;
      const current = rowMap.get(key);
      const review = current?.review;
      rowMap.set(key, {
        key,
        sessionId,
        review,
        feedback,
        idSortValue: sessionId ?? current?.idSortValue ?? feedback.id ?? 0,
        newestSortValue: getNewestTimestamp(review, feedback),
        candidateNameSortValue:
          review?.user?.name?.toLowerCase() ?? feedback.user?.name?.toLowerCase() ?? "",
        mentorRatingSortValue: review?.rating ?? 0,
      });
    });

    return Array.from(rowMap.values());
  }, [feedbacks, reviews]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rating = ratingFilter === "all" ? null : Number(ratingFilter);
    return rows.filter((row) => {
      const candidate = row.review?.user ?? row.feedback?.user;
      const session = row.review?.session ?? row.feedback?.session;
      if (
        query &&
        !candidate?.name?.toLowerCase().includes(query) &&
        !candidate?.email?.toLowerCase().includes(query) &&
        !session?.roomName?.toLowerCase().includes(query) &&
        !String(row.sessionId ?? "").includes(query)
      ) {
        return false;
      }
      return rating == null || row.review?.rating === rating;
    });
  }, [ratingFilter, rows, searchQuery]);

  const { sortedData, getSortProps } = useSortable(filteredRows, {
    defaultSort: { key: "newestSortValue", direction: "desc" },
    noSortBehavior: "preserve",
    tieBreaker: { key: "idSortValue", direction: "desc" },
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

  const isLoading = reviewsLoading || feedbacksLoading;
  const isRefetching = reviewsRefetching || feedbacksRefetching;
  const clearFilters = () => {
    setSearchQuery("");
    setRatingFilter("all");
    pagination.goToFirstPage();
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.reviewAndFeedback", "Review & Feedback")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "adminReviewmanagement.description",
              "Mentor reviews and candidate responses grouped by interview session"
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder={t("adminReviewmanagement.searchByMentorNameCandidate")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={ratingFilter}
            onValueChange={(value) => {
              setRatingFilter(value as RatingFilter);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-36 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("common.rating")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allPoints")}</SelectItem>
              {[5, 4, 3, 2, 1].map((rating) => (
                <SelectItem key={rating} value={String(rating)}>
                  {rating} {t("common.star")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || ratingFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <ReloadButton
            onReload={async () => {
              await Promise.all([refetchReviews(), refetchFeedbacks()]);
            }}
            isLoading={isRefetching}
            tooltip={t("common.reloadTheReviewList")}
            className="h-8 w-8"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {pageData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Star className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {t("adminReviewmanagement.noReviewsFoundMatchingThe")}
                  </p>
                  {(searchQuery || ratingFilter !== "all") && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      {t("common.clearFilter")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="min-w-[1120px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-[90px] pl-6 font-medium text-slate-500">
                          <SortButton {...getSortProps("idSortValue")}>{t("common.id")}</SortButton>
                        </TableHead>
                        <TableHead className="min-w-[260px] font-medium text-slate-500">
                          <SortButton {...getSortProps("candidateNameSortValue")}>
                            {t("common.candidate")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="min-w-[220px] font-medium text-slate-500">
                          {t("common.session")}
                        </TableHead>
                        <TableHead className="w-[180px] font-medium text-slate-500">
                          <SortButton {...getSortProps("mentorRatingSortValue")}>
                            {t("mentorMentordashboard.reviewSent")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[180px] font-medium text-slate-500">
                          {t("common.responseReceived")}
                        </TableHead>
                        <TableHead className="w-[140px] font-medium text-slate-500">
                          <SortButton {...getSortProps("newestSortValue")}>
                            {t("common.date")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[150px] pr-6 text-right font-medium text-slate-500">
                          {t("common.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((row) => {
                        const candidate = row.review?.user ?? row.feedback?.user;
                        const session = row.review?.session ?? row.feedback?.session;
                        const defaultDetail = row.review?.id
                          ? `/mentor/reviews/${row.review.id}`
                          : row.feedback?.id
                            ? `/mentor/feedback/${row.feedback.id}`
                            : undefined;

                        return (
                          <TableRow
                            key={row.key}
                            onClick={() => defaultDetail && navigate(defaultDetail)}
                            className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                            <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                              #{row.sessionId ?? row.idSortValue}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800">
                                  <AvatarImage src={candidate?.avatarUrl} alt={candidate?.name} />
                                  <AvatarFallback className="rounded-lg bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    {candidate?.name?.charAt(0)?.toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="max-w-[230px] truncate font-semibold text-slate-900 dark:text-white">
                                    {candidate?.name ||
                                      t("common.studentVar0", { var_0: candidate?.id ?? "—" })}
                                  </p>
                                  <p className="max-w-[230px] truncate text-xs text-slate-500 dark:text-slate-400">
                                    {candidate?.email || "—"}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {row.sessionId && (
                                  <Badge variant="outline" className="font-mono text-xs">
                                    #{row.sessionId}
                                  </Badge>
                                )}
                                <span className="max-w-[180px] truncate text-sm text-slate-600 dark:text-slate-300">
                                  {session?.roomName || "—"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {row.review ? (
                                <StarRating
                                  value={row.review.rating || 0}
                                  readOnly
                                  size="sm"
                                  color="amber"
                                />
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  {t("common.noReview")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.feedback ? (
                                <StarRating
                                  value={row.feedback.rating || 0}
                                  readOnly
                                  size="sm"
                                  color="sky"
                                />
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  {t("common.pending")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {getDisplayDate(row)}
                            </TableCell>
                            <TableCell
                              className="pr-6"
                              onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                {row.review?.id && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={t("mentorReviews.reviewDetail")}
                                    aria-label={t("mentorReviews.reviewDetail")}
                                    onClick={() => navigate(`/mentor/reviews/${row.review?.id}`)}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {row.feedback?.id && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={t("mentorFeedback.feedbackDetail")}
                                    aria-label={t("mentorFeedback.feedbackDetail")}
                                    onClick={() =>
                                      navigate(`/mentor/feedback/${row.feedback?.id}`)
                                    }>
                                    <MessageSquareText className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {sortedData.length > 0 && (
              <div className="flex flex-none items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                <PaginationControl
                  pagination={pagination}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    pagination.goToFirstPage();
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
