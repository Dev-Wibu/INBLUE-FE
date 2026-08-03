import { RatingScale10 } from "@/components/feedback/RatingScale10";
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
  ArrowRight,
  BadgeCheck,
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
  // business flow â€” see backend: totalPrice=0 is valid).
  const createSessionMutation = useCreateRoundSession({
    onSuccess: () => {
      void refetchDetail();
      onSuccess?.();
    },
  });

  // Active step derived from BOTH `detail.status` (mentor-assignment side)
  // AND `sessionStatus` (Daily.co side via webhook). The two lifecycles are
  // independent and can drift â€” see issue: candidate joined the room, both
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
    // "PENDING" once the candidate confirms their pick â€” at that point
    // the session doesn't exist yet and the candidate still needs to
    // schedule an interview slot. Treat PENDING the same as SLOT_PICKED
    // so the ScheduleStep renders instead of falling through to the
    // AWAITING_MENTOR default (which previously trapped candidates in
    // "Äang chá» Admin gÃ¡n mentor" forever after they'd already picked).
    if (status === "AWAITING_MENTOR") return "AWAITING_MENTOR";
    if (status === "AWAITING_CANDIDATE_SELECT_MENTOR") return "SELECT_MENTOR";
    if (status === "PENDING" || status === "SLOT_PICKED" || status === "SUBMITTED") {
      return "SCHEDULE";
    }
    return "AWAITING_MENTOR";
  }, [status, sessionId, sessionStatus]);

  // Polling â€” refresh detail (for status flips) AND session (for COMPLETED
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
        roundLabel={round.name || t("userApplicationhistory.mentorRoundTitle", "ÄÃ¡nh giÃ¡ Mentor")}
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
                  Äiá»ƒm sá»‘ Ä‘Ã¡nh giÃ¡ phá»ng váº¥n Mentor
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-white tabular-nums">
                    {finalScore}
                  </span>
                  <span className="text-base font-bold text-slate-400">/100</span>
                  {passed && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-emerald-300 uppercase shadow-xs">
                      âœ“ PASSED
                    </span>
                  )}
                  {failed && (
                    <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-rose-300 uppercase shadow-xs">
                      âœ— FAILED
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
// SUB-COMPONENT: ProgressHub â€” wizard steps indicator
// ============================================================================

function ProgressHub({ activeIndex }: { activeIndex: number }) {
  return (
    <Card className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-md">
      <div className="flex w-full items-start justify-between">
        {STEP_DEFS.map((step, i) => {
          const isActive = i === activeIndex;
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
              <div
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isActive
                    ? "border-indigo-500 bg-indigo-950/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    : isDone
                      ? "border-emerald-500 bg-emerald-950/20 text-emerald-400"
                      : "border-slate-700 bg-slate-800/50 text-slate-500"
                )}>
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}

                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] ring-2 ring-slate-900" />
                )}
              </div>

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

function AwaitingMentorStep({
  detailId: _detailId,
  onRefresh: _onRefresh,
}: {
  detailId: number;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();

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
                "Tráº¡ng thÃ¡i: Äang phÃ¢n cÃ´ng Mentor"
              )}
            </span>
          </div>

          {/* Heading & Description */}
          <h3 className="mt-3 text-lg font-extrabold tracking-tight text-white sm:text-xl">
            {t(
              "userApplicationhistory.mentorAwaitingTitle",
              "Chá» Admin phÃ¢n bá»• mentor phÃ¹ há»£p"
            )}
          </h3>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            {t(
              "userApplicationhistory.mentorAwaitingDesc",
              "Há»‡ thá»‘ng Ä‘ang tiáº¿n hÃ nh rÃ  soÃ¡t chuyÃªn mÃ´n vÃ  káº¿t ná»‘i mentor thÃ­ch há»£p nháº¥t theo yÃªu cáº§u cá»§a JD. Khi mentor Ä‘Æ°á»£c gÃ¡n, danh sÃ¡ch Ä‘á» xuáº¥t sáº½ xuáº¥t hiá»‡n ngay á»Ÿ bÆ°á»›c tiáº¿p theo Ä‘á»ƒ báº¡n chá»n ngÆ°á»i phá»ng váº¥n."
            )}
          </p>
        </div>
      </div>

      {/* Next Steps Roadmap */}
      <div className="bg-slate-950/40 p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
            Quy trÃ¬nh cÃ¡c bÆ°á»›c tiáº¿p theo
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
                  Äang xá»­ lÃ½
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-white">1. Admin Ä‘á» xuáº¥t Mentor</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                Admin xem xÃ©t há»“ sÆ¡ vÃ  chá»‰ Ä‘á»‹nh cÃ¡c mentor cÃ³ ká»¹ nÄƒng phÃ¹ há»£p
                nháº¥t vá»›i vá»‹ trÃ­.
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
                  BÆ°á»›c tiáº¿p theo
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-slate-200">2. Báº¡n chá»n Mentor</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Xem há»“ sÆ¡ nÄƒng lá»±c, Ä‘Ã¡nh giÃ¡ vÃ  chá»n mentor báº¡n mong muá»‘n phá»ng
                váº¥n.
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
                  BÆ°á»›c 3
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-slate-200">
                3. Äáº·t lá»‹ch & Phá»ng váº¥n
              </h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Chá»n thá»i gian ráº£nh thuáº­n tiá»‡n vÃ  vÃ o phÃ²ng há»p video 1-1 trá»±c
                tuyáº¿n.
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
  onAfterSelect,
}: {
  detailId: number;
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
        <p className="mt-4 text-sm font-semibold text-slate-500">Äang táº£i danh sÃ¡ch mentor...</p>
      </Card>
    );
  }

  if (error || !mentors || mentors.length === 0) {
    return (
      <Card className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <h3 className="mt-4 text-lg font-black text-rose-900 dark:text-rose-100">
          ChÆ°a cÃ³ mentor nÃ o Ä‘Æ°á»£c chá»‰ Ä‘á»‹nh
        </h3>
        <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          Vui lÃ²ng chá» Admin phÃ¢n bá»• chuyÃªn gia phÃ¹ há»£p.
        </p>
        <Button variant="outline" onClick={() => void refetch()} className="mt-6 rounded-xl">
          Táº£i láº¡i
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
                    {t("userApplicationhistory.mentorSelectTitle", "Chá»n mentor phÃ¹ há»£p")}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
                    {t(
                      "userApplicationhistory.mentorSelectCount",
                      "{{count}} mentor Ä‘Æ°á»£c Ä‘á» xuáº¥t",
                      {
                        count: mentors.length,
                      }
                    )}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {t(
                    "userApplicationhistory.mentorSelectDescription",
                    "Chá»n 1 mentor tá»« danh sÃ¡ch Ä‘Æ°á»£c Ä‘á» xuáº¥t cho vá»‹ trÃ­ á»©ng tuyá»ƒn nÃ y."
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
              disabled={selectMutation.isPending}
              onOpenDetails={() => setFeedbackMentor(mentor)}
              onRequestConfirm={() => setMentorToConfirm(mentor)}
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
                      name: mentorToConfirm.name ?? "â€”",
                    }
                  )
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Há»§y")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!mentorToConfirm?.id) return;
                selectMutation.mutate({
                  applicationDetailId: detailId,
                  mentorId: mentorToConfirm.id,
                });
                setMentorToConfirm(null);
              }}>
              {t("common.confirm", "XÃ¡c nháº­n")}
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

