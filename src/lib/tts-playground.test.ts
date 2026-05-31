import i18n from "@/lib/i18n";
import { describe, expect, it } from "vitest";
const t = i18n.t.bind(i18n);

import { resolveResponsiveVoiceName } from "./tts-playground";

describe("resolveResponsiveVoiceName", () => {
  it(t("general.returnsVietnameseVoiceForVi"), () => {
    expect(resolveResponsiveVoiceName("vi-VN")).toBe("Vietnamese Male");
  });

  it(t("general.returnsEnglishVoiceForEn"), () => {
    expect(resolveResponsiveVoiceName("en-US")).toBe("US English Male");
  });
});
