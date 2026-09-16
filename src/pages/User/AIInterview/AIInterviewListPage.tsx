import { PaginationControl, ReloadButton } from "@/components/shared";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { $api } from "@/lib/api";
import { formatUtcNaiveDateTime, toUtcNaiveTimestamp } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AlertCircle, Bot, ChevronRight, History, Play, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getAiInterviewDomain,
  getAiInterviewJobTitle,
  getAiInterviewMode,
  hasAiInterviewScore,
  isAiInterviewResumable,
} from "./ai-interview-history.utils";

type StatusFilter = "ALL" | "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export function AIInterviewListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "ai_interview_history_page_size",
    defaultPageSize: 10,
  });

  const modeLabels = useMemo<Record<string, string>>(
    () => ({
      STANDARD_MOCK: t("common.trialInterview", "Phỏng vấn thử"),
      THEORY_CHECK: t("common.testTheTheory", "Kiểm tra lý thuyết"),
      PROJECT_DEFENSE: t("common.projectProtection", "Bảo vệ dự án"),
    }),
    [t]
  );
  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      CREATED: t("common.created", "Mới tạo"),
      IN_PROGRESS: t("common.ongoing", "Đang diễn ra"),
      COMPLETED: t("general.completed", "Hoàn thành"),
      CANCELLED: t("common.canceled", "Đã hủy"),
    }),
    [t]
  );
  const resultLabels = useMemo<Record<string, string>>(
    () => ({
      STRONG_HIRE: t("common.excellent", "Xuất sắc"),
      HIRE: t("common.obtain", "Đạt"),
      CONSIDER: t("common.needToConsider", "Cân nhắc"),
      REJECT: t("common.failed", "Chưa đạt"),
    }),
    [t]
  );
  const difficultyLabels = useMemo<Record<string, string>>(
    () => ({
      FRESHER_BASIC: t("userAiinterview.basic", "Cơ bản"),
      FRESHER_ADVANCED: t("userAiinterview.advanced", "Nâng cao"),
    }),
    [t]
  );
  const languageLabels = useMemo<Record<string, string>>(
    () => ({
      VI: t("common.vietnamese", "Tiếng Việt"),
      EN: t("common.english", "Tiếng Anh"),
    }),
    [t]
  );

  const { data, isLoading, isError, isRefetching, refetch } = $api.useQuery(
    "get",
    "/api/interview-sessions/user/{userId}",
    { params: { path: { userId: userId ?? 0 } } },
    { enabled: Boolean(userId) }
  );

  const sessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...(Array.isArray(data) ? data : [])]
      .sort((a, b) => {
        const dateDifference =
          (toUtcNaiveTimestamp(b.createdAt) ?? 0) - (toUtcNaiveTimestamp(a.createdAt) ?? 0);
        return dateDifference || (b.id ?? 0) - (a.id ?? 0);
      })
      .filter((session) => statusFilter === "ALL" || session.status === statusFilter)
      .filter((session) => {
        if (!query) return true;
        const mode = getAiInterviewMode(session);
        const domain = getAiInterviewDomain(session);
        const values = [
          getAiInterviewJobTitle(session),
          mode ? (modeLabels[mode] ?? mode) : null,
          domain,
          session.sessionConfig?.language,
        ];
        return values.some((value) => value?.toLowerCase().includes(query));
      });
  }, [data, modeLabels, searchQuery, statusFilter]);

  const pagination = usePagination({ totalCount: sessions.length, pageSize });
  const pageData = sessions.slice(pagination.startIndex, pagination.endIndex + 1);
  const resetPagination = () => pagination.goToFirstPage();

  return (
    <div className="w-full space-y-6 px-5 py-6 pb-16 md:px-8">
      <header className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("userAiinterview.historyNavigation", "Lịch sử phỏng vấn AI")}
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t(
                "userAiinterview.reviewPreviousInterviews",
                "Xem lại các bài phỏng vấn đã thực hiện và kết quả chi tiết"
              )}
            </p>
          </div>
          <Button
            className="h-9 shrink-0 gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
            onClick={() => navigate("/user/ai-interview/setup")}>
            <Plus className="h-4 w-4" />
            {t("userAiinterview.startNewInterview", "Tạo lượt phỏng vấn mới")}
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t("common.interviewHistory", "Lịch sử phỏng vấn")}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {sessions.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  resetPagination();
                }}
                className="h-9 pl-9 text-xs"
                placeholder={t("userAiinterview.searchByModeField", "Tìm theo vị trí, chế độ...")}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                resetPagination();
              }}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("common.all", "Tất cả trạng thái")}</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ReloadButton
              onReload={async () => void (await refetch())}
              isLoading={isRefetching}
              tooltip={t("userAiinterview.reloadAiInterviewHistory", "Tải lại lịch sử")}
            />
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                <TableHead className="h-11 min-w-[210px] pl-6 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.position", "Vị trí")}
                </TableHead>
                <TableHead className="h-11 min-w-[180px] text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("userAiinterview.regime", "Chế độ")}
                </TableHead>
                <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.status", "Trạng thái")}
                </TableHead>
                <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.result", "Kết quả")}
                </TableHead>
                <TableHead className="h-11 text-center text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("userAiinterview.score", "Điểm")}
                </TableHead>
                <TableHead className="h-11 min-w-[145px] text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("userAiinterview.createdAtLabel", "Thời gian")}
                </TableHead>
                <TableHead className="h-11 min-w-[125px] pr-6 text-right text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.actions", "Thao tác")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      {t("common.loadingData", "Đang tải dữ liệu...")}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <AlertCircle className="h-8 w-8 text-rose-500" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t("common.unableToDownloadInterviewHistory", "Không thể tải lịch sử")}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => void refetch()}>
                        {t("common.tryAgain", "Thử lại")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && pageData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Bot className="h-8 w-8 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {t(
                          "userAiinterview.thereHaveBeenNoInterviews",
                          "Chưa có lịch sử phỏng vấn"
                        )}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !isError &&
                pageData.map((session) => {
                  const mode = getAiInterviewMode(session);
                  const domain = getAiInterviewDomain(session);
                  const resumable = isAiInterviewResumable(session);
                  const scoreAvailable = hasAiInterviewScore(session);
                  const sessionId = session.id;
                  return (
                    <TableRow
                      key={sessionId}
                      onClick={() =>
                        sessionId != null && navigate(`/user/ai-interview/result/${sessionId}`)
                      }
                      className="group cursor-pointer border-b border-slate-100 bg-white transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                      <TableCell className="py-3 pl-6">
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                          {getAiInterviewJobTitle(session) ??
                            t("common.aiInterview", "Phỏng vấn AI")}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {[
                            domain,
                            session.sessionConfig?.language
                              ? (languageLabels[session.sessionConfig.language] ??
                                session.sessionConfig.language)
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {mode ? (modeLabels[mode] ?? mode) : "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {session.sessionConfig?.difficulty
                            ? (difficultyLabels[session.sessionConfig.difficulty] ??
                              session.sessionConfig.difficulty)
                            : "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={session.status}
                          label={statusLabels[session.status ?? ""]}
                        />
                      </TableCell>
                      <TableCell>
                        {session.result ? (
                          <ResultBadge
                            result={session.result}
                            label={resultLabels[session.result]}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {scoreAvailable ? `${session.overallScore!.toFixed(1)}/100` : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {formatUtcNaiveDateTime(session.completedAt ?? session.createdAt)}
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(event) => event.stopPropagation()}>
                        {resumable ? (
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"
                            onClick={() =>
                              navigate(
                                `/user/ai-interview/session?sessionKey=${session.sessionKey}`
                              )
                            }>
                            <Play className="h-3.5 w-3.5" />
                            {t("common.continue", "Tiếp tục")}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={sessionId == null}
                            className="h-8 rounded-lg px-2.5 text-xs font-extrabold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
                            onClick={() =>
                              sessionId != null &&
                              navigate(`/user/ai-interview/result/${sessionId}`)
                            }>
                            {t("common.seeDetails", "Xem chi tiết")}
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        {!isLoading && !isError && sessions.length > 0 && (
          <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
            <PaginationControl
              pagination={pagination}
              onPageSizeChange={(value) => {
                setPageSize(value);
                pagination.goToFirstPage();
              }}
              pageSizeOptions={[5, 10, 20, 30]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status?: string; label?: string }) {
  const styles: Record<string, string> = {
    CREATED: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    IN_PROGRESS: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    COMPLETED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    CANCELLED: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
        styles[status ?? ""] ?? "border-slate-200 bg-slate-100 text-slate-600"
      )}>
      {label ?? status ?? "—"}
    </Badge>
  );
}

function ResultBadge({ result, label }: { result: string; label?: string }) {
  const styles: Record<string, string> = {
    STRONG_HIRE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    HIRE: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    CONSIDER: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    REJECT: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wide uppercase",
        styles[result] ?? "bg-slate-100 text-slate-600"
      )}>
      {label ?? result}
    </span>
  );
}
