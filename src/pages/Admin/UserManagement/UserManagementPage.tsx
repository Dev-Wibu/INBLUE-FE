import { PaginationControl } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import type { CandidateProfile } from "@/interfaces/schema.types";
import { cn } from "@/lib/utils";
import { candidateProfileManager, usersAdminManager } from "@/services";
import { getLatestCandidateProfile } from "@/services/candidate-profile.manager";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { UserDetailView, UserTable } from "./components";
import { UserEditForm, type ExtendedUserFormData } from "./components/UserEditForm";
import type { User, UserFormData } from "./types";

export function UserManagementPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const [viewMode, setViewMode] = useState<"list" | "detail" | "create" | "edit">("list");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<ExtendedUserFormData>({});

  const [selectedProfileData, setSelectedProfileData] = useState<CandidateProfile | null>(null);

  const navigate = useNavigate();
  const { userId } = useParams();

  const loadUsers = useCallback(async () => {
    setIsInitialLoading(true);
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
      setIsInitialLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleViewDetail = useCallback(
    async (user: User, shouldNavigate = true) => {
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
            setSelectedProfileData(getLatestCandidateProfile(response.data));
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
      if (shouldNavigate) {
        navigate(`/admin/users/${user.id}`);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!userId) {
      if (viewMode === "detail") {
        setViewMode("list");
        setSelectedUser(null);
        setSelectedProfileData(null);
      }
      return;
    }
    const numericId = Number(userId);
    if (!Number.isFinite(numericId)) return;
    const user = users.find((u) => u.id === numericId);
    if (user) {
      void handleViewDetail(user, false);
    } else if (!isInitialLoading) {
      usersAdminManager.getById(numericId).then((res) => {
        if (res.success && res.data) {
          void handleViewDetail(res.data as User, false);
        }
      });
    }
  }, [userId, users, isInitialLoading, handleViewDetail, viewMode]);

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
    <div
      className={cn(
        "flex flex-col bg-slate-50 dark:bg-slate-950",
        (viewMode === "list" || viewMode === "create") &&
          "-m-4 h-[calc(100%+32px)] md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)]"
      )}>
      <div
        className={cn(
          "flex flex-col bg-slate-50 dark:bg-slate-950",
          (viewMode === "list" || viewMode === "create") && "flex-1 overflow-hidden"
        )}>
        {viewMode === "detail" && selectedUser ? (
          <UserDetailView
            user={selectedUser}
            profile={selectedProfileData}
            formData={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmitEdit}
            onBack={() => {
              navigate("/admin/users");
            }}
          />
        ) : viewMode === "create" ? (
          <div className="flex-1 overflow-auto px-4 py-6 md:px-6 lg:px-8 lg:py-8">
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
        ) : isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("adminUsermanagement.loadingUserList")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-auto bg-slate-50 p-5 duration-300 sm:p-6 md:px-8 dark:bg-slate-950">
            <div className="mb-6 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {t("adminUsermanagement.userManagement", "Quản lý người dùng")}
                  </h2>
                  <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                    {t(
                      "adminUsermanagement.manageUserAccountsRolesAnd",
                      "Quản lý tài khoản, vai trò và trạng thái người dùng"
                    )}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-5 sm:gap-6">
                  {[
                    [users.length, "Tổng người dùng"],
                    [users.filter((user) => user.isActive !== false).length, "Đang hoạt động"],
                    [new Set(users.map((user) => user.role).filter(Boolean)).size, "Vai trò"],
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

              <form
                onSubmit={(event) => event.preventDefault()}
                className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <Input
                    type="text"
                    placeholder={t("adminUsermanagement.searchByNameEmailUniversity")}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      pagination.goToFirstPage();
                    }}
                    className="h-[46px] rounded-xl border border-slate-200/90 bg-slate-50/70 pl-11 text-[14.5px] shadow-2xs focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-[46px] rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <Search className="mr-2 h-[18px] w-[18px]" />
                  Tìm kiếm
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  className="h-[46px] rounded-xl bg-indigo-600 px-5 font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t("adminUsermanagement.addUser")}
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                  Trạng thái:
                </span>
                {[
                  ["active", t("common.active")],
                  ["inactive", t("common.shutDown")],
                  ["all", t("common.allStatus")],
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

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <UserTable
                users={pageData}
                onDelete={handleToggleStatus}
                onViewDetail={handleViewDetail}
                getSortProps={getSortProps}
              />
              {sortedData.length > 0 && (
                <div className="flex flex-none items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-t-slate-800 dark:bg-slate-900">
                  <PaginationControl
                    pagination={pagination}
                    showBoundaryButtons={false}
                    showPageJump={false}
                    onPageSizeChange={(nextPageSize) => {
                      setPageSize(nextPageSize);
                      pagination.goToFirstPage();
                    }}
                  />
                </div>
              )}
            </div>

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
