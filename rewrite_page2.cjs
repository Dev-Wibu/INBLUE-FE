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

// Remove the unused imports
content = content.replace(
  /import { CVUploadModal } from "@\/components\/ui\/cv-upload-modal";\n/g,
  ""
);

// Add back CandidateProfileModal to index.ts exports since we restored it
const indexFilePath = path.join(
  __dirname,
  "src",
  "pages",
  "Admin",
  "UserManagement",
  "components",
  "index.ts"
);
fs.writeFileSync(
  indexFilePath,
  `export { CandidateProfileModal } from "./CandidateProfileModal";\nexport { DeleteUserDialog } from "./DeleteUserDialog";\nexport { UserDetailView } from "./UserDetailView";\nexport { UserTable } from "./UserTable";\n`
);

// Rewrite UserManagementPage from the return statement
const returnIndex = content.lastIndexOf("  return (");
if (returnIndex !== -1) {
  content =
    content.substring(0, returnIndex) +
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
                onDelete={handleDelete}
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

      <DeleteUserDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        user={selectedUser}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
`;
}
fs.writeFileSync(filePath, content, "utf-8");
