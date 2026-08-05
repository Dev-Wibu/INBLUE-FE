import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useQuizConfig,
  useQuizResult,
  useSubmitQuiz,
  type QuizQuestion,
} from "@/hooks/useApplicationQuiz";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Flag,
  HelpCircle,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface QuizModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdId?: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

/** Executive VS Code Dark Theme Code Block with Syntax Tokenizer & Copy Button */
function CodeBlockView({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Đã sao chép mã nguồn!");
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizedLang = (lang || "code").toLowerCase();

  const langBadgeStyle =
    normalizedLang === "java" || normalizedLang === "cpp"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : normalizedLang === "php"
        ? "border-purple-500/30 bg-purple-500/10 text-purple-300"
        : normalizedLang === "js" ||
            normalizedLang === "javascript" ||
            normalizedLang === "ts" ||
            normalizedLang === "typescript"
          ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
          : normalizedLang === "python"
            ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
            : normalizedLang === "sql"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";

  const lines = code.split("\n");

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-indigo-500/40 bg-[#030712] shadow-2xl ring-1 ring-indigo-500/20">
      {/* IDE Code Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-xs dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          {/* Mac window dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span
            className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase ${langBadgeStyle}`}>
            {lang || "code"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Sao chép code</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax Highlighted Lines Table */}
      <div className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
        <div className="table w-full">
          {lines.map((line, lineIdx) => {
            const tokenRegex =
              /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*|@[A-Za-z0-9_]+|\b(?:public|private|protected|class|interface|enum|static|final|void|int|double|float|long|boolean|char|String|byte|short|return|if|else|for|while|do|switch|case|break|continue|new|this|super|import|package|try|catch|finally|throw|throws|const|let|var|function|async|await|select|from|where|join|insert|update|delete|group|by|order|having)\b|\b\d+\b|[{}()[\]]|[;=.+*/,<>])/g;

            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = tokenRegex.exec(line)) !== null) {
              if (match.index > lastIndex) {
                parts.push(line.substring(lastIndex, match.index));
              }

              const token = match[0];

              if (token.startsWith('"') || token.startsWith("'")) {
                parts.push(
                  <span key={match.index} className="font-medium text-emerald-300">
                    {token}
                  </span>
                );
              } else if (token.startsWith("@")) {
                parts.push(
                  <span key={match.index} className="font-bold text-amber-400">
                    {token}
                  </span>
                );
              } else if (token.startsWith("//")) {
                parts.push(
                  <span key={match.index} className="text-slate-500 italic">
                    {token}
                  </span>
                );
              } else if (/^[{}()[\]]$/.test(token)) {
                parts.push(
                  <span key={match.index} className="font-extrabold text-amber-300">
                    {token}
                  </span>
                );
              } else if (/^[;=.+*/,<>]$/.test(token)) {
                parts.push(
                  <span key={match.index} className="font-bold text-slate-300">
                    {token}
                  </span>
                );
              } else if (/^\d+$/.test(token)) {
                parts.push(
                  <span key={match.index} className="font-bold text-cyan-300">
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
                  <span key={match.index} className="font-bold text-sky-300">
                    {token}
                  </span>
                );
              } else {
                parts.push(
                  <span key={match.index} className="font-bold text-purple-400">
                    {token}
                  </span>
                );
              }

              lastIndex = tokenRegex.lastIndex;
            }

            if (lastIndex < line.length) {
              parts.push(line.substring(lastIndex));
            }

            return (
              <div key={lineIdx} className="table-row">
                <span className="table-cell border-r border-slate-800/60 pr-4 text-right font-mono text-[11px] text-slate-600 select-none">
                  {lineIdx + 1}
                </span>
                <span className="table-cell pl-4 font-mono text-xs whitespace-pre text-slate-200">
                  {parts.length > 0 ? parts : " "}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Helper component to parse and format question text containing markdown code blocks (```lang ... ```) */
function FormattedQuestionText({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => {
    if (!text) return [];
    const raw = text.replace(/\\n/g, "\n");
    const parts = raw.split(/(```[\s\S]*?```)/g);

    const result: { type: "text" | "code"; lang?: string; content: string }[] = [];

    parts.forEach((part) => {
      if (!part) return;
      if (part.startsWith("```") && part.endsWith("```")) {
        const firstNewline = part.indexOf("\n");
        let lang = "code";
        let code = "";
        if (firstNewline !== -1) {
          lang = part.slice(3, firstNewline).trim() || "code";
          code = part.slice(firstNewline + 1, -3);
        } else {
          code = part.slice(3, -3);
        }
        if (code.endsWith("\n")) {
          code = code.slice(0, -1);
        }
        result.push({ type: "code", lang, content: code });
      } else {
        result.push({ type: "text", content: part });
      }
    });

    return result;
  }, [text]);

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, idx) => {
        if (block.type === "code") {
          return <CodeBlockView key={idx} code={block.content} lang={block.lang} />;
        }

        return (
          <p key={idx} className="leading-relaxed font-normal whitespace-pre-line">
            {block.content}
          </p>
        );
      })}
    </div>
  );
}

