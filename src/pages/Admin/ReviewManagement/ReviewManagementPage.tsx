import { useTranslation } from "react-i18next";
/**
 * Admin Review Management Page
 * Allows admin to view and moderate all mentor reviews for candidates
 */

import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { MentorReview } from "@/hooks/useMentorReview";
import { useDeleteMentorReview, useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { formatDate } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ReviewDetailView } from "./components/ReviewDetailView";

const getReviewDate = (review: MentorReview): string => {
  const dateVal =
    (review as Record<string, unknown>).createdAt ||
    (review as Record<string, unknown>).created_at ||
    review.session?.joinTime ||
    review.session?.startTime1;
  return dateVal ? formatDate(String(dateVal)) : "—";
};

export function ReviewManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const { data: reviews = [], isLoading, isRefetching, refetch } = useMentorReviews();
  const { mutate: deleteReview, isPending: isDeleting } = useDeleteMentorReview();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<MentorReview | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const activeReview = useMemo(() => {
    if (!id) return null;
    return reviews.find((r) => String(r.id) === id) || null;
  }, [id, reviews]);

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
    const lowRatingCount = reviews.filter((r) => (r.rating ?? 0) > 0 && r.rating! < 3).length;
    return { total, averageRating, fiveStarCount, lowRatingCount };
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
  const handleDeleteClick = (review: MentorReview) => {
    setSelectedReview(review);
    setIsDeleteOpen(true);
  };
  const handleDeleteConfirm = () => {
    if (selectedReview?.id) {
      deleteReview(selectedReview.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedReview(null);
          toast.success(t("common.reviewRemoved"));
          if (id) navigate("/admin/reviews");
        },
      });
    }
  };

  if (id && activeReview) {
    return (
      <ReviewDetailView
        review={activeReview}
        onBack={() => navigate("/admin/reviews")}
        onDelete={() => handleDeleteClick(activeReview)}
      />
    );
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
            {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("common.reviewsFromMentors")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t("adminReviewmanagement.seeTheListOfMentor")}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [stats.total, t("adminReviewmanagement.totalReviews", "Tổng đánh giá")],
                    [stats.averageRating, t("adminReviewmanagement.averageRating", "Trung bình")],
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
                  tooltip={t("common.reloadReviewList")}
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
                        <TableHead className="w-[28%] min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.mentorSent")}
                        </TableHead>
                        <TableHead className="w-[28%] min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.candidatesAreEvaluated")}
                        </TableHead>
                        <TableHead className="w-[14%] min-w-[110px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.session")}
                        </TableHead>
                        <TableHead className="w-[15%] min-w-[140px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("rating" as keyof MentorReview)}>
                            {t("common.evaluate")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[15%] min-w-[140px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                          {t("adminUsermanagement.joinedDate", "Ngày tham gia")}
                        </TableHead>
                        <TableHead className="w-[80px] min-w-[80px] pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.delete", "Xóa")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((review: MentorReview) => (
                        <TableRow
                          key={review.id}
                          onClick={() => handleViewDetail(review)}
                          className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                          <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span>#{review.id}</span>
                              {/* Dummy element to force row height alignment */}
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
                            <StarRating value={review.rating || 0} readOnly size="sm" />
                          </TableCell>
                          <TableCell className="px-4 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                            {getReviewDate(review)}
                          </TableCell>
                          <TableCell
                            className="pr-6 text-center"
                            onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                              onClick={() => handleDeleteClick(review)}
                              title={t("common.delete", "Xóa")}>
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDeletion")}</DialogTitle>
            <DialogDescription>
              {t("adminReviewmanagement.areYouSureYouWant")}
              {selectedReview?.id}
              {t("adminReviewmanagement.thisActionCannotBeUndone")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>
              {t("general.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? t("common.deleting") : t("general.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
