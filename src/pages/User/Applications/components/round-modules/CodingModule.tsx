import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerInblueMonacoThemes, useMonacoTheme } from "@/hooks/useMonacoTheme";
import { cn } from "@/lib/utils";
import {
  applicationDetailManager,
  type ApplicationDetail as ApiApplicationDetail,
} from "@/services/application-detail.manager";
import { applicationService } from "@/services/application.manager";
import Editor from "@monaco-editor/react";
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  FileCode2,
  GripVertical,
  Loader2,
  Play,
  Send,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type CompilerLanguage = NonNullable<components["schemas"]["CompileRequest"]["language"]>;
type CompilerResponse = components["schemas"]["CompilerResponseDto"];

interface CodingModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

// ============================================================================
// Helpers (module-level so re-renders don't recreate them)
// ============================================================================

/**
 * Per-problem editing state. `code` is kept as a single string so the
 * `<textarea>` can hold it directly; we `split('\n')` only at the call site
 * when we hand it to the API (BE expects `sourceCode: string[]` — one line
 * per element).
 */
interface ProblemSource {
  language: CompilerLanguage;
  code: string;
  /** Local hint: did the user actually edit this problem's code? */
  dirty: boolean;
  /** Cache code per language for this problem (like LeetCode) */
  codeByLanguage?: Partial<Record<CompilerLanguage, string>>;
}

type SampleResults = Record<number, CompilerResponse | null>;

/**
 * Languages rendered in the dropdown. The API spec lists 19 — keep it
 * aligned with `CompilerLanguage` from schema-from-be.
 */
const ALL_LANGUAGES: CompilerLanguage[] = [
  "JAVA",
  "PYTHON",
  "JS",
  "CPP",
  "CSHARP",
  "C",
  "TYPESCRIPT",
  "GO",
  "KOTLIN",
  "SWIFT",
  "RUST",
  "RUBY",
  "PHP",
  "DART",
  "SCALA",
  "ELIXIR",
  "ERLANG",
  "RACKET",
];

/**
 * Convert the full schema `Round` shape into a friendlier "snapshot of the
 * coding problem" view we can render.
 */
interface CodingProblemVM {
  problemId: number;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | string | undefined;
  problemStatement: string;
  rulesAndConstraints: string[];
  visibleExamples: Array<{
    inputs: string[];
    output: string;
    explanation?: string;
  }>;
  executionTimeLimitMs?: number;
  memoryLimitMb?: number;
  codeStubs: Partial<Record<CompilerLanguage, string>>;
}

function parseExamples(
  rawExamples: unknown
): Array<{ inputs: string[]; output: string; explanation?: string }> {
  if (!rawExamples) return [];
  let list: unknown[] = [];
  if (typeof rawExamples === "string") {
    try {
      const parsed = JSON.parse(rawExamples);
      list = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      list = [];
    }
  } else if (Array.isArray(rawExamples)) {
    list = rawExamples;
  }
  return list
    .filter((ex) => ex != null && typeof ex === "object")
    .map((ex: any) => {
      let inputs: string[] = [];
      if (Array.isArray(ex.inputs)) {
        inputs = ex.inputs.map((x: any) => (x != null ? String(x) : ""));
      } else if (ex.inputs !== undefined && ex.inputs !== null) {
        inputs = [String(ex.inputs)];
      } else if (Array.isArray(ex.input)) {
        inputs = ex.input.map((x: any) => (x != null ? String(x) : ""));
      } else if (ex.input !== undefined && ex.input !== null) {
        inputs = [String(ex.input)];
      }

      const output = ex.output != null ? String(ex.output) : "";
      const explanation = ex.explanation != null ? String(ex.explanation) : undefined;
      return { inputs, output, explanation };
    });
}

function parseRules(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((r) => String(r ?? "")).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((r) => String(r ?? "")).filter(Boolean);
    } catch {
      return raw.split("\n").map((r) => r.trim()).filter(Boolean);
    }
  }
  return [];
}



function parseCodeStubs(raw: unknown): Partial<Record<CompilerLanguage, string>> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Partial<Record<CompilerLanguage, string>>;
      }
    } catch {
      return {};
    }
  }
  if (typeof raw === "object" && raw !== null) {
    return raw as Partial<Record<CompilerLanguage, string>>;
  }
  return {};
}

function getProblems(round: JdRound): CodingProblemVM[] {
  // JdRound is a partial local shape — pull `codingProblems` off the full
  // BE round schema which is the source of truth for problem snapshots.
  const roundFull = round as JdRound & {
    configData?: {
      codingProblems?: Array<{
        problemId?: number;
        title?: string;
        difficulty?: string;
        problemStatement?: string;
        rulesAndConstraints?: string[];
        visibleExamples?: Array<{
          inputs?: string[];
          output?: string;
          explanation?: string;
        }>;
        executionTimeLimitMs?: number;
        memoryLimitMb?: number;
        codeStubs?: Record<string, string>;
      }>;
    };
  };

  const raw = roundFull.configData?.codingProblems ?? [];
  return raw.map((p: any) => ({
    problemId: p.problemId ?? 0,
    title: p.title ?? `Problem #${p.problemId ?? "?"}`,
    difficulty: p.difficulty,
    problemStatement: p.problemStatement ?? "",
    rulesAndConstraints: parseRules(p.rulesAndConstraints ?? p.constraints),
    visibleExamples: parseExamples(
      p.visibleExamples ?? p.examples ?? p.sampleTestCases ?? p.visibleTestCases ?? p.testCases
    ),
    executionTimeLimitMs: p.executionTimeLimitMs,
    memoryLimitMb: p.memoryLimitMb,
    codeStubs: parseCodeStubs(p.codeStubs ?? p.starterCode ?? p.templates),
  }));
}

const DEFAULT_STUBS: Partial<Record<CompilerLanguage, string>> = {
  JAVA: `class Solution {\n    // Viết code của bạn tại đây\n}`,
  PYTHON: `class Solution:\n    # Viết code của bạn tại đây\n    pass`,
  CPP: `class Solution {\npublic:\n    // Viết code của bạn tại đây\n};`,
  JS: `/**\n * @return {any}\n */\nfunction solution() {\n    // Viết code của bạn tại đây\n}`,
  TYPESCRIPT: `function solution(): void {\n    // Viết code của bạn tại đây\n}`,
  CSHARP: `public class Solution {\n    // Viết code của bạn tại đây\n}`,
  GO: `package main\n\n// Viết code của bạn tại đây`,
  C: `// Viết code của bạn tại đây\n`,
  KOTLIN: `class Solution {\n    // Viết code của bạn tại đây\n}`,
  RUST: `// Viết code của bạn tại đây\n`,
};

function getCodeStub(problem: CodingProblemVM, language: CompilerLanguage): string {
  return (
    problem.codeStubs[language] ||
    DEFAULT_STUBS[language] ||
    `// Viết code ${language} của bạn tại đây\n`
  );
}

