import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Circle, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { QuestionBank, QuestionCategory } from "../types";

interface QuestionBankTableProps {
  questions: QuestionBank[];
  categories?: QuestionCategory[];
  onEdit: (_question: QuestionBank) => void;
  onToggleStatus?: (problem: QuestionBank, isActive: boolean) => void;
}

const DIFF_CONFIG = {
  EASY: {
    label: "Easy",
    cls: "text-emerald-700 dark:text-emerald-400",
    fill: "fill-emerald-500 text-emerald-500",
  },
  MEDIUM: {
    label: "Medium",
    cls: "text-amber-700 dark:text-amber-400",
    fill: "fill-amber-500 text-amber-500",
  },
  HARD: {
    label: "Hard",
    cls: "text-rose-700 dark:text-rose-400",
    fill: "fill-rose-500 text-rose-500",
  },
} as const;

function formatDate(s?: string | Date) {
  if (!s) return null;
  try {
    return format(new Date(s), "dd/MM/yyyy HH:mm");
  } catch {
    return null;
  }
}

export function QuestionBankTable({
  questions,
  categories = [],
  onEdit,
  onToggleStatus,
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
            <TableHead className="w-[80px] pl-6 font-medium text-slate-500">ID</TableHead>
            <TableHead className="min-w-[400px] font-medium text-slate-500">
              Nội dung câu hỏi
            </TableHead>
            <TableHead className="w-[150px] font-medium text-slate-500">Danh mục</TableHead>
            <TableHead className="w-[110px] font-medium text-slate-500">Độ khó</TableHead>
            <TableHead className="w-[100px] text-center font-medium text-slate-500">
              Bật/Tắt
            </TableHead>
            <TableHead className="w-[130px] font-medium text-slate-500">Ngày tạo</TableHead>
            <TableHead className="w-[130px] pr-6 font-medium text-slate-500">Cập nhật</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((q) => {
            const diff = DIFF_CONFIG[q.questionLevel || "MEDIUM"] ?? DIFF_CONFIG.MEDIUM;
            const isActive =
              (q as unknown as { isDeleted?: boolean }).isDeleted === false ||
              (q as unknown as { isDeleted?: boolean }).isDeleted === undefined;
            return (
              <TableRow
                key={q.id}
                onClick={() => onEdit(q)}
                className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{q.id}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[800px] items-center">
                    <p
                      className="flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                      title={q.questionText}>
                      {q.questionText || "Chưa có nội dung"}
                    </p>
                    {/* Dummy element to force exactly identical row height as Coding table */}
                    <div
                      className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                      aria-hidden="true">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-3.5 w-3.5"></span>
                        <span>ẩn</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-3.5 w-3.5"></span>
                        <span>mẫu</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {getCategoryName(q)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${diff.cls}`}>
                    <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                    {diff.label}
                  </div>
                </TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  {onToggleStatus ? (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(val) => onToggleStatus(q, val)}
                      className="shadow-sm data-[state=checked]:bg-emerald-500"
                    />
                  ) : (
                    <span
                      className={`text-xs font-semibold ${isActive ? "text-emerald-600" : "text-slate-500"}`}>
                      {isActive ? "Bật" : "Tắt"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(q as any).createdAt ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {formatDate((q as any).createdAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-6">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(q as any).updatedAt ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {formatDate((q as any).updatedAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
