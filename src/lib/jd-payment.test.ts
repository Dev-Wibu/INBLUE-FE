import { describe, expect, it, vi } from "vitest";
import {
  buildJdPurchaseReturnPath,
  clearPendingJdPurchase,
  getJdPurchaseReturnPath,
  getPendingJdPurchaseId,
  PENDING_JD_PURCHASE_ID_KEY,
  PENDING_JD_PURCHASE_RETURN_KEY,
  rememberPendingJdPurchase,
} from "./jd-payment";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

describe("JD payment navigation", () => {
  it("stores the pending JD and candidate Job Search return path", () => {
    const storage = createStorage();

    rememberPendingJdPurchase(60, storage);

    expect(storage.setItem).toHaveBeenCalledWith(PENDING_JD_PURCHASE_ID_KEY, "60");
    expect(storage.setItem).toHaveBeenCalledWith(
      PENDING_JD_PURCHASE_RETURN_KEY,
      "/user?tab=jobSearch&jobId=60"
    );
  });

  it("prefers a callback jdId and rejects invalid identifiers", () => {
    const storage = createStorage({ [PENDING_JD_PURCHASE_ID_KEY]: "41" });

    expect(getPendingJdPurchaseId("?jdId=60", storage)).toBe(60);
    expect(getPendingJdPurchaseId("?jdId=invalid", storage)).toBeNull();
  });

  it("never restores a return path for a different JD", () => {
    const storage = createStorage({
      [PENDING_JD_PURCHASE_RETURN_KEY]: "/user?tab=jobSearch&jobId=41",
    });

    expect(getJdPurchaseReturnPath(60, storage)).toBe(buildJdPurchaseReturnPath(60));
  });

  it("clears both pending payment keys", () => {
    const storage = createStorage();

    clearPendingJdPurchase(storage);

    expect(storage.removeItem).toHaveBeenCalledWith(PENDING_JD_PURCHASE_ID_KEY);
    expect(storage.removeItem).toHaveBeenCalledWith(PENDING_JD_PURCHASE_RETURN_KEY);
  });
});
