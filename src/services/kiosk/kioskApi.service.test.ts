import { afterEach, describe, expect, it, vi } from "vitest";
import { enterKioskApi } from "./kioskApi.service";

describe("enterKioskApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a Cloudflare/API timeout instead of treating it as an invalid PIN", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>524: A timeout occurred</html>", {
        status: 524,
        headers: { "content-type": "text/html" },
      })
    );

    await expect(enterKioskApi("588988", 1)).rejects.toThrow(
      "Máy chủ Kiosk phản hồi quá thời gian (524)"
    );
  });

  it("keeps the backend validation message for client errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Mã PIN đã hết hạn" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(enterKioskApi("588988", 1)).rejects.toThrow("Mã PIN đã hết hạn");
  });
});
