import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingCardList } from "@/components/ui/loading-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchClient } from "@/lib/api";
import { formatDateTime } from "@/lib/formatting";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { applicationService } from "@/services/application.manager";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Search,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { components } from "../../../../schema-from-be";

// ============================================================
// Types
// ============================================================

type Application = components["schemas"]["Application"];
type JobDescription = components["schemas"]["JobDescription"];
type RoundType =
  | "CV_SCREENING"
  | "EMAIL_SIMULATOR"
  | "QUIZ"
  | "CODING"
  | "CODE_REVIEW"
  | "MENTOR_REVIEW"
  | "AI_INTERVIEW";

type ApplicationStatus = "IN_PROGRESS" | "PASSED" | "FAILED" | "SOFT_FAILED";

interface JdRound {
  id?: number;
  name?: string;
  roundOrder?: number;
  roundType?: RoundType | string;
  passThreshold?: number;
}

interface EnrichedApplication extends Application {
  jobTitle?: string;
  companyName?: string;
  rounds?: JdRound[];
}

// ============================================================
// Status Badge (Application level)
// ============================================================

function ApplicationStatusBadge({
  status,
  className: extraClassName,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const config: Record<ApplicationStatus, { label: string; className: string }> = {
    IN_PROGRESS: {
      label: t("userApplicationhistory.statusInterviewing", "Đang ứng tuyển"),
      className:
        "bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80",
    },
    PASSED: {
      label: t("userApplicationhistory.statusCompleted", "Trúng tuyển"),
      className:
        "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80",
    },
    FAILED: {
      label: t("userApplicationhistory.statusRejected", "Chưa đạt"),
      className:
        "bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/80",
    },
    SOFT_FAILED: {
      label: t("userApplicationhistory.needsImprovement", "Cần cải thiện"),
      className:
        "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80",
    },
  };
  const { label, className } = config[status] ?? { label: status, className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
        className,
        extraClassName
      )}>
      {label}
    </span>
  );
}

