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
  Clock,
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
      {/* Main Tabbed Content Area */}
      <Tabs value={activeTab || "process"} className="flex flex-1 flex-col overflow-hidden">
        {/* Tab 1: Quy trình tuyển dụng & Thông tin JD */}
        <TabsContent value="process" className="m-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
            {/* ── LEFT COLUMN (2/3): RECRUITMENT PIPELINE & JOB SPECS ───────────────── */}
            <main className="min-w-0 space-y-6">
              {/* SECTION 1: RECRUITMENT PIPELINE STEPPER */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      Quy trình tuyển dụng ({initialRounds.length} vòng phỏng vấn)
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Sơ đồ đánh giá tự động & phỏng vấn trực tiếp dành cho ứng viên
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsEditorOpen(true)}
                    className="h-8 gap-1.5 bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Studio Workspace sơ đồ
                  </Button>
                </div>

                {!initialRounds || initialRounds.length === 0 ? (
                  <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Chưa cấu hình vòng phỏng vấn nào
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Thiết lập các vòng phỏng vấn để hệ thống tự động chấm bài.
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsEditorOpen(true)}
                      className="h-7 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                      + Cấu hình quy trình tuyển dụng
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {initialRounds.map((round, index) => {
                      const meta = templates.find((template) => template.type === round.roundType);
                      const isLast = index === initialRounds.length - 1;

                      return (
                        <div key={index} className="relative flex items-center">
                          <div
                            onClick={() => setIsEditorOpen(true)}
                            className="group flex w-full cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-indigo-300 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 dark:hover:bg-slate-900">
                            {/* Round Header */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {index + 1}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("gap-1 text-[11px] font-semibold", meta?.color)}>
                                {meta?.title || round.roundType}
                              </Badge>
                            </div>

                            {/* Round Name */}
                            <h4 className="mt-2 text-xs font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 transition-colors">
                              {round.name}
                            </h4>

                            {/* Pass Threshold */}
                            {round.passThreshold !== undefined && (
                              <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                <span>Điểm đạt</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {Math.round(round.passThreshold * 100)}%
                                </span>
                              </div>
                            )}
                          </div>

                          {!isLast && (
                            <div className="hidden lg:block absolute -right-2.5 z-10 text-slate-300 dark:text-slate-700">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* SECTION 2: JOB DESCRIPTION */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                  <Briefcase className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("common.description", "Mô tả công việc")}
                  </h3>
                </div>
                {currentJd.description ? (
                  <div className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {currentJd.description}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Chưa cập nhật mô tả công việc.
                  </p>
                )}
              </section>

              {/* SECTION 3: REQUIREMENTS */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                  <FileCheck className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("common.requirements", "Yêu cầu ứng viên")}
                  </h3>
                </div>
                {currentJd.requirements ? (
                  <div className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {currentJd.requirements}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Chưa cập nhật yêu cầu ứng viên.
                  </p>
                )}
              </section>
            </main>

            {/* ── RIGHT COLUMN (1/3): JOB OVERVIEW METADATA & BENEFITS ─────────────── */}
            <aside className="space-y-6">
              {/* Card 1: Job Metadata Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">
                  Thông số tuyển dụng
                </h3>

                <div className="space-y-3.5 text-xs">
                  {/* Salary */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      Mức lương
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatSalary(currentJd.salaryMin, currentJd.salaryMax, currentJd.currency)}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                      Cấp bậc
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {currentJd.level || "—"}
                    </span>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      Hạn ứng tuyển
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatDeadline(currentJd.deadlineAt)}
                    </span>
                  </div>

                  {/* Applications count */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      Tổng ứng tuyển
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {applications.length} ứng viên
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Trạng thái
                    </span>
                    <Badge
                      className={
                        currentJd.status === "OPEN"
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }>
                      {currentJd.status || "OPEN"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card 2: Benefits */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                  <Gift className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("common.benefits", "Phúc lợi & Đãi ngộ")}
                  </h3>
                </div>
                {currentJd.benefits ? (
                  <div className="text-xs leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                    {currentJd.benefits}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Chưa cập nhật thông tin phúc lợi.
                  </p>
                )}
              </div>
            </aside>
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
