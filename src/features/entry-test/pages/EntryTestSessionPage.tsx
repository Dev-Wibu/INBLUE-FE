import Editor from "@monaco-editor/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  FileQuestion,
  Loader2,
  Play,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonacoTheme } from "@/hooks/useMonacoTheme";
import { normalizeApiError } from "@/lib/error-normalizer";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

import { entryTestManager } from "../api/entry-test.manager";
import { CodingRunResult } from "../components/CodingRunResult";
import { SubmitConfirmDialog } from "../components/SubmitConfirmDialog";
import {
  useEntryTestResult,
  useRunEntryTestCode,
  useSubmitEntryTest,
} from "../hooks/useEntryTestAttempt";
import { useEntryTestDraft } from "../hooks/useEntryTestDraft";
import { formatRemainingTime, useEntryTestTimer } from "../hooks/useEntryTestTimer";
import type {
  CompilerLanguage,
  EntryTestCodingItem,
  EntryTestQuestion,
  EntryTestSectionType,
} from "../types/entry-test.types";
import {
  buildSubmitPayload,
  editorTextToSourceLines,
  sourceLinesToEditorText,
} from "../utils/entry-test-payload";
import { clearEntryTestDraft } from "../utils/entry-test-storage";

type RunnerItem =
  | { kind: "quiz"; section: EntryTestSectionType; data: EntryTestQuestion }
  | { kind: "coding"; section: "SPECIFIC_CODING"; data: EntryTestCodingItem };

const sectionLabels: Record<EntryTestSectionType, string> = {
  COMMON_QUIZ: "Kiến thức chung",
  SPECIFIC_QUIZ: "Kiến thức chuyên môn",
  SPECIFIC_CODING: "Lập trình",
};

