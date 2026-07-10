import { KioskStatusBadge, type KioskBookingStatus } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCardList } from "@/components/ui/loading-card";
import { useCancelKioskBooking, useKioskUserBookings } from "@/hooks/useKiosk";
import { formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { useAuthStore } from "@/stores/authStore";
import { Calendar, ChevronRight, Hash, MapPin, Plus, Sparkles, Video, XCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type BookingWithStatus = {
  id?: number;
  kioskId?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  status?: KioskBookingStatus;
  sessionKey?: string;
};

const cancellableStatuses = new Set<KioskBookingStatus>([
  "AWAITING_MENTOR",
  "MENTOR_ASSIGNED",
  "ROOM_CREATED",
]);

export function KioskBookingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: bookings = [], isLoading, error } = useKioskUserBookings(user?.id);
  const cancelMutation = useCancelKioskBooking();

  useEffect(() => {
    if (!user?.id) {
      navigate("/login", { replace: true });
    }
  }, [user?.id, navigate]);

  const sortedBookings = useMemo<BookingWithStatus[]>(() => {
    const items: BookingWithStatus[] = [...bookings];
    items.sort((a, b) => {
      const aTs = a.scheduledStart ? new Date(a.scheduledStart).getTime() : 0;
      const bTs = b.scheduledStart ? new Date(b.scheduledStart).getTime() : 0;
      return bTs - aTs;
    });
    return items;
  }, [bookings]);

  if (!user?.id) {
    return null;
  }

  const handleCancel = async (bookingId: number) => {
    try {
      await cancelMutation.mutateAsync(bookingId);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            {t("userKiosk.myBookingsTitle")}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {t("userKiosk.myBookingsTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("userKiosk.myBookingsDescription")}</p>
        </div>
        <Button onClick={() => navigate("/user/kiosk")} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("userKiosk.bookNewKiosk")}
        </Button>
      </div>

      {isLoading ? (
        <LoadingCardList count={3} />
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">{t("userKiosk.unableToLoadBookings")}</p>
          </CardContent>
        </Card>
      ) : sortedBookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="bg-muted text-muted-foreground flex h-14 w-14 items-center justify-center rounded-full">
              <Calendar className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{t("userKiosk.noBookingsYet")}</p>
              <p className="text-muted-foreground text-sm">
                {t("userKiosk.noBookingsYetDescription")}
              </p>
            </div>
            <Button onClick={() => navigate("/user/kiosk")}>{t("userKiosk.bookNow")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedBookings.map((booking) => {
            const status = booking.status;
            const canCancel = !!status && cancellableStatuses.has(status);

            return (
              <Card
                key={booking.id}
                className="group border-border/70 hover:border-primary/40 hover:shadow-primary/10 overflow-hidden transition-all hover:shadow-lg">
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wider uppercase">
                        <Hash className="h-3 w-3" />
                        {t("userKiosk.booking")} #{booking.id}
                      </div>
                      <CardTitle className="mt-1 truncate text-base">
                        {booking.scheduledStart
                          ? formatDateTime(treatZuluAsVietnamLocal(booking.scheduledStart))
                          : t("userKiosk.noScheduledTime")}
                      </CardTitle>
                      {booking.scheduledEnd && (
                        <CardDescription className="mt-1 text-xs">
                          → {formatDateTime(treatZuluAsVietnamLocal(booking.scheduledEnd))}
                        </CardDescription>
                      )}
                    </div>
                    <KioskStatusBadge status={status} variant="user" />
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {t("userKiosk.kiosk")} #{booking.kioskId ?? "-"}
                    </span>
                    {booking.sessionKey && (
                      <span className="truncate font-mono">{booking.sessionKey}</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-2 pt-0">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/user/kiosk/entry")}
                    className="w-full gap-2">
                    <Video className="h-4 w-4" />
                    {t("userKiosk.joinRoom")}
                    <ChevronRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                  {canCancel && (
                    <Button
                      variant="ghost"
                      onClick={() => booking.id != null && handleCancel(booking.id)}
                      disabled={cancelMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full gap-2">
                      <XCircle className="h-4 w-4" />
                      {t("userKiosk.cancelBooking")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
