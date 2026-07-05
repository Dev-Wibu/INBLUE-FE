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
import type { CodingProblem } from "@/services/coding-problem.manager";
import { format } from "date-fns";
import {
  BookOpen,
  Circle,
  Clock,
  Code2,
  Cpu,
  Edit2,
  Eye,
  FlaskConical,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";

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

export function CodingProblemTable({
  problems,
  onEdit,
  onDelete,
  onToggleStatus,
}: CodingProblemTableProps) {
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
            <TableHead className="w-[80px] font-medium text-slate-500">ID</TableHead>
            <TableHead className="min-w-[200px] font-medium text-slate-500">Bài tập</TableHead>
            <TableHead className="w-[110px] font-medium text-slate-500">Độ khó</TableHead>
            <TableHead className="w-[180px] font-medium text-slate-500">Cấu hình</TableHead>
            <TableHead className="w-[90px] text-center font-medium text-slate-500">Điểm</TableHead>
            <TableHead className="w-[90px] text-center font-medium text-slate-500">
              Bật/Tắt
            </TableHead>
            <TableHead className="w-[130px] font-medium text-slate-500">Ngày tạo</TableHead>
            <TableHead className="w-[130px] font-medium text-slate-500">Cập nhật</TableHead>
            <TableHead className="w-[80px] text-right font-medium text-slate-500"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((p) => {
            const diff = DIFF_CONFIG[p.difficulty] ?? DIFF_CONFIG.MEDIUM;
            const totalPoints =
              p.hiddenTestCases?.reduce((s, tc) => s + (tc.weightPoints || 0), 0) ?? 0;
            const langs = p.codeStubs ? Object.keys(p.codeStubs) : [];
            const isActive = !p.isDeleted;

            return (
              <TableRow
                key={p.id}
                className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  !isActive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{p.id}
                </TableCell>
                <TableCell>
                  <p
                    className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
                    title={p.title}>
                    {p.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {/* Param types */}
                    {p.paramTypes && p.paramTypes.length > 0 && (
                      <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Code2 className="h-3.5 w-3.5" />
                        {p.paramTypes.slice(0, 2).join(", ")}
                        {p.paramTypes.length > 2 && "..."}
                        {p.returnType && <span className="text-slate-400"> → {p.returnType}</span>}
                      </span>
                    )}
                    {/* Languages */}
                    {langs.length > 0 && (
                      <div className="flex items-center gap-1">
                        {langs.slice(0, 3).map((l) => (
                          <span
                            key={l}
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {l}
                          </span>
                        ))}
                        {langs.length > 3 && (
                          <span className="text-[11px] text-slate-400">+{langs.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1.5 text-xs font-bold ${diff.cls}`}>
                    <Circle className={`h-2.5 w-2.5 ${diff.fill}`} />
                    {diff.label}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                        <FlaskConical className="h-3.5 w-3.5" />
                        <span>{p.hiddenTestCases?.length ?? 0} ẩn</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{p.visibleExamples?.length ?? 0} mẫu</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{p.executionTimeLimitMs ?? 2000}ms</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <Cpu className="h-3 w-3" />
                        <span>{p.memoryLimitMb ?? 256}M</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="mx-auto flex min-w-[56px] flex-col items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <span className="font-mono text-base leading-none font-bold text-emerald-700 dark:text-emerald-400">
                      {totalPoints}
                    </span>
                    <span className="mt-1 text-[10px] font-semibold text-emerald-700/80 uppercase dark:text-emerald-400/80">
                      PTS
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
                <TableCell>
                  {p.updatedAt ? (
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {formatDate(p.updatedAt)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onEdit(p)} className="cursor-pointer gap-2">
                        <Edit2 className="h-4 w-4 text-slate-500" />
                        <span>Chỉnh sửa</span>
                      </DropdownMenuItem>
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => onDelete(p)}
                          className="cursor-pointer gap-2 text-rose-600 focus:text-rose-700 dark:text-rose-500 dark:focus:text-rose-400">
                          <Trash2 className="h-4 w-4" />
                          <span>Xoá</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {/* Footer summary */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500">
          <strong className="font-semibold text-slate-700 dark:text-slate-300">
            {problems.length}
          </strong>{" "}
          bài tập {" · "}
          <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
            {problems.filter((p) => !p.isDeleted).length}
          </strong>{" "}
          đang hoạt động
          {problems.some((p) => p.isDeleted) && (
            <>
              {" · "}
              <strong className="font-medium text-slate-400">
                {problems.filter((p) => p.isDeleted).length} đã tắt
              </strong>
            </>
          )}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <RefreshCw className="h-3.5 w-3.5" />
          Cập nhật tự động khi lưu
        </div>
      </div>
    </div>
  );
}
