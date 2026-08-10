/**
 * MentorStatusFilter — horizontal row of clickable filter pills used
 * below the command hero. Each pill has a label, count, and an icon.
 *
 * Reusable across Students / Reviews / Feedback list pages so the
 * status track vocabulary stays consistent.
 */

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

export interface MentorStatusItem {
  id: string;
  label: string;
  count: number;
  icon: LucideIcon;
  tone: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  /** Pulse hint (for "live" / "waiting" statuses). */
  pulse?: boolean;
  active?: boolean;
}

export interface MentorStatusFilterProps {
  items: MentorStatusItem[];
  onSelect: (_id: string) => void;
  className?: string;
  /** Optional accessible label for the group. */
  ariaLabel?: string;
}

const STATUS_TONE_CLASSES: Record<
  MentorStatusItem["tone"],
  { ink: string; dot: string; surface: string; ring: string; pulse: string; glow: string }
> = {
  sky: {
    ink: "text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    surface: "bg-sky-500/[0.08]",
    ring: "ring-sky-500/25",
    pulse: "bg-sky-400",
    glow: "from-sky-400/20 via-sky-400/0 to-transparent",
  },
  emerald: {
    ink: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    surface: "bg-emerald-500/[0.08]",
    ring: "ring-emerald-500/25",
    pulse: "bg-emerald-400",
    glow: "from-emerald-400/20 via-emerald-400/0 to-transparent",
  },
  amber: {
    ink: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    surface: "bg-amber-500/[0.08]",
    ring: "ring-amber-500/25",
    pulse: "bg-amber-400",
    glow: "from-amber-400/20 via-amber-400/0 to-transparent",
  },
  indigo: {
    ink: "text-indigo-700 dark:text-indigo-300",
    dot: "bg-indigo-500",
    surface: "bg-indigo-500/[0.08]",
    ring: "ring-indigo-500/25",
    pulse: "bg-indigo-400",
    glow: "from-indigo-400/20 via-indigo-400/0 to-transparent",
  },
  violet: {
    ink: "text-violet-700 dark:text-violet-300",
    dot: "bg-violet-500",
    surface: "bg-violet-500/[0.08]",
    ring: "ring-violet-500/25",
    pulse: "bg-violet-400",
    glow: "from-violet-400/20 via-violet-400/0 to-transparent",
  },
  rose: {
    ink: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    surface: "bg-rose-500/[0.08]",
    ring: "ring-rose-500/25",
    pulse: "bg-rose-400",
    glow: "from-rose-400/20 via-rose-400/0 to-transparent",
  },
};

export function MentorStatusFilter({
  items,
  onSelect,
  className,
  ariaLabel,
}: MentorStatusFilterProps) {
  if (items.length === 0) return null;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2",
        items.length === 1 && "sm:grid-cols-1",
        items.length === 2 && "sm:grid-cols-2",
        items.length === 3 && "sm:grid-cols-3",
        items.length >= 4 && "sm:grid-cols-2 lg:grid-cols-4",
        className
      )}>
      {items.map((item) => {
        const tone = STATUS_TONE_CLASSES[item.tone];
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.active}
            onClick={() => onSelect(item.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
              "group relative isolate flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-left",
              "ring-1 transition-colors ring-inset",
              item.active
                ? cn("ring-2", tone.ring, tone.surface)
                : "bg-white ring-slate-200/70 hover:bg-slate-50 dark:bg-slate-900/60 dark:ring-white/5 dark:hover:bg-slate-900"
            )}>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-0 transition-opacity duration-300",
                tone.glow,
                item.active && "opacity-100",
                !item.active && "group-hover:opacity-60"
              )}
            />
            <div
              className={cn(
                "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                item.active
                  ? cn(tone.ring, tone.surface, tone.ink)
                  : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-white/5"
              )}>
              <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="relative min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    "text-[10px] font-semibold tracking-[0.08em] uppercase",
                    item.active ? tone.ink : "text-slate-500 dark:text-slate-400"
                  )}>
                  {item.label}
                </p>
                {item.pulse && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className={cn(
                        "absolute inset-0 animate-ping rounded-full opacity-70",
                        tone.pulse
                      )}
                    />
                    <span
                      className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", tone.dot)}
                    />
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-xl font-bold tracking-[-0.03em] sm:text-2xl",
                  item.active
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-700 dark:text-slate-200"
                )}>
                {item.count}
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
