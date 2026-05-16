import { Plus, Wallet as WalletIcon } from "lucide-react";

import { formatCurrency } from "@/lib/formatting";

interface WalletTabProps {
  balance: number;
  isTopUpLoading: boolean;
  topUpAmount: string;
  minTopUp: number;
  maxTopUp: number;
  step: number;
  presetAmounts: number[];
  onTopUpAmountChange: (_value: string) => void;
  onTopUp: (_amount: number) => void;
}

export function WalletTab({
  balance,
  isTopUpLoading,
  topUpAmount,
  minTopUp,
  maxTopUp,
  step,
  presetAmounts,
  onTopUpAmountChange,
  onTopUp,
}: WalletTabProps) {
  const amountValue = Number(topUpAmount || 0);
  const isAmountValid =
    Number.isFinite(amountValue) &&
    amountValue >= minTopUp &&
    amountValue <= maxTopUp &&
    amountValue % step === 0;

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-[#0047AB]/20 bg-linear-to-r from-[#0047AB] to-[#007BFF] p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <WalletIcon className="h-5 w-5" />
              </div>
              <span className="font-['Inter'] text-base font-semibold">Ví INBLUE</span>
            </div>
            <p className="mt-3 font-['Inter'] text-xs tracking-wide text-white/70 uppercase">
              Số dư hiện tại
            </p>
            <p className="font-['Poppins'] text-3xl font-bold">{formatCurrency(balance)}</p>
          </div>
          <div className="hidden rounded-2xl bg-white/10 px-4 py-3 text-right text-xs text-white/70 sm:block">
            Số dư sẽ được cập nhật ngay sau khi thanh toán thành công.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0px_6px_20px_0px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-['Inter'] text-lg font-semibold text-slate-900 dark:text-white">
              Nạp tiền vào ví
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chọn mệnh giá nhanh hoặc nhập số tiền tùy chỉnh.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              onClick={() => onTopUpAmountChange(String(preset))}
              disabled={isTopUpLoading}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                Number(topUpAmount) === preset
                  ? "border-[#0047AB] bg-[#DCEEFF] text-[#0047AB]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              } disabled:cursor-not-allowed disabled:opacity-60`}>
              {preset.toLocaleString("vi-VN")}đ
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="text"
            inputMode="numeric"
            value={topUpAmount}
            onChange={(event) => onTopUpAmountChange(event.target.value)}
            placeholder="Nhập số tiền muốn nạp"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#0047AB] focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
          <button
            onClick={() => onTopUp(amountValue)}
            disabled={!isAmountValid || isTopUpLoading}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0047AB] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#003d99] disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />
            {isTopUpLoading ? "Đang tạo link..." : "Nạp tiền"}
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Số tiền hợp lệ: {minTopUp.toLocaleString("vi-VN")}đ - {maxTopUp.toLocaleString("vi-VN")}
          đ, bước nhảy {step.toLocaleString("vi-VN")}đ.
        </p>
      </div>
    </div>
  );
}
