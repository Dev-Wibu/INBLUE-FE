import { Button } from "@/components/ui/button";
import type { CodingProblem } from "@/services/coding-problem.manager";
import { Clock, Code2, Cpu, Edit2, PlayCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CodingProblemGridProps {
  problems: CodingProblem[];
  onEdit: (problem: CodingProblem) => void;
  onDelete?: (problem: CodingProblem) => void;
}

export function CodingProblemGrid({ problems, onEdit, onDelete }: CodingProblemGridProps) {
  const { t } = useTranslation();

  const stripMarkdown = (text: string) => {
    if (!text) return "";
    return text.replace(/```\w*\n/g, "").replace(/```/g, "").trim();
  };

  if (problems.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20">
        <Code2 className="mb-3 h-10 w-10 text-slate-400" />
        <p className="text-sm font-medium text-slate-500">
          Chưa có bài tập coding nào.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {problems.map((p) => (
        <div
          key={p.id}
          className="group relative flex h-[260px] flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-900/80">
          
          {/* Minimalist Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                  #{p.id}
                </span>
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                  p.difficulty === "EASY"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : p.difficulty === "MEDIUM"
                      ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                      : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    {p.difficulty}
                  </span>
                </div>
              </div>
              <h3 className="line-clamp-1 font-bold text-slate-900 dark:text-slate-100" title={p.title}>
                {p.title}
              </h3>
            </div>
          </div>

          {/* Body Statement */}
          <p className="flex-1 line-clamp-3 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
            {stripMarkdown(p.problemStatement || "Chưa có đề bài")}
          </p>

          {/* Footer Stats */}
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {p.executionTimeLimitMs || 1000}ms
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Cpu className="h-3.5 w-3.5" />
              {p.memoryLimitMb || 256}MB
            </div>
            {p.hiddenTestCases && (
              <div className="ml-auto flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                <PlayCircle className="h-3.5 w-3.5" />
                {p.hiddenTestCases.length} Tests
              </div>
            )}
          </div>

          {/* Hover-only Actions */}
          <div className="absolute right-4 top-4 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onEdit(p)}
              className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/90 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-400">
              <Edit2 className="h-4 w-4" />
            </Button>
            {onDelete && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onDelete(p)}
                className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800/90 dark:hover:bg-rose-900/50 dark:hover:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
