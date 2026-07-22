import { ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { kioskManager } from "@/services/kiosk.manager";
import { ArrowLeft, CalendarDays, History, MapPin, Pencil, Plus, Sparkles } from "lucide-react";
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

  const handleToggleScheduleStatus = async (schedule: KioskSchedule) => {
    if (!schedule.id || kioskId === null) return;
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
      } else {
        toast.error(result.error || t("adminKioskManagement.unableToUpdateSchedule"));
      }
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast.error(t("common.unableToSave"));
    }
  };

  if (kioskId === null) return null;

  const createdAtFormatted = kiosk?.createdAt
    ? (() => {
        try {
          return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(kiosk.createdAt));
        } catch {
          return null;
        }
      })()
    : null;

  // Build initial schedule with preset day for the create form
  const presetSchedule =
    presetDay && !editingSchedule
      ? ({ dayOfWeek: presetDay, kioskId } as unknown as KioskSchedule)
      : null;

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/kiosk-management")}
            className="h-9 w-9 shrink-0 border-slate-200 dark:border-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {isLoading ? (
            <div className="space-y-1.5">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                {t("adminKioskManagement.title")}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {kiosk?.name || `Kiosk #${kioskId}`}
                </h1>
                <Badge
                  variant="outline"
                  className="gap-1 border-slate-200 font-mono text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  #{kioskId}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {!isLoading && kiosk && (
          <div className="flex items-center gap-3">
            {/* Location */}
            <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-600 lg:flex dark:text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              {kiosk.location || t("adminKioskManagement.noLocation")}
            </div>

            {/* Created date */}
            {createdAtFormatted && (
              <span className="hidden text-xs text-slate-400 lg:inline">
                {t("adminKioskManagement.createdAt")}: {createdAtFormatted}
              </span>
            )}

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

            <ReloadButton onReload={() => void loadData(true)} isLoading={isReloading} size="sm" />

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

      {/* ── SCROLLABLE CONTENT ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {/* ── SCHEDULE GRID SECTION ────────────────────────────────── */}
        <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("adminKioskManagement.scheduleGridTitle")}
              </h2>
            </div>
            <Button
              type="button"
              onClick={() => openCreateSchedule("MONDAY")}
              className="h-8 gap-1.5 bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              {t("adminKioskManagement.createScheduleButton")}
            </Button>
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

        {/* ── HISTORY SECTION ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
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
        isSubmitting={scheduleSubmitting}
      />
    </div>
  );
}
