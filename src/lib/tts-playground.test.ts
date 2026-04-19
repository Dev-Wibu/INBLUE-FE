import { describe, expect, it } from "vitest";

import { resolveResponsiveVoiceName } from "./tts-playground";

describe("resolveResponsiveVoiceName", () => {
  it("trả về voice tiếng Việt cho vi-VN", () => {
    expect(resolveResponsiveVoiceName("vi-VN")).toBe("Vietnamese Male");
  });

  it("trả về voice tiếng Anh cho en-US", () => {
    expect(resolveResponsiveVoiceName("en-US")).toBe("US English Male");
  });
});
