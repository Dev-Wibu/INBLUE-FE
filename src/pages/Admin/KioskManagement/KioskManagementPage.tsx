import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import { kioskManager } from "@/services/kiosk.manager";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { KioskFormDialog, KioskTable, type KioskTableRow } from "./components";
import type { Kiosk, KioskFormValues } from "./types";

export function KioskManagementPage() {
  const { t } = useTranslation();
  const [kiosks, setKiosks] = useState<KioskTableRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);

  const filteredKiosks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return kiosks.filter((kiosk) => {
      const status = kiosk as Kiosk & { isActive?: boolean; active?: boolean };
      const isActive = status.isActive ?? status.active ?? false;
      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (!query) return true;
      return [kiosk.name, kiosk.location, String(kiosk.id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [kiosks, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const activeCount = kiosks.filter((kiosk) => {
      const status = kiosk as Kiosk & { isActive?: boolean; active?: boolean };
      return status.isActive ?? status.active ?? false;
    }).length;
    return [
      [kiosks.length, t("adminKioskManagement.totalKiosks", "Tổng Kiosk")],
      [activeCount, t("adminKioskManagement.activeKiosks", "Đang hoạt động")],
      [
        kiosks.reduce((total, kiosk) => total + (kiosk.scheduleCount ?? 0), 0),
        t("adminKioskManagement.totalSchedules", "Khung giờ hoạt động"),
      ],
    ] as const;
  }, [kiosks, t]);

  const loadData = useCallback(async () => {
    setIsInitialLoading(true);
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
          return { id: kiosk.id, scheduleCount: result.success ? (result.data ?? []).length : 0 };
        })
      );
      const countMap = new Map(counts.map((count) => [count.id, count.scheduleCount]));
      setKiosks(
        raw.map((kiosk) => ({ ...kiosk, scheduleCount: countMap.get(kiosk.id ?? null) ?? 0 }))
      );
    } catch (error) {
      console.error("Error loading kiosks:", error);
      toast.error(t("adminKioskManagement.unableToLoadKiosks"));
    } finally {
      setIsInitialLoading(false);
    }
  }, [t]);

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
      const result = editingKiosk?.id
        ? await kioskManager.updateKiosk(editingKiosk.id, values)
        : await kioskManager.createKiosk(values);
      if (result.success) {
        toast.success(
          t(
            editingKiosk?.id
              ? "adminKioskManagement.kioskUpdated"
              : "adminKioskManagement.kioskCreated"
          )
        );
        closeForm();
        await loadData();
      } else {
        toast.error(result.error || t("common.unableToSave"));
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
    const status = kiosk as Kiosk & { isActive?: boolean; active?: boolean };
    try {
      const result = await kioskManager.updateKiosk(kiosk.id, {
        name: kiosk.name ?? "",
        location: kiosk.location ?? "",
        isActive: !(status.isActive ?? status.active ?? false),
      });
      if (result.success) await loadData();
      else toast.error(result.error || t("adminKioskManagement.unableToUpdateKiosk"));
    } catch (error) {
      console.error("Error toggling kiosk:", error);
      toast.error(t("common.unableToSave"));
    }
  };

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      {isInitialLoading ? (
        <div className="flex h-64 items-center justify-center">
          <SpinnerBlock
            size="lg"
            label={t("adminKioskManagement.loadingKiosks", "Đang tải danh sách Kiosk...")}
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
          <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminKioskManagement.title", "Quản lý Kiosk")}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t(
                    "adminKioskManagement.description",
                    "Quản lý danh sách trạm Kiosk và lịch hoạt động"
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-5 sm:gap-6">
                {stats.map(([value, label], index) => (
                  <div key={label} className="flex items-center gap-5 sm:gap-6">
                    {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                    <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                      <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                        {value}
                      </span>
                      <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t(
                    "adminKioskManagement.searchPlaceholder",
                    "Tìm theo tên, vị trí hoặc mã Kiosk..."
                  )}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="h-[46px] shrink-0 rounded-xl px-6 font-semibold">
                <Search className="mr-2 h-[18px] w-[18px]" />
                {t("common.search", "Tìm kiếm")}
              </Button>
              <Button
                type="button"
                onClick={openCreate}
                className="h-[46px] shrink-0 rounded-xl bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("adminKioskManagement.createKioskButton", "Thêm Kiosk")}
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {t("common.status", "Trạng thái")}:
              </span>
              {[
                ["active", t("common.active", "Đang hoạt động")],
                ["inactive", t("common.shutDown", "Đã tắt")],
                ["all", t("common.allStatus", "Tất cả")],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${statusFilter === value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {(searchQuery || statusFilter !== "active") && (
            <div className="mb-3 px-1 text-xs text-slate-500">
              {t(
                "adminKioskManagement.showingFilteredKiosks",
                "Hiển thị {{filtered}} / {{total}} trạm Kiosk",
                { filtered: filteredKiosks.length, total: kiosks.length }
              )}
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <KioskTable
              kiosks={filteredKiosks}
              onEdit={openEdit}
              onToggleStatus={handleToggleStatus}
              onCreate={openCreate}
            />
          </div>
        </div>
      )}
      <KioskFormDialog
        key={`kiosk-form-${editingKiosk?.id ?? "new"}-${formOpen}`}
        open={formOpen}
        onOpenChange={(open) => (open ? setFormOpen(true) : closeForm())}
        initialKiosk={editingKiosk}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
