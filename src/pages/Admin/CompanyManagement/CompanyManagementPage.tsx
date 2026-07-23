import { PaginationControl } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { extractDataArray } from "@/lib/utils";
import { adminApplicationManager, companyManager, jobDescriptionManager } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Building2, ChevronRight, Folder, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CompanyFormDialog,
  JobDescriptionDetailView,
  JobDescriptionFormDialog,
  JobDescriptionTable,
} from "./components";
import { CompanyGridTab } from "./components/CompanyGridTab";
import type { Company, CompanyFormData, JobDescription, JobDescriptionFormData } from "./types";

export function CompanyManagementPage() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("companies");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({});
  const [isCreating, setIsCreating] = useState(false);

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedJdId, setSelectedJdId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // JD Tab states
  const [jdSearchQuery, setJdSearchQuery] = useState("");
  const [jdDetailTab, setJdDetailTab] = useState<string>("process");
  const [jdApplicationsCount, setJdApplicationsCount] = useState<number>(0);
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [isJdDialogOpen, setIsJdDialogOpen] = useState(false);
  const [isJdEditDialogOpen, setIsJdEditDialogOpen] = useState(false);
  const [jdFormData, setJdFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [jdEditFormData, setJdEditFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [isSubmittingJd, setIsSubmittingJd] = useState(false);

  // Pagination for JDs tab
  const [jdPageSize] = useHybridPageSize({
    key: "src_pages_admin_companymanagement_jd_pagesize",
    defaultPageSize: 10,
  });

  // Fetch Companies
  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const response = await companyManager.getAll();
      if (response.success) {
        return extractDataArray<Company>(response);
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
        return extractDataArray<JobDescription>(response);
      }
      return [];
    },
    enabled: activeTab === "jds",
  });

  // Fetch open-jds stats to get live totalApplications & company info
  const { data: openJds = [] } = useQuery({
    queryKey: ["admin", "open-jds"],
    queryFn: async () => {
      const res = await adminApplicationManager.getOpenJds();
      return res.success && res.data ? res.data : [];
    },
  });

  const processedJds = useMemo(() => {
    let result = allJds.map((jd) => {
      const openJdInfo = openJds.find((o) => (o.jdId || o.id) === jd.id);
      const company = companies.find(
        (c) =>
          c.jobDescriptions?.some((j) => j.id === jd.id) ||
          c.id === (jd as any).companyId ||
          c.id === (jd as any).company?.id ||
          (openJdInfo?.companyId && c.id === openJdInfo.companyId)
      );

      return {
        ...jd,
        companyName: company?.name || openJdInfo?.companyName || (jd as any).company?.name || (jd as any).companyName,
        companyLogoUrl: company?.logoUrl || openJdInfo?.company?.logoUrl || (jd as any).company?.logoUrl || (jd as any).companyLogo,
        applicationCount: openJdInfo?.statistics?.totalApplications ?? (jd as any).statistics?.totalApplications ?? (jd as any).totalApplications ?? (jd as any).applicationCount ?? (jd as any).applicationsCount ?? jd.applications?.length ?? 0,
      };
    });

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
  }, [allJds, companies, openJds, jdSearchQuery]);

  const jdPagination = usePagination({
    totalCount: processedJds.length,
    pageSize: jdPageSize,
  });

  const pageJds = useMemo(() => {
    return processedJds.slice(jdPagination.startIndex, jdPagination.endIndex + 1);
  }, [processedJds, jdPagination.startIndex, jdPagination.endIndex]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  const selectedJd = useMemo(() => {
    if (!selectedJdId) return null;
    return processedJds.find((j) => j.id === selectedJdId) || (allJds.find((j) => j.id === selectedJdId) as JobDescription);
  }, [selectedJdId, processedJds, allJds]);

  const selectedJdCompany = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (selectedJd as any)?.companyName || selectedCompany?.name;
  }, [selectedJd, selectedCompany]);

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
        name: formData.name,
        description: formData.description,
        status: formData.status || "ACTIVE",
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
    });
    if (companyId) {
      setSelectedCompanyId(companyId);
    }
    setIsJdDialogOpen(true);
  };

  const handleSubmitCreateJd = async () => {
    try {
      setIsSubmittingJd(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetCompanyId = selectedCompanyId || (jdFormData as any).companyId;
      if (!targetCompanyId) {
        toast.error("Vui lòng chọn công ty cho vị trí tuyển dụng này");
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

  const handleOpenEditJd = (jd: JobDescription) => {
    setEditingJd(jd);
    setJdEditFormData({
      title: jd.title,
      description: jd.description,
      requirements: jd.requirements,
      benefits: jd.benefits,
      level: jd.level,
      salaryMin: jd.salaryMin,
      salaryMax: jd.salaryMax,
      currency: jd.currency,
      status: jd.status,
      deadlineAt: jd.deadlineAt,
    });
    setIsJdEditDialogOpen(true);
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
        currency: jdEditFormData.currency,
        status: jdEditFormData.status,
        deadlineAt: jdEditFormData.deadlineAt,
      });
      if (res.success) {
        toast.success(t("common.updateSuccess", "Cập nhật JD thành công"));
        setIsJdEditDialogOpen(false);
        setEditingJd(null);
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

  return (
    <Tabs
      value={activeTab}
      onValueChange={(tab) => {
        setActiveTab(tab);
        setSelectedJdId(null);
        setSelectedCompanyId(null);
      }}
      className="-m-4 flex h-[calc(100%+32px)] flex-col md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)]">
      {/* Unified Single Hierarchical Header */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {selectedJd ? (
            /* Mode 3: Inside a specific JD detail view (Sleek 1-line breadcrumb & title) */
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedJdId(null);
                  setSelectedCompanyId(null);
                }}
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {selectedJdCompany && (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedJdId(null)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{selectedJdCompany}</span>
                  </button>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </>
              )}
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {selectedJd.title}
              </h1>
              <Badge
                className={
                  selectedJd.status === "OPEN"
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }>
                {selectedJd.status}
              </Badge>
              {selectedJd.level && <Badge variant="outline">{selectedJd.level}</Badge>}
            </div>
          ) : selectedCompany ? (
            /* Mode 2: Inside a specific Company's JD list view */
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setSelectedCompanyId(null)}
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <div className="flex items-center gap-1.5 rounded-lg bg-indigo-50/80 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                <span>{selectedCompany.name}</span>
              </div>
            </div>
          ) : (
            /* Mode 1: Root Management view (WITHOUT ICON) */
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "adminCompanymanagement.manageCompaniesDesc",
                  "Quản lý danh sách các công ty và thông tin tuyển dụng."
                )}
              </p>
            </div>
          )}
        </div>

        {/* Header Right Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {selectedJd ? (
            <>
              <Tabs value={jdDetailTab} onValueChange={setJdDetailTab}>
                <TabsList className="h-8 bg-slate-100 dark:bg-slate-800">
                  <TabsTrigger value="process" className="text-xs font-semibold gap-1.5 h-7">
                    <Briefcase className="h-3.5 w-3.5" />
                    Quy trình & Thông tin JD
                  </TabsTrigger>
                  <TabsTrigger value="applications" className="text-xs font-semibold gap-1.5 h-7">
                    <Users className="h-3.5 w-3.5" />
                    Đơn ứng tuyển ({jdApplicationsCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEditJd(selectedJd)}
                className="h-8 text-xs font-semibold">
                {t("general.edit", "Chỉnh sửa")}
              </Button>
            </>
          ) : selectedCompany ? (
            <Button
              size="sm"
              onClick={() => handleOpenCreateJd(selectedCompany.id)}
              className="h-8 gap-1.5 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs">
              <Plus className="h-3.5 w-3.5" />
              {t("adminCompanymanagement.addJd", "Thêm JD")}
            </Button>
          ) : (
            <>
              <TabsList className="h-8">
                <TabsTrigger value="companies" className="text-xs">
                  {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
                </TabsTrigger>
                <TabsTrigger value="jds" className="text-xs">
                  {t("adminCompanymanagement.jdList", "Danh sách JD")}
                </TabsTrigger>
              </TabsList>

              {activeTab === "companies" ? (
                <>
                  <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                  <div className="relative">
                    <Search className="absolute top-2 left-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder={t("common.search")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 w-full pl-9 text-xs sm:w-64"
                    />
                  </div>
                  <Button
                    onClick={handleCreateCompany}
                    className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("adminCompanymanagement.addCompany", "Thêm công ty")}
                  </Button>
                </>
              ) : (
                <>
                  <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
                  <div className="relative w-64">
                    <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={jdSearchQuery}
                      onChange={(e) => {
                        setJdSearchQuery(e.target.value);
                        jdPagination.goToFirstPage();
                      }}
                      placeholder={t("common.search")}
                      className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
                    />
                  </div>
                  <Button
                    onClick={() => handleOpenCreateJd()}
                    className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("adminCompanymanagement.createJd", "Tạo JD mới")}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        <TabsContent value="jds" className="m-0 h-full">
          {selectedJd ? (
            <JobDescriptionDetailView
              jobDescription={selectedJd}
              companyName={selectedJdCompany}
              onBack={handleBackFromDetail}
              onEdit={(jd) => handleOpenEditJd(jd)}
              activeTab={jdDetailTab}
              onApplicationsCountChange={setJdApplicationsCount}
            />
          ) : (
            <div className="flex h-full flex-col">
              {jdSearchQuery && (
                <div className="mb-3 flex flex-none items-center gap-2 px-6 pt-4">
                  <span className="text-xs text-slate-500">
                    Hiển thị{" "}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {processedJds.length}
                    </strong>{" "}
                    / <strong>{allJds.length}</strong> kết quả
                  </span>
                  <button
                    onClick={() => setJdSearchQuery("")}
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    Xóa bộ lọc
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-auto">
                <JobDescriptionTable
                  showCompany={true}
                  jobDescriptions={pageJds}
                  onView={(jd) => setSelectedJdId(jd.id!)}
                  onToggleStatus={async (job, nextStatus) => {
                    try {
                      const res = await jobDescriptionManager.update({
                        id: job.id,
                        status: nextStatus,
                      });
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
              </div>
              <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                <PaginationControl pagination={jdPagination} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="companies" className="m-0 h-full">
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
            jdDetailTab={jdDetailTab}
            onApplicationsCountChange={setJdApplicationsCount}
          />
        </TabsContent>
      </div>

      {/* Edit Company Dialog */}
      <CompanyFormDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitCreate}
        title={t("adminCompanymanagement.addNewPartners")}
        description={t("adminCompanymanagement.addNewPartnerDescription")}
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
        description={t("adminCompanymanagement.createJdDesc", "Nhập thông tin vị trí tuyển dụng mới.")}
        isSubmitting={isSubmittingJd}
      />

      <JobDescriptionFormDialog
        isOpen={isJdEditDialogOpen}
        onOpenChange={setIsJdEditDialogOpen}
        formData={jdEditFormData}
        onFormChange={setJdEditFormData}
        onSubmit={handleSubmitEditJd}
        title={t("adminCompanymanagement.editJdTitle", "Chỉnh sửa vị trí tuyển dụng (JD)")}
        description={t("adminCompanymanagement.editJdDesc", "Cập nhật thông tin chi tiết của vị trí tuyển dụng.")}
        isSubmitting={isSubmittingJd}
      />
    </Tabs>
  );
}
