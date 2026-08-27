import { describe, expect, it } from "vitest";

import { toSafeUrl } from "./safe-url";

describe("toSafeUrl", () => {
  it("allows HTTPS URLs", () => {
    expect(toSafeUrl("https://example.com/profile")).toBe("https://example.com/profile");
  });

  it("allows mailto URLs", () => {
    expect(toSafeUrl("mailto:user@example.com")).toBe("mailto:user@example.com");
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://example.com",
  ])("rejects unsafe scheme %s", (value) => {
    expect(toSafeUrl(value)).toBeUndefined();
  });

  it("rejects empty and malformed values", () => {
    expect(toSafeUrl("  ")).toBeUndefined();
    expect(toSafeUrl(undefined)).toBeUndefined();
  });
});
