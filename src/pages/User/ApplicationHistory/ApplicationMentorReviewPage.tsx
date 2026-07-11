import { SlotCalendar, type SlotCalendarSlot } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useActiveKiosks, useKioskSlots, usePickKioskSlot } from "@/hooks/useKiosk";
import { useCurrentRound } from "@/hooks/useRound";
import { fetchClient } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  MapPin,
  Send,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";
type ApplicationDetailStatus =
  | "PENDING"
  | "SLOT_PICKED"
  | "SUBMITTED"
  | "AI_EVALUATED"
  | "COMPLETED"
  | "ERROR";

interface ApplicationDetail {
  id?: number;
  applicationId?: number;
  roundId?: number;
  status?: ApplicationDetailStatus;
  bookingId?: number;
  sessionId?: number;
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

const toYmd = (date: Date): string => {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 10);
};

// GET /api/mentor-bookings/{bookingId}
// NOTE: backend v062 does NOT expose this endpoint for students (admin-only).
// We still attempt it but log + throw when the call fails so the upstream UI
// can decide what to do (e.g. fall back to the application-detail data).
async function fetchBookingById(bookingId: number): Promise<MentorInterviewBooking> {
  try {
    const { useAuthStore } = await import("@/stores/authStore");
    const token = useAuthStore.getState().token;
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const baseUrl = (await import("@/constants/api.config")).API_BASE_URL;
    const res = await fetch(`${baseUrl}/api/mentor-bookings/${bookingId}`, { headers });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(`/api/mentor-bookings/${bookingId} returned non-JSON (${contentType})`);
    }
    if (!res.ok) {
      throw new Error(`/api/mentor-bookings/${bookingId} HTTP ${res.status}`);
    }
    return (await res.json()) as MentorInterviewBooking;
  } catch (err) {
    console.error("[MentorReviewPage] fetchBookingById failed:", err);
    throw err;
  }
}

// ============================================================
// Step 1: Slot Selection Screen
// ============================================================

