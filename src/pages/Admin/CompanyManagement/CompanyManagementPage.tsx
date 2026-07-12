import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractDataArray } from "@/lib/utils";
import { companyManager, jobDescriptionManager } from "@/services";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CompanyFormDialog, JobDescriptionDetailView, JobDescriptionTable } from "./components";
import { CompanyGridTab } from "./components/CompanyGridTab";
import type { Company, CompanyFormData, JobDescription } from "./types";

export function CompanyManagementPage() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("companies");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({});
  const [isCreating, setIsCreating] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<number | null>(null);

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
  const { data: allJds = [] } = useQuery({
    queryKey: ["admin", "all-jds"],
    queryFn: async () => {
      const response = await jobDescriptionManager.getAll();
      if (response.success) {
        // @ts-expect-error: Schema mismatch
        return extractDataArray<JobDescription>(response);
      }
      return [];
    },
    enabled: activeTab === "jds",
  });

  const jdsWithCompany = useMemo(() => {
    return allJds.map((jd) => {
      const company = companies.find((c) => c.jobDescriptions?.some((j) => j.id === jd.id));
      return {
        ...jd,
        companyName: company?.name,
      };
    });
  }, [allJds, companies]);

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

  const selectedJd = selectedJdId ? allJds.find((j) => j.id === selectedJdId) : null;

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="-m-4 flex h-[calc(100%+32px)] flex-col md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)]">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
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
              <Button
                onClick={handleCreateCompany}
                className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("adminCompanymanagement.addCompany", "Thêm công ty")}
              </Button>
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
              onEdit={() =>
                toast.info(t("common.featureUnderDevelopment", "Tính năng đang phát triển"))
              }
            />
          ) : (
            <JobDescriptionTable
              showCompany={true}
              jobDescriptions={jdsWithCompany}
              onView={(jd) => setSelectedJdId(jd.id!)}
              onToggleStatus={async (job, nextStatus) => {
                try {
                  // @ts-expect-error partial update
                  const res = await jobDescriptionManager.update({
                    id: job.id,
                    status: nextStatus,
                  });
                  if (res.success) {
                    toast.success(t("common.updateSuccess", "Cập nhật thành công"));
                  } else {
                    toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                  }
                } catch {
                  toast.error(t("common.updateFailed", "Cập nhật thất bại"));
                }
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="companies" className="m-0 h-full">
          <CompanyGridTab
            companies={companies}
            onCompanyUpdate={() => void refetchCompanies()}
            onCreateCompany={handleCreateCompany}
          />
        </TabsContent>
      </div>

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
    </Tabs>
  );
}
