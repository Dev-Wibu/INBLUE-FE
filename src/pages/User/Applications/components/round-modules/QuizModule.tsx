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
  Flag,
  HelpCircle,
  Layers,
  Lock,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
          return (
            <div
              key={idx}
              className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-3.5 py-1.5 font-mono text-[11px] font-bold text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-emerald-400 uppercase">
                    {block.lang || "code"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">CODE SNIPPET</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed whitespace-pre text-emerald-300">
                <code>{block.content}</code>
              </pre>
            </div>
          );
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
          bg: "border-emerald-500/20 bg-emerald-950/20",
          stroke: "#10b981",
        }
      : {
          text: "text-indigo-400",
          bg: "border-indigo-500/20 bg-indigo-950/20",
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
            className="text-slate-800"
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
      <span className="mt-1 text-xs font-bold text-slate-300">{label}</span>
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

  // Time limit calculation (in seconds)
  const timeLimitMinutes = round.configData?.timeLimitMinutes ?? quizConfig?.timeLimitMinutes ?? 20;
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitMinutes * 60);

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/20 text-indigo-400">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-400 uppercase">
                VÒNG TRẮC NGHIỆM
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-medium text-slate-300">TRẠM THI TRỰC TUYẾN</span>
            </div>
            <h2 className="text-sm font-bold text-slate-100">
              {round.name || "Bài thi Trắc nghiệm Kiến thức Chuyên môn"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isFinished ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>ĐÃ HOÀN THÀNH BÀI THI</span>
            </span>
          ) : hasStarted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>ĐANG TRONG THỜI GIAN LÀM BÀI</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-4 py-1.5 text-xs font-extrabold text-amber-300 shadow-sm shadow-amber-950/40">
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
            <Card className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
                    DANH SÁCH CÂU HỎI
                  </h4>
                </div>
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300">
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
                    "border-slate-800 bg-slate-950/80 text-slate-400 hover:border-slate-700";

                  if (!hasStarted) {
                    btnStyle =
                      "border-slate-800/60 bg-slate-950/40 text-slate-600 opacity-60 cursor-not-allowed";
                  } else if (isCurr) {
                    btnStyle =
                      "border-indigo-500 bg-indigo-600/30 text-indigo-300 font-bold ring-2 ring-indigo-500/40";
                  } else if (isAns) {
                    btnStyle = "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-bold";
                  } else if (isBm) {
                    btnStyle = "border-amber-500/40 bg-amber-500/20 text-amber-300 font-bold";
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
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-3 text-[10px] text-slate-400">
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

            {/* Card 2: Timer & Progress Countdown */}
            <Card className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock
                    className={`h-4 w-4 ${hasStarted && isLowTime ? "animate-pulse text-rose-400" : "text-amber-400"}`}
                  />
                  <h4 className="text-xs font-bold text-slate-200">Thời gian làm bài</h4>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-xs font-medium text-slate-400">
                  {hasStarted ? "Còn lại:" : "Thời lượng:"}
                </span>
                <span
                  className={`font-mono text-xl font-black ${hasStarted && isLowTime ? "animate-pulse text-rose-400" : "text-amber-300"}`}>
                  {formatTimer(remainingSeconds)}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    hasStarted && isLowTime
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-indigo-500 to-blue-500"
                  }`}
                  style={{ width: `${(remainingSeconds / (timeLimitMinutes * 60)) * 100}%` }}
                />
              </div>
            </Card>

            {/* Card 3: Submit Action Card */}
            <Card className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md backdrop-blur-md">
              {hasStarted ? (
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
              ) : (
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!isCurrent}
                  className="h-10 w-full gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-xs font-bold text-white shadow-lg transition-all hover:from-indigo-500 hover:to-blue-500">
                  <Play className="h-4 w-4 fill-current" />
                  <span>Bắt đầu làm bài thi</span>
                </Button>
              )}
            </Card>
          </div>

          {/* 👉 RIGHT COLUMN (70% - lg:col-span-8): Lock Gate OR Active Question Screen */}
          <div className="space-y-4 lg:col-span-8">
            {!hasStarted ? (
              /* 🔒 START LOCK SCREEN / CHALLENGE GATE CARD */
              <Card className="space-y-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900/90 to-slate-900/90 p-8 shadow-2xl backdrop-blur-md">
                <div className="flex flex-col items-center justify-center space-y-4 py-4 text-center">
                  {/* Glowing Lock Badge Icon */}
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/30 to-blue-600/30 text-indigo-400 shadow-xl shadow-indigo-500/10">
                    <Lock className="h-10 w-10" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 font-mono text-[9px] font-bold text-slate-950">
                      1
                    </span>
                  </div>

                  <div className="max-w-xl space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-[10px] font-extrabold text-indigo-300 uppercase">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>BẢO MẬT & GIÁM SÁT TỰ ĐỘNG</span>
                    </span>
                    <h3 className="text-xl font-extrabold tracking-tight text-slate-100">
                      XÁC NHẬN BẮT ĐẦU THI TRẮC NGHIỆM
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-300">
                      {round.configData?.instruction ||
                        "Bài thi trắc nghiệm nhằm đánh giá kiến thức chuyên môn cốt lõi, tư duy kỹ thuật và khả năng xử lý tình huống thực tế của ứng viên."}
                    </p>
                  </div>
                </div>

                {/* Test Parameters Overview Grid */}
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:grid-cols-3">
                  <div className="space-y-1 border-r border-slate-800/80 text-center last:border-r-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Số lượng câu
                    </span>
                    <p className="font-mono text-base font-extrabold text-indigo-300">
                      {totalQuestions} Câu
                    </p>
                  </div>
                  <div className="space-y-1 border-r border-slate-800/80 text-center last:border-r-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Thời gian
                    </span>
                    <p className="font-mono text-base font-extrabold text-amber-300">
                      {timeLimitMinutes} Phút
                    </p>
                  </div>
                  <div className="space-y-1 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Điểm sàn đạt
                    </span>
                    <p className="font-mono text-base font-extrabold text-emerald-300">
                      {round.passThreshold ?? 70}/100
                    </p>
                  </div>
                </div>

                {/* Important Regulations Notice */}
                <div className="space-y-2.5 rounded-xl border border-amber-500/30 bg-amber-950/15 p-4 text-xs leading-relaxed text-slate-200">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>LƯU Ý QUAN TRỌNG TRƯỚC KHI BẮT ĐẦU:</span>
                  </div>
                  <ul className="list-disc space-y-1.5 pl-6 text-slate-300">
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
              <Card className="space-y-6 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-xl backdrop-blur-md">
                {/* Question Header Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 font-mono text-xs font-bold text-indigo-300">
                      CÂU HỎI {currentIndex + 1} / {totalQuestions}
                    </span>
                    <span className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
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
                        ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}>
                    <Flag className="h-3.5 w-3.5" />
                    <span>
                      {bookmarked[currentIndex] ? "Đã đánh dấu xem lại" : "Đánh dấu xem lại"}
                    </span>
                  </Button>
                </div>

                {/* Question Prompt */}
                <div className="space-y-3">
                  <div className="text-sm leading-relaxed font-bold text-slate-100 md:text-base">
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
                            ? "border-indigo-500 bg-indigo-950/40 text-slate-100 shadow-md ring-1 ring-indigo-500/50"
                            : "border-slate-800/80 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-950"
                        }`}>
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isSelected
                              ? "border-indigo-400 bg-indigo-600 text-white"
                              : "border-slate-700 bg-slate-900 group-hover:border-slate-500"
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="h-9 gap-2 border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white">
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
          {/* Left Column (50% - lg:col-span-6): Result Summary & HR Notes */}
          <div className="space-y-5 lg:col-span-6">
            <Card className="space-y-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-900/90 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-xs font-extrabold tracking-wider text-emerald-300 uppercase">
                    KẾT QUẢ ĐÁNH GIÁ TRẮC NGHIỆM
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-0.5 text-xs font-extrabold text-emerald-300">
                  {detail?.finalResult ?? "PASSED"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <ModernGaugeClock
                  score={detail?.finalScore ?? quizResultData.score ?? 0}
                  label="Điểm Trắc Nghiệm"
                  color="emerald"
                  hasData={true}
                />
                <ModernGaugeClock
                  score={detail?.hrScore ?? 0}
                  label="HR Score"
                  color="indigo"
                  hasData={detail?.hrScore != null && (detail?.hrScore ?? 0) > 0}
                />
              </div>
            </Card>

            <Card className="space-y-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-indigo-300" />
                  <h4 className="text-xs font-bold tracking-wider text-indigo-300 uppercase">
                    NHẬN XÉT TRỰC TIẾP TỪ HỘI ĐỒNG HR
                  </h4>
                </div>
                <span className="text-[10px] font-medium text-slate-400">HR ĐÁNH GIÁ</span>
              </div>

              {detail?.hrNote ? (
                <div className="rounded-xl border-l-2 border-indigo-500 bg-slate-950/60 p-3.5 text-sm leading-relaxed text-slate-200 italic">
                  "{detail.hrNote}"
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-slate-400 italic">
                  Chưa có ghi chú trực tiếp từ Hội đồng tuyển dụng HR. (Hệ thống sẽ cập nhật ngay
                  khi HR hoàn tất rà soát).
                </p>
              )}
            </Card>

            <Card className="space-y-3.5 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-md">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Target className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                  NỘI DUNG HƯỚNG DẪN BAN ĐẦU
                </h4>
              </div>
              <div className="rounded-xl border border-indigo-500/30 bg-slate-950/90 p-4 text-xs leading-relaxed font-medium whitespace-pre-line text-slate-100 shadow-inner">
                {round.configData?.instruction ||
                  "Bài thi trắc nghiệm nhằm đánh giá kiến thức chuyên môn cốt lõi và tư duy kỹ thuật."}
              </div>
            </Card>
          </div>

          {/* Right Column (50% - lg:col-span-6): Question Answers Breakdown */}
          <div className="space-y-4 lg:col-span-6">
            <Card className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-extrabold tracking-wider text-slate-200 uppercase">
                    CHI TIẾT CÂU TRẢ LỜI
                  </h4>
                </div>
                <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400">
                  {quizResultData.correctCount} /{" "}
                  {quizResultData.totalQuestions || questions.length} Câu đúng
                </span>
              </div>

              <div className="space-y-3">
                {(quizResultData.results && quizResultData.results.length > 0
                  ? quizResultData.results
                  : questions.map((q, idx) => ({
                      questionText: q.questionText,
                      selectedAnswer: selectedAnswers[idx] ?? null,
                      correctAnswer: q.correctAnswer ?? null,
                      isCorrect: selectedAnswers[idx] === q.correctAnswer,
                    }))
                ).map((res, i) => (
                  <div
                    key={i}
                    className={`space-y-2 rounded-xl border p-4.5 ${
                      res.isCorrect
                        ? "border-emerald-500/30 bg-emerald-950/20"
                        : "border-rose-500/30 bg-rose-950/20"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {res.isCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        )}
                        <div className="flex-1 text-xs leading-relaxed font-bold text-slate-100">
                          <span className="mr-1 font-extrabold text-indigo-400">Câu {i + 1}:</span>
                          <FormattedQuestionText text={res.questionText} className="mt-1" />
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                          res.isCorrect
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}>
                        {res.isCorrect ? "ĐÚNG" : "SAI"}
                      </span>
                    </div>

                    <div className="space-y-1 pl-7 text-[11px]">
                      <p className="text-slate-300">
                        Đáp án đã chọn:{" "}
                        <span className="font-semibold text-slate-100">
                          {res.selectedAnswer || "(Chưa chọn)"}
                        </span>
                      </p>
                      {res.correctAnswer && !res.isCorrect && (
                        <p className="text-emerald-400">
                          Đáp án đúng: <span className="font-semibold">{res.correctAnswer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ⚠️ CONFIRMATION START MODAL */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-extrabold text-slate-100">
              XÁC NHẬN BẮT ĐẦU LÀM BÀI THI TRẮC NGHIỆM
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-300">
              Bạn có chắc chắn muốn bắt đầu bài thi ngay bây giờ không?
              <br />
              <strong className="text-amber-300">
                • Thời gian làm bài ({timeLimitMinutes} phút) sẽ bắt đầu đếm ngược ngay lập tức.
                <br />• Bài thi chỉ có thể thực hiện 01 lần duy nhất.
              </strong>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white">
              Hủy bỏ
            </Button>
            <Button
              type="button"
              onClick={handleConfirmStartExam}
              className="gap-2 bg-indigo-600 text-xs font-bold text-white shadow-lg hover:bg-indigo-500">
              <Play className="h-4 w-4 fill-current" />
              <span>Xác nhận & Bắt đầu ngay</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
