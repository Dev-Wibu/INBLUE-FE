import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpinnerBlock } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { applicationDetailManager } from "@/services/application-detail.manager";
import { codeReviewProblemManager } from "@/services/code-review-problem.manager";
import {
  AlertOctagon,
  AlertTriangle,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  FileCode2,
  Info,
  Layers,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type CodeReviewProblemSnapshot = components["schemas"]["CodeReviewProblemSnapshot"];
type CodeFile = components["schemas"]["CodeFile"];
type CodeReviewSubmission = components["schemas"]["CodeReviewSubmission"];
type AiFeedback = components["schemas"]["AiFeedback"];
type ApplicationDetail = components["schemas"]["ApplicationDetail"];

type Severity = "CRITICAL" | "WARNING" | "INFO";

interface LocalDraftIssue {
  filename: string;
  lineNumber: number;
  severity: Severity;
  description: string;
}

interface InlineEditorState {
  problemId: number;
  filename: string;
  lineNumber: number;
  severity: Severity;
  description: string;
  editingIndex: number | null;
}

interface CodeReviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

// ============================================================================
// Localised labels + theme tokens for the 3 severity levels
// ============================================================================

const SEVERITY_KEYS: Record<Severity, { label: string; desc: string }> = {
  CRITICAL: {
    label: "CRITICAL",
    desc: "Critical issue (Crash, Security, Data Loss)",
  },
  WARNING: {
    label: "WARNING",
    desc: "Warning (Performance, Memory leak, Race condition)",
  },
  INFO: {
    label: "INFO",
    desc: "Minor suggestion (Code smell, Refactor, Naming, Format)",
  },
};

const SEVERITY_TOKENS: Record<
  Severity,
  {
    bar: string;
    bg: string;
    border: string;
    text: string;
    icon: typeof AlertOctagon;
    dot: string;
    glow: string;
  }
> = {
  CRITICAL: {
    bar: "bg-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800/80",
    text: "text-rose-700 dark:text-rose-400",
    icon: AlertOctagon,
    dot: "bg-rose-500",
    glow: "shadow-rose-500/10",
  },
  WARNING: {
    bar: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800/80",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    dot: "bg-amber-500",
    glow: "shadow-amber-500/10",
  },
  INFO: {
    bar: "bg-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800/80",
    text: "text-sky-700 dark:text-sky-400",
    icon: Info,
    dot: "bg-sky-500",
    glow: "shadow-sky-500/10",
  },
};

// ============================================================================
// Helpers
// ============================================================================

function normalizeFormattedCode(raw?: string | null): string {
  if (!raw) return "";
  let text = String(raw);
  // Handle literal escaped newlines "\n" or "\r\n"
  if (text.includes("\\n") && !text.includes("\n")) {
    text = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "    ")
      .replace(/\\"/g, '"');
  } else {
    text = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  }
  return text;
}

function normalizeProblemSnapshot(problem: CodeReviewProblemSnapshot): CodeReviewProblemSnapshot {
  return {
    ...problem,
    problemStatement: normalizeFormattedCode(problem.problemStatement),
    files: (problem.files || []).map((f) => ({
      ...f,
      content: normalizeFormattedCode(f.content),
    })),
  };
}

function draftKey(applicationId: number, roundId: number, problemId: number): string {
  return `codeReview-draft-${applicationId}-${roundId}-${problemId}`;
}

function timerKey(applicationId: number, roundId: number): string {
  return `codeReview-timer-${applicationId}-${roundId}`;
}

function filenameShort(path: string): string {
  return path.split("/").pop() ?? path;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CodeReviewModule({
  round,
  detail,
  applicationId,
  isCompleted,
  isCurrent,
  onSuccess,
}: CodeReviewModuleProps) {
  const { t } = useTranslation();

  const configData = round.configData as unknown as
    | (typeof round.configData & {
        codeReviewProblems?: CodeReviewProblemSnapshot[];
        codeReviewProblem?: CodeReviewProblemSnapshot;
        codeReviewProblemsId?: number[];
      })
    | undefined;

  const timeLimitMinutes = configData?.timeLimitMinutes ?? 45;
  const maxScore = configData?.maxScore ?? 100;
  const roundId = round.id ?? 0;

  // 1. Extract raw problems from round snapshot
  const rawProblems = useMemo<CodeReviewProblemSnapshot[]>(() => {
    let list: CodeReviewProblemSnapshot[] = [];
    if (Array.isArray(configData?.codeReviewProblems) && configData.codeReviewProblems.length > 0) {
      list = configData.codeReviewProblems;
    } else if (configData?.codeReviewProblem) {
      list = [configData.codeReviewProblem];
    }
    return list.map(normalizeProblemSnapshot);
  }, [configData]);

  // 2. If problem IDs exist but lack full file details, fetch from API
  const [fetchedProblems, setFetchedProblems] = useState<CodeReviewProblemSnapshot[]>([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(false);

  useEffect(() => {
    const ids = configData?.codeReviewProblemsId || [];
    const missingIds = ids.filter(
      (id) => !rawProblems.some((p) => p.problemId === id && (p.files?.length ?? 0) > 0)
    );

    if (missingIds.length === 0) return;

    let isMounted = true;
    setIsLoadingProblems(true);
    Promise.all(missingIds.map((id) => codeReviewProblemManager.getById(id)))
      .then((resList) => {
        if (!isMounted) return;
        const loaded: CodeReviewProblemSnapshot[] = [];
        resList.forEach((r) => {
          if (r.success && r.data) {
            loaded.push(
              normalizeProblemSnapshot({
                problemId: r.data.id,
                title: r.data.title,
                difficulty: r.data.difficulty as "EASY" | "MEDIUM" | "HARD",
                language: r.data.language,
                problemStatement: r.data.problemStatement,
                files: r.data.files ?? [],
                expectedIssues: r.data.expectedIssues ?? [],
              })
            );
          }
        });
        setFetchedProblems(loaded);
      })
      .catch((err) => {
        console.error("Failed to load full code review problems", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProblems(false);
      });

    return () => {
      isMounted = false;
    };
  }, [configData?.codeReviewProblemsId, rawProblems]);

  // Combine and deduplicate problems
  const problems = useMemo<CodeReviewProblemSnapshot[]>(() => {
    const map = new Map<number, CodeReviewProblemSnapshot>();
    for (const p of rawProblems) {
      if (p.problemId != null) map.set(p.problemId, p);
    }
    for (const p of fetchedProblems) {
      if (p.problemId != null) {
        if (!map.has(p.problemId) || (map.get(p.problemId)?.files?.length ?? 0) === 0) {
          map.set(p.problemId, p);
        }
      }
    }
    const result = Array.from(map.values());
    return result.length > 0 ? result : rawProblems;
  }, [rawProblems, fetchedProblems]);

  // Problem switcher index
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const activeProblem = problems[activeProblemIdx] ?? problems[0];

  // Active file per problem (store selected filename)
  const [activeFileByProblem, setActiveFileByProblem] = useState<Record<number, string>>({});

  // Active issues dictionary: problemId -> LocalDraftIssue[]
  const [issuesByProblem, setIssuesByProblem] = useState<Record<number, LocalDraftIssue[]>>({});

  const [step, setStep] = useState<"REVIEWING" | "SUBMITTING" | "GRADED" | "ERROR">("REVIEWING");
  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gradedResult, setGradedResult] = useState<ApplicationDetail | null>(null);

  const isFinished =
    isCompleted ||
    detail?.finalScore != null ||
    detail?.status === "COMPLETED" ||
    detail?.status === "AI_EVALUATED" ||
    step === "GRADED";

  // Hydrate issues from localStorage / previous submission for all problems
  useEffect(() => {
    if (problems.length === 0) return;

    const initialMap: Record<number, LocalDraftIssue[]> = {};
    const submitted = detail?.submissionData?.codeReviewSubmissions;

    problems.forEach((prob) => {
      const pId = prob.problemId ?? 0;
      const storageKey = draftKey(applicationId, roundId, pId);
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as LocalDraftIssue[];
          if (Array.isArray(parsed)) {
            initialMap[pId] = parsed;
            return;
          }
        }
      } catch {
        // ignore
      }

      // If no draft in localStorage, check if previous submitted issues match this problem's files
      if (submitted && submitted.length > 0 && prob.files) {
        const filenames = new Set(prob.files.map((f) => f.filename));
        const matched = submitted
          .filter((s) => filenames.has(s.filename))
          .map((s) => ({
            filename: s.filename ?? "",
            lineNumber: s.lineNumber ?? 1,
            severity: (s.severity as Severity) ?? "WARNING",
            description: s.description ?? "",
          }));
        if (matched.length > 0) {
          initialMap[pId] = matched;
        }
      }
    });

    setIssuesByProblem((prev) => ({ ...initialMap, ...prev }));
  }, [problems, applicationId, roundId, detail?.submissionData?.codeReviewSubmissions]);

  // Auto-save drafts per problem
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (problems.length === 0 || isFinished) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      problems.forEach((prob) => {
        const pId = prob.problemId ?? 0;
        const storageKey = draftKey(applicationId, roundId, pId);
        const pIssues = issuesByProblem[pId] || [];
        try {
          localStorage.setItem(storageKey, JSON.stringify(pIssues));
        } catch {
          // ignore quota
        }
      });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [issuesByProblem, problems, applicationId, roundId, isFinished]);

  // Countdown timer for the whole round
  const timerStorageKey = useMemo(() => timerKey(applicationId, roundId), [applicationId, roundId]);
  const [remainingMs, setRemainingMs] = useState<number>(timeLimitMinutes * 60 * 1000);

  useEffect(() => {
    if (isFinished) return;
    const totalMs = timeLimitMinutes * 60 * 1000;
    let endAt: number;
    try {
      const stored = localStorage.getItem(timerStorageKey);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > Date.now()) {
          endAt = parsed;
        } else {
          endAt = Date.now() + totalMs;
          localStorage.setItem(timerStorageKey, String(endAt));
        }
      } else {
        endAt = Date.now() + totalMs;
        localStorage.setItem(timerStorageKey, String(endAt));
      }
    } catch {
      endAt = Date.now() + totalMs;
    }
    const tick = () => setRemainingMs(Math.max(0, endAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStorageKey, timeLimitMinutes, isFinished]);

  const timedOut = remainingMs <= 0 && !isFinished;
  const editable = !isFinished && isCurrent && !timedOut;

  // Active problem's current files and issues
  const currentProblemId = activeProblem?.problemId ?? 0;
  const currentFiles = activeProblem?.files ?? [];
  const activeFilename = activeFileByProblem[currentProblemId] || currentFiles[0]?.filename || "";
  const currentFile = currentFiles.find((f) => f.filename === activeFilename) ?? currentFiles[0];

  const currentProblemIssues = issuesByProblem[currentProblemId] ?? [];

  // Inline Editor handlers (GitHub Pull Request Code Review style)
  const openInlineEditor = (problemId: number, filename: string, lineNumber: number) => {
    if (!editable) return;
    // If clicking on the already opened line editor with same filename and line, toggle close it
    if (
      inlineEditor &&
      inlineEditor.problemId === problemId &&
      inlineEditor.filename === filename &&
      inlineEditor.lineNumber === lineNumber &&
      inlineEditor.editingIndex === null
    ) {
      setInlineEditor(null);
      return;
    }

    setInlineEditor({
      problemId,
      filename,
      lineNumber,
      severity: "WARNING",
      description: "",
      editingIndex: null,
    });
  };

  const openEditInlineEditor = (problemId: number, index: number) => {
    if (!editable) return;
    const pIssues = issuesByProblem[problemId] ?? [];
    const it = pIssues[index];
    if (!it) return;
    setInlineEditor({
      problemId,
      filename: it.filename,
      lineNumber: it.lineNumber,
      severity: it.severity,
      description: it.description,
      editingIndex: index,
    });
  };

  const closeInlineEditor = () => setInlineEditor(null);

  const saveInlineIssue = () => {
    if (!inlineEditor) return;
    const desc = inlineEditor.description.trim();
    if (!desc) {
      toast.error(t("userApplicationhistory.codeReviewNoDescription", "Vui lòng mô tả issue"));
      return;
    }
    const draft: LocalDraftIssue = {
      filename: inlineEditor.filename,
      lineNumber: inlineEditor.lineNumber,
      severity: inlineEditor.severity,
      description: desc,
    };

    setIssuesByProblem((prev) => {
      const pId = inlineEditor.problemId;
      const list = prev[pId] ? [...prev[pId]] : [];
      if (inlineEditor.editingIndex === null) {
        list.push(draft);
      } else {
        list[inlineEditor.editingIndex] = draft;
      }
      return { ...prev, [pId]: list };
    });

    toast.success(
      inlineEditor.editingIndex === null
        ? t("userApplicationhistory.codeReviewIssueAdded", "Đã thêm nhận xét mới")
        : t("userApplicationhistory.codeReviewIssueUpdated", "Đã cập nhật nhận xét")
    );
    setInlineEditor(null);
  };

  const deleteIssue = (problemId: number, index: number) => {
    if (!editable) return;
    setIssuesByProblem((prev) => {
      const list = (prev[problemId] ?? []).filter((_, i) => i !== index);
      return { ...prev, [problemId]: list };
    });
    // If deleting the issue currently being edited, close inline editor
    if (inlineEditor?.problemId === problemId && inlineEditor?.editingIndex === index) {
      setInlineEditor(null);
    }
    toast.success(t("userApplicationhistory.codeReviewIssueDeleted", "Đã xóa nhận xét"));
  };

  const clearCurrentDraft = () => {
    setIssuesByProblem((prev) => ({ ...prev, [currentProblemId]: [] }));
    try {
      localStorage.removeItem(draftKey(applicationId, roundId, currentProblemId));
    } catch {
      // ignore
    }
    toast.info("Đã xóa danh sách draft issues của bài này");
  };

  // Flatten all issues across all problems
  const allFlattenedIssues = useMemo(() => {
    const list: LocalDraftIssue[] = [];
    Object.values(issuesByProblem).forEach((arr) => {
      list.push(...arr);
    });
    return list;
  }, [issuesByProblem]);

  const severityCounts = useMemo(() => {
    const c = { CRITICAL: 0, WARNING: 0, INFO: 0 } as Record<Severity, number>;
    for (const i of allFlattenedIssues) c[i.severity] += 1;
    return c;
  }, [allFlattenedIssues]);

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setStep("SUBMITTING");
    try {
      const submissions = allFlattenedIssues.map<CodeReviewSubmission>((i) => ({
        filename: i.filename,
        lineNumber: i.lineNumber,
        severity: i.severity,
        description: i.description,
      }));

      const res = await applicationDetailManager.submitCodeReview({
        applicationId,
        roundId,
        submissions: submissions as never,
      });

      if (!res.success) {
        if (res.statusCode === 409) {
          setStep("GRADED");
          toast.error(res.error || "Bai da duoc nop cho vong nay");
          onSuccess?.();
          return;
        }
        throw new Error(res.error || "Submit failed");
      }

      const resDetail = res.data?.detail ?? (res.data as unknown as ApplicationDetail) ?? null;
      setGradedResult(resDetail);
      setStep("GRADED");
      toast.success(
        t(
          "userApplicationhistory.codeReviewSubmitted",
          `Hoàn tất! Điểm: ${resDetail?.finalScore ?? resDetail?.aiScore ?? "?"}/${maxScore}`
        )
      );

      // Clean local storage drafts
      problems.forEach((p) => {
        try {
          localStorage.removeItem(draftKey(applicationId, roundId, p.problemId ?? 0));
        } catch {
          // ignore
        }
      });

      onSuccess?.();
    } catch (err) {
      console.error("[CodeReviewModule] Submit error:", err);
      const message = err instanceof Error ? err.message : "Nộp Review thất bại";
      toast.error(message);
      setStep("ERROR");
    } finally {
      setSubmitting(false);
    }
  };

  const activeGradedDetail = gradedResult ?? detail;

  // Loading state
  if (isLoadingProblems) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <SpinnerBlock />
        <p className="mt-4 text-xs font-semibold text-slate-400">
          Đang tải dữ liệu bài tập Code Review...
        </p>
      </div>
    );
  }

  // Empty state
  if (problems.length === 0 || !activeProblem) {
    return (
      <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-amber-300">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <span className="text-sm font-semibold">
            {t(
              "userApplicationhistory.codeReviewEmptyState",
              "Vòng này hiện chưa có bài Code Review nào."
            )}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── FULLSCREEN SUBMITTING / GRADING OVERLAY BLOCKER ── */}
      {submitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md transition-all duration-300">
          <div className="relative mx-4 flex max-w-md flex-col items-center gap-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/95">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20 duration-1000" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Code2 className="h-5 w-5 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black tracking-tight text-slate-950 dark:text-white">
                {t(
                  "userApplicationhistory.codeReviewSubmittingTitle",
                  "AI đang chấm điểm Code Review..."
                )}
              </h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {t(
                  "userApplicationhistory.codeReviewSubmittingSubtitle",
                  "Mô hình AI đang đối chiếu các phát hiện của bạn với bộ Expected Issues để tính điểm chi tiết. Vui lòng không đóng trình duyệt."
                )}
              </p>
            </div>

            <div className="w-full space-y-2 pt-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
              </div>
              <div className="flex items-center justify-center gap-2 font-mono text-[11px] font-bold text-indigo-400">
                <span className="h-2 w-2 animate-ping rounded-full bg-indigo-400" />
                <span>AI Code Review Evaluator is running...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP SUB-HEADER (Single Standalone Header Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {isFinished
                  ? t("userApplication.codeReview.codeReviewReport")
                  : t("userApplication.codeReview.codeReviewTitle", {
                      round: round.roundOrder ?? 5,
                    })}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {t("userApplication.roundNumber", { number: round.roundOrder ?? 5 })}
              </span>
              {problems.length > 1 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {problems.length} {t("userApplication.codeReview.exercises")}
                  </span>
                </>
              )}
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isFinished
                ? t("userApplication.codeReview.codeReviewCompleted")
                : round.configData?.instruction ||
                  t("userApplication.codeReview.codeReviewInstructions")}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {detail?.finalResult ? (
            <span
              className={
                detail.finalResult === "PASSED"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-emerald-950/40"
                  : "inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm shadow-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:shadow-rose-950/40"
              }>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                {t("userApplicationhistory.codeReviewResult", "KẾT QUẢ")}: {detail.finalResult}
              </span>
            </span>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-emerald-950/40">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("userApplicationhistory.completed", "ĐÃ HOÀN THÀNH")}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm shadow-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{t("userApplicationhistory.inReviewTime", "TRONG THỜI GIAN REVIEW")}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── ERROR BANNER ── */}
      {step === "ERROR" && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>
            {t(
              "userApplicationhistory.codeReviewSubmitFailedHint",
              "Đã có lỗi khi nộp bài. Vui lòng kiểm tra kết nối mạng và thử nộp lại."
            )}
          </span>
        </div>
      )}

      {/* ── GRADED RESULT VIEW (If Finished) ── */}
      {isFinished && activeGradedDetail ? (
        <GradedResultView
          detail={activeGradedDetail}
          maxScore={maxScore}
          passed={detail?.finalResult === "PASSED"}
          failed={detail?.finalResult === "FAILED"}
          problems={problems}
          activeProblemIdx={activeProblemIdx}
          onSelectProblem={setActiveProblemIdx}
          issuesByProblem={issuesByProblem}
        />
      ) : (
        <>
          {/* ── UNIFIED PROBLEM CONTROL & CONTEXT CARD ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
            {/* Top Toolbar: Multi-problem Tabs or Single Identity + Live Stats */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/70">
              {/* Left: Problem Selection Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {problems.length > 1 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <div className="flex items-center gap-1.5 pr-2 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Layers className="h-4 w-4 text-indigo-400" />
                      <span className="hidden sm:inline">Danh sách bài:</span>
                    </div>
                    {problems.map((p, idx) => {
                      const pId = p.problemId ?? 0;
                      const pIssues = issuesByProblem[pId] ?? [];
                      const isActive = activeProblemIdx === idx;

                      return (
                        <button
                          key={pId || idx}
                          type="button"
                          onClick={() => setActiveProblemIdx(idx)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                            isActive
                              ? "border border-indigo-500/50 bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                              : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
                          )}>
                          <span className="font-mono text-[11px] opacity-80">#{idx + 1}</span>
                          <span className="max-w-[200px] truncate">
                            {p.title || `Bài tập #${idx + 1}`}
                          </span>
                          {p.difficulty && (
                            <span
                              className={cn(
                                "py-0.2 rounded-md px-1.5 text-[9px] font-extrabold uppercase",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : p.difficulty === "EASY"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                                    : p.difficulty === "MEDIUM"
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                      : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                              )}>
                              {p.difficulty}
                            </span>
                          )}
                          {pIssues.length > 0 && (
                            <span
                              className={cn(
                                "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold",
                                isActive ? "bg-white text-indigo-700" : "bg-rose-500 text-white"
                              )}>
                              {pIssues.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-indigo-500/30 bg-indigo-500/10 font-mono text-xs font-black text-indigo-400">
                      #1
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeProblem.title || "Code Review Problem #1"}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Badges & Timer & Chevrons */}
              <div className="flex items-center gap-2.5">
                {activeProblem.difficulty && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase",
                      activeProblem.difficulty === "EASY"
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : activeProblem.difficulty === "MEDIUM"
                          ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                          : "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
                    )}>
                    {activeProblem.difficulty}
                  </span>
                )}
                {activeProblem.language && (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-indigo-700 uppercase dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {activeProblem.language}
                  </span>
                )}

                {/* Countdown Timer */}
                {remainingMs > 0 && !isFinished && (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold tabular-nums transition-colors",
                      timedOut
                        ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300"
                        : remainingMs < 5 * 60 * 1000
                          ? "animate-pulse border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                    )}>
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    <span>{formatRemaining(remainingMs)}</span>
                  </div>
                )}

                {/* Navigation Chevrons */}
                {problems.length > 1 && (
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeProblemIdx === 0}
                      onClick={() => setActiveProblemIdx((i) => Math.max(0, i - 1))}
                      className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={activeProblemIdx === problems.length - 1}
                      onClick={() =>
                        setActiveProblemIdx((i) => Math.min(problems.length - 1, i + 1))
                      }
                      className="h-7 w-7 rounded-lg border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Problem Statement (High Contrast, Bold, Crisp) */}
            <div className="space-y-3 p-5">
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-400 uppercase">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span>Yêu cầu Code Review:</span>
                </h4>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 font-sans text-sm leading-relaxed font-semibold whitespace-pre-wrap text-slate-800 shadow-inner sm:p-5 dark:border-slate-700/80 dark:bg-slate-950/80 dark:text-slate-100">
                  {activeProblem.problemStatement ||
                    t(
                      "userApplicationhistory.codeReviewDefaultStatement",
                      "Đọc đoạn code bên dưới, phát hiện các lỗi tiềm ẩn (Security, Performance, Code Smell) và ghi nhận issue kèm mức độ nghiêm trọng."
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* ── FULL-WIDTH CODE VIEWER WITH INLINE ANNOTATIONS ── */}
          {currentFiles.length === 0 ? (
            <Card className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-amber-300">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                <span className="text-sm font-semibold">
                  Bài tập này chưa có file mã nguồn nào để review.
                </span>
              </div>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-indigo-500/40 bg-[#030712] shadow-2xl ring-1 ring-indigo-500/20">
              {/* Header: File Switcher Tabs */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-950">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {currentFiles.map((file) => {
                      const fileIssues = currentProblemIssues.filter(
                        (i) => i.filename === file.filename
                      );
                      const isActive = file.filename === activeFilename;

                      return (
                        <button
                          key={file.filename}
                          type="button"
                          onClick={() =>
                            setActiveFileByProblem((prev) => ({
                              ...prev,
                              [currentProblemId]: file.filename ?? "",
                            }))
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all",
                            isActive
                              ? "border border-indigo-500/40 bg-indigo-500/20 text-indigo-200 shadow-xs shadow-indigo-950/50 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-200"
                              : "border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                          )}>
                          <FileCode2 className="h-3.5 w-3.5" />
                          <span>{filenameShort(file.filename ?? "")}</span>
                          {fileIssues.length > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white">
                              {fileIssues.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Meta stats right */}
                {currentFile && (
                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      {normalizeFormattedCode(currentFile.content).split("\n").length} dòng
                    </span>
                    <span className="text-slate-600 dark:text-slate-600">•</span>
                    <span>{normalizeFormattedCode(currentFile.content).length} ký tự</span>
                  </div>
                )}
              </div>

              {/* Active Code Content with Inline Issues & GitHub-style Comment Composer */}
              {currentFile && (
                <CodeViewPane
                  file={currentFile}
                  issues={currentProblemIssues.filter((i) => i.filename === currentFile.filename)}
                  allIssues={currentProblemIssues}
                  activeProblemId={currentProblemId}
                  inlineEditor={inlineEditor}
                  onOpenInlineEditor={(line) =>
                    openInlineEditor(currentProblemId, currentFile.filename ?? "", line)
                  }
                  onCloseInlineEditor={closeInlineEditor}
                  onChangeInlineEditor={setInlineEditor}
                  onSaveInlineIssue={saveInlineIssue}
                  onEditIssue={(idx) => openEditInlineEditor(currentProblemId, idx)}
                  onDeleteIssue={(idx) => deleteIssue(currentProblemId, idx)}
                  editable={editable}
                />
              )}
            </div>
          )}

          {/* ── REVIEW SUMMARY & SUBMIT BAR ── */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
            {/* Left: Issues summary badges */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Tổng kết:</span>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
                <span>
                  {allFlattenedIssues.length} Issues
                  {problems.length > 1 ? ` (${problems.length} bài)` : ""}
                </span>
              </div>
              <SeverityBadgeMini severity="CRITICAL" count={severityCounts.CRITICAL} />
              <SeverityBadgeMini severity="WARNING" count={severityCounts.WARNING} />
              <SeverityBadgeMini severity="INFO" count={severityCounts.INFO} />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {editable && currentProblemIssues.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCurrentDraft}
                  className="h-9 gap-1.5 rounded-xl px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa draft bài này</span>
                </Button>
              )}

              {editable && (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  className="h-9 gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-indigo-400 active:scale-95">
                  <Send className="h-3.5 w-3.5" />
                  <span>Nộp bài Review ({allFlattenedIssues.length})</span>
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── CONFIRM SUBMIT MODAL (macOS traffic-light modal) ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 shadow-xs shadow-rose-500/30" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 shadow-xs shadow-amber-500/30" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-xs shadow-emerald-500/30" />
              </div>
              <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                Xác nhận nộp bài Code Review
              </span>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-950 dark:text-white">
                  Bạn có chắc chắn muốn nộp bài?
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {allFlattenedIssues.length === 0
                    ? "Bạn chưa thêm issue nào. Hệ thống AI vẫn sẽ đối chiếu và chấm điểm với 0 issue."
                    : `Hệ thống AI sẽ đối chiếu ${allFlattenedIssues.length} issue(s) trên ${problems.length} bài tập và chấm điểm ngay lập tức.`}
                </DialogDescription>
              </div>
            </div>

            {/* Severity stats breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2">
                <div className="text-[10px] font-bold text-rose-600 uppercase dark:text-rose-400">
                  CRITICAL
                </div>
                <div className="mt-0.5 text-base font-extrabold text-rose-700 dark:text-rose-300">
                  {severityCounts.CRITICAL}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2">
                <div className="text-[10px] font-bold text-amber-600 uppercase dark:text-amber-400">
                  WARNING
                </div>
                <div className="mt-0.5 text-base font-extrabold text-amber-700 dark:text-amber-300">
                  {severityCounts.WARNING}
                </div>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2">
                <div className="text-[10px] font-bold text-sky-600 uppercase dark:text-sky-400">
                  INFO
                </div>
                <div className="mt-0.5 text-base font-extrabold text-sky-700 dark:text-sky-300">
                  {severityCounts.INFO}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white">
              Hủy
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Xác nhận nộp</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: SeverityBadgeMini
// ============================================================================

function SeverityBadgeMini({ severity, count }: { severity: Severity; count: number }) {
  const tok = SEVERITY_TOKENS[severity];
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tabular-nums",
        tok.border,
        tok.bg,
        tok.text
      )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tok.dot)} />
      <span>
        {severity}: {count}
      </span>
    </div>
  );
}

// ============================================================================
// HELPER: Syntax Tokenizer for Code Lines (Matches Quiz Module & VS Code Dark)
// ============================================================================

function renderSyntaxTokens(line: string): React.ReactNode[] {
  if (!line) return [];
  const tokenRegex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*|\/\*[\s\S]*?\*\/|@[A-Za-z0-9_]+|\b(?:public|private|protected|class|interface|enum|static|final|void|int|double|float|long|boolean|char|String|byte|short|return|if|else|for|while|do|switch|case|break|continue|new|this|super|import|package|try|catch|finally|throw|throws|const|let|var|function|async|await|select|from|where|join|insert|update|delete|group|by|order|having|def|self|None|True|False|elif|lambda|yield|raise|except|with|as|pass|val|fun|type|struct|impl|fn|pub|mut|use|mod|crate)\b|\b\d+\b|[{}()[\]]|[;=.+*/,<>!&|:-])/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token}`;

    if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(
        <span key={key} className="font-medium text-emerald-300">
          {token}
        </span>
      );
    } else if (token.startsWith("@")) {
      parts.push(
        <span key={key} className="font-bold text-amber-400">
          {token}
        </span>
      );
    } else if (token.startsWith("//") || token.startsWith("/*")) {
      parts.push(
        <span key={key} className="text-slate-500 italic">
          {token}
        </span>
      );
    } else if (/^[{}()[\]]$/.test(token)) {
      parts.push(
        <span key={key} className="font-extrabold text-amber-300">
          {token}
        </span>
      );
    } else if (/^[;=.+*/,<>!&|:-]$/.test(token)) {
      parts.push(
        <span key={key} className="font-bold text-slate-700 dark:text-slate-300">
          {token}
        </span>
      );
    } else if (/^\d+$/.test(token)) {
      parts.push(
        <span key={key} className="font-bold text-cyan-300">
          {token}
        </span>
      );
    } else if (
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(token) &&
      line
        .substring(match.index + token.length)
        .trim()
        .startsWith("(")
    ) {
      parts.push(
        <span key={key} className="font-bold text-sky-300">
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={key} className="font-bold text-purple-400">
          {token}
        </span>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts;
}

// ============================================================================
// ============================================================================
// SUB-COMPONENT: CodeViewPane — selectable, highlighted code lines with inline issue cards & GitHub-style inline review composer
// ============================================================================

function CodeViewPane({
  file,
  issues,
  allIssues,
  activeProblemId,
  inlineEditor,
  onOpenInlineEditor,
  onCloseInlineEditor,
  onChangeInlineEditor,
  onSaveInlineIssue,
  onEditIssue,
  onDeleteIssue,
  editable,
}: {
  file: CodeFile;
  issues: LocalDraftIssue[];
  allIssues: LocalDraftIssue[];
  activeProblemId?: number;
  inlineEditor?: InlineEditorState | null;
  onOpenInlineEditor?: (_lineNumber: number) => void;
  onCloseInlineEditor?: () => void;
  onChangeInlineEditor?: (_s: InlineEditorState) => void;
  onSaveInlineIssue?: () => void;
  onEditIssue?: (_index: number) => void;
  onDeleteIssue?: (_index: number) => void;
  editable: boolean;
}) {
  const fileLines = useMemo(() => {
    const text = normalizeFormattedCode(file.content);
    return text ? text.split("\n") : [];
  }, [file.content]);

  const issuesByLine = useMemo(() => {
    const map: Record<number, LocalDraftIssue[]> = {};
    for (const iss of issues) {
      if (!map[iss.lineNumber]) map[iss.lineNumber] = [];
      map[iss.lineNumber].push(iss);
    }
    return map;
  }, [issues]);

  return (
    <div className="overflow-x-auto bg-[#030712] font-mono text-xs leading-relaxed text-slate-200">
      <div className="min-w-[700px]">
        {fileLines.map((line, idx) => {
          const lineNo = idx + 1;
          const lineIssues = issuesByLine[lineNo] ?? [];
          const hasIssues = lineIssues.length > 0;
          const isEditingThisLine =
            editable &&
            inlineEditor?.lineNumber === lineNo &&
            inlineEditor?.filename === file.filename &&
            (activeProblemId == null || inlineEditor?.problemId === activeProblemId);

          const highestSeverity: Severity = hasIssues
            ? lineIssues.some((i) => i.severity === "CRITICAL")
              ? "CRITICAL"
              : lineIssues.some((i) => i.severity === "WARNING")
                ? "WARNING"
                : "INFO"
            : "INFO";
          const tok = hasIssues ? SEVERITY_TOKENS[highestSeverity] : null;
          const renderedTokens = renderSyntaxTokens(line);

          return (
            <div key={lineNo} className="flex flex-col">
              {/* Main code line */}
              <div
                onClick={() => {
                  if (editable && onOpenInlineEditor) {
                    onOpenInlineEditor(lineNo);
                  }
                }}
                className={cn(
                  "group flex items-stretch transition-colors select-none",
                  editable && "cursor-pointer hover:bg-indigo-500/10",
                  hasIssues && cn(tok?.bg, "border-l-4", tok?.border),
                  isEditingThisLine && "border-l-4 border-indigo-500 bg-indigo-500/15"
                )}>
                {/* Gutter / Line Number */}
                <div
                  className={cn(
                    "flex w-14 shrink-0 items-center justify-between border-r px-2 py-0.5 text-xs tabular-nums select-none",
                    "border-slate-800/80 bg-slate-950/90 text-slate-500 group-hover:bg-slate-900 group-hover:text-indigo-300",
                    hasIssues && cn("font-bold", tok?.text),
                    isEditingThisLine &&
                      "border-indigo-500/50 bg-indigo-950/60 font-bold text-indigo-300"
                  )}>
                  <span className="w-full pr-2 text-right">{lineNo}</span>
                  {editable && (
                    <span
                      className={cn(
                        "transition-opacity",
                        isEditingThisLine
                          ? "text-indigo-300 opacity-100"
                          : "text-indigo-400 opacity-0 group-hover:opacity-100"
                      )}>
                      <Plus className="h-3 w-3" />
                    </span>
                  )}
                </div>

                {/* Code Content */}
                <div className="flex-1 px-4 py-0.5 font-mono text-xs whitespace-pre text-slate-200 select-text group-hover:text-white">
                  {renderedTokens.length > 0 ? renderedTokens : " "}
                </div>
              </div>

              {/* Inline Issue Annotations attached directly below this line */}
              {hasIssues && (
                <div className="ml-14 space-y-2 border-l-4 border-slate-800 bg-slate-900/90 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/90">
                  {lineIssues.map((iss, iIdx) => {
                    const issTok = SEVERITY_TOKENS[iss.severity];
                    const Icon = issTok.icon;
                    const globalIdx = allIssues.indexOf(iss);

                    return (
                      <div
                        key={iIdx}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border p-3 shadow-md",
                          issTok.border,
                          issTok.bg
                        )}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", issTok.text)} />
                            <span
                              className={cn(
                                "text-[11px] font-extrabold tracking-wider uppercase",
                                issTok.text
                              )}>
                              {iss.severity} · Dòng {iss.lineNumber}
                            </span>
                          </div>

                          {editable && globalIdx !== -1 && onEditIssue && onDeleteIssue && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditIssue(globalIdx);
                                }}
                                className="h-6 gap-1 px-2 text-[10px] font-bold text-indigo-300 hover:bg-indigo-500/20">
                                <Pencil className="h-3 w-3" />
                                <span>Sửa</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteIssue(globalIdx);
                                }}
                                className="h-6 gap-1 px-2 text-[10px] font-bold text-rose-400 hover:bg-rose-500/20">
                                <Trash2 className="h-3 w-3" />
                                <span>Xóa</span>
                              </Button>
                            </div>
                          )}
                        </div>

                        <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-300 select-text">
                          {iss.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* GitHub-style Inline Review Composer attached directly underneath this line */}
              {isEditingThisLine &&
                inlineEditor &&
                onChangeInlineEditor &&
                onSaveInlineIssue &&
                onCloseInlineEditor && (
                  <div className="animate-in fade-in zoom-in-98 my-2 ml-14 rounded-xl border border-indigo-500/50 bg-slate-900/98 p-4 shadow-2xl ring-1 ring-indigo-500/30 duration-150">
                    {/* Header of Inline Box */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-300">
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-white">
                          {inlineEditor.editingIndex !== null
                            ? `Chỉnh sửa nhận xét trên dòng ${lineNo}`
                            : `Thêm nhận xét trên dòng ${lineNo}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={onCloseInlineEditor}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Severity Selection Pills */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">Mức độ:</span>
                      {(["CRITICAL", "WARNING", "INFO"] as Severity[]).map((s) => {
                        const sTok = SEVERITY_TOKENS[s];
                        const Icon = sTok.icon;
                        const isSelected = inlineEditor.severity === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => onChangeInlineEditor({ ...inlineEditor, severity: s })}
                            className={cn(
                              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase transition-all",
                              isSelected
                                ? cn(
                                    sTok.border,
                                    sTok.bg,
                                    sTok.text,
                                    "shadow-xs ring-2 ring-indigo-500/50"
                                  )
                                : "border border-slate-200 bg-slate-50/70 text-slate-400 hover:border-slate-700 hover:text-slate-200 dark:border-slate-800 dark:bg-slate-950/60"
                            )}>
                            <Icon className={cn("h-3.5 w-3.5", sTok.text)} />
                            <span>{SEVERITY_KEYS[s].label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Description Textarea */}
                    <div className="mt-3">
                      <textarea
                        autoFocus
                        rows={3}
                        value={inlineEditor.description}
                        onChange={(e) =>
                          onChangeInlineEditor({ ...inlineEditor, description: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            onSaveInlineIssue();
                          }
                        }}
                        placeholder="Mô tả chi tiết vấn đề (ví dụ: Thiếu kiểm tra null, SQL Injection, N+1 query...)"
                        className="w-full resize-y rounded-xl border border-slate-700/80 bg-slate-950/90 p-3 font-sans text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 focus:outline-hidden"
                      />
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="hidden font-sans text-[10px] text-slate-400 italic sm:inline">
                        Nhấn Ctrl + Enter (hoặc ⌘ + Enter) để lưu nhanh
                      </span>

                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onCloseInlineEditor}
                          className="h-8 rounded-lg px-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white">
                          Hủy
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={onSaveInlineIssue}
                          disabled={!inlineEditor.description.trim()}
                          className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50">
                          <Check className="h-3.5 w-3.5" />
                          <span>
                            {inlineEditor.editingIndex !== null ? "Lưu thay đổi" : "Thêm nhận xét"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER: ModernGaugeClock (Circular Score Ring matching CV & Email modules)
// ============================================================================

function ModernGaugeClock({
  score,
  label,
  color = "indigo",
  hasData = true,
}: {
  score: number;
  label: string;
  color?: "indigo" | "emerald";
  hasData?: boolean;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const displayScore = hasData ? Math.min(100, Math.max(0, Math.round(score))) : 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const styles =
    color === "emerald"
      ? {
          ring: "text-emerald-500 dark:text-emerald-400",
          text: "text-emerald-600 dark:text-emerald-400",
          bg: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20",
        }
      : {
          ring: "text-indigo-500 dark:text-indigo-400",
          text: "text-indigo-600 dark:text-indigo-400",
          bg: "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-950/20",
        };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${styles.bg}`}>
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="7"
            className="text-slate-200 dark:text-slate-800"
            fill="transparent"
          />
          {hasData && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className={`${styles.ring} transition-all duration-1000 ease-out`}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`text-xl font-black tracking-tight ${hasData ? styles.text : "text-slate-500"}`}>
            {hasData ? `${displayScore}%` : "--"}
          </span>
          <span className="text-[8px] font-extrabold tracking-wider text-slate-400 uppercase">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// Criteria metadata for dynamic metrics. Each entry has a labelKey
// pointing to userApplication.codeReview.criteria.* so the label is
// localized via i18n at render time.
const CRITERIA_META: Record<string, { labelKey: string; color: string; bg: string; bar: string }> =
  {
    "Bug Detection": {
      labelKey: "criteriaBugDetection",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
      bar: "bg-rose-500",
    },
    "Security Awareness": {
      labelKey: "criteriaSecurityAwareness",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      bar: "bg-emerald-500",
    },
    "Solution Quality": {
      labelKey: "criteriaSolutionQuality",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      bar: "bg-indigo-500",
    },
    "Clean Code Awareness": {
      labelKey: "criteriaCleanCodeAwareness",
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      bar: "bg-violet-500",
    },
    "Code Smell Detection": {
      labelKey: "criteriaCodeSmellDetection",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      bar: "bg-amber-500",
    },
    "Performance Analysis": {
      labelKey: "criteriaPerformanceAnalysis",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      bar: "bg-cyan-500",
    },
  };

// ============================================================================
// SUB-COMPONENT: GradedResultView — Polished Result Screen (CV & Email Standard)
// ============================================================================

function GradedResultView({
  detail,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  maxScore: _maxScore,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  passed: _passed,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  failed: _failed,
  problems,
  activeProblemIdx,
  onSelectProblem,
  issuesByProblem,
}: {
  detail: ApplicationDetail;
  maxScore: number;
  passed: boolean;
  failed: boolean;
  problems: CodeReviewProblemSnapshot[];
  activeProblemIdx: number;
  onSelectProblem: (_idx: number) => void;
  issuesByProblem: Record<number, LocalDraftIssue[]>;
}) {
  const { t } = useTranslation();
  const feedback = useMemo<AiFeedback | null>(() => {
    if (!detail.aiFeedback) return null;
    if (typeof detail.aiFeedback === "object") return detail.aiFeedback as AiFeedback;
    try {
      return JSON.parse(detail.aiFeedback as string) as AiFeedback;
    } catch {
      return null;
    }
  }, [detail.aiFeedback]);

  const submissionData = useMemo(() => {
    if (!detail.submissionData) return null;
    if (typeof detail.submissionData === "object") return detail.submissionData;
    try {
      return JSON.parse(detail.submissionData as string);
    } catch {
      return null;
    }
  }, [detail.submissionData]);

  const aiScoreVal = Math.round(detail.aiScore ?? detail.finalScore ?? 0);
  const hrScoreVal = Math.round(detail.hrScore ?? 0);
  const hasHrScore = detail.hrScore != null && hrScoreVal > 0;

  const rawMetrics = feedback?.extraMetrics ?? {};
  const strengths = feedback?.strengths ?? [];
  const weaknesses = feedback?.weaknesses ?? [];
  const generalComment = feedback?.generalComment ?? "";

  // Parse numerical metrics & text missed issues
  const { numericMetrics, missedIssuesText } = useMemo(() => {
    const list: {
      key: string;
      label: string;
      score: number;
      max: number;
      pct: number;
      style: { color: string; bg: string; bar: string };
    }[] = [];
    let missed: string | null = null;

    if (rawMetrics && typeof rawMetrics === "object") {
      Object.entries(rawMetrics).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("missed") ||
          lowerKey.includes("flag") ||
          lowerKey.includes("bỏ sót")
        ) {
          if (typeof value === "string") {
            missed = value;
          } else if (Array.isArray(value)) {
            missed = value.join("\n");
          }
          return;
        }

        let numVal: number | null = null;
        if (typeof value === "number") {
          numVal = value;
        } else if (typeof value === "string" && !isNaN(Number(value))) {
          numVal = Number(value);
        }

        if (numVal !== null) {
          const isTenScale = numVal <= 10;
          const max = isTenScale ? 10 : 100;
          const pct = isTenScale ? Math.round(numVal * 10) : Math.round(numVal);
          const meta = CRITERIA_META[key] || {
            labelKey: key,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            bar: "bg-indigo-500",
          };
          list.push({
            key,
            label: t(`userApplication.codeReview.${meta.labelKey}`, key),
            score: numVal,
            max,
            pct: Math.min(100, Math.max(0, pct)),
            style: meta,
          });
        }
      });
    }

    return { numericMetrics: list, missedIssuesText: missed };
  }, [rawMetrics, t]);

  // Active problem & files
  const activeProblem = problems[activeProblemIdx] ?? problems[0];
  const pId = activeProblem?.problemId ?? 0;
  const currentFiles = activeProblem?.files ?? [];
  const [activeFilename, setActiveFilename] = useState<string>(currentFiles[0]?.filename ?? "");

  const currentFile = currentFiles.find((f) => f.filename === activeFilename) ?? currentFiles[0];

  // Map issues for current problem
  const problemIssues = useMemo(() => {
    if (issuesByProblem[pId] && issuesByProblem[pId].length > 0) {
      return issuesByProblem[pId];
    }
    const subList = submissionData?.codeReviewSubmissions as CodeReviewSubmission[] | undefined;
    if (Array.isArray(subList) && currentFiles.length > 0) {
      const filenames = new Set(currentFiles.map((f) => f.filename));
      return subList
        .filter((s) => filenames.has(s.filename))
        .map((s) => ({
          filename: s.filename ?? "",
          lineNumber: s.lineNumber ?? 1,
          severity: (s.severity as Severity) ?? "WARNING",
          description: s.description ?? "",
        }));
    }
    return [];
  }, [issuesByProblem, pId, submissionData, currentFiles]);

  return (
    <div className="space-y-6">
      {/* ── TOP 2-COLUMN STORYTELLING & METRICS GRID ── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* 🧠 LEFT COLUMN (7 cols): AI Storytelling, Strengths, Weaknesses & Missed Issues */}
        <div className="space-y-5 lg:col-span-7">
          {/* SECTION 1: AI Executive Summary (Notion AI Theme) */}
          <Card className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-none backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 dark:border-indigo-500/20">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Bot className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-extrabold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                  {t("userApplicationhistory.codeReviewReport", "BÁO CÁO PHÂN TÍCH TỔNG QUAN AI")}
                </h3>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-extrabold text-indigo-700 shadow-xs dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                <span>{t("userApplicationhistory.codeReviewAiEvaluated", "AI EVALUATED")}</span>
              </span>
            </div>

            <p className="text-sm leading-relaxed font-normal text-slate-700 dark:text-slate-200">
              {generalComment ||
                "Hệ thống AI đã phân tích chi tiết bài đánh giá mã nguồn, đối chiếu danh sách bug và kiểm tra độ chính xác của các ghi chú."}
            </p>
          </Card>

          {/* SECTION 2: Strengths Card (Green Theme) */}
          {strengths.length > 0 && (
            <Card className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900/80 dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-emerald-200 pb-2.5 dark:border-emerald-500/30">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  {t("userApplication.codeReview.strengthsTitle", "Điểm mạnh nổi bật")}
                </h4>
              </div>

              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {strengths.map((st, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                    <span className="leading-relaxed">{st}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* SECTION 3: Weaknesses Card (Amber Theme) */}
          {weaknesses.length > 0 && (
            <Card className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-amber-500/30 dark:bg-slate-900/80 dark:shadow-none">
              <div className="flex items-center gap-2 border-b border-amber-200 pb-2.5 dark:border-amber-500/30">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <h4 className="text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                  {t("userApplication.codeReview.weaknessesTitle", "Điểm cần bổ sung & Cải thiện")}
                </h4>
              </div>

              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {weaknesses.map((wk, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                    <span className="leading-relaxed">{wk}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* SECTION 4: Missed Issues Card (Red/Rose Theme) */}
          {missedIssuesText && (
            <Card className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm ring-1 shadow-rose-100 ring-rose-200 dark:border-rose-500/30 dark:bg-slate-900/80 dark:shadow-none dark:ring-rose-500/30">
              <div className="flex items-center gap-2 border-b border-rose-200 pb-2.5 dark:border-rose-500/30">
                <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-md border border-rose-300 bg-rose-100 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold tracking-wider text-rose-700 uppercase dark:text-rose-300">
                  {t(
                    "userApplication.codeReview.missedIssuesTitle",
                    "Các lỗi quan trọng bỏ sót (Missed Issues)"
                  )}
                </h4>
              </div>

              <div className="rounded-xl border border-rose-200 bg-white p-3.5 text-sm leading-relaxed text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
                {missedIssuesText}
              </div>
            </Card>
          )}
        </div>

        {/* 📊 RIGHT COLUMN (5 cols): Clocks, Detailed Stat Bars & HR Feedback */}
        <div className="space-y-5 lg:col-span-5">
          {/* WIDGET 1: Dual Gauge Clocks (AI Score & HR Score) */}
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800/80 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  {t("userApplication.codeReview.matchScoreTitle", "Chỉ số Match Score")}
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">AI vs HR</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ModernGaugeClock score={aiScoreVal} label="AI Score" color="indigo" hasData={true} />
              <ModernGaugeClock
                score={hrScoreVal}
                label="HR Score"
                color="emerald"
                hasData={hasHrScore}
              />
            </div>
          </Card>

          {/* WIDGET 2: Criteria Stat Progress Bars */}
          {numericMetrics.length > 0 && (
            <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-slate-800/80 dark:bg-slate-900/80">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                    {t(
                      "userApplication.codeReview.criteriaAnalysisTitle",
                      "Phân tích tiêu chí chi tiết"
                    )}
                  </h4>
                </div>
                <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                  {t("userApplication.codeReview.statBarsLabel", "STAT BARS")}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {numericMetrics.map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.label}
                      </span>
                      <span className={cn("font-mono font-bold tabular-nums", item.style.color)}>
                        {item.max === 10 ? `${item.score}/10` : `${item.pct}%`}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          item.style.bar
                        )}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* WIDGET 3: HR Feedback Card (Direct Human Comment) */}
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700/80 dark:bg-slate-900/90">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <UserCheck className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                  {t("userApplicationhistory.codeReviewHrCommentTitle", "NHẬN XÉT TỪ HỘI ĐỒNG HR")}
                </h4>
              </div>

              <span className="text-[10px] font-medium text-slate-400">
                {t("userApplicationhistory.codeReviewHrEvaluationLabel", "HR ĐÁNH GIÁ")}
              </span>
            </div>

            {detail?.hrNote ? (
              <div className="rounded-xl border-l-2 border-indigo-500 bg-indigo-50 p-3.5 text-sm leading-relaxed text-slate-700 italic dark:bg-slate-950/60 dark:text-slate-200">
                "{detail.hrNote}"
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-slate-500 italic dark:text-slate-400">
                Chưa có ghi chú trực tiếp từ Hội đồng tuyển dụng HR. (Hệ thống sẽ cập nhật ngay khi
                HR hoàn tất rà soát).
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* ── FULL-WIDTH CODE VIEWER WITH SUBMITTED ISSUES ── */}
      <div className="overflow-hidden rounded-2xl border border-indigo-500/40 bg-[#030712] shadow-2xl ring-1 ring-indigo-500/20">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-950">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300 dark:text-slate-300">
                {t(
                  "userApplicationhistory.codeReviewSubmittedSourceTitle",
                  "Mã nguồn & ghi chú bạn đã nộp"
                )}
              </span>
            </div>

            {problems.length > 1 && (
              <div className="ml-4 flex items-center gap-1.5">
                {problems.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectProblem(idx)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                      activeProblemIdx === idx
                        ? "border border-indigo-500/40 bg-indigo-500/20 text-indigo-200 dark:text-indigo-200"
                        : "border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-200 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                    )}>
                    #{idx + 1} {p.title || `Bài ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {currentFiles.map((file) => (
              <button
                key={file.filename}
                type="button"
                onClick={() => setActiveFilename(file.filename ?? "")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  (activeFilename || currentFiles[0]?.filename) === file.filename
                    ? "border border-slate-700 bg-slate-800 font-bold text-white"
                    : "border border-slate-800 text-slate-400 hover:text-slate-200 dark:text-slate-400 dark:hover:text-slate-200"
                )}>
                {filenameShort(file.filename ?? "")}
              </button>
            ))}
          </div>
        </div>

        {currentFile && (
          <CodeViewPane
            file={currentFile}
            issues={problemIssues.filter((i) => i.filename === currentFile.filename)}
            allIssues={problemIssues}
            editable={false}
          />
        )}
      </div>
    </div>
  );
}
