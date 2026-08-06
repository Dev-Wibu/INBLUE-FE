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
  AlertTriangle,
  ArrowLeft,
  Award,
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Layers,
  RefreshCw,
  Star,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";
import { type JdRound } from "../../User/Applications/components/HorizontalPipeline";
import { RoundWorkspaceDispatcher } from "../../User/Applications/components/RoundWorkspaceDispatcher";
import { applicationTheme } from "../../User/Applications/components/applicationTheme";
import { StaffHorizontalPipeline } from "./components/StaffHorizontalPipeline";

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
  const hasExistingGrade = detail.hrScore !== undefined;
  const [isEditing, setIsEditing] = useState(hasExistingGrade);
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
      toast.error(t("grading.invalidScore", "Điểm không hợp lệ"));
      return;
    }
    if (scoreNum < 0 || scoreNum > 100) {
      setScoreError("Điểm số phải nằm trong khoảng từ 0 đến 100");
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
      detail.hrScore !== undefined
        ? String(detail.hrScore)
        : detail.aiScore !== undefined
          ? String(Math.round(detail.aiScore))
          : ""
    );
    setNote(detail.hrNote ?? "");
    setScoreError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            {hasExistingGrade && !isEditing
              ? t("grading.hrResult", "Kết quả chấm điểm")
              : isEditing
                ? t("grading.editScore", "Sửa điểm")
                : t("grading.hrGrading", "Chấm điểm HR")}{" "}
            - {roundName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* AI Reference */}
          {detail.aiScore !== undefined && (
            <div className="flex items-center justify-between rounded-xl border border-purple-100 bg-purple-50/70 px-3.5 py-2.5 dark:border-purple-500/20 dark:bg-purple-500/5">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <Star className="h-3.5 w-3.5 text-purple-500" />
                {t("grading.aiScoreReference", "Điểm tham khảo AI")}
              </span>
              <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400">
                {detail.aiScore} / 100
              </span>
            </div>
          )}

          {/* Existing Grade */}
          {hasExistingGrade && !isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-5 dark:border-emerald-500/20 dark:from-emerald-950/30 dark:to-teal-950/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-500 shadow-2xs">
                    <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                      {t("grading.hrScore", "Điểm HR")}
                    </p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">
                      {detail.hrScore}{" "}
                      <span className="text-xs font-normal text-slate-400">/100</span>
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-extrabold shadow-2xs",
                    detail.finalResult === "PASSED"
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-300"
                      : "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:border-rose-400/40 dark:bg-rose-400/15 dark:text-rose-300"
                  )}>
                  {detail.finalResult === "PASSED"
                    ? t("userApplicationhistory.passed", "ĐẠT")
                    : t("userApplicationhistory.failed", "KHÔNG ĐẠT")}
                </span>
              </div>
              {detail.hrNote && (
                <div className="space-y-1.5">
                  <h5 className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    {t("general.notes", "Ghi chú")}
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
                <ThumbsDown className="h-4 w-4" />
                {t("grading.editScore", "Sửa điểm")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Decision Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("grading.decision", "Quyết định")}
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
                    {t("userApplicationhistory.passed", "ĐẠT")}
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
                    {t("userApplicationhistory.failed", "KHÔNG ĐẠT")}
                  </Button>
                </div>
              </div>

              {/* Score Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {t("grading.hrScore", "Điểm HR")} (0 - 100)
                  </label>
                  {detail.aiScore !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleScoreChange(String(Math.round(detail.aiScore!)))}
                      className="text-[11px] font-semibold text-purple-600 hover:underline dark:text-purple-400">
                      {t("grading.useAiScore", "Dùng điểm AI")} ({Math.round(detail.aiScore)})
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => handleScoreChange(e.target.value)}
                  placeholder={t("grading.enterScore", "Nhập điểm")}
                  className={cn(
                    "h-10 rounded-xl text-base font-extrabold transition-colors",
                    scoreError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {scoreError && (
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {scoreError}
                  </p>
                )}
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

              {/* HR Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("general.notes", "Ghi chú")}
                </label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("grading.enterHrNotes", "Nhập ghi chú (không bắt buộc)")}
                  rows={4}
                  className="resize-none rounded-xl text-xs"
                />
              </div>

              {/* Submit */}
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
                    {t("common.saving", "Đang lưu...")}
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="h-4 w-4" />
                    {t("general.save", "Lưu")} {t("grading.hrResult", "kết quả chấm điểm")}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
  const [detailsData, setDetailsData] = useState<ApplicationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Round View in Workspace
  const [selectedRoundOrder, setSelectedRoundOrder] = useState<number>(1);

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
        setSelectedRoundOrder(currentOrder);
        fetchedApplicationId = appRes.data.id!;

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
              setSelectedRoundOrder(currentOrder);

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
        {/* Horizontal Pipeline Bar */}
        <Card className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/70">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {t("userApplicationhistory.pipelineTitle", {
                total: totalRounds,
                defaultValue: `Quy trình ứng tuyển (${totalRounds} vòng)`,
              })}
            </h2>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              {t("userApplicationhistory.progressLabel", {
                current: apiCurrentRoundOrder,
                total: totalRounds,
                defaultValue: `Tiến độ: Vòng ${apiCurrentRoundOrder}/${totalRounds}`,
              })}
            </span>
          </div>
          <StaffHorizontalPipeline
            rounds={rounds}
            details={detailsData}
            currentRoundOrder={apiCurrentRoundOrder}
            overallStatus={app.status}
            selectedRoundOrder={selectedRoundOrder}
            onSelectRound={(order) => setSelectedRoundOrder(order)}
          />
        </Card>

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
                      <span className="text-slate-500 dark:text-slate-400">Ngày nộp đơn:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {app.createdAt ? formatDateTime(app.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Tổng số vòng:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {totalRounds} vòng tuyển dụng
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Trạng thái hồ sơ:</span>
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
                    <span>Kỹ năng & Yêu cầu vị trí</span>
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
                    <span>Tiêu chuẩn đạt Vòng {activeRound.roundOrder}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="text-slate-500">Điểm sàn qua vòng:</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {activeRound.passThreshold ?? 70}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời gian quy định:</span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        {activeRound.configData?.timeLimitMinutes
                          ? `${activeRound.configData.timeLimitMinutes} phút`
                          : "Không giới hạn"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Widget 4: Staff Grading Action Card */}
                <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ClipboardCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Thao tác chấm điểm</span>
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
