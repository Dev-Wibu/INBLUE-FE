import { useTranslation } from "react-i18next";
/**
 * Admin Review Management Page
 * Allows admin to view and moderate all mentor reviews for candidates
 */

import { ReviewStats } from "@/components/review";
import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { MentorReview } from "@/hooks/useMentorReview";
import { useDeleteMentorReview, useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { Eye, Search, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
export function ReviewManagementPage() {
  const { t } = useTranslation();
  const { data: reviews = [], isLoading, isRefetching, refetch } = useMentorReviews();
  const { mutate: deleteReview, isPending: isDeleting } = useDeleteMentorReview();
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<MentorReview | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  // Calculate stats
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: MentorReview) => sum + (r.rating || 0), 0) / reviews.length
      : 0;
  const handleViewDetail = (review: MentorReview) => {
    setSelectedReview(review);
    setIsDetailOpen(true);
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
        },
      });
    }
  };
  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("common.reviewsFromMentors")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminReviewmanagement.seeTheListOfMentor")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("adminReviewmanagement.searchByMentorNameCandidate")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={ratingFilter}
            onValueChange={(value) => {
              setRatingFilter(value);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-32 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("common.numberOfStars")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("general.all")}</SelectItem>
              <SelectItem value="5">{t("common.fiveStars")}</SelectItem>
              <SelectItem value="4">{t("common.fourStars")}</SelectItem>
              <SelectItem value="3">{t("common.threeStars")}</SelectItem>
              <SelectItem value="2">{t("common.twoStars")}</SelectItem>
              <SelectItem value="1">{t("common.oneStar")}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setRatingFilter("all");
                pagination.goToFirstPage();
              }}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <ReloadButton
            onReload={async () => {
              await refetch();
            }}
            isLoading={isRefetching}
            tooltip={t("common.reloadReviewList")}
            className="h-8 w-8"
          />
        </div>
      </div>

      {/* ── TABLE CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:px-6 sm:pt-6 xl:grid-cols-4">
          <Card className="border-slate-200 shadow-none dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription>{t("common.totalRating")}</CardDescription>
              <CardTitle className="text-2xl">{reviews.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-none dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription>{t("common.averageScore")}</CardDescription>
              <CardTitle className="text-2xl text-emerald-600">{avgRating.toFixed(1)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-none dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription>{t("common.fiveStars")}</CardDescription>
              <CardTitle className="text-2xl text-[#FFD700]">
                {reviews.filter((r: MentorReview) => r.rating === 5).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-slate-200 shadow-none dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardDescription>{t("common.oneToTwoStars")}</CardDescription>
              <CardTitle className="text-2xl text-red-500">
                {reviews.filter((r: MentorReview) => (r.rating || 0) <= 2).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {reviews.length > 0 && (
          <div className="mb-4 px-4 sm:px-6">
            <ReviewStats
              reviews={reviews}
              className="border-slate-200 shadow-none dark:border-slate-800"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("common.loading")} />
          </div>
        ) : pageData.length === 0 ? (
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("common.id")}</TableHead>
                    <TableHead>{t("common.mentorSent")}</TableHead>
                    <TableHead>{t("common.candidatesAreEvaluated")}</TableHead>
                    <TableHead className="w-32">{t("common.session")}</TableHead>
                    <TableHead className="w-36">
                      <SortButton {...getSortProps("rating" as keyof MentorReview)}>
                        {t("common.evaluate")}
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-24 text-right">{t("common.operation")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((review: MentorReview) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">#{review.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.mentor?.avatarUrl} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {review.mentor?.name?.charAt(0) || "M"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {review.mentor?.name || t("common.noDataAvailable")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={review.user?.avatarUrl} />
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                              {review.user?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {review.user?.name || t("common.noDataAvailable")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{review.session?.id}</Badge>
                      </TableCell>
                      <TableCell>
                        <StarRating value={review.rating || 0} readOnly size="sm" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleViewDetail(review)}>
                            <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDeleteClick(review)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="mt-4 flex items-center justify-end rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <PaginationControl
                  pagination={pagination}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    pagination.goToFirstPage();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("common.reviewDetails")}
              {selectedReview?.id}
            </DialogTitle>
            <DialogDescription>
              {t("common.reviewFromMentor")} {selectedReview?.mentor?.name}
              {" -> "}
              {t("common.candidate")} {selectedReview?.user?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <StarRating value={selectedReview.rating || 0} readOnly size="lg" />
              </div>

              {selectedReview.situationNote && (
                <div>
                  <h4 className="mb-1 font-medium text-emerald-600">{t("common.situation")}</h4>
                  <p className="rounded bg-emerald-50 p-3 text-sm dark:bg-emerald-900/20">
                    {selectedReview.situationNote}
                  </p>
                </div>
              )}

              {selectedReview.taskNote && (
                <div>
                  <h4 className="mb-1 font-medium text-blue-600">{t("common.mission")}</h4>
                  <p className="rounded bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
                    {selectedReview.taskNote}
                  </p>
                </div>
              )}

              {selectedReview.actionNote && (
                <div>
                  <h4 className="mb-1 font-medium text-purple-600">{t("common.act")}</h4>
                  <p className="rounded bg-purple-50 p-3 text-sm dark:bg-purple-900/20">
                    {selectedReview.actionNote}
                  </p>
                </div>
              )}

              {selectedReview.resultNote && (
                <div>
                  <h4 className="mb-1 font-medium text-amber-600">{t("common.result")}</h4>
                  <p className="rounded bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
                    {selectedReview.resultNote}
                  </p>
                </div>
              )}

              {selectedReview.strength && (
                <div>
                  <h4 className="mb-1 font-medium text-green-600">{t("common.strengths")}</h4>
                  <p className="rounded bg-green-50 p-3 text-sm dark:bg-green-900/20">
                    {selectedReview.strength}
                  </p>
                </div>
              )}

              {selectedReview.weakness && (
                <div>
                  <h4 className="mb-1 font-medium text-red-600">
                    {t("adminReviewmanagement.weakness")}
                  </h4>
                  <p className="rounded bg-red-50 p-3 text-sm dark:bg-red-900/20">
                    {selectedReview.weakness}
                  </p>
                </div>
              )}

              {selectedReview.improve && (
                <div>
                  <h4 className="mb-1 font-medium text-indigo-600">
                    {t("common.suggestedImprovements")}
                  </h4>
                  <p className="rounded bg-indigo-50 p-3 text-sm dark:bg-indigo-900/20">
                    {selectedReview.improve}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
