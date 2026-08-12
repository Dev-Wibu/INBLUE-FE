/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Briefcase, Calendar, Clock, MapPin, Users } from "lucide-react";
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
  onToggleStatus?: (job: JobDescription) => void;
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
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("idSortValue")}>{t("common.id", "ID")}</SortButton>
              ) : (
                t("common.id", "ID")
              )}
            </TableHead>
            <TableHead className="min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("titleSortValue")}>{t("common.title")}</SortButton>
              ) : (
                t("common.title")
              )}
            </TableHead>
            <TableHead className="w-[120px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("levelSortValue")}>{t("common.level")}</SortButton>
              ) : (
                t("common.level")
              )}
            </TableHead>
            {showCompany && (
              <TableHead className="min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                {t("adminCompanymanagement.companyName", "Công ty")}
              </TableHead>
            )}
            <TableHead className="w-[160px] min-w-[160px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.location", "Địa điểm")}
            </TableHead>
            <TableHead className="w-[120px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.rounds", "Số vòng thi")}
            </TableHead>
            <TableHead className="w-[150px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.totalApplications", "Lượt ứng tuyển")}
            </TableHead>
            <TableHead className="w-[150px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("updatedAtSortValue")}>
                  {t("adminCompanymanagement.deadline")}
                </SortButton>
              ) : (
                t("adminCompanymanagement.deadline")
              )}
            </TableHead>
            <TableHead className="w-[150px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.createdAt", "Ngày tạo")}
            </TableHead>
            <TableHead className="w-[110px] pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
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
            const compName = (job as any).companyName || (job as any).company?.name || "—";
            const compLogo =
              (job as any).companyLogoUrl ||
              (job as any).company?.logoUrl ||
              (job as any).companyLogo ||
              (job as any).logoUrl;
            const appCount =
              (job as any).applicationCount ??
              (job as any).statistics?.totalApplications ??
              (job as any).totalApplications ??
              (job as any).applicationsCount ??
              0;
            const createdDate =
              (job as any).createdAt || (job as any).createdDate || (job as any).createdAtDate;
            const locationText = (job as any).location || "TP. Hồ Chí Minh";

            return (
              <TableRow
                key={job.id}
                onClick={() => onView?.(job)}
                className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80 ${
                  isClosed ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>#{job.id}</span>
                    <div
                      className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                      aria-hidden="true">
                      <div className="h-3.5 w-3.5"></div>
                      <div className="h-3.5 w-3.5"></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                  {job.title || "—"}
                </TableCell>
                <TableCell className="px-4 py-4">
                  {job.level ? <StatusBadge {...getJobDescriptionLevelBadge(job.level)} /> : "—"}
                </TableCell>
                {showCompany && (
                  <TableCell className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-100 dark:border-slate-800">
                        <AvatarImage src={compLogo} alt={compName} className="object-cover" />
                        <AvatarFallback className="rounded-[14px] bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                          {compName?.charAt(0)?.toUpperCase() || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {compName}
                      </span>
                    </div>
                  </TableCell>
                )}
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span>{locationText}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {job.rounds?.length || 0} {t("adminCompanymanagement.roundsCount", "vòng")}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Users className="h-3 w-3 text-indigo-500" />
                    {appCount} {t("adminCompanymanagement.applicationsCount", "lượt")}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{formatDate(job.deadlineAt)}</span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <span>{formatDate(createdDate)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-4 pr-6 text-center" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={job.status === "OPEN"}
                    onCheckedChange={() => onToggleStatus?.(job)}
                    className="data-[state=checked]:bg-emerald-500"
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
