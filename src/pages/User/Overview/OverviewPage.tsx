import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserSchedule } from "@/hooks/useUserSchedule";
import { formatDateTime, toVietnamDateKey } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { format as formatDateFn } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  buildCalendarSessionsFromEvents,
  formatCalendarTime,
  getSessionStatusConfig,
  groupUserCalendarByDate,
  type UserCalendarSession,
} from "./userSchedule.utils";

const MAX_VISIBLE_SESSIONS = 2;
const MOBILE_VIEW_AGENDA = "agenda";
const MOBILE_VIEW_CALENDAR = "calendar";

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
};

const toDateKeyFromParts = (year: number, month: number, day: number): string => {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
};

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function AgendaSessionItem({
  item,
  onOpenDetail,
  onOpenRoom,
  onWriteReview,
}: {
  item: UserCalendarSession;
  onOpenDetail: (_item: UserCalendarSession) => void;
  onOpenRoom: (_item: UserCalendarSession) => void;
  onWriteReview: (_item: UserCalendarSession) => void;
}) {
  const { t } = useTranslation();
  const status = getSessionStatusConfig(item.session.status);
  const canJoinRoom =
    (item.session.status === "PAID" || item.session.status === "ONGOING") && !!item.session.roomUrl;
  const canWriteReview = item.session.status === "COMPLETED";

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
            {item.session.roomName || t("common.mentorInterview")}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("common.mentor")}
          </p>
        </div>
        <Badge className={cn("shrink-0 border-0 text-[10px] font-semibold", status.badgeClass)}>
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <Clock className="h-3.5 w-3.5 text-indigo-500" />
        <span className="font-medium">{formatDateTime(item.session.joinTime)}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={() => onOpenDetail(item)}>
          {t("common.seeDetails", "Xem chi tiết")}
        </Button>
        {canJoinRoom && (
          <Button
            size="sm"
            className="h-7 bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onClick={() => onOpenRoom(item)}>
            {t("common.enterTheRoom", "Vào phòng")}
          </Button>
        )}
        {canWriteReview && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 bg-indigo-50 text-xs font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
            onClick={() => onWriteReview(item)}>
            {t("common.writeAReview", "Đánh giá")}
          </Button>
        )}
      </div>
    </div>
  );
}

