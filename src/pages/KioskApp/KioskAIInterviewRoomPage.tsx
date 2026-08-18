import {
  generateTtsAudioApi,
  startInterviewApi,
  submitAnswerApi,
  type ChatMessage,
  type VoiceOption,
} from "@/services/kiosk/kioskApi.service";
import {
  startRealtimeTranscription,
  type RealtimeTranscriptionHandle,
} from "@/services/kiosk/realtimeTranscription";
import { playTtsAudioBlob, type TtsPlayback } from "@/services/kiosk/ttsAudio";
import { useCallback, useEffect, useRef, useState } from "react";

interface KioskAIInterviewRoomPageProps {
  sessionKey: string;
  durationMinutes?: number;
  selectedVoiceId?: string;
  voices?: VoiceOption[];
  onFinish: () => void;
}

type AIState = "IDLE" | "THINKING" | "SPEAKING" | "LISTENING";

const audioWaveRestingLevels = [
  0.55, 0.78, 1.05, 0.72, 1.25, 0.88, 1.42, 1.08, 1.62, 1.08, 1.42, 0.88, 1.25, 0.72, 1.05, 0.78,
  0.55,
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    role: "ai",
    content:
      "Chào Thành Lam, mình đã xem qua hồ sơ của bạn với GPA khá ấn tượng tại FPT University. Bạn có thể giới thiệu ngắn gọn về bản thân và chia sẻ lý do tại sao một người có kinh nghiệm làm .NET Intern như bạn lại muốn ứng tuyển vị trí Java Backend tại công ty mình không?",
    timestamp: "08:40 PM",
  },
  {
    id: 2,
    role: "user",
    content: "Hello Hello Hello Hello Hello",
    timestamp: "08:41 PM",
  },
  {
    id: 3,
    role: "ai",
    content:
      "Chào bạn, có vẻ như bạn đang rất hào hứng hoặc gặp chút trục trặc khi nhập liệu. Mình vẫn đang đợi phần giới thiệu ngắn gọn về bản thân cũng như lý do bạn muốn chuyển từ .NET sang Java Backend từ bạn nhé. Bạn cứ thoải mái chia sẻ, không cần quá áp lực đâu!",
    timestamp: "08:41 PM",
  },
  {
    id: 4,
    role: "user",
    content: "chịu the Gmail spa Space Space Space",
    timestamp: "08:42 PM",
  },
];

const INITIAL_QUESTION =
  "Chào bạn, có vẻ như bạn đang rất hào hứng hoặc gặp chút trục trặc khi nhập liệu. Mình vẫn đang đợi phần giới thiệu ngắn gọn về bản thân cũng như lý do bạn muốn chuyển từ .NET sang Java Backend từ bạn nhé. Bạn cứ thoải mái chia sẻ, không cần quá áp lực đâu!";

