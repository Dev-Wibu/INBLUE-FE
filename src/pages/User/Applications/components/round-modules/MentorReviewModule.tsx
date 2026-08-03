import { RatingScale10 } from "@/components/feedback/RatingScale10";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useApplicationDetail,
  useAssignedMentors,
  useSelectMentor,
  type MentorResponse,
} from "@/hooks/useApplicationDetails";
import { useCreateMentorFeedback, useUpdateMentorFeedback } from "@/hooks/useMentorFeedback";
import { useCreateRoundSession, useSessionById } from "@/hooks/useSession";
import type { Session } from "@/interfaces";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Hourglass,
  Loader2,
  LogIn,
  MapPin,
  PlayCircle,
  RefreshCw,
  Send,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";
import { MentorReviewSubheader } from "./MentorReviewSubheader";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

type DetailStatus =
  | "PENDING"
  | "AWAITING_MENTOR"
  | "AWAITING_CANDIDATE_SELECT_MENTOR"
  | "SLOT_PICKED"
  | "SUBMITTED"
  | "AI_EVALUATED"
  | "COMPLETED";

interface MentorReviewModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted?: boolean;
  isCurrent?: boolean;
  onSuccess?: () => void;
}

// ============================================================================
// Step model
// ============================================================================

type StepKey = "AWAITING_MENTOR" | "SELECT_MENTOR" | "SCHEDULE" | "WAITING" | "IN_CALL" | "RESULT";

interface StepDef {
  key: StepKey;
  title: string;
  short: string;
  icon: typeof Hourglass;
}

