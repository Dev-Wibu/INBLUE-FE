import { useTranslation } from "react-i18next";
/**
 * Admin Review Management Page
 * Allows admin to view and moderate all mentor reviews for candidates
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
import type { MentorFeedback } from "@/hooks/useMentorFeedback";
import { useMentorFeedbacks } from "@/hooks/useMentorFeedback";
import type { MentorReview } from "@/hooks/useMentorReview";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { formatDate } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ReviewDetailView } from "./components/ReviewDetailView";

const getReviewDate = (review: MentorReview): string => {
  const dateVal =
    review.session?.joinTime ||
    review.session?.startTime1 ||
    (review as Record<string, unknown>).createdAt ||
    (review as Record<string, unknown>).created_at ||
    review.session?.createdAt ||
    review.session?.created_at ||
    review.session?.startTime;
  return dateVal ? formatDate(String(dateVal)) : "—";
};

export function ReviewManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const { data: reviews = [], isLoading, isRefetching, refetch } = useMentorReviews();
  const { data: feedbacks = [] } = useMentorFeedbacks();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const activeReview = useMemo(() => {
    if (!id) return null;
    return (
      reviews.find(
        (r) =>
          String(r.id) === id ||
          String(r.session?.id) === id ||
          String((r as Record<string, unknown>).sessionId) === id
      ) || null
    );
  }, [id, reviews]);

  // Create a candidate feedback map by session ID or mentor/user IDs
  const candidateFeedbackMap = useMemo(() => {
    const map = new Map<string, MentorFeedback>();
    feedbacks.forEach((f) => {
      const sId =
        f.session?.id ||
        (f as Record<string, unknown>).sessionId ||
        (f as Record<string, unknown>).session_id;
      if (sId != null) {
        map.set(String(sId), f);
      }
      if (f.mentor?.id != null && f.user?.id != null) {
        map.set(`${f.mentor.id}_${f.user.id}`, f);
      }
    });
    return map;
  }, [feedbacks]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = reviews.length;
    const averageRating =
      total > 0
        ? Number(
            (reviews.reduce((sum, review) => sum + (review.rating ?? 0), 0) / total).toFixed(1)
          )
        : 0;
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    return { total, averageRating, fiveStarCount };
  }, [reviews]);

  // Convert rating filter once for efficiency
  const numericRatingFilter = ratingFilter !== "all" ? Number(ratingFilter) : null;

  // Filter reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((review: MentorReview) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          review.mentor?.name?.toLowerCase().includes(query) ||
          review.user?.name?.toLowerCase().includes(query) ||
          review.session?.roomName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Rating filter
      if (numericRatingFilter !== null && review.rating !== numericRatingFilter) {
        return false;
      }
      return true;
    });
  }, [reviews, searchQuery, numericRatingFilter]);
  const hasActiveFilters = searchQuery.trim().length > 0 || ratingFilter !== "all";

  // Sorting
  const { sortedData, getSortProps } = useSortable(filteredReviews);

  // Pagination
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_reviewmanagement_reviewmanagementpage_tsx_pagesize",
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

  const handleViewDetail = (review: MentorReview) => {
    navigate(`/admin/reviews/${review.id}`);
  };

  if (id) {
    if (isLoading) {
      return (
        <div className="flex h-64 items-center justify-center">
          <SpinnerBlock label={t("common.loadingData", "Đang tải dữ liệu...")} />
        </div>
      );
    }
    if (!activeReview) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-500">
            {t("common.noDataAvailable", "Không tìm thấy thông tin đánh giá này.")}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/reviews")}>
            {t("common.back", "Quay lại danh sách")}
          </Button>
        </div>
      );
    }
    return <ReviewDetailView review={activeReview} onBack={() => navigate("/admin/reviews")} />;
  }

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
            {/* Stat Summary & Control Card */}
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Đánh giá & Phản hồi phỏng vấn
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    Quản lý tổng hợp đánh giá từ Mentor và phản hồi từ Ứng viên theo từng phiên
                    phỏng vấn
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [stats.total, t("adminReviewmanagement.totalReviews", "Tổng phiên phỏng vấn")],
                    [
                      stats.averageRating,
                      t("adminReviewmanagement.averageRating", "Trung bình Mentor chấm"),
                    ],
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

              {/* Search row */}
              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("adminReviewmanagement.searchByMentorNameCandidate")}
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
                  tooltip={t("common.reloadTheReviewList")}
                  className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                />
              </form>

              {/* Rating filter pills */}
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
                    <Star className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    {t("adminReviewmanagement.noReviewsFoundMatchingThe")}
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
                      <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                        <TableHead className="w-[70px] min-w-[70px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.id")}
                        </TableHead>
                        <TableHead className="w-[24%] min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          Mentor phỏng vấn
                        </TableHead>
                        <TableHead className="w-[24%] min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          Ứng viên tham gia
                        </TableHead>
                        <TableHead className="w-[12%] min-w-[100px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.session")}
                        </TableHead>
                        <TableHead className="w-[14%] min-w-[130px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("rating" as keyof MentorReview)}>
                            Mentor chấm
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[14%] min-w-[130px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          Ứng viên chấm
                        </TableHead>
                        <TableHead className="w-[12%] min-w-[120px] pr-6 font-semibold text-slate-700 dark:text-slate-200">
                          {t("adminUsermanagement.joinedDate", "Ngày tham gia")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((review: MentorReview) => {
                        const sessionId =
                          review.session?.id ||
                          (review as Record<string, unknown>).sessionId ||
                          (review as Record<string, unknown>).session_id;
                        const candidateFeedback =
                          candidateFeedbackMap.get(String(sessionId)) ||
                          (review.mentor?.id && review.user?.id
                            ? candidateFeedbackMap.get(`${review.mentor.id}_${review.user.id}`)
                            : null);

                        return (
                          <TableRow
                            key={review.id}
                            onClick={() => handleViewDetail(review)}
                            className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                            <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                              <div className="flex items-center gap-2">
                                <span>#{review.id}</span>
                                <div
                                  className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                                  aria-hidden="true">
                                  <div className="h-3.5 w-3.5"></div>
                                  <div className="h-3.5 w-3.5"></div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                                  <AvatarImage
                                    src={review.mentor?.avatarUrl}
                                    alt={review.mentor?.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-[14px] bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                    {review.mentor?.name?.charAt(0)?.toUpperCase() || "M"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {review.mentor?.name ||
                                    (review.mentor?.id
                                      ? `Mentor #${review.mentor.id}`
                                      : t("common.noDataAvailable"))}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                                  <AvatarImage
                                    src={review.user?.avatarUrl}
                                    alt={review.user?.name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="rounded-[14px] bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                                    {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {review.user?.name ||
                                    (review.user?.id
                                      ? `Candidate #${review.user.id}`
                                      : t("common.noDataAvailable"))}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <Badge variant="outline" className="font-mono text-xs font-semibold">
                                #{review.session?.id}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              <div className="flex items-center gap-1.5">
                                <StarRating value={review.rating || 0} readOnly size="sm" />
                                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                  {review.rating || 0}.0★
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-4">
                              {candidateFeedback ? (
                                <div className="flex items-center gap-1.5">
                                  <StarRating
                                    value={candidateFeedback.rating || 0}
                                    readOnly
                                    size="sm"
                                  />
                                  <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                                    {candidateFeedback.rating || 0}.0★
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chưa phản hồi</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4 pr-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                              {getReviewDate(review)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
