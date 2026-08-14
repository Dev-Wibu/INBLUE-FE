import { useTranslation } from "react-i18next";
/**
 * DeviceCheckDialog.tsx
 * Dialog for users to test their microphone and camera before joining the Daily.co room.
 * Uses browser's native navigator.mediaDevices API (no Daily.co dependency).
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, CameraOff, Check, Mic, MicOff, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
interface DeviceCheckDialogProps {
  isOpen: boolean;
  onOpenChange: (_open: boolean) => void;
  /** Called when user confirms devices are ready and wants to join */
  onConfirm?: (_selection: DeviceCheckSelection) => void;
  displayName?: string;
  onDisplayNameChange?: (_value: string) => void;
  showDisplayName?: boolean;
}
export interface DeviceCheckSelection {
  audioDeviceId: string | null;
  videoDeviceId: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
}
export function DeviceCheckDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  displayName,
  onDisplayNameChange,
  showDisplayName = true,
}: DeviceCheckDialogProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const previewRequestIdRef = useRef(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const animationRef = useRef<number>(0);
  const stopAudioMeter = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext) {
      void audioContext.close().catch(() => undefined);
    }
    setMicLevel(0);
  }, []);
  const stopStream = useCallback(() => {
    // Mỗi lần dừng stream sẽ tăng request id để vô hiệu hóa các startPreview cũ đang pending.
    previewRequestIdRef.current += 1;
    stopAudioMeter();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, [stopAudioMeter]);
  const startPreview = useCallback(
    async (mic: boolean, camera: boolean, audioId?: string, videoId?: string) => {
      stopStream();
      const requestId = previewRequestIdRef.current;
      setError(null);
      if (!mic && !camera) return;
      try {
        const constraints: MediaStreamConstraints = {
          video: camera
            ? {
                deviceId: videoId
                  ? {
                      exact: videoId,
                    }
                  : undefined,
              }
            : false,
          audio: mic
            ? {
                deviceId: audioId
                  ? {
                      exact: audioId,
                    }
                  : undefined,
              }
            : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (requestId !== previewRequestIdRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setIsStreaming(true);
        if (videoRef.current && camera) {
          videoRef.current.srcObject = stream;
        }

        // Mic level meter
        if (mic) {
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (requestId !== previewRequestIdRef.current) {
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch {
        if (requestId !== previewRequestIdRef.current) {
          return;
        }
        stopStream();
        setError(t("compVideoCall.deviceCannotBeAccessedPlease"));
      }
    },

    [stopStream, t]
  );

  // Enumerate devices on open
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const resetTimerId = window.setTimeout(() => {
      setError(null);
      setIsCameraOn(true);
      setIsMicOn(true);
      setSelectedAudioId("");
      setSelectedVideoId("");
    }, 0);
    const refreshDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) return;
      const nextAudioDevices = devices.filter((d) => d.kind === "audioinput");
      const nextVideoDevices = devices.filter((d) => d.kind === "videoinput");
      setAudioDevices(nextAudioDevices);
      setVideoDevices(nextVideoDevices);
      setSelectedAudioId(nextAudioDevices[0]?.deviceId ?? "");
      setSelectedVideoId(nextVideoDevices[0]?.deviceId ?? "");
    };
    const init = async () => {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        tempStream.getTracks().forEach((t) => t.stop());
        await refreshDevices();
      } catch {
        if (!cancelled) {
          setError(t("compVideoCall.deviceCannotBeListedPlease"));
        }
      }
    };
    const handleDeviceChange = () => {
      void refreshDevices();
    };
    void init();
    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
    return () => {
      cancelled = true;
      window.clearTimeout(resetTimerId);
      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange);
    };
  }, [isOpen, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);
  const handleClose = (open: boolean) => {
    if (!open) {
      stopStream();
    }
    onOpenChange(open);
  };
  const handleToggleMic = () => {
    const next = !isMicOn;
    setIsMicOn(next);
    void startPreview(next, isCameraOn, selectedAudioId, selectedVideoId);
  };
  const handleToggleCamera = () => {
    const next = !isCameraOn;
    setIsCameraOn(next);
    void startPreview(isMicOn, next, selectedAudioId, selectedVideoId);
  };
  const handleRefresh = () => {
    void startPreview(isMicOn, isCameraOn, selectedAudioId, selectedVideoId);
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[90dvh] sm:max-w-[500px] md:w-[500px] md:p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-12 text-left sm:px-6 dark:border-slate-800">
          <DialogTitle>{t("common.checkTheDevice")}</DialogTitle>
          <DialogDescription>{t("compVideoCall.checkTheCameraAndMicrophone")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          {showDisplayName && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                {t("compVideoCall.nameDisplayedInMeetingRoom")}
              </p>
              <Input
                value={displayName ?? ""}
                onChange={(e) => onDisplayNameChange?.(e.target.value)}
                placeholder={t("compVideoCall.accountName")}
              />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Camera preview */}
          <div className="relative overflow-hidden rounded-lg bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`aspect-video max-h-60 w-full object-cover ${!isCameraOn ? "hidden" : ""}`}
            />
            {!isCameraOn && (
              <div className="flex aspect-video max-h-60 w-full items-center justify-center">
                <CameraOff className="h-12 w-12 text-slate-500" />
              </div>
            )}
          </div>

          {/* Toggle & start buttons */}
          <div className="flex flex-col justify-center gap-2 sm:flex-row sm:gap-3">
            {!isStreaming && (
              <Button size="sm" onClick={handleRefresh} className="w-full gap-2 sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                {t("compVideoCall.startChecking")}
              </Button>
            )}
            {isStreaming && (
              <>
                <Button
                  variant={isMicOn ? "default" : "destructive"}
                  size="sm"
                  onClick={handleToggleMic}
                  className="w-full min-w-0 gap-2 sm:w-auto">
                  {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {isMicOn ? t("compVideoCall.micIsOn") : t("compVideoCall.micIsOff")}
                </Button>
                <Button
                  variant={isCameraOn ? "default" : "destructive"}
                  size="sm"
                  onClick={handleToggleCamera}
                  className="w-full min-w-0 gap-2 sm:w-auto">
                  {isCameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  {isCameraOn ? t("compVideoCall.cameraTurnedOn") : t("compVideoCall.cameraIsOff")}
                </Button>
              </>
            )}
          </div>

          {/* Mic level */}
          {isMicOn && isStreaming && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t("compVideoCall.microphoneSoundLevel")}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-100"
                  style={{
                    width: `${micLevel}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Device selection */}
          {videoDevices.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t("compVideoCall.camera")}:</p>
              <Select
                value={selectedVideoId}
                onValueChange={(v) => {
                  setSelectedVideoId(v);
                  if (isStreaming) {
                    void startPreview(isMicOn, isCameraOn, selectedAudioId, v);
                  }
                }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("compVideoCall.selectCamera")} />
                </SelectTrigger>
                <SelectContent>
                  {videoDevices.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label ||
                        t("compVideoCall.cameraN", { number: videoDevices.indexOf(d) + 1 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {audioDevices.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">{t("compVideoCall.microphone")}:</p>
              <Select
                value={selectedAudioId}
                onValueChange={(v) => {
                  setSelectedAudioId(v);
                  if (isStreaming) {
                    void startPreview(isMicOn, isCameraOn, v, selectedVideoId);
                  }
                }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("compVideoCall.selectMicrophone")} />
                </SelectTrigger>
                <SelectContent>
                  {audioDevices.map((d) => (
                    <SelectItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Mic ${audioDevices.indexOf(d) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200 px-4 py-3 sm:px-6 dark:border-slate-800">
          <Button variant="outline" onClick={() => handleClose(false)} className="w-full sm:w-auto">
            {onConfirm ? t("general.cancel") : t("general.close")}
          </Button>
          {onConfirm && (
            <Button
              onClick={() => {
                stopStream();
                onConfirm({
                  audioDeviceId: selectedAudioId || null,
                  videoDeviceId: selectedVideoId || null,
                  isMicOn,
                  isCameraOn,
                });
              }}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 sm:w-auto">
              <Check className="h-4 w-4" />
              {t("compVideoCall.confirmJoin")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
