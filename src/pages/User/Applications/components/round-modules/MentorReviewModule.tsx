import { DateTimePicker } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useApplicationDetail,
  useAssignedMentors,
  useSelectMentor,
  type MentorResponse,
} from "@/hooks/useApplicationDetails";
import {
  useCreateMentorFeedback,
  useMentorFeedbacksByMentor,
  useUpdateMentorFeedback,
} from "@/hooks/useMentorFeedback";
import { useCreateRoundSession, useSessionById } from "@/hooks/useSession";
import type { Session } from "@/interfaces";
import { cn } from "@/lib/utils";
import type { MentorFeedback } from "@/services/mentor-feedback.manager";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CircleUser,
  Clock,
  ExternalLink,
  Globe,
  Hourglass,
  Linkedin,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Target,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

  const activeIndex = STEP_DEFS.findIndex((s) => s.key === activeStep);
  const roundOrder = round.roundOrder ?? activeIndex + 1;
  const [previewStep, setPreviewStep] = useState<StepKey | null>(null);
  const viewedStep = previewStep ?? activeStep;
  const viewedIndex = STEP_DEFS.findIndex((s) => s.key === viewedStep);
  const isPreviewingStep = previewStep !== null;

  // Reset preview when active step changes
  const resetPreviewRef = useRef(() => {
    if (previewStep && previewStep !== activeStep) {
      setPreviewStep(null);
    }
  });

  useEffect(() => {
    resetPreviewRef.current();
  }, [activeStep]);

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
                  <span className="text-base font-bold text-slate-400">/100</span>
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
      <ProgressHub
        activeIndex={activeIndex}
        viewedIndex={viewedIndex}
        onSelectStep={setPreviewStep}
      />

      {/* ============== Step body ============== */}
      {viewedStep === "AWAITING_MENTOR" && <AwaitingMentorStep />}
      {viewedStep === "SELECT_MENTOR" && (
        <SelectMentorStep
          detailId={detailId}
          readOnly={isPreviewingStep}
          onAfterSelect={() => {
            void refetchDetail();
            onSuccess?.();
          }}
        />
      )}
      {viewedStep === "SCHEDULE" && (
        <ScheduleStep
          detail={detail}
          detailId={detailId}
          submitting={createSessionMutation.isPending}
          readOnly={isPreviewingStep}
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
      {(viewedStep === "WAITING" || viewedStep === "IN_CALL" || viewedStep === "RESULT") && (
        <SessionRoomStep
          detailId={detailId}
          sessionId={sessionId}
          applicationId={applicationId}
          finalScore={finalScore}
          finalResult={detail?.finalResult ?? null}
          viewStep={viewedStep}
          readOnly={isPreviewingStep}
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

function ProgressHub({
  activeIndex,
  viewedIndex,
  onSelectStep,
}: {
  activeIndex: number;
  viewedIndex: number;
  onSelectStep: (step: StepKey) => void;
}) {
  return (
    <Card className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-md">
      <div className="flex w-full items-start justify-between">
        {STEP_DEFS.map((step, i) => {
          const isActive = i === viewedIndex;
          const isCurrent = i === activeIndex;
          const isDone = i < activeIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative flex flex-1 flex-col items-center gap-2">
              {/* Connector line */}
              {i < STEP_DEFS.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-[60%] h-0.5 w-[calc(100%-2.5rem)]",
                    isDone ? "bg-emerald-500/50" : "bg-slate-800"
                  )}
                />
              )}

              {/* Icon Circle */}
              <button
                type="button"
                onClick={() => onSelectStep(step.key)}
                title={`Xem lại: ${step.short}`}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:outline-none",
                  isActive
                    ? "border-indigo-500 bg-indigo-950/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    : isDone
                      ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                      : "border-slate-700 bg-slate-800/50 text-slate-500"
                )}>
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}

                {/* Active indicator dot */}
                {isCurrent && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] ring-2 ring-slate-900" />
                )}
              </button>

              {/* Label */}
              <span
                className={cn(
                  "text-[10px] font-extrabold tracking-wider uppercase transition-colors duration-300",
                  isActive ? "text-indigo-300" : isDone ? "text-emerald-500" : "text-slate-500"
                )}>
                {step.short}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: AwaitingMentorStep
// ============================================================================

function AwaitingMentorStep() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-xl backdrop-blur-md">
      {/* Hero Visual Section */}
      <div className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950/90 px-6 py-8 sm:px-8">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative mx-auto flex flex-col items-center text-center">
          {/* Animated Hero Radar Icon */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.15)]">
            <span className="absolute -inset-2 animate-ping rounded-2xl border border-amber-500/20 opacity-40" />
            <Hourglass className="h-8 w-8 animate-pulse text-amber-400" />
          </div>

          {/* Live Badge */}
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3.5 py-1 text-xs font-bold text-amber-300 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              {t(
                "userApplicationhistory.mentorStatusMatching",
                "Trạng thái: Đang phân công Mentor"
              )}
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
      <div className="bg-slate-950/40 p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
            Quy trình các bước tiếp theo
          </h4>
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
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
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
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: SelectMentorStep
// ============================================================================

// ============================================================================
// SUB-COMPONENT: SelectMentorStep
// ============================================================================

