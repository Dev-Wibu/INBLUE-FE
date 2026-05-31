import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
export interface ResponsiveVoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onstart?: () => void;
  onend?: () => void;
  onerror?: () => void;
}

export interface ResponsiveVoiceApi {
  speak: (_text: string, _voice?: string, _options?: ResponsiveVoiceOptions) => void;
  cancel: () => void;
  getVoices?: () => string[];
  voiceSupport?: () => boolean;
  isPlaying?: () => boolean;
  enableWindowClickHook?: () => void;
  clickEvent?: () => void;
}

declare global {
  interface Window {
    responsiveVoice?: ResponsiveVoiceApi;
    rvApiKey?: string;
  }
}

const DEFAULT_RESPONSIVE_VOICE_KEY = "L0x1u2UZ";
const RESPONSIVE_VOICE_SCRIPT_SRC = "https://code.responsivevoice.org/responsivevoice.js";
const RESPONSIVE_VOICE_SCRIPT_SELECTOR = "script[data-responsive-voice-loader='true']";
const RESPONSIVE_VOICE_KEY = (
  import.meta.env.VITE_RESPONSIVE_VOICE_KEY ?? DEFAULT_RESPONSIVE_VOICE_KEY
).trim();

let responsiveVoiceCache: ResponsiveVoiceApi | null = null;
let responsiveVoiceLoadingPromise: Promise<ResponsiveVoiceApi> | null = null;

const isResponsiveVoiceApi = (value: unknown): value is ResponsiveVoiceApi => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    speak?: unknown;
    cancel?: unknown;
  };

  return typeof candidate.speak === "function" && typeof candidate.cancel === "function";
};

const resolveResponsiveVoiceApi = (): ResponsiveVoiceApi | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return isResponsiveVoiceApi(window.responsiveVoice) ? window.responsiveVoice : null;
};

const buildResponsiveVoiceScriptSrc = (): string => {
  if (!RESPONSIVE_VOICE_KEY) {
    return RESPONSIVE_VOICE_SCRIPT_SRC;
  }

  return `${RESPONSIVE_VOICE_SCRIPT_SRC}?key=${encodeURIComponent(RESPONSIVE_VOICE_KEY)}`;
};

const getExistingResponsiveVoiceScript = (): HTMLScriptElement | null => {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector<HTMLScriptElement>(
    `${RESPONSIVE_VOICE_SCRIPT_SELECTOR}, script[src*='code.responsivevoice.org/responsivevoice.js']`
  );
};

export const loadResponsiveVoice = async (timeoutMs = 8000): Promise<ResponsiveVoiceApi> => {
  if (responsiveVoiceCache) {
    return responsiveVoiceCache;
  }

  const existingApi = resolveResponsiveVoiceApi();
  if (existingApi) {
    responsiveVoiceCache = existingApi;
    return existingApi;
  }

  if (typeof document === "undefined") {
    throw new Error(t("general.theCurrentEnvironmentDoesNot"));
  }

  if (responsiveVoiceLoadingPromise) {
    return responsiveVoiceLoadingPromise;
  }

  responsiveVoiceLoadingPromise = new Promise<ResponsiveVoiceApi>((resolve, reject) => {
    const existingScript = getExistingResponsiveVoiceScript();
    const script = existingScript ?? document.createElement("script");

    let timeoutId = 0;
    let pollId = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const tryResolve = () => {
      const api = resolveResponsiveVoiceApi();
      if (!api) {
        return;
      }

      responsiveVoiceCache = api;
      cleanup();
      resolve(api);
    };

    const handleLoad = () => {
      tryResolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(t("general.responsivevoiceJsFailedToLoad")));
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(t("general.responsivevoiceJsTookTooLong")));
    }, timeoutMs);

    pollId = window.setInterval(tryResolve, 180);

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      if (RESPONSIVE_VOICE_KEY) {
        window.rvApiKey = RESPONSIVE_VOICE_KEY;
      }

      script.src = buildResponsiveVoiceScriptSrc();
      script.async = true;
      script.setAttribute("data-responsive-voice-loader", "true");
      document.head.append(script);
    } else {
      tryResolve();
    }
  }).finally(() => {
    responsiveVoiceLoadingPromise = null;
  });

  return responsiveVoiceLoadingPromise;
};

export const resolveResponsiveVoiceName = (language: "vi-VN" | "en-US"): string => {
  return language === "vi-VN" ? "Vietnamese Male" : "US English Male";
};

export const stopResponsiveVoicePlayback = (): void => {
  resolveResponsiveVoiceApi()?.cancel();
};
