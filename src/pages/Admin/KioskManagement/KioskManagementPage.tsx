import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { kioskManager } from "@/services/kiosk.manager";
import { Building2, Plus, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
        const kiosksRes = await kioskManager.getActiveKiosks();

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
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── TOOLBAR ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
              <Sparkles className="h-3.5 w-3.5 text-pink-500" />
              {t("common.administration")}
            </div>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t("adminKioskManagement.title")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              placeholder={t("adminKioskManagement.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 pl-9 text-xs focus-visible:ring-pink-500"
            />
          </div>
          <ReloadButton onReload={() => void loadData(true)} isLoading={isReloading} size="sm" />
          <Button
            type="button"
            onClick={openCreate}
            className="h-8 gap-1.5 bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            {t("adminKioskManagement.createKioskButton")}
          </Button>
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT AREA ────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {searchQuery.trim().length > 0 && (
          <div className="mb-3 flex items-center gap-2 px-6 pt-4">
            <span className="text-xs text-slate-500">
              Hiển thị{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {filteredKiosks.length}
              </strong>{" "}
              / <strong>{kiosks.length}</strong> trạm Kiosk
            </span>
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

      {/* ── DIALOGS ────────────────────────────────────────────────────────── */}
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
