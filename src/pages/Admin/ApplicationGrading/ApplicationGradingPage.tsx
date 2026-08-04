import { ReloadButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
import { Textarea } from "@/components/ui/textarea";
import { useApplication, useApplications, useUsers } from "@/hooks/useApplication";
import {
  useApplicationDetail,
  useApplicationDetails,
  useApplicationDetailsForReviewer,
  useHrScore,
} from "@/hooks/useApplicationDetails";
import { useEmailSubmission } from "@/hooks/useEmailSubmission";
import { usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import {
  filterOutAutoGradedRounds,
  isAutoGradedRound,
  needsHrScoring,
} from "@/lib/application-detail-utils";
import { formatDateTime } from "@/lib/formatting";
import i18n from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Filter,
  Mail,
  Search,
  Star,
  ThumbsDown,
  ThumbsUp,
  XCircle,
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
};

const RESULT_CONFIG: Record<string, { label: string; className: string }> = {
  PASSED: {
    label: t("userApplicationhistory.passed"),
    className: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  FAILED: {
    label: t("userApplicationhistory.failed"),
    className: "bg-red-500/15 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  },
};

// ============================================================
// Expandable Round Card
// ============================================================

interface RoundCardProps {
  detail: ApplicationDetail;
  isExpanded: boolean;
  isStartGrading: boolean;
  onToggle: () => void;
  onStartGrading: () => void;
  onViewEmailSubmission: (emailSubmissionId: number) => void;
  onHrScoreSuccess: () => void;
}

function RoundCard({
  detail,
  isExpanded,
  isStartGrading,
  onToggle,
  onStartGrading,
  onViewEmailSubmission,
  onHrScoreSuccess,
}: RoundCardProps) {
  const { mutate: submitScore, isPending: isSubmitting } = useHrScore({
    onSuccess: onHrScoreSuccess,
  });
  const statusCfg = STATUS_CONFIG[detail.status ?? ""] ?? { label: detail.status, className: "" };
  const resultCfg = detail.finalResult ? RESULT_CONFIG[detail.finalResult] : null;
  const needsHrScore = needsHrScoring(detail);
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

  const data = detail.submissionData as SubmissionData | undefined;

  const handleSubmit = () => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || score.trim() === "") {
      toast.error(t("grading.invalidScore"));
      return;
    }
    const clampedScore = Math.min(100, Math.max(0, scoreNum));
    submitScore({
      applicationDetailId: detail.id!,
      isPass,
      note: note.trim(),
      score: clampedScore,
    });
  };

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-[20px] border transition-all duration-200",
        isExpanded
          ? "border-indigo-400 shadow-xl shadow-indigo-500/10 dark:border-indigo-500/50 dark:shadow-indigo-950/30"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-800/80 dark:hover:border-slate-700",
        needsHrScore && !hasExistingGrade && !isExpanded && "border-amber-300 dark:border-amber-600"
      )}>
      {/* Card Header — Always visible */}
      <div className="relative p-5">
        {/* Dark inner panel matching ApplicationHistoryPage style */}
        <div className="rounded-[14px] border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800/80 dark:bg-[#0F172A]/90">
          <div className="flex items-start justify-between gap-3">
            {/* Left: expand toggle + round info */}
            <div className="flex items-start gap-3">
              {/* Expand/Collapse button */}
              {needsHrScore && !hasExistingGrade && !isExpanded ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onStartGrading}
                  className="mt-0.5 h-8 gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-600">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {t("grading.grade")}
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={onToggle}
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                    isExpanded
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                  )}>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Round info */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {t("userApplicationhistory.round")} #{detail.roundId}
                  </h3>
                  {/* Status badge with dot */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                      statusCfg.className
                    )}>
                    {statusCfg.dot && (
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                    )}
                    {statusCfg.label}
                  </span>
                  {/* Result badge */}
                  {resultCfg && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                        resultCfg.className
                      )}>
                      {resultCfg.label}
                    </span>
                  )}
                  {/* Needs grading warning */}
                  {needsHrScore && !hasExistingGrade && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 uppercase dark:bg-amber-500/10 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      {t("grading.needsGrading")}
                    </span>
                  )}
                </div>

                {/* Quick scores row */}
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  {detail.aiScore !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        AI {detail.aiScore}
                      </span>
                    </div>
                  )}
                  {detail.hrScore !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        HR {detail.hrScore}
                      </span>
                    </div>
                  )}
                  {detail.finalScore !== undefined && (
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Final {detail.finalScore}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: completion indicator */}
            <div className="flex shrink-0 items-center gap-2">
              {detail.completedAt && (
                <span className="hidden text-xs text-slate-400 sm:block">
                  {formatDateTime(detail.completedAt)}
                </span>
              )}
              {detail.finalResult === "PASSED" && (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              {detail.finalResult === "FAILED" && (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10">
                  <XCircle className="h-5 w-5" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-5 dark:border-slate-800">
          <div className="space-y-5">
            {/* Submission Content */}
            {data && (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  <FileText className="h-3.5 w-3.5" />
                  {t("submission.content")}
                </h4>
                <SubmissionPreview detail={detail} onViewEmailSubmission={onViewEmailSubmission} />
              </div>
            )}

            {/* AI Feedback */}
            {detail.aiScore !== undefined || detail.aiFeedback ? (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  <Star className="h-3.5 w-3.5 text-purple-400" />
                  {t("grading.aiFeedback")}
                </h4>
                <div className="rounded-[14px] border border-purple-100 bg-purple-50/80 p-4 dark:border-purple-500/20 dark:bg-purple-500/5">
                  <AIFeedbackPanel feedback={detail.aiFeedback} score={detail.aiScore} />
                </div>
              </div>
            ) : null}

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* HR Grading Section */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {hasExistingGrade
                    ? isEditing
                      ? t("grading.editScore")
                      : t("grading.hrResult")
                    : t("grading.hrGrading")}
                </h4>
                {hasExistingGrade && isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setScore(String(detail.hrScore ?? detail.aiScore ?? ""));
                      setNote(detail.hrNote ?? "");
                    }}
                    className="h-7 gap-1.5 text-xs">
                    {t("common.cancel")}
                  </Button>
                )}
              </div>

              {/* Existing Grade Display — Đã chấm */}
              {hasExistingGrade && !isEditing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 rounded-[14px] border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                        <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                          {detail.hrScore}
                        </p>
                        <p className="text-xs font-medium text-slate-400">/100</p>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-emerald-200 dark:bg-emerald-500/20" />
                    <Badge
                      className={
                        detail.finalResult === "PASSED"
                          ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-red-500/15 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                      }>
                      {detail.finalResult === "PASSED"
                        ? t("userApplicationhistory.passed")
                        : t("userApplicationhistory.failed")}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5 rounded-lg text-xs">
                    {t("grading.editScore")}
                  </Button>
                </div>
              )}

              {/* Grading Form — Chưa chấm / Đang sửa / Bấm nút "Chấm" */}
              {!hasExistingGrade || isEditing || isStartGrading ? (
                <div className="space-y-4 rounded-[14px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0F172A]/90">
                  {/* AI Score Reference */}
                  {detail.aiScore !== undefined && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-purple-100 bg-purple-50/70 p-3 dark:border-purple-500/20 dark:bg-purple-500/5">
                      <Star className="h-4 w-4 shrink-0 text-purple-400" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {t("grading.aiScoreReference")}
                      </span>
                      <span className="ml-auto text-sm font-extrabold text-purple-600 dark:text-purple-400">
                        {detail.aiScore}
                      </span>
                    </div>
                  )}

                  {/* Decision */}
                  <div>
                    <label className="mb-2.5 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {t("grading.decision")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={isPass ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-10 gap-1.5 rounded-xl text-sm font-semibold",
                          isPass
                            ? "bg-emerald-600 shadow-sm hover:bg-emerald-700"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                        onClick={() => setIsPass(true)}>
                        <ThumbsUp className="h-4 w-4" />
                        {t("userApplicationhistory.passed")}
                      </Button>
                      <Button
                        type="button"
                        variant={!isPass ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-10 gap-1.5 rounded-xl text-sm font-semibold",
                          !isPass
                            ? "bg-red-600 shadow-sm hover:bg-red-700"
                            : "text-red-600 dark:text-red-400"
                        )}
                        onClick={() => setIsPass(false)}>
                        <ThumbsDown className="h-4 w-4" />
                        {t("userApplicationhistory.failed")}
                      </Button>
                    </div>
                  </div>

                  {/* Score Input */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {t("grading.hrScore")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder={t("grading.enterScore")}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {t("general.notes")}
                    </label>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("grading.enterHrNotes")}
                      rows={3}
                      className="resize-none rounded-xl"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                      "h-10 w-full gap-2 rounded-xl text-sm font-semibold shadow-sm",
                      isPass ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    )}>
                    {isSubmitting ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        {t("common.saving")}
                      </>
                    ) : (
                      <>
                        {isPass ? (
                          <ThumbsUp className="h-4 w-4" />
                        ) : (
                          <ThumbsDown className="h-4 w-4" />
                        )}
                        {t("general.save")} {t("grading.hrResult")}
                      </>
                    )}
                  </Button>
                </div>
              ) : null}

              {/* Existing HR Note */}
              {detail.hrNote && !isEditing && (
                <div className="mt-4">
                  <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <FileText className="h-3.5 w-3.5" />
                    {t("general.notes")} HR
                  </h5>
                  <div className="rounded-[14px] border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
                    <p className="text-sm whitespace-pre-wrap text-blue-700 dark:text-blue-300">
                      {detail.hrNote}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Submission Preview
// ============================================================

interface SubmissionPreviewProps {
  detail: ApplicationDetail;
  onViewEmailSubmission?: (emailSubmissionId: number) => void;
}

function SubmissionPreview({ detail, onViewEmailSubmission }: SubmissionPreviewProps) {
  const data = detail.submissionData as SubmissionData | undefined;
  const [localExpanded, setLocalExpanded] = useState(false);

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

  // File upload (CV, etc.)
  if (data.fileUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            {t("submission.submittedFile")}
          </span>
        </div>
        <a
          href={data.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5",
            "text-xs font-medium text-blue-700 hover:bg-blue-100",
            "dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30",
            "transition-colors"
          )}>
          <FileText className="h-3.5 w-3.5" />
          {t("submission.viewSubmittedFile")}
        </a>
      </div>
    );
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

  // Code review submissions
  if (data.codeReviewSubmissions && data.codeReviewSubmissions.length > 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400">
        <ClipboardCheck className="h-4 w-4" />
        <span>
          {data.codeReviewSubmissions.length} {t("review.issuesReviewed")}
        </span>
      </div>
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
// Application Grading List Page
// ============================================================

export function ApplicationGradingPage({
  onOpenGradingDetail,
  basePath,
}: {
  onOpenGradingDetail?: (
    _appId: number,
    _extra?: { candidateName?: string; jdId?: string }
  ) => void;
  basePath?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBase = basePath ?? (location.pathname.startsWith("/staff") ? "/staff" : "/admin");
  const { user } = useAuthStore();
  const isStaff = user?.role === "STAFF";

  // Staff & Admin: lấy tất cả applications (chỉ dùng cho Admin để hiển thị danh sách)
  const { data: rawApps, refetch: refetchApps } = useApplications();

  // Staff: lấy các application-detail được gán cho STAFF hiện tại
  // (đúng API: GET /api/application-details/reviewer — không phải workaround quét tất cả applications)
  const { data: reviewerDetails = [], refetch: refetchReviewer } =
    useApplicationDetailsForReviewer(isStaff);

  const applications = useMemo(() => (Array.isArray(rawApps) ? rawApps : []), [rawApps]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      return {
        id: detail.applicationId!,
        status: detail.status ?? "PENDING",
        overallScore: detail.finalScore ?? undefined,
        userId,
        userName: userId != null ? (userMap.get(userId) ?? `User #${userId}`) : undefined,
        jdId: appMeta?.jdId,
        detailId: detail.id,
        detailStatus: detail.status,
        detail,
      };
    });
  }, [isStaff, reviewerDetails, applicationMap, userMap]);

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
          if (
            statusFilter !== "all" &&
            item.detailStatus !== statusFilter &&
            item.status !== statusFilter
          ) {
            return false;
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
        userName: userMap.get(app.userId!) ?? `User #${app.userId}`,
        createdAt: app.createdAt,
      }));
  }, [isStaff, staffItems, applications, searchQuery, statusFilter, userMap]);

  // Transform for sortable hook with sort metadata
  const sortableApplications = useMemo((): SortableApplication[] => {
    return filteredApplications.map((item) => ({
      ...item,
      idSortValue: item.detailId ?? item.id,
      createdAtSortValue: item.createdAt ? new Date(item.createdAt).getTime() : 0,
      scoreSortValue: item.overallScore ?? -1,
    }));
  }, [filteredApplications]);

  const { sortedData } = useSortable(sortableApplications, {
    defaultSort: { key: "idSortValue", direction: "desc" },
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
        // Pass candidate info for tab label and detail page header
        const extra: { candidateName?: string; jdId?: string } = {};
        if (item) {
          const name = item.userName ?? (item.userId ? userMap.get(item.userId) : undefined);
          if (name) extra.candidateName = name;
          if (item.jdId !== undefined) extra.jdId = String(item.jdId);
        }
        onOpenGradingDetail(detailId ?? _appId, extra);
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
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
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
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("application.searchByUserOrJob")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.setPage(1);
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              pagination.setPage(1);
            }}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder={t("common.filterByStatus")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              <SelectItem value="PENDING">{t("status.pendingSubmit")}</SelectItem>
              <SelectItem value="SUBMITTED">{t("adminQuizsetmanagement.submitted")}</SelectItem>
              <SelectItem value="AI_EVALUATED">{t("status.aiGraded")}</SelectItem>
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
      <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Card Grid */}
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {paginatedData.map((item) => {
                const status = item.detailStatus ?? item.status;
                const score = item.overallScore;
                const roundId = item.detail?.roundId ?? item.currentRoundOrder;
                const jdId = item.jdId;
                const userId = item.userId;
                const userName =
                  item.userName ?? userMap.get(userId!) ?? (userId ? `User #${userId}` : "-");
                const statusCfg = STATUS_CONFIG[status ?? ""] ?? {
                  label: status,
                  className: "bg-slate-100 text-slate-600",
                  dot: "bg-slate-400",
                };

                return (
                  <button
                    key={item.detailId ?? item.id}
                    onClick={() => handleOpenGrading(item.id, item.detailId, item)}
                    className="group relative flex w-full flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/30">
                    {/* Top: Avatar + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-11 w-11 shrink-0 rounded-[14px]">
                          <AvatarFallback className="rounded-[14px] bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                            {(userName ?? "?")[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                            {userName}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                              #{item.id}
                              {jdId != null ? ` · JD#${jdId}` : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider",
                          statusCfg.className
                        )}>
                        {statusCfg.dot && (
                          <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                        )}
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Middle: Score + Round */}
                    <div className="mt-4 flex items-center justify-between">
                      {score !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {t("userApplicationhistory.totalScore")}
                            </p>
                            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                              {score}
                              <span className="text-xs font-normal text-slate-400">/100</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <Star className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
                        </div>
                      )}

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Bottom: Round + Action */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t("userApplicationhistory.round")} {roundId ?? 1}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 transition-colors group-hover:text-indigo-700 dark:text-indigo-400 dark:group-hover:text-indigo-300">
                        {t("grading.grade")}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
              <PaginationControl pagination={pagination} />
            </div>
          </div>
        )}
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
  // For Staff, singleDetail contains the applicationId; for Admin, numericId is the app id.
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

  // Fetch user info for the candidate (if we have a userId)
  const userId = application?.userId;
  const { data: allUsers } = useUsers();
  const candidateName = useMemo(() => {
    // Use prop first if provided
    if (candidateNameProp) return candidateNameProp;
    if (!userId || !allUsers) return undefined;
    const userList = Array.isArray(allUsers) ? allUsers : [];
    const found = userList.find((u: { id?: number; name?: string }) => u.id === userId);
    return found?.name ?? `User #${userId}`;
  }, [candidateNameProp, userId, allUsers]);

  const candidateAvatar = useMemo(() => {
    if (!userId || !allUsers) return undefined;
    const userList = Array.isArray(allUsers) ? allUsers : [];
    const found = userList.find((u: { id?: number; avatarUrl?: string }) => u.id === userId);
    return found?.avatarUrl;
  }, [userId, allUsers]);

  // jdId: prefer prop, fallback to fetched application data
  const jdId = jdIdProp !== undefined ? Number(jdIdProp) : application?.jdId;

  const isLoading =
    isLoadingSingle || isLoadingDetails || (applicationId > 0 && isLoadingApplication);
  const refetch = refetchSingle || refetchDetails;

  // Email preview dialog state
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewId, setEmailPreviewId] = useState<number | null>(null);

  // Track which round to start grading (for "Chấm" button)
  const [startGradingRoundId, setStartGradingRoundId] = useState<number | null>(null);

  // Unified details array: single detail for Staff, all details for Admin
  // Filter out auto-graded rounds (QUIZ, etc.) - these don't need HR scoring
  const displayDetails = useMemo((): ApplicationDetail[] => {
    if (isStaff && singleDetail) {
      return isAutoGradedRound(singleDetail) ? [] : [singleDetail];
    }
    return filterOutAutoGradedRounds(details);
  }, [isStaff, singleDetail, details]);

  // Expanded rounds state - track which round cards are expanded
  const [expandedRoundIds, setExpandedRoundIds] = useState<Set<number>>(() => {
    if (displayDetails.length === 0) return new Set<number>();
    const firstNeedsHr = displayDetails.find((d) => needsHrScoring(d));
    const firstId = firstNeedsHr?.id ?? displayDetails[0]?.id;
    return firstId !== undefined ? new Set([firstId]) : new Set<number>();
  });

  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const handleViewEmailSubmission = useCallback((emailSubmissionId: number) => {
    setEmailPreviewId(emailSubmissionId);
    setEmailPreviewOpen(true);
  }, []);

  const toggleExpanded = useCallback((detailId: number) => {
    setExpandedRoundIds((prev) => {
      const next = new Set(prev);
      if (next.has(detailId)) {
        next.delete(detailId);
      } else {
        next.add(detailId);
      }
      return next;
    });
    setStartGradingRoundId(null);
  }, []);

  const handleStartGrading = useCallback((detailId: number) => {
    setStartGradingRoundId(detailId);
    setExpandedRoundIds(new Set([detailId]));
  }, []);

  const expandAll = useCallback(() => {
    setExpandedRoundIds(
      new Set(displayDetails.map((d: ApplicationDetail) => d.id!).filter(Boolean))
    );
  }, [displayDetails]);

  const collapseAll = useCallback(() => {
    setExpandedRoundIds(new Set());
  }, []);

  // Filter displayDetails based on showPendingOnly
  const filteredDetails = useMemo(() => {
    if (!showPendingOnly) return displayDetails;
    return displayDetails.filter((d) => needsHrScoring(d));
  }, [displayDetails, showPendingOnly]);

  // Calculate summary stats
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
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-slate-500">{t("general.loadingData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* ── HEADER BANNER ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-4 py-5 sm:px-6 dark:border-slate-800 dark:from-[#0F172A]/40 dark:via-slate-900 dark:to-indigo-950/30">
        {/* Back button row */}
        <div className="mb-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg border-slate-200 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={() => navigate(`${dashboardBase}?tab=applicationGrading`)}>
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("common.goBack")}
          </Button>
          <span className="text-xs text-slate-400">{t("application.gradingDetail")}</span>
        </div>

        {/* Candidate info row */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 shrink-0 rounded-[16px] shadow-sm ring-2 ring-white dark:ring-indigo-500/20">
            <AvatarImage src={candidateAvatar ?? undefined} alt={candidateName ?? "User"} />
            <AvatarFallback className="rounded-[16px] bg-indigo-100 text-lg font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
              {(candidateName ?? "?")[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {candidateName ?? `${t("application.detailsId")}${applicationId || numericId}`}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {t("application.detailsId")}
                {applicationId || numericId}
              </span>
              {jdId !== undefined && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  {t("common.id", "ID JD")}: <span className="font-semibold">{jdId}</span>
                </span>
              )}
            </div>
          </div>

          {/* Reload button */}
          <button
            onClick={() => {
              void refetch();
            }}
            disabled={isLoading}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            title={t("common.reload")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("h-4 w-4", isLoading && "animate-spin")}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* NEW LAYOUT: Single page with all rounds as expandable cards */}
      <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
        {/* ── SUMMARY STATS BAR ────────────────────────────────────────────────── */}
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Total Rounds */}
            <div className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-[#0F172A]/90">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10">
                <ClipboardCheck className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("round.totalRounds")}
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {summaryStats.total}
                </p>
              </div>
            </div>
            {/* Pending */}
            <div className="flex items-center gap-3 rounded-[14px] border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {t("grading.needsGrading")}
                </p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {summaryStats.pending}
                </p>
              </div>
            </div>
            {/* Graded */}
            <div className="flex items-center gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t("grading.gradedCount")}
                </p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {summaryStats.completed}
                </p>
              </div>
            </div>
            {/* Average Score */}
            <div className="flex items-center gap-3 rounded-[14px] border border-purple-200 bg-purple-50/60 p-3 dark:border-purple-500/20 dark:bg-purple-500/5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-500/15">
                <Star className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  {t("grading.hrAverageScore")}
                </p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {summaryStats.avgScore}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FILTER & ACTIONS BAR ─────────────────────────────────────────── */}
        {!singleDetail && (
          <div className="flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
            <Button
              variant={showPendingOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPendingOnly(!showPendingOnly)}
              className={cn(
                "h-8 gap-1.5 rounded-lg text-xs font-semibold",
                showPendingOnly && "bg-amber-500 shadow-sm hover:bg-amber-600"
              )}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("grading.needsGrading")} ({summaryStats.pending})
            </Button>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
                className="h-8 gap-1.5 rounded-lg text-xs dark:border-slate-700">
                {t("userPractice.openAll")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="h-8 gap-1.5 rounded-lg text-xs dark:border-slate-700">
                {t("common.collapse")}
              </Button>
            </div>
          </div>
        )}

        {/* Expandable Round Cards */}
        <div className="space-y-3 p-4 sm:p-6">
          {filteredDetails.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/60 py-16 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <ClipboardCheck className="h-7 w-7 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {t("application.noRounds")}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {t("adminApplicationGrading.pageDescription")}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDetails.map((detail: ApplicationDetail) => (
                <RoundCard
                  key={detail.id}
                  detail={detail}
                  isExpanded={expandedRoundIds.has(detail.id!)}
                  isStartGrading={startGradingRoundId === detail.id}
                  onToggle={() => toggleExpanded(detail.id!)}
                  onStartGrading={() => handleStartGrading(detail.id!)}
                  onViewEmailSubmission={handleViewEmailSubmission}
                  onHrScoreSuccess={() => {
                    setStartGradingRoundId(null);
                    // No need to call refetch() - queryClient.invalidateQueries already triggers refetch
                  }}
                />
              ))}
            </div>
          )}
        </div>
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
