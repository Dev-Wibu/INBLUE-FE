const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "src",
  "pages",
  "Admin",
  "UserManagement",
  "UserManagementPage.tsx"
);
let content = fs.readFileSync(filePath, "utf-8");

// 1. Update Imports
content = content.replace(
  /import \{\s*CandidateProfileModal,\s*DeleteUserDialog,\s*UserDetailModal,\s*UserFormDialog,\s*UserTable,\s*\} from "\.\/components";/g,
  `import {\n  DeleteUserDialog,\n  UserTable,\n  UserDetailView,\n} from "./components";`
);

// 2. Remove unused UI imports
content = content.replace(
  /import \{ CVUploadModal \} from "@\/components\/ui\/cv-upload-modal";\n/g,
  ""
);

// 3. Update States
content = content.replace(
  /  const \[isCreateDialogOpen, setIsCreateDialogOpen\] = useState\(false\);\n  const \[isEditDialogOpen, setIsEditDialogOpen\] = useState\(false\);\n  const \[isDeleteDialogOpen, setIsDeleteDialogOpen\] = useState\(false\);\n  const \[selectedUser, setSelectedUser\] = useState<User \| null>\(null\);\n  const \[formData, setFormData\] = useState<Partial<UserFormData>>\(\{\}\);\n  const \[isDetailModalOpen, setIsDetailModalOpen\] = useState\(false\);\n\n  \/\/ CV Upload Modal state\n  const \[isCvModalOpen, setIsCvModalOpen\] = useState\(false\);\n  const \[isCvUploading, setIsCvUploading\] = useState\(false\);\n\n  \/\/ Candidate Profile Modal state\n  const \[isProfileModalOpen, setIsProfileModalOpen\] = useState\(false\);\n  const \[selectedProfileData, setSelectedProfileData\] = useState<CandidateProfile \| null>\(null\);/g,
  `  const [viewMode, setViewMode] = useState<"list" | "detail" | "create" | "edit">("list");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<UserFormData>>({});
  
  // Profile data fetch state
  const [selectedProfileData, setSelectedProfileData] = useState<CandidateProfile | null>(null);`
);

// 4. Update handle functions
content = content.replace(
  /  const handleCreate = \(\) => \{\n    \/\/ Note: Role removed from form as UserInfo schema doesn't include it\n    \/\/ New users will be created with default role from backend\n    setFormData\(\{\n      isActive: true,\n    \}\);\n    setIsCreateDialogOpen\(true\);\n  \};\n  const handleEdit = \(user: User\) => \{\n    setSelectedUser\(user\);\n    setFormData\(\{\n      name: user\.name \|\| "",\n      email: user\.email \|\| "",\n      password: user\.password \|\| "",\n      role: user\.role,\n      \/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\n      \.\.\.\(\(user as any\)\.university !== undefined && \{ university: \(user as any\)\.university \}\),\n      \/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\n      \.\.\.\(\(user as any\)\.major !== undefined && \{ major: \(user as any\)\.major \}\),\n      isActive: user\.isActive,\n      \/\/ Include Cloudinary public_id fields for file management during update\n      public_id: user\.public_id,\n      cv_public_id: user\.cv_public_id,\n    \}\);\n    setIsEditDialogOpen\(true\);\n  \};\n  const handleDelete = \(user: User\) => \{\n    setSelectedUser\(user\);\n    setIsDeleteDialogOpen\(true\);\n  \};\n  const handleUploadCV = \(user: User\) => \{\n    setSelectedUser\(user\);\n    setIsCvModalOpen\(true\);\n  \};\n\n  \/\/ Handle viewing candidate profile\n  const handleViewProfile = async \(user: User\) => \{[\s\S]*?\};\n\n  \/\/ Handle CV upload via dedicated modal\n  const handleCvUpload = async \(file: File\) => \{[\s\S]*?\};\n  const handleSubmitCreate = async \(\) => \{[\s\S]*?setIsCreateDialogOpen\(false\);[\s\S]*?\};\n  const handleSubmitEdit = async \(\) => \{[\s\S]*?setIsEditDialogOpen\(false\);[\s\S]*?\};\n  const handleConfirmDelete = async \(\) => \{[\s\S]*?setIsDeleteDialogOpen\(false\);[\s\S]*?\};/g,
  `  const handleCreate = () => {
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

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
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
    }
    setViewMode("detail");
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser?.id) return;
    try {
      const response = await usersAdminManager.toggleActive(selectedUser.id, selectedUser);
      if (response.success) {
        const action =
          selectedUser.isActive !== false
            ? t("adminUsermanagement.disabled")
            : t("paymentPaymentsuccesspage.activated");
        toast.success(t("general.userSuccessfully", { var_0: action }));
        setIsDeleteDialogOpen(false);
        void loadUsers();
      } else {
        toast.error(response.error || t("adminUsermanagement.userStatusCannotBeChanged"));
      }
    } catch (error) {
      console.error("Error changing user status:", error);
      toast.error(t("adminUsermanagement.userStatusCannotBeChanged"));
    }
  };`
);

// 5. Update render
const returnRegex =
  /  return \(\n    <div className="-m-4 flex h-\[calc\(100%\+32px\)\] flex-col bg-slate-50 md:-m-6 md:h-\[calc\(100%\+48px\)\] lg:-m-8 lg:h-\[calc\(100%\+64px\)\] dark:bg-slate-950">[\s\S]*?<\/div>\n  \);\n}/;

content = content.replace(
  returnRegex,
  `  if (viewMode === "detail" && selectedUser) {
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

  // TODO: Add UserEditForm integration when viewMode is 'create' or 'edit'

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
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
                onViewDetail={handleViewDetail}
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

      {/* Delete Confirmation Dialog */}
      <DeleteUserDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}`
);

fs.writeFileSync(filePath, content, "utf-8");
console.log("Successfully updated UserManagementPage.tsx");
