import { ArrowLeft, ArrowRight, Check, Code2, Compass, Flag, Target } from "lucide-react";
import { useMemo, useState } from "react";

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

import { useSkipCareerPreference, useUpsertCareerPreference } from "../hooks/useCareerPreference";
import type { TargetLevel, TargetRole, UserCareerPreference } from "../types/entry-test.types";
import { normalizeCareerLanguages } from "../utils/entry-test-payload";

const roles: Array<{ value: TargetRole; label: string; description: string }> = [
  { value: "FE", label: "Frontend", description: "Giao diện và trải nghiệm web" },
  { value: "BE", label: "Backend", description: "API, dữ liệu và hệ thống" },
  { value: "QA_QC", label: "QA / QC", description: "Chất lượng và kiểm thử" },
  { value: "BA", label: "Business Analyst", description: "Nghiệp vụ và giải pháp" },
  { value: "DEVOPS", label: "DevOps", description: "Hạ tầng và vận hành" },
  { value: "DATA", label: "Data", description: "Dữ liệu và phân tích" },
];

const skillsByRole: Record<TargetRole, string[]> = {
  FE: ["JAVASCRIPT", "TYPESCRIPT", "REACT", "NEXT_JS", "VUE", "HTML_CSS"],
  BE: ["JAVA", "SPRING_BOOT", "NODE_JS", "PYTHON", "DOTNET", "GO"],
  QA_QC: ["MANUAL_TESTING", "SELENIUM", "PLAYWRIGHT", "POSTMAN", "JAVASCRIPT"],
  BA: ["UML", "BPMN", "SQL", "AGILE", "JIRA"],
  DEVOPS: ["DOCKER", "KUBERNETES", "AWS", "LINUX", "CI_CD"],
  DATA: ["PYTHON", "SQL", "POWER_BI", "MACHINE_LEARNING", "SPARK"],
};

const levels: Array<{ value: TargetLevel; label: string }> = [
  { value: "INTERN", label: "Intern" },
  { value: "FRESHER", label: "Fresher" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
];

export function CareerPreferenceWizard({
  open,
  initialPreference,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initialPreference?: UserCareerPreference | null;
  onOpenChange: (_open: boolean) => void;
  onSaved: (_preference: UserCareerPreference) => void;
}) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<TargetRole | null>(initialPreference?.targetRole ?? null);
  const [skills, setSkills] = useState<string[]>(initialPreference?.languagesJson ?? []);
  const [level, setLevel] = useState<TargetLevel | null>(initialPreference?.targetLevel ?? null);
  const [goal, setGoal] = useState(initialPreference?.careerGoal ?? "");
  const upsert = useUpsertCareerPreference();
  const skip = useSkipCareerPreference();
  const availableSkills = useMemo(() => (role ? skillsByRole[role] : []), [role]);

  const handleRole = (nextRole: TargetRole) => {
    setRole(nextRole);
    setSkills([]);
  };

  const handleSave = async () => {
    if (!role) return;
    const preference = await upsert.mutateAsync({
      targetRole: role,
      languagesJson: normalizeCareerLanguages(skills),
      careerGoal: goal.trim() || null,
      targetLevel: level,
    });
    onSaved(preference);
  };

  const handleSkip = async () => {
    const preference = await skip.mutateAsync();
    onSaved(preference);
  };

  const canContinue = step === 0 ? role !== null : step === 1 ? skills.length > 0 : true;
  const stepItems = [
    { label: "Định hướng", icon: Target },
    { label: "Kỹ năng", icon: Code2 },
    { label: "Mục tiêu", icon: Flag },
    { label: "Xác nhận", icon: Check },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-32px)] min-h-[min(720px,calc(100vh-32px))] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <div className="flex-none border-b border-slate-200 px-6 pt-6 pb-4 md:px-10 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Compass className="h-5 w-5 text-indigo-600" /> Định hướng hành trình của bạn
            </DialogTitle>
            <DialogDescription>
              Thông tin này giúp hệ thống chọn nội dung Entry Test phù hợp hơn.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 flex items-center gap-3">
            <Progress value={(step + 1) * 25} className="h-1.5" />
            <span className="shrink-0 text-xs font-medium text-slate-500">{step + 1}/4</span>
          </div>
          <ol className="mt-4 grid grid-cols-4 gap-2" aria-label="Tiến độ thiết lập">
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
                Bạn muốn phát triển theo hướng nào?
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Chọn một vai trò mục tiêu. Bạn có thể cập nhật lại sau.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {roles.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleRole(item.value)}
                    className={cn(
                      "flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                      role === item.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700"
                    )}>
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                        role === item.value
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      )}>
                      <Target className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="text-xs text-slate-500">{item.description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-base font-semibold">Kỹ năng bạn đang sử dụng</h2>
              <p className="mt-1 text-sm text-slate-500">
                Chọn ít nhất một kỹ năng để cá nhân hóa phần chuyên môn.
              </p>
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
                        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none",
                        selected
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"
                      )}>
                      <Code2 className="h-4 w-4" />
                      {skill.replaceAll("_", " ")}
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold">Mức độ bạn đang hướng tới</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {levels.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLevel(item.value)}
                      className={cn(
                        "h-11 rounded-md border text-sm font-semibold",
                        level === item.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "border-slate-200 dark:border-slate-700"
                      )}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="career-goal">
                  Mục tiêu nghề nghiệp{" "}
                  <span className="font-normal text-slate-400">(không bắt buộc)</span>
                </Label>
                <Input
                  id="career-goal"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="mt-2"
                  placeholder="Ví dụ: Trở thành Frontend Engineer trong 12 tháng"
                  maxLength={300}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-base font-semibold">Kiểm tra lại lựa chọn</h2>
              <div className="mt-5 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                <ReviewRow
                  icon={Target}
                  label="Định hướng"
                  value={roles.find((item) => item.value === role)?.label ?? "Chưa chọn"}
                />
                <ReviewRow
                  icon={Code2}
                  label="Kỹ năng"
                  value={skills.map((item) => item.replaceAll("_", " ")).join(", ")}
                />
                <ReviewRow
                  icon={Flag}
                  label="Mức độ mục tiêu"
                  value={levels.find((item) => item.value === level)?.label ?? "Chưa xác định"}
                />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Khi thay đổi định hướng hoặc kỹ năng, hệ thống có thể yêu cầu bạn thực hiện Entry
                Test lại để cập nhật năng lực.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 md:px-10 dark:border-slate-800">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={skip.isPending || upsert.isPending}>
            Để sau
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((value) => value - 1)}>
                <ArrowLeft className="h-4 w-4" /> Quay lại
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep((value) => value + 1)} disabled={!canContinue}>
                Tiếp tục <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!role || upsert.isPending}>
                {upsert.isPending ? "Đang lưu..." : "Lưu định hướng"}
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
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-indigo-600" />
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm font-semibold">{value || "Chưa chọn"}</p>
      </div>
    </div>
  );
}