function SelectMentorStep({
  detailId,
  readOnly = false,
  onAfterSelect,
}: {
  detailId: number;
  readOnly?: boolean;
  onAfterSelect: () => void;
}) {
  const { t } = useTranslation();
  const { data: mentors, isLoading, error, refetch } = useAssignedMentors(detailId);
  const selectMutation = useSelectMentor({
    onSuccess: () => onAfterSelect(),
  });
  const [feedbackMentor, setFeedbackMentor] = useState<MentorResponse | null>(null);
  const [mentorToConfirm, setMentorToConfirm] = useState<MentorResponse | null>(null);
  const mentorsSorted = useMemo(
    () => [...(mentors ?? [])].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0)),
    [mentors]
  );

  if (isLoading) {
    return (
      <Card className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
        <Spinner className="mx-auto h-8 w-8 text-indigo-500" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Đang tải danh sách mentor...</p>
      </Card>
    );
  }

  if (error || !mentors || mentors.length === 0) {
    return (
      <Card className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <h3 className="mt-4 text-lg font-black text-rose-900 dark:text-rose-100">
          Chưa có mentor nào được chỉ định
        </h3>
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          Vui lòng chờ Admin phân bổ chuyên gia phù hợp.
        </p>
        <Button variant="outline" onClick={() => void refetch()} className="mt-6 rounded-xl">
          Tải lại
        </Button>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950/95 p-4 shadow-lg backdrop-blur-md sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-100">
                    {t("userApplicationhistory.mentorSelectTitle", "Chọn mentor phù hợp")}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
                    {t(
                      "userApplicationhistory.mentorSelectCount",
                      "{{count}} mentor được đề xuất",
                      {
                        count: mentors.length,
                      }
                    )}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {t(
                    "userApplicationhistory.mentorSelectDescription",
                    "Chọn 1 mentor từ danh sách được đề xuất cho vị trí ứng tuyển này."
                  )}
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-slate-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>
                {t("userApplicationhistory.mentorSelectHintShort", "Xem hồ sơ trước khi chọn")}
              </span>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-800/70 pt-4">
            <p className="text-xs leading-5 text-slate-400">
              {t(
                "userApplicationhistory.mentorSelectHint",
                "Mở hồ sơ để xem kinh nghiệm, đánh giá và phản hồi trước khi chọn."
              )}
            </p>
          </div>
        </div>

        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(270px,1fr))] justify-items-center gap-4">
          {mentorsSorted.map((mentor) => (
            <MentorCard
              key={mentor.id ?? mentor.email ?? mentor.name}
              mentor={mentor}
              disabled={readOnly || selectMutation.isPending}
              onOpenDetails={() => setFeedbackMentor(mentor)}
              onRequestConfirm={() => {
                if (!readOnly) setMentorToConfirm(mentor);
              }}
            />
          ))}
        </div>
      </div>

      <MentorDetailDialog
        mentor={feedbackMentor}
        open={Boolean(feedbackMentor)}
        onOpenChange={(open) => {
          if (!open) setFeedbackMentor(null);
        }}
      />

      <AlertDialog
        open={Boolean(mentorToConfirm)}
        onOpenChange={(open) => {
          if (!open) setMentorToConfirm(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("userApplicationhistory.mentorConfirmTitle", "Confirm mentor selection?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {mentorToConfirm
                ? t(
                    "userApplicationhistory.mentorConfirmDescription",
                    "You are selecting {{name}} as your mentor. Are you sure?",
                    {
                      name: mentorToConfirm.name ?? "—",
                    }
                  )
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Hủy")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (readOnly) return;
                if (!mentorToConfirm?.id) return;
                selectMutation.mutate({
                  applicationDetailId: detailId,
                  mentorId: mentorToConfirm.id,
                });
                setMentorToConfirm(null);
              }}>
              {t("common.confirm", "Xác nhận")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MentorCard({
  mentor,
  disabled,
  onOpenDetails,
  onRequestConfirm,
}: {
  mentor: MentorResponse;
  disabled: boolean;
  onOpenDetails: () => void;
  onRequestConfirm: () => void;
}) {
  const { t } = useTranslation();
  const mentorId = mentor.id ?? 0;
  const { data: feedbacks = [], isLoading } = useMentorFeedbacksByMentor(mentorId);
  const rating = mentor.averageRating ?? 0;
  const bio = mentor.bio?.trim() ?? "";
  const feedbackCountLabel =
    isLoading || !mentorId
      ? t("userApplicationhistory.mentorSelectFeedbackLoading", "Loading...")
      : t("userApplicationhistory.mentorSelectFeedbackCountValue", "{{count}} reviews", {
          count: feedbacks.length,
        });

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={t("userApplicationhistory.mentorSelectOpenDetail", "Mở hồ sơ mentor")}
      onClick={onOpenDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails();
        }
      }}
      className="group flex h-full w-full max-w-[290px] flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:bg-slate-900/80">
      <div className="relative overflow-hidden border-b border-slate-800/80 bg-slate-900/80 px-4 pt-4 pb-4 dark:bg-slate-900/80">
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-200 shadow-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{rating > 0 ? rating.toFixed(1) : "—"}</span>
            </div>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 shadow-sm">
              {feedbackCountLabel}
            </span>
          </div>

          <div className="mt-2.5 flex flex-col items-center text-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-sm ring-1 ring-slate-950/50">
              <img
                src={mentor.avatarUrl || "/placeholder.png"}
                alt={mentor.name ?? "Mentor"}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-2 min-h-[4rem] space-y-0.5">
              <h4 className="text-[16px] leading-6 font-semibold break-words whitespace-normal text-white">
                {mentor.name ?? "—"}
              </h4>
              <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-slate-300">
                {mentor.currentCompany || mentor.email || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
        <div className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-200 shadow-sm">
              <Users className="h-3.5 w-3.5 text-indigo-300" />
              {t("userApplicationhistory.mentorSelectSessionsValue", "{{count}} sessions", {
                count: mentor.totalSession ?? 0,
              })}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 font-medium text-slate-300 shadow-sm">
              {feedbackCountLabel}
            </span>
          </div>

          <div className="mt-4">
            <p className="relative min-h-[7rem] pl-6 text-sm leading-6 text-slate-200 italic">
              <span className="absolute top-0 left-0.5 text-lg leading-none text-indigo-300">
                “
              </span>
              {bio ||
                t(
                  "userApplicationhistory.mentorSelectNoBio",
                  "Chưa có giới thiệu chi tiết từ mentor này."
                )}
              <span className="ml-1 text-indigo-300">”</span>
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRequestConfirm();
          }}
          disabled={disabled}
          className="mt-4 h-11 w-full rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t("userApplicationhistory.mentorSelectConfirmButton", "Xác nhận")}
        </Button>
      </div>
    </article>
  );
}

