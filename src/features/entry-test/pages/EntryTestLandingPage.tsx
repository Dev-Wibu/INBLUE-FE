import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  RefreshCw,
  Route,
  Sparkles,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeApiError } from "@/lib/error-normalizer";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

import { CareerPreferenceWizard } from "../components/CareerPreferenceWizard";
import { EntryTestStartDialog } from "../components/EntryTestStartDialog";
import { ScoreRing } from "../components/ScoreRing";
import { useCareerPreference, useCareerPreferenceExists } from "../hooks/useCareerPreference";
import { useCompetency, useStartEntryTest } from "../hooks/useEntryTestAttempt";
import type { EntryTestDraftV1 } from "../types/entry-test.types";
import { getActiveAttemptId, saveEntryTestDraft } from "../utils/entry-test-storage";

const featureStyles = [
  {
    icon: ClipboardCheck,
    surface: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  },
  {
    icon: Route,
    surface: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  },
  {
    icon: Code2,
    surface: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
] as const;

export function EntryTestLandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = Number(useAuthStore((state) => state.user?.id));
  const exists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  const preference = useCareerPreference(exists.data === true);
  const competency = useCompetency(true);
  const start = useStartEntryTest();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [startOpen, setStartOpen] = useState(() =>
    Boolean((location.state as { openStartDialog?: boolean } | null)?.openStartDialog)
  );
  const activeAttemptId = Number.isSafeInteger(userId) ? getActiveAttemptId(userId) : null;
  const displayedSkills = preference.data?.languagesJson ?? competency.data?.languagesJson ?? [];

  const handleStart = async () => {
    if (!preference.data?.targetRole) {
      setStartOpen(false);
      setWizardOpen(true);
      return;
    }
    try {
      const test = await start.mutateAsync();
      const firstSection =
        [...test.sectionConfigs].sort((a, b) => a.displayOrder - b.displayOrder)[0]?.sectionType ??
        "COMMON_QUIZ";
      const draft: EntryTestDraftV1 = {
        version: 1,
        userId,
        attemptId: test.attemptId,
        entryTestId: test.entryTestId,
        timeLimitMinutes: test.timeLimitMinutes,
        deadlineEpochMs: Date.now() + test.timeLimitMinutes * 60_000,
        currentSection: firstSection,
        currentItemId: null,
        quizDrafts: {},
        codingDrafts: {},
        testSnapshot: test,
        savedAt: new Date().toISOString(),
      };
      saveEntryTestDraft(draft);
      navigate(`/user/entry-test/session/${test.attemptId}`);
    } catch (error) {
      const normalized = normalizeApiError(error, t("entryTestLanding.errors.create"));
      toast.error(
        normalized.rawMessage?.includes("Not enough items")
          ? t("entryTestLanding.errors.notEnoughItems")
          : normalized.message
      );
    }
  };

  if (exists.isLoading)
    return (
      <section className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-transparent">
        <div className="px-5 py-6 md:px-8">
          <Skeleton className="h-36 w-full rounded-[20px]" />
        </div>
        <div className="grid gap-6 px-5 pb-8 md:px-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </section>
    );

  const featureContent = [
    {
      title: t("entryTestLanding.features.foundation.title"),
      description: t("entryTestLanding.features.foundation.description"),
    },
    {
      title: t("entryTestLanding.features.direction.title"),
      description: t("entryTestLanding.features.direction.description"),
    },
    {
      title: t("entryTestLanding.features.coding.title"),
      description: t("entryTestLanding.features.coding.description"),
    },
  ];
  const featureMeta = [
    {
      detail: t("entryTestLanding.meta.foundation"),
      duration: t("entryTestLanding.meta.foundationTime"),
    },
    {
      detail: t("entryTestLanding.meta.direction"),
      duration: t("entryTestLanding.meta.directionTime"),
    },
    { detail: t("entryTestLanding.meta.coding"), duration: t("entryTestLanding.meta.codingTime") },
  ];
  const primaryAction = activeAttemptId
    ? {
        label: t("entryTestLanding.continueAttempt"),
        icon: RefreshCw,
        onClick: () => navigate(`/user/entry-test/session/${activeAttemptId}`),
      }
    : {
        label: preference.data?.needRetest
          ? t("entryTestLanding.retake")
          : preference.data?.targetRole
            ? t("entryTestLanding.start")
            : t("entryTestLanding.chooseDirection"),
        icon: ArrowRight,
        onClick: () => (preference.data?.targetRole ? setStartOpen(true) : setWizardOpen(true)),
      };
  const PrimaryActionIcon = primaryAction.icon;

  return (
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-[#070d1d]">
      <div className="shrink-0 px-5 pt-6 pb-5 md:px-8 md:pt-8">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm md:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-indigo-600 uppercase dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t("entryTestLanding.contentsTitle")}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl dark:text-white">
                  {t("entryTestLanding.title")}
                </h1>
                {competency.data && (
                  <Badge className="gap-1.5 rounded-full border-0 bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("entryTestLanding.assessed")}
                  </Badge>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-500 dark:text-slate-400">
                {t("entryTestLanding.description")}
              </p>
            </div>
            <Button
              className="h-12 shrink-0 rounded-xl bg-indigo-600 px-5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:-translate-y-0.5 hover:bg-indigo-700"
              onClick={primaryAction.onClick}>
              {activeAttemptId && <PrimaryActionIcon className="h-4 w-4" />}
              {primaryAction.label}
              {!activeAttemptId && <PrimaryActionIcon className="h-4 w-4" />}
            </Button>
          </div>
          {preference.data?.needRetest && (
            <div className="relative mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {t("entryTestLanding.retestRequiredTitle")}
                </p>
                <p className="text-xs leading-5 text-amber-800/80 dark:text-amber-200/80">
                  {t("entryTestLanding.retestRequiredDescription")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white hover:bg-amber-600"
                onClick={() => setStartOpen(true)}>
                {t("entryTestLanding.retakeNow")}
              </Button>
            </div>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {t("entryTestLanding.pathTitle")}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {competency.data
                  ? t("entryTestLanding.pathComplete")
                  : t("entryTestLanding.pathSummary")}
              </p>
            </div>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-300">
              {competency.data ? "100%" : "0%"}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn(
                "h-full rounded-full bg-indigo-500 transition-all",
                competency.data ? "w-full" : "w-0"
              )}
            />
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            <div className="pointer-events-none absolute top-3.5 right-[16.666%] left-[16.666%] h-px bg-slate-200 dark:bg-slate-700" />
            <div
              className={cn(
                "pointer-events-none absolute top-3.5 left-[16.666%] h-px bg-indigo-400 transition-all",
                competency.data || activeStep === 2
                  ? "w-[66.666%]"
                  : activeStep === 1
                    ? "w-[33.333%]"
                    : "w-0"
              )}
            />
            {featureContent.map((feature, index) => (
              <button
                type="button"
                key={feature.title}
                onClick={() => setActiveStep(index)}
                aria-current={activeStep === index ? "step" : undefined}
                className={cn(
                  "group relative z-10 flex min-w-0 flex-col items-center gap-1.5 rounded-lg py-1 text-center text-xs font-semibold transition-colors",
                  activeStep === index
                    ? "text-indigo-600 dark:text-indigo-300"
                    : "text-slate-500 hover:text-indigo-500 dark:text-slate-400"
                )}>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ring-4 ring-white transition-colors dark:ring-slate-900",
                    competency.data
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : activeStep === index
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  )}>
                  {competency.data ? <CheckCircle2 className="h-3.5 w-3.5" /> : `0${index + 1}`}
                </span>
                <span className="hidden max-w-full truncate sm:block">{feature.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid w-full min-w-0 flex-1 gap-5 px-5 pb-8 md:px-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 md:px-6 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("entryTestLanding.contentsTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("entryTestLanding.contentsDescription")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {featureContent.map((feature, index) => {
              const style = featureStyles[index];
              const Icon = style.icon;
              return (
                <div
                  key={feature.title}
                  className={cn(
                    "group relative flex min-w-0 items-start gap-4 border-l-2 px-5 py-5 transition-colors hover:bg-indigo-50/50 md:px-6 dark:hover:bg-indigo-500/5",
                    activeStep === index
                      ? "border-l-indigo-500 bg-indigo-50/40 dark:bg-indigo-500/5"
                      : "border-l-transparent"
                  )}>
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      style.surface
                    )}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black tracking-wider text-indigo-500">
                        0{index + 1}
                      </span>
                      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold">
                        {competency.data
                          ? t("entryTestLanding.completed")
                          : t("entryTestLanding.ready")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                      {feature.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      <span>{featureMeta[index].detail}</span>
                      <span>~{featureMeta[index].duration.replace("~", "")}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-500 dark:text-slate-600" />
                </div>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="flex-1 px-5 py-5 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Target className="h-4 w-4 text-indigo-500" />
                {t("entryTestLanding.profileTitle")}
              </h2>
              {competency.data && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {t("entryTestLanding.latestResult")}
                </span>
              )}
            </div>

            {competency.data ? (
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/15 dark:bg-emerald-500/5">
                <ScoreRing
                  value={competency.data.currentScore}
                  label={t("entryTestResult.totalScore")}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("entryTestResult.currentLevel")}
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    {t(`entryTestOnboarding.levelLabels.${competency.data.currentLevel}`)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    onClick={() =>
                      navigate(`/user/entry-test/result/${competency.data.lastEntryTestAttemptId}`)
                    }>
                    {t("entryTestLanding.viewResult")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-950/30">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("entryTestLanding.noAssessment")}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t("entryTestLanding.noAssessmentDescription")}
                </p>
                <p className="mt-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("entryTestLanding.outcomeTitle")}
                </p>
                <ul className="mt-2 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  {["outcomeRadar", "outcomePath", "outcomeSkills"].map((key) => (
                    <li key={key} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                      {t(`entryTestLanding.${key}`)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {preference.data?.targetRole && (
            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 md:px-6 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("entryTestLanding.currentDirection")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {t(`entryTestOnboarding.roleLabels.${preference.data.targetRole}`)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 rounded-lg border-indigo-200 bg-white px-3 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  onClick={() => setWizardOpen(true)}>
                  <Target className="h-3.5 w-3.5" />
                  {t("entryTestLanding.updateDirection")}
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {displayedSkills.length > 0 ? (
                  displayedSkills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="secondary"
                      className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {skill.replaceAll("_", " ")}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">{t("entryTestLanding.noSkills")}</span>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      <CareerPreferenceWizard
        open={wizardOpen}
        initialPreference={preference.data}
        onOpenChange={setWizardOpen}
        onSaved={(saved) => {
          setWizardOpen(false);
          if (!saved.targetRole) {
            toast.info(t("entryTestLanding.directionSkipped"));
          } else if (saved.needRetest) {
            setStartOpen(true);
          }
        }}
      />
      <EntryTestStartDialog
        open={startOpen}
        pending={start.isPending}
        onOpenChange={setStartOpen}
        onConfirm={handleStart}
      />
    </section>
  );
}
