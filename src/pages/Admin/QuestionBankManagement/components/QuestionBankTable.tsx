import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { QuestionBank, QuestionCategory } from "../types";

interface QuestionBankTableProps {
  questions: QuestionBank[];
  categories?: QuestionCategory[];
  onEdit: (_question: QuestionBank) => void;
  onDelete: (_question: QuestionBank) => void;
}

export function QuestionBankTable({
  questions,
  categories = [],
  onEdit,
  onDelete,
}: QuestionBankTableProps) {
  const { t } = useTranslation();

  const getCategoryName = (q: QuestionBank) => {
    if (q.questionCategory?.categoryName) return q.questionCategory.categoryName;
    const anyQ = q as unknown as {
      category?: { categoryName?: string; id?: string };
      questionCategoryId?: string;
    };
    if (anyQ.category?.categoryName) return anyQ.category.categoryName;
    const id = anyQ.questionCategoryId || q.questionCategory?.id || anyQ.category?.id;
    const found = categories.find((c) => c.id === id);
    return found?.categoryName || "Chưa phân loại";
  };

  if (questions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {t("common.noData", t("adminQuestionbankmanagement.noDataFound"))}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Hãy bắt đầu bằng cách thêm một câu hỏi mới vào ngân hàng.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-[80px] font-medium text-slate-500">ID</TableHead>
            <TableHead className="min-w-[300px] font-medium text-slate-500">
              Nội dung câu hỏi
            </TableHead>
            <TableHead className="w-[150px] font-medium text-slate-500">Danh mục</TableHead>
            <TableHead className="w-[120px] font-medium text-slate-500">Độ khó</TableHead>
            <TableHead className="w-[80px] text-right font-medium text-slate-500"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((q) => (
            <TableRow
              key={q.id}
              className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
              <TableCell className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                #{q.id}
              </TableCell>
              <TableCell className="max-w-[400px]">
                <p className="line-clamp-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {q.questionText || "Chưa có nội dung"}
                </p>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {getCategoryName(q)}
                </span>
              </TableCell>
              <TableCell>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                    q.questionLevel === "EASY"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : q.questionLevel === "MEDIUM"
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                  }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    {q.questionLevel}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                      <span className="sr-only">Mở menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onEdit(q)} className="cursor-pointer gap-2">
                      <Edit className="h-4 w-4 text-slate-500" />
                      <span>{t("general.edit")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(q)}
                      className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 dark:text-rose-500 dark:focus:text-rose-400">
                      <Trash2 className="h-4 w-4" />
                      <span>{t("general.delete")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