/* ───── Ultra-Clean Cyber Constellation Canvas Background ───── */
function CyberCanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const particleCount = 40;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.6 + 0.3,
    }));

    let t = 0;
    let animId: number;

    function render() {
      if (!canvas || !ctx) return;
      if (
        canvas.width !== (canvas.parentElement?.clientWidth || window.innerWidth) ||
        canvas.height !== (canvas.parentElement?.clientHeight || window.innerHeight)
      ) {
        width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
      }

      t += 0.008;

      ctx.fillStyle = "#050A1A";
      ctx.fillRect(0, 0, width, height);

      // Soft glowing ambient orbs
      const orb1X = width * (0.35 + 0.2 * Math.sin(t * 0.5));
      const orb1Y = height * (0.35 + 0.2 * Math.cos(t * 0.3));
      const g1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, width * 0.55);
      g1.addColorStop(0, "rgba(0, 163, 255, 0.2)");
      g1.addColorStop(1, "rgba(5, 10, 26, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const orb2X = width * (0.75 - 0.2 * Math.cos(t * 0.4));
      const orb2Y = height * (0.65 - 0.2 * Math.sin(t * 0.6));
      const g2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, width * 0.45);
      g2.addColorStop(0, "rgba(99, 102, 241, 0.16)");
      g2.addColorStop(1, "rgba(5, 10, 26, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      // Constellation lines
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(152, 203, 255, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(152, 203, 255, ${p.alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(5,10,26,0.3)" }} />
    </div>
  );
}

/* ───── LineIcon SVG Helper Matching Mobile 100% ───── */
function LineIcon({
  name,
  size = 18,
  color = "#98CBFF",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "clock":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 7v5l3 2" {...common} />
        </svg>
      );
    case "history":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M5 6.5h11.5a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3.5A2.5 2.5 0 0 1 2.5 15V9A2.5 2.5 0 0 1 5 6.5Z"
            {...common}
          />
          <path d="M7 10h8M7 13.5h5" {...common} />
        </svg>
      );
    case "hide":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M3 12s3.4-5 9-5 9 5 9 5-3.4 5-9 5-9-5-9-5Z" {...common} />
          <path d="m4 4 16 16" {...common} />
          <path d="M10.5 10.5a2.1 2.1 0 0 0 3 3" {...common} />
        </svg>
      );
    case "mic":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 3.5a3 3 0 0 0-3 3V12a3 3 0 0 0 6 0V6.5a3 3 0 0 0-3-3Z" {...common} />
          <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5V21M9 21h6" {...common} />
        </svg>
      );
    case "stop":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect x="7" y="7" width="10" height="10" rx="2" {...common} />
        </svg>
      );
    case "transcript":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="14" rx="2" {...common} />
          <path d="M8 9h8M8 12h8M8 15h5" {...common} />
        </svg>
      );
    case "edit":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" {...common} />
          <path d="m13.5 6.5 4 4" {...common} />
        </svg>
      );
    case "send":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M21 3 10 14" {...common} />
          <path d="m21 3-7 18-4-7-7-4 18-7Z" {...common} />
        </svg>
      );
    case "ai":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect x="6" y="8" width="12" height="9" rx="3" {...common} />
          <path d="M9 8V5.5M15 8V5.5M9.5 12h.01M14.5 12h.01M10 15h4" {...common} />
        </svg>
      );
    case "user":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.5" {...common} />
          <path d="M5 20a7 7 0 0 1 14 0" {...common} />
        </svg>
      );
    case "question":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M9.8 9.5a2.5 2.5 0 0 1 4.7 1.2c0 1.8-2.5 2.2-2.5 4" {...common} />
          <path d="M12 18h.01" {...common} />
        </svg>
      );
    case "bot":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24">
          <rect x="5" y="8" width="14" height="10" rx="4" {...common} />
          <path d="M12 8V4.5M8.5 4.5h7M8.5 13h.01M15.5 13h.01M10 16h4" {...common} />
          <path d="M5 12H3M21 12h-2" {...common} />
        </svg>
      );
    default:
      return null;
  }
}

