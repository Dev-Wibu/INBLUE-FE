import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Search,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
        "bg-blue-500/10 text-blue-600 border border-blue-200/80 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-800/60",
    },
    PASSED: {
      label: t("userApplicationhistory.statusCompleted", "Trúng tuyển"),
      className:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-800/60",
    },
    FAILED: {
      label: t("userApplicationhistory.statusRejected", "Chưa đạt"),
      className:
        "bg-slate-500/10 text-slate-600 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60",
    },
    SOFT_FAILED: {
      label: t("userApplicationhistory.needsImprovement", "Cần cải thiện"),
      className:
        "bg-amber-500/10 text-amber-600 border border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-800/60",
    },
  };
  const { label, className } = config[status] ?? { label: status, className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shadow-2xs",
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
// Active Workspace Card Component (Carousel View)
// ============================================================

function ActiveWorkspaceCard({ application }: { application: EnrichedApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalRounds = application.rounds?.length ?? 0;
  const currentRoundOrder = application.currentRoundOrder ?? 1;

  const progressPercent = useMemo(() => {
    if (totalRounds <= 0) return 0;
    return Math.min(Math.round(((currentRoundOrder - 1) / totalRounds) * 100), 100);
  }, [totalRounds, currentRoundOrder]);

  const initials = getCompanyInitials(application.companyName);

  return (
    <div className="group relative flex w-[340px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl dark:border-indigo-900/40 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-950 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/30">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl transition-all group-hover:bg-indigo-500/20 dark:bg-indigo-500/20" />

      <div className="relative z-10 space-y-4">
        {/* Company Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0047AB] via-indigo-600 to-purple-600 text-xs font-bold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#0047AB] dark:text-slate-100 dark:group-hover:text-blue-400">
                {application.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
              </h3>
              <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                {application.companyName ?? t("userApplicationhistory.company", "Công ty")}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            Đang thi
          </span>
        </div>

        {/* Abstract Progress Badge (Hides all 6-7 rounds details) */}
        <div className="space-y-2 rounded-xl border border-indigo-100/80 bg-white/80 p-3.5 shadow-2xs backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
              <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              {totalRounds > 0
                ? `Vòng ${currentRoundOrder} / ${totalRounds}`
                : t("userApplicationhistory.round", "Vòng thi")}
            </span>
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {progressPercent}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0047AB] via-indigo-600 to-purple-600 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Sub Metadata Row */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Nộp: {application.createdAt ? formatDateTime(application.createdAt) : ""}</span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            Workspace sẵn sàng
          </span>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="relative z-10 pt-4">
        <Button
          onClick={() => navigate(`/user/application/${application.id}`)}
          className="h-9.5 w-full justify-center gap-2 rounded-xl bg-[#0047AB] text-xs font-bold text-white shadow-md shadow-blue-900/10 transition-all hover:bg-[#003d91] dark:shadow-none">
          <span>{t("userApplicationhistory.enterWorkspace", "Vào Workspace ứng tuyển")}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Compact Application Card Component (Grid View)
// ============================================================

function CompactApplicationCard({ application }: { application: EnrichedApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalRounds = application.rounds?.length ?? 0;
  const initials = getCompanyInitials(application.companyName);

  const isValidScore =
    typeof application.overallScore === "number" &&
    application.overallScore >= 0 &&
    application.overallScore <= 100;

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="space-y-3">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs ring-1 ring-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#0047AB] dark:text-slate-100 dark:group-hover:text-blue-400">
                {application.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
              </h4>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {application.companyName ?? t("userApplicationhistory.company", "Công ty")}
              </p>
            </div>
          </div>

          <ApplicationStatusBadge status={application.status as ApplicationStatus} />
        </div>

        {/* Abstract Summary Text (Hides 6-7 detailed rounds) */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-mono">
            {application.createdAt ? formatDateTime(application.createdAt) : ""}
          </span>

          {isValidScore ? (
            <div className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{application.overallScore}</span>
              <span className="text-[9px] font-normal text-slate-400">/100</span>
            </div>
          ) : (
            <span>{totalRounds > 0 ? `${totalRounds} vòng thi` : ""}</span>
          )}
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-3">
        <Button
          onClick={() => navigate(`/user/application/${application.id}`)}
          variant="outline"
          className="h-8 w-full justify-center gap-1.5 rounded-lg border-slate-200/90 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
          <span>{t("userApplicationhistory.viewResultDetail", "Xem kết quả & Chi tiết")}</span>
          <ChevronRight className="h-3 w-3" />
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

  // Carousel Scroll Ref
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -360 : 360;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

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

  // Active Applications (In Progress)
  const activeApplications = useMemo(() => {
    return enrichedApplications.filter((a) => a.status === "IN_PROGRESS");
  }, [enrichedApplications]);

  // Statistics
  const stats = useMemo(() => {
    const total = enrichedApplications.length;
    const inProgress = activeApplications.length;
    const passed = enrichedApplications.filter((a) => a.status === "PASSED").length;
    const validScores = enrichedApplications
      .map((a) => a.overallScore)
      .filter((s): s is number => typeof s === "number" && s >= 0 && s <= 100);
    const avgScore =
      validScores.length > 0
        ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
        : null;
    return { total, inProgress, passed, avgScore };
  }, [enrichedApplications, activeApplications]);

  // Filtered applications for main section
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
    <div className="w-full space-y-8 px-4 py-4 pb-12 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("userApplicationhistory.pageTitle", "Lịch sử ứng tuyển")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "userApplicationhistory.pageDescriptionHub",
              "Quản lý các đơn phỏng vấn đang thực hiện và truy cập Workspace ứng tuyển."
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

      {/* TOP SECTION: Active Workspaces Carousel (Option 4 Core) */}
      {activeApplications.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 fill-amber-500 text-amber-500" />
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Đang ứng tuyển ({activeApplications.length})
              </h2>
            </div>

            {/* Carousel Arrow Navigation Controls */}
            {activeApplications.length > 2 && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollCarousel("left")}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scrollCarousel("right")}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Active Workspaces Slider */}
          <div
            ref={carouselRef}
            className="scrollbar-none flex w-full gap-4 overflow-x-auto scroll-smooth pb-2">
            {activeApplications.map((app) => (
              <ActiveWorkspaceCard key={`active-app-${app.id}`} application={app} />
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM SECTION: Filter & All Applications Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tất cả đơn ứng tuyển
          </h2>
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
          <LoadingCardList count={8} />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filteredApplications.map((app) => (
              <CompactApplicationCard key={`compact-app-${app.id}`} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
