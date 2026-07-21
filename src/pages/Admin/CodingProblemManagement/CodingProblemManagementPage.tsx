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
        toast.error(res.error || "Không thể cập nhật trạng thái");
        // Revert on failure
        setProblems((prev) =>
          prev.map((p) => (p.id === problem.id ? { ...p, isDeleted: problem.isDeleted } : p))
        );
      } else {
        toast.success(`Đã ${isActive ? "bật" : "tắt"} bài tập`);
      }
    } catch {
      toast.error("Lỗi xảy ra khi cập nhật trạng thái");
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
        <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
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
        <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
          {/* HEADER SECTION */}
          <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Vòng Coding</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Quản lý danh sách bài tập lập trình thuật toán
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm bài tập..."
                  className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
                />
              </div>

              <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
              <div className="flex items-center gap-1">
                {(["ALL", "EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => {
                  const count =
                    d === "ALL"
                      ? problems.length
                      : problems.filter((p) => p.difficulty === d).length;
                  const isActive = difficulty === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
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
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
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
                  onClick={() => fetchProblems(true)}
                  disabled={isRefreshing}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>

                <Button
                  onClick={() => {
                    setEditingProblem(null);
                    setIsAuthoring(true);
                  }}
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
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                <p className="text-sm text-slate-500">Đang tải danh sách bài tập…</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
                {/* Result count when filtered */}
                {(query || difficulty !== "ALL") && (
                  <div className="mb-3 flex flex-none items-center gap-2 px-6 pt-4">
                    <span className="text-xs text-slate-500">
                      Hiển thị{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {filteredProblems.length}
                      </strong>{" "}
                      / <strong>{problems.length}</strong> kết quả
                    </span>
                    <button
                      onClick={() => {
                        setQuery("");
                        setDifficulty("ALL");
                      }}
                      className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
                <div className="flex-1 overflow-auto">
                  <CodingProblemTable
                    problems={pageItems}
                    onEdit={(p) => {
                      setEditingProblem(p);
                      setIsAuthoring(true);
                    }}
                    onToggleStatus={handleToggleStatus}
                  />
                </div>
                {filteredProblems.length > 0 && (
                  <div className="flex flex-none items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                    <PaginationControl
                      pagination={pagination}
                      onPageSizeChange={(nextPageSize) => {
                        setPageSize(nextPageSize);
                        pagination.goToFirstPage();
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
