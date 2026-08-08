/**
 * CommandBar — Mentor Interview list filter strip.
 * Single, dense, sticky-friendly bar that combines:
 *   - Search input (left, flexible)
 *   - Status segmented control (right)
 *   - Clear & reload actions (far right)
 *
 * No card-on-card-of-cards. No four equal rows. Stays a single horizontal
 * strip so the page reads like a real command bar, not a settings page.
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Filter, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type CommandBarStatus = "all" | "SCHEDULED" | "PAID" | "ONGOING" | "COMPLETED";

export interface CommandBarProps {
  searchValue: string;
  onSearchChange: (_value: string) => void;
  searchPlaceholder?: string;
  status: CommandBarStatus;
  onStatusChange: (_value: CommandBarStatus) => void;
  statusOptions: { value: CommandBarStatus; label: string; count?: number }[];
  sortSlot?: ReactNode;
  onClear?: () => void;
  className?: string;
}

export function CommandBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  statusOptions,
  sortSlot,
  onClear,
  className,
}: CommandBarProps) {
  const { t } = useTranslation();
  const isDirty = !!searchValue || status !== "all";
  return (
    <div
      className={cn(
        "sticky top-2 z-10 flex flex-col gap-3 rounded-xl p-3 backdrop-blur-md sm:flex-row sm:items-center",
        "bg-white/85 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/70 ring-inset",
        "dark:bg-slate-950/60 dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] dark:ring-white/5",
        className
      )}>
      {/* Search input */}
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder ?? t("mentorSessions.searchBySessionIdStudent")}
          className="border-slate-200 bg-white pl-9 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* Status segmented control */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100/80 p-1 dark:bg-slate-800/60">
        {statusOptions.map((opt) => {
          const active = opt.value === status;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              aria-pressed={active}
              className={cn(
                "relative flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              )}>
              {active && (
                <motion.span
                  layoutId="command-bar-status-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-md bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10"
                />
              )}
              <span className="relative">{opt.label}</span>
              {typeof opt.count === "number" && (
                <span
                  className={cn(
                    "relative rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                    active
                      ? "bg-slate-900/5 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                      : "bg-slate-200/70 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300"
                  )}>
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort slot */}
      {sortSlot && (
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white px-2 py-1 dark:border-white/5 dark:bg-slate-900">
          <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden />
          <div className="flex items-center gap-1">{sortSlot}</div>
        </div>
      )}

      {onClear && isDirty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 gap-1 px-2 text-xs text-slate-600 dark:text-slate-300">
          <X className="h-3 w-3" aria-hidden />
          {t("common.clearFilter")}
        </Button>
      )}
    </div>
  );
}
