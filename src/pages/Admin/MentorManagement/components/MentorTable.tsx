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
import { Search } from "lucide-react";
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
        <p className="text-sm font-medium text-slate-500">
          {t("adminMentormanagement.noMentorsFound")}
        </p>
      </div>
    );
  }
  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-[80px] pl-6 font-medium text-slate-500">
              {t("common.id")}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
              ) : (
                t("common.name")
              )}
            </TableHead>
            <TableHead className="font-medium text-slate-500">{t("common.email")}</TableHead>
            <TableHead className="font-medium text-slate-500">{t("common.expertise")}</TableHead>
            <TableHead className="w-24 pr-6 font-medium text-slate-500">
              {t("common.status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mentors.map((mentor) => (
            <TableRow
              key={mentor.id}
              onClick={() => onViewDetail(mentor)}
              className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
              <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                #{mentor.id}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={mentor.avatarUrl}
                      alt={mentor.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {mentor.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{mentor.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{mentor.email}</TableCell>
              <TableCell className="max-w-xs truncate">{mentor.expertise || "-"}</TableCell>
              <TableCell className="pr-6">
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
