import { ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useMentorFeedbacksByUser } from "@/hooks/useMentorFeedback";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useMakeSessionPayment, useUserSessions } from "@/hooks/useSession";
import type { Session } from "@/interfaces";
import { $api } from "@/lib/api";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertTriangle,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Search,
  Star,
  User,
  Video,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type InterviewType = "all" | "ai" | "mock";
type HistoryItem = {
  id: number;
  type: "ai" | "mock";
  createdAt?: string;
  status: string;
  mode?: string;
  overallScore?: number;
  candidateProfile?: {
    targetRole?: string;
    targetLevel?: string;
  };
  sessionConfig?: {
    duration_minutes?: number;
    language?: string;
  };
  jobRequirement?: {
    basic_info?: Record<string, string>;
  };
  roomName?: string;
  joinTime?: string;
  startTime1?: string;
  totalPrice?: number;
  userId2?: number;
};

type AIStatusFilter = "all" | "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type MockStatusFilter =
  | "all"
  | "DRAFT"
  | "SCHEDULED"
  | "PAID"
  | "ONGOING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELED";

// ============================================================
// Progress Ring
// ============================================================

function ProgressRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(score / 10) * circumference} ${circumference}`;
  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
      }}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="fill-none stroke-[2.5px]"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          style={{
            color: "rgb(218, 226, 253)",
          }}
        />
        <circle
          className="fill-none stroke-[2.5px] transition-all duration-500"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0058be"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-[#0058be] dark:text-[#66B2FF]">
          {Math.round(score)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Interview History Tab Component
// ============================================================

export function InterviewHistoryTab() {
  const { t } = useTranslation();

  const INTERVIEW_TYPE_TABS: Array<{ value: InterviewType; label: string }> = [
    { value: "all", label: t("general.all") },
    { value: "ai", label: t("general.ai") },
    { value: "mock", label: t("common.mentor") },
  ];
  const AI_MODE_LABELS: Record<string, string> = {
    STANDARD_MOCK: t("common.trialInterview"),
    THEORY_CHECK: t("common.testTheory"),
    PROJECT_DEFENSE: t("common.projectProtection"),
  };
  const AI_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    CREATED: {
      label: t("common.created"),
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    },
    IN_PROGRESS: {
      label: t("common.ongoing"),
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    COMPLETED: {
      label: t("general.completed"),
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    CANCELLED: {
      label: t("common.canceled"),
      className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    },
  };
  const MOCK_STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: {
      label: t("common.waitingForApproval"),
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    },
    SCHEDULED: {
      label: t("common.comingSoon"),
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    },
    PAID: {
      label: t("common.paid"),
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    ONGOING: {
      label: t("common.ongoing"),
      color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    },
    COMPLETED: {
      label: t("general.completed"),
      color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    REJECTED: {
      label: t("common.rejected"),
      color: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300",
    },
    CANCELED: {
      label: t("common.canceled"),
      color: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300",
    },
  };

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const [interviewType, setInterviewType] = useState<InterviewType>("all");
  const [aiStatusFilter, setAiStatusFilter] = useState<AIStatusFilter>("all");
  const [mockStatusFilter, setMockStatusFilter] = useState<MockStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [payingSessionId, setPayingSessionId] = useState<number | null>(null);
  const payosPaymentInFlightRef = useRef(false);

  const {
    data: aiSessions = [],
    isLoading: aiLoading,
    isError: aiError,
    isRefetching: aiRefetching,
    refetch: refetchAISessions,
  } = $api.useQuery(
    "get",
    "/api/interview-sessions/user/{userId}",
    {
      params: {
        path: {
          userId: userId ?? 0,
        },
      },
    },
    {
      enabled: !!userId,
    }
  );

  const {
    data: mockSessions = [],
    isLoading: mockLoading,
    isRefetching: mockRefetching,
    refetch: refetchMockSessions,
  } = useUserSessions();

  const {
    data: feedbacks = [],
    isRefetching: feedbacksRefetching,
    refetch: refetchFeedbacks,
  } = useMentorFeedbacksByUser(userId ?? 0);

  const { mutateAsync: makeSessionPayment } = useMakeSessionPayment();
  const isLoading = aiLoading || mockLoading;
  const isRefetching = aiRefetching || mockRefetching || feedbacksRefetching;

  const feedbackSessionIds = useMemo(
    () =>
      new Set(
        feedbacks
          .map(
            (f: {
              session?: {
                id?: number;
              };
            }) => f.session?.id
          )
          .filter((id): id is number => typeof id === "number")
      ),
    [feedbacks]
  );

  const aiHistoryItems = useMemo<HistoryItem[]>(() => {
    return (Array.isArray(aiSessions) ? aiSessions : []).map((s) => ({
      id: s.id as number,
      type: "ai" as const,
      createdAt: s.createdAt,
      status: s.status ?? "",
      mode: s.mode,
      overallScore: s.overallScore,
      candidateProfile: s.candidateProfile,
      sessionConfig: s.sessionConfig,
      jobRequirement: s.jobRequirement,
    }));
  }, [aiSessions]);

  const mockHistoryItems = useMemo<HistoryItem[]>(() => {
    return mockSessions.map((s) => ({
      id: s.id as number,
      type: "mock" as const,
      createdAt: s.joinTime,
      status: s.status ?? "",
      roomName: s.roomName,
      joinTime: s.joinTime,
      startTime1: s.startTime1,
      totalPrice: s.totalPrice,
      userId2: s.userId2,
    }));
  }, [mockSessions]);

  const filteredHistory = useMemo(() => {
    const aiModeLabels: Record<string, string> = {
      STANDARD_MOCK: t("common.trialInterview"),
      THEORY_CHECK: t("common.testTheory"),
      PROJECT_DEFENSE: t("common.projectProtection"),
    };

    let items: HistoryItem[] = [];
    if (interviewType === "all" || interviewType === "ai") {
      let filtered = [...aiHistoryItems];
      if (aiStatusFilter !== "all") {
        filtered = filtered.filter((s) => s.status === aiStatusFilter);
      }
      items = [...items, ...filtered];
    }
    if (interviewType === "all" || interviewType === "mock") {
      let filtered = [...mockHistoryItems];
      if (mockStatusFilter !== "all") {
        filtered = filtered.filter((s) => s.status === mockStatusFilter);
      }
      items = [...items, ...filtered];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => {
        if (item.type === "ai") {
          const modeLabel = aiModeLabels[item.mode ?? ""] ?? item.mode ?? "";
          const role = item.candidateProfile?.targetRole ?? "";
          return modeLabel.toLowerCase().includes(q) || role.toLowerCase().includes(q);
        } else {
          const roomName = item.roomName ?? "";
          return roomName.toLowerCase().includes(q);
        }
      });
    }
    items.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return items;
  }, [
    t,
    interviewType,
    aiStatusFilter,
    mockStatusFilter,
    searchQuery,
    aiHistoryItems,
    mockHistoryItems,
  ]);

  const [pageSize] = useHybridPageSize({
    key: "src_pages_user_account_interviewhistorytab_tsx_pagesize",
    defaultPageSize: 5,
  });
  const pagination = usePagination({
    totalCount: filteredHistory.length,
    pageSize,
  });
  const pageData = useMemo(
    () => filteredHistory.slice(pagination.startIndex, pagination.endIndex + 1),
    [filteredHistory, pagination.startIndex, pagination.endIndex]
  );

  const handlePaySessionWithPayOS = useCallback(
    async (session: Session) => {
      if (!session.id || payosPaymentInFlightRef.current) return;
      payosPaymentInFlightRef.current = true;
      setPayingSessionId(session.id);
      try {
        const checkoutUrl = await makeSessionPayment(session.id);
        window.location.assign(checkoutUrl);
      } catch {
        // Error toast in hook
      } finally {
        payosPaymentInFlightRef.current = false;
        setPayingSessionId(null);
      }
    },
    [makeSessionPayment]
  );

  const handleViewDetails = useCallback(
    (item: HistoryItem) => {
      if (item.type === "ai") {
        navigate(`/user/ai-interview/result/${item.id}`);
      } else {
        navigate(`/user/mock-interview/history/${item.id}`);
      }
    },
    [navigate]
  );

  const handleWriteFeedback = useCallback(
    (item: HistoryItem) => {
      navigate(`/user/mock-interview/history/${item.id}/feedback`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0058be]">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
                {t("common.interviewHistory")}
              </h2>
              <p className="text-sm text-[#45464d] dark:text-[#8f9099]">
                {t("userAccount.viewYourPastInterviewSessions")}
              </p>
            </div>
          </div>
          <ReloadButton
            onReload={async () => {
              await Promise.all([refetchAISessions(), refetchMockSessions(), refetchFeedbacks()]);
            }}
            isLoading={isRefetching}
            tooltip={t("common.reload")}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        {/* Type Tabs */}
        <div className="mb-4 flex items-center gap-1">
          {INTERVIEW_TYPE_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={interviewType === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setInterviewType(tab.value);
                pagination.goToFirstPage();
              }}
              className={cn(
                interviewType === tab.value
                  ? "bg-[#0058be] text-white hover:bg-[#0047a8]"
                  : "text-[#45464d] dark:text-[#8f9099]"
              )}>
              {tab.value === "ai" && <Bot className="mr-1 h-3.5 w-3.5" />}
              {tab.value === "mock" && <Video className="mr-1 h-3.5 w-3.5" />}
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.goToFirstPage();
              }}
              className="h-9 border-[#c6c6cd] bg-white pl-8 text-sm dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white"
              placeholder={t("userAccount.search")}
            />
          </div>
          {interviewType === "ai" ? (
            <Select
              value={aiStatusFilter}
              onValueChange={(value) => {
                setAiStatusFilter(value as AIStatusFilter);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="h-9 w-[160px] border-[#c6c6cd] bg-white text-sm dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("general.all")}</SelectItem>
                <SelectItem value="COMPLETED">{t("general.completed")}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t("common.ongoing")}</SelectItem>
                <SelectItem value="CREATED">{t("common.created")}</SelectItem>
                <SelectItem value="CANCELLED">{t("common.canceled")}</SelectItem>
              </SelectContent>
            </Select>
          ) : interviewType === "mock" ? (
            <Select
              value={mockStatusFilter}
              onValueChange={(value) => {
                setMockStatusFilter(value as MockStatusFilter);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="h-9 w-[160px] border-[#c6c6cd] bg-white text-sm dark:border-[#3a4558] dark:bg-[#1a2a3a] dark:text-white">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("general.all")}</SelectItem>
                <SelectItem value="COMPLETED">{t("general.completed")}</SelectItem>
                <SelectItem value="SCHEDULED">{t("common.comingSoon")}</SelectItem>
                <SelectItem value="PAID">{t("common.paid")}</SelectItem>
                <SelectItem value="DRAFT">{t("common.waitingForApproval")}</SelectItem>
                <SelectItem value="CANCELED">{t("common.canceled")}</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingCardList count={3} />
      ) : aiError ? (
        <div className="glass-card flex flex-col items-center justify-center gap-4 rounded-xl p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <p className="text-center text-sm font-medium text-red-600 dark:text-red-400">
            {t("userAccount.unableToLoadHistory")}
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetchAISessions()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="glass-card rounded-xl p-8">
          <EmptyState
            icon={History}
            title={t("common.noInterviewHistoryYet")}
            description={t("userAccount.youHaveNotParticipatedIn")}
            action={
              <Button
                size="sm"
                onClick={() => navigate("/user/ai-interview/setup")}
                className="gap-1.5 bg-[#0058be] hover:bg-[#0047a8]">
                <Bot className="h-3.5 w-3.5" />
                {t("common.aiInterview")}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageData.map((item) => {
              const isAi = item.type === "ai";
              const hasFeedback =
                !isAi && typeof item.id === "number" && feedbackSessionIds.has(item.id);
              const isPaying = payingSessionId === item.id;
              const isCompleted = item.status === "COMPLETED";
              const isScheduled = item.status === "SCHEDULED";
              const isPaid = item.status === "PAID";
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="glass-card rounded-xl p-4 transition-all hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        isAi
                          ? "bg-[#0058be]/10 dark:bg-[#0058be]/30"
                          : "bg-emerald-500/10 dark:bg-emerald-500/20"
                      )}>
                      {isAi ? (
                        <Bot
                          className={cn("h-5 w-5", isAi ? "text-[#0058be]" : "text-emerald-600")}
                        />
                      ) : (
                        <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-[#0b1c30] dark:text-white">
                          {isAi
                            ? (AI_MODE_LABELS[item.mode ?? ""] ?? t("common.aiInterview"))
                            : item.roomName ||
                              t("common.sessionVar0", {
                                var_0: item.id,
                              })}
                        </p>
                        {isAi ? (
                          <Badge
                            className={AI_STATUS_CONFIG[item.status]?.className ?? ""}
                            variant="secondary">
                            {AI_STATUS_CONFIG[item.status]?.label ?? item.status}
                          </Badge>
                        ) : (
                          <Badge
                            className={MOCK_STATUS_MAP[item.status]?.color ?? ""}
                            variant="secondary">
                            {MOCK_STATUS_MAP[item.status]?.label ?? item.status}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#45464d] dark:text-[#8f9099]">
                        {isAi ? (
                          <>
                            {item.candidateProfile?.targetRole && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.candidateProfile.targetRole}
                              </span>
                            )}
                            {item.sessionConfig?.duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {item.sessionConfig.duration_minutes} {t("common.minute")}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            {item.joinTime && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(item.joinTime)}
                              </span>
                            )}
                            {typeof item.totalPrice === "number" && item.totalPrice > 0 && (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(item.totalPrice)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score / Action */}
                    <div className="flex shrink-0 items-center gap-2">
                      {isAi && item.overallScore != null && (
                        <ProgressRing score={item.overallScore as number} />
                      )}
                      {isCompleted && !isAi && !hasFeedback && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWriteFeedback(item)}
                          className="border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                          <Star className="mr-1 h-3 w-3" />
                          {t("common.feedback1")}
                        </Button>
                      )}
                      {!isAi && isScheduled && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          disabled={isPaying}
                          onClick={() => {
                            const session = mockSessions.find((s) => s.id === item.id) as
                              | Session
                              | undefined;
                            if (session) void handlePaySessionWithPayOS(session);
                          }}>
                          {isPaying ? "..." : t("common.pay")}
                        </Button>
                      )}
                      {!isAi && isPaid && (
                        <Button size="sm" variant="secondary" disabled>
                          {t("userAccount.alreadyTt")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(item)}
                        className="text-[#45464d] hover:bg-[#eff4ff] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                        {t("common.detail")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {filteredHistory.length > pageSize && (
            <div className="glass-card rounded-xl p-3">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => pagination.prevPage()}
                  disabled={pagination.currentPage <= 1}
                  className="h-8 w-8 border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm text-[#45464d] dark:text-[#8f9099]">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => pagination.nextPage()}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="h-8 w-8 border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff] dark:border-[#3a4558] dark:text-[#8f9099] dark:hover:bg-[#1a2a3a]">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
