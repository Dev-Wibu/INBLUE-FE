import { PaginationControl } from "@/components/shared/PaginationControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHybridPageSize, usePagination } from "@/hooks/usePagination";
import {
  adminApplicationManager,
  type ApplicationListItemDto,
} from "@/services/admin-application.manager";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Clock,
  FileCheck2,
  Layers,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function AdminApplicationManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Open JDs for dropdown filters with caching.
  //    Use the same queryKey as CompanyManagementPage so both pages share
  //    the same cache (no double fetch, no stale duplicates).
  const { data: openJdsData = [] } = useQuery({
    queryKey: ["admin", "open-jds"],
    queryFn: async () => {
      const res = await adminApplicationManager.getOpenJds();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const openJds = openJdsData;

  // Stable empty array — single instance reused everywhere to avoid
  // re-renders triggered by reference changes.
  const EMPTY_APPLICATIONS: ApplicationListItemDto[] = [];

  // Selected JD: persisted to localStorage so F5 / navigation keeps the same
  // selection. Empty value = "ALL" — show applications from every JD.
  const LS_KEY = "adminAppMgmt.selectedJdId";
  const [manualSelectedJdId, setManualSelectedJdId] = useState<string>(() => {
    try {
      const stored = window.localStorage.getItem(LS_KEY);
      return stored ?? "";
    } catch {
      return "";
    }
  });

  // If the persisted JD no longer exists in openJds, drop the selection.
  const selectedJdId = useMemo(() => {
    if (!manualSelectedJdId) return ""; // "" = ALL
    const exists = openJds.some((j) => String(j.jdId) === manualSelectedJdId);
    return exists ? manualSelectedJdId : "";
  }, [manualSelectedJdId, openJds]);

  const setSelectedJdId = (val: string) => {
    setManualSelectedJdId(val);
    try {
      if (val) window.localStorage.setItem(LS_KEY, val);
      else window.localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore quota errors */
    }
  };

  // 2. Fetch applications. Behaviour:
  //    - When user picks a JD (selectedJdId is set) → fetch only that JD's
  //      applications (1 request, cached 60s).
  //    - When no JD is picked (default, selectedJdId = "") → fetch the list
  //      of OPEN JDs from cache and fan-out one request per JD in parallel.
  //      Each per-JD query is independent and cached by id, so subsequent
  //      renders only refetch the ones that have actually gone stale.
  const numericSelectedJdId = useMemo(() => {
    if (!selectedJdId || Number.isNaN(Number(selectedJdId))) return null;
    return Number(selectedJdId);
  }, [selectedJdId]);

  // Single-JD query — used when user explicitly picks a JD.
  const singleJdQuery = useQuery({
    queryKey: ["admin", "jd-applications", numericSelectedJdId],
    queryFn: async () => {
      if (!numericSelectedJdId) return null;
      const res = await adminApplicationManager.getApplicationsByJdId(numericSelectedJdId);
      if (!res.success || !res.data) {
        return { applications: [] as ApplicationListItemDto[], jdInfo: null };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apps = (res.data.applications || (res.data as any)) as ApplicationListItemDto[];
      const jdInfo = openJds.find((j) => j.jdId === numericSelectedJdId);
      type AppWithCompany = ApplicationListItemDto & {
        companyId?: number;
        companyName?: string;
        companyLogoUrl?: string;
        jobTitle?: string;
      };
      const enrichedApps = apps.map((app: AppWithCompany) => ({
        ...app,
        companyId: jdInfo?.company?.id ?? app.companyId,
        companyName: app.companyName || jdInfo?.company?.name,
        companyLogoUrl: app.companyLogoUrl || jdInfo?.company?.logoUrl,
        jobTitle: app.jobTitle || jdInfo?.title,
      }));
      return { applications: enrichedApps as ApplicationListItemDto[], jdInfo };
    },
    enabled: numericSelectedJdId !== null,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // All OPEN JDs in stable order. Filtering undefined keeps the type tight.
  const allJdIds = useMemo(
    () => openJds.map((j) => j.jdId).filter((id): id is number => id !== undefined),
    [openJds]
  );

  // Per-JD queries for "ALL JDs" mode. useQueries manages the cache itself,
  // runs every queryFn exactly once per stale window, and gives each cached
  // result the full enrichment (jobTitle + companyName from openJds). No
  // separate pre-fetch pass — that would shadow the enriched data with raw
  // responses and cause "Unspecified" to leak into the table.
  const allApplicationsQuery = useQueries({
    queries: allJdIds.map((jdId) => ({
      queryKey: ["admin", "jd-applications", jdId],
      queryFn: async () => {
        const res = await adminApplicationManager.getApplicationsByJdId(jdId);
        if (!res.success || !res.data) {
          return { applications: [] as ApplicationListItemDto[], jdInfo: undefined };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apps = (res.data.applications || (res.data as any)) as ApplicationListItemDto[];
        const jdInfo = openJds.find((j) => j.jdId === jdId);
        type AppWithCompany = ApplicationListItemDto & {
          companyId?: number;
          companyName?: string;
          companyLogoUrl?: string;
          jobTitle?: string;
        };
        const enriched = apps.map((app: AppWithCompany) => ({
          ...app,
          companyId: jdInfo?.company?.id ?? app.companyId,
          companyName: app.companyName || jdInfo?.company?.name,
          companyLogoUrl: app.companyLogoUrl || jdInfo?.company?.logoUrl,
          jobTitle: app.jobTitle || jdInfo?.title,
        }));
        return { applications: enriched, jdInfo };
      },
      enabled: numericSelectedJdId === null,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const isAllFetching = allApplicationsQuery.some((q) => q.isFetching);

  const applications: ApplicationListItemDto[] =
    numericSelectedJdId !== null
      ? (singleJdQuery.data?.applications ?? EMPTY_APPLICATIONS)
      : allApplicationsQuery.flatMap((q) => q.data?.applications ?? EMPTY_APPLICATIONS);

  const isLoading =
    numericSelectedJdId !== null
      ? singleJdQuery.isLoading
      : isAllFetching && applications.length === 0;

  const refetchApplications = () => {
    if (numericSelectedJdId !== null) {
      void singleJdQuery.refetch();
    } else {
      allApplicationsQuery.forEach((q) => {
        void q.refetch();
      });
    }
  };

  // Unique companies for filter dropdown
  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    openJds.forEach((j) => {
      if (j.company?.id && j.company?.name) {
        map.set(String(j.company.id), j.company.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [openJds]);

  // Filtered JDs based on selected company
  const availableJds = useMemo(() => {
    if (selectedCompanyId === "ALL") return openJds;
    return openJds.filter((j) => String(j.company?.id) === selectedCompanyId);
  }, [openJds, selectedCompanyId]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Company filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appCompanyId = (app as any).companyId;
      if (
        selectedCompanyId !== "ALL" &&
        appCompanyId &&
        String(appCompanyId) !== selectedCompanyId
      ) {
        return false;
      }

      // Status filter — per FE Guide:
      //   • IN_PROGRESS: status = IN_PROGRESS | PENDING | SOFT_FAILED
      //     (SOFT_FAILED = rớt 1 vòng nhưng vẫn được tiếp tục làm vòng sau
      //      → vẫn là đang xử lý, không phải trượt hẳn)
      //   • PASSED: PASSED | ACCEPTED | COMPLETED
      //   • FAILED: REJECTED | FAILED (chỉ thật sự trượt hẳn)
      //   • SOFT_FAILED: SOFT_FAILED riêng để user lọc xem nhanh các case này
      if (statusFilter !== "ALL") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = app.status as any;
        if (
          statusFilter === "IN_PROGRESS" &&
          status !== "IN_PROGRESS" &&
          status !== "PENDING" &&
          status !== "SOFT_FAILED"
        ) {
          return false;
        }
        if (
          statusFilter === "PASSED" &&
          status !== "PASSED" &&
          status !== "ACCEPTED" &&
          status !== "COMPLETED"
        ) {
          return false;
        }
        if (statusFilter === "FAILED" && status !== "REJECTED" && status !== "FAILED") {
          return false;
        }
        if (statusFilter === "SOFT_FAILED" && status !== "SOFT_FAILED") {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidateName = (app.candidateName || (app as any).applicantName || "").toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidateEmail = (app.candidateEmail || (app as any).email || "").toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jobTitle = ((app as any).jobTitle || "").toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const companyName = ((app as any).companyName || "").toLowerCase();

        return (
          candidateName.includes(q) ||
          candidateEmail.includes(q) ||
          jobTitle.includes(q) ||
          companyName.includes(q) ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          String(app.applicationId || (app as any).id).includes(q)
        );
      }

      return true;
    });
  }, [applications, selectedCompanyId, statusFilter, searchQuery]);

  // ⭐ 4 thẻ thống kê TỔNG = cộng dồn từ statistics của TẤT CẢ JD trong API #1.
  // Per FE Guide: nguồn số liệu là /api/admin/open-jds, không cần gọi thêm API.
  const aggregateStats = useMemo(() => {
    interface JdWithStats {
      statistics?: {
        totalApplications?: number;
        inProgressCount?: number;
        passedCount?: number;
        failedCount?: number;
      };
    }
    return (openJds as JdWithStats[]).reduce(
      (acc, jd) => {
        const s = jd.statistics ?? {};
        return {
          totalApplications: acc.totalApplications + (s.totalApplications ?? 0),
          inProgressCount: acc.inProgressCount + (s.inProgressCount ?? 0),
          passedCount: acc.passedCount + (s.passedCount ?? 0),
          failedCount: acc.failedCount + (s.failedCount ?? 0),
        };
      },
      { totalApplications: 0, inProgressCount: 0, passedCount: 0, failedCount: 0 }
    );
  }, [openJds]);

  const stats = {
    openJdCount: openJds.filter((j) => j.status === "OPEN").length,
    totalApplications: aggregateStats.totalApplications,
    inProgressCount: aggregateStats.inProgressCount,
    passedCount: aggregateStats.passedCount,
    failedCount: aggregateStats.failedCount,
  };

  // Pagination
  const [pageSize] = useHybridPageSize({
    key: "admin_applications_pagesize",
    defaultPageSize: 10,
  });

  const pagination = usePagination({
    totalCount: filteredApplications.length,
    pageSize,
  });

  const pageData = useMemo(() => {
    return filteredApplications.slice(pagination.startIndex, pagination.endIndex + 1);
  }, [filteredApplications, pagination.startIndex, pagination.endIndex]);

  const handleViewDetail = (appId: number) => {
    navigate(`/admin/applications/${appId}/details`);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
        return (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            {t("adminApplicationManagement.statusPassed", "ĐẠT")}
          </Badge>
        );
      case "REJECTED":
      case "FAILED":
        return (
          <Badge variant="destructive">
            {t("adminApplicationManagement.statusRejected", "TỪ CHỐI")}
          </Badge>
        );
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return (
          <Badge
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            {t("adminApplicationManagement.statusInProgress", "ĐANG XỬ LÝ")}
          </Badge>
        );
    }
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Header Bar */}
      <div className="hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
            <FileCheck2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("adminApplicationManagement.title", "Quản lý Đơn ứng tuyển")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                "adminApplicationManagement.subtitle",
                "Trung tâm quản lý toàn bộ lượt apply ứng viên trên tất cả công ty và vị trí tuyển dụng"
              )}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void refetchApplications();
          }}
          disabled={isLoading}
          className="h-8 gap-1.5 text-xs font-medium">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {t("common.refresh", "Làm mới")}
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-5 sm:p-6 md:px-8 dark:bg-slate-950">
        <div className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md dark:shadow-slate-950/40">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("adminApplicationManagement.title", "Quản lý đơn ứng tuyển")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t(
                  "adminApplicationManagement.subtitle",
                  "Theo dõi ứng viên, tiến độ tuyển dụng và kết quả ứng tuyển"
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              {[
                [
                  stats.totalApplications,
                  t("adminApplicationManagement.totalApplications", "Đơn ứng tuyển"),
                ],
                [companyOptions.length, t("common.company", "Công ty")],
                [openJds.length, t("adminApplicationManagement.openJds", "Vị trí mở")],
              ].map(([value, label], index) => (
                <div key={String(label)} className="flex items-center gap-5 sm:gap-6">
                  {index > 0 && <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />}
                  <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
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
            onSubmit={(event) => {
              event.preventDefault();
              pagination.goToFirstPage();
            }}
            className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                pagination.goToFirstPage();
              }}
              placeholder={t(
                "adminApplicationManagement.searchPlaceholder",
                "Tìm theo tên ứng viên, công ty hoặc vị trí..."
              )}
              className="h-[46px] flex-1 rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 text-[14.5px] text-slate-900 shadow-2xs placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-indigo-500/80"
            />
            <Button
              type="submit"
              className="h-[46px] shrink-0 rounded-xl border border-slate-200/90 bg-white px-6 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white">
              <Search className="mr-2 h-[18px] w-[18px]" />
              {t("common.search", "Tìm kiếm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetchApplications()}
              disabled={isLoading}
              className="h-[46px] shrink-0 rounded-xl border-slate-200/90 px-4 dark:border-slate-800 dark:bg-slate-900">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </form>

          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                Công ty:
              </span>
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  setSelectedJdId("");
                  pagination.goToFirstPage();
                }}>
                <SelectTrigger className="h-9 w-44 rounded-full border-slate-200 bg-white px-4 text-[13.5px] dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả</SelectItem>
                  {companyOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden h-5 w-px bg-slate-200 xl:block dark:bg-slate-800" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
                Trạng thái:
              </span>
              {[
                ["ALL", "Tất cả"],
                ["IN_PROGRESS", "Đang xử lý"],
                ["PASSED", "Đạt"],
                ["FAILED", "Trượt"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(id);
                    pagination.goToFirstPage();
                  }}
                  className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                    statusFilter === id
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-xs shadow-indigo-500/30 dark:border-indigo-500 dark:bg-indigo-600/90 dark:text-white dark:shadow-indigo-500/20"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legacy metric/filter controls kept out of the layout; the new subheader above is the single source of interaction. */}
        <div className="hidden">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t("adminApplicationManagement.openJds", "JD Đang mở")}
                </span>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.openJdCount}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t("adminApplicationManagement.totalApplications", "Tổng đơn Apply")}
                </span>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalApplications}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t("adminApplicationManagement.inProgress", "Đang phỏng vấn")}
                </span>
                <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.inProgressCount}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t("adminApplicationManagement.passed", "Đã trúng tuyển")}
                </span>
                <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.passedCount}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  {t("adminApplicationManagement.failed", "Trượt")}
                </span>
                <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {stats.failedCount}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    pagination.goToFirstPage();
                  }}
                  placeholder={t(
                    "adminApplicationManagement.searchPlaceholder",
                    "Tìm tên, email ứng viên, công ty..."
                  )}
                  className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-indigo-500 dark:border-slate-700"
                />
              </div>

              {/* Company Filter */}
              <Select
                value={selectedCompanyId}
                onValueChange={(val) => {
                  setSelectedCompanyId(val);
                  // Reset JD selection to "ALL" when company changes
                  setSelectedJdId("");
                  pagination.goToFirstPage();
                }}>
                <SelectTrigger className="h-8 w-44 border-slate-200 text-xs dark:border-slate-700">
                  <SelectValue
                    placeholder={t("adminApplicationManagement.allCompanies", "Tất cả công ty")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("adminApplicationManagement.allCompanies", "Tất cả công ty")}
                  </SelectItem>
                  {companyOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* JD Filter */}
              <Select
                value={selectedJdId || "ALL"}
                onValueChange={(val) => {
                  setSelectedJdId(val === "ALL" ? "" : val);
                  pagination.goToFirstPage();
                }}>
                <SelectTrigger className="h-8 w-64 border-slate-200 text-xs dark:border-slate-700">
                  <SelectValue
                    placeholder={t("adminApplicationManagement.allJds", "Tất cả vị trí (JD)")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    {t("adminApplicationManagement.allJds", "Tất cả vị trí (JD)")}
                  </SelectItem>
                  {availableJds.map((j) => (
                    <SelectItem key={j.jdId} value={String(j.jdId)}>
                      {j.title} (
                      {j.company?.name ||
                        t("adminApplicationManagement.unknownCompany", "Chưa rõ công ty")}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Pills — Per FE Guide: lọc client-side */}
            <div className="flex items-center gap-1">
              {[
                { id: "ALL", label: t("common.all", "Tất cả") },
                {
                  id: "IN_PROGRESS",
                  label: t("adminApplicationManagement.statusInProgress", "Đang xử lý"),
                },
                { id: "PASSED", label: t("adminApplicationManagement.statusPassed", "Đạt") },
                {
                  id: "FAILED",
                  label: t("adminApplicationManagement.statusFailed", "Trượt"),
                },
                {
                  id: "SOFT_FAILED",
                  label: t(
                    "adminApplicationManagement.statusSoftFailed",
                    "Rớt vòng — vẫn làm tiếp"
                  ),
                },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st.id);
                    pagination.goToFirstPage();
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    statusFilter === st.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}>
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table (Khảo thí & Đào tạo Standard) */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50/80 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-900">
                  <TableHead className="w-[70px] min-w-[70px] pl-6 font-semibold text-slate-700 dark:text-slate-200">
                    ID
                  </TableHead>
                  <TableHead className="w-[22%] min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminApplicationManagement.candidate", "Ứng viên")}
                  </TableHead>
                  <TableHead className="w-[20%] min-w-[160px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("common.company", "Công ty")}
                  </TableHead>
                  <TableHead className="w-[24%] min-w-[180px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminApplicationManagement.jobPosition", "Vị trí tuyển dụng")}
                  </TableHead>
                  <TableHead className="w-[14%] min-w-[120px] px-4 font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminApplicationManagement.currentRound", "Vòng hiện tại")}
                  </TableHead>
                  <TableHead className="w-[10%] min-w-[90px] px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                    {t("adminApplicationManagement.score", "Điểm số")}
                  </TableHead>
                  <TableHead className="w-[10%] min-w-[100px] pr-6 font-semibold text-slate-700 dark:text-slate-200">
                    {t("common.status", "Trạng thái")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openJds.length === 0 && isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-48 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span>{t("common.loadingData", "Đang tải dữ liệu...")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-48 text-center text-slate-400 dark:text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span>{t("common.loadingData", "Đang tải dữ liệu...")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-48 text-center text-slate-400 dark:text-slate-500">
                      {t(
                        "adminApplicationManagement.noApplicationsFound",
                        "Không tìm thấy đơn ứng tuyển nào."
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  pageData.map((app: any, idx: number) => {
                    const name =
                      app.candidateName ||
                      app.applicantName ||
                      t("adminApplicationManagement.anonymousCandidate", "Ứng viên ẩn danh");
                    const avatarUrl = app.avatarUrl || app.applicantAvatar;
                    const companyName = app.companyName || t("common.unspecified", "Company");
                    const companyLogoUrl =
                      app.companyLogoUrl || app.companyLogo || app.company?.logoUrl;
                    const companyInitials =
                      companyName
                        .split(" ")
                        .filter(Boolean)
                        .map((word: string) => word[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "IB";

                    return (
                      <TableRow
                        key={app.applicationId || app.id || idx}
                        onClick={() => handleViewDetail(app.applicationId || app.id)}
                        className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/60 dark:bg-slate-900 dark:hover:bg-slate-800/80">
                        <TableCell className="py-4 pl-6 font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <span>#{app.applicationId || app.id}</span>
                            {/* Dummy element to force row height alignment */}
                            <div
                              className="flex w-0 flex-col gap-1 overflow-hidden opacity-0"
                              aria-hidden="true">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="h-3.5 w-3.5"></span>
                                <span>dummy</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="h-3.5 w-3.5"></span>
                                <span>sample</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 shrink-0 rounded-[14px] border border-slate-100 dark:border-slate-800">
                              <AvatarImage src={avatarUrl} alt={name} />
                              <AvatarFallback className="rounded-[14px] bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-300">
                                {name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 text-xs font-bold text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-400">
                              {companyLogoUrl ? (
                                <img
                                  src={companyLogoUrl}
                                  alt={companyName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                companyInitials
                              )}
                            </div>
                            <span className="truncate">{companyName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {app.jobTitle || t("common.unspecified", "Chưa xác định")}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <Layers className="h-4 w-4 text-indigo-500" />
                            <span>
                              {app.currentRoundName ||
                                (app.currentRoundOrder
                                  ? `${t("adminApplicationManagement.roundPrefix", "Vòng ")}${app.currentRoundOrder}`
                                  : "—")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm font-bold text-indigo-600 dark:text-sky-400">
                          {app.overallScore !== undefined ? `${app.overallScore}/100` : "—"}
                        </TableCell>
                        <TableCell className="py-4">{getStatusBadge(app.status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-end border-t border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
              <PaginationControl pagination={pagination} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
