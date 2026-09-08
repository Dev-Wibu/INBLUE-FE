import icon2 from "@/assets/icon2.svg";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Compass,
  Flag,
  Target,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  entryTestLevels,
  entryTestRoles,
  entryTestSkillsByRole,
} from "../constants/entry-test-onboarding.constants";
import {
  useCareerPreference,
  useCareerPreferenceExists,
  useUpsertCareerPreference,
} from "../hooks/useCareerPreference";
import type { TargetLevel, TargetRole } from "../types/entry-test.types";
import { normalizeCareerLanguages } from "../utils/entry-test-payload";

const steps = [
  { key: "direction", icon: Target },
  { key: "skills", icon: Code2 },
  { key: "goal", icon: Flag },
  { key: "confirm", icon: Check },
];

export function EntryTestOnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = Number(useAuthStore((state) => state.user?.id));
  const exists = useCareerPreferenceExists(Number.isSafeInteger(userId));
  const preference = useCareerPreference(exists.data === true);
  const save = useUpsertCareerPreference();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<TargetRole | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [level, setLevel] = useState<TargetLevel | null>(null);
  const [goal, setGoal] = useState("");
  const availableSkills = useMemo(() => (role ? entryTestSkillsByRole[role] : []), [role]);

  if (exists.data === true && preference.isLoading) return <OnboardingLoading />;
  if (exists.data === true && preference.data?.targetRole) {
    return <Navigate to="/user/entry-test" replace />;
  }

  const canContinue = step === 0 ? role !== null : step === 1 ? skills.length > 0 : true;
  const finish = async () => {
    if (!role) return;
    try {
      await save.mutateAsync({
        targetRole: role,
        languagesJson: normalizeCareerLanguages(skills),
        careerGoal: goal.trim() || null,
        targetLevel: level,
      });
      navigate("/user/entry-test", { replace: true, state: { openStartDialog: true } });
    } catch {
      toast.error(t("entryTestOnboarding.saveError"));
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src={icon2} alt="INBLUE AI" className="h-9 w-9" />
            <div>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                INBLUE AI
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                {t("entryTestOnboarding.setupTitle")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle className="h-9 min-w-12 rounded-lg border border-slate-200 bg-white text-xs font-semibold shadow-sm dark:border-slate-700 dark:bg-slate-900" />
            <ThemeToggle iconOnly />
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-10">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/25">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                {t("entryTestOnboarding.stepCounter", { current: step + 1, total: 4 })}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("entryTestOnboarding.pageTitle")}
              </p>
            </div>
          </div>
          <Progress
            value={(step + 1) * 25}
            className="mb-5 h-1.5 bg-slate-200 dark:bg-slate-800 [&>div]:bg-indigo-600"
          />
          <ol
            className="grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-1"
            aria-label={t("entryTestOnboarding.progressLabel")}>
            {steps.map(({ key, icon: Icon }, index) => (
              <li key={key}>
                <button
                  type="button"
                  disabled={index > step}
                  onClick={() => index < step && setStep(index)}
                  className={cn(
                    "flex w-full items-center justify-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors lg:justify-start lg:px-3",
                    index === step
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  )}>
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      index < step
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : index === step
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200/70 text-slate-400 dark:bg-slate-800"
                    )}>
                    {index < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="hidden text-sm font-semibold lg:block">
                    {t(`entryTestOnboarding.${key}`)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-6 hidden text-sm leading-6 text-slate-500 lg:block dark:text-slate-400">
            {t("entryTestOnboarding.helpText")}
          </p>
        </aside>

        <div className="flex min-h-[620px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            {step === 0 && (
              <Step
                title={t("entryTestOnboarding.roleTitle")}
                description={t("entryTestOnboarding.roleDescription")}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {entryTestRoles.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setRole(item.value);
                        setSkills([]);
                      }}
                      className={cn(
                        "group relative flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                        role === item.value
                          ? "border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-500/10 dark:bg-indigo-950/40"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:bg-slate-800/60"
                      )}>
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          role === item.value
                            ? "bg-indigo-600"
                            : "bg-slate-100 text-slate-500 group-hover:bg-white dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700"
                        )}>
                        <Target className="h-5 w-5" />
                      </span>
                      <span>
                        <strong className="block pr-6 text-sm text-slate-900 dark:text-white">
                          {t(`entryTestOnboarding.roleLabels.${item.value}`)}
                        </strong>
                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                          {t(`entryTestOnboarding.roleDescriptions.${item.value}`)}
                        </span>
                      </span>
                      {role === item.value && (
                        <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                      )}
                    </button>
                  ))}
                </div>
              </Step>
            )}
            {step === 1 && (
              <Step
                title={t("entryTestOnboarding.skillTitle")}
                description={t("entryTestOnboarding.skillDescription")}>
                <div className="flex flex-wrap gap-2.5">
                  {availableSkills.map((skill) => {
                    const selected = skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() =>
                          setSkills((current) =>
                            selected
                              ? current.filter((value) => value !== skill)
                              : [...current, skill]
                          )
                        }
                        className={cn(
                          "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all",
                          selected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700"
                        )}>
                        {skill.replaceAll("_", " ")}
                        {selected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </Step>
            )}
            {step === 2 && (
              <Step
                title={t("entryTestOnboarding.levelTitle")}
                description={t("entryTestOnboarding.levelDescription")}>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {entryTestLevels.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLevel(item.value)}
                      className={cn(
                        "flex h-16 items-center justify-center rounded-xl border text-sm font-semibold transition-all",
                        level === item.value
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-700"
                      )}>
                      {t(`entryTestOnboarding.levelLabels.${item.value}`)}
                    </button>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/50">
                  <Label
                    htmlFor="onboarding-goal"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t("entryTestOnboarding.goalLabel")}{" "}
                    <span className="font-normal text-slate-500">
                      ({t("entryTestOnboarding.optional")})
                    </span>
                  </Label>
                  <Input
                    id="onboarding-goal"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="mt-2 h-12 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                    placeholder={t("entryTestOnboarding.goalPlaceholder")}
                    maxLength={300}
                  />
                </div>
              </Step>
            )}
            {step === 3 && (
              <Step
                title={t("entryTestOnboarding.reviewTitle")}
                description={t("entryTestOnboarding.reviewDescription")}>
                <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {[
                    [
                      t("entryTestOnboarding.direction"),
                      role ? t(`entryTestOnboarding.roleLabels.${role}`) : undefined,
                    ],
                    [
                      t("entryTestOnboarding.skills"),
                      skills.map((item) => item.replaceAll("_", " ")).join(", "),
                    ],
                    [
                      t("entryTestOnboarding.levelTitle"),
                      level
                        ? t(`entryTestOnboarding.levelLabels.${level}`)
                        : t("entryTestOnboarding.notDefined"),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                      <strong className="text-right text-sm text-slate-900 dark:text-white">
                        {value || t("entryTestOnboarding.notSelected")}
                      </strong>
                    </div>
                  ))}
                </div>
              </Step>
            )}
          </div>
          <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-8 lg:px-10 dark:border-slate-700 dark:bg-slate-900">
            <Button
              variant="ghost"
              className="rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              onClick={() => step > 0 && setStep((value) => value - 1)}
              disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> {t("entryTestOnboarding.back")}
            </Button>
            {step < 3 ? (
              <Button
                className="h-11 rounded-xl bg-indigo-600 px-6 font-semibold shadow-sm shadow-indigo-500/20 hover:bg-indigo-700"
                onClick={() => setStep((value) => value + 1)}
                disabled={!canContinue}>
                {t("entryTestOnboarding.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="h-11 rounded-xl bg-indigo-600 px-6 font-semibold shadow-sm shadow-indigo-500/20 hover:bg-indigo-700"
                onClick={finish}
                disabled={save.isPending}>
                {save.isPending ? t("entryTestOnboarding.saving") : t("entryTestOnboarding.finish")}{" "}
                <Check className="h-4 w-4" />
              </Button>
            )}
          </footer>
        </div>
      </section>
    </main>
  );
}

function Step({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl dark:text-white">{title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <div className="mt-7">{children}</div>
    </div>
  );
}

function OnboardingLoading() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      {t("entryTestOnboarding.loading")}
    </main>
  );
}
