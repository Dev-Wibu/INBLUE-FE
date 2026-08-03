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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SpinnerBlock } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdminApplicationDetails } from "@/hooks/useAdminApplicationDetails";
import { useAssignMentor, useAssignMentors } from "@/hooks/useApplicationDetails";
import { useMentors } from "@/hooks/useMentor";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { AdminApplicationDetailResponse } from "@/services/admin-application.manager";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Inbox,
  ListFilter,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type MainTab = "AWAITING_MENTOR" | "AWAITING_CANDIDATE_SELECT_MENTOR";
type MoreFilter = "SLOT_PICKED" | "ALL" | null;

/**
 * Two main views the admin actually uses day-to-day:
 * 1. "Chờ gán"  (AWAITING_MENTOR): admin needs to assign a mentor
 * 2. "Chờ UV chọn" (AWAITING_CANDIDATE_SELECT_MENTOR): admin already suggested N
 *    mentors, candidate will pick. Admin must NOT re-assign here.
 *
 * SLOT_PICKED + ALL sit behind a dropdown because they are read-only / archival.
 */
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
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
        <Clock className="h-3 w-3" />
        {t("adminMentorReviewAssignment.statusBadge.needsAssignment")}
      </Badge>
    );
  }
  if (status === "AWAITING_CANDIDATE_SELECT_MENTOR") {
    return (
      <Badge variant="outline" className="gap-1 border-blue-200 bg-blue-50 text-blue-700">
        <Users className="h-3 w-3" />
        {t("adminMentorReviewAssignment.statusBadge.awaitingCandidate")}
      </Badge>
    );
  }
  if (status === "SLOT_PICKED" || (detail.mentorId != null && status !== "PENDING")) {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
        <UserCheck className="h-3 w-3" />
        {t("adminMentorReviewAssignment.statusBadge.assigned")}
      </Badge>
    );
  }
  return <Badge variant="outline">{status ?? "-"}</Badge>;
}

function renderRowAvatar(detail: AdminDetailItem) {
  const name = detail.candidateName ?? detail.candidateEmail ?? "#";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <Avatar className="h-10 w-10">
      {detail.candidateAvatarUrl ? (
        <AvatarImage src={detail.candidateAvatarUrl} alt={name} />
      ) : null}
      <AvatarFallback className="text-xs font-medium">{initials || "?"}</AvatarFallback>
    </Avatar>
  );
}

