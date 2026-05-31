import { PaginationControl, ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { extractDataArray } from "@/lib/utils";
import { questionMajorManager } from "@/services";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  DeleteQuestionMajorDialog,
  QuestionMajorFormDialog,
  QuestionMajorTable,
} from "./components";
import type { Major, MajorFormData } from "./types";
type SortableMajor = Major & {
  idSortValue: number;
  nameSortValue: string;
  descriptionSortValue: string;
};
export function QuestionMajorManagementPage() {
  const { t } = useTranslation();
  const [majors, setMajors] = useState<Major[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [formData, setFormData] = useState<Partial<MajorFormData>>({});

  // Load majors using the question major manager service
  const loadMajors = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }
      try {
        const response = await questionMajorManager.getAll();
        if (response.success) {
          setMajors(extractDataArray<Major>(response));
        } else {
          toast.error(response.error || t("adminQuestionmajormanagement.unableToLoadMajorList"));
        }
      } catch (error) {
        console.error("Error loading majors:", error);
        toast.error(t("adminQuestionmajormanagement.unableToLoadMajorList"));
      } finally {
        if (showReloading) {
          setIsReloading(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [t]
  );
  useEffect(() => {
    void loadMajors();
  }, [loadMajors]);

  // Filter majors based on search query
  const filteredMajors = useMemo(() => {
    return majors.filter((major) => {
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        major.majorName?.toLowerCase().includes(lowerQuery) ||
        major.description?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [majors, searchQuery]);
  const sortableMajors = useMemo<SortableMajor[]>(() => {
    return filteredMajors.map((major) => ({
      ...major,
      idSortValue: typeof major.id === "number" ? major.id : 0,
      nameSortValue: major.majorName?.toLowerCase() || "",
      descriptionSortValue: major.description?.toLowerCase() || "",
    }));
  }, [filteredMajors]);
  const { sortedData, getSortProps } = useSortable(sortableMajors, {
    defaultSort: {
      key: "idSortValue",
      direction: "desc",
    },
    noSortBehavior: "preserve",
    tieBreaker: {
      key: "idSortValue",
      direction: "desc",
    },
  });
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_questionmajormanagement_questionmajormanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });
  const pageData = useMemo(
    () => sortedData.slice(pagination.startIndex, pagination.endIndex + 1),
    [pagination.endIndex, pagination.startIndex, sortedData]
  );
  const handleCreate = () => {
    setFormData({});
    setIsCreateDialogOpen(true);
  };
  const handleEdit = (major: Major) => {
    setSelectedMajor(major);
    setFormData({
      majorName: major.majorName || "",
      description: major.description,
    });
    setIsEditDialogOpen(true);
  };
  const handleDelete = (major: Major) => {
    setSelectedMajor(major);
    setIsDeleteDialogOpen(true);
  };
  const handleSubmitCreate = async () => {
    try {
      const response = await questionMajorManager.create(formData);
      if (response.success) {
        toast.success(t("adminQuestionmajormanagement.successfullyCreatedMajor"));
        setIsCreateDialogOpen(false);
        void loadMajors(); // Refresh the list
      } else {
        toast.error(response.error || t("adminQuestionmajormanagement.cannotCreateMajor"));
      }
    } catch (error) {
      console.error("Error creating major:", error);
      toast.error(t("adminQuestionmajormanagement.cannotCreateMajor"));
    }
  };
  const handleSubmitEdit = async () => {
    if (!selectedMajor?.id) return;
    try {
      const response = await questionMajorManager.update(selectedMajor.id, formData);
      if (response.success) {
        toast.success(t("adminQuestionmajormanagement.majorUpdatedSuccessfully"));
        setIsEditDialogOpen(false);
        void loadMajors(); // Refresh the list
      } else {
        toast.error(response.error || t("adminQuestionmajormanagement.unableToUpdateMajors"));
      }
    } catch (error) {
      console.error("Error updating major:", error);
      toast.error(t("adminQuestionmajormanagement.unableToUpdateMajors"));
    }
  };
  const handleConfirmDelete = async () => {
    if (!selectedMajor?.id) return;
    try {
      const response = await questionMajorManager.delete(selectedMajor.id);
      if (response.success) {
        toast.success(t("adminQuestionmajormanagement.deletedMajorSuccessfully"));
        setIsDeleteDialogOpen(false);
        void loadMajors(); // Refresh the list
      } else {
        toast.error(response.error || t("adminQuestionmajormanagement.majorsCannotBeDeleted"));
      }
    } catch (error) {
      console.error("Error deleting major:", error);
      toast.error(t("adminQuestionmajormanagement.majorsCannotBeDeleted"));
    }
  };
  return (
    <div className="min-h-screen bg-white p-8 dark:bg-slate-950">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 font-['Inter'] text-3xl font-bold text-zinc-800 dark:text-white">
          {t("adminQuestionmajormanagement.specializedManagement")}
        </h1>
        <p className="font-['Inter'] text-base text-gray-600 dark:text-slate-400">
          {t("adminQuestionmajormanagement.manageMajorsForInterviewQuestions")}
        </p>
      </div>

      {/* Action Bar */}
      <div className="mb-6 grid gap-3 xl:grid-cols-[1fr_auto]">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute top-3 left-3 h-4 w-4 text-gray-500 dark:text-slate-400" />
          <Input
            type="text"
            placeholder={t("common.searchByNameOrDescription")}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              pagination.goToFirstPage();
            }}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                pagination.goToFirstPage();
              }}>
              {t("common.clearFilter")}
            </Button>
          )}
          <ReloadButton
            onReload={() => loadMajors(true)}
            isLoading={isReloading}
            tooltip={t("adminQuestionmajormanagement.reloadTheListOfMajors")}
            showLabel
            hideTooltip
          />
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("adminQuestionmajormanagement.addSpecialization")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isInitialLoading ? (
          <SpinnerBlock size="lg" label={t("adminQuestionmajormanagement.loadingListOfMajors")} />
        ) : (
          <>
            <QuestionMajorTable
              majors={pageData}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getSortProps={getSortProps}
            />

            {sortedData.length > 0 && (
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(nextPageSize) => {
                  setPageSize(nextPageSize);
                  pagination.goToFirstPage();
                }}
              />
            )}

            {/* Empty State with Clear Search */}
            {sortedData.length === 0 && searchQuery && (
              <div className="flex justify-center pb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    pagination.goToFirstPage();
                  }}>
                  {t("common.clearFilter")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <QuestionMajorFormDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitCreate}
        title={t("adminQuestionmajormanagement.addNewSpecialization")}
        description={t("adminQuestionmajormanagement.fillInTheInformationTo")}
        submitLabel={t("adminQuestionmajormanagement.createNew")}
      />

      {/* Edit Dialog */}
      <QuestionMajorFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitEdit}
        title={t("adminQuestionmajormanagement.specializedEditing")}
        description={t("adminQuestionmajormanagement.updateSpecializedInformation")}
        submitLabel={t("common.saveChanges")}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteQuestionMajorDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        major={selectedMajor}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
