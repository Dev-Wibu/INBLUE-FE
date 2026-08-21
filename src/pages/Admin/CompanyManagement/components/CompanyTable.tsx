/* eslint-disable @typescript-eslint/no-explicit-any */
import { TruncatedScrollText } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/formatting";
import { Building2, MapPin, Pencil } from "lucide-react";
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
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
            <TableHead className="w-[64px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.id", "ID")}
            </TableHead>
            <TableHead className="w-[22%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.companyName", "Tên công ty")}
            </TableHead>
            <TableHead className="w-[14%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.location", "Địa điểm")}
            </TableHead>
            <TableHead className="w-[23%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("common.description", "Mô tả")}
            </TableHead>
            <TableHead className="w-[9%] text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("adminCompanymanagement.jdCount", "Số Vị Trí")}
            </TableHead>
            <TableHead className="w-[12%] px-4 font-semibold text-slate-700 dark:text-slate-200">
              {t("adminUsermanagement.joinedDate", "Ngày tham gia")}
            </TableHead>
            <TableHead className="w-[11%] text-center font-semibold text-slate-700 dark:text-slate-200">
              {t("common.status", "Trạng thái")}
            </TableHead>
            <TableHead className="w-[11%] pr-6 text-right font-semibold text-slate-700 dark:text-slate-200">
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
                <TableCell className="py-3 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
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
                <TableCell className="min-w-0 px-4 py-3">
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
                    <TruncatedScrollText
                      text={company.name || "—"}
                      className="text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
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
                <TableCell className="min-w-0 px-4 py-3">
                  <TruncatedScrollText
                    text={company.description || "—"}
                    className="text-xs font-medium text-slate-600 dark:text-slate-300"
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center rounded-md border border-slate-200/80 bg-slate-100/90 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-800 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-200">
                    {company.jobDescriptions?.length || 0}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {joinedDateRaw ? formatDate(joinedDateRaw as string) : "—"}
                </TableCell>
                <TableCell className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  {company.status === "ACTIVE" ? (
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(company)}
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
                      onClick={() => onToggleStatus?.(company)}
                      title={t("common.clickToEnable", "Nhấp để bật")}
                      className="group/status inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                      <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                      <span>{t("common.shutDown", "Đã tắt")}</span>
                    </button>
                  )}
                </TableCell>
                <TableCell className="py-3 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => onEditCompany(company, e)}
                      title={t("common.edit", "Chỉnh sửa")}
                      className="group/btn h-8.5 gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-indigo-300 hover:bg-indigo-50/70 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400">
                      <Pencil className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover/btn:text-indigo-500" />
                      <span>{t("common.edit", "Chỉnh sửa")}</span>
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
