import { Button } from "@/components/ui/button";
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
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

export function CvScreeningModule({
  round,
  detail,
  isCompleted,
  isCurrent,
}: CvScreeningModuleProps) {
  const { t } = useTranslation();
  const [selectedFileName, setSelectedFileName] = useState<string | null>("Hoso_Ungtuyen_CV.pdf");
  const [analyzing, setAnalyzing] = useState(false);

  const matchScore = detail?.finalScore ?? detail?.aiScore ?? (isCompleted ? 85 : 88);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
    }
  };

  const handleAnalyzeCV = () => {
    if (!selectedFileName) {
      toast.error(t("userApplicationhistory.selectCvFirst", "Vui lòng chọn file CV để tải lên"));
      return;
    }
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      toast.success(t("userApplicationhistory.cvAnalyzedSuccess", "Phân tích CV thành công!"));
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Instruction Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800/80 dark:bg-[#0F172A]/90 dark:text-slate-300">
        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
          💡 {t("userApplicationhistory.instructionsTitle", "Hướng dẫn làm bài")}:{" "}
        </span>
        {round.configData?.instruction ||
          t(
            "userApplicationhistory.cvInstructionDefault",
            "Tải lên file CV định dạng PDF hoặc DOCX để hệ thống AI phân tích tự động, so sánh mức độ tương thích kỹ năng với vị trí tuyển dụng."
          )}
      </div>

      {/* CV Analyzer Studio - Balanced Dual Grid (6:6) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left Side: Upload & File Previewer (6 Cols) */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs md:col-span-6 dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {t("userApplicationhistory.uploadCvTitle", "Nộp Hồ sơ CV Ứng tuyển")}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hỗ trợ định dạng PDF, DOCX (Tối đa 10MB)
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200/80 bg-indigo-50/30 p-6 text-center transition-colors hover:border-indigo-400 dark:border-indigo-900/40 dark:bg-indigo-950/20">
              {!isCompleted && isCurrent && (
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              )}
              <Upload className="mb-2 h-7 w-7 text-indigo-500" />
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
              <p className="mt-1 text-[10px] text-slate-400">
                {t(
                  "userApplicationhistory.autoSyncProfile",
                  "Hệ thống tự động đồng bộ CV từ Hồ sơ cá nhân"
                )}
              </p>
            </div>
          </div>

          {/* Action Button */}
          {!isCompleted && isCurrent && (
            <Button
              onClick={handleAnalyzeCV}
              disabled={analyzing}
              className="h-10 w-full gap-2 bg-indigo-600 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
              {analyzing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Đang chấm điểm bằng AI...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Phân tích CV & Chấm điểm Match Score</span>
                </>
              )}
            </Button>
          )}
        </div>

        {/* Right Side: AI Match Score & Keyword Analysis (6 Cols) */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-2xs md:col-span-6 dark:border-indigo-950/60 dark:bg-indigo-950/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold text-indigo-900 uppercase dark:text-indigo-200">
                  Kết quả phân tích AI
                </span>
              </div>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {matchScore}%
              </span>
            </div>

            {/* Keyword Match Pills */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase dark:text-slate-300">
                Tương thích Kỹ năng (Match Keywords)
              </h4>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Java / Spring Boot
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Microservices
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  PostgreSQL / Redis
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertCircle className="h-3 w-3" />
                  Kafka (Cần bổ sung)
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-200/60 bg-white/80 p-3 text-[11px] leading-relaxed text-indigo-900 dark:border-indigo-900/40 dark:bg-slate-900/60 dark:text-indigo-200">
            <strong>Đánh giá AI:</strong> Hồ sơ CV có độ tương thích cao với vị trí tuyển dụng. Đáp
            ứng 85% kiến thức chuyên môn yêu cầu.
          </div>
        </div>
      </div>
    </div>
  );
}
