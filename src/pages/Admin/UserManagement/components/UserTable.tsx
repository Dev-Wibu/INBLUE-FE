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
      return "bg-purple-600 hover:bg-purple-600";
    case "STAFF":
      return "bg-blue-600 hover:bg-blue-600";
    case "MENTOR":
      return "bg-orange-500 hover:bg-orange-500";
    default:
      return "bg-gray-500 hover:bg-gray-500";
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
        <p className="text-sm font-medium text-slate-500">
          {t("adminUsermanagement.noUsersFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
            <TableHead className="w-24 font-medium text-slate-500">{t("common.role")}</TableHead>
            <TableHead className="w-32 font-medium text-slate-500">
              {t("adminUsermanagement.joinedDate")}
            </TableHead>
            <TableHead className="w-32 font-medium text-slate-500">
              {t("adminUsermanagement.lastUpdated")}
            </TableHead>
            <TableHead className="w-24 pr-6 font-medium text-slate-500">
              {t("common.status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              onClick={() => onViewDetail(user)}
              className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
              <TableCell className="py-4 pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
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
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-[14px] border border-slate-100 dark:border-slate-800/80">
                    <AvatarImage src={user.avatarUrl} alt={user.name} className="object-cover" />
                    <AvatarFallback className="rounded-[14px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground py-4">{user.email}</TableCell>
              <TableCell className="py-4">
                <Badge variant="default" className={`text-white ${getRoleBadgeClass(user.role)}`}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground py-4 text-sm">
                {(user as Record<string, unknown>).createdAt ||
                (user as Record<string, unknown>).created_at
                  ? formatDate(
                      ((user as Record<string, unknown>).createdAt ||
                        (user as Record<string, unknown>).created_at) as string
                    )
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground py-4 text-sm">
                {(user as Record<string, unknown>).updatedAt ||
                (user as Record<string, unknown>).updated_at
                  ? formatDate(
                      ((user as Record<string, unknown>).updatedAt ||
                        (user as Record<string, unknown>).updated_at) as string
                    )
                  : "—"}
              </TableCell>
              <TableCell className="py-4 pr-6">
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
