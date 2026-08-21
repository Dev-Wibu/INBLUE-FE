/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { extractDataArray } from "@/lib/utils";
import { adminApplicationManager, companyManager, jobDescriptionManager } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, FilePlus2, Import, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  JobDescriptionDetailView,
  JobDescriptionFormDialog,
  JobDescriptionTable,
} from "../CompanyManagement/components";
import type { Company, JobDescription, JobDescriptionFormData } from "../CompanyManagement/types";

export function JobDescriptionManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJd, setSelectedJd] = useState<JobDescription | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<JobDescriptionFormData>>({
    status: "OPEN",
    currency: "VND",
  });
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_jobdescriptionmanagement_pagesize",
    defaultPageSize: 10,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const response = await companyManager.getAll();
      return response.success ? extractDataArray<Company>(response as any) : [];
    },
  });
  const { data: allJds = [], refetch: refetchJds } = useQuery({
    queryKey: ["admin", "all-jds"],
    queryFn: async () => {
      const response = await jobDescriptionManager.getAll();
      return response.success ? extractDataArray<JobDescription>(response as any) : [];
    },
  });
  const { data: openJds = [] } = useQuery({
    queryKey: ["admin", "open-jds"],
    queryFn: async () => {
      const response = await adminApplicationManager.getOpenJds();
      return response.success && response.data ? response.data : [];
    },
  });

  const processedJds = useMemo(
    () =>
      allJds
        .map((jd) => {
          const company = companies.find(
            (item) =>
              item.id === (jd as any).companyId ||
              item.id === (jd as any).company?.id ||
              item.jobDescriptions?.some((child) => child.id === jd.id)
          );
          const open = openJds.find((item) => item.jdId === jd.id);
          return {
            ...jd,
            companyName: company?.name || (jd as any).company?.name || (jd as any).companyName,
            companyLogoUrl:
              company?.logoUrl || (jd as any).company?.logoUrl || (jd as any).companyLogo,
            applicationCount:
              open?.statistics?.totalApplications ??
              (jd as any).applicationCount ??
              (jd as any).applicationsCount ??
              0,
          };
        })
        .filter((jd) => {
          const query = searchQuery.trim().toLowerCase();
          const matchesSearch =
            !query ||
            jd.title?.toLowerCase().includes(query) ||
            (jd as any).companyName?.toLowerCase().includes(query) ||
            String(jd.id).includes(query);
          const matchesStatus = statusFilter === "all" || jd.status === statusFilter;
          return matchesSearch && matchesStatus;
        }),
    [allJds, companies, openJds, searchQuery, statusFilter]
  );
  const pagination = usePagination({ totalCount: processedJds.length, pageSize });
  const pageJds = processedJds.slice(pagination.startIndex, pagination.endIndex + 1);

  const openCreate = () => {
    setFormData({ status: "OPEN", currency: "VND" });
    setIsCreateOpen(true);
  };
  const submitCreate = async () => {
    if (!formData.companyId) {
      toast.error(t("adminCompanymanagement.selectCompanyForJd", "Vui lòng chọn công ty"));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await jobDescriptionManager.create(formData as any);
      if (!response.success) throw new Error(response.error || "create failed");
      toast.success(t("adminCompanymanagement.successfullyCreatedJd", "Tạo JD mới thành công"));
      setIsCreateOpen(false);
      setFormData({ status: "OPEN", currency: "VND" });
      await Promise.all([
        refetchJds(),
        queryClient.invalidateQueries({ queryKey: ["admin", "companies"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "open-jds"] }),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("common.cannotCreateJd", "Không thể tạo JD")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (job: JobDescription) => {
    if (!job.id) return;
    try {
      const response = await jobDescriptionManager.toggleStatus(job.id);
      if (!response.success)
        throw new Error(response.error || t("common.updateFailed", "Cập nhật thất bại"));
      toast.success(t("common.updateSuccess", "Cập nhật thành công"));
      await refetchJds();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("common.updateFailed", "Cập nhật thất bại")
      );
    }
  };

  if (selectedJd) {
    return (
      <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 lg:-m-8 dark:bg-slate-950">
        <JobDescriptionDetailView
          jobDescription={selectedJd}
          companyName={(selectedJd as any).companyName || (selectedJd as any).company?.name}
          onBack={() => setSelectedJd(null)}
        />
      </div>
    );
  }

  return (
    <div className="-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-1 flex-col overflow-auto bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
        <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("adminJobDescriptionManagement.title", "Quản lý JD")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t(
                  "adminJobDescriptionManagement.description",
                  "Quản lý các vị trí tuyển dụng trong hệ thống và tạo JD mới."
                )}
              </p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-sky-400">
                  {allJds.length}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {t("adminJobDescriptionManagement.total", "Tổng JD")}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-sky-400">
                  {companies.length}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {t("common.company", "Công ty")}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t(
                  "common.searchJdByTitleOrCompany",
                  "Tìm JD theo tiêu đề hoặc công ty..."
                )}
                className="h-[46px] rounded-xl border-slate-200 bg-slate-50/70 pl-11 dark:border-slate-800 dark:bg-slate-950/70"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-[46px] shrink-0 rounded-xl bg-indigo-600 px-5 font-semibold hover:bg-indigo-700">
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t("adminJobDescriptionManagement.create", "Tạo JD")}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={openCreate}>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  {t("adminJobDescriptionManagement.manual", "Tạo thủ công")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/topdev-job-import")}>
                  <Import className="mr-2 h-4 w-4" />
                  {t("adminJobDescriptionManagement.import", "Import JD")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {t("common.status", "Trạng thái")}:
            </span>
            {[
              ["all", t("common.allStatus", "Tất cả")],
              ["OPEN", t("common.active", "Đang mở")],
              ["DRAFT", t("common.draft", "Bản nháp")],
              ["CLOSED", t("common.shutDown", "Đã đóng")],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${statusFilter === value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <JobDescriptionTable
            showCompany
            jobDescriptions={pageJds}
            onView={setSelectedJd}
            onToggleStatus={toggleStatus}
          />
          {processedJds.length > 0 && (
            <div className="flex justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  pagination.goToFirstPage();
                }}
              />
            </div>
          )}
        </div>
      </div>
      <JobDescriptionFormDialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={submitCreate}
        title={t("adminCompanymanagement.createJdTitle", "Tạo vị trí tuyển dụng (JD)")}
        description={t(
          "adminCompanymanagement.createJdDesc",
          "Nhập thông tin vị trí tuyển dụng mới."
        )}
        isSubmitting={isSubmitting}
        companies={companies.map((company) => ({ id: company.id!, name: company.name || "" }))}
      />
    </div>
  );
}