export function EntryTestSessionPage() {
  const navigate = useNavigate();
  const params = useParams();
  const attemptId = Number(params.id);
  const userId = Number(useAuthStore((state) => state.user?.id));
  const monacoTheme = useMonacoTheme();
  const { draft, setDraft, latestDraftRef } = useEntryTestDraft(userId, attemptId);
  const remoteAttempt = useEntryTestResult(attemptId, !draft && Number.isSafeInteger(attemptId));
  const runCode = useRunEntryTestCode(attemptId);
  const submit = useSubmitEntryTest(attemptId);
  const submitLock = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [expired, setExpired] = useState(false);
  const [runResult, setRunResult] = useState<Awaited<
    ReturnType<typeof entryTestManager.runCode>
  > | null>(null);

  const items = useMemo<RunnerItem[]>(() => {
    if (!draft) return [];
    const test = draft.testSnapshot;
    const sections = [...test.sectionConfigs].sort((a, b) => a.displayOrder - b.displayOrder);
    return sections.reduce<RunnerItem[]>((result, section) => {
      if (section.sectionType === "COMMON_QUIZ") {
        result.push(
          ...[...test.commonQuizItemsJson]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((data): RunnerItem => ({ kind: "quiz", section: section.sectionType, data }))
        );
      } else if (section.sectionType === "SPECIFIC_QUIZ") {
        result.push(
          ...[...test.specificQuizItemsJson]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((data): RunnerItem => ({ kind: "quiz", section: section.sectionType, data }))
        );
      } else {
        result.push(
          ...[...test.specificCodingItemsJson]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((data): RunnerItem => ({ kind: "coding", section: "SPECIFIC_CODING", data }))
        );
      }
      return result;
    }, []);
  }, [draft]);

  useEffect(() => {
    if (!draft?.currentItemId) return;
    const index = items.findIndex((item) => item.data.itemId === draft.currentItemId);
    if (index >= 0) setCurrentIndex(index);
  }, [draft?.currentItemId, items]);

  useEffect(() => {
    if (remoteAttempt.data?.status === "GRADED")
      navigate(`/user/entry-test/result/${attemptId}`, { replace: true });
  }, [attemptId, navigate, remoteAttempt.data?.status]);

  const questionItems = items
    .filter((item): item is Extract<RunnerItem, { kind: "quiz" }> => item.kind === "quiz")
    .map((item) => item.data);
  const codingItems = items
    .filter((item): item is Extract<RunnerItem, { kind: "coding" }> => item.kind === "coding")
    .map((item) => item.data);
  const answeredCount = draft
    ? Object.keys(draft.quizDrafts).length +
      Object.values(draft.codingDrafts).filter((value) =>
        value.sourceCode.some((line) => line.trim())
      ).length
    : 0;
  const unanswered = Math.max(0, items.length - answeredCount);

  const performSubmit = useCallback(async () => {
    const latest = latestDraftRef.current;
    if (!latest || submitLock.current) return;
    submitLock.current = true;
    try {
      const result = await submit.mutateAsync(
        buildSubmitPayload(questionItems, codingItems, latest.quizDrafts, latest.codingDrafts)
      );
      clearEntryTestDraft(userId, attemptId);
      navigate(`/user/entry-test/result/${result.id}`, { replace: true });
    } catch (error) {
      try {
        const verified = await entryTestManager.getResult(attemptId);
        if (verified.status === "GRADED") {
          clearEntryTestDraft(userId, attemptId);
          navigate(`/user/entry-test/result/${attemptId}`, { replace: true });
          return;
        }
      } catch {
        /* Keep the local draft until result verification is possible. */
      }
      const normalized = normalizeApiError(
        error,
        "Chưa thể xác nhận trạng thái nộp bài. Bản nháp vẫn được giữ lại."
      );
      toast.error(normalized.message);
      submitLock.current = false;
      setExpired(false);
    }
  }, [attemptId, codingItems, latestDraftRef, navigate, questionItems, submit, userId]);

  const onExpire = useCallback(() => {
    setExpired(true);
    setSubmitOpen(true);
    void performSubmit();
  }, [performSubmit]);
  const remainingMs = useEntryTestTimer(
    draft?.deadlineEpochMs ?? Number.MAX_SAFE_INTEGER,
    onExpire
  );

  if (!Number.isSafeInteger(attemptId) || !Number.isSafeInteger(userId))
    return (
      <RecoveryMessage
        title="Phiên làm bài không hợp lệ"
        description="Không thể xác định người dùng hoặc mã bài làm."
        onBack={() => navigate("/user/entry-test")}
      />
    );
  if (!draft && remoteAttempt.isLoading)
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-14" />
        <Skeleton className="h-[520px]" />
      </div>
    );
  if (!draft)
    return (
      <RecoveryMessage
        title="Không tìm thấy bản nháp trên thiết bị này"
        description={
          remoteAttempt.data?.status === "IN_PROGRESS"
            ? "Backend xác nhận bài vẫn đang làm, nhưng API hiện chưa cung cấp đủ thời lượng để khôi phục đồng hồ an toàn. Hãy quay lại trên trình duyệt đã bắt đầu bài."
            : "Bài làm đã hết hạn hoặc không thuộc tài khoản hiện tại."
        }
        onBack={() => navigate("/user/entry-test")}
      />
    );
  if (items.length === 0)
    return (
      <RecoveryMessage
        title="Đề thi chưa có nội dung"
        description="Cấu hình Entry Test không trả về câu hỏi nào. Bản nháp chưa bị xóa."
        onBack={() => navigate("/user/entry-test")}
      />
    );

  const current = items[Math.min(currentIndex, items.length - 1)];
  const isUrgent = remainingMs <= 5 * 60_000;
  const setCurrent = (index: number) => {
    const target = items[index];
    setCurrentIndex(index);
    setRunResult(null);
    setDraft((value) =>
      value
        ? {
            ...value,
            currentItemId: target.data.itemId,
            currentSection: target.section,
            savedAt: new Date().toISOString(),
          }
        : value
    );
  };

  return (
    <div className="flex h-screen min-h-[680px] flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <p className="text-xs font-medium text-slate-500">ENTRY TEST · BÀI #{attemptId}</p>
          <h1 className="text-base font-bold">Đánh giá năng lực đầu vào</h1>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-3 font-mono text-sm font-bold",
              isUrgent
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            )}>
            <Clock3 className="h-4 w-4" />
            {formatRemainingTime(remainingMs)}
          </div>
          <Button onClick={() => setSubmitOpen(true)} disabled={submit.isPending}>
            <Send className="h-4 w-4" /> Nộp bài
          </Button>
        </div>
      </header>
      <Progress
        value={(answeredCount / items.length) * 100}
        className="h-1 shrink-0 rounded-none"
      />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 md:block dark:border-slate-800 dark:bg-slate-900">
          {Array.from(new Set(items.map((item) => item.section))).map((section) => (
            <div key={section} className="mb-5">
              <p className="mb-2 px-2 text-[11px] font-bold text-slate-500">
                {sectionLabels[section]}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {items.map((item, index) =>
                  item.section === section ? (
                    <button
                      key={item.data.itemId}
                      type="button"
                      onClick={() => setCurrent(index)}
                      aria-label={`Mở mục ${index + 1}`}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-md border text-xs font-semibold",
                        index === currentIndex
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : draft.quizDrafts[item.data.itemId] ||
                              draft.codingDrafts[item.data.itemId]?.sourceCode.some((line) =>
                                line.trim()
                              )
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                            : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"
                      )}>
                      {(draft.quizDrafts[item.data.itemId] ||
                        draft.codingDrafts[item.data.itemId]?.sourceCode.some((line) =>
                          line.trim()
                        )) &&
                      index !== currentIndex ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </button>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          {current.kind === "quiz" ? (
            <QuizPanel
              question={current.data}
              value={draft.quizDrafts[current.data.itemId]}
              onChange={(selectedOption) =>
                setDraft((value) =>
                  value
                    ? {
                        ...value,
                        quizDrafts: { ...value.quizDrafts, [current.data.itemId]: selectedOption },
                        savedAt: new Date().toISOString(),
                      }
                    : value
                )
              }
            />
          ) : (
            <CodingPanel
              item={current.data}
              draft={draft.codingDrafts[current.data.itemId]}
              monacoTheme={monacoTheme}
              runPending={runCode.isPending}
              runResult={runResult}
              onDraftChange={(next) =>
                setDraft((value) =>
                  value
                    ? {
                        ...value,
                        codingDrafts: { ...value.codingDrafts, [current.data.itemId]: next },
                        savedAt: new Date().toISOString(),
                      }
                    : value
                )
              }
              onRun={async (language, sourceCode) => {
                try {
                  setRunResult(
                    await runCode.mutateAsync({ itemId: current.data.itemId, language, sourceCode })
                  );
                } catch (error) {
                  const normalized = normalizeApiError(error, "Không thể chạy code lúc này.");
                  toast.error(
                    (error as { status?: number }).status === 502
                      ? "Sandbox đang tạm gián đoạn. Mã nguồn của bạn vẫn được giữ nguyên."
                      : normalized.message
                  );
                }
              }}
            />
          )}
        </main>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 py-3 md:px-6 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-xs text-slate-500">
          Đã trả lời {answeredCount}/{items.length} mục
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrent(currentIndex - 1)}
            disabled={currentIndex === 0}>
            <ArrowLeft className="h-4 w-4" /> Trước
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrent(currentIndex + 1)}
            disabled={currentIndex === items.length - 1}>
            Tiếp <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>
      <SubmitConfirmDialog
        open={submitOpen}
        unanswered={unanswered}
        pending={submit.isPending}
        expired={expired}
        onOpenChange={setSubmitOpen}
        onConfirm={() => void performSubmit()}
      />
    </div>
  );
}

function QuizPanel({
  question,
  value,
  onChange,
}: {
  question: EntryTestQuestion;
  value?: string;
  onChange: (_value: string) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl p-5 md:p-8">
      <div className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-500">
        <FileQuestion className="h-4 w-4" />
        <span>{question.categoryName ?? "Câu hỏi"}</span>
        <span>·</span>
        <span>{question.maxScore} điểm</span>
      </div>
      <h2 className="text-lg leading-7 font-semibold text-slate-950 md:text-xl dark:text-white">
        {question.questionText}
      </h2>
      <div className="mt-6 space-y-2.5">
        {question.options.map((option, index) => {
          const key = String.fromCharCode(65 + index);
          const label = option.replace(new RegExp(`^${key}\\.\\s*`, "i"), "");
          return (
            <button
              key={`${question.itemId}-${key}`}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border bg-white p-4 text-left transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:bg-slate-900",
                value === key
                  ? "border-indigo-500 ring-1 ring-indigo-500"
                  : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"
              )}>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  value === key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                )}>
                {key}
              </span>
              <span className="pt-1 text-sm leading-5">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CodingPanel({
  item,
  draft,
  monacoTheme,
  runPending,
  runResult,
  onDraftChange,
  onRun,
}: {
  item: EntryTestCodingItem;
  draft?: { language: CompilerLanguage; sourceCode: string[] };
  monacoTheme: string;
  runPending: boolean;
  runResult: Awaited<ReturnType<typeof entryTestManager.runCode>> | null;
  onDraftChange: (_value: { language: CompilerLanguage; sourceCode: string[] }) => void;
  onRun: (_language: CompilerLanguage, _sourceCode: string[]) => void;
}) {
  const languages = Object.keys(item.codeStubs) as CompilerLanguage[];
  const language = draft?.language ?? languages[0] ?? "JAVA";
  const sourceCode = draft?.sourceCode ?? editorTextToSourceLines(item.codeStubs[language] ?? "");
  const selectLanguage = (next: CompilerLanguage) =>
    onDraftChange({
      language: next,
      sourceCode:
        draft?.language === next ? sourceCode : editorTextToSourceLines(item.codeStubs[next] ?? ""),
    });
  return (
    <div className="flex min-h-full flex-col lg:grid lg:grid-cols-[minmax(300px,0.8fr)_minmax(440px,1.2fr)]">
      <section className="overflow-y-auto border-b border-slate-200 bg-white p-5 lg:border-r lg:border-b-0 lg:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{item.title}</h2>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {item.difficulty}
          </span>
        </div>
        <p className="mt-5 text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {item.problemStatement}
        </p>
        {item.rulesAndConstraints.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Ràng buộc</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              {item.rulesAndConstraints.map((rule) => (
                <li key={rule}>• {rule}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Ví dụ hiển thị</h3>
          <div className="mt-2 space-y-3">
            {item.visibleExamples.map((example, index) => (
              <div
                key={index}
                className="rounded-lg bg-slate-100 p-3 font-mono text-xs dark:bg-slate-950">
                <p>
                  <span className="text-slate-500">Input:</span> {example.inputs.join(", ")}
                </p>
                <p className="mt-1">
                  <span className="text-slate-500">Output:</span> {example.output}
                </p>
                {example.explanation && (
                  <p className="mt-2 font-sans text-slate-500">{example.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex min-h-[520px] min-w-0 flex-col bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
          <Select
            value={language}
            onValueChange={(value) => selectLanguage(value as CompilerLanguage)}>
            <SelectTrigger className="h-8 w-40 border-slate-700 bg-slate-900 text-xs text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onRun(language, sourceCode)}
            disabled={runPending || !sourceCode.some((line) => line.trim())}>
            {runPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}{" "}
            Chạy thử
          </Button>
        </div>
        <div className="min-h-[360px] flex-1">
          <Editor
            height="100%"
            language={toMonacoLanguage(language)}
            theme={monacoTheme}
            value={sourceLinesToEditorText(sourceCode)}
            onChange={(value) =>
              onDraftChange({ language, sourceCode: editorTextToSourceLines(value ?? "") })
            }
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbersMinChars: 3,
              padding: { top: 14 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
        {runResult && <CodingRunResult result={runResult} />}
      </section>
    </div>
  );
}

function RecoveryMessage({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        <Button className="mt-5" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Quay lại Entry Test
        </Button>
      </div>
    </div>
  );
}

function toMonacoLanguage(language: CompilerLanguage) {
  const map: Partial<Record<CompilerLanguage, string>> = {
    JS: "javascript",
    TYPESCRIPT: "typescript",
    CPP: "cpp",
    CSHARP: "csharp",
    PYTHON: "python",
    JAVA: "java",
    GO: "go",
    C: "c",
    KOTLIN: "kotlin",
    RUST: "rust",
    RUBY: "ruby",
    PHP: "php",
    DART: "dart",
    SCALA: "scala",
    SWIFT: "swift",
  };
  return map[language] ?? language.toLowerCase();
}
