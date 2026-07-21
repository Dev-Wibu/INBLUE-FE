import { Switch } from "@/components/ui/switch";
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

interface CodingProblemTableProps {
  problems: CodingProblem[];
  onEdit: (problem: CodingProblem) => void;
  onDelete?: (problem: CodingProblem) => void;
  onToggleStatus?: (problem: CodingProblem, isActive: boolean) => void;
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

export function CodingProblemTable({ problems, onEdit, onToggleStatus }: CodingProblemTableProps) {
  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <BookOpen className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500">Chưa có bài tập coding nào.</p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-[80px] pl-6 font-medium text-slate-500">ID</TableHead>
            <TableHead className="min-w-[400px] font-medium text-slate-500">Bài tập</TableHead>
            <TableHead className="w-[110px] font-medium text-slate-500">Độ khó</TableHead>
            <TableHead className="w-[120px] font-medium text-slate-500">Test cases</TableHead>
            <TableHead className="w-[100px] font-medium text-slate-500">Thời gian</TableHead>
            <TableHead className="w-[100px] font-medium text-slate-500">Bộ nhớ</TableHead>
            <TableHead className="w-[90px] text-center font-medium text-slate-500">Điểm</TableHead>
            <TableHead className="w-[90px] text-center font-medium text-slate-500">
              Bật/Tắt
            </TableHead>
            <TableHead className="w-[130px] font-medium text-slate-500">Ngày tạo</TableHead>
            <TableHead className="w-[130px] pr-6 font-medium text-slate-500">Cập nhật</TableHead>
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
                className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{p.id}
                </TableCell>
                <TableCell>
                  <div className="max-w-[800px]">
                    <p
                      className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                      title={p.title}>
                      {p.title}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${diff.cls}`}>
                    <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                    {diff.label}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-400">
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span>{p.hiddenTestCases?.length ?? 0} ẩn</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{p.visibleExamples?.length ?? 0} mẫu</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{p.executionTimeLimitMs ?? 2000}ms</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <Cpu className="h-3.5 w-3.5" />
                    <span>{p.memoryLimitMb ?? 256}M</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex flex-col items-center justify-center">
                    <span className="font-mono text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                      {totalPoints}
                    </span>
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
                      className={`text-[11px] font-bold ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
                      {isActive ? "BẬT" : "TẮT"}
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
