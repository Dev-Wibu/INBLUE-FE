/**
 * StatsPanel — Asymmetric bento tiles for the Mentor Interview Command Center.
 * Pure presentation: takes pre-built tiles and renders an asymmetric grid.
 * One tile is intentionally larger (Total) to anchor the eye and avoid the
 * "4 identical horizontal cards" SaaS template.
 *
 * Tile construction (icons, labels) lives in
 * `mentor-interview.constants.ts#buildMentorInterviewTiles` so this file
 * stays Fast-Refresh clean.
 */

import { cn } from "@/lib/utils";
import {
  STATS_TONE_CLASSES,
  type StatsTile,
  type StatsToneKey,
} from "./mentor-interview.constants";

export interface StatsPanelProps {
  tiles: StatsTile[];
  className?: string;
}

/**
 * 12-col grid where the first tile spans 6 cols and the rest span 3/3/4/4
 * on wide screens, stacking gracefully on narrow screens. The asymmetry
 * avoids the "identical card row" tell.
 */
export function StatsPanel({ tiles, className }: StatsPanelProps) {
  if (tiles.length === 0) return null;
  return (
    <div className={cn("grid gap-3 sm:grid-cols-6 xl:grid-cols-12", className)}>
      {tiles.map((tile, index) => {
        const tone = STATS_TONE_CLASSES[tile.tone as StatsToneKey] ?? STATS_TONE_CLASSES.indigo;
        // First tile = anchor (wide). Second & third = medium. Fourth = wide side.
        const spanClass = cn(
          "sm:col-span-3",
          index === 0 && "xl:col-span-5",
          index === 1 && "xl:col-span-3",
          index === 2 && "xl:col-span-2",
          index === 3 && "xl:col-span-2"
        );

        return (
          <div
            key={tile.id}
            className={cn(
              "group relative overflow-hidden rounded-2xl p-4 ring-1 transition-all ring-inset hover:-translate-y-0.5",
              tone.surface,
              tone.ring,
              spanClass
            )}>
            {/* Subtle tone glow, max 8px to avoid the ghost-card tell */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full opacity-50 blur-2xl transition-opacity group-hover:opacity-80",
                tone.glow
              )}
            />

            <div className="relative flex items-start justify-between">
              <p
                className={cn(
                  "text-[10px] font-semibold tracking-[0.08em] uppercase opacity-80",
                  tone.ink
                )}>
                {tile.label}
              </p>
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg ring-1 transition-transform ring-inset group-hover:scale-110",
                  tone.surface,
                  tone.ink,
                  tone.ring
                )}>
                <tile.icon className="h-3.5 w-3.5" aria-hidden />
              </div>
            </div>
            <p
              className={cn(
                "relative mt-2 font-bold tracking-[-0.03em] text-slate-900 dark:text-slate-100",
                index === 0 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
              )}>
              {tile.value}
            </p>
            {tile.caption && (
              <p className="relative mt-1 text-xs text-slate-500 dark:text-slate-400">
                {tile.caption}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
