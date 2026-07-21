import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentRound } from "@/hooks/useRound";
import { useCreateRoundSession } from "@/hooks/useSession";
import { fetchClient } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Hourglass,
  LogIn,
  MapPin,
  Send,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================

type BookingStatus =
  | "AWAITING_MENTOR"
  | "MENTOR_ASSIGNED"
  | "ROOM_CREATED"
  | "OFFLINE_CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";
type ApplicationDetailStatus =
  | "PENDING"
  | "SLOT_PICKED"
  | "SUBMITTED"
  | "AI_EVALUATED"
  | "COMPLETED"
  | "ERROR"
  | "AWAITING_MENTOR";

interface ApplicationDetail {
  id?: number;
  applicationId?: number;
  roundId?: number;
  roundType?: string;
  status?: ApplicationDetailStatus;
  // Note: `bookingId` was removed from the BE `ApplicationDetail` schema on
  // 2026-07-18 (BACKEND_CHANGES_2026-07-17_18.md, §2). The v062/v063
  // round persisted it but never read it back. We keep the field here as a
  // tolerated optional so legacy snapshots don't crash, but on the v063
  // BE the value is always `undefined` — derive everything from
  // `sessionId` / `sessionInfo.sessionId` / `mentorId` instead.
  /** @deprecated Removed from BE schema 2026-07-18; use {@link sessionId} + {@link sessionInfo} */
  bookingId?: number;
  sessionId?: number;
  mentorId?: number | null;
  sessionInfo?: {
    sessionId?: number | null;
    meetingType?: "ONLINE" | "OFFLINE" | null;
    startTime?: string | null;
    endTime?: string | null;
  } | null;
  finalScore?: number;
  finalResult?: string;
  // After POST /api/mentor-reviews the backend sets `mentorReview`
  // (Mentor evaluating Student). After POST /api/mentor-feedbacks the
  // backend sets `mentorFeedback` (Student evaluating Mentor). On the
  // student-facing page we only care about feedback submitted by the
  // student, so we look for `mentorFeedback`.
  mentorReview?: { id?: number };
  mentorFeedback?: { id?: number };
}

interface MentorInterviewBooking {
  id?: number;
  applicationDetailId?: number;
  kioskId?: number;
  applicantUserId?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  mentorId?: number;
  sessionId?: number;
  status?: BookingStatus;
  sessionKey?: string;
  notes?: string;
}

// ============================================================
// Helpers
// ============================================================

// Best-effort mapping from an ApplicationDetail.status onto a BookingStatus
// the rest of the UI understands. BE has independent status fields for
// ApplicationDetail vs MentorInterviewBooking so we have to reconcile them
// client-side. Anything we can't map resolves to undefined (no booking yet).
function bookingStatusFromDetail(
  detailStatus: ApplicationDetailStatus | undefined
): BookingStatus | undefined {
  if (!detailStatus) return undefined;
  switch (detailStatus) {
    case "PENDING":
      return undefined;
    case "SLOT_PICKED":
    case "SUBMITTED":
      return "AWAITING_MENTOR";
    case "AI_EVALUATED":
      return "IN_PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return undefined;
  }
}

// Re-fetch a single ApplicationDetail by id (BE exposes this for any role).
// We use this for polling because `GET /api/mentor-bookings/{id}` is only
// available as DELETE on the BE side (controller doesn't expose GET).
async function fetchApplicationDetail(detailId: number): Promise<ApplicationDetail> {
  try {
    const { data } = await fetchClient.GET("/api/application-details/{id}", {
      params: { path: { id: detailId } },
    });
    return (data as ApplicationDetail | undefined) ?? {};
  } catch (err) {
    console.error("[MentorReviewPage] fetchApplicationDetail failed:", err);
    throw err;
  }
}

// ============================================================
// Step 1: Slot Selection Screen
// ============================================================

