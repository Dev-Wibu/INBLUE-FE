import { useState, useRef, useEffect, useCallback, type MouseEvent } from 'react';
import { Play, Square, Check, Mic2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { VoiceOption } from '@/services/kiosk/kioskApi.service';

interface KioskVoiceSelectorProps {
  voices: VoiceOption[];
  selectedVoiceId: string;
  isLoading: boolean;
  onSelectVoice: (voiceId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export function KioskVoiceSelector({
  voices,
  selectedVoiceId,
  isLoading,
  onSelectVoice,
  onConfirm,
  onBack,
}: KioskVoiceSelectorProps) {
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPreviewingVoiceId(null);
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleTogglePreview = (voice: VoiceOption, e: MouseEvent) => {
    e.stopPropagation();

    if (previewingVoiceId === voice.id) {
      stopAudio();
      return;
    }

    stopAudio();

    if (!voice.previewUrl) return;

    const audio = new Audio(voice.previewUrl);
    audioRef.current = audio;
    setPreviewingVoiceId(voice.id);

    audio.onended = () => {
      setPreviewingVoiceId(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPreviewingVoiceId(null);
      audioRef.current = null;
    };

    void audio.play().catch(() => {
      setPreviewingVoiceId(null);
    });
  };

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl border border-[#98cbff]/20 bg-[#1a2235]/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Header */}
      <div className="mb-2 flex h-13 w-13 items-center justify-center rounded-2xl border border-[#98cbff]/30 bg-[#98cbff]/10 text-[#98cbff] shadow-[0_0_20px_rgba(152,203,255,0.25)]">
        <Mic2 className="h-6 w-6" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        Chọn giọng nói trợ lý AI
      </h2>
      <p className="mt-1 text-center text-xs text-[#bec7d4] sm:text-sm">
        Chọn phong cách giọng đọc của AI để bắt đầu buổi phỏng vấn
      </p>

      {/* Loading state */}
      {isLoading ? (
        <div className="my-12 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#98cbff]" />
          <span className="text-xs text-[#bec7d4]">Đang tải danh sách giọng đọc AI...</span>
        </div>
      ) : voices.length === 0 ? (
        <div className="my-12 text-center text-xs text-slate-400">
          Không có giọng đọc nào khả dụng. Vui lòng liên hệ nhân viên vận hành.
        </div>
      ) : (
        <div className="my-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {voices.map((v) => {
            const isSelected = selectedVoiceId === v.id;
            const isPreviewing = previewingVoiceId === v.id;

            return (
              <div
                key={v.id}
                onClick={() => onSelectVoice(v.id)}
                className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4.5 transition-all ${
                  isSelected
                    ? 'border-[#98cbff] bg-[#98cbff]/20 shadow-[0_0_15px_rgba(152,203,255,0.3)]'
                    : 'border-[#98cbff]/15 bg-[#1a2235]/40 hover:border-[#98cbff]/40 hover:bg-[#1a2235]/70'
                }`}
              >
                {/* Voice Info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white group-hover:text-[#98cbff]">
                        {v.name}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 rounded-full bg-[#98cbff]/30 px-2 py-0.5 text-[10px] font-bold text-[#98cbff]">
                          <Sparkles className="h-2.5 w-2.5" /> Đã chọn
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[#bec7d4]">
                      {v.description || 'Giọng AI chuẩn hóa tiếng Việt chất lượng cao.'}
                    </p>
                  </div>

                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? 'border-[#98cbff] bg-[#98cbff] text-slate-950'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Preview Button with Waveform */}
                <div className="mt-4 flex items-center justify-between border-t border-[#98cbff]/10 pt-3">
                  <button
                    type="button"
                    onClick={(e) => handleTogglePreview(v, e)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isPreviewing
                        ? 'border-amber-400/50 bg-amber-400/20 text-amber-300'
                        : 'border-[#98cbff]/20 bg-[#1a2235]/80 text-[#98cbff] hover:bg-[#98cbff]/20'
                    }`}
                  >
                    {isPreviewing ? (
                      <>
                        <Square className="h-3.5 w-3.5 fill-current" />
                        <span>Dừng</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Nghe thử</span>
                      </>
                    )}
                  </button>

                  {/* 5-Bar Waveform Indicator */}
                  {isPreviewing && (
                    <div className="flex items-center gap-1">
                      {[0.4, 0.8, 1, 0.7, 0.5].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 animate-pulse rounded-full bg-[#98cbff]"
                          style={{
                            height: `${h * 16}px`,
                            animationDelay: `${i * 150}ms`,
                            animationDuration: '600ms',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-2 flex w-full items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10"
        >
          Quay lại
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={!selectedVoiceId}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#00a3ff] to-[#0055ff] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:opacity-95 active:scale-98 disabled:opacity-50"
        >
          <span>Tiếp tục kiểm tra thiết bị</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
