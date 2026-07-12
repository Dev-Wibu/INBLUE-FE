import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { extractDataArray } from "@/lib/utils";
import { companyManager, jobDescriptionManager } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Edit, Folder, Plus, Search, Trash2 } from "lucide-react";
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
import { CompanyDeleteDialog } from "./CompanyDeleteDialog";
import { CompanyFormDialog } from "./CompanyFormDialog";
import { JobDescriptionDetailView } from "./JobDescriptionDetailView";
import { JobDescriptionFormDialog } from "./JobDescriptionFormDialog";
import { JobDescriptionTable } from "./JobDescriptionTable";

interface CompanyGridTabProps {
  companies: Company[];
  onCompanyUpdate?: () => void;
  onCreateCompany: () => void;
}

export function CompanyGridTab({
  companies,
  onCompanyUpdate,
  onCreateCompany,
}: CompanyGridTabProps) {
  const { t } = useTranslation();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({});

  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const queryClient = useQueryClient();

  // Drill-down JD Viewer
  const [selectedJdId, setSelectedJdId] = useState<number | null>(null);
  const [isJdDialogOpen, setIsJdDialogOpen] = useState(false);
  const [jdFormData, setJdFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [isCreatingJd, setIsCreatingJd] = useState(false);

  const handleJdSubmit = async () => {
    if (!selectedCompanyId) return;
    try {
      setIsCreatingJd(true);
      const data: CreateJobDescriptionRequest = {
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
        companyId: selectedCompanyId,
      };
      const res = await jobDescriptionManager.create(data);
      if (res.success) {
        toast.success(t("adminCompanymanagement.successfullyCreatedJd", "Thêm JD thành công"));
        setIsJdDialogOpen(false);
        setJdFormData({});
        queryClient.invalidateQueries({
          queryKey: ["admin", "companies", selectedCompanyId, "jds"],
        });
      } else {
        toast.error(res.error || t("common.cannotCreateJd", "Không thể thêm JD"));
      }
    } catch {
      toast.error(t("common.cannotCreateJd", "Không thể thêm JD"));
    } finally {
      setIsCreatingJd(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const lowerQuery = searchQuery.toLowerCase();
    return companies.filter((c) => c.name?.toLowerCase().includes(lowerQuery));
  }, [companies, searchQuery]);

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId);
  }, [companies, selectedCompanyId]);

  // Fetch JDs for the selected company
  const { data: companyJds = [] } = useQuery({
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

  const selectedJd = useMemo(() => {
    return selectedJdId ? companyJds.find((j) => j.id === selectedJdId) : null;
  }, [selectedJdId, companyJds]);

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

  const handleDeleteClick = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCompany(company);
    setIsDeleteOpen(true);
  };

  const handleSaveEdit = async () => {
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

  const handleDeleteConfirm = async () => {
    if (!deletingCompany?.id) return;
    try {
      setIsSubmitting(true);
      const res = await companyManager.delete(deletingCompany.id);
      if (res.success) {
        toast.success(
          t("adminCompanymanagement.successfullyDeletedCompany", "Xóa công ty thành công")
        );
        setIsDeleteOpen(false);
        onCompanyUpdate?.();
      } else {
        toast.error(res.error || t("common.cannotDeleteCompany", "Không thể xóa công ty"));
      }
    } catch {
      toast.error(t("common.cannotDeleteCompany", "Không thể xóa công ty"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Drill-down mode
  if (selectedCompany !== undefined && selectedCompany !== null) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 flex h-full flex-col duration-300">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                if (selectedJdId) setSelectedJdId(null);
                else setSelectedCompanyId(null);
              }}
              className="h-8 gap-1.5 px-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <ArrowLeft className="h-4 w-4" />
              {t("common.back", "Quay lại")}
            </Button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
              <Folder className="h-3.5 w-3.5" />
              {selectedCompany.name}
            </div>
          </div>
          {!selectedJdId && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setJdFormData({ status: "OPEN" });
                  setIsJdDialogOpen(true);
                }}
                className="h-8 gap-1.5">
                <Plus className="h-4 w-4" />
                {t("adminCompanymanagement.addJd", "Thêm JD")}
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          {selectedJd ? (
            <JobDescriptionDetailView
              jobDescription={selectedJd}
              onBack={() => setSelectedJdId(null)}
              onEdit={() =>
                toast.info(t("common.featureUnderDevelopment", "Tính năng đang phát triển"))
              }
            />
          ) : companyJds.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <Folder className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                Chưa có thông tin tuyển dụng (JD) nào của công ty này.
              </p>
            </div>
          ) : (
            <div>
              <JobDescriptionTable
                jobDescriptions={companyJds}
                onView={(jd) => setSelectedJdId(jd.id!)}
                onToggleStatus={async (job, nextStatus) => {
                  try {
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
            </div>
          )}
        </div>

        <JobDescriptionFormDialog
          isOpen={isJdDialogOpen}
          onOpenChange={setIsJdDialogOpen}
          formData={jdFormData}
          onFormChange={(data) => setJdFormData((prev) => ({ ...prev, ...data }))}
          onSubmit={handleJdSubmit}
          title={t("adminCompanymanagement.createJd", "Tạo Job Description")}
          description={t(
            "adminCompanymanagement.createJdDescription",
            "Điền thông tin để tạo Job Description mới."
          )}
          submitLabel={
            isCreatingJd ? t("common.processing", "Đang xử lý...") : t("common.create", "Tạo mới")
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in flex h-full flex-col p-4 duration-300 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("adminCompanymanagement.companyManagement", "Quản lý công ty")}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t(
              "adminCompanymanagement.manageCompaniesDesc",
              "Quản lý danh sách các công ty và thông tin tuyển dụng."
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            onClick={() => setSelectedCompanyId(company.id!)}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50">
            {/* Edit / Delete Buttons */}
            <div className="absolute top-2 right-2 z-10 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                onClick={(e) => handleEditClick(company, e)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                onClick={(e) => handleDeleteClick(company, e)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 overflow-hidden pt-1">
                <h3 className="truncate pr-12 font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                  {company.name}
                </h3>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      company.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}>
                    {company.status === "ACTIVE"
                      ? t("common.active", "Hoạt động")
                      : t("common.inactive", "Ngừng hoạt động")}
                  </span>
                </div>
              </div>
            </div>
            {company.description && (
              <p className="mt-4 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                {company.description}
              </p>
            )}
          </div>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            {searchQuery
              ? t("common.noResultsFound")
              : t("adminCompanymanagement.noCompaniesAvailable")}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {searchQuery
              ? t("common.tryAdjustingYourSearch")
              : t("adminCompanymanagement.clickAddCompanyToCreate")}
          </p>
          {!searchQuery && (
            <Button onClick={onCreateCompany} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              {t("adminCompanymanagement.addCompany", "Thêm công ty")}
            </Button>
          )}
        </div>
      )}

      {/* Edit / Delete Dialogs */}
      <CompanyFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSaveEdit}
        title={t("adminCompanymanagement.editCompanyInfo", "Chỉnh sửa thông tin công ty")}
        description={t(
          "adminCompanymanagement.updateInfoOfPartner",
          "Cập nhật các thông tin của công ty đối tác"
        )}
        submitLabel={t("common.save", "Lưu thay đổi")}
        isSubmitting={isSubmitting}
      />

      <CompanyDeleteDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        company={deletingCompany}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