const STEP_DEFS: StepDef[] = [
  { key: "AWAITING_MENTOR", title: "Chờ Admin gán mentor", short: "Chờ mentor", icon: Hourglass },
  { key: "SELECT_MENTOR", title: "Chọn mentor", short: "Chọn mentor", icon: Users },
  { key: "SCHEDULE", title: "Đặt lịch phỏng vấn", short: "Đặt lịch", icon: Calendar },
  { key: "WAITING", title: "Chờ đến giờ phỏng vấn", short: "Chờ giờ", icon: Clock },
  { key: "IN_CALL", title: "Đang phỏng vấn", short: "Phỏng vấn", icon: Video },
  { key: "RESULT", title: "Kết quả đánh giá", short: "Kết quả", icon: BadgeCheck },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MentorReviewModule({
  round,
  detail: initialDetail,
  applicationId,
  onSuccess,
}: MentorReviewModuleProps) {
  const { t } = useTranslation();

  // Live detail so polling / mutation feedback updates the hub.
  // We always have a detail passed in from the parent, but we want to
  // re-fetch on interval while waiting on the Admin (Step 1).
  const detailId = initialDetail?.id ?? 0;
  const { data: liveDetail, refetch: refetchDetail } = useApplicationDetail(detailId, detailId > 0);
  const detail = liveDetail ?? initialDetail;
  const status = (detail?.status ?? "PENDING") as DetailStatus;

  // Schedule session mutation (used by the SCHEDULE step). We declare it
  // here so we can refresh `useSessionById` after success and immediately
  // jump the candidate to the WAITING step (no payment step in the current
  // business flow — see backend: totalPrice=0 is valid).
  const createSessionMutation = useCreateRoundSession({
    onSuccess: () => {
      void refetchDetail();
      onSuccess?.();
    },
  });

  // Active step derived from BOTH `detail.status` (mentor-assignment side)
  // AND `sessionStatus` (Daily.co side via webhook). The two lifecycles are
  // independent and can drift — see issue: candidate joined the room, both
  // sides left, session.status = COMPLETED, but detail.status may still be
  // `AWAITING_MENTOR` because staff haven't flipped it to COMPLETED yet.
  // We always trust `sessionStatus === 'COMPLETED'` as the source of truth
  // for "the interview happened" and force-step to RESULT.
  const sessionInfo = (
    detail as unknown as { sessionInfo?: { sessionId?: number | null } } | undefined
  )?.sessionInfo;
  const sessionId = sessionInfo?.sessionId ?? detail?.sessionId ?? null;
  const { data: session, refetch: refetchSession } = useSessionById(sessionId ?? 0);
  const sessionStatus = session?.status ?? null;

  const activeStep = useMemo<StepKey>(() => {
    // 1. The interview actually happened + completed -> RESULT
    if (status === "COMPLETED" || status === "AI_EVALUATED" || sessionStatus === "COMPLETED") {
      return "RESULT";
    }
    // 2. The room is live right now -> IN_CALL
    if (sessionStatus === "ONGOING") {
      return "IN_CALL";
    }
    // 3. Session created, paid (or coming up soon) -> WAITING
    if (
      sessionId &&
      (sessionStatus === "PAID" || sessionStatus === "SCHEDULED" || sessionStatus === "DRAFT")
    ) {
      return "WAITING";
    }
    // 4. No session yet: show pre-session steps
    // Note: Option 2 (multi-mentor proposal) flips detail.status to
    // "PENDING" once the candidate confirms their pick — at that point
    // the session doesn't exist yet and the candidate still needs to
    // schedule an interview slot. Treat PENDING the same as SLOT_PICKED
    // so the ScheduleStep renders instead of falling through to the
    // AWAITING_MENTOR default (which previously trapped candidates in
    // "Đang chờ Admin gán mentor" forever after they'd already picked).
    if (status === "AWAITING_MENTOR") return "AWAITING_MENTOR";
    if (status === "AWAITING_CANDIDATE_SELECT_MENTOR") return "SELECT_MENTOR";
    if (status === "PENDING" || status === "SLOT_PICKED" || status === "SUBMITTED") {
      return "SCHEDULE";
    }
    return "AWAITING_MENTOR";
  }, [status, sessionId, sessionStatus]);

  // Polling — refresh detail (for status flips) AND session (for COMPLETED
  // flip via Daily.co webhook) on different intervals.
  useEffect(() => {
    if (activeStep === "AWAITING_MENTOR" && !sessionId) {
      const id = setInterval(() => void refetchDetail(), 30_000);
      return () => clearInterval(id);
    }
    if (sessionId) {
      // Always poll the session while it exists. Mentor may write
      // `mentorReview` AFTER session.status flips to COMPLETED (the
      // candidate-side hub needs to pick that up without a manual reload).
      // Terminal states stop the poll.
      if (sessionStatus === "CANCELED" || sessionStatus === "REJECTED") {
        return undefined;
      }
      const id = setInterval(() => void refetchSession(), 30_000);
      return () => clearInterval(id);
    }
    return undefined;
  }, [activeStep, sessionId, sessionStatus, refetchDetail, refetchSession]);

  // ===== Header ===========================================================
  const finalScore = detail?.finalScore ?? detail?.hrScore ?? null;
  const showScore = (status === "COMPLETED" || status === "AI_EVALUATED") && finalScore !== null;
  const passed = detail?.finalResult === "PASSED";
  const failed = detail?.finalResult === "FAILED";

  const activeIndex = STEP_DEFS.findIndex((s) => s.key === activeStep);

  return (
    <div className="space-y-6">
      <MentorReviewSubheader activeIndex={activeIndex} totalSteps={STEP_DEFS.length} />

      {/* ============== Instruction ============== */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase dark:text-slate-400">
          {t("userApplicationhistory.instructionsTitle", "Hướng dẫn làm bài")}
        </h4>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A]/90 dark:text-slate-300">
          {round.configData?.instruction ||
            t(
              "userApplicationhistory.mentorInstructionDefault",
              "Vòng phỏng vấn trực tiếp 1-1 cùng Chuyên gia / Mentor tuyển dụng hàng đầu. Hoàn tất các bước: chờ admin gán mentor → chọn mentor → đặt lịch → thanh toán → vào phòng Video Call."
            )}
        </div>
      </div>

      {/* ============== Score banner (when done) ============== */}
      {showScore && (
        <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 px-6 py-5",
              passed
                ? "bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40"
                : failed
                  ? "bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/40 dark:to-orange-950/40"
                  : "bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-900/40"
            )}>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm",
                  passed
                    ? "bg-gradient-to-br from-emerald-500 to-sky-600"
                    : failed
                      ? "bg-gradient-to-br from-rose-500 to-orange-500"
                      : "bg-gradient-to-br from-slate-400 to-slate-600"
                )}>
                {passed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : failed ? (
                  <X className="h-6 w-6" />
                ) : (
                  <BadgeCheck className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                  Kết quả phỏng vấn Mentor
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-slate-900 tabular-nums dark:text-white">
                    {finalScore}
                  </span>
                  <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                    /100
                  </span>
                  {passed && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-700 uppercase dark:bg-emerald-950/60 dark:text-emerald-300">
                      ✓ PASSED
                    </span>
                  )}
                  {failed && (
                    <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-rose-700 uppercase dark:bg-rose-950/60 dark:text-rose-300">
                      ✗ FAILED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ============== Progress hub ============== */}
      <ProgressHub activeIndex={activeIndex} />

      {/* ============== Step body ============== */}
      {activeStep === "AWAITING_MENTOR" && (
        <AwaitingMentorStep detailId={detailId} onRefresh={() => void refetchDetail()} />
      )}
      {activeStep === "SELECT_MENTOR" && (
        <SelectMentorStep
          detailId={detailId}
          onAfterSelect={() => {
            void refetchDetail();
            onSuccess?.();
          }}
        />
      )}
      {activeStep === "SCHEDULE" && (
        <ScheduleStep
          submitting={createSessionMutation.isPending}
          onSubmit={(payload) =>
            createSessionMutation.mutate({
              applicationDetailId: detailId,
              joinTime: payload.joinTime,
              duration: payload.duration,
              offline: payload.offline,
            })
          }
        />
      )}
      {(activeStep === "WAITING" || activeStep === "IN_CALL" || activeStep === "RESULT") && (
        <SessionRoomStep
          detailId={detailId}
          sessionId={sessionId}
          applicationId={applicationId}
          onStatusChange={() => {
            void refetchDetail();
            void refetchSession();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ProgressHub — wizard steps indicator
// ============================================================================

function ProgressHub({ activeIndex }: { activeIndex: number }) {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <h5 className="flex items-center gap-2 text-[10px] font-extrabold tracking-widest text-slate-500 uppercase dark:text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" />
            Tiến trình Mentor Interview
          </h5>
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Bước {Math.max(1, activeIndex + 1)} / {STEP_DEFS.length}
          </span>
        </div>
        <ol className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
          {STEP_DEFS.map((step, i) => {
            const isActive = i === activeIndex;
            const isDone = i < activeIndex;
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors",
                  isActive
                    ? "border-indigo-300 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                      : "border-slate-200 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-900/30"
                )}>
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    isActive
                      ? "bg-indigo-500 text-white shadow"
                      : isDone
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  )}>
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-extrabold tracking-wider uppercase",
                    isActive
                      ? "text-indigo-700 dark:text-indigo-300"
                      : isDone
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-slate-500 dark:text-slate-400"
                  )}>
                  B{i + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] leading-tight font-bold",
                    isActive
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  )}>
                  {step.short}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: AwaitingMentorStep
// ============================================================================

function AwaitingMentorStep({ detailId, onRefresh }: { detailId: number; onRefresh: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/40">
      <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
            <Hourglass className="h-9 w-9" />
          </span>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Đang chờ Admin gán mentor cho bạn
          </h3>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Vui lòng đợi Admin của JD phân công 1 mentor phù hợp. Sau khi gán, bạn sẽ có thể chọn
            người phỏng vấn từ danh sách được đề xuất.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1.5 dark:border-amber-900/60 dark:bg-slate-900/40">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="font-bold">{t("userApplicationhistory.mentorAwaitingPollNote")}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="h-8 gap-1.5 border-amber-300 text-xs font-bold text-amber-700 hover:bg-amber-100/60 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30">
            <RefreshCw className="h-3 w-3" />
            Kiểm tra ngay
          </Button>
        </div>
        <div className="mt-2 text-[10px] tracking-wider text-slate-400 uppercase dark:text-slate-500">
          ApplicationDetail #{detailId}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: SelectMentorStep
// ============================================================================

function SelectMentorStep({
  detailId,
  onAfterSelect,
}: {
  detailId: number;
  onAfterSelect: () => void;
}) {
  const { data: mentors, isLoading, error, refetch } = useAssignedMentors(detailId);
  const selectMutation = useSelectMentor({
    onSuccess: () => onAfterSelect(),
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách mentor...
        </div>
      </Card>
    );
  }

  if (error || !mentors || mentors.length === 0) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/60 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
        <div className="flex items-start gap-3 px-6 py-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-rose-800 dark:text-rose-200">
              Chưa có mentor nào được Admin đề xuất
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-rose-700 dark:text-rose-300">
              Vui lòng liên hệ Admin để được gán mentor. Sau khi Admin gán xong, danh sách sẽ hiện ở
              đây.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-3 h-8 gap-1.5 border-rose-300 text-xs font-bold text-rose-700 hover:bg-rose-100/60 dark:border-rose-900/60 dark:text-rose-300">
              <RefreshCw className="h-3 w-3" />
              Tải lại
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-6 py-5 dark:border-slate-800 dark:from-indigo-950/40 dark:to-sky-950/40">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
          <Users className="h-4 w-4 text-indigo-500" />
          Chọn mentor phỏng vấn
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Có {mentors.length} mentor được Admin đề xuất cho vòng này. Chọn người phù hợp nhất với
          bạn.
        </p>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {mentors.map((m) => {
          const isSelected = selectedId === m.id;
          return (
            <MentorCard
              key={m.id}
              mentor={m}
              isSelected={isSelected}
              disabled={selectMutation.isPending}
              onPick={() => setSelectedId(m.id ?? null)}
              onConfirm={() => {
                if (!m.id) return;
                setSelectedId(m.id);
                selectMutation.mutate({ applicationDetailId: detailId, mentorId: m.id });
              }}
            />
          );
        })}
      </div>
      <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          💡 Mẹo: Bạn có thể đổi mentor trước khi tạo phiên phỏng vấn.
        </p>
      </div>
    </Card>
  );
}

function MentorCard({
  mentor,
  isSelected,
  disabled,
  onPick,
  onConfirm,
}: {
  mentor: MentorResponse;
  isSelected: boolean;
  disabled: boolean;
  onPick: () => void;
  onConfirm: () => void;
}) {
  const rating = mentor.averageRating ?? 0;
  const totalReviews = mentor.totalSession ?? 0;
  const pricePerMin = mentor.pricePerMinute;
  const initials = (mentor.name ?? "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all dark:bg-slate-900/40",
        isSelected
          ? "border-indigo-400 ring-2 ring-indigo-300/60 dark:border-indigo-700 dark:ring-indigo-700/60"
          : "border-slate-200 hover:border-indigo-200 hover:shadow dark:border-slate-700 dark:hover:border-indigo-800"
      )}>
      {/* Cover */}
      <div className="relative h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500" />
      {/* Avatar */}
      <div className="absolute top-8 left-4">
        {mentor.avatarUrl ? (
          <img
            src={mentor.avatarUrl}
            alt={mentor.name ?? "Mentor"}
            className="h-16 w-16 rounded-xl border-4 border-white object-cover shadow-md dark:border-slate-900"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-4 border-white bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-extrabold text-white shadow-md dark:border-slate-900">
            {initials}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 pt-10">
        {/* Name + rating */}
        <div className="space-y-0.5">
          <h4 className="line-clamp-1 text-sm font-extrabold text-slate-900 dark:text-white">
            {mentor.name ?? "Mentor"}
          </h4>
          {mentor.currentCompany && (
            <div className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              <Building2 className="h-3 w-3" />
              {mentor.currentCompany}
            </div>
          )}
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < Math.round(rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300 dark:text-slate-600"
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] font-extrabold text-slate-700 tabular-nums dark:text-slate-200">
              {rating.toFixed(1)}/5
            </span>
            {totalReviews > 0 && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                ({totalReviews})
              </span>
            )}
          </div>
        )}

        {/* Expertise */}
        {mentor.expertise && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-2.5 py-1.5 text-[10px] leading-relaxed font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300">
            💼 {mentor.expertise}
          </div>
        )}

        {/* Bio */}
        {mentor.bio && (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            {mentor.bio}
          </p>
        )}

        {/* Years + price */}
        <div className="mt-auto flex items-end justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="text-[10px] tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {mentor.yearsOfExperience ? `${mentor.yearsOfExperience}+ năm KN` : "—"}
          </div>
          {pricePerMin ? (
            <div className="text-[11px] font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300">
              {(pricePerMin * 45).toLocaleString("vi-VN")} đ / 45'
            </div>
          ) : null}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPick}
            disabled={disabled}
            className="h-8 flex-1 gap-1.5 border-slate-300 text-[11px] font-bold dark:border-slate-700">
            <UserCheck className="h-3 w-3" />
            {isSelected ? "Đã chọn" : "Chọn"}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={disabled}
            className="h-8 flex-1 gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-[11px] font-bold text-white hover:from-indigo-600 hover:to-purple-700">
            <ArrowRight className="h-3 w-3" />
            Xác nhận
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
function ScheduleStep({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (_payload: { joinTime: string; duration: number; offline: boolean }) => void;
}) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Use LOCAL date for the default (not toISOString which is UTC-based and
  // can roll over to the previous day for users in positive offsets like
  // Vietnam UTC+7).
  const defaultDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  const defaultTime = "14:00";

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState<number>(45);
  const [offline, setOffline] = useState(false);

  const handleSubmit = () => {
    if (!date || !time) {
      toast.error("Vui lòng chọn ngày giờ");
      return;
    }
    // Build joinTime with an explicit timezone offset so the BE knows the
    // candidate's intended wall-clock time. Without the offset, the BE
    // (Spring Boot/Jackson default) treats the naive string as UTC, which
    // shifts the stored time by 7h for users in Vietnam (UTC+7) — e.g.
    // picking 01:46 lands the session at 08:46 local.
    // The offset is derived from the user's browser timezone (read from
    // `<input type="datetime-local">` semantics: naive local pick).
    const offsetMinutes = now.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? "-" : "+";
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
    const offsetMins = String(absOffset % 60).padStart(2, "0");
    const joinTime = `${date}T${time}:00${sign}${offsetHours}:${offsetMins}`;
    onSubmit({ joinTime, duration, offline });
  };

  const durations = [30, 45, 60, 90];

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-6 py-5 dark:border-slate-800 dark:from-sky-950/40 dark:to-indigo-950/40">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
          <Calendar className="h-4 w-4 text-sky-500" />
          Đặt lịch phỏng vấn
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Chọn ngày giờ và thời lượng phù hợp. Bạn có thể đổi trước khi thanh toán.
        </p>
      </div>

      <div className="space-y-5 p-6">
        {/* Date + time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Ngày phỏng vấn
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Giờ bắt đầu
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Thời lượng
          </label>
          <div className="grid grid-cols-4 gap-2">
            {durations.map((d) => {
              const active = duration === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2.5 text-xs font-extrabold transition-all",
                    active
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
                  )}>
                  {d} phút
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Hình thức phỏng vấn
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setOffline(false)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
                !offline
                  ? "border-sky-400 bg-sky-50/60 dark:border-sky-700 dark:bg-sky-950/30"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
              )}>
              <Video
                className={cn("mt-0.5 h-4 w-4", !offline ? "text-sky-500" : "text-slate-400")}
              />
              <div>
                <div
                  className={cn(
                    "text-xs font-extrabold",
                    !offline
                      ? "text-sky-700 dark:text-sky-300"
                      : "text-slate-700 dark:text-slate-300"
                  )}>
                  Online (Daily.co)
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Phỏng vấn qua Video Call trên trình duyệt
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setOffline(true)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
                offline
                  ? "border-amber-400 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40"
              )}>
              <MapPin
                className={cn("mt-0.5 h-4 w-4", offline ? "text-amber-500" : "text-slate-400")}
              />
              <div>
                <div
                  className={cn(
                    "text-xs font-extrabold",
                    offline
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-slate-700 dark:text-slate-300"
                  )}>
                  Offline
                </div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Gặp trực tiếp tại địa điểm do mentor sắp xếp
                </div>
              </div>
            </button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-11 w-full gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-sm hover:from-sky-600 hover:to-indigo-700">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tạo phiên...
            </>
          ) : (
            <>
              <CalendarCheck className="h-4 w-4" />
              Tạo phiên phỏng vấn
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================================

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className={cn("mt-0.5 shrink-0", highlight ? "text-emerald-500" : "text-slate-400")}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {label}
        </div>
        <div
          className={cn(
            "text-sm font-extrabold",
            highlight ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"
          )}>
          {value}
        </div>
      </div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: string; label: string }> = {
    DRAFT: {
      tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      label: "Nháp",
    },
    SCHEDULED: {
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      label: "Chờ thanh toán",
    },
    PAID: {
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      label: "Đã thanh toán",
    },
    ONGOING: {
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      label: "Đang diễn ra",
    },
    COMPLETED: {
      tone: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      label: "Đã hoàn tất",
    },
    REJECTED: {
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      label: "Bị từ chối",
    },
    CANCELED: {
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      label: "Đã hủy",
    },
  };
  const cfg = map[status] ?? map.DRAFT;
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Trạng thái phiên
      </span>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase",
          cfg.tone
        )}>
        {cfg.label}
      </span>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: SessionRoomStep — covers WAITING / IN_CALL / RESULT
// ============================================================================

function SessionRoomStep({
  sessionId,
  onStatusChange,
}: {
  detailId: number;
  sessionId: number | null;
  applicationId: number;
  onStatusChange: () => void;
}) {
  const { t } = useTranslation();
  const { data: session, refetch } = useSessionById(sessionId ?? 0);
  const [now, setNow] = useState(() => Date.now());

  // Poll session every 30s while in WAITING or IN_CALL
  useEffect(() => {
    if (!sessionId) return;
    if (!session) return;
    if (
      session.status === "COMPLETED" ||
      session.status === "CANCELED" ||
      session.status === "REJECTED"
    ) {
      return;
    }
    const id = setInterval(() => void refetch(), 30_000);
    return () => clearInterval(id);
  }, [sessionId, session, refetch]);

  // Tick clock for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!sessionId || !session) {
    return (
      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex items-center justify-center gap-2 px-6 py-16 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải phiên phỏng vấn...
        </div>
      </Card>
    );
  }

  const joinAt = session.joinTime ? new Date(session.joinTime).getTime() : 0;
  const minutesUntilStart = Math.floor((joinAt - now) / 60_000);
  const canEnter = minutesUntilStart <= 15 && minutesUntilStart > -(session.duration ?? 0);
  const isCompleted = session.status === "COMPLETED";

  // ---- COMPLETED ----
  if (isCompleted) {
    return <CompletedResultView session={session} onChange={onStatusChange} />;
  }

  // ---- ONGOING or WAITING ----
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-sky-50 px-6 py-5 dark:border-slate-800 dark:from-emerald-950/40 dark:to-sky-950/40">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
          <Video className="h-4 w-4 text-emerald-500" />
          Phiên phỏng vấn #{session.id}
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Vào phòng Video Call đúng giờ. Phòng sẽ mở trước 15 phút.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40">
          <InfoRow
            icon={<CalendarCheck className="h-3.5 w-3.5" />}
            label="Thời gian"
            value={session.joinTime ? formatDateTime(session.joinTime) : "—"}
          />
          <InfoRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Thời lượng"
            value={`${session.duration ?? 0} phút`}
          />
          <InfoRow
            icon={<Video className="h-3.5 w-3.5" />}
            label="Hình thức"
            value={session.roomUrl ? "Online (Daily.co)" : "Offline"}
          />
          <InfoRow
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label="Mentor"
            value={`#${session.mentorId ?? "—"}`}
          />
        </div>

        <SessionStatusBadge status={session.status ?? "SCHEDULED"} />

        {/* Countdown */}
        {session.status === "PAID" && joinAt > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
            <div className="text-[10px] font-bold tracking-widest text-sky-600 uppercase dark:text-sky-400">
              {canEnter ? "Phòng đã mở" : "Còn"}
            </div>
            <div className="text-3xl font-black text-sky-700 tabular-nums dark:text-sky-200">
              {canEnter ? "Sẵn sàng vào" : formatCountdown(Math.max(0, joinAt - now))}
            </div>
            <div className="text-xs text-sky-700/80 dark:text-sky-300/80">
              {canEnter
                ? "Bạn có thể vào phòng ngay bây giờ"
                : `Phòng mở 15 phút trước ${session.joinTime ? formatTimeOnly(session.joinTime) : ""}`}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (session.roomUrl) {
                window.location.href = `/user/sessions/room/${session.id}`;
              } else {
                toast.info("Đây là phiên Offline. Hãy liên hệ mentor qua thông tin bên dưới.");
              }
            }}
            disabled={!canEnter && session.status === "PAID"}
            className="h-11 flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-sky-600 text-xs font-bold text-white shadow-sm hover:from-emerald-600 hover:to-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
            <LogIn className="h-4 w-4" />
            {session.status === "ONGOING" ? "Tiếp tục vào phòng" : "Vào phòng Video Call"}
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            className="h-11 gap-2 border-slate-300 px-4 text-xs font-bold dark:border-slate-700">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
          <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>{t("userApplicationhistory.mentorRefreshTip")}</strong>{" "}
            {t("userApplicationhistory.mentorRefreshHint")}
          </p>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: CompletedResultView
// ============================================================================

function CompletedResultView({ session, onChange }: { session: Session; onChange: () => void }) {
  const review = session.mentorReview;
  const feedback = session.mentorFeedback;

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-sky-50 px-6 py-5 dark:border-slate-800 dark:from-emerald-950/40 dark:to-sky-950/40">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
          <BadgeCheck className="h-4 w-4 text-emerald-500" />
          Phiên phỏng vấn đã hoàn tất
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Cảm ơn bạn đã tham gia vòng Mentor Interview.
        </p>
      </div>

      <div className="space-y-4 p-6">
        {/* Session summary */}
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40">
          <InfoRow
            icon={<CalendarCheck className="h-3.5 w-3.5" />}
            label="Thời gian"
            value={session.joinTime ? formatDateTime(session.joinTime) : "—"}
          />
          <InfoRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Thời lượng"
            value={`${session.duration ?? 0} phút`}
          />
          {session.startTime1 && session.endTime1 && (
            <InfoRow
              icon={<PlayCircle className="h-3.5 w-3.5" />}
              label="Bạn tham gia"
              value={`${formatTimeOnly(session.startTime1)} → ${formatTimeOnly(session.endTime1)} (${
                session.durationSeconds1 ? Math.floor(session.durationSeconds1 / 60) : 0
              } phút)`}
            />
          )}
          {session.startTime2 && session.endTime2 && (
            <InfoRow
              icon={<PlayCircle className="h-3.5 w-3.5" />}
              label="Mentor tham gia"
              value={`${formatTimeOnly(session.startTime2)} → ${formatTimeOnly(session.endTime2)} (${
                session.durationSeconds2 ? Math.floor(session.durationSeconds2 / 60) : 0
              } phút)`}
            />
          )}
        </div>

        {/* Recording */}
        {session.recordUrl && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-200">
              <Video className="h-3.5 w-3.5" />
              Recording phỏng vấn
            </div>
            <a
              href={session.recordUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 underline hover:text-indigo-800 dark:text-indigo-300">
              <ExternalLink className="h-3 w-3" />
              Xem lại video
            </a>
          </div>
        )}

        {/* Mentor review */}
        {review && (
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <h4 className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                Đánh giá của Mentor
              </h4>
              {review.rating !== undefined && (
                <span className="ml-auto rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-700 tabular-nums dark:bg-amber-950/60 dark:text-amber-300">
                  {review.rating}/10
                </span>
              )}
            </div>
            {review.strength && (
              <ReviewBlock label="Điểm mạnh" content={review.strength} tone="emerald" />
            )}
            {review.weakness && (
              <ReviewBlock label="Cần cải thiện" content={review.weakness} tone="rose" />
            )}
            {review.improve && (
              <ReviewBlock label="Đề xuất phát triển" content={review.improve} tone="sky" />
            )}
            {(review.situationNote ||
              review.taskNote ||
              review.actionNote ||
              review.resultNote) && (
              <details className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/60 dark:bg-slate-900/40">
                <summary className="cursor-pointer text-xs font-extrabold text-amber-800 dark:text-amber-200">
                  Nhận xét theo STAR method
                </summary>
                <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {review.situationNote && (
                    <ReviewRow label="Situation" content={review.situationNote} />
                  )}
                  {review.taskNote && <ReviewRow label="Task" content={review.taskNote} />}
                  {review.actionNote && <ReviewRow label="Action" content={review.actionNote} />}
                  {review.resultNote && <ReviewRow label="Result" content={review.resultNote} />}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Candidate rates the mentor (MentorFeedback). Shown when mentor
            has finished reviewing the candidate. Without this step the
            interview round is not considered "closed" on the candidate
            side. */}
        {review ? (
          <CandidateMentorFeedbackBlock session={session} feedback={feedback} onChange={onChange} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            Mentor chưa gửi đánh giá. Vui lòng quay lại sau.
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: CandidateMentorFeedbackBlock
// Renders the candidate-side "rate your mentor" step. This is the final
// step in the Mentor Interview flow:
//   1. Mentor reviewed the candidate (`session.mentorReview`).
//   2. Candidate rates the mentor here (`session.mentorFeedback`).
// When `mentorFeedback` is null, show the editable form. After submission
// show the recorded rating + comment with an "Edit" affordance.
// ============================================================================

const MIN_COMMENT_LENGTH = 20;
const MAX_COMMENT_LENGTH = 1000;

function CandidateMentorFeedbackBlock({
  session,
  feedback,
  onChange,
}: {
  session: Session;
  feedback: Session["mentorFeedback"];
  onChange: () => void;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const createFeedback = useCreateMentorFeedback();
  const updateFeedback = useUpdateMentorFeedback();

  const hasFeedback = !!(feedback && (feedback.rating !== undefined || feedback.comment));
  // BE keys `MentorFeedback.id` to `sessionId` via `@MapsId`. So if the
  // session already has a `mentorFeedback` block we MUST call PUT (not
  // POST) — POST will return 500 "different object with same identifier"
  // because Hibernate tries to attach a second entity with id=sessionId.
  // We use `session.id` as the PUT id (per docs/STUDENT_RATING_MENTOR_API.md §6).
  const isUpdate = hasFeedback;
  const [editing, setEditing] = useState(!hasFeedback);
  const [rating, setRating] = useState<number>(feedback?.rating ?? 0);
  const [comment, setComment] = useState<string>(feedback?.comment ?? "");
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});

  const trimmedLen = comment.trim().length;
  const isSubmitting = createFeedback.isPending || updateFeedback.isPending;
  const submitDisabled = isSubmitting || trimmedLen < MIN_COMMENT_LENGTH || rating < 1;

  const validate = () => {
    const next: typeof errors = {};
    if (!rating || rating < 1 || rating > 10) {
      next.rating = "Vui lòng chọn điểm đánh giá (1–10)";
    }
    if (comment.trim().length < MIN_COMMENT_LENGTH) {
      next.comment = `Nhận xét tối thiểu ${MIN_COMMENT_LENGTH} ký tự`;
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setErrors({ rating: "Bạn chưa đăng nhập" });
      return;
    }
    if (!session.id) {
      setErrors({ rating: "Không tìm thấy ID phiên" });
      return;
    }
    if (!session.mentorId) {
      setErrors({ rating: "Không tìm thấy mentor" });
      return;
    }
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      if (isUpdate) {
        // PUT /api/mentor-feedbacks — body { id: sessionId, rating, comment }
        await updateFeedback.mutateAsync({
          id: session.id,
          data: {
            id: session.id,
            rating,
            comment: comment.trim(),
          },
        });
      } else {
        await createFeedback.mutateAsync({
          sessionId: session.id,
          mentorId: session.mentorId,
          userId,
          rating,
          comment: comment.trim(),
        });
      }
      onChange();
      setEditing(false);
    } catch {
      // mutation hook toasted; keep the form open for retry
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 fill-[#FFD700] text-[#FFD700]" />
        <h4 className="text-sm font-extrabold text-indigo-800 dark:text-indigo-200">
          Đánh giá Mentor
        </h4>
        {hasFeedback && !editing && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-700 uppercase dark:bg-emerald-950/60 dark:text-emerald-300">
            ✓ Đã gửi
          </span>
        )}
        {hasFeedback && !editing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="ml-auto h-7 gap-1 px-2 text-[11px] font-bold">
            <RefreshCw className="h-3 w-3" />
            Sửa
          </Button>
        )}
      </div>

      {!editing && hasFeedback ? (
        <div className="space-y-3">
          {feedback?.rating !== undefined && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 dark:border-indigo-900/60 dark:bg-slate-900/40">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < Math.round(feedback.rating ?? 0)
                        ? "fill-[#FFD700] text-[#FFD700]"
                        : "text-slate-300 dark:text-slate-600"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-extrabold text-indigo-700 tabular-nums dark:text-indigo-300">
                {feedback.rating}/10
              </span>
            </div>
          )}
          {feedback?.comment && (
            <div className="rounded-xl border border-indigo-200 bg-white p-3 text-xs leading-relaxed text-slate-700 dark:border-indigo-900/60 dark:bg-slate-900/40 dark:text-slate-200">
              {feedback.comment}
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="leading-relaxed">
              Cảm ơn bạn đã hoàn tất đánh giá. Vòng Mentor Interview của bạn đã kết thúc.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
              Điểm đánh giá <span className="text-rose-500">*</span>
            </Label>
            <RatingScale10 value={rating} onChange={setRating} />
            {errors.rating && (
              <p className="text-[11px] font-bold text-rose-500" role="alert">
                {errors.rating}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="candidate-mentor-comment"
              className="text-xs font-extrabold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
              Nhận xét về Mentor <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="candidate-mentor-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Chia sẻ cảm nhận của bạn về buổi phỏng vấn: cách mentor đặt câu hỏi, sự hỗ trợ, điều bạn học được..."
              aria-invalid={!!errors.comment}
              className="resize-y"
            />
            <div className="flex items-center justify-between text-[10px] tracking-wider uppercase">
              <span
                className={cn(
                  "font-bold",
                  trimmedLen < MIN_COMMENT_LENGTH
                    ? "text-slate-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}>
                {trimmedLen < MIN_COMMENT_LENGTH
                  ? `Tối thiểu ${MIN_COMMENT_LENGTH} ký tự (còn ${MIN_COMMENT_LENGTH - trimmedLen})`
                  : `Đạt yêu cầu ✓`}
              </span>
              <span className="text-slate-400">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            {errors.comment && (
              <p className="text-[11px] font-bold text-rose-500" role="alert">
                {errors.comment}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              disabled={submitDisabled}
              className="h-10 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm hover:from-indigo-600 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? (
                <>
                  <Spinner size="sm" tone="white" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {hasFeedback ? "Cập nhật đánh giá" : "Gửi đánh giá"}
                </>
              )}
            </Button>
            {hasFeedback && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setRating(feedback?.rating ?? 0);
                  setComment(feedback?.comment ?? "");
                  setErrors({});
                }}
                className="h-10 border-slate-300 px-4 text-xs font-bold dark:border-slate-700">
                Hủy
              </Button>
            )}
            <p className="ml-auto text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Đây là bước cuối của vòng Mentor Interview
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

function ReviewBlock({
  label,
  content,
  tone,
}: {
  label: string;
  content: string;
  tone: "emerald" | "rose" | "sky";
}) {
  const colors: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
    rose: "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30",
    sky: "border-sky-200 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/30",
  };
  const labels: Record<string, string> = {
    emerald: "text-emerald-700 dark:text-emerald-300",
    rose: "text-rose-700 dark:text-rose-300",
    sky: "text-sky-700 dark:text-sky-300",
  };
  return (
    <div className={cn("rounded-xl border p-3", colors[tone])}>
      <div className={cn("mb-1 text-[10px] font-extrabold tracking-wider uppercase", labels[tone])}>
        {label}
      </div>
      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{content}</p>
    </div>
  );
}

function ReviewRow({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <span className="font-extrabold">{label}:</span> {content}
    </div>
  );
}

// ============================================================================
// Date helpers
// ============================================================================

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatTimeOnly(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
