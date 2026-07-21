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
  ChevronLeft,
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
        toast.error(res.error || "Không thể cập nhật trạng thái");
        setProblems((prev) =>
          prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: isActive } : p))
        );
      }
    } catch {
      toast.error("Đã xảy ra lỗi");
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
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
          {/* Read-only Sidebar */}
          <div className="flex w-[420px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-none items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-sans text-sm font-bold text-slate-800 dark:text-slate-200">
                  {t("common.details", "Chi tiết")}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditProblem(selectedProblem)}
                className="h-8 gap-1.5 bg-white text-xs dark:bg-slate-900">
                <Pencil className="h-3.5 w-3.5" />
                {t("general.edit", "Chỉnh sửa")}
              </Button>
            </div>

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
                      {selectedProblem.expectedIssues?.length || 0} Lỗi
                    </span>
                  </div>
                </div>

                {selectedProblem.problemStatement && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Yêu cầu Code Review
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
          <div className="relative flex min-w-0 flex-1 flex-col bg-slate-100 dark:bg-[#0f111a]">
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
                <p className="text-slate-500">Chưa có mã nguồn để review.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LIST MODE
  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* HEADER SECTION */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Bài tập Code Review</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quản lý danh sách bài tập thực hành Code Review
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.goToFirstPage();
              }}
              placeholder="Tìm kiếm bài tập..."
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <div className="flex items-center gap-1">
            {(["ALL", "EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => {
              const count =
                d === "ALL" ? problems.length : problems.filter((p) => p.difficulty === d).length;
              const isActive = difficultyFilter === d;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setDifficultyFilter(d);
                    pagination.goToFirstPage();
                  }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    isActive
                      ? d === "ALL"
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : d === "EASY"
                          ? "bg-emerald-600 text-white"
                          : d === "MEDIUM"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-600 text-white"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}>
                  {d === "ALL" ? "Tất cả" : d}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as SortKey);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-[140px] border-slate-200 text-xs dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-xs">
                Mới nhất trước
              </SelectItem>
              <SelectItem value="oldest" className="text-xs">
                Cũ nhất trước
              </SelectItem>
              <SelectItem value="title_asc" className="text-xs">
                Tiêu đề A → Z
              </SelectItem>
              <SelectItem value="title_desc" className="text-xs">
                Tiêu đề Z → A
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadProblems(true)}
              disabled={isRefreshing}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <Button
              onClick={() => setView({ mode: "create" })}
              className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Thêm Bài Tập
            </Button>
          </div>
        </div>
      </div>

      {/* ── TABLE CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="sm" />
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
            <AlertTriangle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium text-slate-500">
              Không tìm thấy bài tập code review nào.
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
            {/* Filter result count */}
            {(searchQuery || difficultyFilter !== "ALL") && (
              <div className="mb-3 flex flex-none items-center gap-2 px-6 pt-4">
                <span className="text-xs text-slate-500">
                  Hiển thị{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {processedData.length}
                  </strong>{" "}
                  / <strong>{problems.length}</strong> kết quả
                </span>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDifficultyFilter("ALL");
                  }}
                  className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                  Xóa bộ lọc
                </button>
              </div>
            )}
            <div className="flex-1 overflow-auto">
              <CodeReviewProblemTable
                problems={pageItems}
                onViewDetail={handleViewDetail}
                onEdit={handleEditProblem}
                onToggleStatus={handleToggleStatus}
              />
            </div>

            <div className="flex flex-none items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  pagination.goToFirstPage();
                }}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
