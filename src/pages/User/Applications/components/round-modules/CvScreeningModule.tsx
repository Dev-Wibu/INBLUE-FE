import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { applicationDetailManager } from "@/services/application-detail.manager";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Sparkles,
  Tag,
  Upload,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { components } from "../../../../../../schema-from-be";
import type { JdRound } from "../HorizontalPipeline";
import type { JdInfoPayload } from "../RoundWorkspaceDispatcher";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

export interface AiFeedbackPayload {
  generalComment?: string;
  strengths?: string[];
  weaknesses?: string[];
  extraMetrics?: {
    "Overall CV Match"?: number;
    "Skills Match Score"?: number;
    "CV Readability Score"?: number;
    "Education Match Score"?: number;
    "Experience Match Score"?: number;
    "Keyword Density"?: Record<string, number>;
    "Potential Red Flags"?: string[];
  };
}

interface CvScreeningModuleProps {
  round: JdRound;
  detail?: ApplicationDetail;
  applicationId: number;
  jdInfo?: JdInfoPayload | null;
  isCompleted: boolean;
  isCurrent: boolean;
  onSuccess?: () => void;
}

function getCompanyInitials(name?: string): string {
  if (!name) return "CO";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function CompanyAvatar({
  logoUrl,
  companyName,
  className = "h-9 w-9 rounded-xl",
  textClassName = "text-xs font-bold",
}: {
  logoUrl?: string | null;
  companyName?: string;
  className?: string;
  textClassName?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = getCompanyInitials(companyName);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-100 bg-slate-50 text-indigo-600 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A] dark:text-indigo-400 ${className}`}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={companyName || "Logo"}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </div>
  );
}

export function CvScreeningModule({
  round,
  detail,
  applicationId,
  jdInfo,
  isCompleted,
  isCurrent,
  onSuccess,
}: CvScreeningModuleProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "strengths" | "redflags">("overview");

  // Safe parse aiFeedback JSON if object or string
  const aiFeedback = useMemo<AiFeedbackPayload | null>(() => {
    if (!detail?.aiFeedback) return null;
    if (typeof detail.aiFeedback === "object") {
      return detail.aiFeedback as AiFeedbackPayload;
    }
    try {
      return JSON.parse(detail.aiFeedback as string) as AiFeedbackPayload;
    } catch {
      return null;
    }
  }, [detail?.aiFeedback]);

  // Extract Cloudinary / Submission File URL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissionData = detail?.submissionData as any;
  const fileUrl = submissionData?.fileUrl || submissionData?.url || null;

  const matchScore = detail?.finalScore ?? detail?.aiScore ?? (isCompleted ? 85 : null);

  const extraMetrics = aiFeedback?.extraMetrics;
  const keywordDensity = extraMetrics?.["Keyword Density"] || {};
  const redFlags = extraMetrics?.["Potential Red Flags"] || [];
  const strengths = aiFeedback?.strengths || [];
  const weaknesses = aiFeedback?.weaknesses || [];

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

      {/* Pure 2-Column Studio Grid Layout (7:5 Ratio - No Nested Grid Void) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Side (7 Cols): Document Viewer / Upload Dropzone */}
        <Card className="flex flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Hồ sơ CV Ứng tuyển
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {fileUrl ? "Đã nộp & Phân tích AI" : "Hỗ trợ PDF, DOCX (Tối đa 10MB)"}
                </p>
              </div>
            </div>

            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-indigo-400">
                <Download className="h-3.5 w-3.5" />
                <span>Tải CV</span>
              </a>
            )}
          </div>

          {/* Document Previewer or Dropzone */}
          {fileUrl ? (
            <div className="flex-1 space-y-3">
              <div className="relative h-[620px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/90 shadow-inner dark:border-slate-800">
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  title="CV Document Preview"
                  className="h-full w-full border-none"
                />
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md hover:bg-black/80">
                  <ExternalLink className="h-3 w-3" />
                  <span>Mở tab mới</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-between space-y-4">
              {!isCompleted && isCurrent && (
                <div className="relative flex min-h-[380px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-colors hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/50">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <Upload className="mb-3 h-10 w-10 text-indigo-500" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedFileName ? (
                      <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
                        📄 {selectedFileName}
                      </span>
                    ) : (
                      t(
                        "userApplicationhistory.dropCvHint",
                        "Kéo thả file CV vào đây hoặc bấm để chọn file"
                      )
                    )}
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {t(
                      "userApplicationhistory.autoSyncProfile",
                      "Hoặc sử dụng CV mặc định trong hồ sơ cá nhân"
                    )}
                  </p>
                </div>
              )}

              {!isCompleted && isCurrent && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleAnalyzeCV}
                    disabled={analyzing}
                    className="h-10 gap-2 bg-indigo-600 px-6 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
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
            </div>
          )}
        </Card>

        {/* Right Side (5 Cols): Job Context & Requirements + AI Keyword Visualizer + Gauge Score */}
        <div className="space-y-6 lg:col-span-5">
          {/* Card 1: Enterprise Job Context & Requirements Inspector (Đối chiếu Yêu cầu Tuyển dụng) */}
          <Card className="space-y-3.5 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
              <CompanyAvatar
                logoUrl={jdInfo?.logoUrl}
                companyName={jdInfo?.companyName}
                className="h-10 w-10 rounded-[12px]"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {jdInfo?.companyName}
                </h3>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {jdInfo?.title}
                </p>
              </div>
            </div>

            {/* Job Requirements Info Box */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Yêu cầu Tuyển dụng Đối chiếu:</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                {jdInfo?.requirements ||
                  jdInfo?.description ||
                  "Yêu cầu tối thiểu 1+ năm kinh nghiệm Java / Spring Boot, thành thạo REST API, SQL và có tư duy thiết kế hệ thống vững chắc."}
              </div>
            </div>
          </Card>

          {/* Card 2: Live AI Keyword Matching Visualizer */}
          <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Live AI Keyword Matching Visualizer</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Tỉ lệ từ khóa</span>
            </div>

            {Object.keys(keywordDensity).length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(keywordDensity).map(([kw, count]) => {
                  const isMatched = count > 0;
                  return (
                    <span
                      key={kw}
                      className={
                        isMatched
                          ? "inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500"
                      }>
                      {isMatched ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {kw} {isMatched ? `(${count})` : "(0)"}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <Skeleton className="h-7 w-28 rounded-lg" />
                <Skeleton className="h-7 w-24 rounded-lg" />
                <Skeleton className="h-7 w-32 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            )}
          </Card>

          {/* Card 3: Match Gauge Score Breakdown */}
          <Card className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Match Gauge Score</span>
              </div>
              {detail?.finalResult && (
                <span
                  className={
                    detail.finalResult === "PASSED"
                      ? "rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }>
                  {detail.finalResult}
                </span>
              )}
            </div>

            {matchScore !== null ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-center">
                {/* Big Score Ring */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-center sm:col-span-5 dark:border-indigo-950/60 dark:bg-indigo-950/30">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase dark:text-indigo-400">
                    MATCH SCORE
                  </span>
                  <p className="mt-1 text-3xl font-black text-indigo-600 dark:text-indigo-400">
                    {matchScore}%
                  </p>
                  <span className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {matchScore >= 70 ? "Phù hợp Cao" : "Cần Cải Thiện"}
                  </span>
                </div>

                {/* Sub-Metrics Progress Bars */}
                <div className="space-y-2 text-xs sm:col-span-7">
                  {extraMetrics ? (
                    <>
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span>Kỹ năng (Skills):</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {extraMetrics["Skills Match Score"] ?? 60}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${extraMetrics["Skills Match Score"] ?? 60}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span>Học vấn (Education):</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {extraMetrics["Education Match Score"] ?? 60}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${extraMetrics["Education Match Score"] ?? 60}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          <span>Trình bày CV (Readability):</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {extraMetrics["CV Readability Score"] ?? 90}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${extraMetrics["CV Readability Score"] ?? 90}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-full rounded-md" />
                      <Skeleton className="h-3 w-full rounded-md" />
                      <Skeleton className="h-3 w-full rounded-md" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/50 p-6 text-center dark:border-slate-800/60 dark:bg-slate-900/30">
                <Skeleton className="mb-3 h-4 w-28 rounded-md" />
                <Skeleton className="mb-2 h-10 w-20 rounded-xl" />
                <span className="text-[10px] font-medium text-slate-400">
                  Tải CV để kích hoạt Match Score
                </span>
              </div>
            )}
          </Card>

          {/* Card 4: AI Assessment & HR Review Notes Accordion */}
          <Card className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    activeTab === "overview"
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}>
                  Tổng quan AI
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("strengths")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                    activeTab === "strengths"
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  }`}>
                  Điểm mạnh & Yếu
                </button>
                {redFlags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("redflags")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                      activeTab === "redflags"
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    }`}>
                    Cảnh báo ({redFlags.length})
                  </button>
                )}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-slate-700 dark:border-slate-800/80 dark:bg-slate-800/40 dark:text-slate-300">
                  <p className="mb-1 font-semibold text-slate-900 dark:text-white">
                    🤖 AI General Comment:
                  </p>
                  <p>
                    {aiFeedback?.generalComment ||
                      "Vui lòng nộp CV để nhận đánh giá chi tiết từ AI."}
                  </p>
                </div>

                {detail?.hrNote && (
                  <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                    <p className="mb-0.5 font-bold text-indigo-900 dark:text-indigo-300">
                      👤 Nhận xét từ Hội đồng HR:
                    </p>
                    <p className="text-indigo-800 dark:text-indigo-300">{detail.hrNote}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "strengths" && (
              <div className="space-y-3 text-xs">
                {strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Điểm mạnh nổi bật:
                    </p>
                    <ul className="space-y-1 pl-1 text-slate-700 dark:text-slate-300">
                      {strengths.map((st, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="font-bold text-emerald-500">•</span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {weaknesses.length > 0 && (
                  <div className="space-y-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <p className="font-bold text-amber-600 dark:text-amber-400">
                      ⚠️ Điểm cần bổ sung & Cải thiện:
                    </p>
                    <ul className="space-y-1 pl-1 text-slate-700 dark:text-slate-300">
                      {weaknesses.map((wk, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="font-bold text-amber-500">•</span>
                          <span>{wk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "redflags" && (
              <div className="space-y-2 text-xs">
                <p className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Các yếu tố rủi ro tiềm ẩn (Red Flags):</span>
                </p>
                <div className="space-y-2">
                  {redFlags.map((rf, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                      {rf}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
