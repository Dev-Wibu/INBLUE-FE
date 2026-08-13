import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useUsers } from "@/hooks/useApplication";
import { useApplicationDetailsForReviewer, useHrScore } from "@/hooks/useApplicationDetails";
import { useJobDescriptions } from "@/hooks/useJobDescription";
import { inferRoundType } from "@/lib/application-detail-utils";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Layers,
  Lock,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Star,
  Trophy,
  User,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";
import { type JdRound } from "../../User/Applications/components/HorizontalPipeline";
import { RoundWorkspaceDispatcher } from "../../User/Applications/components/RoundWorkspaceDispatcher";
import { applicationTheme } from "../../User/Applications/components/applicationTheme";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

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
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-slate-100 bg-slate-50 text-indigo-600 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A] dark:text-indigo-400",
        className
      )}>
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

function JobLevelBadge({ level }: { level?: string }) {
  if (!level) return null;
  const normalizedLevel = level.toUpperCase();
  const levelStyles: Record<string, string> = {
    INTERN:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
    FRESHER:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
    JUNIOR:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60",
    MID: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800/60",
    MIDDLE:
      "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800/60",
    SENIOR:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60",
    LEAD: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
  };
  const style =
    levelStyles[normalizedLevel] ||
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase",
        style
      )}>
      {normalizedLevel}
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    IN_PROGRESS: {
      label: t("userApplicationhistory.statusInterviewing", "ĐANG ỨNG TUYỂN"),
      className:
        "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    },
    PASSED: {
      label: t("userApplicationhistory.statusCompleted", "TRÚNG TUYỂN"),
      className:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    },
    FAILED: {
      label: t("userApplicationhistory.statusRejected", "CHƯA ĐẠT"),
      className:
        "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
    },
    SOFT_FAILED: {
      label: t("userApplicationhistory.needsImprovement", "CẦN CẢI THIỆN"),
      className:
        "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    },
  };
  const item = config[status] ?? { label: status, className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider whitespace-nowrap uppercase",
        item.className
      )}>
      {item.label}
    </span>
  );
}

// ============================================================
// Inline Grading Form for Staff (replaces modal)
// ============================================================

