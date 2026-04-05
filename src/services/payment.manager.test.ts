import { describe, expect, it } from "vitest";

import { PaymentManager } from "@/services/payment.manager";

describe("PaymentManager skeleton", () => {
  it("returns skeleton payment list", async () => {
    const manager = new PaymentManager();
    const result = await manager.getAll();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("creates payment link and supports cancel by transactionCode", async () => {
    const manager = new PaymentManager();
    const createResult = await manager.create(120000, 101);

    expect(createResult.success).toBe(true);
    expect(createResult.data).toContain("/payment/success");

    const url = new URL(createResult.data || "", "https://inblue.local");
    const transactionCode = url.searchParams.get("orderCode") || "";

    const cancelResult = await manager.cancel(transactionCode);
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.data?.status).toBe("FAILED");
  });
});
