import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock4,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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

export function KioskTable({
  kiosks,
  isLoading,
  onEdit,
  onToggleStatus,
  onCreate,
  emptyMessage,
}: KioskTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
        </div>
      </div>
    );
  }

  if (kiosks.length === 0) {
    return (
      <div className="border-border bg-card flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed">
        <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-full">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-foreground text-sm font-semibold">
            {emptyMessage ?? t("adminKioskManagement.noKiosks")}
          </p>
          {onCreate && (
            <Button variant="link" size="sm" onClick={onCreate} className="text-primary">
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("adminKioskManagement.createKioskButton")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="font-semibold">{t("adminKioskManagement.nameColumn")}</TableHead>
            <TableHead className="hidden font-semibold md:table-cell">
              {t("adminKioskManagement.locationColumn")}
            </TableHead>
            <TableHead className="hidden font-semibold sm:table-cell">
              {t("adminKioskManagement.schedulesColumn")}
            </TableHead>
            <TableHead className="font-semibold">
              {t("adminKioskManagement.statusColumn")}
            </TableHead>
            <TableHead className="text-right font-semibold">
              {t("adminKioskManagement.actionsColumn")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kiosks.map((kiosk) => {
            const k = kiosk as unknown as { isActive?: boolean; active?: boolean };
            const isActive = k.isActive ?? k.active ?? false;
            return (
              <TableRow key={kiosk.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {kiosk.name ?? `Kiosk #${kiosk.id}`}
                      </p>
                      <p className="text-muted-foreground text-xs">#{kiosk.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    {kiosk.location ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary" className="gap-1">
                    <Clock4 className="h-3 w-3" />
                    {kiosk.scheduleCount ?? 0}
                  </Badge>
                </TableCell>
                <TableCell>
                  {isActive ? (
                    <Badge
                      variant="default"
                      className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("adminKioskManagement.active")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-muted-foreground gap-1">
                      <PowerOff className="h-3 w-3" />
                      {t("adminKioskManagement.inactive")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        {kiosk.id ? (
                          <Link
                            to={`/admin/kiosk-management/${kiosk.id}/schedules`}
                            className="flex cursor-pointer items-center gap-2">
                            <Clock4 className="h-4 w-4" />
                            {t("adminKioskManagement.manageSchedules")}
                            <ChevronRight className="ml-auto h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            {t("common.unavailable")}
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(kiosk)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onToggleStatus(kiosk)}
                        className="cursor-pointer">
                        {isActive ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            {t("adminKioskManagement.deactivate")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {t("adminKioskManagement.activate")}
                          </>
                        )}
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
