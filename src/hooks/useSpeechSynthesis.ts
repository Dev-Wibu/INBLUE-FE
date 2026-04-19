import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadResponsiveVoice,
  resolveResponsiveVoiceName,
  stopResponsiveVoicePlayback,
} from "@/lib/tts-playground";

import { hasVoiceForLanguage, selectBestSpeechVoice } from "./speech-synthesis.utils";

export interface UseSpeechSynthesisOptions {
  strategy?: "web-speech-only" | "responsive-voice-first";
}

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  speakingId: string | number | null;
  isSupported: boolean;
  isMuted: boolean;
  hasPreferredLanguageVoice: boolean | null;
  activeVoiceName: string | null;
  speak: (_text: string, _id: string | number) => void;
  cancel: () => void;
  toggleMute: () => void;
}

const waitForVoices = async (
  synth: SpeechSynthesis,
  maxWaitMs = 1800
): Promise<SpeechSynthesisVoice[]> => {
  const existingVoices = synth.getVoices();
  if (existingVoices.length > 0) {
    return existingVoices;
  }

  return await new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const tryResolve = () => {
      const nextVoices = synth.getVoices();
      if (nextVoices.length > 0) {
        cleanup();
        resolve(nextVoices);
      }
    };

    const cleanup = () => {
      synth.removeEventListener("voiceschanged", tryResolve);
      window.clearInterval(pollIntervalId);
      window.clearTimeout(timeoutId);
    };

    const pollIntervalId = window.setInterval(tryResolve, 250);
    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(synth.getVoices());
    }, maxWaitMs);

    synth.addEventListener("voiceschanged", tryResolve);
    tryResolve();
  });
};

const RESPONSIVE_START_TIMEOUT_FIRST_MS = 4200;
const RESPONSIVE_START_TIMEOUT_NEXT_MS = 2200;

