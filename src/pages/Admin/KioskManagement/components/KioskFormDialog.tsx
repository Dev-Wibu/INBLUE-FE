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
import { Switch } from "@/components/ui/switch";
import { Building2, Loader2, MapPin, Power } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Kiosk, KioskFormValues } from "../types";

interface KioskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKiosk?: Kiosk | null;
  onSubmit: (values: KioskFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

const EMPTY_VALUES: KioskFormValues = {
  name: "",
  location: "",
  isActive: true,
};

function valuesFromKiosk(kiosk: Kiosk): KioskFormValues {
  const k = kiosk as unknown as { isActive?: boolean; active?: boolean };
  return {
    name: kiosk.name ?? "",
    location: kiosk.location ?? "",
    isActive: k.isActive ?? k.active ?? true,
  };
}

export function KioskFormDialog({
  open,
  onOpenChange,
  initialKiosk,
  onSubmit,
  isSubmitting,
}: KioskFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initialKiosk?.id;

  const initialValues: KioskFormValues = initialKiosk
    ? valuesFromKiosk(initialKiosk)
    : EMPTY_VALUES;
  const [values, setValues] = useState<KioskFormValues>(initialValues);
  const [touched, setTouched] = useState<{ name?: boolean; location?: boolean }>({});

  const nameError = touched.name && values.name.trim().length === 0;
  const locationError = touched.location && values.location.trim().length === 0;
  const isInvalid = values.name.trim().length === 0 || values.location.trim().length === 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ name: true, location: true });
    if (isInvalid) return;
    await onSubmit({
      name: values.name.trim(),
      location: values.location.trim(),
      isActive: values.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden rounded-[24px] border border-slate-200/90 bg-white !p-0 shadow-2xl sm:max-w-[520px] dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200/90 bg-slate-100/90 px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {isEdit ? t("adminKioskManagement.editKiosk") : t("adminKioskManagement.createKiosk")}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {isEdit
                ? t("adminKioskManagement.editKioskDescription")
                : t("adminKioskManagement.createKioskDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label
              htmlFor="kiosk-name"
              className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("adminKioskManagement.nameLabel")}
            </Label>
            <div className="relative">
              <Building2 className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="kiosk-name"
                value={values.name}
                onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder={t("adminKioskManagement.namePlaceholder")}
                className="h-10.5 rounded-xl border border-slate-200 bg-slate-50/50 pl-9 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100"
                aria-invalid={nameError || undefined}
                maxLength={120}
                required
              />
            </div>
            {nameError && (
              <p className="text-destructive text-xs">{t("adminKioskManagement.nameRequired")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="kiosk-location"
              className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("adminKioskManagement.locationLabel")}
            </Label>
            <div className="relative">
              <MapPin className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="kiosk-location"
                value={values.location}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, location: event.target.value }))
                }
                onBlur={() => setTouched((prev) => ({ ...prev, location: true }))}
                placeholder={t("adminKioskManagement.locationPlaceholder")}
                className="h-10.5 rounded-xl border border-slate-200 bg-slate-50/50 pl-9 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100"
                aria-invalid={locationError || undefined}
                maxLength={240}
                required
              />
            </div>
            {locationError && (
              <p className="text-destructive text-xs">
                {t("adminKioskManagement.locationRequired")}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Power className="h-4 w-4" />
              </div>
              <div>
                <Label htmlFor="kiosk-active" className="text-sm font-medium">
                  {t("adminKioskManagement.statusLabel")}
                </Label>
                <p className="text-muted-foreground text-xs">
                  {t("adminKioskManagement.statusDescription")}
                </p>
              </div>
            </div>
            <Switch
              id="kiosk-active"
              checked={values.isActive}
              onCheckedChange={(checked) => setValues((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>

          <DialogFooter className="-mx-6 mt-2 -mb-6 gap-2 border-t border-slate-200/90 bg-slate-100/90 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-950">
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
                t("adminKioskManagement.createKioskButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
