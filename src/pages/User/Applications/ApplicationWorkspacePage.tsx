import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmailPreviewDialog } from "@/components/ui/email-preview-dialog";
import { RoundSubmissionDialog } from "@/components/ui/round-submission-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentRound } from "@/hooks/useRound";
import { fetchClient } from "@/lib/api";
import { formatDateTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { applicationService } from "@/services/application.manager";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Bot,
  Briefcase,
  ChevronRight,
  Clock,
  Code2,
  FileCheck2,
  HelpCircle,
  Layers,
  Lock,
  Mail,
  RotateCw,
  Send,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";
import { HorizontalPipeline, type JdRound } from "./components/HorizontalPipeline";
import { RoundWorkspaceDispatcher } from "./components/RoundWorkspaceDispatcher";
import { applicationTheme } from "./components/applicationTheme";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type JobDescription = components["schemas"]["JobDescription"];

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

function getRoundIcon(roundType?: string) {
  const type = roundType?.replace("MENTROR", "MENTOR");
  switch (type) {
    case "CV_SCREENING":
      return FileCheck2;
    case "QUIZ":
      return HelpCircle;
    case "AI_INTERVIEW":
      return Bot;
    case "CODING":
    case "CODE_REVIEW":
      return Code2;
    case "EMAIL_SIMULATOR":
      return Mail;
    case "MENTOR_REVIEW":
      return UserCheck;
    default:
      return Sparkles;
  }
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

export function ApplicationWorkspacePage() {
  const { t } = useTranslation();
  const { applicationId: appIdParam } = useParams<{ applicationId: string }>();
  const applicationId = Number(appIdParam);
  const navigate = useNavigate();

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

  // Dialog States
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionRound] = useState<JdRound | undefined>();
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewId] = useState<number>(0);

  // Fetch Current Round
  const { data: apiCurrentRound, refetch: refetchCurrentRound } = useCurrentRound(
    applicationId,
    !!applicationId
  );
  const appOrder = app?.currentRoundOrder ?? 0;
  const apiOrder = apiCurrentRound?.roundOrder ?? 0;
  const apiCurrentRoundOrder = appOrder || apiOrder || 1;

  // Load Main Data
  const loadData = async () => {
    if (!applicationId || isNaN(applicationId)) return;
    setLoading(true);
    try {
      // 1. Fetch Application
      const appRes = await applicationService.getById(applicationId);
      if (appRes.success && appRes.data) {
        setApp(appRes.data);
        const currentOrder = appRes.data.currentRoundOrder ?? 1;
        setSelectedRoundOrder(currentOrder);

        // 2. Fetch JD Info
        if (appRes.data.jdId) {
          const jdRes = await fetchClient.GET("/api/job-descriptions/{id}", {
            params: { path: { id: appRes.data.jdId } },
          });
          if (jdRes.response?.ok && jdRes.data) {
            const jd = jdRes.data as JobDescription;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extra = jdRes.data as any;
            const logoUrl =
              extra.companyLogo ||
              extra.companyLogoUrl ||
              extra.thumbnailUrl ||
              extra.company?.logoUrl ||
              extra.company?.avatarUrl ||
              null;

            setJdInfo({
              title: jd.title,
              companyName: extra.companyName,
              logoUrl,
              level: jd.level,
              description: jd.description,
              requirements: jd.requirements,
              rounds: (extra.rounds as JdRound[]) ?? [],
            });
          }
        }
      }

      // 3. Fetch Details
      const detailsRes = await fetchClient.GET(
        "/api/application-details/application/{applicationId}",
        {
          params: { path: { applicationId } },
        }
      );
      if (detailsRes.response?.ok && Array.isArray(detailsRes.data)) {
        setDetailsData(detailsRes.data as ApplicationDetail[]);
      }
    } catch (err) {
      console.error("[Workspace] Failed to load data:", err);
      toast.error("Không thể tải thông tin workspace ứng tuyển");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [applicationId]);

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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1700px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full rounded-[20px]" />
        <Skeleton className="h-96 w-full rounded-[20px]" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <Briefcase className="h-12 w-12 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          {t("userApplicationhistory.noApplicationsYet", "Không tìm thấy đơn ứng tuyển")}
        </h2>
        <Button onClick={() => navigate("/user?tab=applicationHistory")}>
          {t("userApplicationhistory.allApplications", "Quay lại Lịch sử ứng tuyển")}
        </Button>
      </div>
    );
  }

  const RoundIcon = getRoundIcon(activeRound?.roundType);
  const totalRounds = rounds.length;
  const isRoundCompleted =
    app.status === "PASSED" ||
    app.status === "FAILED" ||
    app.status === "SOFT_FAILED" ||
    (activeDetail?.status as string) === "COMPLETED" ||
    (activeRound?.roundOrder ?? 0) < apiCurrentRoundOrder;
  const isRoundCurrent = !isRoundCompleted && activeRound?.roundOrder === apiCurrentRoundOrder;
  const isRoundLocked = !isRoundCompleted && (activeRound?.roundOrder ?? 0) > apiCurrentRoundOrder;

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

  return (
    <div className={applicationTheme.page}>
      {/* Top Header Navigation (Single Sleek 1-Line Breadcrumb Standard) */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Sleek 1-Line Inline Breadcrumb & Title */}
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/user?tab=applicationHistory")}
              className="h-8 gap-1.5 px-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("userApplicationhistory.allApplications", "Lịch sử ứng tuyển")}</span>
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

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <ApplicationStatusBadge status={app.status} />
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="h-8 gap-1.5 border-slate-200 text-xs font-bold dark:border-slate-800">
              <RotateCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t("userApplicationhistory.reload", "Làm mới")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Studio Body (Widescreen Full Width Container) */}
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
          <HorizontalPipeline
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
            /* Standalone Rounds (CV Screening, Email Simulation): Render 3 Standalone Column Containers directly without outer Card wrapper */
            <RoundWorkspaceDispatcher
              round={activeRound}
              detail={activeDetail}
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
                    detail={activeDetail}
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
                            {activeRound.roundType
                              ? t(
                                  `common.roundType.${activeRound.roundType.replace("MENTROR", "MENTOR")}`,
                                  activeRound.name || ""
                                )
                              : activeRound.name}
                          </h2>
                        </div>
                      </div>

                      {activeDetail?.finalScore !== undefined &&
                        activeDetail?.finalScore !== null && (
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              {t("userApplicationhistory.scoreLabel", "Điểm số")}
                            </span>
                            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                              {activeDetail.finalScore}
                              <span className="text-xs font-normal text-slate-400">/100</span>
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Main Interactive Round Workspace Module */}
                  <div className="p-6">
                    {isRoundLocked ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                          <Lock className="h-7 w-7 text-slate-400" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                          {t(
                            "userApplicationhistory.roundLockedTitle",
                            "Vòng thi này chưa được mở khóa"
                          )}
                        </h3>
                        <p className="mt-1 max-w-md text-xs text-slate-500">
                          {t("userApplicationhistory.roundLockedHint", {
                            current: apiCurrentRoundOrder,
                            defaultValue: `Vui lòng hoàn thành vòng ${apiCurrentRoundOrder} để tiếp tục mở khóa vòng này.`,
                          })}
                        </p>
                      </div>
                    ) : (
                      <RoundWorkspaceDispatcher
                        round={activeRound}
                        detail={activeDetail}
                        applicationId={applicationId}
                        jdId={app.jdId}
                        jdInfo={jdInfo}
                        currentRoundOrder={apiCurrentRoundOrder}
                        appStatus={app.status}
                        onRefresh={loadData}
                      />
                    )}

                    {/* Report CTA when Round is completed */}
                    {isRoundCompleted && (
                      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
                        <Button
                          variant="outline"
                          onClick={() =>
                            navigate(
                              `/user/application/${applicationId}/round/${activeRound.roundOrder}/result`
                            )
                          }
                          className="h-9 gap-2 border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                          <span>
                            {t(
                              "userApplicationhistory.viewDetailedReport",
                              "Xem báo cáo phân tích chi tiết"
                            )}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Rich Sidebar Summary (Right 4 Cols - Rich Multi-Widget System) */}
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
                        {t("userApplication.applicationWorkspacePage.applicationDate")}:
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {app.createdAt ? formatDateTime(app.createdAt) : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("userApplication.applicationWorkspacePage.totalRounds")}:
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {t("userApplication.applicationWorkspacePage.totalRoundsValue", {
                          count: totalRounds,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("userApplication.applicationWorkspacePage.applicationStatus")}:
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
                          "Chúc mừng! Bạn đã trúng tuyển"
                        )}
                      </h4>
                      <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                        {t(
                          "userApplicationhistory.passedCongratsDesc",
                          "Bộ phận tuyển dụng sẽ sớm liên hệ trực tiếp với bạn."
                        )}
                      </p>
                    </div>
                  )}
                </Card>

                {/* Widget 2: Required Skills & Tech Stack */}
                <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <BadgeCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{t("userApplication.applicationWorkspacePage.skillsRequirements")}</span>
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
                      {t("userApplication.applicationWorkspacePage.roundStandard", {
                        round: activeRound.roundOrder,
                      })}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="text-slate-500">
                        {t("userApplication.applicationWorkspacePage.passingScore")}:
                      </span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {activeRound.passThreshold ?? 70}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        {t("userApplication.applicationWorkspacePage.timeLimit")}:
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <Clock className="h-3 w-3 text-indigo-500" />
                        {activeRound.configData?.timeLimitMinutes
                          ? t("userApplication.applicationWorkspacePage.timeLimitValue", {
                              minutes: activeRound.configData.timeLimitMinutes,
                            })
                          : t("userApplication.applicationWorkspacePage.noTimeLimit")}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Widget 4: Candidate Q&A & Support OR Email Instruction */}
                {isEmailSimulatorRound ? (
                  <Card className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800">
                      <Send className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                        {t("userApplication.applicationWorkspacePage.emailInstructionsTitle")}
                      </h4>
                    </div>

                    <ol className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 font-mono text-[10px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                          1
                        </span>
                        <span>{t("userApplication.applicationWorkspacePage.emailStep1")}</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 font-mono text-[10px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                          2
                        </span>
                        <span>
                          {t("userApplication.applicationWorkspacePage.emailStep2", {
                            email: "hanptse184261@fpt.edu.vn",
                            subjectCode: `[INBLUE-APP-${applicationId}]`,
                          })}
                        </span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 font-mono text-[10px] font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300">
                          3
                        </span>
                        <span>{t("userApplication.applicationWorkspacePage.emailStep3")}</span>
                      </li>
                    </ol>
                  </Card>
                ) : (
                  <Card className="space-y-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                      <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>{t("userApplication.applicationWorkspacePage.helpSupport")}</span>
                    </div>
                    <div className="space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                      <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          ⚡ {t("userApplication.applicationWorkspacePage.questionAiGrading")}
                        </p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {t("userApplication.applicationWorkspacePage.answerAiGrading")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          🔒 {t("userApplication.applicationWorkspacePage.questionRetake")}
                        </p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {t("userApplication.applicationWorkspacePage.answerRetake")}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* Submission Dialog */}
      <RoundSubmissionDialog
        open={submissionOpen}
        onOpenChange={(open) => {
          if (!open) setSubmissionOpen(false);
        }}
        applicationId={applicationId}
        roundId={submissionRound?.id}
        roundName={submissionRound?.name || submissionRound?.roundType}
        roundType={submissionRound?.roundType}
        instruction={submissionRound?.configData?.instruction}
        onSuccess={() => {
          setSubmissionOpen(false);
          loadData();
          refetchCurrentRound();
        }}
      />

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={(open) => {
          if (!open) setEmailPreviewOpen(false);
        }}
        emailSubmissionId={emailPreviewId}
      />
    </div>
  );
}
