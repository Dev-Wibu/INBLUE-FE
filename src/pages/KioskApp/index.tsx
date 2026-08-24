import {
  enterKioskApi,
  generateTtsAudioApi,
  getAvailableVoicesApi,
  resolveApiAssetUrl,
  type Kiosk,
  type VoiceOption,
} from "@/services/kiosk/kioskApi.service";
import {
  playAudioUri,
  type AudioPlayerHandle,
} from "@/services/kiosk/kioskAudioPlayer";
import {
  playTtsAudioBlob,
  type TtsPlayback,
} from "@/services/kiosk/ttsAudio";
import { useCallback, useEffect, useRef, useState } from "react";
import { KioskHardwareCheckModal } from "./components/KioskHardwareCheckModal";
import { KioskSettingsModal } from "./components/KioskSettingsModal";
import { KioskAIInterviewRoomPage } from "./KioskAIInterviewRoomPage";

const PIN_LENGTH = 6;
const WEB_KIOSK_STORAGE_KEY = "inblue.currentKiosk";

const KIOSK_INIT_STATES = [
  {
    title: "Preparing interview room",
    detail: "Đang chuẩn bị không gian phỏng vấn AI cho phiên làm việc của bạn.",
  },
  {
    title: "Syncing candidate session",
    detail: "Đồng bộ lịch hẹn, mã kiosk và cấu hình phỏng vấn cá nhân.",
  },
  {
    title: "Configuring voice channel",
    detail: "Thiết lập kênh âm thanh để AI có thể trao đổi trực tiếp.",
  },
  {
    title: "Finalizing AI workspace",
    detail: "Hoàn tất môi trường riêng tư trước khi bắt đầu buổi phỏng vấn.",
  },
];

type AppScreenState = "PIN_ENTRY" | "VOICE_SELECT" | "AI_ROOM";

const C = {
  bg: "#050A1A",
  surface: "#121414",
  primary: "#98cbff",
  primaryDeep: "#00a3ff",
  onSurface: "#e2e2e2",
  onSurfaceVariant: "#bec7d4",
  white10: "rgba(255,255,255,0.1)",
  white03: "rgba(255,255,255,0.03)",
  glassBg: "rgba(26,34,53,0.4)",
  slotBg: "rgba(26,34,53,0.6)",
  slotBorder: "rgba(152,203,255,0.2)",
  slotActiveBorder: "#98cbff",
  slotActiveGlow: "rgba(152,203,255,0.4)",
  slotFilledBg: "#98cbff",
  slotFilledGlow: "rgba(152,203,255,0.6)",
  keyBg: "rgba(26,34,53,0.4)",
  keyPressBg: "rgba(152,203,255,0.2)",
};

/* ───── Ultra-Clean Cyber Constellation Canvas Background (Exact 1:1 Mobile) ───── */
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

/* ───── Lock Open Icon Component (Exact 1:1 Mobile) ───── */
function LockOpenIcon() {
  return (
    <div style={{ marginBottom: 16 }}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#98cbff"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
      </svg>
    </div>
  );
}

/* ───── Robot Line Icon Component ───── */
function RobotLineIcon({ size = 38, color = "#98cbff" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <rect x="5" y="8" width="14" height="10" rx="4" />
      <path d="M12 8V4.5" />
      <path d="M8.5 4.5h7" />
      <path d="M8.5 13h.01" />
      <path d="M15.5 13h.01" />
      <path d="M10 16h4" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
    </svg>
  );
}

/* ───── Real-Time Clock Widget (Right Panel - Exact 1:1 Mobile) ───── */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: C.glassBg,
        border: `1px solid ${C.white10}`,
        borderRadius: 16,
        padding: "10px 20px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#98cbff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span
        style={{
          color: C.onSurface,
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "monospace, Menlo, Consolas",
          letterSpacing: 1.5,
        }}>
        {h}:{m}
      </span>
    </div>
  );
}

/* ───── Real-Time Date Text (Left Panel Top Right) ───── */
function RealTimeDateWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();

  return (
    <span
      style={{
        color: "#98cbff",
        fontSize: 28,
        fontWeight: 800,
        fontFamily: "monospace, Menlo, Consolas",
        letterSpacing: 2,
      }}>
      {dd}-{mm}-{yyyy}
    </span>
  );
}

