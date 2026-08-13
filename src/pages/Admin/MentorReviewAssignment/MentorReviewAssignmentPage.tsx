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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  ChevronDown,
  Clock,
  Eye,
  Inbox,
  Mail,
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
                [counts.awaitingMentor, t("adminMentorReviewAssignment.filterAwaitingMentor")],
                [
                  counts.awaitingCandidateSelect,
                  t("adminMentorReviewAssignment.filterAwaitingCandidateSelect"),
                ],
                [counts.slotPicked, t("adminMentorReviewAssignment.filterSlotPicked")],
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
  const [selectedMentorForDetail, setSelectedMentorForDetail] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  // Combobox (Option 1) state
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [mentorQuery, setMentorQuery] = useState("");

  // Option 2 search state
  const [mentorMultiQuery, setMentorMultiQuery] = useState("");

  const { data: mentors = [] } = useMentors();

  // Filtered mentors for Option 1 combobox
  const filteredSingleMentors = useMemo(() => {
    if (!mentorQuery.trim()) return mentors;
    const q = mentorQuery.toLowerCase();
    return mentors.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [mentors, mentorQuery]);

  // Filtered mentors for Option 2 checklist
  const filteredMultiMentors = useMemo(() => {
    if (!mentorMultiQuery.trim()) return mentors;
    const q = mentorMultiQuery.toLowerCase();
    return mentors.filter(
      (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [mentors, mentorMultiQuery]);

  // Mentors currently selected in Option 2
  const selectedMentorsObjects = useMemo(() => {
    return mentors.filter((m) => m.id != null && selectedMentorIds.includes(m.id as number));
  }, [mentors, selectedMentorIds]);

  // Selected mentor name for display in trigger
  const selectedMentorName = useMemo(() => {
    if (!selectedMentorId) return null;
    return mentors.find((m) => String(m.id) === selectedMentorId)?.name ?? null;
  }, [mentors, selectedMentorId]);

  const handleSubmitSingle = () => {
    const mentorId = parseInt(selectedMentorId, 10);
    if (!mentorId || isNaN(mentorId)) {
      toast.error(t("adminMentorReviewAssignment.pleaseSelectMentor"));
      return;
    }
    onAssign(mentorId, notes);
    resetForm();
  };

  const handleSubmitMultiple = () => {
    if (selectedMentorIds.length < 2) {
      toast.error(t("adminMentorReviewAssignment.pleaseSelectAtLeast2Mentors"));
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
    setIsComboOpen(false);
    setMentorQuery("");
    setMentorMultiQuery("");
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader className="mb-4 border-b pb-4 dark:border-slate-800">
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <UserCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
            {t("adminKiosk.assignMentor")}
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {t("adminMentorReviewAssignment.assignDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 lg:grid-cols-2">
          {/* Candidate info */}
          {detail && (
            <div className="rounded-lg border bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t("adminMentorReviewAssignment.candidateInfo")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {detail.candidateAvatarUrl ? (
                    <img
                      src={detail.candidateAvatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (detail.candidateName ?? detail.candidateEmail ?? "?")
                      ?.charAt(0)
                      .toUpperCase() || "?"
                  )}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                    {detail.candidateName ?? detail.candidateEmail ?? "-"}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {detail.candidateEmail ?? "-"}
                  </p>
                  {((detail as Record<string, unknown>).companyName ||
                    (detail as Record<string, unknown>).company_name ||
                    detail.jdTitle ||
                    detail.roundName) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {((detail as Record<string, unknown>).companyName ||
                        (detail as Record<string, unknown>).company_name) && (
                        <span className="flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                          {
                            ((detail as Record<string, unknown>).companyName ||
                              (detail as Record<string, unknown>).company_name) as string
                          }
                        </span>
                      )}
                      {detail.jdTitle && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {detail.jdTitle}
                        </span>
                      )}
                      {detail.roundName && (
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {detail.roundName}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Assignment mode selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("adminMentorReviewAssignment.assignmentMode")}
            </Label>
            <RadioGroup
              value={assignMode}
              onValueChange={(value) => setAssignMode(value as "single" | "multiple")}
              className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-lg border bg-white p-4 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                <RadioGroupItem value="single" id="mode-single" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="mode-single"
                    className="cursor-pointer font-medium dark:text-slate-100">
                    {t("adminMentorReviewAssignment.option1Single")}
                  </Label>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("adminMentorReviewAssignment.option1SingleDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-white p-4 transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/50">
                <RadioGroupItem value="multiple" id="mode-multiple" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="mode-multiple"
                    className="cursor-pointer font-medium dark:text-slate-100">
                    {t("adminMentorReviewAssignment.option2Multiple")}
                  </Label>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t("adminMentorReviewAssignment.option2MultipleDesc")}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Option 1: Single mentor selection with detail panel */}
          {assignMode === "single" && (
            <div className="space-y-4 lg:col-span-2">
              {/* Two column layout: Left=Combobox(1/3), Right=Detail(2/3) */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* LEFT - Mentor Combobox */}
                <div className="space-y-3 lg:col-span-1">
                  <Label htmlFor="mentor-combobox-trigger">
                    {t("adminMentorReviewAssignment.selectMentor")}
                  </Label>

                  <Popover open={isComboOpen} onOpenChange={setIsComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="mentor-combobox-trigger"
                        variant="outline"
                        role="combobox"
                        aria-expanded={isComboOpen}
                        className={cn(
                          "h-10 w-full justify-between px-3 text-sm font-normal shadow-sm",
                          !selectedMentorName && "text-muted-foreground"
                        )}>
                        <span className="truncate">
                          {selectedMentorName ?? t("adminMentorReviewAssignment.selectMentor")}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
                            isComboOpen && "rotate-180"
                          )}
                        />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                      className="w-[var(--radix-popover-trigger-width)] p-0 shadow-md"
                      align="start">
                      {/* Search input inside dropdown */}
                      <div className="border-b p-2">
                        <div className="relative">
                          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          <Input
                            autoFocus
                            placeholder={t("adminMentorReviewAssignment.searchMentorPlaceholder")}
                            value={mentorQuery}
                            onChange={(e) => setMentorQuery(e.target.value)}
                            className="h-8 pl-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Mentor list */}
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        className="max-h-52 touch-auto overflow-y-auto overscroll-contain py-1">
                        {filteredSingleMentors.length === 0 ? (
                          <p className="py-3 text-center text-sm text-slate-500">
                            {t("common.noResults")}
                          </p>
                        ) : (
                          filteredSingleMentors.map((mentor) => (
                            <button
                              key={mentor.id}
                              type="button"
                              onClick={() => {
                                setSelectedMentorId(String(mentor.id));
                                setIsComboOpen(false);
                                setMentorQuery("");
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                                selectedMentorId === String(mentor.id) &&
                                  "bg-slate-100 font-medium dark:bg-slate-800"
                              )}>
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {mentor.avatarUrl ? (
                                  <img
                                    src={mentor.avatarUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  mentor.name?.charAt(0).toUpperCase() || "?"
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{mentor.name}</p>
                                {mentor.email && (
                                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {mentor.email}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* RIGHT - Selected Mentor Detail Panel */}
                <div className="rounded-lg border bg-white p-5 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
                  {selectedMentorId ? (
                    (() => {
                      const m = mentors.find((x) => String(x.id) === selectedMentorId);
                      if (!m) return null;
                      return (
                        <div className="space-y-5">
                          {/* Header */}
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-2xl font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                m.name?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xl font-semibold dark:text-slate-100">
                                {m.name}
                              </h4>
                              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                {m.email}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  <User className="h-3 w-3" />
                                  Mentor
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {m.email}
                              </span>
                            </div>
                            {m.currentCompany && (
                              <div className="flex items-center gap-3">
                                <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {m.currentCompany}
                                </span>
                              </div>
                            )}
                            {typeof m.pricePerMinute === "number" && m.pricePerMinute > 0 && (
                              <div className="flex items-center gap-3">
                                <BadgeDollarSign className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {m.pricePerMinute.toLocaleString("vi-VN")}đ / phút
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Expertise */}
                          {m.expertise && (
                            <div>
                              <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                {t("adminMentorReviewAssignment.expertise")}
                              </p>
                              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {m.expertise}
                              </p>
                            </div>
                          )}

                          {/* Bio */}
                          {m.bio && (
                            <div>
                              <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                {t("adminMentorReviewAssignment.bio")}
                              </p>
                              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {m.bio}
                              </p>
                            </div>
                          )}

                          {/* Rating */}
                          <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                {m.averageRating?.toFixed(1) ?? "4.5"}
                              </span>
                            </div>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {t("adminMentorReviewAssignment.rating")}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                        <User className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("adminMentorReviewAssignment.selectMentorToView")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes section for Option 1 */}
              <div className="grid gap-2">
                <Label htmlFor="notes">{t("adminKiosk.notes")}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("adminKiosk.notesPlaceholder")}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          {/* Option 2: Multiple mentor selection - Left list, Right detail */}
          {assignMode === "multiple" && (
            <div className="space-y-4 lg:col-span-2">
              <div>
                <Label className="text-base font-semibold">
                  {t("adminMentorReviewAssignment.selectMentors")}
                </Label>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("adminMentorReviewAssignment.selectMentorsHint")}
                </p>
              </div>

              {/* Selected Badges */}
              {selectedMentorsObjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {t("adminMentorReviewAssignment.selectedMentors")}:
                  </span>
                  {selectedMentorsObjects.map((mentor) => (
                    <Badge
                      key={mentor.id}
                      variant="secondary"
                      className="flex items-center gap-2 border bg-white py-1.5 pr-2 pl-3 text-sm dark:border-slate-600 dark:bg-slate-700">
                      {mentor.name}
                      <button
                        type="button"
                        onClick={() => mentor.id && toggleMentorSelection(mentor.id)}
                        className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-600 dark:hover:text-red-400">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Two column layout: Left=1/3, Right=2/3 */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* LEFT - Mentor List (smaller) */}
                <div className="space-y-3 lg:col-span-1">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={t("adminMentorReviewAssignment.searchMentorPlaceholder")}
                      value={mentorMultiQuery}
                      onChange={(e) => setMentorMultiQuery(e.target.value)}
                      className="h-9 pl-9 text-sm"
                    />
                  </div>

                  {/* Mentor Checklist */}
                  <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-lg border bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                    {filteredMultiMentors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <User className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="mt-2 text-xs text-slate-500">{t("common.noResults")}</p>
                      </div>
                    ) : (
                      filteredMultiMentors.map((mentor) => (
                        <div
                          key={mentor.id}
                          className={cn(
                            "group flex items-center gap-2 rounded-md p-2 transition-colors dark:border-slate-700",
                            selectedMentorForDetail === mentor.id
                              ? "border-primary/50 bg-primary/5 dark:bg-primary/10 border"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          )}>
                          <Checkbox
                            id={`mentor-${mentor.id}`}
                            checked={selectedMentorIds.includes(mentor.id as number)}
                            onCheckedChange={() => mentor.id && toggleMentorSelection(mentor.id)}
                            className="shrink-0"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedMentorForDetail(mentor.id as number)}
                            className="flex flex-1 cursor-pointer items-center gap-2 text-left">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {mentor.avatarUrl ? (
                                <img
                                  src={mentor.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                mentor.name?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium dark:text-slate-100">
                                {mentor.name}
                              </p>
                              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                                {mentor.email}
                              </p>
                            </div>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedMentorIds.length > 0 && (
                    <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                      {t("adminMentorReviewAssignment.selectedCount", {
                        count: selectedMentorIds.length,
                      })}
                    </p>
                  )}
                </div>

                {/* RIGHT - Mentor Detail Panel (larger) */}
                <div className="rounded-lg border bg-white p-5 lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
                  {selectedMentorForDetail ? (
                    (() => {
                      const m = mentors.find((x) => x.id === selectedMentorForDetail);
                      if (!m) return null;
                      return (
                        <div className="space-y-5">
                          {/* Header */}
                          <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-2xl font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {m.avatarUrl ? (
                                <img
                                  src={m.avatarUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                m.name?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xl font-semibold dark:text-slate-100">
                                {m.name}
                              </h4>
                              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                                {m.email}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {selectedMentorIds.includes(selectedMentorForDetail) && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t("adminMentorReviewAssignment.selected")}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  <User className="h-3 w-3" />
                                  Mentor
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2.5 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {m.email}
                              </span>
                            </div>
                            {m.currentCompany && (
                              <div className="flex items-center gap-3">
                                <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {m.currentCompany}
                                </span>
                              </div>
                            )}
                            {typeof m.pricePerMinute === "number" && m.pricePerMinute > 0 && (
                              <div className="flex items-center gap-3">
                                <BadgeDollarSign className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {m.pricePerMinute.toLocaleString("vi-VN")}đ / phút
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Expertise / Skills */}
                          {m.expertise && (
                            <div>
                              <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Chuyên môn
                              </p>
                              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {m.expertise}
                              </p>
                            </div>
                          )}

                          {/* Bio */}
                          {m.bio && (
                            <div>
                              <p className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                                Giới thiệu
                              </p>
                              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {m.bio}
                              </p>
                            </div>
                          )}

                          {/* Rating */}
                          <div className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                {m.averageRating?.toFixed(1) ?? "4.5"}
                              </span>
                            </div>
                            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {m.averageRating?.toFixed(1) ?? "4.5"}
                            </span>
                          </div>

                          {/* Tip */}
                          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              💡 Xem thông tin mentor bên trên để đưa ra quyết định gán mentor phù
                              hợp với ứng viên này.
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                        <Eye className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("adminMentorReviewAssignment.selectMentorToView")}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {t("adminMentorReviewAssignment.selectMentorHint", { icon: "" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-center gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1">
            {t("common.cancel")}
          </Button>
          {assignMode === "single" ? (
            <Button
              onClick={handleSubmitSingle}
              disabled={isLoading || !selectedMentorId}
              className="flex-1">
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("adminKiosk.assigning")}
                </>
              ) : (
                t("adminKiosk.confirmAssign")
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmitMultiple}
              disabled={isLoading || selectedMentorIds.length < 2}
              className="flex-1">
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("adminKiosk.assigning")}
                </>
              ) : (
                t("adminKiosk.confirmAssign")
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
