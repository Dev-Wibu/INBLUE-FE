import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Bot,
  Briefcase,
  CheckCircle2,
  Code2,
  FileCheck2,
  HelpCircle,
  Lock,
  Mail,
  RotateCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { components } from "../../../../schema-from-be";
import { HorizontalPipeline, type JdRound } from "./components/HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];
type JobDescription = components["schemas"]["JobDescription"];

function ApplicationStatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    IN_PROGRESS: {
      label: t("userApplicationhistory.statusInterviewing", "Đang ứng tuyển"),
      className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300",
    },
    PASSED: {
      label: t("userApplicationhistory.statusCompleted", "Trúng tuyển"),
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    FAILED: {
      label: t("userApplicationhistory.statusRejected", "Chưa đạt"),
      className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300",
    },
    SOFT_FAILED: {
      label: t("userApplicationhistory.needsImprovement", "Cần cải thiện"),
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300",
    },
  };
  const item = config[status] ?? { label: status, className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        item.className
      )}>
      {item.label}
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
    rounds?: JdRound[];
  } | null>(null);
  const [detailsData, setDetailsData] = useState<ApplicationDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Round View in Workspace
  const [selectedRoundOrder, setSelectedRoundOrder] = useState<number>(1);

  // Dialog States
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionRound, setSubmissionRound] = useState<JdRound | undefined>();
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewId] = useState<number>(0);

  // Fetch Current Round
  const { data: apiCurrentRound, refetch: refetchCurrentRound } = useCurrentRound(
    applicationId,
    !!applicationId
  );
  const apiCurrentRoundOrder = apiCurrentRound?.roundOrder ?? app?.currentRoundOrder ?? 1;

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
            setJdInfo({
              title: jd.title,
              companyName: extra.companyName,
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

  // Enter Room Action
  const handleEnterRoom = (round: JdRound) => {
    if (round.roundType === "QUIZ") {
      const jdId = app?.jdId ?? 0;
      navigate(`/user/quiz/${applicationId}/round/${round.id}?jdId=${jdId}`);
      return;
    }
    if (round.roundType === "MENTOR_REVIEW" || round.roundType === "MENTROR_REVIEW") {
      navigate(`/user/application/${applicationId}/mentor-review`);
      return;
    }
    if (round.roundType === "AI_INTERVIEW") {
      navigate(`/user/application/${applicationId}/ai-interview?roundId=${round.id}`);
      return;
    }

    setSubmissionRound(round);
    setSubmissionOpen(true);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
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

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 dark:bg-slate-950">
      {/* Top Header Navigation */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/user?tab=applicationHistory")}
              className="gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ArrowLeft className="h-4 w-4" />
              <span>{t("userApplicationhistory.allApplications", "Tất cả đơn ứng tuyển")}</span>
            </Button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {jdInfo?.title ?? t("userApplicationhistory.applications", "Đơn ứng tuyển")}
              </h1>
              <p className="truncate text-[11px] text-slate-500">{jdInfo?.companyName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ApplicationStatusBadge status={app.status} />
            <Button variant="outline" size="sm" onClick={loadData} className="h-8 gap-1.5 text-xs">
              <RotateCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {t("userApplicationhistory.reload", "Làm mới")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {/* Pipeline Bar */}
        <Card className="border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              {t("userApplicationhistory.pipelineTitle", {
                total: totalRounds,
                defaultValue: `Quy trình ứng tuyển (${totalRounds} vòng)`,
              })}
            </h2>
            <span className="text-xs font-semibold text-[#0047AB] dark:text-blue-400">
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

        {/* Workspace Active Round Main Display */}
        {activeRound ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Main Round Content (Left 8 Cols) */}
            <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-xs lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0047AB] to-indigo-700 text-white shadow-sm">
                      <RoundIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-wide text-[#0047AB] uppercase dark:text-blue-400">
                          {t("userApplicationhistory.round", "Vòng")} {activeRound.roundOrder}
                        </span>
                        {isRoundCompleted && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            ✓ {t("userApplicationhistory.completedBadge", "Hoàn thành")}
                          </span>
                        )}
                        {isRoundCurrent && (
                          <span className="animate-pulse rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            ▶ {t("userApplicationhistory.currentRoundBadge", "Vòng hiện tại")}
                          </span>
                        )}
                      </div>
                      <CardTitle className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                        {activeRound.roundType
                          ? t(
                              `common.roundType.${activeRound.roundType.replace("MENTROR", "MENTOR")}`,
                              activeRound.name || ""
                            )
                          : activeRound.name}
                      </CardTitle>
                    </div>
                  </div>

                  {activeDetail?.finalScore !== undefined && activeDetail?.finalScore !== null && (
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        {t("userApplicationhistory.scoreLabel", "Điểm số")}
                      </span>
                      <p className="text-2xl font-black text-[#0047AB]">
                        {activeDetail.finalScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </p>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {/* Round State Content */}
                {isRoundLocked ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
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
                  <>
                    {/* Instruction & Info */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        {t("userApplicationhistory.instructionsTitle", "Hướng dẫn làm bài")}
                      </h4>
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                        {activeRound.configData?.instruction ||
                          t(
                            "userApplicationhistory.defaultInstruction",
                            "Thực hiện theo yêu cầu của hội đồng tuyển dụng để hoàn thành vòng phỏng vấn này."
                          )}
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="pt-2">
                      {isRoundCurrent ? (
                        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:flex-row dark:border-blue-900/40 dark:bg-blue-950/20">
                          <div>
                            <p className="text-xs font-bold text-[#0047AB] dark:text-blue-300">
                              {t(
                                "userApplicationhistory.readyToTakeExam",
                                "Sẵn sàng thực hiện phần thi?"
                              )}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {activeRound.configData?.timeLimitMinutes
                                ? t("userApplicationhistory.examTimeLimit", {
                                    minutes: activeRound.configData.timeLimitMinutes,
                                    defaultValue: `Thời gian làm bài: ${activeRound.configData.timeLimitMinutes} phút`,
                                  })
                                : t(
                                    "userApplicationhistory.noTimeLimit",
                                    "Không giới hạn thời gian"
                                  )}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleEnterRoom(activeRound)}
                            className="w-full gap-2 bg-[#0047AB] px-6 text-xs font-semibold text-white shadow-sm hover:bg-[#003d91] sm:w-auto">
                            <span>
                              {t("userApplicationhistory.startExamNow", "Bắt đầu bài thi ngay")}
                            </span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : isRoundCompleted ? (
                        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 sm:flex-row dark:border-emerald-900/40 dark:bg-emerald-950/20">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span>
                              {t(
                                "userApplicationhistory.roundCompletedNotice",
                                "Bạn đã hoàn thành vòng thi này"
                              )}
                            </span>
                          </div>

                          <Button
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/user/application/${applicationId}/round/${activeRound.roundOrder}/result`
                              )
                            }
                            className="w-full gap-1.5 border-emerald-300 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 sm:w-auto dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/40">
                            <span>
                              {t(
                                "userApplicationhistory.viewDetailedReport",
                                "Xem báo cáo phân tích chi tiết"
                              )}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sidebar Summary (Right 4 Cols) */}
            <div className="space-y-4 lg:col-span-4">
              <Card className="space-y-4 border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                  {t("userApplicationhistory.overviewTitle", "Thông tin tổng quan")}
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="text-slate-500">
                      {t("userApplicationhistory.companyLabel", "Doanh nghiệp:")}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {jdInfo?.companyName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="text-slate-500">
                      {t("userApplicationhistory.appliedDateLabel", "Ngày nộp đơn:")}
                    </span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {app.createdAt ? formatDateTime(app.createdAt) : ""}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                    <span className="text-slate-500">
                      {t("userApplicationhistory.totalRoundsCount", "Tổng số vòng:")}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {t("userApplicationhistory.roundsUnit", {
                        count: totalRounds,
                        defaultValue: `${totalRounds} vòng`,
                      })}
                    </span>
                  </div>
                </div>

                {app.status === "PASSED" && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/40">
                    <Award className="mx-auto mb-1.5 h-8 w-8 text-emerald-600" />
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
            </div>
          </div>
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
