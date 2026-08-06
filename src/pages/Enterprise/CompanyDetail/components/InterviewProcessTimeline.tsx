import { Badge } from "@/components/ui/badge";
import type { Round } from "@/services/company.manager";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InterviewProcessTimelineProps {
  rounds?: Round[];
}

export function InterviewProcessTimeline({ rounds = [] }: InterviewProcessTimelineProps) {
  const { t } = useTranslation();

  if (!rounds || rounds.length === 0) {
    return null;
  }

  const sortedRounds = [...rounds].sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>{t("enterpriseCompanydetail.interviewProcess", "Interview process")}</span>
        </div>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          {sortedRounds.length}
        </span>
      </div>

      <div className="relative mt-4 space-y-4 before:absolute before:top-3 before:left-3.5 before:h-[calc(100%-24px)] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {sortedRounds.map((round, idx) => {
          const roundNum = idx + 1;
          const timeLimit = round.configData?.timeLimitMinutes;
          const passScore = round.passThreshold ? `${round.passThreshold}%` : null;

          return (
            <div key={round.id || idx} className="relative flex items-start gap-3 pl-0.5">
              {/* Number Circle Badge */}
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs dark:bg-indigo-500">
                {roundNum}
              </div>

              {/* Round Details */}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {round.name || round.roundType || `Round ${roundNum}`}
                  </h4>

                  {round.roundType && (
                    <Badge
                      variant="secondary"
                      className="bg-indigo-50 px-1.5 py-0 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {round.roundType.replace("_", " ")}
                    </Badge>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {passScore && (
                    <span>
                      {t("enterpriseCompanydetail.passingScore", "Passing Score")}:{" "}
                      <strong className="text-slate-700 dark:text-slate-300">{passScore}</strong>
                    </span>
                  )}

                  {timeLimit && (
                    <span>
                      • {t("enterpriseCompanydetail.duration", "Duration")}:{" "}
                      <strong className="text-slate-700 dark:text-slate-300">
                        {timeLimit} mins
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
