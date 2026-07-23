import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { extractDataArray } from "@/lib/utils";
import { companyManager, jobDescriptionManager } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
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

  const [selectedJdId, setSelectedJdId] = useState<number | null>(null);
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [isJdEditDialogOpen, setIsJdEditDialogOpen] = useState(false);
  const [jdEditFormData, setJdEditFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [isSubmittingJd, setIsSubmittingJd] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [jdSearchQuery, setJdSearchQuery] = useState("");
  const [jdPageSize, setJdPageSize] = useHybridPageSize({
    key: "src_pages_admin_companymanagement_jd_pagesize",
    defaultPageSize: 10,
  });

  // Fetch all companies
  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: async () => {
      const response = await companyManager.getAll();
      if (response.success) {
        // @ts-expect-error: Schema type mismatch between frontend and backend
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

  const processedJds = useMemo(() => {
    let result = allJds.map((jd) => {
      const company = companies.find((c) => c.jobDescriptions?.some((j) => j.id === jd.id));
      return {
        ...jd,
        companyName: company?.name,
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
  }, [allJds, companies, jdSearchQuery]);

  const jdPagination = usePagination({
    totalCount: processedJds.length,
    pageSize: jdPageSize,
  });

  const pageJds = useMemo(() => {
    return processedJds.slice(jdPagination.startIndex, jdPagination.endIndex + 1);
  }, [processedJds, jdPagination.startIndex, jdPagination.endIndex]);

  const handleCreateCompany = () => {
    setFormData({
      status: "ACTIVE",
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmitCreate = async () => {
    try {
      setIsCreating(true);
      const response = await companyManager.create({
        data: {
          name: formData.name?.trim() || undefined,
          description: formData.description?.trim() || undefined,
          status: formData.status,
        },
        logo: formData.logo,
        banner: formData.banner,
      });
      if (response.success) {
        toast.success(t("adminCompanymanagement.successfullyCreatedCompany"));
        setIsCreateDialogOpen(false);
        void refetchCompanies();
      } else {
        toast.error(response.error || t("common.cannotCreateCompany"));
      }
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error(t("common.cannotCreateCompany"));
    } finally {
      setIsCreating(false);
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

  const handleJdEditSubmit = async () => {
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

  const selectedJd = selectedJdId ? allJds.find((j) => j.id === selectedJdId) : null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(tab) => {
        setActiveTab(tab);
        setSelectedJdId(null);
      }}
      className="-m-4 flex h-[calc(100%+32px)] flex-col md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)]">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t(
                "adminCompanymanagement.manageCompaniesDesc",
                "Quản lý danh sách các công ty và thông tin tuyển dụng."
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TabsList className="h-8">
            <TabsTrigger value="companies" className="text-xs">
              {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
            </TabsTrigger>
            <TabsTrigger value="jds" className="text-xs">
              {t("adminCompanymanagement.jdList", "Danh sách JD")}
            </TabsTrigger>
          </TabsList>

          {activeTab === "companies" && (
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
                className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("adminCompanymanagement.addCompany", "Thêm công ty")}
              </Button>
            </>
          )}

          {activeTab === "jds" && (
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
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
        <TabsContent value="jds" className="m-0 h-full">
          {selectedJd ? (
            <JobDescriptionDetailView
              jobDescription={selectedJd}
              onBack={() => setSelectedJdId(null)}
              onEdit={(jd) => handleOpenEditJd(jd)}
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
                        toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                      }
                    } catch {
                      toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                    }
                  }}
                />
              </div>
              {processedJds.length > 0 && (
                <div className="flex flex-none items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                  <PaginationControl
                    pagination={jdPagination}
                    onPageSizeChange={(size) => {
                      setJdPageSize(size);
                      jdPagination.goToFirstPage();
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="companies" className="m-0 h-full">
          <CompanyGridTab
            companies={companies}
            searchQuery={searchQuery}
            onCompanyUpdate={() => void refetchCompanies()}
            onCreateCompany={handleCreateCompany}
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
        description={t("adminCompanymanagement.fillInBasicInformationTo")}
        submitLabel={t("adminCompanymanagement.createPartners")}
        isSubmitting={isCreating}
      />

      {/* Edit JD Dialog (Global) */}
      <JobDescriptionFormDialog
        isOpen={isJdEditDialogOpen}
        onOpenChange={setIsJdEditDialogOpen}
        formData={jdEditFormData}
        onFormChange={(data) => setJdEditFormData((prev) => ({ ...prev, ...data }))}
        onSubmit={handleJdEditSubmit}
        title={t("adminCompanymanagement.editJd", "Chỉnh sửa Job Description")}
        description={t(
          "adminCompanymanagement.editJdDescription",
          "Cập nhật thông tin Job Description."
        )}
        submitLabel={
          isSubmittingJd
            ? t("common.processing", "Đang xử lý...")
            : t("common.save", "Lưu thay đổi")
        }
      />
    </Tabs>
  );
}
