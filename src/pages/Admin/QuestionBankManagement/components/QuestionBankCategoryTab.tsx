import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { extractDataArray } from "@/lib/utils";
import { questionCategoryManager } from "@/services/question-category.manager";
import { Edit2, Folder, FolderPlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { QuestionBank, QuestionCategory } from "../types";

interface QuestionBankCategoryTabProps {
  questions?: QuestionBank[];
  onSelectCategory: (cat: QuestionCategory) => void;
  isCreatingExternally?: boolean;
  onCancelCreateExternally?: () => void;
  onCategoryUpdate?: () => void;
}

export function QuestionBankCategoryTab({
  questions = [],
  onSelectCategory,
  isCreatingExternally,
  onCancelCreateExternally,
  onCategoryUpdate,
}: QuestionBankCategoryTabProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Inline Edit states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Create state
  const [isCreating, setIsCreating] = useState(false);
  const [createValue, setCreateValue] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<QuestionCategory | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    if (isCreatingExternally !== undefined) {
      setIsCreating(isCreatingExternally);
      if (isCreatingExternally) setCreateValue("");
    }
  }, [isCreatingExternally]);

  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await questionCategoryManager.getAll();
      if (res.success) {
        setCategories(extractDataArray(res));
      }
    } catch {
      toast.error(t("category.loadListFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEdit = (cat: QuestionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cat.id!);
    setEditValue(cat.categoryName || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editValue.trim()) {
      handleCancelEdit();
      return;
    }

    const currentCat = categories.find((c) => c.id === editingId);
    if (currentCat?.categoryName === editValue.trim()) {
      handleCancelEdit();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await questionCategoryManager.update(editingId, {
        categoryName: editValue.trim(),
      });
      if (res.success) {
        toast.success(t("general.updateSuccess"));
        handleCancelEdit();
        fetchCategories();
        onCategoryUpdate?.();
      } else {
        toast.error(res.error || t("general.updateFailed"));
      }
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setCreateValue("");
    onCancelCreateExternally?.();
  };

  const handleSaveCreate = async () => {
    if (!createValue.trim()) {
      handleCancelCreate();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await questionCategoryManager.create({
        categoryName: createValue.trim(),
      });
      if (res.success) {
        toast.success(t("general.addSuccess"));
        handleCancelCreate();
        fetchCategories();
        onCategoryUpdate?.();
      } else {
        toast.error(res.error || t("general.addFailed"));
      }
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (cat: QuestionCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCategory(cat);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory?.id) return;
    setIsSubmitting(true);
    try {
      const res = await questionCategoryManager.delete(deletingCategory.id);
      if (res.success) {
        toast.success(t("general.deleteSuccess"));
        setIsDeleteDialogOpen(false);
        fetchCategories();
        onCategoryUpdate?.();
      } else {
        toast.error(res.error || t("general.deleteFailed"));
      }
    } catch {
      toast.error(t("compCodingSubmissionModal.errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    if (e.key === "Escape") handleCancelEdit();
  };

  const onCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveCreate();
    if (e.key === "Escape") handleCancelCreate();
  };

  const handleCardClick = (cat: QuestionCategory) => {
    if (editingId === cat.id) return;
    onSelectCategory(cat);
  };

  return (
    <div className="animate-in fade-in slide-in-from-left-4 flex flex-col space-y-4 duration-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Danh sách chuyên mục ({categories.length})
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Ghost Card for Creating */}
          {isCreating && (
            <div className="group relative flex h-[110px] flex-col justify-between overflow-hidden rounded-2xl border border-indigo-300 bg-indigo-50/60 p-4 shadow-sm ring-4 ring-indigo-500/10 dark:border-indigo-800 dark:bg-indigo-950/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  <FolderPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <Input
                    ref={createInputRef}
                    value={createValue}
                    onChange={(e) => setCreateValue(e.target.value)}
                    onKeyDown={onCreateKeyDown}
                    onBlur={handleSaveCreate}
                    disabled={isSubmitting}
                    placeholder="Nhập tên chuyên mục..."
                    className="h-8 border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-900 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actual Category Cards */}
          {categories.map((cat) => {
            const count = questions.filter((q) => {
              const anyQ = q as unknown as { questionCategoryId?: number; categoryId?: number };
              const catId = q.questionCategory?.id ?? anyQ.questionCategoryId ?? anyQ.categoryId;
              return catId === cat.id;
            }).length;

            return (
              <div
                key={cat.id}
                onClick={() => handleCardClick(cat)}
                className={`group relative flex h-[110px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
                  editingId === cat.id
                    ? "border-indigo-500 ring-4 ring-indigo-500/10 dark:border-indigo-500"
                    : "border-slate-200/90 hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-900"
                }`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Folder className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1 overflow-hidden pt-0.5">
                    {editingId === cat.id ? (
                      <Input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={onEditKeyDown}
                        onBlur={handleSaveEdit}
                        disabled={isSubmitting}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 border-slate-200 bg-white px-2 text-xs font-bold text-slate-900 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    ) : (
                      <h3
                        onClick={(e) => handleStartEdit(cat, e)}
                        className="truncate text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400"
                        title={cat.categoryName}>
                        {cat.categoryName}
                      </h3>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {count} câu hỏi
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                {editingId !== cat.id && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleStartEdit(cat, e)}
                      className="h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleOpenDelete(cat, e)}
                      className="h-7 w-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {categories.length === 0 && !isCreating && (
            <div className="col-span-full flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Folder className="mb-2 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("adminQuestionbankmanagement.noDataFound", "Chưa có chuyên mục nào")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              {t("adminQuestionbankmanagement.deleteCategory", "Xóa chuyên mục")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t(
                "adminQuestionbankmanagement.areYouSureDeleteCategory",
                "Bạn có chắc chắn muốn xóa chuyên mục"
              )}{" "}
              <strong className="text-slate-900 dark:text-white">
                {deletingCategory?.categoryName}
              </strong>
              ?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? t("common.deleting", "Đang xóa...") : t("common.delete", "Xóa")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
