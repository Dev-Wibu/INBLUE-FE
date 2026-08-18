import { useCallback, useEffect, useRef, useState } from 'react';
import { CyberCanvasBackground } from './components/CyberCanvasBackground';
import {
  generateTtsAudioApi,
  startInterviewApi,
  submitAnswerApi,
  type ChatMessage,
  type VoiceOption,
} from '@/services/kiosk/kioskApi.service';
import { playTtsAudioBlob, type TtsPlayback } from '@/services/kiosk/ttsAudio';
import {
  startRealtimeTranscription,
  type RealtimeTranscriptionHandle,
} from '@/services/kiosk/realtimeTranscription';

interface KioskAIInterviewRoomPageProps {
  sessionKey: string;
  durationMinutes?: number;
  selectedVoiceId?: string;
  voices?: VoiceOption[];
  onFinish: () => void;
}

type AIState = 'IDLE' | 'THINKING' | 'SPEAKING' | 'LISTENING';

const DEFAULT_MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    role: 'ai',
    content:
      'Chào Thành Lam, mình đã xem qua hồ sơ của bạn với GPA khá ấn tượng tại FPT University. Bạn có thể giới thiệu ngắn gọn về bản thân và chia sẻ lý do tại sao một người có kinh nghiệm làm .NET Intern như bạn lại muốn ứng tuyển vị trí Java Backend tại công ty mình không?',
    timestamp: '08:40 PM',
  },
  {
    id: 2,
    role: 'user',
    content: 'Hello Hello Hello Hello Hello',
    timestamp: '08:41 PM',
  },
  {
    id: 3,
    role: 'ai',
    content:
      'Chào bạn, có vẻ như bạn đang rất hào hứng hoặc gặp chút trục trặc khi nhập liệu. Mình vẫn đang đợi phần giới thiệu ngắn gọn về bản thân cũng như lý do bạn muốn chuyển từ .NET sang Java Backend từ bạn nhé. Bạn cứ thoải mái chia sẻ, không cần quá áp lực đâu!',
    timestamp: '08:41 PM',
  },
  {
    id: 4,
    role: 'user',
    content: 'chuc the <vocal-spa Space> Space Space',
    timestamp: '08:42 PM',
  },
];

const INITIAL_QUESTION =
  'Chào bạn, có vẻ như bạn đang rất hào hứng hoặc gặp chút trục trặc khi nhập liệu. Mình vẫn đang đợi phần giới thiệu ngắn gọn về bản thân cũng như lý do bạn muốn chuyển từ .NET sang Java Backend từ bạn nhé. Bạn cứ thoải mái chia sẻ, không cần quá áp lực đâu!';

