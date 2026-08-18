import { useCallback, useEffect, useMemo, useState } from 'react';
import { CyberCanvasBackground } from './components/CyberCanvasBackground';
import { KioskSettingsModal } from './components/KioskSettingsModal';
import { KioskHardwareCheckModal } from './components/KioskHardwareCheckModal';
import { KioskAIInterviewRoomPage } from './KioskAIInterviewRoomPage';
import {
  enterKioskApi,
  getAvailableVoicesApi,
  type Kiosk,
  type VoiceOption,
} from '@/services/kiosk/kioskApi.service';

const PIN_LENGTH = 6;
const WEB_KIOSK_STORAGE_KEY = 'inblue.currentKiosk';

type AppScreenState = 'PIN_ENTRY' | 'VOICE_SELECT' | 'HARDWARE_CHECK' | 'AI_ROOM';

const DEFAULT_MOCK_VOICES: VoiceOption[] = [
  {
    id: 'voice-banmai',
    name: 'Ban Mai (Nữ miền Bắc)',
    description: 'Giọng đọc nữ thanh thoát, tự nhiên, chuẩn ngữ điệu phỏng vấn chuyên nghiệp.',
    previewUrl: '',
  },
  {
    id: 'voice-minhquang',
    name: 'Minh Quang (Nam miền Bắc)',
    description: 'Giọng đọc nam trầm ấm, rõ ràng, phong thái tự tin và chuyên nghiệp.',
    previewUrl: '',
  },
  {
    id: 'voice-lananh',
    name: 'Lan Anh (Nữ miền Nam)',
    description: 'Giọng nữ miền Nam nhẹ nhàng, lưu loát, truyền cảm hứng.',
    previewUrl: '',
  },
  {
    id: 'voice-thanhhai',
    name: 'Thanh Hải (Nam miền Nam)',
    description: 'Giọng nam miền Nam dõng dạc, mạch lạc, phù hợp mọi vai trò.',
    previewUrl: '',
  },
];

