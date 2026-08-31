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

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeApiError } from "@/lib/error-normalizer";
import { useAuthStore } from "@/stores/authStore";

import { CareerPreferenceWizard } from "../components/CareerPreferenceWizard";
import { EntryTestStartDialog } from "../components/EntryTestStartDialog";
import { useCareerPreference, useCareerPreferenceExists } from "../hooks/useCareerPreference";
import { useCompetency, useStartEntryTest } from "../hooks/useEntryTestAttempt";
import type { EntryTestDraftV1 } from "../types/entry-test.types";
import { getActiveAttemptId, saveEntryTestDraft } from "../utils/entry-test-storage";

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
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  return (
    <main className="-m-0 flex min-h-full flex-col bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
      <section className="mx-auto w-full max-w-6xl">
        <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/25">
                <BrainCircuit className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("entryTestLanding.title")}
                </h1>
                <p className="mt-1 max-w-2xl text-[15px] leading-6 text-slate-500 dark:text-slate-400">
                  {t("entryTestLanding.description")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {competency.data && (
                <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> {t("entryTestLanding.assessed")}
                </span>
              )}
              {activeAttemptId && (
                <Button
                  variant="outline"
                  className="h-10 rounded-xl"
                  onClick={() => navigate(`/user/entry-test/session/${activeAttemptId}`)}>
                  <RefreshCw className="h-4 w-4" /> {t("entryTestLanding.continueAttempt")}
                </Button>
              )}
              <Button
                className="h-10 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700"
                onClick={() =>
                  preference.data?.targetRole ? setStartOpen(true) : setWizardOpen(true)
                }>
                {preference.data?.targetRole
                  ? t("entryTestLanding.start")
                  : t("entryTestLanding.chooseDirection")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("entryTestLanding.contentsTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("entryTestLanding.contentsDescription")}
              </p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              <Feature
                icon={ClipboardCheck}
                title={t("entryTestLanding.features.foundation.title")}
                text={t("entryTestLanding.features.foundation.description")}
              />
              <Feature
                icon={Route}
                title={t("entryTestLanding.features.direction.title")}
                text={t("entryTestLanding.features.direction.description")}
              />
              <Feature
                icon={Code2}
                title={t("entryTestLanding.features.coding.title")}
                text={t("entryTestLanding.features.coding.description")}
              />
            </div>
          </section>

          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("entryTestLanding.profileTitle")}
              </h2>
            </div>
            <div className="px-6 py-5">
              {competency.data ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {t("entryTestLanding.latestResult")}
                    </span>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
                    {competency.data.currentScore}
                    <span className="text-base font-medium text-slate-400"> / 100</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {t("entryTestLanding.level", { level: competency.data.currentLevel })}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 w-full rounded-xl"
                    onClick={() =>
                      navigate(`/user/entry-test/result/${competency.data.lastEntryTestAttemptId}`)
                    }>
                    {t("entryTestLanding.viewResult")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("entryTestLanding.noAssessment")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {t("entryTestLanding.noAssessmentDescription")}
                  </p>
                </>
              )}
            </div>
            {preference.data?.targetRole && (
              <div className="border-t border-slate-200 px-6 py-5 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500">
                  {t("entryTestLanding.currentDirection")}
                </span>
                <p className="mt-1 text-sm font-semibold break-words text-slate-900 dark:text-white">
                  {t(`entryTestOnboarding.roleLabels.${preference.data.targetRole}`)} ·{" "}
                  {(preference.data.languagesJson ?? [])
                    .map((skill) => skill.replaceAll("_", " "))
                    .join(", ") || t("entryTestLanding.noSkills")}
                </p>
                <Button
                  variant="link"
                  className="mt-2 h-auto p-0 text-sm font-semibold text-indigo-600"
                  onClick={() => setWizardOpen(true)}>
                  {t("entryTestLanding.updateDirection")}
                </Button>
              </div>
            )}
          </aside>
        </div>
      </section>
      <CareerPreferenceWizard
        open={wizardOpen}
        initialPreference={preference.data}
        onOpenChange={setWizardOpen}
        onSaved={(saved) => {
          setWizardOpen(false);
          if (!saved.targetRole) toast.info(t("entryTestLanding.directionSkipped"));
        }}
      />
      <EntryTestStartDialog
        open={startOpen}
        pending={start.isPending}
        onOpenChange={setStartOpen}
        onConfirm={handleStart}
      />
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof Code2; title: string; text: string }) {
  return (
    <div className="flex gap-4 px-6 py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
      </div>
    </div>
  );
}
