/**
 * MentorCommandHero — dense, dark "command deck" hero used at the top
 * of Mentor list pages (Students / Reviews / Feedback).
 *
 * Distinct from `HeroCommand` (Sessions) only by copy: keeps the same
 * deep-navy slab aesthetic but exposes a flexible `identity`, `anchor`
 * and optional `spotlight` slot so each list page can swap content.
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Radio, RefreshCw, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface MentorCommandHeroProps {
  /** Eyebrow label above the title — usually the page category. */
  eyebrow: string;
  /** Big title — usually the page heading. */
  title: string;
  /** Sub-line under the title. Optional. */
  subtitle?: string;
  /** Reload handler. */
  onReload: () => void | Promise<void>;
  /** Reload pending state. */
  isReloading: boolean;
  /** Tooltip/title for the reload button. */
  reloadTooltip: string;
  /** Anchor metric label + value rendered in the left slab. */
  anchor: { label: string; value: number | string };
  /** Small icon badge shown above the title (matches page hue). */
  iconBadge: LucideIcon;
  /** Tint hue for the icon badge. */
  tone?: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  /** Right-side spotlight slot — page-specific quick info. */
  spotlight?: ReactNode;
  className?: string;
}

const TONE_RING: Record<NonNullable<MentorCommandHeroProps["tone"]>, string> = {
  sky: "ring-sky-300 text-sky-600 dark:text-sky-400",
  emerald: "ring-emerald-300 text-emerald-600 dark:text-emerald-400",
  amber: "ring-amber-300 text-amber-600 dark:text-amber-400",
  indigo: "ring-indigo-300 text-indigo-600 dark:text-indigo-400",
  violet: "ring-violet-300 text-violet-600 dark:text-violet-400",
  rose: "ring-rose-300 text-rose-600 dark:text-rose-400",
};

export function MentorCommandHero({
  eyebrow,
  title,
  subtitle,
  onReload,
  isReloading,
  reloadTooltip,
  anchor,
  iconBadge: IconBadge,
  tone = "sky",
  spotlight,
  className,
}: MentorCommandHeroProps) {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950",
        className
      )}>
      {/* Subtle dotted grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(148,163,184,0.4)_1px,transparent_1px)] [background-size:14px_14px] opacity-[0.2] dark:opacity-[0.12]"
      />

      <div className="relative grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-6 sm:p-6">
        {/* LEFT — identity + anchor metric */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg ring-1 ring-inset",
                TONE_RING[tone]
              )}>
              <IconBadge className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                {eyebrow}
              </p>
              <h1
                className="truncate text-lg font-semibold tracking-[-0.02em] text-slate-900 sm:text-xl dark:text-white"
                style={{ textWrap: "balance" }}>
                {title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase dark:text-slate-400">
                {anchor.label}
              </p>
              <p className="text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl dark:text-white">
                {anchor.value}
              </p>
            </div>
            <div className="hidden h-10 w-px bg-slate-200 sm:block dark:bg-white/10" />
            {subtitle && (
              <p className="max-w-md text-xs text-slate-500 sm:text-sm dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — Spotlight + reload */}
        <div className="flex items-start justify-end gap-3">
          {spotlight ? (
            <div className="flex min-w-[220px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-500" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                  {t("mentorSessions.interviewSession")}
                </p>
              </div>
              {spotlight}
            </div>
          ) : (
            <div className="flex min-w-[220px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-slate-400" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  {t("mentorSessions.interviewSession")}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("mentorSessions.interviewSession")}
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
            className="h-9 w-9 shrink-0 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100">
            <RefreshCw className={cn("h-4 w-4", isReloading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* SpotlightBlock and motionConfig re-exports moved to separate
   component file to keep this file Fast-Refresh-friendly. */
