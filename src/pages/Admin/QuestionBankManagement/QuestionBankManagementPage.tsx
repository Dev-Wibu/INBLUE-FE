import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import type { ApiResponse } from "@/interfaces";
import { extractDataArray } from "@/lib/utils";
import { questionBankManager } from "@/services/question-bank.manager";
import { questionCategoryManager } from "@/services/question-category.manager";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { DeleteQuestionBankDialog } from "./components/DeleteQuestionBankDialog";
import { QuestionBankCategoryTab } from "./components/QuestionBankCategoryTab";
import { QuestionBankFormDialog } from "./components/QuestionBankFormDialog";
import { QuestionBankTable } from "./components/QuestionBankTable";
import type { QuestionBank, QuestionBankFormData, QuestionCategory } from "./types";

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionBank | null>(null);
  const [formData, setFormData] = useState<Partial<QuestionBankFormData>>({});

  useEffect(() => {
    fetchData();
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
    setFormData({ options: ["", "", "", ""] });
    setIsFormOpen(true);
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
    setFormData({
      questionCategoryId: q.questionCategory?.id,
      questionLevel: q.questionLevel,
      questionText: q.questionText,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (q: QuestionBank) => {
    setEditingQuestion(q);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.questionCategoryId || !formData.questionLevel || !formData.questionText) {
      toast.error(t("question.enterAllFields"));
      return;
    }

    try {
      let res;
      if (editingQuestion?.id) {
        res = await questionBankManager.update(
          editingQuestion.id,
          formData as QuestionBankFormData
        );
      } else {
        res = await questionBankManager.create(formData as QuestionBankFormData);
      }

      if (res.success) {
        toast.success(editingQuestion ? t("general.updateSuccess") : t("general.addSuccess"));
        setIsFormOpen(false);
        fetchData();
      } else {
        toast.error(res.error || t("compCodingSubmissionModal.errorOccurred"));
      }
    } catch {
      toast.error(t("error.systemError"));
    }
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

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ngân hàng câu hỏi</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Quản lý danh sách câu hỏi trắc nghiệm và chuyên mục
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="h-8">
              <TabsTrigger value="questions" className="text-xs">
                {t("adminQuestionbankmanagement.questionList", "Danh sách câu hỏi")}
              </TabsTrigger>
              <TabsTrigger value="categories" className="text-xs">
                {t("adminQuestionbankmanagement.categoryManagement", "Quản lý chuyên mục")}
              </TabsTrigger>
            </TabsList>

            {activeTab === "questions" && (
              <>
                <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                <Button
                  onClick={handleCreate}
                  className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("adminQuestionbankmanagement.addQuestion", t("general.addNew"))}
                </Button>
              </>
            )}

            {activeTab === "categories" && (
              <>
                <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                <Button
                  onClick={() => setIsCreatingCategory(true)}
                  className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("adminQuestionbankmanagement.addCategory", "Thêm chuyên mục")}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950">
          <TabsContent value="questions" className="m-0">
            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500">Đang tải danh sách câu hỏi…</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <QuestionBankTable
                  questions={pageItems}
                  categories={categories}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                />
                {questions.length > 0 && (
                  <div className="flex items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
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
          </TabsContent>

          <TabsContent value="categories" className="m-0">
            <QuestionBankCategoryTab
              questions={questions}
              onEditQuestion={handleEdit}
              onDeleteQuestion={handleDeleteClick}
              isCreatingExternally={isCreatingCategory}
              onCancelCreateExternally={() => setIsCreatingCategory(false)}
            />
          </TabsContent>
        </div>

        <QuestionBankFormDialog
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          formData={formData}
          onFormChange={setFormData}
          onSubmit={handleFormSubmit}
          categories={categories}
          onCreateCategory={handleCreateCategory}
          title={
            editingQuestion ? t("question.updateQuestion") : t("adminQuizProblem.addNewQuestion")
          }
          description={
            editingQuestion ? t("question.editInfoInstructions") : t("question.createOrAi")
          }
          submitLabel={
            editingQuestion
              ? t("general.update", t("general.update"))
              : t("general.create", t("general.addNew"))
          }
        />

        <DeleteQuestionBankDialog
          isOpen={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          question={editingQuestion}
          onConfirm={handleDeleteConfirm}
        />
      </Tabs>
    </div>
  );
}
