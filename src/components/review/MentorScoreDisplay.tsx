import { Progress } from "@/components/ui/progress";
import {
  formatMentorReviewScore,
  getMentorReviewScoreBand,
  normalizeMentorReviewScore,
} from "@/lib/mentor-review-score";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MentorScoreDisplayProps {
  value?: number | null;
  showBand?: boolean;
  showProgress?: boolean;
  className?: string;
}

const SCORE_TONES = {
  excellent: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  strong: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  meets: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  developing: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
} as const;

export function MentorScoreDisplay({
  value,
  showBand = false,
  showProgress = false,
  className,
}: MentorScoreDisplayProps) {
  const { t } = useTranslation();
  const score = normalizeMentorReviewScore(value);
  const band = getMentorReviewScoreBand(score);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-bold tabular-nums",
            SCORE_TONES[band]
          )}>
          <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
          {formatMentorReviewScore(score)}
          <span className="font-sans font-semibold opacity-75">/100</span>
        </span>
        {showBand && (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t(`mentorScoring.band.${band}`)}
          </span>
        )}
      </div>
      {showProgress && (
        <Progress
          value={score}
          aria-label={t("mentorScoring.scoreOutOf100", { score: formatMentorReviewScore(score) })}
          className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-800"
        />
      )}
    </div>
  );
}
