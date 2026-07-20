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
      <div className="border-border/50 bg-background/50 flex flex-1 flex-col items-center justify-center rounded-2xl border p-12 text-center shadow-sm">
        <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Briefcase className="text-muted-foreground h-8 w-8 opacity-50" />
        </div>
        <p className="text-muted-foreground text-lg">{t("adminCompanymanagement.noJdYet")}</p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-20">
              {getSortProps ? (
                <SortButton {...getSortProps("idSortValue")}>{t("common.id", "ID")}</SortButton>
              ) : (
                t("common.id", "ID")
              )}
            </TableHead>
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("titleSortValue")}>{t("common.title")}</SortButton>
              ) : (
                t("common.title")
              )}
            </TableHead>
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("levelSortValue")}>{t("common.level")}</SortButton>
              ) : (
                t("common.level")
              )}
            </TableHead>
            {showCompany && (
              <TableHead>{t("adminCompanymanagement.companyName", "Tên công ty")}</TableHead>
            )}
            <TableHead>{t("adminCompanymanagement.rounds", "Số vòng thi")}</TableHead>
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("updatedAtSortValue")}>
                  {t("adminCompanymanagement.deadline")}
                </SortButton>
              ) : (
                t("adminCompanymanagement.deadline")
              )}
            </TableHead>
            <TableHead className="w-24 text-right">
              {getSortProps ? (
                <SortButton {...getSortProps("statusSortValue")}>{t("common.status")}</SortButton>
              ) : (
                t("common.status")
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobDescriptions.map((job) => (
            <TableRow
              key={job.id}
              onClick={() => onView?.(job)}
              className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
              <TableCell className="font-medium">#{job.id}</TableCell>
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
              <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                {job.rounds?.length || 0}
              </TableCell>
              <TableCell className="text-slate-500">{formatDate(job.deadlineAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center p-1">
                    <Switch
                      checked={job.status === "OPEN"}
                      onCheckedChange={(checked) =>
                        onToggleStatus?.(job, checked ? "OPEN" : "CLOSED")
                      }
                      aria-label={`Toggle status for ${job.title || job.id}`}
                    />
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
