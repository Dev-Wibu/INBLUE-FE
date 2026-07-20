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
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary/30 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="border-border bg-card flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed">
        <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm font-medium">
          {t("adminKiosk.noBookingsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-16 text-xs font-semibold tracking-wider uppercase">
              {t("common.id")}
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider uppercase">
              {t("adminKiosk.user")}
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider uppercase">
              {t("adminKiosk.position")}
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider uppercase">
              {t("adminKiosk.company")}
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider uppercase">
              {t("adminKiosk.kiosk")}
            </TableHead>
            <TableHead className="text-xs font-semibold tracking-wider uppercase">
              {t("adminKiosk.scheduledTime")}
            </TableHead>
            <TableHead className="w-40 text-xs font-semibold tracking-wider uppercase">
              {t("common.status")}
            </TableHead>
            <TableHead className="w-20 text-right text-xs font-semibold tracking-wider uppercase">
              {t("common.operation")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow
              key={booking.id}
              className="hover:bg-muted/30 border-border/60 transition-colors">
              <TableCell className="font-medium tabular-nums">{booking.id}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {booking.userName || `User #${booking.applicantUserId}`}
                  </span>
                  {booking.userEmail && (
                    <span className="text-muted-foreground text-xs">{booking.userEmail}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{booking.jobTitle || "-"}</TableCell>
              <TableCell className="max-w-[160px] truncate">{booking.companyName || "-"}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{booking.kioskName || `-`}</span>
                  {booking.kioskLocation && (
                    <span className="text-muted-foreground text-xs">{booking.kioskLocation}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {booking.scheduledStart
                  ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledStart))
                  : "-"}
              </TableCell>
              <TableCell>
                <KioskStatusBadge status={booking.status} variant="admin" />
              </TableCell>
              <TableCell className="text-right">
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