// ============================================================================'
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
      toast.error("Vui lÃ²ng chá»n ngÃ y giá»");
      return;
    }
    // Build joinTime with an explicit timezone offset so the BE knows the
    // candidate's intended wall-clock time. Without the offset, the BE
    // (Spring Boot/Jackson default) treats the naive string as UTC, which
    // shifts the stored time by 7h for users in Vietnam (UTC+7) â€” e.g.
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
          Äáº·t lá»‹ch phá»ng váº¥n
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Chá»n ngÃ y giá» vÃ  thá»i lÆ°á»£ng phÃ¹ há»£p. Báº¡n cÃ³ thá»ƒ Ä‘á»•i trÆ°á»›c khi thanh
          toÃ¡n.
        </p>
      </div>

      <div className="space-y-5 p-6">
        {/* Date + time */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              NgÃ y phá»ng váº¥n
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
              Giá» báº¯t Ä‘áº§u
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
            Thá»i lÆ°á»£ng
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
                  {d} phÃºt
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            HÃ¬nh thá»©c phá»ng váº¥n
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
                  Phá»ng váº¥n qua Video Call trÃªn trÃ¬nh duyá»‡t
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
                  Gáº·p trá»±c tiáº¿p táº¡i Ä‘á»‹a Ä‘iá»ƒm do mentor sáº¯p xáº¿p
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
              Äang táº¡o phiÃªn...
            </>
          ) : (
            <>
              <CalendarCheck className="h-4 w-4" />
              Táº¡o phiÃªn phá»ng váº¥n
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
      label: "NhÃ¡p",
    },
    SCHEDULED: {
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
      label: "Chá» thanh toÃ¡n",
    },
    PAID: {
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
      label: "ÄÃ£ thanh toÃ¡n",
    },
    ONGOING: {
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      label: "Äang diá»…n ra",
    },
    COMPLETED: {
      tone: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      label: "ÄÃ£ hoÃ n táº¥t",
    },
    REJECTED: {
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      label: "Bá»‹ tá»« chá»‘i",
    },
    CANCELED: {
      tone: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
      label: "ÄÃ£ há»§y",
    },
  };
  const cfg = map[status] ?? map.DRAFT;
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        Tráº¡ng thÃ¡i phiÃªn
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
// SUB-COMPONENT: SessionRoomStep â€” covers WAITING / IN_CALL / RESULT
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
          Äang táº£i phiÃªn phá»ng váº¥n...
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
          PhiÃªn phá»ng váº¥n #{session.id}
        </h3>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          VÃ o phÃ²ng Video Call Ä‘Ãºng giá». PhÃ²ng sáº½ má»Ÿ trÆ°á»›c 15 phÃºt.
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900/40">
          <InfoRow
            icon={<CalendarCheck className="h-3.5 w-3.5" />}
            label="Thá»i gian"
            value={session.joinTime ? formatDateTime(session.joinTime) : "â€”"}
          />
          <InfoRow
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Thá»i lÆ°á»£ng"
            value={`${session.duration ?? 0} phÃºt`}
          />
          <InfoRow
            icon={<Video className="h-3.5 w-3.5" />}
            label="HÃ¬nh thá»©c"
            value={session.roomUrl ? "Online (Daily.co)" : "Offline"}
          />
          <InfoRow
            icon={<UserCheck className="h-3.5 w-3.5" />}
            label="Mentor"
            value={`#${session.mentorId ?? "â€”"}`}
          />
        </div>

        <SessionStatusBadge status={session.status ?? "SCHEDULED"} />

        {/* Countdown */}
        {session.status === "PAID" && joinAt > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
            <div className="text-[10px] font-bold tracking-widest text-sky-600 uppercase dark:text-sky-400">
              {canEnter ? "PhÃ²ng Ä‘Ã£ má»Ÿ" : "CÃ²n"}
            </div>
            <div className="text-3xl font-black text-sky-700 tabular-nums dark:text-sky-200">
              {canEnter ? "Sáºµn sÃ ng vÃ o" : formatCountdown(Math.max(0, joinAt - now))}
            </div>
            <div className="text-xs text-sky-700/80 dark:text-sky-300/80">
              {canEnter
                ? "Báº¡n cÃ³ thá»ƒ vÃ o phÃ²ng ngay bÃ¢y giá»"
                : `PhÃ²ng má»Ÿ 15 phÃºt trÆ°á»›c ${session.joinTime ? formatTimeOnly(session.joinTime) : ""}`}
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
                toast.info(
                  "ÄÃ¢y lÃ  phiÃªn Offline. HÃ£y liÃªn há»‡ mentor qua thÃ´ng tin bÃªn dÆ°á»›i."
                );
              }
            }}
            disabled={!canEnter && session.status === "PAID"}
            className="h-11 flex-1 gap-2 bg-gradient-to-r from-emerald-500 to-sky-600 text-xs font-bold text-white shadow-sm hover:from-emerald-600 hover:to-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
            <LogIn className="h-4 w-4" />
            {session.status === "ONGOING" ? "Tiáº¿p tá»¥c vÃ o phÃ²ng" : "VÃ o phÃ²ng Video Call"}
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            className="h-11 gap-2 border-slate-300 px-4 text-xs font-bold dark:border-slate-700">
            <RefreshCw className="h-4 w-4" />
            LÃ m má»›i
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
  // POST) â€” POST will return 500 "different object with same identifier"
  // because Hibernate tries to attach a second entity with id=sessionId.
  // We use `session.id` as the PUT id (per docs/STUDENT_RATING_MENTOR_API.md Â§6).
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
      next.rating = "Vui lÃ²ng chá»n Ä‘iá»ƒm Ä‘Ã¡nh giÃ¡ (1â€“10)";
    }
    if (comment.trim().length < MIN_COMMENT_LENGTH) {
      next.comment = `Nháº­n xÃ©t tá»‘i thiá»ƒu ${MIN_COMMENT_LENGTH} kÃ½ tá»±`;
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setErrors({ rating: "Báº¡n chÆ°a Ä‘Äƒng nháº­p" });
      return;
    }
    if (!session.id) {
      setErrors({ rating: "KhÃ´ng tÃ¬m tháº¥y ID phiÃªn" });
      return;
    }
    if (!session.mentorId) {
      setErrors({ rating: "KhÃ´ng tÃ¬m tháº¥y mentor" });
      return;
    }
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      if (isUpdate) {
        // PUT /api/mentor-feedbacks â€” body { id: sessionId, rating, comment }
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
