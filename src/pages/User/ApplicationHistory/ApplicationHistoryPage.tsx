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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Clock,
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
  logoUrl?: string | null;
  level?: string;
  deadlineAt?: string;
  rounds?: JdRound[];
}

// ============================================================
// Job Level Badge Component (Distinct Colors per Level)
// ============================================================

function JobLevelBadge({ level }: { level?: string }) {
  const lvl = (level || "JUNIOR").toUpperCase().replace("-", "_");

  let colorClass = "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30";

  if (lvl.includes("INTERN")) {
    // Teal (Ngọc lam)
    colorClass = "bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30";
  } else if (lvl.includes("FRESH")) {
    // Purple (Tím tươi - không trùng Emerald Trúng tuyển)
    colorClass =
      "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30";
  } else if (lvl.includes("JUN")) {
    // Sky Blue (Xanh da trời tươi)
    colorClass = "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30";
  } else if (lvl.includes("MID")) {
    // Fuchsia (Hồng tím)
    colorClass =
      "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/30";
  } else if (lvl.includes("SENIOR") || lvl.includes("SEN")) {
    // Orange (Cam tươi)
    colorClass =
      "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30";
  } else if (lvl.includes("LEAD") || lvl.includes("MANAGER") || lvl.includes("DIRECTOR")) {
    // Indigo (Chàm đậm)
    colorClass =
      "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase shadow-2xs",
        colorClass
      )}>
      <Briefcase className="h-3 w-3" />
      {level || "JUNIOR"}
    </span>
  );
}

// ============================================================
// Status Badge (Application level - Vietnamese)
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
      label: t("userApplicationhistory.statusInterviewing", "ĐANG ỨNG TUYỂN"),
      className:
        "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    },
    PASSED: {
      label: t("userApplicationhistory.statusCompleted", "TRÚNG TUYỂN"),
      className:
        "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    },
    FAILED: {
      label: t("userApplicationhistory.statusRejected", "CHƯA ĐẠT"),
      className:
        "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
    },
    SOFT_FAILED: {
      label: t("userApplicationhistory.needsImprovement", "CẦN CẢI THIỆN"),
      className:
        "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
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
// Company Avatar Component (Matching JobSearchTab Style)
// ============================================================

function CompanyAvatar({
  logoUrl,
  companyName,
  className = "h-11 w-11 rounded-[14px]",
  textClassName = "text-xs font-bold",
}: {
  logoUrl?: string | null;
  companyName?: string;
  className?: string;
  textClassName?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = getCompanyInitials(companyName);

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border border-slate-100 bg-slate-50 text-indigo-600 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A] dark:text-indigo-400",
        className
      )}>
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={companyName || "Logo"}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </div>
  );
}

// ============================================================
// Vertical Active Application Card (Matching JobSearchTab Styling)
// ============================================================

