import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonacoCodeReviewViewer } from "@/components/ui/monaco-code-review-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useMonacoTheme } from "@/hooks/useMonacoTheme";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { cn, extractDataArray } from "@/lib/utils";
import {
  codeReviewProblemManager,
  type CodeReviewProblem,
} from "@/services/code-review-problem.manager";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  FileCode2,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CodeReviewProblemBuilder } from "./components/CodeReviewProblemBuilder";
import { CodeReviewProblemTable } from "./components/CodeReviewProblemTable";

type ViewState =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "detail"; problemId: number }
  | { mode: "edit"; problem: CodeReviewProblem };

type SortableProblem = CodeReviewProblem & {
  idSortValue: number;
  titleSortValue: string;
  difficultySortValue: string;
  createdAtSortValue: number;
};

type Difficulty = "ALL" | "EASY" | "MEDIUM" | "HARD";
type SortKey = "newest" | "oldest" | "title_asc" | "title_desc";

export function CodeReviewProblemManagementPage() {
  const { t } = useTranslation();
  const monacoTheme = useMonacoTheme();
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [problems, setProblems] = useState<CodeReviewProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedProblem, setSelectedProblem] = useState<CodeReviewProblem | null>(null);
  const [viewActiveFileIdx, setViewActiveFileIdx] = useState<number>(0);
  const [, setExpandedIssues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedProblem) {
      setViewActiveFileIdx(0);
      setExpandedIssues({});
    }
  }, [selectedProblem]);

  const loadProblems = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const response = await codeReviewProblemManager.getAll();
        if (response.success && response.data) {
          const data = extractDataArray<CodeReviewProblem>(response);
          setProblems(data);
        } else {
          toast.error(response.error || t("common.unableToLoadArticleList"));
        }
      } catch {
        toast.error(t("common.unableToLoadArticleList"));
      } finally {
        if (showRefreshing) setIsRefreshing(false);
        else setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  const sortableProblems = useMemo<SortableProblem[]>(() => {
    return problems.map((problem) => ({
      ...problem,
      idSortValue: typeof problem.id === "number" ? problem.id : 0,
      titleSortValue: problem.title?.toLowerCase() || "",
      difficultySortValue: problem.difficulty || "",
      createdAtSortValue: problem.createdAt ? new Date(problem.createdAt).getTime() : 0,
    }));
  }, [problems]);

  const { sortedData } = useSortable(sortableProblems, {
    defaultSort: { key: "createdAtSortValue", direction: "desc" },
    noSortBehavior: "preserve",
    tieBreaker: { key: "idSortValue", direction: "desc" },
  });

  // Stats calculation
  const stats = useMemo(() => {
    const total = problems.length;
    const easyCount = problems.filter((p) => p.difficulty === "EASY").length;
    const mediumCount = problems.filter((p) => p.difficulty === "MEDIUM").length;
    const hardCount = problems.filter((p) => p.difficulty === "HARD").length;
    return { total, easyCount, mediumCount, hardCount };
  }, [problems]);

  const processedData = useMemo(() => {
    // 1. Sort override based on SortKey
    const sorted = [...sortedData];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAtSortValue - a.createdAtSortValue);
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAtSortValue - b.createdAtSortValue);
        break;
      case "title_asc":
        sorted.sort((a, b) => a.titleSortValue.localeCompare(b.titleSortValue));
        break;
      case "title_desc":
        sorted.sort((a, b) => b.titleSortValue.localeCompare(a.titleSortValue));
        break;
    }
    // 2. Filter
    return sorted.filter((problem) => {
      if (difficultyFilter !== "ALL" && problem.difficulty !== difficultyFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          problem.title?.toLowerCase().includes(q) ||
          problem.language?.toLowerCase().includes(q) ||
          String(problem.id).includes(q)
        );
      }
      return true;
    });
  }, [sortedData, sort, difficultyFilter, searchQuery]);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_codereviewproblemmanagement_page_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({ totalCount: processedData.length, pageSize });
  const pageItems = useMemo(
    () => processedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, processedData]
  );

  const handleToggleStatus = async (problem: CodeReviewProblem, isActive: boolean) => {
    // Optimistic UI update
    setProblems((prev) =>
      prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: !isActive } : p))
    );
    try {
      const res = await codeReviewProblemManager.update(problem.id, {
        ...problem,
        isDeleted: !isActive,
      });
      if (!res.success) {
        toast.error(
          res.error ||
            t("adminCodeReviewProblem.unableToUpdateStatus", "Không thể cập nhật trạng thái")
        );
        setProblems((prev) =>
          prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: isActive } : p))
        );
      } else {
        toast.success(
          isActive
            ? t("adminCodeReviewProblem.statusActivated", "Đã bật bài tập")
            : t("adminCodeReviewProblem.statusDeactivated", "Đã tắt bài tập")
        );
      }
    } catch {
      toast.error(t("adminCodeReviewProblem.errorOccurred", "Đã xảy ra lỗi"));
      setProblems((prev) =>
        prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: isActive } : p))
      );
    }
  };

  const handleViewDetail = (problem: CodeReviewProblem) => {
    setSelectedProblem(problem);
    setView({ mode: "detail", problemId: problem.id });
  };

  const handleBack = () => {
    setSelectedProblem(null);
    setView({ mode: "list" });
  };

  const handleEditProblem = (problem: CodeReviewProblem) => {
    setView({ mode: "edit", problem });
  };

  if (view.mode === "create" || view.mode === "edit") {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col overflow-hidden bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        {/* SINGLE UNIFIED TOP HEADER */}
        <div className="flex flex-none flex-col justify-center gap-3 border-b border-slate-200 bg-white p-4 sm:h-[68px] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (view.mode === "edit" && selectedProblem) {
                  setView({ mode: "detail", problemId: selectedProblem.id });
                } else {
                  handleBack();
                }
              }}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
              {t("adminAdmindashboard.codeReviewProblems", "Bài tập Code Review")}
            </button>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
              {view.mode === "edit"
                ? t("adminCodeReviewProblem.editTitle", {
                    title: view.problem.title,
                  })
                : t("adminCodeReviewProblem.createTitle", "Tạo bài tập mới")}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (view.mode === "edit" && selectedProblem) {
                  setView({ mode: "detail", problemId: selectedProblem.id });
                } else {
                  handleBack();
                }
              }}
              className="h-8 text-xs">
              {t("common.back", "Quay lại")}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <CodeReviewProblemBuilder
            initialData={view.mode === "edit" ? view.problem : undefined}
            onSuccess={() => {
              if (view.mode === "edit" && selectedProblem) {
                void codeReviewProblemManager.getById(selectedProblem.id).then((res) => {
                  if (res.success && res.data) {
                    setSelectedProblem(res.data);
                    setView({ mode: "detail", problemId: selectedProblem.id });
                  } else {
                    handleBack();
                  }
                });
              } else {
                handleBack();
              }
              void loadProblems(true);
            }}
            onCancel={() => {
              if (view.mode === "edit" && selectedProblem) {
                setView({ mode: "detail", problemId: selectedProblem.id });
              } else {
                handleBack();
              }
            }}
          />
        </div>
      </div>
    );
  }

  if (view.mode === "detail" && selectedProblem) {
    return (
      <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col overflow-y-auto bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="m-5 mb-6 flex flex-none flex-col justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:m-6 sm:mb-6 sm:flex-row sm:items-center sm:justify-between md:mx-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back", "Quay lại")}
            </button>
            <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("adminAdmindashboard.codeReviewProblems", "Bài tập Code Review")}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
              {selectedProblem.title}
            </h1>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              {selectedProblem.language || "Java"}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                selectedProblem.difficulty === "EASY"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : selectedProblem.difficulty === "MEDIUM"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
              )}>
              {selectedProblem.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditProblem(selectedProblem)}
              className="h-8 gap-1.5 bg-white text-xs dark:bg-slate-900">
              <Pencil className="h-3.5 w-3.5" />
              {t("general.edit", "Chỉnh sửa")}
            </Button>
          </div>
        </div>

        <div className="mx-5 mb-6 grid min-h-[680px] flex-1 gap-6 sm:mx-6 md:mx-8 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* Read-only Sidebar */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg leading-tight font-bold text-slate-900 dark:text-white">
                    {selectedProblem.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {selectedProblem.language || "N/A"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        selectedProblem.difficulty === "EASY"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : selectedProblem.difficulty === "MEDIUM"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                      )}>
                      {selectedProblem.difficulty === "EASY"
                        ? t("common.difficultyEasy", "Dễ")
                        : selectedProblem.difficulty === "MEDIUM"
                          ? t("common.difficultyMedium", "Trung bình")
                          : t("common.difficultyHard", "Khó")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <AlertTriangle className="h-3 w-3 text-slate-400" />
                      {selectedProblem.expectedIssues?.length || 0}{" "}
                      {t("adminCodeReviewProblem.errorCount", "Lỗi")}
                    </span>
                  </div>
                </div>

                {selectedProblem.problemStatement && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      {t("adminCodeReviewProblem.reviewRequirements", "Yêu cầu Code Review")}
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-slate-100 bg-slate-50/50 p-4 font-sans whitespace-pre-wrap text-slate-700 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-300">
                      {selectedProblem.problemStatement}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Read-only IDE */}
          <div className="relative flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-[#0f111a]">
            {selectedProblem.files && selectedProblem.files.length > 0 ? (
              <>
                {/* File Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-1 overflow-x-auto px-1 pt-1">
                    {(selectedProblem.files || []).map((f, fIdx) => (
                      <div
                        key={fIdx}
                        onClick={() => setViewActiveFileIdx(fIdx)}
                        className={cn(
                          "group flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2 transition-colors",
                          viewActiveFileIdx === fIdx
                            ? "border-b-indigo-500 bg-white dark:border-b-indigo-400 dark:bg-slate-950"
                            : "border-b-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                        )}>
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold",
                            viewActiveFileIdx === fIdx
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                          )}>
                          <FileCode2 className="h-3.5 w-3.5" />
                          {f.filename || "Untitled"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monaco Editor */}
                <div className="relative flex-1 overflow-hidden">
                  <MonacoCodeReviewViewer
                    content={selectedProblem.files[viewActiveFileIdx]?.content || ""}
                    language={(
                      selectedProblem.files[viewActiveFileIdx]?.language || "java"
                    ).toLowerCase()}
                    issues={(selectedProblem.expectedIssues || [])
                      .filter(
                        (iss) =>
                          iss.filename === selectedProblem.files?.[viewActiveFileIdx]?.filename &&
                          iss.lineNumber !== undefined &&
                          iss.severity !== undefined &&
                          iss.description !== undefined
                      )
                      .map((iss) => ({
                        filename: iss.filename || "",
                        lineNumber: iss.lineNumber as number,
                        severity: iss.severity as string,
                        description: iss.description as string,
                      }))}
                    theme={monacoTheme}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-slate-500">
                  {t("adminCodeReviewProblem.noSourceCodeYet", "Chưa có mã nguồn để review.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LIST MODE
  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950"
      )}>
      <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
        <div className="m-4 mb-0 sm:m-6 sm:mb-0 lg:m-8 lg:mb-0">
          {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminAdmindashboard.codeReviewProblems", "Bài tập Code Review")}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t(
                    "adminCodeReviewProblem.subtitle",
                    "Quản lý danh sách bài tập thực hành Code Review"
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-5 sm:gap-6">
                {[
                  [stats.total, t("common.total", "Tổng")],
                  [stats.easyCount, t("common.difficultyEasy", "Dễ")],
                  [stats.mediumCount, t("common.difficultyMedium", "Trung bình")],
                  [stats.hardCount, t("common.difficultyHard", "Khó")],
                ].map(([value, label], index) => (
                  <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                    {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                    <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                      <span
                        className={cn(
                          "text-2xl leading-none font-bold",
                          index === 1
                            ? "text-emerald-600 dark:text-emerald-400"
                            : index === 2
                              ? "text-amber-600 dark:text-amber-400"
                              : index === 3
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-indigo-600 dark:text-sky-400"
                        )}>
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

            {/* Search row (matching User/Mentor pattern) */}
            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    pagination.goToFirstPage();
                  }}
                  placeholder={t("adminCodeReviewProblem.searchPlaceholder", "Tìm kiếm bài tập...")}
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
                onClick={() => loadProblems(true)}
                disabled={isRefreshing}
                className="h-[46px] w-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white p-0 text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              <Button
                type="button"
                onClick={() => setView({ mode: "create" })}
                className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                <Plus className="mr-2 h-[18px] w-[18px]" />
                {t("adminCodeReviewProblem.addProblem", "Thêm Bài Tập")}
              </Button>
            </form>

            {/* Difficulty filter pills (matching User/Mentor pattern) */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {t("common.difficulty", "Độ khó")}:
              </span>
              {(["ALL", "EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => {
                const count =
                  d === "ALL" ? problems.length : problems.filter((p) => p.difficulty === d).length;
                const isActive = difficultyFilter === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDifficultyFilter(d);
                      pagination.goToFirstPage();
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors",
                      isActive
                        ? d === "ALL"
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white"
                          : d === "EASY"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : d === "MEDIUM"
                              ? "border-amber-600 bg-amber-600 text-white"
                              : "border-rose-600 bg-rose-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    )}>
                    {d === "ALL"
                      ? t("common.all", "Tất cả")
                      : d === "EASY"
                        ? t("common.difficultyEasy", "Dễ")
                        : d === "MEDIUM"
                          ? t("common.difficultyMedium", "Trung bình")
                          : t("common.difficultyHard", "Khó")}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                      )}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <div className="ml-auto">
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setSort(v as SortKey);
                    pagination.goToFirstPage();
                  }}>
                  <SelectTrigger className="h-9 w-[160px] rounded-lg border-slate-200 text-xs dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" className="text-xs">
                      {t("adminCodingProblem.sortNewest", "Mới nhất trước")}
                    </SelectItem>
                    <SelectItem value="oldest" className="text-xs">
                      {t("adminCodingProblem.sortOldest", "Cũ nhất trước")}
                    </SelectItem>
                    <SelectItem value="title_asc" className="text-xs">
                      {t("adminCodingProblem.sortTitleAsc", "Tiêu đề A → Z")}
                    </SelectItem>
                    <SelectItem value="title_desc" className="text-xs">
                      {t("adminCodingProblem.sortTitleDesc", "Tiêu đề Z → A")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="flex flex-1 flex-col overflow-auto bg-slate-50 p-5 pt-6 sm:p-6 sm:pt-6 md:px-8 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerBlock size="lg" label={t("common.loading")} />
            </div>
          ) : processedData.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
              <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-medium text-slate-500">
                {t("adminCodeReviewProblem.emptyList", "Không tìm thấy bài tập code review nào.")}
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-col duration-300">
              {/* Filter result count */}
              {(searchQuery || difficultyFilter !== "ALL") && (
                <div className="mb-3 flex flex-none items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {t(
                      "common.showingFilteredResults",
                      "Hiển thị {{filtered}} / {{total}} kết quả",
                      {
                        filtered: processedData.length,
                        total: problems.length,
                      }
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setDifficultyFilter("ALL");
                    }}
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    {t("common.clearFilter", "Xóa bộ lọc")}
                  </button>
                </div>
              )}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <CodeReviewProblemTable
                  problems={pageItems}
                  onViewDetail={handleViewDetail}
                  onToggleStatus={handleToggleStatus}
                />
                {processedData.length > 0 && (
                  <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                    <PaginationControl
                      pagination={pagination}
                      showBoundaryButtons={false}
                      showPageJump={false}
                      pageSizeOptions={[10, 20, 50]}
                      onPageSizeChange={(nextPageSize) => {
                        setPageSize(nextPageSize);
                        pagination.goToFirstPage();
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
