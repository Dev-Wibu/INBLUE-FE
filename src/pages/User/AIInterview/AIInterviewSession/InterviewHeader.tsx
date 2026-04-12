import { ArrowLeft, CheckCircle2, MessageSquare, Volume2, VolumeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InterviewHeader({
  phaseName,
  questionIndex,
  totalQuestions,
  finished,
  isTTSSupported,
  isMuted,
  onToggleMute,
  onBack,
}: {
  phaseName: string;
  questionIndex: number;
  totalQuestions: number;
  finished: boolean;
  isTTSSupported: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onBack: () => void;
}) {
  const progress = totalQuestions > 0 ? (questionIndex / totalQuestions) * 100 : 0;

  return (
    <div className="border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 shrink-0 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-cyan-600 to-blue-700 shadow-sm">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-foreground text-base font-black tracking-tight md:text-lg">
            Phỏng vấn với AI
          </h1>
          <div className="mt-0.5 flex items-center gap-2">
            {phaseName && (
              <Badge variant="secondary" className="rounded-full text-xs">
                {phaseName}
              </Badge>
            )}
            {!finished && totalQuestions > 0 && (
              <span className="text-muted-foreground text-xs">
                Câu {questionIndex}/{totalQuestions}
              </span>
            )}
            {finished && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Hoàn thành
              </Badge>
            )}
          </div>
        </div>
        {isTTSSupported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleMute}
                className={isMuted ? "text-muted-foreground" : "text-cyan-600"}
                aria-label={isMuted ? "Bật âm thanh AI" : "Tắt âm thanh AI"}>
                {isMuted ? <VolumeOff className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMuted ? "Âm thanh AI: Tắt" : "Âm thanh AI: Bật"}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {!finished && totalQuestions > 0 && (
        <Progress value={progress} className="h-1.5 rounded-none" />
      )}
    </div>
  );
}
