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
  variant?: "inline" | "circle";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SCORE_TONES = {
  excellent: {
    badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ring: "text-emerald-500 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  strong: {
    badge: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    ring: "text-indigo-500 dark:text-indigo-400",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  meets: {
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    ring: "text-sky-500 dark:text-sky-400",
    text: "text-sky-600 dark:text-sky-400",
  },
  developing: {
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    ring: "text-amber-500 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
  },
  low: {
    badge: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    ring: "text-rose-500 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400",
  },
} as const;

export function MentorScoreDisplay({
  value,
  showBand = false,
  showProgress = false,
  variant = "inline",
  size = "md",
  className,
  label,
}: MentorScoreDisplayProps) {
  const { t } = useTranslation();
  const score = normalizeMentorReviewScore(value);
  const band = getMentorReviewScoreBand(score);
  const tone = SCORE_TONES[band];

  if (variant === "circle" || showProgress) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const dimensions = size === "sm" ? "h-28 w-28" : size === "lg" ? "h-40 w-40" : "h-36 w-36";

    return (
      <div className={cn("flex flex-col items-center justify-center text-center", className)}>
        <div className={cn("relative flex items-center justify-center", dimensions)}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className="text-slate-200 dark:text-slate-800/80"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className={cn(tone.ring, "transition-all duration-1000 ease-out")}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {formatMentorReviewScore(score)}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">/100</span>
            </div>
            {(label || showBand) && (
              <span
                className={cn(
                  "mt-1 text-[11px] font-extrabold tracking-wider uppercase",
                  tone.text
                )}>
                {label || t(`mentorScoring.band.${band}`)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs font-bold tabular-nums",
            tone.badge
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
    </div>
  );
}
