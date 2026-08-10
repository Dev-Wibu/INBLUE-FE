/**
 * MentorQuickStat — small bento tile used in mentor list side panels
 * (Students / Reviews / Feedback) for compact metrics. Avoids the
 * identical-4-card-grid anti-pattern by varying tile accent + glow.
 */

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface MentorQuickStatProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  caption?: string;
  tone?: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  /** Index used to stagger entrance + as mono label suffix. */
  index?: number;
  className?: string;
}

const TONE_ACCENT: Record<NonNullable<MentorQuickStatProps["tone"]>, string> = {
  sky: "from-sky-400/40 to-transparent",
  emerald: "from-emerald-400/40 to-transparent",
  amber: "from-amber-400/40 to-transparent",
  indigo: "from-indigo-400/40 to-transparent",
  violet: "from-violet-400/40 to-transparent",
  rose: "from-rose-400/40 to-transparent",
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
  tone = "sky",
  index,
  className,
}: MentorQuickStatProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn(
        "group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl p-3.5 ring-1 ring-inset",
        "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
        "dark:bg-white/[0.03] dark:ring-white/5",
        "transition-shadow hover:shadow-[0_6px_20px_-12px_rgba(15,23,42,0.25)]",
        "dark:hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]",
        className
      )}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full bg-gradient-to-br opacity-60 blur-2xl",
          TONE_ACCENT[tone]
        )}
      />
      <div className="relative flex items-center justify-between">
        {typeof index === "number" && (
          <span className="font-mono text-[10px] tracking-[0.1em] text-slate-400 uppercase">
            0{index}
          </span>
        )}
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset",
            "bg-slate-900/[0.04] ring-slate-900/10",
            "dark:bg-white/[0.05] dark:ring-white/10",
            !index && "ml-auto"
          )}>
          <Icon className={cn("h-3.5 w-3.5", TONE_ICON[tone])} aria-hidden />
        </div>
      </div>
      <div className="relative">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
          {value}
        </p>
        {caption && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{caption}</p>}
      </div>
    </motion.div>
  );
}
