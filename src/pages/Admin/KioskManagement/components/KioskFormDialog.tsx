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
import { Building2, Loader2, MapPin, Power, Sparkles } from "lucide-react";
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
      <DialogContent className="max-h-[90vh] max-w-md gap-0 overflow-hidden p-0">
        <div className="from-primary/10 via-primary/5 relative bg-gradient-to-br to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {t("common.administration")}
            </div>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="text-primary h-5 w-5" />
              {isEdit ? t("adminKioskManagement.editKiosk") : t("adminKioskManagement.createKiosk")}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? t("adminKioskManagement.editKioskDescription")
                : t("adminKioskManagement.createKioskDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-5 pb-6">
          <div className="space-y-2">
            <Label htmlFor="kiosk-name">{t("adminKioskManagement.nameLabel")}</Label>
            <div className="relative">
              <Building2 className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="kiosk-name"
                value={values.name}
                onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                placeholder={t("adminKioskManagement.namePlaceholder")}
                className="pl-9"
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
            <Label htmlFor="kiosk-location">{t("adminKioskManagement.locationLabel")}</Label>
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
                className="pl-9"
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

          <div className="border-border bg-muted/30 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
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
                t("adminKioskManagement.createKioskButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
