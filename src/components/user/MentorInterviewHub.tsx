import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRoundSession } from "@/hooks/useSession";
import { fetchClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  GraduationCap,
  HelpCircle,
  Hourglass,
  MapPin,
  MessageSquare,
  Send,
  Star,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

interface MentorInterviewHubProps {
  applicationId: number;
  detailId: number | undefined;
  mentorId: number | null | undefined;
  sessionId: number | null | undefined;
  sessionInfo: {
    sessionId?: number | null;
    meetingType?: "ONLINE" | "OFFLINE" | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
  mentorReview?: {
    id?: number;
    rating?: number;
    situationNote?: string;
    taskNote?: string;
    actionNote?: string;
    resultNote?: string;
    strength?: string;
    weakness?: string;
    improve?: string;
    mentor?: { id?: number; name?: string; avatarUrl?: string };
  };
  mentorFeedback?: { id?: number };
  status: string | undefined;
  /** True if the session has ended (user has joined and left the room) */
  sessionEnded?: boolean;
  /** Session status from API (e.g., "COMPLETED", "IN_PROGRESS") */
  sessionStatus?: string;
  currentUserId?: number;
  onFeedbackSubmitted?: () => void;
}

type HubStatus =
  | "NO_SLOT"
  | "SCHEDULE_CONFIRMED"
  | "ROOM_READY"
  | "OFFLINE_CONFIRMED"
  | "IN_PROGRESS"
  | "AWAITING_MENTOR_REVIEW"
  | "REVIEW_READY"
  | "RATE_MENTOR"
  | "COMPLETED";

// ============================================================
// Helpers
// ============================================================

function formatDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatVnDateTime(input: string | null | undefined): string {
  if (!input) return "-";
  const parsed = new Date(input.includes("T") ? input : input.replace(" ", "T") + "+07:00");
  if (Number.isNaN(parsed.getTime())) return input;
  return parsed.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  });
}

