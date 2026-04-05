import type { ApiResponse, PaymentEntity } from "@/interfaces";

import { MANAGER_MODE } from "@/constants/api.config";

const SKELETON_REDIRECT_BASE = "/payment";

let mockPayments: PaymentEntity[] = [
  {
    id: 9001,
    amount: 199000,
    description: "Thanh toan goi PREMIUM (skeleton)",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    transactionCode: "PAY-SKEL-9001",
  },
  {
    id: 9002,
    amount: 99000,
    description: "Thanh toan goi BASIC (skeleton)",
    status: "PENDING",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    transactionCode: "PAY-SKEL-9002",
  },
];

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeAmount = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value);
};

const buildPaymentCode = (): string => {
  return `PAY-SKEL-${Date.now().toString(36).toUpperCase()}`;
};

export class PaymentManager {
  private mode = MANAGER_MODE;

  private getSkeletonRedirectUrl(transactionCode: string): string {
    const query = new URLSearchParams({
      orderCode: transactionCode,
      status: "PAID",
      source: "payment-skeleton",
      mode: this.mode,
    });

    return `${SKELETON_REDIRECT_BASE}/success?${query.toString()}`;
  }

  async getAll(): Promise<ApiResponse<PaymentEntity[]>> {
    await delay();
    return {
      success: true,
      data: [...mockPayments],
      message: "Skeleton mode: chua ket noi API that cho payment.",
    };
  }

  async getById(id: number): Promise<ApiResponse<PaymentEntity>> {
    await delay();

    const item = mockPayments.find((payment) => payment.id === id);
    if (!item) {
      return {
        success: false,
        error: "Khong tim thay payment trong skeleton store.",
      };
    }

    return {
      success: true,
      data: item,
    };
  }

  async getByTransactionCode(transactionCode: string): Promise<ApiResponse<PaymentEntity>> {
    await delay();

    const item = mockPayments.find((payment) => payment.transactionCode === transactionCode);
    if (!item) {
      return {
        success: false,
        error: "Khong tim thay payment theo transactionCode.",
      };
    }

    return {
      success: true,
      data: item,
    };
  }

  async create(amount: number, userId: number): Promise<ApiResponse<string>> {
    await delay();

    const normalizedAmount = normalizeAmount(amount);
    if (normalizedAmount <= 0) {
      return {
        success: false,
        error: "So tien thanh toan khong hop le.",
      };
    }

    const transactionCode = buildPaymentCode();
    mockPayments = [
      {
        id: Date.now(),
        amount: normalizedAmount,
        description: `Tao thanh toan PayOS (skeleton) cho user ${userId}`,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        transactionCode,
      },
      ...mockPayments,
    ];

    return {
      success: true,
      data: this.getSkeletonRedirectUrl(transactionCode),
      message: "Skeleton mode: da tao link thanh toan gia lap.",
    };
  }

  async cancel(transactionCode: string): Promise<ApiResponse<PaymentEntity>> {
    await delay();

    const existing = mockPayments.find((payment) => payment.transactionCode === transactionCode);

    if (existing) {
      existing.status = "FAILED";
      return {
        success: true,
        data: existing,
        message: "Skeleton mode: da cap nhat payment sang FAILED.",
      };
    }

    const fallbackItem: PaymentEntity = {
      id: Date.now(),
      amount: 0,
      description: "Cancel payment fallback (skeleton)",
      status: "FAILED",
      createdAt: new Date().toISOString(),
      transactionCode,
    };

    mockPayments = [fallbackItem, ...mockPayments];

    return {
      success: true,
      data: fallbackItem,
      message: "Skeleton mode: khong tim thay payment cu, da tao ban ghi fallback.",
    };
  }
}

export const paymentManager = new PaymentManager();
