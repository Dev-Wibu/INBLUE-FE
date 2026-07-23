import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SummaryResponse } from "@/interfaces";
import { interviewTemplateManager } from "@/services/interview-template.manager";
import { Eye, LayoutTemplate, MoreHorizontal, PlusCircle, Search, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { UIRound } from "@/components/shared/RoundCanvasEditor";
import { RoundCanvasEditorWorkspace } from "@/components/shared/RoundCanvasEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function InterviewTemplateManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<SummaryResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Editor states (only for creating)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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

  const handleDeleteTemplate = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(t("adminCompanymanagement.confirmDeleteTemplate"))) return;

    const res = await interviewTemplateManager.deleteTemplate(id);
    if (res.success) {
      toast.success(t("adminCompanymanagement.deletedRecruitmentTemplateSuccessfully"));
      loadTemplates();
    } else {
      toast.error(res.error || t("adminCompanymanagement.unableToDeleteProcessTemplate"));
    }
  };

  const handleCreateClick = () => {
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
                  title: cp?.title || t("common.exerciseId", { id }),
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
                  title: cp?.title || t("common.exerciseId", { id }),
                  difficulty: (cp?.difficulty as "EASY" | "MEDIUM" | "HARD") || "MEDIUM",
                  language: cp?.language || "Java",
                };
              }) ?? [],
          },
        })),
      };

      const res = await interviewTemplateManager.createTemplate(payload);

      if (res.success) {
        toast.success(t("template.createSuccess"));
        loadTemplates();
        setIsEditorOpen(false);
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

  if (isEditorOpen) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={editorRounds}
          initialMetadata={editorMetadata}
          showMetadataInputs={true}
          isSaving={isSaving}
          onSave={handleSaveTemplate}
        />
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
            <LayoutTemplate className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("adminAdmindashboard.processTemplate")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("adminCompanymanagement.searchTemplateAndCategory")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("adminCompanymanagement.searchTemplateAndCategory")}
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-sm dark:border-slate-800 dark:bg-slate-950"
            />
          </div>
          <Button
            size="sm"
            onClick={handleCreateClick}
            className="h-9 gap-1.5 rounded-lg !bg-indigo-600 px-4 text-sm font-semibold !text-white shadow-sm hover:!bg-indigo-700">
            <PlusCircle className="h-4 w-4" />
            {t("general.createTemplate")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("common.stt") || "STT"}</TableHead>
                  <TableHead>{t("adminInterviewTemplate.name") || "Tên mẫu"}</TableHead>
                  <TableHead>{t("adminInterviewTemplate.category") || "Danh mục"}</TableHead>
                  <TableHead>{t("adminInterviewTemplate.description") || "Mô tả"}</TableHead>
                  <TableHead className="w-[100px] text-right">{t("common.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingList ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                        <span className="text-sm">
                          {t("adminCompanymanagement.loadingTemplateList")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <LayoutTemplate className="mb-2 h-10 w-10 text-slate-300" />
                        <span className="text-sm font-medium">{t("template.noTemplateFound")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((tpl, idx) => (
                    <TableRow
                      key={tpl.id}
                      className="cursor-pointer bg-white transition-colors hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800/50"
                      onClick={() => navigate(`/admin/interviewTemplates/${tpl.id}`)}>
                      <TableCell className="font-medium text-slate-500">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {tpl.name}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          {tpl.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400">
                        <span className="line-clamp-1">{tpl.description || "—"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Mở menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/interviewTemplates/${tpl.id}`);
                              }}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>{t("common.viewDetails") || "Xem chi tiết"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950/50 dark:focus:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(tpl.id!, e);
                              }}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{t("common.delete")}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}
