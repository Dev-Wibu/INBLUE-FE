import { Button } from "@/components/ui/button";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useEnterKiosk, useKioskUserBookings } from "@/hooks/useKiosk";
import { useAuthStore } from "@/stores/authStore";
import { KeyRound, Monitor, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const ENTER_WINDOW_MINUTES = 15;

function getMinutesUntil(targetIso: string): number {
  const now = new Date();
  const target = new Date(targetIso);
  return Math.floor((target.getTime() - now.getTime()) / 60_000);
}

function isWithinEnterWindow(scheduledStart: string): boolean {
  return Math.abs(getMinutesUntil(scheduledStart)) <= ENTER_WINDOW_MINUTES;
}

type JoinMode = "idle" | "form" | "room";

export function KioskEntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: allBookings = [], isLoading } = useKioskUserBookings(user?.id);

  const joinableBookings = allBookings.filter(
    (b) => b.status === "ROOM_CREATED" && b.sessionKey && b.kioskId
  );

  const [joinMode, setJoinMode] = useState<JoinMode>("idle");
  const [sessionKey, setSessionKey] = useState("");
  const [kioskId, setKioskId] = useState("");
  const [roomUrl, setRoomUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(true);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);

  const enterMutation = useEnterKiosk();

  useEffect(() => {
    if (!user?.id) {
      navigate("/login", { replace: true });
    }
  }, [user?.id, navigate]);

  const handleEnterWithBooking = (booking: (typeof joinableBookings)[0]) => {
    setSessionKey(booking.sessionKey ?? "");
    setKioskId(booking.kioskId ? String(booking.kioskId) : "");
    setDisplayName(`Booking #${booking.id}`);
    setJoinMode("form");
  };

  const handleEnterWithSessionKey = () => {
    setSessionKey("");
    setKioskId("");
    setDisplayName("");
    setJoinMode("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionKey.trim() || !kioskId.trim()) return;

    try {
      const result = await enterMutation.mutateAsync({
        sessionKey: sessionKey.trim(),
        kioskId: Number(kioskId),
      });
      const url = result?.roomUrl;
      if (url) {
        setRoomUrl(url);
        setJoinMode("room");
        setIsDeviceCheckOpen(true);
      }
    } catch {
      // toast handled in hook
    }
  };

  const handleLeave = () => {
    setJoinMode("idle");
    setRoomUrl("");
    setSessionKey("");
    setKioskId("");
    setDisplayName("");
    setHasConfirmedDevices(false);
  };

  // ---- RENDER: ROOM ----
  if (joinMode === "room" && roomUrl) {
    return (
      <div className="space-y-4">
        <DeviceCheckDialog
          isOpen={isDeviceCheckOpen}
          onOpenChange={setIsDeviceCheckOpen}
          displayName={displayName || sessionKey.slice(0, 8)}
          onConfirm={() => {
            setIsDeviceCheckOpen(false);
            setHasConfirmedDevices(true);
          }}
        />
        {hasConfirmedDevices ? (
          <VideoCallProvider>
            <VideoCallRoom
              roomUrl={roomUrl}
              userName={displayName || sessionKey.slice(0, 8)}
              onLeave={handleLeave}
              className="h-[80vh] w-full"
            />
          </VideoCallProvider>
        ) : (
          <div className="border-border flex h-[60vh] flex-col items-center justify-center gap-5 rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
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
            <Button variant="ghost" onClick={handleLeave} className="text-slate-500">
              {t("general.back")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---- RENDER: FORM ----
  if (joinMode === "form") {
    return (
      <div className="space-y-5">
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
              <p className="text-sm text-red-600 dark:text-red-400">
                {enterMutation.error?.message}
              </p>
            </div>
          )}

          {/* Submit + Back */}
          <div className="flex flex-col gap-3">
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
            <button
              onClick={handleLeave}
              className="border-border flex h-9 items-center justify-center gap-1.5 rounded-xl border text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              {t("general.back")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ---- RENDER: ENTRY CHOICE (idle) ----
  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t("userKiosk.joinRoomTitle")}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t("userKiosk.kioskEntryDescription")}
        </p>
      </div>

      {/* Upcoming interviews */}
      {joinableBookings.length > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("userKiosk.yourUpcomingInterviews")}
            </p>
            <div className="space-y-2">
              {joinableBookings.map((booking) => {
                const withinWindow = booking.scheduledStart
                  ? isWithinEnterWindow(booking.scheduledStart)
                  : false;
                const minutesLeft = booking.scheduledStart
                  ? getMinutesUntil(booking.scheduledStart)
                  : null;

                return (
                  <button
                    key={booking.id}
                    onClick={() => handleEnterWithBooking(booking)}
                    className="border-border flex w-full items-center gap-4 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${withinWindow ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                      <Video className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t("userKiosk.booking")} #{booking.id}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {booking.scheduledStart
                          ? new Date(booking.scheduledStart).toLocaleString("vi-VN", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : t("userKiosk.noScheduledTime")}
                      </p>
                      {minutesLeft !== null && (
                        <p
                          className={`mt-0.5 text-xs font-medium ${withinWindow ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {minutesLeft > 0
                            ? t("userKiosk.startsIn", { minutes: minutesLeft })
                            : withinWindow
                              ? t("userKiosk.youCanEnterNow")
                              : t("userKiosk.yourSlotHasPassed")}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                      {withinWindow ? t("userKiosk.enterRoom") : t("userKiosk.viewDetails")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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
        </>
      )}

      {/* Manual session key entry */}
      <button
        onClick={handleEnterWithSessionKey}
        className="border-border flex w-full items-center gap-4 rounded-xl border bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("userKiosk.iHaveSessionKey")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("userKiosk.iHaveSessionKeyDescription")}
          </p>
        </div>
      </button>

      {/* Book new kiosk */}
      <button
        onClick={() => navigate("/user/kiosk")}
        className="border-border flex w-full items-center gap-4 rounded-xl border bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Monitor className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("userKiosk.bookNewKiosk")}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("userKiosk.bookNewKioskDescription")}
          </p>
        </div>
      </button>
    </div>
  );
}
