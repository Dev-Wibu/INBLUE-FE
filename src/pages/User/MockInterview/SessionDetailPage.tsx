/**
 * Session Detail Page — Candidate View (Modern "Interview Dossier" v4)
 *
 * Full-width bento layout with glowing mentor avatar hero, status badges,
 * KPI metric strip, PayOS act-fast control panel, mentor STAR evaluation,
 * and candidate feedback workspace.
 */

import { FeedbackCard } from "@/components/feedback";
import { ReviewCard } from "@/components/review";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { useMentorById } from "@/hooks/useMentor";
import { useMentorFeedbackBySession } from "@/hooks/useMentorFeedback";
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
import { useMakeSessionPayment, useSessionById } from "@/hooks/useSession";
import {
  addPaymentSupportLog,
  canRetryPendingSessionPaidStatusSync,
  clearPendingSessionPaidStatusSync,
  extractCheckoutTokenFromUrl,
  extractOrderCodeFromUrl,
  extractTransactionCodeFromUrl,
  getPendingSessionPaidStatusSync,
  markPendingSessionPaidStatusSyncRetried,
  savePendingSessionPaymentContext,
  upsertPaymentRecoveryContext,
} from "@/lib";
import { formatCurrency, formatDateTime, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { getSessionMentorId } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import {
  PanelSurface,
  SessionStatusBadge,
  sessionToneFromStatus,
  type SessionStatusTone,
} from "@/pages/Mentor/Sessions/components";
import { sessionManager } from "@/services";
import { useAuthStore } from "@/stores/authStore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  CreditCard,
  Hash,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Timer,
  User,
  Video,
  Wand2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// ---------- motion variants ----------

const heroMotion = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" as const } },
};

const childMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
};

const gridStagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
};

const cardPop = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: "easeOut" as const } },
};

// ---------- shared surface tokens ----------

const METRIC_TILE = cn(
  "group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl p-4 ring-1 ring-inset",
  "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
  "dark:bg-white/[0.03] dark:ring-white/5",
  "transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-12px_rgba(15,23,42,0.25)]",
  "dark:hover:shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]"
);

const CHIP_LABEL_CLS =
  "text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400";

// ---------- KPI tile ----------

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  accent?: "sky" | "indigo" | "emerald" | "amber" | "violet";
  meta?: React.ReactNode;
  index: number;
}

const ACCENT_RING: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  sky: "from-sky-400/40 to-transparent",
  indigo: "from-indigo-400/40 to-transparent",
  emerald: "from-emerald-400/40 to-transparent",
  amber: "from-amber-400/40 to-transparent",
  violet: "from-violet-400/40 to-transparent",
};

const ACCENT_ICON: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  sky: "text-sky-600 dark:text-sky-300",
  indigo: "text-indigo-600 dark:text-indigo-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  violet: "text-violet-600 dark:text-violet-300",
};

function KpiTile({ icon: Icon, label, value, accent = "sky", meta, index }: KpiTileProps) {
  return (
    <motion.div variants={cardPop} className={METRIC_TILE}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br opacity-60 blur-2xl",
          ACCENT_RING[accent]
        )}
      />
      <div className="relative flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.1em] text-slate-400 uppercase">
          0{index}
        </span>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset",
            "bg-slate-900/[0.04] ring-slate-900/10",
            "dark:bg-white/[0.05] dark:ring-white/10"
          )}>
          <Icon className={cn("h-3.5 w-3.5", ACCENT_ICON[accent])} aria-hidden />
        </div>
      </div>
      <div className="relative">
        <p className={CHIP_LABEL_CLS}>{label}</p>
        <p className="mt-1 text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
          {value}
        </p>
        {meta && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta}</p>}
      </div>
    </motion.div>
  );
}

// ---------- STAR breakdown row ----------

interface StarPreviewRowProps {
  letter: string;
  label: string;
  summary?: string;
  hue: "sky" | "indigo" | "blue" | "cyan";
}

const HUE_BAR: Record<StarPreviewRowProps["hue"], string> = {
  sky: "bg-sky-500/70",
  indigo: "bg-indigo-500/70",
  blue: "bg-blue-500/70",
  cyan: "bg-cyan-500/70",
};