export function KioskAIInterviewRoomPage({
  sessionKey,
  durationMinutes = 15,
  selectedVoiceId = '',
  onFinish,
}: KioskAIInterviewRoomPageProps) {
  const [aiState, setAiState] = useState<AIState>('IDLE');
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MOCK_MESSAGES);
  const [currentQuestionContent, setCurrentQuestionContent] = useState(INITIAL_QUESTION);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions] = useState(5);

  // Live STT & Recording
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  // Audio & Waveform levels
  const [aiVolumeLevel, setAiVolumeLevel] = useState(0);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);

  // Real-time clock & Countdown
  const [clockStr, setClockStr] = useState('18:43:06');
  const [remainingSeconds, setRemainingSeconds] = useState(() => Math.max(0, durationMinutes * 60));

  // Refs
  const ttsPlaybackRef = useRef<TtsPlayback | null>(null);
  const transcriptionHandleRef = useRef<RealtimeTranscriptionHandle | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micAnimFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTranscript]);

  // Real-time Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setClockStr(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Microphone Volume Analyzer
  const startMicVolumeMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      micAudioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicVolumeLevel(Math.min(1, avg / 100));
        micAnimFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // Fallback animated mock level
      const interval = setInterval(() => {
        setMicVolumeLevel(0.2 + Math.random() * 0.6);
      }, 150);
      return () => clearInterval(interval);
    }
  }, []);

  const stopMicVolumeMeter = useCallback(() => {
    if (micAnimFrameRef.current) {
      cancelAnimationFrame(micAnimFrameRef.current);
      micAnimFrameRef.current = null;
    }
    if (micAudioContextRef.current && micAudioContextRef.current.state !== 'closed') {
      void micAudioContextRef.current.close();
      micAudioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    micAnalyserRef.current = null;
    setMicVolumeLevel(0);
  }, []);

  // Toggle Recording / Mic
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      stopMicVolumeMeter();
      if (transcriptionHandleRef.current) {
        await transcriptionHandleRef.current.stop();
        transcriptionHandleRef.current = null;
      }
      return;
    }

    setIsRecording(true);
    setAiState('LISTENING');
    void startMicVolumeMeter();

    try {
      const handle = await startRealtimeTranscription(liveTranscript, {
        onTranscript: (text) => {
          setLiveTranscript(text);
        },
      });
      transcriptionHandleRef.current = handle;
    } catch {
      // Mock transcript update for easy testing
      setLiveTranscript('Tôi đang chia sẻ câu trả lời của mình trực tiếp vào microphone...');
    }
  }, [isRecording, liveTranscript, startMicVolumeMeter, stopMicVolumeMeter]);

  // AI Speaks Question
  const speakQuestion = useCallback(
    async (text: string) => {
      setAiState('SPEAKING');
      try {
        const audioBlob = await generateTtsAudioApi(text, selectedVoiceId);
        const playback = await playTtsAudioBlob(audioBlob, {
          onVolume: (energy) => {
            setAiVolumeLevel(energy);
          },
          onEnd: () => {
            setAiState('LISTENING');
            setAiVolumeLevel(0);
          },
        });
        ttsPlaybackRef.current = playback;
      } catch {
        // Fallback TTS or auto-listen
        setTimeout(() => {
          setAiState('LISTENING');
        }, 2000);
      }
    },
    [selectedVoiceId]
  );

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (isSubmitting) return;
    const textToSend = liveTranscript.trim() || 'Tôi đã hoàn thành phần trả lời của mình.';

    setIsSubmitting(true);
    setAiState('THINKING');
    setIsRecording(false);
    stopMicVolumeMeter();

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: nowStr,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLiveTranscript('');

    try {
      const res = await submitAnswerApi(sessionKey, textToSend);
      setIsSubmitting(false);

      if (res.questionContent) {
        setCurrentQuestionContent(res.questionContent);
        setCurrentQuestionIndex((prev) => prev + 1);

        const aiMsg: ChatMessage = {
          id: Date.now() + 1,
          role: 'ai',
          content: res.questionContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        void speakQuestion(res.questionContent);
      } else {
        setAiState('IDLE');
      }
    } catch {
      // Mock follow-up question for testing
      setIsSubmitting(false);
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      const nextQ = `Câu hỏi ${nextIdx}: Bạn có thể chia sẻ sâu hơn về một tình huống cụ thể mà bạn đã giải quyết khi làm việc nhóm không?`;
      setCurrentQuestionContent(nextQ);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'ai',
          content: nextQ,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      void speakQuestion(nextQ);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const res = await startInterviewApi(sessionKey);
        if (mounted && res.questionContent) {
          setCurrentQuestionContent(res.questionContent);
        }
      } catch {
        // Keeps mock initial question
      }
    }
    void init();
    return () => {
      mounted = false;
      ttsPlaybackRef.current?.stop();
      if (transcriptionHandleRef.current) void transcriptionHandleRef.current.stop();
      stopMicVolumeMeter();
    };
  }, [sessionKey, stopMicVolumeMeter]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative flex h-screen w-screen flex-col justify-between overflow-hidden bg-[#050A1A] font-sans text-white select-none">
      <CyberCanvasBackground />

      {/* ── TOP HEADER NAVIGATION: Exact 1:1 Match with Mobile ── */}
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#98cbff]/10 bg-[#050A1A]/85 px-8 backdrop-blur-xl">
        {/* Left: Brand + KIOSK MODE BADGE */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tight text-[#98cbff]">INBLUE</span>
          <span className="rounded-full border border-[#98cbff]/30 bg-[#98cbff]/10 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-[#98cbff]">
            AI KIOSK MODE
          </span>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-[#1a1c1c]/40 px-3.5 py-1 text-xs font-bold text-emerald-400 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>System Online</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1a2235]/60 px-3.5 py-1 text-xs font-bold text-[#e2e2e2] backdrop-blur">
            <span>⏱</span>
            <span className="font-mono">{clockStr}</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[#98cbff]/20 bg-[#1a2235]/60 px-3.5 py-1 text-xs font-bold text-[#98cbff] backdrop-blur">
            <span className="text-[10px] text-[#bec7d4]">CÒN LẠI</span>
            <span className="font-mono">{formatCountdown(remainingSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-xs font-semibold text-[#cbd5e1] hover:bg-white/10"
          >
            <span>{isDrawerOpen ? 'Ẩn lịch sử' : 'Lịch sử trao đổi'}</span>
          </button>

          <button
            type="button"
            onClick={onFinish}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/20"
          >
            Thoát
          </button>
        </div>
      </header>

      {/* ── MAIN STAGE: Center AI Area & Right Chat Drawer ── */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Left / Center AI Stage */}
        <div className="relative flex flex-1 flex-col items-center justify-between p-6 overflow-y-auto">
          {/* 1. Top Question Box with Blue Glow Border */}
          <div className="w-full max-w-2xl rounded-2xl border border-[#00a3ff]/40 bg-[#091224]/80 p-5 shadow-[0_0_30px_rgba(0,163,255,0.15)] backdrop-blur-xl">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#98cbff]">
              <span className="flex items-center gap-1.5 tracking-wider uppercase">
                <span>💬</span> CÂU HỎI HIỆN TẠI
              </span>
              <span className="font-mono">Q{String(currentQuestionIndex).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-white leading-relaxed sm:text-base">
              {currentQuestionContent}
            </p>
          </div>

          {/* 2. Center Dynamic AI Hologram Robot Avatar Orb */}
          <div className="my-auto flex flex-col items-center justify-center">
            {/* Concentric Aura Rings */}
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute h-40 w-40 rounded-full transition-all duration-700 sm:h-52 sm:w-52 ${
                  aiState === 'SPEAKING'
                    ? 'scale-125 bg-cyan-500/20 blur-xl'
                    : aiState === 'LISTENING'
                      ? 'scale-115 bg-emerald-500/20 blur-xl'
                      : 'scale-100 bg-[#00a3ff]/15 blur-lg'
                }`}
              />

              {/* Main Circular Robot Avatar */}
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#00a3ff] bg-[#091830] shadow-[0_0_35px_rgba(0,163,255,0.4)] sm:h-36 sm:w-36">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#98cbff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="8" width="14" height="10" rx="4" />
                  <path d="M12 8V4.5" />
                  <path d="M8.5 4.5h7" />
                  <path d="M8.5 13h.01" />
                  <path d="M15.5 13h.01" />
                  <path d="M10 16h4" />
                  <path d="M5 12H3" />
                  <path d="M21 12h-2" />
                </svg>
              </div>
            </div>

            {/* AI Status Badge */}
            <div className="mt-4 flex items-center gap-2 rounded-full border border-[#98cbff]/20 bg-[#1a2235]/70 px-4 py-1 text-xs font-bold text-[#98cbff] backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${
                aiState === 'SPEAKING'
                  ? 'bg-cyan-400 animate-ping'
                  : aiState === 'LISTENING'
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-[#98cbff]'
              }`} />
              <span>
                {aiState === 'SPEAKING'
                  ? 'AI đang phát biểu...'
                  : aiState === 'LISTENING'
                    ? 'Đang lắng nghe bạn trả lời...'
                    : aiState === 'THINKING'
                      ? 'AI đang phân tích...'
                      : 'Sẵn sàng'}
              </span>
            </div>

            {/* Mic Action Icon & 17-bar Audio Waveform */}
            <button
              type="button"
              onClick={toggleRecording}
              className={`mt-4 flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                isRecording
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_#34d399]'
                  : 'border-[#98cbff]/30 bg-[#1a2235]/60 text-[#98cbff] hover:bg-[#98cbff]/20'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3Z" />
                <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6" />
              </svg>
            </button>

            {/* Animated Waveform Bars */}
            <div className="mt-3 flex h-6 items-center gap-1">
              {[0.4, 0.7, 1, 0.6, 1.2, 0.8, 1.4, 0.9, 1.6, 0.9, 1.4, 0.8, 1.2, 0.6, 1, 0.7, 0.4].map((baseH, i) => {
                const energy = aiState === 'SPEAKING' ? aiVolumeLevel : isRecording ? micVolumeLevel : 0.15;
                const h = Math.max(3, Math.min(22, baseH * 16 * (energy > 0 ? energy * 2 : 0.2)));
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      isRecording ? 'bg-emerald-400' : 'bg-[#98cbff]'
                    }`}
                    style={{ height: `${h}px` }}
                  />
                );
              })}
            </div>
          </div>

          {/* 3. Bottom Subtitle / Speech-To-Text Box (Exact 1:1 Mobile Match) */}
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border border-[#00a3ff]/30 bg-[#091224]/85 p-4 shadow-xl backdrop-blur-xl">
              {/* Card Top Line */}
              <div className="flex items-center justify-between text-[10px] font-bold text-[#98cbff]">
                <span className="flex items-center gap-1 uppercase tracking-wider">
                  <span>▤</span> BẢN DỊCH TRỰC TIẾP
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                  className="text-slate-400 hover:text-white"
                >
                  CHỈNH SỬA ✎
                </button>
              </div>

              {/* Subtitle / Live STT Text */}
              <div className="my-3 min-h-[40px]">
                {isEditingTranscript ? (
                  <input
                    type="text"
                    value={liveTranscript}
                    onChange={(e) => setLiveTranscript(e.target.value)}
                    placeholder="Nhập câu trả lời của bạn..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-white outline-none focus:border-[#98cbff]"
                  />
                ) : (
                  <p className="text-xs text-white/90 leading-relaxed italic sm:text-sm">
                    "{liveTranscript || 'Nhấn mic để bắt đầu trả lời bằng giọng nói.'}"
                  </p>
                )}
              </div>

              {/* Card Bottom Bar: VOICE READY & GỬI PHẢN HỒI Button */}
              <div className="flex items-center justify-between border-t border-[#98cbff]/10 pt-3">
                <span className="text-[10px] font-black tracking-wider text-[#98cbff]/70 uppercase">
                  VOICE READY
                </span>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitAnswer}
                  className="flex items-center gap-1.5 rounded-xl bg-[#00a3ff] px-4 py-1.5 text-xs font-black text-white shadow-md hover:bg-blue-500 active:scale-95 disabled:opacity-50"
                >
                  <span>GỬI PHẢN HỒI</span>
                  <span>⇲</span>
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-400">
              Nhấn vào mic để bắt đầu nói trực tiếp với trợ lý phỏng vấn AI.
            </p>
          </div>
        </div>

        {/* ── RIGHT CHAT DRAWER: Exact 1:1 Match with Mobile ── */}
        {isDrawerOpen && (
          <aside className="relative flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#050A1A]/95 p-4 shadow-2xl backdrop-blur-2xl sm:w-96">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Lịch Sử Trao Đổi</span>
                <span className="rounded-full bg-[#1a2235] px-2 py-0.5 text-[10px] font-bold text-[#98cbff]">
                  {messages.length} tin nhắn
                </span>
              </div>
            </div>

            {/* Chat Bubbles List */}
            <div className="flex-1 space-y-3.5 overflow-y-auto py-4 pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-3.5 text-xs leading-relaxed ${
                    m.role === 'ai'
                      ? 'border-[#98cbff]/15 bg-[#091224]/80 text-[#e2e2e2]'
                      : 'border-white/10 bg-[#121828]/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold">
                    <span className={m.role === 'ai' ? 'text-[#98cbff]' : 'text-slate-400'}>
                      {m.role === 'ai' ? 'INBLUE AI' : 'Thí sinh'}
                    </span>
                    <span className="text-slate-500">{m.timestamp}</span>
                  </div>
                  <p>{m.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            <div className="border-t border-white/10 pt-2 text-[10px] font-bold text-[#98cbff]/60 uppercase tracking-wider">
              ••• THÀNH LAM IS TYPING...
            </div>
          </aside>
        )}
      </div>

      {/* ── FOOTER BAR: Exact 1:1 Match with Mobile ── */}
      <footer className="relative z-20 flex h-10 shrink-0 items-center justify-between border-t border-[#98cbff]/10 bg-[#050A1A] px-8 text-[9px] font-bold tracking-widest text-[#94a3b8]/70 uppercase">
        <div>FPT UNIVERSITY • SOFTWARE ENGINEERING • SUMMER 2026</div>
        <div>POWERED BY INBLUE PLATFORM</div>
      </footer>
    </div>
  );
}
