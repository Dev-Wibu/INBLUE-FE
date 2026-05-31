import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
export interface ChatMessage {
  id: number;
  role: "ai" | "user";
  content: string;
  timestamp: string;
  meta?: {
    phaseName?: string;
    questionIndex?: number;
    totalQuestions?: number;
    questionType?: string;
  };
}
export type SpeechLanguageCode = "vi-VN" | "en-US";
export const SPEECH_LANGUAGE_LABELS: Record<SpeechLanguageCode, string> = {
  "vi-VN": t("common.vietnamese"),
  "en-US": "English",
};
