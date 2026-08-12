import { SortButton, type SortDirection } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserRole, User as UserType } from "../types";

interface SortProps {
  direction: SortDirection;
  onChange: (direction: SortDirection) => void;
}

interface UserTableProps {
  users: UserType[];
  onDelete: (user: UserType) => void;
  onViewDetail: (user: UserType) => void;
  getSortProps?: (key: keyof UserType) => SortProps;
}

const getRoleBadgeClass = (role?: UserRole): string => {
  switch (role) {
    case "ADMIN":
      return "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:border-purple-500/35 dark:bg-purple-500/15 dark:text-purple-300";
    case "STAFF":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-300";
    case "MENTOR":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-slate-300";
  }
};

export function UserTable({ users, onDelete, onViewDetail, getSortProps }: UserTableProps) {
  const { t } = useTranslation();

  if (users.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("adminUsermanagement.noUsersFound")}
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
            <TableHead className="min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("name")}>{t("common.name")}</SortButton>
              ) : (
                t("common.name")
              )}
            </TableHead>
            <TableHead className="min-w-[220px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.email")}
            </TableHead>
            <TableHead className="w-[140px] min-w-[140px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.role")}
            </TableHead>
            <TableHead className="w-[170px] min-w-[170px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminUsermanagement.joinedDate")}
            </TableHead>
            <TableHead className="w-[170px] min-w-[170px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminUsermanagement.lastUpdated")}
            </TableHead>
            <TableHead className="w-[120px] min-w-[120px] pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              onClick={() => onViewDetail(user)}
              className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
              <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span>#{user.id}</span>
                  {/* Dummy element to force row height alignment */}
                  <div
                    className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                    aria-hidden="true">
                    <div className="h-3.5 w-3.5"></div>
                    <div className="h-3.5 w-3.5"></div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-100 dark:border-slate-800">
                    <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />
                    <AvatarFallback className="rounded-[14px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="px-4 py-4 font-medium text-slate-700 dark:text-slate-200">
                {user.email}
              </TableCell>
              <TableCell className="px-5 py-4">
                <Badge
                  variant="outline"
                  className={`font-semibold ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                {(user as Record<string, unknown>).createdAt ||
                (user as Record<string, unknown>).created_at
                  ? formatDate(
                      ((user as Record<string, unknown>).createdAt ||
                        (user as Record<string, unknown>).created_at) as string
                    )
                  : "—"}
              </TableCell>
              <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                {(user as Record<string, unknown>).updatedAt ||
                (user as Record<string, unknown>).updated_at
                  ? formatDate(
                      ((user as Record<string, unknown>).updatedAt ||
                        (user as Record<string, unknown>).updated_at) as string
                    )
                  : "—"}
              </TableCell>
              <TableCell className="py-4 pr-6 text-center">
                <Switch
                  className="data-[state=checked]:bg-emerald-500"
                  checked={user.isActive !== false}
                  onCheckedChange={() => onDelete(user)}
                  aria-label="Toggle user status"
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
