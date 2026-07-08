import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useEnterKiosk, useKioskBooking } from "@/hooks/useKiosk";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export function KioskJoinRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const bookingId = Number(params.bookingId);
  const [sessionKey, setSessionKey] = useState("");
  const [kioskId, setKioskId] = useState("");
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);

  const {
    data: booking,
    isLoading,
    error,
  } = useKioskBooking(Number.isFinite(bookingId) ? bookingId : undefined);
  const enterMutation = useEnterKiosk();

  const roomUrl = useMemo(() => {
    if (enterMutation.data?.roomUrl) {
      return enterMutation.data.roomUrl;
    }
    if (booking?.sessionKey && booking.status === "ROOM_CREATED") {
      const key = booking.sessionKey;
      const name = `booking-${booking.id}-${key}`;
      return `https://inblue.daily.co/${name}`;
    }
    return null;
  }, [booking, enterMutation.data]);

  const preselectedKioskId = booking?.kioskId ? String(booking.kioskId) : kioskId;

  useEffect(() => {
    if (!Number.isFinite(bookingId)) {
      navigate("/user/kiosk", { replace: true });
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    if (!isLoading && error) {
      toast.error(t("userKiosk.unableToLoadBooking"));
    }
  }, [isLoading, error, t]);

  const handleEnter = async () => {
    if (!sessionKey.trim() || !Number.isFinite(Number(preselectedKioskId))) {
      toast.error(t("userKiosk.invalidSessionKeyOrKiosk"));
      return;
    }
    try {
      await enterMutation.mutateAsync({
        sessionKey: sessionKey.trim(),
        kioskId: Number(preselectedKioskId),
      });
    } catch {
      // toast handled in hook
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[70vh] w-full rounded-lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <Button variant="outline" className="w-fit" onClick={() => navigate("/user/kiosk")}>
          {t("general.back")}
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-red-600">
            {t("userKiosk.bookingNotFound")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("userKiosk.joinRoomTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("userKiosk.joinRoomDescription", {
              bookingId: booking.id ?? bookingId,
            })}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/user/kiosk")}>
          {t("general.back")}
        </Button>
      </div>

      {!roomUrl && (
        <Card>
          <CardHeader>
            <CardTitle>{t("userKiosk.enterSessionKeyTitle")}</CardTitle>
            <CardDescription>{t("userKiosk.enterSessionKeyDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("userKiosk.sessionKey")}</label>
                <Input
                  value={sessionKey}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSessionKey(event.target.value)
                  }
                  placeholder={t("userKiosk.sessionKeyPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("userKiosk.kioskId")}</label>
                <Input
                  inputMode="numeric"
                  value={preselectedKioskId ?? kioskId}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setKioskId(event.target.value)
                  }
                  placeholder={t("userKiosk.kioskIdPlaceholder")}
                />
              </div>
            </div>
            <Button
              onClick={handleEnter}
              disabled={enterMutation.isPending}
              className="w-full sm:w-auto">
              {enterMutation.isPending ? t("userKiosk.gettingRoomUrl") : t("userKiosk.getRoomUrl")}
            </Button>
            {enterMutation.isError && (
              <p className="text-sm text-red-600">{enterMutation.error?.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {roomUrl && (
        <>
          <DeviceCheckDialog
            isOpen={isDeviceCheckOpen}
            onOpenChange={setIsDeviceCheckOpen}
            displayName={booking.id ? `Booking #${booking.id}` : t("common.user")}
            onConfirm={() => {
              setIsDeviceCheckOpen(false);
              setHasConfirmedDevices(true);
            }}
          />
          {hasConfirmedDevices ? (
            <div className="w-full">
              <VideoCallProvider>
                <VideoCallRoom
                  roomUrl={roomUrl}
                  userName={booking.id ? `Booking #${booking.id}` : t("common.user")}
                  onLeave={() => navigate("/user/kiosk")}
                  className="h-[80vh] w-full"
                />
              </VideoCallProvider>
            </div>
          ) : (
            <Card className="flex h-[60vh] flex-col items-center justify-center gap-4 border-dashed">
              <Settings className="text-muted-foreground h-12 w-12" />
              <p className="text-muted-foreground text-lg font-medium">
                {t("common.pleaseCheckYourEquipmentBeforeParti")}
              </p>
              <Button onClick={() => setIsDeviceCheckOpen(true)}>
                {t("common.checkTheDevice")}
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
