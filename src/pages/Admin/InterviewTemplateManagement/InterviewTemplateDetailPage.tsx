import { Button } from "@/components/ui/button";
import type { DetailResponse } from "@/interfaces";
import { cn } from "@/lib/utils";
import { interviewTemplateManager } from "@/services/interview-template.manager";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  Layers,
  LayoutTemplate,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorWorkspace,
} from "@/components/shared/RoundCanvasEditor";
import { TemplateDeleteDialog } from "./TemplateDeleteDialog";

const getPassThresholdNumber = (val?: number | null): number => {
  if (val == null) return 80;
  if (val <= 1) return Math.round(val * 100);
  return Math.round(val);
};

export function InterviewTemplateDetailPage() {
  const { t } = useTranslation();
  const AVAILABLE_ROUNDS_TEMPLATES = useMemo(() => getAvailableRoundsTemplates(t), [t]);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [selectedTemplate, setSelectedTemplate] = useState<DetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("edit");
  const [editorRounds, setEditorRounds] = useState<UIRound[]>([]);
  const [editorMetadata, setEditorMetadata] = useState({ name: "", category: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchDetail = () => {
    if (id) {
      setIsLoadingDetail(true);
      interviewTemplateManager
        .getTemplateById(Number(id))
        .then((res) => {
          if (res.success && res.data) {
            setSelectedTemplate(res.data);
          } else {
            toast.error(res.error || t("adminCompanymanagement.unableToLoadTemplateDetails"));
            setSelectedTemplate(null);
          }
        })
        .finally(() => {
          setIsLoadingDetail(false);
        });
    } else {
      setSelectedTemplate(null);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate?.id) return;
    setIsDeleting(true);
    try {
      const res = await interviewTemplateManager.deleteTemplate(selectedTemplate.id);
      if (res.success) {
        toast.success(t("adminCompanymanagement.deletedRecruitmentTemplateSuccessfully"));
        setIsDeleteDialogOpen(false);
        navigate("/admin/interviewTemplates");
      } else {
        toast.error(res.error || t("adminCompanymanagement.unableToDeleteProcessTemplate"));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToUIRounds = (rounds: any[]): UIRound[] => {
    const sortedRounds = [...(rounds || [])].sort(
      (a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)
    );
    return sortedRounds.map((r) => ({
      name: r.name,
      roundType: r.roundType as RoundType,
      passThreshold: getPassThresholdNumber(r.passThreshold),
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
  };

  const handleEditClick = (template: DetailResponse) => {
    setEditorMode("edit");
    setEditorMetadata({
      name: template.name || "",
      category: template.category || "",
      description: template.description || "",
    });
    setEditorRounds(mapToUIRounds(template.rounds || []));
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = async (
    rounds: UIRound[],
    metadata: { name: string; category: string; description: string },
    options?: { closeEditorAfter?: boolean }
  ) => {
    if (rounds.length === 0) {
      toast.error(t("template.addAtLeastOneRound"));
      throw new Error();
    }

    const invalidQuizIndex = rounds.findIndex(
      (r) =>
        r.roundType === "QUIZ" &&
        (!r.configData?.quizQuestions || r.configData.quizQuestions.length === 0)
    );
    if (invalidQuizIndex !== -1) {
      toast.error(t("template.quizRoundNotConfigured", { index: invalidQuizIndex + 1 }));
      throw new Error();
    }

    setIsSaving(true);
    try {
      const payload = {
        name: metadata.name.trim(),
        category: metadata.category.trim(),
        description: metadata.description.trim() || undefined,
        rounds: rounds.map((r, idx) => ({
          name: r.name || t("common.roundVar0", { var_0: idx + 1 }),
          roundOrder: idx + 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          roundType: r.roundType as any,
          passThreshold: getPassThresholdNumber(r.passThreshold),
          configData: {
            instruction: r.configData?.instruction || "",
            submissionFormat: r.configData?.submissionFormat || "",
            timeLimitMinutes: Number(r.configData?.timeLimitMinutes ?? 0),
            maxScore: Number(r.configData?.maxScore ?? 100),
            aiSystemPrompt: r.configData?.aiSystemPrompt || "",
            evaluationCriteria: r.configData?.evaluationCriteria || "",
            quizQuestions: (r.configData?.quizQuestions || []).map((q) => ({
              questionText: q.questionText || "",
              options: q.options || [],
              correctAnswer: q.correctAnswer || "",
              points: Number(q.points ?? 0),
            })),
            codingProblemsId: r.configData?.codingProblemsId ?? [],
            codeReviewIds: r.configData?.codeReviewProblemsId ?? [],
          },
        })),
      };

      let res;
      if (editorMode === "create") {
        res = await interviewTemplateManager.createTemplate(payload);
      } else {
        res = await interviewTemplateManager.updateTemplate(Number(id), payload);
      }

      if (res.success) {
        toast.success(
          editorMode === "create" ? t("template.createSuccess") : t("template.updateSuccess")
        );
        fetchDetail();
        if (options?.closeEditorAfter !== false) {
          setIsEditorOpen(false);
        }
      } else {
        toast.error(res.error || t("adminCompanymanagement.unableToSaveProcessTemplate"));
        throw new Error();
      }
    } catch (err) {
      toast.error(t("adminCompanymanagement.errorOccurredWhileSavingTemplate"));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const totalMinutes = useMemo(() => {
    if (!selectedTemplate?.rounds) return 0;
    return selectedTemplate.rounds.reduce(
      (acc, r) => acc + (r.configData?.timeLimitMinutes || 0),
      0
    );
  }, [selectedTemplate]);

  const roundTypeDistribution = useMemo(() => {
    if (!selectedTemplate?.rounds) return [];
    const counts: Record<string, number> = {};
    selectedTemplate.rounds.forEach((r) => {
      if (r.roundType) {
        counts[r.roundType] = (counts[r.roundType] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      meta: AVAILABLE_ROUNDS_TEMPLATES.find((t) => t.type === type),
    }));
  }, [selectedTemplate, AVAILABLE_ROUNDS_TEMPLATES]);

  if (isEditorOpen) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={editorRounds}
          initialMetadata={editorMetadata}
          showMetadataInputs={true}
          mode={editorMode}
          isSaving={isSaving}
          onSave={handleSaveTemplate}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
          {id ? (
            isLoadingDetail ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                <span className="text-sm text-slate-400">{t("general.loadingDetails")}</span>
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-6">
                {/* ── TOP SUBHEADER / BREADCRUMB CARD ── */}
                <div className="flex flex-col gap-3.5 rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/admin/interviewTemplates")}
                        className="h-9 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                        <ArrowLeft className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span>{t("common.back", "Quay lại")}</span>
                      </Button>

                      <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />

                      <span
                        onClick={() => navigate("/admin/interviewTemplates")}
                        className="cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                        {t("adminAdmindashboard.processTemplate", "Quản lý mẫu kịch bản")}
                      </span>

                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />

                      {selectedTemplate.category && (
                        <>
                          <span className="inline-flex items-center rounded-md border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {selectedTemplate.category}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        </>
                      )}

                      <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
                        {selectedTemplate.name}
                      </h1>

                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100/80 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200">
                        <Layers className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                        {t("adminLabels.roundCount", {
                          count: selectedTemplate.rounds?.length || 0,
                        })}
                      </span>
                    </div>

                    {/* Header Right Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => handleEditClick(selectedTemplate)}
                        className="h-9 gap-1.5 rounded-xl border border-indigo-600 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-xs hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>{t("common.edit", "Chỉnh sửa kịch bản")}</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(true)}
                        disabled={isDeleting}
                        className="h-9 gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-950/50 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/50">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t("common.delete", "Xóa")}</span>
                      </Button>
                    </div>
                  </div>

                  {selectedTemplate.description && (
                    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {t("adminInterviewTemplate.description", "Mô tả")}:{" "}
                        </span>
                        {selectedTemplate.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── MAIN CONTENT 2-COLUMN LAYOUT ── */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  {/* Left 70%: Timeline Stream (Naturally Proportioned) */}
                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          <Layers className="h-3.5 w-3.5" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          {t("template.processContains", "Interview rounds")} (
                          {t("adminLabels.roundCount", {
                            count: selectedTemplate.rounds?.length || 0,
                          })}
                          )
                        </h2>
                      </div>
                    </div>

                    <div className="relative space-y-4 pl-10 before:absolute before:top-3 before:bottom-3 before:left-[19px] before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800">
                      {selectedTemplate.rounds?.map((round, idx) => {
                        const templateMetadata = AVAILABLE_ROUNDS_TEMPLATES.find(
                          (t) => t.type === round.roundType
                        );
                        const metadata = templateMetadata || {
                          title: round.roundType || "",
                          color: "text-slate-500 border-slate-200",
                          bgColor: "bg-slate-100",
                          icon: <FileText className="h-4 w-4" />,
                        };

                        return (
                          <div key={idx} className="group relative">
                            <div className="absolute top-4 -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-50 bg-indigo-600 font-mono text-[11px] font-bold text-white shadow-xs dark:border-slate-950 dark:bg-indigo-500">
                              {idx + 1}
                            </div>

                            {/* Single-Level Round Card */}
                            <div
                              onClick={() => handleEditClick(selectedTemplate)}
                              className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "rounded-xl p-2.5",
                                      metadata.bgColor,
                                      metadata.color
                                    )}>
                                    {metadata.icon}
                                  </div>
                                  <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                      {round.name}
                                    </h3>
                                    <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                                      {metadata.title}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    {round.configData?.timeLimitMinutes
                                      ? `${round.configData.timeLimitMinutes} ${t("general.minute")}`
                                      : t("enterpriseJobdescriptiondetailpage.unlimited")}
                                  </span>
                                  <span className="rounded-lg border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    {t("common.obtain")}{" "}
                                    {getPassThresholdNumber(round.passThreshold)}%
                                  </span>
                                </div>
                              </div>

                              {/* Candidate Instruction Accent Strip */}
                              {round.configData?.instruction && (
                                <div className="mt-3.5 rounded-r-xl border-l-2 border-indigo-500 bg-slate-50/80 p-3.5 pl-4 text-xs leading-relaxed text-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
                                  <span className="mb-0.5 block font-bold text-slate-900 dark:text-white">
                                    {t("template.candidateInstructions")}
                                  </span>
                                  {round.configData.instruction}
                                </div>
                              )}

                              {round.roundType === "QUIZ" &&
                                round.configData?.quizQuestions &&
                                round.configData.quizQuestions.length > 0 && (
                                  <div className="mt-3 pt-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                                      {t("template.configured")}{" "}
                                      {round.configData.quizQuestions.length}{" "}
                                      {t("question.multipleChoice")}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right 30%: Quick Stats & Overview Panel */}
                  <div className="w-full shrink-0 space-y-5 lg:w-[320px] xl:w-[350px]">
                    {/* Summary Stats Card */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        {t("adminLabels.templateOverview")}
                      </h3>

                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {t("adminLabels.interviewRounds")}
                          </span>
                          <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {t("adminLabels.roundCount", {
                              count: selectedTemplate.rounds?.length || 0,
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                            {t("adminLabels.estimatedTotalDuration")}
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                            {totalMinutes > 0
                              ? `${totalMinutes} ${t("adminLabels.minutes")}`
                              : t("adminLabels.unlimited")}
                          </span>
                        </div>
                      </div>

                      {/* Round Distribution Breakdown */}
                      {roundTypeDistribution.length > 0 && (
                        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                          <h4 className="mb-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                            {t("adminLabels.formatDistribution")}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {roundTypeDistribution.map(({ type, count, meta }) => (
                              <span
                                key={type}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                                  meta?.bgColor || "bg-slate-100 dark:bg-slate-800",
                                  meta?.color || "text-slate-700 dark:text-slate-300",
                                  "border-slate-200/80 dark:border-slate-800"
                                )}>
                                <span>{meta?.title || type}</span>
                                <span className="py-0.2 rounded-full bg-white/80 px-1.5 font-mono text-[11px] font-bold shadow-2xs dark:bg-black/40">
                                  x{count}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Canvas Studio Quick Launcher Card */}
                    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-slate-50 p-5 shadow-xs dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <Sparkles className="h-4 w-4" />
                        <span>{t("adminLabels.canvasDiagram")}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {t("adminLabels.canvasDescription")}
                      </p>
                      <Button
                        type="button"
                        onClick={() => handleEditClick(selectedTemplate)}
                        className="mt-4 w-full gap-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{t("adminLabels.openCanvasDiagram")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center p-8 text-center text-slate-400">
                <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
                <span>{t("template.failedToLoadDetails")}</span>
              </div>
            )
          ) : (
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                <LayoutTemplate className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">
                {t("adminCompanymanagement.processTemplate")}
              </h2>
              <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {t("template.selectFromList")}
              </p>
            </div>
          )}
        </div>
      </div>
      <TemplateDeleteDialog
        open={isDeleteDialogOpen}
        templateName={selectedTemplate?.name}
        isDeleting={isDeleting}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteTemplate}
      />
    </div>
  );
}
