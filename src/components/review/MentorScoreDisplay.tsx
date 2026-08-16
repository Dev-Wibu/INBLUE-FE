import {
  formatMentorReviewScore,
  getMentorReviewScoreBand,
  normalizeMentorReviewScore,
} from "@/lib/mentor-review-score";
import { cn } from "@/lib/utils";
import { Gauge, Sparkles } from "lucide-react";
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
    badge:
      "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300",
    ring: "text-emerald-500 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-950/20",
  },
  strong: {
    badge:
      "border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300",
    ring: "text-indigo-500 dark:text-indigo-400",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-950/20",
  },
  meets: {
    badge:
      "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300",
    ring: "text-sky-500 dark:text-sky-400",
    text: "text-sky-600 dark:text-sky-400",
    bg: "border-sky-200 bg-sky-50/60 dark:border-sky-500/20 dark:bg-sky-950/20",
  },
  developing: {
    badge:
      "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300",
    ring: "text-amber-500 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
    bg: "border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-950/20",
  },
  low: {
    badge:
      "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300",
    ring: "text-rose-500 dark:text-rose-400",
    text: "text-rose-600 dark:text-rose-400",
    bg: "border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-950/20",
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
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const dimensions = size === "sm" ? "h-24 w-24" : size === "lg" ? "h-32 w-32" : "h-28 w-28";

    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 text-center", className)}>
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border p-4 text-center shadow-2xs transition-all",
            tone.bg
          )}>
          <div className={cn("relative flex items-center justify-center", dimensions)}>
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                className="text-slate-200 dark:text-slate-800/80"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="6"
                className={cn(tone.ring, "transition-all duration-1000 ease-out")}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
              <div className="flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {formatMentorReviewScore(score)}
                </span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  /100
                </span>
              </div>
              <span className="mt-0.5 text-[9px] font-extrabold tracking-wider text-slate-400 uppercase dark:text-slate-500">
                {label || t("userApplication.mentorReview.mentorScoreLabel", "ĐIỂM MENTOR")}
              </span>
            </div>
          </div>
        </div>

        {showBand && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-extrabold shadow-2xs transition-all",
              tone.badge
            )}>
            <Sparkles className="h-3.5 w-3.5" />
            {t(`mentorScoring.band.${band}`)}
          </span>
        )}
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
