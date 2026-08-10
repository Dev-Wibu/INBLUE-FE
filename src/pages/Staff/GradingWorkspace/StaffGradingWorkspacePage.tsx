import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useHrScore } from "@/hooks/useApplicationDetails";
import { fetchClient } from "@/lib/api";
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
  Edit3,
  FileText,
  Layers,
  MessageSquare,
  OctagonX,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Target,
  Trophy,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
// Grading Modal for Staff
// ============================================================

function StaffGradingModal({
  isOpen,
  onClose,
  detail,
  onSuccess,
  roundName,
}: {
  isOpen: boolean;
  onClose: () => void;
  detail: ApplicationDetail;
  onSuccess: () => void;
  roundName: string;
}) {
  const { t } = useTranslation();
  const hasExistingGrade = detail.hrScore !== undefined && detail.hrScore !== null;
  const [isEditing, setIsEditing] = useState(hasExistingGrade);
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
      toast.success(t("grading.gradeSuccess", "Chấm điểm thành công!"));
      onSuccess();
      onClose();
    },
  });

  const handleScoreChange = (val: string) => {
    setScore(val);
    if (val.trim() === "") {
      setScoreError(t("grading.gradingErrorEmpty", "Vui lòng nhập điểm số"));
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setScoreError(t("grading.gradingErrorInvalidNumber", "Điểm số phải là số hợp lệ"));
      return;
    }
    if (num < 0 || num > 100) {
      setScoreError(
        t("grading.gradingErrorScoreRange", "Điểm số phải nằm trong khoảng từ 0 đến 100")
      );
      return;
    }
    setScoreError(null);
  };

  const handleSubmit = () => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || score.trim() === "") {
      setScoreError(t("gradingErrorScoreRange", "Vui lòng nhập điểm số hợp lệ từ 0 đến 100"));
      toast.error(t("grading.invalidScore", "Điểm không hợp lệ"));
      return;
    }
    if (scoreNum < 0 || scoreNum > 100) {
      setScoreError(
        t("grading.gradingErrorScoreRange", "Điểm số phải nằm trong khoảng từ 0 đến 100")
      );
      toast.error(t("grading.invalidScore", "Điểm không hợp lệ"));
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
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handleClose = () => {
    setIsEditing(hasExistingGrade);
    setScore(
      hasExistingGrade
        ? String(detail.hrScore)
        : detail.aiScore !== undefined && detail.aiScore !== null
          ? String(Math.round(detail.aiScore))
          : "0"
    );
    setNote(detail.hrNote ?? "");
    setScoreError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-0 shadow-2xl dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40">
        {/* Animated gradient header bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

        {/* Header */}
        <DialogHeader className="relative space-y-3 px-7 pt-7 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur-md" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                  <ClipboardCheck className="h-6 w-6" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-indigo-700 uppercase dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {t("common.staff", "STAFF")}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                    {roundName}
                  </span>
                </div>
                <DialogTitle className="mt-1 bg-gradient-to-r from-slate-900 to-indigo-700 bg-clip-text text-xl font-black text-transparent dark:from-white dark:to-indigo-300">
                  {hasExistingGrade && !isEditing
                    ? t("grading.hrResult", "Kết quả chấm điểm")
                    : isEditing
                      ? t("grading.editScore", "Sửa điểm")
                      : t("grading.hrGrading", "Chấm điểm HR")}
                </DialogTitle>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="relative max-h-[calc(90vh-100px)] space-y-5 overflow-y-auto px-7 pb-7">
          {/* AI Reference Card */}
          {detail.aiScore !== undefined && (
            <div className="group relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-white p-4 shadow-sm dark:border-purple-500/20 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900">
              <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/30">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold tracking-widest text-purple-600 uppercase dark:text-purple-300">
                      {t("grading.aiScoreReference", "AI Reference")}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {t("staffGrading.aiReferenceHint", "AI suggested score for this submission")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-2xl font-black tracking-tight text-transparent">
                    {Math.round(detail.aiScore)}
                  </span>
                  <span className="ml-0.5 text-xs font-bold text-slate-400">/100</span>
                </div>
              </div>
            </div>
          )}

          {/* Existing Grade (Read-Only Summary) */}
          {hasExistingGrade && !isEditing ? (
            <div className="space-y-4">
              <div
                className={cn(
                  "group relative overflow-hidden rounded-3xl border-2 p-5 shadow-xl transition-all",
                  detail.finalResult === "PASSED"
                    ? "border-emerald-300/60 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-slate-900"
                    : "border-rose-300/60 bg-gradient-to-br from-rose-50 via-orange-50/50 to-white dark:border-rose-500/30 dark:from-rose-950/40 dark:via-orange-950/20 dark:to-slate-900"
                )}>
                <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div
                        className={cn(
                          "absolute inset-0 rounded-2xl opacity-40 blur-md",
                          detail.finalResult === "PASSED" ? "bg-emerald-400" : "bg-rose-400"
                        )}
                      />
                      <div
                        className={cn(
                          "relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg",
                          detail.finalResult === "PASSED"
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/30"
                            : "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-rose-500/30"
                        )}>
                        {detail.finalResult === "PASSED" ? (
                          <Trophy className="h-7 w-7" />
                        ) : (
                          <AlertCircle className="h-7 w-7" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                        {t("grading.hrScore", "HR Score")}
                      </p>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-4xl font-black tracking-tight text-transparent dark:from-white dark:to-slate-200">
                          {detail.hrScore}
                        </span>
                        <span className="text-sm font-bold text-slate-400">/100</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-xs font-black tracking-wide shadow-md",
                        detail.finalResult === "PASSED"
                          ? "border-emerald-400 bg-emerald-500 text-white shadow-emerald-500/30"
                          : "border-rose-400 bg-rose-500 text-white shadow-rose-500/30"
                      )}>
                      {detail.finalResult === "PASSED" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {detail.finalResult === "PASSED"
                        ? t("userApplicationhistory.passed", "PASSED")
                        : t("userApplicationhistory.failed", "FAILED")}
                    </div>
                  </div>
                </div>
              </div>

              {detail.hrNote && (
                <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/60 to-white p-4 shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/30 dark:to-slate-900">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h5 className="text-xs font-extrabold tracking-wide text-indigo-700 uppercase dark:text-indigo-300">
                      {t("general.notes", "Notes")}
                    </h5>
                  </div>
                  <div className="rounded-xl border border-indigo-100/50 bg-white/60 p-3.5 dark:border-indigo-500/15 dark:bg-slate-950/40">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                      {detail.hrNote}
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-11 w-full gap-2 rounded-2xl border-2 border-indigo-200 bg-white font-bold text-indigo-600 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/40">
                <Edit3 className="h-4 w-4" />
                {t("grading.editScore", "Edit Score")}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Decision: Traffic Light / Arcade Game Style */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase dark:text-slate-300">
                  <Zap className="h-3.5 w-3.5 text-indigo-500" />
                  {t("grading.decision", "Decision")}
                </label>

                {/* Arcade Cabinet Housing */}
                <div className="traffic-light-cabinet relative overflow-hidden rounded-3xl border-4 border-slate-200 bg-gradient-to-b from-slate-50 via-white to-slate-100 p-6 shadow-xl shadow-slate-300/40 dark:border-slate-900 dark:bg-gradient-to-b dark:from-slate-800 dark:via-slate-900 dark:to-black dark:shadow-2xl dark:shadow-black/40">
                  {/* Scanline overlay (dark only) */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-10"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 3px)",
                    }}
                  />

                  {/* Inner glow */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />

                  <div className="relative flex items-center justify-around gap-6">
                    {/* PASS - GREEN LIGHT */}
                    <button
                      type="button"
                      onClick={() => setIsPass(true)}
                      className="group relative flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95">
                      <div
                        className={cn(
                          "traffic-light-bulb",
                          isPass ? "traffic-light-bulb--green-on" : "traffic-light-bulb--off"
                        )}
                        style={{ color: "#22c55e" }}>
                        <Play
                          className={cn(
                            "h-7 w-7 transition-all",
                            isPass
                              ? "text-emerald-950 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                              : "text-slate-400 opacity-50 dark:text-slate-600 dark:opacity-40"
                          )}
                          fill={isPass ? "currentColor" : "none"}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "text-xs font-black tracking-[0.2em] uppercase transition-all",
                            isPass
                              ? "decision-go-text text-emerald-500 drop-shadow-[0_0_12px_rgba(74,222,128,0.6)] dark:text-emerald-400 dark:drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]"
                              : "text-slate-400 opacity-60 dark:text-slate-500 dark:opacity-50"
                          )}>
                          {t("userApplicationhistory.passed", "PASSED")}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-3 py-0.5 text-[10px] font-bold transition-all",
                            isPass
                              ? "border border-emerald-400/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                          )}>
                          GO!
                        </span>
                      </div>
                      {isPass && (
                        <div className="absolute -inset-4 -z-10 rounded-full bg-emerald-400/30 blur-2xl dark:bg-emerald-500/20" />
                      )}
                    </button>

                    {/* Divider */}
                    <div className="flex h-32 w-px flex-col items-center justify-center gap-1">
                      <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-600">
                        OR
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                    </div>

                    {/* FAIL - RED LIGHT */}
                    <button
                      type="button"
                      onClick={() => setIsPass(false)}
                      className="group relative flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95">
                      <div
                        className={cn(
                          "traffic-light-bulb",
                          !isPass ? "traffic-light-bulb--red-on" : "traffic-light-bulb--off"
                        )}
                        style={{ color: "#ef4444" }}>
                        <OctagonX
                          className={cn(
                            "h-7 w-7 transition-all",
                            !isPass
                              ? "text-rose-950 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                              : "text-slate-400 opacity-50 dark:text-slate-600 dark:opacity-40"
                          )}
                          strokeWidth={3}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={cn(
                            "text-xs font-black tracking-[0.2em] uppercase transition-all",
                            !isPass
                              ? "decision-stop-text text-rose-500 drop-shadow-[0_0_12px_rgba(248,113,113,0.6)] dark:text-rose-400 dark:drop-shadow-[0_0_12px_rgba(248,113,113,0.8)]"
                              : "text-slate-400 opacity-60 dark:text-slate-500 dark:opacity-50"
                          )}>
                          {t("userApplicationhistory.failed", "FAILED")}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-3 py-0.5 text-[10px] font-bold transition-all",
                            !isPass
                              ? "border border-rose-400/60 bg-rose-50 text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/20 dark:text-rose-300"
                              : "border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500"
                          )}>
                          STOP!
                        </span>
                      </div>
                      {!isPass && (
                        <div className="absolute -inset-4 -z-10 rounded-full bg-rose-400/30 blur-2xl dark:bg-rose-500/20" />
                      )}
                    </button>
                  </div>

                  {/* Arcade decoration: status bar */}
                  <div className="relative mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-4 py-2 dark:border-slate-700/50 dark:bg-slate-950/80">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full transition-all",
                          isPass
                            ? "bg-emerald-500 shadow-[0_0_8px_#22c55e] dark:bg-emerald-400"
                            : "bg-rose-500 shadow-[0_0_8px_#ef4444] dark:bg-rose-400"
                        )}
                      />
                      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase dark:text-slate-400">
                        {isPass
                          ? t("staffGrading.decisionPassHint", "Candidate meets requirements")
                          : t(
                              "staffGrading.decisionFailHint",
                              "Candidate does not meet requirements"
                            )}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {isPass ? "► PLAY" : "■ HALT"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Input with Visual Feedback */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase dark:text-slate-300">
                    <Target className="h-3.5 w-3.5 text-indigo-500" />
                    {t("grading.hrScore", "HR Score (0-100)")}
                  </label>
                  {detail.aiScore !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleScoreChange(String(Math.round(detail.aiScore!)))}
                      className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 transition-all hover:border-purple-400 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:bg-purple-500/25">
                      <Sparkles className="h-3 w-3" />
                      {t("staffGrading.useAiScore", "Use AI")} ({Math.round(detail.aiScore)})
                    </button>
                  )}
                </div>

                {/* Visual Score Bar */}
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
                  <div className="relative flex items-center justify-between gap-4">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => handleScoreChange(e.target.value)}
                      placeholder={t("grading.enterScore", "Enter score...")}
                      className={cn(
                        "h-16 rounded-xl border-2 bg-white/80 text-center text-3xl font-black tracking-tight shadow-sm backdrop-blur-sm transition-all dark:bg-slate-950/60",
                        scoreError
                          ? "border-rose-400 focus-visible:ring-rose-500"
                          : "border-indigo-200 focus-visible:border-indigo-500 focus-visible:ring-indigo-500 dark:border-indigo-500/30"
                      )}
                    />
                    <div className="flex flex-col items-end">
                      <span
                        className={cn(
                          "bg-gradient-to-r bg-clip-text text-3xl font-black tracking-tight text-transparent",
                          score && !scoreError
                            ? "from-indigo-600 to-purple-600"
                            : "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700"
                        )}>
                        {score && !scoreError ? score : "0"}
                      </span>
                      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                        {t("staffGrading.outOf", "out of 100")}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                        scoreError
                          ? "bg-gradient-to-r from-rose-500 to-orange-500"
                          : isPass
                            ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"
                            : "bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, parseFloat(score) || 0))}%` }}
                    />
                  </div>
                </div>

                {scoreError && (
                  <p className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {scoreError}
                  </p>
                )}

                {/* Quick presets */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {t("staffGrading.quickPicks", "Quick picks")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[100, 90, 80, 70, 60, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleScoreChange(String(preset))}
                        className={cn(
                          "rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition-all",
                          score === String(preset)
                            ? "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                            : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
                        )}>
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* HR Note */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-extrabold tracking-wide text-slate-700 uppercase dark:text-slate-300">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                  {t("general.notes", "Notes")}
                  <span className="text-[10px] font-medium text-slate-400 normal-case">
                    ({t("general.optional", "optional")})
                  </span>
                </label>
                <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white transition-colors focus-within:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-indigo-500/60">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t(
                      "grading.enterHrNotes",
                      "Share feedback, observations, or reasons for your decision..."
                    )}
                    rows={4}
                    className="resize-none rounded-2xl border-0 bg-transparent p-3.5 text-sm leading-relaxed focus-visible:ring-0"
                  />
                  <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <span>{note.length}</span>
                    <span>/</span>
                    <span>500</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="space-y-2.5 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || scoreError !== null || score.trim() === ""}
                  className={cn(
                    "group relative h-12 w-full gap-2 overflow-hidden rounded-2xl text-sm font-black tracking-wide shadow-lg transition-all",
                    "text-white disabled:cursor-not-allowed disabled:opacity-50",
                    isPass
                      ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
                      : "bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40"
                  )}>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  {isSubmitting ? (
                    <>
                      <Spinner className="h-4 w-4 text-white" />
                      {t("common.saving", "Saving...")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {isPass
                        ? t("staffGrading.submitPass", "Confirm & Approve")
                        : t("staffGrading.submitFail", "Confirm & Reject")}
                    </>
                  )}
                </Button>
                <p className="text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {t(
                    "staffGrading.submitHint",
                    "Your decision will be recorded and visible to the candidate."
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  onOpenGrading,
}: {
  selectedRoundOrder: number;
  staffActiveDetail?: ApplicationDetail;
  activeRound?: JdRound;
  candidateName?: string;
  jdTitle?: string;
  onOpenGrading: () => void;
}) {
  const { t } = useTranslation();
  const detail = staffActiveDetail;

  const hrScore = detail?.hrScore;
  const aiScore = detail?.aiScore;
  const hasHrScore = hrScore !== undefined && hrScore !== null;
  const isPass = detail?.finalResult === "PASSED";
  const needsGrading = !hasHrScore;

  const roundName = activeRound?.name || `Vòng ${selectedRoundOrder}`;

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
                const typeKey = activeRound?.roundType;
                const translatedType = typeKey ? t(`common.roundType.${typeKey}`, typeKey) : null;
                const displayType =
                  activeRound?.name ||
                  translatedType ||
                  (selectedRoundOrder === 1 ? "Sàng lọc CV" : `Vòng ${selectedRoundOrder}`);
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
              {candidateName ? `${candidateName} • ` : ""}
              {jdTitle ? `${jdTitle} • ` : ""}
              {roundName}
            </span>
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
  // Use detailId if provided, otherwise use appId
  const primaryId = detailIdFromUrl || appIdFromUrl;

  // Core Data States
  const [app, setApp] = useState<components["schemas"]["Application"] | null>(null);
  const [jdInfo, setJdInfo] = useState<{
    title?: string;
    companyName?: string;
    logoUrl?: string | null;
    level?: string;
    description?: string;
    requirements?: string;
    rounds?: JdRound[];
  } | null>(null);
  const [candidateName, setCandidateName] = useState<string>("");
  const [detailsData, setDetailsData] = useState<ApplicationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Round View in Workspace
  const [selectedRoundOrder, setSelectedRoundOrder] = useState<number>(0);

  // Reset selectedRoundOrder when switching applications
  useEffect(() => {
    setSelectedRoundOrder(0);
  }, [primaryId]);

  // Modal State
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [activeDetailForGrading, setActiveDetailForGrading] = useState<ApplicationDetail | null>(
    null
  );

  // Load Main Data
  const loadData = useCallback(async () => {
    if (!primaryId || isNaN(primaryId)) {
      console.log("[StaffGrading] No primaryId, skipping load");
      return;
    }
    setLoading(true);
    try {
      let fetchedApplicationId: number | null = null;
      let fetchedDetail: ApplicationDetail | null = null;

      // 1. Try to fetch as Application first
      const { applicationService } = await import("@/services/application.manager");
      const appRes = await applicationService.getById(primaryId);

      if (appRes.success && appRes.data) {
        // primaryId is an Application ID
        setApp(appRes.data);
        const currentOrder = appRes.data.currentRoundOrder ?? 1;
        setSelectedRoundOrder((prev) => (prev === 0 ? currentOrder : prev));
        fetchedApplicationId = appRes.data.id!;

        if (appRes.data.userId) {
          try {
            const userRes = await fetchClient.GET("/api/users/{id}", {
              params: { path: { id: appRes.data.userId } },
            });
            if (userRes.response?.ok && userRes.data?.name) {
              setCandidateName(userRes.data.name);
            }
          } catch (err) {
            console.error("Failed to fetch candidate name:", err);
          }
        }

        // 3. Fetch JD Info
        if (appRes.data.jdId) {
          const jdRes = await fetchClient.GET("/api/job-descriptions/{id}", {
            params: { path: { id: appRes.data.jdId } },
          });
          if (jdRes.response?.ok && jdRes.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const jd = jdRes.data as any;
            const logoUrl =
              jd.companyLogo ||
              jd.companyLogoUrl ||
              jd.thumbnailUrl ||
              jd.company?.logoUrl ||
              jd.company?.avatarUrl ||
              null;
            setJdInfo({
              title: jd.title,
              companyName: jd.companyName,
              logoUrl,
              level: jd.level,
              description: jd.description,
              requirements: jd.requirements,
              rounds: jd.rounds ?? [],
            });
          }
        }
      } else {
        // primaryId might be a detailId - try fetching as ApplicationDetail
        const detailRes = await fetchClient.GET("/api/application-details/{id}", {
          params: { path: { id: primaryId } },
        });
        if (detailRes.response?.ok && detailRes.data) {
          fetchedDetail = detailRes.data as ApplicationDetail;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = fetchedDetail as any;
          // Extract applicationId from the detail
          fetchedApplicationId = d.applicationId || d.application?.id;

          if (fetchedApplicationId) {
            // Now fetch the actual application
            const realAppRes = await applicationService.getById(fetchedApplicationId);
            if (realAppRes.success && realAppRes.data) {
              setApp(realAppRes.data);
              const currentOrder = realAppRes.data.currentRoundOrder ?? 1;
              const detailRoundOrder = d.roundOrder ?? d.round?.roundOrder;
              setSelectedRoundOrder((prev) =>
                prev === 0 ? detailRoundOrder || currentOrder : prev
              );

              // Fetch JD Info
              if (realAppRes.data.jdId) {
                const jdRes = await fetchClient.GET("/api/job-descriptions/{id}", {
                  params: { path: { id: realAppRes.data.jdId } },
                });
                if (jdRes.response?.ok && jdRes.data) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const jd = jdRes.data as any;
                  const logoUrl =
                    jd.companyLogo ||
                    jd.companyLogoUrl ||
                    jd.thumbnailUrl ||
                    jd.company?.logoUrl ||
                    jd.company?.avatarUrl ||
                    null;
                  setJdInfo({
                    title: jd.title,
                    companyName: jd.companyName,
                    logoUrl,
                    level: jd.level,
                    description: jd.description,
                    requirements: jd.requirements,
                    rounds: jd.rounds ?? [],
                  });
                }
              }
            }
          }
        }
      }

      // 4. Fetch all Details for this application
      if (fetchedApplicationId) {
        const detailsRes = await fetchClient.GET(
          "/api/application-details/application/{applicationId}",
          {
            params: { path: { applicationId: fetchedApplicationId } },
          }
        );
        if (detailsRes.response?.ok && Array.isArray(detailsRes.data)) {
          setDetailsData(detailsRes.data as ApplicationDetail[]);
        }
      }
    } catch (err) {
      console.error("[StaffGrading] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [primaryId]);

  // Derive applicationId and current round from app state
  const applicationId = app?.id ?? appIdFromUrl ?? 0;
  const apiCurrentRoundOrder = app?.currentRoundOrder ?? 1;

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Round list sorted
  const rounds = useMemo(() => {
    return [...(jdInfo?.rounds ?? [])].sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0));
  }, [jdInfo?.rounds]);

  // Selected round object
  const activeRound = useMemo(() => {
    return rounds.find((r) => r.roundOrder === selectedRoundOrder) ?? rounds[0];
  }, [rounds, selectedRoundOrder]);

  // Active round detail
  const activeDetail = useMemo(() => {
    if (!activeRound) return undefined;
    return detailsData.find((d) => d.roundId === activeRound.id);
  }, [detailsData, activeRound]);

  // For staff grading, if detailIdFromUrl is provided, find that specific detail
  const staffActiveDetail = useMemo(() => {
    if (detailIdFromUrl > 0) {
      const found = detailsData.find((d) => d.id === detailIdFromUrl);
      if (found) return found;
    }
    return activeDetail;
  }, [detailIdFromUrl, detailsData, activeDetail]);

  // Round type detection
  const isCvScreeningRound = activeRound?.roundType?.toUpperCase() === "CV_SCREENING";
  const isEmailSimulatorRound =
    activeRound?.roundType?.toUpperCase() === "EMAIL_SIMULATION" ||
    activeRound?.roundType?.toUpperCase() === "EMAIL_SIMULATOR" ||
    activeRound?.roundType?.toUpperCase() === "EMAIL";
  const isQuizRound = activeRound?.roundType?.toUpperCase() === "QUIZ";
  const isCodingRound =
    activeRound?.roundType?.toUpperCase() === "CODING" ||
    activeRound?.roundType?.toUpperCase() === "CODE";
  const isCodeReviewRound =
    activeRound?.roundType?.toUpperCase() === "CODE_REVIEW" ||
    activeRound?.roundType?.toUpperCase() === "CODEREVIEW";
  const activeRoundType = activeRound?.roundType?.toUpperCase() ?? "";
  const activeRoundName = activeRound?.name?.toUpperCase() ?? "";
  const isMentorReviewRound =
    activeRoundType === "MENTOR_REVIEW" ||
    activeRoundType === "MENTOR" ||
    activeRoundType === "MENTROR_REVIEW" ||
    activeRoundName.includes("MENTOR");
  const isAiInterviewRound = activeRoundType === "AI_INTERVIEW" || activeRoundName.includes("AI");
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
    app?.status === "PASSED" ||
    app?.status === "FAILED" ||
    app?.status === "SOFT_FAILED" ||
    (staffActiveDetail?.status as string) === "COMPLETED" ||
    (activeRound?.roundOrder ?? 0) < apiCurrentRoundOrder;
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
    if (staffActiveDetail) {
      setActiveDetailForGrading(staffActiveDetail);
      setIsGradingModalOpen(true);
    }
  }, [staffActiveDetail]);

  const handleGradingSuccess = useCallback(() => {
    void loadData();
  }, [loadData]);

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

  if (!app) {
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
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/staff?tab=applicationGrading")}
              className="h-8 gap-1.5 px-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("userApplicationhistory.allApplications", "Danh sách chấm điểm")}</span>
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
              {jdInfo?.title ?? t("userApplicationhistory.applications", "Đơn ứng tuyển")}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ApplicationStatusBadge status={app.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-8 gap-1.5 border-slate-200 text-xs font-bold dark:border-slate-800">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t("userApplicationhistory.reload", "Làm mới")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="mx-auto w-full max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Staff Assessment Summary Header Card & Score Sticker Badge */}
        <StaffGradingWorkspaceHeaderCard
          selectedRoundOrder={selectedRoundOrder}
          staffActiveDetail={staffActiveDetail}
          activeRound={activeRound}
          candidateName={candidateName}
          jdTitle={jdInfo?.title}
          onOpenGrading={handleOpenGrading}
        />

        {/* Workspace Main Grid */}
        {activeRound ? (
          isStandaloneLayout ? (
            /* Standalone Rounds: Use RoundWorkspaceDispatcher */
            <RoundWorkspaceDispatcher
              round={activeRound}
              detail={staffActiveDetail}
              applicationId={applicationId}
              jdId={app.jdId}
              jdInfo={jdInfo}
              currentRoundOrder={apiCurrentRoundOrder}
              appStatus={app.status}
              onRefresh={loadData}
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
                    jdId={app.jdId}
                    jdInfo={jdInfo}
                    currentRoundOrder={apiCurrentRoundOrder}
                    appStatus={app.status}
                    onRefresh={loadData}
                  />
                </div>
              ) : (
                <Card className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs lg:col-span-8 dark:border-slate-800/60 dark:bg-slate-900/40">
                  {/* Header Vòng thi */}
                  <div className="border-b border-slate-100 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-[#0F172A]/70">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white shadow-sm">
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
                      jdId={app.jdId}
                      jdInfo={jdInfo}
                      currentRoundOrder={apiCurrentRoundOrder}
                      appStatus={app.status}
                      onRefresh={loadData}
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
                        {app.createdAt ? formatDateTime(app.createdAt) : ""}
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
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  </div>

                  {app.status === "PASSED" && (
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

                {/* Widget 4: Staff Grading Action Card */}
                <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{t("staffGrading.gradingAction", "Thao tác chấm điểm")}</span>
                  </div>
                  <div className="space-y-2">
                    {hasHrScore ? (
                      <>
                        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/40">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              {t("staffGrading.alreadyGraded", "Đã chấm điểm")}
                            </span>
                          </div>
                          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {staffActiveDetail?.hrScore}/100
                          </span>
                        </div>
                        <Button
                          onClick={handleOpenGrading}
                          variant="outline"
                          className="w-full gap-2 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                          <Star className="h-4 w-4" />
                          {t("grading.editScore", "Sửa điểm")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleOpenGrading}
                        className="w-full gap-2 rounded-xl bg-indigo-600 font-bold text-white shadow-md hover:bg-indigo-700">
                        <ClipboardCheck className="h-4 w-4" />
                        {t("staffGrading.gradeNow", "Chấm điểm ngay")}
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Grading Modal */}
      {activeDetailForGrading && (
        <StaffGradingModal
          isOpen={isGradingModalOpen}
          onClose={() => setIsGradingModalOpen(false)}
          detail={activeDetailForGrading}
          onSuccess={handleGradingSuccess}
          roundName={roundDisplayName}
        />
      )}
    </div>
  );
}
