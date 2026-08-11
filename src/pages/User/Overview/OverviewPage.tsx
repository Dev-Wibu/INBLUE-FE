import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserSessions } from "@/hooks/useSession";
import { formatDateTime, toVietnamDateKey } from "@/lib/formatting";
import { getSessionMentorId } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import { format as formatDateFn } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, Target, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  type UserCalendarSession,
  buildUserCalendarSessions,
  formatCalendarTime,
  getSessionStatusConfig,
  groupUserCalendarByDate,
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
  onOpenDetail: (_sessionId?: number) => void;
  onOpenRoom: (_sessionId?: number) => void;
  onWriteReview: (_sessionId?: number) => void;
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
            {item.session.roomName || t("common.sessionVar0", { var_0: item.session.id })}
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("common.mentorWithId", { id: getSessionMentorId(item.session) ?? "-" })}
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
          onClick={() => onOpenDetail(item.session.id)}>
          {t("common.seeDetails", "Xem chi tiết")}
        </Button>
        {canJoinRoom && (
          <Button
            size="sm"
            className="h-7 bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            onClick={() => onOpenRoom(item.session.id)}>
            {t("common.enterTheRoom", "Vào phòng")}
          </Button>
        )}
        {canWriteReview && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 bg-indigo-50 text-xs font-medium text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
            onClick={() => onWriteReview(item.session.id)}>
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
  onOpen: (_sessionId?: number) => void;
}) {
  const { t } = useTranslation();
  const status = getSessionStatusConfig(item.session.status);

  return (
    <button
      onClick={() => onOpen(item.session.id)}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-indigo-50/60 dark:hover:bg-slate-800">
      <span className={cn("h-2 w-2 shrink-0 rounded-full", status.dot)} />
      <span className="shrink-0 font-medium text-slate-500 dark:text-slate-400">
        {formatCalendarTime(item.session.joinTime)}
      </span>
      <span className="flex-1 truncate font-semibold text-slate-900 dark:text-slate-100">
        {item.session.roomName || t("common.sessionVar0", { var_0: item.session.id })}
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
  const { data: sessions = [], isLoading: sessionsLoading } = useUserSessions();

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

  const calendarItems = useMemo(() => buildUserCalendarSessions(sessions), [sessions]);
  const sessionsByDate = useMemo(() => groupUserCalendarByDate(calendarItems), [calendarItems]);

  const totalInterviews = sessions.length;
  const completedInterviews = sessions.filter((s) => s.status === "COMPLETED").length;
  const upcomingInterviews = sessions.filter(
    (s) => s.status === "SCHEDULED" || s.status === "PAID" || s.status === "ONGOING"
  ).length;
  const pendingInterviews = sessions.filter((s) => s.status === "DRAFT").length;

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

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
  const calendarDays: (number | null)[] = [];
  for (let index = 0; index < adjustedFirstDay; index += 1) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push(day);
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }
  const weeks: (number | null)[][] = [];
  for (let index = 0; index < calendarDays.length; index += 7) {
    weeks.push(calendarDays.slice(index, index + 7));
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

  const handleOpenSessionDetail = (sessionId?: number) => {
    if (typeof sessionId === "number") {
      navigate(`/user/mock-interview/history/${sessionId}`);
    }
  };

  const handleOpenSessionRoom = (sessionId?: number) => {
    if (typeof sessionId === "number") {
      navigate(`/user/mock-interview/room/${sessionId}`);
    }
  };

  const handleWriteReview = (sessionId?: number) => {
    if (typeof sessionId === "number") {
      navigate(`/user/mock-interview/history/${sessionId}/feedback`);
    }
  };

  const jumpToToday = () => {
    setCurrentYear(Number.isFinite(initialYear) ? initialYear : now.getFullYear());
    setCurrentMonth(Number.isFinite(initialMonth) ? initialMonth : now.getMonth());
    setSelectedDateKey(todayKey);
  };

  const renderCalendarContent = () => (
    <Card className="border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
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

      <CardContent className="pt-4">
        <div className="grid grid-cols-7 border-b border-slate-200 pb-2.5 text-center text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300">
          {WEEK_DAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {weeks.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800">
              {week.map((day, dayIdx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${weekIdx}-${dayIdx}`}
                      className="min-h-[105px] bg-slate-50/40 p-1.5 dark:bg-slate-950/30"
                    />
                  );
                }

                const dateKey = toDateKeyFromParts(currentYear, currentMonth, day);
                const dayItems = sessionsByDate.get(dateKey) || [];
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
                      "group relative flex min-h-[105px] cursor-pointer flex-col gap-1.5 p-2 transition-all",
                      isSelected
                        ? "bg-indigo-500/10 ring-2 ring-indigo-500/50 dark:bg-indigo-950/60 dark:ring-indigo-500/60"
                        : hasEvents
                          ? "border border-indigo-200/80 bg-indigo-50/90 shadow-2xs dark:border-indigo-900/60 dark:bg-indigo-950/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    )}>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateKey(dateKey);
                        }}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors",
                          isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : isToday
                              ? "bg-indigo-600 font-extrabold text-white shadow-xs"
                              : hasEvents
                                ? "bg-indigo-600/15 font-extrabold text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-300"
                                : "text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800"
                        )}
                        aria-label={t("general.selectDate", { var_0: day })}>
                        {String(day).padStart(2, "0")}
                      </button>
                      {hasEvents && (
                        <Badge className="border-0 bg-indigo-600 px-1.5 py-0 text-[10px] font-bold text-white shadow-2xs dark:bg-indigo-500">
                          {dayItems.length}
                        </Badge>
                      )}
                    </div>

                    {hasEvents && (
                      <div className="space-y-1">
                        {visibleItems.map((item) => {
                          const cfg = getSessionStatusConfig(item.session.status);
                          return (
                            <button
                              key={item.session.id}
                              onClick={() => handleOpenSessionDetail(item.session.id)}
                              className={cn(
                                "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-medium shadow-2xs transition-colors hover:opacity-90",
                                cfg.badgeClass
                              )}>
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="shrink-0 font-semibold">
                                {formatCalendarTime(item.session.joinTime)}
                              </span>
                              <span className="truncate font-semibold">
                                {item.session.roomName || `#${item.session.id}`}
                              </span>
                            </button>
                          );
                        })}

                        {overflowCount > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full rounded-md border border-dashed border-indigo-300 bg-white/80 px-2 py-0.5 text-center text-[10px] font-bold text-indigo-600 transition-colors hover:border-indigo-400 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300">
                                +{overflowCount} {t("common.anotherSession", "bài nữa")}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-80 p-2 dark:border-slate-800 dark:bg-slate-900"
                              side="bottom"
                              align="start"
                              sideOffset={8}>
                              <p className="mb-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                                {t("general.session5", {
                                  var_0: String(day).padStart(2, "0"),
                                  var_1: String(currentMonth + 1).padStart(2, "0"),
                                  var_2: currentYear,
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
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderAgendaContent = () => (
    <Card className="border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
          {t("common.appointmentScheduleByDay", "Lịch hẹn theo ngày")}
        </CardTitle>
        <CardDescription className="text-xs font-semibold text-indigo-600 capitalize dark:text-indigo-400">
          {selectedDateDisplay}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Selected Day Agenda Items */}
        {sessionsLoading ? (
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
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
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
                    onClick={() => handleOpenSessionDetail(item.session.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white p-2.5 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.session.roomName ||
                          t("common.sessionVar0", { var_0: item.session.id })}
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
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Clean Minimalist Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("userOverview.interviewOverview", "Tổng quan phỏng vấn")}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t(
            "userOverview.keepTrackOfAppointmentSchedules",
            "Theo dõi lịch hẹn và các chỉ số tổng quan."
          )}
        </p>
      </div>

      {/* High-Contrast Bright Stats Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("common.totalInterviewSession", "Tổng lượt phỏng vấn")}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {totalInterviews}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
            <Video className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("common.sessionIsComingSoon", "Sắp diễn ra")}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {upcomingInterviews}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("userOverview.sessionCompleted", "Đã hoàn thành")}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {completedInterviews}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("userOverview.requestPendingApproval", "Chờ duyệt")}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-50">
              {pendingInterviews}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
            <Target className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Calendar + Agenda Grid Section */}
      <div className="xl:hidden">
        <Tabs value={mobileView} onValueChange={setMobileView}>
          <TabsList className="mb-3 grid w-full grid-cols-2">
            <TabsTrigger value={MOBILE_VIEW_AGENDA}>{t("common.list", "Danh sách")}</TabsTrigger>
            <TabsTrigger value={MOBILE_VIEW_CALENDAR}>
              {t("common.monthlyCalendar", "Lịch tháng")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={MOBILE_VIEW_AGENDA}>{renderAgendaContent()}</TabsContent>
          <TabsContent value={MOBILE_VIEW_CALENDAR}>{renderCalendarContent()}</TabsContent>
        </Tabs>
      </div>

      <div className="hidden gap-6 xl:grid xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
        {renderCalendarContent()}
        {renderAgendaContent()}
      </div>
    </div>
  );
}
