import { KioskStatusBadge } from "@/components/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building2,
  Calendar,
  KeyRound,
  MapPin,
  StickyNote,
  User,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { EnrichedKioskBooking } from "../types";

interface BookingDetailDialogProps {
  onOpenChange: (_open: boolean) => void;
  booking: EnrichedKioskBooking | null;
}

interface DetailItem {
  label: string;
  value: string;
  copy?: boolean;
  monospace?: boolean;
}

export function BookingDetailDialog({ onOpenChange, booking }: BookingDetailDialogProps) {
  const { t } = useTranslation();
  if (!booking) return null;

  const sections: Array<{
    title: string;
    icon: React.ReactNode;
    items: DetailItem[];
  }> = [
    {
      title: t("adminKiosk.candidateInfo"),
      icon: <User className="text-primary h-4 w-4" />,
      items: [
        { label: t("adminKiosk.name"), value: booking.userName || "-" },
        { label: t("adminKiosk.email"), value: booking.userEmail || "-" },
        { label: t("adminKiosk.userId"), value: String(booking.applicantUserId), monospace: true },
      ],
    },
    {
      title: t("adminKiosk.jobInfo"),
      icon: <Briefcase className="text-primary h-4 w-4" />,
      items: [
        { label: t("adminKiosk.position"), value: booking.jobTitle || "-" },
        {
          label: t("adminKiosk.company"),
          value: booking.companyName || "-",
        },
      ],
    },
    {
      title: t("adminKiosk.kioskInfo"),
      icon: <Building2 className="text-primary h-4 w-4" />,
      items: [
        { label: t("adminKiosk.kiosk"), value: booking.kioskName || "-" },
        { label: t("adminKiosk.location"), value: booking.kioskLocation || "-" },
      ],
    },
    {
      title: t("adminKiosk.scheduleInfo"),
      icon: <MapPin className="text-primary h-4 w-4" />,
      items: [
        {
          label: t("adminKiosk.startTime"),
          value: booking.scheduledStart
            ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledStart))
            : "-",
        },
        {
          label: t("adminKiosk.endTime"),
          value: booking.scheduledEnd
            ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledEnd))
            : "-",
        },
      ],
    },
  ];

  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card max-h-[90vh] max-w-lg gap-0 overflow-hidden p-0">
        {/* Header with gradient overlay */}
        <div className="from-primary/10 via-primary/5 relative bg-gradient-to-br to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              {t("adminKiosk.bookingCode", { id: booking.id })}
            </div>
            <DialogTitle className="text-xl">{t("adminKiosk.bookingDetails")}</DialogTitle>
            <DialogDescription className="mt-1">
              <KioskStatusBadge status={booking.status} variant="admin" />
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {section.icon}
                {section.title}
              </div>
              <div className="border-border bg-muted/30 space-y-1.5 rounded-xl border p-4">
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground shrink-0">{item.label}</span>
                    <span
                      className={cn(
                        "text-card-foreground truncate text-right font-medium",
                        item.monospace && "font-mono text-xs"
                      )}
                      title={item.value}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Session key */}
          {booking.sessionKey && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="text-primary h-4 w-4" />
                {t("adminKiosk.sessionKey")}
              </div>
              <div className="border-border bg-muted/40 rounded-xl border p-3 font-mono text-xs break-all">
                {booking.sessionKey}
              </div>
            </div>
          )}

          {/* Mentor */}
          {(booking.mentorId || booking.mentorName) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="text-primary h-4 w-4" />
                {t("adminKiosk.mentorInfo")}
              </div>
              <div className="border-border bg-muted/30 space-y-1.5 rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground shrink-0">{t("adminKiosk.mentor")}</span>
                  <span className="text-card-foreground truncate text-right font-medium">
                    {booking.mentorName || "-"}
                  </span>
                </div>
                {booking.mentorExpertise && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground shrink-0">
                      {t("adminKiosk.specialization")}
                    </span>
                    <span className="text-card-foreground truncate text-right font-medium">
                      {booking.mentorExpertise}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <StickyNote className="text-primary h-4 w-4" />
                {t("adminKiosk.notes")}
              </div>
              <div className="border-border bg-muted/40 rounded-xl border p-4 text-sm">
                {booking.notes}
              </div>
            </div>
          )}

          <Label className="sr-only">{t("adminKiosk.bookingDetails")}</Label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