function SlotSelectionStep({
  applicationDetailId,
  mentorId,
  onSuccess,
}: {
  applicationDetailId: number;
  mentorId?: number | null;
  onSuccess: (_newBooking: MentorInterviewBooking) => void;
}) {
  const { t } = useTranslation();
  // Mentor Review v2 (2026-07-17): no kiosk. Candidate picks joinTime +
  // ONLINE/OFFLINE and we call `POST /api/sessions/create-for-round`.
  // The rest of the page still consumes `MentorInterviewBooking`, so we
  // synthesise a minimal snapshot from the returned Session.
  const [joinTimeLocal, setJoinTimeLocal] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setSeconds(0, 0);
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  });
  const [meetingType, setMeetingType] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const meetingTypeRef = useRef<"ONLINE" | "OFFLINE">("ONLINE");
  useEffect(() => {
    meetingTypeRef.current = meetingType;
  }, [meetingType]);

  const createRoundSessionMutation = useCreateRoundSession({
    onSuccess: (session) => {
      toast.success(
        meetingTypeRef.current === "OFFLINE"
          ? t("userMentorReview.offlineConfirmed")
          : t("userMentorReview.onlineConfirmed")
      );
      // Build a MentorInterviewBooking snapshot so the downstream
      // step components (RoomReadyStep / InProgressStep) can render
      // without modification. ONLINE → "ROOM_CREATED" (room ready
      // card with Daily.co link). OFFLINE → "OFFLINE_CONFIRMED"
      // (waiting card until mentor reviews on-site).
      const synthetic: MentorInterviewBooking = {
        id: session.id,
        applicationDetailId,
        sessionId: session.id,
        status: meetingTypeRef.current === "OFFLINE" ? "OFFLINE_CONFIRMED" : "ROOM_CREATED",
        scheduledStart: new Date(joinTimeLocal).toISOString(),
      };
      onSuccess(synthetic);
    },
  });

  const handleConfirm = () => {
    if (!applicationDetailId) {
      toast.error(t("common.anErrorHasOccurred"));
      return;
    }
    if (!joinTimeLocal) {
      toast.error(t("userMentorReview.pickDateFirst"));
      return;
    }
    const parsed = new Date(joinTimeLocal);
    if (Number.isNaN(parsed.getTime())) {
      toast.error(t("userMentorReview.invalidDate"));
      return;
    }
    if (!mentorId) {
      toast.error(t("userMentorReview.mentorMissing"));
      return;
    }
    // Native datetime-local gives a tz-naive string; convert to the
    // ISO-8601 the backend contract expects (UTC with millis).
    const joinTime = parsed.toISOString();
    createRoundSessionMutation.mutate({
      applicationDetailId,
      mentorId,
      joinTime,
      duration: 60,
      offline: meetingType === "OFFLINE",
    });
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900">
            <Calendar className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-indigo-700 dark:text-indigo-300">
              {t("userMentorReview.chooseSchedule")}
            </p>
            <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">
              {t("userMentorReview.chooseScheduleDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form: date-time + ONLINE/OFFLINE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-[#0047AB]" />
            {t("userMentorReview.pickDateAndType")}
          </CardTitle>
          <CardDescription>{t("userMentorReview.pickDateAndTypeDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* DateTime picker */}
          <div className="space-y-2">
            <Label htmlFor="mentor-review-join-time">{t("userMentorReview.meetingTime")}</Label>
            <Input
              id="mentor-review-join-time"
              type="datetime-local"
              value={joinTimeLocal}
              onChange={(e) => setJoinTimeLocal(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* ONLINE / OFFLINE radio */}
          <div className="space-y-2">
            <Label>{t("userMentorReview.meetingType")}</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMeetingType("ONLINE")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                  meetingType === "ONLINE"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}>
                <Video className="h-4 w-4" />
                {t("userMentorReview.online")}
              </button>
              <button
                type="button"
                onClick={() => setMeetingType("OFFLINE")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                  meetingType === "OFFLINE"
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}>
                <MapPin className="h-4 w-4" />
                {t("userMentorReview.offline")}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {meetingType === "ONLINE"
                ? t("userMentorReview.onlineHint")
                : t("userMentorReview.offlineHint")}
            </p>
          </div>

          {/* Confirm */}
          <Button
            onClick={handleConfirm}
            disabled={createRoundSessionMutation.isPending}
            className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
            {createRoundSessionMutation.isPending ? (
              <>
                <Spinner size="sm" tone="white" />
                {t("userMentorReview.confirming")}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t("userMentorReview.confirm")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Step 2: Waiting for Mentor
// ============================================================

// ============================================================
// Step 3: Room Ready (mentor assigned, room created)
// ============================================================

function RoomReadyStep({
  booking,
  roomUrl,
  onJoinRoom,
}: {
  booking: MentorInterviewBooking;
  roomUrl?: string | null;
  onJoinRoom: () => void;
}) {
  const { t } = useTranslation();

  const scheduledTime = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="space-y-5">
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              {t("userMentorReview.roomReady")}
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {t("userMentorReview.roomReadyDesc")}
            </p>
          </div>
          {scheduledTime && (
            <div className="rounded-lg border border-green-200 bg-white/60 px-4 py-2 dark:border-green-800 dark:bg-black/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                {t("userKiosk.interviewTime")}: {scheduledTime}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily.co room link */}
      {roomUrl && (
        <Card className="border-[#0047AB]/30 bg-[#0047AB]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="h-4 w-4 text-[#0047AB]" />
              {t("userMentorReview.dailyRoomUrl")}
            </CardTitle>
            <CardDescription>{t("userMentorReview.dailyRoomUrlDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[#0047AB]/20 bg-white px-4 py-3 font-mono text-xs break-all text-[#0047AB]">
              {roomUrl}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Join Daily.co room */}
      <Button
        onClick={onJoinRoom}
        size="lg"
        className="w-full gap-2 bg-green-600 text-white hover:bg-green-700">
        <Video className="h-5 w-5" />
        {t("userMentorReview.joinOnlineRoom")}
      </Button>
    </div>
  );
}

// ============================================================
// Awaiting Mentor Assignment — admin has not assigned a mentor yet.
// ============================================================

function AwaitingMentorAssignmentStep() {
  const { t } = useTranslation();
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Hourglass className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
            {t("userMentorReview.awaitingMentorTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            {t("userMentorReview.awaitingMentorDesc")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Offline confirmed — waiting for the in-person meeting
// ============================================================

function OfflineConfirmedStep({ booking }: { booking: MentorInterviewBooking }) {
  const { t } = useTranslation();
  const scheduledTime = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <MapPin className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
            {t("userMentorReview.offlineBookedTitle")}
          </p>
          <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
            {t("userMentorReview.offlineBookedDesc")}
          </p>
        </div>
        {scheduledTime && (
          <div className="rounded-lg border border-emerald-200 bg-white/60 px-4 py-2 dark:border-emerald-800 dark:bg-black/20">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {t("userKiosk.interviewTime")}: {scheduledTime}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Step 4: In Progress (at kiosk)
// ============================================================

function InProgressStep({
  roomUrl,
  sessionTiming,
  sessionId,
  onJoinRoom,
}: {
  roomUrl?: string;
  sessionTiming?: {
    startTime1?: string | null;
    startTime2?: string | null;
    endTime1?: string | null;
    endTime2?: string | null;
    durationSeconds1?: number | null;
    durationSeconds2?: number | null;
  } | null;
  sessionId?: number;
  onJoinRoom?: () => void;
}) {
  const { t } = useTranslation();
  const canRejoin = !!roomUrl && !!onJoinRoom;
  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Video className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            {t("userKiosk.interviewInProgress")}
          </p>
          <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
            {t("userKiosk.interviewInProgressDesc")}
          </p>
        </div>
        {canRejoin && (
          <Button
            type="button"
            onClick={onJoinRoom}
            className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
            <LogIn className="h-4 w-4" />
            {t("userMentorReview.rejoinRoom")}
          </Button>
        )}
        {sessionTiming && (
          <SessionTimingPanel
            startTime1={sessionTiming.startTime1}
            endTime1={sessionTiming.endTime1}
            durationSeconds1={sessionTiming.durationSeconds1}
            startTime2={sessionTiming.startTime2}
            endTime2={sessionTiming.endTime2}
            durationSeconds2={sessionTiming.durationSeconds2}
            sessionId={sessionId}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Show the BE-tracked join/leave durations next to the InProgress card
 * so the candidate can see whether they or the mentor has already
 * joined and how long each of them has been in the room.
 */
function SessionTimingPanel({
  startTime1,
  endTime1,
  durationSeconds1,
  startTime2,
  endTime2,
  durationSeconds2,
  sessionId,
}: {
  startTime1?: string | null;
  endTime1?: string | null;
  durationSeconds1?: number | null;
  startTime2?: string | null;
  endTime2?: string | null;
  durationSeconds2?: number | null;
  sessionId?: number;
}) {
  const { t } = useTranslation();
  const hasAnyTiming = !!(startTime1 || startTime2);
  if (!hasAnyTiming) {
    return (
      <p className="text-xs text-blue-600 dark:text-blue-400">
        {t("userMentorReview.timingNotRecorded")}
        {sessionId ? ` (#${sessionId})` : ""}
      </p>
    );
  }
  return (
    <div className="grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-2">
      <TimingChip
        label={t("userMentorReview.student")}
        startAt={startTime1}
        endAt={endTime1}
        durationSeconds={durationSeconds1}
      />
      <TimingChip
        label={t("userMentorReview.mentor")}
        startAt={startTime2}
        endAt={endTime2}
        durationSeconds={durationSeconds2}
      />
    </div>
  );
}

function TimingChip({
  label,
  startAt,
  endAt,
  durationSeconds,
}: {
  label: string;
  startAt?: string | null;
  endAt?: string | null;
  durationSeconds?: number | null;
}) {
  const { t } = useTranslation();
  if (!startAt) {
    return (
      <div className="rounded-lg border border-blue-200 bg-white/60 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-black/20">
        <p className="font-semibold">{label}</p>
        <p className="text-blue-500 dark:text-blue-400">—</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-blue-200 bg-white/60 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-black/20">
      <p className="font-semibold">{label}</p>
      <p>
        <span className="text-blue-500 dark:text-blue-400">{t("userMentorReview.joinedAt")}: </span>
        {formatVnDateTime(startAt)}
      </p>
      {endAt && (
        <p>
          <span className="text-blue-500 dark:text-blue-400">{t("userMentorReview.leftAt")}: </span>
          {formatVnDateTime(endAt)}
        </p>
      )}
      {typeof durationSeconds === "number" && (
        <p className="font-mono">
          {t("userMentorReview.duration")}: {formatVnDuration(durationSeconds, t)}
        </p>
      )}
    </div>
  );
}

function formatVnDuration(seconds: number, t: (key: string) => string): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} ${t("hour")} ${m} ${t("minute")} ${s} ${t("general.second") || "giây"}`;
  if (m > 0) return `${m} ${t("minute")} ${s} ${t("general.second") || "giây"}`;
  return `${s} ${t("general.second") || "giây"}`;
}

/**
 * Backend records timestamps as naive "yyyy-MM-dd HH:mm:ss.SSS" in UTC+7.
 * Append the offset so `new Date(...)` parses to the intended instant.
 */
function formatVnDateTime(input: string | null | undefined): string {
  if (!input) return "-";
  const parsed = new Date(input.includes("T") ? input : input.replace(" ", "T") + "+07:00");
  if (Number.isNaN(parsed.getTime())) return input;
  return parsed.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  });
}

// ============================================================
// Step 5: STAR Review Form
// ============================================================

function ReviewFormStep({
  sessionId,
  mentorId,
  userId,
  onSubmitSuccess,
}: {
  sessionId?: number;
  mentorId?: number;
  userId?: number;
  onSubmitSuccess: () => void;
}) {
  const { t } = useTranslation();
  // 2026-07-18: surface prop identity on every mount so we can see whether
  // the parent rendered the form with complete identity (sessionId + mentorId
  // + userId) or with holes that would silently kill the POST.
  console.log("[MentorReviewPage] ReviewFormStep mounted with props", {
    sessionId,
    mentorId,
    userId,
  });
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

  const handleSubmit = async () => {
    // 2026-07-18: verbose logging — student reported "An error has occurred"
    // with no API call visible. Surface every input + decision so we can see
    // whether we're bailing out client-side, hitting a 4xx, or getting 0
    // network activity.
    console.log("[MentorReviewPage] submit clicked", {
      sessionId,
      mentorId,
      userId,
      rating,
      canSubmit,
      hasComment: !!(
        situationNote.trim() ||
        taskNote.trim() ||
        actionNote.trim() ||
        resultNote.trim() ||
        strength.trim() ||
        weakness.trim() ||
        improve.trim()
      ),
    });
    if (!canSubmit) {
      console.warn("[MentorReviewPage] submit blocked: canSubmit=false", { rating });
      return;
    }
    if (!sessionId || !mentorId || !userId) {
      console.error("[MentorReviewPage] submit blocked: missing identity", {
        sessionId,
        mentorId,
        userId,
      });
      toast.error(t("common.anErrorHasOccurred"));
      return;
    }
    setIsSubmitting(true);
    const commentText =
      [
        situationNote.trim(),
        taskNote.trim(),
        actionNote.trim(),
        resultNote.trim(),
        strength.trim(),
        weakness.trim(),
        improve.trim(),
      ]
        .filter(Boolean)
        .join("\n\n") || undefined;
    console.log("[MentorReviewPage] POST /api/mentor-feedbacks", {
      sessionId,
      mentorId,
      userId,
      rating,
      commentLen: commentText?.length ?? 0,
    });
    try {
      const { response } = await fetchClient.POST("/api/mentor-feedbacks", {
        body: { sessionId, mentorId, userId, rating, comment: commentText },
      });
      console.log("[MentorReviewPage] POST response", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });
      if (!response.ok) {
        let errBody: unknown = null;
        try {
          errBody = await response.json();
        } catch {
          try {
            errBody = await response.text();
          } catch {
            errBody = "<unreadable>";
          }
        }
        console.error("[MentorReviewPage] POST failed body:", errBody);
        const errData = (errBody ?? {}) as { message?: string };
        toast.error(errData?.message ?? t("common.anErrorHasOccurred"));
        return;
      }
      toast.success(t("userApplicationhistory.reviewSubmittedSuccessfully"));
      onSubmitSuccess();
    } catch (err) {
      console.error("[MentorReviewPage] submit feedback threw:", err);
      toast.error(t("common.anErrorHasOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900">
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("userApplicationhistory.ratingAndFeedback")}
          </p>
          <p className="text-sm text-slate-500">{t("userKiosk.reviewMentorAfterInterview")}</p>
        </div>
      </div>

      {/* STAR Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("userApplicationhistory.starModel")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("userApplicationhistory.overallRating")} <span className="text-red-500">*</span>
            </Label>
            <StarRating value={rating} onChange={setRating} size="lg" />
            {rating > 0 && (
              <p className="text-xs text-slate-500">
                {t(`userApplicationhistory.rating${rating}Star` as const, { count: rating })}
              </p>
            )}
          </div>

          {/* STAR Fields */}
          <div className="space-y-4">
            {[
              {
                label: t("userApplicationhistory.situation"),
                hint: t("userApplicationhistory.situationHint"),
                value: situationNote,
                onChange: setSituationNote,
                placeholder: t("userApplicationhistory.describeTheSituation"),
              },
              {
                label: t("userApplicationhistory.task"),
                hint: t("userApplicationhistory.taskHint"),
                value: taskNote,
                onChange: setTaskNote,
                placeholder: t("userApplicationhistory.describeTheTask"),
              },
              {
                label: t("userApplicationhistory.action"),
                hint: t("userApplicationhistory.actionHint"),
                value: actionNote,
                onChange: setActionNote,
                placeholder: t("userApplicationhistory.describeTheAction"),
              },
              {
                label: t("userApplicationhistory.result"),
                hint: t("userApplicationhistory.resultHint"),
                value: resultNote,
                onChange: setResultNote,
                placeholder: t("userApplicationhistory.describeTheResult"),
              },
            ].map((field) => (
              <div key={field.label} className="space-y-2">
                <Label className="text-sm font-medium">{field.label}</Label>
                <p className="text-xs text-slate-500">{field.hint}</p>
                <Textarea
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  maxLength={1000}
                />
              </div>
            ))}
          </div>

          {/* Additional Feedback */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("userApplicationhistory.strength")}</Label>
              <Textarea
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder={t("userApplicationhistory.whatDidTheMentorDoWell")}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("userApplicationhistory.weakness")}</Label>
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

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
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
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================

export function ApplicationMentorReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const applicationId = Number(params.applicationId);

  // State
  const [applicationDetail, setApplicationDetail] = useState<ApplicationDetail | null>(null);
  // Booking fields we need to render the UI are kept in their own state because
  // BE doesn't expose a single `GET /api/mentor-bookings/{id}` endpoint for
  // students. Instead we lift them into local state on pick-slot and refresh
  // them by re-fetching the parent ApplicationDetail (which embeds
  // `bookingId`, `sessionId`, `status`).
  const [booking, setBooking] = useState<MentorInterviewBooking | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  // Live tracking fields lifted from /api/sessions/{id}. While
  // `useDailyTracking` (created in 2026-07-17) would POST /join-session
  // to record `startTime1/2` client-side, the simpler initial approach
  // is to read whatever the BE has already recorded (webhook
  // `endTime1/2` is processed by BE; we can show the user the
  // progress in real-time without touching Daily's iframe lifecycle).
  const [sessionTiming, setSessionTiming] = useState<{
    startTime1?: string | null;
    startTime2?: string | null;
    endTime1?: string | null;
    endTime2?: string | null;
    durationSeconds1?: number | null;
    durationSeconds2?: number | null;
    participantId1?: string | null;
    participantId2?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes "still fetching" from "fetched but BE returned []" so we
  // can offer a Retry / re-trigger instead of an infinite spinner when the
  // backend hasn't auto-created the ApplicationDetail for this round yet.
  const [detailsResolved, setDetailsResolved] = useState(false);
  // Bump to force the fetch effect to re-run (was previously triggered by
  // a manual Retry button; the button has been removed in 2026-07-17, but
  // we keep the dependency in the fetch effect so future re-introductions
  // of a Retry CTA only have to call the setter).
  const [retryToken] = useState(0);
  // Tracks an explicit "no ApplicationDetail exists for this round" outcome
  // — surfaces a different UX (legacy data warning) than a network error.
  // 2026-07-17: legacy "Booking is not ready" empty-state card has been
  // removed, so the read flag is no longer needed in JSX. The setter is
  // still kept (and consumed) inside the fetch effect.

  const [, _setDetailMissing] = useState(false);

  const { data: currentRound, isLoading: currentRoundLoading } = useCurrentRound(
    applicationId,
    !!applicationId
  );

  // ============================================================
  // Fetch application detail + booking on mount.
  // We run the fetch ONCE per `applicationId` (or when the user retries) once
  // the current-round query has settled. Earlier versions listed several
  // React-Query / translation-derived values in the dependency array which
  // caused re-runs whenever those references changed, producing an infinite
  // fetch loop and repeated "no ApplicationDetail for current round" warnings
  // in the console even after the detail had been resolved.
  // ============================================================
  const fetchStartedRef = useRef(false);
  // Reset the "already fetched" sentinel whenever the user navigates to a
  // different application so we re-fetch the new application's detail.
  useEffect(() => {
    fetchStartedRef.current = false;
  }, [applicationId]);
  useEffect(() => {
    if (!applicationId) return;
    if (currentRoundLoading) return;
    // Always allow re-run on explicit retry (`retryToken`) or if the user
    // switched to a different application.
    const allowReFetch = fetchStartedRef.current === false || retryToken > 0;
    if (!allowReFetch) return;
    if (!currentRound?.id) {
      // Current round query has settled but returned nothing → can't proceed.
      setLoading(false);
      setDetailsResolved(true);
      return;
    }
    fetchStartedRef.current = true;

    const fetchData = async () => {
      setLoading(true);
      setDetailsResolved(false);
      _setDetailMissing(false);
      try {
        const detailRes = await fetchClient.GET(
          "/api/application-details/application/{applicationId}",
          { params: { path: { applicationId } } }
        );

        if (detailRes.response?.ok && Array.isArray(detailRes.data)) {
          const details = detailRes.data as ApplicationDetail[];

          // Backend v062: tự tạo ApplicationDetail cho MENTOR_REVIEW khi moveToNextRound()
          // Frontend dùng current round để xác định detail đúng, tránh lấy nhầm detail cũ.
          const currentRoundId = currentRound.id;
          let currentDetail = details.find((d) => d.roundId === currentRoundId) ?? null;

          // Defensive fallback: when the application only has the MENTOR_REVIEW detail
          // (e.g. user just unlocked this round), take it even if roundId did not match.
          // This covers schema drift between `currentRound.id` and detail roundIds.
          if (!currentDetail && currentRound.roundType === "MENTROR_REVIEW") {
            // 2026-07-17: relax the allowlist — `IN_PROGRESS`,
            // `ROOM_CREATED`, `MENTOR_ASSIGNED`, `OFFLINE_CONFIRMED` and
            // any other round status BE may introduce all correspond to a
            // Mentor Interview detail. Old version only accepted the five
            // legacy statuses (PENDING / SLOT_PICKED / SUBMITTED /
            // AI_EVALUATED / COMPLETED) which would silently produce no
            // detail and leave the page blank.
            const mentorDetails = details.filter(
              (d) => !["CODE_REVIEW", "QUIZ", "TECHNICAL_INTERVIEW"].includes(d.roundType ?? "")
            );
            if (mentorDetails.length === 1) {
              currentDetail = mentorDetails[0] ?? null;
            } else if (mentorDetails.length > 1) {
              // Pick the newest by id as a tie-breaker.
              currentDetail =
                mentorDetails.reduce((acc, d) => ((d.id ?? 0) > (acc.id ?? 0) ? d : acc)) ?? null;
            }
          }

          if (typeof window !== "undefined") {
            console.debug("[MentorReviewPage] detail selection", {
              applicationId,
              currentRoundId,
              currentRoundType: currentRound.roundType,
              detailCount: details.length,
              detailRoundIds: details.map((d) => d.roundId),
              detailStatuses: details.map((d) => d.status),
              bookingIds: details.map((d) => d.bookingId),
              sessionIds: details.map((d) => d.sessionId),
              resolvedDetailId: currentDetail?.id ?? null,
              resolvedDetailStatus: currentDetail?.status ?? null,
              resolvedDetailBookingId: currentDetail?.bookingId ?? null,
            });
          }

          if (!currentDetail) {
            console.warn("[MentorReviewPage] no ApplicationDetail for current round", {
              currentRoundId,
              currentRoundType: currentRound.roundType,
              detailCount: details.length,
              detailRoundIds: details.map((d) => d.roundId),
            });
            _setDetailMissing(true);
          }

          setApplicationDetail(currentDetail ?? null);
          setDetailsResolved(true);

          // BACKEND v062 NOTE:
          // — `GET /api/mentor-bookings/{id}` is NOT exposed for students; only
          //   DELETE is supported by BE controller. Earlier versions of this
          //   page polled that endpoint and would log 405s every 5s.
          // — Instead, we lift the subset of booking fields we render into
          //   local state on `pick-slot` and refresh them by re-fetching the
          //   parent ApplicationDetail (which embeds bookingId / sessionId /
          //   status / mentorReview.id etc.).
          if (currentDetail?.bookingId) {
            // Keep the local booking snapshot in sync with whatever the most
            // recent detail already tells us, so we don't need a separate
            // booking-detail fetch.
            setBooking((prev) => ({
              id: currentDetail.bookingId,
              sessionId: currentDetail.sessionId,
              status: bookingStatusFromDetail(currentDetail.status),
              ...(prev ?? {}),
            }));
          } else {
            // 2026-07-18: detail.bookingId may be null on rounds created before
            // the v062 schema switch (the BE controller never persisted it).
            // Wipe the booking snapshot so the page doesn't display a stale
            // "your interview is in this room" card tied to a deleted booking.
            setBooking(null);
          }
          // 2026-07-18: always fetch session by sessionId if we have one,
          // not just when bookingId is present. The session row carries the
          // ground-truth `status` + `mentorReview` flags which drive whether
          // the student should see the feedback form. Booking-derived state
          // is a derived optimisation; session-derived state is the source
          // of truth.
          // sessionId lives in two places in the BE schema:
          // 1. top-level `sessionId` (preferred, set by create-for-round)
          // 2. nested `sessionInfo.sessionId` (always present when BE created a session)
          // Use whichever is available so we can still fetch the session when (1) is null.
          const sessionIdToFetch =
            currentDetail?.sessionId ?? currentDetail?.sessionInfo?.sessionId ?? null;
          if (sessionIdToFetch) {
            try {
              const sessionRefetch = await fetchClient.GET("/api/sessions/{id}", {
                params: { path: { id: sessionIdToFetch } },
              });
              const live = (sessionRefetch.data ?? null) as {
                roomUrl?: string;
                startTime1?: string | null;
                startTime2?: string | null;
                endTime1?: string | null;
                endTime2?: string | null;
                durationSeconds1?: number | null;
                durationSeconds2?: number | null;
                participantId1?: string | null;
                participantId2?: string | null;
                status?: string;
                mentorReview?: unknown;
                userId?: number;
              } | null;
              sessionRef.current = live
                ? { status: live.status, mentorReview: live.mentorReview, userId: live.userId }
                : null;
              const room = live?.roomUrl;
              if (room) setRoomUrl(room);
              if (live) setSessionTiming(live);
            } catch {
              // session may not be ready
            }
          }
        }
      } catch (err) {
        console.error("[MentorReviewPage] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
    // Stable deps: only re-run when the application or the current-round
    // query transitions, or when the user explicitly retries. Translation
    // and the currentRound object's identity are intentionally excluded to
    // avoid the infinite re-fetch loop we observed before.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, currentRoundLoading, retryToken]);

  // ============================================================
  // Polling: refresh detail+booking status by re-fetching the
  // ApplicationDetail (which embeds sessionId / status / mentorReview.id).
  // Earlier we polled `GET /api/mentor-bookings/{id}` every 5s — that
  // endpoint isn't exposed to students so polling failed silently.
  // ============================================================
  useEffect(() => {
    if (!applicationDetail?.id) return;
    if (booking?.status === "COMPLETED" || booking?.status === "CANCELED") return;

    const interval = setInterval(async () => {
      if (!applicationDetail?.id) return;
      try {
        const fresh = await fetchApplicationDetail(applicationDetail.id);
        // Merge fields we don't have direct access to otherwise.
        setApplicationDetail((prev) => ({ ...(prev ?? {}), ...fresh }));
        if (fresh.bookingId) {
          setBooking((prev) => ({
            id: fresh.bookingId,
            sessionId: fresh.sessionId,
            status: bookingStatusFromDetail(fresh.status),
            ...(prev ?? {}),
          }));
        }
        // Use either top-level sessionId or nested sessionInfo.sessionId.
        const freshSessionId =
          fresh.sessionId ??
          (fresh.sessionInfo as { sessionId?: number } | null)?.sessionId ??
          null;
        if (freshSessionId) {
          try {
            const sessionRefetch = await fetchClient.GET("/api/sessions/{id}", {
              params: { path: { id: freshSessionId } },
            });
            const live = (sessionRefetch.data ?? null) as {
              roomUrl?: string;
              participantId1?: string | null;
              participantId2?: string | null;
              startTime1?: string | null;
              startTime2?: string | null;
              endTime1?: string | null;
              endTime2?: string | null;
              durationSeconds1?: number | null;
              durationSeconds2?: number | null;
              status?: string;
              mentorReview?: unknown;
              userId?: number;
            } | null;
            // Update sessionRef so mentorReview is visible in the UI without F5.
            sessionRef.current = live
              ? { status: live.status, mentorReview: live.mentorReview, userId: live.userId }
              : null;
            const room = live?.roomUrl;
            if (room) setRoomUrl(room);
            if (live) setSessionTiming(live);
          } catch {
            // session endpoint might 404 briefly after admin assign; ignore.
          }
        }
      } catch (err) {
        console.error("[MentorReviewPage] refresh detail failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [applicationDetail?.id, booking?.status]);

  // ============================================================
  // Handlers
  // ============================================================

  // Handle slot selection success (after pick-slot)
  const handleSlotPicked = (newBooking: MentorInterviewBooking) => {
    setBooking(newBooking);
    // Update application detail with new bookingId
    setApplicationDetail((prev) =>
      prev ? { ...prev, bookingId: newBooking.id, status: "SLOT_PICKED" } : prev
    );
    // For ONLINE flow, immediately fetch the Session to get roomUrl.
    if (newBooking.sessionId) {
      void fetchSessionRoomUrl(newBooking.sessionId);
    }
  };

  // Join the Daily.co room for an ONLINE interview. Opens the roomUrl
  // directly (the room is "public" per BE doc, so no token is needed).
  // 2026-07-17: students were getting a blank rejoin because the previous
  //   implementation fell back to `booking.sessionKey` (the RoomName, e.g.
  //   "session-1721...") when roomUrl hadn't populated yet, which of course
  //   isn't a valid Daily URL. Compose the public URL from sessionId or
  //   fall back to a stable derivation so the Rejoin button always works.
  // Navigate to the inline Daily iframe (StudentSessionRoomPage) instead
  // of opening the Daily URL in a new tab. The new tab approach meant we
  // never observed Daily's `joined-meeting` event in the main thread, so
  // BE never got the POST /api/sessions/join-session call → startTime1
  // stayed null. The inline page mounts <VideoCallProvider/> and tracks
  // the join exactly the same way MentorSessionRoomPage does for mentor.
  const handleJoinRoom = () => {
    const sessionId = bookingSnapshot?.sessionId ?? applicationDetail?.sessionId;
    if (sessionId) {
      navigate(`/user/sessions/room/${sessionId}`);
      return;
    }
    // Session snapshot may not have id yet (early mount); fall back
    // to opening Daily.co directly so the candidate isn't locked out.
    const target = composeDailyRoomUrl(roomUrl, booking?.sessionKey);
    if (!target) return;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  /**
   * Build a Daily.co URL usable by Daily's iframe. Accepts:
   *   - full URL (returns as-is)
   *   - explicit "OFFLINE" (returns null — no online room)
   *   - bare session key like "session-1721..." (derives
   *     https://inblue.daily.co/{key})
   *   - anything else falsy (returns null)
   */
  function composeDailyRoomUrl(
    candidate: string | null | undefined,
    fallbackKey: string | undefined
  ): string | null {
    const raw = (candidate ?? "").trim();
    if (raw && raw !== "OFFLINE") {
      if (/^https?:\/\//i.test(raw)) return raw;
      // BE sometimes returns just the key instead of the full URL.
      const key = raw.replace(/^\/+/, "");
      return `https://inblue.daily.co/${encodeURIComponent(key)}`;
    }
    if (fallbackKey && fallbackKey !== "OFFLINE") {
      return `https://inblue.daily.co/${encodeURIComponent(fallbackKey)}`;
    }
    return null;
  }

  // Re-fetch roomUrl for a session (used after SlotSelectionStep success).
  const fetchSessionRoomUrl = async (sessionId: number) => {
    try {
      const { data } = await fetchClient.GET("/api/sessions/{id}", {
        params: { path: { id: sessionId } },
      });
      const live =
        (data as
          | {
              roomUrl?: string;
              participantId1?: string | null;
              participantId2?: string | null;
              startTime1?: string | null;
              startTime2?: string | null;
              endTime1?: string | null;
              endTime2?: string | null;
              durationSeconds1?: number | null;
              durationSeconds2?: number | null;
              status?: string;
              mentorReview?: unknown;
              userId?: number;
            }
          | undefined) ?? null;
      // Keep sessionRef in sync so mentorReview/status changes propagate without F5.
      sessionRef.current = live
        ? { status: live.status, mentorReview: live.mentorReview, userId: live.userId }
        : null;
      const room = live?.roomUrl;
      if (room === "OFFLINE") {
        setRoomUrl("OFFLINE");
      } else if (room) {
        setRoomUrl(room);
      }
      if (live) setSessionTiming(live);
    } catch {
      // session may not be ready yet; ignore
    }
  };

  // Cancel booking
  // 2026-07-18: in the new Mentor Interview flow `booking.id` is *always*
  // null (BE confirmed bookingId is unused). Until BE exposes a proper
  // cancel-session endpoint we no-op + warn instead of deleting a
  // non-existent booking — otherwise the user gets a silent 404 every
  // time. TODO: hook this up once POST /api/sessions/{id}/cancel exists.
  /*
  const _handleCancelBooking = async () => {
    if (typeof window !== "undefined") {
      console.warn(
        "[MentorReviewPage] cancel requested but BE has not exposed an endpoint for the new Mentor Interview flow; awaiting BE ticket."
      );
    }
    toast.error(
      t("userKiosk.bookingCancelledSuccessfully") +
        " (tính năng tạm thời chưa khả dụng — đang chờ BE bổ sung API cancel)"
    );
  };
  */

  // 2026-07-18: when ApplicationDetail carries a sessionId but the
  // local roomUrl / sessionTiming caches are still empty (e.g. hard
  // reload before the first poll, or SlotSelectionStep completed in
  // a previous browser session), prime them from /api/sessions/{id}.
  // Without this the page rendered before but `RoomReadyStep` had no
  // roomUrl to display. Supports both top-level sessionId and nested
  // sessionInfo.sessionId (BE may populate either).
  useEffect(() => {
    const sid = applicationDetail?.sessionId ?? applicationDetail?.sessionInfo?.sessionId ?? null;
    if (!sid) return;
    if (roomUrl) return;
    void fetchSessionRoomUrl(sid);
  }, [applicationDetail?.sessionId, applicationDetail?.sessionInfo?.sessionId, roomUrl]);

  // Review submitted
  const handleReviewSubmitted = () => {
    navigate(-1);
  };

  // ============================================================
  // Derive UI state from backend data
  // ============================================================

  // 2026-07-18: backend v063 confirmed `bookingId` is *always* null in
  // the new Mentor Interview flow. Don't gate the UI on a booking
  // snapshot we will never get. Instead synthesise a derived booking
  // from ApplicationDetail itself + the session-detail roomUrl /
  // sessionTiming. UI branches then read from `bookingSnapshot` and
  // don't have to know whether the data came from
  // `MentorInterviewBooking` or `ApplicationDetail`.
  // 2026-07-18: also fallback to sessionInfo.sessionId when top-level is null.
  const effectiveSessionId =
    applicationDetail?.sessionId ?? applicationDetail?.sessionInfo?.sessionId ?? null;
  const bookingSnapshot: MentorInterviewBooking | null =
    booking ??
    (effectiveSessionId && applicationDetail
      ? ({
          id: applicationDetail.bookingId ?? effectiveSessionId,
          sessionId: effectiveSessionId,
          mentorId: applicationDetail.mentorId,
          status: bookingStatusFromDetail(applicationDetail.status) ?? "ROOM_CREATED",
        } as MentorInterviewBooking)
      : null);

  const applicationDetailId = applicationDetail?.id ?? 0;
  const bookingStatus = bookingSnapshot?.status;
  // The student page is showing "have you rated the mentor?" so the
  // relevant marker on ApplicationDetail is `mentorFeedback` (set by
  // POST /api/mentor-feedbacks). `mentorReview` is the *mentor's*
  // evaluation of the student, which is irrelevant here.
  const isReviewed = !!applicationDetail?.mentorFeedback;
  // 2026-07-18: session.status=COMPLETED is ground-truth for "interview is over".
  // Before this fix, the page relied on `applicationDetail.status=COMPLETED` to
  // show the feedback form, but BE only sets that AFTER student submits
  // feedback (review && feedback condition in
  // MentorReviewServiceImpl.checkAndCompleteRound). This created a chicken-and-egg
  // deadlock: student needs to submit feedback to unblock COMPLETED, but never
  // sees the form because COMPLETED is never set.
  // Solution: detect "interview is over" from the Session row directly.
  const sessionRef = useRef<{ status?: string; mentorReview?: unknown; userId?: number } | null>(
    null
  );
  const mentorReviewReceived =
    !!applicationDetail?.mentorReview || !!sessionRef.current?.mentorReview;
  // When the mentor-review form can be shown:
  //  - Mentor has reviewed the student (mentorReviewReceived) AND student has not
  //    yet submitted feedback (!isReviewed). This unblocks the form even when
  //    applicationDetail.status is still SLOT_PICKED.
  //  - OR applicationDetail.status === "COMPLETED" (BE-normal path)
  const showFeedbackForm =
    (mentorReviewReceived && !isReviewed) || applicationDetail?.status === "COMPLETED";
  const isWrongRound =
    !currentRoundLoading && !!currentRound && currentRound.roundType !== "MENTROR_REVIEW";

  // 2026-07-18: debug snapshot to make triage easier when the form fails to
  // appear. One-liner so the dev console doesn't drown in noise.
  if (typeof window !== "undefined") {
    console.log("[MentorReviewPage]", {
      applicationId,
      detailId: applicationDetail?.id,
      detailStatus: applicationDetail?.status,
      detailSessionId: applicationDetail?.sessionId,
      detailNestedSessionId: applicationDetail?.sessionInfo?.sessionId,
      detailMentorId: applicationDetail?.mentorId,
      detailMeetingType: applicationDetail?.sessionInfo?.meetingType,
      detailMentorReview: !!applicationDetail?.mentorReview,
      detailMentorFeedback: !!applicationDetail?.mentorFeedback,
      bookingId: booking?.id,
      bookingStatus: booking?.status,
      sessionMentorReview: !!sessionRef.current?.mentorReview,
      sessionStatus: sessionRef.current?.status,
      roomUrl: roomUrl ? roomUrl.slice(0, 40) : null,
      sessionTiming: sessionTiming
        ? {
            startTime1: sessionTiming.startTime1,
            endTime1: sessionTiming.endTime1,
            startTime2: sessionTiming.startTime2,
            endTime2: sessionTiming.endTime2,
          }
        : null,
      mentorReviewReceived,
      isReviewed,
      showFeedbackForm,
      isWrongRound,
      currentRoundId: currentRound?.id,
      currentRoundType: currentRound?.roundType,
    });
  }

  // ============================================================
  // Render
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6 sm:px-6 lg:px-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("userKiosk.mentorInterview")}
            </h1>
            <p className="text-sm text-slate-500">{t("userKiosk.mentorInterviewSubtitle")}</p>
          </div>
        </div>

        {/* Already reviewed */}
        {isReviewed && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">
                  {t("userApplicationhistory.reviewAlreadySubmitted")}
                </p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {t("userApplicationhistory.thankYouForYourFeedback")}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate(-1)}>
                {t("general.back")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wrong round type */}
        {isWrongRound && !isReviewed && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t("userKiosk.wrongRoundType")}
              </p>
              <Button variant="outline" onClick={() => navigate(-1)}>
                {t("general.back")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mentor has reviewed — show feedback form so student can rate the mentor.
            Handles the deadlock: detail.status=SLOT_PICKED but mentorReview != null.
            This step must come BEFORE RoomReadyStep so the student sees the form
            instead of being redirected back to Daily.co. */}
        {showFeedbackForm && (
          <ReviewFormStep
            sessionId={booking?.sessionId ?? applicationDetail?.sessionId}
            mentorId={booking?.mentorId}
            userId={sessionRef.current?.userId ?? booking?.applicantUserId}
            onSubmitSuccess={handleReviewSubmitted}
          />
        )}

        {/* Deprecated 2026-07-18: `isCompleted` check removed. Form visibility is now
            controlled by `showFeedbackForm` above which checks `mentorReview` directly
            from the Session row, bypassing the circular dependency on
            `applicationDetail.status=COMPLETED`. */}

        {/* In Progress — still has a valid roomUrl so the candidate can
            rejoin if they closed the tab earlier. The session timing
            panel underneath surfaces BE-tracked start/end durations so
            the student can see whether they or their mentor is in the
            room. */}
        {bookingStatus === "IN_PROGRESS" && !isReviewed && bookingSnapshot && (
          <InProgressStep
            roomUrl={roomUrl ?? undefined}
            sessionTiming={sessionTiming}
            sessionId={bookingSnapshot?.sessionId}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {/* 2026-07-18: route ONLINE/OFFLINE based solely on the ground-truth
            session row: roomUrl === "OFFLINE" means offline, any other URL
            means online. Do NOT derive from BookingStatus — that is derived
            from ApplicationDetail.status which stays SLOT_PICKED after the
            student picks a slot, and bookingStatusFromDetail maps
            SLOT_PICKED -> AWAITING_MENTOR, which caused the page to
            incorrectly show the wait-card instead of RoomReadyStep. */}
        {(roomUrl === "OFFLINE" || applicationDetail?.sessionInfo?.meetingType === "OFFLINE") &&
          !isReviewed &&
          bookingSnapshot && <OfflineConfirmedStep booking={bookingSnapshot} />}

        {/* ONLINE Room Ready — the interview is READY when:
            1. ApplicationDetail carries a sessionId (top-level or sessionInfo.nested)
               AND a Daily.co URL exists in the session, AND
            2. a mentor has been assigned (mentorId is non-null).
            We do NOT wait for BookingStatus === ROOM_CREATED because the
            BookingStatus is derived from ApplicationDetail.status which stays
            as SLOT_PICKED from the moment the student picks a slot. The
            session.rowUrl is the ground-truth readiness signal.

            2026-07-18: support both `sessionId` (top-level) and
            `sessionInfo.sessionId` (nested) since BE schema doesn't always
            populate the former. */}
        {(applicationDetail?.sessionId || applicationDetail?.sessionInfo?.sessionId) &&
          roomUrl &&
          roomUrl !== "OFFLINE" &&
          applicationDetail?.mentorId &&
          !isReviewed &&
          !showFeedbackForm && (
            <RoomReadyStep
              booking={
                bookingSnapshot ?? {
                  id: applicationDetail.sessionId,
                  sessionId: applicationDetail.sessionId,
                  mentorId: applicationDetail.mentorId,
                  status: "ROOM_CREATED",
                }
              }
              roomUrl={roomUrl}
              onJoinRoom={handleJoinRoom}
            />
          )}

        {/* Awaiting Mentor Assignment — admin has not yet assigned a mentor.
            We deliberately hide the SlotSelectionStep in this branch because
            BE's create-for-round requires a non-null mentorId on the round. */}
        {applicationDetail?.status === "AWAITING_MENTOR" && !isReviewed && !bookingSnapshot && (
          <AwaitingMentorAssignmentStep />
        )}

        {/* Awaiting Mentor — slot picked but mentor has NOT been assigned yet
            (mentorId is still null on ApplicationDetail). Show the explainer
            so the student knows to wait. */}
        {applicationDetail?.sessionId && !isReviewed && !applicationDetail?.mentorId && (
          <AwaitingMentorAssignmentStep />
        )}

        {/* AI_EVALUATED status - mentor not yet assigned, show waiting message */}
        {applicationDetail?.status === "AI_EVALUATED" &&
          !applicationDetail?.mentorId &&
          !isReviewed && <AwaitingMentorAssignmentStep />}

        {/* Slot selection — only when status === PENDING AND meetingType is unset.
            Outside of these preconditions the candidate is either waiting for
            admin to assign a mentor (AWAITING_MENTOR branch above) or already
            has a confirmed slot (SLOT_PICKED/PENDING+OFFLINE in branches above). */}
        {!bookingSnapshot &&
          !isReviewed &&
          applicationDetailId > 0 &&
          applicationDetail?.status === "PENDING" &&
          applicationDetail?.sessionInfo?.meetingType == null && (
            <SlotSelectionStep
              applicationDetailId={applicationDetailId}
              mentorId={applicationDetail?.mentorId ?? null}
              onSuccess={handleSlotPicked}
            />
          )}

        {/* Waiting for applicationDetail while currentRound is loading */}
        {!bookingSnapshot && !isReviewed && applicationDetailId === 0 && !detailsResolved && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-slate-500">
              <Spinner size="sm" tone="primary" />
              {t("userKiosk.loadingBooking")}
            </CardContent>
          </Card>
        )}

        {/* 2026-07-17: Belt-and-braces fallback. The branches above only
            render when `booking` (or `applicationDetail`) is populated. If
            BE responds late / with an empty detail, the page used to render
            completely blank, leaving the student stuck. Now we always show
            an actionable state — a Retry CTA on top of an explainer. */}
        {!bookingSnapshot && !isReviewed && detailsResolved && applicationDetailId === 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <Hourglass className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {t("userKiosk.waitingForMentor")}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t("userKiosk.detailNotReady")}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                <ArrowLeft className="h-4 w-4 rotate-180" />
                {t("general.retry")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
