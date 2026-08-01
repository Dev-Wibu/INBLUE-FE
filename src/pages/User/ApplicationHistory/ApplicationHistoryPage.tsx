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
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
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

// Map roundType to readable step label
const ROUND_TYPE_STEP_LABELS: Record<string, string> = {
  CV_SCREENING: "Sơ tuyển CV",
  EMAIL_SIMULATOR: "Mô phỏng Email",
  QUIZ: "Bài thi Quiz",
  CODING: "Thử thách Coding",
  CODE_REVIEW: "Đánh giá Code",
  MENTOR_REVIEW: "Phỏng vấn Mentor",
  AI_INTERVIEW: "Phỏng vấn AI",
};

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
      label: t("userApplicationhistory.statusInterviewing", "IN PROGRESS"),
      className:
        "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
    },
    PASSED: {
      label: t("userApplicationhistory.statusCompleted", "OFFER RECEIVED"),
      className:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
    },
    FAILED: {
      label: t("userApplicationhistory.statusRejected", "REJECTED"),
      className:
        "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
    },
    SOFT_FAILED: {
      label: t("userApplicationhistory.needsImprovement", "REVIEWING"),
      className:
        "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30",
    },
  };
  const { label, className } = config[status] ?? { label: status, className: "" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase",
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
// Circular Progress Gauge Component
// ============================================================

function CircularProgressGauge({
  currentRound,
  totalRounds,
  progressPercent,
  currentRoundType,
}: {
  currentRound: number;
  totalRounds: number;
  progressPercent: number;
  currentRoundType?: string;
}) {
  const radius = 36;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const stepName =
    ROUND_TYPE_STEP_LABELS[currentRoundType?.replace("MENTROR", "MENTOR") ?? ""] ||
    "Đang thực hiện";

  return (
    <div className="my-2 flex flex-col items-center justify-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 96 96">
          {/* Background circle track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active progress stroke */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            className="stroke-blue-600 transition-all duration-700 ease-out dark:stroke-blue-500"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        {/* Center Round Counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Round
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
            {currentRound}/{totalRounds > 0 ? totalRounds : 1}
          </span>
        </div>
      </div>
      <span className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
        {stepName}
      </span>
    </div>
  );
}

// ============================================================
// Vertical Active Application Card (Exact Style match to user reference image)
// ============================================================

function ActiveApplicationCard({ application }: { application: EnrichedApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalRounds = application.rounds?.length ?? 0;
  const currentRoundOrder = application.currentRoundOrder ?? 1;

  // Active round type
  const activeRoundObj = application.rounds?.find((r) => r.roundOrder === currentRoundOrder);
  const currentRoundType = activeRoundObj?.roundType;

  const progressPercent = useMemo(() => {
    if (totalRounds <= 0) return 0;
    return Math.min(Math.round(((currentRoundOrder - 1) / totalRounds) * 100), 100);
  }, [totalRounds, currentRoundOrder]);

  const initials = getCompanyInitials(application.companyName);

  return (
    <div className="group relative flex w-[275px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-blue-500/80 dark:hover:shadow-blue-950/30">
      <div className="space-y-3">
        {/* Top Header: Logo + Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0047AB] via-indigo-600 to-blue-700 text-xs font-bold text-white shadow-xs">
            {initials}
          </div>

          <ApplicationStatusBadge status={application.status as ApplicationStatus} />
        </div>

        {/* Title & Company Info */}
        <div>
          <h3 className="line-clamp-1 text-sm font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
            {application.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {application.companyName ?? t("userApplicationhistory.company", "Công ty")}
          </p>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Vietnam
            </span>
            <span>{application.createdAt ? formatDateTime(application.createdAt) : ""}</span>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <CircularProgressGauge
          currentRound={currentRoundOrder}
          totalRounds={totalRounds}
          progressPercent={progressPercent}
          currentRoundType={currentRoundType}
        />
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 pt-3">
        <Button
          onClick={() => navigate(`/user/application/${application.id}`)}
          className="h-9 flex-1 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-xs transition-colors hover:bg-blue-700">
          <span>{t("userApplicationhistory.enterWorkspace", "Vào Workspace")}</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Completed Horizontal Application Card (Exact match to bottom reference)
// ============================================================

function CompletedApplicationCard({ application }: { application: EnrichedApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const initials = getCompanyInitials(application.companyName);

  const isValidScore =
    typeof application.overallScore === "number" &&
    application.overallScore >= 0 &&
    application.overallScore <= 100;

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-slate-700">
      <div className="space-y-3">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-300">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                {application.companyName ?? t("userApplicationhistory.company", "Công ty")}
              </h4>
              <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {application.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
              </p>
            </div>
          </div>

          <ApplicationStatusBadge status={application.status as ApplicationStatus} />
        </div>

        {/* Info & Score */}
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-mono">
            {application.createdAt ? formatDateTime(application.createdAt) : ""}
          </span>

          {isValidScore ? (
            <div className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{application.overallScore}</span>
              <span className="text-[9px] font-normal text-slate-400">/100</span>
            </div>
          ) : (
            <span>Đã hoàn thành</span>
          )}
        </div>
      </div>

      {/* Button Action */}
      <div className="pt-3">
        <Button
          onClick={() => navigate(`/user/application/${application.id}`)}
          variant="outline"
          className="h-8 w-full justify-between rounded-lg border-slate-200/90 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">
          <span>{t("userApplicationhistory.viewResultDetail", "Xem kết quả & Chi tiết")}</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        </Button>
      </div>
    </Card>
  );
}

// ============================================================
// Main Page Component
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
      const scrollAmount = direction === "left" ? -295 : 295;
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

  // Completed / Other Applications
  const completedApplications = useMemo(() => {
    let items = enrichedApplications;
    if (statusFilter !== "all") {
      items = items.filter((app) => app.status === statusFilter);
    } else {
      // By default show all non-in-progress if active section is present
      items = items.filter((app) => app.status !== "IN_PROGRESS");
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
    <div className="w-full space-y-8 px-4 py-4 pb-16 sm:px-6 lg:px-8">
      {/* Top Bar Navigation & Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("userApplicationhistory.pageTitle", "Lịch sử ứng tuyển")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Theo dõi danh sách các đơn phỏng vấn đang thực hiện và kết quả đã đạt được.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Integrated Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
              placeholder={t("userApplicationhistory.searchPlaceholder", "Tìm kiếm nhanh...")}
            />
          </div>

          <ReloadButton
            onReload={() => loadApplications(true)}
            isLoading={refetching}
            tooltip={t("userApplicationhistory.reload", "Tải lại dữ liệu")}
          />
        </div>
      </div>

      {/* SECTION 1: Active Applications (Matching User Reference Image Exactly) */}
      {activeApplications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Active Applications
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {activeApplications.length}
              </span>
            </div>

            {/* Carousel Arrow Controls */}
            {activeApplications.length > 3 && (
              <div className="flex items-center gap-1">
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

          {/* Vertical Active Cards Slider */}
          <div
            ref={carouselRef}
            className="scrollbar-none flex w-full gap-4 overflow-x-auto scroll-smooth pb-2">
            {activeApplications.map((app) => (
              <ActiveApplicationCard key={`active-app-${app.id}`} application={app} />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: Completed / Other Applications */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Completed Applications
            </h2>
          </div>

          {/* Status Filter Dropdown */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "all")}>
            <SelectTrigger className="h-8 w-full text-xs sm:w-[200px]">
              <SelectValue
                placeholder={t("userApplicationhistory.filterByStatus", "Lọc theo trạng thái")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("userApplicationhistory.allStatus", "Tất cả kết quả")}
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

        {/* Content Display */}
        {appsLoading ? (
          <LoadingCardList count={4} />
        ) : appsError ? (
          <Card className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border-dashed p-6 text-center">
            <XCircle className="h-9 w-9 text-rose-500" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Không thể tải danh sách ứng tuyển
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadApplications()}
              className="h-8 text-xs">
              Thử lại
            </Button>
          </Card>
        ) : completedApplications.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={t("userApplicationhistory.noApplicationsYet", "Chưa có danh sách ứng tuyển")}
            description={t(
              "userApplicationhistory.findJobsDescription",
              "Khám phá các cơ hội nghề nghiệp mới và bắt đầu ứng tuyển ngay hôm nay."
            )}
            action={
              <Button
                onClick={() => navigate("/enterprise/companies")}
                className="h-9 gap-2 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700">
                <Briefcase className="h-4 w-4" />
                {t("userApplicationhistory.findAJobNow", "Tìm việc ngay")}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {completedApplications.map((app) => (
              <CompletedApplicationCard key={`completed-app-${app.id}`} application={app} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
