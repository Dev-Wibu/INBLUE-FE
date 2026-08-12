import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import type { SummaryResponse } from "@/interfaces";
import { cn } from "@/lib/utils";
import { interviewTemplateManager } from "@/services/interview-template.manager";
import { Eye, LayoutTemplate, MoreHorizontal, PlusCircle, Search, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
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
        // Only close the editor on full-template saves; saving an individual
        // round should leave the user inside the workspace.
        if (options?.closeEditorAfter !== false) {
          setIsEditorOpen(false);
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

  const filteredTemplates = useMemo(() => {
    return templates.filter(
      (tpl) =>
        tpl.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = templates.length;
    const categoryCount = new Set(templates.map((tpl) => tpl.category?.trim()).filter(Boolean))
      .size;
    return { total, categoryCount };
  }, [templates]);

  // Sorting + Pagination
  const { sortedData } = useSortable(filteredTemplates);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_interviewtemplatemanagement_interviewtemplatemanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });

  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);

  if (isEditorOpen) {
    return (
      <div
        className={cn(
          "-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950"
        )}>
        <RoundCanvasEditorWorkspace
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialRounds={editorRounds}
          initialMetadata={editorMetadata}
          showMetadataInputs={true}
          mode="create"
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
      <div className={cn("flex flex-col bg-slate-50 dark:bg-slate-950", "flex-1 overflow-hidden")}>
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
          {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
          <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminAdmindashboard.processTemplate")}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t("adminCompanymanagement.searchTemplateAndCategory")}
                </p>
              </div>
              <div className="flex items-center justify-center gap-5 sm:gap-6">
                {[
                  [stats.total, t("adminCompanymanagement.totalTemplates", "Tổng mẫu quy trình")],
                  [stats.categoryCount, t("adminCompanymanagement.categoryCount", "Danh mục")],
                ].map(([value, label], index) => (
                  <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                    {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                    <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                      <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                        {value}
                      </span>
                      <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Search + Create row */}
            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    pagination.goToFirstPage();
                  }}
                  placeholder={t("adminCompanymanagement.searchTemplateAndCategory")}
                  className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                />
              </div>
              <Button
                type="submit"
                className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Search className="mr-2 h-[18px] w-[18px]" />
                {t("common.search", "Tìm kiếm")}
              </Button>
              <Button
                type="button"
                onClick={handleCreateClick}
                className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                <PlusCircle className="mr-2 h-[18px] w-[18px]" />
                {t("general.createTemplate")}
              </Button>
            </form>
          </div>

          {/* Table Card Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {isLoadingList ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                <span className="text-sm text-slate-400">
                  {t("adminCompanymanagement.loadingTemplateList")}
                </span>
              </div>
            ) : pageData.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <LayoutTemplate className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {t("template.noTemplateFound")}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                      <TableHead className="w-16 pl-6 font-medium text-slate-500">
                        {t("common.stt", "STT")}
                      </TableHead>
                      <TableHead className="font-medium text-slate-500">
                        {t("adminInterviewTemplate.name", "Tên mẫu")}
                      </TableHead>
                      <TableHead className="font-medium text-slate-500">
                        {t("adminInterviewTemplate.category", "Danh mục")}
                      </TableHead>
                      <TableHead className="font-medium text-slate-500">
                        {t("adminInterviewTemplate.description", "Mô tả")}
                      </TableHead>
                      <TableHead className="w-[100px] pr-6 text-right font-medium text-slate-500">
                        {t("common.action", "Thao tác")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.map((tpl, idx) => (
                      <TableRow
                        key={tpl.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80"
                        onClick={() => navigate(`/admin/interviewTemplates/${tpl.id}`)}>
                        <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>{pagination.startIndex + idx + 1}</span>
                            {/* Dummy element to force row height alignment */}
                            <div
                              className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                              aria-hidden="true">
                              <div className="h-3.5 w-3.5"></div>
                              <div className="h-3.5 w-3.5"></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {tpl.name}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            {tpl.category}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-slate-500 dark:text-slate-400">
                          {tpl.description || "—"}
                        </TableCell>
                        <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}>
                                <span className="sr-only">{t("common.openMenu", "Mở menu")}</span>
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
                                <span>{t("common.viewDetails", "Xem chi tiết")}</span>
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
                    ))}
                  </TableBody>
                </Table>
                {sortedData.length > 0 && (
                  <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                    <PaginationControl
                      pagination={pagination}
                      showBoundaryButtons={false}
                      showPageJump={false}
                      onPageSizeChange={(nextPageSize) => {
                        setPageSize(nextPageSize);
                        pagination.goToFirstPage();
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
