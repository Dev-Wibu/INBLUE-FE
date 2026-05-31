import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
const t = i18n.t.bind(i18n);
/**
 * Mentor Sessions Page
 * Displays mentor's interview sessions with option to join video call or write reviews
 */

import { PaginationControl } from "@/components/shared/PaginationControl";
import { ReloadButton } from "@/components/shared/ReloadButton";
import { SortButton } from "@/components/shared/SortButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingCardList } from "@/components/ui/loading-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMentorReviews } from "@/hooks/useMentorReview";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";
import { useSortable } from "@/hooks/useSortable";
import type { Session } from "@/interfaces";
import {
  formatDate,
  formatDateTime,
  formatTime,
  toTimestamp,
  treatZuluAsVietnamLocal,
} from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { Calendar, Check, Clock, LogIn, MessageSquare, Search, User, Video, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Status badge mapping
const statusMap: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
  }
> = {
  DRAFT: {
    label: t("common.waitingForApproval"),
    variant: "secondary",
    color: "bg-amber-100 text-amber-700",
  },
  SCHEDULED: {
    label: t("common.comingSoon"),
    variant: "secondary",
    color: "bg-blue-100 text-blue-700",
  },
  PAID: {
    label: t("common.paid"),
    variant: "secondary",
    color: "bg-emerald-100 text-emerald-700",
  },
  ONGOING: {
    label: t("common.ongoing"),
    variant: "default",
    color: "bg-green-100 text-green-700",
  },
  COMPLETED: {
    label: t("general.completed"),
    variant: "outline",
    color: "bg-slate-100 text-slate-600",
  },
  REJECTED: {
    label: t("common.rejected"),
    variant: "destructive",
    color: "bg-red-100 text-red-600",
  },
  CANCELED: {
    label: t("common.canceled"),
    variant: "destructive",
    color: "bg-red-100 text-red-600",
  },
};
type SessionListTab = "draft" | "others";
type DraftTimeFilter = "all" | "hasJoinTime" | "noJoinTime";
type OtherStatusFilter =
  | "all"
  | "SCHEDULED"
  | "PAID"
  | "ONGOING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELED";
