import { PaginationControl, ReloadButton } from "@/components/shared";
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
import type { CandidateProfile } from "@/interfaces/schema.types";
import { candidateProfileManager, usersAdminManager } from "@/services";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { UserDetailView, UserTable } from "./components";
import { UserEditForm, type ExtendedUserFormData } from "./components/UserEditForm";
import type { User, UserFormData } from "./types";

export function UserManagementPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const [viewMode, setViewMode] = useState<"list" | "detail" | "create" | "edit">("list");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<ExtendedUserFormData>({});

  const [selectedProfileData, setSelectedProfileData] = useState<CandidateProfile | null>(null);

  const loadUsers = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }
      try {
        const response = await usersAdminManager.getAll();
        if (response.success && response.data) {
          const userData = Array.isArray(response.data) ? response.data : response.data.data;
          setUsers(userData as User[]);
        } else {
          toast.error(response.error || t("common.unableToLoadUserList"));
        }
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error(t("common.unableToLoadUserList"));
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
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === "active") {
        if (user.isActive === false) return false;
      } else if (statusFilter === "inactive") {
        if (user.isActive !== false) return false;
      }

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          user.name?.toLowerCase().includes(lowerQuery) ||
          user.email?.toLowerCase().includes(lowerQuery) ||
          // @ts-expect-error: Backend Swagger schema mismatch - university/major not in User type
          user.university?.toLowerCase().includes(lowerQuery) ||
          user.major?.toLowerCase().includes(lowerQuery);
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [users, statusFilter, searchQuery]);

  const { sortedData, getSortProps } = useSortable(filteredUsers);

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_usermanagement_usermanagementpage_tsx_pagesize",
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
    setFormData({ isActive: true });
    setViewMode("create");
  };

  const handleToggleStatus = async (user: User) => {
    if (!user.id) return;
    const previousStatus = user.isActive;

    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));

    try {
      const response = await usersAdminManager.toggleActive(user.id, user);
      if (response.success) {
        const action =
          previousStatus !== false
            ? t("adminUsermanagement.disabled")
            : t("paymentPaymentsuccesspage.activated");
        toast.success(t("general.userSuccessfully", { var_0: action }));
      } else {
        // Revert on failure
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: previousStatus } : u))
        );
        toast.error(response.error || t("adminUsermanagement.userStatusCannotBeChanged"));
      }
    } catch (error) {
      console.error("Error changing user status:", error);
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: previousStatus } : u))
      );
      toast.error(t("adminUsermanagement.userStatusCannotBeChanged"));
    }
  };

  const handleViewDetail = async (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    if (user.role === "USER" && user.id) {
      try {
        const response = await candidateProfileManager.getByUserId(user.id);
        if (response.success && response.data) {
          setSelectedProfileData(response.data);
        } else {
          setSelectedProfileData(null);
        }
      } catch {
        setSelectedProfileData(null);
      }
    } else {
      setSelectedProfileData(null);
    }
    setViewMode("detail");
  };

  const handleSubmitCreate = async () => {
    try {
      const response = await usersAdminManager.create(formData as UserFormData);
      if (response.success) {
        toast.success(t("adminUsermanagement.userCreatedSuccessfully"));
        setViewMode("list");
        void loadUsers();
      } else {
        toast.error(response.error || t("common.unableToCreateUser"));
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(t("common.unableToCreateUser"));
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedUser?.id) return;
    try {
      const { avatar, ...userData } = formData;
      const response = await usersAdminManager.update(
        selectedUser.id,
        userData as UserFormData,
        avatar
      );
      if (response.success) {
        toast.success(t("adminUsermanagement.userUpdatedSuccessfully"));
        setViewMode("list");
        void loadUsers();
      } else {
        toast.error(response.error || t("common.unableToUpdateUser"));
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("common.unableToUpdateUser"));
    }
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Unified Single Hierarchical Header (Fixed 68px height) */}
      <div className="flex flex-none flex-col justify-center gap-3 border-b border-slate-200 bg-white p-4 sm:h-[68px] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          {viewMode === "detail" && selectedUser ? (
            /* Mode 2: User Detail View (Sleek 1-line breadcrumb) */
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode("list");
                  setSelectedUser(null);
                  setSelectedProfileData(null);
                }}
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                {t("adminUsermanagement.userManagement", "Quản lý người dùng")}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {selectedUser.name}
              </h1>
              <Badge
                className={
                  selectedUser.status === "ACTIVE" || selectedUser.isActive !== false
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }>
                {selectedUser.status || "ACTIVE"}
              </Badge>
              {selectedUser.role && <Badge variant="outline">{selectedUser.role}</Badge>}
            </div>
          ) : viewMode === "create" ? (
            /* Mode 3: Create User View */
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:text-indigo-400">
                {t("adminUsermanagement.userManagement", "Quản lý người dùng")}
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <h1 className="text-base font-bold text-slate-900 dark:text-white">
                {t("adminUsermanagement.addNewUser", "Thêm người dùng mới")}
              </h1>
            </div>
          ) : (
            /* Mode 1: Root User Management List View */
            <div className="flex flex-col justify-center">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {t("adminUsermanagement.userManagement", "Quản lý người dùng")}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {t("adminUsermanagement.manageUserAccountsRolesAnd", "Quản lý tài khoản, vai trò và quyền hạn người dùng")}
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
              onClick={() => {
                setViewMode("list");
                setSelectedUser(null);
                setSelectedProfileData(null);
              }}
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
                  placeholder={t("adminUsermanagement.searchByNameEmailUniversity")}
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
                onReload={() => loadUsers(true)}
                isLoading={isReloading}
                tooltip={t("adminUsermanagement.reloadUserList")}
              />

              <Button
                onClick={handleCreate}
                className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t("adminUsermanagement.addUser")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {viewMode === "detail" && selectedUser ? (
          <UserDetailView
            user={selectedUser}
            profile={selectedProfileData}
            formData={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmitEdit}
            onBack={() => {
              setViewMode("list");
              setSelectedUser(null);
              setSelectedProfileData(null);
            }}
          />
        ) : viewMode === "create" ? (
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            <div className="mx-auto max-w-4xl">
              <UserEditForm
                formData={formData}
                onFormChange={setFormData}
                onSubmit={handleSubmitCreate}
                onCancel={() => setViewMode("list")}
                title={t("adminUsermanagement.addNewUser")}
                description={t("adminUsermanagement.fillInTheInformationTo")}
                submitLabel={t("adminUsermanagement.createUsers")}
              />
            </div>
          </div>
        ) : isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("adminUsermanagement.loadingUserList")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
            <div className="flex-1 overflow-auto border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <UserTable
                users={pageData}
                onDelete={handleToggleStatus}
                onViewDetail={handleViewDetail}
                getSortProps={getSortProps}
              />
            </div>

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
        )}
      </div>
    </div>
  );
}
