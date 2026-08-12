/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { extractDataArray } from "@/lib/utils";
import { adminApplicationManager, companyManager, jobDescriptionManager } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type {
  Company,
  CompanyFormData,
  CreateJobDescriptionRequest,
  JobDescription,
  JobDescriptionFormData,
} from "../types";
import { CompanyFormDialog } from "./CompanyFormDialog";
import { CompanyTable } from "./CompanyTable";
import { JobDescriptionDetailView } from "./JobDescriptionDetailView";
import { JobDescriptionFormDialog } from "./JobDescriptionFormDialog";
import { JobDescriptionTable } from "./JobDescriptionTable";

interface CompanyGridTabProps {
  companies: Company[];
  searchQuery: string;
  onCompanyUpdate?: () => void;
  onCreateCompany: () => void;
  selectedCompanyId?: number | null;
  onSelectCompanyId?: (id: number | null) => void;
  selectedJdId?: number | null;
  onSelectJdId?: (id: number | null) => void;
  isAddJdDialogOpen?: boolean;
  onAddJdDialogChange?: (open: boolean) => void;
}

export function CompanyGridTab({
  companies,
  searchQuery,
  onCompanyUpdate,
  selectedCompanyId: propSelectedCompanyId,
  onSelectCompanyId,
  selectedJdId: propSelectedJdId,
  onSelectJdId,
  isAddJdDialogOpen,
  onAddJdDialogChange,
}: CompanyGridTabProps) {
  const { t } = useTranslation();
  const [internalSelectedCompanyId, setInternalSelectedCompanyId] = useState<number | null>(null);
  const selectedCompanyId =
    propSelectedCompanyId !== undefined ? propSelectedCompanyId : internalSelectedCompanyId;
  const setSelectedCompanyId = onSelectCompanyId || setInternalSelectedCompanyId;

  const [internalSelectedJdId, setInternalSelectedJdId] = useState<number | null>(null);
  const selectedJdId = propSelectedJdId !== undefined ? propSelectedJdId : internalSelectedJdId;
  const setSelectedJdId = onSelectJdId || setInternalSelectedJdId;

  // Edit Company states (delete is disabled — soft-delete via status toggle only)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({});

  const queryClient = useQueryClient();

  // JD states (Create/Edit)
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [internalJdDialogOpen, setInternalJdDialogOpen] = useState(false);
  const isJdDialogOpen = isAddJdDialogOpen !== undefined ? isAddJdDialogOpen : internalJdDialogOpen;
  const setIsJdDialogOpen = onAddJdDialogChange || setInternalJdDialogOpen;
  const [jdFormData, setJdFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [isSubmittingJd, setIsSubmittingJd] = useState(false);

  // JD filter states
  const [jdSearchQuery, setJdSearchQuery] = useState("");
  const [jdStatusFilter, setJdStatusFilter] = useState("all");

  // Pagination for company table
  const [companyPageSize, setCompanyPageSize] = useHybridPageSize({
    key: "src_pages_admin_companymanagement_company_pagesize",
    defaultPageSize: 10,
  });

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const lowerQuery = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(lowerQuery) ||
        c.description?.toLowerCase().includes(lowerQuery) ||
        String(c.id).includes(lowerQuery)
    );
  }, [companies, searchQuery]);

  const companyPagination = usePagination({
    totalCount: filteredCompanies.length,
    pageSize: companyPageSize,
  });

  const pageCompanies = useMemo(() => {
    return filteredCompanies.slice(companyPagination.startIndex, companyPagination.endIndex + 1);
  }, [filteredCompanies, companyPagination.startIndex, companyPagination.endIndex]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  // Fetch JDs for selected company
  const { data: companyJds = [], refetch: refetchCompanyJds } = useQuery({
    queryKey: ["admin", "companies", selectedCompanyId, "jds"],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const response = await jobDescriptionManager.getByCompanyId(selectedCompanyId);
      if (response.success) {
        return extractDataArray<JobDescription>(response);
      }
      return [];
    },
    enabled: !!selectedCompanyId,
  });

  const { data: openJds = [] } = useQuery({
    queryKey: ["admin", "open-jds"],
    queryFn: async () => {
      const res = await adminApplicationManager.getOpenJds();
      return res.success && res.data ? res.data : [];
    },
    enabled: !!selectedCompanyId,
  });

  const enrichedCompanyJds = useMemo(() => {
    return companyJds.map((jd) => {
      const openJdInfo = openJds.find((o) => o.jdId === jd.id);
      return {
        ...jd,
        companyName: selectedCompany?.name || (jd as any).companyName,
        companyLogoUrl:
          selectedCompany?.logoUrl || openJdInfo?.company?.logoUrl || (jd as any).companyLogoUrl,
        applicationCount:
          openJdInfo?.statistics?.totalApplications ??
          (jd as any).statistics?.totalApplications ??
          (jd as any).totalApplications ??
          (jd as any).applicationCount ??
          (jd as any).applicationsCount ??
          0,
      };
    });
  }, [companyJds, selectedCompany, openJds]);

  const filteredJds = useMemo(() => {
    let result = enrichedCompanyJds;
    if (jdStatusFilter !== "all") {
      const isActive = jdStatusFilter === "active";
      result = result.filter((j) =>
        isActive
          ? j.status === "ACTIVE" || j.status === "OPEN"
          : j.status !== "ACTIVE" && j.status !== "OPEN"
      );
    }
    if (jdSearchQuery.trim()) {
      const q = jdSearchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.title?.toLowerCase().includes(q) ||
          String(j.id).includes(q) ||
          j.level?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [enrichedCompanyJds, jdSearchQuery, jdStatusFilter]);

  const selectedJd = useMemo(() => {
    return selectedJdId ? enrichedCompanyJds.find((j) => j.id === selectedJdId) : null;
  }, [selectedJdId, enrichedCompanyJds]);

  const handleEditClick = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description,
      status: company.status as import("../types").CompanyStatus,
    });
    setIsFormOpen(true);
  };

  const handleToggleCompanyStatus = async (company: Company) => {
    if (!company.id) return;
    try {
      const res = await companyManager.toggleStatus(company.id);
      if (res.success) {
        toast.success(t("common.updateSuccess", "Cập nhật thành công"));
        onCompanyUpdate?.();
      } else {
        toast.error(res.error || t("common.updateFailed", "Cập nhật thất bại"));
      }
    } catch {
      toast.error(t("common.updateFailed", "Cập nhật thất bại"));
    }
  };

  const handleSaveEditCompany = async () => {
    if (!editingCompany?.id) return;
    try {
      setIsSubmitting(true);
      const res = await companyManager.update({
        data: {
          id: editingCompany.id,
          name: formData.name?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          status: formData.status,
        },
        logo: formData.logo,
        banner: formData.banner,
      });
      if (res.success) {
        toast.success(
          t("adminCompanymanagement.successfullyUpdatedCompany", "Cập nhật công ty thành công")
        );
        setIsFormOpen(false);
        onCompanyUpdate?.();
      } else {
        toast.error(res.error || t("common.cannotUpdateCompany", "Không thể cập nhật công ty"));
      }
    } catch {
      toast.error(t("common.cannotUpdateCompany", "Không thể cập nhật công ty"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit JD (Create or Edit)
  const handleJdSubmit = async () => {
    if (!selectedCompanyId) return;
    try {
      setIsSubmittingJd(true);
      if (editingJd?.id) {
        // Edit existing JD
        const res = await jobDescriptionManager.update({
          id: editingJd.id,
          title: jdFormData.title,
          description: jdFormData.description,
          requirements: jdFormData.requirements,
          benefits: jdFormData.benefits,
          level: jdFormData.level,
          salaryMin: jdFormData.salaryMin,
          salaryMax: jdFormData.salaryMax,
          price: jdFormData.price ?? 0,
          currency: jdFormData.currency,
          status: jdFormData.status,
          deadlineAt: jdFormData.deadlineAt,
        });
        if (res.success) {
          toast.success(t("common.updateSuccess", "Cập nhật JD thành công"));
          setIsJdDialogOpen(false);
          setEditingJd(null);
          setJdFormData({});
          void refetchCompanyJds();
          queryClient.invalidateQueries({ queryKey: ["admin", "all-jds"] });
        } else {
          toast.error(res.error || t("common.updateFailed", "Không thể cập nhật JD"));
        }
      } else {
        // Create new JD
        const data: CreateJobDescriptionRequest = {
          title: jdFormData.title,
          description: jdFormData.description,
          requirements: jdFormData.requirements,
          benefits: jdFormData.benefits,
          level: jdFormData.level,
          salaryMin: jdFormData.salaryMin,
          salaryMax: jdFormData.salaryMax,
          price: jdFormData.price ?? 0,
          currency: jdFormData.currency,
          status: jdFormData.status,
          deadlineAt: jdFormData.deadlineAt,
          companyId: selectedCompanyId,
        };
        const res = await jobDescriptionManager.create(data);
        if (res.success) {
          toast.success(t("adminCompanymanagement.successfullyCreatedJd", "Thêm JD thành công"));
          setIsJdDialogOpen(false);
          setJdFormData({});
          void refetchCompanyJds();
          queryClient.invalidateQueries({ queryKey: ["admin", "all-jds"] });
        } else {
          toast.error(res.error || t("common.cannotCreateJd", "Không thể thêm JD"));
        }
      }
    } catch {
      toast.error(t("common.cannotCreateJd", "Đã có lỗi xảy ra"));
    } finally {
      setIsSubmittingJd(false);
    }
  };

  // Drill-down mode (Company Selected)
  if (selectedCompany) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
          {selectedJd ? (
            <JobDescriptionDetailView
              jobDescription={selectedJd}
              companyName={selectedCompany.name}
              onBack={() => setSelectedJdId(null)}
              onEdit={() => onCompanyUpdate?.()}
            />
          ) : (
            <>
              {/* ── STAT HEADER (matches Users / Mentors / Companies page layout) ── */}
              <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                  {/* Left: back + title + subtitle */}
                  <div className="flex items-start gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCompanyId(null)}
                      className="mt-0.5 h-9 gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <ArrowLeft className="h-4 w-4" />
                      <span>{t("common.back", "Quay lại")}</span>
                    </Button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {selectedCompany.name}
                      </h2>
                      <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                        {t(
                          "adminCompanymanagement.jdsCount",
                          "Danh sách các Vị trí tuyển dụng của công ty"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: stat badges */}
                  <div className="flex items-center justify-center gap-5 sm:gap-6">
                    {(
                      [
                        [
                          enrichedCompanyJds.length,
                          t("adminCompanymanagement.totalJds", "Tổng JD"),
                        ],
                        [
                          enrichedCompanyJds.filter(
                            (j) => j.status === "ACTIVE" || j.status === "OPEN"
                          ).length,
                          t("adminCompanymanagement.activeJds", "Đang mở"),
                        ],
                        [
                          enrichedCompanyJds.filter(
                            (j) => j.status !== "ACTIVE" && j.status !== "OPEN"
                          ).length,
                          t("adminCompanymanagement.closedJds", "Đã đóng"),
                        ],
                      ] as [number, string][]
                    ).map(([value, label], index) => (
                      <div key={label} className="flex items-center gap-5 sm:gap-6">
                        {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                        <div className="flex min-w-[78px] flex-col items-center justify-center text-center">
                          <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-sky-400">
                            {value}
                          </span>
                          <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                            {label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Control row: search + add button */}
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="text"
                      placeholder={t(
                        "adminCompanymanagement.searchJd",
                        "Tìm kiếm JD theo tên, cấp độ..."
                      )}
                      value={jdSearchQuery}
                      onChange={(e) => setJdSearchQuery(e.target.value)}
                      className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setJdFormData({});
                      setIsJdDialogOpen(true);
                    }}
                    className="h-[46px] shrink-0 gap-1.5 rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                    <Plus className="h-4 w-4" />
                    <span>{t("adminCompanymanagement.addJd", "Thêm JD")}</span>
                  </Button>
                </form>

                {/* Status filter pills */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                    {t("common.status", "Trạng thái")}:
                  </span>
                  {(
                    [
                      ["all", t("common.allStatus", "Tất cả trạng thái")],
                      ["active", t("common.active", "Đang mở")],
                      ["inactive", t("common.shutDown", "Đã đóng")],
                    ] as [string, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setJdStatusFilter(value)}
                      className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                        jdStatusFilter === value
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <JobDescriptionTable
                  jobDescriptions={filteredJds}
                  onView={(jd) => setSelectedJdId(jd.id!)}
                  onToggleStatus={async (job) => {
                    try {
                      const res = await jobDescriptionManager.toggleStatus(job.id!);
                      if (res.success) {
                        toast.success(t("common.updateSuccess", "Cập nhật thành công"));
                        void refetchCompanyJds();
                        queryClient.invalidateQueries({ queryKey: ["admin", "all-jds"] });
                      } else {
                        toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                      }
                    } catch {
                      toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>

        <JobDescriptionFormDialog
          isOpen={isJdDialogOpen}
          onOpenChange={setIsJdDialogOpen}
          formData={jdFormData}
          onFormChange={(data) => setJdFormData((prev) => ({ ...prev, ...data }))}
          onSubmit={handleJdSubmit}
          title={
            editingJd
              ? t("adminCompanymanagement.editJd", "Chỉnh sửa Job Description")
              : t("adminCompanymanagement.createJd", "Tạo Job Description")
          }
          description={
            editingJd
              ? t("adminCompanymanagement.editJdDescription", "Cập nhật thông tin Job Description.")
              : t(
                  "adminCompanymanagement.createJdDescription",
                  "Điền thông tin để tạo Job Description mới."
                )
          }
          submitLabel={
            isSubmittingJd
              ? t("common.processing", "Đang xử lý...")
              : editingJd
                ? t("common.save", "Lưu thay đổi")
                : t("common.create", "Tạo mới")
          }
        />
      </div>
    );
  }

  // Company List View (Full-Bleed Table)
  return (
    <div className="flex h-full flex-col">
      {searchQuery && (
        <div className="mb-3 flex flex-none items-center gap-2 px-6 pt-4">
          <span className="text-xs text-slate-500">
            {t("common.showing", "Hiển thị")}{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {filteredCompanies.length}
            </strong>{" "}
            / <strong>{companies.length}</strong> {t("common.resultsUnit", "kết quả")}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <CompanyTable
          companies={pageCompanies}
          onSelectCompany={(company) => setSelectedCompanyId(company.id!)}
          onEditCompany={handleEditClick}
          onToggleStatus={handleToggleCompanyStatus}
        />
      </div>

      {filteredCompanies.length > 0 && (
        <div className="flex flex-none items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
          <PaginationControl
            pagination={companyPagination}
            onPageSizeChange={(size) => {
              setCompanyPageSize(size);
              companyPagination.goToFirstPage();
            }}
          />
        </div>
      )}

      {/* Edit Dialog (Delete is not exposed — soft-delete via status toggle only) */}
      <CompanyFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSaveEditCompany}
        title={t("adminCompanymanagement.editCompanyInfo", "Chỉnh sửa thông tin công ty")}
        description={t(
          "adminCompanymanagement.updateInfoOfPartner",
          "Cập nhật các thông tin của công ty đối tác"
        )}
        submitLabel={t("common.save", "Lưu thay đổi")}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