export function StandaloneKioskPage() {
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isDesktop = windowWidth >= 1200;
  const isWide = windowWidth >= 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1200;

  const [screenState, setScreenState] = useState<AppScreenState>("PIN_ENTRY");
  const [pin, setPin] = useState("");
  const [aiSessionKey, setAiSessionKey] = useState("");
  const [interviewDurationMinutes, setInterviewDurationMinutes] = useState(15);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewTtsRef = useRef<TtsPlayback | null>(null);
  const previewPlayerRef = useRef<AudioPlayerHandle | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [isKioskSettingsOpen, setIsKioskSettingsOpen] = useState(false);

  // Cold Start Animation state
  const [initStepIndex, setInitStepIndex] = useState(0);
  const [initSpinDeg, setInitSpinDeg] = useState(0);

  // Equalizer Signal levels for voice preview
  const [waveLevels, setWaveLevels] = useState([0.3, 0.55, 0.82, 0.55, 0.3]);
  const previewAnimFrameRef = useRef<number | null>(null);

  // Load saved kiosk config
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WEB_KIOSK_STORAGE_KEY);
      if (saved) {
        setSelectedKiosk(JSON.parse(saved));
      }
    } catch (error) {
      console.warn("Unable to load saved kiosk config:", error);
    }
  }, []);

  // Cold Start Animation loop when verifying
  useEffect(() => {
    if (!isVerifying) return;
    const stepTimer = setInterval(() => {
      setInitStepIndex((prev) => (prev + 1) % KIOSK_INIT_STATES.length);
    }, 2850);

    let animId: number;
    let deg = 0;
    const spinLoop = () => {
      deg = (deg + 2.5) % 360;
      setInitSpinDeg(deg);
      animId = requestAnimationFrame(spinLoop);
    };
    animId = requestAnimationFrame(spinLoop);

    return () => {
      clearInterval(stepTimer);
      cancelAnimationFrame(animId);
    };
  }, [isVerifying]);

  const loadVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    setVoiceError(null);
    try {
      const voiceList = await getAvailableVoicesApi();
      if (voiceList && voiceList.length > 0) {
        setVoices(voiceList);
      } else {
        setVoices([]);
        setVoiceError("Không tìm thấy giọng đọc AI nào trên hệ thống.");
      }
    } catch (err: unknown) {
      setVoices([]);
      setVoiceError((err as Error)?.message || "Không thể tải danh sách giọng đọc AI.");
    } finally {
      setIsLoadingVoices(false);
    }
  }, []);

  // Submit PIN Handler (Real Production Flow)
  const handlePinSubmit = useCallback(
    async (targetPin: string) => {
      setIsVerifying(true);
      setAuthError(null);

      try {
        if (!selectedKiosk?.id) {
          throw new Error("Kiosk chưa được cấu hình thiết bị. Vui lòng bấm biểu tượng bánh răng ở góc dưới để cấu hình Kiosk.");
        }

        const res = await enterKioskApi(targetPin, selectedKiosk.id);
        setAiSessionKey(res.aiSessionKey || targetPin);
        setInterviewDurationMinutes(Number(res.durationMinutes) || 15);

        setTimeout(() => {
          setIsVerifying(false);
          setScreenState("VOICE_SELECT");
          void loadVoices();
        }, 1200);
      } catch (err: unknown) {
        setIsVerifying(false);
        setPin("");
        setAuthError((err as Error)?.message || "Mã PIN không hợp lệ hoặc Kiosk chưa được cấu hình.");
      }
    },
    [loadVoices, selectedKiosk]
  );

  const pressKey = useCallback(
    (val: string) => {
      if (isVerifying || screenState !== "PIN_ENTRY") return;
      setAuthError(null);

      if (val === "AC") {
        setPin("");
        return;
      }
      if (val === "DEL") {
        setPin((prev) => prev.slice(0, -1));
        return;
      }
      if (pin.length < PIN_LENGTH) {
        const next = pin + val;
        setPin(next);
        if (next.length === PIN_LENGTH) {
          void handlePinSubmit(next);
        }
      }
    },
    [handlePinSubmit, isVerifying, pin, screenState]
  );

  // Keyboard shortcut listener for hardware numpad
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screenState !== "PIN_ENTRY" || isVerifying) return;
      if (e.key >= "0" && e.key <= "9") {
        pressKey(e.key);
      } else if (e.key === "Backspace") {
        pressKey("DEL");
      } else if (e.key === "Escape") {
        pressKey("AC");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVerifying, pressKey, screenState]);

  const resetPreviewWave = useCallback(() => {
    if (previewAnimFrameRef.current !== null) {
      cancelAnimationFrame(previewAnimFrameRef.current);
      previewAnimFrameRef.current = null;
    }
    setWaveLevels([0.3, 0.55, 0.82, 0.55, 0.3]);
  }, []);

  const handlePreviewVoice = useCallback(
    async (voice: VoiceOption) => {
      setSelectedVoiceId(voice.id);
      if (previewingVoiceId === voice.id) {
        if (previewTtsRef.current) {
          previewTtsRef.current.stop();
          previewTtsRef.current = null;
        }
        if (previewPlayerRef.current) {
          previewPlayerRef.current.stop();
          previewPlayerRef.current = null;
        }
        setPreviewingVoiceId(null);
        resetPreviewWave();
        return;
      }

      if (previewTtsRef.current) {
        previewTtsRef.current.stop();
        previewTtsRef.current = null;
      }
      if (previewPlayerRef.current) {
        previewPlayerRef.current.stop();
        previewPlayerRef.current = null;
      }

      setPreviewingVoiceId(voice.id);
      resetPreviewWave();

      if (voice.previewUrl) {
        const audioUrl = resolveApiAssetUrl(voice.previewUrl);
        try {
          const handle = await playAudioUri(audioUrl, {
            onVolume: (volume: number) => {
              setWaveLevels([
                Math.max(0.2, volume * 0.9),
                Math.max(0.3, volume * 1.3),
                Math.max(0.4, volume * 1.6),
                Math.max(0.3, volume * 1.3),
                Math.max(0.2, volume * 0.9),
              ]);
            },
            onEnd: () => {
              previewPlayerRef.current = null;
              setPreviewingVoiceId(null);
              resetPreviewWave();
            },
            onError: () => {
              previewPlayerRef.current = null;
              setPreviewingVoiceId(null);
              resetPreviewWave();
            },
          });
          previewPlayerRef.current = handle;
          return;
        } catch {
          // Fallback to TTS below
        }
      }

      try {
        const sampleText = `Xin chào, tôi là ${voice.name.split('(')[0].trim()}, giọng đọc AI sẵn sàng đồng hành cùng bạn.`;
        const blob = await generateTtsAudioApi(sampleText, voice.id);
        const tts = await playTtsAudioBlob(blob, {
          onVolume: (volume: number) => {
            setWaveLevels([
              Math.max(0.2, volume * 0.9),
              Math.max(0.3, volume * 1.3),
              Math.max(0.4, volume * 1.6),
              Math.max(0.3, volume * 1.3),
              Math.max(0.2, volume * 0.9),
            ]);
          },
          onEnd: () => {
            previewTtsRef.current = null;
            setPreviewingVoiceId(null);
            resetPreviewWave();
          },
          onError: () => {
            previewTtsRef.current = null;
            setPreviewingVoiceId(null);
            resetPreviewWave();
          },
        });
        previewTtsRef.current = tts;
      } catch (e) {
        console.warn("Play voice preview failed:", e);
        setPreviewingVoiceId(null);
        resetPreviewWave();
      }
    },
    [previewingVoiceId, resetPreviewWave]
  );

  const handleFinishAIRoom = () => {
    setPin("");
    setAiSessionKey("");
    setInterviewDurationMinutes(0);
    setSelectedVoiceId("");
    setVoices([]);
    setAuthError(null);
    setVoiceError(null);
    setScreenState("PIN_ENTRY");
  };

  const activeInitState = KIOSK_INIT_STATES[initStepIndex % KIOSK_INIT_STATES.length];

  // Full Screen AI Room
  if (screenState === "AI_ROOM") {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "relative",
          backgroundColor: "#050A1A",
          overflow: "hidden",
        }}>
        <KioskAIInterviewRoomPage
          sessionKey={aiSessionKey}
          durationMinutes={interviewDurationMinutes || 15}
          selectedVoiceId={selectedVoiceId}
          voices={voices}
          onFinish={handleFinishAIRoom}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: C.bg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        position: "relative",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}>

      {/* ── Main Split Layout ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          position: "relative",
        }}>
        {/* ── LEFT PANEL (Exact 1:1 Mobile Match) ── */}
        <div
          style={{
            flex: isDesktop ? 0.44 : isTablet ? 0.36 : 1,
            minHeight: isWide ? undefined : 180,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: isDesktop ? 56 : isTablet ? 32 : 24,
            position: "relative",
            overflow: "hidden",
          }}>
          <CyberCanvasBackground />

          {/* Real-time Date Widget at Top Right of Left Panel */}
          {isWide && (
            <div
              style={{
                position: "absolute",
                top: isDesktop ? 56 : 24,
                right: isDesktop ? 48 : 20,
                zIndex: 10,
              }}>
              <RealTimeDateWidget />
            </div>
          )}

          {/* Header Title Group */}
          <div
            style={{
              zIndex: 1,
              alignSelf: "flex-start",
              marginTop: "auto",
              marginBottom: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}>
            <div
              style={{
                color: C.primary,
                fontSize: isDesktop ? 76 : isTablet ? 48 : 36,
                fontWeight: 900,
                letterSpacing: -1.5,
                marginBottom: isTablet ? 8 : 12,
              }}>
              INBLUE
            </div>
            <div
              style={{
                color: C.onSurface,
                fontSize: isDesktop ? 44 : isTablet ? 30 : 24,
                fontWeight: 800,
                lineHeight: isDesktop ? "52px" : isTablet ? "38px" : "30px",
                marginBottom: isTablet ? 14 : 20,
                whiteSpace: "pre-line",
              }}>
              {`Phỏng Vấn\nAI Tại Kiosk`}
            </div>

            {/* System Online Badge (Hugging its content, no stretch) */}
            <div
              style={{
                display: "inline-flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                alignSelf: "flex-start",
                backgroundColor: "rgba(26,28,28,0.4)",
                border: `1px solid ${C.white10}`,
                borderRadius: 999,
                padding: isTablet ? "6px 14px" : "8px 18px",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: C.primary,
                  boxShadow: `0 0 8px ${C.primary}`,
                }}
              />
              <span
                style={{
                  color: C.primary,
                  fontSize: isTablet ? 12 : 14,
                  fontWeight: 600,
                  letterSpacing: 0.7,
                }}>
                System Online
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (Exact 1:1 Mobile Match) ── */}
        <div
          style={{
            flex: isDesktop ? 0.56 : isTablet ? 0.64 : 1,
            backgroundColor: C.bg,
            borderLeft: isWide ? `1px solid ${C.white10}` : "none",
            borderTop: isWide ? "none" : `1px solid ${C.white10}`,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
          {/* Subtle Grid Decoration */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              opacity: 0.5,
              backgroundImage: `linear-gradient(${C.white03} 1px, transparent 1px), linear-gradient(90deg, ${C.white03} 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Top Control Row (Exact 1:1 Mobile Match - Clock & Settings Gear Button) */}
          {screenState !== "VOICE_SELECT" && (
            <div
              style={{
                position: "absolute",
                top: isDesktop ? 48 : isTablet ? 20 : 14,
                right: isDesktop ? 48 : isTablet ? 20 : 14,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                zIndex: 10,
              }}>
              <Clock />
              {screenState === "PIN_ENTRY" && !isVerifying && (
                <button
                  type="button"
                  onClick={() => setIsKioskSettingsOpen(true)}
                  title="Cài đặt Kiosk"
                  style={{
                    width: isDesktop ? 44 : 38,
                    height: isDesktop ? 44 : 38,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(26, 34, 53, 0.52)",
                    border: "1px solid rgba(152, 203, 255, 0.2)",
                    cursor: "pointer",
                    color: C.primary,
                    padding: 0,
                    boxShadow: "0 0 18px rgba(0, 163, 255, 0.24)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    transition: "all 0.15s ease",
                  }}>
                  <svg
                    width={isDesktop ? 20 : 18}
                    height={isDesktop ? 20 : 18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={C.primary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Center Interaction Workspace */}
          <div
            style={{
              flex: 1,
              width: "100%",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: `${isDesktop ? 48 : isTablet ? 24 : 20}px ${isDesktop ? 36 : isTablet ? 20 : 16}px ${isDesktop ? 32 : isTablet ? 20 : 16}px`,
            }}>
            {screenState === "VOICE_SELECT" ? (
              /* ── VOICE_SELECT BOX (Exact 1:1 Mobile Match) ── */
              <div
                style={{
                  width: "100%",
                  maxWidth: isDesktop ? 760 : isTablet ? 640 : 430,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  backgroundColor: "rgba(5, 10, 26, 0.46)",
                  border: "1px solid rgba(152, 203, 255, 0.16)",
                  borderRadius: 20,
                  padding: `${isDesktop ? 22 : 16}px ${isDesktop ? 28 : 18}px`,
                  boxShadow: "0 0 34px rgba(0, 163, 255, 0.18)",
                  backdropFilter: "blur(24px)",
                  WebkitBackdropFilter: "blur(24px)",
                }}>
                <span
                  style={{
                    color: C.primaryDeep,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 2.2,
                    marginBottom: 6,
                  }}>
                  AI VOICE PROFILE
                </span>
                <h3
                  style={{
                    color: C.primary,
                    fontSize: isDesktop ? 26 : isTablet ? 21 : 18,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    marginBottom: 6,
                    textAlign: "center",
                  }}>
                  Chọn giọng nói phỏng vấn
                </h3>
                <p
                  style={{
                    color: C.onSurfaceVariant,
                    fontSize: isDesktop ? 13 : isTablet ? 12 : 11,
                    lineHeight: isDesktop ? "19px" : "17px",
                    textAlign: "center",
                    maxWidth: isDesktop ? 520 : 460,
                    marginBottom: 16,
                  }}>
                  Hãy chọn chất giọng bạn muốn nghe trong suốt buổi phỏng vấn. Bạn vẫn có thể đổi
                  lại khi đang phỏng vấn.
                </p>

                {isLoadingVoices ? (
                  <div
                    style={{ color: C.primary, fontSize: 14, fontWeight: 600, margin: "24px 0" }}>
                    Đang tải danh sách giọng đọc AI...
                  </div>
                ) : voiceError ? (
                  <div style={{ width: "100%", textAlign: "center", padding: "12px 0" }}>
                    <div
                      style={{ color: "#EF4444", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                      {voiceError}
                    </div>
                    <button
                      type="button"
                      onClick={loadVoices}
                      style={{
                        border: "1px solid rgba(0, 163, 255, 0.34)",
                        borderRadius: 999,
                        padding: "9px 16px",
                        backgroundColor: "rgba(0, 163, 255, 0.12)",
                        color: C.primary,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}>
                      Tải lại danh sách
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: isDesktop ? 12 : 8,
                      marginBottom: 18,
                    }}>
                    {voices.map((voice: VoiceOption, index: number) => {
                      const selected = selectedVoiceId === voice.id;
                      const previewing = previewingVoiceId === voice.id;
                      const voiceCode = `V${String(index + 1).padStart(2, "0")}`;

                      return (
                        <div
                          key={voice.id}
                          onClick={() => handlePreviewVoice(voice)}
                          style={{
                            width: isWide ? "48.5%" : "100%",
                            minHeight: isDesktop ? 148 : isTablet ? 126 : 120,
                            borderRadius: 16,
                            border: `1px solid ${selected ? "rgba(0, 163, 255, 0.76)" : "rgba(152, 203, 255, 0.16)"}`,
                            backgroundColor: selected
                              ? "rgba(0, 163, 255, 0.14)"
                              : "rgba(9, 18, 36, 0.72)",
                            padding: isDesktop ? 14 : 11,
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: selected ? "0 0 22px rgba(0, 163, 255, 0.28)" : "none",
                            transition: "all 0.15s ease",
                          }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}>
                            <span
                              style={{
                                color: "rgba(152, 203, 255, 0.62)",
                                fontSize: 9,
                                fontWeight: 900,
                                letterSpacing: 1.4,
                              }}>
                              {voiceCode}
                            </span>
                            {selected && (
                              <span
                                style={{
                                  color: C.primary,
                                  fontSize: 8.5,
                                  fontWeight: 900,
                                  letterSpacing: 1,
                                  border: "1px solid rgba(152, 203, 255, 0.34)",
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                  backgroundColor: "rgba(152, 203, 255, 0.1)",
                                }}>
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                              marginBottom: 6,
                            }}>
                            <div
                              style={{
                                width: isDesktop ? 42 : 36,
                                height: isDesktop ? 42 : 36,
                                borderRadius: 999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: `1px solid ${selected ? C.primary : "rgba(152, 203, 255, 0.18)"}`,
                                backgroundColor: selected
                                  ? "rgba(152, 203, 255, 0.2)"
                                  : "rgba(0, 163, 255, 0.1)",
                                color: C.primary,
                                fontSize: isDesktop ? 16 : 14,
                                fontWeight: 900,
                              }}>
                              {voice.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  color: C.onSurface,
                                  fontSize: isDesktop ? 14 : 12.5,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>
                                {voice.name}
                              </div>
                              <div
                                style={{
                                  color: "rgba(152, 203, 255, 0.72)",
                                  fontSize: 9,
                                  fontWeight: 800,
                                  letterSpacing: 1,
                                  textTransform: "uppercase",
                                }}>
                                {selected ? "Đang chọn" : "Có thể chọn"}
                              </div>
                            </div>
                          </div>

                          <p
                            style={{
                              color: C.onSurfaceVariant,
                              fontSize: isDesktop ? 11.5 : 10.5,
                              lineHeight: isDesktop ? "16px" : "14.5px",
                              marginBottom: 6,
                            }}>
                            {voice.description}
                          </p>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginTop: "auto",
                            }}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                height: 20,
                                gap: 3,
                                opacity: selected || previewing ? 1 : 0.48,
                              }}>
                              {waveLevels.map((lvl, bi) => (
                                <div
                                  key={bi}
                                  style={{
                                    width: 3,
                                    height: 12 * (previewing ? lvl : 1),
                                    borderRadius: 2,
                                    backgroundColor: bi % 2 === 0 ? C.primaryDeep : C.primary,
                                    transition: "height 0.08s ease",
                                  }}
                                />
                              ))}
                            </div>
                            <span
                              style={{
                                color: previewing ? C.primary : "rgba(152, 203, 255, 0.62)",
                                fontSize: 9,
                                fontWeight: 800,
                                letterSpacing: 0.8,
                                textTransform: "uppercase",
                              }}>
                              {previewing ? "Đang phát mẫu giọng" : "Chạm để chọn"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}>
                  <button
                    type="button"
                    onClick={handleFinishAIRoom}
                    style={{
                      borderRadius: 999,
                      padding: `${isDesktop ? 11 : 9}px ${isDesktop ? 18 : 14}px`,
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      backgroundColor: "rgba(15, 23, 42, 0.45)",
                      color: C.onSurfaceVariant,
                      fontSize: isDesktop ? 13 : 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}>
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsHardwareModalOpen(true)}
                    disabled={!selectedVoiceId || isLoadingVoices}
                    style={{
                      flex: 1,
                      borderRadius: 999,
                      padding: `${isDesktop ? 12 : 10}px ${isDesktop ? 20 : 16}px`,
                      backgroundColor: C.primaryDeep,
                      color: "#FFFFFF",
                      fontSize: isDesktop ? 13 : 12,
                      fontWeight: 900,
                      letterSpacing: 0.6,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 0 18px rgba(0, 163, 255, 0.38)",
                      opacity: !selectedVoiceId || isLoadingVoices ? 0.42 : 1,
                    }}>
                    Bắt đầu phỏng vấn
                  </button>
                </div>
              </div>
            ) : (
              /* ── PIN_ENTRY CENTER BOX (Exact 1:1 Mobile Match) ── */
              <div
                style={{
                  width: "100%",
                  maxWidth: 480,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}>
                {!isVerifying && <LockOpenIcon />}

                {isVerifying ? (
                  /* Cold Start Animation View */
                  <div
                    style={{
                      width: "100%",
                      maxWidth: isDesktop ? 520 : isTablet ? 440 : 350,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      borderRadius: 34,
                      backgroundColor: "rgba(5, 10, 26, 0.2)",
                      padding: `${isDesktop ? 38 : 26}px ${isDesktop ? 42 : 24}px`,
                      boxShadow: "0 0 46px rgba(0, 163, 255, 0.18)",
                      backdropFilter: "blur(18px)",
                      WebkitBackdropFilter: "blur(18px)",
                    }}>
                    <div
                      style={{
                        width: 128,
                        height: 128,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 26,
                      }}>
                      <div
                        style={{
                          position: "absolute",
                          width: 104,
                          height: 104,
                          borderRadius: 999,
                          border: "12px solid rgba(0, 163, 255, 0.08)",
                          backgroundColor: "rgba(152, 203, 255, 0.04)",
                          transform: "scale(1.04)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          width: 116,
                          height: 116,
                          borderRadius: 999,
                          border: "2px solid rgba(152, 203, 255, 0.08)",
                          borderTopColor: C.primaryDeep,
                          borderRightColor: "rgba(152, 203, 255, 0.34)",
                          transform: `rotate(${initSpinDeg}deg)`,
                        }}
                      />
                      <div
                        style={{
                          width: 82,
                          height: 82,
                          borderRadius: 999,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(152, 203, 255, 0.28)",
                          backgroundColor: "rgba(8, 20, 40, 0.78)",
                          boxShadow: "0 0 32px rgba(0, 163, 255, 0.24)",
                        }}>
                        <RobotLineIcon size={40} color="#98CBFF" />
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 18,
                      }}>
                      <div
                        style={{ width: 70, height: 1, backgroundColor: "rgba(0, 163, 255, 0.26)" }}
                      />
                      <span
                        style={{
                          color: "rgba(152, 203, 255, 0.66)",
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 2.4,
                        }}>
                        COLD START
                      </span>
                      <div
                        style={{ width: 70, height: 1, backgroundColor: "rgba(0, 163, 255, 0.26)" }}
                      />
                    </div>

                    <div style={{ textAlign: "center", marginBottom: 14 }}>
                      <h4
                        style={{
                          color: C.onSurface,
                          fontSize: isDesktop ? 24 : 18,
                          fontWeight: 900,
                          marginBottom: 6,
                        }}>
                        {activeInitState.title}
                      </h4>
                      <p
                        style={{
                          color: "rgba(190, 199, 212, 0.72)",
                          fontSize: isDesktop ? 14 : 12,
                          fontWeight: 600,
                          lineHeight: "22px",
                          maxWidth: 420,
                        }}>
                        {activeInitState.detail}
                      </p>
                    </div>

                    <span
                      style={{
                        color: "rgba(152, 203, 255, 0.36)",
                        fontSize: 10,
                        fontWeight: 900,
                        letterSpacing: 2,
                      }}>
                      INBLUE AI KIOSK · PLEASE STAND BY
                    </span>
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        color: C.onSurfaceVariant,
                        fontSize: isDesktop ? 18 : isTablet ? 15 : 14,
                        fontWeight: 400,
                        lineHeight: isDesktop ? "28px" : isTablet ? "22px" : "20px",
                        textAlign: "center",
                        marginBottom: 10,
                      }}>
                      Nhập mã PIN 6 số từ lịch hẹn của bạn để bắt đầu.
                    </p>

                    <p
                      onClick={() => setIsKioskSettingsOpen(true)}
                      style={{
                        color: "rgba(152, 203, 255, 0.74)",
                        fontSize: isDesktop ? 12 : 10.5,
                        fontWeight: 800,
                        textAlign: "center",
                        marginBottom: isTablet ? 18 : 28,
                        letterSpacing: 0.4,
                        cursor: "pointer",
                      }}>
                      {selectedKiosk
                        ? `Kiosk hiện tại: ${selectedKiosk.name}${selectedKiosk.location ? ` · ${selectedKiosk.location}` : ""}`
                        : "Chưa cấu hình kiosk cho màn hình này"}
                    </p>

                    {/* 6 Circular PIN Slots (Exact 1:1 Mobile Match) */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: isDesktop ? 16 : 10,
                        marginBottom: isTablet ? 20 : 32,
                      }}>
                      {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
                        const filled = idx < pin.length;
                        return (
                          <div
                            key={idx}
                            style={{
                              width: isDesktop ? 48 : isTablet ? 40 : 36,
                              height: isDesktop ? 48 : isTablet ? 40 : 36,
                              borderRadius: 999,
                              backgroundColor: filled ? C.slotFilledBg : C.slotBg,
                              borderWidth: 1.5,
                              borderStyle: "solid",
                              borderColor: authError
                                ? "#EF4444"
                                : filled
                                  ? C.slotFilledBg
                                  : C.slotBorder,
                              boxShadow: filled
                                ? "0 0 16px rgba(152,203,255,0.6)"
                                : authError
                                  ? "0 0 12px rgba(239,68,68,0.5)"
                                  : "none",
                              transition: "all 0.15s ease",
                            }}
                          />
                        );
                      })}
                    </div>

                    {authError && (
                      <div
                        style={{
                          color: "#EF4444",
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: "center",
                          marginBottom: 24,
                        }}>
                        {authError}
                      </div>
                    )}

                    {/* Touch Keypad (Exact 1:1 Mobile Match) */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: isDesktop ? 24 : isTablet ? 14 : 12,
                        width: "100%",
                        maxWidth: isDesktop ? 360 : 320,
                      }}>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "AC", "0", "DEL"].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => pressKey(k)}
                          style={{
                            width: isDesktop ? 100 : isTablet ? 84 : 76,
                            height: isDesktop ? 80 : isTablet ? 62 : 56,
                            borderRadius: 16,
                            backgroundColor: C.keyBg,
                            border: `1px solid ${C.white10}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            cursor: "pointer",
                            transition:
                              "transform 0.08s, background-color 0.08s, border-color 0.08s",
                          }}
                          onMouseDown={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = C.keyPressBg;
                            (e.currentTarget as HTMLElement).style.borderColor = C.primary;
                            (e.currentTarget as HTMLElement).style.transform = "scale(0.95)";
                          }}
                          onMouseUp={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = C.keyBg;
                            (e.currentTarget as HTMLElement).style.borderColor = C.white10;
                            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                          }}>
                          {k === "DEL" ? (
                            <svg
                              width="28"
                              height="28"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#bec7d4"
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round">
                              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                              <line x1="18" y1="9" x2="12" y2="15"></line>
                              <line x1="12" y1="9" x2="18" y2="15"></line>
                            </svg>
                          ) : k === "AC" ? (
                            <span
                              style={{
                                fontSize: isDesktop ? 14 : 12,
                                fontWeight: 600,
                                color: C.onSurfaceVariant,
                                letterSpacing: 0.7,
                              }}>
                              AC
                            </span>
                          ) : (
                            <span
                              style={{
                                color: C.onSurface,
                                fontSize: isDesktop ? 32 : isTablet ? 24 : 20,
                                fontWeight: 700,
                              }}>
                              {k}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER BAR (Exact 1:1 Mobile Match) ── */}
      <div
        style={{
          height: isDesktop ? 48 : isTablet ? 42 : 58,
          borderTop: "1px solid rgba(152, 203, 255, 0.08)",
          display: "flex",
          flexDirection: isWide ? "row" : "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${isDesktop ? 64 : isTablet ? 32 : 22}px`,
          backgroundColor: "rgba(5, 10, 26, 0.55)",
          zIndex: 10,
        }}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: isWide ? 13 : 9,
          }}>
          <span
            style={{
              color: "rgba(148, 163, 184, 0.7)",
              fontSize: isDesktop ? 11 : 9,
              fontWeight: 800,
              letterSpacing: isDesktop ? 2.4 : 1.5,
            }}>
            FPT UNIVERSITY
          </span>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(148, 163, 184, 0.38)",
            }}
          />
          <span
            style={{
              color: "rgba(148, 163, 184, 0.7)",
              fontSize: isDesktop ? 11 : 9,
              fontWeight: 800,
              letterSpacing: isDesktop ? 2.4 : 1.5,
            }}>
            SOFTWARE ENGINEERING
          </span>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(148, 163, 184, 0.38)",
            }}
          />
          <span
            style={{
              color: "rgba(148, 163, 184, 0.7)",
              fontSize: isDesktop ? 11 : 9,
              fontWeight: 800,
              letterSpacing: isDesktop ? 2.4 : 1.5,
            }}>
            SUMMER 2026
          </span>
        </div>
        <span
          style={{
            color: "rgba(148, 163, 184, 0.7)",
            fontSize: isDesktop ? 11 : 9,
            fontWeight: 800,
            letterSpacing: isDesktop ? 2.4 : 1.5,
          }}>
          POWERED BY INBLUE PLATFORM
        </span>
      </div>

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
          setScreenState("AI_ROOM");
        }}
        onCancel={() => setIsHardwareModalOpen(false)}
      />
    </div>
  );
}