export function KioskAIInterviewRoomPage({
  sessionKey,
  selectedVoiceId = "",
}: KioskAIInterviewRoomPageProps) {
  const [aiState, setAiState] = useState<AIState>("IDLE");
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [currentQuestionContent, setCurrentQuestionContent] = useState(INITIAL_QUESTION);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [totalQuestions] = useState(1);

  const [liveTranscript, setLiveTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isTranscriptEditing, setIsTranscriptEditing] = useState(false);

  // Audio wave levels
  const [waveLevels, setWaveLevels] = useState(audioWaveRestingLevels);
  const [clockStr, setClockStr] = useState("18:45:06");

  // Orb animation states
  const [orbPulse, setOrbPulse] = useState(1);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  // Real-time Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClockStr(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Central Orb Continuous Pulse Animation
  useEffect(() => {
    let animId: number;
    let t = 0;
    const pulseLoop = () => {
      t += 0.04;
      setOrbPulse(1 + Math.sin(t) * 0.08);
      animId = requestAnimationFrame(pulseLoop);
    };
    animId = requestAnimationFrame(pulseLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Microphone Volume Analyzer
  const startMicVolumeMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
        const energy = Math.min(1, avg / 80);

        setWaveLevels(
          audioWaveRestingLevels.map((base, idx) => {
            const mult = 0.4 + Math.sin(Date.now() / 150 + idx) * 0.3 + energy * 1.5;
            return Math.max(0.2, Math.min(2.2, base * mult));
          })
        );

        micAnimFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      const interval = setInterval(() => {
        setWaveLevels(audioWaveRestingLevels.map((base) => base * (0.5 + Math.random() * 0.9)));
      }, 150);
      return () => clearInterval(interval);
    }
  }, []);

  const stopMicVolumeMeter = useCallback(() => {
    if (micAnimFrameRef.current) {
      cancelAnimationFrame(micAnimFrameRef.current);
      micAnimFrameRef.current = null;
    }
    if (micAudioContextRef.current && micAudioContextRef.current.state !== "closed") {
      void micAudioContextRef.current.close();
      micAudioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    micAnalyserRef.current = null;
    setWaveLevels(audioWaveRestingLevels);
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
    setAiState("LISTENING");
    void startMicVolumeMeter();

    try {
      const handle = await startRealtimeTranscription(liveTranscript, {
        onTranscript: (text) => {
          setLiveTranscript(text);
        },
      });
      transcriptionHandleRef.current = handle;
    } catch {
      setLiveTranscript("Tôi đang chia sẻ câu trả lời của mình trực tiếp vào microphone...");
    }
  }, [isRecording, liveTranscript, startMicVolumeMeter, stopMicVolumeMeter]);

  // AI Speaks Question
  const speakQuestion = useCallback(
    async (text: string) => {
      setAiState("SPEAKING");
      try {
        const audioBlob = await generateTtsAudioApi(text, selectedVoiceId);
        const playback = await playTtsAudioBlob(audioBlob, {
          onVolume: (energy) => {
            setWaveLevels(
              audioWaveRestingLevels.map((base, idx) => {
                const mult = 0.5 + Math.sin(Date.now() / 120 + idx) * 0.3 + energy * 1.8;
                return Math.max(0.3, Math.min(2.4, base * mult));
              })
            );
          },
          onEnd: () => {
            setAiState("LISTENING");
            setWaveLevels(audioWaveRestingLevels);
          },
        });
        ttsPlaybackRef.current = playback;
      } catch {
        setTimeout(() => {
          setAiState("LISTENING");
        }, 2000);
      }
    },
    [selectedVoiceId]
  );

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (isSubmitting) return;
    const textToSend = liveTranscript.trim() || "Tôi đã hoàn thành phần trả lời của mình.";

    setIsSubmitting(true);
    setAiState("THINKING");
    setIsRecording(false);
    stopMicVolumeMeter();

    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: textToSend,
      timestamp: nowStr,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLiveTranscript("");

    try {
      const res = await submitAnswerApi(sessionKey, textToSend);
      setIsSubmitting(false);

      if (res.questionContent) {
        setCurrentQuestionContent(res.questionContent);
        setCurrentQuestionIndex((prev) => prev + 1);

        const aiMsg: ChatMessage = {
          id: Date.now() + 1,
          role: "ai",
          content: res.questionContent,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        void speakQuestion(res.questionContent);
      } else {
        setAiState("IDLE");
      }
    } catch {
      setIsSubmitting(false);
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      const nextQ = `Câu hỏi ${nextIdx}: Bạn có thể chia sẻ sâu hơn về một tình huống cụ thể mà bạn đã giải quyết khi làm việc nhóm không?`;
      setCurrentQuestionContent(nextQ);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          content: nextQ,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#050A1A",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        position: "relative",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}>
      <CyberCanvasBackground />

      {/* ── TOP HEADER (Exact 1:1 Mobile Match) ── */}
      <div
        style={{
          height: 64,
          flexShrink: 0,
          backgroundColor: "rgba(5, 10, 26, 0.72)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 40,
          paddingRight: 48,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          zIndex: 30,
          borderBottom: "1px solid rgba(152, 203, 255, 0.08)",
        }}>
        {/* Left: Brand + KIOSK MODE BADGE */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#98CBFF", fontSize: 34, fontWeight: 900, letterSpacing: 0 }}>
            INBLUE
          </span>
          <div
            style={{
              backgroundColor: "rgba(152, 203, 255, 0.1)",
              border: "1px solid rgba(152, 203, 255, 0.22)",
              borderRadius: 999,
              padding: "4px 12px",
            }}>
            <span style={{ color: "#98CBFF", fontSize: 11, fontWeight: 800, letterSpacing: 1.2 }}>
              AI KIOSK MODE
            </span>
          </div>
        </div>

        {/* Right Controls (Exact 1:1 Mobile Match) */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
          {/* Live Badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 999,
              padding: "5px 12px",
            }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" }} />
            <span style={{ color: "#10B981", fontSize: 11.5, fontWeight: 600 }}>System Online</span>
          </div>

          {/* Clock Box */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(26, 34, 53, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 999,
              padding: "5px 12px",
            }}>
            <LineIcon name="clock" size={15} />
            <span
              style={{
                color: "#E2E8F0",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "monospace, Menlo, Consolas",
              }}>
              {clockStr}
            </span>
          </div>

          {/* Toggle History Drawer Button */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(15, 23, 42, 0.58)",
              border: "1px solid rgba(152, 203, 255, 0.13)",
              borderRadius: 999,
              padding: "5px 12px",
              color: "#CBD5E1",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
            }}>
            <LineIcon name={isDrawerOpen ? "hide" : "history"} size={15} color="#CBD5E1" />
            <span>{isDrawerOpen ? "Ẩn lịch sử" : "Lịch sử trao đổi"}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE (Exact 1:1 Mobile Match) ── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          padding: "0 40px",
          gap: 22,
        }}>
        {/* Stage Area */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            padding: "8px 0",
            backgroundColor: "rgba(2, 8, 23, 0.1)",
          }}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              height: "100%",
              width: "100%",
              maxWidth: 700,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              paddingBottom: 6,
            }}>
            {/* Top Focus Stack: Current Question Card */}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 4,
              }}>
              {/* Question Glass Card with Speech Bubble Beak Tail */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 660,
                  backgroundColor: "rgba(26, 34, 53, 0.64)",
                  border: "1px solid rgba(0, 163, 255, 0.36)",
                  borderRadius: 10,
                  padding: "14px 26px 16px",
                  marginBottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  boxShadow: "0 6px 24px rgba(0, 163, 255, 0.16)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}>
                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    marginBottom: 8,
                    width: "100%",
                    position: "relative",
                  }}>
                  <div
                    style={{ width: 32, height: 1, backgroundColor: "rgba(0, 163, 255, 0.32)" }}
                  />
                  <div
                    style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <LineIcon name="question" size={14} color="#00A3FF" />
                    <span
                      style={{ color: "#00A3FF", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>
                      CÂU HỎI HIỆN TẠI
                    </span>
                  </div>
                  <div
                    style={{ width: 32, height: 1, backgroundColor: "rgba(0, 163, 255, 0.32)" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 0,
                      color: "#94A3B8",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1.4,
                    }}>
                    Q{String(currentQuestionIndex).padStart(2, "0")} /{" "}
                    {String(totalQuestions).padStart(2, "0")}
                  </span>
                </div>

                {/* Body Text */}
                <p
                  style={{
                    color: "#F1F5F9",
                    fontSize: 15.5,
                    lineHeight: "23px",
                    fontWeight: 600,
                    textAlign: "center",
                    margin: 0,
                  }}>
                  {currentQuestionContent}
                </p>

                {/* Speech Bubble Triangular Tail at bottom center */}
                <div
                  style={{
                    position: "absolute",
                    bottom: -7,
                    width: 14,
                    height: 14,
                    backgroundColor: "rgba(26, 34, 53, 0.64)",
                    borderRight: "1px solid rgba(0, 163, 255, 0.34)",
                    borderBottom: "1px solid rgba(0, 163, 255, 0.34)",
                    transform: "rotate(45deg)",
                  }}
                />
              </div>

              {/* Holographic Node & AI Orb */}
              <div
                style={{
                  position: "relative",
                  width: 250,
                  height: 250,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <div
                  style={{
                    position: "absolute",
                    width: 236,
                    height: 236,
                    borderRadius: 999,
                    border: "1px solid rgba(0, 163, 255, 0.16)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 206,
                    height: 206,
                    borderRadius: 999,
                    border: "1px solid rgba(152, 203, 255, 0.72)",
                    backgroundColor: "rgba(0, 163, 255, 0.08)",
                    boxShadow: "0 0 30px #98CBFF",
                    transform: `scale(${orbPulse * 1.06})`,
                    transition: "transform 0.1s ease-out",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    width: 182,
                    height: 182,
                    borderRadius: 999,
                    backgroundColor: "rgba(0, 163, 255, 0.18)",
                  }}
                />
                <div
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 999,
                    backgroundColor: "#0F172A",
                    border: "1.5px solid #98CBFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 30px #00A3FF",
                    transform: `scale(${orbPulse})`,
                    transition: "transform 0.1s ease-out",
                  }}>
                  <div
                    style={{
                      width: 108,
                      height: 108,
                      borderRadius: 999,
                      backgroundColor: "rgba(0, 163, 255, 0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <LineIcon name="bot" size={68} color="#98CBFF" />
                  </div>
                </div>
              </div>

              {/* Status Pill Badge below Orb */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 4,
                  padding: "4px 12px",
                  borderRadius: 999,
                  backgroundColor: "rgba(26, 34, 53, 0.6)",
                  border: "1px solid rgba(152, 203, 255, 0.2)",
                  backdropFilter: "blur(12px)",
                }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      aiState === "SPEAKING"
                        ? "#00A3FF"
                        : aiState === "LISTENING"
                          ? "#10B981"
                          : "#98CBFF",
                    boxShadow: `0 0 8px ${aiState === "SPEAKING" ? "#00A3FF" : aiState === "LISTENING" ? "#10B981" : "#98CBFF"}`,
                  }}
                />
                <span style={{ color: "#98CBFF", fontSize: 10.5, fontWeight: 700 }}>
                  {aiState === "SPEAKING"
                    ? "AI đang phát biểu..."
                    : aiState === "LISTENING"
                      ? "Đang lắng nghe..."
                      : aiState === "THINKING"
                        ? "AI đang phân tích..."
                        : "Sẵn sàng"}
                </span>
              </div>
            </div>

            {/* Bottom Voice Interaction Hub */}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 12px",
              }}>
              {/* Mic Button & 17-bar Audio Visualizer */}
              <div
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <button
                  type="button"
                  onClick={toggleRecording}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1.5px solid ${isRecording ? "rgba(239, 68, 68, 0.55)" : "rgba(0, 163, 255, 0.42)"}`,
                    backgroundColor: isRecording
                      ? "rgba(239, 68, 68, 0.18)"
                      : "rgba(0, 163, 255, 0.14)",
                    boxShadow: `0 0 26px ${isRecording ? "#EF4444" : "#00A3FF"}`,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}>
                  <LineIcon
                    name={isRecording ? "stop" : "mic"}
                    size={28}
                    color={isRecording ? "#EF4444" : "#98CBFF"}
                  />
                </button>

                <div
                  style={{
                    position: "relative",
                    width: 108,
                    height: 24,
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2.5,
                    marginBottom: 10,
                  }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "50%",
                      height: 1,
                      backgroundColor: "rgba(0, 163, 255, 0.28)",
                      boxShadow: "0 0 8px #00A3FF",
                    }}
                  />
                  {waveLevels.map((lvl, index) => (
                    <div
                      key={index}
                      style={{
                        width: index === 8 ? 3.5 : 2.5,
                        height: 12 * lvl,
                        borderRadius: 2,
                        backgroundColor: index === 8 ? "#98CBFF" : "#00A3FF",
                        opacity: index % 4 === 0 ? 0.58 : 1,
                        boxShadow: "0 0 8px #00A3FF",
                        transition: "height 0.08s ease",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Live Transcript HUD Card (Exact 1:1 Mobile Match) */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minHeight: 110,
                  maxHeight: 140,
                  backgroundColor: "rgba(5, 10, 26, 0.68)",
                  border: "1px solid rgba(0, 163, 255, 0.22)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginTop: 6,
                  position: "relative",
                  boxShadow: "0 0 22px rgba(0, 0, 0, 0.38)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}>
                {/* HUD Tech Corner Decorations */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 16,
                    height: 16,
                    borderTop: "1px solid #00A3FF",
                    borderLeft: "1px solid #00A3FF",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    width: 16,
                    height: 16,
                    borderRight: "1px solid #00A3FF",
                    borderBottom: "1px solid #00A3FF",
                  }}
                />

                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid rgba(0, 163, 255, 0.16)",
                    paddingBottom: 4,
                    marginBottom: 4,
                  }}>
                  <div
                    style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <LineIcon name="transcript" size={13} color="#00A3FF" />
                    <span
                      style={{
                        color: "#00A3FF",
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: 1.6,
                      }}>
                      BẢN DỊCH TRỰC TIẾP
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTranscriptEditing(!isTranscriptEditing)}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 5px",
                      background: "none",
                      border: "none",
                      color: "#9CAFC5",
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: 1,
                      cursor: "pointer",
                    }}>
                    <span>{isTranscriptEditing ? "XONG" : "CHỈNH SỬA"}</span>
                    <LineIcon name="edit" size={12} color="#9CAFC5" />
                  </button>
                </div>

                {/* Subtitle Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 28,
                    maxHeight: 46,
                    display: "flex",
                    alignItems: "flex-start",
                  }}>
                  {isTranscriptEditing ? (
                    <input
                      type="text"
                      value={liveTranscript}
                      onChange={(e) => setLiveTranscript(e.target.value)}
                      placeholder="Nhập hoặc chỉnh sửa câu trả lời..."
                      style={{
                        width: "100%",
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#E2E8F0",
                        fontSize: 13,
                        lineHeight: "18px",
                        outline: "none",
                        padding: 0,
                        margin: 0,
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: "#E2E8F0",
                        fontSize: 13,
                        lineHeight: "18px",
                        fontStyle: "italic",
                      }}>
                      "
                      {liveTranscript ||
                        (isRecording
                          ? "Đang lắng nghe câu trả lời của bạn..."
                          : "Nhấn mic để bắt đầu trả lời bằng giọng nói.")}
                      "
                    </span>
                  )}
                </div>

                {/* Footer Bar inside HUD */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 4,
                  }}>
                  <span
                    style={{
                      color: "rgba(148, 163, 184, 0.62)",
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: 1.6,
                    }}>
                    {isRecording ? "LISTENING..." : "VOICE READY"}
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitAnswer}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: "rgba(0, 163, 255, 0.13)",
                      border: "1px solid rgba(0, 163, 255, 0.34)",
                      borderRadius: 6,
                      padding: "4px 12px",
                      cursor: "pointer",
                      opacity: isSubmitting ? 0.45 : 1,
                    }}>
                    <span
                      style={{
                        color: "#98CBFF",
                        fontSize: 10.5,
                        fontWeight: 900,
                        letterSpacing: 1,
                      }}>
                      GỬI PHẢN HỒI
                    </span>
                    <LineIcon name="send" size={12} color="#98CBFF" />
                  </button>
                </div>
              </div>

              {/* Subtitle Hint */}
              <p
                style={{
                  color: "#94A3B8",
                  fontSize: 9.5,
                  fontWeight: 500,
                  textAlign: "center",
                  marginTop: 4,
                  marginBottom: 0,
                }}>
                Nhấn vào mic để bắt đầu nói trực tiếp với Trợ lý phỏng vấn AI.
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT CHAT DRAWER (Exact 1:1 Mobile Match) ── */}
        {isDrawerOpen && (
          <div
            style={{
              width: 318,
              flexShrink: 0,
              height: "100%",
              minHeight: 0,
              alignSelf: "stretch",
              backgroundColor: "#07101F",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              paddingTop: 8,
              paddingBottom: 8,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}>
            {/* Header */}
            <div
              style={{
                paddingBottom: 10,
                borderBottom: "1px solid rgba(152, 203, 255, 0.12)",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 7 }}>
                <LineIcon name="history" size={17} />
                <span
                  style={{ color: "#F1F5F9", fontSize: 13.5, fontWeight: 800, letterSpacing: 0.6 }}>
                  Lịch Sử Trao Đổi
                </span>
              </div>
              <span
                style={{
                  color: "#98CBFF",
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: 1,
                  backgroundColor: "rgba(0, 163, 255, 0.14)",
                  border: "1px solid rgba(0, 163, 255, 0.22)",
                  borderRadius: 999,
                  padding: "3px 8px",
                }}>
                {messages.length} tin nhắn
              </span>
            </div>

            {/* Chat List */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingTop: 10,
                paddingBottom: 10,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
              {messages.map((msg, index) => {
                const isAi = msg.role === "ai";
                return (
                  <div
                    key={msg.id || index}
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: isAi ? "flex-start" : "flex-end",
                    }}>
                    <div
                      style={{
                        maxWidth: "94%",
                        borderRadius: 7,
                        padding: 10,
                        backgroundColor: isAi ? "rgba(20, 39, 67, 0.58)" : "rgba(30, 41, 59, 0.78)",
                        border: `1px solid ${isAi ? "rgba(0, 163, 255, 0.16)" : "rgba(255, 255, 255, 0.06)"}`,
                      }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: isAi ? "flex-start" : "flex-end",
                          gap: 6,
                          marginBottom: 4,
                        }}>
                        <LineIcon
                          name={isAi ? "ai" : "user"}
                          size={12}
                          color={isAi ? "#98CBFF" : "#CBD5E1"}
                        />
                        <span
                          style={{
                            color: isAi ? "#98CBFF" : "#CBD5E1",
                            fontSize: 9.5,
                            fontWeight: 900,
                            letterSpacing: 0.8,
                          }}>
                          {isAi ? "INBLUE AI" : "Thí sinh"}
                        </span>
                      </div>
                      <p
                        style={{
                          color: "#FFFFFF",
                          fontSize: 11.5,
                          lineHeight: "17px",
                          marginBottom: 4,
                          margin: 0,
                        }}>
                        {msg.content}
                      </p>
                      <span
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: 9.5,
                          display: "block",
                          textAlign: "right",
                          marginTop: 2,
                        }}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 8,
                paddingBottom: 4,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}>
              <span
                style={{
                  color: "#00A3FF",
                  fontSize: 14,
                  letterSpacing: 2,
                  fontWeight: 900,
                  lineHeight: 1,
                }}>
                •••
              </span>
              <span
                style={{
                  color: "#98CBFF",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 1.4,
                  fontFamily: "monospace, Menlo, Consolas, sans-serif",
                }}>
                THANH LAN IS TYPING...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER BAR (Exact 1:1 Mobile Match) ── */}
      <div
        style={{
          height: 40,
          flexShrink: 0,
          borderTop: "1px solid rgba(152, 203, 255, 0.08)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          backgroundColor: "rgba(5, 10, 26, 0.75)",
          zIndex: 30,
        }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
          <span
            style={{
              color: "rgba(148, 163, 184, 0.7)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 2,
            }}>
            FPT UNIVERSITY
          </span>
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: "rgba(148, 163, 184, 0.38)",
            }}
          />
          <span
            style={{
              color: "rgba(148, 163, 184, 0.7)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 2,
            }}>
            SOFTWARE ENGINEERING
          </span>
          <div
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: "rgba(148, 163, 184, 0.38)",
            }}
          />
          <span
            style={{
              color: "rgba(148, 163, 184, 0.7)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 2,
            }}>
            SUMMER 2026
          </span>
        </div>
        <span
          style={{
            color: "rgba(148, 163, 184, 0.7)",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 2,
          }}>
          POWERED BY INBLUE PLATFORM
        </span>
      </div>
    </div>
  );
}
