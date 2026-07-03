"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useMonacoTheme } from "@/hooks/useMonacoTheme";
import { cn } from "@/lib/utils";
import type { CodeReviewSubmission as CodeReviewSubmissionType } from "@/services/application-detail.manager";
import { applicationDetailManager } from "@/services/application-detail.manager";
import { codeReviewProblemManager } from "@/services/code-review-problem.manager";
import Editor from "@monaco-editor/react";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  Eye,
  FileCode2,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../schema-from-be";

type CodeReviewProblemSnapshot = components["schemas"]["CodeReviewProblemSnapshot"];
type SchemaCodeReviewSubmission = components["schemas"]["CodeReviewSubmission"];

export interface CodeReviewSubmissionModalProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  applicationId: number;
  roundId?: number;
  roundName?: string;
  codeReviewProblems?: CodeReviewProblemSnapshot[];
  codeReviewProblemsId?: number[];
  instruction?: string;
  onSuccess?: (_message?: string) => void;
}

type Severity = "CRITICAL" | "WARNING" | "INFO";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; className: string; dotClassName: string; bgClassName: string }
> = {
  CRITICAL: {
    label: "Critical",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300",
    dotClassName: "bg-red-500",
    bgClassName: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  WARNING: {
    label: "Warning",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    dotClassName: "bg-amber-500",
    bgClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  INFO: {
    label: "Info",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    dotClassName: "bg-blue-500",
    bgClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

interface UserIssue extends Omit<SchemaCodeReviewSubmission, "lineNumber"> {
  lineNumber: number | null;
}

export function CodeReviewSubmissionModal({
  open,
  onOpenChange,
  applicationId,
  roundId,
  roundName,
  codeReviewProblems,
  codeReviewProblemsId,
  instruction,
  onSuccess,
}: CodeReviewSubmissionModalProps) {
  const { t } = useTranslation();

  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [userIssues, setUserIssues] = useState<Record<number, UserIssue[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);
  const [loadedProblems, setLoadedProblems] = useState<CodeReviewProblemSnapshot[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const monacoTheme = useMonacoTheme();
  const isDark = monacoTheme === "vs-dark";

  // Merge: use pre-loaded problems from props, or fetch by IDs
  const problems = loadedProblems.length > 0 ? loadedProblems : (codeReviewProblems ?? []);

  // Fetch full problem details when modal opens (when IDs are provided but full data is missing)
  useEffect(() => {
    if (!open) return;

    const idsToFetch = codeReviewProblemsId?.filter((id) => {
      // Only fetch if we don't already have full data in codeReviewProblems
      const hasFullData = codeReviewProblems?.some(
        (p) => p.problemId === id && (p.files?.length ?? 0) > 0
      );
      return !hasFullData;
    });

    if (!idsToFetch || idsToFetch.length === 0) {
      setLoadedProblems([]);
      return;
    }

    setIsLoadingProblems(true);
    Promise.all(idsToFetch.map((id) => codeReviewProblemManager.getById(id)))
      .then((results) => {
        const fetched: CodeReviewProblemSnapshot[] = [];
        results.forEach((res) => {
          if (res.success && res.data) {
            fetched.push({
              problemId: res.data.id,
              title: res.data.title,
              difficulty: res.data.difficulty as "EASY" | "MEDIUM" | "HARD",
              language: res.data.language,
              problemStatement: res.data.problemStatement,
              files: res.data.files ?? [],
              expectedIssues: res.data.expectedIssues ?? [],
            });
          }
        });
        setLoadedProblems(fetched);
      })
      .catch(() => {
        toast.error(t("adminCodeReviewProblem.errorLoadList"));
      })
      .finally(() => setIsLoadingProblems(false));
  }, [open, codeReviewProblemsId, codeReviewProblems, t]);

  const currentProblem = problems?.[activeProblemIdx];
  const currentFiles = currentProblem?.files ?? [];
  const currentFile = activeFileIdx < currentFiles.length ? currentFiles[activeFileIdx] : null;
  const currentIssues = userIssues[activeProblemIdx] ?? [];

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setActiveProblemIdx(0);
      setActiveFileIdx(0);
      setUserIssues({});
      setShowPreview(false);
    }
  }, [open]);

  const getMonacoLanguage = (lang: string | undefined): string => {
    if (!lang) return "plaintext";
    const map: Record<string, string> = {
      java: "java",
      javascript: "javascript",
      js: "javascript",
      typescript: "typescript",
      ts: "typescript",
      python: "python",
      py: "python",
      csharp: "csharp",
      "c#": "csharp",
      cpp: "cpp",
      "c++": "cpp",
      c: "c",
      go: "go",
      rust: "rust",
      kotlin: "kotlin",
      swift: "swift",
      php: "php",
      ruby: "ruby",
      sql: "sql",
      xml: "xml",
      html: "html",
      css: "css",
    };
    return map[lang.toLowerCase()] ?? "plaintext";
  };

  const addIssue = useCallback(
    (severity: Severity = "WARNING") => {
      const newIssue: UserIssue = {
        filename: currentFile?.filename ?? "",
        lineNumber: null,
        severity,
        description: "",
      };
      setUserIssues((prev) => ({
        ...prev,
        [activeProblemIdx]: [...(prev[activeProblemIdx] ?? []), newIssue],
      }));
    },
    [activeProblemIdx, currentFile]
  );

  const updateIssue = useCallback(
    (issueIdx: number, field: keyof UserIssue, value: string | number | null) => {
      setUserIssues((prev) => {
        const prevIssues = prev[activeProblemIdx] ?? [];
        const updated = [...prevIssues];
        updated[issueIdx] = { ...updated[issueIdx], [field]: value };
        return { ...prev, [activeProblemIdx]: updated };
      });
    },
    [activeProblemIdx]
  );

  const removeIssue = useCallback(
    (issueIdx: number) => {
      setUserIssues((prev) => ({
        ...prev,
        [activeProblemIdx]: (prev[activeProblemIdx] ?? []).filter((_, i) => i !== issueIdx),
      }));
    },
    [activeProblemIdx]
  );

  const handleSubmit = async () => {
    const submissions: CodeReviewSubmissionType[] = [];
    for (const issues of Object.values(userIssues)) {
      for (const issue of issues) {
        if (
          issue.description?.trim() &&
          issue.filename &&
          issue.lineNumber != null &&
          issue.severity
        ) {
          submissions.push({
            filename: issue.filename,
            lineNumber: issue.lineNumber,
            severity: issue.severity,
            description: issue.description,
          });
        }
      }
    }

    if (submissions.length === 0) {
      toast.error(t("userApplicationhistory.pleaseAddAtLeastOneIssue"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await applicationDetailManager.submitCodeReview({
        applicationId,
        roundId: roundId ?? 0,
        submissions,
      });

      if (result.success) {
        toast.success(result.data?.message ?? t("common.applicationSubmittedSuccessfully"));
        onOpenChange(false);
        onSuccess?.(result.data?.message);
      } else {
        toast.error(result.error ?? t("common.anErrorHasOccurred"));
      }
    } catch {
      toast.error(t("common.anErrorHasOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  const canSubmit = Object.values(userIssues).some((issues) =>
    issues.some((i) => i.description?.trim())
  );

  const totalIssuesFound = Object.values(userIssues).reduce(
    (sum, issues) => sum + issues.filter((i) => i.description?.trim()).length,
    0
  );

  const currentProblemExpectedIssues = currentProblem?.expectedIssues ?? [];
  const currentFoundCount = currentIssues.filter((i) => i.description?.trim()).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col overflow-hidden p-0"
        style={{ width: "95vw", height: "92vh", maxWidth: "95vw", maxHeight: "92vh" }}>
        {/* ── Header ── */}
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-3 text-base">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
                <Search className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-slate-900 dark:text-white">
                  {roundName ?? t("userApplicationhistory.codeReviewRound")}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {problems.length > 0
                      ? `${problems.length} ${t("userApplicationhistory.problem")} · ${currentProblem?.language ?? ""}`
                      : t("adminCodeReviewProblem.noFileOpen")}
                  </span>
                </div>
              </div>
            </DialogTitle>

            <div className="flex shrink-0 items-center gap-3">
              {/* Issue counter badge */}
              <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <AlertCircle className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-600 tabular-nums dark:text-slate-300">
                  {totalIssuesFound} {t("userApplicationhistory.issuesReported")}
                </span>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting || isLoadingProblems}
                size="sm"
                className="gap-2 bg-[#0047AB] px-5 font-semibold shadow-sm hover:bg-[#003d91] disabled:bg-slate-300">
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" tone="white" />
                    <span>{t("compUi.submitting")}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {t("common.submit")} ({totalIssuesFound})
                    </span>
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
              "flex shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50 transition-all duration-200 dark:border-slate-700 dark:bg-slate-900",
              sidebarCollapsed ? "w-12" : "w-72"
            )}>
            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="group flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800/50">
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {t("userApplicationhistory.problem")}
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
                {isLoadingProblems ? (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <Spinner size="sm" tone="primary" />
                    <p className="mt-3 text-xs text-slate-400">{t("common.loading")}...</p>
                  </div>
                ) : problems.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-8 text-center">
                    <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {t("adminCodeReviewProblem.noFileOpen")}
                    </p>
                  </div>
                ) : (
                  problems.map((problem, idx) => {
                    const issueCount = (userIssues[idx] ?? []).filter((i) =>
                      i.description?.trim()
                    ).length;
                    const isActive = activeProblemIdx === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveProblemIdx(idx);
                          setActiveFileIdx(0);
                        }}
                        className={cn(
                          "group flex w-full items-start gap-3 px-4 py-3 text-left transition-all",
                          isActive
                            ? "bg-[#0047AB] text-white"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        )}>
                        <div className="mt-0.5 shrink-0">
                          {issueCount > 0 ? (
                            <div
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                              )}>
                              {issueCount}
                            </div>
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
                            {problem.language && (
                              <span
                                className={cn(
                                  "rounded px-1 py-0.5 text-[8px] font-medium",
                                  isActive
                                    ? "bg-white/15 text-white/80"
                                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                                )}>
                                {problem.language}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug font-medium">
                            {problem.title ?? `${t("userApplicationhistory.problem")} #${idx + 1}`}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Sidebar collapsed: show problem numbers vertically */}
            {sidebarCollapsed && problems.length > 0 && (
              <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-2">
                {problems.map((_, idx) => {
                  const issueCount = (userIssues[idx] ?? []).filter((i) =>
                    i.description?.trim()
                  ).length;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveProblemIdx(idx);
                        setActiveFileIdx(0);
                        setSidebarCollapsed(false);
                      }}
                      className={cn(
                        "relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all",
                        activeProblemIdx === idx
                          ? "bg-[#0047AB] text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                      )}>
                      {idx + 1}
                      {issueCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
                          {issueCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Center — Monaco Code Editor */}
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
                <FileCode2 className="h-4 w-4 text-blue-400" />
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    isDark ? "text-slate-300" : "text-slate-700"
                  )}>
                  {currentProblem?.title ?? t("userApplicationhistory.codeReviewTitle")}
                </span>
                {currentProblem?.difficulty && (
                  <DifficultyPill difficulty={currentProblem.difficulty} active={false} />
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                {currentFile?.filename && <span className="font-mono">{currentFile.filename}</span>}
                <span>
                  {currentFile?.content ? `${currentFile.content.split("\n").length} lines` : ""}
                </span>
              </div>
            </div>

            {/* File tabs */}
            {currentFiles.length > 0 && (
              <div
                className={cn(
                  "flex shrink-0 items-center overflow-x-auto border-b",
                  isDark ? "border-white/5 bg-[#2d2d2d]" : "border-slate-200 bg-slate-100"
                )}>
                {currentFiles.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFileIdx(idx)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 border-r px-4 py-2 text-xs font-medium transition-colors",
                      isDark ? "border-white/5" : "border-slate-200",
                      idx === activeFileIdx
                        ? cn(
                            "border-b-2 border-b-blue-500",
                            isDark ? "bg-[#1e1e1e] text-white" : "bg-white text-[#0047AB]"
                          )
                        : cn(
                            isDark
                              ? "text-slate-400 hover:bg-[#2a2d2e] hover:text-slate-200"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          )
                    )}>
                    <FileCode2 className="h-3.5 w-3.5 text-blue-400" />
                    {file.filename?.split("/").pop() ?? `File ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}

            {/* Monaco */}
            <div className="flex-1 overflow-hidden">
              {currentFile?.content ? (
                <Editor
                  height="100%"
                  language={getMonacoLanguage(currentFile.language)}
                  value={currentFile.content}
                  theme={monacoTheme}
                  options={{
                    readOnly: true,
                    minimap: { enabled: true, scale: 2 },
                    fontSize: 14,
                    lineHeight: 22,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    renderLineHighlight: "line",
                    glyphMargin: false,
                    fixedOverflowWidgets: true,
                  }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-sm text-slate-500">
                  <BookOpen
                    className={cn("mb-3 h-10 w-10", isDark ? "text-slate-600" : "text-slate-300")}
                  />
                  {t("userApplicationhistory.noCodeFilesAvailable")}
                </div>
              )}
            </div>
          </div>

          {/* Right panel — Issue Reporter */}
          <div className="flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {t("userApplicationhistory.foundIssues")}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {currentFoundCount} / {currentProblemExpectedIssues.length}{" "}
                    {t("userApplicationhistory.issuesFound")}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      "h-7 gap-1 text-[10px]",
                      showPreview && "border-blue-300 bg-blue-50 text-blue-600"
                    )}>
                    <Eye className="h-3 w-3" />
                    {t("userApplicationhistory.preview")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addIssue("WARNING")}
                    className="h-7 gap-1 border-[#0047AB]/30 text-[10px] text-[#0047AB] hover:bg-[#0047AB]/5">
                    <Plus className="h-3 w-3" />
                    {t("userApplicationhistory.addIssue")}
                  </Button>
                </div>
              </div>

              {/* Severity legend */}
              <div className="mt-2 flex items-center gap-3">
                {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => (
                  <div key={sev} className="flex items-center gap-1">
                    <div
                      className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_CONFIG[sev].dotClassName)}
                    />
                    <span className="text-[10px] text-slate-500">{SEVERITY_CONFIG[sev].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem statement (collapsible) */}
            {currentProblem?.problemStatement && (
              <details className="shrink-0 border-b border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30">
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none hover:text-slate-600 dark:hover:text-slate-300">
                  <ChevronDown className="h-3 w-3 transition-transform [[open]>&]:rotate-180" />
                  {t("userApplicationhistory.problem")}
                </summary>
                <div className="max-h-[120px] overflow-y-auto px-4 pb-3">
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                    {currentProblem.problemStatement}
                  </p>
                  {instruction && (
                    <p className="mt-2 text-xs text-slate-500 italic dark:text-slate-500">
                      {instruction}
                    </p>
                  )}
                </div>
              </details>
            )}

            {/* Issues list */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* Preview: expected issues */}
              {showPreview && currentProblemExpectedIssues.length > 0 && (
                <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <h4 className="mb-2 text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    {t("userApplicationhistory.expectedIssues")} (
                    {currentProblemExpectedIssues.length})
                  </h4>
                  <div className="space-y-1.5">
                    {currentProblemExpectedIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 rounded bg-white p-2 dark:bg-slate-900">
                        <span
                          className={cn(
                            "mt-0.5 shrink-0",
                            SEVERITY_CONFIG[(issue.severity as Severity) ?? "WARNING"].dotClassName,
                            "h-1.5 w-1.5 rounded-full"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-slate-500">
                              L{issue.lineNumber}
                            </span>
                            <span
                              className={cn(
                                "rounded px-1 py-0.5 text-[9px] font-medium",
                                SEVERITY_CONFIG[(issue.severity as Severity) ?? "WARNING"].className
                              )}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-600 dark:text-slate-400">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <AlertCircle className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("userApplicationhistory.noIssuesFoundYet")}
                  </p>
                  <p className="mt-1 max-w-[200px] text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                    {t("userApplicationhistory.clickAddIssueToStart")}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addIssue("WARNING")}
                    className="mt-4 gap-1.5 border-[#0047AB]/30 text-xs text-[#0047AB] hover:bg-[#0047AB]/5">
                    <Plus className="h-3.5 w-3.5" />
                    {t("userApplicationhistory.addIssue")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        SEVERITY_CONFIG[(issue.severity as Severity) ?? "WARNING"].className
                      )}>
                      <div className="mb-2.5 flex items-center justify-between">
                        {/* Severity selector */}
                        <div className="flex gap-0.5 rounded-md bg-white/60 p-0.5 dark:bg-slate-900/40">
                          {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((sev) => (
                            <button
                              key={sev}
                              onClick={() => updateIssue(idx, "severity", sev)}
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px] font-bold transition-all",
                                issue.severity === sev
                                  ? SEVERITY_CONFIG[sev].bgClassName
                                  : "text-current/40 hover:text-current/70"
                              )}>
                              {SEVERITY_CONFIG[sev].label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => removeIssue(idx)}
                          className="shrink-0 rounded p-1 text-current/40 transition-colors hover:bg-white/50 hover:text-current/80 dark:hover:bg-slate-900/50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* File + Line number */}
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[9px] font-semibold tracking-wider text-current/60 uppercase">
                            {t("adminCodeReviewProblem.filename")}
                          </label>
                          <select
                            value={issue.filename}
                            onChange={(e) => updateIssue(idx, "filename", e.target.value)}
                            className="w-full rounded border border-current/15 bg-white/70 px-2 py-1.5 font-mono text-[10px] focus:ring-1 focus:ring-current/30 focus:outline-none dark:bg-slate-900/50">
                            {currentFiles.map((f, fIdx) => (
                              <option key={fIdx} value={f.filename}>
                                {f.filename}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[9px] font-semibold tracking-wider text-current/60 uppercase">
                            {t("userApplicationhistory.lineNumber")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={issue.lineNumber ?? ""}
                            onChange={(e) =>
                              updateIssue(
                                idx,
                                "lineNumber",
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            placeholder="e.g. 42"
                            className="w-full rounded border border-current/15 bg-white/70 px-2 py-1.5 font-mono text-[10px] tabular-nums focus:ring-1 focus:ring-current/30 focus:outline-none dark:bg-slate-900/50"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="mb-1 block text-[9px] font-semibold tracking-wider text-current/60 uppercase">
                          {t("userApplicationhistory.issueDescription")}
                        </label>
                        <textarea
                          value={issue.description}
                          onChange={(e) => updateIssue(idx, "description", e.target.value)}
                          placeholder={t("userApplicationhistory.describeTheIssue")}
                          rows={3}
                          className="w-full resize-none rounded border border-current/15 bg-white/70 px-2 py-1.5 text-xs leading-relaxed focus:ring-1 focus:ring-current/30 focus:outline-none dark:bg-slate-900/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer stats */}
            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-medium">
                  {totalIssuesFound} {t("userApplicationhistory.issuesReported")}
                </span>
                <span>
                  {currentProblemExpectedIssues.length} {t("userApplicationhistory.expected")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Helper sub-components
// ──────────────────────────────────────────────

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
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
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
