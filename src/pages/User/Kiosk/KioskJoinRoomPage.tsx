import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useEnterKiosk, useKioskBooking } from "@/hooks/useKiosk";
import { useJoinSession, useSessionById } from "@/hooks/useSession";
import { useAuthStore } from "@/stores/authStore";
import { Video } from "lucide-react";
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
    <div className="border-border rounded-xl border bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {minutesLeft > 0
          ? t("userKiosk.youCanEnterIn", { minutes: minutesLeft })
          : minutesLeft >= -ENTER_WINDOW_MINUTES
            ? t("userKiosk.youCanEnterNow")
            : t("userKiosk.yourSlotHasPassed")}
      </p>
      {minutesLeft > 0 && (
        <p className="text-muted-foreground mt-1 text-xs">
          {t("userKiosk.pleaseWaitUntilYourScheduledTime")}
        </p>
      )}
      {isInsideWindow && !canEnter && minutesLeft > 0 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          {t("userKiosk.youCanEnterSoon", { minutes: ENTER_WINDOW_MINUTES })}
        </p>
      )}
    </div>
  );
}

function InvalidStatusCard({ status }: { status: string }) {
  const { t } = useTranslation();
  const isCancelled = status === "CANCELLED";
  const isCompleted = status === "COMPLETED";
  const isInProgress = status === "IN_PROGRESS";

  const label = isCancelled
    ? t("userKiosk.bookingWasCancelled")
    : isCompleted
      ? t("userKiosk.interviewHasEnded")
      : isInProgress
        ? t("userKiosk.interviewInProgress")
        : t("userKiosk.waitingForMentor");

  const description = isCancelled
    ? t("userKiosk.youCanBookANewSlot")
    : isCompleted
      ? t("userKiosk.interviewCompletedDescription")
      : isInProgress
        ? t("userKiosk.interviewInProgressDescription")
        : t("userKiosk.waitingForMentorDescription");

  const colorClass = isCancelled
    ? "text-red-600 dark:text-red-400"
    : isCompleted
      ? "text-emerald-600 dark:text-emerald-400"
      : isInProgress
        ? "text-blue-600 dark:text-blue-400"
        : "text-amber-600 dark:text-amber-400";

  return (
    <div className="border-border rounded-xl border bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className={"text-lg font-semibold " + colorClass}>{label}</p>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
    </div>
  );
}