export function useSpeechSynthesis(
  lang = "vi-VN",
  options?: UseSpeechSynthesisOptions
): UseSpeechSynthesisReturn {
  const strategy = options?.strategy ?? "web-speech-only";
  const preferResponsiveVoice = strategy === "responsive-voice-first";
  const isWebSpeechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window && !!window.speechSynthesis;
  const isSupported = isWebSpeechSupported || preferResponsiveVoice;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | number | null>(null);
  // Đọc từ localStorage để giữ trạng thái qua các lần điều hướng giữa các phòng phỏng vấn
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("tts-muted") === "true");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [responsiveVoiceAvailability, setResponsiveVoiceAvailability] = useState<boolean | null>(
    null
  );
  const [activeVoiceName, setActiveVoiceName] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakRequestIdRef = useRef(0);
  const hasResponsiveVoiceStartedRef = useRef(false);
  const isResponsiveVoiceAvailable = preferResponsiveVoice ? responsiveVoiceAvailability : false;

  useEffect(() => {
    if (!preferResponsiveVoice) {
      return;
    }

    let disposed = false;

    void loadResponsiveVoice(5000)
      .then((api) => {
        if (disposed) {
          return;
        }

        api.enableWindowClickHook?.();
        setResponsiveVoiceAvailability(true);
      })
      .catch(() => {
        if (disposed) {
          return;
        }

        setResponsiveVoiceAvailability(false);
      });

    return () => {
      disposed = true;
    };
  }, [preferResponsiveVoice]);

  const hasPreferredLanguageVoice = useMemo(() => {
    if (!isSupported) {
      return null;
    }

    if (preferResponsiveVoice) {
      if (isResponsiveVoiceAvailable === true) {
        return true;
      }

      if (isResponsiveVoiceAvailable === null) {
        return null;
      }
    }

    if (!isWebSpeechSupported) {
      return false;
    }

    if (voices.length === 0) {
      return null;
    }

    return hasVoiceForLanguage(voices, lang);
  }, [
    isResponsiveVoiceAvailable,
    isSupported,
    isWebSpeechSupported,
    lang,
    preferResponsiveVoice,
    voices,
  ]);

  // Hủy TTS khi unmount để không tiếp tục phát sau khi rời trang
  useEffect(() => {
    return () => {
      if (!isSupported) {
        return;
      }

      speakRequestIdRef.current += 1;
      if (isWebSpeechSupported) {
        window.speechSynthesis.cancel();
      }
      stopResponsiveVoicePlayback();
    };
  }, [isSupported, isWebSpeechSupported]);

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
    };

    syncVoices();
    synth.addEventListener("voiceschanged", syncVoices);

    const pollIntervalId = window.setInterval(syncVoices, 400);
    const stopPollingTimeoutId = window.setTimeout(() => {
      window.clearInterval(pollIntervalId);
    }, 6000);

    return () => {
      disposed = true;
      synth.removeEventListener("voiceschanged", syncVoices);
      window.clearInterval(pollIntervalId);
      window.clearTimeout(stopPollingTimeoutId);
    };
  }, [isWebSpeechSupported]);

  const speak = useCallback(
    (text: string, id: string | number) => {
      if (!isSupported || !text) return;

      const requestId = ++speakRequestIdRef.current;
      if (isWebSpeechSupported) {
        window.speechSynthesis.cancel();
      }
      stopResponsiveVoicePlayback();

      const speakWithWebSpeech = async () => {
        if (!isWebSpeechSupported) {
          setIsSpeaking(false);
          setSpeakingId(null);
          return;
        }

        const synth = window.speechSynthesis;
        const voicePool = voices.length > 0 ? voices : await waitForVoices(synth);
        if (requestId !== speakRequestIdRef.current) {
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const selectedVoice = selectBestSpeechVoice(voicePool, lang);
        setActiveVoiceName(selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : null);

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          setSpeakingId(id);
        };

        utterance.onend = () => {
          if (requestId !== speakRequestIdRef.current) {
            return;
          }
          setIsSpeaking(false);
          setSpeakingId(null);
        };

        utterance.onerror = () => {
          if (requestId !== speakRequestIdRef.current) {
            return;
          }
          setIsSpeaking(false);
          setSpeakingId(null);
        };

        utteranceRef.current = utterance;
        if (requestId !== speakRequestIdRef.current) {
          return;
        }

        synth.speak(utterance);
      };

      const speakWithResponsiveVoice = async (): Promise<boolean> => {
        if (!preferResponsiveVoice) {
          return false;
        }

        try {
          const responsiveVoice = await loadResponsiveVoice(5000);
          if (requestId !== speakRequestIdRef.current) {
            return true;
          }

          if (
            typeof responsiveVoice.voiceSupport === "function" &&
            !responsiveVoice.voiceSupport()
          ) {
            setResponsiveVoiceAvailability(false);
            return false;
          }

          setResponsiveVoiceAvailability(true);
          const responsiveVoiceName = resolveResponsiveVoiceName(
            lang === "en-US" ? "en-US" : "vi-VN"
          );
          const responsiveStartTimeoutMs = hasResponsiveVoiceStartedRef.current
            ? RESPONSIVE_START_TIMEOUT_NEXT_MS
            : RESPONSIVE_START_TIMEOUT_FIRST_MS;

          return await new Promise<boolean>((resolve) => {
            let settled = false;
            let started = false;
            let watchdogTimerId = 0;

            const finish = (result: boolean) => {
              if (settled) {
                return;
              }

              settled = true;
              window.clearTimeout(watchdogTimerId);
              resolve(result);
            };

            watchdogTimerId = window.setTimeout(() => {
              if (started || requestId !== speakRequestIdRef.current) {
                return;
              }

              stopResponsiveVoicePlayback();
              finish(false);
            }, responsiveStartTimeoutMs);

            try {
              responsiveVoice.speak(text, responsiveVoiceName, {
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0,
                onstart: () => {
                  if (requestId !== speakRequestIdRef.current) {
                    finish(true);
                    return;
                  }

                  started = true;
                  hasResponsiveVoiceStartedRef.current = true;
                  setActiveVoiceName(`${responsiveVoiceName} (ResponsiveVoice)`);
                  setIsSpeaking(true);
                  setSpeakingId(id);
                  finish(true);
                },
                onend: () => {
                  if (requestId !== speakRequestIdRef.current) {
                    return;
                  }

                  setIsSpeaking(false);
                  setSpeakingId(null);
                },
                onerror: () => {
                  if (requestId !== speakRequestIdRef.current) {
                    finish(false);
                    return;
                  }

                  setIsSpeaking(false);
                  setSpeakingId(null);
                  finish(false);
                },
              });
            } catch {
              finish(false);
            }
          });
        } catch {
          setResponsiveVoiceAvailability(false);
          return false;
        }
      };

      const runSpeak = async () => {
        if (preferResponsiveVoice) {
          const didStartResponsiveVoice = await speakWithResponsiveVoice();
          if (requestId !== speakRequestIdRef.current) {
            return;
          }

          if (didStartResponsiveVoice) {
            return;
          }
        }

        await speakWithWebSpeech();
      };

      void runSpeak();
    },
    [isSupported, isWebSpeechSupported, lang, preferResponsiveVoice, voices]
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    speakRequestIdRef.current += 1;
    if (isWebSpeechSupported) {
      window.speechSynthesis.cancel();
    }
    stopResponsiveVoicePlayback();
    setIsSpeaking(false);
    setSpeakingId(null);
  }, [isSupported, isWebSpeechSupported]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      // Tắt âm thanh đang phát nếu người dùng chuyển sang chế độ tắt tiếng
      if (!prev && isSupported) {
        speakRequestIdRef.current += 1;
        if (isWebSpeechSupported) {
          window.speechSynthesis.cancel();
        }
        stopResponsiveVoicePlayback();
        setIsSpeaking(false);
        setSpeakingId(null);
      }
      const next = !prev;
      localStorage.setItem("tts-muted", String(next));
      return next;
    });
  }, [isSupported, isWebSpeechSupported]);

  return {
    isSpeaking,
    speakingId,
    isSupported,
    isMuted,
    hasPreferredLanguageVoice,
    activeVoiceName,
    speak,
    cancel,
    toggleMute,
  };
}
