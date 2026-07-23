import { ApplicationDetailDrawer } from "@/components/shared";
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
  type AdminOpenJdResponseDto,
  type ApplicationListItemDto,
} from "@/services/admin-application.manager";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Folder,
  Layers,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function AdminApplicationManagementPage() {
  const { t } = useTranslation();

  const [openJds, setOpenJds] = useState<AdminOpenJdResponseDto[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("ALL");
  const [selectedJdId, setSelectedJdId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [applications, setApplications] = useState<ApplicationListItemDto[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 1. Fetch Open JDs for dropdown filters
  const loadOpenJds = useCallback(async () => {
    const res = await adminApplicationManager.getOpenJds();
    if (res.success && res.data) {
      setOpenJds(res.data);
    }
  }, []);

  // 2. Fetch applications
  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      if (selectedJdId !== "ALL") {
        const res = await adminApplicationManager.getApplicationsByJdId(Number(selectedJdId));
        if (res.success && res.data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setApplications((res.data.applications || res.data as any) as ApplicationListItemDto[]);
        } else {
          setApplications([]);
        }
      } else {
        // Fetch applications from all open JDs in parallel
        const jdIds = openJds.map((j) => j.id).filter((id): id is number => id !== undefined);
        if (jdIds.length > 0) {
          const results = await Promise.all(
            jdIds.map((id) => adminApplicationManager.getApplicationsByJdId(id))
          );
          const allApps: ApplicationListItemDto[] = [];
          results.forEach((r, idx) => {
            if (r.success && r.data) {
              const jdInfo = openJds[idx];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rawApps = (r.data.applications || r.data as any) as ApplicationListItemDto[];
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              rawApps.forEach((app: any) => {
                allApps.push({
                  ...app,
                  companyName: app.companyName || jdInfo.companyName,
                  jobTitle: app.jobTitle || jdInfo.title,
                });
              });
            }
          });
          setApplications(allApps);
        } else {
          setApplications([]);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(t("common.unableToLoadData", "Không thể tải danh sách đơn ứng tuyển"));
    } finally {
      setIsLoading(false);
    }
  }, [openJds, selectedJdId, t]);

  useEffect(() => {
    loadOpenJds();
  }, [loadOpenJds]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Unique companies for filter dropdown
  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    openJds.forEach((j) => {
      if (j.companyId && j.companyName) {
        map.set(String(j.companyId), j.companyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [openJds]);

  // Filtered JDs based on selected company
  const availableJds = useMemo(() => {
    if (selectedCompanyId === "ALL") return openJds;
    return openJds.filter((j) => String(j.companyId) === selectedCompanyId);
  }, [openJds, selectedCompanyId]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Company filter
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appCompanyId = (app as any).companyId;
      if (selectedCompanyId !== "ALL" && appCompanyId && String(appCompanyId) !== selectedCompanyId) {
        return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "PASSED" && app.status !== "PASSED" && app.status !== "ACCEPTED") return false;
        if (statusFilter === "REJECTED" && app.status !== "REJECTED" && app.status !== "FAILED") return false;
        if (statusFilter === "IN_PROGRESS" && app.status !== "IN_PROGRESS" && app.status !== "PENDING") return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidateName = (app.candidateName || (app as any).applicantName || "").toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidateEmail = (app.candidateEmail || (app as any).email || "").toLowerCase();
        const jobTitle = (app.jobTitle || "").toLowerCase();
        const companyName = (app.companyName || "").toLowerCase();

        return (
          candidateName.includes(q) ||
          candidateEmail.includes(q) ||
          jobTitle.includes(q) ||
          companyName.includes(q) ||
          String(app.id).includes(q)
        );
      }

      return true;
    });
  }, [applications, selectedCompanyId, statusFilter, searchQuery]);

  // Metrics
  const stats = useMemo(() => {
    const totalApps = applications.length;
    const inProgressApps = applications.filter((a) => a.status === "IN_PROGRESS" || a.status === "PENDING").length;
    const passedApps = applications.filter((a) => a.status === "PASSED" || a.status === "ACCEPTED").length;
    const openJdCount = openJds.filter((j) => j.status === "OPEN").length;

    return { totalApps, inProgressApps, passedApps, openJdCount };
  }, [applications, openJds]);

  // Pagination
  const hybridPageSize = useHybridPageSize({
    key: "admin_applications",
    defaultPageSize: 10,
  });
  const pagination = usePagination(filteredApplications, {
    pageSize: hybridPageSize,
  });

  const handleViewDetail = (appId: number) => {
    setSelectedAppId(appId);
    setIsDrawerOpen(true);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PASSED":
      case "ACCEPTED":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400">ĐẠT</Badge>;
      case "REJECTED":
      case "FAILED":
        return <Badge variant="destructive">TỪ CHỐI</Badge>;
      case "IN_PROGRESS":
      case "PENDING":
      default:
        return <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400">ĐANG XỬ LÝ</Badge>;
    }
  };

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      {/* Header Bar */}
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
            <FileCheck2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quản lý Đơn ứng tuyển
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Trung tâm quản lý toàn bộ lượt apply ứng viên trên tất cả công ty và vị trí tuyển dụng
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadOpenJds();
            loadApplications();
          }}
          disabled={isLoading}
          className="h-8 gap-1.5 text-xs font-medium">
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JD Đang mở</span>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.openJdCount}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng đơn Apply</span>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.totalApps}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang phỏng vấn</span>
              <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgressApps}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã trúng tuyển</span>
              <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.passedApps}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  pagination.goToFirstPage();
                }}
                placeholder="Tìm tên, email ứng viên, công ty..."
                className="h-8 border-slate-200 pl-9 text-xs focus-visible:ring-indigo-500 dark:border-slate-700"
              />
            </div>

            {/* Company Filter */}
            <Select
              value={selectedCompanyId}
              onValueChange={(val) => {
                setSelectedCompanyId(val);
                setSelectedJdId("ALL");
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="h-8 w-44 text-xs border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Tất cả công ty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả công ty</SelectItem>
                {companyOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* JD Filter */}
            <Select
              value={selectedJdId}
              onValueChange={(val) => {
                setSelectedJdId(val);
                pagination.goToFirstPage();
              }}>
              <SelectTrigger className="h-8 w-48 text-xs border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Tất cả vị trí (JD)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả vị trí (JD)</SelectItem>
                {availableJds.map((j) => (
                  <SelectItem key={j.id} value={String(j.id)}>
                    {j.title} ({j.companyName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1">
            {[
              { id: "ALL", label: "Tất cả" },
              { id: "IN_PROGRESS", label: "Đang xử lý" },
              { id: "PASSED", label: "Đạt" },
              { id: "REJECTED", label: "Từ chối" },
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

        {/* Table (Khảo thí & Đào tạo Standard) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Hiển thị <strong className="text-slate-800 dark:text-slate-200">{filteredApplications.length}</strong> đơn ứng tuyển
            </span>
          </div>

          <div className="overflow-hidden border-y border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-950">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="pl-6 w-[80px]">#ID</TableHead>
                  <TableHead className="min-w-[200px]">Ứng viên</TableHead>
                  <TableHead className="min-w-[160px]">Công ty</TableHead>
                  <TableHead className="min-w-[180px]">Vị trí tuyển dụng</TableHead>
                  <TableHead className="w-[140px]">Vòng hiện tại</TableHead>
                  <TableHead className="w-[100px] text-center">Điểm số</TableHead>
                  <TableHead className="w-[130px]">Trạng thái</TableHead>
                  <TableHead className="pr-6 w-[100px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span>Đang tải dữ liệu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pagination.paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-slate-400">
                      Không tìm thấy đơn ứng tuyển nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagination.paginatedItems.map((app) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const name = app.candidateName || (app as any).applicantName || "Ứng viên ẩn danh";
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const email = app.candidateEmail || (app as any).email || "Chưa có email";
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const avatarUrl = (app as any).avatarUrl || (app as any).applicantAvatar;

                    return (
                      <TableRow
                        key={app.id}
                        onClick={() => handleViewDetail(app.id!)}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                        <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                          #{app.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-800">
                              <AvatarImage src={avatarUrl} alt={name} />
                              <AvatarFallback className="bg-indigo-50 text-indigo-600 font-bold text-xs dark:bg-indigo-950 dark:text-indigo-400">
                                {name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white text-xs">
                                {name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                            <Folder className="h-3.5 w-3.5 text-slate-400" />
                            {app.companyName || "Chưa xác định"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {app.jobTitle || "Chưa xác định"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            <span>
                              {app.currentRoundName || (app.currentRoundOrder ? `Vòng ${app.currentRoundOrder}` : "—")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {app.overallScore !== undefined ? `${app.overallScore}/100` : "—"}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(app.status)}
                        </TableCell>
                        <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(app.id!)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
            <PaginationControl pagination={pagination} />
          </div>
        </div>
      </div>

      {/* Slide-over Application Detail Drawer */}
      <ApplicationDetailDrawer
        applicationId={selectedAppId}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAppId(null);
        }}
        onStatusChange={() => {
          loadApplications();
        }}
      />
    </div>
  );
}
