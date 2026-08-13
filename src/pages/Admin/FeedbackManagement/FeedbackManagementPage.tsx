import { useTranslation } from "react-i18next";
/**
 * Admin Feedback Management Page
 * Allows admin to view and moderate all candidate feedbacks for mentors
 */

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
import { useMentorFeedbacks, type MentorFeedback } from "@/hooks/useMentorFeedback";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { MessageSquare, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function FeedbackManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: feedbacks = [], isLoading, isRefetching, refetch } = useMentorFeedbacks();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  // Stats calculation
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const averageRating =
      total > 0
        ? Number(
            (feedbacks.reduce((sum, feedback) => sum + (feedback.rating ?? 0), 0) / total).toFixed(
              1
            )
          )
        : 0;
    const fiveStarCount = feedbacks.filter((f) => f.rating === 5).length;
    const lowRatingCount = feedbacks.filter((f) => (f.rating ?? 0) > 0 && f.rating! < 3).length;
    return { total, averageRating, fiveStarCount, lowRatingCount };
  }, [feedbacks]);

  // Convert rating filter once for efficiency
  const numericRatingFilter = ratingFilter !== "all" ? Number(ratingFilter) : null;

  // Filter feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((feedback: MentorFeedback) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          feedback.mentor?.name?.toLowerCase().includes(query) ||
          feedback.user?.name?.toLowerCase().includes(query) ||
          feedback.comment?.toLowerCase().includes(query) ||
          feedback.session?.roomName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Rating filter
      if (numericRatingFilter !== null && feedback.rating !== numericRatingFilter) {
        return false;
      }
      return true;
    });
  }, [feedbacks, searchQuery, numericRatingFilter]);
  const hasActiveFilters = searchQuery.trim().length > 0 || ratingFilter !== "all";

  // Sorting
  const { sortedData, getSortProps } = useSortable(filteredFeedbacks);

  // Pagination

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_feedbackmanagement_feedbackmanagementpage_tsx_pagesize",
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
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className={cn("flex flex-col bg-slate-50 dark:bg-slate-950", "flex-1 overflow-hidden")}>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
            {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("adminFeedbackmanagement.candidateResponse")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t("adminFeedbackmanagement.seeTheListOfResponses")}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [stats.total, t("adminFeedbackmanagement.totalResponses", "Tổng phản hồi")],
                    [stats.averageRating, t("adminFeedbackmanagement.averageRating", "Trung bình")],
                    [stats.fiveStarCount, t("common.fiveStars", "5 sao")],
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

              {/* Search row (matching User/Mentor pattern) */}
              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("adminFeedbackmanagement.searchByCandidateNameMentor")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      pagination.goToFirstPage();
                    }}
                    className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  {t("common.search", "Tìm kiếm")}
                </Button>
                <ReloadButton
                  onReload={async () => {
                    await refetch();
                  }}
                  isLoading={isRefetching}
                  tooltip={t("common.reloadTheResponseList")}
                  className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
              </form>

              {/* Rating filter pills (matching User/Mentor pattern) */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("common.evaluate", "Đánh giá")}:
                </span>
                {[
                  ["all", t("common.allStatus", "Tất cả")],
                  ["5", t("common.fiveStars", "5 sao")],
                  ["4", t("common.fourStars", "4 sao")],
                  ["3", t("common.threeStars", "3 sao")],
                  ["2", t("common.twoStars", "2 sao")],
                  ["1", t("common.oneStar", "1 sao")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setRatingFilter(value);
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

            {/* Table Card Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {pageData.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <MessageSquare className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("adminFeedbackmanagement.noResponsesFoundMatchingThe")}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setRatingFilter("all");
                        pagination.goToFirstPage();
                      }}>
                      {t("common.clearFilter")}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-16 pl-6 font-medium text-slate-500">ID</TableHead>
                        <TableHead className="font-medium text-slate-500">
                          {t("common.applicant")}
                        </TableHead>
                        <TableHead className="font-medium text-slate-500">Mentor</TableHead>
                        <TableHead className="font-medium text-slate-500">
                          {t("adminFeedback.session")}
                        </TableHead>
                        <TableHead className="font-medium text-slate-500">
                          <SortButton {...getSortProps("createdAt" as keyof MentorFeedback)}>
                            {t("adminFeedback.sentDate")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="pr-6 font-medium text-slate-500">
                          <SortButton {...getSortProps("rating" as keyof MentorFeedback)}>
                            {t("common.review")}
                          </SortButton>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((feedback) => (
                        <TableRow
                          key={feedback.id}
                          onClick={() => {
                            const targetId = feedback.session?.id || feedback.id;
                            navigate(`/admin/reviews/${targetId}`);
                          }}
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                          <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <span>#{feedback.id}</span>
                              {/* Dummy element to force row height alignment */}
                              <div
                                className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                                aria-hidden="true">
                                <div className="h-3.5 w-3.5"></div>
                                <div className="h-3.5 w-3.5"></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={feedback.user?.avatarUrl} />
                                <AvatarFallback className="bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                  {feedback.user?.name?.charAt(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {feedback.user?.name || t("common.noDataAvailable")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={feedback.mentor?.avatarUrl} />
                                <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                  {feedback.mentor?.name?.charAt(0)?.toUpperCase() || "M"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {feedback.mentor?.name || t("common.noDataAvailable")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{feedback.session?.id}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {feedback.createdAt
                              ? formatDateTime(feedback.createdAt)
                              : feedback.session?.joinTime
                                ? formatDateTime(feedback.session.joinTime)
                                : feedback.session?.startTime1
                                  ? formatDateTime(feedback.session.startTime1)
                                  : t("common.noDataAvailable")}
                          </TableCell>
                          <TableCell className="pr-6">
                            <StarRating value={feedback.rating || 0} readOnly size="sm" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {sortedData.length > 0 && (
                    <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                      <PaginationControl
                        pagination={pagination}
                        showBoundaryButtons={false}
                        showPageJump={false}
                        onPageSizeChange={(nextPageSize) => {
                          setPageSize(nextPageSize);
                          pagination.goToFirstPage();
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