function BookingFlow({ bookingId }: { bookingId: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);
  const [hasLeftMeeting, setHasLeftMeeting] = useState(false);
  const hasJoinedTrackingRef = useRef(false);

  const { data: booking, isLoading, error } = useKioskBooking(bookingId);
  const sessionId = booking?.sessionId;
  const { data: session } = useSessionById(sessionId ?? 0);

  const enterMutation = useEnterKiosk();
  const joinSessionMutation = useJoinSession();

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

  const handleJoined = async (participantId: string) => {
    if (hasJoinedTrackingRef.current || !session?.roomName || !user?.id) return;
    hasJoinedTrackingRef.current = true;
    try {
      await joinSessionMutation.mutateAsync({
        sessionName: session.roomName,
        userId: user.id,
        participantId,
        mentor: false,
      });
    } catch {
      hasJoinedTrackingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-5 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-[70vh] w-full rounded-xl" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/user/kiosk")}
            className="border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("userKiosk.joinRoomTitle")}
          </h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {t("userKiosk.bookingNotFound")}
          </p>
        </div>
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
    <>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/user/kiosk")}
          className="border-border flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t("userKiosk.joinRoomTitle")}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("userKiosk.joinRoomDescription", { bookingId: booking.id })}
          </p>
        </div>
      </div>

      {showInvalidStatus && <InvalidStatusCard status={booking.status ?? ""} />}

      {showSessionKeyCard && booking.scheduledStart && (
        <div className="space-y-4">
          <CountdownCard scheduledStart={booking.scheduledStart} />
          <div className="border-border rounded-xl border bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="space-y-4">
              {booking.sessionKey && (
                <div className="border-border rounded-lg border bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    {t("userKiosk.sessionKey")}
                  </p>
                  <p className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                    {booking.sessionKey}
                  </p>
                </div>
              )}
              <Button
                onClick={handleEnter}
                disabled={enterMutation.isPending}
                className="h-10 w-full gap-2 bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700">
                {enterMutation.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    {t("userKiosk.gettingRoomUrl")}
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    {t("userKiosk.enterRoom")}
                  </>
                )}
              </Button>
              {enterMutation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {enterMutation.error?.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {enterMutation.data?.roomUrl && !hasLeftMeeting && (
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
            <VideoCallProvider>
              <VideoCallRoom
                roomUrl={enterMutation.data.roomUrl}
                userName={`Booking #${booking.id}`}
                onJoined={handleJoined}
                onLeave={() => setHasLeftMeeting(true)}
                className="h-[80vh] w-full"
              />
            </VideoCallProvider>
          ) : (
            <div className="border-border flex h-[60vh] flex-col items-center justify-center gap-5 rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Video className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300">
                {t("common.pleaseCheckYourEquipmentBeforeParti")}
              </p>
              <Button onClick={() => setIsDeviceCheckOpen(true)} className="gap-2">
                <Video className="h-4 w-4" />
                {t("common.checkTheDevice")}
              </Button>
            </div>
          )}
        </>
      )}

      {enterMutation.data?.roomUrl && hasLeftMeeting && (
        <div className="border-border rounded-xl border bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
            <svg
              className="h-7 w-7 animate-pulse text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("userKiosk.mentorReviewInProgress")}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("userKiosk.mentorReviewInProgressHint")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => navigate("/user/application-history")}
              className="bg-indigo-600 text-white hover:bg-indigo-700">
              {t("userKiosk.mentorReviewInProgressAction")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/user/kiosk")}>
              {t("common.back")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function SessionKeyFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessionKey, setSessionKey] = useState("");
  const [kioskId, setKioskId] = useState("");
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasLeftMeeting, setHasLeftMeeting] = useState(false);
  const enterMutation = useEnterKiosk();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionKey.trim() || !kioskId.trim()) return;
    try {
      await enterMutation.mutateAsync({
        sessionKey: sessionKey.trim(),
        kioskId: Number(kioskId),
      });
    } catch {
      // toast handled in hook
    }
  };

  return (
    <>
      {/* Hero section */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-950">
          <Video className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("userKiosk.joinRoomTitle")}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          {t("userKiosk.enterSessionKeyDescription")}
        </p>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="border-border w-full border-t dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-slate-400 dark:bg-slate-950">
            {t("userKiosk.or")}
          </span>
        </div>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="border-border space-y-5 rounded-2xl border bg-white px-8 py-7 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* Session Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="sessionKey"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("userKiosk.sessionKey")}
            </label>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              Bắt buộc
            </span>
          </div>
          <input
            id="sessionKey"
            type="text"
            placeholder={t("userKiosk.sessionKeyPlaceholder")}
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
            className="border-border flex h-11 w-full rounded-xl border bg-slate-50 px-4 py-2.5 font-mono text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-400"
            required
          />
          <p className="text-xs text-slate-400">
            Nhập mã phiên phỏng vấn được cung cấp bởi quản trị viên
          </p>
        </div>

        {/* Kiosk ID */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="kioskId"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("userKiosk.kioskId")}
            </label>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              Bắt buộc
            </span>
          </div>
          <input
            id="kioskId"
            type="number"
            placeholder={t("userKiosk.kioskIdPlaceholder")}
            value={kioskId}
            onChange={(e) => setKioskId(e.target.value)}
            className="border-border flex h-11 w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-400"
            required
          />
          <p className="text-xs text-slate-400">Số ID của kiosk tại phòng phỏng vấn</p>
        </div>

        {/* Error */}
        {enterMutation.isError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
            <svg
              className="h-4 w-4 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{enterMutation.error?.message}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={enterMutation.isPending}
          className="h-11 w-full gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700">
          {enterMutation.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t("userKiosk.gettingRoomUrl")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              {t("userKiosk.enterRoom")}
            </span>
          )}
        </Button>
      </form>

      {enterMutation.data?.roomUrl && !hasLeftMeeting && (
        <>
          <DeviceCheckDialog
            isOpen={isDeviceCheckOpen}
            onOpenChange={setIsDeviceCheckOpen}
            displayName={sessionKey}
            onConfirm={() => {
              setIsDeviceCheckOpen(false);
              setHasConfirmedDevices(true);
            }}
          />
          {hasConfirmedDevices ? (
            <VideoCallProvider>
              <VideoCallRoom
                roomUrl={enterMutation.data.roomUrl}
                userName={sessionKey}
                onLeave={() => setHasLeftMeeting(true)}
                className="h-[80vh] w-full"
              />
            </VideoCallProvider>
          ) : (
            <div className="border-border flex h-[60vh] flex-col items-center justify-center gap-5 rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Video className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300">
                {t("common.pleaseCheckYourEquipmentBeforeParti")}
              </p>
              <Button onClick={() => setIsDeviceCheckOpen(true)} className="gap-2">
                <Video className="h-4 w-4" />
                {t("common.checkTheDevice")}
              </Button>
            </div>
          )}
        </>
      )}

      {enterMutation.data?.roomUrl && hasLeftMeeting && (
        <div className="border-border rounded-xl border bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
            <svg
              className="h-7 w-7 animate-pulse text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("userKiosk.mentorReviewInProgress")}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("userKiosk.mentorReviewInProgressHint")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => navigate("/user/application-history")}
              className="bg-indigo-600 text-white hover:bg-indigo-700">
              {t("userKiosk.mentorReviewInProgressAction")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/user/kiosk")}>
              {t("common.back")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export function KioskJoinRoomPage() {
  const params = useParams();
  const bookingId = Number(params.bookingId);
  const hasValidBookingId = Number.isFinite(bookingId);

  return (
    <div className="space-y-5">
      {hasValidBookingId ? <BookingFlow bookingId={bookingId} /> : <SessionKeyFlow />}
    </div>
  );
}
