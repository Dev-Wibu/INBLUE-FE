import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Circle, Edit3, MoreHorizontal, Search } from "lucide-react";
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
    return found?.categoryName || t("adminQuestionbankmanagement.uncategorized", "Chưa phân loại");
  };

  if (questions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 border-y border-dashed border-slate-200 bg-white py-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <Search className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t(
              "common.noData",
              t("adminQuestionbankmanagement.noDataFound", "Chưa có dữ liệu câu hỏi")
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              "adminQuestionbankmanagement.startAddQuestionHelp",
              "Hãy bắt đầu bằng cách thêm một câu hỏi mới vào ngân hàng."
            )}
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
            <TableHead className="min-w-[280px] font-medium text-slate-500">
              {t("adminQuestionbankmanagement.questionContent", "Nội dung câu hỏi")}
            </TableHead>
            <TableHead className="w-[160px] font-medium text-slate-500">
              {t("general.category", "Danh mục")}
            </TableHead>
            <TableHead className="w-[120px] font-medium text-slate-500">
              {t("general.difficulty", "Độ khó")}
            </TableHead>
            <TableHead className="w-[100px] text-center font-medium text-slate-500">
              {t("adminCodingProblem.columnToggle", "Bật/Tắt")}
            </TableHead>
            <TableHead className="w-[140px] font-medium text-slate-500">
              {t("common.createdDate", "Ngày tạo")}
            </TableHead>
            <TableHead className="w-[80px] pr-6 text-right font-medium text-slate-500">
              Thao tác
            </TableHead>
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

                <TableCell className="max-w-md">
                  <p
                    className="truncate text-sm font-bold text-slate-900 dark:text-slate-100"
                    title={q.questionText}>
                    {q.questionText ||
                      t("adminQuestionbankmanagement.noContent", "Chưa có nội dung")}
                  </p>
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
                      disabled={!isActive}
                      onCheckedChange={(val) => onToggleStatus(q, val)}
                      className="shadow-sm data-[state=checked]:bg-emerald-500"
                    />
                  ) : (
                    <span
                      className={`text-xs font-semibold ${isActive ? "text-emerald-600" : "text-slate-500"}`}>
                      {isActive ? t("common.active", "Bật") : t("common.inactive", "Tắt")}
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

                <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem
                        onClick={() => onEdit(q)}
                        className="cursor-pointer gap-2 text-xs font-medium">
                        <Edit3 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
