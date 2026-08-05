import { Edit, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SortButton, type SortDirection } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Major } from "../types";

type QuestionMajorSortKey = "idSortValue" | "nameSortValue" | "descriptionSortValue";

interface SortProps {
  direction: SortDirection;
  onChange: (direction: SortDirection) => void;
}

interface QuestionMajorTableProps {
  majors: Major[];
  onEdit: (major: Major) => void;
  onDelete: (major: Major) => void;
  getSortProps?: (key: QuestionMajorSortKey) => SortProps;
}

export function QuestionMajorTable({
  majors,
  onEdit,
  onDelete,
  getSortProps,
}: QuestionMajorTableProps) {
  const { t } = useTranslation();
  if (majors.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <Search className="h-12 w-12 text-gray-400" />
        <p className="font-['Inter'] text-lg text-gray-500">
          {t("adminQuestionmajormanagement.noMajorsFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
            <TableHead className="w-16 pl-6 font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("idSortValue")}>{t("common.id")}</SortButton>
              ) : (
                t("common.id")
              )}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("nameSortValue")}>
                  {t("adminQuestionmajormanagement.nameOfSpecialization")}
                </SortButton>
              ) : (
                t("adminQuestionmajormanagement.nameOfSpecialization")
              )}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {getSortProps ? (
                <SortButton {...getSortProps("descriptionSortValue")}>
                  {t("adminQuestionmajormanagement.describe")}
                </SortButton>
              ) : (
                t("adminQuestionmajormanagement.describe")
              )}
            </TableHead>
            <TableHead className="w-24 pr-6 text-right font-medium text-slate-500">
              {t("adminQuestionmajormanagement.operation")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {majors.map((major) => (
            <TableRow
              key={major.id}
              onClick={() => onEdit(major)}
              className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
              <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>#{major.id}</span>
                  {/* Dummy element to force row height alignment */}
                  <div
                    className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                    aria-hidden="true">
                    <div className="h-3.5 w-3.5"></div>
                    <div className="h-3.5 w-3.5"></div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-medium">{major.majorName}</TableCell>
              <TableCell className="text-muted-foreground max-w-md truncate">
                {major.description || "-"}
              </TableCell>
              <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(major)}
                    className="h-8 w-8 p-0 hover:bg-blue-50"
                    title={t("general.edit")}>
                    <Edit className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(major)}
                    className="h-8 w-8 p-0 hover:bg-red-50"
                    title={t("general.delete")}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