function MentorDetailDialog({
  mentor,
  open,
  onOpenChange,
}: {
  mentor: MentorResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const mentorId = mentor?.id ?? 0;
  const { data: feedbacks = [], isLoading } = useMentorFeedbacksByMentor(mentorId);

  if (!mentor) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] max-w-5xl overflow-hidden border border-slate-800 bg-slate-950 p-0 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-end border-b border-slate-800/80 bg-slate-900/70 px-4 py-3">
          <DialogClose className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-950/60 text-slate-300 transition-colors hover:border-slate-500 hover:text-white">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("compUi.close", "Đóng")}</span>
          </DialogClose>
        </div>

        <div className="max-h-[calc(90vh-57px)] overflow-y-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
            <section className="space-y-4 self-start">
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm">
                <div className="border-b border-slate-800 px-5 py-5">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-sm">
                      <img
                        src={mentor.avatarUrl || "/placeholder.png"}
                        alt={mentor.name ?? "Mentor"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-white">{mentor.name || "—"}</h3>
                      <p className="text-sm text-slate-400">{mentor.currentCompany || "—"}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {mentor.averageRating ? mentor.averageRating.toFixed(1) : "—"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {t(
                          "userApplicationhistory.mentorSelectSessionsValue",
                          "{{count}} sessions",
                          {
                            count: mentor.totalSession ?? 0,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      {t("userApplicationhistory.mentorSelectExpertise", "Chuyên môn")}
                    </div>
                    <p className="text-sm leading-6 text-slate-100">{mentor.expertise || "—"}</p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      {t("userApplicationhistory.mentorSelectContact", "Liên hệ")}
                    </div>
                    <p className="text-sm leading-6 text-slate-100">{mentor.email || "—"}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                      {t("userApplicationhistory.mentorSelectBioLabel", "Bio")}
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-200 italic">
                      <span className="mr-1 text-indigo-300">“</span>
                      {mentor.bio ||
                        t("userApplicationhistory.mentorSelectNoBio", "No bio available.")}
                      <span className="ml-1 text-indigo-300">”</span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                <h4 className="text-sm font-semibold text-white">
                  {t("userApplicationhistory.mentorFeedbackTitle", "Feedback history")}
                </h4>
                <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {t("userApplicationhistory.mentorSelectFeedbackCountValue", "{{count}} reviews", {
                    count: feedbacks.length,
                  })}
                </span>
              </div>

              <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 px-4 py-10 text-sm text-slate-400">
                    {t("userApplicationhistory.mentorFeedbackLoading", "Loading feedback...")}
                  </div>
                ) : feedbacks.length > 0 ? (
                  feedbacks.map((feedback: MentorFeedback) => (
                    <MentorFeedbackCard
                      key={feedback.id ?? `${feedback.createdAt ?? ""}-${feedback.rating ?? 0}`}
                      feedback={feedback}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 px-4 py-8 text-sm text-slate-400">
                    {t(
                      "userApplicationhistory.mentorFeedbackEmpty",
                      "No feedback has been shared yet."
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MentorFeedbackCard({ feedback }: { feedback: MentorFeedback }) {
  const { t } = useTranslation();
  const rating = feedback.rating ?? 0;
  const session = feedback.session;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <img
          src={feedback.user?.avatarUrl || "/placeholder.png"}
          alt={feedback.user?.name || "User"}
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-700"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {feedback.user?.name || "—"}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {session?.id
                  ? `${t("userApplicationhistory.mentorFeedbackSessionLabel", "Session")} #${session.id}`
                  : t("userApplicationhistory.mentorFeedbackSessionUnknown", "Session unavailable")}
                {session?.joinTime ? ` · ${formatDateTime(session.joinTime)}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {feedback.comment ||
              t("userApplicationhistory.mentorFeedbackNoComment", "No comment provided.")}
          </p>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// SUB-COMPONENT: ScheduleStep — 2-column layout (form left + mentor info right)
// ============================================================================

function ScheduleStep({
  detail,
  detailId,
  submitting,
  readOnly = false,
  onSubmit,
}: {
  detail?: ApplicationDetail;
  detailId: number;
  submitting: boolean;
  readOnly?: boolean;
  onSubmit: (_payload: { joinTime: string; duration: number; offline: boolean }) => void;
}) {
  const { t } = useTranslation();
  const { data: mentors } = useAssignedMentors(detailId);
  const scheduleSessionInfo = (
    detail as unknown as { sessionInfo?: { mentorId?: number | null } } | undefined
  )?.sessionInfo;
  const selectedMentorId = detail?.mentorId ?? scheduleSessionInfo?.mentorId ?? null;
  const selectedMentor = useMemo(() => {
    return (
      mentors?.find((m) => selectedMentorId != null && m.id === selectedMentorId) ??
      mentors?.[0] ??
      null
    );
  }, [mentors, selectedMentorId]);

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Single source of truth for when the interview happens. Wall-clock time is
  // preserved through the browser's local timezone (Date#getHours/getMinutes
  // returns the local TZ value), which is critical for the joinTime
  // construction below: 1:45 stays 1:45, never 8:30.
  const defaultJoinDateTime = (() => {
    const d = new Date(tomorrow);
    d.setHours(14, 0, 0, 0);
    return d;
  })();

  const [joinDateTime, setJoinDateTime] = useState<Date | null>(defaultJoinDateTime);
  const [duration, setDuration] = useState<number>(45);
  const [offline, setOffline] = useState(false);

  const handleSubmit = () => {
    if (readOnly) return;
    if (!joinDateTime) {
      toast.error(
        t("userApplicationhistory.mentorScheduleMissingDateTime", "Please select a date and time")
      );
      return;
    }
    // Build joinTime with an explicit timezone offset so the BE knows the
    // candidate's intended wall-clock time. Without the offset, the BE
    // (Spring Boot/Jackson default) treats the naive string as UTC, which
    // shifts the stored time by 7h for users in Vietnam (UTC+7) — e.g.
    // picking 01:46 lands the session at 08:46 local.
    // We extract the wall-clock y/m/d/h/m from the browser-local Date
    // (which is what the user picked) and pair them with the browser's
    // current timezone offset.
    const offsetMinutes = now.getTimezoneOffset();
    const sign = offsetMinutes > 0 ? "-" : "+";
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
    const offsetMins = String(absOffset % 60).padStart(2, "0");
    const y = joinDateTime.getFullYear();
    const mo = String(joinDateTime.getMonth() + 1).padStart(2, "0");
    const dd = String(joinDateTime.getDate()).padStart(2, "0");
    const hh = String(joinDateTime.getHours()).padStart(2, "0");
    const mm = String(joinDateTime.getMinutes()).padStart(2, "0");
    const joinTime = `${y}-${mo}-${dd}T${hh}:${mm}:00${sign}${offsetHours}:${offsetMins}`;
    onSubmit({ joinTime, duration, offline });
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const minDateTime = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const summaryDate = useMemo(() => {
    if (!joinDateTime) return "—";
    return joinDateTime.toLocaleDateString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [joinDateTime]);

  const summaryTime = useMemo(() => {
    if (!joinDateTime) return "—";
    return `${String(joinDateTime.getHours()).padStart(2, "0")}:${String(
      joinDateTime.getMinutes()
    ).padStart(2, "0")}`;
  }, [joinDateTime]);

  // Build an end-time string by adding `duration` minutes to the start time.
  const endTime = useMemo(() => {
    if (!joinDateTime) return null;
    return new Date(joinDateTime.getTime() + duration * 60_000);
  }, [joinDateTime, duration]);

  const formattedEndTime = useMemo(() => {
    if (!endTime) return "—";
    const h = String(endTime.getHours()).padStart(2, "0");
    const m = String(endTime.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, [endTime]);

  const durationPresets = useMemo(
    () =>
      [30, 45, 60, 90].map((m) => {
        const raw = t("userApplicationhistory.mentorScheduleDurationOptions", {
          returnObjects: true,
          defaultValue: ["30 min", "45 min", "60 min", "90 min"],
        }) as string[];
        return { value: m, label: raw[[30, 45, 60, 90].indexOf(m)] ?? `${m} min` };
      }),
    [t]
  );

  // Largest duration drives the bar; smaller durations show a proportionally
  // filled bar so the visual length reinforces the choice.
  const DURATION_MAX = 120;

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      {/* ============== LEFT COLUMN — Schedule form ============== */}
      <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-500/10 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                  {t("userApplicationhistory.mentorScheduleTitle", "Schedule the interview")}
                </h3>
                <p className="max-w-xl text-sm text-slate-600 dark:text-slate-400">
                  {t(
                    "userApplicationhistory.mentorScheduleDescription",
                    "Pick a date, time, and duration that work for you. You can change it before payment."
                  )}
                </p>
              </div>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 sm:inline-flex dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              <Sparkles className="h-3 w-3 text-indigo-500 dark:text-indigo-300" />
              {t("userApplicationhistory.mentorScheduleStepBadge", "Step 3 of 6")}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col space-y-5 p-5 sm:p-6">
          {/* ===== WHEN: Calendar (left) + Clock (right) ===== */}
          <section className="space-y-3">
            <SectionLabel
              index={1}
              label={t("userApplicationhistory.mentorScheduleWhenLabel", "When")}
              hint={t(
                "userApplicationhistory.mentorScheduleWhenHint",
                "Pick the date and a precise start time"
              )}
            />
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/40",
                readOnly && "pointer-events-none opacity-70"
              )}>
              <DateTimePicker
                value={joinDateTime}
                onChange={(d) => setJoinDateTime(d)}
                placeholder={t(
                  "userApplicationhistory.mentorScheduleDateTimePickerPlaceholder",
                  "Pick a date and time"
                )}
                showTime
                minuteStep={5}
                minDate={minDateTime}
                disabledDates={(d) => {
                  const base = new Date(d);
                  base.setHours(0, 0, 0, 0);
                  return base < today;
                }}
                themeVariant="user"
                clearable={false}
                className="relative w-full"
                popoverClassName="overflow-hidden"
              />
            </div>
          </section>

          {/* ===== HOW LONG: Duration pill cards ===== */}
          <section className="space-y-3">
            <SectionLabel
              index={2}
              label={t("userApplicationhistory.mentorScheduleDurationLabel", "Duration")}
              hint={t(
                "userApplicationhistory.mentorScheduleDurationHint",
                "How long should the interview run?"
              )}
            />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {durationPresets.map((d) => {
                const active = duration === d.value;
                const fill = Math.min(100, (d.value / DURATION_MAX) * 100);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      if (!readOnly) setDuration(d.value);
                    }}
                    disabled={readOnly}
                    aria-pressed={active}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border-2 px-3 py-3 text-left transition-all duration-200",
                      active
                        ? "border-indigo-500 bg-indigo-500/10 shadow-sm dark:border-indigo-400 dark:bg-indigo-950/30"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600"
                    )}>
                    <div className="flex items-baseline justify-between">
                      <span
                        className={cn(
                          "text-2xl font-black tracking-tight tabular-nums",
                          active
                            ? "text-indigo-700 dark:text-indigo-200"
                            : "text-slate-800 dark:text-slate-100"
                        )}>
                        {d.value}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-extrabold tracking-wider uppercase",
                          active
                            ? "text-indigo-500 dark:text-indigo-300"
                            : "text-slate-400 dark:text-slate-500"
                        )}>
                        min
                      </span>
                    </div>
                    {/* Relative-length visualization bar */}
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          active
                            ? "bg-indigo-500"
                            : "bg-slate-300 group-hover:bg-indigo-300 dark:bg-slate-700 dark:group-hover:bg-indigo-700"
                        )}
                        style={{ width: `${fill}%` }}
                      />
                    </div>
                    {active && (
                      <CheckCircle2 className="absolute top-2 right-2 h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ===== WHERE: Mode ===== */}
          <section className="space-y-3">
            <SectionLabel
              index={3}
              label={t("userApplicationhistory.mentorScheduleModeLabel", "Interview mode")}
              hint={t(
                "userApplicationhistory.mentorScheduleModeHint",
                "Choose how you want to meet the mentor"
              )}
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ModeOption
                active={!offline}
                disabled={readOnly}
                onClick={() => setOffline(false)}
                icon={<Video className="h-5 w-5" />}
                tone="sky"
                title={t(
                  "userApplicationhistory.mentorScheduleModeOnlineTitle",
                  "Online (Daily.co)"
                )}
                desc={t(
                  "userApplicationhistory.mentorScheduleModeOnlineDesc",
                  "Video interview in your browser"
                )}
                badge={t("userApplicationhistory.mentorScheduleModeOnlineBadge", "Recommended")}
              />
              <ModeOption
                active={offline}
                disabled={readOnly}
                onClick={() => setOffline(true)}
                icon={<MapPin className="h-5 w-5" />}
                tone="amber"
                title={t("userApplicationhistory.mentorScheduleModeOfflineTitle", "Offline")}
                desc={t(
                  "userApplicationhistory.mentorScheduleModeOfflineDesc",
                  "Meet in person at a location arranged by the mentor"
                )}
                badge={t("userApplicationhistory.mentorScheduleModeOfflineBadge", "On request")}
              />
            </div>
          </section>

          {/* ===== CTA ===== */}
          <div className="relative mt-auto pt-1">
            <div className="pointer-events-none absolute inset-x-0 -top-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />
            <Button
              onClick={handleSubmit}
              disabled={readOnly || submitting}
              className="relative h-12 w-full gap-2 overflow-hidden rounded-xl bg-indigo-600 text-sm font-semibold tracking-wide text-white shadow-sm hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("userApplicationhistory.mentorScheduleSubmitting", "Creating session...")}
                </>
              ) : (
                <>
                  <CalendarCheck className="h-4 w-4" />
                  {t("userApplicationhistory.mentorScheduleSubmit", "Create interview session")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ============== RIGHT COLUMN — Mentor hero + Summary card ============== */}
      <div className="space-y-4 self-stretch lg:sticky lg:top-4">
        {/* ===== Mentor hero card ===== */}
        <Card className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="p-4">
            {selectedMentor ? (
              <>
                {/* Identity */}
                <div className="flex items-start gap-3">
                  <div>
                    <Avatar className="h-16 w-16 rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
                      <AvatarImage
                        src={selectedMentor.avatarUrl || "/placeholder.png"}
                        alt={selectedMentor.name ?? "Mentor"}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-2xl bg-indigo-600 text-base font-extrabold text-white">
                        {selectedMentor.name?.slice(0, 1).toUpperCase() ?? (
                          <CircleUser className="h-6 w-6" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h4 className="text-base leading-6 font-bold tracking-tight text-slate-950 dark:text-white">
                      {selectedMentor.name ?? "—"}
                    </h4>
                    {selectedMentor.currentCompany && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-300" />
                        <span className="truncate">{selectedMentor.currentCompany}</span>
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        {selectedMentor.averageRating
                          ? selectedMentor.averageRating.toFixed(1)
                          : "—"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200">
                        <Briefcase className="h-3.5 w-3.5" />
                        {selectedMentor.totalSession ?? 0} phiên
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200">
                        <Award className="h-3.5 w-3.5" />
                        {selectedMentor.yearsOfExperience != null
                          ? `${selectedMentor.yearsOfExperience}+ năm`
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expertise */}
                {selectedMentor.expertise && (
                  <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                      Chuyên môn
                    </div>
                    <p className="mt-1.5 text-sm leading-5 font-semibold text-slate-900 dark:text-slate-100">
                      {selectedMentor.expertise}
                    </p>
                  </div>
                )}

                {/* Bio + contact */}
                {(selectedMentor.bio || selectedMentor.email || selectedMentor.linkedInUrl) && (
                  <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
                    {selectedMentor.bio && (
                      <p className="line-clamp-2 leading-5 text-slate-600 italic dark:text-slate-300">
                        &ldquo;{selectedMentor.bio}&rdquo;
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedMentor.email && (
                        <a
                          href={`mailto:${selectedMentor.email}`}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{selectedMentor.email}</span>
                        </a>
                      )}
                      {selectedMentor.linkedInUrl && (
                        <a
                          href={selectedMentor.linkedInUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300">
                          <Linkedin className="h-3.5 w-3.5" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <Globe className="h-6 w-6 text-slate-400" />
                <p>
                  {t(
                    "userApplicationhistory.mentorScheduleSelectedMentorEmpty",
                    "No mentor selected"
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ===== Summary card ===== */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                Tóm tắt buổi phỏng vấn
              </h3>
              <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                Cập nhật trực tiếp
              </span>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Bắt đầu
                  </div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-slate-950 tabular-nums dark:text-white">
                    {summaryTime}
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                    {summaryDate}
                  </div>
                </div>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                <div className="min-w-0 text-right">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Kết thúc
                  </div>
                  <div className="mt-1 text-3xl font-black tracking-tight text-indigo-700 tabular-nums dark:text-indigo-200">
                    {formattedEndTime}
                  </div>
                  <div className="mt-1 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                    + {duration} phút
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5 border-t border-slate-200 pt-3 dark:border-slate-800">
                <SummaryLine
                  icon={<Hourglass className="h-4 w-4" />}
                  label="Thời lượng"
                  value={`${duration} phút`}
                />
                <SummaryLine
                  icon={offline ? <MapPin className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  label="Hình thức"
                  value={offline ? "Gặp trực tiếp" : "Trực tuyến"}
                />
                {selectedMentor?.rate != null && (
                  <SummaryLine
                    icon={<CircleDollarSign className="h-4 w-4" />}
                    label="Ước tính"
                    value={formatRate(selectedMentor.rate, duration)}
                  />
                )}
              </div>

              <p className="border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Lịch phỏng vấn sẽ được xác nhận ngay sau khi tạo phiên. Bạn vẫn có thể đổi giờ trước
                khi phiên bắt đầu.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================

function SectionLabel({ index, label, hint }: { index: number; label: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-extrabold text-white shadow-sm">
        {index}
      </span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {hint && (
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">— {hint}</span>
      )}
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  disabled = false,
  icon,
  tone,
  title,
  desc,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tone: "sky" | "amber";
  title: string;
  desc: string;
  badge?: string;
}) {
  const toneClasses = {
    sky: {
      ring: "ring-sky-500/15",
      activeBorder: "border-sky-500 bg-sky-500/10 dark:border-sky-400 dark:bg-sky-950/25",
      iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
      title: "text-sky-700 dark:text-sky-200",
      desc: "text-slate-600 dark:text-slate-400",
      badgeBg:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300",
    },
    amber: {
      ring: "ring-amber-500/15",
      activeBorder: "border-amber-500 bg-amber-500/10 dark:border-amber-400 dark:bg-amber-950/25",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
      title: "text-amber-700 dark:text-amber-200",
      desc: "text-slate-600 dark:text-slate-400",
      badgeBg:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-all duration-200",
        active
          ? cn("shadow-sm ring-1", toneClasses.activeBorder, toneClasses.ring)
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600",
        disabled && "cursor-not-allowed opacity-70 hover:translate-y-0 hover:shadow-none"
      )}>
      <div className="flex w-full items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl",
            active
              ? toneClasses.iconBg
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          )}>
          {icon}
        </div>
        {active && badge && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
              toneClasses.badgeBg
            )}>
            <Sparkles className="h-2.5 w-2.5" />
            {badge}
          </span>
        )}
      </div>
      <div>
        <div
          className={cn(
            "text-sm font-semibold tracking-tight",
            active ? toneClasses.title : "text-slate-800 dark:text-slate-100"
          )}>
          {title}
        </div>
        <div className={cn("mt-0.5 text-[11px] leading-relaxed", toneClasses.desc)}>{desc}</div>
      </div>
    </button>
  );
}

function SummaryLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <span className="text-indigo-500 dark:text-indigo-300">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-bold text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}

// Approximate cost: rate is per session in many systems; we surface a
// transparent "duration × 1" estimate. Backend may overwrite.
function formatRate(rate: number, durationMin: number): string {
  const total = Math.round(rate * durationMin);
  return `${total.toLocaleString()}`;
}

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
  const { t } = useTranslation();
  const map: Record<string, { tone: string; labelKey: string }> = {
    DRAFT: {
      tone: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      labelKey: "userApplicationhistory.mentorSessionStatusDraft",
    },
    SCHEDULED: {
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      labelKey: "userApplicationhistory.mentorSessionStatusScheduled",
    },
    PAID: {
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      labelKey: "userApplicationhistory.mentorSessionStatusBooked",
    },
    ONGOING: {
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      labelKey: "userApplicationhistory.mentorSessionStatusOngoing",
    },
    COMPLETED: {
      tone: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      labelKey: "userApplicationhistory.mentorSessionStatusCompleted",
    },
    REJECTED: {
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      labelKey: "userApplicationhistory.mentorSessionStatusRejected",
    },
    CANCELED: {
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      labelKey: "userApplicationhistory.mentorSessionStatusCanceled",
    },
  };
  const cfg = map[status] ?? map.DRAFT;
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {t("userApplicationhistory.mentorSessionStatusLabel")}
      </span>
      <span
        className={cn(
          "rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase",
          cfg.tone
        )}>
        {t(
          cfg.labelKey,
          status === "PAID"
            ? "Đã đặt lịch"
            : t("userApplicationhistory.mentorSessionStatusPaid", "Đã lên lịch")
        )}
      </span>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: SessionRoomStep — covers WAITING / IN_CALL / RESULT
// ============================================================================

function SessionRoomStep({
  detailId,
  sessionId,
  finalScore,
  finalResult,
  viewStep,
  readOnly = false,
  onStatusChange,
}: {
  detailId: number;
  sessionId: number | null;
  applicationId: number;
  finalScore: number | null;
  finalResult: string | null;
  viewStep: StepKey;
  readOnly?: boolean;
  onStatusChange: () => void;
}) {
  const { t } = useTranslation();
  const { data: mentors } = useAssignedMentors(detailId);
  const { data: session, refetch } = useSessionById(sessionId ?? 0);
  const [now, setNow] = useState(() => Date.now());
  const sessionMentor = useMemo(() => {
    return mentors?.find((mentor) => mentor.id === session?.mentorId) ?? null;
  }, [mentors, session?.mentorId]);

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
          {t("userApplicationhistory.mentorSessionLoading")}
        </div>
      </Card>
    );
  }

  const joinAt = session.joinTime ? new Date(session.joinTime).getTime() : 0;
  const minutesUntilStart = Math.floor((joinAt - now) / 60_000);
  const canEnter = minutesUntilStart <= 15 && minutesUntilStart > -(session.duration ?? 0);
  const isCompleted = readOnly ? viewStep === "RESULT" : session.status === "COMPLETED";

  // ---- COMPLETED ----
  if (isCompleted) {
    return (
      <CompletedResultView
        session={session}
        mentor={sessionMentor}
        finalScore={finalScore}
        finalResult={finalResult}
        readOnly={readOnly}
        onChange={onStatusChange}
      />
    );
  }

  // ---- ONGOING or WAITING ----
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              <Video className="h-3 w-3 text-indigo-500 dark:text-indigo-300" />
              {t("userApplicationhistory.mentorSessionTitle", { id: session.id })}
            </div>
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
              {t("userApplicationhistory.mentorSessionHint")}
            </h3>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Phòng sẽ mở trước 15 phút. Bạn có thể vào từ trình duyệt khi trạng thái cho phép.
            </p>
          </div>
          <SessionStatusBadge status={session.status ?? "SCHEDULED"} />
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Thông tin phiên
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Cập nhật mỗi 30 giây
              </span>
            </div>
            <div className="grid gap-0 sm:grid-cols-2">
              <InfoRow
                icon={<CalendarCheck className="h-3.5 w-3.5" />}
                label={t("userApplicationhistory.mentorSessionFieldTime")}
                value={session.joinTime ? formatDateTime(session.joinTime) : "—"}
              />
              <InfoRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label={t("userApplicationhistory.mentorSessionFieldDuration")}
                value={`${session.duration ?? 0} phút`}
              />
              <InfoRow
                icon={<Video className="h-3.5 w-3.5" />}
                label={t("userApplicationhistory.mentorSessionFieldMode")}
                value={
                  session.roomUrl
                    ? t("userApplicationhistory.mentorSessionModeOnline")
                    : t("userApplicationhistory.mentorSessionModeOffline")
                }
              />
              <InfoRow
                icon={<UserCheck className="h-3.5 w-3.5" />}
                label={t("userApplicationhistory.mentorSessionFieldMentor")}
                value={
                  sessionMentor
                    ? `${sessionMentor.name ?? `#${session.mentorId ?? "—"}`}${
                        sessionMentor.currentCompany ? ` · ${sessionMentor.currentCompany}` : ""
                      }`
                    : `#${session.mentorId ?? "—"}`
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5 text-indigo-500" />
              <span>Mẹo</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Nếu gặp sự cố kỹ thuật, refresh trang và thử lại. Trang sẽ tự động cập nhật trạng thái
              phiên mỗi 30 giây.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Sẵn sàng vào phòng
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Theo dõi thời gian và vào phòng đúng lúc
                </div>
              </div>
            </div>

            {session.status === "PAID" && joinAt > 0 && (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900/60 dark:bg-sky-950/25">
                <div className="text-[10px] font-semibold tracking-wide text-sky-600 uppercase dark:text-sky-400">
                  {canEnter
                    ? t("userApplicationhistory.mentorSessionRoomOpen")
                    : t("userApplicationhistory.mentorSessionCountdownLabel")}
                </div>
                <div className="mt-2 text-3xl font-black text-sky-700 tabular-nums dark:text-sky-200">
                  {canEnter
                    ? t("userApplicationhistory.mentorSessionReady")
                    : formatCountdown(Math.max(0, joinAt - now))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-sky-700/80 dark:text-sky-300/80">
                  {canEnter
                    ? t("userApplicationhistory.mentorSessionReadyHint")
                    : t("userApplicationhistory.mentorSessionOpensBeforeHint", {
                        time: session.joinTime ? formatTimeOnly(session.joinTime) : "",
                      })}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (readOnly) return;
                  if (session.roomUrl) {
                    window.location.href = `/user/sessions/room/${session.id}`;
                  } else {
                    toast.info(t("userApplicationhistory.mentorSessionOfflineToast"));
                  }
                }}
                disabled={readOnly || (!canEnter && session.status === "PAID")}
                className="h-11 flex-1 gap-2 bg-indigo-600 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                <LogIn className="h-4 w-4" />
                {session.status === "ONGOING"
                  ? t("userApplicationhistory.mentorSessionJoinOngoing")
                  : t("userApplicationhistory.mentorSessionJoinVideoCall")}
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!readOnly) void refetch();
                }}
                disabled={readOnly}
                className="h-11 gap-2 border-slate-300 px-4 text-xs font-semibold dark:border-slate-700">
                <RefreshCw className="h-4 w-4" />
                {t("userApplicationhistory.mentorSessionRefresh")}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}

// ============================================================================
// SUB-COMPONENT: CompletedResultView
// ============================================================================

function CompletedResultView({
  session,
  mentor,
  finalScore,
  finalResult,
  readOnly = false,
  onChange,
}: {
  session: Session;
  mentor: MentorResponse | null;
  finalScore: number | null;
  finalResult: string | null;
  readOnly?: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
  const review = session.mentorReview as NonNullable<Session["mentorReview"]>;
  const feedback = session.mentorFeedback;
  const candidateStart = session.startTime1 ?? null;
  const candidateEnd = session.endTime1 ?? null;
  const mentorAverageRating = mentor?.averageRating ?? 0;
  const mentorSessionCount = mentor?.totalSession ?? 0;
  const mentorExperienceLabel = mentor?.yearsOfExperience
    ? `${mentor.yearsOfExperience}+ năm`
    : "—";
  const hasFinalScore = finalScore !== null && finalScore !== undefined;
  const finalPassed = finalResult === "PASSED";
  const finalFailed = finalResult === "FAILED";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
            <div className="relative flex flex-wrap items-center gap-4 border-b border-slate-200 px-5 py-5 pr-5 md:pr-44 dark:border-slate-800">
              {hasFinalScore && (
                <div
                  className={cn(
                    "absolute top-5 right-5 hidden rotate-[-3deg] items-center gap-2 rounded-full border-2 border-dashed bg-white/70 px-3.5 py-2 shadow-sm backdrop-blur-sm md:inline-flex dark:bg-slate-950/30",
                    finalPassed
                      ? "border-emerald-400/70 text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-300"
                      : finalFailed
                        ? "border-rose-400/70 text-rose-700 dark:border-rose-500/60 dark:text-rose-300"
                        : "border-indigo-400/70 text-indigo-700 dark:border-indigo-500/60 dark:text-indigo-300"
                  )}>
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-xl leading-none font-black tabular-nums">{finalScore}</span>
                  <span className="text-[11px] font-black opacity-70">/100</span>
                  {(finalPassed || finalFailed) && (
                    <span className="text-[10px] font-black tracking-wide uppercase">
                      {finalPassed ? "Passed" : "Failed"}
                    </span>
                  )}
                </div>
              )}
              <div className="flex h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <Avatar className="h-full w-full rounded-[1.15rem]">
                  <AvatarImage
                    src={mentor?.avatarUrl ?? undefined}
                    alt={mentor?.name ?? "Mentor"}
                    className="h-full w-full object-cover"
                  />
                  <AvatarFallback className="rounded-[1.15rem] bg-indigo-500/10 text-lg font-bold text-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300">
                    {(mentor?.name ?? "M")
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase dark:text-slate-400">
                  <span>Thông tin phiên</span>
                  <span className="h-1 w-1 rounded-full bg-slate-400/70" />
                  <span>Đã hoàn tất</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="truncate text-2xl font-semibold text-slate-950 dark:text-white">
                    {mentor?.name ?? (session.mentorId ? `#${session.mentorId}` : "-")}
                  </h3>
                  <p className="inline-flex max-w-full items-center gap-1.5 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Building2 className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-300" />
                    <span className="truncate">{mentor?.currentCompany ?? "Mentor"}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-900/60 dark:bg-amber-950/30">
                    <Star className="h-4 w-4 fill-current text-amber-500" />
                    <span className="text-sm font-bold text-amber-700 tabular-nums dark:text-amber-300">
                      {mentorAverageRating ? `${mentorAverageRating.toFixed(1)}/5` : "—"}
                    </span>
                    <span className="text-xs font-semibold text-amber-700/70 dark:text-amber-300/70">
                      Mentor ratio
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 dark:border-indigo-900/50 dark:bg-indigo-950/25">
                    <Award className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
                    <span className="text-sm font-bold text-indigo-700 tabular-nums dark:text-indigo-200">
                      {mentorExperienceLabel}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600/70 dark:text-indigo-300/70">
                      kinh nghiệm
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-2">
              <InfoTile
                icon={<CalendarCheck className="h-4 w-4" />}
                label={t("userApplicationhistory.mentorSessionFieldTime")}
                value={session.joinTime ? formatDateTime(session.joinTime) : "-"}
              />
              <InfoTile
                icon={<Clock className="h-4 w-4" />}
                label={t("userApplicationhistory.mentorSessionFieldDuration")}
                value={`${session.duration ?? 0} phút`}
              />
              <InfoTile
                icon={<PlayCircle className="h-4 w-4" />}
                label={t("userApplicationhistory.mentorSessionFieldParticipation")}
                value={
                  candidateStart && candidateEnd
                    ? `${formatTimeOnly(candidateStart)} - ${formatTimeOnly(candidateEnd)}`
                    : "-"
                }
              />
              <InfoTile
                icon={<Users className="h-4 w-4" />}
                label="Phiên mentor"
                value={`${mentorSessionCount} phiên`}
              />
            </div>
          </Card>

          {review && (
            <CandidateMentorFeedbackBlock
              session={session}
              feedback={feedback}
              readOnly={readOnly}
              onChange={onChange}
            />
          )}

          {session.recordUrl && (
            <Card className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                  <Video className="h-4 w-4" />
                  <span>{t("userApplicationhistory.mentorSessionRecordingTitle")}</span>
                </div>
                <a
                  href={session.recordUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("userApplicationhistory.mentorSessionWatchRecording")}
                </a>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {review ? (
            <Card className="rounded-2xl border border-slate-200 bg-white p-4 pt-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mb-2 flex flex-col items-center gap-2 text-center">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  {t("userApplicationhistory.mentorSessionReviewTitle")}
                </h3>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5 transition-all",
                        i < Math.round(review.rating ?? 0)
                          ? "fill-amber-400 text-amber-500 drop-shadow-sm"
                          : "text-slate-300 dark:text-slate-700"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  {review.strength && (
                    <ReviewInsight
                      title={t("userApplicationhistory.mentorSessionReviewStrength")}
                      content={review.strength}
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      tone="emerald"
                    />
                  )}
                  {review.weakness && (
                    <ReviewInsight
                      title={t("userApplicationhistory.mentorSessionReviewWeakness")}
                      content={review.weakness}
                      icon={<AlertTriangle className="h-4 w-4" />}
                      tone="rose"
                    />
                  )}
                  {review.improve && (
                    <ReviewInsight
                      title={t("userApplicationhistory.mentorSessionReviewImprove")}
                      content={review.improve}
                      icon={<Sparkles className="h-4 w-4" />}
                      tone="sky"
                    />
                  )}
                </div>

                {(review.situationNote ||
                  review.taskNote ||
                  review.actionNote ||
                  review.resultNote) && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-500/10 text-indigo-500 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                          {t("userApplicationhistory.mentorSessionReviewStar")}
                        </h4>
                      </div>
                    </div>

                    <div className="mt-4 grid aspect-square grid-cols-2 gap-3">
                      {review.situationNote && (
                        <StarNoteBlock
                          tone="indigo"
                          label="Situation"
                          title="Bối cảnh"
                          icon={<CalendarCheck className="h-4 w-4" />}
                          content={review.situationNote}
                        />
                      )}
                      {review.taskNote && (
                        <StarNoteBlock
                          tone="sky"
                          label="Task"
                          title="Mục tiêu"
                          icon={<Target className="h-4 w-4" />}
                          content={review.taskNote}
                        />
                      )}
                      {review.actionNote && (
                        <StarNoteBlock
                          tone="emerald"
                          label="Action"
                          title="Cách xử lý"
                          icon={<Sparkles className="h-4 w-4" />}
                          content={review.actionNote}
                        />
                      )}
                      {review.resultNote && (
                        <StarNoteBlock
                          tone="amber"
                          label="Result"
                          title="Kết quả"
                          icon={<BadgeCheck className="h-4 w-4" />}
                          content={review.resultNote}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Hourglass className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">
                {t("userApplicationhistory.mentorSessionAwaitingReview")}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("userApplicationhistory.mentorSessionAwaitingReviewDesc")}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidateMentorFeedbackBlock({
  session,
  feedback,
  readOnly = false,
  onChange,
}: {
  session: Session;
  feedback: Session["mentorFeedback"];
  readOnly?: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation();
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
  const submitDisabled = readOnly || isSubmitting || trimmedLen < MIN_COMMENT_LENGTH || rating < 1;

  const validate = () => {
    const next: typeof errors = {};
    if (!rating || rating < 1 || rating > 5) {
      next.rating = "Vui lòng chọn điểm đánh giá (1–5)";
    }
    if (comment.trim().length < MIN_COMMENT_LENGTH) {
      next.comment = t("userApplicationhistory.mentorSessionCommentMinError", {
        min: MIN_COMMENT_LENGTH,
      });
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly) return;
    if (!userId) {
      setErrors({ rating: t("userApplicationhistory.mentorSessionErrNotLoggedIn") });
      return;
    }
    if (!session.id) {
      setErrors({ rating: t("userApplicationhistory.mentorSessionErrMissingSessionId") });
      return;
    }
    if (!session.mentorId) {
      setErrors({ rating: t("userApplicationhistory.mentorSessionErrMissingMentor") });
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
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/20">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Send className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">
              Phản hồi của bạn cho mentor
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Chấm sao và ghi nhận trải nghiệm sau buổi phỏng vấn.
            </p>
          </div>
        </div>

        {hasFeedback && !editing && (
          <span className="inline-flex h-7 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            Đã gửi
          </span>
        )}
      </div>

      {!editing && hasFeedback ? (
        <div className="p-5">
          <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-[12rem_1fr] dark:border-slate-800">
            <div>
              <div className="text-sm font-bold text-slate-950 dark:text-white">
                Điểm bạn đã gửi
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Điểm này phản ánh trải nghiệm thực tế của bạn với mentor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-700 tabular-nums dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {feedback?.rating ?? 0}/5
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-7 w-7 transition-all duration-300",
                      i < Math.round(feedback?.rating ?? 0)
                        ? "fill-amber-400 text-amber-500 drop-shadow-sm"
                        : "text-slate-300 dark:text-slate-700"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 py-5 md:grid-cols-[12rem_1fr] dark:border-slate-800">
            <div>
              <div className="text-sm font-bold text-slate-950 dark:text-white">
                Nhận xét của bạn
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Nội dung này giúp hệ thống cải thiện chất lượng mentor.
              </p>
            </div>
            {feedback?.comment ? (
              <p className="text-sm leading-relaxed text-slate-700 italic dark:text-slate-200">
                “{feedback.comment}”
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Chưa có nhận xét chi tiết.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={readOnly}
              onClick={() => setEditing(true)}
              className="h-9 gap-1.5 px-4 text-xs font-semibold">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("userApplicationhistory.mentorSessionEditFeedback")}
            </Button>
            <p className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              Bước cuối của vòng Mentor Interview
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5" noValidate>
          <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-[12rem_1fr] dark:border-slate-800">
            <div>
              <Label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("userApplicationhistory.mentorSessionRatingLabel")}{" "}
                <span className="text-rose-500">*</span>
              </Label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Chọn mức sao phản ánh cách mentor đặt câu hỏi, hướng dẫn và hỗ trợ bạn.
              </p>
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Mức bạn chọn
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 tabular-nums dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                  {rating || 0}/5
                </span>
              </div>
              <RatingScale5 value={rating} onChange={setRating} disabled={readOnly} />
              {errors.rating && (
                <p className="mt-3 text-xs font-semibold text-rose-600" role="alert">
                  {errors.rating}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 py-5 md:grid-cols-[12rem_1fr] dark:border-slate-800">
            <div>
              <Label
                htmlFor="candidate-mentor-comment"
                className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("userApplicationhistory.mentorSessionCommentLabel")}{" "}
                <span className="text-rose-500">*</span>
              </Label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Viết ngắn gọn điều mentor làm tốt hoặc cần cải thiện.
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-end">
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
                disabled={readOnly}
                rows={5}
                maxLength={MAX_COMMENT_LENGTH}
                placeholder={t("userApplicationhistory.mentorSessionCommentPlaceholder")}
                aria-invalid={!!errors.comment}
                className="resize-y rounded-xl border-slate-200 bg-slate-50/70 shadow-none dark:border-slate-800 dark:bg-slate-950/40"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-xs font-medium",
                    trimmedLen < MIN_COMMENT_LENGTH
                      ? "text-slate-500"
                      : "text-emerald-600 dark:text-emerald-400"
                  )}>
                  {trimmedLen < MIN_COMMENT_LENGTH
                    ? t("userApplicationhistory.mentorSessionMinChars", {
                        min: MIN_COMMENT_LENGTH,
                        left: MIN_COMMENT_LENGTH - trimmedLen,
                      })
                    : t("userApplicationhistory.mentorSessionMinCharsMet")}
                </span>
                {errors.comment && (
                  <span className="text-xs font-semibold text-rose-600" role="alert">
                    {errors.comment}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-4">
            <Button
              type="submit"
              disabled={submitDisabled}
              className="h-10 gap-2 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? (
                <>
                  <Spinner size="sm" tone="white" />
                  {t("userApplicationhistory.mentorSessionSubmitting")}
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  {hasFeedback
                    ? t("userApplicationhistory.mentorSessionUpdateFeedback")
                    : t("userApplicationhistory.mentorSessionSubmitFeedback")}
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
                className="h-10 px-4 text-xs font-semibold">
                Hủy
              </Button>
            )}
            <p className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              Hoàn tất để đóng vòng Mentor Interview
            </p>
          </div>
        </form>
      )}
    </Card>
  );
}

function RatingScale5({
  value,
  disabled = false,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const active = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            aria-label={`Chọn ${starValue} sao`}
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(starValue);
            }}
            className={cn(
              "group inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-all",
              active
                ? "border-amber-300 bg-amber-50 text-amber-400 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30"
                : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-600",
              disabled &&
                "cursor-not-allowed opacity-70 hover:border-slate-200 hover:text-slate-300"
            )}>
            <Star
              className={cn(
                "h-6 w-6 transition-transform duration-150",
                active ? "scale-105 fill-current" : "group-hover:scale-105"
              )}
            />
          </button>
        );
      })}
    </div>
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
  icon,
  tone,
}: {
  title: string;
  content: string;
  icon: React.ReactNode;
  tone: "emerald" | "rose" | "sky";
}) {
  const toneClass = {
    emerald:
      "border-emerald-300 bg-emerald-500/10 text-emerald-200 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    rose: "border-rose-300 bg-rose-500/10 text-rose-200 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200",
    sky: "border-sky-300 bg-sky-500/10 text-sky-200 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200",
  }[tone];

  return (
    <div className="flex h-full flex-row items-start gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4 shadow-sm ring-1 ring-white/5">
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          toneClass
        )}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
              toneClass
            )}>
            {title}
          </span>
        </div>
        <p className="text-[15px] leading-7 text-slate-100">{content}</p>
      </div>
    </div>
  );
}

function StarNoteBlock({
  tone,
  label,
  title,
  icon,
  content,
}: {
  tone: "indigo" | "sky" | "emerald" | "amber";
  label: string;
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  const toneClass = {
    indigo:
      "border-indigo-300 bg-indigo-500/15 text-indigo-100 dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-100",
    sky: "border-sky-300 bg-sky-500/15 text-sky-100 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-100",
    emerald:
      "border-emerald-300 bg-emerald-500/15 text-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-100",
    amber:
      "border-amber-300 bg-amber-500/15 text-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-950/60 p-4 shadow-sm ring-1 ring-white/5">
      <div className="flex items-center gap-2">
        <span
          className={cn("flex h-8 w-8 items-center justify-center rounded-xl border", toneClass)}>
          {icon}
        </span>
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm",
            toneClass
          )}>
          {label}
        </span>
        <span className="text-xs font-semibold tracking-[0.12em] text-slate-200/80 uppercase">
          {title}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-slate-100">{content}</p>
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
