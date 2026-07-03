import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentRound } from "@/hooks/useRound";
import {
  SESSION_QUERY_KEYS,
  useCreateSession,
  useMakeSessionPayment,
  useSessionById,
} from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import type { ApplicationDetail } from "@/services/application-detail.manager";
import { applicationDetailManager } from "@/services/application-detail.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, CheckCircle2, Clock, CreditCard, Send, Video } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function ApplicationMentorReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const applicationId = Number(params.applicationId);
  const roundIdParam = searchParams.get("roundId");
  const roundId = roundIdParam ? Number(roundIdParam) : undefined;

  // DEBUG
  console.log("[MentorReviewPage] mount", {
    applicationId,
    roundId,
    hasUser: !!user,
    userId: user?.id,
  });

  // Fetch current round config
  const { data: currentRound, isLoading: roundLoading } = useCurrentRound(
    applicationId,
    !!applicationId
  );
  const roundConfig = currentRound?.configData as
    | {
        mentorInterview?: {
          userId?: number;
          mentorId?: number;
          mentorName?: string;
          mentorAvatar?: string;
          mentorExpertise?: string;
          duration?: number;
          totalPrice?: number;
        };
      }
    | undefined;

  // Fetch existing application detail (to check if review was submitted + get mentor info from API)
  const [existingDetail, setExistingDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!applicationId || !roundId) return;
    setDetailLoading(true);
    applicationDetailManager
      .getByApplicationId(applicationId)
      .then((res) => {
        if (res.success && res.data) {
          const detail = res.data.find((d) => d.roundId === roundId);
          if (detail) setExistingDetail(detail);
        }
      })
      .finally(() => setDetailLoading(false));
  }, [applicationId, roundId]);

  // Mentor info: prefer from existingDetail API response (backend may populate this),
  // fallback to roundConfig (round template config)
  const mentorInfoFromDetail = (
    existingDetail as unknown as
      | {
          mentorInterview?: {
            userId?: number;
            mentorId?: number;
            mentorName?: string;
            mentorAvatar?: string;
            mentorExpertise?: string;
            duration?: number;
            totalPrice?: number;
          };
        }
      | undefined
  )?.mentorInterview;
  const mentorInfo = mentorInfoFromDetail ?? roundConfig?.mentorInterview;

  // Session state
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // React Query: auto-refetch session status when navigating back.
  // Poll every 3 seconds while sessionId is set so payment/room status updates automatically.
  const { data: fetchedSession } = useSessionById(sessionId ?? 0);

  // DEBUG
  console.log("[MentorReviewPage] session", {
    sessionId,
    fetchedSession,
    fetchedSessionStatus: fetchedSession?.status,
    isCreatingSession,
  });

  // Create session on mount if mentorInfo is available
  const createSessionMutation = useCreateSession();

  useEffect(() => {
    console.log("[MentorReviewPage] sessionEffect", {
      mentorInfo,
      sessionId,
      condition: !mentorInfo || sessionId !== null ? "SKIP" : "CREATE",
    });
    if (!mentorInfo || sessionId !== null) return;
    void (async () => {
      console.log("[MentorReviewPage] creating session...");
      setIsCreatingSession(true);
      try {
        const result = await createSessionMutation.mutateAsync({
          userId: mentorInfo.userId ?? 0,
          mentorId: mentorInfo.mentorId ?? 0,
          duration: mentorInfo.duration ?? 60,
          totalPrice: mentorInfo.totalPrice ?? 0,
        });
        console.log("[MentorReviewPage] session created", result);
        if (result?.id) setSessionId(result.id);
      } catch (err) {
        console.error("[MentorReviewPage] session create failed", err);
        // Allow manual retry
      } finally {
        setIsCreatingSession(false);
      }
    })();
  }, [mentorInfo, sessionId, createSessionMutation]);

  // Poll session status every 3 seconds while a session is active so payment/room
  // status updates automatically after returning from external flows.
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.byId(sessionId) });
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, queryClient]);

  // Session mutations
  const makePaymentMutation = useMakeSessionPayment();

  // Form state — STAR model
  const [rating, setRating] = useState<number>(0);
  const [situationNote, setSituationNote] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [resultNote, setResultNote] = useState("");
  const [strength, setStrength] = useState("");
  const [weakness, setWeakness] = useState("");
  const [improve, setImprove] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    rating > 0 &&
    (situationNote.trim().length > 0 ||
      taskNote.trim().length > 0 ||
      actionNote.trim().length > 0 ||
      resultNote.trim().length > 0);

  // Callbacks
  const handlePayment = useCallback(async () => {
    if (!sessionId) return;
    try {
      const checkoutUrl = await makePaymentMutation.mutateAsync(sessionId);
      window.location.href = checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.anErrorHasOccurred"));
    }
  }, [sessionId, makePaymentMutation, t]);

  const handleJoinRoom = useCallback(() => {
    if (!sessionId) return;
    navigate(`/user/mock-interview/room/${sessionId}`);
  }, [sessionId, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!applicationId || !roundId || !user?.id || !canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload = {
        sessionId: sessionId ?? 0,
        mentorId: mentorInfo?.mentorId ?? 0,
        userId: user.id,
        rating,
        situationNote: situationNote.trim() || undefined,
        taskNote: taskNote.trim() || undefined,
        actionNote: actionNote.trim() || undefined,
        resultNote: resultNote.trim() || undefined,
        strength: strength.trim() || undefined,
        weakness: weakness.trim() || undefined,
        improve: improve.trim() || undefined,
      };

      const response = await fetch("/api/application-details/mentor-review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, roundId, ...payload }),
      });

      if (response.ok) {
        toast.success(t("userApplicationhistory.reviewSubmittedSuccessfully"));
        navigate(-1);
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData?.message ?? t("common.anErrorHasOccurred"));
      }
    } catch {
      toast.error(t("common.anErrorHasOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    applicationId,
    roundId,
    sessionId,
    user,
    mentorInfo,
    rating,
    situationNote,
    taskNote,
    actionNote,
    resultNote,
    strength,
    weakness,
    improve,
    canSubmit,
    navigate,
    t,
  ]);

  // Derived state
  const isReviewSubmitted = !!existingDetail?.mentorReview;
  const isLoading = roundLoading || detailLoading || isCreatingSession;
  const sessionStatus =
    (fetchedSession?.status as
      | "PENDING"
      | "DRAFT"
      | "SCHEDULED"
      | "PAID"
      | "ONGOING"
      | "COMPLETED"
      | "REJECTED"
      | "CANCELED") ?? "PENDING";

  // DEBUG
  console.log("[MentorReviewPage] derived state", {
    isLoading,
    isReviewSubmitted,
    existingDetail,
    sessionStatus,
    // Which branch will render?
    willShowForm:
      !isLoading &&
      !isReviewSubmitted &&
      mentorInfo &&
      sessionId !== null &&
      !["PENDING", "DRAFT", "PAID", "SCHEDULED", "ONGOING"].includes(sessionStatus),
    willShowPayment:
      !isLoading &&
      !isReviewSubmitted &&
      mentorInfo &&
      (!sessionId || sessionStatus === "PENDING" || sessionStatus === "DRAFT"),
    willShowJoinRoom:
      !isLoading &&
      !isReviewSubmitted &&
      mentorInfo &&
      (sessionStatus === "PAID" || sessionStatus === "SCHEDULED"),
  });

  // ─── Conditional flow rendering ────────────────────────────────────────────

  // DEBUG: Log which branch is rendering
  console.log("[MentorReviewPage] RENDER", {
    branch: isLoading
      ? "LOADING"
      : isReviewSubmitted
        ? "REVIEWED"
        : !mentorInfo
          ? "NO_MENTOR"
          : !sessionId || sessionStatus === "PENDING" || sessionStatus === "DRAFT"
            ? "PAYMENT"
            : sessionStatus === "PAID" || sessionStatus === "SCHEDULED"
              ? "JOIN_ROOM"
              : sessionStatus === "ONGOING"
                ? "ONGOING"
                : "FORM_STAR",
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="primary" />
      </div>
    );
  }

  // Already reviewed
  if (isReviewSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("userApplicationhistory.mentorReviewRound")}
            </h1>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 fill-green-500 text-green-500" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">
                  {t("userApplicationhistory.reviewAlreadySubmitted")}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t("userApplicationhistory.thankYouForYourFeedback")}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("general.back")}
          </Button>
        </div>
      </div>
    );
  }

  // No mentor assigned
  if (!mentorInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("userApplicationhistory.mentorReviewRound")}
            </h1>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-foreground font-semibold">
                  {t("userApplicationhistory.noMentorAssigned")}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t("userApplicationhistory.mentorWillBeAssignedSoon")}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate(-1)}>
                {t("general.back")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Session PENDING / DRAFT — show payment screen
  if (!sessionId || sessionStatus === "PENDING" || sessionStatus === "DRAFT") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("userApplicationhistory.mentorReviewRound")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("userApplicationhistory.mentorReviewRoundDesc")}
              </p>
            </div>
          </div>

          {/* Mentor Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("userApplicationhistory.mentorInformation")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {mentorInfo.mentorAvatar ? (
                  <img
                    src={mentorInfo.mentorAvatar}
                    alt={mentorInfo.mentorName}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-[#0047AB]/20"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0047AB]/10 text-lg font-bold text-[#0047AB]">
                    {mentorInfo.mentorName?.charAt(0) ?? "M"}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {mentorInfo.mentorName ?? t("userApplicationhistory.mentor")}
                  </p>
                  {mentorInfo.mentorExpertise && (
                    <p className="text-sm text-slate-500">{mentorInfo.mentorExpertise}</p>
                  )}
                  {mentorInfo.duration && (
                    <p className="text-xs text-slate-400">
                      {mentorInfo.duration} {t("common.minute")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interview details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("userApplicationhistory.interviewDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {mentorInfo.duration ?? 60} {t("common.minute")}
                </span>
              </div>
              {mentorInfo.totalPrice != null && mentorInfo.totalPrice > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#0047AB]">
                    {mentorInfo.totalPrice.toLocaleString()} VND
                  </span>
                </div>
              )}
              <p className="text-sm text-slate-500">
                {t("userApplicationhistory.paymentRequiredNote")}
              </p>
            </CardContent>
          </Card>

          {/* Payment */}
          {isCreatingSession ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Spinner size="sm" tone="primary" />
              <span className="text-sm text-slate-500">
                {t("userApplicationhistory.preparingSession")}
              </span>
            </div>
          ) : (
            <Card className="border-[#0047AB]/30 bg-[#0047AB]/5">
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <CreditCard className="h-10 w-10 text-[#0047AB]" />
                <div className="text-center">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {t("userApplicationhistory.paymentRequired")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("userApplicationhistory.paymentRequiredDesc")}
                  </p>
                </div>
                <Button
                  onClick={handlePayment}
                  disabled={makePaymentMutation.isPending || !sessionId}
                  className="w-full gap-2 bg-[#0047AB] text-white hover:bg-[#003d91]">
                  {makePaymentMutation.isPending ? (
                    <>
                      <Spinner size="sm" tone="white" />
                      {t("compUi.processing")}
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {t("userApplicationhistory.proceedToPayment")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Session PAID / SCHEDULED — show join room screen
  if (sessionStatus === "PAID" || sessionStatus === "SCHEDULED") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("userApplicationhistory.mentorReviewRound")}
            </h1>
          </div>

          {/* Mentor card */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              {mentorInfo.mentorAvatar ? (
                <img
                  src={mentorInfo.mentorAvatar}
                  alt={mentorInfo.mentorName}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-[#0047AB]/20"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0047AB]/10 text-lg font-bold text-[#0047AB]">
                  {mentorInfo.mentorName?.charAt(0) ?? "M"}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {mentorInfo.mentorName}
                </p>
                <p className="text-sm text-slate-500">{mentorInfo.mentorExpertise}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {t("userApplicationhistory.paymentSuccessful")}
                </p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {t("userApplicationhistory.readyToJoinRoom")}
                </p>
              </div>
              <Button
                onClick={handleJoinRoom}
                size="lg"
                className="gap-2 bg-green-600 text-white hover:bg-green-700">
                <Video className="h-5 w-5" />
                {t("userApplicationhistory.joinRoomNow")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Session ONGOING — show in-progress screen
  if (sessionStatus === "ONGOING") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("userApplicationhistory.mentorReviewRound")}
            </h1>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {t("userApplicationhistory.interviewInProgress")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("userApplicationhistory.interviewInProgressDesc")}
                </p>
              </div>
              <Button
                onClick={handleJoinRoom}
                size="lg"
                className="gap-2 bg-[#0047AB] text-white hover:bg-[#003d91]">
                <Video className="h-5 w-5" />
                {t("userApplicationhistory.rejoinRoom")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Session COMPLETED / default — show STAR review form
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("userApplicationhistory.mentorReviewRound")}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {t("userApplicationhistory.mentorReviewRoundDesc")}
            </p>
          </div>
        </div>

        {/* Mentor Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {t("userApplicationhistory.mentorInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {mentorInfo.mentorAvatar ? (
                <img
                  src={mentorInfo.mentorAvatar}
                  alt={mentorInfo.mentorName}
                  className="h-14 w-14 rounded-full object-cover ring-2 ring-[#0047AB]/20"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0047AB]/10 text-lg font-bold text-[#0047AB]">
                  {mentorInfo.mentorName?.charAt(0) ?? "M"}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {mentorInfo.mentorName ?? t("userApplicationhistory.mentor")}
                </p>
                {mentorInfo.mentorExpertise && (
                  <p className="text-sm text-slate-500">{mentorInfo.mentorExpertise}</p>
                )}
                {mentorInfo.duration && (
                  <p className="text-xs text-slate-400">
                    {mentorInfo.duration} {t("common.minute")} •{" "}
                    {mentorInfo.totalPrice ? `${mentorInfo.totalPrice.toLocaleString()} VND` : ""}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* STAR Rating Form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {t("userApplicationhistory.ratingAndFeedback")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("userApplicationhistory.overallRating")} <span className="text-red-500">*</span>
              </Label>
              <StarRating
                value={rating}
                onChange={setRating}
                size="lg"
                className={cn(
                  "pointer-events-none opacity-50",
                  rating > 0 && "pointer-events-auto opacity-100"
                )}
              />
              {rating > 0 && (
                <p className="text-xs text-slate-500">
                  {t(`userApplicationhistory.rating${rating}Star` as const, { count: rating })}
                </p>
              )}
            </div>

            {/* STAR Fields */}
            <div className="space-y-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.starModel")}
              </p>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("userApplicationhistory.situation")}
                </Label>
                <p className="text-xs text-slate-500">
                  {t("userApplicationhistory.situationHint")}
                </p>
                <Textarea
                  value={situationNote}
                  onChange={(e) => setSituationNote(e.target.value)}
                  placeholder={t("userApplicationhistory.describeTheSituation")}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("userApplicationhistory.task")}</Label>
                <p className="text-xs text-slate-500">{t("userApplicationhistory.taskHint")}</p>
                <Textarea
                  value={taskNote}
                  onChange={(e) => setTaskNote(e.target.value)}
                  placeholder={t("userApplicationhistory.describeTheTask")}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("userApplicationhistory.action")}</Label>
                <p className="text-xs text-slate-500">{t("userApplicationhistory.actionHint")}</p>
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={t("userApplicationhistory.describeTheAction")}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("userApplicationhistory.result")}</Label>
                <p className="text-xs text-slate-500">{t("userApplicationhistory.resultHint")}</p>
                <Textarea
                  value={resultNote}
                  onChange={(e) => setResultNote(e.target.value)}
                  placeholder={t("userApplicationhistory.describeTheResult")}
                  rows={3}
                  maxLength={1000}
                />
              </div>
            </div>

            {/* Additional Feedback */}
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.additionalFeedback")}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("userApplicationhistory.strength")}
                  </Label>
                  <Textarea
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    placeholder={t("userApplicationhistory.whatDidTheMentorDoWell")}
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("userApplicationhistory.weakness")}
                  </Label>
                  <Textarea
                    value={weakness}
                    onChange={(e) => setWeakness(e.target.value)}
                    placeholder={t("userApplicationhistory.whatCouldBeImproved")}
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("userApplicationhistory.improvementSuggestion")}
                </Label>
                <Textarea
                  value={improve}
                  onChange={(e) => setImprove(e.target.value)}
                  placeholder={t("userApplicationhistory.suggestionsForImprovement")}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
            {t("general.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="gap-2 bg-[#0047AB] text-white hover:bg-[#003d91] disabled:bg-slate-300">
            {isSubmitting ? (
              <>
                <Spinner size="sm" tone="white" />
                {t("compUi.submitting")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("common.submit")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
