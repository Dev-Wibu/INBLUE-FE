/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { extractDataArray } from "@/lib/utils";
import { adminApplicationManager, companyManager, jobDescriptionManager } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CompanyFormDialog,
  CompanyTable,
  JobDescriptionDetailView,
  JobDescriptionFormDialog,
  JobDescriptionTable,
} from "./components";
import { CompanyGridTab } from "./components/CompanyGridTab";
import type { Company, CompanyFormData, JobDescription, JobDescriptionFormData } from "./types";

export function CompanyManagementPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"companies" | "jds">("companies");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({});
  const [isCreating, setIsCreating] = useState(false);

  const selectedCompanyId = searchParams.get("companyId")
    ? Number(searchParams.get("companyId"))
    : null;
  const selectedJdId = searchParams.get("jdId") ? Number(searchParams.get("jdId")) : null;

  const setSelectedCompanyId = useCallback(
    (id: number | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) {
            next.set("companyId", String(id));
          } else {
            next.delete("companyId");
            next.delete("jdId");
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSelectedJdId = useCallback(
    (id: number | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) {
            next.set("jdId", String(id));
          } else {
            next.delete("jdId");
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [searchQuery, setSearchQuery] = useState("");

  // JD Tab states
  const [jdSearchQuery, setJdSearchQuery] = useState("");
  const [editingJd] = useState<JobDescription | null>(null);
  const [isJdDialogOpen, setIsJdDialogOpen] = useState(false);
  const [isJdEditDialogOpen, setIsJdEditDialogOpen] = useState(false);
  const [jdFormData, setJdFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [jdEditFormData, setJdEditFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [isSubmittingJd, setIsSubmittingJd] = useState(false);

  // Pagination for Company Table
  const [companyPageSize, setCompanyPageSize] = useHybridPageSize({
    key: "src_pages_admin_companymanagement_company_pagesize",
    defaultPageSize: 10,
  });

  // Pagination for JDs tab
  const [jdPageSize, setJdPageSize] = useHybridPageSize({
    key: "src_pages_admin_companymanagement_jd_pagesize",
    defaultPageSize: 10,
  });

  // Fetch Companies
  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const response = await companyManager.getAll();
      if (response.success) {
        return extractDataArray<Company>(response as any);
      }
      toast.error(response.error || t("common.unableToLoadCompanyList"));
      return [];
    },
  });

  // Fetch all JDs
  const { data: allJds = [], refetch: refetchAllJds } = useQuery({
    queryKey: ["admin", "all-jds"],
    queryFn: async () => {
      const response = await jobDescriptionManager.getAll();
      if (response.success) {
        return extractDataArray<JobDescription>(response as any);
      }
      return [];
    },
  });

  // Fetch open-jds stats to get live totalApplications & company info
  const { data: openJds = [] } = useQuery({
    queryKey: ["admin", "open-jds"],
    queryFn: async () => {
      const res = await adminApplicationManager.getOpenJds();
      return res.success && res.data ? res.data : [];
    },
  });

  // Filter companies based on status filter & search query
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      if (statusFilter === "active" && company.status !== "ACTIVE") {
        return false;
      }
      if (statusFilter === "inactive" && company.status === "ACTIVE") {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        company.name?.toLowerCase().includes(lowerQuery) ||
        company.description?.toLowerCase().includes(lowerQuery) ||
        String(company.id).includes(lowerQuery)
      );
    });
  }, [companies, statusFilter, searchQuery]);

  const companyPagination = usePagination({
    totalCount: filteredCompanies.length,
    pageSize: companyPageSize,
  });

  const pageCompanies = useMemo(() => {
    return filteredCompanies.slice(companyPagination.startIndex, companyPagination.endIndex + 1);
  }, [filteredCompanies, companyPagination.startIndex, companyPagination.endIndex]);

  // Processed JDs array
  const processedJds = useMemo(() => {
    let result = allJds.map((jd) => {
      const openJdInfo = openJds.find((o) => o.jdId === jd.id);
      const company = companies.find(
        (c) =>
          c.jobDescriptions?.some((j) => j.id === jd.id) ||
          c.id === (jd as any).companyId ||
          c.id === (jd as any).company?.id ||
          (openJdInfo?.company?.id && c.id === openJdInfo.company.id)
      );

      return {
        ...jd,
        companyName:
          company?.name ||
          openJdInfo?.company?.name ||
          (jd as any).company?.name ||
          (jd as any).companyName,
        companyLogoUrl:
          company?.logoUrl ||
          openJdInfo?.company?.logoUrl ||
          (jd as any).company?.logoUrl ||
          (jd as any).companyLogo,
        applicationCount:
          openJdInfo?.statistics?.totalApplications ??
          (jd as any).statistics?.totalApplications ??
          (jd as any).totalApplications ??
          (jd as any).applicationCount ??
          (jd as any).applicationsCount ??
          0,
      };
    });

    if (statusFilter === "active") {
      result = result.filter((jd) => jd.status === "OPEN");
    } else if (statusFilter === "inactive") {
      result = result.filter((jd) => jd.status !== "OPEN");
    }

    if (jdSearchQuery) {
      const q = jdSearchQuery.toLowerCase();
      result = result.filter(
        (jd) =>
          jd.title?.toLowerCase().includes(q) ||
          jd.companyName?.toLowerCase().includes(q) ||
          String(jd.id).includes(q)
      );
    }

    return result;
  }, [allJds, companies, openJds, statusFilter, jdSearchQuery]);

  const jdPagination = usePagination({
    totalCount: processedJds.length,
    pageSize: jdPageSize,
  });

  const pageJds = useMemo(() => {
    return processedJds.slice(jdPagination.startIndex, jdPagination.endIndex + 1);
  }, [processedJds, jdPagination.startIndex, jdPagination.endIndex]);

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => String(c.id) === String(selectedCompanyId)) || null;
  }, [companies, selectedCompanyId]);

  const { data: directSelectedJd } = useQuery({
    queryKey: ["admin", "jd-detail-header", selectedJdId],
    queryFn: async () => {
      if (!selectedJdId) return null;
      const res = await jobDescriptionManager.getById(selectedJdId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!selectedJdId,
  });

  const selectedJd = useMemo(() => {
    if (!selectedJdId) return null;
    const foundInProcessed = processedJds.find((j) => String(j.id) === String(selectedJdId));
    if (foundInProcessed) return foundInProcessed;
    const foundInAll = allJds.find((j) => String(j.id) === String(selectedJdId));
    if (foundInAll) return foundInAll as JobDescription;
    if (directSelectedJd) return directSelectedJd;
    return null;
  }, [selectedJdId, processedJds, allJds, directSelectedJd]);

  const selectedJdCompany = useMemo(() => {
    if (!selectedJd) return selectedCompany?.name || "";
    if ((selectedJd as any).companyName) return (selectedJd as any).companyName;
    if ((selectedJd as any).company?.name) return (selectedJd as any).company.name;
    const compId = (selectedJd as any).companyId || (selectedJd as any).company?.id;
    if (compId) {
      const matchedComp = companies.find((c) => String(c.id) === String(compId));
      if (matchedComp?.name) return matchedComp.name;
    }
    return selectedCompany?.name || "";
  }, [selectedJd, selectedCompany, companies]);

  // Quick Stats
  const stats = useMemo(() => {
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter((c) => c.status === "ACTIVE").length;
    const totalJds = allJds.length;
    return { totalCompanies, activeCompanies, totalJds };
  }, [companies, allJds]);

  const handleCreateCompany = () => {
    setFormData({
      status: "ACTIVE",
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmitCreate = async () => {
    try {
      setIsCreating(true);
      const res = await companyManager.create({
        data: {
          name: formData.name || "",
          description: formData.description,
          status: formData.status || "ACTIVE",
        },
        logo: formData.logo,
        banner: formData.banner,
      });

      if (res.success) {
        toast.success(t("common.createSuccess", "Tạo công ty thành công"));
        setIsCreateDialogOpen(false);
        setFormData({});
        void refetchCompanies();
      } else {
        toast.error(res.error || t("common.createFailed", "Tạo công ty thất bại"));
      }
    } catch {
      toast.error(t("common.createFailed", "Tạo công ty thất bại"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreateJd = (companyId?: number) => {
    setJdFormData({
      status: "OPEN",
      currency: "VND",
      ...(companyId ? { companyId } : {}),
    });
    if (companyId) {
      setSelectedCompanyId(companyId);
    }
    setIsJdDialogOpen(true);
  };

  const handleSubmitCreateJd = async () => {
    try {
      setIsSubmittingJd(true);
      const targetCompanyId = selectedCompanyId || (jdFormData as any).companyId;
      if (!targetCompanyId) {
        toast.error(
          t(
            "adminCompanymanagement.selectCompanyForJd",
            "Vui lòng chọn công ty cho vị trí tuyển dụng này"
          )
        );
        return;
      }

      const res = await jobDescriptionManager.create({
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
        companyId: targetCompanyId,
      });

      if (res.success) {
        toast.success(t("adminCompanymanagement.successfullyCreatedJd", "Tạo JD mới thành công"));
        setIsJdDialogOpen(false);
        setJdFormData({});
        void refetchAllJds();
      } else {
        toast.error(res.error || t("common.cannotCreateJd", "Không thể tạo JD"));
      }
    } catch {
      toast.error(t("common.cannotCreateJd", "Đã có lỗi xảy ra"));
    } finally {
      setIsSubmittingJd(false);
    }
  };

  const handleSubmitEditJd = async () => {
    if (!editingJd?.id) return;
    try {
      setIsSubmittingJd(true);
      const res = await jobDescriptionManager.update({
        id: editingJd.id,
        title: jdEditFormData.title,
        description: jdEditFormData.description,
        requirements: jdEditFormData.requirements,
        benefits: jdEditFormData.benefits,
        level: jdEditFormData.level,
        salaryMin: jdEditFormData.salaryMin,
        salaryMax: jdEditFormData.salaryMax,
        price: jdEditFormData.price ?? 0,
        currency: jdEditFormData.currency,
        status: jdEditFormData.status,
        deadlineAt: jdEditFormData.deadlineAt,
      });
      if (res.success) {
        toast.success(t("common.updateSuccess", "Cập nhật JD thành công"));
        setIsJdEditDialogOpen(false);
        void refetchAllJds();
      } else {
        toast.error(res.error || t("common.updateFailed", "Cập nhật thất bại"));
      }
    } catch {
      toast.error(t("common.updateFailed", "Cập nhật thất bại"));
    } finally {
      setIsSubmittingJd(false);
    }
  };

  const handleBackFromDetail = () => {
    setSelectedJdId(null);
  };

  const handleToggleCompanyStatus = async (company: Company) => {
    if (!company.id) return;
    try {
      const res = await companyManager.toggleStatus(company.id);
      if (res.success) {
        toast.success(t("common.updateSuccess", "Cập nhật thành công"));
        void refetchCompanies();
      } else {
        toast.error(res.error || t("common.updateFailed", "Cập nhật thất bại"));
      }
    } catch {
      toast.error(t("common.updateFailed", "Cập nhật thất bại"));
    }
  };

  return (
    <div
      className={
        "-m-4 flex min-h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950"
      }>
      {/* Detail Views vs Table List Views */}
      {selectedJd ? (
        <div className="animate-in fade-in slide-in-from-right-8 h-full duration-300">
          <JobDescriptionDetailView
            jobDescription={selectedJd}
            companyName={selectedJdCompany}
            onBack={handleBackFromDetail}
            onEdit={() => {
              void refetchAllJds();
              if (selectedJdId) {
                queryClient.invalidateQueries({
                  queryKey: ["admin", "jd-detail-header", selectedJdId],
                });
              }
              queryClient.invalidateQueries({ queryKey: ["admin", "open-jds"] });
            }}
          />
        </div>
      ) : selectedCompany ? (
        <div className="animate-in fade-in slide-in-from-right-8 h-full duration-300">
          <CompanyGridTab
            companies={companies}
            searchQuery={searchQuery}
            onCompanyUpdate={() => void refetchCompanies()}
            onCreateCompany={handleCreateCompany}
            selectedCompanyId={selectedCompanyId}
            onSelectCompanyId={setSelectedCompanyId}
            selectedJdId={selectedJdId}
            onSelectJdId={setSelectedJdId}
            isAddJdDialogOpen={isJdDialogOpen}
            onAddJdDialogChange={setIsJdDialogOpen}
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
          {/* Stat Summary & Control Card */}
          <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                  {t(
                    "adminCompanymanagement.manageCompaniesDesc",
                    "Quản lý danh sách các công ty đối tác và vị trí tuyển dụng"
                  )}
                </p>
              </div>

              {/* Stats metric badges */}
              <div className="flex items-center justify-center gap-5 sm:gap-6">
                {[
                  [
                    stats.totalCompanies,
                    t("adminCompanymanagement.totalCompanies", "Tổng công ty"),
                  ],
                  [
                    stats.activeCompanies,
                    t("adminCompanymanagement.activeCompanies", "Đang hoạt động"),
                  ],
                  [stats.totalJds, t("adminCompanymanagement.totalJds", "Vị trí JD")],
                ].map(([value, label], index) => (
                  <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
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

            {/* Tab Switcher Pills Row */}
            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("companies");
                  setSelectedCompanyId(null);
                  setSelectedJdId(null);
                }}
                className={`rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-all ${
                  activeTab === "companies"
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600 dark:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}>
                {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("jds");
                  setSelectedCompanyId(null);
                  setSelectedJdId(null);
                }}
                className={`rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-all ${
                  activeTab === "jds"
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600 dark:text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}>
                {t("adminCompanymanagement.jdList", "Danh sách JD")}
              </button>
            </div>

            {/* Search & Control Row */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-4 flex flex-col gap-3 sm:flex-row">
              {/* Search Field (Fixed 100% width consistency across tabs) */}
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <Input
                  type="text"
                  placeholder={
                    activeTab === "companies"
                      ? t(
                          "common.searchByNameOrDescription",
                          "Tìm kiếm theo tên công ty hoặc mô tả..."
                        )
                      : t(
                          "common.searchJdByTitleOrCompany",
                          "Tìm kiếm theo tiêu đề vị trí JD hoặc công ty..."
                        )
                  }
                  value={activeTab === "companies" ? searchQuery : jdSearchQuery}
                  onChange={(e) => {
                    if (activeTab === "companies") {
                      setSearchQuery(e.target.value);
                      companyPagination.goToFirstPage();
                    } else {
                      setJdSearchQuery(e.target.value);
                      jdPagination.goToFirstPage();
                    }
                  }}
                  className="h-[46px] w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                />
              </div>

              <Button
                type="submit"
                className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Search className="mr-2 h-[18px] w-[18px]" />
                {t("common.search", "Tìm kiếm")}
              </Button>

              {/* Action Button (Fixed 165px width to prevent search bar layout shift) */}
              <Button
                type="button"
                onClick={() =>
                  activeTab === "companies" ? handleCreateCompany() : handleOpenCreateJd()
                }
                className="h-[46px] w-[165px] shrink-0 justify-center rounded-xl border border-indigo-600 bg-indigo-600 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                <Plus className="mr-1.5 h-[18px] w-[18px] shrink-0" />
                <span className="truncate">
                  {activeTab === "companies"
                    ? t("adminCompanymanagement.addCompany", "Thêm công ty")
                    : t("adminCompanymanagement.createJd", "Tạo JD mới")}
                </span>
              </Button>
            </form>

            {/* Status Filter Pills Row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                {t("common.status", "Trạng thái")}:
              </span>
              {[
                ["active", t("common.active", "Đang hoạt động")],
                ["inactive", t("common.shutDown", "Đã tắt")],
                ["all", t("common.allStatus", "Tất cả")],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setStatusFilter(value);
                    if (activeTab === "companies") {
                      companyPagination.goToFirstPage();
                    } else {
                      jdPagination.goToFirstPage();
                    }
                  }}
                  className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                    statusFilter === value
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {activeTab === "companies" ? (
              <>
                <CompanyTable
                  companies={pageCompanies}
                  onSelectCompany={(company) => setSelectedCompanyId(company.id!)}
                  onEditCompany={(company, e) => {
                    e.stopPropagation();
                    setFormData({
                      name: company.name,
                      description: company.description,
                      status: company.status as any,
                    });
                    setIsCreateDialogOpen(true);
                  }}
                  onToggleStatus={handleToggleCompanyStatus}
                />
                {filteredCompanies.length > 0 && (
                  <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
                    <PaginationControl
                      pagination={companyPagination}
                      onPageSizeChange={(size) => {
                        setCompanyPageSize(size);
                        companyPagination.goToFirstPage();
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <JobDescriptionTable
                  showCompany={true}
                  jobDescriptions={pageJds}
                  onView={(jd) => setSelectedJdId(jd.id!)}
                  onToggleStatus={async (job) => {
                    try {
                      const res = await jobDescriptionManager.toggleStatus(job.id!);
                      if (res.success) {
                        toast.success(t("common.updateSuccess", "Cập nhật thành công"));
                        void refetchAllJds();
                      } else {
                        toast.error(res.error || t("common.updateFailed", "Cập nhật thất bại"));
                      }
                    } catch {
                      toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                    }
                  }}
                />
                {processedJds.length > 0 && (
                  <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
                    <PaginationControl
                      pagination={jdPagination}
                      onPageSizeChange={(size) => {
                        setJdPageSize(size);
                        jdPagination.goToFirstPage();
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit / Create Company Dialog */}
      <CompanyFormDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitCreate}
        title={t("adminCompanymanagement.addNewPartners")}
        description={t("adminCompanymanagement.addNewPartnerDescription")}
        submitLabel={t("general.save", "Lưu")}
        isSubmitting={isCreating}
      />

      {/* Create / Edit JD Dialog */}
      <JobDescriptionFormDialog
        isOpen={isJdDialogOpen}
        onOpenChange={setIsJdDialogOpen}
        formData={jdFormData}
        onFormChange={setJdFormData}
        onSubmit={handleSubmitCreateJd}
        title={t("adminCompanymanagement.createJdTitle", "Tạo vị trí tuyển dụng (JD)")}
        description={t(
          "adminCompanymanagement.createJdDesc",
          "Nhập thông tin vị trí tuyển dụng mới."
        )}
        isSubmitting={isSubmittingJd}
        companies={companies.map((c) => ({ id: c.id!, name: c.name || "" }))}
        preselectedCompanyId={selectedCompanyId}
      />

      <JobDescriptionFormDialog
        isOpen={isJdEditDialogOpen}
        onOpenChange={setIsJdEditDialogOpen}
        formData={jdEditFormData}
        onFormChange={setJdEditFormData}
        onSubmit={handleSubmitEditJd}
        title={t("adminCompanymanagement.editJdTitle", "Chỉnh sửa vị trí tuyển dụng (JD)")}
        description={t(
          "adminCompanymanagement.editJdDesc",
          "Cập nhật thông tin chi tiết của vị trí tuyển dụng."
        )}
        isSubmitting={isSubmittingJd}
      />
    </div>
  );
}
