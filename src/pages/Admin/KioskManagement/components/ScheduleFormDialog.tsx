import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays,
  Clock4,
  Hourglass,
  Loader2,
  Power,
  Sparkles,
  Sun,
  Sunset,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DAYS_OF_WEEK,
  SLOT_DURATION_OPTIONS,
  type DayOfWeek,
  type KioskSchedule,
  type ScheduleFormValues,
} from "../types";

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kioskId: number;
  initialSchedule?: KioskSchedule | null;
  onSubmit: (values: ScheduleFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

const DEFAULT_VALUES: ScheduleFormValues = {
  kioskId: 0,
  dayOfWeek: "MONDAY",
  openTime: "09:00",
  closeTime: "17:00",
  slotDurationMinutes: 60,
  isActive: true,
};

function valuesFromSchedule(schedule: KioskSchedule): ScheduleFormValues {
  const s = schedule as unknown as { isActive?: boolean; active?: boolean };
  return {
    kioskId: schedule.kioskId ?? 0,
    dayOfWeek: (schedule.dayOfWeek ?? "MONDAY") as DayOfWeek,
    openTime: schedule.openTime?.slice(0, 5) ?? "09:00",
    closeTime: schedule.closeTime?.slice(0, 5) ?? "17:00",
    slotDurationMinutes: schedule.slotDurationMinutes ?? 60,
    isActive: s.isActive ?? s.active ?? true,
  };
}

function toHms(value: string): string {
  if (!value) return "09:00:00";
  // Pad HH:mm -> HH:mm:ss
  return value.length === 5 ? `${value}:00` : value;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  kioskId,
  initialSchedule,
  onSubmit,
  isSubmitting,
}: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initialSchedule?.id;

  const initialValues: ScheduleFormValues = initialSchedule
    ? valuesFromSchedule(initialSchedule)
    : { ...DEFAULT_VALUES, kioskId };
  const [values, setValues] = useState<ScheduleFormValues>(initialValues);
  const [touched, setTouched] = useState<{ openTime?: boolean; closeTime?: boolean }>({});

  const openMinutes = useMemo(() => {
    const [h = 0, m = 0] = values.openTime.split(":").map(Number);
    return h * 60 + m;
  }, [values.openTime]);

  const closeMinutes = useMemo(() => {
    const [h = 0, m = 0] = values.closeTime.split(":").map(Number);
    return h * 60 + m;
  }, [values.closeTime]);

  const timeRangeInvalid = closeMinutes <= openMinutes;
  const durationInvalid =
    values.slotDurationMinutes <= 0 ||
    (values.slotDurationMinutes + 15) * 1 > closeMinutes - openMinutes;

  const isInvalid = timeRangeInvalid || durationInvalid;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ openTime: true, closeTime: true });
    if (isInvalid) return;
    await onSubmit({
      kioskId,
      dayOfWeek: values.dayOfWeek,
      openTime: toHms(values.openTime),
      closeTime: toHms(values.closeTime),
      slotDurationMinutes: values.slotDurationMinutes,
      isActive: values.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md gap-0 overflow-hidden p-0">
        <div className="from-primary/10 via-primary/5 relative bg-gradient-to-br to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {t("common.administration")}
            </div>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CalendarDays className="text-primary h-5 w-5" />
              {isEdit
                ? t("adminKioskManagement.editSchedule")
                : t("adminKioskManagement.createSchedule")}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? t("adminKioskManagement.editScheduleDescription")
                : t("adminKioskManagement.createScheduleDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-5 pb-6">
          <div className="space-y-2">
            <Label htmlFor="schedule-day">{t("adminKioskManagement.dayLabel")}</Label>
            <Select
              value={values.dayOfWeek}
              onValueChange={(value) =>
                setValues((prev) => ({ ...prev, dayOfWeek: value as DayOfWeek }))
              }>
              <SelectTrigger id="schedule-day" className="w-full">
                <SelectValue placeholder={t("adminKioskManagement.dayPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day} value={day}>
                    {t(`adminKioskManagement.days.${day}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="schedule-open" className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                {t("adminKioskManagement.openTimeLabel")}
              </Label>
              <Input
                id="schedule-open"
                type="time"
                step={60}
                value={values.openTime}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, openTime: event.target.value }))
                }
                onBlur={() => setTouched((prev) => ({ ...prev, openTime: true }))}
                aria-invalid={(touched.openTime && timeRangeInvalid) || undefined}
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-close" className="flex items-center gap-1.5">
                <Sunset className="text-primary h-3.5 w-3.5" />
                {t("adminKioskManagement.closeTimeLabel")}
              </Label>
              <Input
                id="schedule-close"
                type="time"
                step={60}
                value={values.closeTime}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, closeTime: event.target.value }))
                }
                onBlur={() => setTouched((prev) => ({ ...prev, closeTime: true }))}
                aria-invalid={(touched.closeTime && timeRangeInvalid) || undefined}
                className="font-mono"
                required
              />
            </div>
          </div>

          {(touched.openTime || touched.closeTime) && timeRangeInvalid && (
            <p className="text-destructive text-xs">{t("adminKioskManagement.timeRangeInvalid")}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="schedule-duration" className="flex items-center gap-1.5">
              <Hourglass className="text-primary h-3.5 w-3.5" />
              {t("adminKioskManagement.slotDurationLabel")}
            </Label>
            <Select
              value={String(values.slotDurationMinutes)}
              onValueChange={(value) =>
                setValues((prev) => ({
                  ...prev,
                  slotDurationMinutes: Number(value),
                }))
              }>
              <SelectTrigger id="schedule-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    <span className="flex items-center gap-2">
                      <Clock4 className="h-3.5 w-3.5" />
                      {t("adminKioskManagement.minutesShort", { count: minutes })}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {t("adminKioskManagement.slotDurationHint")}
            </p>
          </div>

          <div className="border-border bg-muted/30 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <Power className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="schedule-active" className="text-sm font-medium">
                  {t("adminKioskManagement.statusLabel")}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {t("adminKioskManagement.statusDescription")}
                </p>
              </div>
            </div>
            <Switch
              id="schedule-active"
              checked={values.isActive}
              onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isInvalid} className="min-w-32 gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("common.saving")}
                </>
              ) : isEdit ? (
                t("adminKioskManagement.saveChanges")
              ) : (
                t("adminKioskManagement.createScheduleButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
