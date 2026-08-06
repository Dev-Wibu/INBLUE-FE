import { SlotCalendar, type SlotCalendarSlot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  useActiveKiosks,
  useKioskBookingByApplicationDetail,
  useKioskSlots,
  usePickKioskSlot,
} from "@/hooks/useKiosk";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { kioskManager, type Kiosk, type KioskSchedule } from "@/services/kiosk.manager";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Cpu,
  KeyRound,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";
import type { JdInfoPayload } from "../RoundWorkspaceDispatcher";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type KioskBooking = components["schemas"]["KioskBooking"];

interface AiInterviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdInfo?: JdInfoPayload | null;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

const DAY_LABELS: Record<NonNullable<KioskSchedule["dayOfWeek"]>, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const WEEK_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const satisfies readonly NonNullable<KioskSchedule["dayOfWeek"]>[];

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDurationMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function formatHourMinute(value?: string): string {
  if (!value) return "--:--";
  const timeMatch = value.match(/(\d{2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function AiInterviewSubheader({
  round,
  finalScore,
  isCompleted,
}: {
  round: JdRound;
  finalScore?: number;
  isCompleted: boolean;
}) {
  const { t } = useTranslation();
  const roundOrder = round.roundOrder ?? 7;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("userApplication.aiInterview.aiInterviewTitle", { round: roundOrder })}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-indigo-400">
              {t("userApplication.roundNumber", { number: roundOrder })}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {t("userApplication.aiInterview.aiInterviewDescription")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:text-emerald-300 dark:shadow-emerald-950/40">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {finalScore != null
                ? `${t("userApplication.aiInterview.aiScore")} ${finalScore}/100`
                : t("userApplication.aiInterview.aiCompleted")}
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm shadow-indigo-100 dark:text-indigo-300 dark:shadow-indigo-950/40">
            <CalendarClock className="h-3.5 w-3.5 text-indigo-400" />
            <span>{t("userApplication.aiInterview.bookKiosk")}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function KioskCard({
  kiosk,
  selected,
  disabled,
  onSelect,
}: {
  kiosk: Kiosk;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group flex h-full min-h-[92px] flex-col rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-500/70 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-indigo-800/70 dark:hover:bg-slate-900/70"
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
              selected
                ? "border-indigo-300 bg-white text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
                : "border-slate-200 bg-slate-50 text-indigo-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-indigo-300"
            )}>
            <Laptop className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950 dark:text-white">
              {kiosk.name ?? `Kiosk #${kiosk.id ?? "-"}`}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs leading-5 font-semibold text-slate-600 dark:text-slate-300">
              {kiosk.location ?? t("userApplication.aiInterview.locationNotUpdated")}
            </p>
          </div>
        </div>
        {selected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
        )}
      </div>
      <div className="mt-auto flex items-center gap-1.5 pt-2.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
        <RadioTower className="h-3.5 w-3.5" />
        {kiosk.active === false
          ? t("userApplication.aiInterview.paused")
          : t("userApplication.aiInterview.active")}
      </div>
    </button>
  );
}

function ScheduleList({ schedules, loading }: { schedules: KioskSchedule[]; loading: boolean }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {t("userApplication.aiInterview.scheduleLoading")}
      </div>
    );
  }

  const schedulesByDay = new Map<NonNullable<KioskSchedule["dayOfWeek"]>, KioskSchedule[]>();
  schedules.forEach((schedule) => {
    if (!schedule.dayOfWeek) return;
    const list = schedulesByDay.get(schedule.dayOfWeek) ?? [];
    list.push(schedule);
    schedulesByDay.set(schedule.dayOfWeek, list);
  });

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
      {WEEK_DAYS.map((day) => {
        const daySchedules = schedulesByDay.get(day) ?? [];
        const activeSchedules = daySchedules.filter((schedule) => schedule.active !== false);
        const hasSchedule = activeSchedules.length > 0;

        return (
          <div
            key={day}
            className={cn(
              "rounded-2xl border px-3 py-2.5",
              hasSchedule
                ? "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/20"
                : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"
            )}>
            <p
              className={cn(
                "text-xs font-black",
                hasSchedule
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              )}>
              {DAY_LABELS[day]}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-extrabold tabular-nums",
                hasSchedule
                  ? "text-indigo-700 dark:text-indigo-200"
                  : "text-slate-400 dark:text-slate-500"
              )}>
              {hasSchedule
                ? activeSchedules
                    .map(
                      (schedule) =>
                        `${formatHourMinute(schedule.openTime)} - ${formatHourMinute(schedule.closeTime)}`
                    )
                    .join(", ")
                : "Không mở"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 py-3 last:border-b-0 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <span className="text-indigo-500 dark:text-indigo-300">{icon}</span>
        {label}
      </div>
      <span className="max-w-[55%] text-right text-sm font-extrabold text-slate-950 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function KioskPinDialog({
  open,
  onOpenChange,
  booking,
  kiosk,
  duration,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  booking: KioskBooking | null;
  kiosk: Kiosk | null;
  duration: number | null;
  onCopy: () => void;
}) {
  const { t } = useTranslation();
  const sessionKey = booking?.sessionKey ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-950 dark:text-white">
                {t("userApplication.aiInterview.bookingSuccess")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("userApplication.aiInterview.bookingSuccessDesc")}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
            <p className="text-xs font-extrabold tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-300">
              {t("userApplication.aiInterview.pinCode")}
            </p>
            <p className="mt-3 font-mono text-4xl font-black tracking-[0.28em] text-emerald-800 dark:text-emerald-200">
              {sessionKey || "------"}
            </p>
            <Button
              type="button"
              onClick={onCopy}
              disabled={!sessionKey}
              className="mt-4 h-10 gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-extrabold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60">
              <Copy className="h-4 w-4" />
              {t("userApplication.aiInterview.copyPinCode")}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-bold text-slate-400">
                {t("userApplication.aiInterview.timeLabel")}
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {booking?.scheduledStart
                  ? formatDateTime(booking.scheduledStart)
                  : t("userApplication.aiInterview.noData")}
              </p>
              <p className="mt-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                {duration ? `${duration} phút` : t("userApplication.aiInterview.perSlot")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs font-bold text-slate-400">
                {t("userApplication.aiInterview.kioskStation")}
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-white">
                {kiosk?.name ??
                  (booking?.kioskId
                    ? `Kiosk #${booking.kioskId}`
                    : t("userApplication.aiInterview.noData"))}
              </p>
              <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                {kiosk?.location ?? t("userApplication.aiInterview.checkEmailForDetails")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm leading-6 text-indigo-800 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-100">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <p>
              Thông tin chi tiết cũng sẽ được gửi qua email hoặc hộp thư thông báo. Chúc bạn làm bài
              thật tốt, bình tĩnh trả lời rõ ràng và đến sớm trước giờ hẹn 10-15 phút nhé.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AiInterviewModule({
  round,
  detail,
  jdInfo,
  isCompleted,
  isCurrent,
  onSuccess,
}: AiInterviewModuleProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedKioskId, setSelectedKioskId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotCalendarSlot | null>(null);
  const [createdBooking, setCreatedBooking] = useState<KioskBooking | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const finalScore = detail?.finalScore ?? detail?.aiScore;
  const applicationDetailId = detail?.id ?? null;
  const selectedDateString = useMemo(() => toYmd(selectedDate), [selectedDate]);

  const bookingQuery = useKioskBookingByApplicationDetail(applicationDetailId, !isCompleted);
  const activeBooking = createdBooking ?? bookingQuery.data ?? null;
  const hasBookedSlot = Boolean(
    activeBooking?.id || activeBooking?.sessionKey || detail?.status === "SLOT_PICKED"
  );

  const {
    data: kiosks = [],
    isLoading: kiosksLoading,
    error: kiosksError,
    refetch: refetchKiosks,
  } = useActiveKiosks(isCurrent && !isCompleted);

  useEffect(() => {
    if (activeBooking?.kioskId && selectedKioskId !== activeBooking.kioskId) {
      setSelectedKioskId(activeBooking.kioskId);
      return;
    }
    if (!selectedKioskId && kiosks.length > 0) {
      setSelectedKioskId(kiosks[0].id ?? null);
    }
  }, [activeBooking?.kioskId, kiosks, selectedKioskId]);

  useEffect(() => {
    if (!activeBooking?.scheduledStart || !activeBooking?.scheduledEnd) return;
    const bookingDate = new Date(activeBooking.scheduledStart);
    if (!Number.isNaN(bookingDate.getTime())) {
      bookingDate.setHours(0, 0, 0, 0);
      if (bookingDate.getTime() !== selectedDate.getTime()) {
        setSelectedDate(bookingDate);
      }
    }
    setSelectedSlot({
      startTime: activeBooking.scheduledStart,
      endTime: activeBooking.scheduledEnd,
      available: true,
    });
  }, [activeBooking?.scheduledEnd, activeBooking?.scheduledStart, selectedDate]);

  const selectedKiosk = useMemo(
    () => kiosks.find((kiosk) => kiosk.id === selectedKioskId) ?? null,
    [kiosks, selectedKioskId]
  );

  const schedulesQuery = useQuery({
    queryKey: ["kiosks", selectedKioskId, "schedules"],
    queryFn: async () => {
      if (!selectedKioskId) return [];
      const result = await kioskManager.getSchedulesByKiosk(selectedKioskId);
      if (!result.success) throw new Error(result.error);
      return result.data ?? [];
    },
    enabled: Boolean(selectedKioskId) && isCurrent && !isCompleted,
    staleTime: 60_000,
  });

  const {
    data: rawSlots = [],
    isLoading: slotsLoading,
    error: slotsError,
  } = useKioskSlots(
    selectedKioskId ?? 0,
    selectedDateString,
    Boolean(selectedKioskId) && !hasBookedSlot
  );

  const availableSlots = useMemo<SlotCalendarSlot[]>(
    () =>
      rawSlots
        .filter((slot) => typeof slot.startTime === "string" && typeof slot.endTime === "string")
        .map((slot) => ({
          startTime: slot.startTime as string,
          endTime: slot.endTime as string,
          available: slot.available !== false,
        })),
    [rawSlots]
  );

  const pickSlotMutation = usePickKioskSlot();
  const selectedSlotKey = selectedSlot
    ? `${selectedSlot.startTime}__${selectedSlot.endTime}`
    : null;
  const selectedDuration = getDurationMinutes(selectedSlot?.startTime, selectedSlot?.endTime);
  const canBook =
    isCurrent &&
    !isCompleted &&
    Boolean(applicationDetailId) &&
    Boolean(selectedKioskId) &&
    Boolean(selectedSlot) &&
    !hasBookedSlot &&
    !pickSlotMutation.isPending;

  const handleSelectKiosk = (kioskId?: number) => {
    if (hasBookedSlot) return;
    if (!kioskId) return;
    setSelectedKioskId(kioskId);
    setSelectedSlot(null);
    setCreatedBooking(null);
  };

  const handleBookSlot = async () => {
    if (!applicationDetailId || !selectedKioskId || !selectedSlot) return;

    const booking = await pickSlotMutation.mutateAsync({
      applicationDetailId,
      kioskId: selectedKioskId,
      scheduledStart: selectedSlot.startTime,
      scheduledEnd: selectedSlot.endTime,
    });

    setCreatedBooking(booking ?? null);
    if (booking?.sessionKey) {
      setPinDialogOpen(true);
    }
    toast.success("Đã đặt lịch Kiosk. Mã PIN đã được gửi qua thông báo.");
    onSuccess?.();
  };

  const handleCopySessionKey = async () => {
    const sessionKey = activeBooking?.sessionKey;
    if (!sessionKey) return;
    try {
      await navigator.clipboard.writeText(sessionKey);
      toast.success("Đã copy mã PIN Kiosk.");
    } catch {
      toast.error("Không thể copy mã PIN. Bạn hãy copy thủ công nhé.");
    }
  };

  const completedStart = detail?.sessionInfo?.startTime ?? detail?.startedAt;
  const completedEnd = detail?.sessionInfo?.endTime ?? detail?.completedAt;

  return (
    <div className="space-y-6">
      <AiInterviewSubheader round={round} finalScore={finalScore} isCompleted={isCompleted} />

      {isCompleted ? (
        <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="flex flex-col gap-5 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
                  Buổi phỏng vấn AI đã hoàn tất
                </h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Kết quả đã được ghi nhận vào hồ sơ ứng tuyển. Bạn có thể xem báo cáo chi tiết khi
                  hệ thống tổng hợp xong dữ liệu đánh giá.
                </p>
              </div>
            </div>
            {finalScore != null && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Điểm AI
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {finalScore}/100
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem
              icon={<CalendarClock className="h-4 w-4" />}
              label="Bắt đầu"
              value={completedStart ? formatDateTime(completedStart) : "Chưa có dữ liệu"}
            />
            <SummaryItem
              icon={<Clock3 className="h-4 w-4" />}
              label="Kết thúc"
              value={completedEnd ? formatDateTime(completedEnd) : "Chưa có dữ liệu"}
            />
            <SummaryItem icon={<Cpu className="h-4 w-4" />} label="Hình thức" value="Kiosk AI" />
            <SummaryItem
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Trạng thái"
              value="Đã hoàn tất"
            />
          </div>
        </Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 px-4 pt-3 pb-3.5 sm:px-5 sm:pt-3 sm:pb-4 dark:border-slate-800">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                      <MapPin className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
                      Chọn trạm Kiosk
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Ưu tiên trạm gần bạn và có lịch hoạt động khớp với thời gian phỏng vấn.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refetchKiosks()}
                    className="h-8 gap-1.5 px-3 text-[11px] font-extrabold">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Làm mới Kiosk
                  </Button>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {kiosksLoading ? (
                  <div className="grid gap-2.5 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-[92px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60"
                      />
                    ))}
                  </div>
                ) : kiosksError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                    Không thể tải danh sách Kiosk. Vui lòng làm mới lại.
                  </div>
                ) : kiosks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                    <Laptop className="mx-auto h-10 w-10 text-slate-400" />
                    <h4 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">
                      Chưa có Kiosk khả dụng
                    </h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Hệ thống chưa mở trạm Kiosk để đặt lịch cho vòng này.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    {kiosks.map((kiosk) => (
                      <KioskCard
                        key={kiosk.id ?? kiosk.name}
                        kiosk={kiosk}
                        selected={kiosk.id === selectedKioskId}
                        disabled={hasBookedSlot}
                        onSelect={() => handleSelectKiosk(kiosk.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 px-4 pt-3 pb-3.5 sm:px-5 sm:pt-3 sm:pb-4 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
                  <Clock3 className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
                  Lịch hoạt động của trạm
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Các khung hoạt động dùng để sinh slot trống theo từng ngày.
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <ScheduleList
                  schedules={schedulesQuery.data ?? []}
                  loading={schedulesQuery.isLoading}
                />
              </div>
            </Card>

            <SlotCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                if (hasBookedSlot) return;
                setSelectedDate(date);
                setSelectedSlot(null);
                setCreatedBooking(null);
              }}
              slots={availableSlots}
              selectedSlotKey={selectedSlotKey}
              onSelectSlot={(slot) => {
                if (hasBookedSlot) return;
                setSelectedSlot(slot);
                setCreatedBooking(null);
              }}
              isLoading={slotsLoading}
              disabled={!selectedKioskId || !isCurrent || hasBookedSlot}
              emptyMessage={
                slotsError
                  ? "Không thể tải slot trống của Kiosk."
                  : "Hãy chọn một trạm Kiosk để xem slot."
              }
              noSlotsMessage="Ngày này chưa có slot trống. Bạn thử chọn ngày khác nhé."
              className="border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40"
            />
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 p-5 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950 dark:text-white">
                  <CalendarClock className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  Tóm tắt đặt lịch
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Kiểm tra lại thông tin trước khi xác nhận slot Kiosk.
                </p>
              </div>

              <div className="p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <SummaryItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="Kiosk"
                    value={selectedKiosk?.name ?? "Chưa chọn"}
                  />
                  <SummaryItem
                    icon={<MapPin className="h-4 w-4" />}
                    label="Địa điểm"
                    value={selectedKiosk?.location ?? "Chưa cập nhật"}
                  />
                  <SummaryItem
                    icon={<CalendarClock className="h-4 w-4" />}
                    label="Thời gian"
                    value={selectedSlot ? formatDateTime(selectedSlot.startTime) : "Chưa chọn"}
                  />
                  <SummaryItem
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Thời lượng"
                    value={selectedDuration ? `${selectedDuration} phút` : "Theo slot"}
                  />
                  <SummaryItem
                    icon={<Cpu className="h-4 w-4" />}
                    label="Vị trí"
                    value={jdInfo?.title ?? "AI Interview"}
                  />
                </div>

                {activeBooking?.sessionKey ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <KeyRound className="mx-auto h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Mã PIN vào Kiosk
                    </p>
                    <p className="mt-1 font-mono text-3xl font-black tracking-[0.24em] text-emerald-800 dark:text-emerald-200">
                      {activeBooking.sessionKey}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">
                      Giữ mã này để nhập tại trạm Kiosk. Mã cũng được gửi qua thông báo.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopySessionKey}
                        className="h-9 gap-2 border-emerald-300 bg-white/70 text-xs font-extrabold text-emerald-800 hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <Copy className="h-3.5 w-3.5" />
                        Copy PIN
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setPinDialogOpen(true)}
                        className="h-9 gap-2 bg-emerald-600 text-xs font-extrabold text-white hover:bg-emerald-700">
                        <KeyRound className="h-3.5 w-3.5" />
                        Xem hướng dẫn
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="leading-6">
                      Phòng AI chỉ mở tại Kiosk. Bạn cần đến đúng trạm, đúng giờ và nhập mã PIN để
                      bắt đầu.
                    </p>
                  </div>
                )}

                {!hasBookedSlot && (
                  <Button
                    type="button"
                    onClick={() => void handleBookSlot()}
                    disabled={!canBook}
                    className="mt-4 h-11 w-full gap-2 bg-indigo-600 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:opacity-50">
                    {pickSlotMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {pickSlotMutation.isPending ? "Đang đặt slot..." : "Xác nhận đặt slot Kiosk"}
                  </Button>
                )}

                {!applicationDetailId && (
                  <p className="mt-3 text-xs leading-5 text-rose-600 dark:text-rose-300">
                    Vòng AI chưa có applicationDetailId nên chưa thể đặt slot.
                  </p>
                )}
              </div>
            </Card>

            <Card className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-950 dark:text-white">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Chuẩn bị trước khi đến Kiosk
              </h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <p>Đến trước giờ hẹn khoảng 10-15 phút để kiểm tra thiết bị.</p>
                <p>Mang theo mã PIN phiên phỏng vấn và giấy tờ cần thiết nếu công ty yêu cầu.</p>
                <p>Giữ môi trường yên tĩnh, trả lời rõ ràng để AI ghi nhận tốt hơn.</p>
              </div>
            </Card>
          </aside>
        </div>
      )}
      <KioskPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        booking={activeBooking}
        kiosk={selectedKiosk}
        duration={selectedDuration}
        onCopy={handleCopySessionKey}
      />
    </div>
  );
}
