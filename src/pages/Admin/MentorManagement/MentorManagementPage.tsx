import { PaginationControl } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import { cn } from "@/lib/utils";
import { mentorManager } from "@/services";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { MentorDetailView, MentorEditForm, MentorTable } from "./components";
import type { Mentor, MentorFormData } from "./types";

export function MentorManagementPage() {
  const { t } = useTranslation();
  const { mentorId } = useParams<{ mentorId?: string }>();
  const navigate = useNavigate();

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [viewMode, setViewMode] = useState<"list" | "detail" | "create">("list");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [formData, setFormData] = useState<Partial<MentorFormData>>({});
  const [pendingToggleMentor, setPendingToggleMentor] = useState<Mentor | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Load mentors using the mentor manager service
  const loadMentors = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      const response = await mentorManager.getAll();
      if (response.success && response.data) {
        const mentorData = Array.isArray(response.data) ? response.data : response.data.data;
        setMentors(mentorData as Mentor[]);
      } else {
        toast.error(response.error || t("common.unableToLoadMentorList"));
      }
    } catch {
      toast.error(t("common.unableToLoadMentorList"));
    } finally {
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadMentors();
  }, [loadMentors]);

  // Synchronize viewMode and selectedMentor with URL parameter
  useEffect(() => {
    if (mentorId) {
      const found = mentors.find((m) => String(m.id) === mentorId);
      if (found) {
        setSelectedMentor(found);
        setFormData({
          name: found.name || "",
          email: found.email || "",
          password: found.password || "",
          bio: found.bio,
          expertise: found.expertise,
          yearsOfExperience: found.yearsOfExperience,
          linkedInUrl: found.linkedInUrl,
          currentCompany: found.currentCompany,
          pricePerMinute: found.pricePerMinute,
          active: found.active ?? true,
        });
        setViewMode("detail");
      }
    } else if (viewMode !== "create") {
      setViewMode("list");
      setSelectedMentor(null);
    }
  }, [mentorId, mentors, viewMode]);

  // Filter mentors based on search query and status filter
  const filteredMentors = useMemo(() => {
    return mentors.filter((mentor) => {
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

  // Stats calculation
  const stats = useMemo(() => {
    const total = mentors.length;
    const activeCount = mentors.filter((m) => m.active !== false).length;
    const specialtiesCount = new Set(mentors.map((m) => m.expertise?.trim()).filter(Boolean)).size;
    return { total, activeCount, specialtiesCount };
  }, [mentors]);

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

  const pageData = useMemo(() => {
    return sortedData.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [sortedData, pagination.startIndex, pagination.endIndex]);

  const handleCreate = () => {
    setFormData({});
    setViewMode("create");
  };

  const handleViewDetail = (mentor: Mentor) => {
    if (mentor.id) {
      navigate(`/admin/mentors/${mentor.id}`);
    } else {
      setSelectedMentor(mentor);
      setViewMode("detail");
    }
  };

  const handleBackToList = () => {
    navigate("/admin/mentors");
    setViewMode("list");
    setSelectedMentor(null);
  };

  const handleSubmitCreate = async () => {
    try {
      const response = await mentorManager.create(formData);
      if (response.success) {
        toast.success(t("adminMentormanagement.successfullyCreatedMentor"));
        handleBackToList();
        void loadMentors();
      } else {
        toast.error(response.error || t("common.cannotCreateMentor"));
      }
    } catch {
      toast.error(t("common.cannotCreateMentor"));
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedMentor?.id) return;
    try {
      const response = await mentorManager.update(selectedMentor.id, formData);
      if (response.success) {
        toast.success(t("adminMentormanagement.mentorUpdatedSuccessfully"));
        if (response.data) {
          setSelectedMentor(response.data);
        }
        void loadMentors();
      } else {
        toast.error(response.error || t("common.unableToUpdateMentor"));
      }
    } catch {
      toast.error(t("common.unableToUpdateMentor"));
    }
  };

  const handleToggleActive = (mentor: Mentor) => {
    if (!mentor.id) return;
    setPendingToggleMentor(mentor);
  };

  const handleConfirmToggleActive = async () => {
    const mentor = pendingToggleMentor;
    if (!mentor?.id) return;
    const willBeActive = mentor.active === false;
    const action = willBeActive
      ? t("adminMentormanagement.activate")
      : t("adminMentormanagement.disable");
    setIsToggling(true);
    try {
      const response = await mentorManager.toggleActive(mentor.id);
      if (response.success) {
        toast.success(
          t("general.successfullyMentor", {
            var_0: action,
          })
        );
        if (selectedMentor?.id === mentor.id) {
          setSelectedMentor((prev) => (prev ? { ...prev, active: prev.active === false } : null));
        }
        void loadMentors();
      } else {
        toast.error(response.error || t("adminMentormanagement.mentorStatusCannotBeChanged"));
      }
    } catch {
      toast.error(t("adminMentormanagement.mentorStatusCannotBeChanged"));
    } finally {
      setIsToggling(false);
      setPendingToggleMentor(null);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        "-m-4 min-h-[calc(100%+32px)] md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)]"
      )}>
      {/* Main Content Area */}
      <div
        className={cn(
          "flex flex-col bg-slate-50 dark:bg-slate-950",
          (viewMode === "list" || viewMode === "create") && "flex-1 overflow-hidden"
        )}>
        {viewMode === "list" ? (
          isInitialLoading ? (
            <div className="flex h-64 items-center justify-center">
              <SpinnerBlock
                size="lg"
                label={t(
                  "adminMentormanagement.loadingListOfMentors",
                  "Đang tải danh sách Mentor..."
                )}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
              {/* Stat Summary & Control Card */}
              <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {t("adminMentormanagement.mentorManagement", "Quản lý Mentor")}
                    </h2>
                    <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                      {t(
                        "adminMentormanagement.manageAccountsProfilesAndMentor",
                        "Quản lý tài khoản, hồ sơ chuyên môn và trạng thái hoạt động của Mentor"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-5 sm:gap-6">
                    {[
                      [stats.total, t("adminMentormanagement.totalMentors", "Tổng Mentor")],
                      [
                        stats.activeCount,
                        t("adminMentormanagement.activeMentors", "Đang hoạt động"),
                      ],
                      [
                        stats.specialtiesCount,
                        t("adminMentormanagement.specialties", "Chuyên môn"),
                      ],
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

                {/* Search & Filter Form Row (Matching User Management) */}
                <form
                  onSubmit={(event) => event.preventDefault()}
                  className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <Input
                      type="text"
                      placeholder={t(
                        "common.searchByNameEmailExpertise",
                        "Tìm kiếm theo tên, email, chuyên môn hoặc công ty..."
                      )}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        pagination.goToFirstPage();
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
                  <Button
                    onClick={handleCreate}
                    className="h-[46px] shrink-0 rounded-xl border border-indigo-600 bg-indigo-600 px-6 text-[14.5px] font-semibold text-white shadow-xs shadow-indigo-500/20 hover:border-indigo-700 hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                    <Plus className="mr-2 h-[18px] w-[18px]" />
                    {t("adminMentormanagement.addMentor", "Thêm Mentor")}
                  </Button>
                </form>

                {/* Status Filter Pills Row (Below search form, matching User Management) */}
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
                        pagination.goToFirstPage();
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

              {/* Table Card Container */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <MentorTable
                  mentors={pageData}
                  onViewDetail={handleViewDetail}
                  onToggleActive={handleToggleActive}
                  getSortProps={getSortProps}
                />
                {sortedData.length > 0 && (
                  <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
                    <PaginationControl
                      pagination={pagination}
                      onPageSizeChange={(nextPageSize) => {
                        setPageSize(nextPageSize);
                        pagination.goToFirstPage();
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        ) : viewMode === "detail" && selectedMentor ? (
          <div className="animate-in fade-in slide-in-from-right-8 h-full duration-300">
            <MentorDetailView
              mentor={selectedMentor}
              onBack={handleBackToList}
              formData={formData}
              onFormChange={setFormData}
              onSubmit={handleSubmitEdit}
            />
          </div>
        ) : viewMode === "create" ? (
          <div className="animate-in fade-in slide-in-from-right-8 h-full overflow-y-auto bg-slate-50 p-6 duration-300 lg:p-8 dark:bg-slate-950">
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="h-8 w-8 rounded-full dark:hover:bg-slate-800">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                    {t("adminMentormanagement.addNewMentor", "Thêm Mentor mới")}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t(
                      "adminMentormanagement.fillInTheInformationTo",
                      "Điền thông tin bên dưới để tạo tài khoản Mentor mới."
                    )}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <MentorEditForm
                  formData={formData}
                  onFormChange={setFormData}
                  onSubmit={handleSubmitCreate}
                  onCancel={handleBackToList}
                  submitLabel={t("adminMentormanagement.createMentors", "Tạo Mentor")}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Action Dialog */}
      <AlertDialog
        open={pendingToggleMentor !== null}
        onOpenChange={(open) => {
          if (!open && !isToggling) {
            setPendingToggleMentor(null);
          }
        }}>
        <AlertDialogContent className="dark:border-slate-800 dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              {pendingToggleMentor?.active === false
                ? t("adminMentormanagement.confirmActivateTitle", "Xác nhận kích hoạt")
                : t("adminMentormanagement.confirmDisableTitle", "Xác nhận vô hiệu hóa")}
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              {pendingToggleMentor?.active === false
                ? t("adminMentormanagement.confirmActivateDescription", {
                    name: pendingToggleMentor?.name || "",
                  })
                : t("adminMentormanagement.confirmDisableDescription", {
                    name: pendingToggleMentor?.name || "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isToggling}
              className="dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {t("general.cancel", "Hủy")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isToggling}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmToggleActive();
              }}
              className={
                pendingToggleMentor?.active === false
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-red-600 text-white hover:bg-red-700"
              }>
              {isToggling
                ? t("common.processing", "Đang xử lý...")
                : pendingToggleMentor?.active === false
                  ? t("adminMentormanagement.confirmActivateAction", "Kích hoạt")
                  : t("adminMentormanagement.confirmDisableAction", "Vô hiệu hóa")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
