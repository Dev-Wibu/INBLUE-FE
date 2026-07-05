import { PaginationControl, ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { CVUploadModal } from "@/components/ui/cv-upload-modal";
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
import {
  CandidateProfileModal,
  DeleteUserDialog,
  UserDetailModal,
  UserFormDialog,
  UserTable,
} from "./components";
import type { User, UserFormData } from "./types";
export function UserManagementPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active"); // Default to show only active users
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<UserFormData>>({});
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // CV Upload Modal state
  const [isCvModalOpen, setIsCvModalOpen] = useState(false);
  const [isCvUploading, setIsCvUploading] = useState(false);

  // Candidate Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileData, setSelectedProfileData] = useState<CandidateProfile | null>(null);

  // Load users using the users admin manager service
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
          // Handle both paginated and array responses
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

  // Filter users based on search query and status filter
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Filter by status (active/inactive/all) - default shows active only
      if (statusFilter === "active") {
        if (user.isActive === false) {
          return false;
        }
      } else if (statusFilter === "inactive") {
        if (user.isActive !== false) {
          return false;
        }
      }

      // Filter by search query
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

  // Sorting
  const { sortedData, getSortProps } = useSortable(filteredUsers);

  // Pagination

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_usermanagement_usermanagementpage_tsx_pagesize",
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
    // Note: Role removed from form as UserInfo schema doesn't include it
    // New users will be created with default role from backend
    setFormData({
      isActive: true,
    });
    setIsCreateDialogOpen(true);
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
      // Include Cloudinary public_id fields for file management during update
      public_id: user.public_id,
      cv_public_id: user.cv_public_id,
    });
    setIsEditDialogOpen(true);
  };
  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };
  const handleUploadCV = (user: User) => {
    setSelectedUser(user);
    setIsCvModalOpen(true);
  };

  // Handle viewing candidate profile
  const handleViewProfile = async (user: User) => {
    if (!user.id) return;
    try {
      const response = await candidateProfileManager.getByUserId(user.id);
      if (response.success && response.data) {
        setSelectedProfileData(response.data);
        setIsProfileModalOpen(true);
      } else {
        toast.info(t("adminUsermanagement.thisUserDoesNotHave"));
      }
    } catch {
      toast.info(t("adminUsermanagement.thisUserDoesNotHave"));
    }
  };

  // Handle CV upload via dedicated modal
  const handleCvUpload = async (file: File) => {
    if (!selectedUser?.id) return;
    setIsCvUploading(true);
    try {
      const response = await usersAdminManager.uploadCv(selectedUser.id, file);
      if (response.success) {
        toast.success(t("common.uploadCvSuccessfully"));
        void loadUsers(); // Refresh the list to show updated CV status
      } else {
        toast.error(response.error || t("common.uploadCvFailed"));
      }
    } finally {
      setIsCvUploading(false);
    }
  };
  const handleSubmitCreate = async () => {
    try {
      const response = await usersAdminManager.create(formData);
      if (response.success) {
        toast.success(t("adminUsermanagement.userCreatedSuccessfully"));
        setIsCreateDialogOpen(false);
        void loadUsers(); // Refresh the list
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
      // Separate avatar file from user data (CV upload is handled via dedicated CVUploadModal)
      const { avatar, ...userData } = formData as {
        avatar?: File;
        [key: string]: unknown;
      };

      // Call update with avatar file only (CV upload is now separate)
      const response = await usersAdminManager.update(selectedUser.id, userData, avatar);
      if (response.success) {
        toast.success(t("adminUsermanagement.userUpdatedSuccessfully"));
        setIsEditDialogOpen(false);
        void loadUsers(); // Refresh the list
      } else {
        toast.error(response.error || t("common.unableToUpdateUser"));
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("common.unableToUpdateUser"));
    }
  };
  const handleConfirmDelete = async () => {
    if (!selectedUser?.id) return;
    try {
      // Toggle the user's active status (activate/deactivate)
      const response = await usersAdminManager.toggleActive(selectedUser.id, selectedUser);
      if (response.success) {
        const action =
          selectedUser.isActive !== false
            ? t("adminUsermanagement.disabled")
            : t("paymentPaymentsuccesspage.activated");
        toast.success(
          t("general.userSuccessfully", {
            var_0: action,
          })
        );
        setIsDeleteDialogOpen(false);
        void loadUsers(); // Refresh the list
      } else {
        toast.error(response.error || t("adminUsermanagement.userStatusCannotBeChanged"));
      }
    } catch (error) {
      console.error("Error changing user status:", error);
      toast.error(t("adminUsermanagement.userStatusCannotBeChanged"));
    }
  };
  return (
    <div className="flex h-[calc(100%+32px)] md:h-[calc(100%+48px)] lg:h-[calc(100%+64px)] flex-col bg-slate-50 dark:bg-slate-950 -m-4 md:-m-6 lg:-m-8">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
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

          <div className="hidden h-4 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

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

      {/* ── TABLE CONTENT ─────────────────────────────────────────────────────── */}
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
                onDelete={handleDelete}
                onUploadCV={handleUploadCV}
                onViewProfile={handleViewProfile}
                onViewDetail={(user) => {
                  setSelectedUser(user);
                  setIsDetailModalOpen(true);
                }}
                getSortProps={getSortProps}
              />
            </div>

            {/* Pagination & Empty State */}
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

      {/* Create Dialog */}
      <UserFormDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitCreate}
        title={t("adminUsermanagement.addNewUser")}
        description={t("adminUsermanagement.fillInTheInformationTo")}
        submitLabel={t("adminUsermanagement.createUsers")}
      />

      {/* Edit Dialog */}
      <UserFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmitEdit}
        title={t("adminUsermanagement.userEditing")}
        description={t("adminUsermanagement.updateUserInformation")}
        submitLabel={t("common.saveChanges")}
        selectedUser={selectedUser}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteUserDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
      />

      {/* CV Upload Modal */}
      <CVUploadModal
        isOpen={isCvModalOpen}
        onOpenChange={setIsCvModalOpen}
        currentCvUrl={selectedUser?.cvUrl}
        onUpload={handleCvUpload}
        isUploading={isCvUploading}
        title={t("common.uploadCv")}
        description={t("adminUsermanagement.uploadUserSCvOnly")}
      />

      {/* Candidate Profile Modal */}
      <CandidateProfileModal
        profile={selectedProfileData}
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />
    </div>
  );
}
