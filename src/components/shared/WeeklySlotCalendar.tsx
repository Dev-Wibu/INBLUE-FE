import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * One bookable slot returned by `GET /api/kiosks/{kioskId}/slots?date=YYYY-MM-DD`.
 * `startTime`/`endTime` are full ISO datetimes (date + time-of-day). The display
 * calendar groups these by `date(time-of-day(startTime))` so multiple slot
 * payloads (one per day in the week) merge into a single grid.
 */
export interface WeeklySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface WeeklySlotCalendarProps {
  /**
   * First day of the visible week (Mon-based). Component re-renders all 7
   * columns when this changes.
   */
  weekStart: Date;
  onChangeWeek: (_weekStart: Date) => void;
  /**
   * Aggregated slots across the visible week. Caller is responsible for the
   * fetching (typically via `useKioskWeekSlots` which fires 7 parallel
   * `/api/kiosks/{id}/slots?date=...` calls per mockup guidance).
   */
  slots: WeeklySlot[];
  onSelectSlot: (_slot: WeeklySlot) => void;
  selectedSlotKey?: string | null;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

function slotKey(slot: { startTime: string; endTime: string }): string {
  return `${slot.startTime}__${slot.endTime}`;
}

function safeDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * YYYY-MM-DD using the *local* clock. We need this so the cell `dayKey`
 * (computed from a `Date` that we built from `weekStart` in local time) and
 * the slot `dayKey` (computed from a parsed ISO string) agree when the
 * ISO string carries no explicit offset / BE/JVM serialises it as local
 * midnight. Keeps slots from disappearing into the wrong day cell.
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Weekly kiosk slot calendar — mockup from `docs/mentor_booking_ui_mockup.html`.
 * Columns are days (Mon → Sun), rows are unique start-times within the week.
 *
 * Notes:
 *  - Slot duration is NOT computed on FE; we derive the set of distinct
 *    `HH:mm` start-times from the payload (BE includes `startTime → endTime`
 *    explicitly per API contract).
 *  - 15' break is BE-side; FE just renders what it gets.
 *  - Empty cells = day off / outside working hours.
 */
export function WeeklySlotCalendar({
  weekStart,
  onChangeWeek,
  slots,
  onSelectSlot,
  selectedSlotKey = null,
  isLoading = false,
  className,
  disabled = false,
  emptyMessage,
}: WeeklySlotCalendarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? undefined : vi;

  const monday = useMemo(() => startOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(monday, i)),
    [monday]
  );
  const today = useMemo(() => startOfDay(new Date()), []);

  // Group slots by (day-of-week, time-of-day) so we know which cells to render.
  // We DO NOT rely on `format(slot, "yyyy-MM-dd")` here: date-fns formats using
  // the *browser-local* clock, but `weekStart` is also local, so both keys agree
  // as long as we project the slot's local date components directly. We use a
  // hand-rolled helper instead of `format` to avoid any timezone ambiguity (e.g.
  // ISO strings without an explicit offset).
  const slotsByDayHour = useMemo(() => {
    const map = new Map<string, WeeklySlot[]>();
    for (const slot of slots) {
      const start = safeDate(slot.startTime);
      if (!start) continue;
      const dayKey = localDayKey(start);
      const hourKey = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
      const k = `${dayKey}__${hourKey}`;
      const list = map.get(k) ?? [];
      list.push(slot);
      map.set(k, list);
    }
    return map;
  }, [slots]);

