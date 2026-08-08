import { Spinner } from "@/components/ui/spinner";
import type { PaymentPurpose, UserSubscriptionResponse } from "@/interfaces";
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
  type PaymentRecoveryContext,
  type PaymentRecoveryLookupSource,
  upsertPaymentRecoveryContext,
} from "@/lib";
import { cn } from "@/lib/utils";
import { userManager } from "@/services";
import { jdPurchaseManager } from "@/services/jd-purchase.manager";
import { useAuthStore } from "@/stores/authStore";
import canvasConfetti from "canvas-confetti";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  PartyPopper,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
type ResolveState = "checking" | "ready" | "unmapped" | "subscribing" | "subscribed";
const ACTIVATED_ORDERS_STORAGE_KEY = "inblue.payment.activated-orders";
const isPaidStatus = (status: string): boolean => {
  const normalized = status.trim().toUpperCase();
  return normalized === "PAID" || normalized === "SUCCESS" || normalized === "COMPLETED";
};
export function PaymentSuccessPage() {
  const { t } = useTranslation();

  const isAlreadySubscribedError = useCallback(
    (error?: string): boolean => {
      if (!error) {
        return false;
      }
      const normalized = error.toLowerCase();
      return (
        normalized.includes("409") ||
        normalized.includes("conflict") ||
        normalized.includes("already") ||
        normalized.includes(t("paymentPaymentsuccesspage.activated")) ||
        normalized.includes("da kich hoat") ||
        normalized.includes("already active") ||
        normalized.includes("already subscribed")
      );
    },
    [t]
  );

  const getActivatedOrderCodes = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(ACTIVATED_ORDERS_STORAGE_KEY);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return new Set();
      }
      return new Set(
        parsed
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
      );
    } catch {
      return new Set();
    }
  }, []);

  const markOrderAsActivated = useCallback(
    (orderCode: string): void => {
      const normalized = orderCode.trim();
      if (!normalized) {
        return;
      }
      const next = getActivatedOrderCodes();
      next.add(normalized);
      localStorage.setItem(ACTIVATED_ORDERS_STORAGE_KEY, JSON.stringify([...next]));
    },
    [getActivatedOrderCodes]
  );

  const getSuccessSubtitle = (purpose?: PaymentPurpose): string => {
    switch (purpose) {
      case "FULLY_PAID":
        return t("adminDashboardoverview.system");
      case "MENTOR_INTERVIEW":
        return t("adminDashboardoverview.system");
      default:
        return t("adminDashboardoverview.system");
    }
  };

  const pendingJdId = useMemo(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const queryJdId = queryParams.get("jdId");
    const storedJdId = localStorage.getItem("pending_jd_purchase_id");
    const parsed = Number(queryJdId || storedJdId);
    return parsed && !isNaN(parsed) ? parsed : null;
  }, []);

  const getPrimaryRedirect = (
    purpose?: PaymentPurpose
  ): {
    to: string;
    label: string;
  } => {
    if (pendingJdId) {
      return {
        to: `/enterprise/job/${pendingJdId}`,
        label: t("payment.returnToJobPosition", "Quay lại trang vị trí việc làm"),
      };
    }

    switch (purpose) {
      case "MENTOR_INTERVIEW":
        return {
          to: "/user?tab=interviewHistory",
          label: t("common.viewInterviewHistory"),
        };
      case "FULLY_PAID":
      default:
        return {
          to: "/user?tab=account",
          label: t("common.returnToAccount"),
        };
    }
  };
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
  const status = query.get("status")?.trim() || "PAID";
  const source = query.get("source")?.trim() || "callback";
  const paid = isPaidStatus(status);
  const currentUserId = Number(user?.id || 0);
  const pendingSessionPayment = useMemo(
    () => getPendingSessionPaymentContext(currentUserId || undefined),
    [currentUserId]
  );
  // JD purchase poll states (separate from subscription resolve states)
  const [jdPollStatus, setJdPollStatus] = useState<"checking" | "success" | "pending">("checking");
  const [resolveState, setResolveState] = useState<ResolveState>("checking");
  const [resolveError, setResolveError] = useState<string>("");
  const [subscribeError, setSubscribeError] = useState<string>("");
  const [recoveryContext, setRecoveryContext] = useState<PaymentRecoveryContext | null>(null);
  const [subscription, setSubscription] = useState<UserSubscriptionResponse | null>(null);
  const [isKnownActivatedOrder, setIsKnownActivatedOrder] = useState(false);
  const [autoSubscribeKey, setAutoSubscribeKey] = useState<string>("");
  const autoResolveKeyRef = useRef("");
  const resolveInFlightRef = useRef(false);
  const resolveExecutionKey = useMemo(
    () =>
      [
        String(currentUserId || 0),
        orderCode,
        queryTransactionCode,
        callbackCheckoutToken,
        status,
        source,
        String(pendingSessionPayment?.sessionId || ""),
        pendingSessionPayment?.transactionCode || "",
        pendingSessionPayment?.checkoutToken || "",
      ].join("|"),
    [
      callbackCheckoutToken,
      currentUserId,
      orderCode,
      pendingSessionPayment?.checkoutToken,
      pendingSessionPayment?.sessionId,
      pendingSessionPayment?.transactionCode,
      queryTransactionCode,
      source,
      status,
    ]
  );
  const loadActiveSubscription = useCallback(
    async (userId: number): Promise<UserSubscriptionResponse | null> => {
      const subscriptionResult = await userManager.getActiveSubscription(userId);
      if (subscriptionResult.success && subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
        setSubscribeError("");
        return subscriptionResult.data;
      }
      setSubscribeError(
        subscriptionResult.error || t("paymentPaymentsuccesspage.packageActivatedButCannotLoad")
      );
      return null;
    },

    [t]
  );
  const handleResolveOrder = useCallback(async () => {
    // JD purchase flow is handled separately via polling — skip subscription resolve
    if (pendingJdId) {
      return;
    }
    if (resolveInFlightRef.current) {
      return;
    }
    resolveInFlightRef.current = true;
    try {
      setSubscribeError("");
      setSubscription(null);
      setResolveError("");
      setRecoveryContext(null);
      if (!currentUserId) {
        addPaymentSupportLog({
          orderCode,
          transactionCode: queryTransactionCode || undefined,
          checkoutToken: callbackCheckoutToken || undefined,
          status: "UNMAPPED_ORDER",
          message: t("paymentPaymentsuccesspage.userSessionNotFoundWhen"),
          payload: {
            source,
            status,
            paid,
          },
        });
        setResolveState("unmapped");
        setResolveError(t("general.anErrorHasOccurredPlease"));
        return;
      }
      const hasAnyIdentifier = Boolean(
        orderCode ||
        queryTransactionCode ||
        callbackCheckoutToken ||
        pendingSessionPayment?.checkoutToken ||
        pendingSessionPayment?.transactionCode ||
        pendingSessionPayment?.sessionId
      );
      if (!hasAnyIdentifier) {
        addPaymentSupportLog({
          userId: currentUserId,
          status: "UNMAPPED_ORDER",
          message: t("paymentPaymentsuccesspage.callbackSuccessNoIdentity"),
          payload: {
            source,
            status,
            paid,
          },
        });
        setResolveState("unmapped");
        setResolveError(t("general.anErrorHasOccurredPlease"));
        return;
      }
      setResolveState("checking");
      let nextContext: PaymentRecoveryContext | null = null;
      let recoverySource: PaymentRecoveryLookupSource = "none";
      if (orderCode) {
        nextContext = getRecoveryByOrderCode(orderCode, currentUserId);
        if (nextContext) {
          recoverySource = "order-code";
        }
      }
      if (!nextContext && queryTransactionCode) {
        nextContext = getRecoveryByTransactionCode(queryTransactionCode, currentUserId);
        if (nextContext) {
          recoverySource = "query-transaction-code";
        }
      }
      if (!nextContext && callbackCheckoutToken) {
        nextContext = getRecoveryByCheckoutToken(callbackCheckoutToken, currentUserId);
        if (nextContext) {
          recoverySource = "callback-checkout-token";
        }
      }
      if (!nextContext && pendingSessionPayment?.checkoutToken) {
        nextContext = getRecoveryByCheckoutToken(
          pendingSessionPayment.checkoutToken,
          currentUserId
        );
        if (nextContext) {
          recoverySource = "pending-checkout-token";
        }
      }
      if (!nextContext && pendingSessionPayment?.transactionCode) {
        nextContext = getRecoveryByTransactionCode(
          pendingSessionPayment.transactionCode,
          currentUserId
        );
        if (nextContext) {
          recoverySource = "pending-transaction-code";
        }
      }
      if (!nextContext && pendingSessionPayment?.sessionId) {
        nextContext = getLatestRecoveryForSessionPayment(
          pendingSessionPayment.sessionId,
          currentUserId
        );
        if (nextContext) {
          recoverySource = "session-recovery";
        }
      }
      if (!nextContext && pendingSessionPayment?.paymentPurpose === "MENTOR_INTERVIEW") {
        nextContext = getLatestRecoveryForUserByPurpose(currentUserId, "MENTOR_INTERVIEW");
        if (nextContext) {
          recoverySource = "purpose-recovery";
        }
      }
      if (!nextContext) {
        nextContext = getLatestRecoveryForUser(currentUserId);
        if (nextContext) {
          recoverySource = "latest-user-recovery";
        }
      }
      if (!nextContext) {
        addPaymentSupportLog({
          orderCode,
          transactionCode: queryTransactionCode || undefined,
          checkoutToken: callbackCheckoutToken || undefined,
          userId: currentUserId,
          status: "UNMAPPED_ORDER",
          message: t("paymentPaymentsuccesspage.noRecoveryContextFoundFor"),
          payload: {
            source,
            status,
            paid,
            pendingSessionPayment,
          },
        });
        setResolveState("unmapped");
        setResolveError(t("paymentPaymentsuccesspage.noMatchingTransactionInformationFound"));
        return;
      }
      const identifierMismatch = getCallbackIdentifierMismatch(
        {
          orderCode,
          transactionCode: queryTransactionCode,
          checkoutToken: callbackCheckoutToken,
        },
        nextContext
      );
      if (identifierMismatch.hasMismatch) {
        addPaymentSupportLog({
          supportCode: nextContext.supportCode,
          orderCode: orderCode || nextContext.orderCode,
          transactionCode: queryTransactionCode || nextContext.transactionCode,
          checkoutToken: callbackCheckoutToken || nextContext.checkoutToken,
          userId: currentUserId,
          paymentPurpose: nextContext.paymentPurpose,
          sessionId: nextContext.sessionId,
          status: "UNMAPPED_ORDER",
          message: t("paymentPaymentsuccesspage.identityCallbackSuccessMismatch"),
          payload: {
            recoverySource,
            mismatchedKeys: identifierMismatch.mismatchedKeys,
            source,
            status,
          },
        });
        setResolveState("unmapped");
        setResolveError(t("general.anErrorHasOccurredPlease"));
        return;
      }
      const hasStrongCallbackIdentifier = Boolean(
        orderCode || queryTransactionCode || callbackCheckoutToken
      );
      if (hasStrongCallbackIdentifier && isLowConfidenceRecoverySource(recoverySource)) {
        addPaymentSupportLog({
          supportCode: nextContext.supportCode,
          orderCode: orderCode || nextContext.orderCode,
          transactionCode: queryTransactionCode || nextContext.transactionCode,
          checkoutToken: callbackCheckoutToken || nextContext.checkoutToken,
          userId: currentUserId,
          paymentPurpose: nextContext.paymentPurpose,
          sessionId: nextContext.sessionId,
          status: "UNMAPPED_ORDER",
          message: t("paymentPaymentsuccesspage.callbackSuccessOnlyMappedLatest"),
          payload: {
            recoverySource,
            source,
            status,
          },
        });
        setResolveState("unmapped");
        setResolveError(t("general.anErrorHasOccurredPlease"));
        return;
      }
      if (nextContext.userId !== currentUserId) {
        addPaymentSupportLog({
          supportCode: nextContext.supportCode,
          orderCode,
          transactionCode: queryTransactionCode || undefined,
          checkoutToken: callbackCheckoutToken || undefined,
          userId: currentUserId,
          paymentPurpose: nextContext.paymentPurpose,
          sessionId: nextContext.sessionId,
          status: "UNMAPPED_ORDER",
          message: t("adminTransactionpaymentmanagement.transaction"),
          payload: {
            expectedUserId: nextContext.userId,
            actualUserId: currentUserId,
            source,
            status,
            recoverySource,
          },
        });
        setResolveState("unmapped");
        setResolveError(t("adminSessionmanagement.paymentInformation"));
        return;
      }
      const resolvedOrderCode = orderCode || nextContext.orderCode;
      const resolvedTransactionCode =
        queryTransactionCode ||
        nextContext.transactionCode ||
        pendingSessionPayment?.transactionCode;
      const resolvedCheckoutToken =
        callbackCheckoutToken || nextContext.checkoutToken || pendingSessionPayment?.checkoutToken;
      const resolvedPurpose =
        nextContext.paymentPurpose ||
        (pendingSessionPayment?.paymentPurpose as PaymentPurpose | undefined);
      const resolvedSessionId = nextContext.sessionId || pendingSessionPayment?.sessionId;
      const callbackStatus =
        paid && nextContext.status === "SUBSCRIBE_SUCCESS"
          ? "SUBSCRIBE_SUCCESS"
          : paid
            ? "CALLBACK_SUCCESS"
            : "UNMAPPED_ORDER";
      const updatedContext = upsertPaymentRecoveryContext({
        supportCode: nextContext.supportCode,
        orderCode: resolvedOrderCode,
        transactionCode: resolvedTransactionCode,
        checkoutToken: resolvedCheckoutToken,
        userId: nextContext.userId,
        planId: nextContext.planId,
        planName: nextContext.planName,
        amount: nextContext.amount,
        paymentPurpose: resolvedPurpose,
        sessionId: resolvedSessionId,
        checkoutUrl: nextContext.checkoutUrl,
        status: callbackStatus,
        note: paid
          ? t("paymentPaymentsuccesspage.theSuccessCallbackIsValid")
          : t("paymentPaymentsuccesspage.callbackReturnsInvalidPaymentStatus"),
      });
      addPaymentSupportLog({
        supportCode: updatedContext.supportCode,
        orderCode: updatedContext.orderCode,
        transactionCode: updatedContext.transactionCode,
        checkoutToken: updatedContext.checkoutToken,
        userId: updatedContext.userId,
        planId: updatedContext.planId,
        planName: updatedContext.planName,
        amount: updatedContext.amount,
        paymentPurpose: updatedContext.paymentPurpose,
        sessionId: updatedContext.sessionId,
        status: callbackStatus,
        message: paid
          ? t("paymentPaymentsuccesspage.callbackConfirmedSuccessfully")
          : t("paymentPaymentsuccesspage.theCallbackHasTransactionData"),
        payload: {
          source,
          status,
          paid,
          recoverySource,
        },
      });
      setRecoveryContext(updatedContext);
      const normalizedOrderCode = (updatedContext.orderCode || "").trim();
      setIsKnownActivatedOrder(
        updatedContext.status === "SUBSCRIBE_SUCCESS" ||
          (normalizedOrderCode.length > 0 && getActivatedOrderCodes().has(normalizedOrderCode))
      );
      if (!paid) {
        setResolveState("unmapped");
        setResolveError(t("general.paymentHasnTBeenConfirmed"));
        return;
      }
      if (updatedContext.paymentPurpose === "MENTOR_INTERVIEW") {
        const targetSessionId = updatedContext.sessionId || pendingSessionPayment?.sessionId;
        if (targetSessionId) {
          const params = new URLSearchParams();
          params.set("payment", "success");
          if (updatedContext.orderCode) {
            params.set("orderCode", updatedContext.orderCode);
          }
          clearPendingSessionPaymentContext();
          window.location.replace(
            `/user/mock-interview/history/${targetSessionId}?${params.toString()}`
          );
          return;
        }
        setResolveError(t("paymentPaymentsuccesspage.paymentConfirmedNotFound"));
      }
      if (
        pendingSessionPayment?.sessionId &&
        updatedContext.paymentPurpose !== "MENTOR_INTERVIEW"
      ) {
        clearPendingSessionPaymentContext();
      }
      setResolveState("ready");
    } finally {
      resolveInFlightRef.current = false;
    }
  }, [
    callbackCheckoutToken,
    currentUserId,
    getActivatedOrderCodes,
    orderCode,
    paid,
    pendingJdId,
    pendingSessionPayment,
    queryTransactionCode,
    source,
    status,
    t,
  ]);
  useEffect(() => {
    // Skip subscription resolve flow entirely for JD purchases
    if (pendingJdId) return;
    if (autoResolveKeyRef.current === resolveExecutionKey) {
      return;
    }
    autoResolveKeyRef.current = resolveExecutionKey;
    const timerId = window.setTimeout(() => {
      void handleResolveOrder();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [handleResolveOrder, pendingJdId, resolveExecutionKey]);

  // Polling for JD Purchase confirmation from PayOS webhook (per fe_guideline.md)
  useEffect(() => {
    if (!pendingJdId) return;

    setJdPollStatus("checking");
    let attempts = 0;
    const maxAttempts = 20; // ~60s để đợi webhook xử lý

    const pollInterval = setInterval(() => {
      attempts++;
      void jdPurchaseManager.checkPurchased(pendingJdId).then((isSuccess) => {
        if (isSuccess) {
          clearInterval(pollInterval);
          localStorage.removeItem("pending_jd_purchase_id");
          setJdPollStatus("success");
          toast.success(
            t("payment.purchaseJdSuccess", "Mua gói JD thành công! Bạn có thể nộp đơn ngay.")
          );
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setJdPollStatus("pending");
          toast.warning(
            t(
              "payment.paymentPendingWebhook",
              "Thanh toán đang được hệ thống xác nhận. Vui lòng kiểm tra lại sau ít phút."
            )
          );
        }
      });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pendingJdId, t]);

  const handleRetryJdCheck = useCallback(() => {
    if (!pendingJdId) return;
    setJdPollStatus("checking");
    void jdPurchaseManager.checkPurchased(pendingJdId).then((isSuccess) => {
      if (isSuccess) {
        localStorage.removeItem("pending_jd_purchase_id");
        setJdPollStatus("success");
        toast.success(
          t("payment.purchaseJdSuccess", "Mua gói JD thành công! Bạn có thể nộp đơn ngay.")
        );
      } else {
        setJdPollStatus("pending");
      }
    });
  }, [pendingJdId, t]);
  const handleConfirmSubscribe = useCallback(async () => {
    if (!recoveryContext || resolveState === "subscribing") {
      return;
    }
    if (!currentUserId) {
      setSubscribeError(t("errorUnauthorizedpage.youNeedToLogIn"));
      return;
    }
    if (recoveryContext.userId !== currentUserId) {
      setSubscribeError(t("paymentPaymentsuccesspage.unableToActivatePackageFor"));
      return;
    }
    if (recoveryContext.paymentPurpose !== "FULLY_PAID") {
      setSubscribeError(t("adminTransactionpaymentmanagement.transaction"));
      return;
    }
    if (!recoveryContext.planId) {
      setSubscribeError(t("paymentPaymentsuccesspage.noMembershipPackageToActivate"));
      return;
    }
    if (!paid) {
      setSubscribeError(t("common.pay"));
      return;
    }
    const activationOrderCode = (recoveryContext.orderCode || "").trim();
    if (resolveState === "subscribed" || (activationOrderCode && isKnownActivatedOrder)) {
      setResolveState("subscribed");
      setSubscribeError("");
      toast.info(t("paymentPaymentsuccesspage.packageActivatedPreviously"));
      await loadActiveSubscription(recoveryContext.userId);
      return;
    }
    setResolveState("subscribing");
    setSubscribeError("");
    const subscribeResult = await userManager.subscribePlan(
      recoveryContext.userId,
      recoveryContext.planId
    );
    if (!subscribeResult.success) {
      if (isAlreadySubscribedError(subscribeResult.error)) {
        const latestSubscription = await loadActiveSubscription(recoveryContext.userId);
        const updatedContext = upsertPaymentRecoveryContext({
          supportCode: recoveryContext.supportCode,
          orderCode: recoveryContext.orderCode,
          transactionCode: recoveryContext.transactionCode,
          checkoutToken: recoveryContext.checkoutToken,
          userId: recoveryContext.userId,
          planId: recoveryContext.planId,
          planName: recoveryContext.planName,
          amount: recoveryContext.amount,
          paymentPurpose: recoveryContext.paymentPurpose,
          sessionId: recoveryContext.sessionId,
          checkoutUrl: recoveryContext.checkoutUrl,
          status: "SUBSCRIBE_SUCCESS",
          note: t("paymentPaymentsuccesspage.packageActivatedPreviously2"),
        });
        addPaymentSupportLog({
          supportCode: updatedContext.supportCode,
          orderCode: updatedContext.orderCode,
          transactionCode: updatedContext.transactionCode,
          checkoutToken: updatedContext.checkoutToken,
          userId: updatedContext.userId,
          planId: updatedContext.planId,
          planName: updatedContext.planName,
          amount: updatedContext.amount,
          paymentPurpose: updatedContext.paymentPurpose,
          sessionId: updatedContext.sessionId,
          status: "SUBSCRIBE_SUCCESS",
          message: t("paymentPaymentsuccesspage.backendReportedPackageActivatedPreviously"),
          payload: {
            duplicateSubscribe: true,
            error: subscribeResult.error || null,
            subscriptionSnapshot: latestSubscription,
          },
        });
        setRecoveryContext(updatedContext);
        if (activationOrderCode) {
          markOrderAsActivated(activationOrderCode);
          setIsKnownActivatedOrder(true);
        }
        setResolveState("subscribed");
        setSubscribeError("");
        toast.info(t("paymentPaymentsuccesspage.packageActivatedPreviously"));
        return;
      }
      const updatedContext = upsertPaymentRecoveryContext({
        supportCode: recoveryContext.supportCode,
        orderCode: recoveryContext.orderCode,
        transactionCode: recoveryContext.transactionCode,
        checkoutToken: recoveryContext.checkoutToken,
        userId: recoveryContext.userId,
        planId: recoveryContext.planId,
        planName: recoveryContext.planName,
        amount: recoveryContext.amount,
        paymentPurpose: recoveryContext.paymentPurpose,
        sessionId: recoveryContext.sessionId,
        checkoutUrl: recoveryContext.checkoutUrl,
        status: "SUBSCRIBE_FAILED",
        note: subscribeResult.error || t("paymentPaymentsuccesspage.subscribeFailed"),
      });
      addPaymentSupportLog({
        supportCode: updatedContext.supportCode,
        orderCode: updatedContext.orderCode,
        transactionCode: updatedContext.transactionCode,
        checkoutToken: updatedContext.checkoutToken,
        userId: updatedContext.userId,
        planId: updatedContext.planId,
        planName: updatedContext.planName,
        amount: updatedContext.amount,
        paymentPurpose: updatedContext.paymentPurpose,
        sessionId: updatedContext.sessionId,
        status: "SUBSCRIBE_FAILED",
        message: t("adminDashboardoverview.system"),
        payload: {
          error: subscribeResult.error || null,
        },
      });
      setRecoveryContext(updatedContext);
      setResolveState("ready");
      setSubscribeError(
        subscribeResult.error || t("paymentPaymentsuccesspage.packageActivationFailedPleaseTry")
      );
      toast.error(subscribeResult.error || t("paymentPaymentsuccesspage.packageActivationFailed"));
      return;
    }
    const latestSubscription = await loadActiveSubscription(recoveryContext.userId);
    const updatedContext = upsertPaymentRecoveryContext({
      supportCode: recoveryContext.supportCode,
      orderCode: recoveryContext.orderCode,
      transactionCode: recoveryContext.transactionCode,
      checkoutToken: recoveryContext.checkoutToken,
      userId: recoveryContext.userId,
      planId: recoveryContext.planId,
      planName: recoveryContext.planName,
      amount: recoveryContext.amount,
      paymentPurpose: recoveryContext.paymentPurpose,
      sessionId: recoveryContext.sessionId,
      checkoutUrl: recoveryContext.checkoutUrl,
      status: "SUBSCRIBE_SUCCESS",
      note: "Subscribe thanh cong tu callback success page.",
    });
    addPaymentSupportLog({
      supportCode: updatedContext.supportCode,
      orderCode: updatedContext.orderCode,
      transactionCode: updatedContext.transactionCode,
      checkoutToken: updatedContext.checkoutToken,
      userId: updatedContext.userId,
      planId: updatedContext.planId,
      planName: updatedContext.planName,
      amount: updatedContext.amount,
      paymentPurpose: updatedContext.paymentPurpose,
      sessionId: updatedContext.sessionId,
      status: "SUBSCRIBE_SUCCESS",
      message: t("adminDashboardoverview.system"),
      payload: {
        subscriptionSnapshot: latestSubscription,
      },
    });
    setRecoveryContext(updatedContext);
    if (activationOrderCode) {
      markOrderAsActivated(activationOrderCode);
      setIsKnownActivatedOrder(true);
    }
    setResolveState("subscribed");
    toast.success(t("general.successfullyActivatedPlan"));
  }, [
    currentUserId,
    isAlreadySubscribedError,
    isKnownActivatedOrder,
    loadActiveSubscription,
    markOrderAsActivated,
    paid,
    recoveryContext,
    resolveState,
    t,
  ]);
  useEffect(() => {
    if (
      resolveState !== "ready" ||
      !recoveryContext ||
      !paid ||
      recoveryContext.paymentPurpose !== "FULLY_PAID"
    ) {
      return;
    }
    if (recoveryContext.status === "SUBSCRIBE_SUCCESS") {
      setResolveState("subscribed");
      return;
    }
    const key = (recoveryContext.orderCode || recoveryContext.supportCode || "").trim();
    if (!key || autoSubscribeKey === key) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setAutoSubscribeKey(key);
      void handleConfirmSubscribe();
    }, 0);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoSubscribeKey, handleConfirmSubscribe, paid, recoveryContext, resolveState]);
  const resolvedPurpose = recoveryContext?.paymentPurpose;
  const successSubtitle = getSuccessSubtitle(resolvedPurpose);
  const primaryRedirect = getPrimaryRedirect(resolvedPurpose);
  const subscribeKey = (recoveryContext?.orderCode || recoveryContext?.supportCode || "").trim();
  const canRetrySubscribe =
    resolvedPurpose === "FULLY_PAID" &&
    resolveState === "ready" &&
    !!recoveryContext &&
    subscribeKey.length > 0 &&
    autoSubscribeKey === subscribeKey;

  // 🎉 Fire confetti when activation succeeds
  useEffect(() => {
    if (resolveState !== "subscribed") return;
    const duration = 2500;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 9999,
      colors: ["#10b981", "#34d399", "#fbbf24", "#f59e0b", "#22d3ee", "#a78bfa"],
    };
    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        window.clearInterval(interval);
        return;
      }
      const particleCount = 50 * (timeLeft / duration);
      canvasConfetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.3, y: Math.random() - 0.2 },
      });
      canvasConfetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.4 + 0.6, y: Math.random() - 0.2 },
      });
    }, 250);
    // Initial big burst
    canvasConfetti({
      ...defaults,
      particleCount: 120,
      origin: { y: 0.6 },
    });
    return () => window.clearInterval(interval);
  }, [resolveState]);
  // ──────────────────────────────────────────────────────────────────────────
  // JD Purchase Success UI (completely separate from subscription flow)
  // Per fe_guideline.md: poll /api/jd-purchases/check, show status, then back
  // ──────────────────────────────────────────────────────────────────────────
  if (pendingJdId) {
    return (
      <div className="payment-success-page relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-amber-50/40 to-sky-50 px-4 py-10 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
        {/* Background decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
        <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

        <div className="payment-success-card relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border-2 border-emerald-200/70 bg-white/80 p-8 text-center shadow-2xl shadow-emerald-500/10 backdrop-blur-md sm:p-10 dark:border-emerald-500/30 dark:bg-slate-900/70 dark:shadow-emerald-500/5">
          {/* Animated checkmark hero */}
          <div className="relative">
            {jdPollStatus === "success" && (
              <>
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
                <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-emerald-400/30 via-amber-300/20 to-emerald-400/30 blur-2xl" />
              </>
            )}
            <div
              className={cn(
                "relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-500",
                jdPollStatus === "success"
                  ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/50"
                  : jdPollStatus === "pending"
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/40"
                    : "bg-gradient-to-br from-sky-400 to-indigo-500 shadow-sky-500/40"
              )}>
              {jdPollStatus === "success" ? (
                <CheckCircle2
                  className="animate-in zoom-in-50 h-14 w-14 duration-500"
                  strokeWidth={2.5}
                />
              ) : jdPollStatus === "pending" ? (
                <Clock className="h-14 w-14" strokeWidth={2.5} />
              ) : (
                <Spinner size="lg" tone="white" />
              )}
            </div>
            {/* Floating particles */}
            {jdPollStatus === "success" && (
              <>
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 animate-bounce text-amber-400" />
                <Sparkles className="absolute -bottom-1 -left-3 h-5 w-5 animate-bounce text-emerald-400 [animation-delay:200ms]" />
                <PartyPopper className="absolute -top-4 -left-6 h-7 w-7 animate-pulse text-rose-400" />
                <PartyPopper className="absolute top-1/2 -right-4 h-6 w-6 animate-pulse text-amber-400 [animation-delay:300ms]" />
              </>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text font-['Poppins'] text-3xl font-black tracking-tight text-transparent sm:text-4xl dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400">
              {jdPollStatus === "success"
                ? t("paymentPaymentsuccesspage.yeahhPaymentSuccess", "Yeahhh! Thành công rồi! 🎉")
                : jdPollStatus === "pending"
                  ? t("paymentPaymentsuccesspage.paymentPendingTitle", "Đang chờ xác nhận...")
                  : t("paymentPaymentsuccesspage.paymentSuccessful")}
            </h1>
            <p className="font-['Inter'] text-sm font-medium text-slate-600 dark:text-slate-300">
              {t("payment.jdPackage", "Gói vị trí việc làm")}
            </p>
          </div>

          {/* Status banners */}
          {jdPollStatus === "checking" && (
            <div className="flex items-center gap-2.5 rounded-2xl border-2 border-sky-200 bg-sky-50/80 px-4 py-3 font-['Inter'] text-sm font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300">
              <Spinner size="sm" tone="primary" />
              {t(
                "paymentPaymentsuccesspage.confirmingJdPurchase",
                "Đang xác nhận giao dịch mua gói JD..."
              )}
            </div>
          )}

          {jdPollStatus === "success" && (
            <div className="w-full rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-amber-50/50 p-5 shadow-inner dark:border-emerald-500/40 dark:from-emerald-900/30 dark:via-emerald-950/20 dark:to-amber-950/20">
              <div className="flex items-center justify-center gap-2 font-['Inter'] text-base font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                {t(
                  "paymentPaymentsuccesspage.purchaseJdSuccess",
                  "Mua gói JD thành công! Bạn có thể nộp đơn ngay."
                )}
              </div>
              <p className="mt-1.5 font-['Inter'] text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">
                {t(
                  "paymentPaymentsuccesspage.canApplyNow",
                  "Hãy quay lại trang vị trí để nộp đơn ứng tuyển ngay nhé!"
                )}
              </p>
            </div>
          )}

          {jdPollStatus === "pending" && (
            <div className="w-full space-y-2.5 rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-5 dark:border-amber-500/30 dark:bg-amber-950/30">
              <div className="flex items-start gap-2 font-['Inter'] text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t(
                    "paymentPaymentsuccesspage.paymentPendingWebhook",
                    "Thanh toán đang được hệ thống xác nhận. Vui lòng kiểm tra lại sau ít phút."
                  )}
                </span>
              </div>
              <button
                onClick={handleRetryJdCheck}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 font-['Inter'] text-xs font-bold text-white transition-all hover:scale-105 hover:bg-amber-600">
                <RefreshCw className="h-3 w-3" />
                {t("common.checkNow", "Kiểm tra ngay")}
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
            <Link
              to={`/enterprise/job/${pendingJdId}`}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-6 py-3 font-['Inter'] text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/40">
              <CreditCard className="h-4 w-4" />
              {t("payment.returnToJobPosition", "Quay lại trang vị trí việc làm")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-success-page relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-amber-50/40 to-sky-50 px-4 py-10 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-900">
      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />

      <div className="payment-success-card relative mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border-2 border-emerald-200/70 bg-white/80 p-8 text-center shadow-2xl shadow-emerald-500/10 backdrop-blur-md sm:p-10 dark:border-emerald-500/30 dark:bg-slate-900/70 dark:shadow-emerald-500/5">
        {/* Hero checkmark */}
        <div className="relative">
          {resolveState === "subscribed" && (
            <>
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" />
              <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-emerald-400/30 via-amber-300/20 to-emerald-400/30 blur-2xl" />
            </>
          )}
          <div
            className={cn(
              "relative flex h-28 w-28 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-500",
              resolveState === "subscribed"
                ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/50"
                : resolveState === "unmapped"
                  ? "bg-gradient-to-br from-rose-400 to-orange-500 shadow-rose-500/40"
                  : "bg-gradient-to-br from-sky-400 to-indigo-500 shadow-sky-500/40"
            )}>
            {resolveState === "subscribed" ? (
              <CheckCircle2
                className="animate-in zoom-in-50 h-14 w-14 duration-500"
                strokeWidth={2.5}
              />
            ) : resolveState === "unmapped" ? (
              <ShieldAlert className="h-14 w-14" strokeWidth={2.5} />
            ) : (
              <Spinner size="lg" tone="white" />
            )}
          </div>
          {resolveState === "subscribed" && (
            <>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 animate-bounce text-amber-400" />
              <Sparkles className="absolute -bottom-1 -left-3 h-5 w-5 animate-bounce text-emerald-400 [animation-delay:200ms]" />
              <PartyPopper className="absolute -top-4 -left-6 h-7 w-7 animate-pulse text-rose-400" />
              <PartyPopper className="absolute top-1/2 -right-4 h-6 w-6 animate-pulse text-amber-400 [animation-delay:300ms]" />
            </>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <p className="font-['Inter'] text-xs font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
            {t("paymentPaymentsuccesspage.congratsPaymentSuccess", "Chúc mừng bạn!")}
          </p>
          <h1 className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text font-['Poppins'] text-3xl font-black tracking-tight text-transparent sm:text-4xl dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-400">
            {resolveState === "subscribed"
              ? t("paymentPaymentsuccesspage.yeahhPaymentSuccess", "Yeahhh! Thành công rồi!")
              : resolveState === "unmapped"
                ? t("paymentPaymentsuccesspage.paymentCouldNotBeConfirmed")
                : t("paymentPaymentsuccesspage.paymentSuccessful")}
          </h1>
          <p className="font-['Inter'] text-sm font-medium text-slate-600 dark:text-slate-300">
            {successSubtitle}
          </p>
        </div>

        {!paid && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 font-['Inter'] text-sm font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/10 dark:text-amber-300">
            {t("common.pay")}
          </div>
        )}

        {resolveState === "checking" && (
          <div className="flex items-center gap-2.5 rounded-2xl border-2 border-sky-200 bg-sky-50/80 px-4 py-3 font-['Inter'] text-sm font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-300">
            <Spinner size="sm" tone="sky" />
            {t("common.checking")}
          </div>
        )}

        {resolveState === "unmapped" && (
          <div className="w-full rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-4 dark:border-rose-500/30 dark:bg-rose-950/30">
            <div className="mb-2 flex items-center gap-2 font-['Inter'] text-sm font-semibold text-rose-700 dark:text-rose-300">
              <ShieldAlert className="h-4 w-4" />
              {t("paymentPaymentsuccesspage.paymentCouldNotBeConfirmed")}
            </div>
            <p className="font-['Inter'] text-sm text-rose-700/90 dark:text-rose-300/90">
              {resolveError || t("paymentPaymentsuccesspage.noValidPaymentInformationFound")}
            </p>
          </div>
        )}

        {resolveState === "ready" && !!resolveError && paid && (
          <div className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
            <p className="font-['Inter'] text-sm text-amber-700 dark:text-amber-300">
              {resolveError}
            </p>
          </div>
        )}

        {resolvedPurpose === "FULLY_PAID" && !!subscribeError && (
          <div className="w-full rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
            <p className="font-['Inter'] text-sm text-amber-700 dark:text-amber-300">
              {subscribeError}
            </p>
          </div>
        )}

        {resolvedPurpose === "FULLY_PAID" && isKnownActivatedOrder && (
          <div className="w-full rounded-2xl border-2 border-violet-200 bg-violet-50/80 p-4 dark:border-violet-500/30 dark:bg-violet-950/20">
            <p className="font-['Inter'] text-sm font-semibold text-violet-700 dark:text-violet-300">
              {t("paymentPaymentsuccesspage.packageActivatedPreviously")}
            </p>
          </div>
        )}

        {/* Activated credits panel */}
        {resolvedPurpose === "FULLY_PAID" && resolveState === "subscribed" && (
          <div className="w-full space-y-4 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-amber-50/40 p-6 shadow-inner dark:border-emerald-500/40 dark:from-emerald-900/30 dark:via-emerald-950/20 dark:to-amber-950/20">
            <div className="flex items-center justify-center gap-2 font-['Poppins'] text-base font-bold text-emerald-700 dark:text-emerald-300">
              <Wallet className="h-5 w-5" />
              {t(
                "paymentPaymentsuccesspage.packageActivatedCelebrate",
                "Gói của bạn đã được kích hoạt"
              )}
            </div>
            <p className="text-center font-['Inter'] text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">
              {t(
                "paymentPaymentsuccesspage.yourPremiumFeatures",
                "Bạn đã có thể sử dụng đầy đủ tính năng cao cấp"
              )}
            </p>

            {subscription ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col items-center rounded-2xl border border-emerald-200/60 bg-white/80 p-3 text-center dark:border-emerald-500/30 dark:bg-slate-900/50">
                  <Sparkles className="mb-1 h-4 w-4 text-emerald-500" />
                  <p className="font-['Inter'] text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("common.plan")}
                  </p>
                  <p className="font-['Inter'] text-xs font-bold text-slate-800 dark:text-slate-100">
                    {subscription.planName || "-"}
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-2xl border border-emerald-200/60 bg-white/80 p-3 text-center dark:border-emerald-500/30 dark:bg-slate-900/50">
                  <Sparkles className="mb-1 h-4 w-4 text-indigo-500" />
                  <p className="font-['Inter'] text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("paymentPaymentsuccesspage.aiInterviewCredits")}
                  </p>
                  <p className="font-['Inter'] text-base font-black text-slate-800 dark:text-slate-100">
                    {subscription.aiInterviewRemaining ?? "-"}
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-2xl border border-emerald-200/60 bg-white/80 p-3 text-center dark:border-emerald-500/30 dark:bg-slate-900/50">
                  <Sparkles className="mb-1 h-4 w-4 text-amber-500" />
                  <p className="font-['Inter'] text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("paymentPaymentsuccesspage.practiceSetCredits")}
                  </p>
                  <p className="font-['Inter'] text-base font-black text-slate-800 dark:text-slate-100">
                    {subscription.practiceSetRemaining ?? "-"}
                  </p>
                </div>
                <div className="flex flex-col items-center rounded-2xl border border-emerald-200/60 bg-white/80 p-3 text-center dark:border-emerald-500/30 dark:bg-slate-900/50">
                  <Sparkles className="mb-1 h-4 w-4 text-rose-500" />
                  <p className="font-['Inter'] text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("paymentPaymentsuccesspage.quizSetCredits")}
                  </p>
                  <p className="font-['Inter'] text-base font-black text-slate-800 dark:text-slate-100">
                    {subscription.quizSetRemaining ?? "-"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center font-['Inter'] text-xs text-emerald-700/90 dark:text-emerald-300/90">
                {t("paymentPaymentsuccesspage.packageActivatedButNotLoaded")}
              </p>
            )}
          </div>
        )}

        {/* What next section */}
        {resolveState === "subscribed" && (
          <div className="w-full space-y-3 pt-1">
            <p className="font-['Inter'] text-xs font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
              {t("paymentPaymentsuccesspage.whatNext", "Bạn muốn làm gì tiếp theo?")}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Link
            to={primaryRedirect.to}
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-6 py-3 font-['Inter'] text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/40">
            <CreditCard className="h-4 w-4" />
            {primaryRedirect.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          {(resolveState === "unmapped" || !paid) && (
            <button
              onClick={() => void handleResolveOrder()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 font-['Inter'] text-sm font-semibold text-slate-700 transition-all hover:scale-105 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              <RefreshCw className="h-4 w-4" />
              {t("paymentPaymentsuccesspage.tryConfirmingAgain")}
            </button>
          )}

          {resolvedPurpose === "FULLY_PAID" && canRetrySubscribe && (
            <button
              onClick={() => void handleConfirmSubscribe()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 font-['Inter'] text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-105">
              <RefreshCw className="h-4 w-4" />
              {t("paymentPaymentsuccesspage.tryActivatingAgain")}
            </button>
          )}

          {resolvedPurpose === "FULLY_PAID" && resolveState === "subscribing" && (
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/80 px-5 py-3 font-['Inter'] text-sm font-bold text-white">
              <Spinner size="sm" tone="white" />
              {t("general.subscribing")}
            </button>
          )}

          {resolvedPurpose === "FULLY_PAID" && resolveState === "subscribed" && (
            <>
              <Link
                to="/user/explore-jobs"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-indigo-300 bg-white px-5 py-3 font-['Inter'] text-sm font-bold text-indigo-700 transition-all hover:scale-105 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-500/50 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700">
                <Sparkles className="h-4 w-4" />
                {t("paymentPaymentsuccesspage.exploreJobsNow", "Khám phá việc làm")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 font-['Inter'] text-sm font-semibold text-slate-700 transition-all hover:scale-105 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                {t("paymentPaymentsuccesspage.backToHome", "Về trang chủ")}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
