import { PaginationControl } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import type { InterviewSession } from "@/interfaces";
import { $api, fetchClient } from "@/lib/api";
import { formatUtcNaiveDateTime, toUtcNaiveTimestamp } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { AlertCircle, Bot, ChevronRight, Loader2, Play, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  buildApplicationAiInterviewResumePath,
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
  const [resumingSessionId, setResumingSessionId] = useState<number | null>(null);
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "ai_interview_history_page_size",
    defaultPageSize: 10,
  });

  const modeLabels = useMemo<Record<string, string>>(
    () => ({
      STANDARD_MOCK: t("common.trialInterview"),
      THEORY_CHECK: t("common.testTheTheory"),
      PROJECT_DEFENSE: t("common.projectProtection"),
    }),
    [t]
  );
  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      CREATED: t("common.created"),
      IN_PROGRESS: t("common.ongoing"),
      COMPLETED: t("general.completed"),
      CANCELLED: t("common.canceled"),
    }),
    [t]
  );
  const resultLabels = useMemo<Record<string, string>>(
    () => ({
      STRONG_HIRE: t("common.excellent"),
      HIRE: t("common.obtain"),
      CONSIDER: t("common.needToConsider"),
      REJECT: t("common.failed"),
    }),
    [t]
  );
  const difficultyLabels = useMemo<Record<string, string>>(
    () => ({
      FRESHER_BASIC: t("userAiinterview.basic"),
      FRESHER_ADVANCED: t("userAiinterview.advanced"),
    }),
    [t]
  );
  const languageLabels = useMemo<Record<string, string>>(
    () => ({
      VI: t("common.vietnamese"),
      EN: t("common.english"),
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
  const allSessions = Array.isArray(data) ? data : [];
  const completedCount = allSessions.filter((session) => session.status === "COMPLETED").length;
  const activeCount = allSessions.filter((session) => session.status === "IN_PROGRESS").length;

  const pagination = usePagination({ totalCount: sessions.length, pageSize });
  const pageData = sessions.slice(pagination.startIndex, pagination.endIndex + 1);
  const resetPagination = () => pagination.goToFirstPage();

  const handleResume = async (session: InterviewSession) => {
    if (resumingSessionId !== null) return;
    const sessionId = session.id;
    const sessionKey = session.sessionKey?.trim();
    const applicationDetailId = session.applicationDetailId;
    if (!sessionId || !sessionKey || !applicationDetailId) {
      toast.error(t("userAiinterview.resumeMissingApplication"));
      return;
    }
    setResumingSessionId(sessionId);
    try {
      let applicationId = Number(session.candidateProfile?.applicationId) || 0;
      if (!applicationId) {
        const { data: detail, error: detailError } = await fetchClient.GET(
          "/api/application-details/{id}",
          { params: { path: { id: applicationDetailId } } }
        );
        if (detailError || !detail?.applicationId) {
          throw detailError ?? new Error("Application detail is unavailable");
        }
        applicationId = detail.applicationId;
      }
      const { data: questionResponse, error } = await fetchClient.GET(
        "/api/v1/interview/start/{sessionKey}",
        { params: { path: { sessionKey } } }
      );
      if (error || !questionResponse) throw error ?? new Error("Unable to resume interview");
      navigate(
        buildApplicationAiInterviewResumePath(applicationId, applicationDetailId, sessionKey),
        {
          state: {
            resumedQuestion: questionResponse,
            resumeDurationMinutes: session.sessionConfig?.duration_minutes ?? 30,
          },
        }
      );
    } catch {
      await refetch();
      toast.error(t("userAiinterview.resumeFailedRefresh"));
    } finally {
      setResumingSessionId(null);
    }
  };

  return (
    <div className="min-h-full w-full space-y-6 bg-slate-50 px-5 py-6 pb-16 sm:px-6 md:px-8 dark:bg-slate-950">
      <header className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("userAiinterview.historyNavigation")}
            </h1>
            <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
              {t("userAiinterview.reviewPreviousInterviews")}
            </p>
          </div>
          <div className="flex items-center gap-5 sm:gap-6">
            {[
              [allSessions.length, t("common.interviewHistory")],
              [activeCount, statusLabels.IN_PROGRESS],
              [completedCount, statusLabels.COMPLETED],
            ].map(([value, label], index) => (
              <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                <div className="flex min-w-[70px] flex-col items-center text-center">
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
          onSubmit={(event) => {
            event.preventDefault();
            resetPagination();
          }}
          className="mt-6 grid grid-cols-[minmax(0,1fr)_46px] gap-3 sm:flex sm:flex-row">
          <div className="relative col-span-2 min-w-0 sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                resetPagination();
              }}
              className="h-[46px] rounded-xl border-slate-200 bg-slate-50/70 pl-11 text-[14.5px] dark:border-slate-800 dark:bg-slate-950/70"
              placeholder={t("userAiinterview.searchByModeField")}
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            className="h-[46px] rounded-xl border-slate-200 bg-white px-6 font-semibold dark:border-slate-800 dark:bg-slate-900">
            <Search className="mr-2 h-[18px] w-[18px]" />
            {t("common.search", "Tìm kiếm")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            disabled={isRefetching}
            title={t("userAiinterview.reloadAiInterviewHistory")}
            aria-label={t("userAiinterview.reloadAiInterviewHistory")}
            className="h-[46px] w-[46px] rounded-xl border-slate-200 dark:border-slate-800">
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {t("common.status", "Trạng thái")}
          </span>
          {(["ALL", "CREATED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatusFilter(value);
                resetPagination();
              }}
              aria-pressed={statusFilter === value}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors",
                statusFilter === value
                  ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
              )}>
              {value === "ALL" ? t("common.all") : statusLabels[value]}
            </button>
          ))}
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                <TableHead className="h-12 min-w-[190px] pl-6 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t("common.position", "Position")}
                </TableHead>
                <TableHead className="h-11 min-w-[130px] text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("userAiinterview.regime")}
                </TableHead>
                <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.status")}
                </TableHead>
                <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.result")}
                </TableHead>
                <TableHead className="h-11 text-center text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("userAiinterview.score")}
                </TableHead>
                <TableHead className="h-11 min-w-[130px] text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("userAiinterview.createdAtLabel")}
                </TableHead>
                <TableHead className="h-11 min-w-[105px] pr-6 text-right text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
                  {t("common.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading &&
                !isError &&
                pageData.map((session) => {
                  const mode = getAiInterviewMode(session);
                  const domain = getAiInterviewDomain(session);
                  const submittedFinalAnswer = Boolean(
                    session.sessionKey &&
                    localStorage.getItem(`interview-finished-${session.sessionKey}`) === "true"
                  );
                  const resumable = isAiInterviewResumable(session, submittedFinalAnswer);
                  const scoreAvailable = hasAiInterviewScore(session);
                  const sessionId = session.id;
                  return (
                    <TableRow
                      key={sessionId}
                      onClick={() =>
                        sessionId != null && navigate(`/user/ai-interview/result/${sessionId}`)
                      }
                      className="group cursor-pointer border-b border-slate-100 bg-white transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                      <TableCell className="py-4 pl-6">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                          {getAiInterviewJobTitle(session) ?? t("common.aiInterview")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                      <TableCell className="py-4">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {mode ? (modeLabels[mode] ?? mode) : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                      <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {formatUtcNaiveDateTime(session.completedAt ?? session.createdAt)}
                      </TableCell>
                      <TableCell
                        className="pr-6 text-right"
                        onClick={(event) => event.stopPropagation()}>
                        {resumable ? (
                          <Button
                            size="sm"
                            className="h-9 gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                            disabled={resumingSessionId !== null}
                            onClick={() => void handleResume(session)}>
                            {resumingSessionId === sessionId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                            {t("common.continue")}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={sessionId == null}
                            className="h-9 rounded-lg px-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
                            onClick={() =>
                              sessionId != null &&
                              navigate(`/user/ai-interview/result/${sessionId}`)
                            }>
                            {t("common.seeDetails")}
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
        {(isLoading || isError || pageData.length === 0) && (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 border-t border-slate-100 p-6 text-center dark:border-slate-800">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                {t("common.loadingData")}
              </div>
            ) : isError ? (
              <>
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("common.unableToDownloadInterviewHistory")}
                </p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  {t("common.tryAgain")}
                </Button>
              </>
            ) : (
              <>
                <Bot className="h-8 w-8 text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("userAiinterview.thereHaveBeenNoInterviews")}
                </p>
              </>
            )}
          </div>
        )}
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
    CREATED:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    IN_PROGRESS:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    COMPLETED:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    CANCELLED:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        styles[status ?? ""] ??
          "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      )}>
      {label ?? status ?? "—"}
    </Badge>
  );
}

function ResultBadge({ result, label }: { result: string; label?: string }) {
  const styles: Record<string, string> = {
    STRONG_HIRE:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    HIRE: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    CONSIDER:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    REJECT:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        styles[result] ??
          "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      )}>
      {label ?? result}
    </span>
  );
}
