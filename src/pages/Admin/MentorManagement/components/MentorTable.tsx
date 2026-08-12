import { SortButton, type SortDirection } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/formatting";
import { Search, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Mentor } from "../types";

interface SortProps {
  direction: SortDirection;
  onChange: (direction: SortDirection) => void;
}
interface MentorTableProps {
  mentors: Mentor[];
  onViewDetail: (mentor: Mentor) => void;
  onToggleActive: (mentor: Mentor) => void;
  getSortProps?: (key: keyof Mentor) => SortProps;
}

export function MentorTable({
  mentors,
  onViewDetail,
  onToggleActive,
  getSortProps,
}: MentorTableProps) {
  const { t } = useTranslation();

  if (mentors.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("adminMentormanagement.noMentorsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.id")}
            </TableHead>
            <TableHead className="min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
              ) : (
                t("common.name")
              )}
            </TableHead>
            <TableHead className="min-w-[160px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.expertise")}
            </TableHead>
            <TableHead className="w-[140px] min-w-[140px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminMentormanagement.experience")}
            </TableHead>
            <TableHead className="w-[120px] min-w-[120px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminMentormanagement.rating")}
            </TableHead>
            <TableHead className="w-[170px] min-w-[170px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminMentormanagement.joinedDate")}
            </TableHead>
            <TableHead className="w-[170px] min-w-[170px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminMentormanagement.lastUpdated")}
            </TableHead>
            <TableHead className="w-[120px] min-w-[120px] pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mentors.map((mentor) => (
            <TableRow
              key={mentor.id}
              onClick={() => onViewDetail(mentor)}
              className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
              <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span>#{mentor.id}</span>
                  {/* Dummy element to force row height alignment */}
                  <div
                    className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                    aria-hidden="true">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-3.5 w-3.5"></span>
                      <span>dummy</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="h-3.5 w-3.5"></span>
                      <span>sample</span>
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-100 dark:border-slate-800">
                    <AvatarImage src={mentor.avatarUrl} alt={mentor.name} />
                    <AvatarFallback className="rounded-[14px] bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                      {mentor.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {mentor.name}
                    </div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {mentor.email}
                    </div>
                  </div>
                </div>
              </TableCell>

              <TableCell className="px-4 py-4 text-xs font-medium text-slate-700 dark:text-slate-200">
                {mentor.expertise || "—"}
              </TableCell>

              <TableCell className="px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-200">
                {mentor.yearsOfExperience
                  ? `${mentor.yearsOfExperience} ${t("common.yearCount")}`
                  : "—"}
              </TableCell>

              <TableCell className="px-5 py-4">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-500 dark:text-amber-400">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  {mentor.averageRating || mentor.rate || "0"}
                </div>
              </TableCell>

              <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                {(mentor as Record<string, unknown>).createdAt ||
                (mentor as Record<string, unknown>).created_at
                  ? formatDate(
                      ((mentor as Record<string, unknown>).createdAt ||
                        (mentor as Record<string, unknown>).created_at) as string
                    )
                  : "—"}
              </TableCell>

              <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                {(mentor as Record<string, unknown>).updatedAt ||
                (mentor as Record<string, unknown>).updated_at
                  ? formatDate(
                      ((mentor as Record<string, unknown>).updatedAt ||
                        (mentor as Record<string, unknown>).updated_at) as string
                    )
                  : "—"}
              </TableCell>

              <TableCell className="py-4 pr-6 text-center">
                <Switch
                  className="data-[state=checked]:bg-emerald-500"
                  checked={mentor.active !== false}
                  onCheckedChange={() => onToggleActive(mentor)}
                  aria-label="Toggle mentor status"
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
