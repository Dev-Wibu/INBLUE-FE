import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Building2, Clock4, MapPin, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Kiosk } from "../types";

export interface KioskTableRow extends Kiosk {
  scheduleCount?: number;
}

interface KioskTableProps {
  kiosks: KioskTableRow[];
  isLoading?: boolean;
  onEdit: (kiosk: Kiosk) => void;
  onToggleStatus: (kiosk: Kiosk) => void;
  onCreate?: () => void;
  emptyMessage?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return null;
  }
}

export function KioskTable({
  kiosks,
  isLoading,
  onEdit,
  onToggleStatus,
  onCreate,
  emptyMessage,
}: KioskTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-400" />
        </div>
      </div>
    );
  }

  if (kiosks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Building2 className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {emptyMessage ?? t("adminKioskManagement.noKiosks")}
          </p>
          {onCreate && (
            <Button
              variant="link"
              size="sm"
              onClick={onCreate}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("adminKioskManagement.createKioskButton")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[70px] min-w-[70px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              ID
            </TableHead>
            <TableHead className="w-[32%] min-w-[220px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminKioskManagement.kioskName", "Tên trạm Kiosk")}
            </TableHead>
            <TableHead className="w-[28%] min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminKioskManagement.location", "Vị trí trạm")}
            </TableHead>
            <TableHead className="w-[14%] min-w-[120px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminKioskManagement.operatingSchedule", "Lịch hoạt động")}
            </TableHead>
            <TableHead className="w-[10%] min-w-[90px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.onOff", "Bật/Tắt")}
            </TableHead>
            <TableHead className="w-[16%] min-w-[130px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.createdDate", "Ngày tạo")}
            </TableHead>
            <TableHead className="w-[90px] min-w-[90px] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
              {t("common.actions", "Thao tác")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kiosks.map((kiosk) => {
            const k = kiosk as unknown as { isActive?: boolean; active?: boolean };
            const isActive = k.isActive ?? k.active ?? false;
            const createdAtFormatted = formatDate(kiosk.createdAt);

            return (
              <TableRow
                key={kiosk.id}
                onClick={() => navigate(`/admin/kiosk-management/${kiosk.id}`)}
                className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                {/* ID Column */}
                <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>#{kiosk.id}</span>
                    {/* Dummy element to force row height alignment */}
                    <div
                      className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                      aria-hidden="true">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-3.5 w-3.5"></span>
                        <span>dummy</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-3.5 w-3.5"></span>
                        <span>sample</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Name */}
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                        {kiosk.name ??
                          t("adminKioskManagement.kioskStationWithId", `Trạm Kiosk #${kiosk.id}`, {
                            id: kiosk.id,
                          })}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Location */}
                <TableCell className="px-4 py-4 text-xs font-medium text-slate-700 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    {kiosk.location ||
                      t("adminKioskManagement.locationNotUpdated", "Chưa cập nhật vị trí")}
                  </span>
                </TableCell>

                {/* Schedules count */}
                <TableCell className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-100/90 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-100">
                    <Clock4 className="h-3 w-3 text-indigo-500" />
                    {t("adminKioskManagement.timeSlotsCount", {
                      count: kiosk.scheduleCount ?? 0,
                    })}
                  </span>
                </TableCell>

                {/* Status Switch */}
                <TableCell className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(kiosk)}
                    className={
                      isActive
                        ? "inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/80 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400"
                    }>
                    <span
                      className={
                        isActive
                          ? "h-2 w-2 rounded-full bg-emerald-500"
                          : "h-2 w-2 rounded-full bg-slate-400"
                      }
                    />
                    {isActive ? t("common.active", "Hoạt động") : t("common.shutDown", "Đã tắt")}
                  </button>
                </TableCell>

                {/* Created Date */}
                <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {createdAtFormatted ? (
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {createdAtFormatted}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>

                {/* Actions - Direct Edit Button */}
                <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(kiosk)}
                    className="group/btn h-8.5 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400">
                    <Pencil className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/btn:text-indigo-500" />
                    <span>{t("common.edit")}</span>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
