import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useEnterKiosk, useKioskBooking } from "@/hooks/useKiosk";
import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const ENTER_WINDOW_MINUTES = 15;

function getMinutesUntil(targetIso: string): number {
  const now = new Date();
  const target = new Date(targetIso);
  return Math.floor((target.getTime() - now.getTime()) / 60_000);
}

function CountdownCard({ scheduledStart }: { scheduledStart: string }) {
  const { t } = useTranslation();
  const [minutesLeft, setMinutesLeft] = useState(() => getMinutesUntil(scheduledStart));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMinutesLeft(getMinutesUntil(scheduledStart));
    }, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scheduledStart]);

  const isInsideWindow = Math.abs(minutesLeft) <= ENTER_WINDOW_MINUTES;
  const canEnter = minutesLeft <= ENTER_WINDOW_MINUTES && minutesLeft >= -ENTER_WINDOW_MINUTES;

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-muted-foreground text-sm">
          {minutesLeft > 0
            ? t("userKiosk.youCanEnterIn", { minutes: minutesLeft })
            : minutesLeft >= -ENTER_WINDOW_MINUTES
              ? t("userKiosk.youCanEnterNow")
              : t("userKiosk.yourSlotHasPassed")}
        </p>
        {minutesLeft > 0 && (
          <p className="text-muted-foreground text-xs">
            {t("userKiosk.pleaseWaitUntilYourScheduledTime")}
          </p>
        )}
        {isInsideWindow && !canEnter && minutesLeft > 0 && (
          <p className="text-xs text-orange-500">
            {t("userKiosk.youCanEnterSoon", { minutes: ENTER_WINDOW_MINUTES })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InvalidStatusCard({ status }: { status: string }) {
  const { t } = useTranslation();
  const isCancelled = status === "CANCELLED";
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {isCancelled && (
          <>
            <p className="text-lg font-semibold text-red-600">
              {t("userKiosk.bookingWasCancelled")}
            </p>
            <p className="text-muted-foreground text-sm">{t("userKiosk.youCanBookANewSlot")}</p>
          </>
        )}
        {isCompleted && (
          <>
            <p className="text-lg font-semibold text-green-600">
              {t("userKiosk.interviewHasEnded")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("userKiosk.interviewCompletedDescription")}
            </p>
          </>
        )}
        {isInProgress && (
          <>
            <p className="text-lg font-semibold text-blue-600">
              {t("userKiosk.interviewInProgress")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("userKiosk.interviewInProgressDescription")}
            </p>
          </>
        )}
        {status === "AWAITING_MENTOR" && (
          <>
            <p className="text-lg font-semibold text-yellow-600">
              {t("userKiosk.waitingForMentor")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("userKiosk.waitingForMentorDescription")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function KioskJoinRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const bookingId = Number(params.bookingId);
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);

  const {
    data: booking,
    isLoading,
    error,
  } = useKioskBooking(Number.isFinite(bookingId) ? bookingId : undefined);

  const enterMutation = useEnterKiosk();

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
    if (!booking?.sessionKey || !booking?.kioskId) return;
    try {
      await enterMutation.mutateAsync({
        sessionKey: booking.sessionKey,
        kioskId: booking.kioskId,
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

  const showInvalidStatus =
    booking.status === "CANCELLED" ||
    booking.status === "COMPLETED" ||
    booking.status === "IN_PROGRESS" ||
    booking.status === "AWAITING_MENTOR";

  const showSessionKeyCard =
    !showInvalidStatus && booking.status === "ROOM_CREATED" && !enterMutation.data?.roomUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("userKiosk.joinRoomTitle")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("userKiosk.joinRoomDescription", { bookingId: booking.id })}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/user/kiosk")}>
          {t("general.back")}
        </Button>
      </div>

      {/* Status cards for non-enterable states */}
      {showInvalidStatus && <InvalidStatusCard status={booking.status} />}

      {/* Countdown + Enter button */}
      {showSessionKeyCard && booking.scheduledStart && (
        <>
          <CountdownCard scheduledStart={booking.scheduledStart} />
          <Card>
            <CardHeader>
              <CardTitle>{t("userKiosk.readyToJoin")}</CardTitle>
              <CardDescription>{t("userKiosk.readyToJoinDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.sessionKey && (
                <div className="bg-muted rounded-md p-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t("userKiosk.sessionKey")}
                  </p>
                  <p className="font-mono text-sm break-all">{booking.sessionKey}</p>
                </div>
              )}
              <Button onClick={handleEnter} disabled={enterMutation.isPending} className="w-full">
                {enterMutation.isPending ? t("userKiosk.gettingRoomUrl") : t("userKiosk.enterRoom")}
              </Button>
              {enterMutation.isError && (
                <p className="text-sm text-red-600">{enterMutation.error?.message}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Video call room */}
      {enterMutation.data?.roomUrl && (
        <>
          <DeviceCheckDialog
            isOpen={isDeviceCheckOpen}
            onOpenChange={setIsDeviceCheckOpen}
            displayName={`Booking #${booking.id}`}
            onConfirm={() => {
              setIsDeviceCheckOpen(false);
              setHasConfirmedDevices(true);
            }}
          />
          {hasConfirmedDevices ? (
            <div className="w-full">
              <VideoCallProvider>
                <VideoCallRoom
                  roomUrl={enterMutation.data.roomUrl}
                  userName={`Booking #${booking.id}`}
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
