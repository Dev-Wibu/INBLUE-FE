import { ReloadButton } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { kioskManager } from "@/services/kiosk.manager";
import { Building2, Plus, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { KioskFormDialog, KioskTable, type KioskTableRow } from "./components";
import type { Kiosk, KioskFormValues } from "./types";

export function KioskManagementPage() {
  const { t } = useTranslation();
  const [kiosks, setKiosks] = useState<KioskTableRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);

  const filteredKiosks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return kiosks;
    return kiosks.filter((k) =>
      [k.name, k.location, String(k.id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [kiosks, searchQuery]);

  const loadData = useCallback(
    async (showReloading = false) => {
      if (showReloading) setIsReloading(true);
      else setIsInitialLoading(true);

      try {
        const [kiosksRes, ...scheduleResults] = await Promise.all([
          kioskManager.getActiveKiosks(),
          ...([] as []),
        ]);

        if (!kiosksRes.success) {
          toast.error(kiosksRes.error || t("adminKioskManagement.unableToLoadKiosks"));
          setKiosks([]);
          return;
        }

        const raw = (kiosksRes.data ?? []) as Kiosk[];

        const counts = await Promise.all(
          raw.map(async (kiosk) => {
            if (!kiosk.id) return { id: kiosk.id ?? null, scheduleCount: 0 };
            const result = await kioskManager.getSchedulesByKiosk(kiosk.id);
            return {
              id: kiosk.id ?? null,
              scheduleCount: result.success ? (result.data ?? []).length : 0,
            };
          })
        );
        void scheduleResults;

        const countMap = new Map(counts.map((c) => [c.id, c.scheduleCount]));
        const enriched: KioskTableRow[] = raw.map((k) => ({
          ...k,
          scheduleCount: countMap.get(k.id ?? null) ?? 0,
        }));
        setKiosks(enriched);
      } catch (error) {
        console.error("Error loading kiosks:", error);
        toast.error(t("adminKioskManagement.unableToLoadKiosks"));
      } finally {
        setIsInitialLoading(false);
        setIsReloading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingKiosk(null);
    setFormOpen(true);
  };

  const openEdit = (kiosk: Kiosk) => {
    setEditingKiosk(kiosk);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingKiosk(null);
  };

  const handleSubmit = async (values: KioskFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingKiosk?.id) {
        const result = await kioskManager.updateKiosk(editingKiosk.id, values);
        if (result.success) {
          toast.success(t("adminKioskManagement.kioskUpdated"));
          closeForm();
          await loadData(true);
        } else {
          toast.error(result.error || t("adminKioskManagement.unableToUpdateKiosk"));
        }
      } else {
        const result = await kioskManager.createKiosk(values);
        if (result.success) {
          toast.success(t("adminKioskManagement.kioskCreated"));
          closeForm();
          await loadData(true);
        } else {
          toast.error(result.error || t("adminKioskManagement.unableToCreateKiosk"));
        }
      }
    } catch (error) {
      console.error("Error saving kiosk:", error);
      toast.error(t("common.unableToSave"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (kiosk: Kiosk) => {
    if (!kiosk.id) return;
    try {
      const k = kiosk as unknown as { isActive?: boolean; active?: boolean };
      const result = await kioskManager.updateKiosk(kiosk.id, {
        name: kiosk.name ?? "",
        location: kiosk.location ?? "",
        isActive: !(k.isActive ?? k.active ?? false),
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

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-border bg-card flex flex-none flex-col gap-4 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              {t("common.administration")}
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight">
              {t("adminKioskManagement.title")}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {t("adminKioskManagement.description")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder={t("adminKioskManagement.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 w-full pl-9"
            />
          </div>
          <ReloadButton onReload={() => void loadData(true)} isLoading={isReloading} size="sm" />
          <button
            type="button"
            onClick={openCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium shadow-sm transition-colors">
            <Plus className="h-4 w-4" />
            {t("adminKioskManagement.createKioskButton")}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 sm:px-6 sm:py-6">
        {!isInitialLoading && filteredKiosks.length === 0 && (
          <div className="border-border bg-muted/30 text-muted-foreground mb-4 flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs">
            <Search className="h-3.5 w-3.5" />
            {searchQuery.trim().length > 0
              ? t("adminKioskManagement.noSearchResults")
              : t("adminKioskManagement.noKiosksHint")}
            <Link
              to="/admin/kiosk-bookings"
              className="text-primary ml-auto font-semibold hover:underline">
              {t("adminKioskManagement.goToBookings")} →
            </Link>
          </div>
        )}

        <KioskTable
          kiosks={filteredKiosks}
          isLoading={isInitialLoading}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
          onCreate={openCreate}
        />
      </div>

      <KioskFormDialog
        key={`kiosk-form-${editingKiosk?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setFormOpen(true);
        }}
        initialKiosk={editingKiosk}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
