import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import type { ApiResponse } from "@/interfaces";
import { cn, extractDataArray } from "@/lib/utils";
import { questionBankManager } from "@/services/question-bank.manager";
import { questionCategoryManager } from "@/services/question-category.manager";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DeleteQuestionBankDialog } from "./components/DeleteQuestionBankDialog";
import { QuestionBankCategoryTab } from "./components/QuestionBankCategoryTab";
import { QuestionBankEditor } from "./components/QuestionBankEditor";
import { QuestionBankTable } from "./components/QuestionBankTable";
import type { QuestionBank, QuestionCategory } from "./types";

export function QuestionBankManagementPage() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("questions");
  const [questions, setQuestions] = useState<QuestionBank[]>([]);
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Category Drill-down State (matching Company Management drill-down behavior)
  const [selectedCategoryForDrilldown, setSelectedCategoryForDrilldown] =
    useState<QuestionCategory | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_questionbankmanagement_questionbankmanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let list = [...questions];

    // If drilling down into a category
    if (selectedCategoryForDrilldown) {
      list = list.filter((item) => {
        const anyQ = item as unknown as {
          questionCategoryId?: number | string;
          categoryId?: number | string;
        };
        const catId = item.questionCategory?.id ?? anyQ.questionCategoryId ?? anyQ.categoryId;
        return String(catId) === String(selectedCategoryForDrilldown.id);
      });
    } else if (selectedCategory !== "ALL") {
      list = list.filter((item) => {
        const anyQ = item as unknown as {
          questionCategoryId?: number | string;
          categoryId?: number | string;
        };
        const catId = item.questionCategory?.id ?? anyQ.questionCategoryId ?? anyQ.categoryId;
        return String(catId) === selectedCategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) => item.questionText?.toLowerCase().includes(q) || item.id?.toString().includes(q)
      );
    }

    if (selectedDifficulty !== "ALL") {
      list = list.filter((item) => item.questionLevel === selectedDifficulty);
    }

    return list;
  }, [questions, selectedCategoryForDrilldown, selectedCategory, searchQuery, selectedDifficulty]);

  const pagination = usePagination({
    totalCount: filteredQuestions.length,
    pageSize: pageSize,
  });

  const pageItems = useMemo(() => {
    return filteredQuestions.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [filteredQuestions, pagination.startIndex, pagination.endIndex]);

  // Form State
  const [isAuthoring, setIsAuthoring] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBank | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    if (selectedCategoryForDrilldown) {
      const catQuestions = questions.filter((q) => {
        const anyQ = q as unknown as {
          questionCategoryId?: number | string;
          categoryId?: number | string;
        };
        const catId = q.questionCategory?.id ?? anyQ.questionCategoryId ?? anyQ.categoryId;
        return String(catId) === String(selectedCategoryForDrilldown.id);
      });
      const activeCount = catQuestions.filter(
        (q) =>
          (q as unknown as { isDeleted?: boolean }).isDeleted === false ||
          (q as unknown as { isDeleted?: boolean }).isDeleted === undefined
      ).length;
      return { total: catQuestions.length, activeCount, categoryCount: 1 };
    }

    const total = questions.length;
    const activeCount = questions.filter(
      (q) =>
        (q as unknown as { isDeleted?: boolean }).isDeleted === false ||
        (q as unknown as { isDeleted?: boolean }).isDeleted === undefined
    ).length;
    const categoryCount = new Set(
      questions
        .map((q) => {
          const anyQ = q as unknown as {
            questionCategoryId?: number;
            questionCategory?: { id?: number };
            category?: { id?: number };
          };
          return String(
            anyQ.questionCategoryId ?? q.questionCategory?.id ?? anyQ.category?.id ?? ""
          );
        })
        .filter(Boolean)
    ).size;
    return { total, activeCount, categoryCount };
  }, [questions, selectedCategoryForDrilldown]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [banksRes, catRes] = await Promise.all([
        questionBankManager.getAll(),
        questionCategoryManager.getAll(),
      ]);
      if (banksRes.success && banksRes.data) {
        setQuestions(banksRes.data);
      }
      if (catRes.success && catRes.data) {
        setCategories(extractDataArray(catRes as unknown as ApiResponse<QuestionCategory[]>));
      }
    } catch (error) {
      console.error(error);
      toast.error(t("common.unableToDownloadData"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setIsAuthoring(true);
  };

  const handleCreateCategory = async (categoryName: string) => {
    try {
      const res = await questionCategoryManager.create({ categoryName });
      if (res.success) {
        toast.success(t("category.addSuccess2"));
        fetchData();
        return res.data?.id;
      } else {
        toast.error(res.error || t("compCodingSubmissionModal.errorOccurred"));
      }
    } catch {
      toast.error(t("error.systemError"));
    }
  };

  const handleEdit = (q: QuestionBank) => {
    setEditingQuestion(q);
    setIsAuthoring(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editingQuestion?.id) return;

    try {
      const res = await questionBankManager.delete(editingQuestion.id);
      if (res.success) {
        toast.success(t("question.deleted"));
        setIsDeleteOpen(false);
        fetchData();
      } else {
        toast.error(res.error || t("compCodingSubmissionModal.errorOccurred"));
      }
    } catch {
      toast.error(t("error.systemError"));
    }
  };

  const handleToggleStatus = async (question: QuestionBank, isActive: boolean) => {
    if (!question.id) return;
    if (isActive) {
      // Re-activate: optimistic update + API call to flip isDeleted=false
      const previousState = (question as unknown as { isDeleted?: boolean }).isDeleted;
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === question.id ? ({ ...q, isDeleted: false } as unknown as QuestionBank) : q
        )
      );
      try {
        const res = await questionBankManager.update(question.id, { isDeleted: false });
        if (res.success) {
          toast.success(
            t("adminQuestionbankmanagement.reactivatedSuccess", "Đã kích hoạt lại câu hỏi")
          );
        } else {
          // Revert optimistic update on failure
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === question.id
                ? ({ ...q, isDeleted: previousState } as unknown as QuestionBank)
                : q
            )
          );
          toast.error(res.error || t("error.systemError"));
        }
      } catch {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === question.id
              ? ({ ...q, isDeleted: previousState } as unknown as QuestionBank)
              : q
          )
        );
        toast.error(t("error.systemError"));
      }
      return;
    }
    // Deactivate path: open soft-delete confirmation dialog
    setEditingQuestion(question);
    setIsDeleteOpen(true);
  };

  const isFilterActive =
    searchQuery.trim() !== "" || selectedDifficulty !== "ALL" || selectedCategory !== "ALL";

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label="Đang tải ngân hàng câu hỏi..." />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
            {/* Main Top Header Card (100% matching Company Management Page drill-down layout) */}
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                {selectedCategoryForDrilldown ? (
                  <div className="flex items-start gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedCategoryForDrilldown(null)}
                      className="mt-0.5 h-9 w-9 shrink-0 rounded-xl border-slate-200 hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                      <ArrowLeft className="h-4.5 w-4.5" />
                    </Button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryForDrilldown(null)}
                          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                          {t(
                            "adminQuestionbankmanagement.categoryManagement",
                            "Quản lý chuyên mục"
                          )}
                        </button>
                        <span className="text-xs font-medium text-slate-400">/</span>
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {selectedCategoryForDrilldown.categoryName}
                        </span>
                      </div>
                      <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                        Danh sách câu hỏi phỏng vấn thuộc chuyên mục{" "}
                        {selectedCategoryForDrilldown.categoryName}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {t("adminQuestionbankmanagement.title", "Ngân hàng câu hỏi")}
                    </h2>
                    <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                      {t(
                        "adminQuestionbankmanagement.subtitle",
                        "Quản lý danh sách câu hỏi trắc nghiệm và chuyên mục phỏng vấn"
                      )}
                    </p>
                  </div>
                )}

                {/* Stats Counters */}
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [stats.total, t("adminQuestionbankmanagement.totalQuestions", "Tổng câu hỏi")],
                    [stats.activeCount, t("common.active", "Đang hoạt động")],
                    [
                      stats.categoryCount,
                      t("adminQuestionbankmanagement.categoryCount", "Chuyên mục"),
                    ],
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

              {/* Search & Control Row (Tabs + Search Bar + Action Button Inline - 100% matching Company Management) */}
              <form
                onSubmit={(e) => e.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Inline Tab Switcher Pills */}
                {!selectedCategoryForDrilldown && (
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-950/70">
                    <button
                      type="button"
                      onClick={() => setActiveTab("questions")}
                      className={`rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-all ${
                        activeTab === "questions"
                          ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}>
                      {t("adminQuestionbankmanagement.questionList", "Danh sách câu hỏi")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("categories")}
                      className={`rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-all ${
                        activeTab === "categories"
                          ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      }`}>
                      {t("adminQuestionbankmanagement.categoryManagement", "Quản lý chuyên mục")}
                    </button>
                  </div>
                )}

                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm theo nội dung, ID câu hỏi..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      pagination.goToFirstPage();
                    }}
                    className="h-[46px] w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                  />
                </div>

                <Button
                  type="submit"
                  className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  {t("common.search", "Tìm kiếm")}
                </Button>

                {activeTab === "questions" || selectedCategoryForDrilldown ? (
                  <Button
                    type="button"
                    onClick={handleCreate}
                    className="h-[46px] w-[165px] shrink-0 justify-center rounded-xl border border-indigo-600 bg-indigo-600 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="mr-1.5 h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">
                      {t("adminQuestionbankmanagement.addQuestion", "Thêm câu hỏi")}
                    </span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="h-[46px] w-[165px] shrink-0 justify-center rounded-xl border border-indigo-600 bg-indigo-600 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="mr-1.5 h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">
                      {t("adminQuestionbankmanagement.addCategory", "Thêm chuyên mục")}
                    </span>
                  </Button>
                )}
              </form>

              {/* Status & Filter Pills Row BELOW Search Bar */}
              {(activeTab === "questions" || selectedCategoryForDrilldown) && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="mr-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                    Mức độ:
                  </span>
                  {[
                    ["ALL", "Tất cả mức độ"],
                    ["EASY", "Dễ (Easy)"],
                    ["MEDIUM", "Trung bình"],
                    ["HARD", "Khó (Hard)"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setSelectedDifficulty(val);
                        pagination.goToFirstPage();
                      }}
                      className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                        selectedDifficulty === val
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}>
                      {label}
                    </button>
                  ))}

                  {!selectedCategoryForDrilldown && (
                    <>
                      <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-800" />
                      <span className="mr-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                        Chuyên mục:
                      </span>
                      <Select
                        value={selectedCategory}
                        onValueChange={(val) => {
                          setSelectedCategory(val);
                          pagination.goToFirstPage();
                        }}>
                        <SelectTrigger className="h-[36px] min-w-[170px] rounded-full border border-slate-200/90 bg-white text-[13.5px] font-medium shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                          <SelectValue placeholder="Tất cả chuyên mục" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ALL">Tất cả chuyên mục</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {isFilterActive && (
                    <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Hiển thị {pageItems.length}/{filteredQuestions.length} kết quả
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Table Container Card (Matching Company Management drill-down style) */}
            {activeTab === "questions" || selectedCategoryForDrilldown ? (
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <QuestionBankTable
                  questions={pageItems}
                  categories={categories}
                  onEdit={handleEdit}
                  onToggleStatus={handleToggleStatus}
                />
                {filteredQuestions.length > 0 && (
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
            ) : (
              <QuestionBankCategoryTab
                questions={questions}
                onSelectCategory={(cat) => setSelectedCategoryForDrilldown(cat)}
                isCreatingExternally={isCreatingCategory}
                onCancelCreateExternally={() => setIsCreatingCategory(false)}
                onCategoryUpdate={fetchData}
              />
            )}
          </div>
        )}
      </div>

      <DeleteQuestionBankDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        question={editingQuestion}
        onConfirm={handleDeleteConfirm}
      />

      {/* Editor Modal */}
      {isAuthoring && (
        <QuestionBankEditor
          initialData={
            editingQuestion ||
            (selectedCategoryForDrilldown
              ? ({ questionCategory: selectedCategoryForDrilldown } as QuestionBank)
              : null)
          }
          categories={categories}
          isOpen={isAuthoring}
          onOpenChange={setIsAuthoring}
          onCreateCategory={handleCreateCategory}
          onSaved={() => {
            setIsAuthoring(false);
            setEditingQuestion(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
