import type { ApiResponse, TransactionEntity } from "@/interfaces";

import { MANAGER_MODE } from "@/constants/api.config";

const SKELETON_REDIRECT_BASE = "/payment";

let mockTransactions: TransactionEntity[] = [
  {
    id: 1001,
    amount: 199000,
    description: "Thanh toan goi PREMIUM (skeleton)",
    transactionCode: "TXN-SKEL-1001",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    transactionType: false,
    currentBalance: 1200000,
  },
  {
    id: 1002,
    amount: 500000,
    description: "Nap vi qua PayOS (skeleton)",
    transactionCode: "TXN-SKEL-1002",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    transactionType: true,
    currentBalance: 1700000,
  },
];

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeAmount = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.round(value);
};

const buildTransactionCode = (): string => {
  return `TXN-SKEL-${Date.now().toString(36).toUpperCase()}`;
};

export class TransactionManager {
  private mode = MANAGER_MODE;

  private getSkeletonRedirectUrl(transactionCode: string, status: "PAID" | "CANCELLED"): string {
    const query = new URLSearchParams({
      orderCode: transactionCode,
      status,
      source: "transaction-skeleton",
      mode: this.mode,
    });

    return `${SKELETON_REDIRECT_BASE}/${status === "PAID" ? "success" : "cancel"}?${query.toString()}`;
  }

  async getAll(): Promise<ApiResponse<TransactionEntity[]>> {
    await delay();
    return {
      success: true,
      data: [...mockTransactions],
      message: "Skeleton mode: chua ket noi API that cho giao dich.",
    };
  }

  async getByTransactionCode(transactionCode: string): Promise<ApiResponse<TransactionEntity>> {
    await delay();

    const item = mockTransactions.find((tx) => tx.transactionCode === transactionCode);
    if (!item) {
      return {
        success: false,
        error: "Khong tim thay giao dich trong skeleton store.",
      };
    }

    return {
      success: true,
      data: item,
    };
  }

  async getByUserId(userId: number): Promise<ApiResponse<TransactionEntity[]>> {
    await delay();
    return {
      success: true,
      data: [...mockTransactions],
      message: `Skeleton mode: danh sach giao dich mo phong cho user ${userId}.`,
    };
  }

  async transferIn(amount: number, userId: number): Promise<ApiResponse<string>> {
    await delay();

    const normalizedAmount = normalizeAmount(amount);
    if (normalizedAmount <= 0) {
      return {
        success: false,
        error: "So tien nap vi khong hop le.",
      };
    }

    const transactionCode = buildTransactionCode();
    const currentBalance = (mockTransactions[0]?.currentBalance || 0) + normalizedAmount;

    mockTransactions = [
      {
        id: Date.now(),
        amount: normalizedAmount,
        description: `Nap vi (skeleton transfer-in) cho user ${userId}`,
        transactionCode,
        createdAt: new Date().toISOString(),
        transactionType: true,
        currentBalance,
      },
      ...mockTransactions,
    ];

    return {
      success: true,
      data: this.getSkeletonRedirectUrl(transactionCode, "PAID"),
      message: "Skeleton mode: da tao link thanh toan gia lap transfer-in.",
    };
  }

  async transferOut(amount: number, userId: number): Promise<ApiResponse<string>> {
    await delay();

    const normalizedAmount = normalizeAmount(amount);
    if (normalizedAmount <= 0) {
      return {
        success: false,
        error: "So tien thanh toan khong hop le.",
      };
    }

    const currentBalance = mockTransactions[0]?.currentBalance || 0;
    if (currentBalance < normalizedAmount) {
      return {
        success: false,
        error: "So du vi khong du de thanh toan.",
      };
    }

    const transactionCode = buildTransactionCode();
    mockTransactions = [
      {
        id: Date.now(),
        amount: normalizedAmount,
        description: `Thanh toan tu vi (skeleton transfer-out) cho user ${userId}`,
        transactionCode,
        createdAt: new Date().toISOString(),
        transactionType: false,
        currentBalance: currentBalance - normalizedAmount,
      },
      ...mockTransactions,
    ];

    return {
      success: true,
      data: this.getSkeletonRedirectUrl(transactionCode, "PAID"),
      message: "Skeleton mode: da tao ket qua thanh toan gia lap transfer-out.",
    };
  }

  async delete(transactionCode: string): Promise<ApiResponse<void>> {
    await delay();

    mockTransactions = mockTransactions.filter((tx) => tx.transactionCode !== transactionCode);

    return {
      success: true,
      message: "Skeleton mode: da xoa giao dich (neu co) theo transactionCode.",
    };
  }
}

export const transactionManager = new TransactionManager();
