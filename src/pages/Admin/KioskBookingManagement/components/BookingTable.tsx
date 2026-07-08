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
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EnrichedKioskBooking, KioskBookingStatus } from "../types";

interface BookingTableProps {
  bookings: EnrichedKioskBooking[];
  onViewDetails: (_booking: EnrichedKioskBooking) => void;
  onAssignMentor: (_booking: EnrichedKioskBooking) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  NonNullable<KioskBookingStatus>,
  { variant: "default" | "secondary" | "outline" | "destructive"; labelKey: string }
> = {
  AWAITING_MENTOR: { variant: "secondary", labelKey: "adminKiosk.pending" },
  MENTOR_ASSIGNED: { variant: "default", labelKey: "adminKiosk.mentorAssigned" },
  ROOM_CREATED: { variant: "default", labelKey: "adminKiosk.roomCreated" },
  IN_PROGRESS: { variant: "outline", labelKey: "adminKiosk.inProgress" },
  COMPLETED: { variant: "outline", labelKey: "adminKiosk.completed" },
  CANCELLED: { variant: "destructive", labelKey: "adminKiosk.cancelled" },
};

const STATUS_STYLE: Record<NonNullable<KioskBookingStatus>, string> = {
  AWAITING_MENTOR: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  MENTOR_ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  ROOM_CREATED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  COMPLETED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
};

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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <svg
            className="h-6 w-6 text-slate-400 dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {t("adminKiosk.noBookingsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-16">{t("common.id")}</TableHead>
            <TableHead>{t("adminKiosk.user")}</TableHead>
            <TableHead>{t("adminKiosk.position")}</TableHead>
            <TableHead>{t("adminKiosk.company")}</TableHead>
            <TableHead>{t("adminKiosk.kiosk")}</TableHead>
            <TableHead>{t("adminKiosk.scheduledTime")}</TableHead>
            <TableHead className="w-36">{t("common.status")}</TableHead>
            <TableHead className="w-20 text-right">{t("common.operation")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => {
            const statusKey = booking.status ?? "AWAITING_MENTOR";
            const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.AWAITING_MENTOR;
            const statusStyle = STATUS_STYLE[statusKey] || STATUS_STYLE.AWAITING_MENTOR;
            return (
              <TableRow key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <TableCell className="font-medium">{booking.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{booking.userName || `User #${booking.applicantUserId}`}</span>
                    {booking.userEmail && (
                      <span className="text-xs text-muted-foreground">{booking.userEmail}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {booking.jobTitle || "-"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate">
                  {booking.companyName || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{booking.kioskName || `-`}</span>
                    {booking.kioskLocation && (
                      <span className="text-xs text-muted-foreground">{booking.kioskLocation}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {booking.scheduledStart
                    ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledStart))
                    : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant} className={statusStyle}>
                    {t(statusConfig.labelKey)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={t("common.openMenu")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onViewDetails(booking)}>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        {t("adminKiosk.viewDetails")}
                      </DropdownMenuItem>
                      {booking.status === "AWAITING_MENTOR" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onAssignMentor(booking)}>
                            <svg
                              className="mr-2 h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                              />
                            </svg>
                            {t("adminKiosk.assignMentor")}
                          </DropdownMenuItem>
                        </>
                      )}
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
