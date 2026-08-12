import { ReloadButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { CodeReviewGrader } from "@/components/ui/code-review-grader";
import { CodingRoundGrader } from "@/components/ui/coding-round-grader";
import { EmailPreviewDialog } from "@/components/ui/email-preview-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useApplication, useApplications, useUsers } from "@/hooks/useApplication";
import {
  useApplicationDetail,
  useApplicationDetails,
  useApplicationDetailsForReviewer,
  useHrScore,
} from "@/hooks/useApplicationDetails";
import { useCodeReviewProblems } from "@/hooks/useCodeReviewProblems";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import { useJobDescription, useJobDescriptions } from "@/hooks/useJobDescription";
import { usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import {
  filterOutAutoGradedRounds,
  inferRoundType,
  needsHrScoring,
} from "@/lib/application-detail-utils";
import { formatDateTime } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Mail,
  Search,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";
const t = (k: string, opts?: string | Record<string, unknown>): string =>
  i18n.t(k, opts as string) as unknown as string;

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type SubmissionData = components["schemas"]["SubmissionData"];
type AiFeedback = components["schemas"]["AiFeedback"];

// Unified display type for both Admin and Staff
interface GradingListItem {
  id: number;
  jdId?: number;
  status: string;
  currentRoundOrder?: number;
  overallScore?: number;
  userId?: number;
  userName?: string;
  userAvatar?: string;
  applicationName?: string;
  createdAt?: string;
  // Staff-only fields
  detailId?: number;
  detailStatus?: string;
  detail?: ApplicationDetail;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot?: string }> = {
  PENDING: {
    label: t("status.pendingSubmit"),
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  SUBMITTED: {
    label: t("adminQuizsetmanagement.submitted"),
    className: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  AI_EVALUATED: {
    label: t("status.aiGraded"),
    className: "bg-purple-500/15 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  COMPLETED: {
    label: t("general.completed"),
    className: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  ERROR: {
    label: t("common.error"),
    className: "bg-red-500/15 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    dot: "bg-red-500",
  },
  // Staff-only: rounds that AI has graded but still need HR scoring
  NEEDS_HR_SCORING: {
    label: t("status.aiGradedNeedsHr"),
    className: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};

// ============================================================
// Embedded CV & Document In-Page Viewer
// ============================================================

function EmbeddedCVViewer({ fileUrl }: { fileUrl: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Extract clean filename from fileUrl
  const fileName = useMemo(() => {
    try {
      const url = new URL(fileUrl);
      const name = url.pathname.split("/").pop() || "Candidate_CV.pdf";
      return decodeURIComponent(name);
    } catch {
      return "Candidate_CV.pdf";
    }
  }, [fileUrl]);

  const fileExt = useMemo(() => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext || "pdf";
  }, [fileName]);

  const isImage = ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(fileExt);
  const isOfficeDoc = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(fileExt);

  // Use Google Docs Embedded Viewer for docx/ppt files so they render natively
  const viewerUrl = isOfficeDoc
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : fileUrl;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Viewer Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{fileName}</p>
            <span className="inline-block text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
              {fileExt.toUpperCase()} Document
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {isExpanded ? "Thu gọn" : "Mở rộng chiều cao"}
          </Button>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700">
            <ExternalLink className="h-3.5 w-3.5" />
            Mở tab mới
          </a>
        </div>
      </div>

      {/* Embedded Document Viewport */}
      <div
        className={cn(
          "relative w-full bg-slate-900/5 transition-all duration-300 dark:bg-slate-950/40",
          isExpanded ? "h-[850px]" : "h-[620px]"
        )}>
        {isImage ? (
          <div className="flex h-full items-center justify-center p-4">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-full max-w-full rounded-xl object-contain shadow-md"
            />
          </div>
        ) : !hasError ? (
          <iframe
            src={viewerUrl}
            className="h-full w-full rounded-b-2xl border-0 bg-white dark:bg-slate-900"
            title={fileName}
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <FileText className="h-12 w-12 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Không thể tải bản xem trước CV trực tiếp.
            </p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md">
              <ExternalLink className="h-4 w-4" />
              Tải / Xem file CV trong tab mới
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Submission Preview
// ============================================================

interface SubmissionPreviewProps {
  detail: ApplicationDetail;
  jdId?: number;
  onViewEmailSubmission?: (_emailSubmissionId: number) => void;
}

function SubmissionPreview({ detail, jdId, onViewEmailSubmission }: SubmissionPreviewProps) {
  const data = detail.submissionData as SubmissionData | undefined;
  const [localExpanded, setLocalExpanded] = useState(false);

  // Fetch code review problems for CODE_REVIEW round
  const { data: codeReviewProblems = [], isLoading: isLoadingCodeReview } = useCodeReviewProblems(
    jdId ?? 0,
    detail.roundId
  );

  const emailSubmissionId = data?.emailSubmissionId;

  // Fetch email content when textContent is empty but emailSubmissionId exists
  const { data: emailData, isLoading: isLoadingEmail } = useEmailSubmission(
    emailSubmissionId ?? 0,
    Boolean(emailSubmissionId && emailSubmissionId > 0 && !data?.textContent)
  );

  if (!data) return null;

  // Build text content from either submitted text or fetched email
  const textContent = data.textContent || emailData?.bodyText || "";

  // Email content (from submitted text OR from fetched email)
  if (textContent || isLoadingEmail) {
    const isEmail =
      textContent.includes("To:") ||
      textContent.includes("Subject:") ||
      textContent.includes(t("email.dear")) ||
      textContent.includes("Dear");
    const lines = textContent.split("\n");
    const shouldTruncate = lines.length > 12;
    const displayLines = localExpanded ? lines : lines.slice(0, 12);

    return (
      <div className="space-y-3">
        {/* Email type indicator */}
        {isEmail && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {t("email.submissionEmail")}
            </span>
          </div>
        )}

        {/* Loading state for email fetch */}
        {isLoadingEmail ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ) : (
          <>
            {/* Email content */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              {displayLines.map((line, i) => (
                <p
                  key={i}
                  className={cn(
                    "text-sm text-slate-700 dark:text-slate-300",
                    line.trim() === "" ? "h-2" : ""
                  )}>
                  {line}
                </p>
              ))}
              {shouldTruncate && !localExpanded && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-700">
                  ... +{lines.length - 12} {t("general.linesRemaining")}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Expand/Collapse email */}
              {shouldTruncate && (
                <button
                  type="button"
                  onClick={() => setLocalExpanded(!localExpanded)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5",
                    "text-xs font-medium transition-colors",
                    localExpanded
                      ? "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                  )}>
                  {localExpanded ? (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                      {t("common.collapse")}
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" />
                      {t("general.viewFull")}
                      {lines.length} {t("compCodeSubmissionViewer.lines")}
                    </>
                  )}
                </button>
              )}

              {/* View original email */}
              {emailSubmissionId && emailSubmissionId > 0 && (
                <button
                  type="button"
                  onClick={() => onViewEmailSubmission?.(emailSubmissionId)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5",
                    "text-xs font-medium text-blue-700 hover:bg-blue-100",
                    "dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30",
                    "transition-colors"
                  )}>
                  <Mail className="h-3.5 w-3.5" />
                  {t("emailPreview.viewSubmittedEmail")}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // File upload (CV, etc.) — Embedded in-page document viewer
  if (data.fileUrl) {
    return <EmbeddedCVViewer fileUrl={data.fileUrl} />;
  }

  // Quiz answers
  if (data.quizAnswers && data.quizAnswers.length > 0) {
    const correct = data.quizAnswers.filter((a) => a.isCorrect).length;
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          {correct}/{data.quizAnswers.length} {t("userApplicationQuiz.correctAnswers")}
        </span>
      </div>
    );
  }

  // Code submissions (CODING round) — use IDE-style grader
  if (data.codeSubmissions && data.codeSubmissions.length > 0) {
    return <CodingRoundGrader detail={detail} />;
  }

  // Code review submissions — use CodeReviewGrader component
  if (data.codeReviewSubmissions && data.codeReviewSubmissions.length > 0) {
    return (
      <CodeReviewGrader
        detail={detail}
        problems={codeReviewProblems}
        isLoading={isLoadingCodeReview}
      />
    );
  }

  return null;
}

// ============================================================
// AI Feedback Panel
// ============================================================

function AIFeedbackPanel({ feedback, score }: { feedback?: AiFeedback; score?: number }) {
  if (!feedback && score === undefined) return null;

  const em = feedback?.extraMetrics as Record<string, unknown> | undefined;
  const overallMatch =
    typeof em?.["Overall CV Match"] === "number" ? (em["Overall CV Match"] as number) : null;
  const skillsMatch =
    typeof em?.["Skills Match Score"] === "number" ? (em["Skills Match Score"] as number) : null;
  const experienceMatch =
    typeof em?.["Experience Match Score"] === "number"
      ? (em["Experience Match Score"] as number)
      : null;
  const educationMatch =
    typeof em?.["Education Match Score"] === "number"
      ? (em["Education Match Score"] as number)
      : null;
  const cvReadability =
    typeof em?.["CV Readability Score"] === "number"
      ? (em["CV Readability Score"] as number)
      : null;
  const keywordDensity =
    em?.["Keyword Density"] && typeof em["Keyword Density"] === "object"
      ? (em["Keyword Density"] as Record<string, number>)
      : null;
  const redFlags = Array.isArray(em?.["Potential Red Flags"])
    ? (em["Potential Red Flags"] as string[])
    : null;

  const hasMetrics =
    overallMatch !== null ||
    skillsMatch !== null ||
    experienceMatch !== null ||
    educationMatch !== null ||
    cvReadability !== null;

  return (
    <div className="space-y-4">
      {score !== undefined && score !== null && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              {score}
            </span>
            <span className="text-sm text-slate-400">/100</span>
          </div>
        </div>
      )}

      {feedback?.generalComment && (
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-sm text-slate-700 dark:text-slate-300">{feedback.generalComment}</p>
        </div>
      )}

      {hasMetrics && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {overallMatch !== null && (
            <div className="flex flex-col items-center rounded-lg border bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {overallMatch}
              </span>
              <span className="mt-0.5 text-xs text-slate-500">Overall</span>
            </div>
          )}
          {skillsMatch !== null && (
            <div className="flex flex-col items-center rounded-lg border bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {skillsMatch}
              </span>
              <span className="mt-0.5 text-xs text-slate-500">Skills</span>
            </div>
          )}
          {experienceMatch !== null && (
            <div className="flex flex-col items-center rounded-lg border bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {experienceMatch}
              </span>
              <span className="mt-0.5 text-xs text-slate-500">Experience</span>
            </div>
          )}
          {educationMatch !== null && (
            <div className="flex flex-col items-center rounded-lg border bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {educationMatch}
              </span>
              <span className="mt-0.5 text-xs text-slate-500">Education</span>
            </div>
          )}
          {cvReadability !== null && (
            <div className="flex flex-col items-center rounded-lg border bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
              <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {cvReadability}
              </span>
              <span className="mt-0.5 text-xs text-slate-500">Readability</span>
            </div>
          )}
        </div>
      )}

      {feedback?.strengths && feedback.strengths.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">
            {t("common.strengths")}
          </p>
          <ul className="space-y-1.5">
            {feedback.strengths.slice(0, 4).map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <ThumbsUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback?.weaknesses && feedback.weaknesses.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-red-700 dark:text-red-400">
            {t("common.pointsForImprovement")}
          </p>
          <ul className="space-y-1.5">
            {feedback.weaknesses.slice(0, 4).map((w, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {keywordDensity && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">{t("cv.keywords")}</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(keywordDensity)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([keyword, count]) => (
                <span
                  key={keyword}
                  className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {keyword}: {count}
                </span>
              ))}
          </div>
        </div>
      )}

      {redFlags && redFlags.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-red-500">{t("general.warning")}</p>
          <ul className="space-y-1">
            {redFlags.slice(0, 3).map((flag, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                <span className="mt-0.5 text-red-500">⚠</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Application Grading Table Component (List View)
// ============================================================

function ApplicationGradingTable({
  items,
  userMap,
  userAvatarMap,
  jdMap,
  roundMap,
  onOpenGrading,
}: {
  items: GradingListItem[];
  userMap: Map<number, string>;
  userAvatarMap: Map<number, string>;
  jdMap?: Map<number, string>;
  roundMap?: Map<number, { name?: string; roundType?: string; roundOrder?: number }>;
  onOpenGrading: (_appId: number, _detailId?: number, _item?: GradingListItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
      <Table>
        <TableHeader className="border-b border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/90">
          <TableRow className="border-0 hover:bg-transparent dark:hover:bg-transparent">
            <TableHead className="h-11 pl-6 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Mã đơn
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Ứng viên
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Vị trí ứng tuyển
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Vòng chấm
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Trạng thái
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Điểm số
            </TableHead>
            <TableHead className="h-11 pr-6 text-right text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              Thao tác
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => {
            const status = item.detailStatus ?? item.status;
            const score = item.overallScore;
            const aiScore = item.detail?.aiScore;
            const hrScore = item.detail?.hrScore;
            const jdId = item.jdId;
            const userId = item.userId;
            const userName =
              item.userName ?? userMap.get(userId!) ?? (userId ? `User #${userId}` : "-");
            const userAvatar = item.userAvatar ?? (userId ? userAvatarMap.get(userId) : undefined);
            const statusCfg = STATUS_CONFIG[status ?? ""] ?? {
              label: status,
              className: "bg-slate-100 text-slate-600",
              dot: "bg-slate-400",
            };

            const detailRoundId = item.detail?.roundId;
            const roundMeta = detailRoundId != null ? roundMap?.get(detailRoundId) : undefined;

            let roundTypeInferred = item.detail ? inferRoundType(item.detail) : null;
            if (!roundTypeInferred && roundMeta?.roundType) {
              roundTypeInferred = roundMeta.roundType;
            }

            const roundOrder = roundMeta?.roundOrder ?? item.currentRoundOrder ?? 1;
            const roundTypeLabel = roundTypeInferred
              ? i18n.t(`common.roundType.${roundTypeInferred}`, roundTypeInferred)
              : null;
            const roundNameFromJd = roundMeta?.name;

            const finalRoundName = roundNameFromJd || roundTypeLabel || `Vòng ${roundOrder}`;
            const roundDisplay = `Vòng ${roundOrder}: ${finalRoundName}`;

            return (
              <TableRow
                key={item.detailId ?? item.id}
                onClick={() => onOpenGrading(item.id, item.detailId, item)}
                className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/60">
                {/* Application ID Column */}
                <TableCell className="pl-6 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">#{item.id}</span>
                </TableCell>

                {/* Candidate Profile */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0 rounded-xl shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700">
                      <AvatarImage src={userAvatar ?? undefined} alt={userName} />
                      <AvatarFallback className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-black text-white">
                        {(userName ?? "?")[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                        {userName}
                      </h4>
                    </div>
                  </div>
                </TableCell>

                {/* Job Position / Application name */}
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Briefcase className="h-3 w-3 shrink-0 text-indigo-500" />
                    {item.applicationName ??
                      (jdId != null ? (jdMap?.get(jdId) ?? `Vị trí #${jdId}`) : "Chưa gắn JD")}
                  </span>
                </TableCell>

                {/* Round */}
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    {roundDisplay}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
                      statusCfg.className
                    )}>
                    {statusCfg.dot && (
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                    )}
                    {statusCfg.label}
                  </span>
                </TableCell>

                {/* Score */}
                <TableCell>
                  {hrScore !== undefined || score !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        {hrScore ?? score}
                      </span>
                      <span className="text-[10px] font-normal text-slate-400">/100</span>
                      {aiScore !== undefined && (
                        <span className="ml-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          AI: {Math.round(aiScore)}
                        </span>
                      )}
                    </div>
                  ) : aiScore !== undefined ? (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        AI: {Math.round(aiScore)}/100
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-slate-400">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="pr-6 text-right">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenGrading(item.id, item.detailId, item);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg px-2.5 text-xs font-extrabold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60">
                    <span>{t("grading.grade")}</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// Application Grading List Page
// ============================================================

export function ApplicationGradingPage({
  onOpenGradingDetail,
  basePath,
}: {
  onOpenGradingDetail?: (
    _appId: number,
    _extra?: { candidateName?: string; jdId?: string; detailId?: number }
  ) => void;
  basePath?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBase = basePath ?? (location.pathname.startsWith("/staff") ? "/staff" : "/admin");
  const { user } = useAuthStore();
  const isStaff = user?.role === "STAFF";

  // View mode state: default to "table" (List View as requested)
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Staff & Admin: lấy tất cả applications (chỉ dùng cho Admin để hiển thị danh sách)
  const { data: rawApps, refetch: refetchApps } = useApplications();

  // Staff: lấy các application-detail được gán cho STAFF hiện tại
  // (đúng API: GET /api/application-details/reviewer — không phải workaround quét tất cả applications)
  const { data: reviewerDetails = [], refetch: refetchReviewer } =
    useApplicationDetailsForReviewer(isStaff);

  const applications = useMemo(() => (Array.isArray(rawApps) ? rawApps : []), [rawApps]);
  const [searchQuery, setSearchQuery] = useState("");
  // Staff default: show items needing HR scoring (AI evaluated but not yet scored by HR)
  // Admin default: PENDING (waiting for submission)
  const [statusFilter, setStatusFilter] = useState<string>(
    isStaff ? "NEEDS_HR_SCORING" : "PENDING"
  );
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "score-high" | "score-low">("newest");

  // Sortable fields for the table
  type SortableApplication = GradingListItem & {
    idSortValue: number;
    createdAtSortValue: number;
    scoreSortValue: number;
  };

  const { data: allUsers } = useUsers();
  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    if (allUsers) {
      const userList = Array.isArray(allUsers) ? allUsers : [];
      userList.forEach((user) => {
        if (user.id != null) {
          map.set(user.id, user.name ?? `User #${user.id}`);
        }
      });
    }
    return map;
  }, [allUsers]);

  const userAvatarMap = useMemo(() => {
    const map = new Map<number, string>();
    if (allUsers) {
      const userList = Array.isArray(allUsers) ? allUsers : [];
      userList.forEach((user: { id?: number; avatarUrl?: string }) => {
        if (user.id != null && user.avatarUrl) {
          map.set(user.id, user.avatarUrl);
        }
      });
    }
    return map;
  }, [allUsers]);

  const { data: rawJds } = useJobDescriptions();
  const jdMap = useMemo(() => {
    const map = new Map<number, string>();
    if (rawJds) {
      const jdList = Array.isArray(rawJds) ? rawJds : [];
      jdList.forEach((jd) => {
        if (jd.id != null && jd.title) {
          map.set(jd.id, jd.title);
        }
      });
    }
    return map;
  }, [rawJds]);

  const roundMap = useMemo(() => {
    const map = new Map<number, { name?: string; roundType?: string; roundOrder?: number }>();
    if (rawJds) {
      const jdList = (Array.isArray(rawJds) ? rawJds : []) as Array<{
        rounds?: Array<{ id?: number; name?: string; roundType?: string; roundOrder?: number }>;
      }>;
      jdList.forEach((jd) => {
        if (Array.isArray(jd.rounds)) {
          jd.rounds.forEach((round) => {
            if (round.id != null) {
              map.set(round.id, round);
            }
          });
        }
      });
    }
    return map;
  }, [rawJds]);

  // Map of applicationId -> { userId, jdId } (dùng cho Staff để join từ
  // reviewerDetails, vì schema ApplicationDetail không chứa 2 field này).
  const applicationMap = useMemo(() => {
    const map = new Map<number, { userId?: number; jdId?: number }>();
    applications.forEach((app) => {
      if (app.id != null) {
        map.set(app.id, { userId: app.userId, jdId: app.jdId });
      }
    });
    return map;
  }, [applications]);

  // Staff: lấy thẳng các detail từ API /reviewer.
  // API này đã được backend filter:
  //   - chỉ những round `isAuto = false`
  //   - reviewerId = userId của staff hiện tại
  // ⇒ FE render theo đúng status (AI_EVALUATED / COMPLETED).
  // userId/jdId lấy từ `applicationMap` (lookup qua applicationId) vì
  // `ApplicationDetail` schema không chứa 2 field này.
  const staffItems = useMemo((): GradingListItem[] => {
    if (!isStaff) return [];
    return reviewerDetails.map((detail) => {
      const appMeta =
        detail.applicationId != null ? applicationMap.get(detail.applicationId) : undefined;
      const userId = appMeta?.userId;
      const jdId = appMeta?.jdId;
      // Prefer applicationName / userName returned by the BE on the list item
      // (newly-added fields). Fall back to the lookups if the BE hasn't
      // returned them yet (e.g. older deployment).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = detail as any;
      const applicationName = d.applicationName ?? (jdId != null ? jdMap.get(jdId) : undefined);
      const userName =
        d.userName ?? (userId != null ? (userMap.get(userId) ?? `User #${userId}`) : undefined);
      return {
        id: detail.applicationId!,
        status: detail.status ?? "PENDING",
        overallScore: detail.finalScore ?? undefined,
        userId,
        userName,
        userAvatar: userId != null ? userAvatarMap.get(userId) : undefined,
        applicationName,
        jdId,
        detailId: detail.id,
        detailStatus: detail.status,
        detail,
      };
    });
  }, [isStaff, reviewerDetails, applicationMap, userMap, userAvatarMap, jdMap]);

  const filteredApplications = useMemo((): GradingListItem[] => {
    if (isStaff) {
      return staffItems
        .filter((item) => {
          // Search filter
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const userName = userMap.get(item.userId!) ?? "";
            if (
              !String(item.id).includes(q) &&
              !String(item.detailId).includes(q) &&
              !userName.toLowerCase().includes(q)
            )
              return false;
          }
          // Status filter
          if (statusFilter !== "all") {
            // Special filter: AI-graded rounds that still need HR scoring
            if (statusFilter === "NEEDS_HR_SCORING") {
              // Show items where status = AI_EVALUATED and hrScore is null/undefined
              const detail = item.detail;
              const hasAiScore = detail?.aiScore !== undefined && detail?.aiScore !== null;
              const needsHrScore = detail?.hrScore === undefined || detail?.hrScore === null;
              const isAiEvaluated =
                item.detailStatus === "AI_EVALUATED" || item.status === "AI_EVALUATED";
              if (isAiEvaluated && hasAiScore && needsHrScore) {
                return true;
              }
              return false;
            }
            // Standard status filters (PENDING, SUBMITTED, COMPLETED)
            if (item.detailStatus !== statusFilter && item.status !== statusFilter) {
              return false;
            }
          }
          return true;
        })
        .sort((a, b) => {
          // Sort by newest first (by detail.id as proxy for creation time, higher = newer)
          return (b.detailId ?? b.id) - (a.detailId ?? a.id);
        });
    }
    return applications
      .filter((app) => app.status === "IN_PROGRESS")
      .filter((app) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const userName = userMap.get(app.userId!) ?? "";
          if (
            !String(app.id).includes(q) &&
            !String(app.jdId ?? "").includes(q) &&
            !userName.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (bTs !== aTs) return bTs - aTs;
        return (b.id ?? 0) - (a.id ?? 0);
      })
      .map((app) => ({
        id: app.id!,
        jdId: app.jdId,
        status: app.status ?? "IN_PROGRESS",
        currentRoundOrder: app.currentRoundOrder,
        overallScore: app.overallScore,
        userId: app.userId,
        userName: userMap.get(app.userId!) ?? `User #${app.userId}`,
        userAvatar: app.userId ? userAvatarMap.get(app.userId) : undefined,
        createdAt: app.createdAt,
      }));
  }, [isStaff, staffItems, applications, searchQuery, statusFilter, userMap, userAvatarMap]);

  // Transform for sortable hook with sort metadata
  const sortableApplications = useMemo((): SortableApplication[] => {
    return filteredApplications.map((item) => ({
      ...item,
      idSortValue: item.detailId ?? item.id,
      createdAtSortValue: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      scoreSortValue: item.overallScore ?? -1,
    }));
  }, [filteredApplications]);

  // Wire sortBy dropdown to useSortable sort options
  const sortOptions = useMemo(() => {
    const sortMap: Record<
      typeof sortBy,
      { key: keyof SortableApplication; direction: "asc" | "desc" }
    > = {
      newest: { key: "idSortValue", direction: "desc" },
      oldest: { key: "idSortValue", direction: "asc" },
      "score-high": { key: "scoreSortValue", direction: "desc" },
      "score-low": { key: "scoreSortValue", direction: "asc" },
    };
    return sortMap[sortBy];
  }, [sortBy]);

  const { sortedData } = useSortable(sortableApplications, {
    defaultSort: sortOptions,
    noSortBehavior: "preserve",
    tieBreaker: { key: "idSortValue", direction: "desc" },
  });

  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize: 10,
    maxVisiblePages: 5,
  });

  const paginatedData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [sortedData, pagination.startIndex, pagination.endIndex]
  );

  const handleOpenGrading = useCallback(
    (_appId: number, detailId?: number, item?: GradingListItem) => {
      if (onOpenGradingDetail) {
        // Pass candidate info + detailId for tab label and detail page header.
        // The first arg MUST be the application id (not the detail id) — the
        // tabs store uses appId as the per-tab key. detailId is forwarded via
        // extra so the URL gets ?detailId=X and the workspace opens straight
        // to that row.
        const extra: { candidateName?: string; jdId?: string; detailId?: number } = {};
        if (item) {
          const name = item.userName ?? (item.userId ? userMap.get(item.userId) : undefined);
          if (name) extra.candidateName = name;
          if (item.jdId !== undefined) extra.jdId = String(item.jdId);
        }
        if (detailId !== undefined) extra.detailId = detailId;
        onOpenGradingDetail(_appId, extra);
      } else {
        const params = new URLSearchParams({ tab: "grading-detail" });
        if (detailId !== undefined) {
          params.set("detailId", String(detailId));
        } else {
          params.set("appId", String(_appId));
        }
        navigate(`${dashboardBase}?${params.toString()}`);
      }
    },
    [navigate, onOpenGradingDetail, dashboardBase, userMap]
  );

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 bg-white/95 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-950/95">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("adminApplicationGrading.pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminApplicationGrading.pageDescription")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              type="text"
              placeholder={t("application.searchByUserOrJob")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.setPage(1);
              }}
              className="h-9 border-slate-200 bg-white pl-9 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              pagination.setPage(1);
            }}>
            <SelectTrigger className="h-9 w-[200px] text-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder={t("common.filterByStatus")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              {isStaff && (
                <SelectItem value="NEEDS_HR_SCORING">{t("status.aiGradedNeedsHr")}</SelectItem>
              )}
              <SelectItem value="PENDING">{t("status.pendingSubmit")}</SelectItem>
              <SelectItem value="SUBMITTED">{t("adminQuizsetmanagement.submitted")}</SelectItem>
              <SelectItem value="COMPLETED">{t("general.completed")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder={t("common.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("common.sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("common.sortOldest")}</SelectItem>
              <SelectItem value="score-high">{t("common.sortScoreHigh")}</SelectItem>
              <SelectItem value="score-low">{t("common.sortScoreLow")}</SelectItem>
            </SelectContent>
          </Select>

          {/* View Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-800/80">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-8 rounded-md px-2.5 text-xs font-bold transition-all",
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
              title="Xem dạng danh sách">
              <List className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Danh sách</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("card")}
              className={cn(
                "h-8 rounded-md px-2.5 text-xs font-bold transition-all",
                viewMode === "card"
                  ? "bg-white text-indigo-600 shadow-2xs dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              )}
              title="Xem dạng thẻ">
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Thẻ</span>
            </Button>
          </div>

          <ReloadButton
            onReload={async () => {
              if (isStaff) {
                await Promise.all([refetchApps(), refetchReviewer()]);
              } else {
                await refetchApps();
              }
            }}
            tooltip={t("common.reload")}
            className="h-9 w-9"
          />
        </div>
      </div>

      {/* ── CARD GRID CONTENT ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-950">
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <ClipboardCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t("grading.noApplicationsToGrade")}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {t("adminApplicationGrading.pageDescription")}
              </p>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col duration-300">
            {viewMode === "table" ? (
              <div className="flex-1 p-4 sm:p-6">
                <ApplicationGradingTable
                  items={paginatedData}
                  userMap={userMap}
                  userAvatarMap={userAvatarMap}
                  jdMap={jdMap}
                  roundMap={roundMap}
                  onOpenGrading={handleOpenGrading}
                />
              </div>
            ) : (
              /* Card Grid */
              <div className="grid flex-1 grid-cols-1 content-start gap-5 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                {paginatedData.map((item) => {
                  const status = item.detailStatus ?? item.status;
                  const score = item.overallScore;
                  const scorePercent = score !== undefined ? Math.min(Math.round(score), 100) : 0;
                  const roundId = item.detail?.roundId ?? item.currentRoundOrder;
                  const jdId = item.jdId;
                  const userId = item.userId;
                  const userName =
                    item.userName ?? userMap.get(userId!) ?? (userId ? `User #${userId}` : "-");
                  const userAvatar =
                    item.userAvatar ?? (userId ? userAvatarMap.get(userId) : undefined);
                  const statusCfg = STATUS_CONFIG[status ?? ""] ?? {
                    label: status,
                    className: "bg-slate-100 text-slate-600",
                    dot: "bg-slate-400",
                  };

                  return (
                    <button
                      key={item.detailId ?? item.id}
                      onClick={() => handleOpenGrading(item.id, item.detailId, item)}
                      className="group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/30">
                      <div className="space-y-4">
                        {/* Top Row: ID Badge & Status Pill */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <User className="h-3 w-3 text-indigo-500" />
                            Đơn #{item.id}
                            {jdId != null ? ` · ${jdMap.get(jdId) ?? `Vị trí #${jdId}`}` : ""}
                          </span>

                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                              statusCfg.className
                            )}>
                            {statusCfg.dot && (
                              <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                            )}
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Candidate Profile Header */}
                        <div className="flex items-center gap-3.5">
                          <Avatar className="h-12 w-12 shrink-0 rounded-2xl shadow-sm ring-2 ring-slate-100 dark:ring-slate-800">
                            <AvatarImage src={userAvatar ?? undefined} alt={userName} />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-base font-black text-white">
                              {(userName ?? "?")[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h3 className="truncate text-base font-black tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                              {userName}
                            </h3>
                            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Candidate Evaluation Workspace
                            </p>
                          </div>
                        </div>

                        {/* Score Gauge & Round Details Box */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50/90 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="flex items-center gap-3.5">
                            {/* Circular Score Gauge */}
                            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                              <svg
                                className="h-full w-full -rotate-90 transform"
                                viewBox="0 0 96 96">
                                <circle
                                  cx="48"
                                  cy="48"
                                  r="36"
                                  className="stroke-slate-200 dark:stroke-slate-800"
                                  strokeWidth="6"
                                  fill="transparent"
                                />
                                {score !== undefined && (
                                  <circle
                                    cx="48"
                                    cy="48"
                                    r="36"
                                    className={cn(
                                      "transition-all duration-700 ease-out",
                                      scorePercent >= 70
                                        ? "stroke-emerald-500"
                                        : scorePercent >= 40
                                          ? "stroke-amber-500"
                                          : "stroke-red-500"
                                    )}
                                    strokeWidth="6"
                                    strokeDasharray={2 * Math.PI * 36}
                                    strokeDashoffset={
                                      2 * Math.PI * 36 - (scorePercent / 100) * 2 * Math.PI * 36
                                    }
                                    strokeLinecap="round"
                                    fill="transparent"
                                  />
                                )}
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center text-center">
                                {score !== undefined ? (
                                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {score}
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold text-slate-400">—</span>
                                )}
                              </div>
                            </div>

                            {/* Info Column */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                                  {t("userApplicationhistory.totalScore")}
                                </span>
                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                  {score !== undefined ? score : "—"}/100
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                                <span className="truncate font-semibold">
                                  {t("userApplicationhistory.round")} #{roundId ?? 1}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <ClipboardCheck className="h-4 w-4 text-indigo-500" />
                          {t("grading.grade")}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 transition-transform group-hover:translate-x-1 dark:text-indigo-400">
                          {t("grading.grade")} <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-auto flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {pagination.startIndex + 1}-{Math.min(pagination.endIndex + 1, sortedData.length)} /{" "}
                {sortedData.length}
              </span>
              <PaginationControl pagination={pagination} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Staff Grading Summary Header Card with Sticker Score Badge
// ============================================================

function StaffGradingHeaderCard({
  detail,
  displayDetails,
  onSelectRound,
  isStaff,
}: {
  detail?: ApplicationDetail;
  displayDetails: ApplicationDetail[];
  selectedRoundId: number | null;
  onSelectRound: (_id: number) => void;
  isStaff: boolean;
}) {
  if (!detail) return null;

  const hrScore = detail.hrScore;
  const aiScore = detail.aiScore;
  const hasHrScore = hrScore !== undefined && hrScore !== null;
  const isPass = detail.finalResult === "PASSED";
  const needsGrading = needsHrScoring(detail) && !hasHrScore;
  const roundTypeStr = inferRoundType(detail);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
      {/* Background Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />

      {/* Admin Multi-round Selector Bar (if Admin is viewing an application with multiple rounds) */}
      {!isStaff && displayDetails.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <span className="text-xs font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
            Các vòng chấm ({displayDetails.length}):
          </span>
          <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
            {displayDetails.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => onSelectRound(d.id!)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-bold transition-all",
                  d.id === detail.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
                )}>
                {(() => {
                  let dType = inferRoundType(d);
                  const order = d.roundId ?? idx + 1;
                  if (!dType) {
                    if (order === 1) dType = "CV_SCREENING";
                    else if (order === 2) dType = "CODING";
                    else if (order === 3) dType = "MENTOR_REVIEW";
                  }
                  const name = dType ? i18n.t(`common.roundType.${dType}`, dType) : `Vòng ${order}`;
                  return `Vòng ${order}: ${name}`;
                })()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT SIDE: Staff Grading Info */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              {(() => {
                let dType = inferRoundType(detail);
                const order = detail.roundId ?? 1;
                if (!dType) {
                  if (order === 1) dType = "CV_SCREENING";
                  else if (order === 2) dType = "CODING";
                  else if (order === 3) dType = "MENTOR_REVIEW";
                }
                const name = dType ? i18n.t(`common.roundType.${dType}`, dType) : roundTypeStr;
                return `Vòng ${order}: ${name}`;
              })()}
            </span>

            {/* Status & Decision Badge */}
            {hasHrScore ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold shadow-2xs",
                  isPass
                    ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                )}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isPass ? "ĐÃ ĐẠT (PASSED)" : "CHƯA ĐẠT (FAILED)"}
              </span>
            ) : needsGrading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                CHỜ STAFF ĐÁNH GIÁ & CHẤM ĐIỂM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {detail.status ?? "PENDING"}
              </span>
            )}

            {aiScore !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                Tham chiếu AI: {Math.round(aiScore)}/100
              </span>
            )}
          </div>

          {/* Header Title */}
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {hasHrScore
                ? "Kết Quả Đánh Giá Bài Chấm Staff"
                : "Không Gian Đánh Giá & Chấm Điểm Staff"}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {hasHrScore
                ? "Thông tin điểm số và nhận xét chi tiết đã được Staff thẩm định và ghi nhận trên hệ thống."
                : "Xem bài làm của ứng viên bên dưới và tiến hành nhập điểm số & nhận xét HR ở bảng bên phải."}
            </p>
          </div>

          {/* Staff Note Highlight Box (If graded) */}
          {hasHrScore && detail.hrNote && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/30">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <FileText className="h-3.5 w-3.5" />
                Ghi chú & Nhận xét của Staff:
              </div>
              <p className="text-xs whitespace-pre-wrap text-slate-700 italic dark:text-slate-300">
                "{detail.hrNote}"
              </p>
            </div>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <User className="h-3.5 w-3.5 text-indigo-500" />
              Đơn nộp #{detail.applicationId}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
              Chi tiết vòng #{detail.id}
            </span>
            {detail.completedAt && (
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Thời gian nộp: {formatDateTime(detail.completedAt)}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT SIDE: Score Sticker Badge (Mentor Review Result Style) */}
        <div className="flex shrink-0 items-center justify-center pt-2 lg:pt-0">
          <div className="group relative transition-transform duration-300 hover:scale-105">
            {/* Ambient Sticker Glow */}
            <div
              className={cn(
                "absolute -inset-1 rounded-3xl opacity-80 blur-md transition-all duration-300 group-hover:opacity-100",
                hasHrScore
                  ? isPass
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-rose-500 to-amber-500"
                  : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              )}
            />

            {/* Main Sticker Box */}
            <div
              className={cn(
                "relative flex h-36 w-44 rotate-1 flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-xl backdrop-blur-md transition-transform duration-300 group-hover:rotate-0",
                hasHrScore
                  ? isPass
                    ? "border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white"
                    : "border-2 border-rose-400/60 bg-gradient-to-br from-rose-950 via-slate-900 to-rose-900 text-white"
                  : "border-2 border-indigo-400/60 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white"
              )}>
              {/* Decorative Glass Reflection */}
              <div className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rotate-45 bg-white/10 blur-xs" />

              {/* Sticker Header */}
              <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
                <span className="flex items-center gap-1 text-[10px] font-black tracking-widest text-white/80 uppercase">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  {hasHrScore ? "KẾT QUẢ CHẤM" : "ĐIỂM ĐÁNH GIÁ"}
                </span>
                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px] font-extrabold text-white/90 uppercase">
                  STAFF
                </span>
              </div>

              {/* Score Number Display */}
              <div className="my-auto text-center">
                {hasHrScore ? (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black tracking-tight text-white drop-shadow-md">
                      {hrScore}
                    </span>
                    <span className="text-sm font-bold text-white/60">/100</span>
                  </div>
                ) : aiScore !== undefined ? (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] font-extrabold tracking-wider text-purple-200 uppercase">
                      Tham chiếu AI
                    </span>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black tracking-tight text-purple-100">
                        {Math.round(aiScore)}
                      </span>
                      <span className="text-xs font-bold text-purple-300/60">/100</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-2xl font-black text-white/40">---</span>
                    <p className="text-[10px] font-semibold text-white/60">Chưa nhập điểm</p>
                  </div>
                )}
              </div>

              {/* Bottom Stamp Ribbon */}
              <div className="flex items-center justify-between border-t border-white/15 pt-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-white/80">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {hasHrScore ? (isPass ? "ĐẠT YÊU CẦU" : "KHÔNG ĐẠT") : "CHỜ CHẤM"}
                </span>
                {hasHrScore && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-xs",
                      isPass ? "bg-emerald-400 text-slate-950" : "bg-rose-500 text-white"
                    )}>
                    {isPass ? "VERIFIED" : "REJECTED"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Application Grading Detail Page (standalone — no sidebar)
// ============================================================

export function ApplicationGradingDetailPage({
  appId: appIdProp,
  detailId: detailIdProp,
  basePath,
  candidateName: candidateNameProp,
  jdId: jdIdProp,
}: {
  appId?: string;
  detailId?: string;
  basePath?: string;
  /** Optional pre-loaded candidate name from parent (avoids extra fetch) */
  candidateName?: string;
  /** Optional pre-loaded JD ID from parent (avoids extra fetch) */
  jdId?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect base path from current location if not provided
  const dashboardBase = basePath ?? (location.pathname.startsWith("/staff") ? "/staff" : "/admin");
  const isStaff = dashboardBase === "/staff";

  // Staff: numericId is a detail ID  → single detail
  // Admin: numericId is an application ID → all details for that application
  const numericId = Number(appIdProp ?? detailIdProp ?? "0");
  const isValidId = Number.isFinite(numericId) && numericId > 0;

  // Staff: fetch single detail by ID
  const {
    data: singleDetail,
    isLoading: isLoadingSingle,
    refetch: refetchSingle,
  } = useApplicationDetail(numericId, isValidId && isStaff);

  // Admin: fetch all details by applicationId
  const {
    data: details = [],
    isLoading: isLoadingDetails,
    refetch: refetchDetails,
  } = useApplicationDetails(numericId, isValidId && !isStaff);

  // Determine the actual applicationId we need to fetch full application info
  const applicationId =
    isStaff && singleDetail?.applicationId !== undefined
      ? singleDetail.applicationId
      : !isStaff
        ? numericId
        : 0;

  // Fetch the application to get userId/jdId
  const { data: application, isLoading: isLoadingApplication } = useApplication(
    applicationId,
    applicationId > 0
  );

  // Fetch candidate user info
  const userId = application?.userId;
  const { data: allUsers } = useUsers();
  const candidateUser = useMemo(() => {
    if (!userId || !allUsers) return undefined;
    const userList = Array.isArray(allUsers) ? allUsers : [];
    return userList.find((u: { id?: number }) => u.id === userId);
  }, [userId, allUsers]);

  const candidateName = candidateNameProp ?? candidateUser?.name ?? `User #${userId ?? numericId}`;
  const candidateAvatar = candidateUser?.avatarUrl;
  const candidateEmail = candidateUser?.email;

  // Fetch Job Description info
  const jdId = jdIdProp !== undefined ? Number(jdIdProp) : application?.jdId;
  const { data: jobDescription } = useJobDescription(jdId ?? 0, Boolean(jdId && jdId > 0));

  const isLoading =
    isLoadingSingle || isLoadingDetails || (applicationId > 0 && isLoadingApplication);
  const refetch = refetchSingle || refetchDetails;

  // Email preview dialog state
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewId, setEmailPreviewId] = useState<number | null>(null);

  // Unified details array (filtered for non-auto-graded rounds)
  // For staff: include CODE_REVIEW rounds (they need HR scoring)
  const displayDetails = useMemo((): ApplicationDetail[] => {
    if (isStaff && singleDetail) {
      // For staff: show CODE_REVIEW rounds but filter out QUIZ
      const inferredType = inferRoundType(singleDetail);
      if (inferredType === "QUIZ") return [];
      return [singleDetail];
    }
    return filterOutAutoGradedRounds(details);
  }, [isStaff, singleDetail, details]);

  // Selected Round Tab State
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  // Auto-select first round needing HR score, or first round available
  const activeDetail = useMemo(() => {
    if (displayDetails.length === 0) return undefined;
    if (selectedRoundId !== null) {
      const found = displayDetails.find((d) => d.id === selectedRoundId);
      if (found) return found;
    }
    const firstNeedsHr = displayDetails.find((d) => needsHrScoring(d));
    return firstNeedsHr ?? displayDetails[0];
  }, [displayDetails, selectedRoundId]);

  const handleViewEmailSubmission = useCallback((emailSubmissionId: number) => {
    setEmailPreviewId(emailSubmissionId);
    setEmailPreviewOpen(true);
  }, []);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = displayDetails.length;
    const pending = displayDetails.filter((d) => needsHrScoring(d)).length;
    const completed = displayDetails.filter((d) => d.finalResult).length;
    const passed = displayDetails.filter((d) => d.finalResult === "PASSED").length;
    const avgScore =
      displayDetails.reduce((sum: number, d: ApplicationDetail) => sum + (d.hrScore ?? 0), 0) /
      (completed || 1);
    return { total, pending, completed, passed, avgScore: Math.round(avgScore) };
  }, [displayDetails]);

  if (!isValidId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ClipboardCheck className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t("error.invalidId")}
          </p>
          <Button size="sm" onClick={() => navigate(`${dashboardBase}?tab=applicationGrading`)}>
            <ChevronLeft className="h-4 w-4" />
            {t("common.backToTheList")}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">{t("general.loadingData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* ── CANDIDATE WORKSPACE HEADER BANNER (Theme Aware: Light & Dark) ─────── */}
      <div className="relative border-b border-slate-200/80 bg-slate-50 px-4 py-6 text-slate-900 sm:px-8 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
        {/* Ambient background glow */}
        <div className="relative mx-auto max-w-7xl">
          {/* Top Breadcrumb & Actions */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-xl border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={() => navigate(`${dashboardBase}?tab=applicationGrading`)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                {t("common.goBack")}
              </Button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                {t("application.gradingDetail", "Chi tiết bài chấm")}
              </span>
            </div>

            {/* Reload Data Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isLoading}
              className="h-8 gap-1.5 rounded-xl border-slate-200 bg-white/80 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700">
              <Clock
                className={cn(
                  "h-3.5 w-3.5 text-slate-500 dark:text-slate-400",
                  isLoading && "animate-spin"
                )}
              />
              {t("common.reload")}
            </Button>
          </div>

          {/* Candidate Profile Details Row */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: Avatar & Candidate Info */}
            <div className="flex items-start gap-4 sm:items-center">
              <Avatar className="h-16 w-16 shrink-0 rounded-2xl shadow-md ring-4 ring-white dark:ring-indigo-500/20">
                <AvatarImage src={candidateAvatar ?? undefined} alt={candidateName} />
                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-black text-white">
                  {(candidateName ?? "?")[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {candidateName}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-1 dark:ring-indigo-400/30">
                    <User className="h-3 w-3" />
                    ID #{applicationId || numericId}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {candidateEmail && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Mail className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                      {candidateEmail}
                    </span>
                  )}
                  {jobDescription?.title && (
                    <span className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300">
                      <Briefcase className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                      {jobDescription.title}
                    </span>
                  )}
                  {jobDescription?.level && (
                    <Badge
                      variant="outline"
                      className="border-purple-200 bg-purple-100/60 text-[10px] font-extrabold text-purple-700 dark:border-purple-400/30 dark:bg-purple-500/10 dark:text-purple-200">
                      {jobDescription.level}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Summary Score & Stat Pills */}
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-200/80 pt-4 lg:border-t-0 lg:pt-0 dark:border-slate-800">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 shadow-2xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-400/20 dark:text-amber-300">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("grading.hrAverageScore")}
                  </p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {summaryStats.avgScore}{" "}
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                      /100
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 shadow-2xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {t("grading.gradedCount")}
                  </p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {summaryStats.completed}{" "}
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                      / {summaryStats.total}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WORKSPACE CONTENT AREA ─────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ── STAFF GRADING SUMMARY CARD & STICKER SCORE BADGE ───────────────── */}
        <StaffGradingHeaderCard
          detail={activeDetail}
          displayDetails={displayDetails}
          selectedRoundId={selectedRoundId}
          onSelectRound={(id) => setSelectedRoundId(id)}
          isStaff={isStaff}
        />

        {/* ── ACTIVE ROUND EVALUATION WORKSPACE ─────────────────────────────── */}
        {!activeDetail ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <ClipboardCheck className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">
              {t("application.noRounds")}
            </p>
            <p className="text-xs text-slate-400">{t("adminApplicationGrading.pageDescription")}</p>
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-12">
            {/* ── LEFT WORKSPACE (65% width - cols 7) ────────────────────── */}
            <div className="space-y-6 lg:col-span-7">
              {/* Submission Card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("submission.content")} — {t("userApplicationhistory.round")} #
                        {activeDetail.roundId}
                      </h3>
                      {activeDetail.completedAt && (
                        <p className="text-[11px] font-medium text-slate-400">
                          {formatDateTime(activeDetail.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className="border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Max Score: 100
                  </Badge>
                </div>

                <div className="p-6">
                  <SubmissionPreview
                    detail={activeDetail}
                    jdId={jdId}
                    onViewEmailSubmission={handleViewEmailSubmission}
                  />
                </div>
              </div>

              {/* AI Evaluation Insights Card */}
              {(activeDetail.aiScore !== undefined || activeDetail.aiFeedback) && (
                <div className="overflow-hidden rounded-2xl border border-purple-200/80 bg-gradient-to-b from-purple-50/40 via-white to-white p-6 shadow-xs dark:border-purple-500/20 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t("grading.aiFeedback")}
                        </h3>
                        <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                          {t("grading.aiScoreReference")}
                        </p>
                      </div>
                    </div>

                    {activeDetail.aiScore !== undefined && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1 text-sm font-extrabold text-white shadow-xs">
                        <Star className="h-4 w-4 fill-white" />
                        AI: {activeDetail.aiScore}/100
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-4 dark:border-purple-500/15 dark:bg-purple-500/5">
                    <AIFeedbackPanel
                      feedback={activeDetail.aiFeedback}
                      score={activeDetail.aiScore}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT WORKSPACE (35% width - cols 5 - Sticky Evaluation Card) ─ */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-6">
                <ActiveRoundGradingPanel
                  key={activeDetail.id}
                  detail={activeDetail}
                  onHrScoreSuccess={() => void refetch()}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        emailSubmissionId={emailPreviewId}
      />
    </div>
  );
}

// ============================================================
// Active Round Sticky HR Grading Panel
// ============================================================

function ActiveRoundGradingPanel({
  detail,
  onHrScoreSuccess,
}: {
  detail: ApplicationDetail;
  onHrScoreSuccess: () => void;
}) {
  const { mutate: submitScore, isPending: isSubmitting } = useHrScore();
  const hasExistingGrade = detail.hrScore !== undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [isPass, setIsPass] = useState(detail.finalResult === "PASSED");
  const [score, setScore] = useState(
    detail.hrScore !== undefined
      ? String(detail.hrScore)
      : detail.aiScore !== undefined
        ? String(Math.round(detail.aiScore))
        : ""
  );
  const [note, setNote] = useState(detail.hrNote ?? "");
  const [scoreError, setScoreError] = useState<string | null>(null);

  const handleScoreChange = (val: string) => {
    setScore(val);
    if (val.trim() === "") {
      setScoreError("Vui lòng nhập điểm số");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setScoreError("Điểm số phải là số hợp lệ");
      return;
    }
    if (num < 0 || num > 100) {
      setScoreError("Điểm số phải nằm trong khoảng từ 0 đến 100");
      return;
    }
    setScoreError(null);
  };

  const handleSubmit = () => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || score.trim() === "") {
      setScoreError("Vui lòng nhập điểm số hợp lệ từ 0 đến 100");
      toast.error(t("grading.invalidScore"));
      return;
    }
    if (scoreNum < 0 || scoreNum > 100) {
      setScoreError("Điểm số phải nằm trong khoảng từ 0 đến 100");
      toast.error(t("grading.invalidScore"));
      return;
    }
    const clampedScore = Math.min(100, Math.max(0, scoreNum));
    submitScore(
      {
        applicationDetailId: detail.id!,
        isPass,
        note: note.trim(),
        score: clampedScore,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          onHrScoreSuccess();
        },
      }
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {hasExistingGrade
                ? isEditing
                  ? t("grading.editScore")
                  : t("grading.hrResult")
                : t("grading.hrGrading")}
            </h3>
            <p className="text-[11px] font-medium text-slate-400">Round #{detail.roundId}</p>
          </div>
        </div>

        {hasExistingGrade && isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsEditing(false);
              setScore(String(detail.hrScore ?? detail.aiScore ?? ""));
              setNote(detail.hrNote ?? "");
              setScoreError(null);
            }}
            className="h-7 text-xs font-semibold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">
            {t("common.cancel")}
          </Button>
        )}
      </div>

      <div className="space-y-5 p-6">
        {/* Existing Grade View (when graded and not editing) */}
        {hasExistingGrade && !isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 dark:border-emerald-500/20 dark:from-emerald-950/30 dark:to-teal-950/10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500 shadow-2xs">
                  <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                    {t("grading.hrScore")}
                  </p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    {detail.hrScore}{" "}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </p>
                </div>
              </div>

              <Badge
                className={cn(
                  "px-3 py-1 text-xs font-extrabold shadow-2xs",
                  detail.finalResult === "PASSED"
                    ? "bg-emerald-600 text-white"
                    : "bg-red-600 text-white"
                )}>
                {detail.finalResult === "PASSED"
                  ? t("userApplicationhistory.passed")
                  : t("userApplicationhistory.failed")}
              </Badge>
            </div>

            {/* HR Note */}
            {detail.hrNote && (
              <div className="space-y-1.5">
                <h5 className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  {t("general.notes")} HR
                </h5>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                    {detail.hrNote}
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full gap-2 rounded-xl border-slate-200 font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {t("grading.editScore")}
            </Button>
          </div>
        ) : (
          /* Interactive Grading Form */
          <div className="space-y-4">
            {/* AI Reference Score Pill */}
            {detail.aiScore !== undefined && (
              <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/70 px-3.5 py-2.5 dark:border-purple-500/20 dark:bg-purple-500/5">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  {t("grading.aiScoreReference")}
                </span>
                <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                  {detail.aiScore} / 100
                </span>
              </div>
            )}

            {/* Decision Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("grading.decision")}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant={isPass ? "default" : "outline"}
                  className={cn(
                    "h-10 gap-2 rounded-xl text-xs font-bold transition-all",
                    isPass
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700"
                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400"
                  )}
                  onClick={() => setIsPass(true)}>
                  <ThumbsUp className="h-4 w-4" />
                  {t("userApplicationhistory.passed")}
                </Button>
                <Button
                  type="button"
                  variant={!isPass ? "default" : "outline"}
                  className={cn(
                    "h-10 gap-2 rounded-xl text-xs font-bold transition-all",
                    !isPass
                      ? "bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700"
                      : "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
                  )}
                  onClick={() => setIsPass(false)}>
                  <ThumbsDown className="h-4 w-4" />
                  {t("userApplicationhistory.failed")}
                </Button>
              </div>
            </div>

            {/* Score Input & Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("grading.hrScore")}
                </label>
                {detail.aiScore !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleScoreChange(String(Math.round(detail.aiScore!)))}
                    className="text-[11px] font-semibold text-purple-600 hover:underline dark:text-purple-400">
                    Use AI Score ({Math.round(detail.aiScore)})
                  </button>
                )}
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => handleScoreChange(e.target.value)}
                placeholder={t("grading.enterScore")}
                className={cn(
                  "h-10 rounded-xl text-base font-extrabold transition-colors",
                  scoreError && "border-red-500 focus-visible:ring-red-500"
                )}
              />

              {/* Validation error message */}
              {scoreError && (
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {scoreError}
                </p>
              )}

              {/* Score Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[100, 90, 80, 70, 60, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleScoreChange(String(preset))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* HR Note Textarea */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("general.notes")}
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("grading.enterHrNotes")}
                rows={4}
                className="resize-none rounded-xl text-xs"
              />
            </div>

            {/* Submit Action Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || scoreError !== null || score.trim() === ""}
              className={cn(
                "h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-md transition-all",
                isPass
                  ? "bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700"
                  : "bg-red-600 shadow-red-600/20 hover:bg-red-700"
              )}>
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4 text-white" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t("general.save")} {t("grading.hrResult")}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