/** Modern Circular Gauge Clock Component */
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
  const displayScore = hasData ? Math.min(100, Math.max(0, score)) : 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const styles =
    color === "emerald"
      ? {
          text: "text-emerald-400",
          bg: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20",
          stroke: "#10b981",
        }
      : {
          text: "text-indigo-400",
          bg: "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-950/20",
          stroke: "#6366f1",
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
              stroke={styles.stroke}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-xl font-black ${styles.text}`}>
            {hasData ? `${Math.round(displayScore)}` : "--"}
          </span>
          <span className="text-[10px] font-bold text-slate-400">/ 100</span>
        </div>
      </div>
      <span className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
    </div>
  );
}

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    questionText: "Trong JavaScript/TypeScript, sự khác biệt chính giữa `let` và `var` là gì?",
    options: [
      "A. `var` có scope phạm vi block, còn `let` có scope phạm vi function",
      "B. `let` có scope phạm vi block, còn `var` có scope phạm vi function/global và bị hoisting",
      "C. `let` không thể gán lại giá trị, còn `var` thì có thể",
      "D. Cả hai hoàn toàn giống nhau về mọi mặt",
    ],
    correctAnswer:
      "B. `let` có scope phạm vi block, còn `var` có scope phạm vi function/global và bị hoisting",
  },
  {
    questionText: "Mục đích chính của chỉ số `Index` trong cơ sở dữ liệu quan hệ (RDBMS) là gì?",
    options: [
      "A. Giúp mã hóa dữ liệu an toàn hơn",
      "B. Tăng tốc độ truy vấn tìm kiếm dữ liệu (SELECT) bằng cách đánh chỉ mục",
      "C. Tự động kiểm tra cú pháp của câu lệnh SQL",
      "D. Giảm bớt dung lượng lưu trữ trên đĩa cứng",
    ],
    correctAnswer: "B. Tăng tốc độ truy vấn tìm kiếm dữ liệu (SELECT) bằng cách đánh chỉ mục",
  },
  {
    questionText:
      "Trong kiến trúc RESTful API, HTTP Method nào được định nghĩa là `Idempotent` (Đồng năng)?",
    options: [
      "A. POST",
      "B. GET, PUT, DELETE",
      "C. CHỈ CÓ POST VÀ PATCH",
      "D. Không có method nào là idempotent",
    ],
    correctAnswer: "B. GET, PUT, DELETE",
  },
  {
    questionText: "Khái niệm `Closure` trong JavaScript được hiểu như thế nào?",
    options: [
      "A. Là một hàm có khả năng truy cập các biến ở phạm vi bên ngoài (outer scope) ngay cả khi hàm bên ngoài đã thực thi xong",
      "B. Là kỹ thuật tự động đóng kết nối Database sau khi query",
      "C. Là một khối lệnh try/catch để bắt lỗi bất đồng bộ",
      "D. Là một hàm không có tham số đầu vào",
    ],
    correctAnswer:
      "A. Là một hàm có khả năng truy cập các biến ở phạm vi bên ngoài (outer scope) ngay cả khi hàm bên ngoài đã thực thi xong",
  },
  {
    questionText: "Trong React, mục đích sử dụng của `useCallback` Hook là gì?",
    options: [
      "A. Thay thế hoàn toàn cho useState",
      "B. Lưu trữ giá trị hàm (memoize callback) giúp tránh tạo lại instance hàm không cần thiết giữa các lần re-render khi truyền xuống component con",
      "C. Tự động chuyển đổi dữ liệu thành dạng JSON",
      "D. Quản lý các sự kiện click trên thẻ HTML",
    ],
    correctAnswer:
      "B. Lưu trữ giá trị hàm (memoize callback) giúp tránh tạo lại instance hàm không cần thiết giữa các lần re-render khi truyền xuống component con",
  },
];

export function QuizModule({
  round,
  detail,
  applicationId,
  jdId,
  isCompleted,
  isCurrent,
  onSuccess,
}: QuizModuleProps) {
  const { t } = useTranslation();

  // Fetch quiz questions from JD configuration if available
  const { data: quizConfig } = useQuizConfig(jdId ?? 0, round.id ?? 0);

  // Resolved list of questions
  const questions: QuizQuestion[] = useMemo(() => {
    if (quizConfig?.questions && quizConfig.questions.length > 0) {
      return quizConfig.questions;
    }
    const configQuestions = (round.configData as { quizQuestions?: QuizQuestion[] })?.quizQuestions;
    if (configQuestions && configQuestions.length > 0) {
      return configQuestions;
    }
    return DEFAULT_QUESTIONS;
  }, [quizConfig, round.configData]);

  // Quiz result breakdown hook (parsed from ApplicationDetail)
  const quizResultData = useQuizResult(detail);

  // Check if test has already been completed or evaluated
  const isFinished =
    isCompleted ||
    detail?.finalScore != null ||
    (quizResultData.results && quizResultData.results.length > 0);

  // Exam execution state
  const [hasStarted, setHasStarted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [bookmarked, setBookmarked] = useState<Record<number, boolean>>({});
  const [resultFilter, setResultFilter] = useState<"ALL" | "CORRECT" | "INCORRECT">("ALL");

  // Time limit calculation (in seconds)
  const timeLimitMinutes = round.configData?.timeLimitMinutes ?? quizConfig?.timeLimitMinutes ?? 20;
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitMinutes * 60);

  // Compute overall result data for review mode
  const allResults = useMemo(() => {
    if (quizResultData.results && quizResultData.results.length > 0) {
      return quizResultData.results;
    }
    return questions.map((q, idx) => ({
      questionText: q.questionText,
      selectedAnswer: selectedAnswers[idx] ?? null,
      correctAnswer: q.correctAnswer ?? null,
      isCorrect: selectedAnswers[idx] === q.correctAnswer,
    }));
  }, [quizResultData, questions, selectedAnswers]);

  const correctCount = useMemo(() => {
    return allResults.filter((r) => r.isCorrect).length;
  }, [allResults]);

  const totalCount = allResults.length;
  const accuracyPercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  const filteredResults = useMemo(() => {
    const mapped = allResults.map((r, idx) => ({ ...r, originalIndex: idx }));
    if (resultFilter === "CORRECT") return mapped.filter((r) => r.isCorrect);
    if (resultFilter === "INCORRECT") return mapped.filter((r) => !r.isCorrect);
    return mapped;
  }, [allResults, resultFilter]);

  const submitMutation = useSubmitQuiz();

  const handleSubmitQuiz = useCallback(async () => {
    if (submitMutation.isPending) return;

    // Convert Record<number, string> to array of selected answer strings
    const answersArray: string[] = questions.map((_, idx) => selectedAnswers[idx] ?? "");

    try {
      await submitMutation.mutateAsync({
        applicationId,
        answers: answersArray,
      });
      toast.success(t("quiz.submitSuccess", "Nộp bài thi trắc nghiệm thành công!"));
      onSuccess?.();
    } catch (err) {
      console.error("[QuizModule] Submit error:", err);
    }
  }, [applicationId, questions, selectedAnswers, submitMutation, onSuccess, t]);

  const handleAutoSubmit = useCallback(async () => {
    toast.info("Đã hết thời gian làm bài! Hệ thống tự động nộp bài.");
    await handleSubmitQuiz();
  }, [handleSubmitQuiz]);

  // Countdown Timer Effect (only runs when candidate has explicitly started the exam)
  useEffect(() => {
    if (!hasStarted || isFinished) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isFinished, handleAutoSubmit]);

  const handleConfirmStartExam = () => {
    setShowConfirmDialog(false);
    setHasStarted(true);
    toast.success("Bắt đầu thời gian làm bài! Chúc bạn làm bài tốt.");
  };

  const handleSelectOption = (option: string) => {
    if (isFinished || !hasStarted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }));
  };

  const handleToggleBookmark = (idx: number) => {
    setBookmarked((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || questions[0];

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isLowTime = remainingSeconds <= 120; // less than 2 minutes

  return (
    <div className="space-y-6">
      {/* 🎯 TOP HEADER: Single Standalone Sub-header & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {isFinished
                  ? "BÁO CÁO KẾT QUẢ THI TRẮC NGHIỆM"
                  : `VÒNG ${round.roundOrder ?? 3}: TRẮC NGHIỆM • TRẠM THI TRỰC TUYẾN`}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-400">
                Vòng {round.roundOrder ?? 3}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isFinished
                ? "Bạn đã hoàn tất bài thi trắc nghiệm. Hệ thống đã chấm điểm và lưu trữ câu trả lời."
                : round.configData?.instruction ||
                  "Đọc kỹ từng câu hỏi và chọn đáp án chính xác nhất trong thời gian quy định."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {detail?.finalResult ? (
            <span
              className={
                detail.finalResult === "PASSED"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:text-emerald-300 dark:shadow-emerald-950/40"
                  : "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm shadow-rose-100 dark:text-rose-300 dark:shadow-rose-950/40"
              }>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>KẾT QUẢ: {detail.finalResult}</span>
            </span>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:text-emerald-300 dark:shadow-emerald-950/40">
              <CheckCircle2 className="h-4 w-4" />
              <span>ĐÃ HOÀN THÀNH BÀI THI</span>
            </span>
          ) : hasStarted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm shadow-indigo-100 dark:text-indigo-300 dark:shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>ĐANG TRONG THỜI GIAN LÀM BÀI</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-extrabold text-amber-700 shadow-sm shadow-amber-100 dark:text-amber-300 dark:shadow-amber-950/40">
              <Lock className="h-3.5 w-3.5" />
              <span>SẴN SÀNG BẮT ĐẦU</span>
            </span>
          )}
        </div>
      </div>

      {/* 🚀 MAIN CONTENT GRID (Responsive 12 columns) */}
      {!isFinished ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* 👈 LEFT COLUMN (30% - lg:col-span-4): Question Table & Timer */}
          <div className="space-y-4 lg:col-span-4">
            {/* Card 1: Question Matrix Table */}
            <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                    DANH SÁCH CÂU HỎI
                  </h4>
                </div>
                <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  {answeredCount}/{totalQuestions} Đã chọn
                </span>
              </div>

              {/* Grid matrix of question numbers */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const isCurr = currentIndex === idx;
                  const isAns = selectedAnswers[idx] != null && selectedAnswers[idx] !== "";
                  const isBm = bookmarked[idx] === true;

                  let btnStyle =
                    "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400 dark:hover:border-slate-700";

                  if (!hasStarted) {
                    btnStyle =
                      "border-slate-200 bg-slate-50/70 text-slate-500 opacity-60 cursor-not-allowed dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-600";
                  } else if (isCurr) {
                    btnStyle =
                      "border-indigo-500 bg-indigo-50 text-indigo-700 font-bold ring-2 ring-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-500/40";
                  } else if (isAns) {
                    btnStyle =
                      "border-emerald-500/40 bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-500/20 dark:text-emerald-300";
                  } else if (isBm) {
                    btnStyle =
                      "border-amber-500/40 bg-amber-50 text-amber-700 font-bold dark:bg-amber-500/20 dark:text-amber-300";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!hasStarted}
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative flex h-10 items-center justify-center rounded-xl border font-mono text-xs transition-all ${btnStyle}`}>
                      <span>{idx + 1}</span>
                      {!hasStarted ? (
                        <Lock className="absolute right-1 bottom-1 h-2.5 w-2.5 text-slate-600" />
                      ) : (
                        <>
                          {isBm && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                          )}
                          {isAns && !isCurr && (
                            <Check className="absolute right-0.5 bottom-0.5 h-3 w-3 text-emerald-400" />
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend Note */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3 text-[10px] text-slate-400 dark:border-slate-800/80">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <span>Đang xem</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Đã chọn</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Xem lại</span>
                </div>
              </div>
            </Card>

            {/* Card 2: Circular Progress Timer Clock */}
            <Card className="flex flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="flex w-full items-center justify-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800/80">
                <Clock
                  className={`h-4 w-4 ${hasStarted && isLowTime ? "animate-pulse text-rose-400" : "text-amber-400"}`}
                />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Thời gian làm bài
                </h4>
              </div>

              {/* Circular Countdown Ring */}
              <div className="relative my-1 flex h-32 w-32 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-slate-200 dark:text-slate-950"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={hasStarted && isLowTime ? "#f43f5e" : "#f59e0b"}
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={
                      2 * Math.PI * 40 -
                      (remainingSeconds / (timeLimitMinutes * 60)) * (2 * Math.PI * 40)
                    }
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {hasStarted ? "Còn lại" : "Thời lượng"}
                  </span>
                  <span
                    className={`font-mono text-xl font-black ${
                      hasStarted && isLowTime ? "animate-pulse text-rose-400" : "text-amber-300"
                    }`}>
                    {formatTimer(remainingSeconds)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 3: Submit Action Card (Only shown when candidate has started the exam) */}
            {hasStarted && (
              <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-md backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={submitMutation.isPending || !isCurrent}
                  className="h-10 w-full gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-xs font-bold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-blue-500">
                  {submitMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Đang nộp bài...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Nộp bài thi trắc nghiệm</span>
                    </>
                  )}
                </Button>
              </Card>
            )}
          </div>

          {/* 👉 RIGHT COLUMN (70% - lg:col-span-8): Lock Gate OR Active Question Screen */}
          <div className="space-y-4 lg:col-span-8">
            {!hasStarted ? (
              /* 🔒 START LOCK SCREEN / CHALLENGE GATE CARD */
              <Card className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
                <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                  {/* Glowing Lock Badge Icon */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 to-blue-600/30 text-indigo-400 shadow-xl shadow-indigo-500/10">
                    <Lock className="h-10 w-10" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 font-mono text-[9px] font-bold text-slate-950">
                      1
                    </span>
                  </div>

                  <div className="max-w-xl space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-mono text-[10px] font-extrabold text-indigo-700 uppercase dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>BẢO MẬT & GIÁM SÁT TỰ ĐỘNG</span>
                    </span>
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100">
                      XÁC NHẬN BẮT ĐẦU THI TRẮC NGHIỆM
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {round.configData?.instruction ||
                        "Bài thi trắc nghiệm nhằm đánh giá kiến thức chuyên môn cốt lõi, tư duy kỹ thuật và khả năng xử lý tình huống thực tế của ứng viên."}
                    </p>
                  </div>
                </div>

                {/* Test Parameters Overview Grid */}
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/80">
                  <div className="space-y-1 border-r border-slate-200 text-center last:border-r-0 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Số lượng câu
                    </span>
                    <p className="font-mono text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                      {totalQuestions} Câu
                    </p>
                  </div>
                  <div className="space-y-1 border-r border-slate-200 text-center last:border-r-0 dark:border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Thời gian
                    </span>
                    <p className="font-mono text-base font-extrabold text-amber-700 dark:text-amber-300">
                      {timeLimitMinutes} Phút
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Điểm sàn đạt
                    </span>
                    <p className="font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      {round.passThreshold ?? 70}/100
                    </p>
                  </div>
                </div>

                {/* Important Regulations Notice */}
                <div className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-slate-700 dark:border-amber-500/30 dark:bg-amber-950/15 dark:text-slate-200">
                  <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>LƯU Ý QUAN TRỌNG TRƯỚC KHI BẮT ĐẦU:</span>
                  </div>
                  <ul className="list-disc space-y-1.5 pl-6 text-slate-600 dark:text-slate-300">
                    <li>
                      Đồng hồ đếm ngược sẽ bắt đầu chạy **ngay lập tức** sau khi bấm xác nhận.
                    </li>
                    <li>
                      Bài thi chỉ có thể thực hiện **01 lần duy nhất**, không thể tạm dừng hay làm
                      lại.
                    </li>
                    <li>Khi hết thời gian, hệ thống sẽ tự động thu bài và chấm điểm tự động.</li>
                  </ul>
                </div>

                {/* Center Start Button */}
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!isCurrent}
                    className="h-12 gap-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-10 text-sm font-extrabold text-white shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 hover:from-indigo-500 hover:to-blue-500">
                    <Play className="h-5 w-5 fill-current" />
                    <span>BẮT ĐẦU LÀM BÀI THI NGAY</span>
                  </Button>
                </div>
              </Card>
            ) : (
              /* 📝 ACTIVE QUESTION & OPTION CHOICES CARD */
              <Card className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
                {/* Question Header Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1 font-mono text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                      CÂU HỎI {currentIndex + 1} / {totalQuestions}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      Chuyên môn
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleBookmark(currentIndex)}
                    className={`h-8 gap-1.5 text-xs font-semibold ${
                      bookmarked[currentIndex]
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}>
                    <Flag className="h-3.5 w-3.5" />
                    <span>
                      {bookmarked[currentIndex] ? "Đã đánh dấu xem lại" : "Đánh dấu xem lại"}
                    </span>
                  </Button>
                </div>

                {/* Question Prompt */}
                <div className="space-y-3">
                  <div className="text-sm leading-relaxed font-bold text-slate-900 md:text-base dark:text-slate-100">
                    <FormattedQuestionText text={currentQuestion.questionText} />
                  </div>
                </div>

                {/* Answer Options List */}
                <div className="space-y-3">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === opt;
                    return (
                      <div
                        key={oIdx}
                        onClick={() => handleSelectOption(opt)}
                        className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-50 text-slate-900 shadow-md ring-1 ring-indigo-500/40 dark:bg-indigo-950/40 dark:text-slate-100 dark:ring-indigo-500/50"
                            : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                        }`}>
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white group-hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:group-hover:border-slate-500"
                          }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs leading-relaxed font-medium md:text-sm">
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Navigation Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="h-9 gap-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Câu trước</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    {currentIndex < totalQuestions - 1 ? (
                      <Button
                        type="button"
                        onClick={() =>
                          setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                        }
                        className="h-9 gap-2 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500">
                        <span>Câu tiếp theo</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submitMutation.isPending || !isCurrent}
                        className="h-9 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-lg hover:from-emerald-500 hover:to-teal-500">
                        <Send className="h-4 w-4" />
                        <span>Hoàn tất & Nộp bài</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* 📊 RESULTS & REVIEW VIEW (When test is finished) */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left Column (4 cols - Pinned Sticky Sidebar): Score Gauge & Jump Matrix */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:col-span-4">
            {/* Card 1: Score & Status Gauge */}
            <Card className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-extrabold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    KẾT QUẢ ĐÁNH GIÁ
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-xs font-extrabold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {detail?.finalResult ?? "PASSED"}
                </span>
              </div>

              {/* Single Central Gauge for Quiz Score */}
              <div className="flex justify-center py-1">
                <ModernGaugeClock
                  score={detail?.finalScore ?? quizResultData.score ?? accuracyPercentage}
                  label="Điểm Số Trắc Nghiệm"
                  color="emerald"
                  hasData={true}
                />
              </div>

              {/* Stat breakdown pills */}
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800/80">
                <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-center dark:border-emerald-500/20 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Số câu đúng
                  </span>
                  <span className="font-mono text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                    {correctCount} / {totalCount}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-center dark:border-rose-500/20 dark:bg-rose-950/20">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Số câu sai</span>
                  <span className="font-mono text-base font-extrabold text-rose-700 dark:text-rose-400">
                    {totalCount - correctCount} / {totalCount}
                  </span>
                </div>
              </div>
            </Card>

            {/* Card 2: Interactive Jump Matrix */}
            <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                    MA TRẬN CÂU HỎI
                  </h4>
                </div>
                <span className="text-[10px] text-slate-400">Click để xem nhanh</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {allResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setResultFilter("ALL");
                      setTimeout(() => {
                        const el = document.getElementById(`review-question-${idx}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 50);
                    }}
                    className={`flex h-9 items-center justify-center rounded-xl border font-mono text-xs font-bold transition-all hover:scale-105 ${
                      res.isCorrect
                        ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "border-rose-500/40 bg-rose-50 text-rose-700 hover:border-rose-400 dark:bg-rose-950/60 dark:text-rose-300"
                    }`}>
                    <span>{idx + 1}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column (8 cols): Question Answers Review & Filters */}
          <div className="space-y-4 lg:col-span-8">
            <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
              {/* Header & Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                    CHI TIẾT CÂU HỎI VÀ ĐÁP ÁN
                  </h4>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setResultFilter("ALL")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      resultFilter === "ALL"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}>
                    Tất cả ({allResults.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFilter("CORRECT")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      resultFilter === "CORRECT"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}>
                    Đúng ({correctCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultFilter("INCORRECT")}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                      resultFilter === "INCORRECT"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}>
                    Sai ({totalCount - correctCount})
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {filteredResults.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Không có câu hỏi nào thuộc bộ lọc này.
                  </div>
                ) : (
                  filteredResults.map((res) => (
                    <div
                      key={res.originalIndex}
                      id={`review-question-${res.originalIndex}`}
                      className={`overflow-hidden rounded-2xl border transition-all ${
                        res.isCorrect
                          ? "border-emerald-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none"
                          : "border-rose-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none"
                      }`}>
                      {/* Prominent Header Banner */}
                      <div
                        className={`flex items-center justify-between border-b px-5 py-3 ${
                          res.isCorrect
                            ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-950/40"
                            : "border-rose-200 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-950/40"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-black uppercase ${
                              res.isCorrect
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                            }`}>
                            {res.isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-400" />
                            )}
                            <span>CÂU HỎI {res.originalIndex + 1}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {res.isCorrect ? "Trả lời chính xác" : "Trả lời chưa chính xác"}
                          </span>
                        </div>

                        <span
                          className={`rounded-lg border px-3 py-1 font-mono text-[11px] font-extrabold tracking-wider uppercase ${
                            res.isCorrect
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                          }`}>
                          {res.isCorrect ? "ĐÚNG" : "SAI"}
                        </span>
                      </div>

                      {/* Question Content & Answer Comparison */}
                      <div className="space-y-4 p-5">
                        <div className="text-xs leading-relaxed font-bold text-slate-900 dark:text-slate-100">
                          <FormattedQuestionText text={res.questionText} />
                        </div>

                        {/* Options / Answer Box Comparison */}
                        <div className="space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800/80">
                          <div
                            className={`flex items-start gap-2 rounded-xl border p-3 ${
                              res.isCorrect
                                ? "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                                : "border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
                            }`}>
                            <span className="font-semibold text-slate-400">Lựa chọn của bạn:</span>
                            <span className="font-mono font-bold">
                              {res.selectedAnswer || "(Chưa chọn)"}
                            </span>
                          </div>

                          {res.correctAnswer && !res.isCorrect && (
                            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                              <div>
                                <span className="font-semibold text-emerald-400">
                                  Đáp án chính xác:{" "}
                                </span>
                                <span className="font-mono font-bold">{res.correctAnswer}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ⚠️ CONFIRMATION START MODAL */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-sm border-slate-200 bg-white text-slate-900 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100">
          <DialogHeader className="space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Bắt đầu bài thi trắc nghiệm?
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-400">
              Thời gian đếm ngược sẽ bắt đầu ngay khi bạn xác nhận.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirmDialog(false)}
              className="h-8 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmStartExam}
              className="h-8 gap-1.5 bg-indigo-600 px-4 text-xs font-bold text-white shadow-md hover:bg-indigo-500">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Bắt đầu</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
