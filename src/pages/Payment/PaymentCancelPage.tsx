import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { paymentManager, transactionManager } from "@/services";

export function PaymentCancelPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderCode = query.get("orderCode")?.trim() || "";
  const status = query.get("status")?.trim() || "CANCELLED";
  const [processing, setProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState(
    "Skeleton mode: Chua bat dau xu ly cancel chain."
  );

  useEffect(() => {
    const runCancelChain = async () => {
      if (!orderCode) {
        setResultMessage("Khong co orderCode, bo qua cancel chain o pha skeleton.");
        return;
      }

      setProcessing(true);

      const cancelResult = await paymentManager.cancel(orderCode);
      if (!cancelResult.success) {
        setResultMessage(cancelResult.error || "Khong the cancel payment trong skeleton mode.");
        setProcessing(false);
        return;
      }

      const deleteResult = await transactionManager.delete(orderCode);
      if (!deleteResult.success) {
        setResultMessage(
          deleteResult.error || "Cancel thanh cong, nhung xoa transaction that bai."
        );
        setProcessing(false);
        return;
      }

      setResultMessage("Da thuc thi skeleton chain: cancelPayment -> deleteTransaction.");
      setProcessing(false);
    };

    void runCancelChain();
  }, [orderCode]);

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-rose-50 px-4 py-10 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-amber-200 bg-white p-8 shadow-sm dark:border-amber-900/40 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-['Poppins'] text-2xl font-bold text-amber-700 dark:text-amber-300">
              Thanh toan da bi huy
            </h1>
            <p className="font-['Inter'] text-sm text-slate-500 dark:text-slate-400">
              Skeleton mode: Callback cancel + cancel policy chain.
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
            Trang thai xu ly:{" "}
            <span className="font-semibold">{processing ? "Dang xu ly" : "Hoan tat"}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-['Inter'] text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {resultMessage}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/user?tab=account"
            className="rounded-xl bg-[#0047AB] px-5 py-2.5 font-['Inter'] text-sm font-semibold text-white hover:bg-[#003b8d]">
            Quay lai tai khoan
          </Link>
          <Link
            to="/user?tab=account"
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-['Inter'] text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Thu lai thanh toan
          </Link>
        </div>
      </div>
    </div>
  );
}
