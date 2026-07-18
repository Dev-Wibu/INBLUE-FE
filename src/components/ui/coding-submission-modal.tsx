"use client";
import i18n from "@/lib/i18n";
const t = (k: string, opts?: string | Record<string, unknown>): string =>
  i18n.t(k, opts as string) as unknown as string;

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useMonacoTheme } from "@/hooks/useMonacoTheme";
import { cn } from "@/lib/utils";
import { applicationDetailManager } from "@/services/application-detail.manager";
import Editor from "@monaco-editor/react";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  FileCode2,
  Play,
  Send,
  Terminal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../schema-from-be";

type CodingProblemSnapshot = components["schemas"]["CodingProblemSnapshot"];
type CompileRequest = components["schemas"]["CompileRequest"];

const LANGUAGES = [
  { value: "JAVA", label: "Java", monaco: "java" },
  { value: "PYTHON", label: "Python 3", monaco: "python" },
  { value: "JAVASCRIPT", label: "JavaScript", monaco: "javascript" },
  { value: "TYPESCRIPT", label: "TypeScript", monaco: "typescript" },
  { value: "CPP", label: "C++", monaco: "cpp" },
  { value: "CSHARP", label: "C#", monaco: "csharp" },
  { value: "GO", label: "Go", monaco: "go" },
  { value: "RUST", label: "Rust", monaco: "rust" },
  { value: "KOTLIN", label: "Kotlin", monaco: "kotlin" },
  { value: "SCALA", label: "Scala", monaco: "scala" },
  { value: "SWIFT", label: "Swift", monaco: "swift" },
];

/**
 * Resolve the starter template for a problem in the requested language.
 *
 * 2026-07-18: code stubs are now sourced exclusively from the backend
 * (`problem.codeStubs`) so the candidate sees the same skeleton the admin
 * authored. Key casing is inconsistent across problems (some admins store
 * "JAVA", others "java", others "Solution.java") so we fall back to a
 * case-insensitive lookup. If nothing matches we return an empty buffer —
 * the LeetCode-style editor still renders, the candidate just starts blank.
 */
function getStubForLanguage(problem: CodingProblemSnapshot | undefined, language: string): string {
  if (!problem?.codeStubs) return "";
  const stubs = problem.codeStubs;
  const direct = stubs[language];
  if (typeof direct === "string") return direct;
  const lower = language.toLowerCase();
  for (const [key, value] of Object.entries(stubs)) {
    if (typeof value !== "string") continue;
    if (key.toLowerCase() === lower) return value;
    // Allow filename-style keys, e.g. "Solution.java" → match JAVA.
    if (key.toLowerCase().endsWith(`.${lower}`)) return value;
    if (key.toLowerCase().endsWith(`${lower}.java`)) return value;
  }
  return "";
}

/**
 * Poll `GET /api/application-details/application/{applicationId}` until
 * the detail for this round flips to a terminal status, then return the
 * matching `testCases` compiler response from `submissionData.codeSubmissions[]`.
 *
 * 2026-07-18: BE processes the Run Tests (`isTest: true`) call async via
 * the same `@Async` event listener as Submit Final, so the only reliable
 * way to surface PASSED/FAILED per test case is to keep polling the
 * detail endpoint until `status === "COMPLETED"` (or any error state).
 */
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 60; // ~90s ceiling

async function pollRunTestsResult(
  applicationId: number,
  roundId: number,
  signal?: AbortSignal
): Promise<{
  status: "PENDING" | "COMPLETED" | "ERROR";
  passed?: number;
  total?: number;
  testCases?: components["schemas"]["TestCaseResult"][];
  errorMessage?: string;
  compilerStatus?: string;
}> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) {
      return { status: "ERROR", errorMessage: "Polling aborted" };
    }
    await new Promise((resolve) => {
      setTimeout(resolve, POLL_INTERVAL_MS);
    });
    const res = await applicationDetailManager.getByApplicationId(applicationId);
    if (!res.success || !res.data) {
      continue;
    }
    const detail = res.data.find((d) => d.roundId === roundId);
    if (!detail) {
      continue;
    }
    if (detail.status === "PENDING" || detail.status === "SUBMITTED") {
      continue;
    }
    // Terminal status — pull the latest testCases result from the
    // submission payload. There is one CodeSubmission per problem we
    // just submitted; pick the most recently updated one.
    const subs = detail.submissionData?.codeSubmissions ?? [];
    if (subs.length === 0) {
      return { status: "ERROR", errorMessage: "No test results recorded" };
    }
    const latest = subs[subs.length - 1];
    const tc = latest.testCases;
    return {
      status: "COMPLETED",
      passed: tc?.passedTestCases,
      total: tc?.totalTestCases,
      testCases: tc?.testCases ?? [],
      errorMessage: tc?.errorMessage ?? undefined,
      compilerStatus: tc?.status,
    };
  }
  return { status: "ERROR", errorMessage: "Polling timed out" };
}

