import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Lock } from "lucide-react";
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
}

interface HorizontalPipelineProps {
  rounds: JdRound[];
  details: ApplicationDetail[];
  currentRoundOrder: number;
  overallStatus?: string;
  onSelectRound?: (roundOrder: number) => void;
  selectedRoundOrder?: number;
}

export function HorizontalPipeline({
  rounds,
  details,
  currentRoundOrder,
  overallStatus,
  onSelectRound,
  selectedRoundOrder,
}: HorizontalPipelineProps) {
  const { t } = useTranslation();
  const sortedRounds = [...rounds].sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));

  return (
    <div className="scrollbar-none w-full overflow-x-auto px-1 py-2">
      <div className="flex min-w-max items-center justify-start gap-3 sm:gap-4">
        {sortedRounds.map((round, idx) => {
          const roundOrder = round.roundOrder ?? idx + 1;
          const detail = details.find((d) => d.roundId === round.id);

          // For SOFT_FAILED the candidate is allowed to continue the next round
          // ("needs improvement" — re-do). So a round is only "completed" when:
          //   • App fully ended (PASSED or hard FAILED), OR
          //   • This round's detail is finalised (COMPLETED / AI_EVALUATED), OR
          //   • The round is strictly before the current round order.
          // SOFT_FAILED alone does NOT mark all rounds completed — otherwise
          // the candidate could not re-take the failed round.
          const isCompleted =
            overallStatus === "PASSED" ||
            overallStatus === "FAILED" ||
            (detail?.status as string) === "COMPLETED" ||
            (detail?.status as string) === "AI_EVALUATED" ||
            roundOrder < currentRoundOrder;

          const isCurrent = !isCompleted && roundOrder === currentRoundOrder;
          const isLocked = !isCompleted && roundOrder > currentRoundOrder;
          const isSelected = selectedRoundOrder === roundOrder;

          // Surface a per-round badge label. SOFT_FAILED turns the FAILED round
          // into a "Needs improvement" call-to-action instead of "Completed".
          const isFailedNeedsImprove =
            overallStatus === "SOFT_FAILED" && detail?.finalResult === "FAILED";

          const roundTypeNormalized = round.roundType?.replace("MENTROR", "MENTOR") ?? "";
          const roundName = roundTypeNormalized
            ? t(
                `common.roundType.${roundTypeNormalized}`,
                round.name || `${t("userApplicationhistory.round", "Vòng")} ${roundOrder}`
              )
            : round.name || `${t("userApplicationhistory.round", "Vòng")} ${roundOrder}`;

          const score = detail?.finalScore ?? detail?.aiScore ?? detail?.hrScore;

          return (
            <div key={round.id ?? idx} className="flex items-center gap-3 sm:gap-4">
              {/* Connector line before node */}
              {idx > 0 && (
                <div
                  className={cn(
                    "h-0.5 w-8 rounded-full transition-colors sm:w-12",
                    isCompleted || isCurrent
                      ? "bg-indigo-600 dark:bg-indigo-500"
                      : "bg-slate-200 dark:bg-slate-800"
                  )}
                />
              )}

              {/* Node Button */}
              <button
                type="button"
                onClick={() => onSelectRound?.(roundOrder)}
                disabled={isLocked}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-all duration-200 focus:outline-hidden",
                  isFailedNeedsImprove &&
                    "border-amber-300 bg-amber-50/70 text-amber-900 shadow-2xs hover:bg-amber-100/80 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
                  !isFailedNeedsImprove &&
                    isCompleted &&
                    "border-emerald-200 bg-emerald-50/70 text-emerald-900 shadow-2xs hover:bg-emerald-100/80 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
                  isCurrent &&
                    "border-indigo-500 bg-indigo-50/90 text-indigo-700 shadow-xs ring-2 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300",
                  isLocked &&
                    "cursor-not-allowed border-slate-200/80 bg-slate-50 text-slate-400 dark:border-slate-800/60 dark:bg-slate-900/50 dark:text-slate-600",
                  isSelected && "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950"
                )}>
                {/* Node Status Icon */}
                <div
                  className={cn(
                    "flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-extrabold transition-colors",
                    isFailedNeedsImprove && "bg-amber-500 text-white dark:bg-amber-500",
                    !isFailedNeedsImprove &&
                      isCompleted &&
                      "bg-emerald-600 text-white dark:bg-emerald-500",
                    isCurrent && "animate-pulse bg-indigo-600 text-white dark:bg-indigo-500",
                    isLocked && "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                  )}>
                  {isFailedNeedsImprove ? (
                    <AlertTriangle className="h-3.5 w-3.5 stroke-[3]" />
                  ) : isCompleted ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    roundOrder
                  )}
                </div>

                {/* Round Info Label */}
                <div className="flex flex-col text-left">
                  <span className="font-bold whitespace-nowrap">{roundName}</span>
                  <span className="text-[10px] whitespace-nowrap opacity-80">
                    {isFailedNeedsImprove
                      ? t("userApplicationhistory.needsImprove", "Cần cải thiện")
                      : isCompleted
                        ? score !== undefined && score !== null
                          ? t("userApplicationhistory.scoreShort", {
                              score,
                              defaultValue: `Điểm: ${score}/100`,
                            })
                          : t("userApplicationhistory.completedBadge", "Hoàn thành")
                        : isCurrent
                          ? t("userApplicationhistory.roundOpened", "Đang mở")
                          : t("userApplicationhistory.roundUnopened", "Chưa mở")}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
