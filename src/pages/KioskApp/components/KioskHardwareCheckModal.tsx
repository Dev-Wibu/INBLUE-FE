import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Volume2, AlertCircle, X, ArrowRight } from 'lucide-react';

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
  const [micLevel, setMicLevel] = useState(0);
  const [isPlayingTestSound, setIsPlayingTestSound] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mediaStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animFrameId: number;

    async function setupHardware() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraActive(true);
        setMicActive(true);

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioContext = new AudioCtx();
          const source = audioContext.createMediaStreamSource(mediaStream);
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
        console.warn('Hardware permission warning:', err);
        setCameraActive(false);
        setMicActive(false);
      }
    }

    void setupHardware();

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (audioContext && audioContext.state !== 'closed') {
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
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-[#98cbff]/30 bg-[#121828]/95 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#98cbff]/15 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white sm:text-xl">
              Kiểm tra thiết bị phòng phỏng vấn
            </h3>
            <p className="text-xs text-[#bec7d4]">
              Đảm bảo Camera, Microphone và Loa của bạn hoạt động tốt trước khi bắt đầu
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hardware Sections */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Camera Preview */}
          <div className="flex flex-col items-center">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#98cbff]/20 bg-slate-950 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 text-slate-400">
                  <AlertCircle className="h-6 w-6 text-amber-400" />
                  <span className="text-xs">Chưa nhận diện được Camera</span>
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur">
                <Camera className="h-3 w-3 text-[#98cbff]" />
                <span>{cameraActive ? 'Camera HD Sẵn sàng' : 'Không có Camera'}</span>
              </div>
            </div>
          </div>

          {/* Audio & Speaker Testing */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Microphone Volume Meter */}
            <div className="rounded-2xl border border-[#98cbff]/15 bg-[#1a2235]/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-[#98cbff]" />
                  <span className="text-xs font-bold text-white">
                    Microphone {micActive ? '(Sẵn sàng)' : '(Chưa nhận)'}
                  </span>
                </div>
                <span className="text-xs text-[#98cbff]">{micLevel}%</span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00a3ff] to-[#00ffbb] transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#bec7d4]">
                Hãy thử nói một câu để kiểm tra thanh âm lượng nhảy lên.
              </p>
            </div>

            {/* Speaker Sound Test */}
            <div className="flex items-center justify-between rounded-2xl border border-[#98cbff]/15 bg-[#1a2235]/50 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                    isPlayingTestSound ? 'scale-110 bg-[#98cbff] text-slate-950 shadow-[0_0_15px_rgba(152,203,255,0.8)]' : 'bg-[#98cbff]/15 text-[#98cbff]'
                  }`}
                >
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Kiểm tra âm thanh loa</div>
                  <div className="text-[11px] text-[#bec7d4]">Nghe chuông thử nghiệm</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestSound}
                className="rounded-xl border border-[#98cbff]/30 bg-[#98cbff]/15 px-3 py-1.5 text-xs font-bold text-[#98cbff] hover:bg-[#98cbff]/30"
              >
                Phát âm thanh
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-[#98cbff]/15 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00a3ff] to-[#0055ff] px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 active:scale-98"
          >
            <span>Sẵn sàng vào phỏng vấn</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
