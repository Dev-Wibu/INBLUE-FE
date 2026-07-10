import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, isSameDay, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface SlotCalendarSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface SlotCalendarProps {
  selectedDate: Date;
  onSelectDate: (_date: Date) => void;
  slots: SlotCalendarSlot[];
  onSelectSlot: (_slot: SlotCalendarSlot) => void;
  selectedSlotKey?: string | null;
  isLoading?: boolean;
  emptyMessage?: string;
  noSlotsMessage?: string;
  className?: string;
  disabled?: boolean;
}

function startOfDayLocal(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonthLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonthsLocal(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount, 1);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildCalendarGrid(monthAnchor: Date): Date[] {
  const start = startOfMonthLocal(monthAnchor);
  const firstWeekday = (start.getDay() + 6) % 7; // Monday-first: 0=Mon, 6=Sun
  const days: Date[] = [];

  for (let i = firstWeekday; i > 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    days.push(d);
  }

  const monthLength = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= monthLength; day++) {
    days.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    const d = new Date(last);
    d.setDate(last.getDate() + 1);
    days.push(d);
  }
  return days;
}

function slotKey(slot: { startTime: string; endTime: string }): string {
  return `${slot.startTime}__${slot.endTime}`;
}

export function SlotCalendar({
  selectedDate,
  onSelectDate,
  slots,
  onSelectSlot,
  selectedSlotKey = null,
  isLoading = false,
  emptyMessage,
  noSlotsMessage,
  className,
  disabled = false,
}: SlotCalendarProps) {
  const { t, i18n } = useTranslation();
  const today = startOfDayLocal(new Date());
  const locale = i18n.language === "en" ? undefined : vi;
  const monthAnchor = startOfMonthLocal(selectedDate);

  const cells = useMemo(() => buildCalendarGrid(monthAnchor), [monthAnchor]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, SlotCalendarSlot[]>();
    for (const slot of slots) {
      try {
        const d = startOfDayLocal(new Date(slot.startTime));
        const key = d.toDateString();
        const list = map.get(key) ?? [];
        list.push(slot);
        map.set(key, list);
      } catch {
        // Ignore malformed slot timestamps so a single bad entry does not break the calendar
      }
    }
    return map;
  }, [slots]);

  const availableSlotsForSelectedDay = useMemo(() => {
    const key = startOfDayLocal(selectedDate).toDateString();
    return slotsByDay.get(key) ?? [];
  }, [slotsByDay, selectedDate]);

  const monthLabel = useMemo(
    () =>
      format(monthAnchor, "MMMM yyyy", {
        locale,
      }),
    [monthAnchor, locale]
  );

  const goPrevMonth = () => onSelectDate(addMonthsLocal(selectedDate, -1));
  const goNextMonth = () => onSelectDate(addMonthsLocal(selectedDate, 1));
  const goToday = () => onSelectDate(new Date());

  const currentMonthValue = monthAnchor.getMonth();
  const weekdayLabels = useMemo(() => {
    return Array.from({ length: 7 }).map((_, idx) =>
      format(new Date(2024, 0, 1 + idx), "EEEEEE", {
        locale,
      })
    );
  }, [locale]);

  return (
    <div
      data-slot="slot-calendar"
      className={cn(
        "border-border bg-card text-card-foreground overflow-hidden rounded-2xl border shadow-sm",
        className
      )}>
      {/* Header: month nav */}
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goPrevMonth}
          aria-label={t("common.slotCalendar.previousMonth", "Previous month")}
          className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 items-center justify-center gap-2">
          <h3 className="text-base font-semibold capitalize sm:text-lg" aria-live="polite">
            {monthLabel}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs tracking-wide uppercase">
            {t("common.slotCalendar.today", "Today")}
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goNextMonth}
          aria-label={t("common.slotCalendar.nextMonth", "Next month")}
          className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday header */}
      <div className="border-border bg-muted/30 grid grid-cols-7 border-b text-center" aria-hidden>
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="text-muted-foreground px-1 py-2 text-[0.7rem] font-semibold tracking-wider uppercase">
            {label}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div
        className="grid grid-cols-7"
        role="grid"
        aria-label={t("common.slotCalendar.selectADate", "Select a date")}>
        {cells.map((cell) => {
          const inMonth = cell.getMonth() === currentMonthValue;
          const isPast = cell.getTime() < today.getTime();
          const isSelected = isSameDay(cell, selectedDate);
          const cellToday = isToday(cell);
          const slotsForCell = slotsByDay.get(cell.toDateString()) ?? [];
          const hasSlots = slotsForCell.some((slot) => slot.available);

          const baseClasses = cn(
            "group relative flex aspect-square flex-col items-center justify-center gap-0.5 border-r border-b border-border/60 transition-colors",
            !inMonth && "text-muted-foreground/40 bg-muted/20"
          );

          return (
            <button
              type="button"
              key={cell.toDateString()}
              role="gridcell"
              aria-selected={isSelected}
              aria-disabled={isPast || disabled}
              aria-label={format(cell, "EEEE, d MMMM yyyy", {
                locale,
              })}
              disabled={isPast || disabled}
              onClick={() => onSelectDate(cell)}
              className={cn(
                baseClasses,
                !isPast && !disabled && "hover:bg-primary/10",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary [&_span]:text-primary-foreground"
              )}>
              <span
                className={cn(
                  "text-sm font-semibold",
                  cellToday &&
                    !isSelected &&
                    "text-primary ring-primary/40 flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-offset-0"
                )}>
                {format(cell, "d")}
              </span>
              {hasSlots && (
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-emerald-500 dark:bg-emerald-400"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Slots for the selected day */}
      <div className="border-border border-t px-4 py-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              {t("common.slotCalendar.availableSlots", "Available time slots")}
            </p>
            <p className="text-base font-semibold capitalize">
              {format(selectedDate, "EEEE, d MMMM yyyy", {
                locale,
              })}
            </p>
          </div>
          {availableSlotsForSelectedDay.length > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
              {t("common.slotCalendar.slotCount", {
                count: availableSlotsForSelectedDay.filter((slot) => slot.available).length,
              })}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            {t("common.loading", "Loading...")}
          </div>
        ) : availableSlotsForSelectedDay.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            {noSlotsMessage ??
              emptyMessage ??
              t(
                "common.slotCalendar.noSlotsForSelectedDate",
                "No time slots available on this date."
              )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {availableSlotsForSelectedDay.map((slot) => {
              const key = slotKey(slot);
              const isSelected = selectedSlotKey === key;
              const start = new Date(slot.startTime);
              const end = new Date(slot.endTime);

              return (
                <button
                  type="button"
                  key={key}
                  disabled={!slot.available || disabled}
                  onClick={() => onSelectSlot(slot)}
                  aria-pressed={isSelected}
                  className={cn(
                    "group flex flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border bg-background hover:border-primary hover:bg-primary/5",
                    !slot.available &&
                      "text-muted-foreground hover:bg-background cursor-not-allowed border-dashed opacity-60 hover:border-dashed"
                  )}>
                  <span className="text-sm font-semibold tracking-tight tabular-nums">
                    {format(start, "HH:mm")}
                    <span aria-hidden> – </span>
                    {format(end, "HH:mm")}
                  </span>
                  <span
                    className={cn(
                      "text-[0.65rem] font-medium tracking-wider uppercase",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                    {slot.available
                      ? t("common.slotCalendar.available", "Available")
                      : t("common.slotCalendar.full", "Full")}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
