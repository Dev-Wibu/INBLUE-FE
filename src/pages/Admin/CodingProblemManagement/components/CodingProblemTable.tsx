import type { CodingProblem } from "@/services/coding-problem.manager";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Edit2,
  Eye,
  FlaskConical,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";

interface CodingProblemTableProps {
  problems: CodingProblem[];
  onEdit: (problem: CodingProblem) => void;
  onDelete?: (problem: CodingProblem) => void;
}

const DIFF_CONFIG = {
  EASY: {
    label: "Easy",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/60",
    bar: "bg-emerald-500",
    barW: "w-1/3",
  },
  MEDIUM: {
    label: "Medium",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/60",
    bar: "bg-amber-500",
    barW: "w-2/3",
  },
  HARD: {
    label: "Hard",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/60",
    bar: "bg-rose-500",
    barW: "w-full",
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

function timeAgo(s?: string) {
  if (!s) return null;
  try {
    return formatDistanceToNow(new Date(s), { addSuffix: true, locale: vi });
  } catch {
    return null;
  }
}

export function CodingProblemTable({ problems, onEdit, onDelete }: CodingProblemTableProps) {
  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-medium text-slate-500">Chưa có bài tập coding nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_120px_180px_140px_140px_100px] items-center border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        {["ID", "Bài tập", "Độ khó", "Tests & Limits", "Ngày tạo", "Cập nhật", ""].map((h, i) => (
          <div key={i} className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 ${i === 6 ? "text-right" : ""}`}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {problems.map((p) => {
          const diff = DIFF_CONFIG[p.difficulty] ?? DIFF_CONFIG.MEDIUM;
          const totalPoints = p.hiddenTestCases?.reduce((s, tc) => s + (tc.weightPoints || 0), 0) ?? 0;
          const langs = p.codeStubs ? Object.keys(p.codeStubs) : [];
          const isDeleted = !!p.isDeleted;

          return (
            <div
              key={p.id}
              className={`group grid grid-cols-[56px_1fr_120px_180px_140px_140px_100px] items-center px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                isDeleted ? "opacity-50" : ""
              }`}>
              {/* ID */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">#{p.id}</span>
              </div>

              {/* Title + metadata */}
              <div className="min-w-0 space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  {isDeleted ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
                    {p.title}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Param types */}
                  {p.paramTypes && p.paramTypes.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Code2 className="h-3 w-3" />
                      {p.paramTypes.slice(0, 2).join(", ")}
                      {p.returnType && <span className="text-slate-400"> → {p.returnType}</span>}
                    </span>
                  )}
                  {/* Languages */}
                  {langs.length > 0 && (
                    <div className="flex items-center gap-1">
                      {langs.slice(0, 4).map((l) => (
                        <span key={l} className="rounded bg-slate-100 px-1 py-px font-mono text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {l}
                        </span>
                      ))}
                      {langs.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{langs.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Difficulty */}
              <div className="pr-4">
                <div className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold ${diff.cls}`}>
                  <div className={`h-1.5 w-8 rounded-full bg-slate-200 overflow-hidden dark:bg-slate-700`}>
                    <div className={`h-full rounded-full ${diff.bar} ${diff.barW}`} />
                  </div>
                  {diff.label}
                </div>
              </div>

              {/* Tests + Limits */}
              <div className="space-y-1.5 pr-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>{p.hiddenTestCases?.length ?? 0} hidden</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{p.visibleExamples?.length ?? 0} visible</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span>{p.executionTimeLimitMs ?? 2000}ms</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Cpu className="h-3 w-3" />
                    <span>{p.memoryLimitMb ?? 256}MB</span>
                  </div>
                  {totalPoints > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {totalPoints}đ
                    </span>
                  )}
                </div>
              </div>

              {/* Created At */}
              <div className="space-y-0.5 pr-4">
                {p.createdAt ? (
                  <>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(p.createdAt)}
                    </p>
                    <p className="text-[10px] text-slate-400">{timeAgo(p.createdAt)}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>

              {/* Updated At */}
              <div className="space-y-0.5 pr-4">
                {p.updatedAt ? (
                  <>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(p.updatedAt)}
                    </p>
                    <p className="text-[10px] text-slate-400">{timeAgo(p.updatedAt)}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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

      {/* Footer summary */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/30">
        <p className="text-[11px] text-slate-500">
          <strong className="text-slate-700 dark:text-slate-300">{problems.length}</strong> bài tập
          {" · "}
          <strong className="text-emerald-600 dark:text-emerald-400">
            {problems.filter((p) => !p.isDeleted).length}
          </strong>{" "}
          đang hoạt động
          {problems.some((p) => p.isDeleted) && (
            <>
              {" · "}
              <strong className="text-rose-500">{problems.filter((p) => p.isDeleted).length}</strong> đã xoá
            </>
          )}
        </p>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <RefreshCw className="h-3 w-3" />
          Cập nhật tự động khi lưu
        </div>
      </div>
    </div>
  );
}
