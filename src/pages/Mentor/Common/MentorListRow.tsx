/**
 * MentorListRow — opinionated rich card used by Mentor list pages
 * (Students / Reviews / Feedback). Designed to be visually distinct
 * per status via a tone rail on the left, not by full-color floods.
 *
 * Pure presentation. Pass an `onClick` (e.g. navigate to detail) to
 * make it act like a link. Pass an `actionSlot` for trailing buttons.
 */

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export interface MentorListRowProps {
  /** Left-side accent rail hue. Drives hover glow only — not the whole card. */
  tone: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
  /** Clickable wrapper (navigate to detail etc). */
  onClick?: () => void;
  /** Trailing action slot (e.g. quick actions, badges). */
  actionSlot?: ReactNode;
  /** Children rendered as the row body. */
  children: ReactNode;
  className?: string;
  /** Optional aria-label. */
  ariaLabel?: string;
}

const RAIL: Record<MentorListRowProps["tone"], string> = {
  sky: "before:bg-sky-400/70 dark:before:bg-sky-400/50",
  emerald: "before:bg-emerald-400/70 dark:before:bg-emerald-400/50",
  amber: "before:bg-amber-400/80 dark:before:bg-amber-400/60",
  indigo: "before:bg-indigo-400/70 dark:before:bg-indigo-400/50",
  violet: "before:bg-violet-400/70 dark:before:bg-violet-400/50",
  rose: "before:bg-rose-400/70 dark:before:bg-rose-400/50",
};

const GLOW: Record<MentorListRowProps["tone"], string> = {
  sky: "bg-sky-400/30 dark:bg-sky-500/20",
  emerald: "bg-emerald-400/30 dark:bg-emerald-500/20",
  amber: "bg-amber-400/30 dark:bg-amber-500/20",
  indigo: "bg-indigo-400/30 dark:bg-indigo-500/20",
  violet: "bg-violet-400/30 dark:bg-violet-500/20",
  rose: "bg-rose-400/30 dark:bg-rose-500/20",
};

const WASH: Record<MentorListRowProps["tone"], string> = {
  sky: "bg-sky-500/[0.04]",
  emerald: "bg-emerald-500/[0.04]",
  amber: "bg-amber-500/[0.04]",
  indigo: "bg-indigo-500/[0.04]",
  violet: "bg-violet-500/[0.04]",
  rose: "bg-rose-500/[0.04]",
};

export function MentorListRow({
  tone,
  onClick,
  actionSlot,
  children,
  className,
  ariaLabel,
}: MentorListRowProps) {
  const clickable = !!onClick;
  const Wrapper = clickable ? motion.button : motion.div;
  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      whileHover={clickable ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "group relative isolate flex w-full items-stretch gap-0 overflow-hidden rounded-2xl text-left",
        "ring-1 ring-slate-200/70 backdrop-blur-sm ring-inset",
        "dark:ring-white/5",
        "bg-white dark:bg-slate-900/70",
        clickable && "cursor-pointer",
        // 4px vertical rail (left) via :before
        "before:absolute before:top-0 before:left-0 before:h-full before:w-1 before:content-['']",
        RAIL[tone],
        // Subtle base wash
        WASH[tone],
        // Hover lift shadow (kept ≤12px blur to avoid "ghost card")
        "hover:shadow-[0_8px_24px_-16px_rgba(15,23,42,0.32)]",
        "dark:hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
        "transition-shadow",
        className
      )}>
      {/* Soft tone glow on hover */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-70",
          GLOW[tone]
        )}
      />
      <div className="relative flex flex-1 items-center gap-3 p-3.5 sm:p-4">{children}</div>
      {actionSlot && (
        <div className="relative flex shrink-0 items-center gap-2 p-3.5 sm:p-4">
          {actionSlot}
          {clickable && (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      )}
      {clickable && !actionSlot && (
        <div className="relative flex shrink-0 items-center pr-3.5 sm:pr-4">
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </Wrapper>
  );
}
