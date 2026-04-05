import { CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

type SkeletonPaymentContext = {
  planId?: number;
  planName?: string;
  userId?: number;
  amount?: number;
  createdAt?: string;
};

const SKELETON_PAYMENT_CONTEXT_KEY = "inblue.payment-context";

const getPaymentContext = (): SkeletonPaymentContext | null => {
  try {
    const raw = sessionStorage.getItem(SKELETON_PAYMENT_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SkeletonPaymentContext;
  } catch {
    return null;
  }
};

export function PaymentSuccessPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderCode = query.get("orderCode")?.trim() || "";
  const status = query.get("status")?.trim() || "PAID";
  const source = query.get("source")?.trim() || "skeleton";
  const context = useMemo(() => getPaymentContext(), []);

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 to-blue-50 px-4 py-10 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-['Poppins'] text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              Thanh toan thanh cong
            </h1>
            <p className="font-['Inter'] text-sm text-slate-500 dark:text-slate-400">
              Skeleton mode: Da nhan callback va hien thi thong tin thanh toan.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
            OrderCode: <span className="font-semibold">{orderCode || "Khong co"}</span>
          </p>
          <p className="font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
            Status: <span className="font-semibold">{status}</span>
          </p>
          <p className="font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
            Source: <span className="font-semibold">{source}</span>
          </p>
        </div>

        {context && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/10">
            <p className="mb-1 font-['Inter'] text-sm font-semibold text-blue-700 dark:text-blue-300">
              Context da luu truoc redirect
            </p>
            <div className="grid gap-1 font-['Inter'] text-xs text-blue-700/90 dark:text-blue-300/90">
              <p>Plan: {context.planName || "-"}</p>
              <p>PlanId: {context.planId ?? "-"}</p>
              <p>UserId: {context.userId ?? "-"}</p>
              <p>Amount: {context.amount ?? "-"}</p>
            </div>
          </div>
        )}

        {!orderCode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-['Inter'] text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
            Callback thieu orderCode. Pha skeleton van cho phep tiep tuc de test UI.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to="/user?tab=account"
            className="rounded-xl bg-[#0047AB] px-5 py-2.5 font-['Inter'] text-sm font-semibold text-white hover:bg-[#003b8d]">
            Ve trang tai khoan
          </Link>
          <Link
            to={
              orderCode
                ? `/payment/cancel?orderCode=${encodeURIComponent(orderCode)}&status=CANCELLED`
                : "/payment/cancel?status=CANCELLED"
            }
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-['Inter'] text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Mo phong callback huy
          </Link>
        </div>
      </div>
    </div>
  );
}