function InlineGradingForm({
  detail,
  onSuccess,
  isEditing,
  onCancel,
}: {
  detail: ApplicationDetail;
  onSuccess: () => void;
  isEditing: boolean;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const hasExistingGrade = detail.hrScore !== undefined && detail.hrScore !== null;
  const [isPass, setIsPass] = useState(detail.finalResult === "PASSED");
  const [score, setScore] = useState(
    hasExistingGrade
      ? String(detail.hrScore)
      : detail.aiScore !== undefined && detail.aiScore !== null
        ? String(Math.round(detail.aiScore))
        : "0"
  );
  const [note, setNote] = useState(detail.hrNote ?? "");
  const [scoreError, setScoreError] = useState<string | null>(null);

  const { mutate: submitScore, isPending: isSubmitting } = useHrScore({
    onSuccess: () => {
      toast.success(t("grading.gradeSuccess", "Grading successful!"));
      onSuccess();
    },
  });

  const handleScoreChange = (val: string) => {
    setScore(val);
    if (val.trim() === "") {
      setScoreError(t("grading.gradingErrorEmpty", "Please enter a score"));
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setScoreError(t("grading.gradingErrorInvalidNumber", "Score must be a valid number"));
      return;
    }
    if (num < 0 || num > 100) {
      setScoreError(t("grading.gradingErrorScoreRange", "Score must be between 0 and 100"));
      return;
    }
    setScoreError(null);
  };

  const handleSubmit = () => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || score.trim() === "" || scoreNum < 0 || scoreNum > 100) {
      toast.error(t("grading.invalidScore", "Invalid score"));
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
      { onSuccess: () => onSuccess() }
    );
  };

  // Read-only view mode (after grading)
  if (hasExistingGrade && !isEditing) {
    return (
      <div className="space-y-3">
        {/* Result Card */}
        <div
          className={cn(
            "overflow-hidden rounded-2xl border-2 p-4",
            detail.finalResult === "PASSED"
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40"
              : "border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/40"
          )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  detail.finalResult === "PASSED"
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-600 text-white"
                )}>
                {detail.finalResult === "PASSED" ? (
                  <Trophy className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {t("grading.hrScore", "HR Score")}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {detail.hrScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400">/100</span>
                </div>
              </div>
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold",
                detail.finalResult === "PASSED"
                  ? "border-emerald-400 bg-emerald-500 text-white"
                  : "border-rose-400 bg-rose-500 text-white"
              )}>
              {detail.finalResult === "PASSED" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
              {detail.finalResult === "PASSED" ? "PASSED" : "FAILED"}
            </div>
          </div>
        </div>

        {/* Note */}
        {detail.hrNote && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/30 dark:bg-indigo-950/30">
            <p className="text-[11px] font-medium whitespace-pre-wrap text-slate-700 italic dark:text-slate-300">
              "{detail.hrNote}"
            </p>
          </div>
        )}
      </div>
    );
  }

  // Edit note mode (has existing grade but editing)
  if (hasExistingGrade && isEditing) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Edit Evaluation</h4>
        </div>

        {/* 2 Columns: Overall Score (readonly) | Recommendation */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Overall Score (readonly) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Overall Score
            </label>
            <div className="flex h-9 items-center justify-center rounded-lg border-2 border-slate-200 bg-slate-50 text-base font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Lock className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
              {detail.hrScore}
            </div>
          </div>

          {/* Right: Recommendation */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              Recommendation
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPass(true)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all",
                  isPass
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                )}>
                <CheckCircle2
                  className={cn("h-4 w-4", isPass ? "text-emerald-500" : "text-slate-400")}
                />
                Pass
              </button>
              <button
                type="button"
                onClick={() => setIsPass(false)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all",
                  !isPass
                    ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                    : "border-slate-200 bg-white text-slate-500 hover:border-rose-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                )}>
                <XCircle className={cn("h-4 w-4", !isPass ? "text-rose-500" : "text-slate-400")} />
                Reject
              </button>
            </div>
          </div>
        </div>

        {/* Comments & Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Comments & Notes
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add any notes about this candidate..."
            rows={2}
            className="resize-none rounded-lg border border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {/* Action Buttons - Right aligned */}
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-8 rounded-lg border-slate-200 px-4 text-xs font-medium dark:border-slate-700">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "h-8 gap-1.5 rounded-lg px-4 text-xs font-medium text-white transition-all disabled:opacity-50",
              isPass ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
            )}>
            {isSubmitting ? (
              <>
                <Spinner className="h-3 w-3 text-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3 w-3" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // New grading mode (no existing grade)
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-indigo-600" />
        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Staff Evaluation</h4>
      </div>

      {/* 2 Columns: Overall Score | Recommendation */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: Overall Score */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Overall Score
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => handleScoreChange(e.target.value)}
            placeholder="0"
            className={cn(
              "h-9 rounded-lg border-2 text-center text-base font-bold",
              scoreError
                ? "border-rose-400"
                : "border-slate-200 focus:border-indigo-500 dark:border-slate-700"
            )}
          />
          {scoreError && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-rose-600">
              <AlertTriangle className="h-3 w-3" />
              {scoreError}
            </p>
          )}
          {detail.aiScore !== undefined && (
            <button
              type="button"
              onClick={() => handleScoreChange(String(Math.round(detail.aiScore!)))}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 transition-all hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300">
              <Sparkles className="h-3 w-3" />
              AI: {Math.round(detail.aiScore)}
            </button>
          )}
        </div>

        {/* Right: Recommendation */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
            Recommendation
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPass(true)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all",
                isPass
                  ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              )}>
              <CheckCircle2
                className={cn("h-4 w-4", isPass ? "text-emerald-500" : "text-slate-400")}
              />
              Pass
            </button>
            <button
              type="button"
              onClick={() => setIsPass(false)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition-all",
                !isPass
                  ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                  : "border-slate-200 bg-white text-slate-500 hover:border-rose-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              )}>
              <XCircle className={cn("h-4 w-4", !isPass ? "text-rose-500" : "text-slate-400")} />
              Reject
            </button>
          </div>
        </div>
      </div>

      {/* Comments & Notes */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Comments & Notes
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any notes about this candidate..."
          rows={2}
          className="resize-none rounded-lg border border-slate-200 text-xs dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* Action Buttons - Right aligned */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="outline"
          onClick={onCancel}
          className="h-8 rounded-lg border-slate-200 px-4 text-xs font-medium dark:border-slate-700">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || scoreError !== null || score.trim() === ""}
          className={cn(
            "h-8 gap-1.5 rounded-lg px-4 text-xs font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50",
            isPass ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
          )}>
          {isSubmitting ? (
            <>
              <Spinner className="h-3 w-3 text-white" />
              Saving...
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Save Evaluation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Staff Grading Summary Header Card with Sticker Score Badge
// ============================================================

function StaffGradingWorkspaceHeaderCard({
  selectedRoundOrder,
  staffActiveDetail,
  activeRound,
  candidateName,
  jdTitle,
  applicationName,
  candidateUserName,
  onOpenGrading,
  isEditing,
  onSuccess,
  onCancel,
}: {
  selectedRoundOrder: number;
  staffActiveDetail?: ApplicationDetail;
  activeRound?: JdRound;
  candidateName?: string;
  jdTitle?: string;
  applicationName?: string;
  candidateUserName?: string;
  onOpenGrading: () => void;
  isEditing?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const detail = staffActiveDetail;

  // Use the BE-provided userName (from the list-item payload) when available,
  // otherwise fall back to whatever the parent already fetched.
  const resolvedUserName = candidateUserName ?? candidateName;

  const hrScore = detail?.hrScore;
  const aiScore = detail?.aiScore;
  const hasHrScore = hrScore !== undefined && hrScore !== null;
  const isPass = detail?.finalResult === "PASSED";
  const needsGrading = !hasHrScore;

  const inferredType = detail ? inferRoundType(detail) : null;
  const typeKey = activeRound?.roundType || inferredType;
  const translatedType = typeKey ? t(`common.roundType.${typeKey}`, typeKey) : null;
  const roundName = activeRound?.name || translatedType || `Vòng ${selectedRoundOrder}`;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-md transition-all duration-300 dark:border-slate-800 dark:bg-slate-900">
      {/* Background Subtle Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />

      {/* Main Staff Grading Header Content */}
      <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT SIDE: Staff Grading Info */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-extrabold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500" />
              {(() => {
                const inferredType = detail ? inferRoundType(detail) : null;
                const typeKey = activeRound?.roundType || inferredType;
                const translatedType = typeKey ? t(`common.roundType.${typeKey}`, typeKey) : null;
                const displayType =
                  activeRound?.name || translatedType || `Vòng ${selectedRoundOrder}`;
                return `Vòng ${selectedRoundOrder}: ${displayType}`;
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
                <BadgeCheck className="h-3.5 w-3.5" />
                {isPass
                  ? `${t("staffGrading.roundPassed", "ĐẠT")} (PASSED)`
                  : `${t("staffGrading.roundFailed", "KHÔNG ĐẠT")} (FAILED)`}
              </span>
            ) : needsGrading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                {t("staffGrading.staffWaitingForGrading", "CHỜ STAFF ĐÁNH GIÁ & CHẤM ĐIỂM")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {detail?.status ?? "PENDING"}
              </span>
            )}

            {aiScore !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                <Star className="h-3.5 w-3.5 text-purple-500" />
                {t("staffGrading.aiReferenceLabel", { score: Math.round(aiScore) })}
              </span>
            )}
          </div>

          {/* Header Title & Subtitle */}
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {hasHrScore
                ? `${t("staffGrading.gradingSpaceTitle", "Kết Quả Đánh Giá")} ${roundName}`
                : `${t("staffGrading.gradingSpaceTitle", "Không Gian Đánh Giá & Chấm Điểm")} - ${roundName}`}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {hasHrScore
                ? t(
                    "staffGrading.staffGradedResult",
                    "Kết quả đánh giá bài làm đã được Staff thẩm định và ghi nhận trên hệ thống."
                  )
                : t(
                    "staffGrading.viewSubmissionAndEnter",
                    "Xem bài làm của ứng viên trong giao diện bên dưới và nhập điểm số & nhận xét HR."
                  )}
            </p>
          </div>

          {/* HR Note Highlight Box (If Staff has graded) */}
          {hasHrScore && detail?.hrNote && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/30">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <FileText className="h-3.5 w-3.5" />
                {t("staffGrading.staffNotesAndComment", "Ghi chú & Nhận xét của Staff:")}
              </div>
              <p className="text-xs whitespace-pre-wrap text-slate-700 italic dark:text-slate-300">
                "{detail.hrNote}"
              </p>
            </div>
          )}

          {/* Quick Action Button & Meta */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              onClick={onOpenGrading}
              size="sm"
              className={cn(
                "gap-2 rounded-xl text-xs font-bold shadow-sm transition-all",
                hasHrScore
                  ? "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700"
              )}>
              <ClipboardCheck className="h-4 w-4" />
              {hasHrScore
                ? t("staffGrading.editScoreAndNote", "Chỉnh sửa điểm số & nhận xét")
                : t("staffGrading.enterScoreAndStaffNote", "Nhập điểm số & Nhận xét Staff")}
            </Button>

            <span className="text-xs font-medium text-slate-400">|</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {resolvedUserName ? `${resolvedUserName} • ` : ""}
              {(applicationName ?? jdTitle) ? `${applicationName ?? jdTitle} • ` : ""}
              {roundName}
            </span>
          </div>

          {/* Expanded Grading Form - drops down from header */}
          {isEditing && detail && (
            <div className="overflow-hidden rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between bg-white/80 px-4 py-2 dark:bg-slate-900/80">
                <span className="text-[10px] font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                  {hasHrScore
                    ? t("grading.editScore", "Chỉnh sửa điểm")
                    : t("grading.hrGrading", "Chấm điểm HR")}
                </span>
                <button
                  onClick={onCancel}
                  className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                  Đóng
                </button>
              </div>
              <div className="p-4">
                <InlineGradingForm
                  detail={detail}
                  onSuccess={() => {
                    onSuccess?.();
                  }}
                  isEditing={true}
                  onCancel={onCancel ?? (() => {})}
                />
              </div>
            </div>
          )}
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
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                  {hasHrScore
                    ? t("staffGrading.roundResult", "KẾT QUẢ CHẤM")
                    : t("staffGrading.roundScore", "ĐIỂM ĐÁNH GIÁ")}
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
                      {t("staffGrading.referenceAi", "Tham chiếu AI")}
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
                    <p className="text-[10px] font-semibold text-white/60">
                      {t("staffGrading.scoreAwaiting", "Chưa nhập điểm")}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Stamp Ribbon */}
              <div className="flex items-center justify-between border-t border-white/15 pt-1.5">
                <span className="flex items-center gap-1 text-[10px] font-bold text-white/80">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {hasHrScore
                    ? isPass
                      ? t("staffGrading.roundPassed", "ĐẠT YÊU CẦU")
                      : t("staffGrading.roundFailed", "KHÔNG ĐẠT")
                    : t("staffGrading.roundAwaiting", "CHỜ CHẤM")}
                </span>
                {hasHrScore && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-xs",
                      isPass ? "bg-emerald-400 text-slate-950" : "bg-rose-500 text-white"
                    )}>
                    {isPass
                      ? t("staffGrading.roundVerified", "VERIFIED")
                      : t("staffGrading.roundRejected", "REJECTED")}
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
// Main Staff Grading Workspace Page
// ============================================================

export function StaffGradingWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Support both detailId and appId from URL
  // The ID in URL could be either a detail ID (for staff grading a specific detail) or application ID
  const detailIdParam = searchParams.get("detailId");
  const appIdParam = searchParams.get("appId");
  const detailIdFromUrl = detailIdParam ? Number(detailIdParam) : 0;
  const appIdFromUrl = appIdParam ? Number(appIdParam) : 0;

  // ============================================================
  // DATA SOURCE: strictly the LIST endpoints — NO per-id calls.
  // BE confirmed: "vô detail ko đc gọi thêm endpoint gì cả, vô trong
  // hiển thị các dữ liệu còn lại của item đó trong list thôi".
  //
  // Anchor: the detail row from /api/application-details/reviewer. Everything
  // else (application name, user name, round info) is OPTIONAL enrichment —
  // it comes from BE if BE embeds those fields in the detail row, otherwise
  // falls back to LIST caches (job-descriptions, users) that are already
  // populated by the grading list page when staff navigated from there.
  // ============================================================
  const {
    data: reviewerDetails = [],
    isLoading: isLoadingReviewer,
    refetch: refetchReviewer,
  } = useApplicationDetailsForReviewer(true);
  const { data: allJds = [] } = useJobDescriptions();
  const { data: allUsers = [] } = useUsers();

  // List → maps for O(1) lookup (best-effort enrichment; empty if BE
  // forbids staff from listing these resources)
  const jdMap = useMemo(() => {
    const map = new Map<number, (typeof allJds)[number]>();
    allJds.forEach((jd) => {
      if (jd.id != null) map.set(jd.id, jd);
    });
    return map;
  }, [allJds]);

  const userMap = useMemo(() => {
    const map = new Map<number, string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list = (allUsers as any[]) ?? [];
    list.forEach((u) => {
      if (u.id != null && u.name) map.set(u.id, u.name);
    });
    return map;
  }, [allUsers]);

  // Resolve the detail the staff is grading — purely from the /reviewer list.
  // For detailId mode: pick the row with `id === detailIdFromUrl`.
  // For appId mode (no detailId): pick the first row tied to that application.
  const resolvedStaffDetail = useMemo(() => {
    if (detailIdFromUrl > 0) {
      return reviewerDetails.find((d) => d.id === detailIdFromUrl);
    }
    if (appIdFromUrl > 0) {
      return reviewerDetails.find((d) => d.applicationId === appIdFromUrl);
    }
    return undefined;
  }, [detailIdFromUrl, appIdFromUrl, reviewerDetails]);

  // applicationId derived from the chosen detail (or appId fallback)
  const applicationId = resolvedStaffDetail?.applicationId ?? appIdFromUrl ?? 0;

  // Sibling details of the same application — already in /reviewer list
  const detailsData = useMemo(
    () =>
      applicationId > 0 ? reviewerDetails.filter((d) => d.applicationId === applicationId) : [],
    [applicationId, reviewerDetails]
  );

  // Enrichment derived from the detail row itself (preferred), then from
  // global list caches (fallback). BE schema patch adds applicationName /
  // userName / jdId / roundType / roundName on ApplicationDetail so the page
  // can stay strictly on /reviewer data.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detailAny = resolvedStaffDetail as any;

  // Try to find the JD via the detail's jdId (when BE provides it) — fallback
  // to scanning all JDs by job-title match is not safe; use jdId only.
  const detailJdId = detailAny?.jdId;
  const jdRaw = detailJdId != null ? jdMap.get(detailJdId) : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jdAny = jdRaw as any;
  // Prefer BE-embedded fields on the detail row, fall back to JD list cache.
  const jdInfo = {
    title: detailAny?.jdTitle ?? jdRaw?.title,
    companyName: detailAny?.companyName ?? jdAny?.companyName,
    logoUrl:
      detailAny?.jdLogoUrl ??
      jdAny?.companyLogo ??
      jdAny?.companyLogoUrl ??
      jdAny?.thumbnailUrl ??
      jdAny?.company?.logoUrl ??
      jdAny?.company?.avatarUrl ??
      null,
    level: jdRaw?.level,
    description: jdRaw?.description,
    requirements: jdRaw?.requirements,
    rounds: jdRaw?.rounds ?? [],
  };

  // Candidate name: prefer detail.userName (BE-embedded), fall back to global users list.
  const candidateName =
    detailAny?.userName ?? (detailAny?.userId != null ? (userMap.get(detailAny.userId) ?? "") : "");

  // Application-level state: currentRoundOrder / status / createdAt may come
  // from the detail (when BE embeds them) or be undefined. We don't fall back
  // to /api/applications/{id} — strictly list-only.
  const apiCurrentRoundOrder = detailAny?.currentRoundOrder ?? undefined;
  const apiAppStatus = detailAny?.appStatus;
  const appCreatedAt = detailAny?.appCreatedAt;

  // Round list sorted
  const rounds = useMemo(() => {
    return [...(jdInfo?.rounds ?? [])].sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));
  }, [jdInfo?.rounds]);

  // Active round driven by the resolved detail's `roundId` (the row staff
  // picked). When the detail payload embeds roundType/roundName (BE-side
  // patch), use them directly so we don't even need JD's rounds array.
  // Falls back to inferRoundType() (heuristic on submission data) when both
  // the BE fields and JD rounds are unavailable, so we always have a label.
  const activeRound = useMemo(() => {
    const detailRoundId = resolvedStaffDetail?.roundId;

    // 1. BE-embedded roundType/roundName on detail row (BE patch) — use them directly
    if (detailAny?.roundType || detailAny?.roundName) {
      return {
        id: detailRoundId ?? 0,
        name: detailAny.roundName ?? "",
        roundType: detailAny.roundType,
        roundOrder: detailAny.roundOrder ?? 1,
        passThreshold: detailAny.passThreshold,
        description: detailAny.roundDescription,

        roundConfig: detailAny.roundConfig,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    // 2. Match detail's roundId against the JD rounds array
    if (detailRoundId && rounds.length > 0) {
      const fromRounds = rounds.find((r) => r.id === detailRoundId);
      if (fromRounds) return fromRounds;
    }

    // 3. If no JD cache or roundId not found in JD rounds, fall back to
    //    inferRoundType + construct a synthetic round so staff can still grade.
    //    Do NOT default to rounds[0] — that picks the wrong round (often quiz).
    if (resolvedStaffDetail) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inferredType = inferRoundType(resolvedStaffDetail as any);
      return {
        id: detailRoundId ?? 0,
        name: inferredType ?? "",
        roundType: inferredType,
        roundOrder: detailAny?.roundOrder ?? 1,
        passThreshold: detailAny?.passThreshold,
        description: detailAny?.roundDescription,

        roundConfig: detailAny?.roundConfig,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    // 4. Last resort: use first JD round only when there is no detail row at all
    if (rounds.length > 0) return rounds[0];

    return undefined;
  }, [rounds, resolvedStaffDetail, detailAny]);

  // Infer round type directly from detail data (robust — works even when
  // activeRound.roundType is null/undefined, which is common for staff workspace).
  const inferredRoundType = resolvedStaffDetail ? inferRoundType(resolvedStaffDetail) : null;
  const effectiveRoundType = activeRound?.roundType ?? inferredRoundType ?? null;

  // Active round detail (back-compat match: detail that matches activeRound)
  const activeDetail = useMemo(() => {
    if (!activeRound) return undefined;
    return detailsData.find((d) => d.roundId === activeRound.id);
  }, [detailsData, activeRound]);

  // The detail the workspace actually renders. = resolvedStaffDetail when
  // staff explicitly picked a row, otherwise the round-driven match.
  const staffActiveDetail = resolvedStaffDetail ?? activeDetail;

  // Loading state — only the mandatory /reviewer call gates the screen.
  // JD/user list queries may be empty for staff and should NOT block render.
  const loading = isLoadingReviewer;

  // Inline Grading State (replaces modal)
  const [isGradingEditing, setIsGradingEditing] = useState(false);

  // Round type detection using effectiveRoundType (inferRoundType fallback for robustness)
  const upperType = effectiveRoundType?.toUpperCase() ?? "";
  const upperName = activeRound?.name?.toUpperCase() ?? "";
  const isCvScreeningRound = upperType === "CV_SCREENING";
  const isEmailSimulatorRound =
    upperType === "EMAIL_SIMULATION" || upperType === "EMAIL_SIMULATOR" || upperType === "EMAIL";
  const isQuizRound = upperType === "QUIZ";
  const isCodingRound = upperType === "CODING" || upperType === "CODE";
  const isCodeReviewRound = upperType === "CODE_REVIEW" || upperType === "CODEREVIEW";
  const isMentorReviewRound =
    upperType === "MENTOR_REVIEW" ||
    upperType === "MENTOR" ||
    upperType === "MENTROR_REVIEW" ||
    upperName.includes("MENTOR");
  const isAiInterviewRound = upperType === "AI_INTERVIEW" || upperName.includes("AI");
  const isStandaloneLayout =
    isCvScreeningRound ||
    isEmailSimulatorRound ||
    isQuizRound ||
    isCodingRound ||
    isCodeReviewRound ||
    isMentorReviewRound ||
    isAiInterviewRound;

  // Status calculations
  const totalRounds = rounds.length;
  const isRoundCompleted =
    apiAppStatus === "PASSED" ||
    apiAppStatus === "FAILED" ||
    apiAppStatus === "SOFT_FAILED" ||
    (staffActiveDetail?.status as string) === "COMPLETED" ||
    (activeRound?.roundOrder ?? 0) < (apiCurrentRoundOrder ?? Infinity);
  const isRoundCurrent = !isRoundCompleted && activeRound?.roundOrder === apiCurrentRoundOrder;
  const hasHrScore = staffActiveDetail?.hrScore !== undefined;

  // Get round icon
  const getRoundIcon = (roundType?: string) => {
    const type = roundType?.replace("MENTROR", "MENTOR");
    switch (type) {
      case "CV_SCREENING":
        return FileText;
      case "QUIZ":
        return AlertTriangle;
      case "AI_INTERVIEW":
        return Star;
      case "CODING":
      case "CODE_REVIEW":
        return AlertTriangle;
      case "EMAIL_SIMULATOR":
        return AlertTriangle;
      case "MENTOR_REVIEW":
        return User;
      default:
        return Star;
    }
  };
  const RoundIcon = getRoundIcon(activeRound?.roundType);

  const handleOpenGrading = useCallback(() => {
    setIsGradingEditing((prev) => !prev);
  }, []);

  const handleGradingSuccess = useCallback(() => {
    // useHrScore already invalidates the /reviewer cache. Pinging it here
    // makes the workspace pull the freshly-graded detail immediately.
    void refetchReviewer();
  }, [refetchReviewer]);

  if (loading) {
    return (
      <div className={applicationTheme.page}>
        <div className="mx-auto w-full max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-28 w-full rounded-[20px]" />
          <Skeleton className="h-96 w-full rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!staffActiveDetail) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <FileText className="h-12 w-12 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {t("userApplicationhistory.noApplicationsYet", "Không tìm thấy đơn ứng tuyển")}
        </h2>
        <Button onClick={() => navigate("/staff?tab=applicationGrading")}>
          {t("userApplicationhistory.allApplications", "Quay lại Lịch sử ứng tuyển")}
        </Button>
      </div>
    );
  }

  const roundDisplayName = activeRound?.roundType
    ? t(
        `common.roundType.${activeRound.roundType.replace("MENTROR", "MENTOR")}`,
        activeRound.name || ""
      )
    : activeRound?.name || "Bài làm ứng viên";

  return (
    <div className={applicationTheme.page}>
      {/* Top Header Navigation */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/staff?tab=applicationGrading")}
              className="h-8 gap-1.5 px-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("userApplicationhistory.goBackToList", " Quay lại danh sách")}</span>
            </Button>

            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

            <div className="flex min-w-0 items-center gap-2">
              <CompanyAvatar
                logoUrl={jdInfo?.logoUrl}
                companyName={jdInfo?.companyName}
                className="h-7 w-7 rounded-[8px]"
              />
              <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                {jdInfo?.companyName}
              </span>
            </div>

            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

            <h1 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
              {jdInfo?.title ?? t("application.applications", "Đơn ứng tuyển")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ApplicationStatusBadge status={apiAppStatus} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetchReviewer();
              }}
              className="h-8 gap-1.5 border-slate-200 text-xs font-bold dark:border-slate-800">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.reload")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="mx-auto w-full max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Staff Assessment Summary Header Card & Score Sticker Badge */}
        <StaffGradingWorkspaceHeaderCard
          selectedRoundOrder={activeRound?.roundOrder ?? 0}
          staffActiveDetail={staffActiveDetail}
          activeRound={activeRound}
          candidateName={candidateName}
          jdTitle={jdInfo?.title}
          applicationName={
            (staffActiveDetail as unknown as { applicationName?: string } | undefined)
              ?.applicationName
          }
          candidateUserName={
            (staffActiveDetail as unknown as { userName?: string } | undefined)?.userName
          }
          onOpenGrading={handleOpenGrading}
          isEditing={isGradingEditing}
          onSuccess={handleGradingSuccess}
          onCancel={() => setIsGradingEditing(false)}
        />

        {/* Workspace Main Grid */}
        {activeRound ? (
          isStandaloneLayout ? (
            /* Standalone Rounds: Use RoundWorkspaceDispatcher */
            <RoundWorkspaceDispatcher
              round={activeRound}
              detail={staffActiveDetail}
              applicationId={applicationId}
              jdId={detailJdId}
              jdInfo={jdInfo}
              currentRoundOrder={apiCurrentRoundOrder ?? 1}
              appStatus={apiAppStatus}
              isStaffView={true}
              onRefresh={() => {
                void refetchReviewer();
              }}
            />
          ) : (
            /* Other Rounds: Standard 8:4 Grid */
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
              {/* Main Round Content (Left 8 Cols) */}
              {isEmailSimulatorRound ? (
                <div className="space-y-6 lg:col-span-8">
                  <RoundWorkspaceDispatcher
                    round={activeRound}
                    detail={staffActiveDetail}
                    applicationId={applicationId}
                    jdId={detailJdId}
                    jdInfo={jdInfo}
                    currentRoundOrder={apiCurrentRoundOrder ?? 1}
                    appStatus={apiAppStatus}
                    isStaffView={true}
                    onRefresh={() => {
                      void refetchReviewer();
                    }}
                  />
                </div>
              ) : (
                <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs lg:col-span-8 dark:border-slate-800/60 dark:bg-slate-900/40">
                  {/* Header Vòng thi */}
                  <div className="border-b border-slate-100 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-[#0F172A]/70">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white shadow-sm">
                          {/* eslint-disable-next-line react-hooks/static-components */}
                          <RoundIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
                              {t("userApplicationhistory.round", "Vòng")} {activeRound.roundOrder}
                            </span>
                            {isRoundCompleted && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                ✓ {t("userApplicationhistory.completedBadge", "Hoàn thành")}
                              </span>
                            )}
                            {isRoundCurrent && (
                              <span className="animate-pulse rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                ▶ {t("userApplicationhistory.currentRoundBadge", "Vòng hiện tại")}
                              </span>
                            )}
                          </div>
                          <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                            {roundDisplayName}
                          </h2>
                        </div>
                      </div>

                      {staffActiveDetail?.finalScore !== undefined &&
                        staffActiveDetail?.finalScore !== null && (
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              {t("userApplicationhistory.scoreLabel", "Điểm số")}
                            </span>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                              {staffActiveDetail.finalScore}
                              <span className="text-xs font-normal text-slate-400">/100</span>
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Main Interactive Round Workspace Module */}
                  <div className="p-6">
                    <RoundWorkspaceDispatcher
                      round={activeRound}
                      detail={staffActiveDetail}
                      applicationId={applicationId}
                      jdId={detailJdId}
                      jdInfo={jdInfo}
                      currentRoundOrder={apiCurrentRoundOrder ?? 1}
                      appStatus={apiAppStatus}
                      isStaffView={true}
                      onRefresh={() => {
                        void refetchReviewer();
                      }}
                    />
                  </div>
                </Card>
              )}

              {/* Rich Sidebar Summary (Right 4 Cols) */}
              <div className="space-y-4 lg:col-span-4">
                {/* Widget 1: Company & Application Meta */}
                <Card className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
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
                      <div className="mt-0.5 flex items-center gap-2">
                        <JobLevelBadge level={jdInfo?.level} />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {jdInfo?.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("staffGrading.applicationDateLabel", "Ngày nộp đơn:")}
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {appCreatedAt ? formatDateTime(appCreatedAt) : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("staffGrading.totalRoundsLabel", "Tổng số vòng:")}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {t("staffGrading.roundsCount", { count: totalRounds })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("staffGrading.applicationStatusLabel", "Trạng thái hồ sơ:")}
                      </span>
                      <ApplicationStatusBadge status={apiAppStatus} />
                    </div>
                  </div>

                  {apiAppStatus === "PASSED" && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/40">
                      <Award className="mx-auto mb-1.5 h-7 w-7 text-emerald-600" />
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        {t(
                          "userApplicationhistory.passedCongratsTitle",
                          "Chúc mừng! Ứng viên trúng tuyển"
                        )}
                      </h4>
                    </div>
                  )}
                </Card>

                {/* Widget 2: Skills & Tech Stack */}
                <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {t("staffGrading.skillsAndRequirements", "Kỹ năng & Yêu cầu vị trí")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      ReactJS / TypeScript
                    </span>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Java Spring Boot
                    </span>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      PostgreSQL / Redis
                    </span>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      RESTful API Architecture
                    </span>
                  </div>
                </Card>

                {/* Widget 3: Active Round Benchmark */}
                <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {t("staffGrading.roundStandard", {
                        roundOrder: activeRound.roundOrder,
                      })}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="text-slate-500">
                        {t("staffGrading.passThreshold", "Điểm sàn qua vòng:")}
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {activeRound.passThreshold ?? 70}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {t("staffGrading.timeLimit", "Thời gian quy định:")}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        {activeRound.configData?.timeLimitMinutes
                          ? `${activeRound.configData.timeLimitMinutes} ${t("staffGrading.minutes", "phút")}`
                          : t("staffGrading.unlimited", "Không giới hạn")}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Widget 4: Staff Grading Status */}
                <Card className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{t("staffGrading.gradingAction", "Chấm điểm HR")}</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {hasHrScore ? (
                      <>
                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {t("staffGrading.alreadyGraded", "Đã chấm")}
                            </span>
                          </div>
                          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            {staffActiveDetail?.hrScore}/100
                          </span>
                        </div>
                        <Button
                          onClick={handleOpenGrading}
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 rounded-xl border-indigo-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                          <Star className="h-3.5 w-3.5" />
                          {t("grading.editScore", "Sửa điểm")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleOpenGrading}
                        size="sm"
                        className="w-full gap-1.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        {t("staffGrading.gradeNow", "Chấm điểm")}
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
