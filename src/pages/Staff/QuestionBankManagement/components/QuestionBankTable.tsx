import { ActiveStatusButton, TruncatedScrollText } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
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
  onToggleStatus?: (_problem: QuestionBank, _isActive: boolean) => void;
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
    return format(new Date(s), "dd/MM/yyyy");
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
    // Backend returns `questionCategory: { id, name }` (legacy shape) even
    // though the QuestionCategory service manager uses `categoryName`. Try
    // both so the table shows the category name in either case.
    const directName = q.questionCategory?.name ?? q.questionCategory?.categoryName;
    if (directName) return directName;
    const anyQ = q as unknown as {
      category?: { categoryName?: string; name?: string; id?: string };
      questionCategoryId?: string;
    };
    if (anyQ.category?.categoryName) return anyQ.category.categoryName;
    if (anyQ.category?.name) return anyQ.category.name;
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              #ID
            </TableHead>
            <TableHead className="min-w-[280px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminQuestionbankmanagement.questionContent", "Nội dung câu hỏi")}
            </TableHead>
            <TableHead className="w-[160px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("general.category", "Danh mục")}
            </TableHead>
            <TableHead className="w-[120px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("general.difficulty", "Độ khó")}
            </TableHead>
            <TableHead className="w-[140px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status", "Trạng thái")}
            </TableHead>
            <TableHead className="w-[140px] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
              {t("common.createdDate", "Ngày tạo")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {questions.map((q) => {
            const diff = DIFF_CONFIG[q.questionLevel || "MEDIUM"] ?? DIFF_CONFIG.MEDIUM;
            const isActive =
              (q as unknown as { isDeleted?: boolean }).isDeleted === false ||
              (q as unknown as { isDeleted?: boolean }).isDeleted === undefined;

            const textContent =
              q.questionText || t("adminQuestionbankmanagement.noContent", "Chưa có nội dung");

            return (
              <TableRow
                key={q.id}
                onClick={() => onEdit(q)}
                className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>#{q.id}</span>
                    <div className="invisible flex flex-col text-xs leading-tight font-medium opacity-0 select-none">
                      <span>&nbsp;</span>
                      <span className="text-[11px]">&nbsp;</span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="max-w-[500px] min-w-[280px] px-4 py-4">
                  <TruncatedScrollText text={textContent} />
                </TableCell>

                <TableCell className="w-[160px] px-4 py-4">
                  <Badge
                    variant="outline"
                    className="border-slate-200 bg-slate-100/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {getCategoryName(q)}
                  </Badge>
                </TableCell>

                <TableCell className="w-[120px] px-4 py-4">
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${diff.cls}`}>
                    <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                    {diff.label}
                  </div>
                </TableCell>

                <TableCell className="w-[160px] px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <ActiveStatusButton
                    active={isActive}
                    onToggle={onToggleStatus ? () => onToggleStatus(q, !isActive) : undefined}
                  />
                </TableCell>

                <TableCell className="w-[140px] py-4 pr-6 text-right text-sm font-medium text-slate-600 dark:text-slate-300">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(q as any).createdAt ? (
                    <span>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {formatDate((q as any).createdAt)}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
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
