import { Button } from "@/components/ui/button";
import { DeviceCheckDialog, VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useEnterKiosk } from "@/hooks/useKiosk";
import { useJoinSession } from "@/hooks/useSession";
import { useAuthStore } from "@/stores/authStore";
import { Video } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function MentorKioskEntryPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: enterKiosk, isPending: isEntering } = useEnterKiosk();
  const joinSessionMutation = useJoinSession();

  // Auto-fill from `?sessionKey=...&kioskId=...` only when navigating from
  // the user-facing mentor-review booking flow. The values are read once at
  // mount via the state initialisers; if the URL changes later, the parent
  // route should remount this page (or the kiosk operator can re-enter the
  // values manually, which is the canonical kiosk flow).
  const [searchParams] = useSearchParams();
  const initialSessionKey = searchParams.get("sessionKey") ?? "";
  const initialKioskId = searchParams.get("kioskId") ?? "";

  const [sessionKey, setSessionKey] = useState(initialSessionKey);
  const [kioskId, setKioskId] = useState(initialKioskId);
  const [roomUrl, setRoomUrl] = useState("");
  const [joinMode, setJoinMode] = useState<"idle" | "room">("idle");
  const [isDeviceCheckOpen, setIsDeviceCheckOpen] = useState(false);
  const [hasConfirmedDevices, setHasConfirmedDevices] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionKey.trim() || !kioskId.trim()) return;

    try {
      const result = await enterKiosk({
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
    setHasConfirmedDevices(false);
  };

  const handleJoined = async (participantId: string) => {
    if (!roomUrl || !user?.id) return;
    try {
      await joinSessionMutation.mutateAsync({
        sessionName: extractRoomName(roomUrl),
        userId: user.id,
        participantId,
        isMentor: true,
      });
    } catch {
      // silent fail - join is best-effort tracking
    }
  };

  if (joinMode === "room") {
    return (
      <div className="space-y-4">
        <DeviceCheckDialog
          isOpen={isDeviceCheckOpen}
          onOpenChange={setIsDeviceCheckOpen}
          displayName={user?.name ?? "Mentor"}
          onConfirm={() => {
            setIsDeviceCheckOpen(false);
            setHasConfirmedDevices(true);
          }}
        />
        {hasConfirmedDevices ? (
          <VideoCallProvider>
            <VideoCallRoom
              roomUrl={roomUrl}
              userName={user?.name ?? "Mentor"}
              onJoined={handleJoined}
              onLeave={handleLeave}
              className="h-[80vh] w-full"
            />
          </VideoCallProvider>
        ) : (
          <div className="border-border flex h-[60vh] flex-col items-center justify-center gap-5 rounded-xl border bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Video className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-base text-slate-600 dark:text-slate-300">
              {t("mentorKiosk.readyToJoin")}
            </p>
            <Button onClick={() => setIsDeviceCheckOpen(true)} className="gap-2">
              <Video className="h-4 w-4" />
              {t("common.checkTheDevice")}
            </Button>
            <Button variant="ghost" onClick={handleLeave} className="text-slate-500">
              {t("compVideoCall.goBack")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero section */}
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-950">
          <Video className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("mentorKiosk.joinSessionTitle")}
        </h2>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">
          {t("mentorKiosk.joinSessionDescription")}
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
            Mã phiên phỏng vấn được gửi qua email hoặc từ quản trị viên
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

        {/* Submit */}
        <Button
          type="submit"
          disabled={isEntering}
          className="h-11 w-full gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700">
          {isEntering ? (
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
    </div>
  );
}

function extractRoomName(roomUrl: string): string {
  try {
    const url = new URL(roomUrl);
    return url.pathname.replace("/", "");
  } catch {
    return roomUrl;
  }
}