  // Distinct time-of-day rows across the week (sorted ascending), again using
  // raw local time components to dodge any timezone weirdness with ISO strings.
  const timeRows = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slots) {
      const start = safeDate(slot.startTime);
      if (!start) continue;
      set.add(
        `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
      );
    }
    return Array.from(set).sort();
  }, [slots]);

  const weekRangeLabel = useMemo(() => {
    const last = weekDays[6] ?? monday;
    const sameMonth = monday.getMonth() === last.getMonth();
    if (sameMonth) {
      return `${format(monday, "d", { locale })} – ${format(last, "d MMMM yyyy", { locale })}`;
    }
    return `${format(monday, "d MMM", { locale })} – ${format(last, "d MMM yyyy", { locale })}`;
  }, [monday, weekDays, locale]);

  const goPrevWeek = () => onChangeWeek(addDays(monday, -7));
  const goNextWeek = () => onChangeWeek(addDays(monday, 7));

  const weekdayLabels = useMemo(() => {
    const ref = new Date(2024, 0, 1);
    return Array.from({ length: 7 }).map((_, idx) =>
      format(addDays(ref, idx), "EEEEEE", { locale })
    );
  }, [locale]);

  return (
    <div
      data-slot="weekly-slot-calendar"
      className={cn(
        "border-border bg-card text-card-foreground overflow-hidden rounded-2xl border shadow-sm",
        className
      )}>
      {/* Week navigation */}
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goPrevWeek}
          aria-label={t("common.slotCalendar.previousMonth", "Previous week")}
          className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 items-center justify-center gap-2">
          <h3
            className="text-base font-semibold capitalize sm:text-lg"
            aria-live="polite"
            data-testid="weekly-calendar-range">
            {weekRangeLabel}
          </h3>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goNextWeek}
          aria-label={t("common.slotCalendar.nextMonth", "Next week")}
          className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday header */}
      <div className="border-border bg-muted/30 grid grid-cols-[56px_repeat(7,_minmax(0,_1fr))] border-b text-center">
        <div className="text-muted-foreground px-1 py-2 text-[0.7rem] font-semibold tracking-wider uppercase" />
        {weekdayLabels.map((label, idx) => {
          const day = weekDays[idx];
          if (!day) return null;
          const isToday = isSameDay(day, today);
          return (
            <div
              key={label}
              className={cn(
                "text-muted-foreground min-w-0 truncate px-1 py-2 text-[0.7rem] font-semibold tracking-wider uppercase",
                isToday && "text-primary"
              )}>
              <div>{label}</div>
              <div
                className={cn(
                  "mt-0.5 text-[0.7rem] font-normal tracking-normal",
                  isToday
                    ? "bg-primary text-primary-foreground mx-auto inline-block rounded-full px-1.5"
                    : "text-muted-foreground/70"
                )}>
                {format(day, "d/M", { locale })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      {isLoading ? (
        <div className="text-muted-foreground border-border border-t p-6 text-center text-sm">
          {t("common.loading", "Loading...")}
        </div>
      ) : timeRows.length === 0 ? (
        <div className="text-muted-foreground border-border border-t p-6 text-center text-sm">
          {emptyMessage ??
            t("common.slotCalendar.noSlotsForSelectedDate", "No time slots available this week.")}
        </div>
      ) : (
        <div
          role="grid"
          aria-label={t("common.slotCalendar.selectADate", "Select a weekly slot")}
          className="border-border border-t">
          {timeRows.map((time) => (
            <div
              key={time}
              className="border-border/60 grid grid-cols-[56px_repeat(7,_minmax(0,_1fr))] border-b last:border-b-0">
              <div className="text-muted-foreground flex items-start justify-end px-2 pt-2 text-[0.7rem] tabular-nums">
                {time}
              </div>
              {weekDays.map((day) => {
                const dayKey = localDayKey(day);
                const hourKey = `${dayKey}__${time}`;
                const cellSlots = slotsByDayHour.get(hourKey) ?? [];
                const isPast = day.getTime() < today.getTime();
                return (
                  <div
                    key={hourKey}
                    className="border-border/40 flex min-h-[56px] flex-col items-stretch gap-1 overflow-hidden border-l p-1">
                    {cellSlots.map((slot) => {
                      const key = slotKey(slot);
                      const isSelected = selectedSlotKey === key;
                      const start = safeDate(slot.startTime);
                      const end = safeDate(slot.endTime);
                      if (!start || !end) return null;
                      const slotDisabled = !slot.available || isPast || disabled;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={slotDisabled}
                          aria-pressed={isSelected}
                          onClick={() => onSelectSlot(slot)}
                          title={`${format(start, "HH:mm")} – ${format(end, "HH:mm")} · ${
                            slot.available
                              ? t("common.slotCalendar.available", "Available")
                              : t("common.slotCalendar.full", "Full")
                          }`}
                          className={cn(
                            "block w-full truncate rounded-md border px-1 py-0.5 text-center text-[0.65rem] font-medium tabular-nums transition-all",
                            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : slot.available
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
                                : "cursor-not-allowed border-dashed border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500",
                            isPast && "cursor-not-allowed border-dashed opacity-50 hover:bg-inherit"
                          )}>
                          {format(start, "HH:mm")}–{format(end, "HH:mm")}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
