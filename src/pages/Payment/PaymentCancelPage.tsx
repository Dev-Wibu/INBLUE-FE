import { Spinner } from "@/components/ui/spinner";
import type { PaymentPurpose } from "@/interfaces";
import {
  addPaymentSupportLog,
  clearPendingSessionPaymentContext,
  getCallbackIdentifierMismatch,
  getLatestRecoveryForSessionPayment,
  getLatestRecoveryForUser,
  getLatestRecoveryForUserByPurpose,
  getPendingSessionPaymentContext,
  getRecoveryByCheckoutToken,
  getRecoveryByOrderCode,
  getRecoveryByTransactionCode,
  isLowConfidenceRecoverySource,
  resolveCancelTransactionCode,
  upsertPaymentRecoveryContext,
  type PaymentRecoveryContext,
  type PaymentRecoveryLookupSource,
} from "@/lib";
import i18n from "@/lib/i18n";
import { paymentManager } from "@/services/payment.manager";
import { transactionManager } from "@/services/transaction.manager";
import { useAuthStore } from "@/stores/authStore";
import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
const t = i18n.t.bind(i18n);
type CancelChainResult = "idle" | "success" | "failed" | "missing";
interface RunCancelChainOptions {
  forceCallbackFirst?: boolean;
  triggeredByRetry?: boolean;
}
const isIdempotentHandledError = (error?: string): boolean => {
  if (!error) {
    return false;
  }
  const normalized = error.toLowerCase();
  return (
    normalized.includes("not found") ||
    normalized.includes("404") ||
    normalized.includes("already") ||
    normalized.includes(t("payment_paymentcancelpage.tsx.a_uoc_xu_ly")) ||
    normalized.includes("da duoc xu ly") ||
    normalized.includes(t("payment_paymentcancelpage.tsx.a_huy")) ||
    normalized.includes("da huy") ||
    normalized.includes("processed")
  );
};
const getCancelPrimaryRedirect = (
  purpose?: PaymentPurpose,
  sessionId?: number
): {
  to: string;
  label: string;
} => {
  switch (purpose) {
    case "MENTOR_INTERVIEW":
      if (sessionId) {
        return {
          to: `/user/mock-interview/history/${sessionId}`,
          label: t("payment_paymentcancelpage.tsx.xem_chi_tiet_phien"),
        };
      }
      return {
        to: "/user?tab=interviewHistory",
        label: t("common.viewInterviewHistory"),
      };
    case "TOP_UP_WALLET":
    case "WITHDRAW_FROM_WALLET":
      return {
        to: "/user?tab=account&subtab=wallet",
        label: t("payment_paymentsuccesspage.tsx.en_vi_cua_toi"),
      };
    case "BUY_MEMBERSHIP":
    default:
      return {
        to: "/user?tab=account",
        label: t("payment_paymentsuccesspage.tsx.quay_lai_tai_khoan"),
      };
  }
};
export function PaymentCancelPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const orderCode = query.get("orderCode")?.trim() || "";
  const queryTransactionCode =
    query.get("transactionCode")?.trim() || query.get("transaction_code")?.trim() || "";
  const callbackCheckoutToken =
    query.get("id")?.trim() ||
    query.get("checkoutId")?.trim() ||
    query.get("checkout_id")?.trim() ||
    "";
  const cancelQueryFlag = query.get("cancel")?.trim() || "";
  const status = query.get("status")?.trim() || "CANCELLED";
  const currentUserId = Number(user?.id || 0);
  const pendingSessionPayment = useMemo(
    () => getPendingSessionPaymentContext(currentUserId || undefined),
    [currentUserId]
  );
  const [processing, setProcessing] = useState(false);
  const [chainResult, setChainResult] = useState<CancelChainResult>("idle");
  const [resultMessage, setResultMessage] = useState(
    t("payment_paymentcancelpage.tsx.ang_xu_ly_yeu_cau_cua_ban")
  );
  const [recoveryContext, setRecoveryContext] = useState<PaymentRecoveryContext | null>(null);
  const recoveryContextRef = useRef<PaymentRecoveryContext | null>(null);
  const inFlightTransactionCodeRef = useRef<string | null>(null);
  const handledTransactionCodesRef = useRef<Set<string>>(new Set());
  const autoRunKeyRef = useRef("");
  useEffect(() => {
    recoveryContextRef.current = recoveryContext;
  }, [recoveryContext]);
  const autoRunKey = useMemo(
    () =>
      [
        String(currentUserId || 0),
        orderCode,
        queryTransactionCode,
        callbackCheckoutToken,
        cancelQueryFlag,
        status,
        String(pendingSessionPayment?.sessionId || ""),
        pendingSessionPayment?.transactionCode || "",
      ].join("|"),
    [
      callbackCheckoutToken,
      cancelQueryFlag,
      currentUserId,
      orderCode,
      pendingSessionPayment?.sessionId,
      pendingSessionPayment?.transactionCode,
      queryTransactionCode,
      status,
    ]
  );
  const runCancelChain = useCallback(
    async (options?: RunCancelChainOptions) => {
      const userIdFilter = currentUserId > 0 ? currentUserId : undefined;
      let context: PaymentRecoveryContext | null = recoveryContextRef.current;
      let recoverySource: PaymentRecoveryLookupSource = context ? "existing-state" : "none";
      if (!context && orderCode) {
        context = getRecoveryByOrderCode(orderCode, userIdFilter);
        if (!context && !userIdFilter) {
          context = getRecoveryByOrderCode(orderCode);
        }
        if (context) {
          recoverySource = "order-code";
        }
      }
      if (!context && queryTransactionCode) {
        context = getRecoveryByTransactionCode(queryTransactionCode, userIdFilter);
        if (!context && !userIdFilter) {
          context = getRecoveryByTransactionCode(queryTransactionCode);
        }
        if (context) {
          recoverySource = "query-transaction-code";
        }
      }
      if (!context && callbackCheckoutToken) {
        context = getRecoveryByCheckoutToken(callbackCheckoutToken, userIdFilter);
        if (!context && !userIdFilter) {
          context = getRecoveryByCheckoutToken(callbackCheckoutToken);
        }
        if (context) {
          recoverySource = "callback-checkout-token";
        }
      }
      if (!context && pendingSessionPayment?.checkoutToken) {
        context = getRecoveryByCheckoutToken(pendingSessionPayment.checkoutToken, userIdFilter);
        if (context) {
          recoverySource = "pending-checkout-token";
        }
      }
      if (!context && pendingSessionPayment?.transactionCode) {
        context = getRecoveryByTransactionCode(pendingSessionPayment.transactionCode, userIdFilter);
        if (context) {
          recoverySource = "pending-transaction-code";
        }
      }
      if (!context && pendingSessionPayment?.sessionId) {
        context = getLatestRecoveryForSessionPayment(pendingSessionPayment.sessionId, userIdFilter);
        if (context) {
          recoverySource = "session-recovery";
        }
      }
      if (
        !context &&
        currentUserId > 0 &&
        pendingSessionPayment?.paymentPurpose === "MENTOR_INTERVIEW"
      ) {
        context = getLatestRecoveryForUserByPurpose(currentUserId, "MENTOR_INTERVIEW");
        if (context) {
          recoverySource = "purpose-recovery";
        }
      }
      if (!context && currentUserId > 0) {
        context = getLatestRecoveryForUser(currentUserId);
        if (context) {
          recoverySource = "latest-user-recovery";
        }
      }
      const hasStrongCallbackIdentifier = Boolean(
        orderCode || queryTransactionCode || callbackCheckoutToken
      );
      if (options?.forceCallbackFirst && hasStrongCallbackIdentifier && context) {
        addPaymentSupportLog({
          supportCode: context.supportCode,
          orderCode: orderCode || context.orderCode,
          transactionCode: queryTransactionCode || context.transactionCode,
          checkoutToken: callbackCheckoutToken || context.checkoutToken,
          userId: context.userId,
          paymentPurpose: context.paymentPurpose,
          sessionId: context.sessionId,
          status: "UNMAPPED_ORDER",
          message: t("payment_paymentcancelpage.tsx.retry_callback_first_bo_qua_context_cu_v"),
          payload: {
            recoverySource,
            retry: true,
          },
        });
        context = null;
        recoverySource = "none";
      }
      if (context && hasStrongCallbackIdentifier && isLowConfidenceRecoverySource(recoverySource)) {
        addPaymentSupportLog({
          supportCode: context.supportCode,
          orderCode: orderCode || context.orderCode,
          transactionCode: queryTransactionCode || context.transactionCode,
          checkoutToken: callbackCheckoutToken || context.checkoutToken,
          userId: context.userId,
          paymentPurpose: context.paymentPurpose,
          sessionId: context.sessionId,
          status: "UNMAPPED_ORDER",
          message: t("payment_paymentcancelpage.tsx.bo_qua_recovery_context_co_o_tin_cay_tha"),
          payload: {
            recoverySource,
          },
        });
        context = null;
        recoverySource = "none";
      }
      const identifierMismatch = getCallbackIdentifierMismatch(
        {
          orderCode,
          transactionCode: queryTransactionCode,
          checkoutToken: callbackCheckoutToken,
        },
        context
      );
      if (identifierMismatch.hasMismatch) {
        if (hasStrongCallbackIdentifier) {
          addPaymentSupportLog({
            supportCode: context?.supportCode || undefined,
            orderCode: orderCode || context?.orderCode || undefined,
            transactionCode: queryTransactionCode || context?.transactionCode || undefined,
            checkoutToken: callbackCheckoutToken || context?.checkoutToken || undefined,
            userId: context?.userId || currentUserId || undefined,
            paymentPurpose: context?.paymentPurpose,
            sessionId: context?.sessionId,
            status: "UNMAPPED_ORDER",
            message: t("payment_paymentcancelpage.tsx.callback_co_inh_danh_hop_le_nhung_contex"),
            payload: {
              recoverySource,
              mismatchedKeys: identifierMismatch.mismatchedKeys,
              retry: options?.triggeredByRetry || false,
            },
          });
          context = null;
          recoverySource = "none";
        } else {
          addPaymentSupportLog({
            supportCode: context?.supportCode || undefined,
            orderCode: orderCode || context?.orderCode || undefined,
            transactionCode: queryTransactionCode || context?.transactionCode || undefined,
            checkoutToken: callbackCheckoutToken || context?.checkoutToken || undefined,
            userId: context?.userId || currentUserId || undefined,
            paymentPurpose: context?.paymentPurpose,
            sessionId: context?.sessionId,
            status: "UNMAPPED_ORDER",
            message: t("payment_paymentcancelpage.tsx.inh_danh_callback_khong_khop_voi_recover"),
            payload: {
              recoverySource,
              mismatchedKeys: identifierMismatch.mismatchedKeys,
            },
          });
          setChainResult("missing");
          setResultMessage(
            t("payment_paymentcancelpage.tsx.khong_the_oi_chieu_giao_dich_can_huy_vui")
          );
          toast.error(t("payment_paymentcancelpage.tsx.khong_the_oi_chieu_giao_dich_can_huy"));
          if (pendingSessionPayment?.sessionId && context?.paymentPurpose !== "MENTOR_INTERVIEW") {
            clearPendingSessionPaymentContext();
          }
          return;
        }
      }
      const resolvedOrderCode = orderCode || context?.orderCode || "";
      const shouldIgnorePendingTransactionCode =
        hasStrongCallbackIdentifier && Boolean(orderCode) && !context;
      const transactionCodeResolution = resolveCancelTransactionCode({
        queryTransactionCode,
        contextTransactionCode: context?.transactionCode,
        pendingTransactionCode: shouldIgnorePendingTransactionCode
          ? undefined
          : pendingSessionPayment?.transactionCode,
        orderCode,
        callbackCheckoutToken,
        status,
        cancelFlag: cancelQueryFlag,
      });
      const resolvedTransactionCode = transactionCodeResolution.value;
      const resolvedCheckoutToken =
        callbackCheckoutToken ||
        context?.checkoutToken ||
        pendingSessionPayment?.checkoutToken ||
        undefined;
      const resolvedPurpose =
        context?.paymentPurpose ||
        (pendingSessionPayment?.paymentPurpose as PaymentPurpose | undefined);
      const resolvedSessionId = context?.sessionId || pendingSessionPayment?.sessionId;
      if (context) {
        const callbackContext = upsertPaymentRecoveryContext({
          supportCode: context.supportCode,
          orderCode: resolvedOrderCode || context.orderCode,
          transactionCode: resolvedTransactionCode || context.transactionCode,
          checkoutToken: resolvedCheckoutToken || context.checkoutToken,
          userId: context.userId,
          planId: context.planId,
          planName: context.planName,
          amount: context.amount,
          paymentPurpose: resolvedPurpose,
          sessionId: resolvedSessionId,
          checkoutUrl: context.checkoutUrl,
          status: "CALLBACK_CANCEL",
          note: t("payment_paymentcancelpage.tsx.nguoi_dung_a_quay_ve_trang_huy_thanh_toa"),
        });
        setRecoveryContext(callbackContext);
        addPaymentSupportLog({
          supportCode: callbackContext.supportCode,
          orderCode: callbackContext.orderCode,
          transactionCode: callbackContext.transactionCode,
          checkoutToken: callbackContext.checkoutToken,
          userId: callbackContext.userId,
          planId: callbackContext.planId,
          planName: callbackContext.planName,
          amount: callbackContext.amount,
          paymentPurpose: callbackContext.paymentPurpose,
          sessionId: callbackContext.sessionId,
          status: "CALLBACK_CANCEL",
          message: t("payment_paymentcancelpage.tsx.nguoi_dung_quay_ve_trang_huy_thanh_toan"),
          payload: {
            callbackStatus: status,
            recoverySource,
            transactionCodeSource: transactionCodeResolution.source,
            usedOrderCodeFallback: transactionCodeResolution.usedOrderCodeFallback,
            retry: options?.triggeredByRetry || false,
          },
        });
      }
      if (!resolvedTransactionCode) {
        addPaymentSupportLog({
          supportCode: context?.supportCode || undefined,
          orderCode: resolvedOrderCode || undefined,
          checkoutToken: resolvedCheckoutToken,
          userId: context?.userId || currentUserId || undefined,
          paymentPurpose: resolvedPurpose,
          sessionId: resolvedSessionId,
          status: "UNMAPPED_ORDER",
          message: t("payment_paymentcancelpage.tsx.thieu_ma_giao_dich_e_thuc_hien_huy_thanh"),
          payload: {
            status,
            recoverySource,
            transactionCodeSource: transactionCodeResolution.source,
            usedOrderCodeFallback: transactionCodeResolution.usedOrderCodeFallback,
            retry: options?.triggeredByRetry || false,
          },
        });
        if (context) {
          const failedContext = upsertPaymentRecoveryContext({
            supportCode: context.supportCode,
            orderCode: resolvedOrderCode || context.orderCode,
            transactionCode: context.transactionCode,
            checkoutToken: resolvedCheckoutToken || context.checkoutToken,
            userId: context.userId,
            planId: context.planId,
            planName: context.planName,
            amount: context.amount,
            paymentPurpose: resolvedPurpose,
            sessionId: resolvedSessionId,
            checkoutUrl: context.checkoutUrl,
            status: "CANCEL_CHAIN_FAILED",
            note: t("payment_paymentcancelpage.tsx.thieu_ma_giao_dich_e_huy_thanh_toan"),
          });
          setRecoveryContext(failedContext);
        }
        setChainResult("missing");
        setResultMessage(
          t("payment_paymentcancelpage.tsx.khong_tim_thay_thong_tin_giao_dich_e_huy")
        );
        toast.error(t("payment_paymentcancelpage.tsx.khong_tim_thay_giao_dich_can_huy"));
        if (pendingSessionPayment?.sessionId && resolvedPurpose !== "MENTOR_INTERVIEW") {
          clearPendingSessionPaymentContext();
        }
        return;
      }
      if (inFlightTransactionCodeRef.current === resolvedTransactionCode) {
        return;
      }
      if (handledTransactionCodesRef.current.has(resolvedTransactionCode)) {
        setChainResult("success");
        setResultMessage(t("payment_paymentcancelpage.tsx.giao_dich_nay_a_uoc_huy_truoc_o"));
        return;
      }
      inFlightTransactionCodeRef.current = resolvedTransactionCode;
      setProcessing(true);
      setChainResult("idle");
      try {
        const cancelResult = await paymentManager.cancel(resolvedTransactionCode);
        const cancelHandled = cancelResult.success || isIdempotentHandledError(cancelResult.error);
        if (!cancelHandled) {
          const log = addPaymentSupportLog({
            supportCode: context?.supportCode || undefined,
            orderCode: resolvedOrderCode || undefined,
            transactionCode: resolvedTransactionCode,
            checkoutToken: resolvedCheckoutToken,
            userId: context?.userId || currentUserId || undefined,
            planId: context?.planId,
            planName: context?.planName,
            amount: context?.amount,
            paymentPurpose: resolvedPurpose,
            sessionId: resolvedSessionId,
            status: "CANCEL_CHAIN_FAILED",
            message: t("payment_paymentcancelpage.tsx.huy_thanh_toan_that_bai"),
            payload: {
              error: cancelResult.error || null,
              recoverySource,
              transactionCodeSource: transactionCodeResolution.source,
              usedOrderCodeFallback: transactionCodeResolution.usedOrderCodeFallback,
            },
          });
          if (context) {
            const failedContext = upsertPaymentRecoveryContext({
              supportCode: log.supportCode || context.supportCode,
              orderCode: resolvedOrderCode || context.orderCode,
              transactionCode: resolvedTransactionCode,
              checkoutToken: resolvedCheckoutToken || context.checkoutToken,
              userId: context.userId,
              planId: context.planId,
              planName: context.planName,
              amount: context.amount,
              paymentPurpose: resolvedPurpose,
              sessionId: resolvedSessionId,
              checkoutUrl: context.checkoutUrl,
              status: "CANCEL_CHAIN_FAILED",
              note:
                cancelResult.error || t("payment_paymentcancelpage.tsx.huy_thanh_toan_that_bai"),
            });
            setRecoveryContext(failedContext);
          }
          setChainResult("failed");
          setResultMessage(
            t("payment_paymentcancelpage.tsx.khong_the_huy_thanh_toan_luc_nay_vui_lon")
          );
          toast.error(t("payment_paymentcancelpage.tsx.khong_the_huy_thanh_toan"));
          if (pendingSessionPayment?.sessionId && resolvedPurpose !== "MENTOR_INTERVIEW") {
            clearPendingSessionPaymentContext();
          }
          return;
        }
        const deleteResult = await transactionManager.delete(resolvedTransactionCode);
        const deleteHandled = deleteResult.success || isIdempotentHandledError(deleteResult.error);
        if (!deleteHandled) {
          const log = addPaymentSupportLog({
            supportCode: context?.supportCode || undefined,
            orderCode: resolvedOrderCode || undefined,
            transactionCode: resolvedTransactionCode,
            checkoutToken: resolvedCheckoutToken,
            userId: context?.userId || currentUserId || undefined,
            planId: context?.planId,
            planName: context?.planName,
            amount: context?.amount,
            paymentPurpose: resolvedPurpose,
            sessionId: resolvedSessionId,
            status: "CANCEL_CHAIN_FAILED",
            message: t("payment_paymentcancelpage.tsx.xoa_giao_dich_that_bai_sau_khi_huy_thanh"),
            payload: {
              error: deleteResult.error || null,
              recoverySource,
              transactionCodeSource: transactionCodeResolution.source,
              usedOrderCodeFallback: transactionCodeResolution.usedOrderCodeFallback,
            },
          });
          if (context) {
            const failedContext = upsertPaymentRecoveryContext({
              supportCode: log.supportCode || context.supportCode,
              orderCode: resolvedOrderCode || context.orderCode,
              transactionCode: resolvedTransactionCode,
              checkoutToken: resolvedCheckoutToken || context.checkoutToken,
              userId: context.userId,
              planId: context.planId,
              planName: context.planName,
              amount: context.amount,
              paymentPurpose: resolvedPurpose,
              sessionId: resolvedSessionId,
              checkoutUrl: context.checkoutUrl,
              status: "CANCEL_CHAIN_FAILED",
              note: deleteResult.error || t("payment_paymentcancelpage.tsx.xoa_giao_dich_that_bai"),
            });
            setRecoveryContext(failedContext);
          }
          setChainResult("failed");
          setResultMessage(
            t("payment_paymentcancelpage.tsx.thanh_toan_a_uoc_huy_nhung_he_thong_ang_")
          );
          toast.error(t("payment_paymentcancelpage.tsx.khong_the_hoan_tat_yeu_cau_huy"));
          if (pendingSessionPayment?.sessionId && resolvedPurpose !== "MENTOR_INTERVIEW") {
            clearPendingSessionPaymentContext();
          }
          return;
        }
        handledTransactionCodesRef.current.add(resolvedTransactionCode);
        addPaymentSupportLog({
          supportCode: context?.supportCode || undefined,
          orderCode: resolvedOrderCode || undefined,
          transactionCode: resolvedTransactionCode,
          checkoutToken: resolvedCheckoutToken,
          userId: context?.userId || currentUserId || undefined,
          planId: context?.planId,
          planName: context?.planName,
          amount: context?.amount,
          paymentPurpose: resolvedPurpose,
          sessionId: resolvedSessionId,
          status: "CANCEL_CHAIN_SUCCESS",
          message:
            cancelResult.success && deleteResult.success
              ? t("payment_paymentcancelpage.tsx.a_huy_thanh_toan_thanh_cong")
              : t("payment_paymentcancelpage.tsx.giao_dich_a_uoc_xu_ly_truoc_o"),
          payload:
            cancelResult.success && deleteResult.success
              ? undefined
              : {
                  cancelError: cancelResult.error || null,
                  deleteError: deleteResult.error || null,
                  idempotentHandled: true,
                  recoverySource,
                  transactionCodeSource: transactionCodeResolution.source,
                  usedOrderCodeFallback: transactionCodeResolution.usedOrderCodeFallback,
                },
        });
        const successUserId =
          context?.userId || Number(cancelResult.data?.user?.id) || currentUserId;
        if (successUserId > 0) {
          const successContext = upsertPaymentRecoveryContext({
            supportCode: context?.supportCode,
            orderCode: resolvedOrderCode || context?.orderCode || resolvedTransactionCode,
            transactionCode: resolvedTransactionCode,
            checkoutToken: resolvedCheckoutToken || context?.checkoutToken,
            userId: successUserId,
            planId: context?.planId,
            planName: context?.planName,
            amount: context?.amount,
            paymentPurpose: resolvedPurpose || cancelResult.data?.paymentPurpose,
            sessionId: resolvedSessionId,
            checkoutUrl: context?.checkoutUrl,
            status: "CANCEL_CHAIN_SUCCESS",
            note: t("payment_paymentcancelpage.tsx.a_huy_thanh_toan_thanh_cong"),
          });
          setRecoveryContext(successContext);
        }
        setChainResult("success");
        setResultMessage(
          t("payment_paymentcancelpage.tsx.yeu_cau_huy_thanh_toan_a_uoc_xu_ly_thanh")
        );
        toast.success(t("payment_paymentcancelpage.tsx.a_huy_thanh_toan_thanh_cong"));
        if (pendingSessionPayment?.sessionId) {
          clearPendingSessionPaymentContext();
        }
      } finally {
        inFlightTransactionCodeRef.current = null;
        setProcessing(false);
      }
    },

    [
      callbackCheckoutToken,
      cancelQueryFlag,
      currentUserId,
      orderCode,
      pendingSessionPayment,
      queryTransactionCode,
      status,
      t,
    ]
  );
  useEffect(() => {
    if (autoRunKeyRef.current === autoRunKey) {
      return;
    }
    autoRunKeyRef.current = autoRunKey;
    const timerId = window.setTimeout(() => {
      void runCancelChain();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoRunKey, runCancelChain]);
  const canRetry = !processing && (chainResult === "failed" || chainResult === "missing");
  const resolvedPurpose =
    recoveryContext?.paymentPurpose ||
    (pendingSessionPayment?.paymentPurpose as PaymentPurpose | undefined);
  const resolvedSessionId = recoveryContext?.sessionId || pendingSessionPayment?.sessionId;
  const primaryRedirect = getCancelPrimaryRedirect(resolvedPurpose, resolvedSessionId);
  return (
    <div className="min-h-screen bg-linear-to-br from-amber-50 to-rose-50 px-4 py-10 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-2xl border border-amber-200 bg-white p-8 shadow-sm dark:border-amber-900/40 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-['Poppins'] text-2xl font-bold text-amber-700 dark:text-amber-300">
              {t("payment_paymentcancelpage.tsx.thanh_toan_a_bi_huy")}
            </h1>
            <p className="font-['Inter'] text-sm text-slate-500 dark:text-slate-400">
              {t("payment_paymentcancelpage.tsx.chung_toi_ang_cap_nhat_trang_thai_thanh_")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-['Inter'] text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {processing ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" tone="muted" />
              {t("payment_paymentcancelpage.tsx.ang_xu_ly_yeu_cau_huy_thanh_toan")}
            </div>
          ) : (
            resultMessage
          )}
        </div>

        {canRetry && (
          <button
            onClick={() =>
              void runCancelChain({
                forceCallbackFirst: true,
                triggeredByRetry: true,
              })
            }
            disabled={processing}
            className="w-fit rounded-xl bg-amber-600 px-4 py-2 font-['Inter'] text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
            {t("common.retry")}
          </button>
        )}

        <div className="flex flex-wrap gap-3">
          <Link
            to={primaryRedirect.to}
            className="rounded-xl bg-[#0047AB] px-5 py-2.5 font-['Inter'] text-sm font-semibold text-white hover:bg-[#003b8d]">
            {primaryRedirect.label}
          </Link>
          {resolvedPurpose === "BUY_MEMBERSHIP" && (
            <Link
              to="/user?tab=account"
              className="rounded-xl border border-slate-300 px-5 py-2.5 font-['Inter'] text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {t("payment_paymentsuccesspage.tsx.chon_goi_thanh_vien_khac")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
