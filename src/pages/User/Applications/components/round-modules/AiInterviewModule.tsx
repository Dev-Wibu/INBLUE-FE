import { SlotCalendar, type SlotCalendarSlot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActiveKiosks, useKioskSlots, usePickKioskSlot } from "@/hooks/useKiosk";
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
  Cpu,
  KeyRound,
  Laptop,
  Loader2,
  MapPin,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

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

function getKioskInitials(name?: string): string {
  if (!name) return "K";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
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
  const roundOrder = round.roundOrder ?? 7;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-md backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Vòng {roundOrder}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                Phỏng vấn AI tại Kiosk
              </span>
            </div>
            <h2 className="sr-only">Phỏng vấn AI tại Kiosk</h2>
            <p className="mt-0.5 max-w-4xl text-sm leading-6 font-semibold text-slate-200">
              Chọn trạm Kiosk và khung giờ phù hợp. Sau khi đặt lịch, hệ thống sẽ cấp mã PIN 6 số để
              bạn nhập tại Kiosk đúng giờ phỏng vấn.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-300 shadow-sm shadow-emerald-950/40">
              <CheckCircle2 className="h-4 w-4" />
              <span>{finalScore != null ? `ĐIỂM AI ${finalScore}/100` : "ĐÃ HOÀN TẤT"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-300 shadow-sm shadow-indigo-950/40">
              <CalendarClock className="h-3.5 w-3.5 text-indigo-400" />
              <span>ĐẶT LỊCH KIOSK</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

function KioskCard({
  kiosk,
  selected,
  onSelect,
}: {
  kiosk: Kiosk;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex h-full min-h-[116px] flex-col rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-indigo-400 bg-indigo-50/80 dark:border-indigo-500/70 dark:bg-indigo-950/30"
          : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-indigo-800/70 dark:hover:bg-slate-900/70"
      )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black",
              selected
                ? "border-indigo-300 bg-white text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200"
                : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200"
            )}>
            {getKioskInitials(kiosk.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white">
              {kiosk.name ?? `Kiosk #${kiosk.id ?? "-"}`}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {kiosk.location ?? "Chưa cập nhật vị trí"}
            </p>
          </div>
        </div>
        {selected && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
        )}
      </div>
      <div className="mt-auto flex items-center gap-1.5 pt-4 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
        <RadioTower className="h-3.5 w-3.5" />
        {kiosk.active === false ? "Tạm ngưng" : "Đang hoạt động"}
      </div>
    </button>
  );
}

function ScheduleList({ schedules, loading }: { schedules: KioskSchedule[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Đang tải lịch hoạt động của kiosk...
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Kiosk này chưa có lịch hoạt động được công bố.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {schedules.map((schedule) => (
        <div
          key={schedule.id ?? `${schedule.dayOfWeek}-${schedule.openTime}`}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
          <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
            {schedule.dayOfWeek ? DAY_LABELS[schedule.dayOfWeek] : "Ngày hoạt động"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {schedule.openTime ?? "--:--"} - {schedule.closeTime ?? "--:--"}
          </p>
        </div>
      ))}
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

  const finalScore = detail?.finalScore ?? detail?.aiScore;
  const applicationDetailId = detail?.id ?? null;
  const selectedDateString = useMemo(() => toYmd(selectedDate), [selectedDate]);

  const {
    data: kiosks = [],
    isLoading: kiosksLoading,
    error: kiosksError,
    refetch: refetchKiosks,
  } = useActiveKiosks(isCurrent && !isCompleted);

  useEffect(() => {
    if (!selectedKioskId && kiosks.length > 0) {
      setSelectedKioskId(kiosks[0].id ?? null);
    }
  }, [kiosks, selectedKioskId]);

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
  } = useKioskSlots(selectedKioskId ?? 0, selectedDateString, Boolean(selectedKioskId));

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
    !pickSlotMutation.isPending;

  const handleSelectKiosk = (kioskId?: number) => {
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
    toast.success("Đã đặt lịch Kiosk. Mã PIN đã được gửi qua thông báo.");
    onSuccess?.();
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
              <div className="border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950 dark:text-white">
                      <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                      Chọn trạm Kiosk
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Ưu tiên trạm gần bạn và có lịch hoạt động khớp với thời gian phỏng vấn.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void refetchKiosks()}
                    className="h-9 gap-2 text-xs font-bold">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Làm mới Kiosk
                  </Button>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {kiosksLoading ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-[116px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60"
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
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {kiosks.map((kiosk) => (
                      <KioskCard
                        key={kiosk.id ?? kiosk.name}
                        kiosk={kiosk}
                        selected={kiosk.id === selectedKioskId}
                        onSelect={() => handleSelectKiosk(kiosk.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
              <div className="border-b border-slate-200 p-5 sm:p-6 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-950 dark:text-white">
                  <Clock3 className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                  Lịch hoạt động của trạm
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Các khung hoạt động dùng để sinh slot trống theo từng ngày.
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <ScheduleList
                  schedules={schedulesQuery.data ?? []}
                  loading={schedulesQuery.isLoading}
                />
              </div>
            </Card>

            <SlotCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null);
                setCreatedBooking(null);
              }}
              slots={availableSlots}
              selectedSlotKey={selectedSlotKey}
              onSelectSlot={(slot) => {
                setSelectedSlot(slot);
                setCreatedBooking(null);
              }}
              isLoading={slotsLoading}
              disabled={!selectedKioskId || !isCurrent}
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

                {createdBooking?.sessionKey ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <KeyRound className="mx-auto h-5 w-5 text-emerald-700 dark:text-emerald-300" />
                    <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Mã PIN vào Kiosk
                    </p>
                    <p className="mt-1 font-mono text-3xl font-black tracking-[0.24em] text-emerald-800 dark:text-emerald-200">
                      {createdBooking.sessionKey}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-emerald-700/80 dark:text-emerald-300/80">
                      Giữ mã này để nhập tại trạm Kiosk. Mã cũng được gửi qua thông báo.
                    </p>
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
    </div>
  );
}
