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
  sky: "ring-sky-400/30 text-sky-300 bg-sky-500/10",
  emerald: "ring-emerald-400/30 text-emerald-300 bg-emerald-500/10",
  amber: "ring-amber-400/30 text-amber-300 bg-amber-500/10",
  indigo: "ring-indigo-400/30 text-indigo-300 bg-indigo-500/10",
  violet: "ring-violet-400/30 text-violet-300 bg-violet-500/10",
  rose: "ring-rose-400/30 text-rose-300 bg-rose-500/10",
};

const TONE_GLOW: Record<NonNullable<MentorCommandHeroProps["tone"]>, string> = {
  sky: "bg-sky-400/25",
  emerald: "bg-emerald-400/25",
  amber: "bg-amber-400/25",
  indigo: "bg-indigo-400/25",
  violet: "bg-violet-400/25",
  rose: "bg-rose-400/25",
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
        "relative isolate overflow-hidden rounded-2xl",
        "bg-slate-950 text-slate-100",
        "ring-1 ring-white/10 ring-inset",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_18px_50px_-30px_rgba(0,0,0,0.7)]",
        className
      )}>
      {/* Subtle dotted grid + soft radial spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:14px_14px] opacity-[0.18]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/3 h-72 w-72 rounded-full opacity-60 blur-3xl"
        style={{ backgroundColor: "transparent" }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-16 -bottom-24 h-56 w-56 rounded-full opacity-60 blur-3xl",
          TONE_GLOW[tone]
        )}
      />
      {/* Tone corner accent */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 left-6 h-32 w-32 rounded-full opacity-50 blur-3xl",
          TONE_GLOW[tone]
        )}
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
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                {eyebrow}
              </p>
              <h1
                className="truncate text-lg font-semibold tracking-[-0.02em] text-pretty text-white sm:text-xl"
                style={{ textWrap: "balance" }}>
                {title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                {anchor.label}
              </p>
              <p className="text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                {anchor.value}
              </p>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            {subtitle && <p className="max-w-md text-xs text-slate-400 sm:text-sm">{subtitle}</p>}
          </div>
        </div>

        {/* RIGHT — Spotlight + reload */}
        <div className="flex items-start justify-end gap-3">
          {spotlight ? (
            <div
              className={cn(
                "group relative flex min-w-[220px] flex-col gap-2 overflow-hidden rounded-xl p-3",
                "bg-white/[0.04] ring-1 ring-white/10 backdrop-blur ring-inset"
              )}>
              <div className="relative flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-slate-300" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-300 uppercase">
                  {t("mentorSessions.interviewSession")}
                </p>
              </div>
              {spotlight}
            </div>
          ) : (
            <div
              className={cn(
                "flex min-w-[220px] flex-col gap-2 rounded-xl p-3",
                "bg-white/[0.03] ring-1 ring-white/10 ring-inset"
              )}>
              <div className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-slate-400" aria-hidden />
                <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  {t("mentorSessions.interviewSession")}
                </p>
              </div>
              <p className="text-xs text-slate-500">{t("mentorSessions.interviewSession")}</p>
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
            className="h-9 w-9 shrink-0 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white">
            <RefreshCw className={cn("h-4 w-4", isReloading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}

/* SpotlightBlock and motionConfig re-exports moved to separate
   component file to keep this file Fast-Refresh-friendly. */
