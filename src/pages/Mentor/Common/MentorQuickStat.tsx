/**
 * MentorQuickStat — small bento tile used in mentor list side panels
 * (Students / Reviews / Feedback) for compact metrics.
 * Styled to match the original UI with index numbers.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface MentorQuickStatProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  caption?: string;
  tone?: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  /** Index used to display as mono label suffix (01, 02, etc.) */
  index?: number;
  className?: string;
}

const TONE_ACCENT: Record<NonNullable<MentorQuickStatProps["tone"]>, string> = {
  sky: "from-sky-400/30 to-transparent",
  emerald: "from-emerald-400/30 to-transparent",
  amber: "from-amber-400/30 to-transparent",
  indigo: "from-indigo-400/30 to-transparent",
  violet: "from-violet-400/30 to-transparent",
  rose: "from-rose-400/30 to-transparent",
};

const TONE_ICON: Record<NonNullable<MentorQuickStatProps["tone"]>, string> = {
  sky: "text-sky-600 dark:text-sky-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  violet: "text-violet-600 dark:text-violet-300",
  rose: "text-rose-600 dark:text-rose-300",
};

export function MentorQuickStat({
  icon: Icon,
  label,
  value,
  caption,
  tone = "indigo",
  index,
  className,
}: MentorQuickStatProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900",
        className
      )}>
      {/* Subtle gradient accent */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br opacity-50 blur-xl",
          TONE_ACCENT[tone]
        )}
      />
      <div className="relative flex items-center justify-between">
        {typeof index === "number" && (
          <span className="font-mono text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
            0{index}
          </span>
        )}
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            !index && "ml-auto"
          )}>
          <Icon className={cn("h-3.5 w-3.5", TONE_ICON[tone])} aria-hidden />
        </div>
      </div>
      <div className="relative">
        <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-base font-bold tracking-[-0.01em] text-slate-900 dark:text-white">
          {value}
        </p>
        {caption && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{caption}</p>}
      </div>
    </div>
  );
}
