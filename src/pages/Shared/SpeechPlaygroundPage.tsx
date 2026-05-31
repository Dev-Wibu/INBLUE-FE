import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { selectBestSpeechVoice } from "@/hooks/speech-synthesis.utils";
import i18n from "@/lib/i18n";
import {
  loadResponsiveVoice,
  resolveResponsiveVoiceName,
  stopResponsiveVoicePlayback,
} from "@/lib/tts-playground";
import { AlertTriangle, LoaderCircle, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
const t = i18n.t.bind(i18n);
type PlaygroundLanguage = "vi-VN" | "en-US";
type SpeechEngine = "web-speech" | "responsive-voice";
const ENGINE_LABELS: Record<SpeechEngine, string> = {
  "web-speech": "Web Speech API",
  "responsive-voice": "ResponsiveVoice.js",
};
const TEST_PHRASE_BY_LANG: Record<PlaygroundLanguage, string> = {
  "vi-VN": t("shared_speechplaygroundpage.tsx.xin_chao_ay_la_bai_kiem_tra_giong_noi_ti"),
  "en-US": "Hello, this is a speech synthesis test for AI Interview.",
};
function formatDateTime(date: Date | null): string {
  if (!date) {
    return t("shared_speechplaygroundpage.tsx.chua_co");
  }
  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN")}`;
}
function detectBrowserLabel(): string {
  if (typeof navigator === "undefined") {
    return t("shared_speechplaygroundpage.tsx.khong_xac_inh");
  }
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("chrome/")) return "Google Chrome";
  if (ua.includes("firefox/")) return "Mozilla Firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  return t("shared_speechplaygroundpage.tsx.trinh_duyet_khac");
}
export function SpeechPlaygroundPage() {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<PlaygroundLanguage>("vi-VN");
  const [engine, setEngine] = useState<SpeechEngine>("web-speech");
  const [text, setText] = useState(TEST_PHRASE_BY_LANG["vi-VN"]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEngineLoading, setIsEngineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voicesLoadedAt, setVoicesLoadedAt] = useState<Date | null>(null);
  const [voicesChangedCount, setVoicesChangedCount] = useState(0);
  const [lastSelectedVoice, setLastSelectedVoice] = useState<string>(
    t("shared_speechplaygroundpage.tsx.chua_phat")
  );
  const [lastSpeakAt, setLastSpeakAt] = useState<Date | null>(null);
  const [lastEngineUsed, setLastEngineUsed] = useState<string>(
    t("shared_speechplaygroundpage.tsx.chua_phat")
  );
  const [lastSpeakLatencyMs, setLastSpeakLatencyMs] = useState<number | null>(null);
  const speakRequestIdRef = useRef(0);
  const isWebSpeechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window && !!window.speechSynthesis;
  useEffect(() => {
    if (!isWebSpeechSupported) {
      return;
    }
    let disposed = false;
    const synth = window.speechSynthesis;
    const syncVoices = () => {
      const nextVoices = synth.getVoices();
      if (disposed || nextVoices.length === 0) {
        return;
      }
      setVoices(nextVoices);
      setVoicesLoadedAt((previous) => previous ?? new Date());
    };
    const handleVoicesChanged = () => {
      setVoicesChangedCount((previous) => previous + 1);
      syncVoices();
    };
    syncVoices();
    synth.addEventListener("voiceschanged", handleVoicesChanged);
    const pollIntervalId = window.setInterval(syncVoices, 300);
    const stopPollingTimeoutId = window.setTimeout(() => {
      window.clearInterval(pollIntervalId);
    }, 7000);
    return () => {
      disposed = true;
      synth.cancel();
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
      window.clearInterval(pollIntervalId);
      window.clearTimeout(stopPollingTimeoutId);
    };
  }, [isWebSpeechSupported]);
  const stopAllPlayback = useCallback(() => {
    if (isWebSpeechSupported) {
      window.speechSynthesis.cancel();
    }
    stopResponsiveVoicePlayback();
  }, [isWebSpeechSupported]);
  useEffect(() => {
    return () => {
      speakRequestIdRef.current += 1;
      stopAllPlayback();
    };
  }, [stopAllPlayback]);
  const languagePrefix = language.split("-")[0];
  const filteredVoices = useMemo(() => {
    return voices.filter((voice) => {
      const normalizedVoiceLang = voice.lang.toLowerCase();
      return (
        normalizedVoiceLang === language.toLowerCase() ||
        normalizedVoiceLang === languagePrefix ||
        normalizedVoiceLang.startsWith(`${languagePrefix}-`)
      );
    });
  }, [language, languagePrefix, voices]);
  const hasVietnameseVoice = useMemo(() => {
    return voices.some((voice) => {
      const normalizedVoiceLang = voice.lang.toLowerCase();
      return normalizedVoiceLang === "vi-vn" || normalizedVoiceLang === "vi";
    });
  }, [voices]);
  const handleUsePreset = () => {
    setText(TEST_PHRASE_BY_LANG[language]);
  };
  const handleStop = useCallback(() => {
    speakRequestIdRef.current += 1;
    stopAllPlayback();
    setIsEngineLoading(false);
    setIsSpeaking(false);
  }, [stopAllPlayback]);
  const handleSpeak = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setError(t("shared_speechplaygroundpage.tsx.vui_long_nhap_noi_dung_e_thu_oc"));
      return;
    }
    const requestId = ++speakRequestIdRef.current;
    const startedAt = performance.now();
    setError(null);
    setIsSpeaking(false);
    setIsEngineLoading(engine === "responsive-voice");
    stopAllPlayback();
    const markStarted = (engineLabel: string, voiceLabel: string) => {
      if (requestId !== speakRequestIdRef.current) {
        return;
      }
      setIsSpeaking(true);
      setLastSpeakAt(new Date());
      setLastEngineUsed(engineLabel);
      setLastSelectedVoice(voiceLabel);
      setLastSpeakLatencyMs(Math.max(0, Math.round(performance.now() - startedAt)));
    };
    const markEnded = () => {
      if (requestId !== speakRequestIdRef.current) {
        return;
      }
      setIsEngineLoading(false);
      setIsSpeaking(false);
    };
    if (engine === "web-speech") {
      if (!isWebSpeechSupported) {
        setIsEngineLoading(false);
        setError(t("shared_speechplaygroundpage.tsx.trinh_duyet_hien_tai_khong_ho_tro_web_sp"));
        return;
      }
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(trimmedText);
      utterance.lang = language;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      const selectedVoice =
        voices.find((voice) => voice.voiceURI === selectedVoiceUri) ??
        selectBestSpeechVoice(voices, language);
      const selectedVoiceLabel = selectedVoice
        ? `${selectedVoice.name} (${selectedVoice.lang})`
        : t("shared_speechplaygroundpage.tsx.mac_inh_he_thong");
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.onstart = () => {
        markStarted(ENGINE_LABELS["web-speech"], selectedVoiceLabel);
      };
      utterance.onend = () => {
        markEnded();
      };
      utterance.onerror = () => {
        if (requestId !== speakRequestIdRef.current) {
          return;
        }
        markEnded();
        setError(t("shared_speechplaygroundpage.tsx.co_loi_khi_phat_am_web_speech_vui_long_t"));
      };
      setIsEngineLoading(false);
      synth.speak(utterance);
      return;
    }
    if (engine === "responsive-voice") {
      try {
        const responsiveVoice = await loadResponsiveVoice();
        if (requestId !== speakRequestIdRef.current) {
          return;
        }
        const responsiveVoiceName = resolveResponsiveVoiceName(language);
        responsiveVoice.speak(trimmedText, responsiveVoiceName, {
          rate,
          pitch,
          volume,
          onstart: () => {
            markStarted(ENGINE_LABELS["responsive-voice"], responsiveVoiceName);
          },
          onend: () => {
            markEnded();
          },
          onerror: () => {
            if (requestId !== speakRequestIdRef.current) {
              return;
            }
            markEnded();
            setError(t("shared_speechplaygroundpage.tsx.responsivevoice_loi_trong_qua_trinh_phat"));
          },
        });
        setIsEngineLoading(false);
      } catch {
        if (requestId !== speakRequestIdRef.current) {
          return;
        }
        setIsEngineLoading(false);
        setIsSpeaking(false);
        setError(t("shared_speechplaygroundpage.tsx.khong_the_tai_responsivevoice_js_vui_lon"));
      }
    }
  }, [
    engine,
    isWebSpeechSupported,
    language,
    pitch,
    rate,
    selectedVoiceUri,
    stopAllPlayback,
    text,
    voices,
    volume,
    t,
  ]);
  const browserLabel = detectBrowserLabel();
  const isPlayDisabled = isEngineLoading || (engine === "web-speech" && !isWebSpeechSupported);
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <HomepageHeader />

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Speech Playground (DEV)</CardTitle>
              <CardDescription>
                {t("shared_speechplaygroundpage.tsx.khu_thu_nghiem_giong_noi_cho_ai_intervie")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {t("shared_speechplaygroundpage.tsx.trinh_duyet")} {browserLabel}
                </Badge>
                <Badge variant="outline">
                  {t("shared_speechplaygroundpage.tsx.tong_so_voice")} {voices.length}
                </Badge>
                <Badge variant="outline">
                  {t("shared_speechplaygroundpage.tsx.voices_loaded_luc")}{" "}
                  {formatDateTime(voicesLoadedAt)}
                </Badge>
                <Badge variant="outline">voiceschanged: {voicesChangedCount}</Badge>
                <Badge variant="outline">
                  {t("shared_speechplaygroundpage.tsx.engine_ang_chon")} {ENGINE_LABELS[engine]}
                </Badge>
              </div>

              {!hasVietnameseVoice && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      {t(
                        "shared_speechplaygroundpage.tsx.thiet_bi_hien_tai_chua_tim_thay_voice_ti"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("shared_speechplaygroundpage.tsx.bang_ieu_khien_test_tts")}</CardTitle>
              <CardDescription>
                {t("shared_speechplaygroundpage.tsx.chon_engine_ngon_ngu_va_thong_so_phat_am")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="speech-engine">Engine test</Label>
                  <select
                    id="speech-engine"
                    value={engine}
                    onChange={(event) => setEngine(event.target.value as SpeechEngine)}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <option value="web-speech">Web Speech API</option>
                    <option value="responsive-voice">ResponsiveVoice.js fallback</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="speech-language">{t("common.language")}</Label>
                  <select
                    id="speech-language"
                    value={language}
                    onChange={(event) => {
                      const nextLanguage = event.target.value as PlaygroundLanguage;
                      setLanguage(nextLanguage);
                      setSelectedVoiceUri("");
                    }}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <option value="vi-VN">
                      {t("shared_speechplaygroundpage.tsx.tieng_viet_vi_vn")}
                    </option>
                    <option value="en-US">English (en-US)</option>
                  </select>
                </div>
              </div>

              {engine === "responsive-voice" && (
                <div className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
                  {t("shared_speechplaygroundpage.tsx.responsivevoice_uoc_bat_e_fallback_bench")}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="speech-voice">
                  {t("shared_speechplaygroundpage.tsx.voice_chi_ap_dung_cho_web_speech")}
                </Label>
                <select
                  id="speech-voice"
                  disabled={engine !== "web-speech"}
                  value={selectedVoiceUri}
                  onChange={(event) => setSelectedVoiceUri(event.target.value)}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900">
                  <option value="">
                    {t("shared_speechplaygroundpage.tsx.tu_ong_chon_voice_tot_nhat")}
                  </option>
                  {filteredVoices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang}) {voice.localService ? "- local" : "- cloud"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="speech-rate">
                    {t("shared_speechplaygroundpage.tsx.toc_o")} {rate.toFixed(2)}
                  </Label>
                  <Input
                    id="speech-rate"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={rate}
                    onChange={(event) => setRate(Number(event.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="speech-pitch">
                    {t("shared_speechplaygroundpage.tsx.o_cao")} {pitch.toFixed(2)}
                  </Label>
                  <Input
                    id="speech-pitch"
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={pitch}
                    onChange={(event) => setPitch(Number(event.target.value))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="speech-volume">
                    {t("shared_speechplaygroundpage.tsx.am_luong")} {volume.toFixed(2)}
                  </Label>
                  <Input
                    id="speech-volume"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(event) => setVolume(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="speech-text">
                  {t("shared_speechplaygroundpage.tsx.noi_dung_test")}
                </Label>
                <textarea
                  id="speech-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
                <Button variant="outline" onClick={handleUsePreset}>
                  {t("shared_speechplaygroundpage.tsx.dung_cau_mau_theo_ngon_ngu_a_chon")}
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => void handleSpeak()}
                  disabled={isPlayDisabled}
                  className="gap-2 bg-cyan-600 text-white hover:bg-cyan-700">
                  {isEngineLoading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  {isEngineLoading
                    ? t("shared_speechplaygroundpage.tsx.ang_tai_engine")
                    : t("shared_speechplaygroundpage.tsx.phat_thu")}
                </Button>
                <Button variant="outline" onClick={handleStop} className="gap-2">
                  <Square className="h-4 w-4" />
                  {t("shared_speechplaygroundpage.tsx.dung_phat")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRate(1);
                    setPitch(1);
                    setVolume(1);
                  }}>
                  {t("shared_speechplaygroundpage.tsx.reset_thong_so")}
                </Button>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/60">
                <p>
                  <span className="font-semibold">{t("common.status1")}</span>{" "}
                  {isSpeaking
                    ? t("shared_speechplaygroundpage.tsx.ang_phat")
                    : t("shared_speechplaygroundpage.tsx.a_dung")}
                </p>
                <p>
                  <span className="font-semibold">
                    {t("shared_speechplaygroundpage.tsx.engine_a_phat")}
                  </span>{" "}
                  {lastEngineUsed}
                </p>
                <p>
                  <span className="font-semibold">
                    {t("shared_speechplaygroundpage.tsx.voice_a_chon")}
                  </span>{" "}
                  {lastSelectedVoice}
                </p>
                <p>
                  <span className="font-semibold">
                    {t("shared_speechplaygroundpage.tsx.lan_phat_gan_nhat")}
                  </span>{" "}
                  {formatDateTime(lastSpeakAt)}
                </p>
                <p>
                  <span className="font-semibold">
                    {t("shared_speechplaygroundpage.tsx.o_tre_bat_au_phat")}
                  </span>{" "}
                  {lastSpeakLatencyMs === null
                    ? t("shared_speechplaygroundpage.tsx.chua_co")
                    : `${lastSpeakLatencyMs} ms`}
                </p>
                <p>
                  <span className="font-semibold">
                    {t("shared_speechplaygroundpage.tsx.voice_phu_hop_voi")} {language}:
                  </span>{" "}
                  {filteredVoices.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("shared_speechplaygroundpage.tsx.danh_sach_voice_hien_co")}</CardTitle>
              <CardDescription>
                {t("shared_speechplaygroundpage.tsx.dung_bang_nay_e_xac_inh_xem_may_co_voice")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[740px] text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-900">
                    <tr>
                      <th className="px-3 py-2">
                        {t("shared_speechplaygroundpage.tsx.ten_voice")}
                      </th>
                      <th className="px-3 py-2">{t("common.language")}</th>
                      <th className="px-3 py-2">{t("shared_speechplaygroundpage.tsx.loai")}</th>
                      <th className="px-3 py-2">{t("shared_speechplaygroundpage.tsx.mac_inh")}</th>
                      <th className="px-3 py-2">Voice URI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voices.map((voice) => (
                      <tr
                        key={voice.voiceURI}
                        className="border-t border-slate-200 dark:border-slate-700">
                        <td className="px-3 py-2 font-medium">{voice.name}</td>
                        <td className="px-3 py-2">{voice.lang}</td>
                        <td className="px-3 py-2">{voice.localService ? "Local" : "Cloud"}</td>
                        <td className="px-3 py-2">
                          {voice.default
                            ? t("common.have")
                            : t("shared_speechplaygroundpage.tsx.khong")}
                        </td>
                        <td className="px-3 py-2 text-xs opacity-80">{voice.voiceURI}</td>
                      </tr>
                    ))}
                    {voices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                          {t(
                            "shared_speechplaygroundpage.tsx.chua_tai_uoc_danh_sach_voice_thu_refresh"
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("shared_speechplaygroundpage.tsx.checklist_test_khuyen_nghi")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{t("shared_speechplaygroundpage.tsx.1_chon_tieng_viet_test_lai_cung_1_cau_vo")}</p>
              <p>{t("shared_speechplaygroundpage.tsx.2_kiem_tra_o_tre_bat_au_phat_va_ghi_lai_")}</p>
              <p>{t("shared_speechplaygroundpage.tsx.3_thu_rate_0_9_pitch_1_05_va_so_sanh_voi")}</p>
              <p>{t("shared_speechplaygroundpage.tsx.4_oi_qua_en_roi_quay_lai_vi_e_kiem_tra_f")}</p>
              <p>{t("shared_speechplaygroundpage.tsx.5_reload_trang_va_lap_lai_e_kiem_tra_kha")}</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
