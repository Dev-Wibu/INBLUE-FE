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
import { toTimestamp, treatZuluAsVietnamLocal } from "@/lib/formatting";
import { sessionManager } from "@/services";
import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SessionTable } from "./components";
import type { Session } from "./types";
type SortableSession = Session & {
  startTimeSortValue: number;
};
export function SessionManagementPage() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Load sessions using the session manager service
  const loadSessions = useCallback(
    async (showReloading = false) => {
      if (showReloading) {
        setIsReloading(true);
      } else {
        setIsInitialLoading(true);
      }
      try {
        const response = await sessionManager.getAll();
        if (response.success && response.data) {
          // Handle both paginated and array responses
          const sessionData = Array.isArray(response.data) ? response.data : response.data.data;
          setSessions(sessionData as Session[]);
        } else {
          toast.error(response.error || t("adminSessionmanagement.unableToLoadLessonList"));
        }
      } catch (error) {
        console.error("Error loading sessions:", error);
        toast.error(t("adminSessionmanagement.unableToLoadLessonList"));
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
    void loadSessions();
  }, [loadSessions]);

  // Filter sessions based on search query and status filter
  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      // Filter by search query
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchesSearch =
          session.id?.toString().includes(lowerQuery) ||
          session.userId?.toString().includes(lowerQuery) ||
          session.userId2?.toString().includes(lowerQuery) ||
          session.roomName?.toLowerCase().includes(lowerQuery) ||
          session.roomUrl?.toLowerCase().includes(lowerQuery) ||
          session.transactionCode?.toLowerCase().includes(lowerQuery);
        if (!matchesSearch) return false;
      }

      // Filter by status
      if (statusFilter !== "all" && session.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [sessions, searchQuery, statusFilter]);
  const sortableSessions = useMemo<SortableSession[]>(() => {
    return filteredSessions.map((session) => ({
      ...session,
      startTimeSortValue: toTimestamp(treatZuluAsVietnamLocal(session.startTime1)) ?? 0,
    }));
  }, [filteredSessions]);

  // Sorting
  const { sortedData, getSortProps } = useSortable(sortableSessions);

  // Pagination

  const [pageSize, setPageSize] = useHybridPageSize({
    key: "src_pages_admin_sessionmanagement_sessionmanagementpage_tsx_pagesize",
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
    navigate("/admin/sessions/create");
  };
  const handleView = (session: Session) => {
    navigate(`/admin/sessions/${session.id}`);
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* ── TOOLBAR ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("adminSessionmanagement.managingLessons")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("adminSessionmanagement.manageInterviewsViewRecordingsAnd")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t("adminSessionmanagement.searchByIdUserId")}
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
              <SelectItem value="all">{t("common.allStatus")}</SelectItem>
              <SelectItem value="DRAFT">{t("common.waitingForApproval")}</SelectItem>
              <SelectItem value="SCHEDULED">{t("common.scheduled")}</SelectItem>
              <SelectItem value="PAID">{t("common.paid")}</SelectItem>
              <SelectItem value="REJECTED">{t("common.rejected")}</SelectItem>
              <SelectItem value="ONGOING">{t("common.ongoing")}</SelectItem>
              <SelectItem value="COMPLETED">{t("common.completed1")}</SelectItem>
              <SelectItem value="CANCELED">{t("common.canceled")}</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                pagination.goToFirstPage();
              }}
              className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
              {t("common.clearFilter")}
            </Button>
          )}

          <div className="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <ReloadButton
            onReload={() => loadSessions(true)}
            isLoading={isReloading}
            tooltip={t("common.reloadSessionList")}
            className="h-8 w-8"
          />

          <Button
            onClick={handleCreate}
            className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("general.createSession")}
          </Button>
        </div>
      </div>

      {/* ── TABLE CONTENT ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        {isInitialLoading ? (
          <div className="flex h-64 items-center justify-center">
            <SpinnerBlock size="lg" label={t("adminSessionmanagement.loadingClassList")} />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 flex flex-1 flex-col overflow-hidden duration-300">
            <div className="flex-1 overflow-auto border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <SessionTable sessions={pageData} onView={handleView} getSortProps={getSortProps} />
            </div>

            {/* Pagination & Empty State */}
            {sortedData.length > 0 && (
              <div className="flex flex-none items-center justify-end border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
                <PaginationControl
                  pagination={pagination}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    pagination.goToFirstPage();
                  }}
                />
              </div>
            )}

            {sortedData.length === 0 && (searchQuery || statusFilter !== "all") && (
              <div className="flex justify-center pt-4 pb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
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
