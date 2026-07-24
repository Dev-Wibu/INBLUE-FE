/* eslint-disable @typescript-eslint/no-explicit-any */
import { PaginationControl, ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { mentorManager } from "@/services";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MentorDetailView, MentorEditForm, MentorTable } from "./components";
import type { Mentor, MentorFormData } from "./types";
export function MentorManagementPage() {
  const { t } = useTranslation();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // Default to show only active mentors
  const [viewMode, setViewMode] = useState<"list" | "detail" | "create">("list");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [formData, setFormData] = useState<Partial<MentorFormData>>({});

  // Load mentors using the mentor manager service
  const loadMentors = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }
      try {
        const response = await mentorManager.getAll();
        if (response.success && response.data) {
          // Handle both paginated and array responses
          const mentorData = Array.isArray(response.data) ? response.data : response.data.data;
          setMentors(mentorData as Mentor[]);
        } else {
          toast.error(response.error || t("common.unableToLoadMentorList"));
        }
      } catch (error) {
        console.error("Error loading mentors:", error);
        toast.error(t("common.unableToLoadMentorList"));
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
    void loadMentors();
  }, [loadMentors]);

  // Filter mentors based on search query and status filter
  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
      // Filter by status (active/inactive/all)
      if (statusFilter === "active" && mentor.active === false) {
        return false;
      }
      if (statusFilter === "inactive" && mentor.active !== false) {
        return false;
      }
      if (!searchQuery) return true;
      const lowerQuery = searchQuery.toLowerCase();
      return (
        mentor.name?.toLowerCase().includes(lowerQuery) ||
        mentor.email?.toLowerCase().includes(lowerQuery) ||
        mentor.expertise?.toLowerCase().includes(lowerQuery) ||
        mentor.currentCompany?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [mentors, statusFilter, searchQuery]);

  // Sorting
  const { sortedData, getSortProps } = useSortable(filteredMentors);

  // Pagination

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_mentormanagement_mentormanagementpage_tsx_pagesize",
    defaultPageSize: 10,
  });
  const pagination = usePagination({
    totalCount: sortedData.length,
    pageSize,
  });

  // Get current page data
  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);
  const handleCreate = () => {
    setFormData({});
    setViewMode("create");
  };
  const handleViewDetail = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setFormData({
      name: mentor.name || "",
      email: mentor.email || "",
      password: mentor.password || "",
      bio: mentor.bio,
      expertise: mentor.expertise,
      yearsOfExperience: mentor.yearsOfExperience,
      linkedInUrl: mentor.linkedInUrl,
      currentCompany: mentor.currentCompany,
      pricePerMinute: mentor.pricePerMinute,
      active: mentor.active ?? true, // Ensure boolean value, default to true if null/undefined
    });
    setViewMode("detail");
  };
  const handleSubmitCreate = async () => {
    try {
      const response = await mentorManager.create(formData);
      if (response.success) {
        toast.success(t("adminMentormanagement.successfullyCreatedMentor"));
        setViewMode("list");
        void loadMentors(); // Refresh the list
      } else {
        toast.error(response.error || t("common.cannotCreateMentor"));
      }
    } catch (error) {
      console.error("Error creating mentor:", error);
      toast.error(t("common.cannotCreateMentor"));
    }
  };
  const handleSubmitEdit = async () => {
    if (!selectedMentor?.id) return;
    try {
      console.log("Updating mentor with formData:", formData);
      const response = await mentorManager.update(selectedMentor.id, formData);
      if (response.success) {
        toast.success(t("adminMentormanagement.mentorUpdatedSuccessfully"));
        if (response.data) {
          setSelectedMentor(response.data);
        }
        void loadMentors(); // Refresh the list
      } else {
        toast.error(response.error || t("common.unableToUpdateMentor"));
      }
    } catch (error) {
      console.error("Error updating mentor:", error);
      toast.error(t("common.unableToUpdateMentor"));
    }
  };
  const handleToggleActive = async (mentor: Mentor) => {
    if (!mentor.id) return;
    const action = mentor.active !== false ? "Vô hiệu hóa" : "Kích hoạt";
    if (!window.confirm(`Bạn có chắc chắn muốn ${action.toLowerCase()} mentor này?`)) return;

    try {
      const response = await mentorManager.toggleActive(mentor.id);
      if (response.success) {
        toast.success(
          t("general.successfullyMentor", {
            var_0: action,
          })
        );
        if (selectedMentor?.id === mentor.id) {
          setSelectedMentor((prev) =>
            prev ? { ...prev, active: prev.active === false ? true : false } : null
          );
        }
        void loadMentors(); // Refresh the list
      } else {
        toast.error(response.error || t("adminMentormanagement.mentorStatusCannotBeChanged"));
      }
    } catch (error) {
      console.error("Error toggling mentor status:", error);
      toast.error(t("adminMentormanagement.mentorStatusCannotBeChanged"));
    }
  };
  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Unified Single Hierarchical Header (Fixed 68px height) */}
      <div className="flex flex-none flex-col justify-center gap-3 border-b border-slate-200 bg-white p-4 sm:h-[68px] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {viewMode === "detail" && selectedMentor ? (
            /* Mode 2: Mentor Detail View (Sleek 1-line breadcrumb) */
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                {t("adminMentormanagement.mentorManagement", "Quản lý Mentor")}
              </button>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
                {selectedMentor.name}
              </h1>
              <Badge
                className={
                  (selectedMentor as any).status === "ACTIVE" ||
                  (selectedMentor as any).isActive !== false ||
                  selectedMentor.active !== false
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }>
                {(selectedMentor as any).status || "ACTIVE"}
              </Badge>
            </div>
          ) : viewMode === "create" ? (
            /* Mode 3: Create Mentor View */
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                {t("adminMentormanagement.mentorManagement", "Quản lý Mentor")}
              </button>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                {t("adminMentormanagement.addNewMentor", "Thêm Mentor mới")}
              </h1>
            </div>
          ) : (
            /* Mode 1: Root Mentor Management List View */
            <div className="flex flex-col justify-center">
              <h1 className="text-lg leading-tight font-bold text-slate-900 dark:text-white">
                {t("adminMentormanagement.mentorManagement", "Quản lý Mentor")}
              </h1>
              <p className="mt-0.5 text-xs leading-tight text-slate-500 dark:text-slate-400">
                {t(
                  "adminMentormanagement.manageAccountsProfilesAndMentor",
                  "Quản lý tài khoản và hồ sơ Mentor."
                )}
              </p>
            </div>
          )}
        </div>

        {/* Header Right Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === "detail" || viewMode === "create" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 gap-1.5 text-xs font-semibold">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.back", "Quay lại")}
            </Button>
          ) : (
            <>
              <div className="relative w-64">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t("common.searchByNameEmailExpertise")}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    pagination.goToFirstPage();
                  }}
                  className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  pagination.goToFirstPage();
                }}>
                <SelectTrigger className="h-8 w-32 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
                  <SelectValue placeholder={t("common.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.shutDown")}</SelectItem>
                  <SelectItem value="all">{t("common.allStatus")}</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || statusFilter !== "active") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("active");
                    pagination.goToFirstPage();
                  }}
                  className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                  {t("common.clearFilter")}
                </Button>
              )}

              <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

              <ReloadButton
                onReload={() => loadMentors(true)}
                isLoading={isReloading}
                tooltip={t("common.reloadMentorList")}
                className="h-8 w-8"
              />

              <Button
                onClick={handleCreate}
                className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("adminMentormanagement.addMentor")}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {viewMode === "list" ? (
          isInitialLoading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerBlock size="lg" label={t("adminMentormanagement.loadingListOfMentors")} />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
              <div className="flex-1 overflow-auto">
                <MentorTable
                  mentors={pageData}
                  onViewDetail={handleViewDetail}
                  onToggleActive={handleToggleActive}
                  getSortProps={getSortProps}
                />
              </div>

              {/* Pagination & Empty State */}
              {sortedData.length > 0 && (
                <div className="flex flex-none items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                  <PaginationControl
                    pagination={pagination}
                    onPageSizeChange={(nextPageSize) => {
                      setPageSize(nextPageSize);
                      pagination.goToFirstPage();
                    }}
                  />
                </div>
              )}

              {sortedData.length === 0 && (searchQuery || statusFilter !== "active") && (
                <div className="flex justify-center pt-4 pb-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("active");
                      pagination.goToFirstPage();
                    }}>
                    {t("common.clearFilter")}
                  </Button>
                </div>
              )}
            </div>
          )
        ) : viewMode === "detail" && selectedMentor ? (
          <div className="animate-in fade-in slide-in-from-right-8 h-full duration-300">
            <MentorDetailView
              mentor={selectedMentor}
              onBack={() => setViewMode("list")}
              formData={formData}
              onFormChange={setFormData}
              onSubmit={handleSubmitEdit}
            />
          </div>
        ) : viewMode === "create" ? (
          <div className="animate-in fade-in slide-in-from-right-8 h-full bg-slate-50 p-6 duration-300 lg:p-8 dark:bg-slate-950">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    {t("adminMentormanagement.addNewMentor")}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("adminMentormanagement.fillInTheInformationTo")}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
                <MentorEditForm
                  formData={formData}
                  onFormChange={setFormData}
                  onSubmit={handleSubmitCreate}
                  onCancel={() => setViewMode("list")}
                  submitLabel={t("adminMentormanagement.createMentors")}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
