import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { extractDataArray } from "@/lib/utils";
import { companyManager, jobDescriptionManager } from "@/services";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Folder, Plus } from "lucide-react";
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
import { CompanyTable } from "./CompanyTable";
import { JobDescriptionDetailView } from "./JobDescriptionDetailView";
import { JobDescriptionFormDialog } from "./JobDescriptionFormDialog";
import { JobDescriptionTable } from "./JobDescriptionTable";

interface CompanyGridTabProps {
  companies: Company[];
  searchQuery: string;
  onCompanyUpdate?: () => void;
  onCreateCompany: () => void;
}

export function CompanyGridTab({ companies, searchQuery, onCompanyUpdate }: CompanyGridTabProps) {
  const { t } = useTranslation();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Edit/Delete Company states
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({});

  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const queryClient = useQueryClient();

  // JD states (Create/Edit)
  const [selectedJdId, setSelectedJdId] = useState<number | null>(null);
  const [editingJd, setEditingJd] = useState<JobDescription | null>(null);
  const [isJdDialogOpen, setIsJdDialogOpen] = useState(false);
  const [jdFormData, setJdFormData] = useState<Partial<JobDescriptionFormData>>({});
  const [isSubmittingJd, setIsSubmittingJd] = useState(false);

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

  const handleToggleCompanyStatus = async (company: Company, nextStatus: "ACTIVE" | "INACTIVE") => {
    if (!company.id) return;
    try {
      const res = await companyManager.update({
        data: {
          id: company.id,
          status: nextStatus,
        },
      });
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

  // Open JD creation form
  const handleOpenAddJd = () => {
    setEditingJd(null);
    setJdFormData({ status: "OPEN" });
    setIsJdDialogOpen(true);
  };

  // Open JD edit form
  const handleOpenEditJd = (jd: JobDescription) => {
    setEditingJd(jd);
    setJdFormData({
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
    setIsJdDialogOpen(true);
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
        {!selectedJdId && (
          <div className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCompanyId(null)}
                className="h-8 gap-1.5 px-2 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                <ArrowLeft className="h-4 w-4" />
                {t("common.back", "Quay lại")}
              </Button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <Folder className="h-3.5 w-3.5 text-slate-500" />
                {selectedCompany.name}
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleOpenAddJd}
              className="h-8 gap-1.5 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" />
              {t("adminCompanymanagement.addJd", "Thêm JD")}
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          {selectedJd ? (
            <JobDescriptionDetailView
              jobDescription={selectedJd}
              onBack={() => setSelectedJdId(null)}
              onEdit={(jd) => handleOpenEditJd(jd)}
            />
          ) : (
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
            Hiển thị{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {filteredCompanies.length}
            </strong>{" "}
            / <strong>{companies.length}</strong> kết quả
          </span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <CompanyTable
          companies={pageCompanies}
          onSelectCompany={(company) => setSelectedCompanyId(company.id!)}
          onEditCompany={handleEditClick}
          onDeleteCompany={handleDeleteClick}
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

      {/* Edit / Delete Dialogs */}
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

      <CompanyDeleteDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        company={deletingCompany}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
