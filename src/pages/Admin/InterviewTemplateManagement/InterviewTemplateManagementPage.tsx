import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DetailResponse, SummaryResponse } from "@/interfaces";
import { cn } from "@/lib/utils";
import { interviewTemplateManager } from "@/services/interview-template.manager";
import {
  AlertTriangle,
  Clock,
  Edit3,
  FileText,
  LayoutTemplate,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { RoundType, UIRound } from "@/components/shared/RoundCanvasEditor";
import {
  getAvailableRoundsTemplates,
  RoundCanvasEditorDialog,
} from "@/components/shared/RoundCanvasEditor";

export function InterviewTemplateManagementPage() {
  const { t } = useTranslation();
  const AVAILABLE_ROUNDS_TEMPLATES = useMemo(() => getAvailableRoundsTemplates(t), [t]);

  const [templates, setTemplates] = useState<SummaryResponse[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DetailResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Editor states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorRounds, setEditorRounds] = useState<UIRound[]>([]);
  const [editorMetadata, setEditorMetadata] = useState({ name: "", category: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  const loadTemplates = async () => {
    setIsLoadingList(true);
    const res = await interviewTemplateManager.getAllTemplates();
    if (res.success && res.data) {
      setTemplates(res.data);
    } else {
      toast.error(res.error || t("adminCompanymanagement.unableToLoadProcessTemplates"));
    }
    setIsLoadingList(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      setIsLoadingDetail(true);
      interviewTemplateManager
        .getTemplateById(selectedTemplateId)
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
  }, [selectedTemplateId]);

  const handleDeleteTemplate = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(t("adminCompanymanagement.confirmDeleteTemplate"))) return;

    setIsDeleting(true);
    const res = await interviewTemplateManager.deleteTemplate(id);
    if (res.success) {
      toast.success(t("adminCompanymanagement.deletedRecruitmentTemplateSuccessfully"));
      if (selectedTemplateId === id) {
        setSelectedTemplateId(null);
      }
      loadTemplates();
    } else {
      toast.error(res.error || t("adminCompanymanagement.unableToDeleteProcessTemplate"));
    }
    setIsDeleting(false);
  };

  const handleCreateClick = () => {
    setEditorMode("create");
    setEditorMetadata({ name: "", category: "", description: "" });
    setEditorRounds([
      {
        name: t("adminInterviewTemplate.cvScreening.title"),
        roundType: "CV_SCREENING",
        passThreshold: 0.8,
        configData: {
          instruction: t("cv.uploadPdfOnly"),
          submissionFormat: "pdf",
          timeLimitMinutes: 30,
          maxScore: 100,
        },
      },
    ]);
    setIsEditorOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapToUIRounds = (rounds: any[]): UIRound[] => {
    const sortedRounds = [...(rounds || [])].sort(
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
    metadata: { name: string; category: string; description: string }
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
      toast.error(`Vòng ${invalidQuizIndex + 1} (Trắc nghiệm) chưa cấu hình câu hỏi.`);
      throw new Error();
    }

    setIsSaving(true);
    try {
      const payload = {
        name: metadata.name.trim(),
        category: metadata.category.trim(),
        description: metadata.description.trim() || undefined,
        rounds: rounds.map((r, idx) => ({
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
            quizQuestions: (r.configData?.quizQuestions || []).map((q) => ({
              questionText: q.questionText || "",
              options: q.options || [],
              correctAnswer: q.correctAnswer || "",
              points: Number(q.points ?? 0),
            })),
            codingProblems:
              r.configData?.codingProblemsId?.map((id) => {
                const cp = r.configData?.codingProblems?.find(
                  (problem) => problem.problemId === id
                );
                return {
                  problemId: id,
                  title: cp?.title || `Bài tập #${id}`,
                  difficulty: (cp?.difficulty as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
                };
              }) ?? [],
            codeReviewIds: r.configData?.codeReviewProblemsId || [],
            codeReviewProblems:
              r.configData?.codeReviewProblemsId?.map((id) => {
                const cp = r.configData?.codeReviewProblems?.find(
                  (problem) => problem.problemId === id
                );
                return {
                  problemId: id,
                  title: cp?.title || `Bài tập #${id}`,
                  difficulty: (cp?.difficulty as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
                  language: cp?.language || "Java",
                };
              }) ?? [],
          },
        })),
      };

      let res;
      if (editorMode === "create") {
        res = await interviewTemplateManager.createTemplate(payload);
      } else {
        res = await interviewTemplateManager.updateTemplate(selectedTemplateId!, payload);
      }

      if (res.success) {
        toast.success(
          editorMode === "create" ? t("template.createSuccess") : t("template.updateSuccess")
        );
        loadTemplates();
        if (editorMode === "create" && typeof res.data === "number") {
          setSelectedTemplateId(res.data);
        } else if (selectedTemplateId) {
          setSelectedTemplateId(null);
          setTimeout(() => setSelectedTemplateId(selectedTemplateId), 50);
        }
      } else {
        toast.error(res.error || t("adminCompanymanagement.unableToSaveProcessTemplate"));
        throw new Error();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("adminCompanymanagement.errorOccurredWhileSavingTemplate"));
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTemplates = templates.filter(
    (tpl) =>
      tpl.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="border-border/50 bg-background/50 flex h-[calc(100vh-6rem)] min-h-0 w-full overflow-hidden rounded-2xl border shadow-sm dark:border-slate-800">
      <div
        className={cn(
          "flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white md:w-[320px] dark:border-slate-800 dark:bg-slate-900/10",
          selectedTemplateId ? "hidden md:flex" : "flex"
        )}>
        <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <LayoutTemplate className="h-5 w-5 text-indigo-500" />
              {t("adminAdmindashboard.processTemplate")}
            </h2>
            <Button
              size="sm"
              onClick={handleCreateClick}
              className="h-8 gap-1.5 rounded-lg !bg-indigo-600 px-3 text-xs font-semibold !text-white shadow-sm hover:!bg-indigo-700">
              <PlusCircle className="h-3.5 w-3.5" />
              {t("general.createTemplate")}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("adminCompanymanagement.searchTemplateAndCategory")}
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-xs dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoadingList ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-xs">{t("adminCompanymanagement.loadingTemplateList")}</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 py-16 text-center text-slate-400 dark:text-slate-500">
              <LayoutTemplate className="mb-2 h-10 w-10 text-slate-300" />
              <span className="text-xs font-bold">{t("template.noTemplateFound")}</span>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredTemplates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id!)}
                    className={cn(
                      "group flex cursor-pointer items-start justify-between rounded-xl p-3 transition-all duration-200 select-none",
                      isSelected
                        ? "bg-slate-100 dark:bg-slate-800"
                        : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    )}>
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {tpl.category && (
                          <span className="inline-block rounded-full bg-slate-200/60 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
                            {tpl.category}
                          </span>
                        )}
                      </div>
                      <h4
                        className={cn(
                          "mt-1 truncate text-sm font-bold",
                          isSelected
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-slate-800 dark:text-slate-200"
                        )}>
                        {tpl.name}
                      </h4>
                      {tpl.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {tpl.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteTemplate(tpl.id!, e)}
                      className="p-1 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <main
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50/40 dark:bg-slate-950/20",
          selectedTemplateId ? "flex" : "hidden md:flex"
        )}>
        {selectedTemplateId ? (
          isLoadingDetail ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              <span className="mt-2 text-sm">{t("general.loadingDetails")}</span>
            </div>
          ) : selectedTemplate ? (
            <div className="flex h-full flex-col">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/20">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                      {selectedTemplate.category}
                    </span>
                    <button
                      onClick={() => setSelectedTemplateId(null)}
                      className="text-xs text-indigo-500 hover:underline md:hidden">
                      &larr; {t("common.goBack")}
                    </button>
                  </div>
                  <h2 className="mt-1.5 truncate text-xl font-bold text-slate-900 dark:text-white">
                    {selectedTemplate.name}
                  </h2>
                  {selectedTemplate.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(selectedTemplate)}
                    className="h-9 gap-1.5 border-slate-200 px-3 font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white">
                    <Edit3 className="h-4 w-4" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(selectedTemplate.id!)}
                    disabled={isDeleting}
                    className="h-9 gap-1.5 border-red-200 px-3 font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-950/40 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" />
                    {t("common.clear")}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="max-w-3xl space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold tracking-wider text-slate-800 uppercase dark:text-slate-300">
                      {t("template.processContains")} {selectedTemplate.rounds?.length || 0}{" "}
                      {t("userApplicationhistory.rounds")}
                    </h3>
                  </div>

                  <div className="relative space-y-5 pl-12 before:absolute before:top-2 before:bottom-2 before:left-[29px] before:w-[1.5px] before:bg-slate-200 dark:before:bg-slate-800">
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
                          <div className="dark:bg-slate-850 absolute top-1 -left-[30px] flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600 shadow-sm dark:border-slate-950 dark:text-slate-400">
                            {idx + 1}
                          </div>

                          <div
                            onClick={() => handleEditClick(selectedTemplate)}
                            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-500/50 hover:bg-slate-50/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-400/50 dark:hover:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "rounded-xl p-2",
                                    metadata.bgColor,
                                    metadata.color
                                  )}>
                                  {metadata.icon}
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {round.name}
                                  </h4>
                                  <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                                    {metadata.title}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 opacity-70" />
                                  {round.configData?.timeLimitMinutes
                                    ? `${round.configData.timeLimitMinutes} phút`
                                    : t("enterpriseJobdescriptiondetailpage.unlimited")}
                                </span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {t("common.obtain")}{" "}
                                  {Math.round((round.passThreshold ?? 0.8) * 100)}%
                                </span>
                              </div>
                            </div>

                            {round.configData?.instruction && (
                              <div className="border-slate-150/40 mt-3 rounded-lg border bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-950/40 dark:text-slate-400">
                                <span className="mb-1 block font-bold text-slate-800 dark:text-slate-300">
                                  {t("template.candidateInstructions")}
                                </span>
                                {round.configData.instruction}
                              </div>
                            )}

                            {round.roundType === "QUIZ" &&
                              round.configData?.quizQuestions &&
                              round.configData.quizQuestions.length > 0 && (
                                <div className="mt-3 border-t border-slate-100/10 pt-2 dark:border-slate-800/20">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-500">
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
              </ScrollArea>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
              <span>{t("template.failedToLoadDetails")}</span>
            </div>
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50/40 dark:bg-indigo-950/10">
              <LayoutTemplate className="h-10 w-10 text-indigo-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-800 dark:text-white">
              {t("adminCompanymanagement.processTemplate")}
            </h2>
            <p className="max-w-sm text-sm text-slate-400 dark:text-slate-500">
              {t("template.selectFromList")}
            </p>
          </div>
        )}
      </main>

      {isEditorOpen && (
        <RoundCanvasEditorDialog
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={editorRounds}
          initialMetadata={editorMetadata}
          showMetadataInputs={true}
          isSaving={isSaving}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}