// Helper: Extract Initials from Company Name
function getCompanyInitials(name?: string): string {
  if (!name) return "CO";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// ============================================================
// Application Card Component (Hub View)
// ============================================================

function ApplicationHubCard({ application }: { application: EnrichedApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalRounds = application.rounds?.length ?? 0;
  const currentRoundOrder = application.currentRoundOrder ?? 1;
  const isCompleted =
    application.status === "PASSED" ||
    application.status === "FAILED" ||
    application.status === "SOFT_FAILED";

  // Calculate progress percent
  const progressPercent = useMemo(() => {
    if (isCompleted) return 100;
    if (totalRounds <= 0) return 0;
    return Math.min(Math.round(((currentRoundOrder - 1) / totalRounds) * 100), 100);
  }, [isCompleted, totalRounds, currentRoundOrder]);

  const initials = getCompanyInitials(application.companyName);

  // Validate Score (Hide if negative like -1 or invalid)
  const isValidScore =
    typeof application.overallScore === "number" &&
    application.overallScore >= 0 &&
    application.overallScore <= 100;

  const handleOpenWorkspace = () => {
    navigate(`/user/application/${application.id}`);
  };

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:shadow-indigo-950/20">
      <div>
        {/* Card Top Header */}
        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              {/* Company Logo Badge */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-[#0047AB] to-blue-700 text-sm font-bold text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#0047AB] dark:text-slate-100 dark:group-hover:text-blue-400">
                  {application.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
                </h3>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {application.companyName ?? t("userApplicationhistory.company", "Công ty")}
                </p>
              </div>
            </div>

            <ApplicationStatusBadge
              status={application.status as ApplicationStatus}
              className="shrink-0"
            />
          </div>
        </CardHeader>

        {/* Card Content & Progress */}
        <CardContent className="space-y-3.5 px-5 py-3">
          {/* Round Progress Bar */}
          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {isCompleted
                  ? t("userApplicationhistory.completedRounds", "Đã hoàn tất tất cả vòng")
                  : totalRounds > 0
                    ? `Vòng ${currentRoundOrder} / ${totalRounds}`
                    : t("userApplicationhistory.round", "Vòng thi")}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {progressPercent}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  application.status === "PASSED"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : application.status === "FAILED"
                      ? "bg-gradient-to-r from-slate-400 to-slate-500"
                      : application.status === "SOFT_FAILED"
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-[#0047AB] to-blue-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Sub Metadata Row */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono text-[11px]">
              {application.createdAt ? formatDateTime(application.createdAt) : ""}
            </span>

            {isValidScore && (
              <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{application.overallScore}</span>
                <span className="text-[10px] font-normal text-slate-400">/100</span>
              </div>
            )}
          </div>
        </CardContent>
      </div>

      {/* Card Action Footer */}
      <div className="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/60">
        <Button
          onClick={handleOpenWorkspace}
          variant={application.status === "IN_PROGRESS" ? "default" : "outline"}
          className={cn(
            "h-9.5 w-full justify-center gap-2 rounded-lg text-xs font-semibold shadow-2xs transition-all",
            application.status === "IN_PROGRESS"
              ? "bg-[#0047AB] text-white hover:bg-[#003d91]"
              : "border-slate-200/90 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800"
          )}>
          {application.status === "IN_PROGRESS" ? (
            <>
              <span>{t("userApplicationhistory.enterWorkspace", "Vào Workspace ứng tuyển")}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              <span>{t("userApplicationhistory.viewResultDetail", "Xem kết quả & Chi tiết")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

// ============================================================
// Main Applications Hub Page Component
// ============================================================

export function ApplicationHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch applications state
  const [apps, setApps] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState(false);
  const [refetching, setRefetching] = useState(false);

  const loadApplications = async (showRefetching = false) => {
    if (showRefetching) setRefetching(true);
    else setAppsLoading(true);
    try {
      const result = await applicationService.getMyApplications();
      if (result.success) {
        setApps(result.data ?? []);
        setAppsError(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["get", "/api/application-details"] }),
          queryClient.invalidateQueries({ queryKey: ["get", "/api/rounds"] }),
          queryClient.invalidateQueries({
            queryKey: ["get", "/api/rounds/find-by-application-order"],
          }),
        ]);
      } else {
        setAppsError(true);
      }
    } catch {
      setAppsError(true);
    } finally {
      setAppsLoading(false);
      setRefetching(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // Batch fetch JD data
  const [jdMap, setJdMap] = useState<
    Map<number, { title?: string; companyName?: string; rounds?: JdRound[]; companyId?: number }>
  >(new Map());

  useEffect(() => {
    const jdIds = [...new Set(apps.map((a) => a.jdId).filter(Boolean))] as number[];
    if (jdIds.length === 0) return;

    const fetchJDs = async () => {
      const results = await Promise.allSettled(
        jdIds.map(async (id) => {
          const result = await fetchClient.GET("/api/job-descriptions/{id}", {
            params: { path: { id } },
          });
          if (!result.response?.ok) return null;
          const jd = result.data as JobDescription;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extra = result.data as any;
          return {
            title: jd.title,
            companyName: extra.companyName,
            rounds: extra.rounds as JdRound[],
            companyId: extra.companyId,
          };
        })
      );

      const map = new Map<
        number,
        { title?: string; companyName?: string; rounds?: JdRound[]; companyId?: number }
      >();
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(jdIds[i], {
            title: r.value.title,
            companyName: r.value.companyName,
            rounds: r.value.rounds,
            companyId: r.value.companyId,
          });
        }
      });
      setJdMap(map);
    };
    fetchJDs();
  }, [apps]);

  // Enrich applications
  const enrichedApplications = useMemo<EnrichedApplication[]>(() => {
    const enriched = apps.map((app) => {
      const jd = jdMap.get(app.jdId ?? 0);
      return {
        ...app,
        jobTitle: jd?.title,
        companyName: jd?.companyName,
        rounds: jd?.rounds,
        companyId: jd?.companyId,
      };
    });
    return enriched.sort((a, b) => {
      const aTs = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTs !== bTs) return bTs - aTs;
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }, [apps, jdMap]);

  // Statistics (Filtered out invalid/negative scores like -1 or >100)
  const stats = useMemo(() => {
    const total = enrichedApplications.length;
    const inProgress = enrichedApplications.filter((a) => a.status === "IN_PROGRESS").length;
    const passed = enrichedApplications.filter((a) => a.status === "PASSED").length;
    const validScores = enrichedApplications
      .map((a) => a.overallScore)
      .filter((s): s is number => typeof s === "number" && s >= 0 && s <= 100);
    const avgScore =
      validScores.length > 0
        ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
        : null;
    return { total, inProgress, passed, avgScore };
  }, [enrichedApplications]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    let items = enrichedApplications;
    if (statusFilter !== "all") {
      items = items.filter((app) => app.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (app) =>
          app.jobTitle?.toLowerCase().includes(q) || app.companyName?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [enrichedApplications, statusFilter, searchQuery]);

  return (
    <div className="w-full space-y-6 px-4 py-4 pb-12 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("userApplicationhistory.pageTitle", "Lịch sử ứng tuyển")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "userApplicationhistory.pageDescriptionHub",
              "Quản lý toàn bộ tiến độ phỏng vấn và truy cập Workspace ứng tuyển của bạn."
            )}
          </p>
        </div>
        <ReloadButton
          onReload={() => loadApplications(true)}
          isLoading={refetching}
          tooltip={t("userApplicationhistory.reload", "Tải lại dữ liệu")}
        />
      </div>

      {/* Stats Summary Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Apps */}
        <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0047AB] dark:bg-blue-950/60 dark:text-blue-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("userApplicationhistory.totalApplications", "Tổng số đơn")}
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {stats.total}
              </h3>
            </div>
          </div>
        </Card>

        {/* In Progress */}
        <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("userApplicationhistory.inProgressCount", "Đang ứng tuyển")}
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {stats.inProgress}
              </h3>
            </div>
          </div>
        </Card>

        {/* Passed */}
        <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("userApplicationhistory.passedCount", "Trúng tuyển")}
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {stats.passed}
              </h3>
            </div>
          </div>
        </Card>

        {/* Average Score */}
        <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("userApplicationhistory.avgScore", "Điểm trung bình")}
              </p>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {stats.avgScore ? `${stats.avgScore}/100` : "--"}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
              placeholder={t(
                "userApplicationhistory.searchPlaceholder",
                "Tìm theo vị trí tuyển dụng, công ty..."
              )}
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "all")}>
            <SelectTrigger className="w-full text-xs sm:w-[220px]">
              <SelectValue
                placeholder={t("userApplicationhistory.filterByStatus", "Lọc theo trạng thái")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("userApplicationhistory.allStatus", "Tất cả trạng thái")}
              </SelectItem>
              <SelectItem value="IN_PROGRESS">
                {t("userApplicationhistory.statusInterviewing", "Đang ứng tuyển")}
              </SelectItem>
              <SelectItem value="PASSED">
                {t("userApplicationhistory.statusCompleted", "Trúng tuyển")}
              </SelectItem>
              <SelectItem value="FAILED">
                {t("userApplicationhistory.statusRejected", "Chưa đạt")}
              </SelectItem>
              <SelectItem value="SOFT_FAILED">
                {t("userApplicationhistory.needsImprovement", "Cần cải thiện")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchQuery || statusFilter !== "all") && (
          <div className="mt-3 text-xs text-slate-500">
            {t("userApplicationhistory.searchResults", "Hiển thị")}{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {filteredApplications.length}
            </strong>{" "}
            / {enrichedApplications.length}{" "}
            {t("userApplicationhistory.applications", "đơn ứng tuyển")}
          </div>
        )}
      </Card>

      {/* Main Content Grid */}
      {appsLoading ? (
        <LoadingCardList count={6} />
      ) : appsError ? (
        <Card className="flex h-56 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center">
          <XCircle className="h-10 w-10 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t(
                "userApplicationhistory.unableToDownload",
                "Không thể tải danh sách đơn ứng tuyển"
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng kiểm tra kết nối mạng hoặc thử lại.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadApplications()}
            className="text-xs">
            {t("userApplicationhistory.retry", "Thử lại")}
          </Button>
        </Card>
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t("userApplicationhistory.noApplicationsYet", "Chưa có đơn ứng tuyển nào")}
          description={t(
            "userApplicationhistory.findJobsDescription",
            "Khám phá các cơ hội nghề nghiệp mới và bắt đầu ứng tuyển ngay hôm nay."
          )}
          action={
            <Button
              onClick={() => navigate("/enterprise/companies")}
              className="gap-2 bg-[#0047AB] text-white hover:bg-[#003d91]">
              <Briefcase className="h-4 w-4" />
              {t("userApplicationhistory.findAJobNow", "Tìm việc ngay")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredApplications.map((app) => (
            <ApplicationHubCard key={`hub-app-${app.id}`} application={app} />
          ))}
        </div>
      )}
    </div>
  );
}
