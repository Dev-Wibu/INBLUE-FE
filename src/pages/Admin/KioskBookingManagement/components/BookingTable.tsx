import { KioskStatusBadge } from "@/components/shared";
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
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { Eye, MoreHorizontal, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EnrichedKioskBooking } from "../types";

interface BookingTableProps {
  bookings: EnrichedKioskBooking[];
  onViewDetails: (_booking: EnrichedKioskBooking) => void;
  onAssignMentor: (_booking: EnrichedKioskBooking) => void;
  isLoading?: boolean;
}

export function BookingTable({
  bookings,
  onViewDetails,
  onAssignMentor,
  isLoading,
}: BookingTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <svg
            className="h-6 w-6 text-slate-400 dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("adminKiosk.noBookingsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-16 pl-6 font-medium text-slate-500">{t("common.id")}</TableHead>
            <TableHead className="font-medium text-slate-500">{t("adminKiosk.user")}</TableHead>
            <TableHead className="font-medium text-slate-500">{t("adminKiosk.position")}</TableHead>
            <TableHead className="font-medium text-slate-500">{t("adminKiosk.company")}</TableHead>
            <TableHead className="font-medium text-slate-500">{t("adminKiosk.kiosk")}</TableHead>
            <TableHead className="font-medium text-slate-500">
              {t("adminKiosk.scheduledTime")}
            </TableHead>
            <TableHead className="w-40 font-medium text-slate-500">{t("common.status")}</TableHead>
            <TableHead className="w-20 pr-6 text-right font-medium text-slate-500">
              {t("common.operation")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              onClick={() => onViewDetails(booking)}
              className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
              <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>#{booking.id}</span>
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
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {booking.userName || `User #${booking.applicantUserId}`}
                  </span>
                  {booking.userEmail && (
                    <span className="text-xs text-slate-400">{booking.userEmail}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{booking.jobTitle || "-"}</TableCell>
              <TableCell className="max-w-[160px] truncate">{booking.companyName || "-"}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{booking.kioskName || `-`}</span>
                  {booking.kioskLocation && (
                    <span className="text-xs text-slate-400">{booking.kioskLocation}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                {booking.scheduledStart
                  ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledStart))
                  : "-"}
              </TableCell>
              <TableCell>
                <KioskStatusBadge status={booking.status} variant="admin" />
              </TableCell>
              <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-primary/10 hover:text-primary h-8 w-8 p-0"
                      aria-label={t("common.openMenu")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border-border bg-popover w-48">
                    <DropdownMenuItem
                      onClick={() => onViewDetails(booking)}
                      className="cursor-pointer">
                      <Eye className="mr-2 h-4 w-4" />
                      {t("adminKiosk.viewDetails")}
                    </DropdownMenuItem>
                    {booking.status === "AWAITING_MENTOR" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onAssignMentor(booking)}
                          className="cursor-pointer">
                          <UserPlus className="mr-2 h-4 w-4" />
                          {t("adminKiosk.assignMentor")}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
