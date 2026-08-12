import { PaginationControl } from "@/components/shared/PaginationControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import { codingProblemManager, type CodingProblem } from "@/services/coding-problem.manager";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CodingProblemTable } from "./components/CodingProblemTable";
import { CodingProblemEditor } from "./components/editor/CodingProblemEditor";

type Difficulty = "ALL" | "EASY" | "MEDIUM" | "HARD";
type SortKey = "newest" | "oldest" | "title_asc" | "title_desc";

export function CodingProblemManagementPage() {
  const { t } = useTranslation();
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Editor state
  const [isAuthoring, setIsAuthoring] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Partial<CodingProblem> | null>(null);

  // Filter / search state
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("ALL");
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProblems = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await codingProblemManager.getAll();
      if (res.success && res.data) setProblems(res.data);
      else toast.error(res.error || t("problem.loadCodingListFailed"));
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleToggleStatus = async (problem: CodingProblem, isActive: boolean) => {
    // Optimistic UI update
    setProblems((prev) =>
      prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: !isActive } : p))
    );
    try {
      // isDeleted is the opposite of isActive
      // Send the full object since it shares the main update endpoint
      const res = await codingProblemManager.update(problem.id, {
        ...problem,
        isDeleted: !isActive,
      });
      if (!res.success) {
        toast.error(
          res.error ||
            t("adminCodingproblemmanagement.unableToUpdateStatus", "Không thể cập nhật trạng thái")
        );
        // Revert on failure
        setProblems((prev) =>
          prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: problem.isDeleted } : p))
        );
      } else {
        toast.success(
          isActive
            ? t("adminCodingproblemmanagement.problemEnabled", "Đã bật bài tập")
            : t("adminCodingproblemmanagement.problemDisabled", "Đã tắt bài tập")
        );
      }
    } catch {
      toast.error(
        t("adminCodingproblemmanagement.errorUpdatingStatus", "Lỗi xảy ra khi cập nhật trạng thái")
      );
      setProblems((prev) =>
        prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: problem.isDeleted } : p))
      );
    }
  };

  const filteredProblems = useMemo(() => {
    let list = [...problems];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.title?.toLowerCase().includes(q));
    }
    if (difficulty !== "ALL") {
      list = list.filter((p) => p.difficulty === difficulty);
    }
    switch (sort) {
      case "newest":
        list.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
        break;
      case "oldest":
        list.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
        break;
      case "title_asc":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title_desc":
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }
    return list;
  }, [problems, query, difficulty, sort]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = problems.length;
    const easyCount = problems.filter((p) => p.difficulty === "EASY").length;
    const mediumCount = problems.filter((p) => p.difficulty === "MEDIUM").length;
    const hardCount = problems.filter((p) => p.difficulty === "HARD").length;
    return { total, easyCount, mediumCount, hardCount };
  }, [problems]);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_codingproblemmanagement_codingproblemmanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({
    totalCount: filteredProblems.length,
    pageSize,
  });

  const pageItems = useMemo(() => {
    return filteredProblems.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [filteredProblems, pagination.startIndex, pagination.endIndex]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {isAuthoring ? (
        <div
          className={cn(
            "-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950"
          )}>
          <CodingProblemEditor
            initialData={editingProblem}
            onBack={() => {
              setIsAuthoring(false);
              setEditingProblem(null);
            }}
            onSaved={() => {
              setIsAuthoring(false);
              setEditingProblem(null);
              fetchProblems(true);
            }}
          />
        </div>
      ) : (
        <div
          className={cn(
            "-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950"
          )}>
          <div className="m-4 mb-0 sm:m-6 sm:mb-0 lg:m-8 lg:mb-0">
            {/* Stat Summary & Control Card (matching User/Mentor pattern) */}
            <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("adminAdmindashboard.codingProblems", "Vòng Coding")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t(
                      "adminCodingProblem.subtitle",
                      "Quản lý danh sách bài tập lập trình thuật toán"
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
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      pagination.goToFirstPage();
                    }}
                    placeholder={t("adminCodingProblem.searchPlaceholder", "Tìm kiếm bài tập...")}
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
                  onClick={() => fetchProblems(true)}
                  disabled={isRefreshing}
                  className="h-[46px] w-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white p-0 text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <RefreshCw
                    className={`h-[18px] w-[18px] ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingProblem(null);
                    setIsAuthoring(true);
                  }}
                  className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Plus className="mr-2 h-[18px] w-[18px]" />
                  {t("adminCodingProblem.addProblem", "Thêm Bài Tập")}
                </Button>
              </form>

              {/* Difficulty filter pills (matching User/Mentor pattern) */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  {t("common.difficulty", "Độ khó")}:
                </span>
                {(["ALL", "EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => {
                  const count =
                    d === "ALL"
                      ? problems.length
                      : problems.filter((p) => p.difficulty === d).length;
                  const isActive = difficulty === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDifficulty(d);
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
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                <p className="text-sm text-slate-500">
                  {t("adminCodingProblem.loadingList", "Đang tải danh sách bài tập…")}
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
                {/* Result count when filtered */}
                {(query || difficulty !== "ALL") && (
                  <div className="mb-3 flex flex-none items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {t(
                        "common.showingFilteredResults",
                        "Hiển thị {{filtered}} / {{total}} kết quả",
                        {
                          filtered: filteredProblems.length,
                          total: problems.length,
                        }
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setDifficulty("ALL");
                      }}
                      className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                      {t("common.clearFilter", "Xóa bộ lọc")}
                    </button>
                  </div>
                )}
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <CodingProblemTable
                    problems={pageItems}
                    onEdit={(p) => {
                      setEditingProblem(p);
                      setIsAuthoring(true);
                    }}
                    onToggleStatus={handleToggleStatus}
                  />
                  {filteredProblems.length > 0 && (
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
