import { ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { kioskManager } from "@/services/kiosk.manager";
import { CalendarDays, ChevronRight, History, MapPin, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  KioskFormDialog,
  KioskHistoryTab,
  KioskScheduleGrid,
  ScheduleFormDialog,
} from "./components";
import type { DayOfWeek, Kiosk, KioskFormValues, KioskSchedule, ScheduleFormValues } from "./types";

function parseKioskId(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function KioskDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kioskId: kioskIdRaw } = useParams<{ kioskId: string }>();
  const kioskId = parseKioskId(kioskIdRaw);

  const [kiosk, setKiosk] = useState<Kiosk | null>(null);
  const [schedules, setSchedules] = useState<KioskSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  // Edit kiosk dialog
  const [editOpen, setEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schedule form dialog
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<KioskSchedule | null>(null);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [presetDay, setPresetDay] = useState<DayOfWeek | null>(null);
  const [showLegacyHeader] = useState(false);

  const loadData = useCallback(
    async (showReloading = false) => {
      if (kioskId === null) return;
      if (showReloading) setIsReloading(true);
      else setIsLoading(true);
      try {
        const [kiosksRes, schedulesRes] = await Promise.all([
          kioskManager.getActiveKiosks(),
          kioskManager.getSchedulesByKiosk(kioskId),
        ]);

        const matched = (kiosksRes.data ?? []).find((k) => k.id === kioskId) ?? null;
        setKiosk(matched as Kiosk | null);

        if (schedulesRes.success) {
          setSchedules((schedulesRes.data ?? []) as KioskSchedule[]);
        } else {
          toast.error(schedulesRes.error || t("adminKioskManagement.unableToLoadSchedules"));
          setSchedules([]);
        }
      } catch (error) {
        console.error("Error loading kiosk detail:", error);
        toast.error(t("common.unableToLoadData"));
      } finally {
        setIsLoading(false);
        setIsReloading(false);
      }
    },
    [kioskId, t]
  );

  useEffect(() => {
    if (kioskId === null) {
      toast.error(t("adminKioskManagement.invalidKioskId"));
      navigate("/admin/kiosk-management", { replace: true });
      return;
    }
    void loadData();
  }, [kioskId, loadData, navigate, t]);

  const kioskStatus = useMemo(() => {
    if (!kiosk) return false;
    const k = kiosk as unknown as { isActive?: boolean; active?: boolean };
    return k.isActive ?? k.active ?? false;
  }, [kiosk]);

  const sortedSchedules = useMemo(() => {
    const dayOrder: Record<string, number> = {
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
      SUNDAY: 7,
    };
    return [...schedules].sort((a, b) => {
      const da = a.dayOfWeek ? (dayOrder[a.dayOfWeek] ?? 99) : 99;
      const db = b.dayOfWeek ? (dayOrder[b.dayOfWeek] ?? 99) : 99;
      if (da !== db) return da - db;
      return (a.openTime ?? "").localeCompare(b.openTime ?? "");
    });
  }, [schedules]);

  // ── Kiosk form handlers ─────────────────────────────────────────
  const handleKioskSubmit = async (values: KioskFormValues) => {
    if (!kiosk?.id) return;
    setIsSubmitting(true);
    try {
      const result = await kioskManager.updateKiosk(kiosk.id, values);
      if (result.success) {
        toast.success(t("adminKioskManagement.kioskUpdated"));
        setEditOpen(false);
        await loadData(true);
      } else {
        toast.error(result.error || t("adminKioskManagement.unableToUpdateKiosk"));
      }
    } catch (error) {
      console.error("Error updating kiosk:", error);
      toast.error(t("common.unableToSave"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleKioskStatus = async () => {
    if (!kiosk?.id) return;
    try {
      const result = await kioskManager.updateKiosk(kiosk.id, {
        name: kiosk.name ?? "",
        location: kiosk.location ?? "",
        isActive: !kioskStatus,
      });
      if (result.success) {
        toast.success(t("adminKioskManagement.kioskUpdated"));
        await loadData(true);
      } else {
        toast.error(result.error || t("adminKioskManagement.unableToUpdateKiosk"));
      }
    } catch (error) {
      console.error("Error toggling kiosk:", error);
      toast.error(t("common.unableToSave"));
    }
  };

  // ── Schedule form handlers ──────────────────────────────────────
  const openCreateSchedule = (dayOfWeek: DayOfWeek) => {
    setPresetDay(dayOfWeek);
    setEditingSchedule(null);
    setScheduleFormOpen(true);
  };

  const openEditSchedule = (schedule: KioskSchedule) => {
    setPresetDay(null);
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  const closeScheduleForm = () => {
    setScheduleFormOpen(false);
    setEditingSchedule(null);
    setPresetDay(null);
  };

  const handleScheduleSubmit = async (values: ScheduleFormValues) => {
    if (kioskId === null) return;
    setScheduleSubmitting(true);
    try {
      if (editingSchedule?.id) {
        const result = await kioskManager.updateSchedule(editingSchedule.id, values);
        if (result.success) {
          toast.success(t("adminKioskManagement.scheduleUpdated"));
          closeScheduleForm();
          await loadData(true);
        } else {
          toast.error(result.error || t("adminKioskManagement.unableToUpdateSchedule"));
        }
      } else {
        const result = await kioskManager.createSchedule(values);
        if (result.success) {
          toast.success(t("adminKioskManagement.scheduleCreated"));
          closeScheduleForm();
          await loadData(true);
        } else {
          toast.error(result.error || t("adminKioskManagement.unableToCreateSchedule"));
        }
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error(t("common.unableToSave"));
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleToggleScheduleStatus = async (schedule: KioskSchedule): Promise<boolean> => {
    if (!schedule.id || kioskId === null) return false;
    try {
      const s = schedule as unknown as { isActive?: boolean; active?: boolean };
      const result = await kioskManager.updateSchedule(schedule.id, {
        kioskId,
        dayOfWeek: (schedule.dayOfWeek ?? "MONDAY") as DayOfWeek,
        openTime: schedule.openTime ?? "09:00:00",
        closeTime: schedule.closeTime ?? "17:00:00",
        slotDurationMinutes: schedule.slotDurationMinutes ?? 60,
        isActive: !(s.isActive ?? s.active ?? false),
      });
      if (result.success) {
        toast.success(t("adminKioskManagement.scheduleUpdated"));
        await loadData(true);
        return true;
      } else {
        toast.error(result.error || t("adminKioskManagement.unableToUpdateSchedule"));
        return false;
      }
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast.error(t("common.unableToSave"));
      return false;
    }
  };

  if (kioskId === null) return null;

  // Build initial schedule with preset day for the create form
  const presetSchedule =
    presetDay && !editingSchedule
      ? ({ dayOfWeek: presetDay, kioskId } as unknown as KioskSchedule)
      : null;

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      {showLegacyHeader && (
        <div className="flex flex-none flex-col justify-center gap-3 border-b border-slate-200 bg-white p-4 sm:h-[68px] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 dark:border-slate-800 dark:bg-slate-900">
          {/* Left: Breadcrumb */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/kiosk-management")}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              {t("adminKioskManagement.title", "Quản lý Kiosk")}
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {isLoading ? (
              <div className="h-4 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            ) : (
              <>
                <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
                  {kiosk?.name || `Kiosk #${kioskId}`}
                </h1>
                <Badge
                  variant="outline"
                  className="gap-1 border-slate-200 font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  #{kioskId}
                </Badge>
                <Badge
                  className={
                    kioskStatus
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }>
                  {kioskStatus
                    ? t("adminKioskManagement.active", "Hoạt động")
                    : t("adminKioskManagement.inactive", "Dừng hoạt động")}
                </Badge>
              </>
            )}
          </div>

          {/* Right: Actions */}
          {!isLoading && kiosk && (
            <div className="flex items-center gap-3">
              {/* Location */}
              <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-600 lg:flex dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                {kiosk?.location || t("adminKioskManagement.noLocation")}
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500">
                  {kioskStatus
                    ? t("adminKioskManagement.active")
                    : t("adminKioskManagement.inactive")}
                </span>
                <Switch
                  checked={kioskStatus}
                  onCheckedChange={() => void handleToggleKioskStatus()}
                  className="shadow-xs data-[state=checked]:bg-emerald-500"
                />
              </div>

              <ReloadButton
                onReload={() => void loadData(true)}
                isLoading={isReloading}
                size="sm"
              />

              <Button
                type="button"
                onClick={() => setEditOpen(true)}
                variant="outline"
                className="h-8 gap-1.5 border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
                <Pencil className="h-3.5 w-3.5" />
                {t("common.edit")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── SCROLLABLE CONTENT ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
        <div className="hidden">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-950 dark:text-white">
                {isLoading
                  ? t("adminKioskManagement.loadingKiosks", "Đang tải Kiosk...")
                  : kiosk?.name || `Kiosk #${kioskId}`}
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-400">#{kioskId}</span>
              <span
                className={
                  kioskStatus
                    ? "inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400"
                }>
                <span
                  className={
                    kioskStatus
                      ? "h-2 w-2 rounded-full bg-emerald-500"
                      : "h-2 w-2 rounded-full bg-slate-400"
                  }
                />
                {kioskStatus
                  ? t("adminKioskManagement.active", "Hoạt động")
                  : t("adminKioskManagement.inactive", "Đã tắt")}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
              {kiosk?.location || t("adminKioskManagement.noLocation", "Chưa cập nhật vị trí")}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={!kiosk || isLoading}
            className="group/btn h-8.5 shrink-0 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400">
            <Pencil className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/btn:text-indigo-500" />
            {t("common.edit", "Chỉnh sửa")}
          </Button>
        </div>
        {/* ── SCHEDULE GRID SECTION ────────────────────────────────── */}
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-lg font-bold text-slate-950 dark:text-white">
                {t("adminKioskManagement.weeklySchedule", "Lịch hoạt động theo tuần")}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(
                  "adminKioskManagement.weeklyScheduleDescription",
                  "Quản lý các khung giờ hoạt động của Kiosk"
                )}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditOpen(true)}
            disabled={!kiosk || isLoading}
            className="group/btn h-8.5 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400">
            <Pencil className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/btn:text-indigo-500" />
            {t("common.edit", "Chỉnh sửa")}
          </Button>
        </div>
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("adminKioskManagement.scheduleGridTitle")}
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {sortedSchedules.length} {t("adminKioskManagement.scheduleCount", "khung giờ")}
            </span>
          </div>
          <div className="p-5">
            <div className="mb-5 grid gap-3 border-b border-slate-200 pb-5 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {t("adminKioskManagement.kioskName", "Tên trạm Kiosk")}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {kiosk?.name || `Kiosk #${kioskId}`}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {t("common.id", "Mã")}
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-slate-700 dark:text-slate-200">
                  #{kioskId}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {t("adminKioskManagement.location", "Vị trí")}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                  {kiosk?.location || t("adminKioskManagement.noLocation", "Chưa cập nhật")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {t("common.status", "Trạng thái")}
                </p>
                <p
                  className={
                    kioskStatus
                      ? "mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400"
                      : "mt-1 text-sm font-bold text-slate-500 dark:text-slate-400"
                  }>
                  {kioskStatus
                    ? t("adminKioskManagement.active", "Hoạt động")
                    : t("adminKioskManagement.inactive", "Đã tắt")}
                </p>
              </div>
            </div>
            <KioskScheduleGrid
              kioskId={kioskId}
              schedules={sortedSchedules}
              isLoading={isLoading}
              onCreateSchedule={openCreateSchedule}
              onEditSchedule={openEditSchedule}
              onToggleStatus={handleToggleScheduleStatus}
            />
          </div>
        </div>

        {/* ── HISTORY SECTION ──────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
            <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("adminKioskManagement.historyTitle")}
            </h2>
          </div>

          <KioskHistoryTab kioskId={kioskId} />
        </div>
      </div>

      {/* ── DIALOGS ────────────────────────────────────────────────── */}
      <KioskFormDialog
        key={`kiosk-form-${kiosk?.id ?? "new"}-${editOpen}`}
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false);
          else setEditOpen(true);
        }}
        initialKiosk={kiosk}
        onSubmit={handleKioskSubmit}
        isSubmitting={isSubmitting}
      />

      <ScheduleFormDialog
        key={`schedule-form-${editingSchedule?.id ?? presetDay ?? "new"}-${scheduleFormOpen}-${kioskId}`}
        open={scheduleFormOpen}
        onOpenChange={(open) => {
          if (!open) closeScheduleForm();
          else setScheduleFormOpen(true);
        }}
        kioskId={kioskId}
        initialSchedule={editingSchedule ?? presetSchedule}
        onSubmit={handleScheduleSubmit}
        onToggleStatus={handleToggleScheduleStatus}
        isSubmitting={scheduleSubmitting}
      />
    </div>
  );
}
