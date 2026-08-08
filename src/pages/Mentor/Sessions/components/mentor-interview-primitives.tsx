/**
 * Mentor Interview Session primitives — component-only file.
 * Constants and helpers live in ./mentor-interview.constants.ts so this
 * file can keep the Fast Refresh `react-refresh/only-export-components`
 * rule happy.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  metaChipClass,
  sessionStatusPalette,
  type MetaChipTone,
  type SessionStatusTone,
} from "./mentor-interview.constants";

export interface SessionStatusBadgeProps {
  tone: SessionStatusTone;
  label: string;
  /** When true, omits the dot (useful inside icon buttons). */
  compact?: boolean;
  className?: string;
}

/**
 * Status badge with an optional live-pulse dot for "scheduled" / "ongoing"
 * sessions. Replaces the ad-hoc Tailwind badge classes that were scattered
 * across Mentor Sessions pages.
 */
export function SessionStatusBadge({ tone, label, compact, className }: SessionStatusBadgeProps) {
  const palette = sessionStatusPalette[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        palette.surface,
        className
      )}>
      {!compact && (
        <span className="relative flex h-1.5 w-1.5">
          {palette.pulse && (
            <span
              className={cn("absolute inset-0 animate-ping rounded-full opacity-60", palette.dot)}
              aria-hidden
            />
          )}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", palette.dot)} />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}

/**
 * Shared meta-chip for session detail / review detail headers. Replaces the
 * grid-of-grey-cards pattern: each chip is its own visual atom, not a
 * uniform row of identical cards.
 */
export interface MetaChipProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: MetaChipTone;
}

export function MetaChip({ icon, label, value, tone = "neutral" }: MetaChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ring-1 ring-inset",
        metaChipClass(tone)
      )}>
      <span className="opacity-80">{icon}</span>
      <span className="text-[10px] font-medium tracking-wide uppercase opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

/**
 * Glass card surface used by Mentor Interview Command Center panels. Keeps
 * border ≤1px and shadow ≤8px blur so we never produce the "ghost card"
 * tell (1px border + heavy shadow stacked on the same element).
 */
export interface PanelSurfaceProps {
  children: ReactNode;
  className?: string;
  /**
   * "raised" — solid panel with a soft inner shadow
   * "flat" — border-only, no shadow
   * "flush" — borderless surface meant to sit on top of another panel
   */
  variant?: "raised" | "flat" | "flush";
}

export function PanelSurface({ children, className, variant = "raised" }: PanelSurfaceProps) {
  const base = "rounded-2xl ring-1 ring-inset ring-white/5 dark:ring-white/5";
  const variantClass =
    variant === "raised"
      ? "bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.18)] dark:bg-slate-900/70 dark:shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)] backdrop-blur"
      : variant === "flat"
        ? "bg-white dark:bg-slate-900/60"
        : "bg-slate-50/60 dark:bg-slate-900/40";
  return <div className={cn(base, variantClass, className)}>{children}</div>;
}

/**
 * Subtle section heading that follows the project's typography rules:
 * tight tracking (-0.02em on h2/h3 — never tighter), balance text-wrap,
 * and no eyebrow kicker. Section meta can sit on the right via `meta`.
 */
export interface SectionHeadingProps {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  level?: 2 | 3;
}

export function SectionHeading({ title, subtitle, meta, level = 2 }: SectionHeadingProps) {
  const Tag = level === 3 ? "h3" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Tag
          className="text-lg font-semibold tracking-[-0.02em] text-pretty text-slate-900 sm:text-xl dark:text-slate-100"
          style={{ textWrap: "balance" }}>
          {title}
        </Tag>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {meta && <div className="flex shrink-0 items-center gap-2">{meta}</div>}
    </div>
  );
}