type SortableSession = Session & {
  sessionSortValue: number;
};
const getSessionSortValue = (session: Session): number => {
  const joinTimeSort = toTimestamp(session.joinTime);
  if (typeof joinTimeSort === "number") {
    return joinTimeSort;
  }
  const startTimeSort = toTimestamp(session.startTime1);
  if (typeof startTimeSort === "number") {
    return startTimeSort;
  }
  return typeof session.id === "number" ? session.id : 0;
};
const matchesSessionSearch = (session: Session, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  const roomNameMatch = session.roomName?.toLowerCase().includes(normalizedQuery) ?? false;
  const roomUrlMatch = session.roomUrl?.toLowerCase().includes(normalizedQuery) ?? false;
  return (
    session.id?.toString().includes(normalizedQuery) ||
    session.userId?.toString().includes(normalizedQuery) ||
    session.userId2?.toString().includes(normalizedQuery) ||
    roomNameMatch ||
    roomUrlMatch
  );
};
interface SessionCardProps {
  session: Session;
  hasReview: boolean;
  reviewId?: number;
  now: number;
  onViewDetails: () => void;
  onJoinSession: () => void;
  onWriteReview: () => void;
  onViewReview: () => void;
  onEditReview: () => void;
  onAcceptSession: () => void;
  onRejectSession: () => void;
  isUpdatingStatus: boolean;
}
function SessionCard({
  session,
  hasReview,
  reviewId,
  now,
  onViewDetails,
  onJoinSession,
  onWriteReview,
  onViewReview,
  onEditReview,
  onAcceptSession,
  onRejectSession,
  isUpdatingStatus,
}: SessionCardProps) {
  const status = statusMap[session.status || "SCHEDULED"] || statusMap.SCHEDULED;
  const isCompleted = session.status === "COMPLETED";
  const joinTimestamp = toTimestamp(session.joinTime);
  const isTimeReached = joinTimestamp ? joinTimestamp <= now : true;
  const isDraft = session.status === "DRAFT";
  const canJoin =
    (session.status === "PAID" || session.status === "ONGOING") &&
    !!session.roomUrl &&
    isTimeReached;
  return (
    <Card className="border-emerald-100 transition-all hover:shadow-md dark:border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                {session.roomName ||
                  t("common.sessionVar0", {
                    var_0: session.id,
                  })}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <User className="h-3 w-3" />
                {t("common.student")}
                {session.userId}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
            {!isTimeReached &&
              !isCompleted &&
              session.status !== "CANCELED" &&
              session.joinTime && (
                <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                  <Clock className="mr-1 h-3 w-3" />
                  {t("common.itsNotTimeYet")}
                </Badge>
              )}
            {canJoin && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoinSession();
                }}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                <LogIn className="h-3.5 w-3.5" />
                Join
              </Button>
            )}
            {isDraft && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcceptSession();
                        }}
                        disabled={isUpdatingStatus}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        {t("common.browse")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("mentorSessions.acceptInterviewSession")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectSession();
                        }}
                        disabled={isUpdatingStatus}
                        className="gap-1">
                        <X className="h-3.5 w-3.5" />
                        {t("common.refuse")}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.refuseTheInterviewSession")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-4 text-sm text-slate-500">
          {session.joinTime && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {t("common.meetingHours")} {formatDateTime(session.joinTime)}
            </span>
          )}
          {session.startTime1 && (
            <>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(treatZuluAsVietnamLocal(session.startTime1))}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(treatZuluAsVietnamLocal(session.startTime1))}
              </span>
            </>
          )}
          {!session.startTime1 && (
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {t("common.session2")}
              {session.id}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails} className="gap-1">
            {t("common.seeDetails")}
          </Button>
          {isCompleted && !hasReview && (
            <Button
              size="sm"
              onClick={onWriteReview}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              <MessageSquare className="h-4 w-4" />
              {t("common.writeAReview")}
            </Button>
          )}
          {isCompleted && hasReview && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onViewReview}
                disabled={!reviewId}
                className="gap-1">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                {t("common.seeDetails")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditReview}
                disabled={typeof session.id !== "number"}
                className="gap-1">
                {t("common.editReview")}
              </Button>
            </>
          )}
          {!isCompleted && !canJoin && (
            <span className="text-sm text-slate-500 italic">
              {session.status === "SCHEDULED"
                ? t("mentorSessions.waitForStudentsToPay")
                : session.status === "PAID" && !isTimeReached
                  ? t("mentorSessions.itSNotTimeTo")
                  : t("mentorSessions.theSessionIsNotYet")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export function MentorSessionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<SessionListTab>("draft");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftTimeFilter, setDraftTimeFilter] = useState<DraftTimeFilter>("all");
  const [otherStatusFilter, setOtherStatusFilter] = useState<OtherStatusFilter>("all");
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

  // Current time state for joinTime-based blocking (updates every 30s)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const isLoading = sessionsLoading || reviewsLoading;

  // Keep source data deterministic so default sort always yields newest-first consistently.
  const mentorSessions = useMemo(
    () =>
      [...allSessions]
        .filter((session: Session) => session.userId2 === user?.id)
        .sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
    [allSessions, user?.id]
  );

  // Get session IDs that already have mentor reviews
  const reviewBySessionId = useMemo(() => {
    const reviewMap = new Map<number, number>();
    reviews.forEach((review) => {
      if (typeof review.session?.id === "number" && typeof review.id === "number") {
        reviewMap.set(review.session.id, review.id);
      }
    });
    return reviewMap;
  }, [reviews]);
  const reviewSessionIds = useMemo(() => new Set(reviewBySessionId.keys()), [reviewBySessionId]);
  const draftSessions = useMemo(
    () => mentorSessions.filter((session) => session.status === "DRAFT"),
    [mentorSessions]
  );
  const otherSessions = useMemo(
    () => mentorSessions.filter((session) => session.status !== "DRAFT"),
    [mentorSessions]
  );
  const filteredDraftSessions = useMemo(
    () =>
      draftSessions.filter((session) => {
        if (!matchesSessionSearch(session, searchQuery)) {
          return false;
        }
        if (draftTimeFilter === "hasJoinTime") {
          return !!session.joinTime;
        }
        if (draftTimeFilter === "noJoinTime") {
          return !session.joinTime;
        }
        return true;
      }),
    [draftSessions, draftTimeFilter, searchQuery]
  );
  const filteredOtherSessions = useMemo(
    () =>
      otherSessions.filter((session) => {
        if (!matchesSessionSearch(session, searchQuery)) {
          return false;
        }
        if (otherStatusFilter !== "all") {
          return session.status === otherStatusFilter;
        }
        return true;
      }),
    [otherSessions, otherStatusFilter, searchQuery]
  );
  const sortableDraftSessions = useMemo<SortableSession[]>(
    () =>
      filteredDraftSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredDraftSessions]
  );
  const sortableOtherSessions = useMemo<SortableSession[]>(
    () =>
      filteredOtherSessions.map((session) => ({
        ...session,
        sessionSortValue: getSessionSortValue(session),
      })),
    [filteredOtherSessions]
  );
  const activeSessions = activeTab === "draft" ? sortableDraftSessions : sortableOtherSessions;

  // Apply sorting
  const { sortedData, getSortProps } = useSortable(activeSessions);

  // Apply pagination
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_mentor_sessions_mentorsessionspage_tsx_pagesize",
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
  const handleJoinSession = (session: Session) => {
    if (session.roomUrl) {
      navigate(`/mentor/sessions/room/${session.id}`);
    }
  };
  const handleWriteReview = (session: Session) => {
    navigate(`/mentor/sessions/${session.id}/review`);
  };
  const handleViewDetails = (session: Session) => {
    if (typeof session.id === "number") {
      navigate(`/mentor/sessions/${session.id}`);
    }
  };
  const handleViewReview = (reviewId: number) => {
    navigate(`/mentor/reviews/${reviewId}`);
  };
  const handleEditReview = (sessionId: number) => {
    navigate(`/mentor/sessions/${sessionId}/review`);
  };
  const handleAcceptSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({
        sessionId: session.id,
        isApproved: true,
      });
    }
  };
  const handleRejectSession = (session: Session) => {
    if (session.id) {
      updateStatusMutation.mutate({
        sessionId: session.id,
        isApproved: false,
      });
    }
  };

  // Stats — DRAFT is counted separately, not in "Sắp diễn ra"
  const draftCount = mentorSessions.filter((s: Session) => s.status === "DRAFT").length;
  const scheduledCount = mentorSessions.filter(
    (s: Session) => s.status === "SCHEDULED" || s.status === "PAID" || s.status === "ONGOING"
  ).length;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("mentorSessions.interviewSession")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("mentorSessions.manageInterviewSessionsAndSend")}
          </p>
        </div>
        <ReloadButton
          onReload={async () => {
            await Promise.all([refetchSessions(), refetchReviews()]);
          }}
          isLoading={sessionsRefetching || reviewsRefetching}
          tooltip={t("mentorSessions.reloadInterviewSessionList")}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>{t("common.totalSession")}</CardDescription>
            <CardTitle className="text-2xl">{mentorSessions.length}</CardTitle>
          </CardHeader>
        </Card>
        {draftCount > 0 && (
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-2">
              <CardDescription>{t("common.waitingForApproval")}</CardDescription>
              <CardTitle className="text-2xl text-amber-600">{draftCount}</CardTitle>
            </CardHeader>
          </Card>
        )}
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>{t("common.comingSoon")}</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{scheduledCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>{t("general.completed")}</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {mentorSessions.filter((s: Session) => s.status === "COMPLETED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription>{t("common.waitingForReview")}</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              {
                mentorSessions.filter(
                  (s: Session) =>
                    s.status === "COMPLETED" &&
                    typeof s.id === "number" &&
                    !reviewSessionIds.has(s.id)
                ).length
              }
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Session List */}
      {isLoading ? (
        <LoadingCardList count={4} />
      ) : mentorSessions.length === 0 ? (
        <EmptyState
          icon={Video}
          title={t("common.noInterviewSessionYet")}
          description={t("common.youHaveNotHadAnyInterviewSessions")}
        />
      ) : (
        <>
          {/* Controls */}
          <Card className="border-emerald-100 p-4 dark:border-slate-800">
            <div className="space-y-4">
              <Tabs
                value={activeTab}
                onValueChange={(tab) => {
                  setActiveTab(tab as SessionListTab);
                  pagination.goToFirstPage();
                }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draft">
                    {t("mentorSessions.waitingForApproval")}
                    {draftSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="others">
                    {t("mentorSessions.remainingSessions")}
                    {otherSessions.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      pagination.goToFirstPage();
                    }}
                    placeholder={t("mentorSessions.searchBySessionIdStudent")}
                    className="pl-9"
                  />
                </div>
                {activeTab === "draft" ? (
                  <Select
                    value={draftTimeFilter}
                    onValueChange={(value) => {
                      setDraftTimeFilter(value as DraftTimeFilter);
                      pagination.goToFirstPage();
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("mentorSessions.filterByCalendarInformation")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("mentorSessions.allSessionsPendingApproval")}
                      </SelectItem>
                      <SelectItem value="hasJoinTime">
                        {t("mentorSessions.itSMeetingTime")}
                      </SelectItem>
                      <SelectItem value="noJoinTime">
                        {t("mentorSessions.thereIsNoMeetingTime")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={otherStatusFilter}
                    onValueChange={(value) => {
                      setOtherStatusFilter(value as OtherStatusFilter);
                      pagination.goToFirstPage();
                    }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.filterByStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                      <SelectItem value="SCHEDULED">{t("common.comingSoon")}</SelectItem>
                      <SelectItem value="PAID">{t("common.paid")}</SelectItem>
                      <SelectItem value="ONGOING">{t("common.ongoing")}</SelectItem>
                      <SelectItem value="COMPLETED">{t("general.completed")}</SelectItem>
                      <SelectItem value="REJECTED">{t("common.rejected")}</SelectItem>
                      <SelectItem value="CANCELED">{t("common.canceled")}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("common.sortBy")}
                </span>
                <SortButton {...getSortProps("id")}>ID</SortButton>
                <SortButton {...getSortProps("sessionSortValue")}>{t("common.time")}</SortButton>
                <SortButton {...getSortProps("status")}>{t("common.status")}</SortButton>
                {(searchQuery || draftTimeFilter !== "all" || otherStatusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setDraftTimeFilter("all");
                      setOtherStatusFilter("all");
                      pagination.goToFirstPage();
                    }}>
                    {t("common.clearFilter")}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {sortedData.length === 0 ? (
            <EmptyState
              icon={Video}
              title={
                activeTab === "draft"
                  ? t("mentorSessions.thereAreNoSuitablePending")
                  : t("mentorSessions.thereIsNoProperInterview")
              }
              description={t("mentorSessions.tryChangingYourSearchKeywords")}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {pageData.map((session) => (
                  // Prefer opening existing review detail when available.
                  <SessionCard
                    key={session.id}
                    session={session}
                    hasReview={typeof session.id === "number" && reviewSessionIds.has(session.id)}
                    reviewId={
                      typeof session.id === "number" ? reviewBySessionId.get(session.id) : undefined
                    }
                    now={now}
                    onViewDetails={() => handleViewDetails(session)}
                    onJoinSession={() => handleJoinSession(session)}
                    onWriteReview={() => handleWriteReview(session)}
                    onViewReview={() => {
                      if (typeof session.id !== "number") return;
                      const reviewId = reviewBySessionId.get(session.id);
                      if (reviewId) {
                        handleViewReview(reviewId);
                      }
                    }}
                    onEditReview={() => {
                      if (typeof session.id === "number") {
                        handleEditReview(session.id);
                      }
                    }}
                    onAcceptSession={() => handleAcceptSession(session)}
                    onRejectSession={() => handleRejectSession(session)}
                    isUpdatingStatus={updateStatusMutation.isPending}
                  />
                ))}
              </div>

              {/* Pagination */}
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  pagination.goToFirstPage();
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