function languagesAvailable(problem: CodingProblemVM): CompilerLanguage[] {
  const present = ALL_LANGUAGES.filter((l) => Boolean(problem.codeStubs[l]));
  if (present.length > 0) return present;
  return ["JAVA", "PYTHON", "CPP", "JS", "TYPESCRIPT", "CSHARP", "GO", "C", "KOTLIN", "RUST"];
}

function pickInitialLanguage(
  problem: CodingProblemVM,
  detail: ApplicationDetail | undefined
): CompilerLanguage {
  const last = detail?.submissionData?.codeSubmissions?.at(-1);
  if (last?.sourceCode && last.sourceCode.length > 0) {
    const restored = inferLanguage(last.sourceCode.join("\n"));
    if (restored && languagesAvailable(problem).includes(restored)) {
      return restored;
    }
  }
  return languagesAvailable(problem)[0] ?? "JAVA";
}

function inferLanguage(code: string | undefined): CompilerLanguage | null {
  if (!code) return null;
  if (/^\s*(import\s+java\b|public\s+(?:class|interface|enum)\s|System\.out)/m.test(code))
    return "JAVA";
  if (/^\s*(def\s+\w+\(|from\s+\w+\s+import|import\s+sys\b)/m.test(code)) return "PYTHON";
  if (/^\s*(#include\s*<|using\s+namespace|int\s+main\s*\()/m.test(code)) return "CPP";
  if (/:\s*interface\s+\w+|:\s*type\b|=>\s*\{|^\s*declare\s/m.test(code)) return "TYPESCRIPT";
  if (/^\s*(const|let|var|function)\s/m.test(code)) return "JS";
  return null;
}

function splitSourceForApi(code: string): string[] {
  // Mirror of `code = lines.join('\n')` used in the editor.
  return code.split("\n");
}

function joinSourceFromApi(lines: string[] | undefined): string {
  return (lines ?? []).join("\n");
}

function statusBadgeClass(status: string | undefined): string {
  switch (status) {
    case "PASSED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "FAILED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300";
    case "TIMEOUT":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300";
    case "RUNTIME_ERROR":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300";
    case "COMPILE_ERROR":
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

function extractSubmissionResults(
  targetDetail: ApplicationDetail | undefined,
  problemList: CodingProblemVM[]
): SampleResults {
  const results: SampleResults = {};
  const persisted = targetDetail?.submissionData?.codeSubmissions ?? [];
  for (const [idx, p] of problemList.entries()) {
    const sub = persisted[idx] ?? persisted[persisted.length - 1];
    if (sub?.testCases) {
      results[p.problemId] = sub.testCases as unknown as CompilerResponse;
    }
  }
  return results;
}

export function CodingModule({
  round,
  detail,
  applicationId,
  isCompleted,
  isCurrent,
  onSuccess,
}: CodingModuleProps) {
  const { t } = useTranslation();
  const problems = useMemo(() => getProblems(round), [round]);

  // ---- Per-problem editing state ------------------------------------------
  // Re-seed whenever the round changes (different problem set).
  const roundKey = round.id ?? round.roundOrder ?? 0;
  const detailId = detail?.id ?? 0;

  const [sources, setSources] = useState<Record<number, ProblemSource>>(() => {
    const init: Record<number, ProblemSource> = {};
    const persisted = detail?.submissionData?.codeSubmissions ?? [];
    for (const [idx, p] of problems.entries()) {
      // Re-use the candidate's last submission for the corresponding problem,
      // in submission order. If a round only has 1 problem this is exact.
      const submitted = persisted[idx] ?? persisted[persisted.length - 1];
      const lang = pickInitialLanguage(p, detail);
      const code =
        submitted?.sourceCode && submitted.sourceCode.length > 0
          ? joinSourceFromApi(submitted.sourceCode)
          : getCodeStub(p, lang);
      init[p.problemId] = {
        language: lang,
        code,
        dirty: Boolean(submitted?.sourceCode && submitted.sourceCode.length > 0),
        codeByLanguage: { [lang]: code },
      };
    }
    return init;
  });

  // Re-seed when navigating to a different round (or after data re-load).
  useEffect(() => {
    setSources((prev) => {
      const next: Record<number, ProblemSource> = {};
      const persisted = detail?.submissionData?.codeSubmissions ?? [];
      for (const [idx, p] of problems.entries()) {
        const existing = prev[p.problemId];
        if (existing && existing.code.trim().length > 0 && existing.dirty) {
          // Keep whatever the candidate was already typing for this problem.
          next[p.problemId] = existing;
          continue;
        }
        const submitted = persisted[idx] ?? persisted[persisted.length - 1];
        const lang = existing?.language ?? pickInitialLanguage(p, detail);
        const code =
          submitted?.sourceCode && submitted.sourceCode.length > 0
            ? joinSourceFromApi(submitted.sourceCode)
            : getCodeStub(p, lang);
        next[p.problemId] = {
          language: lang,
          code,
          dirty: Boolean(submitted?.sourceCode && submitted.sourceCode.length > 0),
          codeByLanguage: existing?.codeByLanguage ?? { [lang]: code },
        };
      }
      return next;
    });
    // We intentionally only re-seed on round identity changes so candidate
    // edits are preserved while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundKey, detailId]);

  const [runningId, setRunningId] = useState<number | null>(null);
  const [sampleResults, setSampleResults] = useState<SampleResults>(() => {
    return extractSubmissionResults(detail, problems);
  });

  // Sync test results when detail updates
  useEffect(() => {
    if (detail?.submissionData?.codeSubmissions) {
      const persistedResults = extractSubmissionResults(detail, problems);
      setSampleResults((prev) => ({
        ...prev,
        ...persistedResults,
      }));
    }
  }, [detail, problems]);

  // Active problem tab index (for multi-problem navigation)
  const [currentProblemIdx, setCurrentProblemIdx] = useState(0);

  // Submit-then-poll state. After Submit returns PENDING we poll
  // GET /api/application-details/application/{id} every 10s looking for an
  // AI_EVALUATED detail for this round, up to 6 minutes.
  const [submitting, setSubmitting] = useState(false);
  const [awaitingGrade, setAwaitingGrade] = useState(false);

  const finalScore = detail?.finalScore ?? detail?.aiScore;
  const timeLimitMinutes = round.configData?.timeLimitMinutes ?? null;

  // ---- Editor change handlers ---------------------------------------------
  const updateSource = (problemId: number, mutator: (_prev: ProblemSource) => ProblemSource) => {
    setSources((prev) => {
      const cur = prev[problemId];
      if (!cur) return prev;
      return { ...prev, [problemId]: mutator(cur) };
    });
  };

  const handleCodeChange = (problemId: number, value: string) => {
    updateSource(problemId, (s) => ({
      ...s,
      code: value,
      dirty: true,
      codeByLanguage: {
        ...(s.codeByLanguage ?? {}),
        [s.language]: value,
      },
    }));
  };

  const handleLanguageChange = (problemId: number, next: CompilerLanguage) => {
    const problem = problems.find((p) => p.problemId === problemId);
    if (!problem) return;
    updateSource(problemId, (s) => {
      // Save current code to cache
      const codeCache = {
        ...(s.codeByLanguage ?? {}),
        [s.language]: s.code,
      };
      // Next language code: use cached code if exists, otherwise get code stub
      const nextCode = codeCache[next] ?? getCodeStub(problem, next);
      return {
        ...s,
        language: next,
        code: nextCode,
        codeByLanguage: {
          ...codeCache,
          [next]: nextCode,
        },
      };
    });
    // Drop any sample-run results for this problem — they reference the old
    // language's output.
    setSampleResults((prev) => ({ ...prev, [problemId]: null }));
  };

  // ---- Run sample tests (isTest = true) -----------------------------------
  const handleRunCode = async (problemId: number) => {
    const source = sources[problemId];
    if (!source) return;
    setRunningId(problemId);
    try {
      const res = await applicationDetailManager.submit({
        applicationId,
        compileRequest: [
          {
            problemId,
            language: source.language,
            sourceCode: splitSourceForApi(source.code),
            isTest: true,
          },
        ],
      });
      if (!res.success) {
        throw new Error(res.error || "Run sample failed");
      }
      const tests = res.data?.testCases ?? [];
      const compiled: CompilerResponse = {
        status: "COMPLETED",
        passedTestCases: tests.filter((t) => t.status === "PASSED").length,
        totalTestCases: tests.length,
        executionTimeMs: tests.reduce((sum, t) => sum + (t.executionTimeMs ?? 0), 0),
        testCases: tests,
      };
      setSampleResults((prev) => ({ ...prev, [problemId]: compiled }));
      toast.success(
        t(
          "userApplicationhistory.testCasesPassed",
          `Chạy Test cases mẫu thành công (${compiled.passedTestCases}/${compiled.totalTestCases} Passed)`
        )
      );
    } catch (err) {
      console.error("[CodingModule] Run sample error:", err);
      toast.error(err instanceof Error ? err.message : "Run sample failed");
    } finally {
      setRunningId(null);
    }
  };

  // ---- Submit (isTest = false) + poll for grading -------------------------
  const cancelPollRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Stats for the confirmation modal. We compute them at the moment the
  // candidate clicks "Submit" so the dialog shows a live snapshot of what
  // they're about to send.
  const submissionStats = useMemo(() => {
    let totalLines = 0;
    let totalChars = 0;
    const problemsList: Array<{
      problemId: number;
      title: string;
      language: CompilerLanguage;
      lines: number;
      chars: number;
      empty: boolean;
      sampleResult: CompilerResponse | null;
    }> = [];
    for (const p of problems) {
      const src = sources[p.problemId];
      const code = src?.code ?? "";
      const lines = code.split("\n").length;
      const chars = code.length;
      totalLines += lines;
      totalChars += chars;
      problemsList.push({
        problemId: p.problemId,
        title: p.title,
        language: (src?.language ?? "JAVA") as CompilerLanguage,
        lines,
        chars,
        empty: code.trim().length === 0,
        sampleResult: sampleResults[p.problemId] ?? null,
      });
    }
    return { totalLines, totalChars, problemsList };
  }, [problems, sources, sampleResults]);

  const handleOpenConfirm = () => {
    if (problems.length === 0) return;
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const compileRequest = problems.map((p) => {
        const src = sources[p.problemId];
        return {
          problemId: p.problemId,
          language: (src?.language ?? "JAVA") as CompilerLanguage,
          sourceCode: splitSourceForApi(src?.code ?? ""),
          isTest: false as const,
        };
      });
      const res = await applicationDetailManager.submit({
        applicationId,
        compileRequest,
      });
      if (!res.success) {
        throw new Error(res.error || "Submit failed");
      }
      toast.success(
        t(
          "userApplicationhistory.solutionSubmitted",
          "Đã nộp bài giải Coding thành công! Hệ thống đang chấm, vui lòng chờ..."
        )
      );
      setAwaitingGrade(true);
      cancelPollRef.current = false;
      await pollForGrade();
      onSuccess?.();
    } catch (err) {
      console.error("[CodingModule] Submit error:", err);
      toast.error(err instanceof Error ? err.message : "Nộp bài giải thất bại");
    } finally {
      setSubmitting(false);
      setAwaitingGrade(false);
    }
  };

  /**
   * Poll GET /api/application-details/application/{appId} every 10s until the
   * detail for this round reaches AI_EVALUATED (BE grading finished) or 6 min
   * have elapsed.  Returns once onSuccess can refetch the workspace.
   */
  const pollForGrade = async () => {
    const roundIdValue = round.id;
    if (!roundIdValue) return;
    const deadline = Date.now() + 6 * 60 * 1000;
    while (!cancelPollRef.current && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10_000));
      if (cancelPollRef.current) return;
      try {
        const res = await applicationDetailManager.getByApplicationId(applicationId);
        if (res.success && res.data) {
          const d = res.data.find((x) => x.roundId === roundIdValue);
          if (d?.status === "AI_EVALUATED" || d?.status === "COMPLETED") {
            if (d.submissionData?.codeSubmissions) {
              const resObj = extractSubmissionResults(d, problems);
              setSampleResults((prev) => ({ ...prev, ...resObj }));
            }
            return;
          }
        }
      } catch {
        // ignore transient poll failures
      }
      // Refresh the application too so currentRoundOrder updates if this
      // submission unlocked the next round.
      try {
        await applicationService.getById(applicationId);
      } catch {
        // ignore
      }
    }
  };

  const isFinished =
    isCompleted ||
    detail?.finalScore != null ||
    detail?.status === "COMPLETED" ||
    detail?.status === "AI_EVALUATED";
  const activeProblem = problems[currentProblemIdx];

  return (
    <div className="space-y-6">
      {/* ── FULLSCREEN SUBMITTING / GRADING OVERLAY BLOCKER ── */}
      {(submitting || awaitingGrade) && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md transition-all duration-300">
          <div className="relative mx-4 flex max-w-md flex-col items-center gap-5 rounded-3xl border border-slate-800 bg-slate-900/95 p-8 text-center shadow-2xl shadow-indigo-500/10">
            {/* Spinning glowing status indicator */}
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20 duration-1000" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Code2 className="h-5 w-5 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-black tracking-tight text-white">
                {awaitingGrade
                  ? t("userApplicationhistory.gradingTitle", "Hệ thống đang chấm bài...")
                  : t("userApplicationhistory.submittingTitle", "Đang nộp bài làm...")}
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {awaitingGrade
                  ? t(
                      "userApplicationhistory.gradingSubtitle",
                      "Mã nguồn đang được thực thi trên Sandbox bảo mật để chấm điểm các test cases. Vui lòng không đóng trình duyệt."
                    )
                  : t(
                      "userApplicationhistory.submittingSubtitle",
                      "Đang đóng gói và gửi dữ liệu giải thuật lên máy chủ chấm điểm..."
                    )}
              </p>
            </div>

            {/* Live Progress Indicator */}
            <div className="w-full space-y-2 pt-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
              </div>
              <div className="flex items-center justify-center gap-2 font-mono text-[11px] font-bold text-indigo-400">
                <span className="h-2 w-2 animate-ping rounded-full bg-indigo-400" />
                <span>Sandbox Grader is running...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP SUB-HEADER (Single Standalone Header Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                {isFinished
                  ? "BÁO CÁO ĐÁNH GIÁ BÀI THI LẬP TRÌNH"
                  : `VÒNG ${round.roundOrder ?? 4}: LẬP TRÌNH • TRẠM THI TRỰC TUYẾN`}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-400">
                Vòng {round.roundOrder ?? 4}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-200">
              {isFinished
                ? "Hệ thống đã hoàn tất chấm điểm mã nguồn và kiểm thử toàn bộ test cases trên Sandbox."
                : round.configData?.instruction ||
                  "Đọc kỹ Đề bài & Ràng buộc bên dưới, viết giải thuật và chạy thử các test cases trước khi nộp."}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {detail?.finalResult ? (
            <span
              className={
                detail.finalResult === "PASSED"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40"
                  : "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-extrabold text-rose-300 shadow-sm shadow-rose-950/40"
              }>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>KẾT QUẢ: {detail.finalResult}</span>
            </span>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40">
              <CheckCircle2 className="h-4 w-4" />
              <span>ĐÃ HOÀN THÀNH BÀI THI</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>ĐANG TRONG THỜI GIAN LÀM BÀI</span>
            </span>
          )}
        </div>
      </div>

      {/* Awaiting-grading banner */}
      {awaitingGrade && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/80 p-3 text-xs text-indigo-800 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            {t(
              "userApplicationhistory.codingGrading",
              "Hệ thống đang chấm bài của bạn (sandbox). Vui lòng không đóng trang."
            )}
          </span>
        </div>
      )}

      {/* No problems warning */}
      {problems.length === 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold">
              {t(
                "userApplicationhistory.codingNoProblem",
                "Round này chưa cấu hình bài coding. Vui lòng liên hệ nhà tuyển dụng."
              )}
            </span>
          </div>
        </Card>
      )}

      {/* ── ACTIVE PROBLEM CARD ── */}
      {activeProblem &&
        (() => {
          const source = sources[activeProblem.problemId];
          if (!source) return null;
          const langs = languagesAvailable(activeProblem);
          const result = sampleResults[activeProblem.problemId] ?? null;
          const isRunningThis = runningId === activeProblem.problemId;
          return (
            <CodingProblemCard
              key={activeProblem.problemId}
              index={currentProblemIdx}
              problem={activeProblem}
              source={source}
              availableLanguages={langs}
              result={result}
              isRunning={isRunningThis}
              isCompleted={isFinished}
              isCurrent={isCurrent}
              finalScore={finalScore ?? null}
              problemFinalScoreStatus={detail?.status ?? null}
              onChangeCode={(value) => handleCodeChange(activeProblem.problemId, value)}
              onChangeLanguage={(lang) => handleLanguageChange(activeProblem.problemId, lang)}
              onRun={() => handleRunCode(activeProblem.problemId)}
              submitting={submitting}
              onSubmitAll={handleOpenConfirm}
              totalProblems={problems.length}
              timeLimitMinutes={timeLimitMinutes}
              startTime={detail?.startedAt ?? roundDetailStart(detail)}
              onNavigatePrev={
                currentProblemIdx > 0 ? () => setCurrentProblemIdx((i) => i - 1) : undefined
              }
              onNavigateNext={
                currentProblemIdx < problems.length - 1
                  ? () => setCurrentProblemIdx((i) => i + 1)
                  : undefined
              }
            />
          );
        })()}

      {/* Confirm-submit modal — macOS Window styling with red/yellow/green traffic dots */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          // Block accidental close while the BE is still receiving the
          // submission, but allow Cancel while the modal is just open.
          if (submitting) return;
          setConfirmOpen(next);
        }}>
        <DialogContent className="max-w-lg overflow-hidden border border-slate-800 bg-slate-900/95 p-0 text-slate-100 shadow-2xl backdrop-blur-xl sm:rounded-2xl">
          {/* MacBook Window Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-5 py-3.5">
            <div className="flex items-center gap-3">
              {/* Window Dots */}
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500/90 shadow-2xs" />
                <span className="h-3 w-3 rounded-full bg-amber-500/90 shadow-2xs" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/90 shadow-2xs" />
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
                  <Send className="h-3.5 w-3.5" />
                </div>
                <DialogTitle className="font-mono text-xs font-bold text-slate-200">
                  {t("userApplicationhistory.confirmSubmitTitle", "Xác nhận nộp bài thi lập trình")}
                </DialogTitle>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
              ● Sandbox Grader
            </span>
          </div>

          <DialogDescription className="sr-only">
            {t(
              "userApplicationhistory.confirmSubmitCoding",
              "Bạn chắc chắn muốn nộp tất cả bài? Sau khi nộp, hệ thống sẽ chấm và bạn vẫn có thể làm lại vòng này."
            )}
          </DialogDescription>

          <div className="space-y-4 px-5 py-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 shadow-inner">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Số bài tập
                </div>
                <div className="mt-0.5 text-lg font-black text-white tabular-nums">
                  {problems.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 shadow-inner">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Tổng số dòng
                </div>
                <div className="mt-0.5 text-lg font-black text-indigo-300 tabular-nums">
                  {submissionStats.totalLines}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 shadow-inner">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Dung lượng
                </div>
                <div className="mt-0.5 text-lg font-black text-emerald-300 tabular-nums">
                  {submissionStats.totalChars}{" "}
                  <span className="text-[11px] font-normal text-slate-400">chars</span>
                </div>
              </div>
            </div>

            {/* Per-problem breakdown */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
              <div className="border-b border-slate-800 bg-slate-950 px-3.5 py-2">
                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">
                  Danh sách bài làm sẽ nộp
                </span>
              </div>
              <div className="divide-y divide-slate-800/70">
                {submissionStats.problemsList.map((p, i) => {
                  const sampleRes = p.sampleResult;
                  const sampleTotal =
                    sampleRes?.totalTestCases ?? sampleRes?.testCases?.length ?? 0;
                  const samplePassed = sampleRes?.passedTestCases ?? 0;
                  const hasTested = Boolean(sampleRes);
                  const isAllSamplePassed =
                    hasTested && sampleTotal > 0 && samplePassed === sampleTotal;

                  return (
                    <div
                      key={p.problemId}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs transition-colors hover:bg-slate-900/50">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-800 font-mono text-[10px] font-bold text-slate-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-200">{p.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="rounded border border-indigo-500/30 bg-indigo-950/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
                              {p.language}
                            </span>
                            <span>·</span>
                            <span className="font-mono">{p.lines} dòng</span>
                          </div>
                        </div>
                      </div>

                      {/* Sample test status badge */}
                      <div className="shrink-0 text-right">
                        {hasTested ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold",
                              isAllSamplePassed
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            )}>
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isAllSamplePassed ? "bg-emerald-400" : "bg-rose-400"
                              )}
                            />
                            {samplePassed}/{sampleTotal} Tests
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                            Chưa test thử
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="leading-relaxed">
                {t(
                  "userApplicationhistory.confirmSubmitHint",
                  "Sau khi nộp bài, hệ thống sẽ gửi code của bạn sang sandbox để chấm các test ẩn. Quá trình này có thể mất 1–3 phút."
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-5 py-3.5">
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              Kiểm tra kỹ trước khi bấm nộp
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="h-8 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                {t("general.cancel", "Hủy")}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={submitting}
                className="h-8 gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500">
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("compUi.uploading", "Đang nộp...")}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>{t("common.submit", "Nộp bài")}</span>
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Best effort: find when the candidate first interacted with the current
 * coding round. The detail does not always carry this date (e.g. before the
 * first submission) — return undefined so the countdown simply doesn't run.
 */
function roundDetailStart(detail: ApiApplicationDetail | undefined): string | undefined {
  return detail?.startedAt ?? undefined;
}

// ============================================================================
// CodingProblemCard — per-problem editor + run/test panel
// ============================================================================

interface CodingProblemCardProps {
  index: number;
  problem: CodingProblemVM;
  source: ProblemSource;
  availableLanguages: CompilerLanguage[];
  result: CompilerResponse | null;
  isRunning: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  finalScore: number | null;
  problemFinalScoreStatus: string | null;
  onChangeCode: (_value: string) => void;
  onChangeLanguage: (_lang: CompilerLanguage) => void;
  onRun: () => void;
  submitting: boolean;
  onSubmitAll: () => void;
  totalProblems: number;
  timeLimitMinutes: number | null;
  startTime: string | undefined;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

const LANGUAGE_LABEL: Partial<Record<CompilerLanguage, string>> = {
  JAVA: "Java 17",
  PYTHON: "Python 3.10",
  JS: "JavaScript",
  TYPESCRIPT: "TypeScript",
  CPP: "C++",
  CSHARP: "C#",
  C: "C",
  GO: "Go",
  KOTLIN: "Kotlin",
  SWIFT: "Swift",
  RUST: "Rust",
  RUBY: "Ruby",
  PHP: "PHP",
  DART: "Dart",
  SCALA: "Scala",
  ELIXIR: "Elixir",
  ERLANG: "Erlang",
  RACKET: "Racket",
};

/** Map from CompilerLanguage to Monaco Editor language ID */
const MONACO_LANG: Partial<Record<CompilerLanguage, string>> = {
  JAVA: "java",
  PYTHON: "python",
  JS: "javascript",
  TYPESCRIPT: "typescript",
  CPP: "cpp",
  CSHARP: "csharp",
  C: "c",
  GO: "go",
  KOTLIN: "kotlin",
  SWIFT: "swift",
  RUST: "rust",
  RUBY: "ruby",
  PHP: "php",
  DART: "dart",
  SCALA: "scala",
  ELIXIR: "elixir",
  ERLANG: "erlang",
  RACKET: "scheme",
};

/** Map from CompilerLanguage to file extension for display */
const FILE_EXT: Partial<Record<CompilerLanguage, string>> = {
  JAVA: "java",
  PYTHON: "py",
  JS: "js",
  TYPESCRIPT: "ts",
  CPP: "cpp",
  CSHARP: "cs",
  C: "c",
  GO: "go",
  KOTLIN: "kt",
  SWIFT: "swift",
  RUST: "rs",
  RUBY: "rb",
  PHP: "php",
  DART: "dart",
  SCALA: "scala",
  ELIXIR: "ex",
  ERLANG: "erl",
  RACKET: "rkt",
};

function useRemainingMs(timeLimitMinutes: number | null, startTime: string | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const lastEndRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeLimitMinutes == null || !startTime) return undefined;
    const end = new Date(startTime).getTime() + timeLimitMinutes * 60_000;
    lastEndRef.current = end;
    const tick = () => setRemainingMs(Math.max(0, (lastEndRef.current ?? end) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeLimitMinutes, startTime]);

  return remainingMs;
}

function formatRemaining(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Inline Markdown Tokenizer:
 * Handles `inline_code`, **bold**, *italic*, 10^4 (superscripts), and plain text.
 */
function FormattedInlineMarkdown({ text, className }: { text: string; className?: string }) {
  const tokens = useMemo(() => {
    if (!text) return [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\b\d+\^\d+\b)/g;
    const parts = text.split(regex);
    return parts.filter(Boolean).map((part, idx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="rounded border border-indigo-500/20 bg-indigo-50/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-slate-900 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={idx} className="text-slate-700 italic dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (/^\d+\^\d+$/.test(part)) {
        const [base, exp] = part.split("^");
        return (
          <span key={idx} className="font-mono text-xs font-medium">
            {base}
            <sup>{exp}</sup>
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }, [text]);

  return <span className={cn("leading-relaxed", className)}>{tokens}</span>;
}

/**
 * Multi-line Markdown Problem Statement formatter.
 * Handles paragraphs, lists (* or -), and code blocks.
 */
function FormattedCodingProblemStatement({ text }: { text: string }) {
  const blocks = useMemo(() => {
    if (!text) return [];
    const normalized = text.replace(/\\n/g, "\n");
    const rawParagraphs = normalized.split(/\n\n+/);
    return rawParagraphs.map((p) => p.trim()).filter(Boolean);
  }, [text]);

  if (!text) {
    return (
      <p className="text-xs text-slate-400 italic">
        Đề bài chưa được cập nhật. Vui lòng xem Ví dụ bên dưới.
      </p>
    );
  }

  return (
    <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
      {blocks.map((block, idx) => {
        const lines = block.split("\n");
        const isList = lines.length > 1 && lines.every((l) => /^[*-]\s+/.test(l.trim()));

        if (isList) {
          return (
            <ul key={idx} className="space-y-1.5 pl-2">
              {lines.map((line, lIdx) => {
                const cleaned = line.trim().replace(/^[*-]\s+/, "");
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <FormattedInlineMarkdown text={cleaned} />
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={idx} className="leading-relaxed whitespace-pre-line">
            <FormattedInlineMarkdown text={block} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * LeetCode-Grade Problem Example Card with one-click Copy
 */
function ProblemExampleCard({
  index,
  example,
}: {
  index: number;
  example: { inputs: string[]; output: string; explanation?: string };
}) {
  const [copied, setCopied] = useState(false);

  const cleanInputs = (example.inputs ?? [])
    .map((inp) => String(inp ?? "").trim())
    .filter(Boolean);
  const inputStr = cleanInputs.length > 0 ? cleanInputs.join(", ") : "(trống)";
  const outputStr =
    example.output != null && String(example.output).trim() !== ""
      ? String(example.output)
      : "(trống)";

  const handleCopy = () => {
    const textToCopy = `Input: ${inputStr}\nOutput: ${outputStr}${
      example.explanation ? `\nExplanation: ${example.explanation}` : ""
    }`;
    void navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success(`Đã sao chép Ví dụ ${index + 1}!`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950/60 dark:hover:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300">
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          Ví dụ {index + 1}:
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 opacity-80 transition-all group-hover:opacity-100 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-500">Đã copy</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="space-y-2 p-3.5 font-mono text-xs">
        <div className="flex items-start gap-2">
          <span className="w-16 shrink-0 font-bold select-none text-slate-400">Input:</span>
          <span className="flex-1 font-semibold break-all text-slate-800 dark:text-slate-200">
            {inputStr}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-16 shrink-0 font-bold select-none text-slate-400">Output:</span>
          <span className="flex-1 font-bold break-all text-emerald-600 dark:text-emerald-400">
            {outputStr}
          </span>
        </div>
        {example.explanation && (
          <div className="mt-2 flex items-start gap-2 border-t border-slate-100 pt-2 font-sans text-xs text-slate-600 dark:border-slate-800/80 dark:text-slate-400">
            <span className="w-16 shrink-0 font-bold select-none text-slate-400">Giải thích:</span>
            <span className="flex-1 leading-relaxed">
              <FormattedInlineMarkdown text={example.explanation} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CodingProblemCard({
  index,
  problem,
  source,
  availableLanguages,
  result,
  isRunning,
  isCompleted,
  isCurrent,
  finalScore,
  problemFinalScoreStatus,
  onChangeCode,
  onChangeLanguage,
  onRun,
  submitting,
  onSubmitAll,
  totalProblems,
  timeLimitMinutes,
  startTime,
  onNavigatePrev,
  onNavigateNext,
}: CodingProblemCardProps) {
  const { t } = useTranslation();
  const monacoTheme = useMonacoTheme();

  const [activeTab, setActiveTab] = useState<"description" | "results">("description");

  // Filter valid examples
  const validExamples = useMemo(() => {
    return (problem.visibleExamples ?? []).filter(
      (ex) =>
        (ex.inputs && ex.inputs.length > 0) ||
        (ex.output != null && String(ex.output).trim() !== "")
    );
  }, [problem.visibleExamples]);

  // Auto-switch to results tab when test cases are running or returned
  useEffect(() => {
    if (result || isRunning) {
      setActiveTab("results");
    }
  }, [result, isRunning]);

  // ---- Resizable split panel state ----------------------------------------
  const [leftWidthPercent, setLeftWidthPercent] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      // Clamp between 25% and 65%
      setLeftWidthPercent(Math.min(65, Math.max(25, percent)));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  // Re-usable countdown hook
  const remainingMs = useRemainingMs(timeLimitMinutes, startTime);
  const timedOut = remainingMs === 0;

  const tabs: Array<{ id: "description" | "results"; label: string; badge?: string }> = [
    { id: "description", label: t("userApplicationhistory.codingTabDesc", "Mô tả bài toán") },
    {
      id: "results",
      label: t("userApplicationhistory.codingTabResults", "Test Results"),
      badge: result ? `${result.passedTestCases}/${result.totalTestCases}` : undefined,
    },
  ];

  // Only show "Score" once the BE actually graded this round.
  const gradedStatus =
    (problemFinalScoreStatus as string) === "AI_EVALUATED" ||
    (problemFinalScoreStatus as string) === "COMPLETED";
  const showScore = gradedStatus && finalScore !== null && finalScore !== undefined;

  // Monaco language + file extension
  const monacoLang = MONACO_LANG[source.language] ?? "plaintext";
  const fileExt = FILE_EXT[source.language] ?? "txt";

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      onChangeCode(value ?? "");
    },
    [onChangeCode]
  );

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      {/* ── Top Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-[#0B1120]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
            <Code2 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                #{index + 1}
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                {problem.title}
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
                  {t(
                    `userApplicationhistory.codingDifficulty${
                      problem.difficulty?.[0] ?? ""
                    }${(problem.difficulty ?? "").slice(1).toLowerCase()}` as const,
                    problem.difficulty ?? ""
                  )}
                </span>
              )}
            </div>
            {(problem.executionTimeLimitMs || problem.memoryLimitMb) && (
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                {problem.executionTimeLimitMs != null && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {problem.executionTimeLimitMs}ms
                  </span>
                )}
                {problem.memoryLimitMb != null && (
                  <span className="flex items-center gap-1 font-mono">
                    <Cpu className="h-3 w-3 text-slate-400" />
                    {problem.memoryLimitMb}MB
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {remainingMs != null && !isCompleted && (
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

          {isCompleted ? (
            <div className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 font-mono text-xs font-bold text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Code2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>{LANGUAGE_LABEL[source.language] ?? source.language}</span>
            </div>
          ) : (
            <Select
              value={source.language}
              onValueChange={(v) => onChangeLanguage(v as CompilerLanguage)}>
              <SelectTrigger className="h-8 w-36 border-slate-200 bg-white text-xs font-semibold shadow-xs dark:border-slate-700 dark:bg-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.length === 0 && (
                  <div className="p-2 text-[11px] text-slate-500">
                    {t(
                      "userApplicationhistory.codingNoStub",
                      "Round này chưa cấu hình ngôn ngữ nào."
                    )}
                  </div>
                )}
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {LANGUAGE_LABEL[lang] ?? lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showScore && (
            <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold text-emerald-700 tabular-nums shadow-xs dark:bg-emerald-950/60 dark:text-emerald-300">
              ✓ {t("userApplicationhistory.codingScore")}: {finalScore}/100
            </span>
          )}
        </div>
      </div>

      {/* ── Resizable Split Panel Body (Description | Code Editor) ── */}
      <div ref={containerRef} className="relative flex flex-1" style={{ minHeight: "68vh" }}>
        {/* LEFT PANEL — Description / Test Results */}
        <div
          className="flex flex-col overflow-hidden border-r border-slate-200/80 bg-slate-50/30 dark:border-slate-800 dark:bg-[#030712]/40"
          style={{ width: `${leftWidthPercent}%`, minWidth: 0 }}>
          {/* Tab strip for left panel */}
          <div className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-slate-100/70 px-4 py-1.5 dark:border-slate-800 dark:bg-slate-950/80">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    isActive
                      ? "bg-white text-indigo-700 shadow-2xs dark:bg-slate-900 dark:text-indigo-300"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="py-0.2 rounded-md bg-indigo-100 px-1.5 font-mono text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content scrollable */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "description" && (
              <div className="space-y-6">
                {/* 1. Problem Statement */}
                <section>
                  <FormattedCodingProblemStatement text={problem.problemStatement} />
                </section>

                {/* 2. Examples Section */}
                {validExamples.length > 0 && (
                  <section className="space-y-3">
                    <h5 className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      {t("userApplicationhistory.codingExamples", "Ví dụ:")}
                    </h5>
                    <div className="space-y-3">
                      {validExamples.map((ex, i) => (
                        <ProblemExampleCard key={i} index={i} example={ex} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. Constraints Section */}
                {problem.rulesAndConstraints.length > 0 && (
                  <section className="space-y-2.5">
                    <h5 className="flex items-center gap-2 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {t("userApplicationhistory.codingConstraints", "Ràng buộc (Constraints):")}
                    </h5>
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-slate-950/60">
                      <ul className="space-y-2 pl-1 text-xs text-slate-700 dark:text-slate-300">
                        {problem.rulesAndConstraints.map((c, i) => {
                          const cleaned = c.replace(/^[*-]\s*/, "");
                          return (
                            <li key={i} className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 dark:bg-amber-500" />
                              <code className="rounded border border-slate-200/70 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                                <FormattedInlineMarkdown text={cleaned} />
                              </code>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === "results" && (
              <TestResultsPanel
                result={result}
                isRunning={isRunning}
                visibleExamples={problem.visibleExamples}
              />
            )}
          </div>
        </div>

        {/* ── DRAGGABLE DIVIDER ── */}
        <div
          onMouseDown={handleMouseDown}
          className="group relative z-10 flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-slate-100 transition-colors hover:bg-indigo-100 active:bg-indigo-200 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:active:bg-indigo-900/60">
          <div className="flex h-8 w-4 items-center justify-center rounded-md bg-slate-200/80 text-slate-400 shadow-sm transition-colors group-hover:bg-indigo-200 group-hover:text-indigo-600 group-active:bg-indigo-300 dark:bg-slate-700 dark:text-slate-500 dark:group-hover:bg-indigo-900 dark:group-hover:text-indigo-400">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* RIGHT PANEL — Monaco Code Editor + Actions */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - leftWidthPercent}%`, minWidth: 0 }}>
          {/* File tab ribbon */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b px-4 py-2",
              monacoTheme === "inblue-dark"
                ? "border-slate-700/60 bg-[#020617]"
                : "border-slate-200/80 bg-slate-50"
            )}>
            <div className="flex items-center gap-2">
              <FileCode2
                className={cn(
                  "h-3.5 w-3.5",
                  monacoTheme === "inblue-dark" ? "text-indigo-400" : "text-indigo-600"
                )}
              />
              <span
                className={cn(
                  "font-mono text-xs font-semibold",
                  monacoTheme === "inblue-dark" ? "text-slate-300" : "text-slate-700"
                )}>
                solution.{fileExt}
              </span>
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                monacoTheme === "inblue-dark" ? "text-slate-500" : "text-slate-400"
              )}>
              {source.code.split("\n").length} lines · {source.code.length} chars
            </span>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              key={`${problem.problemId}-${source.language}`}
              height="100%"
              language={monacoLang}
              value={source.code}
              onChange={handleEditorChange}
              beforeMount={registerInblueMonacoThemes}
              theme={monacoTheme}
              options={{
                readOnly: isCompleted || !isCurrent || timedOut,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineHeight: 22,
                lineNumbers: "on",
                folding: true,
                wordWrap: "on",
                padding: { top: 12, bottom: 12 },
                scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
                renderLineHighlight: "line",
                tabSize: 4,
                insertSpaces: true,
                automaticLayout: true,
                glyphMargin: false,
                fixedOverflowWidgets: true,
                cursorBlinking: "smooth",
                smoothScrolling: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Bottom action bar */}
          <div
            className={cn(
              "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3",
              monacoTheme === "inblue-dark"
                ? "border-slate-700/60 bg-[#020617]"
                : "border-slate-200/80 bg-slate-50"
            )}>
            {/* Left: Run sample tests */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onRun}
                disabled={isRunning || !isCurrent || isCompleted || timedOut}
                className="h-9 gap-2 border-slate-300 px-4 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-slate-700 dark:fill-slate-200" />
                )}
                <span>{t("userApplicationhistory.runSample", "Chạy Test Mẫu")}</span>
              </Button>
            </div>

            {/* Right: Compact Problem Switcher & Submit Button */}
            <div className="flex items-center gap-3">
              {totalProblems > 1 && (
                <div className="flex items-center gap-1 rounded-xl border border-slate-300/80 bg-white p-1 shadow-2xs dark:border-slate-800 dark:bg-slate-950">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={onNavigatePrev}
                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-100"
                    title="Bài trước">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="px-2 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {index + 1} / {totalProblems}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === totalProblems - 1}
                    onClick={onNavigateNext}
                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-30 dark:text-slate-400 dark:hover:text-slate-100"
                    title="Bài tiếp theo">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!isCompleted && (
                <Button
                  onClick={onSubmitAll}
                  disabled={submitting || isRunning || !isCurrent}
                  className="h-9 gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-xs font-bold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>
                    {totalProblems > 1
                      ? t("userApplicationhistory.submitAllProblems", {
                          count: totalProblems,
                          defaultValue: `Nộp bài (${totalProblems} bài)`,
                        })
                      : t("userApplicationhistory.submitSolution", "Nộp bài Solution")}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// TestResultsPanel — table PASSED/FAILED, expected vs actual output
// ============================================================================

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [text]
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-200/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      title="Sao chép">
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Đã chép</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

// ============================================================================
// TestResultsPanel — LeetCode-grade Test Result & Error Diagnostic Inspector
// ============================================================================

function TestResultsPanel({
  result,
  isRunning,
  visibleExamples = [],
}: {
  result: CompilerResponse | null;
  isRunning: boolean;
  visibleExamples?: Array<{
    inputs: string[];
    output: string;
    explanation?: string;
  }>;
}) {
  const { t } = useTranslation();
  const testCases = result?.testCases ?? [];

  // Find initial active test case (prefer first failed case, otherwise 0)
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (testCases.length > 0) {
      const firstFailIdx = testCases.findIndex(
        (tc) => tc.status && tc.status !== "PASSED" && tc.status !== "SUCCESS"
      );
      setSelectedIdx(firstFailIdx >= 0 ? firstFailIdx : 0);
    }
  }, [result]);

  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t("userApplicationhistory.runningSamples", "Đang chạy test cases...")}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hệ thống đang nạp mã nguồn vào sandbox an toàn và thực thi các bộ kiểm thử mẫu.
          </p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80">
          <Terminal className="h-6 w-6 text-slate-400" />
        </div>
        <div className="max-w-xs space-y-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t("userApplicationhistory.noTestResultYet", "Chưa có kết quả chạy thử")}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bấm nút <strong className="text-slate-700 dark:text-slate-300">"Chạy Test Mẫu"</strong> ở thanh công cụ bên dưới để kiểm tra tính đúng đắn của giải thuật.
          </p>
        </div>
      </div>
    );
  }

  // Determine overall verdict status
  const total = result.totalTestCases || testCases.length;
  const passed = result.passedTestCases ?? testCases.filter((t) => t.status === "PASSED").length;
  const allPassed = total > 0 && passed === total;
  const hasRuntimeError = testCases.some(
    (tc) => tc.status === "RUNTIME_ERROR" || tc.status === "ERROR"
  );
  const hasTimeout = testCases.some((tc) => tc.status === "TIMEOUT");
  const hasCompileError =
    result.status === "COMPILE_ERROR" ||
    (!testCases.length && Boolean(result.errorMessage));

  let verdictTitle = "Passed";
  let verdictColor = "text-emerald-600 dark:text-emerald-400";
  let verdictBg = "bg-emerald-50/80 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50";
  let VerdictIcon = CheckCircle2;

  if (hasCompileError) {
    verdictTitle = "Compile Error";
    verdictColor = "text-purple-600 dark:text-purple-400";
    verdictBg = "bg-purple-50/80 border-purple-200/80 dark:bg-purple-950/30 dark:border-purple-900/50";
    VerdictIcon = AlertTriangle;
  } else if (hasRuntimeError) {
    verdictTitle = "Runtime Error";
    verdictColor = "text-rose-600 dark:text-rose-400";
    verdictBg = "bg-rose-50/80 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50";
    VerdictIcon = AlertCircle;
  } else if (hasTimeout) {
    verdictTitle = "Time Limit Exceeded";
    verdictColor = "text-amber-600 dark:text-amber-400";
    verdictBg = "bg-amber-50/80 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50";
    VerdictIcon = Clock;
  } else if (!allPassed) {
    verdictTitle = "Wrong Answer";
    verdictColor = "text-rose-600 dark:text-rose-400";
    verdictBg = "bg-rose-50/80 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50";
    VerdictIcon = XCircle;
  } else {
    verdictTitle = "Accepted";
    verdictColor = "text-emerald-600 dark:text-emerald-400";
    verdictBg = "bg-emerald-50/80 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50";
    VerdictIcon = CheckCircle2;
  }

  const activeTestCase = testCases[selectedIdx] ?? testCases[0];
  const activeExample = visibleExamples[selectedIdx] ?? visibleExamples[0];

  // Resolve input string
  const resolvedInput =
    (activeTestCase?.input && String(activeTestCase.input).trim()) ||
    (activeExample?.inputs && activeExample.inputs.join("\n")) ||
    "";

  // Resolve expected output string
  const resolvedExpected =
    (activeTestCase?.expectedOutput != null && String(activeTestCase.expectedOutput).trim()) ||
    (activeExample?.output != null ? String(activeExample.output).trim() : "");

  // Resolve actual output string
  const resolvedActual =
    activeTestCase?.actualOutput != null ? String(activeTestCase.actualOutput) : "";

  // Resolve error message for active case
  const activeError =
    activeTestCase?.errorMessage || (testCases.length === 1 ? result.errorMessage : null);

  return (
    <div className="space-y-4">
      {/* 1. Verdict Summary Card */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 shadow-2xs",
          verdictBg
        )}>
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-2xs dark:bg-slate-900",
              verdictColor
            )}>
            <VerdictIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className={cn("text-sm font-black tracking-tight", verdictColor)}>
              {verdictTitle}
            </h3>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {total > 0 ? `${passed} / ${total} test cases passed` : "Kết quả biên dịch"}
            </p>
          </div>
        </div>

        {/* Runtime pill */}
        <div className="flex items-center gap-2">
          {result.executionTimeMs !== undefined && (
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{result.executionTimeMs} ms</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Global Compile Error Display (if applicable) */}
      {hasCompileError && result.errorMessage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Chi tiết lỗi biên dịch (Compiler Error)
            </span>
            <CopyButton text={result.errorMessage} label="Sao chép lỗi" />
          </div>
          <div className="rounded-xl border border-purple-900/40 bg-[#0a0714] p-3.5 shadow-inner">
            <pre className="font-mono text-xs leading-relaxed text-purple-200 whitespace-pre-wrap select-text">
              {result.errorMessage}
            </pre>
          </div>
        </div>
      )}

      {/* 3. Case Selector Tabs (LeetCode style) */}
      {testCases.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {testCases.map((tc, idx) => {
              const isSelected = selectedIdx === idx;
              const isCasePassed = tc.status === "PASSED" || tc.status === "SUCCESS";
              const isCaseRuntimeError = tc.status === "RUNTIME_ERROR" || tc.status === "ERROR";
              const isCaseTimeout = tc.status === "TIMEOUT";

              let dotColor = "bg-rose-500";
              if (isCasePassed) dotColor = "bg-emerald-500";
              else if (isCaseTimeout) dotColor = "bg-amber-500";
              else if (isCaseRuntimeError) dotColor = "bg-rose-500";

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    isSelected
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300 dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}>
                  <span className={cn("h-2 w-2 rounded-full", dotColor)} />
                  <span>Case {idx + 1}</span>
                  {tc.executionTimeMs !== undefined && tc.executionTimeMs > 0 && (
                    <span className="font-mono text-[10px] font-normal text-slate-400">
                      {tc.executionTimeMs}ms
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 4. Active Case Inspector Detail Card */}
          {activeTestCase && (
            <div className="space-y-3.5 rounded-xl border border-slate-200/90 bg-white/70 p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-950/70">
              {/* Case Verdict Header */}
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    Testcase #{selectedIdx + 1}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                      statusBadgeClass(activeTestCase.status)
                    )}>
                    {activeTestCase.status || "UNKNOWN"}
                  </span>
                </div>
                {activeTestCase.executionTimeMs !== undefined && (
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    Thời gian: <strong>{activeTestCase.executionTimeMs} ms</strong>
                  </span>
                )}
              </div>

              {/* Specific Error / Stacktrace Box for THIS Testcase */}
              {activeError && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <Bug className="h-3.5 w-3.5" />
                      Lỗi thực thi (Runtime Error của Testcase #{selectedIdx + 1})
                    </span>
                    <CopyButton text={activeError} label="Sao chép log" />
                  </div>
                  <div className="overflow-hidden rounded-xl border border-rose-900/50 bg-[#0c0910] p-3.5 shadow-inner">
                    <pre className="font-mono text-[11px] leading-relaxed text-rose-300 whitespace-pre-wrap select-text">
                      {activeError}
                    </pre>
                  </div>
                </div>
              )}

              {/* Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Input
                  </span>
                  {resolvedInput && <CopyButton text={resolvedInput} />}
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-slate-100/70 p-3 font-mono text-xs font-semibold text-slate-800 select-all dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
                  {resolvedInput || (
                    <span className="italic text-slate-400">(Không có dữ liệu đầu vào)</span>
                  )}
                </div>
              </div>

              {/* Expected Output Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Expected Output
                  </span>
                  {resolvedExpected && <CopyButton text={resolvedExpected} />}
                </div>
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-3 font-mono text-xs font-semibold text-emerald-800 select-all dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
                  {resolvedExpected || (
                    <span className="italic text-slate-400">(Không xác định)</span>
                  )}
                </div>
              </div>

              {/* Actual Output Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    Your Output
                  </span>
                  {resolvedActual && <CopyButton text={resolvedActual} />}
                </div>
                <div
                  className={cn(
                    "rounded-lg border p-3 font-mono text-xs font-semibold select-all",
                    activeTestCase.status === "PASSED"
                      ? "border-emerald-200/80 bg-emerald-50/40 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : "border-slate-200/80 bg-slate-100/70 text-slate-800 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
                  )}>
                  {resolvedActual ? (
                    resolvedActual
                  ) : activeError ? (
                    <span className="italic text-rose-500/80 dark:text-rose-400/80">
                      (Không có kết quả trả về do phát sinh ngoại lệ / lỗi thực thi)
                    </span>
                  ) : (
                    <span className="italic text-slate-400">(Trống)</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
