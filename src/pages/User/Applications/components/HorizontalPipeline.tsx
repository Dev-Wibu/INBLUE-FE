import { cn } from "@/lib/utils";
import { Check, Lock } from "lucide-react";
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

          const isAppCompleted =
            overallStatus === "PASSED" ||
            overallStatus === "FAILED" ||
            overallStatus === "SOFT_FAILED";

          const isCompleted =
            isAppCompleted ||
            (detail?.status as string) === "COMPLETED" ||
            roundOrder < currentRoundOrder;

          const isCurrent = !isCompleted && roundOrder === currentRoundOrder;
          const isLocked = !isCompleted && roundOrder > currentRoundOrder;
          const isSelected = selectedRoundOrder === roundOrder;

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
                  "group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all duration-200 focus:outline-hidden",
                  isCompleted &&
                    "border-emerald-200 bg-emerald-50/70 text-emerald-900 shadow-2xs hover:bg-emerald-100/80 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
                  isCurrent &&
                    "border-[#0047AB] bg-blue-50/90 text-[#0047AB] shadow-sm ring-2 ring-[#0047AB]/20 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300",
                  isLocked &&
                    "cursor-not-allowed border-slate-200/80 bg-slate-50 text-slate-400 dark:border-slate-800/60 dark:bg-slate-900/50 dark:text-slate-600",
                  isSelected && "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950"
                )}>
                {/* Node Status Icon */}
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-colors",
                    isCompleted && "bg-emerald-600 text-white dark:bg-emerald-500",
                    isCurrent && "animate-pulse bg-[#0047AB] text-white",
                    isLocked && "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
                  )}>
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    roundOrder
                  )}
                </div>

                {/* Round Info Label */}
                <div className="flex flex-col text-left">
                  <span className="font-semibold whitespace-nowrap">{roundName}</span>
                  <span className="text-[10px] whitespace-nowrap opacity-80">
                    {isCompleted
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
