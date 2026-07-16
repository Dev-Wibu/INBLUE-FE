import { useTranslation } from "react-i18next";
/**
 * Candidate Profile Management Page (Admin)
 * For managing, organizing, and reviewing submitted applications
 */

import { ReloadButton } from "@/components/shared";
import { PaginationControl } from "@/components/shared/PaginationControl";
import { SortButton } from "@/components/shared/SortButton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import { useSortable } from "@/hooks/useSortable";
import type { CandidateProfile } from "@/interfaces/schema.types";
import { formatDate } from "@/lib/formatting";
import { useCandidateProfiles } from "@/services/candidate-profile.manager";
import { Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CandidateProfileModal } from "../UserManagement/components/CandidateProfileModal";
type SortableCandidateProfile = CandidateProfile & {
  nameSortValue: string;
  emailSortValue: string;
  createdAtSortValue: number;
};
export function CandidateProfileManagementPage() {
  const { t } = useTranslation();
  const { data: profilesData, isLoading, isRefetching, refetch } = useCandidateProfiles();
  const profiles = useMemo(() => {
    return ((profilesData as unknown as CandidateProfile[]) ?? []).sort(
      (a, b) => (a.id ?? 0) - (b.id ?? 0)
    );
  }, [profilesData]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState<CandidateProfile | null>(null);
  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set(
          profiles
            .map((profile) => profile.targetRole)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      ),
    [profiles]
  );
  const levelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          profiles
            .map((profile) => profile.targetLevel)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      ),
    [profiles]
  );
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        p.user?.name?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q) ||
        p.targetRole?.toLowerCase().includes(q) ||
        p.targetLevel?.toLowerCase().includes(q);
      if (!matchesSearch) {
        return false;
      }
      if (roleFilter !== "all" && p.targetRole !== roleFilter) {
        return false;
      }
      if (levelFilter !== "all" && p.targetLevel !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [levelFilter, profiles, roleFilter, search]);
  const sortableProfiles = useMemo<SortableCandidateProfile[]>(
    () =>
      filteredProfiles.map((profile) => ({
        ...profile,
        nameSortValue: profile.user?.name?.toLowerCase() || "",
        emailSortValue: profile.user?.email?.toLowerCase() || "",
        createdAtSortValue: profile.createdAt ? new Date(profile.createdAt).getTime() : 0,
      })),
    [filteredProfiles]
  );
  const { sortedData, getSortProps } = useSortable(sortableProfiles);
  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_candidateprofilemanagement_candidateprofilemanagementpage_tsx_pagesize",
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
  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("adminCandidateprofilemanagement.manageCandidateProfiles")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminCandidateprofilemanagement.viewAndManageAllCandidate")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("adminCandidateprofilemanagement.searchByNameEmailRole")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                pagination.goToFirstPage();
              }}
              className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
            />
          </div>

          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-32 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("adminCandidateprofilemanagement.filterByRole")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("adminCandidateprofilemanagement.allRoles")}</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={levelFilter}
            onValueChange={(value) => {
              setLevelFilter(value);
              pagination.goToFirstPage();
            }}>
            <SelectTrigger className="h-8 w-32 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 dark:border-slate-700">
              <SelectValue placeholder={t("common.filterByLevel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allLevels")}</SelectItem>
              {levelOptions.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || roleFilter !== "all" || levelFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setLevelFilter("all");
                pagination.goToFirstPage();
              }}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <ReloadButton
            onReload={async () => {
              await refetch();
            }}
            isLoading={isRefetching}
            tooltip={t("adminCandidateprofilemanagement.reloadProfileList")}
            className="h-8 w-8"
          />
        </div>
      </div>

      {/* ── TABLE CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock
              size="lg"
              label={t("adminCandidateprofilemanagement.loadingListOfCandidateProfiles")}
            />
          </div>
        ) : sortedData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {t("adminCandidateprofilemanagement.noRecordsFound")}
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t("common.id", "ID")}</TableHead>
                    <TableHead>
                      <SortButton {...getSortProps("nameSortValue")}>{t("common.name")}</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton {...getSortProps("emailSortValue")}>
                        {t("common.email")}
                      </SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton {...getSortProps("targetRole")}>{t("common.role")}</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton {...getSortProps("targetLevel")}>{t("common.level")}</SortButton>
                    </TableHead>
                    <TableHead>
                      <SortButton {...getSortProps("createdAtSortValue")}>
                        {t("common.creationDate")}
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-24 text-right">{t("common.act")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">#{profile.id}</TableCell>
                      <TableCell className="font-medium">{profile.user?.name || "—"}</TableCell>
                      <TableCell className="text-slate-500">{profile.user?.email || "—"}</TableCell>
                      <TableCell>{profile.targetRole || "—"}</TableCell>
                      <TableCell>
                        {profile.targetLevel ? (
                          <Badge variant="outline">{profile.targetLevel}</Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {formatDate(profile.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => setSelectedProfile(profile)}>
                          <Eye className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-none items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
              <PaginationControl
                pagination={pagination}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  pagination.goToFirstPage();
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Improved Candidate Profile Modal */}
      <CandidateProfileModal
        profile={selectedProfile}
        open={!!selectedProfile}
        onOpenChange={(open) => !open && setSelectedProfile(null)}
      />
    </div>
  );
}
