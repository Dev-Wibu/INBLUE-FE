import i18n from "@/lib/i18n";
import {
  startRealtimeTranscription,
  type RealtimeTranscriptionHandle,
} from "@/services/kiosk/realtimeTranscription";
import { useCallback, useEffect, useRef, useState } from "react";
const t = i18n.t.bind(i18n);

// Khai báo kiểu để TypeScript không báo lỗi với Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((_e: SpeechRecognitionEvent) => void) | null;
  onerror: ((_e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}
export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}
export interface UseSpeechRecognitionOptions {
  reminderIntervalMs?: number;
  onReminder?: (_elapsedMs: number) => void;
  /** Use the backend PCM/WebSocket recognizer instead of browser-only speech recognition. */
  realtime?: boolean;
}

// onFinalTranscript được gọi trực tiếp trong native event handler — không qua useEffect
export function useSpeechRecognition(
  lang = "vi-VN",
  onFinalTranscript?: (_text: string) => void,
  options?: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const reminderIntervalMs = options?.reminderIntervalMs ?? 5 * 60 * 1000;
  const useRealtime = options?.realtime === true;
  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;
  const isSupported =
    !!SpeechRecognitionAPI ||
    (useRealtime &&
      typeof window !== "undefined" &&
      !!window.WebSocket &&
      !!navigator.mediaDevices?.getUserMedia);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Dùng ref để giữ callback mới nhất — cập nhật qua effect tránh mutate ref trong render
  const onFinalTranscriptRef = useRef<((_text: string) => void) | undefined>(onFinalTranscript);
  const onReminderRef = useRef<((_elapsedMs: number) => void) | undefined>(options?.onReminder);
  const shouldKeepListeningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const restartTimeoutRef = useRef<number | null>(null);
  const reminderTimeoutRef = useRef<number | null>(null);
  const listeningStartedAtRef = useRef<number | null>(null);
  const realtimeHandleRef = useRef<RealtimeTranscriptionHandle | null>(null);
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);
  useEffect(() => {
    onReminderRef.current = options?.onReminder;
  }, [options?.onReminder]);
  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current !== null) {
      window.clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);
  const clearReminderTimeout = useCallback(() => {
    if (reminderTimeoutRef.current !== null) {
      window.clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }
  }, []);
  const scheduleReminder = useCallback(() => {
    clearReminderTimeout();
    if (reminderIntervalMs <= 0 || !shouldKeepListeningRef.current || stopRequestedRef.current) {
      return;
    }
    const scheduleNext = () => {
      reminderTimeoutRef.current = window.setTimeout(() => {
        if (!shouldKeepListeningRef.current || stopRequestedRef.current) {
          reminderTimeoutRef.current = null;
          return;
        }
        const startedAt = listeningStartedAtRef.current;
        if (startedAt !== null) {
          onReminderRef.current?.(Date.now() - startedAt);
        }
        scheduleNext();
      }, reminderIntervalMs);
    };
    scheduleNext();
  }, [clearReminderTimeout, reminderIntervalMs]);
  const scheduleRestart = useCallback(
    (delayMs = 250) => {
      clearRestartTimeout();
      if (!shouldKeepListeningRef.current || stopRequestedRef.current) {
        return;
      }
      restartTimeoutRef.current = window.setTimeout(() => {
        restartTimeoutRef.current = null;
        if (
          !recognitionRef.current ||
          stopRequestedRef.current ||
          !shouldKeepListeningRef.current
        ) {
          return;
        }
        try {
          recognitionRef.current.start();
        } catch {
          // Bỏ qua lỗi InvalidStateError khi browser vẫn đang ở trạng thái listening.
        }
      }, delayMs);
    },
    [clearRestartTimeout]
  );

  // Khởi tạo recognition instance một lần duy nhất
  useEffect(() => {
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      if (finalText) {
        // Gọi callback trực tiếp từ event handler — tránh setState-in-effect
        onFinalTranscriptRef.current?.(finalText.trim());
      }
      setInterimTranscript(interimText);
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      // no-speech là lỗi bình thường (người dùng không nói gì), không cần hiện
      if (e.error === "no-speech") {
        scheduleRestart(350);
        return;
      }
      if (e.error === "aborted") {
        return;
      }
      const errorMessages: Record<string, string> = {
        "not-allowed": t("general.theBrowserIsNotGranted"),
        "audio-capture": t("general.noMicrophoneFoundPleaseCheck"),
        network: t("general.networkErrorWhenRecognizingVoice"),
        aborted: "",
      };
      setError(
        errorMessages[e.error] ??
          t("general.speechRecognitionError", {
            var_0: e.error,
          })
      );
      stopRequestedRef.current = true;
      shouldKeepListeningRef.current = false;
      clearRestartTimeout();
      clearReminderTimeout();
      setIsListening(false);
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current && !stopRequestedRef.current) {
        scheduleRestart(250);
        return;
      }
      clearRestartTimeout();
      clearReminderTimeout();
      setIsListening(false);
      setInterimTranscript("");
    };
    recognitionRef.current = recognition;
    return () => {
      stopRequestedRef.current = true;
      shouldKeepListeningRef.current = false;
      clearRestartTimeout();
      clearReminderTimeout();
      if (realtimeHandleRef.current) {
        void realtimeHandleRef.current.stop();
        realtimeHandleRef.current = null;
      }
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [
    SpeechRecognitionAPI,
    clearReminderTimeout,
    clearRestartTimeout,
    lang,
    scheduleRestart,
    useRealtime,
  ]);
  useEffect(() => {
    if (!useRealtime) return;
    return () => {
      stopRequestedRef.current = true;
      shouldKeepListeningRef.current = false;
      clearReminderTimeout();
      if (realtimeHandleRef.current) {
        void realtimeHandleRef.current.stop();
        realtimeHandleRef.current = null;
      }
    };
  }, [clearReminderTimeout, useRealtime]);
  const startListening = useCallback(() => {
    if (isListening || (!recognitionRef.current && !useRealtime)) return;
    setError(null);
    stopRequestedRef.current = false;
    shouldKeepListeningRef.current = true;
    listeningStartedAtRef.current = Date.now();
    scheduleReminder();
    if (useRealtime) {
      setIsListening(true);
      void startRealtimeTranscription("", {
        onReady: () => {
          setIsListening(true);
          setError(null);
        },
        onTranscript: (text, isFinal) => {
          setInterimTranscript(text);
          if (isFinal) {
            setInterimTranscript("");
          }
        },
        onError: (realtimeError) => {
          setError(realtimeError.message);
          shouldKeepListeningRef.current = false;
          stopRequestedRef.current = true;
          clearReminderTimeout();
          setIsListening(false);
        },
        onClose: () => {
          realtimeHandleRef.current = null;
          if (!shouldKeepListeningRef.current) {
            setIsListening(false);
          }
        },
      })
        .then((handle) => {
          if (stopRequestedRef.current || !shouldKeepListeningRef.current) {
            void handle.stop();
            return;
          }
          realtimeHandleRef.current = handle;
          setIsListening(true);
        })
        .catch((realtimeError: unknown) => {
          if (!shouldKeepListeningRef.current) return;
          const browserRecognition = recognitionRef.current;
          if (browserRecognition) {
            setError(null);
            try {
              browserRecognition.start();
              return;
            } catch {
              // Continue with the visible realtime error when browser recognition also fails.
            }
          }
          shouldKeepListeningRef.current = false;
          stopRequestedRef.current = true;
          clearReminderTimeout();
          setIsListening(false);
          setError(
            realtimeError instanceof Error
              ? realtimeError.message
              : t("general.speechRecognitionError", { var_0: "realtime" })
          );
        });
      return;
    }
    try {
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.start();
    } catch {
      // Bỏ qua lỗi nếu recognition đang chạy (InvalidStateError)
    }
  }, [clearReminderTimeout, isListening, scheduleReminder, useRealtime]);
  const stopListening = useCallback(() => {
    if (stopRequestedRef.current || !shouldKeepListeningRef.current) {
      return;
    }
    stopRequestedRef.current = true;
    shouldKeepListeningRef.current = false;
    clearRestartTimeout();
    clearReminderTimeout();
    if (realtimeHandleRef.current) {
      const handle = realtimeHandleRef.current;
      realtimeHandleRef.current = null;
      void handle.stop();
      setIsListening(false);
      setInterimTranscript("");
      return;
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Bỏ qua lỗi nếu recognition chưa sẵn sàng để stop.
    }
  }, [clearReminderTimeout, clearRestartTimeout]);
  return {
    isListening,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
  };
}
