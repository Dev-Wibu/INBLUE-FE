import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Building2, Clock4, MapPin, MoreHorizontal, Pencil, Plus } from "lucide-react";
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
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
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
      <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
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
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-[80px] pl-6 font-medium text-slate-500">ID</TableHead>
            <TableHead className="min-w-[240px] font-medium text-slate-500">
              Tên trạm Kiosk
            </TableHead>
            <TableHead className="min-w-[200px] font-medium text-slate-500">Vị trí trạm</TableHead>
            <TableHead className="w-[140px] font-medium text-slate-500">Lịch hoạt động</TableHead>
            <TableHead className="w-[100px] text-center font-medium text-slate-500">
              Bật/Tắt
            </TableHead>
            <TableHead className="w-[130px] font-medium text-slate-500">Ngày tạo</TableHead>
            <TableHead className="w-[80px] pr-6 text-right font-medium text-slate-500">
              Thao tác
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
                className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                {/* ID Column */}
                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{kiosk.id}
                </TableCell>

                {/* Name */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {kiosk.name ?? `Trạm Kiosk #${kiosk.id}`}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Location */}
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    {kiosk.location || "Chưa cập nhật vị trí"}
                  </span>
                </TableCell>

                {/* Schedules count */}
                <TableCell>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Clock4 className="h-3 w-3 text-indigo-500" />
                    {kiosk.scheduleCount ?? 0} khung giờ
                  </span>
                </TableCell>

                {/* Status Switch */}
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => onToggleStatus(kiosk)}
                    className="shadow-xs data-[state=checked]:bg-emerald-500"
                  />
                </TableCell>

                {/* Created Date */}
                <TableCell>
                  {createdAtFormatted ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {createdAtFormatted}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>

                {/* Actions Dropdown */}
                <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onEdit(kiosk)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4 text-slate-500" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
