/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortButton, TruncatedScrollText, type SortDirection } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Briefcase, Calendar, Clock, Layers, MapPin, Users } from "lucide-react";
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
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[64px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("idSortValue")}>{t("common.id", "ID")}</SortButton>
              ) : (
                t("common.id", "ID")
              )}
            </TableHead>
            {showCompany && (
              <TableHead className="w-[16%] px-4 font-semibold text-slate-700 dark:text-slate-200">
                {t("adminCompanymanagement.companyName", "Công ty")}
              </TableHead>
            )}
            <TableHead className="w-[9%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("levelSortValue")}>{t("common.level")}</SortButton>
              ) : (
                t("common.level")
              )}
            </TableHead>
            <TableHead className="w-[20%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("titleSortValue")}>{t("common.title")}</SortButton>
              ) : (
                t("common.title")
              )}
            </TableHead>
            <TableHead className="w-[13%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.location", "Địa điểm")}
            </TableHead>
            <TableHead className="w-[10%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.rounds", "Các vòng phỏng vấn")}
            </TableHead>
            <TableHead className="w-[11%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.totalApplications", "Tổng lượt ứng tuyển")}
            </TableHead>
            <TableHead className="w-[10%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {getSortProps ? (
                <SortButton {...getSortProps("updatedAtSortValue")}>
                  {t("adminCompanymanagement.deadline")}
                </SortButton>
              ) : (
                t("adminCompanymanagement.deadline")
              )}
            </TableHead>
            <TableHead className="w-[10%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.createdAt", "Ngày tạo")}
            </TableHead>
            <TableHead className="w-[10%] pr-6 text-center font-semibold text-slate-700 dark:text-slate-200">
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
                <TableCell className="py-3 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
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
                {showCompany && (
                  <TableCell className="min-w-0 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-100 dark:border-slate-800">
                        <AvatarImage src={compLogo} alt={compName} className="object-cover" />
                        <AvatarFallback className="rounded-[14px] bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                          {compName?.charAt(0)?.toUpperCase() || "C"}
                        </AvatarFallback>
                      </Avatar>
                      <TruncatedScrollText
                        text={compName}
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>
                  </TableCell>
                )}
                <TableCell className="px-4 py-4">
                  {job.level ? <StatusBadge {...getJobDescriptionLevelBadge(job.level)} /> : "—"}
                </TableCell>
                <TableCell className="min-w-0 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                  <TruncatedScrollText
                    text={job.title || "—"}
                    className="text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </TableCell>
                <TableCell className="min-w-0 px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <TruncatedScrollText
                      text={locationText}
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/90 bg-slate-100/90 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-100">
                    <Layers className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>
                      {job.rounds?.length || 0} {t("adminCompanymanagement.roundsCount", "vòng")}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200/80 bg-indigo-50/90 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-2xs dark:border-indigo-800/80 dark:bg-indigo-950/80 dark:text-indigo-300">
                    <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {appCount} {t("adminCompanymanagement.applicationsCount", "lượt")}
                    </span>
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
                <TableCell className="py-3 pr-6 text-center" onClick={(e) => e.stopPropagation()}>
                  {job.status === "OPEN" ? (
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(job)}
                      title={t("common.clickToDisable", "Nhấp để tắt")}
                      className="group/status inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-2xs transition-all hover:bg-emerald-100/90 dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-950/90">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                      </span>
                      <span>{t("common.active", "Hoạt động")}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(job)}
                      title={t("common.clickToEnable", "Nhấp để bật")}
                      className="group/status inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                      <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                      <span>{t("common.shutDown", "Đã tắt")}</span>
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
