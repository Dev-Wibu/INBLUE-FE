/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApplicationDetailDrawer } from "@/components/shared";
import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorWorkspace,
} from "@/components/shared/RoundCanvasEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  adminApplicationManager,
  type ApplicationListItemDto,
} from "@/services/admin-application.manager";
import { roundManager } from "@/services/round.manager";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  Gift,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { JobDescription } from "../types";

interface JobDescriptionDetailViewProps {
  jobDescription: JobDescription;
  companyName?: string;
  onBack: () => void;
  onEdit: (job: JobDescription) => void;
  activeTab?: string;
  onApplicationsCountChange?: (count: number) => void;
}

export function JobDescriptionDetailView({
  jobDescription,
  activeTab,
  onApplicationsCountChange,
}: JobDescriptionDetailViewProps) {
  const { t } = useTranslation();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentJd, setCurrentJd] = useState<JobDescription>(jobDescription);

  // Application list state
  const [applications, setApplications] = useState<ApplicationListItemDto[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentJd(jobDescription);
  }, [jobDescription]);

  const loadApplications = useCallback(
    async (jdId: number) => {
      setIsLoadingApps(true);
      const res = await adminApplicationManager.getApplicationsByJdId(jdId);
      if (res.success && res.data) {
        const apps = (res.data.applications || (res.data as any)) as ApplicationListItemDto[];
        setApplications(apps);
        onApplicationsCountChange?.(apps.length);
      } else {
        setApplications([]);
        onApplicationsCountChange?.(0);
      }
      setIsLoadingApps(false);
    },
    [onApplicationsCountChange]
  );

  useEffect(() => {
    if (currentJd.id) {
      loadApplications(currentJd.id);
    }
  }, [currentJd.id, loadApplications]);

  const initialRounds = useMemo(() => {
    const sortedRounds = [...(currentJd.rounds || [])].sort(
      (a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)
    );

    return sortedRounds.map((r) => ({
      name: r.name,
      roundType: r.roundType as RoundType,
      passThreshold: r.passThreshold ?? 0.8,
      configData: {
        ...r.configData,
        codingProblemsId:
          r.configData?.codingProblems
            ?.map((cp: any) => cp.problemId)
            .filter((id: any): id is number => id !== undefined) ?? [],
        codingProblems: r.configData?.codingProblems ?? [],
        codeReviewProblemsId:
          r.configData?.codeReviewProblems
            ?.map((cp: any) => cp.problemId)
            .filter((id: any): id is number => id !== undefined) ?? [],
        codeReviewProblems: r.configData?.codeReviewProblems ?? [],
      },
    }));
  }, [currentJd.rounds]);

  const handleSaveRounds = async (rounds: UIRound[]) => {
    setIsSaving(true);
    try {
      const payloadRounds = rounds.map((r, idx) => ({
        name: r.name || `Vòng ${idx + 1}`,
        roundOrder: idx + 1,
        roundType: r.roundType as any,
        passThreshold: Number(r.passThreshold ?? 0.8),
        configData: {
          instruction: r.configData?.instruction || "",
          submissionFormat: r.configData?.submissionFormat || "",
          timeLimitMinutes: Number(r.configData?.timeLimitMinutes ?? 0),
          maxScore: Number(r.configData?.maxScore ?? 100),
          aiSystemPrompt: r.configData?.aiSystemPrompt || "",
          evaluationCriteria: r.configData?.evaluationCriteria || "",
          quizQuestions: (r.configData?.quizQuestions || []).map((q: any) => ({
            questionText: q.questionText || "",
            options: q.options || [],
            correctAnswer: q.correctAnswer || "",
            points: Number(q.points ?? 0),
          })),
          codingProblemsId: r.configData?.codingProblemsId ?? [],
          codeReviewIds: r.configData?.codeReviewProblemsId ?? [],
        },
      }));

      const jdId = currentJd.id!;
      const hasExistingRounds = (currentJd.rounds?.length ?? 0) > 0;
      const endpointResult = hasExistingRounds
        ? await roundManager.updateForJd(jdId, { rounds: payloadRounds })
        : await roundManager.setUpForJd(jdId, { rounds: payloadRounds });

      const res = endpointResult;

      if (res.success && res.data) {
        toast.success(t("general.updateSuccess"));
        setCurrentJd((prev) =>
          prev ? { ...prev, rounds: res.data as unknown as typeof prev.rounds } : prev
        );
      } else {
        toast.error(
          res.error ||
            t(
              hasExistingRounds
                ? "errors.cannotUpdateInterviewRounds"
                : "errors.cannotSetUpInterviewRounds"
            )
        );
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("errors.cannotUpdateInterviewRounds"));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const templates = getAvailableRoundsTemplates(t);

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    if (!min && !max) return t("common.negotiable", "Thỏa thuận");
    const curr = currency || "USD";
    if (min && max) return `${min.toLocaleString()} - ${max.toLocaleString()} ${curr}`;
    if (min) return `Từ ${min.toLocaleString()} ${curr}`;
    return `Đến ${max?.toLocaleString()} ${curr}`;
  };

  const formatDeadline = (dateStr?: string) => {
    if (!dateStr) return t("common.noDeadline", "Không giới hạn");
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            ĐẠT
          </Badge>
        );
      case "REJECTED":
      case "FAILED":
        return <Badge variant="destructive">TỪ CHỐI</Badge>;
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return (
          <Badge
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            ĐANG XỬ LÝ
          </Badge>
        );
    }
  };

  if (isEditorOpen) {
    return (
      <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-slate-950">
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={initialRounds}
          initialMetadata={{ name: currentJd.title || "", category: "", description: "" }}
          title="Quy trình tuyển dụng JD"
          showMetadataInputs={false}
          isSaving={isSaving}
          onSave={handleSaveRounds}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* ── HERO COMMAND STRIP (Key Job Attributes Overview) ──────────────────────── */}
      <div className="border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Key Metric Chips */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Salary Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-50/80 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              <span>{formatSalary(currentJd.salaryMin, currentJd.salaryMax, currentJd.currency)}</span>
            </div>

            {/* Level Pill */}
            {currentJd.level && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                <span>{currentJd.level}</span>
              </div>
            )}

            {/* Deadline Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100/70 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Hạn: {formatDeadline(currentJd.deadlineAt)}</span>
            </div>

            {/* Application Count Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-50/80 px-3 py-1 text-xs font-semibold text-purple-700 dark:border-purple-500/30 dark:bg-purple-950/60 dark:text-purple-300">
              <Users className="h-3.5 w-3.5 text-purple-500" />
              <span>{applications.length} Ứng viên</span>
            </div>
          </div>

          {/* Action: Studio Workspace Button */}
          <Button
            onClick={() => setIsEditorOpen(true)}
            className="h-8 gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-800">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Studio Workspace sơ đồ</span>
          </Button>
        </div>
      </div>

      {/* Main Tabbed Content Area */}
      <Tabs value={activeTab || "process"} className="flex flex-1 flex-col overflow-hidden">
        {/* Tab 1: Quy trình tuyển dụng & Thông tin JD */}
        <TabsContent value="process" className="m-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto space-y-6">
            {/* ── SECTION 1: RECRUITMENT PIPELINE STEPPER ───────────────────────────── */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                    <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Quy trình tuyển dụng ({initialRounds.length} vòng phỏng vấn)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Sơ đồ các bước đánh giá tự động & phỏng vấn trực tiếp dành cho ứng viên
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditorOpen(true)}
                  className="h-8 gap-1.5 border-indigo-200 text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-950">
                  <Edit3 className="h-3.5 w-3.5" />
                  Chỉnh sửa quy trình
                </Button>
              </div>

              {!initialRounds || initialRounds.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Chưa cấu hình vòng phỏng vấn nào
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Thiết lập các vòng phỏng vấn kéo thả trực quan để hệ thống tự động chấm bài.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsEditorOpen(true)}
                    className="h-8 bg-indigo-600 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
                    + Cấu hình quy trình tuyển dụng
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {initialRounds.map((round, index) => {
                    const meta = templates.find((template) => template.type === round.roundType);
                    const isLast = index === initialRounds.length - 1;

                    return (
                      <div key={index} className="relative flex items-center">
                        <div
                          onClick={() => setIsEditorOpen(true)}
                          className="group relative flex w-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-indigo-400 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-600 dark:hover:bg-slate-900">
                          {/* Round Header */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {index + 1}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("gap-1 text-[11px] font-bold", meta?.color)}>
                              {meta?.title || round.roundType}
                            </Badge>
                          </div>

                          {/* Round Name */}
                          <h4 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
                            {round.name}
                          </h4>

                          {/* Pass Threshold Badge */}
                          {round.passThreshold !== undefined && (
                            <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                              <span>Điểm đạt</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {Math.round(round.passThreshold * 100)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {!isLast && (
                          <div className="hidden lg:block absolute -right-3.5 z-10 text-slate-300 dark:text-slate-700">
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── SECTION 2: THREE DEDICATED JOB SPECIFICATION CARDS ───────────────── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Card 1: Mô Tả Công Việc */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("common.description", "Mô tả công việc")}
                  </h3>
                </div>
                {currentJd.description ? (
                  <p className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {currentJd.description}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Chưa cập nhật mô tả công việc.
                  </p>
                )}
              </div>

              {/* Card 2: Yêu Cầu Ứng Viên */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("common.requirements", "Yêu cầu ứng viên")}
                  </h3>
                </div>
                {currentJd.requirements ? (
                  <p className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {currentJd.requirements}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Chưa cập nhật yêu cầu công việc.
                  </p>
                )}
              </div>

              {/* Card 3: Quyền Lợi Được Hưởng */}
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                    <Gift className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("common.benefits", "Quyền lợi được hưởng")}
                  </h3>
                </div>
                {currentJd.benefits ? (
                  <p className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {currentJd.benefits}
                  </p>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Chưa cập nhật quyền lợi.
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Đơn ứng tuyển */}
        <TabsContent
          value="applications"
          className="m-0 flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Danh sách ứng viên nộp đơn cho vị trí này ({applications.length})
            </h3>
          </div>

          <div className="overflow-hidden border-y border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-950">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[80px] pl-6 font-medium text-slate-500">#ID</TableHead>
                  <TableHead className="min-w-[200px] font-medium text-slate-500">Ứng viên</TableHead>
                  <TableHead className="w-[160px] font-medium text-slate-500">Vòng hiện tại</TableHead>
                  <TableHead className="w-[100px] text-center font-medium text-slate-500">Điểm số</TableHead>
                  <TableHead className="w-[130px] font-medium text-slate-500">Trạng thái</TableHead>
                  <TableHead className="w-[100px] pr-6 text-right font-medium text-slate-500">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingApps ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span>Đang tải danh sách ứng viên...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-xs text-slate-400">
                      Chưa có ứng viên nào ứng tuyển vị trí này.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app, index) => {
                    const name =
                      app.candidateName || (app as any).applicantName || "Ứng viên ẩn danh";
                    const email = app.candidateEmail || (app as any).email || "Chưa có email";
                    const avatarUrl = (app as any).avatarUrl || (app as any).applicantAvatar;

                    return (
                      <TableRow
                        key={app.applicationId ?? index}
                        onClick={() => {
                          setSelectedAppId(app.applicationId || (app as any).id);
                          setIsDrawerOpen(true);
                        }}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                        <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                          #{app.applicationId || (app as any).id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                              <AvatarImage src={avatarUrl} alt={name} />
                              <AvatarFallback className="bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                {name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                {name}
                              </div>
                              <div className="text-[11px] text-slate-400">{email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            <span>
                              {app.currentRoundName ||
                                (app.currentRoundOrder ? `Vòng ${app.currentRoundOrder}` : "—")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {app.overallScore !== undefined ? `${app.overallScore}/100` : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(app.status)}</TableCell>
                        <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAppId(app.applicationId || (app as any).id);
                              setIsDrawerOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Slide-over Application Detail Drawer */}
      <ApplicationDetailDrawer
        applicationId={selectedAppId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppId(null);
        }}
        onStatusChange={() => {
          if (currentJd.id) loadApplications(currentJd.id);
        }}
      />
    </div>
  );
}
