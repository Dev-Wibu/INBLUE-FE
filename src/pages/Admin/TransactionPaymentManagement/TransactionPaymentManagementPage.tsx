import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { PaymentEntity, TransactionEntity } from "@/interfaces";
import { formatCurrency, formatDateTime } from "@/lib/formatting";
import { paymentManager, transactionManager } from "@/services";

type ActiveView = "transactions" | "payments";

const transactionTypeLabel = (value?: boolean) => {
  return value ? "Transfer In" : "Transfer Out";
};

export function TransactionPaymentManagementPage() {
  const [activeView, setActiveView] = useState<ActiveView>("transactions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [payments, setPayments] = useState<PaymentEntity[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [txResult, paymentResult] = await Promise.all([
      transactionManager.getAll(),
      paymentManager.getAll(),
    ]);

    if (!txResult.success || !paymentResult.success) {
      setError(
        txResult.error ||
          paymentResult.error ||
          "Khong the tai du lieu skeleton transaction/payment."
      );
      setTransactions(txResult.data || []);
      setPayments(paymentResult.data || []);
      setLoading(false);
      return;
    }

    setTransactions(txResult.data || []);
    setPayments(paymentResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadData]);

  const transactionCount = transactions.length;
  const paymentCount = payments.length;

  const totalTransactionAmount = useMemo(
    () => transactions.reduce((acc, item) => acc + (item.amount || 0), 0),
    [transactions]
  );

  const totalPaymentAmount = useMemo(
    () => payments.reduce((acc, item) => acc + (item.amount || 0), 0),
    [payments]
  );

  return (
    <div className="min-h-screen bg-white p-8 dark:bg-slate-950">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-['Inter'] text-3xl font-bold text-zinc-800 dark:text-white">
            Transaction va Payment (Skeleton)
          </h1>
          <p className="mt-2 font-['Inter'] text-sm text-slate-600 dark:text-slate-400">
            Khung quan tri read-only cho ADMIN. Pha nay dung mock/stub data, chua ket noi API that.
          </p>
        </div>

        <button
          onClick={() => void loadData()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-['Inter'] text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Tai lai
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-['Inter'] text-xs text-slate-500 dark:text-slate-400">
            Tong giao dich
          </p>
          <p className="mt-1 font-['Poppins'] text-2xl font-bold text-slate-800 dark:text-white">
            {transactionCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-['Inter'] text-xs text-slate-500 dark:text-slate-400">
            Tong thanh toan
          </p>
          <p className="mt-1 font-['Poppins'] text-2xl font-bold text-slate-800 dark:text-white">
            {paymentCount}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-['Inter'] text-xs text-slate-500 dark:text-slate-400">
            Tong so tien giao dich
          </p>
          <p className="mt-1 font-['Poppins'] text-lg font-bold text-slate-800 dark:text-white">
            {formatCurrency(totalTransactionAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="font-['Inter'] text-xs text-slate-500 dark:text-slate-400">
            Tong so tien thanh toan
          </p>
          <p className="mt-1 font-['Poppins'] text-lg font-bold text-slate-800 dark:text-white">
            {formatCurrency(totalPaymentAmount)}
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setActiveView("transactions")}
          className={`rounded-lg px-4 py-2 font-['Inter'] text-sm font-semibold transition-colors ${
            activeView === "transactions"
              ? "bg-[#0047AB] text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}>
          Transactions
        </button>

        <button
          onClick={() => setActiveView("payments")}
          className={`rounded-lg px-4 py-2 font-['Inter'] text-sm font-semibold transition-colors ${
            activeView === "payments"
              ? "bg-[#0047AB] text-white"
              : "border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          }`}>
          Payments
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-['Inter'] text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        {activeView === "transactions" ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    CreatedAt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {transactions.map((tx) => (
                  <tr key={`${tx.transactionCode}-${tx.id}`}>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {tx.transactionCode || "-"}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {tx.description || "-"}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {formatCurrency(tx.amount || 0)}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {transactionTypeLabel(tx.transactionType)}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {formatDateTime(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-['Inter'] text-xs font-semibold text-slate-600 uppercase dark:text-slate-300">
                    CreatedAt
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {payments.map((payment) => (
                  <tr key={`${payment.transactionCode}-${payment.id}`}>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {payment.transactionCode || "-"}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {payment.description || "-"}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {formatCurrency(payment.amount || 0)}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {payment.status || "-"}
                    </td>
                    <td className="px-4 py-3 font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
                      {formatDateTime(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && activeView === "transactions" && transactions.length === 0 && (
          <div className="px-4 py-8 text-center font-['Inter'] text-sm text-slate-500 dark:text-slate-400">
            Chua co transaction skeleton.
          </div>
        )}

        {!loading && activeView === "payments" && payments.length === 0 && (
          <div className="px-4 py-8 text-center font-['Inter'] text-sm text-slate-500 dark:text-slate-400">
            Chua co payment skeleton.
          </div>
        )}
      </div>
    </div>
  );
}
