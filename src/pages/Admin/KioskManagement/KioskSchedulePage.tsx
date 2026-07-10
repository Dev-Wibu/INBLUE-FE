import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { kioskManager } from "@/services/kiosk.manager";
import { ArrowLeft, Building2, CalendarDays, Clock4, Loader2, Plus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ScheduleFormDialog, ScheduleTable } from "./components";
import type { Kiosk, KioskSchedule, ScheduleFormValues } from "./types";

interface ParsedKioskId {
  status: "ok" | "invalid";
  value: number | null;
}

function parseKioskId(raw: string | undefined): ParsedKioskId {
  if (!raw) return { status: "invalid", value: null };
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return { status: "invalid", value: null };
  return { status: "ok", value: parsed };
}

export function KioskSchedulePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kioskId: kioskIdRaw } = useParams<{ kioskId: string }>();
  const parsed = parseKioskId(kioskIdRaw);

  const [schedules, setSchedules] = useState<KioskSchedule[]>([]);
  const [kiosk, setKiosk] = useState<Kiosk | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<KioskSchedule | null>(null);

  const kioskId = parsed.value;

  const loadData = useCallback(
    async (showReloading = false) => {
      if (kioskId === null) return;
      if (showReloading) setIsReloading(true);
      else setIsInitialLoading(true);
      try {
        const [schedulesRes, kiosksRes] = await Promise.all([
          kioskManager.getSchedulesByKiosk(kioskId),
          kioskManager.getActiveKiosks(),
        ]);

        if (!schedulesRes.success) {
          toast.error(schedulesRes.error || t("adminKioskManagement.unableToLoadSchedules"));
          setSchedules([]);
        } else {
          setSchedules((schedulesRes.data ?? []) as KioskSchedule[]);
        }

        const matched =
          (kiosksRes.data ?? []).find((k) => k.id === kioskId) ??
          // Fallback: tạo kiosk placeholder nếu API không trả về (ví dụ kiosk vừa bị deactivated)
          ({ id: kioskId, name: "", location: "", isActive: true } as Kiosk);
        setKiosk(matched);
      } catch (error) {
        console.error("Error loading schedules:", error);
        toast.error(t("adminKioskManagement.unableToLoadSchedules"));
      } finally {
        setIsInitialLoading(false);
        setIsReloading(false);
      }
    },
    [kioskId, t]
  );

  useEffect(() => {
    if (parsed.status === "invalid") {
      toast.error(t("adminKioskManagement.invalidKioskId"));
      navigate("/admin/kiosk-management", { replace: true });
      return;
    }
    void loadData();
  }, [parsed.status, loadData, navigate, t]);

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

  const stats = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((item) => {
      const s = item as unknown as { isActive?: boolean; active?: boolean };
      return s.isActive ?? s.active ?? false;
    }).length;
    const days = new Set(
      schedules.map((s) => s.dayOfWeek).filter((d): d is NonNullable<typeof d> => !!d)
    );
    return { total, active, daysCovered: days.size };
  }, [schedules]);

  const openCreate = () => {
    setEditingSchedule(null);
    setFormOpen(true);
  };

  const openEdit = (schedule: KioskSchedule) => {
    setEditingSchedule(schedule);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = async (values: ScheduleFormValues) => {
    if (kioskId === null) return;
    setIsSubmitting(true);
    try {
      if (editingSchedule?.id) {
        const result = await kioskManager.updateSchedule(editingSchedule.id, values);
        if (result.success) {
          toast.success(t("adminKioskManagement.scheduleUpdated"));
          closeForm();
          await loadData(true);
        } else {
          toast.error(result.error || t("adminKioskManagement.unableToUpdateSchedule"));
        }
      } else {
        const result = await kioskManager.createSchedule(values);
        if (result.success) {
          toast.success(t("adminKioskManagement.scheduleCreated"));
          closeForm();
          await loadData(true);
        } else {
          toast.error(result.error || t("adminKioskManagement.unableToCreateSchedule"));
        }
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error(t("common.unableToSave"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (schedule: KioskSchedule) => {
    if (!schedule.id) return;
    try {
      const s = schedule as unknown as { isActive?: boolean; active?: boolean };
      const result = await kioskManager.updateSchedule(schedule.id, {
        kioskId: schedule.kioskId ?? kioskId ?? 0,
        dayOfWeek: (schedule.dayOfWeek ?? "MONDAY") as ScheduleFormValues["dayOfWeek"],
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

  if (parsed.status === "invalid" || kioskId === null) {
    return null;
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-border bg-card flex flex-none flex-col gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/kiosk-management")}
            className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {t("common.administration")}
            </div>
            <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight">
              {kiosk?.name || t("adminKioskManagement.title")}
            </h1>
            <p className="text-muted-foreground truncate text-xs sm:text-sm">
              {kiosk?.location || t("adminKioskManagement.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <Link to="/admin/kiosk-management" className="hover:text-primary transition-colors">
              {t("adminKioskManagement.title")}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{kiosk?.name || `#${kioskId}`}</span>
            <span className="bg-muted text-foreground/80 ml-2 rounded-md px-2 py-0.5 font-mono">
              #{kioskId}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ReloadButton onReload={() => void loadData(true)} isLoading={isReloading} size="sm" />
            <button
              type="button"
              onClick={openCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium shadow-sm transition-colors">
              <Plus className="h-4 w-4" />
              {t("adminKioskManagement.createScheduleButton")}
            </button>
          </div>
        </div>

        {!isInitialLoading && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-foreground text-lg font-semibold">{stats.total}</p>
                <p className="text-muted-foreground text-xs">
                  {t("adminKioskManagement.totalSchedules")}
                </p>
              </div>
            </div>
            <div className="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-foreground text-lg font-semibold">{stats.daysCovered}/7</p>
                <p className="text-muted-foreground text-xs">
                  {t("adminKioskManagement.daysCovered")}
                </p>
              </div>
            </div>
            <div className="border-border bg-card flex items-center gap-3 rounded-xl border px-4 py-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <Clock4 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-foreground text-lg font-semibold">{stats.active}</p>
                <p className="text-muted-foreground text-xs">
                  {t("adminKioskManagement.activeSchedules")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4 sm:px-6 sm:py-6">
        <ScheduleTable
          schedules={sortedSchedules}
          isLoading={isInitialLoading}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />

        {isInitialLoading ? (
          <div className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("common.loading")}
          </div>
        ) : sortedSchedules.length === 0 ? null : (
          <p className="text-muted-foreground mt-4 text-center text-xs">
            {t("adminKioskManagement.scheduleHint")}
          </p>
        )}
      </div>

      <ScheduleFormDialog
        key={`schedule-form-${editingSchedule?.id ?? "new"}-${formOpen}-${kioskId}`}
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setFormOpen(true);
        }}
        kioskId={kioskId}
        initialSchedule={editingSchedule}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
