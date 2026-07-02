import type { CodeReviewProblem } from "@/services/code-review-problem.manager";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import {
  BookOpen,
  Circle,
  FileCode2,
  Bug,
  Edit2,
  Trash2,
} from "lucide-react";

interface CodeReviewProblemTableProps {
  problems: CodeReviewProblem[];
  onViewDetail: (problem: CodeReviewProblem) => void;
  onEdit: (problem: CodeReviewProblem) => void;
  onDelete?: (problem: CodeReviewProblem) => void;
  onToggleStatus?: (problem: CodeReviewProblem, isActive: boolean) => void;
}

const DIFF_CONFIG = {
  EASY: {
    label: "Easy",
    cls: "text-emerald-600 dark:text-emerald-400",
    fill: "fill-emerald-500 text-emerald-500",
  },
  MEDIUM: {
    label: "Medium",
    cls: "text-amber-600 dark:text-amber-400",
    fill: "fill-amber-500 text-amber-500",
  },
  HARD: {
    label: "Hard",
    cls: "text-rose-600 dark:text-rose-400",
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

export function CodeReviewProblemTable({ problems, onViewDetail, onEdit, onDelete, onToggleStatus }: CodeReviewProblemTableProps) {
  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-medium text-slate-500">Chưa có bài tập code review nào.</p>
      </div>
    );
  }

  // Column definitions (8 columns)
  // [ID, Title, Difficulty, Config, Status, Created, Updated, Actions]
  const GRID_COLS = "grid-cols-[60px_minmax(0,2fr)_110px_minmax(180px,1fr)_90px_130px_130px_80px]";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      {/* Table header */}
      <div className={`grid ${GRID_COLS} items-center border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50`}>
        {["ID", "Bài tập", "Độ khó", "Cấu hình", "Bật/Tắt", "Ngày tạo", "Cập nhật", ""].map((h, i) => (
          <div key={i} className={`text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 
            ${i === 4 ? "text-center" : ""} 
            ${i === 7 ? "text-right" : ""}`}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {problems.map((p) => {
          const diff = DIFF_CONFIG[p.difficulty || "MEDIUM"] ?? DIFF_CONFIG.MEDIUM;
          const isActive = p.isDeleted === false || p.isDeleted === undefined;
          
          return (
            <div
              key={p.id}
              onClick={() => onViewDetail(p)}
              className={`group grid ${GRID_COLS} items-center px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer ${
                !isActive ? "opacity-60 grayscale-[30%]" : ""
              }`}>
              {/* ID */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">#{p.id}</span>
              </div>

              {/* Title + metadata */}
              <div className="min-w-0 pr-6">
                <p className="truncate text-[14px] font-semibold text-slate-900 dark:text-slate-100" title={p.title}>
                  {p.title}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {p.language || "N/A"}
                  </span>
                </div>
              </div>

              {/* Difficulty */}
              <div className="pr-4">
                <div className={`flex items-center gap-1.5 text-[13px] font-bold ${diff.cls}`}>
                  <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                  {diff.label}
                </div>
              </div>

              {/* Config (Files + Issues) */}
              <div className="space-y-2 pr-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <FileCode2 className="h-3.5 w-3.5" />
                    <span>{p.files?.length ?? 0} file</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-rose-500">
                    <Bug className="h-3.5 w-3.5" />
                    <span>{p.expectedIssues?.length ?? 0} lỗi</span>
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex justify-center pr-2" onClick={(e) => e.stopPropagation()}>
                {onToggleStatus ? (
                  <Switch
                    checked={isActive}
                    onCheckedChange={(val) => onToggleStatus(p, val)}
                    className="data-[state=checked]:bg-emerald-500 shadow-sm"
                  />
                ) : (
                  <span className={`text-xs font-semibold ${isActive ? "text-emerald-500" : "text-slate-400"}`}>
                    {isActive ? "Bật" : "Tắt"}
                  </span>
                )}
              </div>

              {/* Created At */}
              <div className="flex items-center pr-2">
                {p.createdAt ? (
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {formatDate(p.createdAt)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>

              {/* Updated At */}
              <div className="flex items-center pr-2">
                {p.updatedAt ? (
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {formatDate(p.updatedAt)}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(p)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-400">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(p)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/40 dark:hover:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
