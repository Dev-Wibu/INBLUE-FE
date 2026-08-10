/**
 * HeroCommand + StatusTrack — Mentor Interview "Command Deck" primitives.
 * Replaces the old giant gradient header + 4-up bento tiles with:
 *   - A dense, dark "mission control" hero strip (no oversized gradient).
 *   - A horizontal status track: one anchor metric + 3 clickable status
 *     filter pills with counts and live pulses.
 *
 * Pure presentation. No fetching, no mutation handlers beyond onFilter.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Calendar, CircleDot, Hourglass, Radio, RefreshCw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface StatusTrackItem {
  id: string;
  label: string;
  count: number;
  /** Tailored icon. */
  icon: typeof Calendar;
  /** Color hue. */
  tone: "sky" | "emerald" | "amber" | "indigo";
  /** Active state. */
  active?: boolean;
  /** Pulse hint (for "live" statuses). */
  pulse?: boolean;
}

export interface StatusTrackProps {
  items: StatusTrackItem[];
  onSelect: (_id: string) => void;
  className?: string;
}

const STATUS_TONE_CLASSES: Record<
  StatusTrackItem["tone"],
  {
    ink: string;
    dot: string;
    surface: string;
    ring: string;
    pulse: string;
    glow: string;
  }
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
};

export function StatusTrack({ items, onSelect, className }: StatusTrackProps) {
  if (items.length === 0) return null;
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => {
        const tone = STATUS_TONE_CLASSES[item.tone];
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            aria-pressed={item.active}
            className={cn(
              "group relative isolate flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-left",
              "ring-1 transition-colors ring-inset",
              item.active
                ? cn("ring-2", tone.ring, tone.surface)
                : "bg-white ring-slate-200/70 hover:bg-slate-50 dark:bg-slate-900/60 dark:ring-white/5 dark:hover:bg-slate-900"
            )}>
            {/* tone glow that fades in on hover/active */}
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
                  "font-bold tracking-[-0.03em]",
                  item.active
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-700 dark:text-slate-200",
                  "text-xl sm:text-2xl"
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

// ────────────────────────────────────────────────────────────────────────────
// HeroCommand — dense, dark "mission control" hero strip. No oversized
// gradient. Just a confident, deep-navy slab with crisp info hierarchy.
// ────────────────────────────────────────────────────────────────────────────

export interface HeroCommandProps {
  /** Mentor display name (optional). */
  mentorName?: string;
  /** Reload handler. */
  onReload: () => void | Promise<void>;
  /** Reload pending state. */
  isReloading: boolean;
  /** Tooltip/title for the reload button. */
  reloadTooltip: string;
  /** Total sessions — anchor metric. */
  totalSessions: number;
  /** Up Next card content (optional). */
  upNext?: {
    title: string;
    whenLabel: string;
    countdownLabel?: string;
    studentLabel: string;
  } | null;
  className?: string;
}

export function HeroCommand({
  mentorName,
  onReload,
  isReloading,
  reloadTooltip,
  totalSessions,
  upNext,
  className,
}: HeroCommandProps) {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-2xl",
        // Deep, quiet base — not a "hero gradient" SaaS template.
        "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
        "ring-1 ring-slate-200 ring-inset dark:ring-white/10 dark:ring-inset",
        // Crisp inner ring to add depth without harshness.
        "shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_18px_50px_-30px_rgba(0,0,0,0.7)]",
        className
      )}>
      {/* Subtle dotted grid + soft radial spotlight — gives "command center" depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(148,163,184,0.5)_1px,transparent_1px)] [background-size:14px_14px] opacity-[0.25] dark:[background-image:radial-gradient(rgba(148,163,184,0.35)_1px,transparent_1px)] dark:opacity-[0.18]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 opacity-60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -bottom-24 h-56 w-56 rounded-full bg-sky-500/15 opacity-60 blur-3xl"
      />

      <div className="relative grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6 sm:p-6">
        {/* LEFT — identity + anchor metric */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10 ring-inset dark:bg-white/5 dark:ring-white/10">
              <Radio className="h-4 w-4 text-sky-400 dark:text-sky-300" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                {t("mentorSessions.interviewSession")}
              </p>
              <h1
                className="truncate text-lg font-semibold tracking-[-0.02em] text-pretty text-slate-900 sm:text-xl dark:text-white"
                style={{ textWrap: "balance" }}>
                {mentorName ? `${mentorName}` : t("mentorSessions.interviewSession")}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">
                {t("common.totalSession")}
              </p>
              <p className="text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl dark:text-white">
                {totalSessions}
              </p>
            </div>
            <div className="hidden h-10 w-px bg-slate-200 sm:block dark:bg-white/10" />
            <p className="max-w-md text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              {t("mentorSessions.manageInterviewSessionsAndSend")}
            </p>
          </div>
        </div>

        {/* RIGHT — Up Next spotlight + reload */}
        <div className="flex items-start justify-end gap-3">
          {upNext ? (
            <div
              className={cn(
                "group relative flex min-w-[220px] flex-col gap-2 overflow-hidden rounded-xl p-3",
                "bg-white/10 ring-1 ring-white/10 backdrop-blur ring-inset dark:bg-white/[0.04] dark:ring-white/10"
              )}>
              <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -right-10 h-24 w-24 rounded-full bg-sky-500/30 opacity-70 blur-2xl"
              />
              <div className="relative flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-sky-400 dark:text-sky-300" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-300 uppercase dark:text-slate-300">
                  {t("common.sessionIsComingSoon")}
                </p>
              </div>
              <p className="relative truncate text-sm font-semibold tracking-[-0.01em] text-white">
                {upNext.title}
              </p>
              <p className="relative truncate text-xs text-slate-400">{upNext.studentLabel}</p>
              <div className="relative mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-200 ring-1 ring-sky-400/30 ring-inset dark:bg-sky-500/15 dark:text-sky-200">
                  <Hourglass className="h-3 w-3" aria-hidden />
                  {upNext.countdownLabel}
                </span>
                <span className="text-[11px] text-slate-400">{upNext.whenLabel}</span>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "flex min-w-[220px] flex-col gap-2 rounded-xl p-3",
                "bg-white/5 ring-1 ring-white/10 ring-inset dark:bg-white/[0.03] dark:ring-white/10"
              )}>
              <div className="flex items-center gap-1.5">
                <CircleDot className="h-3 w-3 text-slate-400" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  {t("common.sessionIsComingSoon")}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                {t("common.youHaveNotHadAnyInterviewSessions")}
              </p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void onReload()}
            disabled={isReloading}
            aria-label={reloadTooltip}
            title={reloadTooltip}
            className="h-9 w-9 shrink-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white">
            <RefreshCw className={cn("h-4 w-4", isReloading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}