function CalendarSessionEntry({
  item,
  onOpen,
}: {
  item: UserCalendarSession;
  onOpen: (_item: UserCalendarSession) => void;
}) {
  const { t } = useTranslation();
  const status = getSessionStatusConfig(item.session.status);

  return (
    <button
      onClick={() => onOpen(item)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-indigo-50/60 dark:hover:bg-slate-800">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)} />
      <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">
        {formatCalendarTime(item.session.joinTime)}
      </span>
      <span className="flex-1 truncate font-semibold text-slate-900 dark:text-slate-100">
        {item.session.roomName || t("common.mentorInterview")}
      </span>
      <Badge className={cn("border-0 px-1.5 py-0 text-[10px]", status.badgeClass)}>
        {status.label}
      </Badge>
    </button>
  );
}

export function OverviewPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const agendaScrollRef = useRef<HTMLDivElement>(null);

  // Fetch schedule from new API endpoint
  const { data: scheduleEvents = [], isLoading: scheduleLoading } = useUserSchedule();

  // Transform schedule events to calendar format
  const calendarItems = useMemo(
    () => buildCalendarSessionsFromEvents(scheduleEvents),
    [scheduleEvents]
  );

  const sessionsByDate = useMemo(() => groupUserCalendarByDate(calendarItems), [calendarItems]);

  // Calculate stats from events
  const totalInterviews = scheduleEvents.length;
  const completedInterviews = scheduleEvents.filter((e) => e.status === "COMPLETED").length;
  const upcomingInterviews = scheduleEvents.filter(
    (e) =>
      e.status === "SCHEDULED" ||
      e.status === "PENDING" ||
      e.status === "ONGOING" ||
      e.status === "IN_PROGRESS" ||
      e.status === "PAID"
  ).length;
  const pendingInterviews = scheduleEvents.filter(
    (e) => e.status === "DRAFT" || e.status === "CREATED" || e.status === "AWAITING_MENTOR"
  ).length;

  const MONTH_NAMES = [
    t("common.january"),
    t("common.february"),
    t("common.march"),
    t("common.april"),
    t("common.may"),
    t("common.june"),
    t("common.july"),
    t("common.august"),
    t("common.september"),
    t("common.october"),
    t("common.november"),
    t("common.december"),
  ];

  const now = new Date();
  const nowTimestamp = now.getTime();
  const fallbackTodayKey = toDateKeyFromParts(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = toVietnamDateKey(now) || fallbackTodayKey;
  const [todayYearRaw = "", todayMonthRaw = ""] = todayKey.split("-");
  const initialYear = Number.parseInt(todayYearRaw, 10);
  const initialMonth = Number.parseInt(todayMonthRaw, 10) - 1;

  const [currentYear, setCurrentYear] = useState(
    Number.isFinite(initialYear) ? initialYear : now.getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    Number.isFinite(initialMonth) ? initialMonth : now.getMonth()
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [mobileView, setMobileView] = useState<string>(MOBILE_VIEW_AGENDA);

  // Upcoming schedule items for the sidebar (using calendar items)
  const upcomingScheduleItems = calendarItems
    .filter(
      (item) =>
        item.timestamp >= nowTimestamp &&
        item.session.status !== "COMPLETED" &&
        item.session.status !== "REJECTED" &&
        item.session.status !== "CANCELED"
    )
    .slice(0, 4);

  const selectedDayItems = sessionsByDate.get(selectedDateKey) || [];

  const selectedDateDisplay = useMemo(() => {
    const [year, month, day] = selectedDateKey.split("-").map(Number);
    if (!year || !month || !day) return t("common.selectedDate");
    const dateFnsLocale = i18n.language === "en" ? enUS : vi;
    return formatDateFn(new Date(year, month - 1, day), "EEEE, dd/MM/yyyy", {
      locale: dateFnsLocale,
    });
  }, [selectedDateKey, t, i18n]);

  // Reset agenda scroll whenever the selected date changes
  useEffect(() => {
    const reset = () => {
      if (agendaScrollRef.current) {
        agendaScrollRef.current.scrollTop = 0;
      }
    };
    reset();
    requestAnimationFrame(reset);
    const t = setTimeout(reset, 0);
    return () => clearTimeout(t);
  }, [selectedDateKey, scheduleLoading]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  type CalendarCell = {
    day: number;
    year: number;
    month: number;
    isCurrentMonth: boolean;
  };
  const calendarCells: CalendarCell[] = [];
  // Leading days from previous month
  for (let index = adjustedFirstDay - 1; index >= 0; index -= 1) {
    const day = daysInPrevMonth - index;
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarCells.push({ day, year: prevYear, month: prevMonth, isCurrentMonth: false });
  }
  // Current month
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push({ day, year: currentYear, month: currentMonth, isCurrentMonth: true });
  }
  // Trailing days from next month
  let nextDay = 1;
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({
      day: nextDay,
      year: nextYear,
      month: nextMonth,
      isCurrentMonth: false,
    });
    nextDay += 1;
  }
  const weeks: CalendarCell[][] = [];
  for (let index = 0; index < calendarCells.length; index += 7) {
    weeks.push(calendarCells.slice(index, index + 7));
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((p) => p - 1);
    } else {
      setCurrentMonth((p) => p - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((p) => p + 1);
    } else {
      setCurrentMonth((p) => p + 1);
    }
  };

  const handleOpenSessionDetail = (item: UserCalendarSession) => {
    const { eventType, sessionId, applicationDetailId } = item;

    // Determine navigation based on event type
    switch (eventType) {
      case "KIOSK_BOOKING":
        // Kiosk bookings don't have a detail page yet, show toast
        if (typeof applicationDetailId === "number") {
          navigate(`/user/application-history?highlight=${applicationDetailId}`);
        }
        break;
      case "APPLICATION_ROUND":
        // Application rounds - navigate to application history
        if (typeof applicationDetailId === "number") {
          navigate(`/user/application-history?highlight=${applicationDetailId}`);
        }
        break;
      case "MENTOR_SESSION":
      case "SESSION":
      default:
        // Mock interview sessions - navigate to session detail
        if (typeof sessionId === "number" && sessionId > 0) {
          navigate(`/user/mock-interview/history/${sessionId}`);
        } else if (typeof item.session.id === "number" && item.session.id > 0) {
          navigate(`/user/mock-interview/history/${item.session.id}`);
        }
        break;
    }
  };

  const handleOpenSessionRoom = (item: UserCalendarSession) => {
    const { sessionId } = item;
    if (typeof sessionId === "number" && sessionId > 0) {
      navigate(`/user/mock-interview/room/${sessionId}`);
    } else if (typeof item.session.id === "number" && item.session.id > 0) {
      navigate(`/user/mock-interview/room/${item.session.id}`);
    }
  };

  const handleWriteReview = (item: UserCalendarSession) => {
    const { sessionId } = item;
    if (typeof sessionId === "number" && sessionId > 0) {
      navigate(`/user/mock-interview/history/${sessionId}/feedback`);
    } else if (typeof item.session.id === "number" && item.session.id > 0) {
      navigate(`/user/mock-interview/history/${item.session.id}/feedback`);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(Number.isFinite(initialYear) ? initialYear : now.getFullYear());
    setCurrentMonth(Number.isFinite(initialMonth) ? initialMonth : now.getMonth());
    setSelectedDateKey(todayKey);
  };

  const renderCalendarContent = () => (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <CardTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </CardTitle>
          <CardDescription className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("common.clickOnTheDateToSeeDetails", "Nhấp vào ngày để xem chi tiết lịch phỏng vấn")}
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={jumpToToday}
            className="h-8 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {t("common.today", "Hôm nay")}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 dark:border-slate-700 dark:bg-slate-800"
              onClick={handlePrevMonth}
              aria-label={t("common.previousMonth")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 dark:border-slate-700 dark:bg-slate-800"
              onClick={handleNextMonth}
              aria-label={t("common.nextMonth")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto pt-4">
        {/* Legend */}
        <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {t("common.legend")}:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {t("common.waitingForApproval", "Chờ duyệt")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {t("common.comingSoon", "Sắp diễn ra")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {t("common.paid", "Đã thanh toán")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {t("common.ongoing", "Đang diễn ra")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {t("general.completed", "Hoàn thành")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {t("common.rejected", "Từ chối")}
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid w-full min-w-0 grid-cols-7 text-center text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="pb-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid w-full grid-cols-7 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          {weeks.map((week) =>
            week.map((cell) => {
              const dateKey = toDateKeyFromParts(cell.year, cell.month, cell.day);
              const dayItems = cell.isCurrentMonth ? sessionsByDate.get(dateKey) || [] : [];
              const isSelected = dateKey === selectedDateKey;
              const isToday = dateKey === todayKey;
              const hasEvents = dayItems.length > 0;
              const visibleItems = dayItems.slice(0, MAX_VISIBLE_SESSIONS);
              const overflowCount = Math.max(0, dayItems.length - MAX_VISIBLE_SESSIONS);

              return (
                <div
                  key={dateKey}
                  onClick={() => setSelectedDateKey(dateKey)}
                  className={cn(
                    "group relative min-h-[100px] min-w-0 cursor-pointer overflow-hidden border-r border-b border-slate-200 p-1.5 transition-all sm:p-2 dark:border-slate-800",
                    cell.isCurrentMonth
                      ? isSelected
                        ? "bg-indigo-50 dark:bg-indigo-950"
                        : hasEvents
                          ? "bg-white dark:bg-slate-900"
                          : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                      : "bg-slate-50/50 text-slate-300 hover:bg-slate-100 dark:bg-slate-950/40 dark:text-slate-600 dark:hover:bg-slate-800/60"
                  )}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDateKey(dateKey);
                      }}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors sm:text-xs",
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : isToday
                            ? "bg-indigo-600 font-extrabold text-white"
                            : hasEvents
                              ? "bg-indigo-100 font-extrabold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                              : cell.isCurrentMonth
                                ? "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                : "text-slate-300 hover:bg-slate-200/60 dark:text-slate-700 dark:hover:bg-slate-800/60"
                      )}
                      aria-label={t("general.selectDate", { var_0: cell.day })}>
                      {String(cell.day).padStart(2, "0")}
                    </button>
                    {hasEvents && (
                      <Badge className="h-4 min-w-[16px] items-center justify-center border-0 bg-indigo-600 px-1 text-[9px] font-bold text-white sm:h-5 sm:min-w-[20px] sm:text-[10px] dark:bg-indigo-500">
                        {dayItems.length}
                      </Badge>
                    )}
                  </div>

                  {hasEvents && (
                    <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden sm:gap-1">
                      {visibleItems.map((item) => {
                        const cfg = getSessionStatusConfig(item.session.status);
                        return (
                          <button
                            key={item.session.id}
                            onClick={() => handleOpenSessionDetail(item)}
                            className={cn(
                              "flex w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-[8px] font-medium transition-colors hover:opacity-80 sm:gap-1 sm:text-[10px]",
                              cfg.badgeClass
                            )}>
                            <Clock className="h-2 w-2 shrink-0 sm:h-2.5 sm:w-2.5" />
                            <span className="shrink-0 font-semibold">
                              {formatCalendarTime(item.session.joinTime)}
                            </span>
                            <span className="truncate font-semibold">
                              {item.session.roomName || t("common.mentorInterview")}
                            </span>
                          </button>
                        );
                      })}

                      {overflowCount > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full rounded border border-dashed border-indigo-300 bg-white px-1 py-0.5 text-center text-[8px] font-bold text-indigo-600 transition-colors hover:border-indigo-400 sm:text-[10px] dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300">
                              +{overflowCount}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-80 p-2 dark:border-slate-800 dark:bg-slate-900"
                            side="bottom"
                            align="start"
                            sideOffset={8}>
                            <p className="mb-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                              {t("general.session5", {
                                var_0: String(cell.day).padStart(2, "0"),
                                var_1: String(cell.month + 1).padStart(2, "0"),
                                var_2: cell.year,
                                var_3: dayItems.length,
                              })}
                            </p>
                            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
                              {dayItems.map((item) => (
                                <CalendarSessionEntry
                                  key={item.session.id}
                                  item={item}
                                  onOpen={handleOpenSessionDetail}
                                />
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderAgendaContent = () => (
    <div
      key={`agenda-${selectedDateKey}`}
      className="flex h-[580px] max-h-[580px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="shrink-0 border-b border-slate-100 px-4 pt-4 pb-3 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {t("common.appointmentScheduleByDay")}
        </h3>
        <p className="text-xs font-semibold text-indigo-600 capitalize dark:text-indigo-400">
          {selectedDateDisplay}
        </p>
      </div>

      <div
        className="flex min-h-0 flex-1 scroll-pb-6 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-10"
        ref={agendaScrollRef}>
        {/* Selected Day Agenda Items */}
        {scheduleLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : selectedDayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t(
                "common.thereAreNoAppointmentsAvailableFor",
                "Không có lịch hẹn trong ngày đã chọn"
              )}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                "common.selectAnotherDateOnCalendar",
                "Nhấp vào ngày khác trên lịch để xem thông tin."
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayItems.map((item) => (
              <AgendaSessionItem
                key={item.session.id}
                item={item}
                onOpenDetail={handleOpenSessionDetail}
                onOpenRoom={handleOpenSessionRoom}
                onWriteReview={handleWriteReview}
              />
            ))}
          </div>
        )}

        {/* Upcoming Sessions Box */}
        <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {t("userOverview.upcomingSession", "Phiên sắp tới")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800"
              onClick={() => navigate("/user?tab=interviewHistory")}>
              {t("common.viewHistory", "Xem lịch sử")}
            </Button>
          </div>

          {upcomingScheduleItems.length === 0 ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                "userOverview.thereAreCurrentlyNoSessions",
                "Hiện chưa có phiên nào cần theo dõi."
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingScheduleItems.map((item) => {
                const cfg = getSessionStatusConfig(item.session.status);
                return (
                  <button
                    key={item.session.id}
                    onClick={() => handleOpenSessionDetail(item)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.session.roomName || t("common.mentorInterview")}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatDateTime(item.session.joinTime)}
                      </p>
                    </div>
                    <Badge
                      className={cn(
                        "shrink-0 border-0 px-1.5 py-0.5 text-[10px] font-semibold",
                        cfg.badgeClass
                      )}>
                      {cfg.label}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-transparent">
      {/* Top Action Bar — same geometry as JobSearchTab and UserCompaniesTab */}
      <div className="shrink-0 px-5 py-6 md:px-8">
        <div className="w-full rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("userOverview.interviewOverview", "Tổng quan phỏng vấn")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t(
                  "userOverview.keepTrackOfAppointmentSchedules",
                  "Theo dõi lịch hẹn và các chỉ số tổng quan."
                )}
              </p>
            </div>

            {/* Stats — same spacing and separators as the two reference tabs */}
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {totalInterviews}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("common.totalInterviewSession", "Tổng lượt phỏng vấn")}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {upcomingInterviews}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("common.sessionIsComingSoon", "Sắp diễn ra")}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {completedInterviews}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("userOverview.sessionCompleted", "Đã hoàn thành")}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {pendingInterviews}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("userOverview.requestPendingApproval", "Chờ duyệt")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar + Agenda Grid Section */}
      <div className="flex w-full min-w-0 px-5 py-6 md:px-8 xl:self-center">
        <div className="w-full min-w-0 xl:hidden">
          <Tabs value={mobileView} onValueChange={setMobileView}>
            <TabsList className="mb-3 grid w-full grid-cols-2">
              <TabsTrigger value={MOBILE_VIEW_AGENDA}>{t("common.list", "Danh sách")}</TabsTrigger>
              <TabsTrigger value={MOBILE_VIEW_CALENDAR}>
                {t("common.monthlyCalendar", "Lịch tháng")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value={MOBILE_VIEW_AGENDA} className="mt-0">
              <div key={`mobile-agenda-${selectedDateKey}`}>{renderAgendaContent()}</div>
            </TabsContent>
            <TabsContent value={MOBILE_VIEW_CALENDAR} className="mt-0">
              {renderCalendarContent()}
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden min-h-0 w-full min-w-0 xl:flex xl:self-center">
          <div className="flex w-full min-w-0 flex-row items-start gap-6">
            {/* Calendar - Natural height (no constraint, full content visible) */}
            <div className="flex min-w-0 flex-1 basis-0 flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900">
              {renderCalendarContent()}
            </div>
            {/* Agenda - Fixed height with internal scroll */}
            <div className="flex h-[580px] w-[400px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 xl:w-[440px] 2xl:w-[480px] dark:border-slate-800 dark:bg-slate-900">
              <div key={`desktop-agenda-${selectedDateKey}`}>{renderAgendaContent()}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
