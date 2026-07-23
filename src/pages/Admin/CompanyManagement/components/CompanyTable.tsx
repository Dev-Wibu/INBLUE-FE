import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Edit, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Company } from "../types";

interface CompanyTableProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onEditCompany: (company: Company, e: React.MouseEvent) => void;
  onDeleteCompany: (company: Company, e: React.MouseEvent) => void;
  onToggleStatus?: (company: Company, nextStatus: "ACTIVE" | "INACTIVE") => void;
}

export function CompanyTable({
  companies,
  onSelectCompany,
  onEditCompany,
  onDeleteCompany,
  onToggleStatus,
}: CompanyTableProps) {
  const { t } = useTranslation();
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  if (!companies.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Building2 className="h-6 w-6 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {t("adminCompanymanagement.noCompaniesAvailable", "Chưa có công ty nào")}
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
              {t("common.id", "ID")}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {t("adminCompanymanagement.companyName", "Tên công ty")}
            </TableHead>
            <TableHead className="font-medium text-slate-500">
              {t("common.description", "Mô tả")}
            </TableHead>
            <TableHead className="w-28 text-center font-medium text-slate-500">
              {t("adminCompanymanagement.jdCount", "Số JD")}
            </TableHead>
            <TableHead className="w-32 text-center font-medium text-slate-500">
              {t("common.status", "Trạng thái")}
            </TableHead>
            <TableHead className="w-28 pr-6 text-right font-medium text-slate-500">
              {t("common.actions", "Thao tác")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const isInactive = company.status !== "ACTIVE";
            const imageFailed = company.id ? failedImages[company.id] : false;

            return (
              <TableRow
                key={company.id}
                onClick={() => onSelectCompany(company)}
                className={`group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80 ${
                  isInactive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                  #{company.id}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                      {company.logoUrl && !imageFailed ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          onError={() => {
                            if (company.id) {
                              setFailedImages((prev) => ({ ...prev, [company.id!]: true }));
                            }
                          }}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {company.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                    {company.description || "—"}
                  </p>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {company.jobDescriptions?.length || 0} JD
                  </span>
                </TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={company.status === "ACTIVE"}
                    onCheckedChange={(checked) =>
                      onToggleStatus?.(company, checked ? "ACTIVE" : "INACTIVE")
                    }
                    className="shadow-sm data-[state=checked]:bg-emerald-500"
                    aria-label={`Toggle status for ${company.name}`}
                  />
                </TableCell>
                <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      onClick={(e) => onEditCompany(company, e)}
                      title={t("common.edit", "Chỉnh sửa")}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                      onClick={(e) => onDeleteCompany(company, e)}
                      title={t("common.delete", "Xóa")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
