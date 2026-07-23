import { SortButton, type SortDirection } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import { Briefcase } from "lucide-react";
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
                {t("adminCompanymanagement.companyName", "Tên công ty")}
              </TableHead>
            )}
            <TableHead className="font-medium text-slate-500">
              {t("adminCompanymanagement.rounds", "Số vòng thi")}
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
                    {/* @ts-expect-error Company data comes from BE */}
                    {job.company?.name || job.companyName || "—"}
                  </TableCell>
                )}
                <TableCell>
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {job.rounds?.length || 0} vòng
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDate(job.deadlineAt)}
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
