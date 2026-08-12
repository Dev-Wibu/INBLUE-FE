/* eslint-disable @typescript-eslint/no-explicit-any */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { formatDate } from "@/lib/formatting";
import { Building2, Edit, MapPin } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import type { Company } from "../types";

interface CompanyTableProps {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onEditCompany: (company: Company, e: React.MouseEvent) => void;
  onToggleStatus?: (company: Company) => void;
}

export function CompanyTable({
  companies,
  onSelectCompany,
  onEditCompany,
  onToggleStatus,
}: CompanyTableProps) {
  const { t } = useTranslation();

  if (!companies.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[80px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.id", "ID")}
            </TableHead>
            <TableHead className="min-w-[200px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.companyName", "Tên công ty")}
            </TableHead>
            <TableHead className="w-[160px] min-w-[160px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.location", "Địa điểm")}
            </TableHead>
            <TableHead className="min-w-[220px] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.description", "Mô tả")}
            </TableHead>
            <TableHead className="w-[110px] min-w-[110px] text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.jdCount", "Số Vị Trí")}
            </TableHead>
            <TableHead className="w-[160px] min-w-[160px] px-5 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminUsermanagement.joinedDate", "Ngày tham gia")}
            </TableHead>
            <TableHead className="w-[120px] min-w-[120px] text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status", "Trạng thái")}
            </TableHead>
            <TableHead className="w-[100px] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
              {t("common.actions", "Thao tác")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const isInactive = company.status !== "ACTIVE";
            const locationText = (company as any).location || "TP. Hồ Chí Minh";
            const joinedDateRaw =
              (company as any).createdAt ||
              (company as any).created_at ||
              (company as any).createdAtDate;

            return (
              <TableRow
                key={company.id}
                onClick={() => onSelectCompany(company)}
                className={`group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80 ${
                  isInactive ? "opacity-60 grayscale-[30%]" : ""
                }`}>
                <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span>#{company.id}</span>
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
                      <AvatarImage
                        src={company.logoUrl}
                        alt={company.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-[14px] bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                        {company.name?.charAt(0)?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {company.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <span>{locationText}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs px-4 py-4">
                  <p className="line-clamp-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {company.description || "—"}
                  </p>
                </TableCell>
                <TableCell className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                    {company.jobDescriptions?.length || 0}
                  </span>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {joinedDateRaw ? formatDate(joinedDateRaw as string) : "—"}
                </TableCell>
                <TableCell className="py-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={company.status === "ACTIVE"}
                    onCheckedChange={() => onToggleStatus?.(company)}
                    className="data-[state=checked]:bg-emerald-500"
                    aria-label={`Toggle status for ${company.name}`}
                  />
                </TableCell>
                <TableCell className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      onClick={(e) => onEditCompany(company, e)}
                      title={t("common.edit", "Chỉnh sửa")}>
                      <Edit className="h-4 w-4" />
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
