import { fetchClient } from "@/lib/api";

export interface JdPurchase {
  id: number;
  userId: number;
  jdId: number;
  paymentId: number;
  status: "PURCHASED" | "USED";
  purchasedAt: string;
  usedAt: string | null;
}

function extractCheckoutUrl(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    let trimmed = payload.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        trimmed = JSON.parse(trimmed);
      } catch {
        trimmed = trimmed.slice(1, -1);
      }
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
  }

  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    const direct =
      (typeof record.checkoutUrl === "string" && record.checkoutUrl) ||
      (typeof record.paymentUrl === "string" && record.paymentUrl) ||
      (typeof record.redirectUrl === "string" && record.redirectUrl) ||
      (typeof record.url === "string" && record.url) ||
      (typeof record.link === "string" && record.link) ||
      (typeof record.data === "string" && record.data);

    if (direct && (direct.startsWith("http://") || direct.startsWith("https://"))) {
      return direct;
    }

    if (record.data && typeof record.data === "object") {
      return extractCheckoutUrl(record.data);
    }
  }

  return undefined;
}

export const jdPurchaseManager = {
  /**
   * Check if candidate has purchased JD package (not yet used)
   * GET /api/jd-purchases/check?jdId={jdId}
   */
  async checkPurchased(jdId: number): Promise<boolean> {
    try {
      const response = await fetchClient.GET("/api/jd-purchases/check", {
        params: {
          query: { jdId },
        },
      });
      return Boolean(response.data);
    } catch {
      return false;
    }
  },

  /**
   * Get list of JD purchases for current user
   * GET /api/jd-purchases/me
   */
  async getMyPurchases(): Promise<JdPurchase[]> {
    try {
      const response = await fetchClient.GET("/api/jd-purchases/me", {});
      return (response.data as JdPurchase[]) || [];
    } catch {
      return [];
    }
  },

  /**
   * Initialize PayOS payment for JD package
   * POST /api/payments/pay?jdId={jdId}
   */
  async createPayment(jdId: number): Promise<string> {
    try {
      const response = await fetchClient.POST("/api/payments/pay", {
        params: {
          query: { jdId },
        },
        parseAs: "text",
      });

      const url = extractCheckoutUrl(response.data);
      if (url) {
        return url;
      }
    } catch {
      // Ignore text parse errors and attempt fallback
    }

    const response = await fetchClient.POST("/api/payments/pay", {
      params: {
        query: { jdId },
      },
    });

    const url = extractCheckoutUrl(response.data);
    if (!url) {
      throw new Error("No payment checkout URL received from PayOS");
    }

    return url;
  },
};
