import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock4,
  Hourglass,
  Loader2,
  Sun,
  Sunset,
  Trash2,
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
  onToggleStatus: (schedule: KioskSchedule) => Promise<boolean> | void;
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

interface TimePickerFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

function TimePickerField({ id, value, onChange }: TimePickerFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedHour = "09", selectedMinute = "00"] = value.split(":");
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-left text-sm font-semibold text-slate-900 transition-colors hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-indigo-700">
          <span className="flex items-center gap-2 font-mono text-sm">
            <Clock4 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {value}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform dark:text-slate-500 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[220px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {t("adminKioskManagement.selectTime", "Chọn thời gian")}
          </span>
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {value}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: t("adminKioskManagement.hoursShort", "Giờ"),
              options: hours,
              selected: selectedHour,
              part: "hour" as const,
            },
            {
              label: t("adminKioskManagement.minutesShortLabel", "Phút"),
              options: minutes,
              selected: selectedMinute,
              part: "minute" as const,
            },
          ].map(({ label, options, selected, part }) => (
            <div key={part}>
              <p className="mb-1 px-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase dark:text-slate-500">
                {label}
              </p>
              <div className="scrollbar-thin h-44 space-y-0.5 overflow-y-auto rounded-lg bg-slate-50 p-1 dark:bg-slate-900">
                {options.map((option) => {
                  const isSelected = option === selected;
                  const nextValue =
                    part === "hour" ? `${option}:${selectedMinute}` : `${selectedHour}:${option}`;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChange(nextValue)}
                      className={`flex h-7 w-full items-center justify-between rounded-md px-2 font-mono text-xs transition-colors ${
                        isSelected
                          ? "bg-indigo-600 font-bold text-white"
                          : "text-slate-600 hover:bg-white hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                      }`}>
                      {option}
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  kioskId,
  initialSchedule,
  onSubmit,
  onToggleStatus,
  isSubmitting,
}: ScheduleFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initialSchedule?.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white !p-0 shadow-2xl sm:max-w-[680px] dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200/90 bg-slate-100/90 px-7 py-5 dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {isEdit
                ? t("adminKioskManagement.editSchedule")
                : t("adminKioskManagement.createSchedule")}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEdit
                ? t("adminKioskManagement.editScheduleDescription")
                : t("adminKioskManagement.createScheduleDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 overflow-y-auto p-7 sm:grid-cols-2">
          <div className="order-1 space-y-2">
            <Label
              htmlFor="schedule-day"
              className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t("adminKioskManagement.dayLabel")}
            </Label>
            <Select
              value={values.dayOfWeek}
              onValueChange={(value) =>
                setValues((prev) => ({ ...prev, dayOfWeek: value as DayOfWeek }))
              }>
              <SelectTrigger
                id="schedule-day"
                className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
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

          <div className="contents">
            <div className="order-3 space-y-2">
              <Label
                htmlFor="schedule-open"
                className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                {t("adminKioskManagement.openTimeLabel")}
              </Label>
              <TimePickerField
                id="schedule-open"
                value={values.openTime}
                onChange={(openTime) => {
                  setValues((prev) => ({ ...prev, openTime }));
                  setTouched((prev) => ({ ...prev, openTime: true }));
                }}
              />
            </div>
            <div className="order-4 space-y-2">
              <Label
                htmlFor="schedule-close"
                className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                <Sunset className="h-3.5 w-3.5 text-indigo-500" />
                {t("adminKioskManagement.closeTimeLabel")}
              </Label>
              <TimePickerField
                id="schedule-close"
                value={values.closeTime}
                onChange={(closeTime) => {
                  setValues((prev) => ({ ...prev, closeTime }));
                  setTouched((prev) => ({ ...prev, closeTime: true }));
                }}
              />
            </div>
          </div>

          {(touched.openTime || touched.closeTime) && timeRangeInvalid && (
            <p className="text-destructive order-4 text-xs sm:col-span-2">
              {t("adminKioskManagement.timeRangeInvalid")}
            </p>
          )}

          <div className="order-2 space-y-2">
            <Label
              htmlFor="schedule-duration"
              className="flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-slate-200">
              <Hourglass className="h-3.5 w-3.5 text-indigo-500" />
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
              <SelectTrigger
                id="schedule-duration"
                className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-semibold dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100">
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
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("adminKioskManagement.slotDurationHint")}
            </p>
          </div>

          <DialogFooter className="order-5 -mx-7 mt-2 -mb-7 gap-2 border-t border-slate-200/90 bg-slate-100/90 px-7 py-4 sm:col-span-2 dark:border-slate-800 dark:bg-slate-950">
            {isEdit && initialSchedule && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting || isDeleting}
                className="mr-auto gap-2 rounded-xl text-xs font-semibold">
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isInvalid}
                className="h-9.5 min-w-32 gap-2 rounded-xl bg-indigo-600 px-6 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500">
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
            </div>
          </DialogFooter>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900">
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  {t("adminKioskManagement.confirmDeleteSchedule", "Xác nhận xóa lịch?")}
                </h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  {t(
                    "adminKioskManagement.confirmDeleteScheduleMessage",
                    "Bạn có chắc muốn xóa lịch này không? Hành động này không thể hoàn tác."
                  )}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      if (!initialSchedule) return;
                      setIsDeleting(true);
                      const success = await onToggleStatus(initialSchedule);
                      setIsDeleting(false);
                      if (success !== false) {
                        onOpenChange(false);
                      }
                    }}
                    disabled={isDeleting}
                    className="gap-2">
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("common.deleting", "Đang xóa...")}
                      </>
                    ) : (
                      t("common.delete")
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
