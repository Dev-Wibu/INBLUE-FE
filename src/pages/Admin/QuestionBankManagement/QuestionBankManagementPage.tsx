import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import type { ApiResponse } from "@/interfaces";
import { cn, extractDataArray } from "@/lib/utils";
import { questionBankManager } from "@/services/question-bank.manager";
import { questionCategoryManager } from "@/services/question-category.manager";
import { Plus } from "lucide-react";
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

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_questionbankmanagement_questionbankmanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({
    totalCount: questions.length,
    pageSize: pageSize,
  });

  const pageItems = questions.slice(pagination.startIndex, pagination.endIndex + 1);

  // Form State
  const [isAuthoring, setIsAuthoring] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBank | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const total = questions.length;
    const activeCount = questions.filter((q) => q.isActive !== false).length;
    const categoryCount = new Set(questions.map((q) => String(q.categoryId ?? "")).filter(Boolean))
      .size;
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

  return (
    <div
      className={cn(
        "-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950"
      )}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col gap-0 overflow-hidden">
        <div className="m-4 mb-0 sm:m-6 sm:mb-0 lg:m-8 lg:mb-0">
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminQuestionbankmanagement.title", "Ngân hàng câu hỏi")}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t(
                    "adminQuestionbankmanagement.subtitle",
                    "Quản lý danh sách câu hỏi trắc nghiệm và chuyên mục"
                  )}
                </p>
              </div>
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

            {/* Tabs + Create row (inside the same header card) */}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="h-9 bg-slate-100 p-0.5 dark:bg-slate-800/60">
                <TabsTrigger value="questions" className="text-xs">
                  {t("adminQuestionbankmanagement.questionList", "Danh sách câu hỏi")}
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-xs">
                  {t("adminQuestionbankmanagement.categoryManagement", "Quản lý chuyên mục")}
                </TabsTrigger>
              </TabsList>

              {activeTab === "questions" && (
                <Button
                  onClick={handleCreate}
                  className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Plus className="mr-2 h-[18px] w-[18px]" />
                  {t("adminQuestionbankmanagement.addQuestion", t("general.addNew"))}
                </Button>
              )}

              {activeTab === "categories" && (
                <Button
                  onClick={() => setIsCreatingCategory(true)}
                  className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Plus className="mr-2 h-[18px] w-[18px]" />
                  {t("adminQuestionbankmanagement.addCategory", "Thêm chuyên mục")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <TabsContent value="questions" className="m-0 flex h-full flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500">{t("common.loading", "Đang tải…")}</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 pt-6 duration-300 sm:p-6 sm:pt-6 md:px-8 dark:bg-slate-950">
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <QuestionBankTable
                    questions={pageItems}
                    categories={categories}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                  />
                  {questions.length > 0 && (
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
          </TabsContent>

          <TabsContent value="categories" className="m-0 flex h-full flex-col overflow-hidden">
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 pt-6 duration-300 sm:p-6 sm:pt-6 md:px-8 dark:bg-slate-950">
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