function deriveHubStatus(props: {
  status: string | undefined;
  sessionId: number | null | undefined;
  sessionInfo: {
    sessionId?: number | null;
    meetingType?: "ONLINE" | "OFFLINE" | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
  mentorReview?: {
    id?: number;
    rating?: number;
    situationNote?: string;
    taskNote?: string;
    actionNote?: string;
    resultNote?: string;
    strength?: string;
    weakness?: string;
    improve?: string;
    mentor?: { id?: number; name?: string; avatarUrl?: string };
  };
  mentorFeedback?: { id?: number };
  sessionEnded?: boolean;
  sessionStatus?: string;
}): HubStatus {
  const {
    status,
    sessionId,
    sessionInfo,
    mentorReview,
    mentorFeedback,
    sessionEnded,
    sessionStatus,
  } = props;

  // If user already submitted feedback -> COMPLETED
  if (mentorFeedback?.id) return "COMPLETED";

  // If mentor has reviewed -> show review
  if (mentorReview?.id) return "REVIEW_READY";

  // If session is COMPLETED (meeting ended) but no mentor review yet -> wait for mentor review
  if (sessionStatus === "COMPLETED" || sessionEnded) return "AWAITING_MENTOR_REVIEW";

  // If mentor has session and meeting time set (ONLINE) -> room ready
  if (sessionInfo?.meetingType === "ONLINE" && sessionId && sessionInfo?.startTime)
    return "ROOM_READY";

  // If offline confirmed
  if (sessionInfo?.meetingType === "OFFLINE" && sessionId) return "OFFLINE_CONFIRMED";

  // If session exists or slot picked
  if (sessionId || status === "SLOT_PICKED") return "SCHEDULE_CONFIRMED";

  // No session yet
  if (status === "PENDING") return "NO_SLOT";
  if (status === "AWAITING_MENTOR") return "AWAITING_MENTOR_REVIEW";

  return "NO_SLOT";
}

// ============================================================
// Progress Step Indicator
// ============================================================

const PROGRESS_STEPS = [
  { key: "pick_slot", label: "Chọn lịch", icon: Calendar },
  { key: "wait_room", label: "Chờ phòng", icon: Hourglass },
  { key: "interview", label: "Phỏng vấn", icon: Video },
  { key: "review", label: "Nhận review", icon: GraduationCap },
  { key: "rate", label: "Đánh giá", icon: Star },
];

function ProgressIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      {PROGRESS_STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                  isCurrent && "border-[#0047AB] bg-[#0047AB] text-white ring-4 ring-[#0047AB]/20",
                  !isCompleted &&
                    !isCurrent &&
                    "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                )}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] font-medium",
                  isCompleted && "text-emerald-600 dark:text-emerald-400",
                  isCurrent && "text-[#0047AB] dark:text-blue-400",
                  !isCompleted && !isCurrent && "text-slate-400 dark:text-slate-500"
                )}>
                {step.label}
              </span>
            </div>
            {idx < PROGRESS_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-0.5 flex-1 transition-all",
                  idx < currentStep ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Slot Selection Panel
// ============================================================

function SlotSelectionPanel({
  detailId,
  mentorId,
  onSuccess,
}: {
  detailId: number;
  mentorId: number | null | undefined;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [joinTimeLocal, setJoinTimeLocal] = useState<string>(() =>
    formatDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [meetingType, setMeetingType] = useState<"ONLINE" | "OFFLINE">("ONLINE");

  const createSession = useCreateRoundSession({
    onSuccess: () => {
      toast.success(
        meetingType === "OFFLINE"
          ? t("userMentorReview.offlineConfirmed")
          : t("userMentorReview.onlineConfirmed")
      );
      onSuccess();
    },
  });

  const handleConfirm = () => {
    if (!detailId || !mentorId) {
      toast.error(t("common.anErrorHasOccurred"));
      return;
    }
    const parsed = new Date(joinTimeLocal);
    if (Number.isNaN(parsed.getTime())) {
      toast.error(t("userMentorReview.invalidDate"));
      return;
    }
    createSession.mutate({
      applicationDetailId: detailId,
      mentorId,
      joinTime: parsed.toISOString(),
      duration: 60,
      offline: meetingType === "OFFLINE",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Calendar className="h-4 w-4 text-[#0047AB]" />
        {t("userMentorReview.chooseSchedule")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">{t("userMentorReview.meetingTime")}</Label>
          <Input
            type="datetime-local"
            value={joinTimeLocal}
            onChange={(e) => setJoinTimeLocal(e.target.value)}
            min={formatDateTimeLocal(new Date())}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">{t("userMentorReview.meetingType")}</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMeetingType("ONLINE")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2 text-xs font-medium transition",
                meetingType === "ONLINE"
                  ? "border-[#0047AB] bg-[#0047AB]/10 text-[#0047AB]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              )}>
              <Video className="h-3.5 w-3.5" />
              Online
            </button>
            <button
              type="button"
              onClick={() => setMeetingType("OFFLINE")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2 text-xs font-medium transition",
                meetingType === "OFFLINE"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              )}>
              <MapPin className="h-3.5 w-3.5" />
              Offline
            </button>
          </div>
        </div>
      </div>
      <Button
        onClick={handleConfirm}
        disabled={createSession.isPending}
        size="sm"
        className="gap-1.5 bg-[#0047AB] text-white hover:bg-[#003d91]">
        {createSession.isPending ? (
          <>
            <Spinner size="sm" tone="white" />
            {t("userMentorReview.confirming")}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("userMentorReview.confirm")}
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================================
// Schedule Confirmed View
// ============================================================

function ScheduleConfirmedView({ startTime }: { startTime: string | null | undefined }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
        <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {t("userMentorReview.scheduleConfirmed")}
        </p>
        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
          {startTime ? formatVnDateTime(startTime) : t("userMentorReview.waitingForRoom")}
        </p>
      </div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
    </div>
  );
}

// ============================================================
// Room Ready View (Online)
// ============================================================

function RoomReadyView({
  startTime,
  onJoin,
}: {
  startTime: string | null | undefined;
  onJoin: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800/40 dark:bg-emerald-950/20">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {t("userMentorReview.roomReady")}
          </p>
          {startTime && (
            <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              {t("userKiosk.interviewTime")}: {formatVnDateTime(startTime)}
            </p>
          )}
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onJoin}
          size="sm"
          className="flex-1 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700">
          <Video className="h-3.5 w-3.5" />
          {t("userMentorReview.joinOnlineRoom")}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Offline Confirmed View
// ============================================================

function OfflineConfirmedView({ startTime }: { startTime: string | null | undefined }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800/40 dark:bg-blue-950/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
        <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          {t("userMentorReview.offlineBookedTitle")}
        </p>
        <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
          {startTime ? formatVnDateTime(startTime) : t("userKiosk.interviewTime")}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Mentor Review Card
// ============================================================

function MentorReviewCard({ review }: { review: MentorInterviewHubProps["mentorReview"] }) {
  const { t } = useTranslation();
  if (!review) return null;

  const ratingValue =
    typeof review.rating === "number" && review.rating > 0
      ? Math.max(0, Math.min(5, review.rating / 2))
      : 0;

  const starRows = [
    { label: t("userApplicationhistory.situation"), value: review.situationNote },
    { label: t("userApplicationhistory.task"), value: review.taskNote },
    { label: t("userApplicationhistory.action"), value: review.actionNote },
    { label: t("userApplicationhistory.result"), value: review.resultNote },
  ];

  const hasAnyNote = starRows.some((row) => !!row.value && row.value.trim().length > 0);
  const hasStrengthFeedback = !!review.strength || !!review.weakness || !!review.improve;

  return (
    <div className="space-y-3 rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800/40 dark:bg-purple-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <p className="text-xs font-semibold tracking-wide text-purple-700 uppercase dark:text-purple-300">
            {t("userApplicationhistory.mentorReviewFromMentor")}
          </p>
        </div>
        {ratingValue > 0 && (
          <div className="flex items-center gap-1">
            <StarRating value={ratingValue} size="sm" readOnly />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              {ratingValue.toFixed(1)}/5
            </span>
          </div>
        )}
      </div>
      {hasAnyNote && (
        <div className="space-y-2">
          {starRows.map((row) => {
            if (!row.value || row.value.trim().length === 0) return null;
            return (
              <div key={row.label} className="text-xs">
                <p className="font-semibold text-purple-700 dark:text-purple-300">{row.label}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                  {row.value}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {hasStrengthFeedback && (
        <div className="grid gap-2 sm:grid-cols-3">
          {review.strength && (
            <div className="rounded-md border border-green-200 bg-white/70 p-2 text-xs dark:border-green-800 dark:bg-slate-900/30">
              <p className="flex items-center gap-1 font-semibold text-green-700 dark:text-green-300">
                <Star className="h-3 w-3 fill-green-400 text-green-400" />
                {t("userApplicationhistory.strength")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {review.strength}
              </p>
            </div>
          )}
          {review.weakness && (
            <div className="rounded-md border border-red-200 bg-white/70 p-2 text-xs dark:border-red-800 dark:bg-slate-900/30">
              <p className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300">
                <HelpCircle className="h-3 w-3" />
                {t("userApplicationhistory.weakness")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {review.weakness}
              </p>
            </div>
          )}
          {review.improve && (
            <div className="rounded-md border border-blue-200 bg-white/70 p-2 text-xs dark:border-blue-800 dark:bg-slate-900/30">
              <p className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300">
                <Clock className="h-3 w-3" />
                {t("userApplicationhistory.improvementSuggestion")}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {review.improve}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Rate Mentor Form
// ============================================================

function RateMentorForm({
  sessionId,
  mentorId,
  userId,
  onSubmitSuccess,
}: {
  sessionId: number | null | undefined;
  mentorId: number | null | undefined;
  userId: number | undefined;
  onSubmitSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = rating > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !sessionId || !mentorId || !userId) {
      toast.error(t("common.anErrorHasOccurred"));
      return;
    }
    setIsSubmitting(true);
    try {
      const { response } = await fetchClient.POST("/api/mentor-feedbacks", {
        body: { sessionId, mentorId, userId, rating, comment: comment || undefined },
      });
      if (!response.ok) throw new Error();
      toast.success(t("userApplicationhistory.reviewSubmittedSuccessfully"));
      onSubmitSuccess();
    } catch {
      toast.error(t("common.anErrorHasOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-[#0047AB]/20 bg-[#0047AB]/5 p-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#0047AB]" />
        <p className="text-sm font-medium text-[#0047AB]">
          {t("userApplicationhistory.ratingAndFeedback")}
        </p>
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">
            {t("userApplicationhistory.overallRating")} <span className="text-red-500">*</span>
          </Label>
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">
            {t("userKiosk.reviewMentorAfterInterview")}
          </Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("userApplicationhistory.feedbackPlaceholder")}
            rows={3}
            maxLength={500}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          size="sm"
          className="gap-1.5 bg-[#0047AB] text-white hover:bg-[#003d91]">
          {isSubmitting ? (
            <>
              <Spinner size="sm" tone="white" />
              {t("compUi.submitting")}
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              {t("common.submit")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Main Hub Component
// ============================================================

export function MentorInterviewHub({
  detailId,
  mentorId,
  sessionId,
  sessionInfo,
  mentorReview,
  mentorFeedback,
  status,
  sessionEnded,
  sessionStatus,
  currentUserId,
  onFeedbackSubmitted,
}: MentorInterviewHubProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const hubStatus = deriveHubStatus({
    status,
    sessionId,
    sessionInfo,
    mentorReview,
    mentorFeedback,
    sessionEnded,
    sessionStatus,
  });

  const progressStep = (() => {
    switch (hubStatus) {
      case "NO_SLOT":
      case "AWAITING_MENTOR_REVIEW":
        return 0;
      case "SCHEDULE_CONFIRMED":
      case "OFFLINE_CONFIRMED":
        return 1;
      case "ROOM_READY":
      case "IN_PROGRESS":
        return 2;
      case "REVIEW_READY":
        return 3;
      case "RATE_MENTOR":
      case "COMPLETED":
        return 4;
      default:
        return 0;
    }
  })();

  const handleJoinRoom = () => {
    if (sessionId) {
      navigate(`/user/sessions/room/${sessionId}`);
    }
  };

  const handleFeedbackSubmitted = () => {
    setRefreshKey((k) => k + 1);
    onFeedbackSubmitted?.();
  };

  const getStatusBadge = () => {
    switch (hubStatus) {
      case "NO_SLOT":
      case "AWAITING_MENTOR_REVIEW":
        return {
          label: t("userMentorReview.awaitingMentorTitle"),
          className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          icon: Hourglass,
        };
      case "SCHEDULE_CONFIRMED":
        return {
          label: t("userMentorReview.scheduleConfirmed"),
          className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
          icon: CalendarClock,
        };
      case "ROOM_READY":
        return {
          label: t("userMentorReview.roomReady"),
          className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          icon: Video,
        };
      case "OFFLINE_CONFIRMED":
        return {
          label: t("userMentorReview.offlineBookedTitle"),
          className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
          icon: MapPin,
        };
      case "IN_PROGRESS":
        return {
          label: t("userKiosk.interviewInProgress"),
          className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
          icon: Video,
        };
      case "REVIEW_READY":
        return {
          label: t("userApplicationhistory.reviewReceived"),
          className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
          icon: GraduationCap,
        };
      case "RATE_MENTOR":
        return {
          label: t("userApplicationhistory.pleaseRateMentor"),
          className: "bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#0047AB]/30 dark:text-blue-300",
          icon: Star,
        };
      case "COMPLETED":
        return {
          label: t("userApplicationhistory.completed"),
          className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
          icon: CheckCircle2,
        };
      default:
        return {
          label: t("userKiosk.mentorInterview"),
          className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
          icon: GraduationCap,
        };
    }
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <Card className="overflow-hidden border-[#0047AB]/20">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between bg-gradient-to-r from-[#0047AB] to-[#005B9A] px-4 py-3 text-left transition hover:from-[#003d91] hover:to-[#004B8A]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">{t("userKiosk.mentorInterview")}</p>
            <p className="text-xs text-white/80">{t("userKiosk.mentorInterviewSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              statusBadge.className.replace(/bg-\w+\[\/[\w%]+\]/g, "bg-white/20 text-white")
            )}>
            <StatusIcon className="h-3 w-3" />
            {statusBadge.label}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/80" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/80" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="p-0" key={refreshKey}>
          <div className="border-b border-slate-100 dark:border-slate-800">
            <ProgressIndicator currentStep={progressStep} />
          </div>
          <div className="p-4">
            {hubStatus === "NO_SLOT" && !mentorId && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <Hourglass className="h-10 w-10 text-amber-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("userMentorReview.awaitingMentorDesc")}
                </p>
              </div>
            )}
            {hubStatus === "NO_SLOT" && mentorId && detailId && (
              <SlotSelectionPanel
                detailId={detailId}
                mentorId={mentorId}
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            )}
            {hubStatus === "AWAITING_MENTOR_REVIEW" && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <Hourglass className="h-10 w-10 text-amber-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("userMentorReview.awaitingMentorDesc")}
                </p>
              </div>
            )}
            {hubStatus === "SCHEDULE_CONFIRMED" && (
              <ScheduleConfirmedView startTime={sessionInfo?.startTime} />
            )}
            {hubStatus === "ROOM_READY" && (
              <RoomReadyView startTime={sessionInfo?.startTime} onJoin={handleJoinRoom} />
            )}
            {hubStatus === "OFFLINE_CONFIRMED" && (
              <OfflineConfirmedView startTime={sessionInfo?.startTime} />
            )}
            {hubStatus === "REVIEW_READY" && <MentorReviewCard review={mentorReview} />}
            {hubStatus === "RATE_MENTOR" && (
              <div className="space-y-4">
                {mentorReview && <MentorReviewCard review={mentorReview} />}
                <RateMentorForm
                  sessionId={sessionId}
                  mentorId={mentorId}
                  userId={currentUserId}
                  onSubmitSuccess={handleFeedbackSubmitted}
                />
              </div>
            )}
            {hubStatus === "COMPLETED" && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  {t("userApplicationhistory.reviewAlreadySubmitted")}
                </p>
                <p className="text-xs text-slate-500">
                  {t("userApplicationhistory.thankYouForYourFeedback")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
