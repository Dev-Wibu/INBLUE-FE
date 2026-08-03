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
  Phone,
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

const MIN_COMMENT_LENGTH = 20;
const MAX_COMMENT_LENGTH = 1000;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MentorReviewModule({
  round,
  detail: initialDetail,
  applicationId,
  isCompleted,
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
  const roundOrder = round.roundOrder ?? activeIndex + 1;

  return (
    <div className="space-y-6">
      <MentorReviewSubheader
        roundOrder={roundOrder}
        roundLabel={round.name || t("userApplicationhistory.mentorRoundTitle", "Đánh giá Mentor")}
        activeStep={activeStep}
        detail={detail}
        isCompleted={isCompleted}
        instruction={round.configData?.instruction}
      />

      {/* ============== Score banner (when done) ============== */}
      {showScore && (
        <Card className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-md backdrop-blur-md">
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-4 p-5",
              passed
                ? "bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-900/90"
                : failed
                  ? "bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-slate-900/90"
                  : "bg-slate-900/90"
            )}>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl shadow-md",
                  passed
                    ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                    : failed
                      ? "border border-rose-500/30 bg-rose-500/20 text-rose-400"
                      : "border border-slate-700 bg-slate-800 text-slate-300"
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
                <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Điểm số đánh giá phỏng vấn Mentor
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-white tabular-nums">
                    {finalScore}
                  </span>
                  <span className="text-base font-bold text-slate-400">
                    /100
                  </span>
                  {passed && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase shadow-xs">
                      ✓ PASSED
                    </span>
                  )}
                  {failed && (
                    <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-rose-300 uppercase shadow-xs">
                      ✗ FAILED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ============== Step Progress ====================================== */}
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
  const progressPercent = Math.round(
    ((Math.min(activeIndex, STEP_DEFS.length - 1) + 1) / STEP_DEFS.length) * 100
  );

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-lg backdrop-blur-md">
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/15 text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white">
                Tiến trình Mentor Interview
              </h5>
              <span className="text-[11px] font-medium text-slate-400">
                {STEP_DEFS[activeIndex]?.title || "Quy trình phỏng vấn"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-300">
              Bước <strong className="text-indigo-400">{Math.max(1, activeIndex + 1)}</strong> / {STEP_DEFS.length}
            </span>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-extrabold text-indigo-300">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* 6-step responsive full-width grid */}
        <ol className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {STEP_DEFS.map((step, i) => {
            const isActive = i === activeIndex;
            const isDone = i < activeIndex;
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                className={cn(
                  "group relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all duration-200",
                  isActive
                    ? "border-indigo-500/60 bg-gradient-to-b from-indigo-950/50 to-slate-900/90 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/40"
                    : isDone
                      ? "border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50 hover:bg-emerald-950/30"
                      : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700/80"
                )}>
                <div className="flex w-full flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:scale-105",
                      isActive
                        ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/40"
                        : isDone
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "border border-slate-700 bg-slate-800 text-slate-400"
                    )}>
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-[10px] font-extrabold tracking-wider uppercase",
                        isActive
                          ? "text-indigo-400"
                          : isDone
                            ? "text-emerald-400"
                            : "text-slate-400"
                      )}>
                      B{i + 1}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 text-xs leading-snug font-bold",
                        isActive
                          ? "text-white"
                          : isDone
                            ? "text-slate-200"
                            : "text-slate-400"
                      )}>
                      {step.short}
                    </span>
                  </div>
                </div>

                {/* Subtle status indicator */}
                <div className="mt-2.5 flex items-center justify-center">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      Hiện tại
                    </span>
                  ) : isDone ? (
                    <span className="text-[10px] font-semibold text-emerald-400">
                      Hoàn tất
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      Chưa mở
                    </span>
                  )}
                </div>
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

