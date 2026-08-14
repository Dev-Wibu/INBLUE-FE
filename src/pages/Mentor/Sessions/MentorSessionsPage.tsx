import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { getSessionStatusBadge } from "@/lib/status-utils";
import { useAuthStore } from "@/stores/authStore";
import { Check, Eye, Pencil, Search, Video, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type SortableSession = Session & {
  sessionSortValue: number;
};

type SessionStatus =
  | "all"
  | "DRAFT"
  | "SCHEDULED"
  | "PAID"
  | "REJECTED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELED";

const getSessionSortValue = (session: Session): number => {
  const joinTime = session.joinTime ? new Date(session.joinTime).getTime() : 0;
  if (joinTime > 0) return joinTime;
  const startTime = session.startTime1 ? new Date(session.startTime1).getTime() : 0;
  if (startTime > 0) return startTime;
  return typeof session.id === "number" ? session.id : 0;
};

const matchesSessionSearch = (session: Session, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return !!(
    session.id?.toString().includes(normalizedQuery) ||
    session.userId?.toString().includes(normalizedQuery) ||
    session.roomName?.toLowerCase().includes(normalizedQuery) ||
    session.roomUrl?.toLowerCase().includes(normalizedQuery)
  );
};

export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus>("all");

  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    isRefetching: sessionsRefetching,
    refetch: refetchSessions,
  } = useSessions();
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useMentorReviews();
  const updateStatusMutation = useUpdateSessionStatus();
  const { data: currentMentorProfile } = useCurrentMentorProfile();
  const isLoading = sessionsLoading || reviewsLoading;

  const mentorSessions = useMemo(() => {
    const userId = user?.id;
    const mentorProfileId =
      currentMentorProfile?.id != null
        ? typeof currentMentorProfile.id === "string"
          ? parseInt(currentMentorProfile.id, 10)
          : currentMentorProfile.id
        : undefined;
    const candidates = [userId, mentorProfileId].filter(
      (id): id is number => typeof id === "number" && Number.isFinite(id)
    );
    if (candidates.length === 0) return [];
    return [...allSessions]
      .filter((session) => {
        const sessionIds = [session.userId, session.userId2, session.mentorId]
          .filter((id): id is number => typeof id === "number")
          .map((id) => String(id));
        return candidates.some((id) => sessionIds.includes(String(id)));
      })
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }, [allSessions, user, currentMentorProfile]);

  const reviewBySessionId = useMemo(() => {
    const reviewMap = new Map<number, number>();
    reviews.forEach((review) => {
      if (typeof review.session?.id === "number" && typeof review.id === "number") {
        reviewMap.set(review.session.id, review.id);
      }
    });
    return reviewMap;
  }, [reviews]);

  const filteredSessions = useMemo(
    () =>
      mentorSessions.filter((session) => {
        if (!matchesSessionSearch(session, searchQuery)) return false;
        return statusFilter === "all" || session.status === statusFilter;
      }),
    [mentorSessions, searchQuery, statusFilter]
  );

  const sortableSessions = useMemo<SortableSession[]>(
    () =>
      filteredSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredSessions]
  );
  const { sortedData, getSortProps } = useSortable(sortableSessions);
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_sessions_mentorsessionspage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });
  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [sortedData, pagination.startIndex, pagination.endIndex]
  );

  const handleAcceptSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({ sessionId: session.id, isApproved: true });
    }
  };

  const handleRejectSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({ sessionId: session.id, isApproved: false });
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    pagination.goToFirstPage();
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("mentorSessions.interviewSessions")}
          </h1>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            {currentMentorProfile?.name ?? user?.name ?? ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder={t("mentorSessions.searchByRoomNameOrId")}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                pagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as SessionStatus);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-36 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("common.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              <SelectItem value="DRAFT">{t("common.waitingForApproval")}</SelectItem>
              <SelectItem value="SCHEDULED">{t("common.scheduled")}</SelectItem>
              <SelectItem value="PAID">{t("common.paid")}</SelectItem>
              <SelectItem value="ONGOING">{t("common.ongoing")}</SelectItem>
              <SelectItem value="COMPLETED">{t("general.completed")}</SelectItem>
              <SelectItem value="REJECTED">{t("common.rejected")}</SelectItem>
              <SelectItem value="CANCELED">{t("common.canceled")}</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all") && (
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
              await Promise.all([refetchSessions(), refetchReviews()]);
            }}
            isLoading={sessionsRefetching}
            tooltip={t("mentorSessions.reloadInterviewSessionList")}
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
                    {mentorSessions.length === 0 ? (
                      <Video className="h-6 w-6 text-slate-400" />
                    ) : (
                      <Search className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {mentorSessions.length === 0
                      ? t("common.noInterviewSessionYet")
                      : t("mentorSessions.thereIsNoProperInterview")}
                  </p>
                  {(searchQuery || statusFilter !== "all") && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      {t("common.clearFilter")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="min-w-[1040px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="w-[80px] pl-6 font-medium text-slate-500">
                          {t("common.id")}
                        </TableHead>
                        <TableHead className="min-w-[280px] font-medium text-slate-500">
                          {t("common.roomName")}
                        </TableHead>
                        <TableHead className="w-[120px] font-medium text-slate-500">
                          {t("common.candidate")}
                        </TableHead>
                        <TableHead className="w-[180px] font-medium text-slate-500">
                          <SortButton {...getSortProps("sessionSortValue")}>
                            {t("common.time")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[130px] font-medium text-slate-500">
                          {t("common.status")}
                        </TableHead>
                        <TableHead className="w-[130px] text-center font-medium text-slate-500">
                          {t("common.review")}
                        </TableHead>
                        <TableHead className="w-[230px] pr-6 text-right font-medium text-slate-500">
                          {t("common.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((session) => {
                        const statusBadge = getSessionStatusBadge(session.status);
                        const hasReview =
                          typeof session.id === "number" && reviewBySessionId.has(session.id);

                        return (
                          <TableRow
                            key={session.id}
                            onClick={() => {
                              if (typeof session.id === "number") {
                                navigate(`/mentor/sessions/${session.id}`);
                              }
                            }}
                            className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                            <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                              #{session.id}
                            </TableCell>
                            <TableCell>
                              <p className="max-w-[360px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {session.roomName || t("common.interviewSession")}
                              </p>
                              {session.roomUrl && (
                                <p className="max-w-[360px] truncate text-xs text-slate-500 dark:text-slate-400">
                                  {session.roomUrl}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              {session.userId ? (
                                <Badge
                                  variant="outline"
                                  className="border-sky-500/30 bg-sky-500/10 font-mono text-xs text-sky-700 dark:text-sky-300">
                                  #{session.userId}
                                </Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {formatDateTime(treatZuluAsVietnamLocal(session.startTime1))}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={statusBadge.variant}
                                className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasReview ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                  <Check className="h-3 w-3" />
                                  {t("common.done")}
                                </Badge>
                              ) : session.status === "COMPLETED" ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                  {t("common.pending")}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell
                              className="pr-6"
                              onClick={(event) => event.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (typeof session.id === "number") {
                                      navigate(`/mentor/sessions/${session.id}`);
                                    }
                                  }}
                                  className="h-7 px-2.5 text-xs">
                                  <Eye className="h-3.5 w-3.5" />
                                  {t("common.view")}
                                </Button>

                                {session.status === "DRAFT" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAcceptSession(session)}
                                      disabled={updateStatusMutation.isPending}
                                      className="h-7 border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
                                      <Check className="h-3.5 w-3.5" />
                                      {t("common.accept")}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRejectSession(session)}
                                      disabled={updateStatusMutation.isPending}
                                      className="h-7 border-rose-500/30 bg-rose-500/10 px-2.5 text-xs text-rose-700 hover:bg-rose-500/15 dark:text-rose-300">
                                      <X className="h-3.5 w-3.5" />
                                      {t("common.reject")}
                                    </Button>
                                  </>
                                )}

                                {!hasReview && session.status === "COMPLETED" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      if (typeof session.id === "number") {
                                        navigate(`/mentor/sessions/${session.id}/review`);
                                      }
                                    }}
                                    className="h-7 bg-indigo-600 px-2.5 text-xs text-white hover:bg-indigo-700">
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t("common.writeReview")}
                                  </Button>
                                )}

                                {hasReview && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (typeof session.id === "number") {
                                        navigate(`/mentor/sessions/${session.id}/review/view`);
                                      }
                                    }}
                                    className="h-7 px-2.5 text-xs">
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t("common.editReview")}
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
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
