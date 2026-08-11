import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, Award, Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { components } from "../../../../../schema-from-be";
import { areAllRoundsCompleted } from "./applicationProgress";

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
  onSelectRound?: (_roundOrder: number) => void;
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
  const isReportSelected = selectedRoundOrder === 99;
  const isAllCompleted = areAllRoundsCompleted(sortedRounds, details, currentRoundOrder);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, rounds]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const selectedEl = el.querySelector("[data-selected='true']");
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedRoundOrder]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === "left" ? -280 : 280;
    el.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  return (
    <div className="flex w-full items-center gap-2">
      <style>{`
        .pipeline-no-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .pipeline-no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      {/* Left Scroll Button - Always visible, side-by-side */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => handleScroll("left")}
        disabled={!canScrollLeft}
        className="h-8 w-8 shrink-0 rounded-full border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        title={t("common.previous", "Trước")}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Hidden Scrollbar Container - Flex 1 */}
      <div
        ref={scrollContainerRef}
        className="pipeline-no-scrollbar flex flex-1 items-center justify-start gap-2.5 overflow-x-auto py-1 sm:gap-3.5">
        {sortedRounds.map((round, idx) => {
          const roundOrder = round.roundOrder ?? idx + 1;
          const detail = details.find((d) => d.roundId === round.id);

          const isCompleted =
            overallStatus === "PASSED" ||
            overallStatus === "FAILED" ||
            (detail?.status as string) === "COMPLETED" ||
            (detail?.status as string) === "AI_EVALUATED" ||
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

          const score = detail?.finalScore ?? detail?.aiScore ?? detail?.hrScore;

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
                data-selected={isSelected ? "true" : "false"}
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
                        ? score !== undefined && score !== null
                          ? t("userApplicationhistory.scoreShort", {
                              score,
                              defaultValue: `Điểm: ${score}/100`,
                            })
                          : t("userApplicationhistory.completedBadge", "Đã đạt")
                        : isCurrent
                          ? t("userApplicationhistory.roundOpened", "Đang mở")
                          : t("userApplicationhistory.roundUnopened", "Chưa mở")}
                  </span>
                </div>
              </button>
            </div>
          );
        })}

        {/* Final Milestone Destination Node: Executive Competency Report (Node 99) */}
        {sortedRounds.length > 0 && (
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Connector line leading to Final Node */}
            <div
              className={cn(
                "h-[2px] w-6 shrink-0 rounded-full transition-all duration-300 sm:w-10",
                isAllCompleted
                  ? "bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-600 shadow-xs shadow-purple-500/20"
                  : "bg-slate-200 dark:bg-slate-800/80"
              )}
            />

            {/* Final Node Button */}
            <button
              type="button"
              data-selected={isReportSelected ? "true" : "false"}
              onClick={() => {
                if (isAllCompleted) onSelectRound?.(99);
              }}
              disabled={!isAllCompleted}
              aria-label={
                isAllCompleted
                  ? "Mở báo cáo năng lực"
                  : "Hoàn tất tất cả vòng để mở báo cáo năng lực"
              }
              title={isAllCompleted ? undefined : "Hoàn tất tất cả vòng để mở báo cáo năng lực"}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 focus:outline-hidden",
                isAllCompleted
                  ? "border-purple-200 bg-purple-50/80 text-purple-900 shadow-xs hover:border-purple-300 hover:bg-purple-100 dark:border-purple-500/40 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-950/70"
                  : "cursor-not-allowed border-slate-200 bg-slate-100/60 text-slate-400 opacity-70 dark:border-slate-800/70 dark:bg-slate-950/60 dark:text-slate-500",
                isReportSelected &&
                  "border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 shadow-indigo-500/20 ring-indigo-500/60 dark:bg-gradient-to-r dark:from-indigo-950/90 dark:to-purple-950/90 dark:ring-indigo-500/80"
              )}>
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white shadow-xs transition-all",
                  isAllCompleted
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-purple-500/30"
                    : "bg-slate-300 dark:bg-slate-800",
                  isReportSelected && "bg-indigo-500 text-white"
                )}>
                {isAllCompleted ? (
                  <Award className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold tracking-tight whitespace-nowrap">
                  {t("userApplicationhistory.competencyReportNode", {
                    defaultValue: "Báo cáo năng lực",
                  })}
                </span>
                <span className="font-mono text-[10px] font-medium whitespace-nowrap opacity-80">
                  {isAllCompleted
                    ? t("userApplicationhistory.finalSummary", { defaultValue: "Tổng kết AI" })
                    : "Hoàn tất tất cả vòng để mở"}
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right Scroll Button - Always visible, side-by-side */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => handleScroll("right")}
        disabled={!canScrollRight}
        className="h-8 w-8 shrink-0 rounded-full border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        title={t("common.next", "Tiếp")}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
