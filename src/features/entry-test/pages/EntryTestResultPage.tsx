import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Code2,
  FileQuestion,
  Gauge,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useCompetency, useEntryTestResult } from "../hooks/useEntryTestAttempt";

export function EntryTestResultPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const attemptId = Number(useParams().id);
  const result = useEntryTestResult(Number.isSafeInteger(attemptId) ? attemptId : null);
  const competency = useCompetency(result.data?.status === "GRADED");

  if (result.isLoading)
    return (
      <div className="min-h-full space-y-6 bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
        <Skeleton className="mx-auto h-36 max-w-6xl rounded-[20px]" />
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.35fr]">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );

  if (result.isError || !result.data)
    return (
      <StateMessage
        title={t("entryTestResult.errors.loadTitle")}
        description={t("entryTestResult.errors.loadDescription")}
        action={t("entryTestResult.actions.retry")}
        onAction={() => void result.refetch()}
      />
    );

  if (result.data.status !== "GRADED")
    return (
      <StateMessage
        title={t("entryTestResult.pending.title")}
        description={t("entryTestResult.pending.description")}
        action={t("entryTestResult.actions.continue")}
        onAction={() => navigate(`/user/entry-test/session/${attemptId}`)}
      />
    );

  const attempt = result.data;
  const finalScore = attempt.finalScore ?? 0;
  const commonMax = sumMaxScore(attempt.commonQuizItemsJson);
  const specificMax = sumMaxScore(attempt.specificQuizItemsJson);
  const codingMax = sumMaxScore(attempt.specificCodingItemsJson);
  const totalPossibleScore = commonMax + specificMax + codingMax || 100;
  const scorePercent = getPercent(finalScore, totalPossibleScore);
  const submittedAt = attempt.submittedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(attempt.submittedAt))
    : t("common.notAvailable");
  const level = attempt.resultLevel
    ? t(`entryTestOnboarding.levelLabels.${attempt.resultLevel}`)
    : t("entryTestResult.unranked");
  const sections = [
    {
      key: "common",
      label: t("entryTestResult.sections.common"),
      score: attempt.commonQuizScore ?? 0,
      maxScore: commonMax,
      icon: FileQuestion,
      iconClass: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
      barClass: "bg-sky-500",
    },
    {
      key: "specific",
      label: t("entryTestResult.sections.specific"),
      score: attempt.specificQuizScore ?? 0,
      maxScore: specificMax,
      icon: Target,
      iconClass: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
      barClass: "bg-indigo-500",
    },
    {
      key: "coding",
      label: t("entryTestResult.sections.coding"),
      score: attempt.specificCodingScore ?? 0,
      maxScore: codingMax,
      icon: Code2,
      iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
      barClass: "bg-emerald-500",
    },
  ];
  const skills = competency.data?.languagesJson ?? attempt.selectedLanguagesJson ?? [];

  return (
    <main className="min-h-full bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl">
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("entryTestResult.title")}
                  </h1>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/25 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {t("entryTestResult.graded")}
                  </Badge>
                </div>
                <p className="mt-1 text-[15px] leading-6 text-slate-500 dark:text-slate-400">
                  {t("entryTestResult.description")}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                  {t("entryTestResult.submissionMeta", { id: attempt.id, date: submittedAt })}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="h-10 shrink-0 rounded-xl"
              onClick={() => navigate("/user/entry-test")}>
              <ArrowLeft className="h-4 w-4" /> {t("entryTestResult.actions.back")}
            </Button>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.35fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <Gauge className="h-4 w-4 text-indigo-500" />
                {t("entryTestResult.totalScore")}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <strong className="text-5xl leading-none font-bold text-slate-950 dark:text-white">
                  {formatScore(finalScore)}
                </strong>
                <span className="pb-1 text-base font-semibold text-slate-400">
                  / {formatScore(totalPossibleScore)}
                </span>
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-[width] duration-500"
                  style={{ width: `${scorePercent}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 px-6 py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                <Award className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("entryTestResult.currentLevel")}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{level}</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t("entryTestResult.breakdownTitle")}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("entryTestResult.breakdownDescription")}
                </p>
              </div>
              <Badge variant="secondary">
                {t("entryTestResult.sectionCount", { count: sections.length })}
              </Badge>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {sections.map(({ key, label, score, maxScore, icon: Icon, iconClass, barClass }) => (
                <div key={key} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          iconClass
                        )}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {label}
                      </span>
                    </div>
                    <strong className="shrink-0 text-sm text-slate-900 dark:text-white">
                      {t("entryTestResult.scoreValue", {
                        score: formatScore(score),
                        max: formatScore(maxScore),
                      })}
                    </strong>
                  </div>
                  <div className="mt-3 ml-[52px] h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn("h-full rounded-full", barClass)}
                      style={{ width: `${getPercent(score, maxScore)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="border-t border-slate-200 bg-slate-50/70 px-6 py-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
              {t("entryTestResult.scoringNote")}
            </p>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {competency.data
                    ? t("entryTestResult.competency.updated")
                    : t("entryTestResult.competency.syncing")}
                </h2>
                {competency.data && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("entryTestResult.competency.direction", {
                      role: t(`entryTestOnboarding.roleLabels.${competency.data.targetRole}`),
                      level: t(`entryTestOnboarding.levelLabels.${competency.data.currentLevel}`),
                    })}
                  </p>
                )}
                {skills.length > 0 && (
                  <div className="mt-3 flex max-w-3xl flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="max-w-full bg-slate-50 font-medium break-words dark:bg-slate-950/50">
                        {skill.replaceAll("_", " ")}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button
              className="h-10 shrink-0 rounded-xl bg-indigo-600 px-5 hover:bg-indigo-700"
              onClick={() => navigate("/user/entry-test")}>
              <RefreshCw className="h-4 w-4" /> {t("entryTestResult.actions.overview")}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function sumMaxScore(items: Array<{ maxScore: number }>) {
  return items.reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0);
}

function getPercent(value: number, maximum: number) {
  if (maximum <= 0) return 0;
  return Math.min(100, Math.max(0, (value / maximum) * 100));
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function StateMessage({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
          <Award className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        <Button className="mt-5 rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  );
}
