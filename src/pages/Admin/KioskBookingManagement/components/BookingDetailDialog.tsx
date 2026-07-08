import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { Calendar, MapPin, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EnrichedKioskBooking, KioskBookingStatus } from "../types";

interface BookingDetailDialogProps {
  _open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: EnrichedKioskBooking | null;
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
  AWAITING_MENTOR:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  MENTOR_ASSIGNED:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  ROOM_CREATED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  IN_PROGRESS:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  COMPLETED:
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  CANCELLED:
    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
};

export function BookingDetailDialog({
  open: _open,
  onOpenChange,
  booking,
}: BookingDetailDialogProps) {
  const { t } = useTranslation();
  if (!booking) return null;

  const statusKey = booking.status ?? "AWAITING_MENTOR";
  const statusConfig = STATUS_CONFIG[statusKey] || STATUS_CONFIG.AWAITING_MENTOR;
  const statusStyle = STATUS_STYLE[statusKey] || STATUS_STYLE.AWAITING_MENTOR;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("adminKiosk.bookingDetails")}</DialogTitle>
          <DialogDescription>{t("adminKiosk.bookingCode", { id: booking.id })}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">{t("common.status")}</Label>
            <Badge variant={statusConfig.variant} className={statusStyle}>
              {t(statusConfig.labelKey)}
            </Badge>
          </div>

          {/* Candidate Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <User className="h-4 w-4 text-indigo-600" />
              {t("adminKiosk.candidateInfo")}
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.name")}</span>
                  <span className="font-medium">{booking.userName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.email")}</span>
                  <span className="font-medium">{booking.userEmail || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.userId")}</span>
                  <span className="font-mono text-xs">{booking.applicantUserId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Job Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <svg
                className="h-4 w-4 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {t("adminKiosk.jobInfo")}
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.position")}</span>
                  <span className="font-medium">{booking.jobTitle || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.company")}</span>
                  <span className="font-medium">{booking.companyName || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kiosk Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <MapPin className="h-4 w-4 text-indigo-600" />
              {t("adminKiosk.kioskInfo")}
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.kiosk")}</span>
                  <span className="font-medium">{booking.kioskName || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.location")}</span>
                  <span className="font-medium">{booking.kioskLocation || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-indigo-600" />
              {t("adminKiosk.scheduleInfo")}
            </div>
            <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.startTime")}</span>
                  <span className="font-medium">
                    {booking.scheduledStart
                      ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledStart))
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("adminKiosk.endTime")}</span>
                  <span className="font-medium">
                    {booking.scheduledEnd
                      ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledEnd))
                      : "-"}
                  </span>
                </div>
                {booking.sessionKey && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("adminKiosk.sessionKey")}</span>
                    <span className="font-mono text-xs">{booking.sessionKey}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mentor Info */}
          {(booking.mentorId || booking.mentorName) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <svg
                  className="h-4 w-4 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {t("adminKiosk.mentorInfo")}
              </div>
              <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("adminKiosk.mentor")}</span>
                    <span className="font-medium">{booking.mentorName || "-"}</span>
                  </div>
                  {booking.mentorExpertise && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("adminKiosk.specialization")}
                      </span>
                      <span className="font-medium">{booking.mentorExpertise}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                <svg
                  className="h-4 w-4 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {t("adminKiosk.notes")}
              </div>
              <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm">{booking.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
