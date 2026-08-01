import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Bot, Mic, Sparkles, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

interface AiInterviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function AiInterviewModule({
  round,
  detail,
  applicationId,
  isCurrent,
}: AiInterviewModuleProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const finalScore = detail?.finalScore ?? detail?.aiScore;

  const handleLaunchAiInterview = () => {
    navigate(`/user/application/${applicationId}/ai-interview?roundId=${round.id ?? 0}`);
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
              "userApplicationhistory.aiInstructionDefault",
              "Phỏng vấn trực tiếp cùng Trợ lý AI Thông Minh. AI sẽ đưa ra các câu hỏi chuyên môn và xử lý tình huống phản xạ thời gian thực qua Giọng nói / Audio."
            )}
        </div>
      </div>

      {/* AI Console Display Card */}
      <Card className="overflow-hidden border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            {/* AI Avatar Visualizer */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white shadow-lg">
              <Bot className="h-7 w-7" />
              <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900">
                <Mic className="h-2.5 w-2.5 text-white" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Interviewer Voice Console
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  <Sparkles className="h-3 w-3" />
                  Realtime Audio Evaluation
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chấm điểm Tự tin (Behavioral) & Kỹ năng kỹ thuật (Technical Depth)
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Yêu cầu Micro & Thiết bị thu âm tốt</span>
              </div>
            </div>
          </div>

          {/* Action or Score */}
          {finalScore !== undefined && finalScore !== null ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 text-center lg:w-48 dark:border-indigo-950/60 dark:bg-indigo-950/30">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Điểm AI Phỏng vấn
              </span>
              <p className="mt-1 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {finalScore}/100
              </p>
              <span className="mt-1 text-[10px] font-bold text-indigo-700 uppercase dark:text-indigo-300">
                ✓ Hoàn thành phỏng vấn
              </span>
            </div>
          ) : (
            isCurrent && (
              <Button
                onClick={handleLaunchAiInterview}
                className="h-11 gap-2 bg-indigo-600 px-8 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
                <Bot className="h-4 w-4" />
                <span>Mở Console Phỏng vấn AI</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </Card>
    </div>
  );
}