export interface CodingSubmissionModalProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  applicationId: number;
  roundId: number;
  roundName?: string;
  codingProblems: CodingProblemSnapshot[];
  codingProblemsId?: number[];
  instruction?: string;
  timeLimitMinutes?: number;
  onSuccess?: (_message?: string) => void;
}

export function CodingSubmissionModal({
  open: _open,
  onOpenChange,
  applicationId,
  roundId,
  roundName,
  codingProblems,
  codingProblemsId,
  timeLimitMinutes = 60,
  onSuccess,
}: CodingSubmissionModalProps) {
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [language, setLanguage] = useState("JAVA");
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTestTab, setActiveTestTab] = useState<"editor" | "test">("editor");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [problems, setProblems] = useState<CodingProblemSnapshot[]>(codingProblems);
  const monacoTheme = useMonacoTheme();
  const isDark = monacoTheme === "vs-dark";

  // 2026-07-18: BE only returns `message: "Compile code thành công"`
  // for `isTest: true`; the actual per-test-case results arrive
  // asynchronously via `GET /api/application-details/application/{id}`.
  // We poll that endpoint until the detail for `roundId` flips to a
  // terminal status and then expose its `submissionData.codeSubmissions[].testCases`
  // to the result panel.
  type RunTestsPollState = {
    status: "PENDING" | "COMPLETED" | "ERROR";
    syncMessage?: string;
    passed?: number;
    total?: number;
    testCases?: components["schemas"]["TestCaseResult"][];
    errorMessage?: string;
    compilerStatus?: string;
  };
  const [runStateByProblem, setRunStateByProblem] = useState<Record<number, RunTestsPollState>>({});

  // Initialize / fetch problems
  // 2026-07-18: Pre-fill every problem's editor with the BE-provided code
  // stub for the current language. Each problem can carry its own skeleton
  // per language (problem.codeStubs[lang]) so the candidate starts with the
  // exact contract the test runner expects. Switching the language dropdown
  // swaps the stub in place via handleLanguageChange.
  useEffect(() => {
    setProblems(codingProblems);
    if (_open && codingProblems.length > 0) {
      const initialCodes: Record<number, string> = {};
      codingProblems.forEach((p, idx) => {
        const pid = p.problemId ?? idx;
        initialCodes[pid] = getStubForLanguage(p, language);
      });
      setCodes(initialCodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_open]);

  // Fetch problems by IDs if array is empty
  useEffect(() => {
    if (
      _open &&
      (codingProblems.length === 0 || problems.length === 0) &&
      codingProblemsId &&
      codingProblemsId.length > 0
    ) {
      Promise.all(
        codingProblemsId.map((id) =>
          fetch(`https://api.kdz.asia/api/coding-problems/${id}`)
            .then((r) => r.json())
            .catch(() => null)
        )
      ).then((results) => {
        const fetched = results.filter(Boolean) as CodingProblemSnapshot[];
        if (fetched.length > 0) {
          setProblems(fetched);
          // Pre-fill every freshly fetched problem with the active language's
          // BE-authored code stub (or empty buffer if no stub is registered).
          const initialCodes: Record<number, string> = {};
          fetched.forEach((p, idx) => {
            const pid = p.problemId ?? idx;
            initialCodes[pid] = getStubForLanguage(p, language);
          });
          setCodes(initialCodes);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_open]);

  const activeProblem = problems[activeProblemIdx];
  const activeProblemId = activeProblem?.problemId ?? activeProblemIdx;
  // Fall back to the active language's BE-authored stub (or empty buffer) so
  // Monaco never renders an empty editor with a missing cursor position.
  const activeCode = codes[activeProblemId] ?? getStubForLanguage(activeProblem, language);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      setCodes((prev) => ({
        ...prev,
        [activeProblemId]: value ?? "",
      }));
    },
    [activeProblemId]
  );

  const handleLanguageChange = useCallback(
    (lang: string) => {
      setLanguage(lang);
      // 2026-07-18: LeetCode-style — switching the language ALWAYS swaps the
      // editor buffer to the matching stub (sourced from
      // `problem.codeStubs[lang]` on the backend). Any unsaved work in the
      // previous language is replaced. If the BE has no stub for the chosen
      // language we leave the buffer empty so the candidate can start fresh.
      setCodes((prev) => {
        const next: Record<number, string> = {};
        problems.forEach((p, idx) => {
          const pid = p.problemId ?? idx;
          next[pid] = getStubForLanguage(p, lang);
        });
        // Keep any extra problem entries that don't appear in `problems`
        // (defensive — should not happen but avoids data loss).
        Object.keys(prev).forEach((k) => {
          const key = Number(k);
          if (!(key in next)) next[key] = prev[key];
        });
        return next;
      });
    },
    [problems]
  );

  /**
   * Run the candidate's current code against the visible examples.
   * 2026-07-18: BE marks this with `isTest: true` so it executes against
   * the problem's visible examples only (no DB persistence). Response is
   * synchronous (no polling needed) and includes per-test PASSED/FAILED
   * plus the actual output, so we can surface it inline below the editor.
   */
  const handleRunTests = async () => {
    const target = problems[activeProblemIdx];
    if (!target) {
      toast.warning(t("compCodingSubmissionModal.noProblemsCannotSubmit"));
      return;
    }
    const problemId = target.problemId ?? activeProblemIdx;
    const code = codes[problemId] ?? "";
    if (!code.trim()) {
      toast.warning(t("compCodingSubmissionModal.pleaseWriteCodeBeforeRunning"));
      return;
    }

    setIsRunning(true);
    try {
      const compileRequest = [
        {
          problemId,
          language: language as CompileRequest["language"],
          sourceCode: code.split("\n"),
          isTest: true,
        },
      ];
      const result = await applicationDetailManager.submit({
        applicationId,
        compileRequest,
      });

      if (!result.success) {
        toast.error(
          result.error ??
            t("common.anErrorHasOccurred") ??
            t("compCodingSubmissionModal.errorOccurred")
        );
        return;
      }

      // Surface the BE's sync message ("Compile code thành công") as a
      // first signal, then kick off polling to fetch the per-test-case
      // verdict.
      const syncPayload = result.data as components["schemas"]["SubmissionResult"] | undefined;
      const syncMessage = syncPayload?.message;
      setRunStateByProblem((prev) => ({
        ...prev,
        [problemId]: { status: "PENDING", syncMessage },
      }));
      setActiveTestTab("test");
      if (syncMessage) {
        toast.info(syncMessage);
      }

      const polled = await pollRunTestsResult(applicationId, roundId);
      setRunStateByProblem((prev) => ({
        ...prev,
        [problemId]: { ...polled, syncMessage: prev[problemId]?.syncMessage ?? syncMessage },
      }));
      if (polled.status === "COMPLETED" && polled.compilerStatus !== "COMPILE_ERROR") {
        toast.success(t("compCodingSubmissionModal.runTestsSuccess"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("common.anErrorHasOccurred") ?? t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (problems.length === 0) {
      toast.warning(t("compCodingSubmissionModal.noProblemsCannotSubmit"));
      return;
    }

    const emptyProblems = problems.filter((p) => {
      const code = codes[p.problemId ?? problems.indexOf(p)] ?? "";
      return !code.trim();
    });

    if (emptyProblems.length > 0) {
      toast.warning(
        `Vui lòng nhập code cho tất cả bài. Còn ${emptyProblems.length} bài chưa có nội dung.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 2026-07-18: Per backend confirmation, BE expects one
      // `compileRequest[i]` multipart field per problem — each entry is
      // its own JSON object with `problemId`, `language`, `sourceCode`
      // (List<String>) and `isTest`. application-detail-manager.submit
      // serialises them under indexed keys (compileRequest[0],
      // compileRequest[1], ...) automatically.
      const compileRequest = problems.map((p) => {
        const problemId = p.problemId ?? problems.indexOf(p);
        const code = codes[problemId] ?? "";
        const lines = code.split("\n");
        return {
          problemId,
          language: language as CompileRequest["language"],
          sourceCode: lines,
          isTest: false,
        };
      });

      const result = await applicationDetailManager.submit({
        applicationId,
        compileRequest,
      });

      if (result.success) {
        onOpenChange(false);
        toast.success(
          result.data?.message ??
            t("common.applicationSubmittedSuccessfully") ??
            t("compCodingSubmissionModal.submitSuccess")
        );
        onSuccess?.(result.data?.message);
      } else {
        toast.error(
          result.error ??
            t("common.anErrorHasOccurred") ??
            t("compCodingSubmissionModal.errorOccurred")
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(t("common.anErrorHasOccurred") ?? t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const lineCount = activeCode.split("\n").length;
  const monacoLang = LANGUAGES.find((l) => l.value === language)?.monaco ?? "java";

  return (
    <Dialog open={_open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col overflow-hidden p-0"
        style={{ width: "95vw", height: "92vh", maxWidth: "95vw", maxHeight: "92vh" }}>
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-3 text-base">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-sm">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-slate-900 dark:text-white">
                  {roundName ?? t("adminCodingProblem.programmingRound")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {problems.length > 0
                      ? `${problems.length} bài tập · ${LANGUAGES.find((l) => l.value === language)?.label}`
                      : t("adminCodingProblem.noProblem")}
                  </span>
                </div>
              </div>
            </DialogTitle>

            <div className="flex shrink-0 items-center gap-3">
              {timeLimitMinutes > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800">
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-700 tabular-nums dark:text-amber-300">
                    {timeLimitMinutes} {t("common.minute")}
                  </span>
                </div>
              )}
              {/* Run Tests — chạy với visible examples, sync response, KHÔNG lưu DB */}
              <Button
                onClick={handleRunTests}
                disabled={isRunning || isSubmitting}
                size="sm"
                variant="outline"
                className="gap-2 border-blue-300 px-3 font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20">
                {isRunning ? (
                  <>
                    <Spinner size="sm" />
                    <span>{t("compCodingSubmissionModal.running")}</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>{t("compCodingSubmissionModal.runTests")}</span>
                  </>
                )}
              </Button>
              {/* Submit Final — chấm với hidden test cases, async (cần polling) */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                size="sm"
                className="gap-2 bg-green-600 px-4 font-semibold shadow-sm hover:bg-green-700">
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" tone="white" />
                    <span>{t("common.submitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>{t("compCodingSubmissionModal.submitFinal")}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── IDE workspace ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — problem list */}
          <div
            className={cn(
              "flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-100 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900",
              sidebarCollapsed ? "w-12" : "w-72"
            )}>
            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="group flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800/50">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {t("compCodingSubmissionModal.problem")}
                </span>
              )}
              <div className="ml-auto rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200">
                <svg
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    sidebarCollapsed && "rotate-180"
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5">
                  <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {!sidebarCollapsed && (
              <div className="flex-1 overflow-y-auto py-2">
                {problems.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {t("compCodingSubmissionModal.noProblem")}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {t("compCodingSubmissionModal.adminNotConfiguredProblems")}
                    </p>
                  </div>
                ) : (
                  problems.map((problem, idx) => {
                    const problemId = problem.problemId ?? idx;
                    const code = codes[problemId] ?? "";
                    // "hasCode" = user has typed something beyond the BE stub.
                    // Comparing against the stub is unreliable since admins
                    // can author empty or custom skeletons; simpler rule is:
                    // anything non-empty after a trim counts as user input.
                    const hasCode = code.trim().length > 0;
                    const isActive = activeProblemIdx === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveProblemIdx(idx)}
                        className={cn(
                          "group flex w-full items-start gap-3 px-4 py-3 text-left transition-all",
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
                        )}>
                        <div className="mt-0.5 shrink-0">
                          {hasCode ? (
                            <CheckCircle2
                              className={cn(
                                "h-4 w-4",
                                isActive ? "text-green-300" : "text-green-500"
                              )}
                            />
                          ) : (
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border-2",
                                isActive
                                  ? "border-white/50"
                                  : "border-slate-300 dark:border-slate-600"
                              )}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[10px] font-bold",
                                isActive ? "text-blue-200" : "text-slate-400"
                              )}>
                              #{idx + 1}
                            </span>
                            {problem.difficulty && (
                              <DifficultyPill difficulty={problem.difficulty} active={isActive} />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug font-medium">
                            {problem.title ?? `Bài #${idx + 1}`}
                          </p>
                          {(problem.executionTimeLimitMs || problem.memoryLimitMb) && (
                            <div className="mt-1 flex items-center gap-2">
                              {problem.executionTimeLimitMs && (
                                <span
                                  className={cn(
                                    "flex items-center gap-0.5 text-[9px]",
                                    isActive ? "text-blue-200" : "text-slate-400"
                                  )}>
                                  <Clock className="h-2.5 w-2.5" />
                                  {problem.executionTimeLimitMs >= 1000
                                    ? `${problem.executionTimeLimitMs / 1000}s`
                                    : `${problem.executionTimeLimitMs}ms`}
                                </span>
                              )}
                              {problem.memoryLimitMb && (
                                <span
                                  className={cn(
                                    "flex items-center gap-0.5 text-[9px]",
                                    isActive ? "text-blue-200" : "text-slate-400"
                                  )}>
                                  <Terminal className="h-2.5 w-2.5" />
                                  {problem.memoryLimitMb}MB
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Center — Monaco Editor */}
          <div
            className={cn(
              "flex flex-1 flex-col overflow-hidden",
              isDark ? "bg-[#1e1e1e]" : "bg-white"
            )}>
            {/* Editor toolbar */}
            <div
              className={cn(
                "flex h-11 shrink-0 items-center justify-between border-b px-4",
                isDark ? "border-white/10 bg-[#252526]" : "border-slate-200 bg-slate-50"
              )}>
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-orange-400" />
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    isDark ? "text-slate-300" : "text-slate-700"
                  )}>
                  {activeProblem?.title ?? `submission_${activeProblemIdx + 1}`}
                </span>
                {activeProblem && (
                  <DifficultyPill
                    difficulty={activeProblem.difficulty ?? "MEDIUM"}
                    active={false}
                  />
                )}
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "h-7 rounded border px-2 text-xs font-medium focus:border-blue-500 focus:outline-none",
                    isDark
                      ? "border-white/20 bg-[#3c3c3c] text-slate-200"
                      : "border-slate-300 bg-white text-slate-700"
                  )}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 tabular-nums">{lineCount} lines</span>
              </div>
            </div>

            {/* Editor + Test Results tabs */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Tab strip */}
              <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setActiveTestTab("editor")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors",
                    activeTestTab === "editor"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}>
                  <Code2 className="h-3.5 w-3.5" />
                  {t("compCodingSubmissionModal.submit")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTestTab("test")}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors",
                    activeTestTab === "test"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  )}>
                  <Terminal className="h-3.5 w-3.5" />
                  {t("compCodingSubmissionModal.testResults")}
                  {runStateByProblem[activeProblemId] && (
                    <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {runStateByProblem[activeProblemId]?.testCases?.length ?? 0}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab content */}
              {activeTestTab === "editor" ? (
                <div className="flex-1 overflow-hidden">
                  <Editor
                    height="100%"
                    language={monacoLang}
                    value={activeCode}
                    onChange={handleCodeChange}
                    theme={monacoTheme}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      lineHeight: 22,
                      lineNumbers: "on",
                      folding: true,
                      wordWrap: "on",
                      padding: { top: 16, bottom: 16 },
                      scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                      renderLineHighlight: "line",
                      tabSize: 4,
                      insertSpaces: true,
                      automaticLayout: true,
                      glyphMargin: false,
                      fixedOverflowWidgets: true,
                    }}
                  />
                </div>
              ) : (
                <RunTestsPanel state={runStateByProblem[activeProblemId]} />
              )}
            </div>
          </div>

          {/* Right panel — problem details */}
          <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                {activeProblem
                  ? `Đề bài #${activeProblemIdx + 1}`
                  : t("compCodingSubmissionModal.noProblemContent")}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeProblem ? (
                <ProblemView problem={activeProblem} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BookOpen className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                  <p className="mt-3 text-sm font-medium text-slate-400">
                    {t("compCodingSubmissionModal.noProblemInfo")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Problem View sub-component
// ──────────────────────────────────────────────

function ProblemView({ problem }: { problem: CodingProblemSnapshot }) {
  return (
    <div className="space-y-5">
      {/* Title + difficulty */}
      {problem.title && (
        <div>
          <h3 className="text-sm leading-snug font-bold text-slate-900 dark:text-slate-100">
            {problem.title}
          </h3>
        </div>
      )}

      {/* Constraints badges */}
      <div className="flex flex-wrap gap-1.5">
        {problem.difficulty && <DifficultyPill difficulty={problem.difficulty} active={false} />}
        {problem.executionTimeLimitMs && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {problem.executionTimeLimitMs >= 1000
              ? `${problem.executionTimeLimitMs / 1000}s`
              : `${problem.executionTimeLimitMs}ms`}
          </span>
        )}
        {problem.memoryLimitMb && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Terminal className="h-3 w-3" />
            {problem.memoryLimitMb}MB
          </span>
        )}
      </div>

      {/* Problem statement */}
      {problem.problemStatement && (
        <div>
          <SectionLabel>{t("compCodingSubmissionModal.description")}</SectionLabel>
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-300">
            {problem.problemStatement}
          </p>
        </div>
      )}

      {/* Rules & Constraints */}
      {problem.rulesAndConstraints && problem.rulesAndConstraints.length > 0 && (
        <div>
          <SectionLabel>{t("compCodingSubmissionModal.constraints")}</SectionLabel>
          <ul className="space-y-1.5">
            {problem.rulesAndConstraints.map((rule, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                <span className="font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {rule}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visible Examples */}
      {problem.visibleExamples && problem.visibleExamples.length > 0 && (
        <div>
          <SectionLabel>{t("common.example")}</SectionLabel>
          <div className="space-y-3">
            {problem.visibleExamples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                {ex.inputs && (
                  <div className="mb-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">Input: </span>
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                      {Array.isArray(ex.inputs) ? ex.inputs.join(", ") : ex.inputs}
                    </span>
                  </div>
                )}
                {ex.output && (
                  <div className="mb-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">Output: </span>
                    <span className="font-mono text-xs text-green-600 dark:text-green-400">
                      {ex.output}
                    </span>
                  </div>
                )}
                {ex.explanation && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {t("common.explanation")}{" "}
                    </span>
                    <span className="text-xs text-slate-500 italic dark:text-slate-400">
                      {ex.explanation}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 2026-07-18: removed the "Code stub" preview block. Candidates used to
          have to copy/paste the skeleton from this panel into the editor;
          now the stub is auto-applied on open + every language switch (see
          getStubForLanguage). The right panel stays focused on the problem
          statement + examples. */}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
      {children}
    </h4>
  );
}

function DifficultyPill({ difficulty, active }: { difficulty: string; active: boolean }) {
  const map: Record<string, string> = {
    EASY: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    HARD: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  const activeMap: Record<string, string> = {
    EASY: "bg-green-300/20 text-green-200 ring-1 ring-green-300/30",
    MEDIUM: "bg-amber-300/20 text-amber-200 ring-1 ring-amber-300/30",
    HARD: "bg-red-300/20 text-red-200 ring-1 ring-red-300/30",
  };
  const labels: Record<string, string> = {
    EASY: t("common.easy"),
    MEDIUM: "TB",
    HARD: t("common.hard"),
  };

  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[9px] font-bold",
        active ? (activeMap[difficulty] ?? "") : (map[difficulty] ?? "bg-slate-100 text-slate-500")
      )}>
      {labels[difficulty] ?? difficulty}
    </span>
  );
}

/**
 * Right-panel test result viewer. 2026-07-18: only renders when the
 * candidate has hit "Run Tests" — surfaces per-test-case PASSED/FAILED,
 * compile errors and any message from the BE controller.
 */
function RunTestsPanel({
  state,
}: {
  state:
    | {
        status: "PENDING" | "COMPLETED" | "ERROR";
        syncMessage?: string;
        passed?: number;
        total?: number;
        testCases?: components["schemas"]["TestCaseResult"][];
        errorMessage?: string;
        compilerStatus?: string;
      }
    | undefined;
}) {
  const { t } = useTranslation();
  const testCases = state?.testCases ?? [];
  const hasResults = testCases.length > 0;
  const passed = testCases.filter((tc) => tc.status?.toLowerCase() === "passed").length;
  const failed = testCases.filter((tc) => tc.status?.toLowerCase() === "failed").length;
  const errored = testCases.filter((tc) => tc.status?.toLowerCase() === "error").length;
  const isPending = state?.status === "PENDING";
  const compileError = state?.compilerStatus === "COMPILE_ERROR" && state?.errorMessage;

  if (!state) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-slate-50 p-8 text-center dark:bg-slate-900">
        <Terminal className="h-10 w-10 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("compCodingSubmissionModal.noTestResultsYet")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900">
      {state.syncMessage && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          {state.syncMessage}
        </div>
      )}

      {compileError && (
        <pre className="mb-3 overflow-x-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {compileError}
        </pre>
      )}

      {isPending && !hasResults && !compileError && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Spinner size="sm" />
          <span>{t("compCodingSubmissionModal.running")}</span>
        </div>
      )}

      {hasResults && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            {state.passed ?? passed}
          </span>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {state.total ?? testCases.length}
          </span>
          <span className="text-[10px] text-slate-500">
            {t("compCodingSubmissionModal.testPassed")}
          </span>
          {failed > 0 && (
            <span className="ml-auto rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {failed} {t("compCodingSubmissionModal.testFailed")}
            </span>
          )}
          {errored > 0 && (
            <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              {errored} {t("compCodingSubmissionModal.testError")}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {testCases.map((tc, idx) => {
          const status = tc.status?.toUpperCase() ?? "UNKNOWN";
          const isPassed = status === "PASSED";
          const isError = status === "ERROR";
          return (
            <div
              key={idx}
              className={cn(
                "rounded-lg border p-3 font-mono text-xs",
                isPassed && "border-green-200 bg-white dark:border-green-900 dark:bg-green-950/20",
                !isPassed &&
                  !isError &&
                  "border-red-200 bg-white dark:border-red-900 dark:bg-red-950/20",
                isError && "border-orange-200 bg-white dark:border-orange-900 dark:bg-orange-950/20"
              )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                      isPassed && "bg-green-500 text-white",
                      !isPassed && !isError && "bg-red-500 text-white",
                      isError && "bg-orange-500 text-white"
                    )}>
                    {idx + 1}
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      isPassed && "text-green-700 dark:text-green-300",
                      !isPassed && !isError && "text-red-700 dark:text-red-300",
                      isError && "text-orange-700 dark:text-orange-300"
                    )}>
                    {status}
                  </span>
                  {tc.executionTimeMs !== undefined && tc.executionTimeMs > 0 && (
                    <span className="text-[10px] text-slate-400">({tc.executionTimeMs}ms)</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">{status}</span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {tc.input && (
                  <div>
                    <span className="font-bold text-slate-500">
                      {t("compCodingSubmissionModal.testInput")}:{" "}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{tc.input}</span>
                  </div>
                )}
                <div>
                  <span className="font-bold text-slate-500">
                    {t("compCodingSubmissionModal.expectedOutput")}:{" "}
                  </span>
                  <span className="text-green-600 dark:text-green-300">{tc.expectedOutput}</span>
                </div>
                {!isPassed && tc.actualOutput && (
                  <div>
                    <span className="font-bold text-slate-500">
                      {t("compCodingSubmissionModal.actualOutput")}:{" "}
                    </span>
                    <span className="text-red-600 dark:text-red-300">{tc.actualOutput}</span>
                  </div>
                )}
                {tc.errorMessage && (
                  <pre className="mt-1 overflow-x-auto rounded bg-red-100 p-2 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {tc.errorMessage}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
