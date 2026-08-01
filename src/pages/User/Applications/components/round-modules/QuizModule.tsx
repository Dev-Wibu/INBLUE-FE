import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, HelpCircle, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
                <span>Vào phòng thi Quiz ngay</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>

        {isCompleted && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Bạn đã hoàn thành phần thi Trắc nghiệm này.</span>
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
    </div>
  );
}
