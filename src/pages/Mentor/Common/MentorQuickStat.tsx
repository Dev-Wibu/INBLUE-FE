/**
 * MentorQuickStat — small bento tile used in mentor list side panels
 * (Students / Reviews / Feedback) for compact metrics.
 * Admin-style solid colors without gradients.
 */

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface MentorQuickStatProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  caption?: string;
  tone?: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  className?: string;
}

const TONE_BG: Record<NonNullable<MentorQuickStatProps["tone"]>, string> = {
  sky: "bg-sky-100 dark:bg-sky-500/15",
  emerald: "bg-emerald-100 dark:bg-emerald-500/15",
  amber: "bg-amber-100 dark:bg-amber-500/15",
  indigo: "bg-indigo-100 dark:bg-indigo-500/15",
  violet: "bg-violet-100 dark:bg-violet-500/15",
  rose: "bg-rose-100 dark:bg-rose-500/15",
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
  className,
}: MentorQuickStatProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900",
        className
      )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_BG[tone])}>
          <Icon className={cn("h-4 w-4", TONE_ICON[tone])} aria-hidden />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        {caption && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{caption}</p>}
      </div>
    </div>
  );
}
