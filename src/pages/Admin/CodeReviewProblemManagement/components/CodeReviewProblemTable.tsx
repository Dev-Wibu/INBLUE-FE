import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CodeReviewProblem } from "@/services/code-review-problem.manager";
import { format } from "date-fns";
import { BookOpen, Bug, Circle, FileCode2 } from "lucide-react";

interface CodeReviewProblemTableProps {
  problems: CodeReviewProblem[];
  onViewDetail: (problem: CodeReviewProblem) => void;
  onToggleStatus?: (problem: CodeReviewProblem, isActive: boolean) => void;
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
    return format(new Date(s), "dd/MM/yyyy HH:mm");
  } catch {
    return null;
  }
}

export function CodeReviewProblemTable({
  problems,
  onViewDetail,
  onToggleStatus,
}: CodeReviewProblemTableProps) {
  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <BookOpen className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500">Chưa có bài tập code review nào.</p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-[80px] pl-6 font-medium text-slate-500">ID</TableHead>
            <TableHead className="min-w-[200px] font-medium text-slate-500">Bài tập</TableHead>
            <TableHead className="w-[120px] font-medium text-slate-500">Ngôn ngữ</TableHead>
            <TableHead className="w-[110px] font-medium text-slate-500">Độ khó</TableHead>
            <TableHead className="w-[180px] font-medium text-slate-500">Cấu hình</TableHead>
            <TableHead className="w-[100px] text-center font-medium text-slate-500">
              Bật/Tắt
            </TableHead>
            <TableHead className="w-[130px] font-medium text-slate-500">Ngày tạo</TableHead>
            <TableHead className="w-[130px] pr-6 font-medium text-slate-500">Cập nhật</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((p) => {
            const diff = DIFF_CONFIG[p.difficulty || "MEDIUM"] ?? DIFF_CONFIG.MEDIUM;
            const isActive = p.isDeleted === false || p.isDeleted === undefined;

            return (
              <TableRow
                key={p.id}
                onClick={() => onViewDetail(p)}
                className={`group h-[68px] cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{p.id}
                </TableCell>
                <TableCell>
                  <p
                    className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                    title={p.title}>
                    {p.title}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {p.language || "N/A"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${diff.cls}`}>
                    <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                    {diff.label}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                      <FileCode2 className="h-4 w-4" />
                      <span>{p.files?.length ?? 0} file</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                      <Bug className="h-4 w-4" />
                      <span>{p.expectedIssues?.length ?? 0} lỗi</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  {onToggleStatus ? (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(val) => onToggleStatus(p, val)}
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
                  {p.createdAt ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {formatDate(p.createdAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="pr-6">
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
