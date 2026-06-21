import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractDataArray } from "@/lib/utils";
import { questionCategoryManager } from "@/services/question-category.manager";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { QuestionCategory } from "../types";

export function QuestionBankCategoryTab() {
  const [categories, setCategories] = useState<QuestionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuestionCategory | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await questionCategoryManager.getAll();
      if (res.success) {
        setCategories(extractDataArray(res));
      }
    } catch {
      toast.error("Không thể tải danh sách chuyên mục");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setNameInput("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (cat: QuestionCategory) => {
    setEditingCategory(cat);
    setNameInput(cat.categoryName || "");
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (cat: QuestionCategory) => {
    setEditingCategory(cat);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!nameInput.trim()) {
      toast.error("Vui lòng nhập tên chuyên mục");
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingCategory?.id) {
        const res = await questionCategoryManager.update(editingCategory.id, {
          categoryName: nameInput.trim(),
        });
        if (res.success) {
          toast.success("Cập nhật thành công");
          setIsDialogOpen(false);
          fetchCategories();
        } else {
          toast.error(res.error || "Cập nhật thất bại");
        }
      } else {
        const res = await questionCategoryManager.create({
          categoryName: nameInput.trim(),
        });
        if (res.success) {
          toast.success("Thêm mới thành công");
          setIsDialogOpen(false);
          fetchCategories();
        } else {
          toast.error(res.error || "Thêm mới thất bại");
        }
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingCategory?.id) return;
    setIsSubmitting(true);
    try {
      const res = await questionCategoryManager.delete(editingCategory.id);
      if (res.success) {
        toast.success("Xóa thành công");
        setIsDeleteDialogOpen(false);
        fetchCategories();
      } else {
        toast.error(res.error || "Xóa thất bại");
      }
    } catch {
      toast.error("Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleOpenCreate} className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          Thêm chuyên mục
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {categories.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <Search className="h-12 w-12 text-gray-400" />
              <p className="font-['Inter'] text-lg text-gray-500">Không tìm thấy dữ liệu</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Tên chuyên mục</TableHead>
                  <TableHead className="w-24 text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.id}</TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                      {cat.categoryName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(cat)}
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(cat)}
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Cập nhật chuyên mục" : "Thêm chuyên mục mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên chuyên mục</label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Nhập tên chuyên mục..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xóa chuyên mục</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xóa chuyên mục <strong>{editingCategory?.categoryName}</strong>?
              Hành động này không thể hoàn tác.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
