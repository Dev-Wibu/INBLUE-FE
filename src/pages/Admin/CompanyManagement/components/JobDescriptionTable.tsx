import { SortButton, type SortDirection } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { getJobDescriptionLevelBadge } from "@/lib/status-utils";
import { Briefcase, Calendar, Clock, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JobDescription } from "../types";

type JobDescriptionSortKey =
  | "idSortValue"
  | "titleSortValue"
  | "levelSortValue"
  | "statusSortValue"
  | "salaryMinSortValue"
  | "deadlineSortValue"
  | "updatedAtSortValue";

interface SortProps {
  direction: SortDirection;
  onChange: (direction: SortDirection) => void;
}

interface JobDescriptionTableProps {
  jobDescriptions: JobDescription[];
  onToggleStatus?: (job: JobDescription, nextStatus: "OPEN" | "CLOSED") => void;
  onView?: (job: JobDescription) => void;
  getSortProps?: (key: JobDescriptionSortKey) => SortProps;
  showCompany?: boolean;
}

export function JobDescriptionTable({
  jobDescriptions,
  onToggleStatus,
  onView,
  getSortProps,
  showCompany,
}: JobDescriptionTableProps) {
  const { t } = useTranslation();

  if (!jobDescriptions.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Briefcase className="h-6 w-6 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {t("adminCompanymanagement.noJdYet", "Chưa có JD nào")}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("common.tryAdjustingYourSearch", "Thử thay đổi từ khóa tìm kiếm")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-20 pl-6 font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("idSortValue")}>{t("common.id", "ID")}</SortButton>
              ) : (
                t("common.id", "ID")
              )}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("titleSortValue")}>{t("common.title")}</SortButton>
              ) : (
                t("common.title")
              )}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("levelSortValue")}>{t("common.level")}</SortButton>
              ) : (
                t("common.level")
              )}
            </TableHead>
            {showCompany && (
              <TableHead className="font-medium text-slate-500">
                {t("adminCompanymanagement.companyName", "Công ty")}
              </TableHead>
            )}
            <TableHead className="font-medium text-slate-500">
              {t("adminCompanymanagement.rounds", "Số vòng thi")}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {t("adminCompanymanagement.totalApplications", "Lượt ứng tuyển")}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("updatedAtSortValue")}>
                  {t("adminCompanymanagement.deadline")}
                </SortButton>
              ) : (
                t("adminCompanymanagement.deadline")
              )}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {t("common.createdAt", "Ngày tạo")}
            </TableHead>
            <TableHead className="w-28 pr-6 text-right font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("statusSortValue")}>{t("common.status")}</SortButton>
              ) : (
                t("common.status")
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobDescriptions.map((job) => {
            const isClosed = job.status === "CLOSED";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const compName = (job as any).companyName || (job as any).company?.name || "—";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const compLogo = (job as any).companyLogoUrl || (job as any).company?.logoUrl || (job as any).companyLogo || (job as any).logoUrl;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const appCount = (job as any).applicationCount ?? (job as any).statistics?.totalApplications ?? (job as any).totalApplications ?? (job as any).applicationsCount ?? job.applications?.length ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const createdDate = (job as any).createdAt || (job as any).createdDate || (job as any).createdAtDate;

            return (
              <TableRow
                key={job.id}
                onClick={() => onView?.(job)}
                className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  isClosed ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{job.id}
                </TableCell>
                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                  {job.title || "—"}
                </TableCell>
                <TableCell>
                  {job.level ? <StatusBadge {...getJobDescriptionLevelBadge(job.level)} /> : "—"}
                </TableCell>
                {showCompany && (
                  <TableCell className="text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border border-slate-200 shadow-2xs dark:border-slate-800">
                        <AvatarImage src={compLogo} alt={compName} />
                        <AvatarFallback className="bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                          {compName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{compName}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {job.rounds?.length || 0} vòng
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Users className="h-3 w-3 text-indigo-500" />
                    {appCount} lượt
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>{formatDate(job.deadlineAt)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    <span>{formatDate(createdDate)}</span>
                  </div>
                </TableCell>
                <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={job.status === "OPEN"}
                    onCheckedChange={(checked) =>
                      onToggleStatus?.(job, checked ? "OPEN" : "CLOSED")
                    }
                    className="shadow-sm data-[state=checked]:bg-emerald-500"
                    aria-label={`Toggle status for ${job.title || job.id}`}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
