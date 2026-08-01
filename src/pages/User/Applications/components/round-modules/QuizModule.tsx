import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, HelpCircle, Layers, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface QuizAnswer {
  questionText?: string;
  selectedAnswer?: string;
  isCorrect?: boolean;
}

interface QuizModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdId?: number;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function QuizModule({
  round,
  detail,
  applicationId,
  jdId,
  isCompleted,
  isCurrent,
}: QuizModuleProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const timeLimit = round.configData?.timeLimitMinutes ?? 20;
  const score = detail?.finalScore ?? detail?.aiScore;
  const quizAnswers =
    (detail as { submissionData?: { quizAnswers?: QuizAnswer[] | null } | null })?.submissionData
      ?.quizAnswers ?? null;
  const finalResult = (detail as { finalResult?: string | null })?.finalResult ?? null;
  const correctCount = quizAnswers?.filter((q) => q.isCorrect).length ?? 0;
  const totalAnswered = quizAnswers?.length ?? 0;

  const handleStartQuiz = () => {
    navigate(`/user/quiz/${applicationId}/round/${round.id}?jdId=${jdId ?? 0}`);
  };

  return (
    <div className="space-y-6">
      {/* Instruction Box */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t("userApplicationhistory.instructionsTitle", "Hướng dẫn làm bài")}
        </h4>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A]/90 dark:text-slate-300">
          {round.configData?.instruction ||
            t(
              "userApplicationhistory.quizInstructionDefault",
              "Bài thi trắc nghiệm bao gồm các câu hỏi đánh giá kiến thức chuyên môn cốt lõi, tư duy lập trình và framework thực tế."
            )}
        </div>
      </div>

      {/* Quiz Card Launcher */}
      <Card className="overflow-hidden border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {round.name ||
                    t("userApplicationhistory.quizTitleDefault", "Bài thi Trắc nghiệm Kiến thức")}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    Thời gian: {timeLimit} phút
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-indigo-500" />
                    Điểm sàn đạt: {round.passThreshold ?? 70}/100
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                JavaScript / TypeScript Core
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Database & Query Optimization
              </span>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                System Design Basics
              </span>
            </div>
          </div>

          {/* Score or Status */}
          {score !== undefined && score !== null ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center lg:w-48 dark:border-emerald-950/60 dark:bg-emerald-950/30">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Điểm Trắc nghiệm
              </span>
              <p className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {score}/100
              </p>
              <span className="mt-1 text-[10px] font-bold text-emerald-700 uppercase dark:text-emerald-300">
                ✓ Đã hoàn thành
              </span>
            </div>
          ) : (
            isCurrent && (
              <Button
                onClick={handleStartQuiz}
                className="h-11 gap-2 bg-indigo-600 px-8 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
                <span>{t("userApplicationhistory.quizEnterExam")}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>

        {isCompleted && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("userApplicationhistory.quizCompletedNotice")}</span>
            </div>
            <Button
              variant="outline"
              onClick={handleStartQuiz}
              className="h-8 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              Xem câu trả lời & Giải thích
            </Button>
          </div>
        )}
      </Card>

      {/* Quiz Result Breakdown — show after submission. */}
      {quizAnswers && quizAnswers.length > 0 && (
        <Card className="space-y-4 border border-indigo-200/70 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/40 p-6 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-sky-950/20">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <HelpCircle className="h-4 w-4 text-indigo-500" />
              {t("userApplicationhistory.quizAnswerBreakdownTitle", "Chi tiết câu trả lời")}
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                ✓ {correctCount}/{totalAnswered}
              </span>
              {finalResult && (
                <span
                  className={`rounded-full px-2.5 py-0.5 font-extrabold tracking-wider uppercase ${
                    finalResult === "PASSED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}>
                  {finalResult}
                </span>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {quizAnswers.map((q, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  q.isCorrect
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : "border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20"
                }`}>
                <span className="mt-0.5">
                  {q.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500" />
                  )}
                </span>
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Câu {i + 1}: {q.questionText ?? "—"}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Đáp án đã chọn:{" "}
                    <span className="font-extrabold tracking-wider uppercase">
                      {q.selectedAnswer ?? "—"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
