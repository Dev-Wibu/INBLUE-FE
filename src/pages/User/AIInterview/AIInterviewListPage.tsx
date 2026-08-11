import { PaginationControl, ReloadButton, SortButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { $api } from "@/lib/api";
import { formatUtcNaiveDateTime, toUtcNaiveTimestamp } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { Bot, Eye, Globe, Play, Plus, RadioTower, Search, Star, User, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SESSION_EXPIRY_MS = 60 * 60 * 1000;
const isSessionExpired = (createdAt?: string) => {
  const createdTimestamp = toUtcNaiveTimestamp(createdAt);
  if (!createdTimestamp) return true;
  return Date.now() - createdTimestamp >= SESSION_EXPIRY_MS;
};

export function AIInterviewListPage() {
  const { t } = useTranslation();

  const MODE_LABELS = useMemo<Record<string, string>>(
    () => ({
      STANDARD_MOCK: t("common.trialInterview", "Phỏng vấn thử"),
      THEORY_CHECK: t("common.testTheTheory", "Kiểm tra lý thuyết"),
      PROJECT_DEFENSE: t("common.projectProtection", "Bảo vệ dự án"),
    }),
    [t]
  );

  const STATUS_CONFIG = useMemo<Record<string, { label: string; className: string }>>(
    () => ({
      CREATED: {
        label: t("common.created", "Mới tạo"),
        className: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
      },
      IN_PROGRESS: {
        label: t("common.ongoing", "Đang diễn ra"),
        className: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      },
      COMPLETED: {
        label: t("general.completed", "Hoàn thành"),
        className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      },
      CANCELLED: {
        label: t("common.canceled", "Đã hủy"),
        className: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      },
    }),
    [t]
  );

  const DIFFICULTY_LABELS = useMemo<Record<string, string>>(
    () => ({
      FRESHER_BASIC: t("userAiinterview.basic", "Cơ bản"),
      FRESHER_ADVANCED: t("userAiinterview.advanced", "Nâng cao"),
    }),
    [t]
  );

  const LANGUAGE_LABELS = useMemo<Record<string, string>>(
    () => ({
      VI: t("common.vietnamese", "Tiếng Việt"),
      EN: t("common.english", "Tiếng Anh"),
    }),
    [t]
  );

  const DOMAIN_LABELS = useMemo<Record<string, string>>(
    () => ({
      IT: "IT",
      NON_IT: t("common.outsideOfIt", "Ngoài IT"),
    }),
    [t]
  );

  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [historyPageSize, setHistoryPageSize] = useHybridPageSize({
    key: "src_pages_user_aiinterview_aiinterviewlistpage_tsx_historypagesize",
    defaultPageSize: 10,
  });
  const userId = useAuthStore((s) => s.user?.id);

  const {
    data: sessions,
    isLoading,
    isError,
    isRefetching,
    refetch,
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

  const allSessions = useMemo(
    () =>
      [...(Array.isArray(sessions) ? sessions : [])].sort(
        (a, b) => (toUtcNaiveTimestamp(b.createdAt) ?? 0) - (toUtcNaiveTimestamp(a.createdAt) ?? 0)
      ),
    [sessions]
  );

  const activeSessions = useMemo(
    () =>
      allSessions.filter(
        (s) => s.status === "IN_PROGRESS" && s.sessionKey != null && !isSessionExpired(s.createdAt)
      ),
    [allSessions]
  );

  const historySessions = useMemo(() => {
    const list = allSessions.filter(
      (s) => s.status !== "IN_PROGRESS" || s.sessionKey == null || isSessionExpired(s.createdAt)
    );
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((s) => {
      const modeLabel = MODE_LABELS[s.mode ?? ""] ?? s.mode ?? "";
      const domain = s.domain ?? "";
      return modeLabel.toLowerCase().includes(q) || domain.toLowerCase().includes(q);
    });
  }, [allSessions, searchQuery, MODE_LABELS]);

  const sortableHistorySessions = useMemo(() => {
    return historySessions.map((session) => ({
      ...session,
      idSortValue: typeof session.id === "number" ? session.id : 0,
      createdAtSortValue: toUtcNaiveTimestamp(session.createdAt) ?? 0,
      updatedAtSortValue: toUtcNaiveTimestamp(session.updatedAt) ?? 0,
      scoreSortValue: session.overallScore ?? -1,
      modeSortValue: (MODE_LABELS[session.mode ?? ""] ?? session.mode ?? "").toLowerCase(),
      statusSortValue: (session.status ?? "").toUpperCase(),
    }));
  }, [historySessions, MODE_LABELS]);

  const { sortedData: sortedHistorySessions, getSortProps: getHistorySortProps } = useSortable(
    sortableHistorySessions,
    {
      defaultSort: {
        key: "createdAtSortValue",
        direction: "desc",
      },
      noSortBehavior: "preserve",
      tieBreaker: {
        key: "idSortValue",
        direction: "desc",
      },
    }
  );

  const historyPagination = usePagination({
    totalCount: sortedHistorySessions.length,
    pageSize: historyPageSize,
  });

  const historyPageData = useMemo(
    () => sortedHistorySessions.slice(historyPagination.startIndex, historyPagination.endIndex + 1),
    [historyPagination.endIndex, historyPagination.startIndex, sortedHistorySessions]
  );

  const highestScore = useMemo(() => {
    const scores = allSessions
      .map((s) => s.overallScore)
      .filter((s): s is number => typeof s === "number" && !Number.isNaN(s));
    return scores.length > 0 ? Math.max(...scores) : 0;
  }, [allSessions]);

  const handleResume = (key: string) => {
    navigate(`/user/ai-interview/session?sessionKey=${key}`);
  };

  const handleViewResult = (sessionId: number | undefined) => {
    navigate(`/user/ai-interview/result/${sessionId}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("userAiinterview.aiInterviewHeading", "Phỏng vấn AI")}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              "general.practiceWithAiToImprove",
              "Luyện tập phỏng vấn tự động với AI để nâng cao kỹ năng và nhận phản hồi chi tiết"
            )}
          </p>
        </div>
        <Button
          className="h-9 gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          onClick={() => navigate("/user/ai-interview/setup")}>
          <Plus className="h-4 w-4" />
          {t("userAiinterview.startNewInterview", "Tạo lượt phỏng vấn mới")}
        </Button>
      </div>

      {/* Kiosk Overview Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Practice Sessions */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("userAiinterview.totalSessions", "Tổng lượt phỏng vấn")}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{allSessions.length}</p>
          </div>
        </div>

        {/* Card 2: Highest Score */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Star className="h-5 w-5 fill-emerald-500 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("userAiinterview.highestScore", "Điểm cao nhất")}
            </p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {highestScore > 0 ? `${highestScore.toFixed(1)}/10` : "--"}
            </p>
          </div>
        </div>

        {/* Card 3: Active Kiosk Station Status */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <RadioTower className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("userAiinterview.activeSessionsCount", "Đang diễn ra")}
            </p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {activeSessions.length} {t("common.session", "phiên")}
            </p>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {t("common.unableToDownloadInterviewHistory", "Không thể tải lịch sử phỏng vấn")}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs">
            {t("common.tryAgain", "Thử lại")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-6">
          {/* Active Sessions - Kiosk Station Card */}
          {activeSessions.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
                {t("userAiinterview.sessionInProgress", "Phiên phỏng vấn đang diễn ra")}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeSessions.map((session) => {
                  const activeKey = session.sessionKey!;
                  const modeLabel =
                    MODE_LABELS[session.mode ?? ""] ??
                    session.mode ??
                    t("common.aiInterview", "Phỏng vấn AI");
                  const targetRole = session.candidateProfile?.targetRole;
                  const targetLevel = session.candidateProfile?.targetLevel;
                  const difficulty = session.sessionConfig?.difficulty;
                  const language = session.sessionConfig?.language;

                  return (
                    <div
                      key={session.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className="border-0 bg-amber-500 text-[10px] font-semibold text-white">
                            {t("common.ongoing", "Đang diễn ra")}
                          </Badge>
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300">
                            SESSION #{session.id}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {modeLabel}
                        </h3>
                        {(targetRole || targetLevel) && (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <User className="h-3.5 w-3.5 text-indigo-500" />
                            {[targetRole, targetLevel].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {session.domain && (
                            <Badge variant="secondary" className="rounded-md text-[10px]">
                              {DOMAIN_LABELS[session.domain] ?? session.domain}
                            </Badge>
                          )}
                          {difficulty && (
                            <Badge variant="outline" className="rounded-md text-[10px]">
                              <Zap className="mr-1 h-3 w-3 text-amber-500" />
                              {DIFFICULTY_LABELS[difficulty] ?? difficulty}
                            </Badge>
                          )}
                          {language && (
                            <Badge variant="outline" className="rounded-md text-[10px]">
                              <Globe className="mr-1 h-3 w-3 text-indigo-500" />
                              {LANGUAGE_LABELS[language] ?? language}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-indigo-100 pt-3 dark:border-indigo-900/40">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t("common.create", "Tạo lúc")}:{" "}
                          {formatUtcNaiveDateTime(session.createdAt)}
                        </span>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                          onClick={() => handleResume(activeKey)}>
                          <Play className="h-3.5 w-3.5" />
                          {t("userAiinterview.continueInterview", "Tiếp tục phỏng vấn")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t("common.interviewHistory", "Lịch sử phỏng vấn")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    "userAiinterview.reviewPreviousInterviews",
                    "Xem lại các bài phỏng vấn đã thực hiện và kết quả chi tiết"
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder={t("userAiinterview.searchByModeField", "Tìm kiếm theo chế độ...")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      historyPagination.goToFirstPage();
                    }}
                    className="h-9 rounded-xl border-slate-200 bg-white pl-9 text-xs dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <ReloadButton
                  onReload={async () => {
                    await refetch();
                  }}
                  isLoading={isRefetching}
                  tooltip={t("userAiinterview.reloadAiInterviewHistory", "Tải lại lịch sử")}
                />
              </div>
            </div>

            {/* Sort Controls */}
            {sortedHistorySessions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <SortButton {...getHistorySortProps("createdAtSortValue")}>
                  {t("common.latest", "Mới nhất")}
                </SortButton>
                <SortButton {...getHistorySortProps("scoreSortValue")}>
                  {t("userAiinterview.score", "Điểm số")}
                </SortButton>
                <SortButton {...getHistorySortProps("modeSortValue")}>
                  {t("userAiinterview.regime", "Chế độ")}
                </SortButton>
                <SortButton {...getHistorySortProps("statusSortValue")}>
                  {t("common.status", "Trạng thái")}
                </SortButton>
              </div>
            )}

            {/* Result count when filter active */}
            {searchQuery && (
              <div className="text-xs text-slate-500">
                Hiển thị{" "}
                <strong className="text-slate-800 dark:text-slate-200">
                  {historyPageData.length}
                </strong>{" "}
                / <strong>{historySessions.length}</strong> kết quả
              </div>
            )}

            {/* Standard Table Container */}
            <div className="overflow-hidden border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <TableHead className="w-[80px] pl-6 font-medium text-slate-500">#ID</TableHead>
                    <TableHead className="font-medium text-slate-500">
                      {t("userAiinterview.regime", "Chế độ phỏng vấn")}
                    </TableHead>
                    <TableHead className="font-medium text-slate-500">
                      {t("common.field", "Lĩnh vực / Ngôn ngữ")}
                    </TableHead>
                    <TableHead className="font-medium text-slate-500">
                      {t("common.status", "Trạng thái")}
                    </TableHead>
                    <TableHead className="font-medium text-slate-500">
                      {t("userAiinterview.score", "Điểm số")}
                    </TableHead>
                    <TableHead className="font-medium text-slate-500">
                      {t("common.create", "Thời gian")}
                    </TableHead>
                    <TableHead className="pr-6 text-right font-medium text-slate-500">
                      {t("common.actions", "Thao tác")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyPageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Search className="h-5 w-5 text-slate-400" />
                          </div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {searchQuery
                              ? t(
                                  "userAiinterview.noInterviewsFound",
                                  "Không tìm thấy phỏng vấn phù hợp"
                                )
                              : t(
                                  "userAiinterview.thereHaveBeenNoInterviews",
                                  "Chưa có lịch sử phỏng vấn nào"
                                )}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyPageData.map((session) => {
                      const isExpired =
                        (session.status === "CREATED" || session.status === "IN_PROGRESS") &&
                        (session.sessionKey == null || isSessionExpired(session.createdAt));

                      const statusConfig = isExpired
                        ? {
                            label: t("userAiinterview.expired", "Hết hạn"),
                            className:
                              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                          }
                        : (STATUS_CONFIG[session.status ?? ""] ?? {
                            label: session.status,
                            className: "bg-slate-100 text-slate-700",
                          });

                      const modeLabel =
                        MODE_LABELS[session.mode ?? ""] ??
                        session.mode ??
                        t("common.aiInterview", "Phỏng vấn AI");
                      const hasScore =
                        session.overallScore !== undefined && session.overallScore !== null;
                      const histTargetRole = session.candidateProfile?.targetRole;
                      const histTargetLevel = session.candidateProfile?.targetLevel;
                      const histLanguage = session.sessionConfig?.language;

                      return (
                        <TableRow
                          key={session.id}
                          className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80"
                          onClick={() => !isExpired && handleViewResult(session.id)}>
                          <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                            #{session.id}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <div className="flex flex-col">
                              <span>{modeLabel}</span>
                              {(histTargetRole || histTargetLevel) && (
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                  {[histTargetRole, histTargetLevel].filter(Boolean).join(" · ")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {session.domain && (
                                <Badge
                                  variant="secondary"
                                  className="rounded-md px-2 py-0.5 text-xs font-medium">
                                  {DOMAIN_LABELS[session.domain] ?? session.domain}
                                </Badge>
                              )}
                              {histLanguage && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ({LANGUAGE_LABELS[histLanguage] ?? histLanguage})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {hasScore ? (
                              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                                {session.overallScore!.toFixed(1)}/10
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {formatUtcNaiveDateTime(session.createdAt)}
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            {!isExpired ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewResult(session.id);
                                }}>
                                <Eye className="h-3.5 w-3.5" />
                                {t("common.seeDetails", "Xem chi tiết")}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Control Bar */}
            {sortedHistorySessions.length > 0 && (
              <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                <PaginationControl
                  pagination={historyPagination}
                  onPageSizeChange={(nextPageSize) => {
                    setHistoryPageSize(nextPageSize);
                    historyPagination.goToFirstPage();
                  }}
                  pageSizeOptions={[5, 10, 20, 30]}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
