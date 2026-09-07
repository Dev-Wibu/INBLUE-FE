import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Code2,
  FileQuestion,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { ScoreRing } from "../components/ScoreRing";
import { useCompetency, useEntryTestResult } from "../hooks/useEntryTestAttempt";

export function EntryTestResultPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const attemptId = Number(useParams().id);
  const result = useEntryTestResult(Number.isSafeInteger(attemptId) ? attemptId : null);
  const competency = useCompetency(result.data?.status === "GRADED");

  if (result.isLoading)
    return (
      <section className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-transparent">
        <div className="px-5 py-6 md:px-8">
          <Skeleton className="h-36 rounded-[20px]" />
        </div>
        <div className="grid gap-4 px-5 pb-8 md:grid-cols-3 md:px-8">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </section>
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
      surface: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
      bar: "bg-sky-500",
    },
    {
      key: "specific",
      label: t("entryTestResult.sections.specific"),
      score: attempt.specificQuizScore ?? 0,
      maxScore: specificMax,
      icon: Target,
      surface: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
      bar: "bg-indigo-500",
    },
    {
      key: "coding",
      label: t("entryTestResult.sections.coding"),
      score: attempt.specificCodingScore ?? 0,
      maxScore: codingMax,
      icon: Code2,
      surface: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      bar: "bg-emerald-500",
    },
  ].map((section) => ({
    ...section,
    percent: getPercent(section.score, section.maxScore),
  }));
  const rankedSections = [...sections].filter((section) => section.maxScore > 0);
  const strongest = rankedSections.reduce(
    (best, section) => (section.percent > best.percent ? section : best),
    rankedSections[0] ?? sections[0]
  );
  const focus = rankedSections.reduce(
    (lowest, section) => (section.percent < lowest.percent ? section : lowest),
    rankedSections[0] ?? sections[0]
  );
  const chartData = sections.map((section) => ({
    subject: t(`entryTestResult.chartSections.${section.key}`),
    score: section.percent,
  }));
  const skills = competency.data?.languagesJson ?? attempt.selectedLanguagesJson ?? [];

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-transparent">
      <div className="shrink-0 px-5 py-6 md:px-8">
        <div className="w-full rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("entryTestResult.title")}
                </h1>
                <Badge className="border-0 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("entryTestResult.graded")}
                </Badge>
              </div>
              <p className="mt-1 max-w-3xl text-[15px] leading-6 text-slate-500 dark:text-slate-400">
                {t("entryTestResult.description")}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                {t("entryTestResult.submissionMeta", { id: attempt.id, date: submittedAt })}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 shrink-0 rounded-[10px] px-5 font-semibold"
              onClick={() => navigate("/user/entry-test")}>
              <ArrowLeft className="h-4 w-4" />
              {t("entryTestResult.actions.back")}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 space-y-4 px-5 pb-8 md:px-8">
        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <div className="flex min-h-44 items-center rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="flex w-full items-center justify-center gap-4">
              <ScoreRing
                value={finalScore}
                maximum={totalPossibleScore}
                label={t("entryTestResult.totalScore")}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("entryTestResult.currentLevel")}
                </p>
                <p className="mt-1.5 text-xl font-black text-slate-900 dark:text-white">{level}</p>
                <Badge className="mt-2 border-0 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {formatScore(finalScore)} / {formatScore(totalPossibleScore)}
                </Badge>
              </div>
            </div>
          </div>

          <InsightTile
            icon={Award}
            label={t("entryTestResult.strongestArea")}
            section={strongest}
            tone="emerald"
          />
          <InsightTile
            icon={TrendingUp}
            label={t("entryTestResult.developmentPriority")}
            section={focus}
            tone="amber"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
          <div className="overflow-hidden rounded-xl border border-indigo-200/80 bg-white shadow-xs lg:col-span-3 dark:border-indigo-500/20 dark:bg-[#0b1225] dark:shadow-none">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-indigo-500/15">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("entryTestResult.chartTitle")}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("entryTestResult.chartDescription")}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {t("entryTestResult.scoreRange")}
              </span>
            </div>
            <div className="h-[340px] min-w-0 px-2 py-3 sm:px-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} outerRadius="68%">
                  <PolarGrid stroke="#cbd5e1" strokeOpacity={0.65} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tickCount={5}
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                  />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                    tickLine={false}
                  />
                  <Radar
                    dataKey="score"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.3}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#818cf8", stroke: "#4f46e5", strokeWidth: 2 }}
                    isAnimationActive
                    animationDuration={900}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value) => [
                      `${Math.round(Number(value))}%`,
                      t("entryTestResult.totalScore"),
                    ]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      color: "#e2e8f0",
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("entryTestResult.breakdownTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("entryTestResult.breakdownDescription")}
              </p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.key} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          section.surface
                        )}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {section.label}
                          </span>
                          <span className="shrink-0 text-sm font-black text-slate-900 tabular-nums dark:text-white">
                            {Math.round(section.percent)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={cn("h-full rounded-full", section.bar)}
                            style={{ width: `${section.percent}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          {t("entryTestResult.scoreValue", {
                            score: formatScore(section.score),
                            max: formatScore(section.maxScore),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
              {t("entryTestResult.scoringNote")}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {competency.data
                  ? t("entryTestResult.competency.updated")
                  : t("entryTestResult.competency.syncing")}
              </h2>
              {competency.data && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("entryTestResult.competency.direction", {
                    role: t(`entryTestOnboarding.roleLabels.${competency.data.targetRole}`),
                    level: t(`entryTestOnboarding.levelLabels.${competency.data.currentLevel}`),
                  })}
                </p>
              )}
              {skills.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="rounded-md text-[11px]">
                      {skill.replaceAll("_", " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 shrink-0 rounded-[10px] font-semibold"
            onClick={() => navigate("/user/entry-test")}>
            <RefreshCw className="h-4 w-4" />
            {t("entryTestResult.actions.overview")}
          </Button>
        </div>
      </div>
    </section>
  );
}

type InsightSection = {
  label: string;
  percent: number;
  score: number;
  maxScore: number;
};

function InsightTile({
  icon: Icon,
  label,
  section,
  tone,
}: {
  icon: typeof Award;
  label: string;
  section: InsightSection;
  tone: "emerald" | "amber";
}) {
  const isEmerald = tone === "emerald";
  return (
    <div
      className={cn(
        "relative min-h-44 overflow-hidden rounded-xl border bg-white p-5 shadow-xs dark:bg-slate-900 dark:shadow-none",
        isEmerald
          ? "border-emerald-200 dark:border-emerald-500/25"
          : "border-amber-200 dark:border-amber-500/25"
      )}>
      <div
        className={cn(
          "absolute inset-y-0 left-0 opacity-50 transition-[width] duration-700",
          isEmerald ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-amber-50 dark:bg-amber-500/10"
        )}
        style={{ width: `${section.percent}%` }}
      />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-xs font-semibold",
              isEmerald
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            )}>
            {label}
          </p>
          <Icon className={cn("h-5 w-5", isEmerald ? "text-emerald-500" : "text-amber-500")} />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
              {section.label}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatScore(section.score)} / {formatScore(section.maxScore)}
            </p>
          </div>
          <strong
            className={cn(
              "shrink-0 text-3xl font-black tabular-nums",
              isEmerald
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )}>
            {Math.round(section.percent)}
            <span className="text-sm">%</span>
          </strong>
        </div>
      </div>
    </div>
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
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Award className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        <Button
          className="mt-5 rounded-[10px] bg-indigo-600 hover:bg-indigo-700"
          onClick={onAction}>
          {action}
        </Button>
      </div>
    </div>
  );
}