export function MentorReviewAssignmentPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  // Two main tabs the admin uses daily. Default = AWAITING_MENTOR (most common).
  const [mainTab, setMainTab] = useState<MainTab>("AWAITING_MENTOR");
  // Optional secondary filter (dropdown menu): SLOT_PICKED view, or ALL.
  const [moreFilter, setMoreFilter] = useState<MoreFilter>(null);

  const [selectedDetail, setSelectedDetail] = useState<AdminDetailItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ...rest unchanged

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
    let slotPicked = 0;
    for (const d of applicationDetails) {
      if (d.status === "AWAITING_MENTOR") awaitingMentor++;
      else if (d.status === "AWAITING_CANDIDATE_SELECT_MENTOR") awaitingCandidateSelect++;
      else if (d.status === "SLOT_PICKED") slotPicked++;
    }
    return {
      all: applicationDetails.length,
      awaitingMentor,
      awaitingCandidateSelect,
      slotPicked,
    };
  }, [applicationDetails]);

  // Effective status filter = mainTab (or fallback when moreFilter overrides).
  const activeStatus: MainTab | "SLOT_PICKED" | "ALL" = useMemo(() => {
    if (moreFilter === "SLOT_PICKED") return "SLOT_PICKED";
    if (moreFilter === "ALL") return "ALL";
    return mainTab;
  }, [mainTab, moreFilter]);

  const filteredDetails = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const byStatus = applicationDetails.filter((detail) => {
      if (activeStatus === "ALL") return true;
      return detail.status === activeStatus;
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
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(sortByOldestFirst);
  }, [applicationDetails, searchQuery, activeStatus]);

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

  const moreFilterLabel: Record<Exclude<MoreFilter, null>, string> = {
    SLOT_PICKED: t("adminMentorReviewAssignment.filterSlotPicked"),
    ALL: t("adminMentorReviewAssignment.filterAll"),
  };

  return (
    <div className="bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-border bg-card flex flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              {t("common.administration")}
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              {t("adminMentorReviewAssignment.pageTitle")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("adminMentorReviewAssignment.pageDescription")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder={t("adminMentorReviewAssignment.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
                aria-label={t("common.delete")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <ReloadButton onReload={() => void refetch()} isLoading={isRefetching} size="sm" />
        </div>
      </div>

      {/* Tabs + overflow filter dropdown (compact) */}
      <div className="border-border bg-card flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <Tabs
          value={mainTab}
          onValueChange={(value) => {
            setMainTab(value as MainTab);
            setMoreFilter(null); // switching to a main tab clears the secondary filter
          }}
          className="w-full sm:w-auto">
          <TabsList className="h-9 bg-slate-100 p-0.5 dark:bg-slate-800/60">
            <TabsTrigger
              value="AWAITING_MENTOR"
              className="gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Clock className="h-3.5 w-3.5" />
              {t("adminMentorReviewAssignment.filterAwaitingMentor")}
              <Badge
                variant={mainTab === "AWAITING_MENTOR" && !moreFilter ? "secondary" : "outline"}
                className={cn(
                  "ml-1 h-5 min-w-[20px] justify-center px-1.5 text-[10px]",
                  mainTab === "AWAITING_MENTOR" && !moreFilter
                    ? "bg-white/30 text-white"
                    : "bg-amber-100 text-amber-700"
                )}>
                {counts.awaitingMentor}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="AWAITING_CANDIDATE_SELECT_MENTOR"
              className="gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Users className="h-3.5 w-3.5" />
              {t("adminMentorReviewAssignment.filterAwaitingCandidateSelect")}
              <Badge
                variant={
                  mainTab === "AWAITING_CANDIDATE_SELECT_MENTOR" && !moreFilter
                    ? "secondary"
                    : "outline"
                }
                className={cn(
                  "ml-1 h-5 min-w-[20px] justify-center px-1.5 text-[10px]",
                  mainTab === "AWAITING_CANDIDATE_SELECT_MENTOR" && !moreFilter
                    ? "bg-white/30 text-white"
                    : "bg-blue-100 text-blue-700"
                )}>
                {counts.awaitingCandidateSelect}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <ListFilter className="h-3.5 w-3.5" />
              {moreFilter ? moreFilterLabel[moreFilter] : t("adminMentorReviewAssignment.more")}
              {moreFilter && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {moreFilter === "ALL" ? counts.all : counts.slotPicked}
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              {t("adminMentorReviewAssignment.more")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => {
                setMoreFilter(null);
                setMainTab("AWAITING_MENTOR");
              }}
              className="gap-2">
              <X className="text-muted-foreground h-3.5 w-3.5" />
              <span className="flex-1">{t("adminMentorReviewAssignment.moreDefault")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setMoreFilter("SLOT_PICKED");
                setMainTab("AWAITING_MENTOR");
              }}
              className="gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="flex-1">{t("adminMentorReviewAssignment.filterSlotPicked")}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {counts.slotPicked}
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setMoreFilter("ALL");
                setMainTab("AWAITING_MENTOR");
              }}
              className="gap-2">
              <Eye className="text-muted-foreground h-3.5 w-3.5" />
              <span className="flex-1">{t("adminMentorReviewAssignment.filterAll")}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {counts.all}
              </Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="p-4 sm:px-6 sm:py-6">
        {isLoading ? (
          <SpinnerBlock label={t("common.loading")} />
        ) : error ? (
          <Card className="border-red-200 bg-red-50/40">
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
          <div className="border-border flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed">
            <Inbox className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-sm font-medium">
              {t("adminMentorReviewAssignment.noPendingAssignments")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="border-border bg-card overflow-hidden rounded-xl border">
              {/* Table header */}
              <div className="text-muted-foreground hidden border-b bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wider uppercase sm:grid sm:grid-cols-12 sm:gap-2 sm:px-4 dark:bg-slate-900/50">
                <div className="sm:col-span-4">{t("adminMentorReviewAssignment.candidate")}</div>
                <div className="sm:col-span-3">
                  {t("adminMentorReviewAssignment.jobDescription")}
                </div>
                <div className="sm:col-span-2">{t("adminMentorReviewAssignment.roundName")}</div>
                <div className="text-center sm:col-span-1">
                  {t("adminMentorReviewAssignment.aiScore")}
                </div>
                <div className="text-right sm:col-span-2">
                  {t("adminMentorReviewAssignment.action")}
                </div>
              </div>

              {pageData.map((detail) => {
                const canAssign = detail.status === "AWAITING_MENTOR";
                const awaitingCandidate = detail.status === "AWAITING_CANDIDATE_SELECT_MENTOR";
                return (
                  <div
                    key={detail.id}
                    className="border-border/60 hover:bg-muted/30 border-b transition-colors last:border-b-0">
                    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2">
                      {/* Candidate */}
                      <div className="flex items-center gap-3 sm:col-span-4">
                        {renderRowAvatar(detail)}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {detail.candidateName ?? "-"}
                          </div>
                          {detail.candidateEmail && (
                            <div className="text-muted-foreground truncate text-xs">
                              {detail.candidateEmail}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* JD */}
                      <div className="sm:col-span-3">
                        <div className="line-clamp-2 text-sm">{detail.jdTitle ?? "-"}</div>
                        <div className="text-muted-foreground text-xs">
                          {t("adminMentorReviewAssignment.application")} #{detail.applicationId} ·{" "}
                          {t("adminMentorReviewAssignment.detailId")} #{detail.id}
                        </div>
                      </div>

                      {/* Round */}
                      <div className="sm:col-span-2">
                        <div className="text-sm font-medium">{detail.roundName ?? "-"}</div>
                        {detail.roundOrder && (
                          <div className="text-muted-foreground text-xs">
                            {t("adminMentorReviewAssignment.round")} {detail.roundOrder}
                          </div>
                        )}
                      </div>

                      {/* AI score */}
                      <div className="text-center sm:col-span-1">
                        {detail.aiScore != null ? (
                          <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                            {detail.aiScore.toFixed(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex flex-col items-stretch justify-end gap-1 sm:col-span-2 sm:items-end">
                        {canAssign && (
                          <Button
                            size="sm"
                            onClick={() => openAssignDialog(detail)}
                            className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700">
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{t("adminKiosk.assignMentor")}</span>
                            <span className="sm:hidden">
                              {t("adminMentorReviewAssignment.actionAssign")}
                            </span>
                          </Button>
                        )}
                        {awaitingCandidate && (
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className="gap-1 border-blue-200 bg-blue-50/60 px-2 text-blue-700">
                              <Eye className="h-3 w-3" />
                              {t("adminMentorReviewAssignment.suggestedN", {
                                count: detail.assignedMentorIds?.length ?? 0,
                              })}
                            </Badge>
                            {detail.assignedMentors &&
                              detail.assignedMentors.slice(0, 3).map((m) => (
                                <span
                                  key={m.id}
                                  className="text-muted-foreground truncate text-[11px]">
                                  • {m.name}
                                </span>
                              ))}
                          </div>
                        )}
                        {!canAssign && !awaitingCandidate && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-slate-200 bg-slate-50 text-slate-600">
                            {renderStatusBadge(detail, t)}
                          </Badge>
                        )}
                      </div>

                      {/* Mobile-only metadata */}
                      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs sm:hidden">
                        {renderStatusBadge(detail, t)}
                        {detail.createdAt && (
                          <span>
                            {t("adminMentorReviewAssignment.createdAt")}:{" "}
                            {formatDateTime(treatZuluAsVietnamLocal(detail.createdAt))}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded metadata on desktop */}
                    <div className="text-muted-foreground hidden gap-4 px-4 pb-3 text-xs sm:flex">
                      {renderStatusBadge(detail, t)}
                      {detail.createdAt && (
                        <span>
                          {t("adminMentorReviewAssignment.createdAt")}:{" "}
                          {formatDateTime(treatZuluAsVietnamLocal(detail.createdAt))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <PaginationControl pagination={pagination} onPageSizeChange={setPageSize} />
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("adminKiosk.assignMentor")}</DialogTitle>
          <DialogDescription>
            {t("adminMentorReviewAssignment.assignDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Detail info */}
          {detail && (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm dark:bg-slate-800">
              <p>
                <span className="font-medium">{t("adminMentorReviewAssignment.candidate")}:</span>{" "}
                {detail.candidateName ?? detail.candidateEmail ?? "-"}
              </p>
              <p>
                <span className="font-medium">{t("adminMentorReviewAssignment.application")}:</span>{" "}
                #{detail.applicationId} · {t("adminMentorReviewAssignment.detailId")}: #{detail.id}
              </p>
            </div>
          )}

          {/* Assignment mode selector */}
          <div className="space-y-2">
            <Label>{t("adminMentorReviewAssignment.assignmentMode")}</Label>
            <RadioGroup
              value={assignMode}
              onValueChange={(value) => setAssignMode(value as "single" | "multiple")}
              className="flex flex-col gap-3">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="single" id="mode-single" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="mode-single" className="cursor-pointer font-medium">
                    {t("adminMentorReviewAssignment.option1Single")}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("adminMentorReviewAssignment.option1SingleDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="multiple" id="mode-multiple" className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="mode-multiple" className="cursor-pointer font-medium">
                    {t("adminMentorReviewAssignment.option2Multiple")}
                  </Label>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {t("adminMentorReviewAssignment.option2MultipleDesc")}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Option 1: Radix Popover Searchable Combobox */}
          {assignMode === "single" && (
            <div className="grid gap-2">
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
                      "h-9 w-full justify-between px-3 text-sm font-normal shadow-sm",
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
                            "flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                            selectedMentorId === String(mentor.id) &&
                              "bg-slate-100 font-medium dark:bg-slate-800"
                          )}>
                          <span className="font-medium">{mentor.name}</span>
                          {mentor.email && (
                            <span className="text-xs text-slate-500">{mentor.email}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Option 2: Multiple mentor selection with search & selected chips */}
          {assignMode === "multiple" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t("adminMentorReviewAssignment.selectMentors")}</Label>
                <p className="text-muted-foreground text-xs">
                  {t("adminMentorReviewAssignment.selectMentorsHint")}
                </p>
              </div>

              {/* Badges / Chips list of currently selected mentors */}
              {selectedMentorsObjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-900/30 dark:bg-indigo-950/20">
                  <span className="mr-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {t("adminMentorReviewAssignment.selectedMentors")}:
                  </span>
                  {selectedMentorsObjects.map((mentor) => (
                    <Badge
                      key={mentor.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 border border-indigo-200 bg-white py-1 pr-1.5 pl-2.5 text-xs font-medium text-indigo-900 shadow-xs dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-200">
                      <span>{mentor.name}</span>
                      <button
                        type="button"
                        onClick={() => mentor.id && toggleMentorSelection(mentor.id)}
                        className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
                        title={t("common.delete")}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search for Option 2 */}
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={t("adminMentorReviewAssignment.searchMentorPlaceholder")}
                  value={mentorMultiQuery}
                  onChange={(e) => setMentorMultiQuery(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {/* Checklist */}
              <div className="max-h-60 space-y-2 overflow-y-auto overscroll-contain rounded-lg border p-3">
                {filteredMultiMentors.length === 0 ? (
                  <p className="py-3 text-center text-sm text-slate-500">{t("common.noResults")}</p>
                ) : (
                  filteredMultiMentors.map((mentor) => (
                    <div
                      key={mentor.id}
                      className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Checkbox
                        id={`mentor-${mentor.id}`}
                        checked={selectedMentorIds.includes(mentor.id as number)}
                        onCheckedChange={() => mentor.id && toggleMentorSelection(mentor.id)}
                      />
                      <Label
                        htmlFor={`mentor-${mentor.id}`}
                        className="flex flex-1 cursor-pointer items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{mentor.name}</span>
                          {mentor.email && (
                            <span className="text-xs text-slate-500">{mentor.email}</span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {selectedMentorIds.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {t("adminMentorReviewAssignment.selectedCount", {
                    count: selectedMentorIds.length,
                  })}
                </p>
              )}
            </div>
          )}

          {/* Notes - only for Option 1 */}
          {assignMode === "single" && (
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          {assignMode === "single" ? (
            <Button onClick={handleSubmitSingle} disabled={isLoading || !selectedMentorId}>
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
              disabled={isLoading || selectedMentorIds.length < 2}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