export function StandaloneKioskPage() {
  const [screenState, setScreenState] = useState<AppScreenState>('PIN_ENTRY');
  const [pin, setPin] = useState('');
  const [aiSessionKey, setAiSessionKey] = useState('DEMO-KIOSK-2026');
  const [interviewDurationMinutes, setInterviewDurationMinutes] = useState(15);

  // Kiosk Config & Staff Settings
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [isKioskSettingsOpen, setIsKioskSettingsOpen] = useState(false);

  // Voice Selection
  const [voices, setVoices] = useState<VoiceOption[]>(DEFAULT_MOCK_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState('voice-banmai');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Hardware Check Modal
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  // Verification & Error
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real-time Clock & Date
  const [timeStr, setTimeStr] = useState('18:48');
  const [dateStr, setDateStr] = useState('17-08-2026');

  // Load saved Kiosk config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WEB_KIOSK_STORAGE_KEY);
      if (saved) {
        setSelectedKiosk(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Cannot load saved kiosk:', e);
    }
  }, []);

  // Update real-time clock & date
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${h}:${m}`);

      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      setDateStr(`${dd}-${mm}-${yyyy}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load AI Voice options
  const loadVoices = useCallback(async () => {
    try {
      const list = await getAvailableVoicesApi();
      if (list && list.length > 0) {
        setVoices(list);
        setSelectedVoiceId(list[0]?.id || 'voice-banmai');
      }
    } catch {
      setVoices(DEFAULT_MOCK_VOICES);
      setSelectedVoiceId('voice-banmai');
    }
  }, []);

  // Handle PIN Submission
  const handlePinSubmit = useCallback(
    async (targetPin: string) => {
      setIsVerifying(true);
      setAuthError(null);

      // If in demo mode or backend fails, allow immediate bypass for testing
      try {
        if (selectedKiosk?.id) {
          const res = await enterKioskApi(targetPin, selectedKiosk.id);
          setAiSessionKey(res.aiSessionKey || targetPin);
          setInterviewDurationMinutes(res.durationMinutes || 15);
        } else {
          setAiSessionKey(`KIOSK-${targetPin}`);
          setInterviewDurationMinutes(15);
        }
        setIsVerifying(false);
        setScreenState('VOICE_SELECT');
        void loadVoices();
      } catch {
        // Fallback for easy testing without valid backend PIN
        setAiSessionKey(`DEMO-${targetPin}`);
        setInterviewDurationMinutes(15);
        setIsVerifying(false);
        setScreenState('VOICE_SELECT');
        void loadVoices();
      }
    },
    [selectedKiosk, loadVoices]
  );

  const pressKey = useCallback(
    (val: string) => {
      if (isVerifying || screenState !== 'PIN_ENTRY') return;
      setAuthError(null);

      if (val === 'AC') {
        setPin('');
        return;
      }
      if (val === 'DEL') {
        setPin((p) => p.slice(0, -1));
        return;
      }

      if (pin.length < PIN_LENGTH) {
        const nextPin = pin + val;
        setPin(nextPin);
        if (nextPin.length === PIN_LENGTH) {
          void handlePinSubmit(nextPin);
        }
      }
    },
    [isVerifying, screenState, pin, handlePinSubmit]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    if (screenState !== 'PIN_ENTRY') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        pressKey(e.key);
      } else if (e.key === 'Backspace') {
        pressKey('DEL');
      } else if (e.key === 'Escape') {
        pressKey('AC');
      } else if (e.key === 'Enter' && pin.length > 0) {
        void handlePinSubmit(pin.padEnd(6, '0'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screenState, pin, pressKey, handlePinSubmit]);

  // Demo bypass direct to any step
  const handleQuickDemoBypass = (target: AppScreenState) => {
    setScreenState(target);
    if (target === 'VOICE_SELECT') void loadVoices();
  };

  const handleResetToStandby = useCallback(() => {
    setScreenState('PIN_ENTRY');
    setPin('');
    setAuthError(null);
    setIsHardwareModalOpen(false);
  }, []);

  const safeVoices = useMemo(() => (voices.length > 0 ? voices : DEFAULT_MOCK_VOICES), [voices]);

  // Render Full Screen AI Room when in AI_ROOM state
  if (screenState === 'AI_ROOM') {
    return (
      <KioskAIInterviewRoomPage
        sessionKey={aiSessionKey}
        durationMinutes={interviewDurationMinutes}
        selectedVoiceId={selectedVoiceId}
        voices={safeVoices}
        onFinish={handleResetToStandby}
      />
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col justify-between overflow-hidden bg-[#050A1A] font-sans text-white select-none">
      {/* ── Top Dev/Tester Quick Switcher Banner (Floating Demo Navigator) ── */}
      <div className="fixed top-2 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#98cbff]/30 bg-[#121828]/90 px-3 py-1 text-[11px] shadow-2xl backdrop-blur-xl">
        <span className="mr-1 font-bold text-[#98cbff]">⚡ TEST CHUYỂN MÀN HÌNH:</span>
        <button
          type="button"
          onClick={() => handleQuickDemoBypass('PIN_ENTRY')}
          className={`rounded-full px-2.5 py-0.5 font-bold transition-all ${
            screenState === 'PIN_ENTRY' ? 'bg-[#98cbff] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          1. Nhập PIN
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemoBypass('VOICE_SELECT')}
          className={`rounded-full px-2.5 py-0.5 font-bold transition-all ${
            screenState === 'VOICE_SELECT' ? 'bg-[#98cbff] text-slate-950 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          2. Chọn Giọng
        </button>
        <button
          type="button"
          onClick={() => setIsHardwareModalOpen(true)}
          className="rounded-full px-2.5 py-0.5 font-bold text-slate-400 hover:text-white"
        >
          3. Test Phần Cứng
        </button>
        <button
          type="button"
          onClick={() => handleQuickDemoBypass('AI_ROOM')}
          className="rounded-full bg-gradient-to-r from-[#00a3ff] to-[#0055ff] px-3 py-0.5 font-bold text-white shadow hover:opacity-90"
        >
          4. Vào Phòng AI 🚀
        </button>
      </div>

      {/* Main Split Layout: Left Panel & Right Panel */}
      <div className="relative flex flex-1 flex-col lg:flex-row">
        {/* ── LEFT PANEL: Exact Clone of Mobile ── */}
        <div className="relative flex flex-1 flex-col justify-between p-8 lg:max-w-[48%] lg:p-14">
          <CyberCanvasBackground />

          {/* Real-time Date Widget at Top Right of Left Panel */}
          <div className="absolute top-8 right-8 z-10 lg:top-14 lg:right-12">
            <span className="font-mono text-xl font-extrabold tracking-widest text-[#98cbff] sm:text-2xl lg:text-3xl">
              {dateStr}
            </span>
          </div>

          {/* Left Header Group: INBLUE, Phỏng Vấn AI Tại Kiosk, System Online */}
          <div className="relative z-10 mt-auto mb-auto">
            <h1 className="text-5xl font-black tracking-tighter text-[#98cbff] sm:text-6xl lg:text-7xl">
              INBLUE
            </h1>
            <h2 className="mt-3 text-3xl font-extrabold text-[#e2e2e2] sm:text-4xl lg:text-5xl leading-tight">
              Phỏng Vấn <br />
              AI Tại Kiosk
            </h2>

            {/* System Online Badge */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1c1c]/40 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#98cbff] shadow-[0_0_8px_#98cbff]" />
              <span className="text-xs font-bold tracking-wider text-[#98cbff]">System Online</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Interaction Workspace ── */}
        <div className="relative flex flex-1 flex-col items-center justify-center border-t border-white/10 bg-[#050A1A] p-6 lg:border-t-0 lg:border-l lg:p-12">
          {/* Subtle Grid Background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Top Control Row: Clock Widget & Gear Settings Button */}
          <div className="absolute top-6 right-6 z-20 flex items-center gap-3 lg:top-12 lg:right-12">
            <div className="flex items-center gap-2 rounded-2xl border border-[#98cbff]/20 bg-[#1a2235]/60 px-4 py-2 text-sm font-bold text-[#e2e2e2] backdrop-blur-xl shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#98cbff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span className="font-mono tracking-widest">{timeStr}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsKioskSettingsOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#98cbff]/20 bg-[#1a2235]/60 text-lg font-black text-[#98cbff] shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              ⚙
            </button>
          </div>

          {/* ── Center Content: PIN_ENTRY or VOICE_SELECT ── */}
          <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
            {screenState === 'PIN_ENTRY' ? (
              <>
                {/* Material Open Lock Icon */}
                <div className="mb-4">
                  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#98cbff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
                  </svg>
                </div>

                <p className="text-center text-sm text-[#bec7d4] leading-relaxed sm:text-base">
                  Nhập mã PIN 6 số từ lịch hẹn của bạn để bắt đầu.
                </p>

                {/* Subtitle / Kiosk Status */}
                <button
                  type="button"
                  onClick={() => setIsKioskSettingsOpen(true)}
                  className="mt-1 mb-6 text-center text-xs font-bold text-[#98cbff]/80 hover:text-[#98cbff] transition-colors"
                >
                  {selectedKiosk
                    ? `Kiosk hiện tại: ${selectedKiosk.name}${selectedKiosk.location ? ` · ${selectedKiosk.location}` : ''}`
                    : 'Chưa cấu hình kiosk cho màn hình này'}
                </button>

                {/* 6 Circular Round Slot Dots/Circles (Exact 1:1 Mobile Match) */}
                <div className="mb-8 flex items-center justify-center gap-3.5 sm:gap-4">
                  {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                    const filled = idx < pin.length;
                    return (
                      <div
                        key={idx}
                        className={`h-10 w-10 rounded-full border-[1.5px] transition-all duration-200 sm:h-12 sm:w-12 ${
                          filled
                            ? 'border-[#98cbff] bg-[#98cbff] shadow-[0_0_16px_rgba(152,203,255,0.7)]'
                            : 'border-[#98cbff]/20 bg-[#1a2235]/60'
                        }`}
                      />
                    );
                  })}
                </div>

                {authError && (
                  <p className="mb-4 text-center text-xs font-bold text-red-400">{authError}</p>
                )}

                {/* Touch Numpad (Exact 1:1 Clone of Mobile Keypad) */}
                <div className="grid w-full grid-cols-3 gap-3 sm:gap-4.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'AC', '0', 'DEL'].map((k) => {
                    const isAction = k === 'AC' || k === 'DEL';
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => pressKey(k)}
                        className={`flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-[#1a2235]/40 transition-all duration-100 hover:border-[#98cbff]/40 hover:bg-[#98cbff]/15 active:scale-95 sm:h-18 ${
                          isAction ? 'text-sm font-semibold text-[#bec7d4]' : 'text-2xl font-bold text-white sm:text-3xl'
                        }`}
                      >
                        {k === 'DEL' ? (
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#bec7d4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                            <line x1="18" y1="9" x2="12" y2="15"></line>
                            <line x1="12" y1="9" x2="18" y2="15"></line>
                          </svg>
                        ) : (
                          k
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Test Hint for User */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePinSubmit('123456')}
                    className="text-[11px] text-[#98cbff]/70 hover:text-[#98cbff] underline decoration-dotted"
                  >
                    (Không có mã PIN? Nhấn vào đây để thử ngay với mã Demo 123456)
                  </button>
                </div>
              </>
            ) : (
              /* ── VOICE_SELECT SCREEN: Exact Clone of Mobile ── */
              <div className="flex w-full flex-col items-center rounded-3xl border border-[#98cbff]/15 bg-[#050A1A]/70 p-6 shadow-2xl backdrop-blur-2xl">
                <span className="text-[10px] font-black tracking-[2px] text-[#00a3ff]">AI VOICE PROFILE</span>
                <h3 className="mt-1 text-xl font-black text-[#98cbff] sm:text-2xl">Chọn giọng nói phỏng vấn</h3>
                <p className="mt-2 text-center text-xs text-[#bec7d4] leading-relaxed">
                  Hãy chọn chất giọng bạn muốn nghe trong suốt buổi phỏng vấn. Bạn vẫn có thể đổi lại khi đang phỏng vấn.
                </p>

                {/* Voice List Cards */}
                <div className="my-5 flex w-full flex-col gap-3">
                  {safeVoices.map((voice, index) => {
                    const selected = selectedVoiceId === voice.id;
                    const previewing = previewingVoiceId === voice.id;
                    const voiceCode = `V${String(index + 1).padStart(2, '0')}`;

                    return (
                      <div
                        key={voice.id}
                        onClick={() => {
                          setSelectedVoiceId(voice.id);
                          setPreviewingVoiceId(voice.id);
                        }}
                        className={`group relative flex cursor-pointer flex-col rounded-2xl border p-3.5 transition-all ${
                          selected
                            ? 'border-[#00a3ff] bg-[#00a3ff]/15 shadow-[0_0_20px_rgba(0,163,255,0.25)]'
                            : 'border-[#98cbff]/15 bg-[#091224]/75 hover:border-[#98cbff]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black tracking-wider text-[#98cbff]/60">{voiceCode}</span>
                          {selected && (
                            <span className="rounded-full border border-[#98cbff]/30 bg-[#98cbff]/10 px-2 py-0.5 text-[9px] font-black text-[#98cbff]">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black ${
                            selected ? 'border-[#98cbff] bg-[#98cbff]/20 text-[#98cbff]' : 'border-[#98cbff]/20 bg-[#00a3ff]/10 text-[#98cbff]'
                          }`}>
                            {voice.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#e2e2e2]">{voice.name}</div>
                            <div className="text-[10px] font-bold text-[#98cbff]/70 uppercase tracking-wider">
                              {selected ? 'Đang chọn' : 'Có thể chọn'}
                            </div>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-[#bec7d4] line-clamp-2">{voice.description}</p>

                        <div className="mt-3 flex items-center justify-between border-t border-[#98cbff]/10 pt-2 text-[10px] font-bold text-[#98cbff]/70">
                          <span>Chạm để chọn giọng đọc</span>
                          {previewing && <span className="text-amber-400">Đang phát mẫu...</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Actions */}
                <div className="flex w-full items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleResetToStandby}
                    className="rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-xs font-bold text-[#bec7d4] hover:bg-slate-800"
                  >
                    Quay lại
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHardwareModalOpen(true)}
                    className="flex-1 rounded-full bg-[#00a3ff] py-2.5 text-xs font-black text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-500 active:scale-98"
                  >
                    Bắt đầu phỏng vấn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER BAR: Exact 1:1 Clone of Mobile ── */}
      <footer className="relative z-10 flex h-12 shrink-0 items-center justify-between border-t border-[#98cbff]/10 bg-[#050A1A]/80 px-8 text-[10px] font-bold tracking-widest text-[#94a3b8]/70 uppercase">
        <div className="flex items-center gap-2">
          <span>FPT UNIVERSITY</span>
          <span>•</span>
          <span>SOFTWARE ENGINEERING</span>
          <span>•</span>
          <span>SUMMER 2026</span>
        </div>

        <div>
          <span>POWERED BY INBLUE PLATFORM</span>
        </div>
      </footer>

      {/* Staff Settings Modal */}
      <KioskSettingsModal
        isOpen={isKioskSettingsOpen}
        currentKiosk={selectedKiosk}
        onClose={() => setIsKioskSettingsOpen(false)}
        onKioskSaved={(kiosk) => {
          setSelectedKiosk(kiosk);
          setAuthError(null);
        }}
      />

      {/* Hardware Check Modal */}
      <KioskHardwareCheckModal
        isOpen={isHardwareModalOpen}
        onConfirm={() => {
          setIsHardwareModalOpen(false);
          setScreenState('AI_ROOM');
        }}
        onCancel={() => setIsHardwareModalOpen(false)}
      />
    </div>
  );
}
