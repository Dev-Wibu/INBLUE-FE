import { PaginationControl, ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { formatDate } from "@/lib/formatting";
import { cn, extractDataArray } from "@/lib/utils";
import {
  codeReviewProblemManager,
  type CodeReviewProblem,
} from "@/services/code-review-problem.manager";
import Editor from "@monaco-editor/react";
import {
  AlertTriangle,
  Bot,
  Bug,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  FileCode2,
  Lightbulb,
  Loader2,
  Plus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CodeReviewProblemBuilder } from "./components/CodeReviewProblemBuilder";

// Map language names to Monaco editor language IDs
const LANGUAGE_MAP: Record<string, string> = {
  JAVA: "java",
  JAVASCRIPT: "javascript",
  JS: "javascript",
  TYPESCRIPT: "typescript",
  TS: "typescript",
  PYTHON: "python",
  "PYTHON 3": "python",
  CPP: "cpp",
  C: "c",
  CSHARP: "csharp",
  C_SHARP: "csharp",
  GO: "go",
  RUST: "rust",
  KOTLIN: "kotlin",
  SWIFT: "swift",
  RUBY: "ruby",
  PHP: "php",
  SCALA: "scala",
  DART: "dart",
};

function getMonacoLanguage(language?: string): string {
  if (!language) return "plaintext";
  return LANGUAGE_MAP[language.toUpperCase()] ?? language.toLowerCase();
}

type ViewState = { mode: "list" } | { mode: "create" } | { mode: "detail"; problemId: number };

type SortableProblem = CodeReviewProblem & {
  idSortValue: number;
  titleSortValue: string;
  difficultySortValue: string;
  createdAtSortValue: number;
};

export function CodeReviewProblemManagementPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ mode: "list" });
  const [problems, setProblems] = useState<CodeReviewProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selectedProblem, setSelectedProblem] = useState<CodeReviewProblem | null>(null);
  const [viewActiveFileIdx, setViewActiveFileIdx] = useState<number>(0);
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedProblem) {
      setViewActiveFileIdx(0);
      setExpandedIssues({});
    }
  }, [selectedProblem]);

  const loadProblems = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsLoading(true);
      }
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
        if (showReloading) {
          setIsReloading(false);
        } else {
          setIsLoading(false);
        }
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

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_codereviewproblemmanagement_page_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({ totalCount: sortedData.length, pageSize });
  const pageItems = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );

  const filteredProblems = useMemo(() => {
    return problems.filter((problem) => {
      if (difficultyFilter !== "all" && problem.difficulty !== difficultyFilter) {
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
  }, [problems, searchQuery, difficultyFilter]);

  const getDifficultyBadge = (difficulty?: string) => {
    switch (difficulty) {
      case "EASY":
        return {
          label: t("common.easy"),
          className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        };
      case "MEDIUM":
        return {
          label: t("common.medium"),
          className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        };
      case "HARD":
        return {
          label: t("common.hard"),
          className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      default:
        return {
          label: difficulty || "-",
          className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
        };
    }
  };

  const handleViewDetail = (problem: CodeReviewProblem) => {
    setSelectedProblem(problem);
  };

  const handleBack = () => {
    setView({ mode: "list" });
  };

  if (view.mode === "create") {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-12 items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 px-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                <ChevronRight className="mr-1 h-3 w-3 rotate-180" />
                Quay lại
              </Button>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <nav className="flex items-center gap-2 text-xs text-slate-500">
                <span
                  className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-300"
                  onClick={handleBack}>
                  Quản lý bài tập Code Review
                </span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-slate-900 dark:text-slate-200">Tạo mới</span>
              </nav>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <CodeReviewProblemBuilder
            onSuccess={() => {
              handleBack();
              void loadProblems(true);
            }}
            onCancel={handleBack}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header & Toolbar */}
      <div className="z-10 shrink-0 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              <Bot className="h-5 w-5 text-indigo-500" />
              {t("adminCodeReviewProblem.pageTitle") || "Quản lý bài tập Code Review"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Input
                placeholder={
                  t("adminCodeReviewProblem.searchPlaceholder") || "Tìm theo tên, ngôn ngữ, ID..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  pagination.goToFirstPage();
                }}
                className="h-9 w-full border-slate-200 bg-slate-100/50 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800/50"
              />
            </div>

            <Select
              value={difficultyFilter}
              onValueChange={(value) => {
                setDifficultyFilter(value);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="h-9 w-[140px] border-slate-200 bg-slate-100/50 dark:border-slate-700 dark:bg-slate-800/50">
                <SelectValue placeholder="Độ khó" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="EASY">Dễ</SelectItem>
                <SelectItem value="MEDIUM">Trung bình</SelectItem>
                <SelectItem value="HARD">Khó</SelectItem>
              </SelectContent>
            </Select>

            <ReloadButton
              onReload={() => loadProblems(true)}
              isLoading={isReloading}
              tooltip={t("common.reload")}
            />

            <Button
              className="h-9 bg-indigo-600 px-4 text-white shadow-sm hover:bg-indigo-700"
              onClick={() => setView({ mode: "create" })}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("common.create") || "Tạo mới"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Pane: List */}
        <div className="flex w-[400px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/50 p-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-400">
            <span>{filteredProblems.length} bài tập</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <SpinnerBlock size="sm" />
              </div>
            ) : filteredProblems.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <AlertTriangle className="h-5 w-5 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Không có dữ liệu
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Thử thay đổi bộ lọc hoặc tạo bài tập mới.
                </p>
              </div>
            ) : (
              pageItems.map((problem) => {
                const difficultyBadge = getDifficultyBadge(problem.difficulty);
                const isSelected = selectedProblem?.id === problem.id;

                return (
                  <div
                    key={problem.id}
                    onClick={() => handleViewDetail(problem)}
                    className={`group relative cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-indigo-500/50 bg-white shadow-md ring-1 ring-indigo-500/20 dark:border-indigo-400/50 dark:bg-slate-800"
                        : "border-slate-200 bg-white/60 hover:border-indigo-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-700 dark:hover:bg-slate-800"
                    }`}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4
                        className={`line-clamp-2 text-sm font-semibold ${isSelected ? "text-indigo-700 dark:text-indigo-400" : "text-slate-900 dark:text-slate-100"}`}>
                        {problem.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${difficultyBadge.className} ${isSelected ? "border-current bg-transparent" : "bg-transparent"}`}>
                        {difficultyBadge.label}
                      </Badge>
                    </div>

                    <p className="mb-3 line-clamp-2 h-8 text-xs text-slate-500 dark:text-slate-400">
                      {problem.problemStatement || "Không có mô tả..."}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-100/80 px-1.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {problem.language || "N/A"}
                        </span>
                        <span>#{problem.id}</span>
                      </div>
                      <span className="tabular-nums">
                        {problem.createdAt ? formatDate(problem.createdAt) : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-200 bg-white/50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
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

        {/* Right Pane: Detail View */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950">
          {selectedProblem ? (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-6">
                {/* Header Section */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedProblem.title}
                  </h2>
                </div>
                <Separator className="my-4" />
                {/* Problem Statement Section */}
                {selectedProblem.problemStatement && (
                  <div className="mb-4">
                    <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Mô tả bài tập
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-slate-100 bg-slate-50/50 p-4 whitespace-pre-wrap text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                      {selectedProblem.problemStatement}
                    </div>
                  </div>
                )}
                {/* IDE-like File Viewer Section */}
                {selectedProblem.files && selectedProblem.files.length > 0 && (
                  <div className="mb-2 flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-800">
                    {/* File Tabs */}
                    <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                      {(selectedProblem.files || []).map((f, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => setViewActiveFileIdx(fIdx)}
                          className={cn(
                            "flex items-center gap-2 border-r border-slate-200 px-4 py-2.5 text-xs font-semibold transition-all dark:border-slate-800",
                            viewActiveFileIdx === fIdx
                              ? "border-b-2 border-b-indigo-500 bg-white text-indigo-600 dark:bg-slate-950 dark:text-indigo-400"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          )}>
                          <FileCode2
                            className={cn(
                              "h-3.5 w-3.5",
                              viewActiveFileIdx === fIdx ? "text-indigo-500" : ""
                            )}
                          />
                          {f.filename || "Untitled"}
                        </button>
                      ))}
                    </div>

                    {/* Code Workspace with Monaco + Issue Annotations */}
                    {(() => {
                      const file = (selectedProblem.files || [])[viewActiveFileIdx];
                      if (!file) return null;

                      const activeIssues = (selectedProblem.expectedIssues || []).filter(
                        (iss) => iss.filename === file.filename
                      );

                      return (
                        <div className="relative flex flex-1 overflow-hidden">
                          {/* Monaco Editor */}
                          <div className="flex-1 overflow-hidden">
                            <Editor
                              height="100%"
                              language={getMonacoLanguage(file.language)}
                              value={file.content || ""}
                              theme="vs-dark"
                              options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 12,
                                lineNumbers: "on",
                                folding: true,
                                wordWrap: "on",
                                padding: { top: 8, bottom: 8 },
                                scrollbar: {
                                  verticalScrollbarSize: 6,
                                  horizontalScrollbarSize: 6,
                                },
                                renderLineHighlight: "none",
                                overviewRulerLanes: 0,
                                hideCursorInOverviewRuler: true,
                                overviewRulerBorder: false,
                                contextmenu: false,
                                links: false,
                                glyphMargin: true,
                              }}
                              onMount={(editor) => {
                                editor.onMouseDown((e) => {
                                  const type = e.target.type;
                                  const position = e.target.position;
                                  if (
                                    (type === 2 || type === 3) &&
                                    position &&
                                    position.lineNumber
                                  ) {
                                    const lineNum = position.lineNumber;
                                    const lineIssues = activeIssues.filter(
                                      (iss) => Number(iss.lineNumber) === lineNum
                                    );
                                    if (lineIssues.length > 0) {
                                      const toggleKey = `view-${file.filename}-${lineNum}`;
                                      setExpandedIssues((prev) => ({
                                        ...prev,
                                        [toggleKey]: !prev[toggleKey],
                                      }));
                                    }
                                  }
                                });
                              }}
                            />
                          </div>

                          {/* Issue Annotations Sidebar */}
                          <div className="w-80 shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-950/30 p-3">
                            <div className="mb-3 flex items-center gap-2">
                              <Bug className="h-4 w-4 text-red-400" />
                              <span className="text-xs font-bold text-slate-300">
                                Lỗi cần phát hiện ({activeIssues.length})
                              </span>
                            </div>

                            {activeIssues.length === 0 ? (
                              <div className="py-8 text-center">
                                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/50" />
                                <p className="text-xs text-slate-500">
                                  Không có lỗi mẫu nào trong file này.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {activeIssues.map((issue, issueIdx) => {
                                  const toggleKey = `view-${file.filename}-${issue.lineNumber}`;
                                  const isExpanded = !!expandedIssues[toggleKey];

                                  return (
                                    <div key={issueIdx}>
                                      {/* Issue Header Row */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedIssues((prev) => ({
                                            ...prev,
                                            [toggleKey]: !prev[toggleKey],
                                          }));
                                        }}
                                        className={cn(
                                          "group flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                                          issue.severity === "CRITICAL"
                                            ? "border-red-900/50 bg-red-950/20 hover:bg-red-950/30"
                                            : issue.severity === "WARNING"
                                              ? "border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/30"
                                              : "border-blue-900/50 bg-blue-950/20 hover:bg-blue-950/30"
                                        )}>
                                        <Bug
                                          className={cn(
                                            "h-3.5 w-3.5 shrink-0",
                                            issue.severity === "CRITICAL"
                                              ? "text-red-400"
                                              : issue.severity === "WARNING"
                                                ? "text-amber-400"
                                                : "text-blue-400"
                                          )}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={cn(
                                                "rounded px-1.5 py-0.5 text-[8px] font-bold uppercase",
                                                issue.severity === "CRITICAL"
                                                  ? "bg-red-900/60 text-red-300"
                                                  : issue.severity === "WARNING"
                                                    ? "bg-amber-900/60 text-amber-300"
                                                    : "bg-blue-900/60 text-blue-300"
                                              )}>
                                              {issue.severity}
                                            </span>
                                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-400">
                                              Dòng {issue.lineNumber}
                                            </span>
                                          </div>
                                          {issue.description && (
                                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-400">
                                              {issue.description}
                                            </p>
                                          )}
                                        </div>
                                        {isExpanded ? (
                                          <EyeOff className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                        ) : (
                                          <Eye className="h-3.5 w-3.5 shrink-0 text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100" />
                                        )}
                                      </button>

                                      {/* Expanded Issue Detail */}
                                      {isExpanded && (
                                        <div
                                          className={cn(
                                            "mt-1 rounded-lg border p-3",
                                            issue.severity === "CRITICAL"
                                              ? "border-red-900/50 bg-red-950/30"
                                              : issue.severity === "WARNING"
                                                ? "border-amber-900/50 bg-amber-950/30"
                                                : "border-blue-900/50 bg-blue-950/30"
                                          )}>
                                          <div className="mb-2 flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-200">
                                              Lỗi mẫu phát hiện:
                                            </span>
                                            <span
                                              className={cn(
                                                "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase",
                                                issue.severity === "CRITICAL"
                                                  ? "bg-red-900/60 text-red-300"
                                                  : issue.severity === "WARNING"
                                                    ? "bg-amber-900/60 text-amber-300"
                                                    : "bg-blue-900/60 text-blue-300"
                                              )}>
                                              {issue.severity}
                                            </span>
                                          </div>
                                          <p className="text-[11px] leading-relaxed text-slate-300">
                                            {issue.description || "(Chưa có mô tả)"}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                <Bot className="h-10 w-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                Chưa chọn bài tập
              </h3>
              <p className="max-w-sm text-slate-500 dark:text-slate-400">
                Chọn một bài tập từ danh sách bên trái để xem chi tiết thông tin, mã nguồn và các
                lỗi cần tìm.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