const HUE_DOT: Record<StarPreviewRowProps["hue"], string> = {
  sky: "bg-sky-500",
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  cyan: "bg-cyan-500",
};

function StarPreviewRow({ letter, label, summary, hue }: StarPreviewRowProps) {
  const filled = !!summary && summary.trim().length > 0;
  return (
    <div className="group flex items-center gap-3">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors",
          filled
            ? HUE_BAR[hue] + " text-white"
            : "bg-slate-200/70 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400"
        )}>
        {letter}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>
        <p
          className={cn(
            "truncate text-xs",
            filled
              ? "text-slate-700 dark:text-slate-200"
              : "text-slate-400 italic dark:text-slate-500"
          )}>
          {filled ? summary : "—"}
        </p>
      </div>
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          filled ? HUE_DOT[hue] : "bg-slate-300 dark:bg-slate-600"
        )}
        aria-hidden
      />
    </div>
  );
}

// ---------- Avatar Halo ----------

function MentorAvatarHalo({ src, name, status }: { src?: string; name: string; status?: string }) {
  const completed = status === "COMPLETED";
  const ongoing = status === "ONGOING" || status === "PAID";
  const halo =
    completed || ongoing
      ? "from-blue-500/40 via-indigo-500/40 to-violet-500/40"
      : "from-slate-400/30 via-slate-300/30 to-slate-400/30";
  return (
    <div className="relative shrink-0">
      <div
        aria-hidden
        className={cn("absolute -inset-1 rounded-full bg-gradient-to-br opacity-80 blur-md", halo)}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full ring-2",
          ongoing
            ? "ring-emerald-400/60"
            : completed
              ? "ring-blue-400/60"
              : "ring-slate-300/60 dark:ring-slate-600/60"
        )}
      />
      <Avatar className="relative h-16 w-16 sm:h-20 sm:w-20">
        <AvatarImage src={src} alt={name} />
        <AvatarFallback
          className={cn(
            "bg-slate-200/60 text-lg font-semibold text-slate-700",
            "dark:bg-slate-700/40 dark:text-slate-200"
          )}>
          {(name || "M").charAt(0)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

// ---------- PAGE COMPONENT ----------

export function SessionDetailPage() {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isPollingPayment, setIsPollingPayment] = useState(false);
  const [isRecoveringPaidStatus, setIsRecoveringPaidStatus] = useState(false);

  const pollingAttemptsRef = useRef(0);
  const payosPaymentInFlightRef = useRef(false);
  const paidStatusSyncInFlightRef = useRef(false);
  const hasHandledCancelledParamRef = useRef(false);

  const paymentQuery = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paymentState = paymentQuery.get("payment")?.trim();

  const {
    data: session,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useSessionById(Number(sessionId));

  const mentorId = getSessionMentorId(session) || 0;
  const { data: mentorInfo } = useMentorById(mentorId);
  const { mutateAsync: makeSessionPayment } = useMakeSessionPayment();
  const { data: myFeedback, isLoading: feedbackLoading } = useMentorFeedbackBySession(
    Number(sessionId)
  );
  const { data: mentorReview, isLoading: reviewLoading } = useMentorReviewBySession(
    Number(sessionId)
  );

  const isLoading = sessionLoading;
  const isCompleted = session?.status === "COMPLETED";

  const statusMap: Record<string, { label: string; tone: SessionStatusTone }> = {
    DRAFT: { label: t("common.waitingForApproval"), tone: "draft" },
    SCHEDULED: { label: t("common.scheduled"), tone: "scheduled" },
    PAID: { label: t("common.paid"), tone: "paid" },
    ACTIVE: { label: t("common.ongoing"), tone: "ongoing" },
    ONGOING: { label: t("common.ongoing"), tone: "ongoing" },
    COMPLETED: { label: t("general.completed"), tone: "completed" },
    REJECTED: { label: t("common.rejected"), tone: "rejected" },
    CANCELED: { label: t("common.canceled"), tone: "canceled" },
  };

  const syncSessionPaidStatus = useCallback(
    async (
      targetSessionId: number,
      transactionCode?: string,
      options?: { silent?: boolean }
    ): Promise<boolean> => {
      if (!user?.id || paidStatusSyncInFlightRef.current) {
        return false;
      }
      paidStatusSyncInFlightRef.current = true;
      setIsRecoveringPaidStatus(true);
      try {
        markPendingSessionPaidStatusSyncRetried(targetSessionId, Number(user.id));
        const syncResult = await sessionManager.markSessionAsPaidWithRetry(
          targetSessionId,
          transactionCode,
          3
        );
        if (!syncResult.success) {
          return false;
        }
        clearPendingSessionPaidStatusSync(targetSessionId, Number(user.id));
        await refetchSession();
        if (!options?.silent) {
          toast.success(t("userMockinterview.sessionStatusSyncedToPaid"));
        }
        return true;
      } finally {
        paidStatusSyncInFlightRef.current = false;
        setIsRecoveringPaidStatus(false);
      }
    },
    [refetchSession, user?.id, t]
  );

  const handlePaySessionWithPayOS = async () => {
    if (!session?.id || !user?.id) {
      return;
    }
    if (payosPaymentInFlightRef.current) {
      toast.info(t("common.theSystemIsGeneratingAPaymentLink"));
      return;
    }
    payosPaymentInFlightRef.current = true;
    setIsCreatingPayment(true);
    try {
      const checkoutUrl = await makeSessionPayment(session.id);
      const normalizedCheckoutUrl = new URL(checkoutUrl, window.location.origin).toString();
      const orderCode = extractOrderCodeFromUrl(normalizedCheckoutUrl) || undefined;
      const transactionCode = extractTransactionCodeFromUrl(normalizedCheckoutUrl) || undefined;
      const checkoutToken = extractCheckoutTokenFromUrl(normalizedCheckoutUrl) || undefined;
      const paymentAmount =
        typeof session.totalPrice === "number" && session.totalPrice > 0
          ? session.totalPrice
          : undefined;

      const createdRecovery = upsertPaymentRecoveryContext({
        orderCode,
        transactionCode,
        checkoutToken,
        userId: Number(user.id),
        amount: paymentAmount,
        paymentPurpose: "MENTOR_INTERVIEW",
        sessionId: session.id,
        checkoutUrl: normalizedCheckoutUrl,
        status: "CREATED",
        note: t("userMockinterview.createdSessionPaymentCheckouturlFrom"),
      });

      addPaymentSupportLog({
        supportCode: createdRecovery.supportCode,
        orderCode,
        transactionCode,
        checkoutToken,
        userId: createdRecovery.userId,
        amount: createdRecovery.amount,
        paymentPurpose: "MENTOR_INTERVIEW",
        sessionId: session.id,
        status: "CREATED",
        message: t("general.checkouturlCreatedSuccessfullyForSession"),
      });

      const redirectedRecovery = upsertPaymentRecoveryContext({
        supportCode: createdRecovery.supportCode,
        orderCode,
        transactionCode,
        checkoutToken,
        userId: createdRecovery.userId,
        amount: createdRecovery.amount,
        paymentPurpose: "MENTOR_INTERVIEW",
        sessionId: session.id,
        checkoutUrl: normalizedCheckoutUrl,
        status: "REDIRECTED",
        note: t("userMockinterview.redirectedToSessionPaymentPage"),
      });

      if (!transactionCode) {
        addPaymentSupportLog({
          supportCode: redirectedRecovery.supportCode,
          orderCode,
          checkoutToken,
          userId: redirectedRecovery.userId,
          amount: redirectedRecovery.amount,
          paymentPurpose: "MENTOR_INTERVIEW",
          sessionId: session.id,
          status: "UNMAPPED_ORDER",
          message: t("userMockinterview.checkoutTheInterviewSessionUrl"),
          payload: {
            orderCode: orderCode || null,
            checkoutToken: checkoutToken || null,
            recoveryStrategy: "orderCode-fallback-guarded",
          },
        });
      }

      savePendingSessionPaymentContext({
        sessionId: session.id,
        userId: Number(user.id),
        checkoutUrl: normalizedCheckoutUrl,
      });
      window.location.assign(normalizedCheckoutUrl);
    } catch (error) {
      addPaymentSupportLog({
        userId: Number(user.id),
        amount:
          typeof session?.totalPrice === "number" && session.totalPrice > 0
            ? session.totalPrice
            : undefined,
        paymentPurpose: "MENTOR_INTERVIEW",
        sessionId: session?.id,
        status: "CREATE_FAILED",
        message: t("userMockinterview.createAFailedSessionPayment"),
        payload: {
          error: error instanceof Error ? error.message : "unknown",
        },
      });
    } finally {
      payosPaymentInFlightRef.current = false;
      setIsCreatingPayment(false);
    }
  };

  useEffect(() => {
    if (!session?.id || !user?.id) return;
    const currentSessionId = session.id;
    if (session.status === "PAID") {
      clearPendingSessionPaidStatusSync(currentSessionId, Number(user.id));
      return;
    }
    if (session.status !== "SCHEDULED") return;
    const pendingSync = getPendingSessionPaidStatusSync(currentSessionId, Number(user.id));
    if (!pendingSync || !canRetryPendingSessionPaidStatusSync(pendingSync)) return;
    void syncSessionPaidStatus(currentSessionId, pendingSync.transactionCode, { silent: true });
  }, [session?.id, session?.status, syncSessionPaidStatus, user?.id]);

  useEffect(() => {
    if (!session?.id || !paymentState || !user?.id) return;
    const currentSessionId = session.id;

    if (paymentState === "cancelled") {
      if (!hasHandledCancelledParamRef.current) {
        hasHandledCancelledParamRef.current = true;
        toast.info(t("userMockinterview.youHaveCanceledYourPayment"));
      }
      return;
    }
    if (paymentState !== "success") return;

    if (session.status === "PAID") {
      toast.success(t("userMockinterview.paymentForTheInterviewSession"));
      navigate(`/user/mock-interview/history/${currentSessionId}`, { replace: true });
      return;
    }

    let cancelled = false;
    pollingAttemptsRef.current = 0;
    setIsPollingPayment(true);

    const pollStatus = async () => {
      pollingAttemptsRef.current += 1;
      const pendingSync = getPendingSessionPaidStatusSync(currentSessionId, Number(user.id));
      if (pendingSync && canRetryPendingSessionPaidStatusSync(pendingSync)) {
        const synced = await syncSessionPaidStatus(currentSessionId, pendingSync.transactionCode, {
          silent: true,
        });
        if (cancelled) return;
        if (synced) {
          setIsPollingPayment(false);
          toast.success(t("userMockinterview.paymentForTheInterviewSession"));
          navigate(`/user/mock-interview/history/${currentSessionId}`, { replace: true });
          return;
        }
      }

      const result = await refetchSession();
      if (cancelled) return;
      if (result.data?.status === "PAID") {
        setIsPollingPayment(false);
        toast.success(t("userMockinterview.paymentForTheInterviewSession"));
        navigate(`/user/mock-interview/history/${currentSessionId}`, { replace: true });
        return;
      }
      if (pollingAttemptsRef.current >= 12) {
        setIsPollingPayment(false);
        toast.info(t("userMockinterview.theSystemIsUpdatingThe"));
        navigate(`/user/mock-interview/history/${currentSessionId}`, { replace: true });
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 5000);

    return () => {
      cancelled = true;
      setIsPollingPayment(false);
      window.clearInterval(intervalId);
    };
  }, [
    navigate,
    paymentState,
    refetchSession,
    session?.id,
    session?.status,
    syncSessionPaidStatus,
    user?.id,
    t,
  ]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pt-8">
        <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          {t("general.back")}
        </Button>
        <PanelSurface className="p-12 text-center">
          <Video className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noInterviewSessionsFound")}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("common.thisInterviewSessionDoesNotExistOr")}
          </p>
        </PanelSurface>
      </div>
    );
  }

  if (session.userId !== user?.id) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pt-8">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => navigate("/user?tab=mockInterview")}>
          <ArrowLeft className="h-4 w-4" />
          {t("userMockinterview.backToHistory")}
        </Button>
        <PanelSurface className="p-12 text-center">
          <User className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("common.noAccess")}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("userMockinterview.youCannotViewAnInterview")}
          </p>
        </PanelSurface>
      </div>
    );
  }

  const status = statusMap[session.status || "SCHEDULED"] || {
    label: t("common.scheduled"),
    tone: "scheduled" as SessionStatusTone,
  };

  const canJoinRoom =
    !!session.roomUrl && (session.status === "PAID" || session.status === "ONGOING");
  const canWriteFeedback = isCompleted && !myFeedback;
  const canPaySession = session.status === "SCHEDULED";
  const isPaidSession = session.status === "PAID";

  const mentorRating = typeof mentorReview?.rating === "number" ? mentorReview.rating : 0;
  const myRating = typeof myFeedback?.rating === "number" ? myFeedback.rating : 0;

  const starRows: StarPreviewRowProps[] = mentorReview
    ? [
        {
          letter: "S",
          label: t("mentorReviews.situation"),
          summary: mentorReview.situationNote,
          hue: "sky",
        },
        {
          letter: "T",
          label: t("mentorReviews.tasks"),
          summary: mentorReview.taskNote,
          hue: "indigo",
        },
        {
          letter: "A",
          label: t("mentorReviews.action"),
          summary: mentorReview.actionNote,
          hue: "blue",
        },
        {
          letter: "R",
          label: t("mentorReviews.result"),
          summary: mentorReview.resultNote,
          hue: "cyan",
        },
      ]
    : [];

  const completionLabel = (() => {
    if (session.status === "COMPLETED" && session.endTime1) {
      const ended = treatZuluAsVietnamLocal(session.endTime1);
      return <TimeAgo date={String(ended)} />;
    }
    return null;
  })();

  const actFastHeadline = canPaySession
    ? t("userMockinterview.paymentForInterviewSession")
    : canJoinRoom
      ? t("common.enterTheInterviewRoom")
      : canWriteFeedback
        ? t("userMockinterview.writeFeedbackToMentor")
        : isPaidSession
          ? t("userMockinterview.paidSession")
          : t("userMockinterview.theSessionIsCurrentlyIn");

  return (
    <motion.div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6"
      variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
      initial="hidden"
      animate="show">
      {/* Top action bar */}
      <motion.div
        variants={childMotion}
        className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          className="gap-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60"
          onClick={() => navigate("/user?tab=mockInterview")}>
          <ArrowLeft className="h-4 w-4" />
          {t("userMockinterview.backToHistory")}
        </Button>
      </motion.div>

      {/* HERO BANNER — Bold Bento with Avatar Halo + Status */}
      <motion.div variants={heroMotion}>
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 ring-1 ring-inset sm:p-8",
            "bg-gradient-to-br from-blue-500/[0.05] via-indigo-500/[0.03] to-purple-500/[0.05]",
            "ring-slate-200/70 backdrop-blur",
            "dark:from-blue-500/[0.08] dark:via-white/[0.02] dark:to-indigo-500/[0.08] dark:ring-white/10"
          )}>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-blue-400/15 opacity-60 blur-3xl dark:bg-blue-500/20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-indigo-400/15 opacity-60 blur-3xl dark:bg-indigo-500/15"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(rgba(148,163,184,0.45) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <MentorAvatarHalo
                src={mentorInfo?.avatarUrl}
                name={mentorInfo?.name || t("userMockinterview.instructor")}
                status={session.status}
              />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">
                    {t("common.interviewSession")}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    #{session.id}
                  </span>
                </div>
                <h1
                  className="text-2xl font-bold tracking-[-0.02em] text-slate-900 sm:text-3xl dark:text-slate-100"
                  style={{ textWrap: "balance" }}>
                  {session.roomName || t("common.sessionVar0", { var_0: session.id })}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    {mentorInfo?.name ||
                      (mentorId > 0
                        ? t("common.mentorWithId", { id: mentorId })
                        : t("userMockinterview.notDetermined"))}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {session.joinTime ? formatDateTime(session.joinTime) : "-"}
                  </span>
                  {completionLabel && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {completionLabel}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={session.status}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.24, ease: "easeOut" as const }}>
                  <SessionStatusBadge
                    tone={sessionToneFromStatus(session.status)}
                    label={status.label}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI STRIP — 4 Bento Tiles */}
      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          index={1}
          icon={Calendar}
          label={t("common.appointmentTime")}
          value={session.joinTime ? formatDateTime(session.joinTime) : "-"}
          accent="sky"
        />
        <KpiTile
          index={2}
          icon={Timer}
          label={t("userMockinterview.estimatedDuration")}
          value={
            typeof session.duration === "number" && session.duration > 0
              ? t("general.minutes", { var_0: session.duration })
              : "-"
          }
          accent="indigo"
        />
        <KpiTile
          index={3}
          icon={CreditCard}
          label={t("common.totalPrice")}
          value={
            typeof session.totalPrice === "number" && session.totalPrice > 0
              ? formatCurrency(session.totalPrice)
              : "-"
          }
          accent="emerald"
          meta={session.transactionCode ?? undefined}
        />
        <KpiTile
          index={4}
          icon={Hash}
          label={t("common.sessionCode")}
          value={`#${session.id || "-"}`}
          accent="violet"
        />
      </motion.div>

      {/* ACT FAST BAR — Action Control Center */}
      <motion.div variants={childMotion}>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl p-5 ring-1 ring-inset sm:p-6",
            "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10",
            "ring-slate-200/70 backdrop-blur-sm",
            "dark:from-blue-500/15 dark:via-indigo-500/10 dark:to-emerald-500/15 dark:ring-white/10"
          )}>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset",
                  "bg-blue-500/15 text-blue-600 ring-blue-500/20",
                  "dark:bg-blue-500/20 dark:text-blue-300"
                )}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className={CHIP_LABEL_CLS}>{t("common.actFast")}</p>
                <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                  {actFastHeadline}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/user?tab=interviewHistory")}>
                {t("common.viewHistory")}
              </Button>

              {canJoinRoom && (
                <Button
                  onClick={() => navigate(`/user/mock-interview/room/${session.id}`)}
                  className="gap-2 bg-blue-600 text-white shadow-[0_4px_18px_-8px_rgba(37,99,235,0.6)] hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500">
                  <Video className="h-4 w-4" />
                  {t("common.enterTheInterviewRoom")}
                </Button>
              )}

              {canWriteFeedback && (
                <Button
                  onClick={() => navigate(`/user/mock-interview/history/${session.id}/feedback`)}
                  className="gap-2 bg-indigo-600 text-white shadow-[0_4px_18px_-8px_rgba(79,70,229,0.6)] hover:bg-indigo-700">
                  <Star className="h-4 w-4" />
                  {t("userMockinterview.writeFeedbackToMentor")}
                </Button>
              )}

              {canPaySession && (
                <Button
                  onClick={handlePaySessionWithPayOS}
                  disabled={isCreatingPayment || isPollingPayment || isRecoveringPaidStatus}
                  className="gap-2 bg-emerald-600 text-white shadow-[0_4px_18px_-8px_rgba(16,185,129,0.6)] hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                  {isCreatingPayment || isPollingPayment || isRecoveringPaidStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {isRecoveringPaidStatus
                    ? t("userMockinterview.synchronizingPaymentStatus")
                    : isCreatingPayment
                      ? t("userMockinterview.paymentProcessing")
                      : t("userMockinterview.paymentForInterviewSession")}
                </Button>
              )}

              {isPaidSession && (
                <Badge variant="secondary" className="px-3 py-1.5 text-xs font-semibold">
                  <CreditCard className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                  {t("userMockinterview.paidSession")}
                </Badge>
              )}
            </div>
          </div>

          {canPaySession && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t("userMockinterview.afterPaymentIsCompletedThe")}
            </p>
          )}

          {isPollingPayment && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2.5 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              {t("userMockinterview.theSystemIsCheckingPayments")}
            </div>
          )}

          {isRecoveringPaidStatus && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              {t("userMockinterview.synchronizingPaymentStatus")}
            </div>
          )}
        </div>
      </motion.div>

      {/* BENTO GRID: Mentor Review (Left) + Candidate Feedback (Right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Mentor Review & Evaluation */}
        <motion.div variants={childMotion} className="flex flex-col gap-5">
          <PanelSurface className="relative overflow-hidden p-5 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-amber-300/10 opacity-60 blur-3xl dark:bg-amber-500/15"
            />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
                      "bg-amber-500/10 ring-amber-500/20 dark:bg-amber-500/15"
                    )}>
                    <Star className="h-4.5 w-4.5 text-amber-500" />
                  </div>
                  <div>
                    <p className={CHIP_LABEL_CLS}>{t("common.reviewsFromMentors")}</p>
                    <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                      {mentorReview
                        ? t("mentorSessions.youScoredCandidateWith", {
                            var_0: mentorRating.toFixed(1),
                          })
                        : t("userMockinterview.mentorHasNotSubmittedA")}
                    </p>
                  </div>
                </div>

                {mentorReview?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/user/feedback/${mentorReview.id}`)}
                    className="gap-1.5 text-xs">
                    {t("common.seeReviewDetails")}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {reviewLoading ? (
                <Skeleton className="h-36 rounded-xl" />
              ) : mentorReview ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                        {mentorRating.toFixed(1)}
                      </span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        /5
                      </span>
                    </div>
                    <StarRating value={mentorRating} readOnly size="md" />
                  </div>

                  {starRows.some((r) => r.summary) && (
                    <div className="space-y-2 rounded-xl border border-slate-200/60 bg-slate-50/50 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/40">
                      <p className={CHIP_LABEL_CLS}>
                        {t("mentorReviews.detailedAssessmentStarMethod")}
                      </p>
                      <div className="space-y-2">
                        {starRows.map((row) => (
                          <StarPreviewRow key={row.letter} {...row} />
                        ))}
                      </div>
                    </div>
                  )}

                  <ReviewCard
                    review={mentorReview}
                    showMentor
                    onClick={() => {
                      if (mentorReview.id) {
                        navigate(`/user/feedback/${mentorReview.id}`);
                      }
                    }}
                  />
                </div>
              ) : isCompleted ? (
                <div className="rounded-xl border border-dashed border-slate-300/80 py-8 text-center dark:border-slate-800">
                  <Wand2 className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("userMockinterview.mentorHasNotSubmittedA")}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300/80 py-8 text-center dark:border-slate-800">
                  <Sparkles className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("userMockinterview.evaluationWillBeAvailableAfter")}
                  </p>
                </div>
              )}
            </div>
          </PanelSurface>
        </motion.div>

        {/* RIGHT: Candidate Feedback */}
        <motion.div variants={childMotion} className="flex flex-col gap-5">
          <PanelSurface className="relative overflow-hidden p-5 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -left-12 h-40 w-40 rounded-full bg-emerald-300/10 opacity-60 blur-3xl dark:bg-emerald-500/15"
            />
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
                      "bg-emerald-500/10 ring-emerald-500/20 dark:bg-emerald-500/15"
                    )}>
                    <MessageSquare className="h-4.5 w-4.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className={CHIP_LABEL_CLS}>{t("userMockinterview.yourFeedback")}</p>
                    <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                      {myFeedback
                        ? t("mentorSessions.youScoredCandidateWith", {
                            var_0: myRating.toFixed(1),
                          })
                        : t("userMockinterview.youHaveNotSubmittedFeedback")}
                    </p>
                  </div>
                </div>

                {myFeedback && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/user/mock-interview/history/${session.id}/feedback`)}
                    className="gap-1 text-xs">
                    {t("common.editResponse")}
                  </Button>
                )}
              </div>

              {feedbackLoading ? (
                <Skeleton className="h-36 rounded-xl" />
              ) : myFeedback ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                        {myRating.toFixed(1)}
                      </span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        /5
                      </span>
                    </div>
                    <StarRating value={myRating} readOnly size="sm" />
                  </div>

                  <FeedbackCard
                    feedback={myFeedback}
                    showMentor
                    showSession={false}
                    onClick={() => navigate(`/user/mock-interview/history/${session.id}/feedback`)}
                  />
                </div>
              ) : isCompleted ? (
                <div className="rounded-xl border border-dashed border-slate-300/80 py-8 text-center dark:border-slate-800">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("userMockinterview.youHaveNotSubmittedFeedback")}
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => navigate(`/user/mock-interview/history/${session.id}/feedback`)}>
                    <Star className="h-3.5 w-3.5" />
                    {t("common.writeFeedback")}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300/80 py-8 text-center dark:border-slate-800">
                  <MessageSquare className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("userMockinterview.feedbackCanOnlyBeSent")}
                  </p>
                </div>
              )}
            </div>
          </PanelSurface>
        </motion.div>
      </div>
    </motion.div>
  );
}
