import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Lock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { components } from "../../../../../schema-from-be";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

export interface JdRound {
  id?: number;
  name?: string;
  roundOrder?: number;
  roundType?: string;
  passThreshold?: number;
  configData?: {
    instruction?: string;
    timeLimitMinutes?: number;
    submissionFormat?: string;
    evaluationCriteria?: string;
    maxScore?: number;
  };
  /** Embedded round config from reviewer API response (source of truth for staff grading) */
  roundConfig?: Record<string, unknown>;
}

interface StaffHorizontalPipelineProps {
  rounds: JdRound[];
  details: ApplicationDetail[];
  currentRoundOrder: number;
  overallStatus?: string;
  onSelectRound?: (roundOrder: number) => void;
  selectedRoundOrder?: number;
}

export function StaffHorizontalPipeline({
  rounds,
  details,
  currentRoundOrder,
  overallStatus,
  onSelectRound,
  selectedRoundOrder,
}: StaffHorizontalPipelineProps) {
  const { t } = useTranslation();
  const sortedRounds = [...rounds].sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));

  return (
    <div className="scrollbar-none w-full overflow-x-auto px-1 py-1">
      <div className="flex min-w-max items-center justify-start gap-2.5 sm:gap-3.5">
        {sortedRounds.map((round, idx) => {
          const roundOrder = round.roundOrder ?? idx + 1;
          const detail = details.find((d) => d.roundId === round.id);

          const isCompleted =
            overallStatus === "PASSED" ||
            overallStatus === "FAILED" ||
            (detail?.status as string) === "COMPLETED" ||
            (detail?.status as string) === "AI_EVALUATED" ||
            (detail?.status as string) === "STAFF_GRADED" ||
            (detail?.status as string) === "HR_GRADED" ||
            roundOrder < currentRoundOrder;

          const isCurrent = !isCompleted && roundOrder === currentRoundOrder;
          const isLocked = !isCompleted && roundOrder > currentRoundOrder;
          const isSelected = selectedRoundOrder === roundOrder;

          const isFailedNeedsImprove =
            overallStatus === "SOFT_FAILED" && detail?.finalResult === "FAILED";

          const roundTypeNormalized = round.roundType?.replace("MENTROR", "MENTOR") ?? "";
          const roundName = roundTypeNormalized
            ? t(
                `common.roundType.${roundTypeNormalized}`,
                round.name || `${t("userApplicationhistory.round", "Vòng")} ${roundOrder}`
              )
            : round.name || `${t("userApplicationhistory.round", "Vòng")} ${roundOrder}`;

          // Staff-specific: prioritize hrScore (staff grading), then aiScore, then finalScore
          const staffScore = detail?.hrScore ?? detail?.aiScore ?? detail?.finalScore;
          const hasStaffGraded = detail?.hrScore !== undefined && detail?.hrScore !== null;
          const hasAIScored = detail?.aiScore !== undefined && detail?.aiScore !== null;

          return (
            <div key={round.id ?? idx} className="flex items-center gap-2.5 sm:gap-3.5">
              {/* Connector line between stage pills */}
              {idx > 0 && (
                <div
                  className={cn(
                    "h-[2px] w-6 shrink-0 rounded-full transition-all duration-300 sm:w-10",
                    isCompleted
                      ? "bg-gradient-to-r from-emerald-500 to-indigo-500 shadow-xs shadow-indigo-500/20"
                      : isCurrent
                        ? "bg-gradient-to-r from-indigo-500 to-slate-300 dark:to-slate-800"
                        : "bg-slate-200 dark:bg-slate-800/80"
                  )}
                />
              )}

              {/* Stage Pill Node Button */}
              <button
                type="button"
                onClick={() => onSelectRound?.(roundOrder)}
                disabled={isLocked}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 focus:outline-hidden",
                  isFailedNeedsImprove &&
                    "border-amber-300 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:shadow-amber-950/40 dark:hover:bg-amber-500/20",
                  !isFailedNeedsImprove &&
                    isCompleted &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/20",
                  isCurrent &&
                    "border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 shadow-indigo-500/20 ring-indigo-500/60 dark:bg-gradient-to-r dark:from-indigo-950/90 dark:to-slate-900/90 dark:ring-indigo-500/80",
                  isLocked &&
                    "cursor-not-allowed border-slate-200 bg-slate-100/70 text-slate-400 opacity-70 dark:border-slate-800/60 dark:bg-slate-950/50 dark:text-slate-500",
                  isSelected &&
                    !isCurrent &&
                    "ring-2 ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
                )}>
                {/* Stage Order Badge Icon */}
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-black transition-all",
                    isFailedNeedsImprove && "bg-amber-500 text-white shadow-xs dark:text-slate-950",
                    !isFailedNeedsImprove &&
                      isCompleted &&
                      "bg-emerald-500 text-white shadow-xs shadow-emerald-500/30 dark:text-slate-950",
                    isCurrent && "bg-indigo-500 text-white shadow-xs shadow-indigo-500/40",
                    isLocked && "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  )}>
                  {isFailedNeedsImprove ? (
                    <AlertTriangle className="h-3.5 w-3.5 stroke-[3]" />
                  ) : isCompleted ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <span>{roundOrder}</span>
                  )}
                </div>

                {/* Round Information Text */}
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-tight whitespace-nowrap">{roundName}</span>
                    {isCurrent && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] font-medium whitespace-nowrap opacity-80">
                    {isFailedNeedsImprove
                      ? t("userApplicationhistory.needsImprove", "Cần cải thiện")
                      : isCompleted
                        ? hasStaffGraded
                          ? // Staff has graded - show HR score
                            t("staffGrading.yourScore", {
                              score: staffScore,
                              defaultValue: `Bạn chấm: ${staffScore}/100`,
                            })
                          : hasAIScored
                            ? // Only AI scored - show AI score
                              t("staffGrading.aiScore", {
                                score: detail?.aiScore ?? 0,
                                defaultValue: `AI: ${detail?.aiScore ?? 0}/100`,
                              })
                            : // No score yet
                              t("staffGrading.completedNoScore", "Đã hoàn thành")
                        : isCurrent
                          ? t("staffGrading.pendingGrading", "Chờ bạn chấm")
                          : t("userApplicationhistory.roundUnopened", "Chưa mở")}
                  </span>
                </div>

                {/* Staff Graded Badge */}
                {isCompleted && hasStaffGraded && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-white text-white" />
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
