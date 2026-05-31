import i18n from "@/lib/i18n";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const t = i18n.t.bind(i18n);

import { loadResponsiveVoice, stopResponsiveVoicePlayback } from "@/lib/tts-playground";

import { useSpeechSynthesis } from "./useSpeechSynthesis";

vi.mock("@/lib/tts-playground", () => ({
  loadResponsiveVoice: vi.fn(),
  resolveResponsiveVoiceName: vi.fn((language: "vi-VN" | "en-US") =>
    language === "vi-VN" ? "Vietnamese Male" : "US English Male"
  ),
  stopResponsiveVoicePlayback: vi.fn(),
}));

const mockedLoadResponsiveVoice = vi.mocked(loadResponsiveVoice);
const mockedStopResponsiveVoicePlayback = vi.mocked(stopResponsiveVoicePlayback);

function createVoice(name: string, lang: string): SpeechSynthesisVoice {
  return {
    default: true,
    lang,
    localService: true,
    name,
    voiceURI: `${name}-${lang}`,
  } as SpeechSynthesisVoice;
}

describe("useSpeechSynthesis", () => {
  beforeEach(() => {
    const speechSynthesisSpeakMock = vi.fn((utterance: SpeechSynthesisUtterance) => {
      utterance.onstart?.(new Event("start") as SpeechSynthesisEvent);
    });
    const speechSynthesisCancelMock = vi.fn();

    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: {
        speak: speechSynthesisSpeakMock,
        cancel: speechSynthesisCancelMock,
        getVoices: () => [
          createVoice("Microsoft Nam", "vi-VN"),
          createVoice("Microsoft Mark", "en-US"),
        ],
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as SpeechSynthesis,
    });

    localStorage.removeItem("tts-muted");
    mockedStopResponsiveVoicePlayback.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it(t("general.useResponsivevoiceWithMaleVietnamese"), async () => {
    const responsiveSpeak = vi.fn(
      (
        _text: string,
        _voice?: string,
        options?: {
          onstart?: () => void;
          onend?: () => void;
          onerror?: () => void;
        }
      ) => {
        options?.onstart?.();
      }
    );

    mockedLoadResponsiveVoice.mockResolvedValue({
      speak: responsiveSpeak,
      cancel: vi.fn(),
      enableWindowClickHook: vi.fn(),
    });

    const { result } = renderHook(() =>
      useSpeechSynthesis("vi-VN", { strategy: "responsive-voice-first" })
    );

    expect(result.current.isSupported).toBe(true);

    await act(async () => {
      await Promise.resolve();
      result.current.speak("xin chao", 1);
      await Promise.resolve();
    });

    expect(responsiveSpeak).toHaveBeenCalledWith(
      "xin chao",
      "Vietnamese Male",
      expect.objectContaining({ rate: 1, pitch: 1, volume: 1 })
    );
    expect(result.current.activeVoiceName).toContain("Vietnamese Male");
    expect(result.current.activeVoiceName).toContain("ResponsiveVoice");
  });
});
