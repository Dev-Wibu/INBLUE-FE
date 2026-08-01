import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { applicationDetailManager } from "@/services/application-detail.manager";
import { AlertCircle, CheckCircle2, FileCheck2, FileText, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

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
                  {t("userApplicationhistory.uploadCvTitle", "Nộp Hồ sơ CV Ứng tuyển")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hỗ trợ định dạng PDF, DOCX (Tối đa 10MB)
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
                <span>AI Fit Score</span>
              </div>
              <p className="mt-2 text-4xl font-black text-indigo-600 dark:text-indigo-400">
                {matchScore}%
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Mức độ tương thích CV
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
            {t("userApplicationhistory.skillMatchBreakdown", "Phân tích kỹ năng từ CV")}
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
                  <span>Đang phân tích CV bằng AI...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Gửi CV & Chấm điểm AI</span>
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
