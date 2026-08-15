import { ActiveStatusButton, TruncatedScrollText } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CodingProblem } from "@/services/coding-problem.manager";
import { format } from "date-fns";
import { BookOpen, Circle, Clock, Cpu, Eye, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CodingProblemTableProps {
  problems: CodingProblem[];
  onEdit: (_problem: CodingProblem) => void;
  onDelete?: (_problem: CodingProblem) => void;
  onToggleStatus?: (_problem: CodingProblem, _isActive: boolean) => void;
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

function formatDate(s?: string) {
  if (!s) return null;
  try {
    return format(new Date(s), "dd/MM/yyyy");
  } catch {
    return null;
  }
}

export function CodingProblemTable({ problems, onEdit, onToggleStatus }: CodingProblemTableProps) {
  const { t } = useTranslation();

  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <BookOpen className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500">
          {t("adminCodingProblem.emptyList", "Chưa có bài tập coding nào.")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[1280px] table-fixed">
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              #ID
            </TableHead>
            <TableHead className="w-[25%] min-w-[280px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCodingProblem.columnProblem", "Bài tập")}
            </TableHead>
            <TableHead className="w-[120px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("general.difficulty", "Độ khó")}
            </TableHead>
            <TableHead className="w-[145px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCodingProblem.columnTestCases", "Test cases")}
            </TableHead>
            <TableHead className="w-[110px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCodingProblem.columnTime", "Thời gian")}
            </TableHead>
            <TableHead className="w-[110px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCodingProblem.columnMemory", "Bộ nhớ")}
            </TableHead>
            <TableHead className="w-[90px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCodingProblem.columnScore", "Điểm")}
            </TableHead>
            <TableHead className="w-[150px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status", "Trạng thái")}
            </TableHead>
            <TableHead className="w-[130px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.createdDate", "Ngày tạo")}
            </TableHead>
            <TableHead className="w-[130px] pr-6 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.updatedDate", "Cập nhật")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((p) => {
            const diff = DIFF_CONFIG[p.difficulty] ?? DIFF_CONFIG.MEDIUM;
            const totalPoints =
              p.hiddenTestCases?.reduce((s, tc) => s + (tc.weightPoints || 0), 0) ?? 0;
            const isActive = !p.isDeleted;

            return (
              <TableRow
                key={p.id}
                onClick={() => onEdit(p)}
                className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                  #{p.id}
                </TableCell>
                <TableCell className="min-w-[280px] px-4 py-4">
                  <TruncatedScrollText text={p.title} />
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${diff.cls}`}>
                    <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                    {diff.label}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400">
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span>
                        {p.hiddenTestCases?.length ?? 0} {t("adminCodingProblem.hiddenCount", "ẩn")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <Eye className="h-3.5 w-3.5" />
                      <span>
                        {p.visibleExamples?.length ?? 0}{" "}
                        {t("adminCodingProblem.sampleCount", "mẫu")}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{p.executionTimeLimitMs ?? 2000}ms</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>{p.memoryLimitMb ?? 256}M</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  <div className="inline-flex flex-col items-center justify-center">
                    <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                      {totalPoints}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <ActiveStatusButton
                    active={isActive}
                    onToggle={onToggleStatus ? () => onToggleStatus(p, !isActive) : undefined}
                  />
                </TableCell>
                <TableCell className="px-4 py-4">
                  {p.createdAt ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {formatDate(p.createdAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="py-4 pr-6">
                  {p.updatedAt ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {formatDate(p.updatedAt)}
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
