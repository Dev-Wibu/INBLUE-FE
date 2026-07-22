import { cn } from "@/lib/utils";
import { Clock, Hourglass, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DayOfWeek, KioskSchedule } from "../types";
import { DAYS_OF_WEEK } from "../types";

interface KioskScheduleGridProps {
  kioskId: number;
  schedules: KioskSchedule[];
  isLoading?: boolean;
  onCreateSchedule: (dayOfWeek: DayOfWeek) => void;
  onEditSchedule: (schedule: KioskSchedule) => void;
  onToggleStatus: (schedule: KioskSchedule) => void;
}

const formatTime = (time: string | undefined): string => {
  if (!time) return "—";
  return time.length >= 5 ? time.slice(0, 5) : time;
};

function getIsActive(schedule: KioskSchedule): boolean {
  const s = schedule as unknown as { isActive?: boolean; active?: boolean };
  return s.isActive ?? s.active ?? false;
}

export function KioskScheduleGrid({
  schedules,
  isLoading,
  onCreateSchedule,
  onEditSchedule,
  onToggleStatus,
}: KioskScheduleGridProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-[148px] animate-pulse rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mb-2 h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mb-4 h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-1/2 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
        ))}
      </div>
    );
  }

  const daysWithSchedule = new Set(schedules.map((s) => s.dayOfWeek).filter(Boolean));
  const activeCount = schedules.filter((s) => getIsActive(s)).length;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = schedules.find((s) => s.dayOfWeek === day);

          if (schedule) {
            const isActive = getIsActive(schedule);
            return (
              <div
                key={day}
                className={cn(
                  "flex min-h-[148px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
                  !isActive && "opacity-60"
                )}>
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t(`adminKioskManagement.days.${day}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleStatus(schedule)}
                      className={cn(
                        "h-2.5 w-2.5 cursor-pointer rounded-full ring-offset-1 transition-all hover:ring-2",
                        isActive
                          ? "bg-emerald-500 hover:ring-emerald-300 dark:ring-offset-slate-900"
                          : "bg-slate-400 hover:ring-slate-300 dark:bg-slate-500 dark:ring-offset-slate-900"
                      )}
                      title={
                        isActive
                          ? t("adminKioskManagement.deactivate")
                          : t("adminKioskManagement.activate")
                      }
                    />
                  </div>

                  <div className="mb-4 space-y-1">
                    <div className="flex items-center gap-2 font-mono text-sm text-slate-700 dark:text-slate-300">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {formatTime(schedule.openTime)} – {formatTime(schedule.closeTime)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Hourglass className="h-3 w-3" />
                    {schedule.slotDurationMinutes ?? "—"} {t("adminKioskManagement.minutes")}
                  </span>

                  <button
                    type="button"
                    onClick={() => onEditSchedule(schedule)}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400"
                    title={t("adminKioskManagement.editSchedule")}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={day}
              onClick={() => onCreateSchedule(day)}
              className="flex min-h-[148px] cursor-pointer flex-col rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20">
              <span className="mb-auto text-sm font-medium text-slate-400 dark:text-slate-500">
                {t(`adminKioskManagement.days.${day}`)}
              </span>

              <div className="mt-auto flex flex-col items-center justify-center gap-2 pb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
                  <Plus className="h-4 w-4 text-slate-400" />
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {t("adminKioskManagement.addSchedule")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
        {daysWithSchedule.size}/7 {t("adminKioskManagement.daysWithSchedule")} · {activeCount}{" "}
        {t("adminKioskManagement.activeScheduleSummary")}
      </div>
    </div>
  );
}
