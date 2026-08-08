/**
 * Non-component constants and helpers shared by Mentor Interview Session
 * primitives. Split out into its own file so the component files pass
 * `react-refresh/only-export-components` (Fast Refresh rule).
 */

/**
 * Status tone descriptor used by SessionStatusBadge and other primitives.
 * Each tone drives both the badge fill and the glow it emits on hover,
 * but never the layout. Tones are intentionally non-AI-slop: they pick
 * distinct hues per status instead of relying on a single accent ramp.
 */
export type SessionStatusTone =
  | "draft"
  | "scheduled"
  | "paid"
  | "ongoing"
  | "completed"
  | "rejected"
  | "canceled";

/**
 * Compact, semantic palette used by the Mentor Interview Command Center.
 * Tuned to read clearly on both deep navy dark mode and warm-tinted light
 * mode. Hover glow stays ≤8px blur to avoid the "ghost card" tell.
 */
export const sessionStatusPalette: Record<
  SessionStatusTone,
  { dot: string; surface: string; ink: string; ring: string; pulse: boolean }
> = {
  draft: {
    dot: "bg-amber-500",
    surface:
      "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300 dark:bg-amber-500/10",
    ink: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/30",
    pulse: false,
  },
  scheduled: {
    dot: "bg-sky-500",
    surface: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300 dark:bg-sky-500/10",
    ink: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/30",
    pulse: true,
  },
  paid: {
    dot: "bg-emerald-500",
    surface:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300 dark:bg-emerald-500/10",
    ink: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/30",
    pulse: false,
  },
  ongoing: {
    dot: "bg-emerald-400",
    surface:
      "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300 dark:bg-emerald-500/15",
    ink: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/40",
    pulse: true,
  },
  completed: {
    dot: "bg-slate-400",
    surface:
      "bg-slate-500/10 text-slate-700 ring-slate-500/25 dark:text-slate-300 dark:bg-slate-500/10",
    ink: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-500/20",
    pulse: false,
  },
  rejected: {
    dot: "bg-rose-500",
    surface: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300 dark:bg-rose-500/10",
    ink: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/30",
    pulse: false,
  },
  canceled: {
    dot: "bg-rose-400",
    surface: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300 dark:bg-rose-500/10",
    ink: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/30",
    pulse: false,
  },
};

/**
 * Status tone derived from BE status enum. Keep mapping here so multiple
 * pages stay consistent and the BE enum never leaks into JSX.
 */
export function sessionToneFromStatus(status?: string | null): SessionStatusTone {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "SCHEDULED":
      return "scheduled";
    case "PAID":
      return "paid";
    case "ONGOING":
      return "ongoing";
    case "COMPLETED":
      return "completed";
    case "REJECTED":
      return "rejected";
    case "CANCELED":
      return "canceled";
    default:
      return "scheduled";
  }
}

export const META_CHIP_TONES = {
  neutral: "ring-slate-500/20 text-slate-700 dark:text-slate-300 bg-slate-500/5",
  indigo: "ring-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/8",
  amber: "ring-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/8",
  emerald: "ring-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/8",
  rose: "ring-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/8",
  sky: "ring-sky-500/30 text-sky-700 dark:text-sky-300 bg-sky-500/8",
} as const;

export type MetaChipTone = keyof typeof META_CHIP_TONES;

export function metaChipClass(tone: MetaChipTone): string {
  return META_CHIP_TONES[tone];
}

/**
 * Tone → class map for SessionCard's soft glow. Kept here so the card file
 * stays component-only and Fast-Refresh-friendly.
 */
export const SESSION_CARD_GLOW: Record<SessionStatusTone, string> = {
  draft: "bg-amber-400/30 dark:bg-amber-500/20",
  scheduled: "bg-sky-400/30 dark:bg-sky-500/20",
  paid: "bg-emerald-400/30 dark:bg-emerald-500/20",
  ongoing: "bg-emerald-300/40 dark:bg-emerald-400/25",
  completed: "bg-emerald-400/30 dark:bg-emerald-500/20",
  rejected: "bg-rose-400/30 dark:bg-rose-500/20",
  canceled: "bg-rose-400/30 dark:bg-rose-500/20",
};

/**
 * Bento tile tone palette. Mirrors the project's primary chart hues so
 * tiles read distinctly without becoming a 4-up "SaaaS hero metric" tell.
 */
export const STATS_TONE_CLASSES: Record<
  string,
  { surface: string; ink: string; ring: string; glow: string }
> = {
  indigo: {
    surface: "bg-indigo-500/10 ring-indigo-500/25 dark:bg-indigo-400/10",
    ink: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-500/20",
    glow: "bg-indigo-400/40 dark:bg-indigo-500/30",
  },
  sky: {
    surface: "bg-sky-500/10 ring-sky-500/25 dark:bg-sky-400/10",
    ink: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
    glow: "bg-sky-400/40 dark:bg-sky-500/30",
  },
  emerald: {
    surface: "bg-emerald-500/10 ring-emerald-500/25 dark:bg-emerald-400/10",
    ink: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
    glow: "bg-emerald-400/40 dark:bg-emerald-500/30",
  },
  amber: {
    surface: "bg-amber-500/10 ring-amber-500/25 dark:bg-amber-400/10",
    ink: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-500/20",
    glow: "bg-amber-400/40 dark:bg-amber-500/30",
  },
};

export type StatsToneKey = keyof typeof STATS_TONE_CLASSES;

/**
 * Builder for the canonical 4-tile bento set used by Mentor Interview List.
 * Lives here (constants file) so the StatsPanel component file stays
 * Fast-Refresh clean.
 */
import type { LucideIcon } from "lucide-react";
import { Calendar, Check, MessageSquare, Video } from "lucide-react";

export interface StatsTile {
  id: string;
  label: string;
  caption?: string;
  value: number | string;
  icon: LucideIcon;
  tone: StatsToneKey;
}

export function buildMentorInterviewTiles(input: {
  total: number;
  upcoming: number;
  completed: number;
  waitingForReview: number;
  t: (_key: string, _options?: Record<string, unknown>) => string;
}): StatsTile[] {
  return [
    {
      id: "total",
      label: input.t("common.totalSession"),
      value: input.total,
      caption: `${input.completed} ${input.t("general.completed").toLowerCase()}`,
      icon: Video,
      tone: "indigo",
    },
    {
      id: "upcoming",
      label: input.t("common.comingSoon"),
      value: input.upcoming,
      caption: `${input.t("common.scheduled")} · ${input.t("common.paid")} · ${input.t("common.ongoing")}`,
      icon: Calendar,
      tone: "sky",
    },
    {
      id: "completed",
      label: input.t("general.completed"),
      value: input.completed,
      caption: input.t("mentorOverview.complete"),
      icon: Check,
      tone: "emerald",
    },
    {
      id: "waiting",
      label: input.t("common.waitingForReview"),
      value: input.waitingForReview,
      caption: input.t("common.waitingForReview"),
      icon: MessageSquare,
      tone: "amber",
    },
  ];
}

/**
 * Defensive local helper. Wraps Date.parse so the page component can
 * import a single symbol instead of pulling the whole formatting module
 * for this specific need.
 */
export function toTimestampSafe(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
