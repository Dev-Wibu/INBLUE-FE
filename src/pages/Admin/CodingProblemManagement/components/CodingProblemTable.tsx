import { Button } from "@/components/ui/button";
import type { CodingProblem } from "@/services/coding-problem.manager";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Clock, Cpu, Edit2, PlayCircle, Trash2 } from "lucide-react";

interface CodingProblemTableProps {
  problems: CodingProblem[];
  onEdit: (problem: CodingProblem) => void;
  onDelete?: (problem: CodingProblem) => void;
}

export function CodingProblemTable({ problems, onEdit, onDelete }: CodingProblemTableProps) {
  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20">
        <p className="text-sm font-medium text-slate-500">
          Chưa có bài tập coding nào.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-950/50">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Trạng thái / ID</th>
              <th className="px-6 py-4 font-medium">Tiêu đề (Title)</th>
              <th className="px-6 py-4 font-medium">Limits</th>
              <th className="px-6 py-4 font-medium">Tests</th>
              <th className="px-6 py-4 font-medium">Ngày tạo</th>
              <th className="px-6 py-4 text-right font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {problems.map((p) => (
              <tr
                key={p.id}
                className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      #{p.id}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{p.title}</h3>
                    <div
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${
                        p.difficulty === "EASY"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : p.difficulty === "MEDIUM"
                            ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                            : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                      }`}>
                      {p.difficulty}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" /> {p.executionTimeLimitMs || 1000}ms
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Cpu className="h-3.5 w-3.5" /> {p.memoryLimitMb || 256}MB
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      <PlayCircle className="h-4 w-4" />
                      {p.hiddenTestCases?.length || 0} Hidden
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <PlayCircle className="h-3.5 w-3.5 opacity-50" />
                      {p.visibleExamples?.length || 0} Visible
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    {p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi }) : "N/A"}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(p)}
                      className="h-8 w-8 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(p)}
                        className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/50 dark:hover:text-rose-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
