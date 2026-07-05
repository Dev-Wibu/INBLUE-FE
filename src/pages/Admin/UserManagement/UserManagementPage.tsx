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
import { Plus, Search } from "lucide-react";
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

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: user.password || "",
      role: user.role,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((user as any).university !== undefined && { university: (user as any).university }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((user as any).major !== undefined && { major: (user as any).major }),
      isActive: user.isActive,
      public_id: user.public_id,
      cv_public_id: user.cv_public_id,
    });
    setViewMode("edit");
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

  if (viewMode === "detail" && selectedUser) {
    return (
      <UserDetailView
        user={selectedUser}
        profile={selectedProfileData}
        onBack={() => {
          setViewMode("list");
          setSelectedUser(null);
          setSelectedProfileData(null);
        }}
      />
    );
  }

  if (viewMode === "create") {
    return (
      <UserEditForm
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitCreate}
        onCancel={() => setViewMode("list")}
        title={t("adminUsermanagement.addNewUser")}
        description={t("adminUsermanagement.fillInTheInformationTo")}
        submitLabel={t("adminUsermanagement.createUsers")}
      />
    );
  }

  if (viewMode === "edit" && selectedUser) {
    return (
      <UserEditForm
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitEdit}
        onCancel={() => {
          setViewMode("list");
          setSelectedUser(null);
        }}
        title={t("adminUsermanagement.userEditing")}
        description={t("adminUsermanagement.updateUserInformation")}
        submitLabel={t("common.saveChanges")}
        selectedUser={selectedUser}
      />
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("adminUsermanagement.userManagement")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminUsermanagement.manageUserAccountsRolesAnd")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("adminUsermanagement.loadingUserList")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <UserTable
                users={pageData}
                onEdit={handleEdit}
                onDelete={handleToggleStatus}
                onViewDetail={handleViewDetail}
                getSortProps={getSortProps}
              />
            </div>

            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              {sortedData.length > 0 && (
                <div className="mt-4 flex items-center justify-end rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
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
                <div className="mt-4 flex justify-center pb-4">
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
          </div>
        )}
      </div>
    </div>
  );
}
