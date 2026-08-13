import { PaginationControl, ReloadButton } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpinnerBlock } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApplicationDetails } from "@/hooks/useAdminApplicationDetails";
import { useAssignMentor, useAssignMentors } from "@/hooks/useApplicationDetails";
import { useMentors } from "@/hooks/useMentor";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import type { AdminApplicationDetailResponse } from "@/services/admin-application.manager";
import {
  AlertTriangle,
  BadgeDollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  Inbox,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type StatusFilter = "AWAITING_MENTOR" | "AWAITING_CANDIDATE_SELECT_MENTOR" | "ALL";

type AdminDetailItem = AdminApplicationDetailResponse;

function sortByOldestFirst(a: AdminDetailItem, b: AdminDetailItem): number {
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return aTime - bTime;
}

function renderStatusBadge(detail: AdminDetailItem, t: (_key: string) => string) {
  const status = detail.status;
  if (status === "AWAITING_MENTOR") {
    return (
      <Badge
        variant="outline"
        className="w-fit gap-1 border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
        <Clock className="h-3 w-3" />
        <span>
          {t("adminMentorReviewAssignment.statusBadge.needsAssignment", "Chờ gán Mentor")}
        </span>
      </Badge>
    );
  }
  if (status === "AWAITING_CANDIDATE_SELECT_MENTOR") {
    return (
      <Badge
        variant="outline"
        className="w-fit gap-1 border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/60 dark:text-blue-300">
        <Users className="h-3 w-3" />
        <span>{t("adminMentorReviewAssignment.statusBadge.awaitingCandidate", "Chờ UV chọn")}</span>
      </Badge>
    );
  }
  if (status === "SLOT_PICKED" || (detail.mentorId != null && status !== "PENDING")) {
    return (
      <Badge
        variant="outline"
        className="w-fit gap-1 border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
        <UserCheck className="h-3 w-3" />
        <span>{t("adminMentorReviewAssignment.statusBadge.assigned", "Đã chọn lịch")}</span>
      </Badge>
    );
  }
  if (status === "AI_EVALUATED") {
    return (
      <Badge
        variant="outline"
        className="w-fit gap-1 border-indigo-200/80 bg-indigo-50/80 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
        <Sparkles className="h-3 w-3 text-indigo-500" />
        <span>AI đã chấm</span>
      </Badge>
    );
  }
  if (status === "SUBMITTED") {
    return (
      <Badge
        variant="outline"
        className="w-fit gap-1 border-purple-200/80 bg-purple-50/80 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/60 dark:text-purple-300">
        <CheckCircle2 className="h-3 w-3 text-purple-500" />
        <span>Đã nộp bài</span>
      </Badge>
    );
  }
  if (status === "COMPLETED") {
    return (
      <Badge
        variant="outline"
        className="w-fit gap-1 border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        <span>Hoàn thành</span>
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="w-fit border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      {status ?? "Đang xử lý"}
    </Badge>
  );
}

export function MentorReviewAssignmentPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("AWAITING_MENTOR");

  const [selectedDetail, setSelectedDetail] = useState<AdminDetailItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: applicationDetails = [],
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useAdminApplicationDetails();

  const assignMentorMutation = useAssignMentor({
    onSuccess: () => {
      setIsDialogOpen(false);
      setSelectedDetail(null);
      void refetch();
    },
  });

  const assignMentorsMutation = useAssignMentors({
    onSuccess: () => {
      setIsDialogOpen(false);
      setSelectedDetail(null);
      void refetch();
    },
  });

  const counts = useMemo(() => {
    let awaitingMentor = 0;
    let awaitingCandidateSelect = 0;
    for (const d of applicationDetails) {
      if (d.status === "AWAITING_MENTOR") awaitingMentor++;
      else if (d.status === "AWAITING_CANDIDATE_SELECT_MENTOR") awaitingCandidateSelect++;
    }
    return {
      awaitingMentor,
      awaitingCandidateSelect,
      all: awaitingMentor + awaitingCandidateSelect,
    };
  }, [applicationDetails]);

  const filteredDetails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const byStatus = applicationDetails.filter((detail) => {
      if (statusFilter === "ALL") {
        return (
          detail.status === "AWAITING_MENTOR" ||
          detail.status === "AWAITING_CANDIDATE_SELECT_MENTOR"
        );
      }
      return detail.status === statusFilter;
    });

    if (!q) return [...byStatus].sort(sortByOldestFirst);

    return byStatus
      .filter((detail) => {
        const haystack = [
          String(detail.id ?? ""),
          String(detail.applicationId ?? ""),
          String(detail.roundId ?? ""),
          detail.candidateName ?? "",
          detail.candidateEmail ?? "",
          detail.jdTitle ?? "",
          detail.roundName ?? "",
          ((detail as Record<string, unknown>).companyName as string) ?? "",
          ((detail as Record<string, unknown>).company_name as string) ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(sortByOldestFirst);
  }, [applicationDetails, searchQuery, statusFilter]);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_mentorreviewassignment_mentorreviewassignmentpage_tsx_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({
    totalCount: filteredDetails.length,
    pageSize,
  });

  const pageData = useMemo(
    () => filteredDetails.slice(pagination.startIndex, pagination.endIndex + 1),
    [filteredDetails, pagination.startIndex, pagination.endIndex]
  );

  const handleAssign = async (mentorId: number, _notes: string) => {
    void _notes;
    if (!selectedDetail?.id) return;

    try {
      await assignMentorMutation.mutateAsync({
        applicationDetailId: selectedDetail.id,
        mentorId,
      });
    } catch {
      // Error handled by hook
    }
  };

  const handleAssignMultiple = async (mentorIds: number[]) => {
    if (!selectedDetail?.id) return;

    try {
      await assignMentorsMutation.mutateAsync({
        applicationDetailId: selectedDetail.id,
        mentorIds,
      });
    } catch {
      // Error handled by hook
    }
  };

  const openAssignDialog = (detail: AdminDetailItem) => {
    setSelectedDetail(detail);
    setIsDialogOpen(true);
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      {/* Content */}
      <div className="flex flex-1 flex-col overflow-auto bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
        {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
        <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("adminMentorReviewAssignment.pageTitle")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t("adminMentorReviewAssignment.pageDescription")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              {[
                [
                  counts.awaitingMentor,
                  t("adminMentorReviewAssignment.filterAwaitingMentor", "Chờ gán"),
                ],
                [
                  counts.awaitingCandidateSelect,
                  t("adminMentorReviewAssignment.filterAwaitingCandidateSelect", "Chờ UV chọn"),
                ],
                [counts.all, t("common.total", "Tổng cộng")],
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
                type="search"
                placeholder={t("adminMentorReviewAssignment.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded p-1">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <Search className="mr-2 h-[18px] w-[18px]" />
              {t("common.search", "Tìm kiếm")}
            </Button>
            <ReloadButton
              onReload={() => void refetch()}
              isLoading={isRefetching}
              size="sm"
              className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
            />
          </form>

          {/* Status Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {t("common.status", "Trạng thái")}:
            </span>
            {[
              [
                "AWAITING_MENTOR",
                t("adminMentorReviewAssignment.filterAwaitingMentor", "Chờ gán Mentor"),
                counts.awaitingMentor,
              ],
              [
                "AWAITING_CANDIDATE_SELECT_MENTOR",
                t("adminMentorReviewAssignment.filterAwaitingCandidateSelect", "Chờ UV chọn"),
                counts.awaitingCandidateSelect,
              ],
              ["ALL", t("adminMentorReviewAssignment.filterAll", "Tất cả"), counts.all],
            ].map(([value, label, count]) => (
              <button
                key={value as string}
                type="button"
                onClick={() => {
                  setStatusFilter(value as StatusFilter);
                  pagination.goToFirstPage();
                }}
                className={`cursor-pointer rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                  statusFilter === value
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                }`}>
                {label as string} ({count as number})
              </button>
            ))}
          </div>
        </div>

        {/* Table card */}
        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SpinnerBlock label={t("common.loading")} />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  {t("adminMentorReviewAssignment.loadError")}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => void refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  {t("common.retry")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredDetails.length === 0 ? (
          <div className="border-border flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-white dark:border-slate-700 dark:bg-slate-900/50">
            <Inbox className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-sm font-medium">
              {t("adminMentorReviewAssignment.noPendingAssignments")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                  <TableHead className="w-[70px] min-w-[70px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                    {t("common.id", "ID")}
                  </TableHead>
                  <TableHead className="w-[22%] min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminMentorReviewAssignment.candidate", "Ứng viên")}
                  </TableHead>
                  <TableHead className="w-[26%] min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    Công ty & Vị trí tuyển dụng
                  </TableHead>
                  <TableHead className="w-[16%] min-w-[140px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminMentorReviewAssignment.roundName", "Vòng & Điểm AI")}
                  </TableHead>
                  <TableHead className="w-[15%] min-w-[130px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("common.status", "Trạng thái")}
                  </TableHead>
                  <TableHead className="w-[15%] min-w-[140px] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminMentorReviewAssignment.action", "Thao tác")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((detail) => {
                  const status = detail.status;
                  const isAwaitingMentor = status === "AWAITING_MENTOR";
                  const isAwaitingCandidate = status === "AWAITING_CANDIDATE_SELECT_MENTOR";
                  const hasRoom = status === "PENDING" && detail.sessionId != null;

                  const companyName =
                    ((detail as Record<string, unknown>).companyName as string) ||
                    ((detail as Record<string, unknown>).company_name as string) ||
                    ((detail as Record<string, unknown>).company as string) ||
                    "Công ty tuyển dụng";

                  const companyLogo =
                    ((detail as Record<string, unknown>).companyLogoUrl as string) ||
                    ((detail as Record<string, unknown>).companyLogo as string) ||
                    ((detail as Record<string, unknown>).company_logo_url as string) ||
                    ((detail as Record<string, unknown>).company_logo as string);

                  return (
                    <TableRow
                      key={detail.id}
                      className="group border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                      {/* ID */}
                      <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>#{detail.id}</span>
                          <div
                            className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                            aria-hidden="true">
                            <div className="h-3.5 w-3.5"></div>
                            <div className="h-3.5 w-3.5"></div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Candidate */}
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                            {detail.candidateAvatarUrl ? (
                              <AvatarImage
                                src={detail.candidateAvatarUrl}
                                alt={detail.candidateName || ""}
                                className="object-cover"
                              />
                            ) : null}
                            <AvatarFallback className="rounded-[14px] bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                              {(detail.candidateName ?? detail.candidateEmail ?? "?")
                                .charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-slate-900 dark:text-white">
                              {detail.candidateName ?? "-"}
                            </div>
                            {detail.candidateEmail && (
                              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {detail.candidateEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Company & Job Description */}
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                            {companyLogo ? (
                              <AvatarImage
                                src={companyLogo}
                                alt={companyName}
                                className="object-cover"
                              />
                            ) : null}
                            <AvatarFallback className="rounded-[14px] bg-sky-50 text-xs font-semibold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                              {companyName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-slate-900 dark:text-white">
                              {companyName}
                            </div>
                            <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                              {detail.jdTitle ?? "-"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Round & AI Score */}
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {detail.roundName ?? "-"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {detail.roundOrder && (
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Vòng {detail.roundOrder}
                              </span>
                            )}
                            {detail.aiScore != null && (
                              <Badge
                                variant="outline"
                                className="border-indigo-200 bg-indigo-50/70 font-mono text-[11px] font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
                                AI: {detail.aiScore.toFixed(1)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          {renderStatusBadge(detail, t)}
                          {hasRoom && (
                            <Badge
                              variant="outline"
                              className="w-fit gap-1 border-emerald-200 bg-emerald-50/70 text-[10px] font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {t("adminMentorReviewAssignment.roomCreated", "Phòng đã tạo")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAwaitingMentor && (
                            <Button
                              size="sm"
                              onClick={() => openAssignDialog(detail)}
                              className="h-8 gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700">
                              <UserPlus className="h-3.5 w-3.5" />
                              <span>{t("adminKiosk.assignMentor", "Gán Mentor")}</span>
                            </Button>
                          )}
                          {isAwaitingCandidate && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignDialog(detail)}
                              className="h-8 gap-1.5 rounded-xl border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-300">
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>{t("adminMentorReviewAssignment.reassign", "Đổi Mentor")}</span>
                            </Button>
                          )}
                          {!isAwaitingMentor && !isAwaitingCandidate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAssignDialog(detail)}
                              className="h-8 gap-1 rounded-xl px-2.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                              <Eye className="h-3.5 w-3.5" />
                              <span>Xem</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredDetails.length > 0 && (
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
          </div>
        )}
      </div>

      {/* Assign Mentor Dialog */}
      <AssignMentorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        detail={selectedDetail}
        onAssign={handleAssign}
        onAssignMultiple={handleAssignMultiple}
        isLoading={assignMentorMutation.isPending || assignMentorsMutation.isPending}
      />
    </div>
  );
}

// ============================================================
// Assign Mentor Dialog (simplified for ApplicationDetail)
// Supports Option 1: Assign single mentor (Radix Popover searchable combobox)
// Supports Option 2: Assign multiple mentors for candidate to choose (with search & selected chips)
// ============================================================

interface AssignMentorDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  detail: AdminDetailItem | null;
  onAssign: (_mentorId: number, _notes: string) => void;
  onAssignMultiple: (_mentorIds: number[]) => void;
  isLoading?: boolean;
}

function AssignMentorDialog({
  open,
  onOpenChange,
  detail,
  onAssign,
  onAssignMultiple,
  isLoading,
}: AssignMentorDialogProps) {
  const { t } = useTranslation();
  const [assignMode, setAssignMode] = useState<"single" | "multiple">("single");
  const [selectedMentorId, setSelectedMentorId] = useState<string>("");
  const [selectedMentorIds, setSelectedMentorIds] = useState<number[]>([]);
  const [mentorSearchQuery, setMentorSearchQuery] = useState("");
  const [notes, setNotes] = useState("");

  const { data: mentors = [] } = useMentors();

  // Filter mentors based on search query
  const filteredMentors = useMemo(() => {
    if (!mentorSearchQuery.trim()) return mentors;
    const q = mentorSearchQuery.toLowerCase();
    return mentors.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.currentCompany?.toLowerCase().includes(q) ||
        m.expertise?.toLowerCase().includes(q)
    );
  }, [mentors, mentorSearchQuery]);

  // Active mentor object for single view or detail preview
  const activeMentor = useMemo(() => {
    if (!selectedMentorId) return null;
    return mentors.find((m) => String(m.id) === selectedMentorId) ?? null;
  }, [mentors, selectedMentorId]);

  const handleSubmitSingle = () => {
    const mentorId = parseInt(selectedMentorId, 10);
    if (!mentorId || isNaN(mentorId)) {
      toast.error(t("adminMentorReviewAssignment.pleaseSelectMentor", "Vui lòng chọn Mentor"));
      return;
    }
    onAssign(mentorId, notes);
    resetForm();
  };

  const handleSubmitMultiple = () => {
    if (selectedMentorIds.length < 2) {
      toast.error(
        t(
          "adminMentorReviewAssignment.pleaseSelectAtLeast2Mentors",
          "Vui lòng chọn ít nhất 2 Mentor"
        )
      );
      return;
    }
    onAssignMultiple(selectedMentorIds);
    resetForm();
  };

  const resetForm = () => {
    setSelectedMentorId("");
    setSelectedMentorIds([]);
    setNotes("");
    setAssignMode("single");
    setMentorSearchQuery("");
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      resetForm();
    }
    onOpenChange(openState);
  };

  const toggleMentorSelection = (mentorId: number) => {
    setSelectedMentorIds((prev) =>
      prev.includes(mentorId) ? prev.filter((id) => id !== mentorId) : [...prev, mentorId]
    );
  };

  const companyName =
    ((detail as Record<string, unknown> | null)?.companyName as string) ||
    ((detail as Record<string, unknown> | null)?.company_name as string) ||
    ((detail as Record<string, unknown> | null)?.company as string) ||
    "Công ty tuyển dụng";

  const companyLogo =
    ((detail as Record<string, unknown> | null)?.companyLogoUrl as string) ||
    ((detail as Record<string, unknown> | null)?.companyLogo as string) ||
    ((detail as Record<string, unknown> | null)?.company_logo_url as string) ||
    ((detail as Record<string, unknown> | null)?.company_logo as string);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] w-[95vw] gap-0 overflow-hidden rounded-2xl border border-slate-200/90 p-0 shadow-2xl sm:max-w-4xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <DialogHeader className="border-b border-slate-100 bg-white p-5 pb-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {t("adminKiosk.assignMentor", "Gán Mentor Phỏng vấn")}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "adminMentorReviewAssignment.assignDescription",
                  "Lựa chọn hoặc đề xuất Mentor phù hợp để tham gia đánh giá ứng viên."
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Content Body */}
        <div className="flex max-h-[calc(92vh-130px)] flex-col gap-4 overflow-y-auto bg-slate-50/50 p-5 dark:bg-slate-950/40">
          {/* Candidate Summary Context Banner */}
          {detail && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-800">
                    {detail.candidateAvatarUrl ? (
                      <AvatarImage src={detail.candidateAvatarUrl} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="rounded-xl bg-indigo-50 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {(detail.candidateName ?? detail.candidateEmail ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-bold text-slate-900 dark:text-white">
                        {detail.candidateName ?? "-"}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-400">
                        #{detail.id}
                      </span>
                    </div>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {detail.candidateEmail ?? "-"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-800/60">
                    <Avatar className="h-5 w-5 shrink-0 rounded-md">
                      {companyLogo ? <AvatarImage src={companyLogo} /> : null}
                      <AvatarFallback className="bg-sky-100 text-[10px] font-bold text-sky-700">
                        {companyName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {companyName}
                    </span>
                  </div>

                  {detail.jdTitle && (
                    <Badge
                      variant="secondary"
                      className="bg-slate-100 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {detail.jdTitle}
                    </Badge>
                  )}

                  {detail.roundName && (
                    <Badge
                      variant="outline"
                      className="border-indigo-200 bg-indigo-50/70 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {detail.roundName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mode Switcher Segmented Pills */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setAssignMode("single")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                assignMode === "single"
                  ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-600"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}>
              <UserCheck className="h-3.5 w-3.5" />
              <span>Gán 1 Mentor chính thức</span>
            </button>
            <button
              type="button"
              onClick={() => setAssignMode("multiple")}
              className={cn(
                "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                assignMode === "multiple"
                  ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-600"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}>
              <Users className="h-3.5 w-3.5" />
              <span>Đề xuất danh sách (UV tự chọn)</span>
            </button>
          </div>

          {/* 2-Column Workspace Layout */}
          <div className="grid min-h-[380px] grid-cols-1 items-start gap-4 lg:grid-cols-12">
            {/* LEFT COLUMN (5/12) - Search & Mentor List Selector */}
            <div className="flex max-h-[440px] flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300">
                  {assignMode === "single"
                    ? "Chọn Mentor"
                    : `Chọn danh sách (${selectedMentorIds.length})`}
                </span>
                {assignMode === "multiple" && selectedMentorIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMentorIds([])}
                    className="h-6 px-2 text-[11px] text-slate-500 hover:text-red-600">
                    Bỏ chọn tất cả
                  </Button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm theo tên, email, kỹ năng..."
                  value={mentorSearchQuery}
                  onChange={(e) => setMentorSearchQuery(e.target.value)}
                  className="h-9 rounded-lg border-slate-200 pl-8 text-xs dark:border-slate-800"
                />
              </div>

              {/* Mentors Scroll Area */}
              <div className="flex max-h-[340px] flex-col gap-2 overflow-y-auto pr-1">
                {filteredMentors.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <User className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-xs text-slate-500">
                      {t("common.noResults", "Không tìm thấy mentor")}
                    </p>
                  </div>
                ) : (
                  filteredMentors.map((mentor) => {
                    const isSelectedSingle = selectedMentorId === String(mentor.id);
                    const isSelectedMulti =
                      mentor.id != null && selectedMentorIds.includes(mentor.id);

                    return (
                      <div
                        key={mentor.id}
                        onClick={() => {
                          if (assignMode === "single") {
                            setSelectedMentorId(String(mentor.id));
                          } else if (mentor.id) {
                            toggleMentorSelection(mentor.id);
                            setSelectedMentorId(String(mentor.id));
                          }
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all",
                          assignMode === "single" && isSelectedSingle
                            ? "border-indigo-600 bg-indigo-50/70 shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/40"
                            : assignMode === "multiple" && isSelectedMulti
                              ? "border-indigo-600 bg-indigo-50/50 shadow-2xs dark:border-indigo-500 dark:bg-indigo-950/30"
                              : "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                        )}>
                        {assignMode === "multiple" && (
                          <Checkbox
                            checked={isSelectedMulti}
                            onCheckedChange={() => mentor.id && toggleMentorSelection(mentor.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                        )}

                        <Avatar className="h-9 w-9 shrink-0 rounded-lg border border-slate-200/90 dark:border-slate-800">
                          {mentor.avatarUrl ? (
                            <AvatarImage src={mentor.avatarUrl} className="object-cover" />
                          ) : null}
                          <AvatarFallback className="rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {mentor.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                              {mentor.name}
                            </p>
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {mentor.averageRating?.toFixed(1) ?? "4.8"}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {mentor.currentCompany || mentor.email}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN (7/12) - Mentor Profile Dossier & Notes */}
            <div className="flex min-h-[440px] flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
              {activeMentor ? (
                <div className="flex flex-1 flex-col gap-4">
                  {/* Mentor Profile Header */}
                  <div className="flex items-start gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
                    <Avatar className="h-14 w-14 shrink-0 rounded-2xl border-2 border-slate-200 shadow-sm dark:border-slate-800">
                      {activeMentor.avatarUrl ? (
                        <AvatarImage src={activeMentor.avatarUrl} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {activeMentor.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {activeMentor.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Mentor
                        </Badge>
                      </div>

                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {activeMentor.email}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                        {activeMentor.currentCompany && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            {activeMentor.currentCompany}
                          </span>
                        )}
                        {typeof activeMentor.pricePerMinute === "number" &&
                          activeMentor.pricePerMinute > 0 && (
                            <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                              <BadgeDollarSign className="h-3.5 w-3.5" />
                              {activeMentor.pricePerMinute.toLocaleString("vi-VN")}đ/phút
                            </span>
                          )}
                        <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {activeMentor.averageRating?.toFixed(1) ?? "4.8"} / 5.0
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expertise / Skills */}
                  {activeMentor.expertise && (
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Chuyên môn & Kỹ năng
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {activeMentor.expertise.split(",").map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-slate-100 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {activeMentor.bio && (
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                        Giới thiệu bản thân
                      </span>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {activeMentor.bio}
                      </p>
                    </div>
                  )}

                  {/* Admin Note Input */}
                  <div className="mt-auto border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Label
                      htmlFor="admin-assign-notes"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Ghi chú thêm cho phân công (Không bắt buộc)
                    </Label>
                    <Textarea
                      id="admin-assign-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Nhập ghi chú yêu cầu bổ sung đối với Mentor..."
                      rows={2}
                      className="mt-1.5 resize-none rounded-xl border-slate-200 text-xs dark:border-slate-800"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <UserPlus className="h-7 w-7" />
                  </div>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chọn một Mentor để xem hồ sơ
                  </h5>
                  <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                    Nhấp vào danh sách mentor bên trái để xem đầy đủ thông tin chuyên môn và đưa ra
                    quyết định gán phù hợp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 px-5 dark:border-slate-800 dark:bg-slate-900">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-10 rounded-xl px-4 text-xs font-semibold">
            {t("common.cancel", "Hủy")}
          </Button>

          {assignMode === "single" ? (
            <Button
              type="button"
              onClick={handleSubmitSingle}
              disabled={isLoading || !selectedMentorId}
              className="h-10 gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700">
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Xác nhận Gán Mentor</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmitMultiple}
              disabled={isLoading || selectedMentorIds.length < 2}
              className="h-10 gap-2 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700">
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  <span>Gửi Đề xuất ({selectedMentorIds.length} Mentor)</span>
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