function SlotSelectionStep({
  applicationDetailId,
  onSuccess,
}: {
  applicationDetailId: number;
  onSuccess: (booking: MentorInterviewBooking) => void;
}) {
  const { t } = useTranslation();
  const [selectedKioskId, setSelectedKioskId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = useState<SlotCalendarSlot | null>(null);

  const selectedDateString = useMemo(() => toYmd(selectedDate), [selectedDate]);
  const { data: kiosks = [], isLoading: kiosksLoading } = useActiveKiosks();
  const { data: slots = [], isLoading: slotsLoading } = useKioskSlots(
    selectedKioskId ?? 0,
    selectedDateString,
    !!selectedKioskId
  );
  const pickSlotMutation = usePickKioskSlot();

  const slotSelectorKey = `${selectedKioskId ?? "none"}__${selectedDateString}`;

  const handlePickSlot = async () => {
    if (!selectedKioskId || !selectedSlot) return;
    if (!applicationDetailId) {
      // applicationDetailId is 0 when the page-level effect hasn't resolved yet.
      // Surface this so the user can retry instead of getting a silent 404.
      toast.error(t("common.anErrorHasOccurred"));
      return;
    }
    try {
      const result = await pickSlotMutation.mutateAsync({
        applicationDetailId,
        kioskId: selectedKioskId,
        scheduledStart: selectedSlot.startTime,
        scheduledEnd: selectedSlot.endTime,
      });
      if (result) {
        onSuccess(result as unknown as MentorInterviewBooking);
      }
    } catch {
      // error handled by hook
    }
  };

  const kioskName = kiosks.find((k) => k.id === selectedKioskId)?.name;

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
              {t("userKiosk.pickTimeSlot")}
            </p>
            <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">
              {t("userKiosk.selectKioskAndTime")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Select Kiosk */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-[#0047AB]" />
            {t("userKiosk.selectKiosk")}
          </CardTitle>
          <CardDescription>{t("userKiosk.selectKioskDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {kiosksLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" tone="primary" />
            </div>
          ) : kiosks.length === 0 ? (
            <p className="text-sm text-slate-500">{t("userKiosk.noKiosksAvailable")}</p>
          ) : (
            <Select
              value={selectedKioskId ? String(selectedKioskId) : ""}
              onValueChange={(v) => setSelectedKioskId(Number(v))}>
              <SelectTrigger id="kiosk-select">
                <SelectValue placeholder={t("userKiosk.chooseKiosk")} />
              </SelectTrigger>
              <SelectContent>
                {kiosks.map((kiosk) => (
                  <SelectItem key={kiosk.id} value={String(kiosk.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">{kiosk.name}</span>
                      {kiosk.location && (
                        <span className="text-xs text-slate-500">{kiosk.location}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Date & Time */}
      {selectedKioskId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-[#0047AB]" />
              {t("userKiosk.selectTimeSlot")}
            </CardTitle>
            {kioskName && (
              <CardDescription>
                {t("userKiosk.availableSlotsFor")} {kioskName}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <SlotCalendar
              key={slotSelectorKey}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              slots={slots.map((s) => ({
                startTime: s.startTime ?? "",
                endTime: s.endTime ?? "",
                available: s.available ?? false,
              }))}
              selectedSlotKey={
                selectedSlot ? `${selectedSlot.startTime}__${selectedSlot.endTime}` : null
              }
              onSelectSlot={setSelectedSlot}
              isLoading={slotsLoading}
            />

            {/* Selected slot info */}
            {selectedSlot && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950">
                <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                  {t("userKiosk.selectedSlot")}: {selectedSlot.startTime} - {selectedSlot.endTime}
                </p>
              </div>
            )}

            {/* Confirm button */}
            <Button
              onClick={handlePickSlot}
              disabled={!selectedSlot || pickSlotMutation.isPending}
              className="w-full gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
              {pickSlotMutation.isPending ? (
                <>
                  <Spinner size="sm" tone="white" />
                  {t("userKiosk.booking")}
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  {t("userKiosk.confirmSlot")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Step 2: Waiting for Mentor
// ============================================================

function AwaitingMentorStep({
  booking,
  onCancel,
}: {
  booking: MentorInterviewBooking;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();

  const scheduledTime = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-5">
      {/* Waiting card */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500">
              <span className="absolute h-4 w-4 animate-ping rounded-full bg-amber-400 opacity-75" />
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-700 dark:text-amber-300">
              {t("userKiosk.waitingForMentor")}
            </p>
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              {t("userKiosk.waitingForMentorDesc")}
            </p>
          </div>
          {scheduledTime && (
            <div className="rounded-lg border border-amber-200 bg-white/60 px-4 py-2 dark:border-amber-800 dark:bg-black/20">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                {t("userKiosk.scheduledFor")} {scheduledTime}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("userKiosk.howItWorks")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { step: 1, text: t("userKiosk.step1Waiting") },
            { step: 2, text: t("userKiosk.step2Notification") },
            { step: 3, text: t("userKiosk.step3GoToKiosk") },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0047AB] text-xs font-bold text-white">
                {item.step}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cancel button */}
      {onCancel && (
        <Button variant="outline" onClick={onCancel} className="w-full text-slate-500">
          {t("userKiosk.cancelBooking")}
        </Button>
      )}
    </div>
  );
}

// ============================================================
// Step 3: Room Ready (mentor assigned, room created)
// ============================================================

function RoomReadyStep({
  booking,
  onGoToKiosk,
}: {
  booking: MentorInterviewBooking;
  onGoToKiosk: () => void;
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
              {t("userKiosk.mentorAssigned")}
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {t("userKiosk.mentorAssignedDesc")}
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

      {/* Session Key */}
      {booking.sessionKey && (
        <Card className="border-[#0047AB]/30 bg-[#0047AB]/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-[#0047AB]" />
              {t("userKiosk.sessionKey")}
            </CardTitle>
            <CardDescription>{t("userKiosk.sessionKeyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-[#0047AB]/20 bg-white px-4 py-3 font-mono text-sm text-[#0047AB]">
              {booking.sessionKey}
            </div>
            <p className="mt-2 text-xs text-slate-500">{t("userKiosk.sessionKeyHint")}</p>
          </CardContent>
        </Card>
      )}

      {/* Go to Kiosk */}
      <Button
        onClick={onGoToKiosk}
        size="lg"
        className="w-full gap-2 bg-green-600 text-white hover:bg-green-700">
        <Video className="h-5 w-5" />
        {t("userKiosk.goToKiosk")}
      </Button>
    </div>
  );
}

// ============================================================
// Step 4: In Progress (at kiosk)
// ============================================================

function InProgressStep({ roomUrl }: { roomUrl?: string }) {
  const { t } = useTranslation();
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
        {roomUrl && (
          <p className="rounded-lg border border-blue-200 bg-white/60 px-4 py-2 font-mono text-xs text-blue-700 dark:border-blue-800 dark:bg-black/20">
            Room URL ready
          </p>
        )}
      </CardContent>
    </Card>
  );
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
    if (!canSubmit) return;
    if (!sessionId || !mentorId || !userId) {
      toast.error(t("common.anErrorHasOccurred"));
      return;
    }
    setIsSubmitting(true);
    try {
      // Student đánh giá Mentor sau phỏng vấn → POST /api/mentor-feedbacks
      // (POST /api/mentor-reviews là Mentor đánh giá Student — flow ngược lại)
      // Schema OpenAPI chỉ Declare body: { sessionId, mentorId, userId, rating, comment }
      const { response } = await fetchClient.POST("/api/mentor-feedbacks", {
        body: {
          sessionId,
          mentorId,
          userId,
          rating,
          comment:
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
              .join("\n\n") || undefined,
        },
      });
      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { message?: string };
        toast.error(errData?.message ?? t("common.anErrorHasOccurred"));
        return;
      }
      toast.success(t("userApplicationhistory.reviewSubmittedSuccessfully"));
      onSubmitSuccess();
    } catch (err) {
      console.error("[MentorReviewPage] submit feedback failed:", err);
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
  const [booking, setBooking] = useState<MentorInterviewBooking | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: currentRound, isLoading: currentRoundLoading } = useCurrentRound(
    applicationId,
    !!applicationId
  );

  // ============================================================
  // Fetch application detail + booking on mount
  // ============================================================
  useEffect(() => {
    if (!applicationId) return;
    // Wait until current round is loaded so we can match by roundId accurately.
    if (currentRoundLoading) return;
    if (!currentRound?.id) {
      // Current round query has settled but returned nothing → can't proceed.
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
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
            const mentorDetails = details.filter(
              (d) =>
                d.status === "PENDING" ||
                d.status === "SLOT_PICKED" ||
                d.status === "SUBMITTED" ||
                d.status === "AI_EVALUATED" ||
                d.status === "COMPLETED"
            );
            if (mentorDetails.length === 1) {
              currentDetail = mentorDetails[0] ?? null;
            }
          }

          if (!currentDetail && details.length > 0) {
            console.warn("[MentorReviewPage] no ApplicationDetail for current round", {
              currentRoundId,
              currentRoundType: currentRound.roundType,
              detailRoundIds: details.map((d) => d.roundId),
            });
          }

          setApplicationDetail(currentDetail ?? null);

          if (currentDetail?.bookingId) {
            try {
              const bookingData = await fetchBookingById(currentDetail.bookingId);
              setBooking(bookingData);
              // Resolve sessionId: booking may carry it, otherwise fall back to the
              // detail (backend stores sessionId on ApplicationDetail too).
              const resolvedSessionId = bookingData.sessionId ?? currentDetail.sessionId ?? null;
              if (
                bookingData.status === "ROOM_CREATED" ||
                bookingData.status === "IN_PROGRESS" ||
                resolvedSessionId
              ) {
                if (!resolvedSessionId) {
                  return;
                }
                const sessionRes = await fetchClient.GET("/api/sessions/{id}", {
                  params: { path: { id: resolvedSessionId } },
                });
                if (sessionRes.response?.ok && sessionRes.data) {
                  const sessionData = sessionRes.data as { roomUrl?: string };
                  setRoomUrl(sessionData.roomUrl ?? null);
                }
              }
            } catch (err) {
              console.error("[MentorReviewPage] fetch booking failed:", err);
            }
          } else {
            setBooking(null);
            setRoomUrl(null);
          }
        }
      } catch (err) {
        console.error("[MentorReviewPage] fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [applicationId, currentRound?.id, currentRoundLoading, t]);

  // ============================================================
  // Polling: refresh booking status periodically
  // ============================================================
  useEffect(() => {
    if (!applicationDetail?.bookingId) return;
    if (booking?.status === "COMPLETED" || booking?.status === "CANCELED") return;

    const interval = setInterval(async () => {
      if (!applicationDetail?.bookingId) return;
      try {
        const fresh = await fetchBookingById(applicationDetail.bookingId);
        setBooking(fresh);
      } catch (err) {
        console.error("[MentorReviewPage] refresh booking failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [applicationDetail?.bookingId, booking?.status]);

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
  };

  // Go to kiosk (enter room)
  const handleGoToKiosk = () => {
    if (!booking?.sessionKey || !booking?.kioskId) return;
    // Navigate to kiosk enter page with sessionKey and kioskId
    const params = new URLSearchParams({
      sessionKey: booking.sessionKey,
      kioskId: String(booking.kioskId),
      applicationDetailId: String(applicationDetail?.id ?? 0),
    });
    navigate(`/user/kiosk/enter?${params.toString()}`);
  };

  // Cancel booking
  const handleCancelBooking = async () => {
    if (!booking?.id) return;
    try {
      await fetchClient.DELETE("/api/mentor-bookings/{bookingId}", {
        params: { path: { bookingId: booking.id } },
      });
      setBooking(null);
      setApplicationDetail((prev) =>
        prev ? { ...prev, bookingId: undefined, status: "PENDING" } : prev
      );
      toast.success(t("userKiosk.bookingCancelledSuccessfully"));
    } catch {
      toast.error(t("common.anErrorHasOccurred"));
    }
  };

  // Review submitted
  const handleReviewSubmitted = () => {
    navigate(-1);
  };

  // ============================================================
  // Derive UI state from backend data
  // ============================================================

  const applicationDetailId = applicationDetail?.id ?? 0;
  const bookingStatus = booking?.status;
  // The student page is showing "have you rated the mentor?" so the
  // relevant marker on ApplicationDetail is `mentorFeedback` (set by
  // POST /api/mentor-feedbacks). `mentorReview` is the *mentor's*
  // evaluation of the student, which is irrelevant here.
  const isReviewed = !!applicationDetail?.mentorFeedback;
  // The backend uses ApplicationDetail.status as the source of truth for
  // "meeting is done, ready for review" — per docs §5, when both parties
  // leave the Daily.co room the backend flips:
  //   Session.status  → COMPLETED
  //   Booking.status  → COMPLETED
  //   ApplicationDetail.status → AI_EVALUATED
  // The mentor-review form should be reachable whenever the detail has
  // reached AI_EVALUATED (or COMPLETED, if a previous round is already
  // closed) so students can leave feedback even before polling sees the
  // booking.status catch up.
  const isCompleted =
    bookingStatus === "COMPLETED" ||
    applicationDetail?.status === "AI_EVALUATED" ||
    applicationDetail?.status === "COMPLETED";
  const isWrongRound =
    !currentRoundLoading && !!currentRound && currentRound.roundType !== "MENTROR_REVIEW";

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

        {/* Completed but not reviewed */}
        {isCompleted && !isReviewed && (
          <ReviewFormStep
            sessionId={booking?.sessionId ?? applicationDetail?.sessionId}
            mentorId={booking?.mentorId}
            userId={booking?.applicantUserId}
            onSubmitSuccess={handleReviewSubmitted}
          />
        )}

        {/* In Progress */}
        {bookingStatus === "IN_PROGRESS" && !isReviewed && booking && (
          <InProgressStep roomUrl={roomUrl ?? undefined} />
        )}

        {/* Room Created (mentor assigned, room ready) */}
        {(bookingStatus === "ROOM_CREATED" || bookingStatus === "MENTOR_ASSIGNED") &&
          !isReviewed &&
          booking && <RoomReadyStep booking={booking} onGoToKiosk={handleGoToKiosk} />}

        {/* Awaiting Mentor (slot picked, waiting for admin to assign) */}
        {bookingStatus === "AWAITING_MENTOR" && !isReviewed && booking && (
          <AwaitingMentorStep booking={booking} onCancel={handleCancelBooking} />
        )}

        {/* Slot selection (no booking yet) — only after applicationDetail is resolved */}
        {!booking && !isReviewed && applicationDetailId > 0 && (
          <SlotSelectionStep
            applicationDetailId={applicationDetailId}
            onSuccess={handleSlotPicked}
          />
        )}

        {/* Waiting for applicationDetail while currentRound is loading */}
        {!booking && !isReviewed && applicationDetailId === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-slate-500">
              <Spinner size="sm" tone="primary" />
              {t("userKiosk.loadingBooking")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
