import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  addPaymentSupportLog,
  clearPendingSessionPaymentContext,
  extractTransactionCodeFromUrl,
  getPendingSessionPaymentContext,
  getRecoveryByOrderCode,
  type PaymentRecoveryContext,
  upsertPaymentRecoveryContext,
} from "@/lib";
import { paymentManager } from "@/services/payment.manager";
import { transactionManager } from "@/services/transaction.manager";
import { toast } from "sonner";

type CancelChainResult = "idle" | "success" | "failed" | "missing";

const isNotFoundError = (error?: string): boolean => {
  if (!error) {
    return false;
  }

  const normalized = error.toLowerCase();
  return normalized.includes("not found") || normalized.includes("404");
};

export function PaymentCancelPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderCode = query.get("orderCode")?.trim() || "";
  const queryTransactionCode = query.get("transactionCode")?.trim() || "";
  const status = query.get("status")?.trim() || "CANCELLED";
  const pendingSessionPayment = useMemo(() => getPendingSessionPaymentContext(), []);
  const pendingSessionOrderCode = pendingSessionPayment?.orderCode?.trim() || "";
  const shouldRedirectToPendingSession = Boolean(
    pendingSessionPayment?.sessionId &&
    orderCode &&
    pendingSessionOrderCode &&
    pendingSessionOrderCode === orderCode
  );
  const [processing, setProcessing] = useState(false);
  const [chainResult, setChainResult] = useState<CancelChainResult>("idle");
  const [resultMessage, setResultMessage] = useState("Đang xử lý yêu cầu của bạn...");
  const [recoveryContext, setRecoveryContext] = useState<PaymentRecoveryContext | null>(null);

  const runCancelChain = useCallback(async () => {
    const context = orderCode ? recoveryContext || getRecoveryByOrderCode(orderCode) : null;
    const transactionCodeFromContext = context?.transactionCode?.trim() || "";
    const transactionCodeFromCheckoutUrl = context?.checkoutUrl
      ? extractTransactionCodeFromUrl(context.checkoutUrl)?.trim() || ""
      : "";
    const resolvedTransactionCode =
      queryTransactionCode ||
      transactionCodeFromContext ||
      transactionCodeFromCheckoutUrl ||
      orderCode;

    if (context) {
      const callbackContext = upsertPaymentRecoveryContext({
        supportCode: context.supportCode,
        orderCode,
        transactionCode: resolvedTransactionCode || context.transactionCode,
        userId: context.userId,
        planId: context.planId,
        planName: context.planName,
        amount: context.amount,
        checkoutUrl: context.checkoutUrl,
        status: "CALLBACK_CANCEL",
        note: "Người dùng đã quay về trang hủy thanh toán.",
      });
      setRecoveryContext(callbackContext);

      addPaymentSupportLog({
        supportCode: callbackContext.supportCode,
        orderCode,
        userId: callbackContext.userId,
        planId: callbackContext.planId,
        planName: callbackContext.planName,
        amount: callbackContext.amount,
        status: "CALLBACK_CANCEL",
        message: "Người dùng quay về trang hủy thanh toán.",
        payload: {
          transactionCode: resolvedTransactionCode || null,
          callbackStatus: status,
        },
      });
    }

    if (!resolvedTransactionCode) {
      addPaymentSupportLog({
        status: "UNMAPPED_ORDER",
        message: "Thiếu mã giao dịch để thực hiện hủy thanh toán.",
        payload: {
          orderCode: orderCode || null,
          transactionCode: queryTransactionCode || null,
          status,
        },
      });
      if (context) {
        const failedContext = upsertPaymentRecoveryContext({
          supportCode: context.supportCode,
          orderCode,
          transactionCode: context.transactionCode,
          userId: context.userId,
          planId: context.planId,
          planName: context.planName,
          amount: context.amount,
          checkoutUrl: context.checkoutUrl,
          status: "CANCEL_CHAIN_FAILED",
          note: "Thiếu mã giao dịch để hủy thanh toán.",
        });
        setRecoveryContext(failedContext);
      }
      setChainResult("missing");
      setResultMessage(
        "Không tìm thấy thông tin giao dịch để hủy. Vui lòng thực hiện lại thao tác thanh toán."
      );
      toast.error("Không tìm thấy giao dịch cần hủy.");
      return;
    }

    setProcessing(true);
    setChainResult("idle");

    const cancelResult = await paymentManager.cancel(resolvedTransactionCode);
    if (!cancelResult.success) {
      const log = addPaymentSupportLog({
        supportCode: context?.supportCode || undefined,
        orderCode,
        userId: context?.userId,
        planId: context?.planId,
        planName: context?.planName,
        amount: context?.amount,
        status: "CANCEL_CHAIN_FAILED",
        message: "Hủy thanh toán thất bại.",
        payload: {
          transactionCode: resolvedTransactionCode,
          error: cancelResult.error || null,
        },
      });

      if (context) {
        const failedContext = upsertPaymentRecoveryContext({
          supportCode: log.supportCode || context.supportCode,
          orderCode,
          transactionCode: resolvedTransactionCode,
          userId: context.userId,
          planId: context.planId,
          planName: context.planName,
          amount: context.amount,
          checkoutUrl: context.checkoutUrl,
          status: "CANCEL_CHAIN_FAILED",
          note: cancelResult.error || "Hủy thanh toán thất bại.",
        });
        setRecoveryContext(failedContext);
      }

      setChainResult("failed");
      setResultMessage(
        isNotFoundError(cancelResult.error)
          ? "Không tìm thấy giao dịch cần hủy hoặc giao dịch đã được xử lý trước đó."
          : "Không thể hủy thanh toán lúc này. Vui lòng thử lại sau ít phút."
      );
      setProcessing(false);
      toast.error("Không thể hủy thanh toán.");
      return;
    }

    const deleteResult = await transactionManager.delete(resolvedTransactionCode);
    if (!deleteResult.success) {
      const log = addPaymentSupportLog({
        supportCode: context?.supportCode || undefined,
        orderCode,
        userId: context?.userId,
        planId: context?.planId,
        planName: context?.planName,
        amount: context?.amount,
        status: "CANCEL_CHAIN_FAILED",
        message: "Xóa giao dịch thất bại sau khi hủy thanh toán.",
        payload: {
          transactionCode: resolvedTransactionCode,
          error: deleteResult.error || null,
        },
      });

      if (context) {
        const failedContext = upsertPaymentRecoveryContext({
          supportCode: log.supportCode || context.supportCode,
          orderCode,
          transactionCode: resolvedTransactionCode,
          userId: context.userId,
          planId: context.planId,
          planName: context.planName,
          amount: context.amount,
          checkoutUrl: context.checkoutUrl,
          status: "CANCEL_CHAIN_FAILED",
          note: deleteResult.error || "Xóa giao dịch thất bại.",
        });
        setRecoveryContext(failedContext);
      }

      setChainResult("failed");
      setResultMessage(
        "Thanh toán đã được hủy nhưng hệ thống đang hoàn tất bước cập nhật cuối cùng. Vui lòng thử lại sau."
      );
      setProcessing(false);
      toast.error("Không thể hoàn tất yêu cầu hủy.");
      return;
    }

    addPaymentSupportLog({
      supportCode: context?.supportCode || undefined,
      orderCode,
      userId: context?.userId,
      planId: context?.planId,
      planName: context?.planName,
      amount: context?.amount,
      status: "CANCEL_CHAIN_SUCCESS",
      message: "Đã hủy thanh toán thành công.",
      payload: {
        transactionCode: resolvedTransactionCode,
      },
    });

    if (context) {
      const successContext = upsertPaymentRecoveryContext({
        supportCode: context.supportCode,
        orderCode,
        transactionCode: resolvedTransactionCode,
        userId: context.userId,
        planId: context.planId,
        planName: context.planName,
        amount: context.amount,
        checkoutUrl: context.checkoutUrl,
        status: "CANCEL_CHAIN_SUCCESS",
        note: "Đã hủy thanh toán thành công.",
      });
      setRecoveryContext(successContext);
    }

    setChainResult("success");
    setResultMessage("Yêu cầu hủy thanh toán đã được xử lý thành công.");
    setProcessing(false);
    toast.success("Đã hủy thanh toán thành công.");
  }, [orderCode, queryTransactionCode, recoveryContext, status]);

  useEffect(() => {
    if (!pendingSessionPayment?.sessionId || !orderCode || !pendingSessionOrderCode) {
      return;
    }

    if (pendingSessionOrderCode === orderCode) {
      return;
    }

    addPaymentSupportLog({
      orderCode,
      status: "UNMAPPED_ORDER",
      message: "Bỏ qua phiên thanh toán cũ do mã đơn không trùng khớp.",
      payload: {
        pendingSessionOrderCode,
        callbackOrderCode: orderCode,
      },
    });
    clearPendingSessionPaymentContext();
  }, [orderCode, pendingSessionOrderCode, pendingSessionPayment]);

  useEffect(() => {
    if (!shouldRedirectToPendingSession || !pendingSessionPayment?.sessionId) {
      return;
    }

    const params = new URLSearchParams();
    params.set("payment", "cancelled");
    if (orderCode) {
      params.set("orderCode", orderCode);
    }

    clearPendingSessionPaymentContext();
    window.location.replace(
      `/user/mock-interview/history/${pendingSessionPayment.sessionId}?${params.toString()}`
    );
  }, [orderCode, pendingSessionPayment, shouldRedirectToPendingSession]);

  useEffect(() => {
    if (shouldRedirectToPendingSession) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void runCancelChain();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [runCancelChain, shouldRedirectToPendingSession]);

  if (shouldRedirectToPendingSession) {
    return (
      <div className="min-h-screen bg-linear-to-br from-amber-50 to-rose-50 px-4 py-10 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900/40 dark:bg-slate-900">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          <p className="font-['Inter'] text-sm text-slate-700 dark:text-slate-200">
            Đang quay lại trang chi tiết phiên phỏng vấn...
          </p>
        </div>
      </div>
    );
  }

  const canRetry = !processing && (chainResult === "failed" || chainResult === "missing");

  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-rose-50 px-4 py-10 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-amber-200 bg-white p-8 shadow-sm dark:border-amber-900/40 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-['Poppins'] text-2xl font-bold text-amber-700 dark:text-amber-300">
              Thanh toán đã bị hủy
            </h1>
            <p className="font-['Inter'] text-sm text-slate-500 dark:text-slate-400">
              Chúng tôi đang cập nhật trạng thái thanh toán của bạn.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-['Inter'] text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {processing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang xử lý yêu cầu hủy thanh toán...
            </div>
          ) : (
            resultMessage
          )}
        </div>

        {canRetry && (
          <button
            onClick={() => void runCancelChain()}
            disabled={processing}
            className="w-fit rounded-xl bg-amber-600 px-4 py-2 font-['Inter'] text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
            Thử lại
          </button>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to="/user?tab=account"
            className="rounded-xl bg-[#0047AB] px-5 py-2.5 font-['Inter'] text-sm font-semibold text-white hover:bg-[#003b8d]">
            Quay lại tài khoản
          </Link>
          <Link
            to="/user?tab=account"
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-['Inter'] text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Chọn gói thành viên khác
          </Link>
        </div>
      </div>
    </div>
  );
}