function AwaitingMentorStep({ detailId: _detailId, onRefresh }: { detailId: number; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleManualRefresh = () => {
    setIsManualRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsManualRefreshing(false);
      toast.success(t("userApplicationhistory.refreshSuccess", "Đã cập nhật trạng thái mới nhất!"));
    }, 600);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-xl backdrop-blur-md">
      {/* Hero Visual Section */}
      <div className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950/90 px-6 py-8 sm:px-8">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto flex flex-col items-center text-center">
          {/* Animated Hero Radar Icon */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <span className="absolute -inset-2 rounded-2xl border border-amber-500/20 opacity-40 animate-ping" />
            <Hourglass className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>

          {/* Live Badge */}
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              {t("userApplicationhistory.mentorStatusMatching", "Trạng thái: Đang phân công Mentor")}
            </span>
          </div>

          {/* Heading & Description */}
          <h3 className="mt-3 text-lg font-extrabold tracking-tight text-white sm:text-xl">
            {t("userApplicationhistory.mentorAwaitingTitle", "Chờ Admin phân bổ mentor phù hợp")}
          </h3>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {t(
              "userApplicationhistory.mentorAwaitingDesc",
              "Hệ thống đang tiến hành rà soát chuyên môn và kết nối mentor thích hợp nhất theo yêu cầu của JD. Khi mentor được gán, danh sách đề xuất sẽ xuất hiện ngay ở bước tiếp theo để bạn chọn người phỏng vấn."
            )}
          </p>
        </div>
      </div>

      {/* Next Steps Roadmap */}
      <div className="border-b border-slate-800/80 bg-slate-950/40 p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400">
            Quy trình các bước tiếp theo
          </h4>
          <span className="text-[11px] font-medium text-slate-400">
            Tự động kích hoạt khi có Mentor
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {/* Card Step 1 */}
          <div className="relative flex flex-col justify-between rounded-xl border border-amber-500/40 bg-amber-500/[0.04] p-4.5 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                  <Users className="h-4 w-4" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Đang xử lý
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-white">1. Admin đề xuất Mentor</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Admin xem xét hồ sơ và chỉ định các mentor có kỹ năng phù hợp nhất với vị trí.
              </p>
            </div>
          </div>

          {/* Card Step 2 */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400">
                  <UserCheck className="h-4 w-4" />
                </div>
                <span className="inline-flex items-center rounded-md border border-slate-800 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  Bước tiếp theo
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-slate-200">2. Bạn chọn Mentor</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Xem hồ sơ năng lực, đánh giá và chọn mentor bạn mong muốn phỏng vấn.
              </p>
            </div>
          </div>

          {/* Card Step 3 */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-4.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-400">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <span className="inline-flex items-center rounded-md border border-slate-800 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  Bước 3
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-slate-200">3. Đặt lịch & Phỏng vấn</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Chọn thời gian rảnh thuận tiện và vào phòng họp video 1-1 trực tuyến.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync & Refresh Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">
              Tự động làm mới mỗi 30s
            </div>
            <div className="text-[11px] text-slate-400">
              Hệ thống tự động cập nhật ngay khi Admin phân bổ mentor. Bạn không cần tải lại trang.
            </div>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={isManualRefreshing}
          onClick={handleManualRefresh}
          className="h-9 gap-2 rounded-xl border-slate-700 bg-slate-800/90 px-4 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white">
          <RefreshCw className={cn("h-3.5 w-3.5", isManualRefreshing && "animate-spin text-indigo-400")} />
          {isManualRefreshing ? "Đang kiểm tra..." : "Kiểm tra ngay"}
        </Button>
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
  const review = session.mentorReview as NonNullable<Session["mentorReview"]>;
  const feedback = session.mentorFeedback;
  const candidateStart = session.startTime1 ?? null;
  const candidateEnd = session.endTime1 ?? null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950 dark:text-white">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              <span>Phien phong van da hoan tat</span>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Ket qua phong van voi mentor da duoc ghi nhan. Xem nhan xet cua mentor va hoan tat
              buoc danh gia mentor de dong vong phong van.
            </p>
          </div>
          <span className="inline-flex h-7 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            COMPLETED
          </span>
        </div>

        <div className="grid gap-0 md:grid-cols-4">
          <InfoTile
            icon={<CalendarCheck className="h-4 w-4" />}
            label="Thoi gian"
            value={session.joinTime ? formatDateTime(session.joinTime) : "-"}
          />
          <InfoTile
            icon={<Clock className="h-4 w-4" />}
            label="Thoi luong"
            value={`${session.duration ?? 0} phut`}
          />
          <InfoTile
            icon={<PlayCircle className="h-4 w-4" />}
            label="Ban tham gia"
            value={
              candidateStart && candidateEnd
                ? `${formatTimeOnly(candidateStart)} - ${formatTimeOnly(candidateEnd)}`
                : "-"
            }
          />
          <InfoTile
            icon={<UserCheck className="h-4 w-4" />}
            label="Mentor"
            value={session.mentorId ? `#${session.mentorId}` : "-"}
          />
        </div>
      </Card>

      {session.recordUrl && (
        <Card className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              <Video className="h-4 w-4" />
              <span>Recording phong van</span>
            </div>
            <a
              href={session.recordUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
              <ExternalLink className="h-3.5 w-3.5" />
              Xem lai video
            </a>
          </div>
        </Card>
      )}

      {review ? (
        <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                Danh gia cua Mentor
              </h3>
            </div>
            {review.rating !== undefined && (
              <span className="inline-flex h-8 items-center rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-bold text-amber-700 tabular-nums dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {review.rating}/10
              </span>
            )}
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-3">
            {review.strength && (
              <ReviewInsight title="Diem manh" content={review.strength} tone="emerald" />
            )}
            {review.weakness && (
              <ReviewInsight title="Can cai thien" content={review.weakness} tone="rose" />
            )}
            {review.improve && (
              <ReviewInsight title="De xuat phat trien" content={review.improve} tone="sky" />
            )}
          </div>

          {(review.situationNote || review.taskNote || review.actionNote || review.resultNote) && (
            <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
              <details className="group rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                <summary className="cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Nhan xet theo STAR method
                </summary>
                <div className="mt-3 grid gap-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {review.situationNote && (
                    <ReviewRow label="Situation" content={review.situationNote} />
                  )}
                  {review.taskNote && <ReviewRow label="Task" content={review.taskNote} />}
                  {review.actionNote && <ReviewRow label="Action" content={review.actionNote} />}
                  {review.resultNote && <ReviewRow label="Result" content={review.resultNote} />}
                </div>
              </details>
            </div>
          )}
        </Card>
      ) : (
        <Card className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Hourglass className="h-5 w-5" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
            Dang cho danh gia cua mentor
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Trang nay se tu cap nhat khi mentor gui nhan xet sau buoi phong van.
          </p>
        </Card>
      )}

      {review && (
        <CandidateMentorFeedbackBlock session={session} feedback={feedback} onChange={onChange} />
      )}
    </div>
  );
}

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
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-950 dark:text-white">Danh gia Mentor</h3>
          {hasFeedback && !editing && (
            <span className="inline-flex h-6 items-center rounded-md bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              Da gui
            </span>
          )}
        </div>
        {hasFeedback && !editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="h-8 gap-1.5 px-3 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" />
            Sua danh gia
          </Button>
        )}
      </div>

      {!editing && hasFeedback ? (
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    i < Math.round(feedback?.rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300 dark:text-slate-700"
                  )}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-slate-950 tabular-nums dark:text-white">
              {feedback?.rating ?? 0}/10
            </span>
          </div>
          {feedback?.comment && (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
              {feedback.comment}
            </p>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="leading-relaxed">
              Cam on ban da hoan tat danh gia. Vong Mentor Interview da ket thuc.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-5" noValidate>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Diem danh gia <span className="text-rose-500">*</span>
              </Label>
              <span className="text-xs font-semibold text-slate-500">{rating || 0}/10</span>
            </div>
            <RatingScale10 value={rating} onChange={setRating} />
            {errors.rating && (
              <p className="text-xs font-semibold text-rose-600" role="alert">
                {errors.rating}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label
                htmlFor="candidate-mentor-comment"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Nhan xet ve Mentor <span className="text-rose-500">*</span>
              </Label>
              <span
                className={cn(
                  "text-xs font-semibold",
                  trimmedLen < MIN_COMMENT_LENGTH
                    ? "text-slate-500"
                    : "text-emerald-600 dark:text-emerald-400"
                )}>
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <Textarea
              id="candidate-mentor-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Chia se cam nhan ve cach mentor dat cau hoi, huong dan va ho tro trong buoi phong van."
              aria-invalid={!!errors.comment}
              className="resize-y rounded-lg"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trimmedLen < MIN_COMMENT_LENGTH
                    ? "text-slate-500"
                    : "text-emerald-600 dark:text-emerald-400"
                )}>
                {trimmedLen < MIN_COMMENT_LENGTH
                  ? `Toi thieu ${MIN_COMMENT_LENGTH} ky tu, con ${MIN_COMMENT_LENGTH - trimmedLen}`
                  : "Da dat yeu cau"}
              </span>
              {errors.comment && (
                <span className="text-xs font-semibold text-rose-600" role="alert">
                  {errors.comment}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button
              type="submit"
              disabled={submitDisabled}
              className="h-9 gap-2 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? (
                <>
                  <Spinner size="sm" tone="white" />
                  Dang gui...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {hasFeedback ? "Cap nhat danh gia" : "Gui danh gia"}
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
                className="h-9 px-4 text-xs font-semibold">
                Huy
              </Button>
            )}
            <p className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              Buoc cuoi cua vong Mentor Interview
            </p>
          </div>
        </form>
      )}
    </Card>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border-b border-slate-200 p-4 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0 dark:border-slate-800">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

function ReviewInsight({
  title,
  content,
  tone,
}: {
  title: string;
  content: string;
  tone: "emerald" | "rose" | "sky";
}) {
  const toneClass = {
    emerald:
      "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300",
    rose: "border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300",
    sky: "border-sky-200 bg-sky-50/60 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div
        className={cn(
          "mb-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
          toneClass
        )}>
        {title}
      </div>
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{content}</p>
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