function ActiveApplicationCard({ application }: { application: EnrichedApplication }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const totalRounds = application.rounds?.length ?? 0;
  const currentRoundOrder = application.currentRoundOrder ?? 1;

  // Active round type
  const activeRoundObj = application.rounds?.find((r) => r.roundOrder === currentRoundOrder);
  const currentRoundType = activeRoundObj?.roundType?.replace("MENTROR", "MENTOR") ?? "";
  const stepName = currentRoundType
    ? t(
        `common.roundType.${currentRoundType}`,
        activeRoundObj?.name || t("userApplicationhistory.roundInProgress", "Đang thực hiện")
      )
    : activeRoundObj?.name || t("userApplicationhistory.roundInProgress", "Đang thực hiện");

  const progressPercent = useMemo(() => {
    if (totalRounds <= 0) return 0;
    return Math.min(Math.round(((currentRoundOrder - 1) / totalRounds) * 100), 100);
  }, [totalRounds, currentRoundOrder]);

  const displayDate = application.deadlineAt
    ? formatDateTime(application.deadlineAt)
    : application.createdAt
      ? formatDateTime(application.createdAt)
      : "";

  return (
    <div className="group relative flex w-[320px] shrink-0 flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-950/30">
      <div className="space-y-4">
        {/* Top Header: Logo + Job Title + Level Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CompanyAvatar
              logoUrl={application.logoUrl}
              companyName={application.companyName}
              className="h-11 w-11 rounded-[14px]"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                {application.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
              </h3>
              <p className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                {application.companyName ?? t("userApplicationhistory.company", "Công ty")}
              </p>
            </div>
          </div>

          <JobLevelBadge level={application.level} />
        </div>

        {/* Inner Hub Panel (Matching JobSearchTab Inner Container `#0F172A`) */}
        <div className="rounded-[16px] border border-slate-100 bg-slate-50/80 p-3.5 shadow-2xs dark:border-slate-800/80 dark:bg-[#0F172A]/90">
          <div className="flex items-center justify-between gap-3">
            {/* Circular Gauge */}
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="36"
                  className="stroke-indigo-600 transition-all duration-700 ease-out dark:stroke-indigo-500"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 - (progressPercent / 100) * 2 * Math.PI * 36}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {currentRoundOrder}/{totalRounds > 0 ? totalRounds : 1}
                </span>
              </div>
            </div>

            {/* Stage Info */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {t("userApplicationhistory.currentRoundLabel", "Vòng hiện tại")}
              </p>
              <h4 className="line-clamp-2 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                {stepName}
              </h4>
            </div>
          </div>
        </div>

        {/* Deadline text */}
        {displayDate && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {t("userApplicationhistory.deadlineLabel", "Hạn chót:")} {displayDate}
            </span>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="pt-4">
        <Button
          onClick={() => navigate(`/user/application/${application.id}`)}
          className="h-9.5 w-full rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
          <span>{t("userApplicationhistory.enterWorkspace", "Vào Workspace")}</span>
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Standard Table Component (Polished Dark Mode & Crisp High Contrast Text)
// ============================================================

function CompletedApplicationsTable({ applications }: { applications: EnrichedApplication[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-xs dark:border-slate-800/60 dark:bg-slate-900/40">
      <Table>
        <TableHeader className="border-b border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/90">
          <TableRow className="border-0 hover:bg-transparent dark:hover:bg-transparent">
            <TableHead className="h-11 pl-6 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderId", "#ID")}
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderCompany", "Công ty")}
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderPosition", "Vị trí ứng tuyển")}
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderLevel", "Cấp bậc")}
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderStatus", "Trạng thái")}
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderScore", "Điểm số")}
            </TableHead>
            <TableHead className="h-11 text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderSubmittedDate", "Ngày nộp")}
            </TableHead>
            <TableHead className="h-11 pr-6 text-right text-xs font-extrabold tracking-wider text-slate-800 uppercase dark:text-slate-200">
              {t("userApplicationhistory.tableHeaderActions", "Thao tác")}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {applications.map((app) => {
            const isValidScore =
              typeof app.overallScore === "number" &&
              app.overallScore >= 0 &&
              app.overallScore <= 100;

            return (
              <TableRow
                key={`completed-row-${app.id}`}
                onClick={() => navigate(`/user/application/${app.id}/report`)}
                className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/60">
                {/* ID Column */}
                <TableCell className="pl-6 font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  #{app.id}
                </TableCell>

                {/* Company Name & Logo */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-2.5">
                    <CompanyAvatar
                      logoUrl={app.logoUrl}
                      companyName={app.companyName}
                      className="h-8.5 w-8.5 rounded-[10px]"
                    />
                    <span className="truncate text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {app.companyName ?? t("userApplicationhistory.company", "Công ty")}
                    </span>
                  </div>
                </TableCell>

                {/* Job Title */}
                <TableCell className="max-w-[220px] py-3">
                  <h4 className="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {app.jobTitle ?? t("userApplicationhistory.noTitle", "Chưa có tiêu đề")}
                  </h4>
                </TableCell>

                {/* Level */}
                <TableCell>
                  <JobLevelBadge level={app.level} />
                </TableCell>

                {/* Status */}
                <TableCell>
                  <ApplicationStatusBadge status={app.status as ApplicationStatus} />
                </TableCell>

                {/* Score */}
                <TableCell>
                  {isValidScore ? (
                    <div className="flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{app.overallScore}</span>
                      <span className="text-[10px] font-normal text-slate-400">/100</span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-slate-400">---</span>
                  )}
                </TableCell>

                {/* Date */}
                <TableCell className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {app.createdAt ? formatDateTime(app.createdAt) : "---"}
                </TableCell>

                {/* Action */}
                <TableCell className="pr-6 text-right">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/application/${app.id}/report`);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg px-2.5 text-xs font-extrabold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60">
                    <span>{t("userApplicationhistory.viewReport", "Xem báo cáo")}</span>
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
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
    Map<
      number,
      {
        title?: string;
        companyName?: string;
        logoUrl?: string | null;
        level?: string;
        deadlineAt?: string;
        rounds?: JdRound[];
        companyId?: number;
      }
    >
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
          const logoUrl =
            extra.companyLogo ||
            extra.companyLogoUrl ||
            extra.thumbnailUrl ||
            extra.company?.logoUrl ||
            extra.company?.avatarUrl ||
            null;

          return {
            title: jd.title,
            companyName: extra.companyName,
            logoUrl,
            level: extra.level || jd.level,
            deadlineAt: extra.deadlineAt || jd.deadlineAt,
            rounds: extra.rounds as JdRound[],
            companyId: extra.companyId,
          };
        })
      );

      const map = new Map<
        number,
        {
          title?: string;
          companyName?: string;
          logoUrl?: string | null;
          level?: string;
          deadlineAt?: string;
          rounds?: JdRound[];
          companyId?: number;
        }
      >();
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(jdIds[i], {
            title: r.value.title,
            companyName: r.value.companyName,
            logoUrl: r.value.logoUrl,
            level: r.value.level,
            deadlineAt: r.value.deadlineAt,
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
        logoUrl: jd?.logoUrl,
        level: jd?.level,
        deadlineAt: jd?.deadlineAt,
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
    <div className="w-full space-y-8 px-5 py-6 pb-16 md:px-8">
      {/* SECTION 1: Active Applications (Đơn ứng tuyển đang thực hiện) */}
      {activeApplications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t("userApplicationhistory.activeApplications", "Đơn ứng tuyển đang thực hiện")}
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

      {/* SECTION 2: Completed / Other Applications (Lịch sử đơn đã hoàn tất) */}
      <div className="space-y-4 pt-4">
        {/* Section Header with Integrated Controls (Search + Filter + Reload) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t("userApplicationhistory.completedApplications", "Lịch sử đơn đã hoàn tất")}
            </h2>
          </div>

          {/* Integrated Controls Group on Right */}
          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            {/* Integrated Search Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder={t("userApplicationhistory.searchPlaceholder", "Tìm kiếm nhanh...")}
              />
            </div>

            {/* Status Filter Dropdown */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as ApplicationStatus | "all")}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-[170px]">
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

            {/* Reload Button */}
            <ReloadButton
              onReload={() => loadApplications(true)}
              isLoading={refetching}
              tooltip={t("userApplicationhistory.reload", "Tải lại dữ liệu")}
            />
          </div>
        </div>

        {/* Filter Result Count (Above table per Khảo thí rule) */}
        {statusFilter !== "all" && (
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hiển thị {completedApplications.length} kết quả phù hợp
          </div>
        )}

        {/* Content Display: Standard Table */}
        {appsLoading ? (
          <LoadingCardList count={3} />
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
                className="h-9 gap-2 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700">
                <Briefcase className="h-4 w-4" />
                {t("userApplicationhistory.findAJobNow", "Tìm việc ngay")}
              </Button>
            }
          />
        ) : (
          <CompletedApplicationsTable applications={completedApplications} />
        )}
      </div>
    </div>
  );
}
