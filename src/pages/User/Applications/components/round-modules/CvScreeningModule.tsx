import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { applicationDetailManager } from "@/services/application-detail.manager";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

/**
 * Shape of `detail.aiFeedback` from BE. The OpenAPI generator often emits
 * `unknown` for free-form objects so we declare the local shape we depend
 * on. All fields are optional because BE may return either the legacy
 * (just `generalComment`) or the new (with `extraMetrics`) payload.
 */
interface AiFeedbackKeywordDensity {
  [skill: string]: number | undefined;
}
interface AiFeedbackExtraMetrics {
  "Keyword Density"?: AiFeedbackKeywordDensity;
  "Overall CV Match"?: number;
  "Skills Match Score"?: number;
  "Potential Red Flags"?: string[];
  "CV Readability Score"?: number;
  "Education Match Score"?: number;
  "Experience Match Score"?: number;
  [metric: string]: unknown;
}
interface AiFeedbackPayload {
  generalComment?: string;
  strengths?: string[];
  weaknesses?: string[];
  extraMetrics?: AiFeedbackExtraMetrics;
}

interface CvScreeningModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

export function CvScreeningModule({
  round,
  detail,
  applicationId,
  isCompleted,
  isCurrent,
  onSuccess,
}: CvScreeningModuleProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const matchScore = detail?.finalScore ?? detail?.aiScore ?? (isCompleted ? 85 : null);
  // 2026-08-02: extract extra fields from the new BE shape so the UI can
  //   show the AI evaluation breakdown after submission (general comment,
  //   strengths/weaknesses, keyword density, red flags, score breakdown,
  //   uploaded CV file URL, HR note, final result).
  const aiFeedback = (detail as { aiFeedback?: AiFeedbackPayload | null })?.aiFeedback ?? null;
  const fileUrl =
    (detail as { submissionData?: { fileUrl?: string | null } | null })?.submissionData?.fileUrl ??
    null;
  const hrNote = (detail as { hrNote?: string | null })?.hrNote ?? null;
  const finalResult = (detail as { finalResult?: string | null })?.finalResult ?? null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const handleAnalyzeCV = async () => {
    if (!selectedFile && !selectedFileName) {
      toast.error(t("userApplicationhistory.selectCvFirst", "Vui lòng chọn file CV để tải lên"));
      return;
    }

    setAnalyzing(true);
    try {
      const res = await applicationDetailManager.submit({
        applicationId,
        file: selectedFile || undefined,
        textContent: selectedFileName || "CV Submission",
      });

      if (res.success) {
        toast.success(t("userApplicationhistory.cvAnalyzedSuccess", "Phân tích CV thành công!"));
        onSuccess?.();
      } else {
        toast.error(res.error || t("general.anUnknownErrorHasOccurred", "Gửi CV không thành công"));
      }
    } catch (err) {
      console.error("[CvScreeningModule] Submit error:", err);
      toast.error("Có lỗi xảy ra khi nộp CV");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instruction Box */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {t("userApplicationhistory.instructionsTitle", "Hướng dẫn làm bài")}
        </h4>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A]/90 dark:text-slate-300">
          {round.configData?.instruction ||
            t(
              "userApplicationhistory.cvInstructionDefault",
              "Hệ thống AI sẽ tự động phân tích CV của bạn để so sánh mức độ phù hợp (Match Score) với yêu cầu tuyển dụng của doanh nghiệp."
            )}
        </div>
      </div>

      {/* CV Analyzer Workspace */}
      <Card className="overflow-hidden border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Upload Area */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("userApplicationhistory.cvUploadTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("userApplicationhistory.cvUploadFormatHint")}
                </p>
              </div>
            </div>

            {/* Dropzone */}
            {!isCompleted && isCurrent && (
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-colors hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/50">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <Upload className="mb-2 h-8 w-8 text-indigo-500" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedFileName ? (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      📄 {selectedFileName}
                    </span>
                  ) : (
                    t(
                      "userApplicationhistory.dropCvHint",
                      "Kéo thả file CV vào đây hoặc bấm để chọn file"
                    )
                  )}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {t(
                    "userApplicationhistory.autoSyncProfile",
                    "Hoặc sử dụng CV mặc định trong hồ sơ cá nhân"
                  )}
                </p>
              </div>
            )}
          </div>

          {/* AI Match Score Display (Shows Skeleton if CV is not submitted yet) */}
          {analyzing ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 text-center lg:w-56 dark:border-indigo-950/40 dark:bg-indigo-950/20">
              <Sparkles className="mb-2 h-6 w-6 animate-spin text-indigo-500" />
              <Skeleton className="mb-2 h-8 w-24 rounded-lg" />
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Đang phân tích CV bằng AI...
              </span>
            </div>
          ) : matchScore !== null ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/60 p-6 text-center lg:w-56 dark:border-indigo-950/60 dark:bg-indigo-950/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
                <span>{t("userApplicationhistory.cvAiFitScore")}</span>
              </div>
              <p className="mt-2 text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {matchScore}%
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t("userApplicationhistory.cvCompatibilityLevel")}
              </p>
            </div>
          ) : (
            /* Skeleton Placeholder State when CV is not yet uploaded */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 text-center lg:w-56 dark:border-slate-800/60 dark:bg-slate-900/30">
              <Skeleton className="mb-3 h-4 w-28 rounded-md" />
              <Skeleton className="mb-2 h-10 w-20 rounded-xl" />
              <span className="text-[10px] font-medium text-slate-400">
                Tải CV để kích hoạt Match Score
              </span>
            </div>
          )}
        </div>

        {/* Skill Keyword Match Breakdown */}
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {t("userApplicationhistory.cvSkillBreakdown")}
          </h4>

          {matchScore !== null ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                TypeScript / ReactJS
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                REST API & OpenAPI
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Git & CI/CD Basics
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                Docker & Kubernetes (Cần bổ sung)
              </span>
            </div>
          ) : (
            /* Skeleton Placeholder Chips when CV is not submitted */
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-36 rounded-lg" />
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-7 w-28 rounded-lg" />
              <Skeleton className="h-7 w-40 rounded-lg" />
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isCompleted && isCurrent && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleAnalyzeCV}
              disabled={analyzing}
              className="h-9.5 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
              {analyzing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>{t("userApplicationhistory.cvAnalyzeAi")}</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>{t("userApplicationhistory.cvSubmitAi")}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* AI Evaluation Details (only after submission) */}
      {(aiFeedback || fileUrl || hrNote || finalResult) && (
        <Card className="space-y-5 border border-indigo-200/70 bg-gradient-to-br from-indigo-50/40 via-white to-sky-50/40 p-6 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/20 dark:via-slate-900/40 dark:to-sky-950/20">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {t("userApplicationhistory.cvAiEvaluationTitle")}
            </h3>
            {finalResult && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[10px] font-extrabold tracking-wider uppercase",
                  finalResult === "PASSED"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : finalResult === "FAILED"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}>
                {finalResult}
              </span>
            )}
          </div>

          {/* Uploaded CV link */}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              <FileText className="h-3.5 w-3.5" />
              {t("userApplicationhistory.cvViewSubmittedFile")}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* AI General Comment */}
          {aiFeedback?.generalComment && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Lightbulb className="h-3 w-3" />
                {t("userApplicationhistory.cvAiGeneralComment")}
              </h4>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {aiFeedback.generalComment}
              </p>
            </div>
          )}

          {/* Strengths + Weaknesses */}
          {(aiFeedback?.strengths?.length || aiFeedback?.weaknesses?.length) && (
            <div className="grid gap-4 md:grid-cols-2">
              {aiFeedback?.strengths && aiFeedback.strengths.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    <ThumbsUp className="h-3 w-3" />
                    {t("userApplicationhistory.cvAiStrengths")}
                  </h4>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {aiFeedback.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiFeedback?.weaknesses && aiFeedback.weaknesses.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-amber-700 uppercase dark:text-amber-300">
                    <ThumbsDown className="h-3 w-3" />
                    {t("userApplicationhistory.cvAiWeaknesses")}
                  </h4>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {aiFeedback.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Keyword Density */}
          {aiFeedback?.extraMetrics?.["Keyword Density"] && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
              <h4 className="mb-3 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.cvAiKeywordDensity")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(aiFeedback.extraMetrics["Keyword Density"]).map(([kw, count]) => {
                  const n = typeof count === "number" ? count : 0;
                  return (
                    <span
                      key={kw}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold",
                        n > 0
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400"
                      )}>
                      {kw}
                      <span className="font-extrabold tabular-nums">{n}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          {aiFeedback?.extraMetrics && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: t("userApplicationhistory.cvAiOverall"),
                  value: aiFeedback.extraMetrics["Overall CV Match"],
                  max: 100,
                },
                {
                  label: t("userApplicationhistory.cvAiSkillsMatch"),
                  value: aiFeedback.extraMetrics["Skills Match Score"],
                  max: 100,
                },
                {
                  label: t("userApplicationhistory.cvAiReadability"),
                  value: aiFeedback.extraMetrics["CV Readability Score"],
                  max: 100,
                },
                {
                  label: t("userApplicationhistory.cvAiEducationMatch"),
                  value: aiFeedback.extraMetrics["Education Match Score"],
                  max: 100,
                },
                {
                  label: t("userApplicationhistory.cvAiExperienceMatch"),
                  value: aiFeedback.extraMetrics["Experience Match Score"],
                  max: 100,
                },
              ]
                .filter((m) => typeof m.value === "number")
                .map((m) => {
                  const v = typeof m.value === "number" ? m.value : 0;
                  const pct = Math.min(100, Math.max(0, v));
                  return (
                    <div
                      key={m.label}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/40">
                      <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        {m.label}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900 tabular-nums dark:text-white">
                          {v}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">/{m.max}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct >= 70
                              ? "bg-emerald-500"
                              : pct >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Potential Red Flags */}
          {aiFeedback?.extraMetrics?.["Potential Red Flags"] &&
            aiFeedback.extraMetrics["Potential Red Flags"].length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-rose-700 uppercase dark:text-rose-300">
                  <ShieldAlert className="h-3 w-3" />
                  {t("userApplicationhistory.cvAiRedFlags")}
                </h4>
                <ul className="space-y-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {aiFeedback.extraMetrics["Potential Red Flags"].map((flag, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* HR Note */}
          {hrNote && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
              <h4 className="mb-1 text-[11px] font-extrabold tracking-wider text-sky-700 uppercase dark:text-sky-300">
                {t("userApplicationhistory.cvHrNote")}
              </h4>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{hrNote}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
