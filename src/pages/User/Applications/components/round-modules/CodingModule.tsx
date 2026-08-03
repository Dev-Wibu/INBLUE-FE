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
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  FileCode2,
  FileWarning,
  GripVertical,
  Loader2,
  Play,
  Send,
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

function statusIcon(status: string | undefined) {
  switch (status) {
    case "PASSED":
      return Check;
    case "FAILED":
      return XCircle;
    case "TIMEOUT":
      return Clock;
    case "RUNTIME_ERROR":
      return AlertCircle;
    case "COMPILE_ERROR":
      return AlertTriangle;
    default:
      return FileWarning;
  }
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
  const [sampleResults, setSampleResults] = useState<SampleResults>({});

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
      });
    }
    return { totalLines, totalChars, problemsList };
  }, [problems, sources]);

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

  const isFinished = isCompleted || detail?.finalScore != null;
  const activeProblem = problems[currentProblemIdx];

  return (
    <div className="space-y-4">
      {/* ── TOP SUB-HEADER (Single Standalone Header Standard) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-400 uppercase">
                VÒNG {round.roundOrder ?? 4}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-slate-400">TRẠM THI LẬP TRÌNH</span>
            </div>
            <h1 className="text-base font-bold text-slate-100">
              {round.name || "Bài thi Lập trình (Coding Assessment)"}
            </h1>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 font-mono text-xs font-extrabold text-emerald-300">
              ✓ ĐÃ HOÀN THÀNH
            </span>
          ) : (
            <span className="flex animate-pulse items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/20 px-3 py-1 font-mono text-xs font-bold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              ĐANG TRONG THỜI GIAN LÀM BÀI
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
              isCompleted={isCompleted}
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

      {/* Confirm-submit modal — replaces the ugly window.confirm() with a
          shadcn Dialog that also shows a live snapshot of what we're about
          to send. */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          // Block accidental close while the BE is still receiving the
          // submission, but allow Cancel while the modal is just open.
          if (submitting) return;
          setConfirmOpen(next);
        }}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="flex items-start gap-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-5 dark:border-slate-700 dark:from-indigo-950/40 dark:to-violet-950/40">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
              <Send className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-base">
                {t("userApplicationhistory.confirmSubmitTitle", "Xác nhận nộp bài")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                {t(
                  "userApplicationhistory.confirmSubmitCoding",
                  "Bạn chắc chắn muốn nộp tất cả bài? Sau khi nộp, hệ thống sẽ chấm và bạn vẫn có thể làm lại vòng này."
                )}
              </DialogDescription>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Bài
                </div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums dark:text-white">
                  {problems.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Lines
                </div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums dark:text-white">
                  {submissionStats.totalLines}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Chars
                </div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums dark:text-white">
                  {submissionStats.totalChars}
                </div>
              </div>
            </div>

            {/* Per-problem table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">#</th>
                    <th className="px-3 py-2 text-left font-bold">
                      {t("userApplicationhistory.codingProblem")}
                    </th>
                    <th className="px-3 py-2 text-left font-bold">
                      {t("userApplicationhistory.codingLanguage")}
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      {t("userApplicationhistory.codingLines")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissionStats.problemsList.map((p, i) => (
                    <tr
                      key={p.problemId}
                      className="border-t border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{i + 1}</td>
                      <td className="max-w-[180px] truncate px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                        {p.title}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-indigo-700 dark:text-indigo-300">
                        {p.language}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-700 tabular-nums dark:text-slate-300">
                        {p.lines}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Warning banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">
                {t(
                  "userApplicationhistory.confirmSubmitHint",
                  "Sau khi nộp bài, hệ thống sẽ gửi code của bạn sang sandbox để chấm các test ẩn. Quá trình này có thể mất 1–3 phút."
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
              className="gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 text-white shadow-sm hover:from-indigo-700 hover:to-violet-700">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("compUi.uploading", "Đang nộp...")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("common.submit", "Nộp bài")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Final result summary (after grading). */}
      {detail &&
        (detail.finalScore !== undefined ||
          detail.aiScore !== undefined ||
          (detail as { finalResult?: string }).finalResult !== undefined ||
          (detail as { hrNote?: string }).hrNote) && (
          <Card className="space-y-3 border border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/40 p-6 shadow-xs dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900/40 dark:to-sky-950/20">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                <Code2 className="h-4 w-4 text-emerald-500" />
                {t("userApplicationhistory.codingResultTitle", "Kết quả chấm bài")}
              </h3>
              <div className="flex items-center gap-3 text-[11px]">
                {(detail.finalScore ?? detail.aiScore) !== undefined && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 font-extrabold text-emerald-700 tabular-nums dark:bg-emerald-950/60 dark:text-emerald-300">
                    ✓ {detail.finalScore ?? detail.aiScore ?? 0}/100
                  </span>
                )}
                {(detail as { finalResult?: string }).finalResult && (
                  <span
                    className={`rounded-full px-3 py-1 font-extrabold tracking-wider uppercase ${
                      (detail as { finalResult?: string }).finalResult === "PASSED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}>
                    {(detail as { finalResult?: string }).finalResult}
                  </span>
                )}
              </div>
            </div>

            {(detail as { hrNote?: string | null }).hrNote && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                <h4 className="mb-1 text-[10px] font-extrabold tracking-wider text-sky-700 uppercase dark:text-sky-300">
                  {t("userApplicationhistory.codingHrNote", "Ghi chú từ HR")}
                </h4>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {(detail as { hrNote?: string | null }).hrNote}
                </p>
              </div>
            )}
          </Card>
        )}
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
          {remainingMs != null && (
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

            {activeTab === "results" && <TestResultsPanel result={result} isRunning={isRunning} />}
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

function TestResultsPanel({
  result,
  isRunning,
}: {
  result: CompilerResponse | null;
  isRunning: boolean;
}) {
  const { t } = useTranslation();
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("userApplicationhistory.runningSamples", "Đang chạy test cases...")}
      </div>
    );
  }
  if (!result) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-slate-500">
        <Terminal className="h-4 w-4" />
        {t(
          "userApplicationhistory.noTestResultYet",
          'Chưa có kết quả chạy thử. Bấm "Chạy Test Mẫu" để bắt đầu.'
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold tracking-wide text-slate-500 uppercase">
          {t("userApplicationhistory.codingSampleResults", "Sample Test Results")}
        </span>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {result.passedTestCases}/{result.totalTestCases}{" "}
          {t("userApplicationhistory.codingPassed", "passed")} · {result.executionTimeMs}ms
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th className="w-8 px-2 py-1.5 text-left font-bold">#</th>
              <th className="px-2 py-1.5 text-left font-bold">Input</th>
              <th className="px-2 py-1.5 text-left font-bold">Expected</th>
              <th className="px-2 py-1.5 text-left font-bold">Actual</th>
              <th className="px-2 py-1.5 text-left font-bold">Status</th>
              <th className="px-2 py-1.5 text-left font-bold">Time</th>
            </tr>
          </thead>
          <tbody>
            {(result.testCases ?? []).map((tc, i) => {
              const Icon = statusIcon(tc.status);
              return (
                <tr
                  key={`tc-${tc.index ?? i}`}
                  className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">
                    {(tc.index ?? 0) + 1}
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                    {tc.input}
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {tc.expectedOutput}
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {tc.actualOutput}
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold",
                        statusBadgeClass(tc.status)
                      )}>
                      <Icon className="h-3 w-3" />
                      {tc.status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[11px] text-slate-500">
                    {tc.executionTimeMs}ms
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(result.errorMessage ?? (result.testCases ?? []).some((tc) => tc.errorMessage)) && (
        <details className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <summary className="flex cursor-pointer items-center gap-1 font-bold">
            <AlertTriangle className="h-3 w-3" />
            {t("userApplicationhistory.codingErrorDetail", "Chi tiết lỗi")}
          </summary>
          <pre className="mt-2 text-[11px] whitespace-pre-wrap">
            {result.errorMessage ??
              (result.testCases ?? [])
                .filter((tc) => tc.errorMessage)
                .map((tc, i) => `#${(tc.index ?? i) + 1}: ${tc.errorMessage}`)
                .join("\n")}
          </pre>
        </details>
      )}
    </div>
  );
}

// ============================================================================
// SubmissionHistoryPanel removed — sample-run history is implicit in the
// "Test Results" tab and adds noise to a single-problem workspace.
// ============================================================================
