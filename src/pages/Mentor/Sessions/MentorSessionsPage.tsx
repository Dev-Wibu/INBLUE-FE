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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviews, type MentorReview } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import { useUserProfilesByIds } from "@/hooks/useUserProfilesByIds";
import type { Session } from "@/interfaces";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { getSessionJoinAvailability } from "@/lib/session-join";
import { getSessionStatusBadge } from "@/lib/status-utils";
import { useAuthStore } from "@/stores/authStore";
import { Check, LogIn, Pencil, Search, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type SortableSession = Session & { sessionSortValue: number };
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
  return session.id ?? 0;
};

export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SessionStatus>("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const {
    data: allSessions = [],
    isLoading: sessionsLoading,
    isRefetching: sessionsRefetching,
    refetch: refetchSessions,
  } = useSessions();
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    isRefetching: reviewsRefetching,
    refetch: refetchReviews,
  } = useMentorReviews();
  const updateStatusMutation = useUpdateSessionStatus();
  const { data: currentMentorProfile } = useCurrentMentorProfile();

  const mentorSessions = useMemo(() => {
    const mentorProfileId = Number(currentMentorProfile?.id);
    const candidateIds = [user?.id, mentorProfileId].filter(
      (id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0
    );
    if (candidateIds.length === 0) return [];
    return allSessions.filter((session) => {
      const sessionIds = [session.userId, session.userId2, session.mentorId]
        .filter((id): id is number => typeof id === "number")
        .map(String);
      return candidateIds.some((id) => sessionIds.includes(String(id)));
    });
  }, [allSessions, currentMentorProfile, user?.id]);

  const candidateUserIds = useMemo(
    () => mentorSessions.map((session) => session.userId),
    [mentorSessions]
  );
  const {
    profilesById: candidateProfilesById,
    isRefetching: candidatesRefetching,
    refetch: refetchCandidates,
  } = useUserProfilesByIds(candidateUserIds);

  const reviewBySessionId = useMemo(() => {
    const map = new Map<number, MentorReview>();
    reviews.forEach((review) => {
      if (typeof review.session?.id === "number") map.set(review.session.id, review);
    });
    return map;
  }, [reviews]);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mentorSessions.filter((session) => {
      const candidate =
        (typeof session.id === "number" ? reviewBySessionId.get(session.id)?.user : null) ||
        (session.userId ? candidateProfilesById.get(session.userId) : null);
      const matchesSearch =
        !query ||
        session.id?.toString().includes(query) ||
        session.userId?.toString().includes(query) ||
        session.roomName?.toLowerCase().includes(query) ||
        session.roomUrl?.toLowerCase().includes(query) ||
        candidate?.name?.toLowerCase().includes(query) ||
        candidate?.email?.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === "all" || session.status === statusFilter);
    });
  }, [candidateProfilesById, mentorSessions, reviewBySessionId, searchQuery, statusFilter]);

  const sortableSessions = useMemo<SortableSession[]>(
    () =>
      filteredSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredSessions]
  );
  const { sortedData, getSortProps } = useSortable(sortableSessions, {
    defaultSort: { key: "sessionSortValue", direction: "desc" },
    noSortBehavior: "preserve",
    tieBreaker: { key: "sessionSortValue", direction: "desc" },
  });
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_sessions_mentorsessionspage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({ totalCount: sortedData.length, pageSize });
  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );

  const completedCount = mentorSessions.filter((session) => session.status === "COMPLETED").length;
  const upcomingCount = mentorSessions.filter((session) =>
    ["SCHEDULED", "PAID", "ONGOING"].includes(session.status || "")
  ).length;
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    pagination.goToFirstPage();
  };
  const isLoading = sessionsLoading || reviewsLoading;
  const isRefetching = sessionsRefetching || reviewsRefetching || candidatesRefetching;

  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <SpinnerBlock size="lg" label={t("common.loading")} />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex min-h-full flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
          <section className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("mentorSessions.interviewSessions")}
                </h1>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t("mentorSessions.manageInterviewSessionsAndSend")}
                </p>
              </div>
              <div className="flex items-center justify-center gap-5 sm:gap-6">
                {[
                  [mentorSessions.length, t("mentorOverview.totalSessions")],
                  [completedCount, t("general.completed")],
                  [upcomingCount, t("common.upcoming")],
                ].map(([value, label], index) => (
                  <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                    {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                    <div className="flex min-w-[78px] flex-col items-center text-center">
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
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder={t("mentorSessions.searchByRoomNameOrId")}
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    pagination.goToFirstPage();
                  }}
                  className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="h-[46px] rounded-xl border-slate-200/90 bg-white px-6 font-semibold shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <Search className="h-[18px] w-[18px]" />
                {t("common.search")}
              </Button>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as SessionStatus);
                  pagination.goToFirstPage();
                }}>
                <SelectTrigger className="h-[46px] w-full rounded-xl border-slate-200/90 bg-white px-4 text-sm font-semibold shadow-2xs sm:w-44 dark:border-slate-800 dark:bg-slate-900">
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
              <ReloadButton
                onReload={async () => {
                  await Promise.all([refetchSessions(), refetchReviews(), refetchCandidates()]);
                }}
                isLoading={isRefetching}
                tooltip={t("mentorSessions.reloadInterviewSessionList")}
                className="h-[46px] w-[46px] rounded-xl border border-slate-200/90 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900"
              />
            </form>

            {(searchQuery || statusFilter !== "all") && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t("common.clearFilter")}
                </Button>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {pageData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Video className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {t("mentorSessions.thereIsNoProperInterview")}
                </p>
                {(searchQuery || statusFilter !== "all") && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    {t("common.clearFilter")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[1180px]">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                        <TableHead className="w-[7%] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.id")}
                        </TableHead>
                        <TableHead className="w-[24%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.candidate")}
                        </TableHead>
                        <TableHead className="w-[23%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.session")}
                        </TableHead>
                        <TableHead className="w-[16%] px-5 font-semibold text-slate-700 dark:text-slate-200">
                          <SortButton {...getSortProps("sessionSortValue")}>
                            {t("common.time")}
                          </SortButton>
                        </TableHead>
                        <TableHead className="w-[11%] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.status")}
                        </TableHead>
                        <TableHead className="w-[9%] px-5 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.review")}
                        </TableHead>
                        <TableHead className="w-[10%] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
                          {t("common.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageData.map((session) => {
                        const review =
                          typeof session.id === "number"
                            ? reviewBySessionId.get(session.id)
                            : undefined;
                        const candidate =
                          review?.user ||
                          (session.userId ? candidateProfilesById.get(session.userId) : undefined);
                        const statusBadge = getSessionStatusBadge(session.status);
                        const hasReview = Boolean(review?.id);
                        const joinAvailability = getSessionJoinAvailability(session, now);
                        const displayTime = session.joinTime || session.startTime1;
                        return (
                          <TableRow
                            key={session.id}
                            onClick={() =>
                              navigate(`/mentor/sessions/${session.id}`, {
                                state: { returnTo: "/mentor?tab=sessions" },
                              })
                            }
                            className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                            <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                              #{session.id}
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 shrink-0 rounded-[14px] border border-slate-200/90 shadow-2xs dark:border-slate-800/80">
                                  <AvatarImage src={candidate?.avatarUrl} alt={candidate?.name} />
                                  <AvatarFallback className="rounded-[14px] bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
                                    {candidate?.name?.charAt(0)?.toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="max-w-[190px] truncate font-semibold text-slate-900 dark:text-white">
                                    {candidate?.name ||
                                      (session.userId
                                        ? `${t("common.candidate")} #${session.userId}`
                                        : t("common.candidate"))}
                                  </p>
                                  <p className="max-w-[190px] truncate text-xs text-slate-500 dark:text-slate-400">
                                    {candidate?.email || `ID #${session.userId ?? "—"}`}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4">
                              <p className="max-w-[260px] truncate font-semibold text-slate-900 dark:text-white">
                                {session.roomName || t("common.interviewSession")}
                              </p>
                              <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-500 dark:text-slate-400">
                                {session.roomUrl || "—"}
                              </p>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                              {displayTime
                                ? formatDateTime(
                                    session.joinTime
                                      ? session.joinTime
                                      : treatZuluAsVietnamLocal(session.startTime1)
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center">
                              <Badge
                                variant={statusBadge.variant}
                                className={`${statusBadge.className} inline-flex min-w-[88px] justify-center px-2.5`}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-center">
                              {hasReview || session.status === "COMPLETED" ? (
                                <Badge
                                  variant="outline"
                                  className={`inline-flex min-w-[84px] justify-center px-2.5 ${
                                    hasReview
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  }`}>
                                  {hasReview ? t("common.done") : t("common.pending")}
                                </Badge>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell
                              className="py-4 pr-6"
                              onClick={(event) => event.stopPropagation()}>
                              <div className="flex min-h-8 items-center justify-end gap-2">
                                {joinAvailability.canJoin && (
                                  <Button
                                    size="icon"
                                    className="h-8 w-8 bg-emerald-600 text-white hover:bg-emerald-700"
                                    title={t("common.enterTheInterviewRoom")}
                                    aria-label={t("common.enterTheInterviewRoom")}
                                    onClick={() =>
                                      navigate(`/mentor/sessions/room/${session.id}`, {
                                        state: { returnTo: "/mentor?tab=sessions" },
                                      })
                                    }>
                                    <LogIn className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {session.status === "DRAFT" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                      title={t("common.accept")}
                                      aria-label={t("common.accept")}
                                      disabled={updateStatusMutation.isPending}
                                      onClick={() =>
                                        session.id &&
                                        updateStatusMutation.mutate({
                                          sessionId: session.id,
                                          isApproved: true,
                                        })
                                      }>
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 border-rose-500/30 text-rose-700 dark:text-rose-300"
                                      title={t("common.reject")}
                                      aria-label={t("common.reject")}
                                      disabled={updateStatusMutation.isPending}
                                      onClick={() =>
                                        session.id &&
                                        updateStatusMutation.mutate({
                                          sessionId: session.id,
                                          isApproved: false,
                                        })
                                      }>
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                                {session.status === "COMPLETED" && (
                                  <Button
                                    variant={hasReview ? "outline" : "default"}
                                    size="icon"
                                    className={`h-8 w-8 ${
                                      hasReview
                                        ? ""
                                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                                    }`}
                                    title={
                                      hasReview ? t("common.editReview") : t("common.writeReview")
                                    }
                                    aria-label={
                                      hasReview ? t("common.editReview") : t("common.writeReview")
                                    }
                                    onClick={() =>
                                      navigate(`/mentor/sessions/${session.id}/review/view`, {
                                        state: {
                                          returnTo: "/mentor?tab=sessions",
                                          edit: hasReview,
                                        },
                                      })
                                    }>
                                    <Pencil className="h-3.5 w-3.5" />
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
              </div>
            )}

            {sortedData.length > 0 && (
              <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
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
          </section>
        </div>
      )}
    </div>
  );
}
