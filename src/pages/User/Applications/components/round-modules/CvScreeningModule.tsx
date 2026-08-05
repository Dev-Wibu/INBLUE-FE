import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applicationDetailManager } from "@/services/application-detail.manager";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  ShieldAlert,
  Sparkles,
  Tag,
  Upload,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
  className = "h-8 w-8 rounded-xl",
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
      className={`flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-white text-indigo-600 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800 dark:text-indigo-400 ${className}`}>
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

/** Linear/Stripe Style Modern Circular SVG Gauge Clock */
function ModernGaugeClock({
  score,
  label,
  color = "indigo",
  hasData = true,
}: {
  score: number;
  label: string;
  color?: "indigo" | "emerald";
  hasData?: boolean;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const displayScore = hasData ? Math.min(100, Math.max(0, score)) : 0;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const styles =
    color === "emerald"
      ? {
          ring: "text-emerald-500 dark:text-emerald-400",
          text: "text-emerald-600 dark:text-emerald-400",
          bg: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-950/20",
        }
      : {
          ring: "text-indigo-500 dark:text-indigo-400",
          text: "text-indigo-600 dark:text-indigo-400",
          bg: "border-indigo-200 bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-950/20",
        };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${styles.bg}`}>
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="7"
            className="text-slate-200 dark:text-slate-800"
            fill="transparent"
          />
          {hasData && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth="7"
              className={`${styles.ring} transition-all duration-1000 ease-out`}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            className={`text-xl font-black tracking-tight ${hasData ? styles.text : "text-slate-500"}`}>
            {hasData ? `${displayScore}%` : "--"}
          </span>
          <span className="text-[8px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {label}
          </span>
        </div>
      </div>
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  // Strict check if real AI feedback or submission exists
  const hasAiData = Boolean(
    fileUrl ||
    detail?.aiFeedback ||
    detail?.aiScore !== undefined ||
    detail?.finalScore !== undefined ||
    isCompleted
  );

  const aiScoreVal = detail?.aiScore ?? detail?.finalScore ?? (isCompleted ? 85 : 0);
  const hrScoreVal = detail?.hrScore ?? detail?.finalScore ?? (isCompleted ? 85 : 0);

  const extraMetrics = aiFeedback?.extraMetrics;
  const keywordDensity = extraMetrics?.["Keyword Density"] || {};
  const redFlags = extraMetrics?.["Potential Red Flags"] || [];
  const strengths = aiFeedback?.strengths || [];
  const weaknesses = aiFeedback?.weaknesses || [];

  // Count matched keywords for coverage ratio
  const matchedKeywordsCount = useMemo(() => {
    return Object.values(keywordDensity).filter((c) => c > 0).length;
  }, [keywordDensity]);
  const totalKeywordsCount = useMemo(() => Object.keys(keywordDensity).length, [keywordDensity]);
  const keywordCoveragePct = useMemo(() => {
    if (!hasAiData || totalKeywordsCount === 0) return null;
    return Math.round((matchedKeywordsCount / totalKeywordsCount) * 100);
  }, [hasAiData, matchedKeywordsCount, totalKeywordsCount]);

  // Parse Requirements string into clean individual line items
  const parsedRequirements = useMemo(() => {
    const raw = jdInfo?.requirements || jdInfo?.description || "";
    if (!raw.trim()) {
      return [
        "1+ năm kinh nghiệm lập trình Java / Spring Boot",
        "Thành thạo REST API, SQL và thiết kế Database",
        "Có tư duy thiết kế hệ thống và làm việc nhóm tốt",
      ];
    }
    return raw
      .split(/\r?\n/)
      .map((line) => line.replace(/^[\s•*-]+/, "").trim())
      .filter((line) => line.length > 0);
  }, [jdInfo?.requirements, jdInfo?.description]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!selectedFile && !selectedFileName) {
      // Open file browser if no file selected yet
      fileInputRef.current?.click();
    } else {
      // Analyze CV if file is selected
      handleAnalyzeCV();
    }
  };

  const handleAnalyzeCV = async () => {
    if (!selectedFile && !selectedFileName) {
      fileInputRef.current?.click();
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
      {/* 🌟 Single Unified Top Storyline Banner (Consolidated Instruction & Report Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {fileUrl || isCompleted
                  ? "BÁO CÁO ĐÁNH GIÁ CV HỒ SƠ AI"
                  : "VÒNG 1: LỌC CV • HƯỚNG DẪN LÀM BÀI"}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-semibold text-indigo-400">Vòng 1: Lọc CV</span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
              {fileUrl || isCompleted
                ? detail?.finalResult === "PASSED" || isCompleted
                  ? "Ứng viên đạt yêu cầu lọc hồ sơ và đủ điều kiện bước vào vòng đánh giá tiếp theo."
                  : "Hồ sơ đã nộp thành công, hệ thống AI đã trích xuất báo cáo phân tích."
                : round.configData?.instruction ||
                  t(
                    "userApplicationhistory.cvInstructionDefault",
                    "Vui lòng tải lên CV định dạng PDF của bạn. Hệ thống AI sẽ tự động phân tích hồ sơ và so sánh mức độ phù hợp (Match Score) với yêu cầu tuyển dụng."
                  )}
            </p>
          </div>
        </div>

        {/* Action Status Pill */}
        <div className="flex items-center gap-2">
          {detail?.finalResult ? (
            <span
              className={
                detail.finalResult === "PASSED"
                  ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-xs font-extrabold text-emerald-700 shadow-sm shadow-emerald-100 dark:text-emerald-300 dark:shadow-emerald-950/40"
                  : "inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-4 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm shadow-rose-100 dark:text-rose-300 dark:shadow-rose-950/40"
              }>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>KẾT QUẢ: {detail.finalResult}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-4 py-1.5 text-xs font-extrabold text-indigo-700 shadow-sm shadow-indigo-100 dark:text-indigo-300 dark:shadow-indigo-950/40">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>{fileUrl ? "ĐÃ NỘP CV" : "SẮN SÀNG PHÂN TÍCH"}</span>
            </span>
          )}
        </div>
      </div>

      {/* 📐 3-Column Redesigned Layout (Left 30% | Center 45% | Right 25%) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* 📄 LEFT COLUMN (30% - lg:col-span-4): Supporting Resume Preview (Sticky) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:col-span-4">
          <Card className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <FileCheck2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Hồ sơ CV (Trang 1/1)
                  </h3>
                  <p className="text-[10px] text-slate-400">Tài liệu minh chứng</p>
                </div>
              </div>

              {fileUrl && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700">
                    <ExternalLink className="h-3 w-3" />
                    <span>Mở tab mới</span>
                  </a>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20">
                    <Download className="h-3 w-3" />
                    <span>Tải CV</span>
                  </a>
                </div>
              )}
            </div>

            {/* Document Preview Canvas (First Page Focus) */}
            {fileUrl ? (
              <div className="space-y-2">
                <div className="relative h-[600px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                  <iframe
                    src={`${fileUrl}#toolbar=0&navpanes=0&view=FitH`}
                    title="Resume Preview"
                    className="h-full w-full rounded-xl border-none bg-white dark:bg-slate-950"
                  />
                </div>
                <p className="text-center text-[10px] text-slate-500">
                  Bản xem trước CV. Nhấn nút "Mở tab mới" để đọc toàn bộ tài liệu full-screen.
                </p>
              </div>
            ) : (
              <div className="flex min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
                {!isCompleted && isCurrent ? (
                  <div className="relative flex min-h-[300px] w-full flex-1 flex-col items-center justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={handleFileChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                    <Upload className="pointer-events-none mb-3 h-9 w-9 text-indigo-400" />
                    <p className="pointer-events-none text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedFileName ? (
                        <span className="font-mono text-xs text-indigo-400">
                          📄 {selectedFileName}
                        </span>
                      ) : (
                        t(
                          "userApplicationhistory.dropCvHint",
                          "Kéo thả file CV vào đây hoặc bấm để chọn"
                        )
                      )}
                    </p>
                    <p className="pointer-events-none mt-1 text-[10px] text-slate-500">
                      Hỗ trợ định dạng PDF, DOCX (Tối đa 10MB)
                    </p>
                    <Button
                      type="button"
                      onClick={handleButtonClick}
                      disabled={analyzing}
                      className="relative z-10 mt-4 h-9 gap-2 bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-700">
                      {!selectedFileName ? (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          <span>Chọn file CV để nộp</span>
                        </>
                      ) : analyzing ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 animate-spin" />
                          <span>Đang chấm AI...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-3.5 w-3.5" />
                          <span>Gửi CV & Chấm điểm AI</span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Chưa nộp file CV</span>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* 🧠 CENTER COLUMN (45% - lg:col-span-5): Main Storytelling Area */}
        <div className="space-y-5 lg:col-span-5">
          {/* SECTION 1: AI Executive Summary (Priority 1 - Notion AI Theme) */}
          <Card className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <Bot className="h-4 w-4" />
                </div>
                <h3 className="text-xs font-extrabold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                  BÁO CÁO TỔNG QUAN AI
                </h3>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-extrabold text-indigo-700 shadow-xs dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
                <span>ĐỀ XUẤT TỪ AI</span>
              </span>
            </div>

            <p className="text-sm leading-relaxed font-normal text-slate-700 dark:text-slate-200">
              {aiFeedback?.generalComment ||
                (hasAiData
                  ? "Báo cáo phân tích đang được cập nhật..."
                  : "Vui lòng tải lên CV ứng tuyển để hệ thống AI tự động chấm điểm và trích xuất báo cáo tổng quan.")}
            </p>
          </Card>

          {/* SECTION 2: Strengths Card (Priority 2 - Green Theme) */}
          <Card className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                Điểm mạnh nổi bật
              </h4>
            </div>

            {strengths.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {strengths.map((st, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="leading-relaxed">{st}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {hasAiData ? "Chưa ghi nhận điểm mạnh nổi bật." : "Chưa có dữ liệu (Cần nộp CV)"}
              </p>
            )}
          </Card>

          {/* SECTION 3: Weaknesses Card (Priority 2 - Orange/Amber Theme) */}
          <Card className="space-y-3 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                Điểm cần bổ sung & Cải thiện
              </h4>
            </div>

            {weaknesses.length > 0 ? (
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                {weaknesses.map((wk, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="leading-relaxed">{wk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {hasAiData ? "Chưa ghi nhận điểm yếu cần bổ sung." : "Chưa có dữ liệu (Cần nộp CV)"}
              </p>
            )}
          </Card>

          {/* SECTION 4: Red Flags Card (Highest Visual Emphasis - Red Theme) */}
          {redFlags.length > 0 && (
            <Card className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-sm ring-1 ring-rose-100 dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none dark:ring-0">
              <div className="flex items-center gap-2 border-b border-rose-200 pb-2.5 dark:border-rose-500/30">
                <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-md border border-rose-300 bg-rose-100 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold tracking-wider text-rose-700 uppercase dark:text-rose-300">
                  Cảnh báo rủi ro tiềm ẩn
                </h4>
              </div>

              <div className="space-y-2">
                {redFlags.map((rf, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-white p-3 text-sm leading-relaxed text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-200">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{rf}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* SECTION 5: HR Feedback Card (Styled like a Linear Human Comment) */}
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <UserCheck className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold tracking-wider text-indigo-700 uppercase dark:text-indigo-300">
                  NHẬN XÉT TRỰC TIẾP TỪ HỘI ĐỒNG HR
                </h4>
              </div>

              <span className="text-[10px] font-medium text-slate-400">HR ĐÁNH GIÁ</span>
            </div>

            {detail?.hrNote ? (
              <div className="rounded-xl border-l-2 border-indigo-500 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 italic dark:bg-slate-950/60 dark:text-slate-200">
                "{detail.hrNote}"
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có ghi chú trực tiếp từ Hội đồng tuyển dụng HR.
              </p>
            )}
          </Card>
        </div>

        {/* 📊 RIGHT COLUMN (25% - lg:col-span-3): Compact Analytics & ATS Insight Panel */}
        <div className="space-y-5 lg:col-span-3">
          {/* WIDGET 1: Modern Dual Match Score Clocks (AI Score & HR Score) */}
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Chỉ số Match Score
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">AI vs HR</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ModernGaugeClock
                score={aiScoreVal}
                label="AI Score"
                color="indigo"
                hasData={hasAiData}
              />
              <ModernGaugeClock
                score={hrScoreVal}
                label="HR Score"
                color="emerald"
                hasData={hasAiData}
              />
            </div>

            {/* WIDGET 2: Full 5-Metrics Criteria Breakdown Progress Bars */}
            <div className="space-y-2.5 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Phân tích tiêu chí chi tiết
              </span>

              {/* 1. Overall CV Match */}
              <div>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Độ phù hợp tổng thể:</span>
                  <span className={`font-bold ${hasAiData ? "text-indigo-400" : "text-slate-500"}`}>
                    {hasAiData
                      ? `${extraMetrics?.["Overall CV Match" as keyof typeof extraMetrics] ?? aiScoreVal}%`
                      : "--"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{
                      width: `${hasAiData ? ((extraMetrics?.["Overall CV Match" as keyof typeof extraMetrics] as number) ?? aiScoreVal) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 2. Skills Match Score */}
              <div>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Kỹ năng chuyên môn:</span>
                  <span className={`font-bold ${hasAiData ? "text-violet-400" : "text-slate-500"}`}>
                    {hasAiData
                      ? `${extraMetrics?.["Skills Match Score" as keyof typeof extraMetrics] ?? 0}%`
                      : "--"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{
                      width: `${hasAiData ? ((extraMetrics?.["Skills Match Score" as keyof typeof extraMetrics] as number) ?? 0) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 3. Experience Match Score */}
              <div>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Kinh nghiệm làm việc:</span>
                  <span className={`font-bold ${hasAiData ? "text-amber-400" : "text-slate-500"}`}>
                    {hasAiData
                      ? `${extraMetrics?.["Experience Match Score" as keyof typeof extraMetrics] ?? 0}%`
                      : "--"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    style={{
                      width: `${hasAiData ? ((extraMetrics?.["Experience Match Score" as keyof typeof extraMetrics] as number) ?? 0) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 4. Education Match Score */}
              <div>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Trình độ học vấn:</span>
                  <span
                    className={`font-bold ${hasAiData ? "text-emerald-400" : "text-slate-500"}`}>
                    {hasAiData
                      ? `${extraMetrics?.["Education Match Score" as keyof typeof extraMetrics] ?? 0}%`
                      : "--"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                    style={{
                      width: `${hasAiData ? ((extraMetrics?.["Education Match Score" as keyof typeof extraMetrics] as number) ?? 0) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* 5. CV Readability Score */}
              <div>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Trình bày & Cấu trúc:</span>
                  <span className={`font-bold ${hasAiData ? "text-blue-400" : "text-slate-500"}`}>
                    {hasAiData
                      ? `${extraMetrics?.["CV Readability Score" as keyof typeof extraMetrics] ?? 0}%`
                      : "--"}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-500"
                    style={{
                      width: `${hasAiData ? ((extraMetrics?.["CV Readability Score" as keyof typeof extraMetrics] as number) ?? 0) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* WIDGET 3: ATS Keyword Matching Cloud */}
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Từ khóa ATS
                </h4>
              </div>
              {/* Prominent High-Contrast ATS Match Percentage Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-extrabold ${
                  hasAiData && keywordCoveragePct !== null
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 shadow-xs shadow-emerald-100 dark:text-emerald-300 dark:shadow-emerald-950/40"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950"
                }`}>
                {hasAiData && keywordCoveragePct !== null
                  ? `${matchedKeywordsCount}/${totalKeywordsCount} (${keywordCoveragePct}%)`
                  : "Chờ nộp CV"}
              </span>
            </div>

            {Object.keys(keywordDensity).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(keywordDensity).map(([kw, count]) => {
                  const isMatched = count > 0;
                  return (
                    <span
                      key={kw}
                      className={
                        isMatched
                          ? "inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 shadow-2xs dark:text-emerald-300"
                          : "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950"
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
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-center text-[11px] text-slate-500 dark:border-slate-800/60 dark:bg-slate-950/60">
                {hasAiData
                  ? "Chưa trích xuất từ khóa ATS từ CV."
                  : "Vui lòng tải lên CV để hệ thống phân tích mật độ từ khóa."}
              </div>
            )}
          </Card>

          {/* WIDGET 4: Job Requirements Matrix (Full Length - No Inner Scrollbar!) */}
          <Card className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <CompanyAvatar
                logoUrl={jdInfo?.logoUrl}
                companyName={jdInfo?.companyName}
                className="h-8 w-8 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                  {jdInfo?.companyName}
                </h4>
                <p className="truncate text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {jdInfo?.title}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800/60">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Độ khớp Yêu cầu</span>
                </span>
                {/* Prominent High-Contrast Requirement Coverage Percentage Badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 font-mono text-xs font-extrabold ${
                    hasAiData && keywordCoveragePct !== null
                      ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-700 shadow-xs shadow-indigo-100 dark:text-indigo-300 dark:shadow-indigo-950/40"
                      : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950"
                  }`}>
                  {hasAiData && keywordCoveragePct !== null
                    ? `${keywordCoveragePct}% Match`
                    : "--%"}
                </span>
              </div>

              {/* Full Length Individual Line Item Badge List (No Max Height or Inner Scrollbar!) */}
              <div className="space-y-2">
                {parsedRequirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs leading-relaxed text-slate-700 shadow-2xs transition-colors hover:border-indigo-200 dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:border-indigo-500/30">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
