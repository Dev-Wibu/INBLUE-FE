/**
 * Mentor Common — constants & small pure helpers used by every Mentor
 * list page. Split out so component files stay component-only.
 */

import type { LucideIcon } from "lucide-react";

/**
 * Single dark-glass surface used by every Mentor inner card. No fruit
 * salad. Keeps border ≤1px and shadow ≤24px blur to avoid the
 * "ghost card" anti-pattern.
 */
export const MENTOR_GLASS_SURFACE =
  "rounded-2xl p-4 ring-1 ring-inset transition-all " +
  "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm " +
  "dark:bg-white/[0.03] dark:ring-white/5";

/**
 * Pill style for inline labels (eyebrows, status, counts). Always
 * uppercase tracked. Single tone — no fruit salad.
 */
export const MENTOR_EYEBROW =
  "text-[10px] font-semibold tracking-[0.08em] uppercase text-slate-500 dark:text-slate-400";

/**
 * Container styles. Used to wrap list sections so they stay readable
 * without inventing new card borders.
 */
export const MENTOR_SECTION_CLASS = "flex flex-col gap-4";

/**
 * Helper to build a list of stat tiles for any mentor list page.
 */
export interface MentorStatTile {
  id: string;
  label: string;
  value: number | string;
  caption?: string;
  icon: LucideIcon;
  tone: "sky" | "emerald" | "amber" | "indigo" | "violet" | "rose";
}

export type MentorStatTone = MentorStatTile["tone"];
