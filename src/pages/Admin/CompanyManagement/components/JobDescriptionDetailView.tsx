import { ApplicationDetailDrawer } from "@/components/shared";
import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorWorkspace,
} from "@/components/shared/RoundCanvasEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  adminApplicationManager,
  type ApplicationListItemDto,
} from "@/services/admin-application.manager";
import { roundManager } from "@/services/round.manager";
import {
  ArrowLeft,
  Briefcase,
  Edit3,
  Eye,
  FileText,
  Folder,
  Layers,
  Sparkles,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  companyName,
  onBack,
  onEdit,
  activeTab,
  onApplicationsCountChange,
}: JobDescriptionDetailViewProps) {
  const { t } = useTranslation();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentJd, setCurrentJd] = useState<JobDescription>(jobDescription);
  const [isJdInfoExpanded, setIsJdInfoExpanded] = useState(false);

  // Application list state
  const [applications, setApplications] = useState<ApplicationListItemDto[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentJd(jobDescription);
    setIsJdInfoExpanded(false);
  }, [jobDescription]);

  const loadApplications = useCallback(async (jdId: number) => {
    setIsLoadingApps(true);
    const res = await adminApplicationManager.getApplicationsByJdId(jdId);
    if (res.success && res.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apps = (res.data.applications || res.data as any) as ApplicationListItemDto[];
      setApplications(apps);
      onApplicationsCountChange?.(apps.length);
    } else {
      setApplications([]);
      onApplicationsCountChange?.(0);
    }
    setIsLoadingApps(false);
  }, [onApplicationsCountChange]);

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?.map((cp: any) => cp.problemId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((id: any): id is number => id !== undefined) ?? [],
        codingProblems: r.configData?.codingProblems ?? [],
        codeReviewProblemsId:
          r.configData?.codeReviewProblems
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ?.map((cp: any) => cp.problemId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        roundType: r.roundType as any,
        passThreshold: Number(r.passThreshold ?? 0.8),
        configData: {
          instruction: r.configData?.instruction || "",
          submissionFormat: r.configData?.submissionFormat || "",
          timeLimitMinutes: Number(r.configData?.timeLimitMinutes ?? 0),
          maxScore: Number(r.configData?.maxScore ?? 100),
          aiSystemPrompt: r.configData?.aiSystemPrompt || "",
          evaluationCriteria: r.configData?.evaluationCriteria || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const jdInfoSections = [
    {
      key: "description",
      label: t("common.description", "Mô tả"),
      value: currentJd.description,
    },
    {
      key: "requirements",
      label: t("common.requirements", "Yêu cầu"),
      value: currentJd.requirements,
    },
    {
      key: "benefits",
      label: t("common.benefits", "Quyền lợi"),
      value: currentJd.benefits,
    },
  ];
  const shouldShowJdInfoToggle = jdInfoSections.some(
    (section) => (section.value?.length ?? 0) > 180
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400">ĐẠT</Badge>;
      case "REJECTED":
      case "FAILED":
        return <Badge variant="destructive">TỪ CHỐI</Badge>;
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400">ĐANG XỬ LÝ</Badge>;
    }
  };

  if (isEditorOpen) {
    return (
      <div className="flex h-full w-full flex-col bg-slate-50 dark:bg-slate-950">
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={initialRounds}
          initialMetadata={{ name: currentJd.title, category: "", description: "" }}
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
            {/* Cột trái: Quy trình tuyển dụng */}
            <main className="min-w-0 space-y-5">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    Quy trình tuyển dụng ({initialRounds.length} vòng)
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Click "Chỉnh sửa quy trình" để mở Studio Workspace sơ đồ kéo thả
                  </p>
                </div>
                <Button
                  onClick={() => setIsEditorOpen(true)}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold shadow-xs">
                  <Edit3 className="h-3.5 w-3.5" />
                  Chỉnh sửa quy trình bằng Studio Workspace
                </Button>
              </div>

              {!initialRounds || initialRounds.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Chưa cấu hình vòng phỏng vấn nào
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Thiết lập các vòng phỏng vấn để tự động đánh giá ứng viên.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsEditorOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold">
                    + Thêm vòng phỏng vấn
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {initialRounds.map((round, index) => {
                    const meta = templates.find((template) => template.type === round.roundType);

                    return (
                      <div
                        key={index}
                        onClick={() => setIsEditorOpen(true)}
                        className="group flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 bg-white p-4.5 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white shadow-xs dark:border-slate-900",
                            meta?.bgColor,
                            meta?.color
                          )}>
                          {meta?.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">
                              Vòng {index + 1}
                            </span>
                            <Badge variant="outline" className={cn("gap-1.5 text-[11px]", meta?.color)}>
                              {meta?.title}
                            </Badge>
                          </div>
                          <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                            {round.name}
                          </h4>
                          {round.passThreshold !== undefined && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Điểm đạt: <strong className="text-indigo-600 dark:text-indigo-400">{Math.round(round.passThreshold * 100)}%</strong>
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditorOpen(true);
                          }}
                          className="h-8 gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
                          <Edit3 className="h-3.5 w-3.5" />
                          Sửa
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>

            {/* Cột phải: Thông tin JD */}
            <aside className="space-y-6">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/70">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thông tin JD & Yêu cầu
                  </h3>
                </div>

                <div
                  className={cn(
                    "relative space-y-4 p-5 text-xs text-slate-600 dark:text-slate-300",
                    !isJdInfoExpanded && shouldShowJdInfoToggle && "max-h-[380px] overflow-hidden"
                  )}>
                  {jdInfoSections.map((section) => (
                    <section key={section.key} className="space-y-1.5">
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {section.label}
                      </h4>
                      {section.value ? (
                        <p className="whitespace-pre-line leading-relaxed text-slate-500 dark:text-slate-400">
                          {section.value}
                        </p>
                      ) : (
                        <p className="italic text-slate-400 dark:text-slate-500">
                          Chưa có thông tin
                        </p>
                      )}
                    </section>
                  ))}
                </div>

                {shouldShowJdInfoToggle && (
                  <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800/70">
                    <button
                      type="button"
                      onClick={() => setIsJdInfoExpanded((prev) => !prev)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400">
                      {isJdInfoExpanded ? "Thu gọn" : "Xem thêm"}
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </TabsContent>

        {/* Tab 2: Đơn ứng tuyển */}
        <TabsContent value="applications" className="m-0 flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Danh sách ứng viên nộp đơn cho vị trí này ({applications.length})
            </h3>
          </div>

          <div className="overflow-hidden border-y border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-950">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="pl-6 w-[80px]">#ID</TableHead>
                  <TableHead className="min-w-[200px]">Ứng viên</TableHead>
                  <TableHead className="w-[140px]">Vòng hiện tại</TableHead>
                  <TableHead className="w-[100px] text-center">Điểm số</TableHead>
                  <TableHead className="w-[130px]">Trạng thái</TableHead>
                  <TableHead className="pr-6 w-[100px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingApps ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span>Đang tải danh sách...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-slate-400 text-xs">
                      Chưa có ứng viên nào ứng tuyển vị trí này.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((app) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const name = app.candidateName || (app as any).applicantName || "Ứng viên ẩn danh";
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const email = app.candidateEmail || (app as any).email || "Chưa có email";
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const avatarUrl = (app as any).avatarUrl || (app as any).applicantAvatar;

                    return (
                      <TableRow
                        key={app.id}
                        onClick={() => {
                          setSelectedAppId(app.id!);
                          setIsDrawerOpen(true);
                        }}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                        <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                          #{app.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                              <AvatarImage src={avatarUrl} alt={name} />
                              <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-400">
                                {name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-xs">
                                {name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            <span>
                              {app.currentRoundName || (app.currentRoundOrder ? `Vòng ${app.currentRoundOrder}` : "—")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {app.overallScore !== undefined ? `${app.overallScore}/100` : "—"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(app.status)}
                        </TableCell>
                        <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAppId(app.id!);
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
