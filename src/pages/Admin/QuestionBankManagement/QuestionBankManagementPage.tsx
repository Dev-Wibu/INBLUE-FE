import { PaginationControl, ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import type { ApiResponse } from "@/interfaces";
import { cn, extractDataArray } from "@/lib/utils";
import { questionBankManager } from "@/services/question-bank.manager";
import { questionCategoryManager } from "@/services/question-category.manager";
import { Plus, Search, Sparkles } from "lucide-react";
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
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) => item.questionText?.toLowerCase().includes(q) || item.id?.toString().includes(q)
      );
    }
    if (selectedDifficulty !== "ALL") {
      list = list.filter((item) => item.questionLevel === selectedDifficulty);
    }
    if (selectedCategory !== "ALL") {
      list = list.filter((item) => {
        const anyQ = item as unknown as {
          questionCategoryId?: number | string;
          categoryId?: number | string;
        };
        const catId = item.questionCategory?.id ?? anyQ.questionCategoryId ?? anyQ.categoryId;
        return String(catId) === selectedCategory;
      });
    }
    return list;
  }, [questions, searchQuery, selectedDifficulty, selectedCategory]);

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
  }, [questions]);

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

  const handleToggleStatus = (question: QuestionBank, isActive: boolean) => {
    if (!question.id) return;
    if (!isActive) {
      setEditingQuestion(question);
      setIsDeleteOpen(true);
    }
  };

  const isFilterActive =
    searchQuery.trim() !== "" || selectedDifficulty !== "ALL" || selectedCategory !== "ALL";

  return (
    <div
      className={cn(
        "-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950"
      )}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col gap-0">
        {/* Single Top Header Card */}
        <div className="m-4 mb-0 sm:m-6 sm:mb-0 lg:m-8 lg:mb-0">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("adminQuestionbankmanagement.title", "Ngân hàng câu hỏi")}
                  </h2>
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t(
                    "adminQuestionbankmanagement.subtitle",
                    "Quản lý danh sách câu hỏi trắc nghiệm và chuyên mục phỏng vấn"
                  )}
                </p>
              </div>

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
                      <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-indigo-400">
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

            {/* Tabs + Actions Row */}
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <TabsList className="h-10 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
                <TabsTrigger value="questions" className="rounded-lg px-4 text-xs font-semibold">
                  {t("adminQuestionbankmanagement.questionList", "Danh sách câu hỏi")}
                </TabsTrigger>
                <TabsTrigger value="categories" className="rounded-lg px-4 text-xs font-semibold">
                  {t("adminQuestionbankmanagement.categoryManagement", "Quản lý chuyên mục")}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3">
                <ReloadButton onClick={fetchData} loading={isLoading} />
                {activeTab === "questions" && (
                  <Button
                    onClick={handleCreate}
                    className="h-10 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t("adminQuestionbankmanagement.addQuestion", "Thêm câu hỏi mới")}
                  </Button>
                )}

                {activeTab === "categories" && (
                  <Button
                    onClick={() => setIsCreatingCategory(true)}
                    className="h-10 rounded-xl bg-indigo-600 px-5 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t("adminQuestionbankmanagement.addCategory", "Thêm chuyên mục")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="flex flex-1 flex-col bg-slate-50 dark:bg-slate-950">
          <TabsContent value="questions" className="m-0 flex h-full flex-col">
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col p-4 pt-4 duration-300 sm:p-6 lg:p-8">
              {/* Filter Controls Bar */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  {/* Search Input */}
                  <div className="relative max-w-sm min-w-[240px] flex-1">
                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Tìm theo nội dung, ID câu hỏi..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        pagination.goToFirstPage();
                      }}
                      className="h-9.5 rounded-xl border-slate-200 bg-white pl-8.5 text-xs dark:border-slate-800 dark:bg-slate-900"
                    />
                  </div>

                  {/* Difficulty Filter */}
                  <Select
                    value={selectedDifficulty}
                    onValueChange={(val) => {
                      setSelectedDifficulty(val);
                      pagination.goToFirstPage();
                    }}>
                    <SelectTrigger className="h-9.5 w-[140px] rounded-xl border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900">
                      <SelectValue placeholder="Mức độ" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ALL" className="text-xs">
                        Tất cả mức độ
                      </SelectItem>
                      <SelectItem value="EASY" className="text-xs text-emerald-600">
                        Dễ (Easy)
                      </SelectItem>
                      <SelectItem value="MEDIUM" className="text-xs text-amber-600">
                        Trung bình (Medium)
                      </SelectItem>
                      <SelectItem value="HARD" className="text-xs text-rose-600">
                        Khó (Hard)
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select
                    value={selectedCategory}
                    onValueChange={(val) => {
                      setSelectedCategory(val);
                      pagination.goToFirstPage();
                    }}>
                    <SelectTrigger className="h-9.5 w-[160px] rounded-xl border-slate-200 bg-white text-xs dark:border-slate-800 dark:bg-slate-900">
                      <SelectValue placeholder="Chuyên mục" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="ALL" className="text-xs">
                        Tất cả chuyên mục
                      </SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)} className="text-xs">
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filter Result Count Notice */}
              {isFilterActive && (
                <div className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Hiển thị {pageItems.length}/{filteredQuestions.length} kết quả
                </div>
              )}

              {/* Questions Table */}
              {isLoading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  <p className="text-xs font-medium text-slate-500">
                    {t("common.loading", "Đang tải câu hỏi...")}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <QuestionBankTable
                    questions={pageItems}
                    categories={categories}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                  />

                  {filteredQuestions.length > 0 && (
                    <div className="flex items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
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
              )}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="m-0 flex h-full flex-col">
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col p-4 pt-4 duration-300 sm:p-6 lg:p-8">
              <QuestionBankCategoryTab
                questions={questions}
                onEditQuestion={handleEdit}
                isCreatingExternally={isCreatingCategory}
                onCancelCreateExternally={() => setIsCreatingCategory(false)}
              />
            </div>
          </TabsContent>
        </div>

        <DeleteQuestionBankDialog
          isOpen={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          question={editingQuestion}
          onConfirm={handleDeleteConfirm}
        />
      </Tabs>

      {/* Editor Modal */}
      {isAuthoring && (
        <QuestionBankEditor
          initialData={editingQuestion}
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
