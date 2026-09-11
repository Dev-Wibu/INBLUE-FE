import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Compass,
  Flag,
  Languages,
  Target,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import {
  entryTestLevels,
  entryTestRoles,
  entryTestSkillsByRole,
} from "../constants/entry-test-onboarding.constants";
import { useSkipCareerPreference, useUpsertCareerPreference } from "../hooks/useCareerPreference";
import type { TargetLevel, TargetRole, UserCareerPreference } from "../types/entry-test.types";
import { normalizeCareerLanguages } from "../utils/entry-test-payload";

export function CareerPreferenceWizard({
  open,
  fullScreen = false,
  initialPreference,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  fullScreen?: boolean;
  initialPreference?: UserCareerPreference | null;
  onOpenChange: (_open: boolean) => void;
  onSaved: (_preference: UserCareerPreference) => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<TargetRole | null>(initialPreference?.targetRole ?? null);
  const [skills, setSkills] = useState<string[]>(initialPreference?.languagesJson ?? []);
  const [otherLanguages, setOtherLanguages] = useState("");
  const [showOtherLanguages, setShowOtherLanguages] = useState(false);
  const [level, setLevel] = useState<TargetLevel | null>(initialPreference?.targetLevel ?? null);
  const [goal, setGoal] = useState(initialPreference?.careerGoal ?? "");
  const upsert = useUpsertCareerPreference();
  const skip = useSkipCareerPreference();
  const availableSkills = useMemo(() => (role ? entryTestSkillsByRole[role] : []), [role]);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setRole(initialPreference?.targetRole ?? null);
    const savedLanguages = initialPreference?.languagesJson ?? [];
    const roleSkills = initialPreference?.targetRole
      ? entryTestSkillsByRole[initialPreference.targetRole]
      : [];
    setSkills(savedLanguages.filter((language) => roleSkills.includes(language)));
    const customLanguages = savedLanguages.filter((language) => !roleSkills.includes(language));
    setOtherLanguages(customLanguages.join(", "));
    setShowOtherLanguages(customLanguages.length > 0);
    setLevel(initialPreference?.targetLevel ?? null);
    setGoal(initialPreference?.careerGoal ?? "");
  }, [open, initialPreference]);

  const handleRole = (nextRole: TargetRole) => {
    setRole(nextRole);
    setSkills([]);
    setOtherLanguages("");
    setShowOtherLanguages(false);
  };

  const handleSave = async () => {
    if (!role) return;
    const preference = await upsert.mutateAsync({
      targetRole: role,
      languagesJson: normalizeCareerLanguages([...skills, ...otherLanguages.split(",")]),
      careerGoal: goal.trim() || null,
      targetLevel: level,
    });
    onSaved(preference);
  };

  const handleSkip = async () => {
    const preference = await skip.mutateAsync();
    onSaved(preference);
  };

  const canContinue =
    step === 0
      ? role !== null
      : step === 1
        ? skills.length > 0 || otherLanguages.trim().length > 0
        : true;
  const stepItems = [
    { label: t("entryTestOnboarding.direction"), icon: Target },
    { label: t("entryTestOnboarding.skills"), icon: Code2 },
    { label: t("entryTestOnboarding.goal"), icon: Flag },
    { label: t("entryTestOnboarding.confirm"), icon: Check },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[calc(100vh-32px)] min-h-[min(720px,calc(100vh-32px))] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 text-slate-950 shadow-xl sm:max-w-4xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          fullScreen &&
            "fixed inset-0 h-screen max-h-none min-h-0 w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-slate-950 text-white sm:max-w-none"
        )}>
        <div className="flex-none border-b border-slate-200 px-6 pt-6 pb-5 md:px-10 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <Compass className="h-4 w-4" />
              </span>
              {t("entryTestWizard.title")}
            </DialogTitle>
            <DialogDescription>{t("entryTestWizard.description")}</DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex items-center gap-3">
            <Progress value={(step + 1) * 25} className="h-1.5" />
            <span className="shrink-0 text-xs font-medium text-slate-500">{step + 1}/4</span>
          </div>
          <ol
            className="mt-4 grid grid-cols-4 gap-2"
            aria-label={t("entryTestOnboarding.progressLabel")}>
            {stepItems.map(({ label, icon: Icon }, index) => {
              const complete = index < step;
              const current = index === step;
              return (
                <li key={label} className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      complete || current
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    )}>
                    {complete ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-[11px] font-medium sm:block",
                      current ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500"
                    )}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 md:px-10 md:py-9">
          {step === 0 && (
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {t("entryTestOnboarding.roleTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t("entryTestWizard.roleDescription")}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {entryTestRoles.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleRole(item.value)}
                    className={cn(
                      "flex min-h-22 items-center gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                      role === item.value
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                    )}>
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                        role === item.value
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                      <Target className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {t(`entryTestOnboarding.roleLabels.${item.value}`)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {t(`entryTestOnboarding.roleDescriptions.${item.value}`)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold">{t("entryTestOnboarding.skillTitle")}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("entryTestWizard.skillDescription")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
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
                        "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                        selected
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900"
                      )}>
                      <Code2 className="h-4 w-4" />
                      {skill.replaceAll("_", " ")}
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 space-y-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowOtherLanguages((current) => !current)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                    showOtherLanguages || otherLanguages.trim()
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700"
                  )}>
                  <Languages className="h-4 w-4" />
                  {t("entryTestOnboarding.otherLanguages")}
                </button>
                {showOtherLanguages && (
                  <div>
                    <Label htmlFor="other-languages" className="text-xs font-semibold">
                      {t("entryTestOnboarding.otherLanguagesLabel")}
                    </Label>
                    <Input
                      id="other-languages"
                      value={otherLanguages}
                      onChange={(event) => setOtherLanguages(event.target.value)}
                      className="mt-2 h-11"
                      placeholder={t("entryTestOnboarding.otherLanguagesPlaceholder")}
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      {t("entryTestOnboarding.otherLanguagesHint")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold">{t("entryTestOnboarding.levelTitle")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {entryTestLevels.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLevel(item.value)}
                      className={cn(
                        "h-14 rounded-xl border text-sm font-semibold transition-all",
                        level === item.value
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                          : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:border-indigo-700"
                      )}>
                      {t(`entryTestOnboarding.levelLabels.${item.value}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/50">
                <Label htmlFor="career-goal">
                  {t("entryTestOnboarding.goalLabel")}{" "}
                  <span className="font-normal text-slate-400">
                    ({t("entryTestOnboarding.optional")})
                  </span>
                </Label>
                <Input
                  id="career-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="mt-2 h-12 rounded-xl bg-white dark:bg-slate-900"
                  placeholder={t("entryTestWizard.goalPlaceholder")}
                  maxLength={300}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold">{t("entryTestOnboarding.reviewTitle")}</h2>
              <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                <ReviewRow
                  icon={Target}
                  label={t("entryTestOnboarding.direction")}
                  value={
                    role
                      ? t(`entryTestOnboarding.roleLabels.${role}`)
                      : t("entryTestOnboarding.notSelected")
                  }
                />
                <ReviewRow
                  icon={Code2}
                  label={t("entryTestOnboarding.skills")}
                  value={[
                    ...skills,
                    ...otherLanguages
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  ]
                    .map((item) => item.replaceAll("_", " "))
                    .join(", ")}
                />
                <ReviewRow
                  icon={Flag}
                  label={t("entryTestWizard.targetLevel")}
                  value={
                    level
                      ? t(`entryTestOnboarding.levelLabels.${level}`)
                      : t("entryTestOnboarding.notDefined")
                  }
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {t("entryTestWizard.changeNotice")}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 md:px-10 dark:border-slate-700">
          <Button
            variant="ghost"
            className="rounded-xl"
            onClick={handleSkip}
            disabled={skip.isPending || upsert.isPending}>
            {t("entryTestWizard.later")}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                className="rounded-xl"
                variant="outline"
                onClick={() => setStep((value) => value - 1)}>
                <ArrowLeft className="h-4 w-4" /> {t("entryTestOnboarding.back")}
              </Button>
            )}
            {step < 3 ? (
              <Button
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setStep((value) => value + 1)}
                disabled={!canContinue}>
                {t("entryTestOnboarding.next")} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSave}
                disabled={!role || upsert.isPending}>
                {upsert.isPending ? t("common.saving") : t("entryTestWizard.save")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-indigo-600 dark:text-indigo-300" />
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold">
          {value || t("entryTestOnboarding.notSelected")}
        </p>
      </div>
    </div>
  );
}
