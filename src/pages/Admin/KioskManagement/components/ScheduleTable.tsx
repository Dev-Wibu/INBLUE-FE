import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { CalendarDays, CheckCircle2, Clock4, MoreHorizontal, Pencil, PowerOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DayOfWeek, KioskSchedule } from "../types";

interface ScheduleTableProps {
  schedules: KioskSchedule[];
  isLoading?: boolean;
  onEdit: (schedule: KioskSchedule) => void;
  onToggleStatus: (schedule: KioskSchedule) => void;
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "common.mon",
  TUESDAY: "common.tue",
  WEDNESDAY: "common.wed",
  THURSDAY: "common.thu",
  FRIDAY: "common.fri",
  SATURDAY: "common.sat",
  SUNDAY: "common.sun",
};

const formatTime = (time: string | undefined): string => {
  if (!time) return "—";
  // Server trả về HH:mm:ss; hiển thị HH:mm
  return time.length >= 5 ? time.slice(0, 5) : time;
};

export function ScheduleTable({
  schedules,
  isLoading,
  onEdit,
  onToggleStatus,
}: ScheduleTableProps) {
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

  if (schedules.length === 0) {
    return (
      <div className="border-border bg-card flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed">
        <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-full">
          <CalendarDays className="h-7 w-7" />
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          {t("adminKioskManagement.noSchedules")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="font-semibold">{t("adminKioskManagement.dayColumn")}</TableHead>
            <TableHead className="font-semibold">
              {t("adminKioskManagement.openTimeColumn")}
            </TableHead>
            <TableHead className="font-semibold">
              {t("adminKioskManagement.closeTimeColumn")}
            </TableHead>
            <TableHead className="hidden font-semibold sm:table-cell">
              {t("adminKioskManagement.slotDurationColumn")}
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
          {schedules.map((schedule) => {
            const day = schedule.dayOfWeek;
            const s = schedule as unknown as { isActive?: boolean; active?: boolean };
            const isActive = s.isActive ?? s.active ?? false;
            return (
              <TableRow key={schedule.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md">
                      <CalendarDays className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium">{day ? t(DAY_LABELS[day]) : "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{formatTime(schedule.openTime)}</span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm">{formatTime(schedule.closeTime)}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary" className="gap-1 font-mono">
                    <Clock4 className="h-3 w-3" />
                    {schedule.slotDurationMinutes ?? "—"} min
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
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => onEdit(schedule)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onToggleStatus(schedule)}
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
