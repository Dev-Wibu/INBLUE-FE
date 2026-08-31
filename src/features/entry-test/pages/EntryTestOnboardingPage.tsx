import icon2 from "@/assets/icon2.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { ArrowLeft, ArrowRight, Check, Code2, Flag, Target } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
  { label: "Định hướng", icon: Target },
  { label: "Kỹ năng", icon: Code2 },
  { label: "Mục tiêu", icon: Flag },
  { label: "Xác nhận", icon: Check },
];

export function EntryTestOnboardingPage() {
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
      toast.error("Không thể lưu định hướng lúc này. Vui lòng thử lại.");
    }
  };

  return (
    <main className="min-h-screen bg-[#111217] text-white">
      <header className="flex h-16 items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-2.5">
          <img src={icon2} alt="INBLUE AI" className="h-9 w-9" />
          <span className="text-base font-bold tracking-wide">INBLUE AI</span>
        </div>
        <span className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-slate-300">
          Thiết lập hồ sơ học tập
        </span>
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl items-center px-5 py-8 md:px-10">
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#1b1c23] px-6 py-7 shadow-2xl md:px-12 md:py-10">
          <Progress value={(step + 1) * 25} className="h-2 bg-white/10 [&>div]:bg-indigo-500" />
          <ol className="mt-5 grid grid-cols-4 gap-3" aria-label="Tiến độ thiết lập">
            {steps.map(({ label, icon: Icon }, index) => (
              <li key={label} className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    index <= step ? "bg-indigo-600 text-white" : "bg-white/10 text-slate-500"
                  )}>
                  {index < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span
                  className={cn(
                    "hidden truncate text-xs font-semibold sm:block",
                    index === step ? "text-white" : "text-slate-500"
                  )}>
                  {label}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-10 min-h-[390px]">
            {step === 0 && (
              <Step
                title="Bạn muốn phát triển theo hướng nào?"
                description="Chọn một vai trò mục tiêu để cá nhân hóa nội dung học tập.">
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
                        "flex min-h-24 items-center gap-4 rounded-xl border p-4 text-left transition-colors",
                        role === item.value
                          ? "border-indigo-400 bg-indigo-500/15"
                          : "border-white/10 bg-white/[0.02] hover:border-white/25"
                      )}>
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          role === item.value ? "bg-indigo-600" : "bg-white/10 text-slate-400"
                        )}>
                        <Target className="h-5 w-5" />
                      </span>
                      <span>
                        <strong className="block text-sm">{item.label}</strong>
                        <span className="mt-1 block text-xs text-slate-400">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Step>
            )}
            {step === 1 && (
              <Step
                title="Bạn đang sử dụng kỹ năng nào?"
                description="Chọn ít nhất một kỹ năng để hệ thống chọn nội dung phù hợp.">
                <div className="flex flex-wrap gap-3">
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
                          "inline-flex h-12 items-center gap-2 rounded-lg border px-4 text-sm font-semibold",
                          selected
                            ? "border-indigo-400 bg-indigo-600"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25"
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
                title="Mức độ bạn đang hướng tới?"
                description="Bạn có thể cập nhật mục tiêu này sau.">
                <div className="grid gap-3 sm:grid-cols-4">
                  {entryTestLevels.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLevel(item.value)}
                      className={cn(
                        "h-14 rounded-lg border text-sm font-semibold",
                        level === item.value
                          ? "border-indigo-400 bg-indigo-600"
                          : "border-white/10 bg-white/[0.03] hover:border-white/25"
                      )}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-8">
                  <Label htmlFor="onboarding-goal" className="text-slate-200">
                    Mục tiêu nghề nghiệp{" "}
                    <span className="font-normal text-slate-500">(không bắt buộc)</span>
                  </Label>
                  <Input
                    id="onboarding-goal"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="mt-2 border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500"
                    placeholder="Ví dụ: Trở thành Frontend Engineer"
                    maxLength={300}
                  />
                </div>
              </Step>
            )}
            {step === 3 && (
              <Step
                title="Kiểm tra lại lựa chọn"
                description="Bạn sắp hoàn tất bước thiết lập hồ sơ học tập.">
                <div className="divide-y divide-white/10 rounded-xl border border-white/10">
                  {[
                    ["Định hướng", entryTestRoles.find((item) => item.value === role)?.label],
                    ["Kỹ năng", skills.map((item) => item.replaceAll("_", " ")).join(", ")],
                    [
                      "Mức độ mục tiêu",
                      entryTestLevels.find((item) => item.value === level)?.label ??
                        "Chưa xác định",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-4 px-5 py-4">
                      <span className="text-sm text-slate-400">{label}</span>
                      <strong className="text-right text-sm text-white">
                        {value || "Chưa chọn"}
                      </strong>
                    </div>
                  ))}
                </div>
              </Step>
            )}
          </div>
          <footer className="flex items-center justify-between border-t border-white/10 pt-5">
            <Button
              variant="ghost"
              className="text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => step > 0 && setStep((value) => value - 1)}
              disabled={step === 0}>
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </Button>
            {step < 3 ? (
              <Button
                className="bg-indigo-600 px-6 hover:bg-indigo-500"
                onClick={() => setStep((value) => value + 1)}
                disabled={!canContinue}>
                Tiếp tục <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="bg-indigo-600 px-6 hover:bg-indigo-500"
                onClick={finish}
                disabled={save.isPending}>
                {save.isPending ? "Đang lưu..." : "Hoàn tất thiết lập"}{" "}
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
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function OnboardingLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111217] text-sm text-slate-400">
      Đang chuẩn bị thiết lập hồ sơ học tập...
    </main>
  );
}
