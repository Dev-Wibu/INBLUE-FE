import { SortButton, type SortDirection } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/formatting";
import { getJobDescriptionLevelBadge, getJobDescriptionStatusBadge } from "@/lib/status-utils";
import { Briefcase, MoreHorizontal } from "lucide-react";
import { type MouseEvent } from "react";
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
  onEdit: (job: JobDescription) => void;
  onDelete: (job: JobDescription) => void;
  onToggleStatus?: (job: JobDescription, nextStatus: "OPEN" | "CLOSED") => void;
  onView?: (job: JobDescription) => void;
  onConfigureRounds?: (job: JobDescription) => void;
  getSortProps?: (key: JobDescriptionSortKey) => SortProps;
}

export function JobDescriptionTable({
  jobDescriptions,
  onEdit,
  onDelete,
  onToggleStatus,
  onView,
  onConfigureRounds,
  getSortProps,
}: JobDescriptionTableProps) {
  const { t } = useTranslation();

  const formatSalaryRange = (
    salaryMin?: number | null,
    salaryMax?: number | null,
    currency?: string | null
  ): string => {
    if (salaryMin == null && salaryMax == null) return t("common.agree");
    const currencyNote = currency && currency.toUpperCase() !== "VND" ? ` (${currency})` : "";
    if (salaryMin != null && salaryMax != null) {
      return `${formatCurrency(salaryMin)} - ${formatCurrency(salaryMax)}${currencyNote}`;
    }
    if (salaryMin != null)
      return t("general.from2", {
        var_0: formatCurrency(salaryMin),
        var_1: currencyNote,
      });
    return t("general.to2", {
      var_0: formatCurrency(salaryMax ?? 0),
      var_1: currencyNote,
    });
  };

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
          <TableRow>
            <TableHead className="w-16">
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
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("statusSortValue")}>{t("common.status")}</SortButton>
              ) : (
                t("common.status")
              )}
            </TableHead>
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("salaryMinSortValue")}>
                  {t("adminCompanymanagement.wage")}
                </SortButton>
              ) : (
                t("adminCompanymanagement.wage")
              )}
            </TableHead>
            <TableHead>
              {getSortProps ? (
                <SortButton {...getSortProps("updatedAtSortValue")}>
                  {t("adminCompanymanagement.deadline")}
                </SortButton>
              ) : (
                t("adminCompanymanagement.deadline")
              )}
            </TableHead>
            <TableHead className="w-24 text-right">{t("common.operation")}</TableHead>
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
              <TableCell>
                <StatusBadge {...getJobDescriptionStatusBadge(job.status)} />
              </TableCell>
              <TableCell className="text-slate-500">
                {formatSalaryRange(job.salaryMin, job.salaryMax, job.currency)}
              </TableCell>
              <TableCell className="text-slate-500">{formatDate(job.deadlineAt)}</TableCell>
              <TableCell className="text-right" onClick={(e: MouseEvent) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView?.(job)}>
                      {t("common.detail")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(job)}>
                      {t("general.edit")}
                    </DropdownMenuItem>
                    {onConfigureRounds && (
                      <DropdownMenuItem onClick={() => onConfigureRounds(job)}>
                        {t("adminCompanymanagement.configureRecruitmentProcess")}
                      </DropdownMenuItem>
                    )}
                    {job.status === "OPEN" ? (
                      <DropdownMenuItem
                        onClick={() => onDelete(job)}
                        className="text-red-600 focus:bg-red-50 focus:text-red-700">
                        {t("adminCompanymanagement.closeJd")}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => onToggleStatus && onToggleStatus(job, "OPEN")}
                        className="text-emerald-600 focus:bg-emerald-50 focus:text-emerald-700">
                        {t("adminCompanymanagement.openJd", t("recruitment.openRecruitment"))}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
