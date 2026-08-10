/**
 * MentorEmptyState — a more personality-rich empty state than the
 * project-wide `<EmptyState>` primitive. Adds:
 *   - a tinted gradient halo behind the icon (matches page tone)
 *   - a small CTA slot on the right
 *   - decorative dotted grid + soft glow for that "command center" feel
 */

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface MentorEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  className?: string;
}

const TONE_HALO: Record<NonNullable<MentorEmptyStateProps["tone"]>, string> = {
  sky: "from-sky-400/25 via-sky-400/0 to-transparent",
  emerald: "from-emerald-400/25 via-emerald-400/0 to-transparent",
  amber: "from-amber-400/25 via-amber-400/0 to-transparent",
  indigo: "from-indigo-400/25 via-indigo-400/0 to-transparent",
  violet: "from-violet-400/25 via-violet-400/0 to-transparent",
  rose: "from-rose-400/25 via-rose-400/0 to-transparent",
};

const TONE_RING: Record<NonNullable<MentorEmptyStateProps["tone"]>, string> = {
  sky: "ring-sky-500/30",
  emerald: "ring-emerald-500/30",
  amber: "ring-amber-500/30",
  indigo: "ring-indigo-500/30",
  violet: "ring-violet-500/30",
  rose: "ring-rose-500/30",
};

const TONE_BG: Record<NonNullable<MentorEmptyStateProps["tone"]>, string> = {
  sky: "bg-sky-500/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
  indigo: "bg-indigo-500/10",
  violet: "bg-violet-500/10",
  rose: "bg-rose-500/10",
};

const TONE_INK: Record<NonNullable<MentorEmptyStateProps["tone"]>, string> = {
  sky: "text-sky-600 dark:text-sky-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  violet: "text-violet-600 dark:text-violet-300",
  rose: "text-rose-600 dark:text-rose-300",
};

export function MentorEmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "sky",
  className,
}: MentorEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl p-10 ring-1 ring-inset",
        "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
        "dark:bg-white/[0.03] dark:ring-white/5",
        className
      )}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:14px_14px] opacity-[0.16]"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br opacity-50 blur-3xl",
          TONE_HALO[tone]
        )}
      />
      <div className="relative flex flex-col items-center text-center">
        <div
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ring-inset",
            TONE_RING[tone],
            TONE_BG[tone]
          )}>
          <Icon className={cn("h-7 w-7", TONE_INK[tone])} aria-hidden />
        </div>
        <h3 className="mt-4 text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </motion.div>
  );
}
