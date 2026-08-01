import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { applicationDetailManager } from "@/services/application-detail.manager";
import {
  AlertOctagon,
  AlertTriangle,
  Award,
  Bug,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  FileCode2,
  Info,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Trash2,
  X,
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

interface IssueModalState {
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
    desc: "Lỗi nghiêm trọng (crash, security)",
  },
  WARNING: {
    label: "WARNING",
    desc: "Lỗi trung bình (performance, race condition)",
  },
  INFO: {
    label: "INFO",
    desc: "Góp ý nhỏ (naming, format)",
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
    darkBg: string;
    darkBorder: string;
    darkText: string;
  }
> = {
  CRITICAL: {
    bar: "bg-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-700",
    darkBg: "dark:bg-rose-950/40",
    darkBorder: "dark:border-rose-900/60",
    darkText: "dark:text-rose-300",
    icon: AlertOctagon,
    dot: "bg-rose-500",
  },
  WARNING: {
    bar: "bg-amber-400",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    darkBg: "dark:bg-amber-950/40",
    darkBorder: "dark:border-amber-900/60",
    darkText: "dark:text-amber-300",
    icon: AlertTriangle,
    dot: "bg-amber-500",
  },
  INFO: {
    bar: "bg-sky-400",
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-700",
    darkBg: "dark:bg-sky-950/40",
    darkBorder: "dark:border-sky-900/60",
    darkText: "dark:text-sky-300",
    icon: Info,
    dot: "bg-sky-500",
  },
};

const LANGUAGE_COLOR: Record<string, string> = {
  java: "from-orange-400 to-rose-500",
  python: "from-sky-400 to-blue-500",
  javascript: "from-amber-400 to-yellow-500",
  typescript: "from-blue-400 to-indigo-500",
  tsx: "from-blue-400 to-indigo-500",
  jsx: "from-amber-400 to-yellow-500",
  go: "from-cyan-400 to-teal-500",
  rust: "from-orange-500 to-rose-600",
  ruby: "from-rose-500 to-red-600",
  php: "from-indigo-400 to-purple-500",
  csharp: "from-purple-400 to-violet-500",
  cpp: "from-blue-500 to-indigo-600",
  c: "from-blue-500 to-indigo-600",
  kotlin: "from-violet-400 to-purple-500",
  swift: "from-orange-400 to-rose-500",
  sql: "from-amber-500 to-orange-500",
  xml: "from-emerald-400 to-teal-500",
  html: "from-orange-500 to-red-500",
  css: "from-blue-400 to-cyan-500",
  yaml: "from-pink-400 to-rose-500",
};

// ============================================================================
// Helpers
// ============================================================================

function draftKey(applicationId: number, roundId: number, problemId: number): string {
  return `codeReview-draft-${applicationId}-${roundId}-${problemId}`;
}

function timerKey(applicationId: number, roundId: number, problemId: number): string {
  return `codeReview-timer-${applicationId}-${roundId}-${problemId}`;
}

function filenameShort(path: string): string {
  return path.split("/").pop() ?? path;
}

function extensionOf(filename: string): string {
  const m = filename.match(/\.([a-zA-Z0-9]+)$/);
  return (m?.[1] ?? "txt").toLowerCase();
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

  // Each round has exactly ONE Code Review problem (BE always reads [0]).
  // The JdRound.configData type doesn't expose codeReviewProblems — cast
  // through unknown to the BE payload shape (`Round.configData`).
  const configData = round.configData as unknown as
    | (typeof round.configData & {
        codeReviewProblems?: CodeReviewProblemSnapshot[];
      })
    | undefined;
  const problem: CodeReviewProblemSnapshot | undefined = configData?.codeReviewProblems?.[0];
  const timeLimitMinutes = configData?.timeLimitMinutes ?? 45;
  const maxScore = configData?.maxScore ?? 100;

  const gradedStatus =
    (detail?.status as string) === "AI_EVALUATED" || (detail?.status as string) === "COMPLETED";
  const finalScore = detail?.finalScore ?? detail?.aiScore ?? null;
  const showScore = gradedStatus && finalScore !== null;
  const passed = (detail?.finalResult ?? "") === "PASSED";
  const failed = (detail?.finalResult ?? "") === "FAILED";

  // ---- Issue state -----------------------------------------------------
  const [issues, setIssues] = useState<LocalDraftIssue[]>([]);
  const [activeFile, setActiveFile] = useState<string>(problem?.files?.[0]?.filename ?? "");
  const [issueModal, setIssueModal] = useState<IssueModalState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gradedResult, setGradedResult] = useState<ApplicationDetail | null>(null);

  // ---- Hydrate from localStorage (draft + countdown resume) ------------
  const problemId = problem?.problemId ?? 0;
  const roundId = round.id ?? 0;
  const draftStorageKey = useMemo(
    () => draftKey(applicationId, roundId, problemId),
    [applicationId, roundId, problemId]
  );
  const timerStorageKey = useMemo(
    () => timerKey(applicationId, roundId, problemId),
    [applicationId, roundId, problemId]
  );

  // 1. Load draft issues from localStorage
  useEffect(() => {
    if (!problemId) return;
    try {
      const raw = localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalDraftIssue[];
        if (Array.isArray(parsed)) setIssues(parsed);
      } else {
        // First load: hydrate from server-submitted issues (if any) so the
        // candidate can see what they already submitted.
        const submitted = detail?.submissionData?.codeReviewSubmissions;
        if (submitted && submitted.length > 0) {
          setIssues(
            submitted.map((s) => ({
              filename: s.filename ?? "",
              lineNumber: s.lineNumber ?? 1,
              severity: (s.severity as Severity) ?? "WARNING",
              description: s.description ?? "",
            }))
          );
        }
      }
    } catch {
      // ignore corrupted draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftStorageKey]);

  // 2. Save draft to localStorage (every change, debounced via setTimeout)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!problemId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(issues));
      } catch {
        // ignore quota errors
      }
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [issues, draftStorageKey, problemId]);

  // 3. Countdown — round has no server-side startedAt, so we anchor on
  //    the first time the page is opened (per spec §4.4) and persist the
  //    end-time so reloading doesn't reset the timer.
  const [remainingMs, setRemainingMs] = useState<number>(timeLimitMinutes * 60 * 1000);
  useEffect(() => {
    if (!problemId) return;
    const totalMs = timeLimitMinutes * 60 * 1000;
    let endAt: number;
    try {
      const stored = localStorage.getItem(timerStorageKey);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > Date.now()) {
          endAt = parsed;
        } else {
          // stored end is in the past — reset
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
  }, [timerStorageKey, problemId, timeLimitMinutes]);

  const timedOut = remainingMs <= 0;
  const editable = !isCompleted && isCurrent && !timedOut;

  // ---- Issue CRUD handlers --------------------------------------------
  const openIssueModal = (filename: string, lineNumber: number) => {
    if (!editable) return;
    setIssueModal({
      filename,
      lineNumber,
      severity: "WARNING",
      description: "",
      editingIndex: null,
    });
  };

  const openEditIssue = (index: number) => {
    if (!editable) return;
    const it = issues[index];
    setIssueModal({
      filename: it.filename,
      lineNumber: it.lineNumber,
      severity: it.severity,
      description: it.description,
      editingIndex: index,
    });
  };

  const closeIssueModal = () => setIssueModal(null);

  const saveIssueFromModal = () => {
    if (!issueModal) return;
    const desc = issueModal.description.trim();
    if (!desc) {
      toast.error(t("userApplicationhistory.codeReviewNoDescription", "Vui lòng mô tả issue"));
      return;
    }
    const draft: LocalDraftIssue = {
      filename: issueModal.filename,
      lineNumber: issueModal.lineNumber,
      severity: issueModal.severity,
      description: desc,
    };
    if (issueModal.editingIndex === null) {
      setIssues((prev) => [...prev, draft]);
      toast.success(t("userApplicationhistory.codeReviewIssueAdded", "Đã thêm issue mới"));
    } else {
      setIssues((prev) => prev.map((old, i) => (i === issueModal.editingIndex ? draft : old)));
      toast.success(t("userApplicationhistory.codeReviewIssueUpdated", "Đã cập nhật issue"));
    }
    setIssueModal(null);
  };

  const deleteIssue = (index: number) => {
    if (!editable) return;
    setIssues((prev) => prev.filter((_, i) => i !== index));
  };

  const clearDraft = () => {
    setIssues([]);
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }
  };

  // ---- Submit (synchronous) --------------------------------------------
  const [step, setStep] = useState<"REVIEWING" | "SUBMITTING" | "GRADED" | "ERROR">("REVIEWING");

  const handleOpenConfirm = () => {
    if (issues.length === 0) {
      // Allow empty submission but warn (per spec §8 no.6)
      setConfirmOpen(true);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setStep("SUBMITTING");
    try {
      const submissions = issues.map<CodeReviewSubmission>((i) => ({
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
        throw new Error(res.error || "Submit failed");
      }
      const detail = res.data?.detail ?? (res.data as unknown as ApplicationDetail) ?? null;
      setGradedResult(detail);
      setStep("GRADED");
      toast.success(
        t(
          "userApplicationhistory.codeReviewSubmitted",
          `Hoàn tất! Điểm: ${detail?.finalScore ?? detail?.aiScore ?? "?"}/${maxScore}`
        )
      );
      // Clear draft once graded successfully
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
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

  const handleRetake = () => {
    clearDraft();
    setGradedResult(null);
    setStep("REVIEWING");
    // Reset timer
    try {
      const endAt = Date.now() + timeLimitMinutes * 60 * 1000;
      localStorage.setItem(timerStorageKey, String(endAt));
    } catch {
      // ignore
    }
  };

  // ---- Derived data ----------------------------------------------------
  const issuesByFile = useMemo(() => {
    const map: Record<string, LocalDraftIssue[]> = {};
    for (const issue of issues) {
      if (!map[issue.filename]) map[issue.filename] = [];
      map[issue.filename].push(issue);
    }
    return map;
  }, [issues]);

  const severityCounts = useMemo(() => {
    const c = { CRITICAL: 0, WARNING: 0, INFO: 0 } as Record<Severity, number>;
    for (const i of issues) c[i.severity] += 1;
    return c;
  }, [issues]);

  // ---- Empty / loading guards -----------------------------------------
  if (!problem) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-bold">
            {t(
              "userApplicationhistory.codeReviewEmptyState",
              "Vòng này không có bài Code Review nào"
            )}
          </span>
        </div>
      </Card>
    );
  }

  const files = problem.files ?? [];
  if (files.length === 0) {
    return (
      <Card className="border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs font-bold">
            {t("userApplicationhistory.codeReviewNoFiles", "Bài Code Review này chưa có file code")}
          </span>
        </div>
      </Card>
    );
  }

  // ---- Render ----------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ============== Toolbar / Header ============== */}
      <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 to-white px-6 py-4 dark:border-slate-800 dark:from-[#0F172A] dark:to-slate-900/60">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
              <Bug className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.codeReviewRoundType", "VÒNG CODE REVIEW")}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {problem.title || t("userApplicationhistory.codeReviewTitle", "Code Review")}
                </span>
                {problem.difficulty && (
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase",
                      problem.difficulty === "EASY"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : problem.difficulty === "MEDIUM"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    )}>
                    {problem.difficulty}
                  </span>
                )}
                {problem.language && (
                  <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-indigo-700 uppercase dark:bg-indigo-950/60 dark:text-indigo-300">
                    {problem.language}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {remainingMs > 0 && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold tabular-nums",
                  timedOut
                    ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    : remainingMs < 5 * 60 * 1000
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                )}>
                <Clock className="h-3.5 w-3.5" />
                {formatRemaining(remainingMs)}
              </div>
            )}

            {showScore && (
              <span
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-extrabold tabular-nums shadow-xs",
                  passed
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : failed
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                )}>
                {passed ? "✓ " : failed ? "✗ " : ""}
                {t("userApplicationhistory.codeReviewScore", "Điểm")}: {finalScore}/{maxScore}
                {passed && " · PASSED"}
                {failed && " · FAILED"}
              </span>
            )}
          </div>
        </div>

        {/* ============== Context ============== */}
        <div className="space-y-3 px-6 py-5">
          <div>
            <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              {t("userApplicationhistory.codeReviewContext", "Context / Đề bài")}
            </h5>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
              {problem.problemStatement ||
                t(
                  "userApplicationhistory.codeReviewDefaultStatement",
                  "Đọc đoạn code bên dưới, tìm các bug tiềm ẩn (security / performance / code smell) và mô tả chi tiết."
                )}
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">
              <strong className="font-extrabold">
                {t("userApplicationhistory.codeReviewHint", "Mẹo:")}
              </strong>{" "}
              {t(
                "userApplicationhistory.codeReviewClickLineHint",
                "Click vào dòng code bên dưới để chọn vị trí nghi ngờ, sau đó chọn severity (CRITICAL / WARNING / INFO) và mô tả chi tiết."
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* ============== Error banner (if previous submit failed) ============== */}
      {step === "ERROR" && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t(
              "userApplicationhistory.codeReviewSubmitFailedHint",
              "Đã có lỗi khi nộp. Mạng/LLM có thể đã ổn định lại — bạn có thể thử nộp lại."
            )}
          </span>
        </div>
      )}

      {/* ============== Result panel (after graded) ============== */}
      {step === "GRADED" && gradedResult ? (
        <GradedResultView
          detail={gradedResult}
          maxScore={maxScore}
          passed={passed}
          failed={failed}
          onRetake={handleRetake}
        />
      ) : (
        <>
          {/* ============== Code + Issues split ============== */}
          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] dark:border-slate-800/60 dark:bg-slate-900/40">
            {/* ===== Left: Code View ===== */}
            <div className="flex flex-col border-b border-slate-200/80 lg:border-r lg:border-b-0 dark:border-slate-800">
              {/* File tabs */}
              {files.length > 1 && (
                <div className="flex overflow-x-auto border-b border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/60">
                  {files.map((file) => {
                    const fileIssues = issuesByFile[file.filename ?? ""] ?? [];
                    const isActive = file.filename === activeFile;
                    return (
                      <button
                        key={file.filename}
                        type="button"
                        onClick={() => setActiveFile(file.filename ?? "")}
                        className={cn(
                          "flex items-center gap-2 border-r border-slate-200 px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-colors last:border-r-0 dark:border-slate-800",
                          isActive
                            ? "bg-white text-indigo-700 dark:bg-slate-900 dark:text-indigo-300"
                            : "text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/40 dark:hover:text-slate-200"
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
              )}

              {/* Active file content */}
              <CodeViewPane
                file={files.find((f) => f.filename === activeFile) ?? files[0]}
                issues={issuesByFile[activeFile] ?? []}
                onLineClick={(line) => openIssueModal(activeFile, line)}
                editable={editable}
              />
            </div>

            {/* ===== Right: Issues sidebar ===== */}
            <IssuesSidebar
              issues={issues}
              severityCounts={severityCounts}
              editable={editable}
              onEdit={openEditIssue}
              onDelete={deleteIssue}
              onAddNew={() => openIssueModal(activeFile, 1)}
            />
          </div>

          {/* ============== Submit bar ============== */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {t("userApplicationhistory.codeReviewSummary", "Tổng quan")}
              </span>
              <SeverityBadgeMini severity="CRITICAL" count={severityCounts.CRITICAL} />
              <SeverityBadgeMini severity="WARNING" count={severityCounts.WARNING} />
              <SeverityBadgeMini severity="INFO" count={severityCounts.INFO} />
            </div>

            <Button
              onClick={handleOpenConfirm}
              disabled={!editable || submitting}
              className="h-10 gap-2 bg-gradient-to-r from-rose-500 to-orange-500 px-6 text-xs font-bold text-white shadow-sm hover:from-rose-600 hover:to-orange-600">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("userApplicationhistory.codeReviewSubmitting", "Đang chấm điểm...")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {issues.length > 0
                    ? t("userApplicationhistory.codeReviewSubmitIssues", {
                        count: issues.length,
                        defaultValue: `Nộp Review (${issues.length} issues)`,
                      })
                    : t("userApplicationhistory.codeReviewSubmit", "Nộp Review")}
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* ============== Issue modal ============== */}
      {issueModal && (
        <IssueModal
          state={issueModal}
          onChange={setIssueModal}
          onClose={closeIssueModal}
          onSave={saveIssueFromModal}
        />
      )}

      {/* ============== Confirm-submit modal ============== */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="flex items-start gap-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-orange-50 px-6 py-5 dark:border-slate-700 dark:from-rose-950/40 dark:to-orange-950/40">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
              <Send className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">
                {t("userApplicationhistory.codeReviewConfirmSubmitTitle", "Xác nhận nộp Review")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {issues.length === 0
                  ? t(
                      "userApplicationhistory.codeReviewConfirmSubmitEmpty",
                      "Bạn chưa tạo issue nào. Có chắc chắn muốn nộp không? Hệ thống vẫn sẽ chấm với 0 issues."
                    )
                  : t("userApplicationhistory.codeReviewConfirmSubmit", {
                      count: issues.length,
                      defaultValue: `Bạn chắc chắn muốn nộp ${issues.length} issues? AI sẽ chấm ngay và bạn không thể sửa sau khi nộp.`,
                    })}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Total
                </div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums dark:text-white">
                  {issues.length}
                </div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-2 py-2.5 dark:border-rose-900/60 dark:bg-rose-950/40">
                <div className="text-[10px] font-bold tracking-wider text-rose-600 uppercase">
                  CRITICAL
                </div>
                <div className="text-lg font-extrabold text-rose-700 tabular-nums dark:text-rose-300">
                  {severityCounts.CRITICAL}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/40">
                <div className="text-[10px] font-bold tracking-wider text-amber-600 uppercase">
                  WARNING
                </div>
                <div className="text-lg font-extrabold text-amber-700 tabular-nums dark:text-amber-300">
                  {severityCounts.WARNING}
                </div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-2 py-2.5 dark:border-sky-900/60 dark:bg-sky-950/40">
                <div className="text-[10px] font-bold tracking-wider text-sky-600 uppercase">
                  INFO
                </div>
                <div className="text-lg font-extrabold text-sky-700 tabular-nums dark:text-sky-300">
                  {severityCounts.INFO}
                </div>
              </div>
            </div>

            {/* Issues preview list */}
            {issues.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                  {issues.map((iss, i) => {
                    const tok = SEVERITY_TOKENS[iss.severity];
                    const Icon = tok.icon;
                    return (
                      <li key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                        <Icon
                          className={cn(
                            "mt-0.5 h-3.5 w-3.5 shrink-0",
                            iss.severity === "CRITICAL" && "text-rose-500",
                            iss.severity === "WARNING" && "text-amber-500",
                            iss.severity === "INFO" && "text-sky-500"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {filenameShort(iss.filename)}:{iss.lineNumber} ·{" "}
                            <span className="font-bold">{iss.severity}</span>
                          </div>
                          <div className="line-clamp-2 text-slate-700 dark:text-slate-300">
                            {iss.description}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Warning banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">
                {t(
                  "userApplicationhistory.codeReviewConfirmHint",
                  "AI sẽ đối chiếu với expected issues. Quá trình này có thể mất 5–30 giây (sandbox LLM)."
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="border-slate-300 px-5 dark:border-slate-700">
              {t("general.cancel", "Hủy")}
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-rose-500 to-orange-500 px-6 text-white shadow-sm hover:from-rose-600 hover:to-orange-600">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("userApplicationhistory.codeReviewSubmitting", "Đang chấm điểm...")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("userApplicationhistory.codeReviewSubmit", "Nộp Review")}
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
// SUB-COMPONENT: CodeViewPane — selectable, highlighted code lines
// ============================================================================

function CodeViewPane({
  file,
  issues,
  onLineClick,
  editable,
}: {
  file: CodeFile;
  issues: LocalDraftIssue[];
  onLineClick: (_lineNumber: number) => void;
  editable: boolean;
}) {
  const { t } = useTranslation();
  const fileLines = useMemo(() => (file.content ?? "").split("\n"), [file.content]);
  const ext = extensionOf(file.filename ?? "");
  const colorBar = LANGUAGE_COLOR[ext] ?? "from-slate-400 to-slate-500";

  // Build a map: lineNumber -> severity for quick highlighting
  const lineHighlights = useMemo(() => {
    const map: Record<number, Severity> = {};
    for (const iss of issues) {
      map[iss.lineNumber] = iss.severity;
    }
    return map;
  }, [issues]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* File ribbon */}
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          <span className={cn("inline-block h-2 w-2 rounded-full bg-gradient-to-r", colorBar)} />
          <span className="font-mono normal-case">{file.filename}</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 normal-case opacity-70">
          {fileLines.length} {t("userApplicationhistory.codeReviewLines", "dòng")} ·{" "}
          {(file.content ?? "").length} {t("userApplicationhistory.codeReviewChars", "ký tự")}
        </span>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-auto bg-slate-50 font-mono text-sm leading-7 dark:bg-[#0B1220]">
        <pre className="m-0 min-h-full">
          <code>
            {fileLines.map((line, idx) => {
              const lineNo = idx + 1;
              const hl = lineHighlights[lineNo];
              const tok = hl ? SEVERITY_TOKENS[hl] : null;
              return (
                <div
                  key={lineNo}
                  onClick={() => onLineClick(lineNo)}
                  className={cn(
                    "group flex transition-colors",
                    editable && "cursor-pointer hover:bg-indigo-100/60 dark:hover:bg-indigo-500/10",
                    tok && cn(tok.bg, tok.border, "border-l-4", tok.darkBg)
                  )}
                  style={
                    tok
                      ? {
                          borderLeftColor:
                            hl === "CRITICAL"
                              ? "#f43f5e"
                              : hl === "WARNING"
                                ? "#f59e0b"
                                : "#0ea5e9",
                        }
                      : undefined
                  }
                  aria-label={`Line ${lineNo}`}>
                  <span
                    className={cn(
                      "sticky left-0 flex w-14 shrink-0 items-center justify-end border-r px-3 text-xs tabular-nums select-none",
                      "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-600",
                      hl && "font-extrabold"
                    )}>
                    {lineNo}
                  </span>
                  <span className="flex-1 px-4 whitespace-pre text-slate-800 dark:text-slate-200">
                    {line || " "}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: IssuesSidebar — list draft issues, edit/delete
// ============================================================================

function IssuesSidebar({
  issues,
  severityCounts,
  editable,
  onEdit,
  onDelete,
  onAddNew,
}: {
  issues: LocalDraftIssue[];
  severityCounts: Record<Severity, number>;
  editable: boolean;
  onEdit: (_index: number) => void;
  onDelete: (_index: number) => void;
  onAddNew: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col bg-slate-50/40 dark:bg-slate-900/30">
      {/* Header */}
      <div className="border-b border-slate-200/80 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            <Target className="h-3.5 w-3.5" />
            {t("userApplicationhistory.codeReviewIssues", "Review Issues")}
          </h5>
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {issues.length}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t(
            "userApplicationhistory.codeReviewIssuesHelp",
            "Click dòng code bên trái hoặc bấm + để thêm issue. Mỗi issue cần severity + mô tả."
          )}
        </p>
      </div>

      {/* Severity mini-stat */}
      {issues.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200/80 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          <SeverityBadgeMini severity="CRITICAL" count={severityCounts.CRITICAL} />
          <SeverityBadgeMini severity="WARNING" count={severityCounts.WARNING} />
          <SeverityBadgeMini severity="INFO" count={severityCounts.INFO} />
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {issues.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-xs text-slate-400 dark:text-slate-500">
            <MessageSquare className="h-6 w-6 opacity-40" />
            <p className="max-w-[200px] leading-relaxed">
              {t(
                "userApplicationhistory.codeReviewEmptyIssues",
                "Chưa có issue nào. Click vào dòng code bên trái để bắt đầu."
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {issues.map((iss, i) => {
              const tok = SEVERITY_TOKENS[iss.severity];
              const Icon = tok.icon;
              return (
                <li
                  key={i}
                  className={cn(
                    "rounded-xl border p-3 transition-shadow",
                    tok.border,
                    tok.bg,
                    tok.darkBg,
                    tok.darkBorder
                  )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          iss.severity === "CRITICAL" && "text-rose-500",
                          iss.severity === "WARNING" && "text-amber-500",
                          iss.severity === "INFO" && "text-sky-500"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[10px] font-extrabold tracking-wider uppercase",
                              tok.text,
                              tok.darkText
                            )}>
                            #{i + 1} · {iss.severity}
                          </span>
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {filenameShort(iss.filename)}:{iss.lineNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {iss.description}
                  </p>
                  {editable && (
                    <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(i)}
                        className="h-7 gap-1 px-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100/60 dark:text-indigo-300 dark:hover:bg-indigo-950/40">
                        <Pencil className="h-3 w-3" />
                        {t("userApplicationhistory.edit", "Sửa")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(i)}
                        className="h-7 gap-1 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-100/60 dark:text-rose-300 dark:hover:bg-rose-950/40">
                        <Trash2 className="h-3 w-3" />
                        {t("userApplicationhistory.delete", "Xóa")}
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add new */}
      {editable && (
        <div className="border-t border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/40">
          <Button
            variant="outline"
            onClick={onAddNew}
            className="h-9 w-full gap-2 border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300">
            <Plus className="h-3.5 w-3.5" />
            {t("userApplicationhistory.codeReviewAddNew", "Thêm issue mới")}
          </Button>
        </div>
      )}
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
        "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase tabular-nums",
        tok.border,
        tok.bg,
        tok.text,
        tok.darkBg,
        tok.darkBorder,
        tok.darkText
      )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tok.dot)} />
      {severity}: {count}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: IssueModal — create/edit one issue
// ============================================================================

function IssueModal({
  state,
  onChange,
  onClose,
  onSave,
}: {
  state: IssueModalState;
  onChange: (_s: IssueModalState) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const isEditing = state.editingIndex !== null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="flex items-start gap-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 to-orange-50 px-6 py-5 dark:border-slate-700 dark:from-rose-950/40 dark:to-orange-950/40">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <DialogTitle className="text-base">
              {isEditing
                ? t("userApplicationhistory.codeReviewEditIssue", "Sửa issue")
                : t("userApplicationhistory.codeReviewCreateIssue", "Tạo issue mới")}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              {t(
                "userApplicationhistory.codeReviewModalDesc",
                "Chọn mức severity và mô tả chi tiết vấn đề của bạn."
              )}
            </DialogDescription>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          {/* File + Line */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.codeReviewFile", "File")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                <FileCode2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
                  {filenameShort(state.filename)}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.codeReviewLine", "Dòng")}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-mono text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                  L{state.lineNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Severity picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("userApplicationhistory.codeReviewSeverity", "Severity")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["CRITICAL", "WARNING", "INFO"] as Severity[]).map((s) => {
                const tok = SEVERITY_TOKENS[s];
                const Icon = tok.icon;
                const active = state.severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onChange({ ...state, severity: s })}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all",
                      active
                        ? cn(
                            tok.border,
                            "ring-2 ring-offset-1",
                            s === "CRITICAL" && "ring-rose-400",
                            s === "WARNING" && "ring-amber-400",
                            s === "INFO" && "ring-sky-400"
                          )
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    )}>
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          s === "CRITICAL" && "text-rose-500",
                          s === "WARNING" && "text-amber-500",
                          s === "INFO" && "text-sky-500"
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs font-extrabold tracking-wider uppercase",
                          active
                            ? s === "CRITICAL"
                              ? "text-rose-700 dark:text-rose-300"
                              : s === "WARNING"
                                ? "text-amber-700 dark:text-amber-300"
                                : "text-sky-700 dark:text-sky-300"
                            : "text-slate-700 dark:text-slate-300"
                        )}>
                        {SEVERITY_KEYS[s].label}
                      </span>
                    </div>
                    <span className="text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                      {SEVERITY_KEYS[s].desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("userApplicationhistory.codeReviewDescription", "Mô tả issue")}
            </label>
            <textarea
              autoFocus
              rows={4}
              value={state.description}
              onChange={(e) => onChange({ ...state, description: e.target.value })}
              placeholder={t(
                "userApplicationhistory.codeReviewDescriptionPlaceholder",
                "VD: SQL Injection: dùng Statement + string concat thay vì PreparedStatement..."
              )}
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/60">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-300 px-5 dark:border-slate-700">
            <X className="mr-1.5 h-3.5 w-3.5" />
            {t("general.cancel", "Hủy")}
          </Button>
          <Button
            onClick={onSave}
            disabled={!state.description.trim()}
            className="gap-2 bg-gradient-to-r from-rose-500 to-orange-500 px-6 text-white shadow-sm hover:from-rose-600 hover:to-orange-600">
            <Plus className="h-4 w-4" />
            {isEditing
              ? t("userApplicationhistory.codeReviewSave", "Lưu thay đổi")
              : t("userApplicationhistory.codeReviewAdd", "Thêm issue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SUB-COMPONENT: GradedResultView — show AI score + 10 metrics + feedback
// ============================================================================

function GradedResultView({
  detail,
  maxScore,
  passed,
  failed,
  onRetake,
}: {
  detail: ApplicationDetail;
  maxScore: number;
  passed: boolean;
  failed: boolean;
  onRetake: () => void;
}) {
  const { t } = useTranslation();
  const feedback = detail.aiFeedback as AiFeedback | null | undefined;
  const finalScore = detail.finalScore ?? detail.aiScore ?? 0;
  const metrics = feedback?.extraMetrics ?? {};
  const strengths = feedback?.strengths ?? [];
  const weaknesses = feedback?.weaknesses ?? [];
  const generalComment = feedback?.generalComment ?? "";

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-slate-200/80 px-6 py-5 dark:border-slate-800",
          passed
            ? "bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40"
            : failed
              ? "bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40"
              : "bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-900/40"
        )}>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm",
              passed
                ? "bg-gradient-to-br from-emerald-500 to-sky-600"
                : failed
                  ? "bg-gradient-to-br from-rose-500 to-orange-500"
                  : "bg-gradient-to-br from-slate-400 to-slate-600"
            )}>
            {passed ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : failed ? (
              <X className="h-6 w-6" />
            ) : (
              <Award className="h-6 w-6" />
            )}
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              {t("userApplicationhistory.codeReviewResultTitle", "Kết quả Code Review")}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums dark:text-white">
                {finalScore}
              </span>
              <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                /{maxScore}
              </span>
              {passed && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-700 uppercase dark:bg-emerald-950/60 dark:text-emerald-300">
                  ✓ PASSED
                </span>
              )}
              {failed && (
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-rose-700 uppercase dark:bg-rose-950/60 dark:text-rose-300">
                  ✗ FAILED
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onRetake}
          className="gap-2 border-slate-300 px-5 text-xs font-bold dark:border-slate-700">
          <RefreshCw className="h-3.5 w-3.5" />
          {t("userApplicationhistory.codeReviewRetake", "Tôi muốn submit lại")}
        </Button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        {/* ===== Left: 10 metrics ===== */}
        <div className="space-y-4 border-b border-slate-200/80 p-6 lg:border-r lg:border-b-0 dark:border-slate-800">
          <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            <Code2 className="h-3.5 w-3.5" />
            {t("userApplicationhistory.codeReviewMetricsTitle", "Điểm chi tiết (10 tiêu chí AI)")}
          </h5>
          {Object.keys(metrics).length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              {t("userApplicationhistory.codeReviewNoMetrics", "Chưa có metrics")}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {Object.entries(metrics).map(([key, value]) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {key}
                  </span>
                  <span className="font-mono text-xs font-extrabold text-indigo-700 tabular-nums dark:text-indigo-300">
                    {String(value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ===== Right: Strengths / Weaknesses / General ===== */}
        <div className="space-y-5 p-6">
          {/* Strengths */}
          <div>
            <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("userApplicationhistory.codeReviewStrengths", "Điểm mạnh")}
            </h5>
            {strengths.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400 italic">
                {t("userApplicationhistory.codeReviewNoComments", "Chưa có nhận xét")}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Weaknesses */}
          <div>
            <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-amber-700 uppercase dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("userApplicationhistory.codeReviewWeaknesses", "Điểm yếu")}
            </h5>
            {weaknesses.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400 italic">
                {t("userApplicationhistory.codeReviewNoComments", "Chưa có nhận xét")}
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {weaknesses.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* General Comment */}
          {generalComment && (
            <div>
              <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-indigo-700 uppercase dark:text-indigo-400">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("userApplicationhistory.codeReviewGeneralComment", "Nhận xét chung")}
              </h5>
              <p className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs leading-relaxed text-slate-700 italic dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-slate-300">
                {generalComment}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
