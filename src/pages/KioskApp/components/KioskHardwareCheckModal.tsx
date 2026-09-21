import { AlertCircle, ArrowRight, Camera, CameraOff, Mic, MicOff, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface KioskHardwareCheckModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function KioskHardwareCheckModal({
  isOpen,
  onConfirm,
  onCancel,
}: KioskHardwareCheckModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mediaStream: MediaStream | null = null;
    let cancelled = false;
    let audioContext: AudioContext | null = null;
    let animFrameId: number;

    async function setupHardware() {
      try {
        const [videoResult, audioResult] = await Promise.allSettled([
          navigator.mediaDevices.getUserMedia({ video: true }),
          navigator.mediaDevices.getUserMedia({ audio: true }),
        ]);
        const videoStream = videoResult.status === "fulfilled" ? videoResult.value : null;
        const audioStream = audioResult.status === "fulfilled" ? audioResult.value : null;
        mediaStream = new MediaStream([
          ...(videoStream?.getVideoTracks() ?? []),
          ...(audioStream?.getAudioTracks() ?? []),
        ]);
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;

        if (videoRef.current && videoStream) {
          videoRef.current.srcObject = videoStream;
        }
        setCameraAvailable(Boolean(videoStream));
        setMicAvailable(Boolean(audioStream));
        setCameraActive(Boolean(videoStream));
        setMicActive(Boolean(audioStream));

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx && audioStream) {
          audioContext = new AudioCtx();
          const source = audioContext.createMediaStreamSource(audioStream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          function updateMicLevel() {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameId = requestAnimationFrame(updateMicLevel);
          }
          updateMicLevel();
        }
      } catch (err) {
        console.warn("Hardware permission warning:", err);
        setCameraActive(false);
        setMicActive(false);
        setCameraAvailable(false);
        setMicAvailable(false);
      }
    }

    void setupHardware();

    return () => {
      cancelled = true;
      streamRef.current = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const handleTestSound = () => {
    setIsPlayingTestSound(true);

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);

        setTimeout(() => {
          setIsPlayingTestSound(false);
          void ctx.close();
        }, 500);
      }
    } catch {
      setIsPlayingTestSound(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hardware-check-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 transition-opacity" onClick={onCancel} />

      {/* Modal Card */}
      <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-xl sm:p-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h3 id="hardware-check-title" className="text-lg font-bold sm:text-xl">
              Kiểm tra thiết bị phòng phỏng vấn
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Đảm bảo Camera, Microphone và Loa của bạn hoạt động tốt trước khi bắt đầu
            </p>
          </div>
          <button
            onClick={onCancel}
            title="Đóng"
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hardware Sections */}
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Camera Preview */}
          <div className="flex flex-col items-center">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${cameraActive ? "" : "invisible"}`}
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 text-slate-400">
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-xs">
                    {cameraAvailable ? "Camera đã tắt" : "Không có camera hoặc chưa được cấp quyền"}
                  </span>
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                {cameraActive ? <Camera className="h-3 w-3" /> : <CameraOff className="h-3 w-3" />}
                <span>{cameraActive ? "Camera sẵn sàng" : "Camera đã tắt"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !cameraActive;
                streamRef.current?.getVideoTracks().forEach((track) => {
                  track.enabled = next;
                });
                setCameraActive(next);
              }}
              disabled={!cameraAvailable}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">
              {cameraActive ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {cameraActive ? "Tắt camera" : "Bật camera"}
            </button>
          </div>

          {/* Audio & Speaker Testing */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Microphone Volume Meter */}
            <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold">
                    Microphone {micActive ? "(Sẵn sàng)" : "(Chưa nhận)"}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {micActive ? micLevel : 0}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${micActive ? micLevel : 0}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Hãy thử nói một câu để kiểm tra thanh âm lượng nhảy lên.
              </p>
              <button
                type="button"
                disabled={!micAvailable}
                onClick={() => {
                  const next = !micActive;
                  streamRef.current?.getAudioTracks().forEach((track) => {
                    track.enabled = next;
                  });
                  setMicActive(next);
                }}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">
                {micActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {micActive ? "Tắt microphone" : "Bật microphone"}
              </button>
            </div>

            {/* Speaker Sound Test */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Kiểm tra âm thanh loa</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Nghe chuông thử nghiệm
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSound}
                className="h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                {isPlayingTestSound ? "Đang phát" : "Phát âm thanh"}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">
            <span>Sẵn sàng vào phỏng vấn</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
