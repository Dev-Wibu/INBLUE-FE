import { MentorScoreDisplay } from "@/components/review/MentorScoreDisplay";
import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  calculateAverageMentorReviewScore,
  matchesMentorReviewScoreRange,
  normalizeMentorReviewScore,
} from "@/lib/mentor-review-score";
import { normalizeFiveStarRating } from "@/lib/rating";
import { Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type RatingFilter = "all" | "excellent" | "strong" | "meets" | "developing";

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
        mentorRatingSortValue: normalizeMentorReviewScore(review.rating),
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
        mentorRatingSortValue: normalizeMentorReviewScore(review?.rating),
      });
    });

    return Array.from(rowMap.values());
  }, [feedbacks, reviews]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
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
      return matchesMentorReviewScoreRange(row.review?.rating, ratingFilter);
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
  const averageMentorScore = calculateAverageMentorReviewScore(reviews).toFixed(1);
  const feedbackCount = rows.filter((row) => row.feedback).length;

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto p-5 duration-300 sm:p-6 md:px-8">
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("common.reviewAndFeedback", "Review & Feedback")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t(
                      "adminReviewmanagement.description",
                      "Mentor reviews and candidate responses grouped by interview session"
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [rows.length, t("adminReviewmanagement.totalReviews")],
                    [`${averageMentorScore}/100`, t("mentorScoring.averageCandidateScore")],
                    [feedbackCount, t("common.responseReceived")],
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

              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("adminReviewmanagement.searchByMentorNameCandidate")}
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      pagination.goToFirstPage();
                    }}
                    className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  {t("common.search")}
                </Button>
                <ReloadButton
                  onReload={async () => {
                    await Promise.all([refetchReviews(), refetchFeedbacks()]);
                  }}
                  isLoading={isRefetching}
                  tooltip={t("common.reloadTheReviewList")}
                  className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("common.evaluate")}:
                </span>
                {[
                  ["all", t("common.allStatus")],
                  ["excellent", t("mentorScoring.range.excellent")],
                  ["strong", t("mentorScoring.range.strong")],
                  ["meets", t("mentorScoring.range.meets")],
                  ["developing", t("mentorScoring.range.developing")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRatingFilter(value as RatingFilter);
                      pagination.goToFirstPage();
                    }}
                    className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                      ratingFilter === value
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}>
                    {label}
                  </button>
                ))}
                {(searchQuery || ratingFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t("common.clearFilter")}
                  </Button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {pageData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
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
                <div className="min-w-[1280px] overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                        <TableHead className="w-[6%] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("idSortValue")}>{t("common.id")}</SortButton>
                        </TableHead>
                        <TableHead className="w-[21%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.mentor")}
                        </TableHead>
                        <TableHead className="w-[21%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("candidateNameSortValue")}>
                            {t("common.candidate")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[10%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.session")}
                        </TableHead>
                        <TableHead className="w-[15%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("mentorRatingSortValue")}>
                            {t("mentorMentordashboard.reviewSent")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[15%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.responseReceived")}
                        </TableHead>
                        <TableHead className="w-[12%] pr-6 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("newestSortValue")}>
                            {t("common.date")}
                          </SortButton>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((row) => {
                        const candidate = row.review?.user ?? row.feedback?.user;
                        const defaultDetail = row.review?.id
                          ? `/mentor/reviews/${row.review.id}`
                          : row.feedback?.id
                            ? `/mentor/feedback/${row.feedback.id}`
                            : undefined;
                        const listState = { returnTo: "/mentor?tab=reviews" };

                        return (
                          <TableRow
                            key={row.key}
                            onClick={() =>
                              defaultDetail && navigate(defaultDetail, { state: listState })
                            }
                            className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                            <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                              #{row.sessionId ?? row.idSortValue}
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                                  <AvatarImage
                                    src={mentorProfile?.avatarUrl}
                                    alt={mentorProfile?.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-[14px] bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                    {mentorProfile?.name?.charAt(0)?.toUpperCase() || "M"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate font-semibold text-slate-900 dark:text-white">
                                  {mentorProfile?.name || t("common.mentor")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                                  <AvatarImage
                                    src={candidate?.avatarUrl}
                                    alt={candidate?.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-[14px] bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                                    {candidate?.name?.charAt(0)?.toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="truncate font-semibold text-slate-900 dark:text-white">
                                  {candidate?.name ||
                                    t("common.studentVar0", { var_0: candidate?.id ?? "—" })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <Badge variant="outline" className="font-mono text-xs font-semibold">
                                #{row.sessionId ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              {row.review ? (
                                <MentorScoreDisplay value={row.review.rating} />
                              ) : (
                                <span className="text-xs text-slate-400 italic">
                                  {t("common.noReview")}
                                </span>
                              )}
                            </TableCell>
                            <TableCell
                              className="px-5 py-4"
                              onClick={(event) => event.stopPropagation()}>
                              {row.feedback?.id ? (
                                <button
                                  type="button"
                                  className="rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
                                  title={t("mentorFeedback.feedbackDetail")}
                                  onClick={() =>
                                    navigate(`/mentor/feedback/${row.feedback?.id}`, {
                                      state: listState,
                                    })
                                  }>
                                  <StarRating
                                    value={normalizeFiveStarRating(row.feedback.rating)}
                                    readOnly
                                    size="sm"
                                    color="sky"
                                  />
                                </button>
                              ) : row.feedback ? (
                                <StarRating
                                  value={normalizeFiveStarRating(row.feedback.rating)}
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
                            <TableCell className="py-4 pr-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                              {getDisplayDate(row)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {sortedData.length > 0 && (
                <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                  <PaginationControl
                    pagination={pagination}
                    showBoundaryButtons={false}
                    showPageJump={false}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      pagination.goToFirstPage();
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
