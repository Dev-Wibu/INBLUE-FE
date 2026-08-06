import { Calendar, CheckCircle2, Clock, Hourglass, Users, Video, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { components } from "../../../../../../schema-from-be";
import { applicationTheme } from "../applicationTheme";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

export type MentorStepKey =
  | "AWAITING_MENTOR"
  | "SELECT_MENTOR"
  | "SCHEDULE"
  | "WAITING"
  | "IN_CALL"
  | "RESULT";

export interface MentorReviewSubheaderProps {
  roundOrder?: number;
  roundLabel?: string;
  activeStep?: MentorStepKey;
  detail?: ApplicationDetail;
  isCompleted?: boolean;
  instruction?: string;
}

export function MentorReviewSubheader({
  roundOrder = 6,
  roundLabel,
  activeStep = "AWAITING_MENTOR",
  detail,
  isCompleted = false,
  instruction,
}: MentorReviewSubheaderProps) {
  const { t } = useTranslation();

  const isFinished =
    isCompleted ||
    activeStep === "RESULT" ||
    detail?.status === "COMPLETED" ||
    detail?.status === "AI_EVALUATED";

  const renderIcon = () => {
    switch (activeStep) {
      case "IN_CALL":
        return <Video className="h-5 w-5" />;
      case "WAITING":
        return <Clock className="h-5 w-5" />;
      case "SCHEDULE":
        return <Calendar className="h-5 w-5" />;
      case "SELECT_MENTOR":
        return <Users className="h-5 w-5" />;
      case "AWAITING_MENTOR":
        return <Hourglass className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getSubheaderTitle = () => {
    if (isFinished) {
      return t("userApplication.mentorReview.mentorEvaluationReport");
    }
    const name = roundLabel || t("userApplication.mentorReview.mentorReview");
    return `${t("userApplication.roundNumber", { number: roundOrder })}: ${name.toUpperCase()} • ${t("userApplication.mentorReview.onlineInterviewStation", { defaultValue: "ONLINE INTERVIEW STATION" })}`;
  };

  const getDescription = () => {
    if (isFinished) {
      return t("userApplication.mentorReview.mentorReviewCompleted");
    }
    switch (activeStep) {
      case "IN_CALL":
        return t("userApplication.mentorReview.inCallRoom");
      case "WAITING":
        return t("userApplication.mentorReview.waitingForInterview");
      case "SCHEDULE":
        return t("userApplication.mentorReview.scheduleInterview");
      case "SELECT_MENTOR":
        return t("userApplication.mentorReview.selectMentor");
      case "AWAITING_MENTOR":
      default:
        return instruction || t("userApplication.mentorReview.awaitingMentor");
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 ${applicationTheme.subheader}`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${applicationTheme.subheaderIcon}`}>
          {renderIcon()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {getSubheaderTitle()}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {t("userApplication.roundNumber", { number: roundOrder })}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            {getDescription()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {detail?.finalResult ? (
          <span
            className={
              detail.finalResult === "PASSED"
                ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-emerald-950/40"
                : "inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:shadow-rose-950/40"
            }>
            {detail.finalResult === "PASSED" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span>
              {t("userApplication.mentorReview.resultPassed")}: {detail.finalResult}
            </span>
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-emerald-950/40">
            <CheckCircle2 className="h-4 w-4" />
            <span>{t("userApplication.mentorReview.interviewCompleted")}</span>
          </span>
        ) : activeStep === "IN_CALL" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:shadow-emerald-950/40">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
            <span>{t("userApplication.mentorReview.interviewRoomOpen")}</span>
          </span>
        ) : activeStep === "WAITING" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-extrabold text-amber-700 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:shadow-amber-950/40">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>{t("userApplication.mentorReview.waitingSchedule")}</span>
          </span>
        ) : activeStep === "SCHEDULE" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:shadow-indigo-950/40">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>{t("userApplication.mentorReview.scheduleInterviewStep")}</span>
          </span>
        ) : activeStep === "SELECT_MENTOR" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:shadow-indigo-950/40">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>{t("userApplication.mentorReview.selectMentorStep")}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300 dark:shadow-indigo-950/40">
            <Hourglass className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
            <span>{t("userApplication.mentorReview.awaitingMentorAdmin")}</span>
          </span>
        )}
      </div>
    </div>
  );
}
