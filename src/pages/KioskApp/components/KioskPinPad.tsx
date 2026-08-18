import { useEffect, useCallback } from 'react';
import { Lock, Delete, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface KioskPinPadProps {
  pin: string;
  pinLength?: number;
  isVerifying: boolean;
  error: string | null;
  onKeyPress: (key: string) => void;
  onClear: () => void;
}

export function KioskPinPad({
  pin,
  pinLength = 6,
  isVerifying,
  error,
  onKeyPress,
  onClear,
}: KioskPinPadProps) {
  // Support physical keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isVerifying) return;
      if (e.key >= '0' && e.key <= '9') {
        onKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        onKeyPress('DEL');
      } else if (e.key === 'Escape') {
        onClear();
      }
    },
    [isVerifying, onKeyPress, onClear]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['AC', '0', 'DEL'],
  ];

  return (
    <div className="relative mx-auto flex w-full max-w-[440px] flex-col items-center rounded-3xl border border-[#98cbff]/20 bg-[#1a2235]/45 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Top Header Lock Icon */}
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#98cbff]/30 bg-[#98cbff]/10 text-[#98cbff] shadow-[0_0_20px_rgba(152,203,255,0.25)]">
        <Lock className="h-7 w-7" />
      </div>

      <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
        Nhập mã phiên phỏng vấn
      </h2>
      <p className="mt-1 text-center text-xs text-[#bec7d4] sm:text-sm">
        Nhập mã PIN 6 số được cấp từ lịch hẹn để vào phòng AI
      </p>

      {/* 6-Digit PIN Slot Display */}
      <div className="my-6 flex items-center justify-center gap-2.5 sm:gap-3.5">
        {Array.from({ length: pinLength }).map((_, index) => {
          const isFilled = index < pin.length;
          const isActive = index === pin.length;
          return (
            <div
              key={index}
              className={`flex h-12 w-11 items-center justify-center rounded-xl border text-xl font-bold transition-all duration-200 sm:h-14 sm:w-13 sm:text-2xl ${
                isFilled
                  ? 'border-[#98cbff] bg-[#98cbff]/25 text-[#98cbff] shadow-[0_0_15px_rgba(152,203,255,0.4)]'
                  : isActive
                    ? 'border-[#98cbff] bg-[#1a2235]/80 text-[#98cbff] ring-2 ring-[#98cbff]/40 shadow-[0_0_12px_rgba(152,203,255,0.3)]'
                    : 'border-[#98cbff]/20 bg-[#1a2235]/50 text-slate-500'
              }`}
            >
              {isFilled ? pin[index] : isActive ? <span className="animate-pulse">|</span> : ''}
            </div>
          );
        })}
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="mb-4 flex w-full items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-200 backdrop-blur-md">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {isVerifying && (
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#98cbff]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Đang xác thực mã phiên Kiosk...</span>
        </div>
      )}

      {/* On-Screen Virtual Numpad */}
      <div className="grid w-full grid-cols-3 gap-2.5 sm:gap-3.5">
        {keys.flat().map((k) => {
          const isSpecial = k === 'AC' || k === 'DEL';
          return (
            <button
              key={k}
              type="button"
              disabled={isVerifying}
              onClick={() => onKeyPress(k)}
              className={`flex h-13 items-center justify-center rounded-2xl font-bold transition-all duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:h-15 ${
                isSpecial
                  ? 'border border-[#98cbff]/20 bg-[#1a2235]/60 text-xs text-[#98cbff] hover:bg-[#98cbff]/20 sm:text-sm'
                  : 'border border-[#98cbff]/15 bg-[#1a2235]/40 text-xl text-white hover:border-[#98cbff]/40 hover:bg-[#98cbff]/15 sm:text-2xl'
              } shadow-[0_4px_12px_rgba(0,0,0,0.2)]`}
            >
              {k === 'DEL' ? (
                <Delete className="h-5 w-5 text-[#98cbff]" />
              ) : k === 'AC' ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> AC
                </span>
              ) : (
                k
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
