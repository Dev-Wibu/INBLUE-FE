import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  RefreshCw,
  Route,
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
    <section className="flex h-full flex-col overflow-y-auto bg-slate-50 dark:bg-transparent">
      <div className="shrink-0 px-5 py-6 md:px-8">
        <div className="w-full rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("entryTestLanding.title")}
                </h1>
                {competency.data && (
                  <Badge className="border-0 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("entryTestLanding.assessed")}
                  </Badge>
                )}
              </div>
              <p className="mt-1 max-w-3xl text-[15px] leading-6 text-slate-500 dark:text-slate-400">
                {t("entryTestLanding.description")}
              </p>
            </div>
            <Button
              className="h-11 shrink-0 rounded-[10px] bg-indigo-600 px-5 font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700"
              onClick={primaryAction.onClick}>
              {activeAttemptId && <PrimaryActionIcon className="h-4 w-4" />}
              {primaryAction.label}
              {!activeAttemptId && <PrimaryActionIcon className="h-4 w-4" />}
            </Button>
          </div>
          {preference.data?.needRetest && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {t("entryTestLanding.retestRequiredTitle")}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-amber-800/80 dark:text-amber-200/80">
                  {t("entryTestLanding.retestRequiredDescription")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid w-full min-w-0 gap-6 px-5 pb-8 md:px-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
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

          <div className="grid sm:grid-cols-3">
            {featureContent.map((feature, index) => {
              const style = featureStyles[index];
              const Icon = style.icon;
              return (
                <div
                  key={feature.title}
                  className={cn(
                    "relative min-w-0 px-5 py-6",
                    index > 0 &&
                      "border-t border-slate-100 sm:border-t-0 sm:border-l dark:border-slate-800"
                  )}>
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        style.surface
                      )}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("entryTestLanding.profileTitle")}
              </h2>
              {competency.data && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {t("entryTestLanding.latestResult")}
                </span>
              )}
            </div>

            {competency.data ? (
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/50">
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
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("entryTestLanding.noAssessment")}
                </p>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t("entryTestLanding.noAssessmentDescription")}
                </p>
              </div>
            )}
          </div>

          {preference.data?.targetRole && (
            <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("entryTestLanding.currentDirection")}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {t(`entryTestOnboarding.roleLabels.${preference.data.targetRole}`)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 rounded-lg px-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                  onClick={() => setWizardOpen(true)}>
                  {t("entryTestLanding.updateDirection")}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {displayedSkills.length > 0 ? (
                  displayedSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="rounded-md text-[11px]">
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
