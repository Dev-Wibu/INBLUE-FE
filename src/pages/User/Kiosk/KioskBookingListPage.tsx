import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCardList } from "@/components/ui/loading-card";
import { useKioskUserBookings } from "@/hooks/useKiosk";
import { useAuthStore } from "@/stores/authStore";
import { Calendar, MapPin, Video } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function KioskBookingListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: bookings = [], isLoading, error } = useKioskUserBookings(user?.id);

  useEffect(() => {
    if (!user?.id) {
      navigate("/login", { replace: true });
    }
  }, [user?.id, navigate]);

  if (!user?.id) {
    return null;
  }

  const statusLabel = (status?: string) => {
    switch (status) {
      case "AWAITING_MENTOR":
        return t("userKiosk.statusAwaitingMentor");
      case "MENTOR_ASSIGNED":
        return t("userKiosk.statusMentorAssigned");
      case "ROOM_CREATED":
        return t("userKiosk.statusRoomCreated");
      case "IN_PROGRESS":
        return t("userKiosk.statusInProgress");
      case "COMPLETED":
        return t("userKiosk.statusCompleted");
      case "CANCELLED":
        return t("userKiosk.statusCancelled");
      default:
        return status ?? "-";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("userKiosk.myBookingsTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("userKiosk.myBookingsDescription")}</p>
        </div>
        <Button onClick={() => navigate("/user/kiosk")}>{t("userKiosk.bookNewKiosk")}</Button>
      </div>

      {isLoading ? (
        <LoadingCardList count={3} />
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {t("userKiosk.unableToLoadBookings")}
          </CardContent>
        </Card>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="font-medium">{t("userKiosk.noBookingsYet")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("userKiosk.noBookingsYetDescription")}
            </p>
            <Button className="mt-4" onClick={() => navigate("/user/kiosk")}>
              {t("userKiosk.bookNow")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("userKiosk.booking")} #{booking.id}
                </CardTitle>
                <CardDescription className="flex flex-col gap-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {t("userKiosk.kiosk")} {booking.kioskId}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {booking.scheduledStart
                      ? new Date(booking.scheduledStart).toLocaleString()
                      : "-"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("common.status")}</span>
                  <span className="font-medium">{statusLabel(booking.status)}</span>
                </div>
                {booking.sessionKey && (
                  <div className="text-muted-foreground text-xs break-all">
                    {t("userKiosk.sessionKey")}: {booking.sessionKey}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/user/kiosk/booking/${booking.id}/join`)}
                  className="gap-2">
                  <Video className="h-4 w-4" />
                  {t("userKiosk.joinRoom")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
