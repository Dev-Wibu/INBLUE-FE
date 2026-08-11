import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentEntity } from "@/interfaces";
import {
  formatCurrency,
  formatDayMonth,
  formatTimeDayMonth,
  toTimestamp,
  toVietnamDateKey,
} from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { dashboardAdminManager } from "@/services";
import { applicationService } from "@/services/application.manager";
import type {
  AdminAnalyticsOverview,
  AdminApplicationsPerUserAnalytics,
  AdminRecentTransaction,
} from "@/services/dashboard-admin.manager";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, subDays } from "date-fns";
import type { TFunction } from "i18next";
import {
  Activity,
  BriefcaseBusiness,
  Calendar as CalendarIcon,
  ChevronDown,
  ClipboardCheck,
  Code2,
  CreditCard,
  DollarSign,
  FileStack,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  key: string;
  date: string;
  amount: number;
  count: number;
};
type RangeMode = "7" | "14" | "30" | "custom";
type TransactionRangeMode = "7" | "14" | "custom";
type EffectiveRange = {
  from: Date;
  to: Date;
  fromKey: string;
  toKey: string;
};
const DEFAULT_RANGE_DAYS = 30;
const DEFAULT_TRANSACTION_RANGE_DAYS = 7;
const isSuccessPayment = (status?: string | null) => {
  if (!status) return true;
  const normalized = status.toUpperCase();
  return normalized === "COMPLETED" || normalized === "SUCCESS" || normalized === "PAID";
};
const getTransactionStatusTone = (status?: string | null) => {
  const normalized = status?.toUpperCase();
  if (normalized === "COMPLETED" || normalized === "SUCCESS" || normalized === "PAID") {
    return {
      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
      amount: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  }
  if (normalized === "PENDING" || normalized === "PROCESSING") {
    return {
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
      amount: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
    };
  }
  if (normalized === "FAILED" || normalized === "CANCELED" || normalized === "CANCELLED") {
    return {
      badge:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
      amount: "text-rose-600 dark:text-rose-400",
      iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }
  return {
    badge:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    amount: "text-slate-900 dark:text-white",
    iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300",
  };
};
const toMillis = (value?: string) => {
  return toTimestamp(value) ?? 0;
};
const parseVietnamDateKey = (dateKey: string) => {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return {
    year,
    month,
    day,
  };
};
const shiftVietnamDateKey = (dateKey: string, days: number): string | null => {
  const parsed = parseVietnamDateKey(dateKey);
  if (!parsed) {
    return null;
  }
  const utcDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return toVietnamDateKey(utcDate);
};
const buildVietnamBoundaryDate = (dateKey: string, isEndOfDay: boolean): Date | null => {
  const parsed = parseVietnamDateKey(dateKey);
  if (!parsed) {
    return null;
  }
  return new Date(
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      (isEndOfDay ? 23 : 0) - 7,
      isEndOfDay ? 59 : 0,
      isEndOfDay ? 59 : 0,
      isEndOfDay ? 999 : 0
    )
  );
};
const getSafeVietnamDateKey = (value: Date): string => {
  return toVietnamDateKey(value) || format(value, "yyyy-MM-dd");
};
const isWithinDateRange = (value: string | undefined, fromKey: string, toKey: string) => {
  const dateKey = toVietnamDateKey(value);
  if (!dateKey) {
    return false;
  }
  return dateKey >= fromKey && dateKey <= toKey;
};
const buildTrendData = (
  incomeRecords: Array<{ createdAt?: string; amount?: number }>,
  applicationRecords: Array<{ createdAt?: string }>,
  fromKey: string,
  toKey: string
) => {
  const pointMap: Record<string, TrendPoint> = {};
  const points: TrendPoint[] = [];
  let cursorKey: string | null = fromKey;
  while (cursorKey && cursorKey <= toKey) {
    const point = {
      key: cursorKey,
      date: formatDayMonth(cursorKey, ""),
      amount: 0,
      count: 0,
    };
    pointMap[cursorKey] = point;
    points.push(point);
    cursorKey = shiftVietnamDateKey(cursorKey, 1);
  }
  incomeRecords.forEach((record) => {
    if (!record.createdAt) return;
    const dateKey = toVietnamDateKey(record.createdAt);
    if (dateKey && pointMap[dateKey]) {
      pointMap[dateKey].amount += record.amount || 0;
    }
  });
  applicationRecords.forEach((record) => {
    if (!record.createdAt) return;
    const dateKey = toVietnamDateKey(record.createdAt);
    if (dateKey && pointMap[dateKey]) {
      pointMap[dateKey].count += 1;
    }
  });
  return points;
};
const getPaymentStatusLabel = (
  status?: string | null,
  t: (_key: string) => string = (_key) => _key
) => {
  switch (status?.toUpperCase()) {
    case "COMPLETED":
    case "SUCCESS":
    case "PAID":
      return t("general.success");
    case "PENDING":
    case "PROCESSING":
      return t("common.processing1");
    case "FAILED":
    case "CANCELED":
    case "CANCELLED":
      return t("general.failed1");
    default:
      return status || t("common.unknown");
  }
};
const getRoundStatusLabel = (
  status?: string | null,
  t: (_key: string) => string = (_key) => _key
) => {
  if (!status) return "";
  switch (status.toUpperCase()) {
    case "PENDING":
    case "PROCESSING":
    case "AWAITING_MENTOR":
      return t("common.processing1");
    case "IN_PROGRESS":
      return t("common.inProgress");
    case "COMPLETED":
    case "SUCCESS":
    case "PASSED":
      return t("general.success");
    case "FAILED":
    case "SOFT_FAILED":
    case "REJECTED":
      return t("general.failed1");
    default:
      return status;
  }
};
const formatTransactionTime = (value?: string, t: (_key: string) => string = (_key) => _key) => {
  if (!value) return t("adminDashboardoverview.noTime");
  return formatTimeDayMonth(value, t("adminDashboardoverview.noTime"));
};
const getInitials = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return "TX";
  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};
const normalizeRecentTransaction = (
  record: AdminRecentTransaction | PaymentEntity
): AdminRecentTransaction => ({
  transactionId:
    "transactionId" in record
      ? record.transactionId
      : typeof record.id === "number"
        ? record.id
        : undefined,
  id: typeof record.id === "number" ? record.id : undefined,
  transactionCode: record.transactionCode ?? null,
  amount: typeof record.amount === "number" ? record.amount : null,
  description: record.description ?? null,
  status: record.status ?? null,
  createdAt: record.createdAt ?? null,
  userId: "userId" in record && typeof record.userId === "number" ? record.userId : null,
  userName: "userName" in record ? record.userName : null,
  userEmail: "userEmail" in record ? record.userEmail : null,
  avatarUrl: "avatarUrl" in record ? record.avatarUrl : null,
  jobId: "jobId" in record && typeof record.jobId === "number" ? record.jobId : null,
  jobTitle: "jobTitle" in record ? record.jobTitle : null,
  paymentPurpose: record.paymentPurpose ?? null,
  url: "url" in record ? record.url : null,
});

type TrendRow = {
  label: string;
  applicationCount: number;
  percentage: number;
};

function TrendList({
  items,
  loading,
  barColor,
}: {
  items: TrendRow[];
  loading: boolean;
  barColor: string;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading trends">
        {[0, 1, 2].map((item) => (
          <div key={item} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        {t("adminDashboardoverview.noTrendDataAvailable")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.slice(0, 5).map((item, index) => (
        <div key={`${item.label}-${index}`} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {index + 1}
              </span>
              <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {item.label}
              </span>
            </div>
            <div className="flex shrink-0 items-baseline gap-1.5">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {item.applicationCount.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", barColor)}
              style={{ width: `${Math.min(item.percentage, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsOverviewSection({
  analytics,
  applicationsPerUser,
  jobTrends,
  positionTrends,
  loading,
  loadingApplicationsPerUser,
  t,
}: {
  analytics?: AdminAnalyticsOverview;
  applicationsPerUser?: AdminApplicationsPerUserAnalytics;
  jobTrends: TrendRow[];
  positionTrends: TrendRow[];
  loading: boolean;
  loadingApplicationsPerUser: boolean;
  t: TFunction;
}) {
  const [showAllActiveInterviews, setShowAllActiveInterviews] = useState(false);
  const summary = analytics?.summary;
  const activeInterviewCount = summary?.activeInterviewCount ?? 0;
  const inProgressApplications = summary?.inProgressApplications ?? 0;
  const applicationsPerUserTotalApplications = applicationsPerUser?.totalApplications ?? 0;
  const averageApplicationsPerUser = applicationsPerUser?.averageApplicationsPerUser;
  const uniqueApplicants = applicationsPerUser?.uniqueApplicants ?? 0;
  const applicationsPerUserGeneratedAt = applicationsPerUser?.generatedAt;
  const activeInterviews = analytics?.activeInterviews ?? [];
  const visibleActiveInterviews = showAllActiveInterviews
    ? activeInterviews
    : activeInterviews.slice(0, 5);
  const pipeline = [
    {
      label: t("adminDashboardoverview.totalApplications", "Total applications"),
      value: summary?.totalApplications ?? 0,
      color: "bg-slate-400",
    },
    {
      label: t("adminDashboardoverview.inProgressApplications", "Applications in progress"),
      value: inProgressApplications,
      color: "bg-indigo-500",
    },
    {
      label: t("adminDashboardoverview.passedApplications", "Passed applications"),
      value: summary?.passedApplications ?? 0,
      color: "bg-emerald-500",
    },
    {
      label: t("adminDashboardoverview.failedApplications", "Failed applications"),
      value: summary?.failedApplications ?? 0,
      color: "bg-rose-500",
    },
  ];

  return (
    <>
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-indigo-600 dark:text-indigo-400">
              <BriefcaseBusiness className="h-5 w-5" />
              {t("adminDashboardoverview.topAppliedJobs", "Top applied jobs")}
            </CardTitle>
            <CardDescription>
              {t(
                "adminDashboardoverview.topAppliedJobsDescription",
                "Jobs attracting the most applications"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendList items={jobTrends} loading={loading} barColor="bg-indigo-500" />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-cyan-600 dark:text-cyan-400">
              <Code2 className="h-5 w-5" />
              {t("adminDashboardoverview.topAppliedPositions", "Top applied positions")}
            </CardTitle>
            <CardDescription>
              {t(
                "adminDashboardoverview.topAppliedPositionsDescription",
                "Positions candidates apply for most"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendList items={positionTrends} loading={loading} barColor="bg-cyan-500" />
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-600 dark:text-emerald-400">
                <Video className="h-5 w-5" />
                {t("adminDashboardoverview.activeInterviews", "Active interviews")}
              </CardTitle>
              <CardDescription>
                {t(
                  "adminDashboardoverview.activeInterviewsDescription",
                  "Candidates currently in an interview round"
                )}
              </CardDescription>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {activeInterviewCount.toLocaleString()}
            </span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border p-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : activeInterviews.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                {activeInterviewCount > 0
                  ? t(
                      "adminDashboardoverview.activeInterviewDetailsUnavailable",
                      "Active interview details are not available yet."
                    )
                  : t("adminDashboardoverview.noActiveInterviews", "No active interviews")}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleActiveInterviews.map((interview, index) => (
                  <div
                    key={interview.applicationDetailId ?? interview.applicationId ?? index}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <BriefcaseBusiness className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {interview.userName || interview.userEmail || t("common.candidate")}
                          </p>
                          {interview.roundStatus && (
                            <Badge variant="outline" className="h-5 text-[9px] uppercase">
                              {getRoundStatusLabel(interview.roundStatus, t)}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {interview.jobTitle || "—"}
                          {interview.roundName ? ` · ${interview.roundName}` : ""}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {interview.userEmail || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-left text-xs text-slate-500 sm:text-right dark:text-slate-400">
                      <p>
                        {t("adminDashboardoverview.startedAt", "Started")}:{" "}
                        {formatTransactionTime(interview.startedAt, t)}
                      </p>
                      <p>
                        {t("adminDashboardoverview.updatedAt", "Updated")}:{" "}
                        {formatTransactionTime(interview.updatedAt, t)}
                      </p>
                    </div>
                  </div>
                ))}
                {activeInterviews.length < activeInterviewCount && (
                  <p className="pt-1 text-xs text-slate-400">
                    {t(
                      "adminDashboardoverview.showingActiveInterviews",
                      "Showing {{shown}} of {{total}}",
                      {
                        shown: visibleActiveInterviews.length,
                        total: activeInterviewCount,
                      }
                    )}
                  </p>
                )}
                {activeInterviews.length > 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllActiveInterviews((isVisible) => !isVisible)}
                    className="mx-auto flex h-8 gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300">
                    {showAllActiveInterviews
                      ? t("adminDashboardoverview.showLess", "Show less")
                      : t("adminDashboardoverview.showMore", "Show more")}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        showAllActiveInterviews && "rotate-180"
                      )}
                    />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-indigo-600 dark:text-indigo-400">
              <Activity className="h-5 w-5" />
              {t("adminDashboardoverview.applicationPipeline", "Application pipeline")}
            </CardTitle>
            <CardDescription>
              {t(
                "adminDashboardoverview.applicationPipelineDescription",
                "Current application status"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {pipeline.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.color)} />
                      <span className="truncate text-sm font-medium text-slate-600 dark:text-slate-300">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-950/30">
              {loadingApplicationsPerUser ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-44" />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                    <FileStack className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {t(
                        "adminDashboardoverview.averageApplicationsPerUser",
                        "Average applications per user"
                      )}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-white">
                      {typeof averageApplicationsPerUser === "number"
                        ? averageApplicationsPerUser.toFixed(1)
                        : "0.0"}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t("adminDashboardoverview.applicationsPerUserUnit", "applications per user")}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/50">
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("adminDashboardoverview.totalApplications", "Total applications")}
                      </dt>
                      <dd className="text-sm font-black text-slate-900 dark:text-white">
                        {applicationsPerUserTotalApplications.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/50">
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("adminDashboardoverview.uniqueApplicants", "Unique applicants")}
                      </dt>
                      <dd className="text-sm font-black text-slate-900 dark:text-white">
                        {uniqueApplicants.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/50">
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("adminDashboardoverview.generatedAt", "Generated at")}
                      </dt>
                      <dd className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {applicationsPerUserGeneratedAt
                          ? formatTransactionTime(applicationsPerUserGeneratedAt, t)
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function DashboardOverviewPage() {
  const { t, i18n } = useTranslation();

  const RANGE_OPTIONS: Array<{
    label: string;
    value: Exclude<RangeMode, "custom">;
  }> = [
    {
      label: t("adminDashboardoverview.7Days"),
      value: "7",
    },
    {
      label: t("adminDashboardoverview.14Days"),
      value: "14",
    },
    {
      label: t("adminDashboardoverview.30Days"),
      value: "30",
    },
  ];
  const TRANSACTION_RANGE_OPTIONS: Array<{
    label: string;
    value: Exclude<TransactionRangeMode, "custom">;
  }> = [
    {
      label: t("adminDashboardoverview.7Days"),
      value: "7",
    },
    {
      label: t("adminDashboardoverview.14Days"),
      value: "14",
    },
  ];
  const [rangeMode, setRangeMode] = useState<RangeMode>("30");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [transactionRangeMode, setTransactionRangeMode] = useState<TransactionRangeMode>("7");
  const [transactionCustomFrom, setTransactionCustomFrom] = useState<Date | undefined>(undefined);
  const [transactionCustomTo, setTransactionCustomTo] = useState<Date | undefined>(undefined);
  const { data: userCount, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "total-users"],
    queryFn: () => dashboardAdminManager.getTotalUsers(),
  });
  const { data: mentorCount, isLoading: loadingMentors } = useQuery({
    queryKey: ["admin", "total-mentors"],
    queryFn: () => dashboardAdminManager.getTotalMentors(),
  });
  const { data: incomeResponse, isLoading: loadingIncome } = useQuery({
    queryKey: ["admin", "total-income"],
    queryFn: () => dashboardAdminManager.getTotalIncome(),
  });
  const { data: applicationsResponse, isLoading: loadingApplications } = useQuery({
    queryKey: ["admin", "applications"],
    queryFn: () => applicationService.getAll(),
  });
  const { data: applicationsPerUserResponse, isLoading: loadingApplicationsPerUser } = useQuery({
    queryKey: ["admin", "analytics", "applications-per-user"],
    queryFn: () => dashboardAdminManager.getApplicationsPerUser(),
    staleTime: 60_000,
  });
  const handleCustomFromChange = (date: Date | undefined) => {
    setCustomFrom(date);
    if (date && customTo && date > customTo) {
      setCustomTo(undefined);
    }
  };
  const handleCustomToChange = (date: Date | undefined) => {
    setCustomTo(date);
    if (date && customFrom && date < customFrom) {
      setCustomFrom(undefined);
    }
  };
  const handleTransactionCustomFromChange = (date: Date | undefined) => {
    setTransactionCustomFrom(date);
    if (date && transactionCustomTo && date > transactionCustomTo) {
      setTransactionCustomTo(undefined);
    }
  };
  const handleTransactionCustomToChange = (date: Date | undefined) => {
    setTransactionCustomTo(date);
    if (date && transactionCustomFrom && date < transactionCustomFrom) {
      setTransactionCustomFrom(undefined);
    }
  };
  const transactionRange = useMemo(() => {
    const todayKey = getSafeVietnamDateKey(new Date());
    if (
      transactionRangeMode === "custom" &&
      transactionCustomFrom &&
      transactionCustomTo &&
      transactionCustomFrom <= transactionCustomTo
    ) {
      const customFromKey = getSafeVietnamDateKey(transactionCustomFrom);
      const customToKey = getSafeVietnamDateKey(transactionCustomTo);
      return {
        fromKey: customFromKey <= customToKey ? customFromKey : customToKey,
        toKey: customFromKey <= customToKey ? customToKey : customFromKey,
      };
    }

    const days =
      transactionRangeMode === "custom"
        ? DEFAULT_TRANSACTION_RANGE_DAYS
        : Number(transactionRangeMode);
    return {
      fromKey: shiftVietnamDateKey(todayKey, -(days - 1)) || todayKey,
      toKey: todayKey,
    };
  }, [transactionCustomFrom, transactionCustomTo, transactionRangeMode]);
  const transactionAnalyticsDays = useMemo(() => {
    const today = startOfDay(new Date());
    const customFetchStart =
      transactionRangeMode === "custom" && transactionCustomFrom && transactionCustomTo
        ? startOfDay(
            transactionCustomFrom <= transactionCustomTo
              ? transactionCustomFrom
              : transactionCustomTo
          )
        : null;

    if (customFetchStart) {
      return Math.max(
        1,
        Math.floor((today.getTime() - customFetchStart.getTime()) / (24 * 60 * 60 * 1000)) + 1
      );
    }

    return transactionRangeMode === "custom"
      ? DEFAULT_TRANSACTION_RANGE_DAYS
      : Number(transactionRangeMode);
  }, [transactionCustomFrom, transactionCustomTo, transactionRangeMode]);
  const transactionRangeLabel = useMemo(() => {
    if (
      transactionRangeMode === "custom" &&
      transactionCustomFrom &&
      transactionCustomTo &&
      transactionCustomFrom <= transactionCustomTo
    ) {
      return `${format(transactionCustomFrom, "dd/MM/yyyy")} - ${format(transactionCustomTo, "dd/MM/yyyy")}`;
    }

    const days =
      transactionRangeMode === "custom"
        ? DEFAULT_TRANSACTION_RANGE_DAYS
        : Number(transactionRangeMode);
    return `${days} ${t("adminDashboardoverview.days", "days")}`;
  }, [transactionCustomFrom, transactionCustomTo, transactionRangeMode, t]);
  const { data: analyticsResponse, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["admin", "analytics", "overview", { limit: 10, days: transactionAnalyticsDays }],
    queryFn: () => dashboardAdminManager.getAnalyticsOverview(10, transactionAnalyticsDays),
    staleTime: 60_000,
  });
  const effectiveRange = useMemo<EffectiveRange>(() => {
    if (rangeMode === "custom" && customFrom && customTo && customFrom <= customTo) {
      const customFromKey = getSafeVietnamDateKey(customFrom);
      const customToKey = getSafeVietnamDateKey(customTo);
      const fromKey = customFromKey <= customToKey ? customFromKey : customToKey;
      const toKey = customFromKey <= customToKey ? customToKey : customFromKey;
      const from = buildVietnamBoundaryDate(fromKey, false);
      const to = buildVietnamBoundaryDate(toKey, true);
      if (from && to) {
        return {
          from,
          to,
          fromKey,
          toKey,
        };
      }
      return {
        from: startOfDay(customFrom),
        to: new Date(customTo),
        fromKey,
        toKey,
      };
    }
    const days = rangeMode === "custom" ? DEFAULT_RANGE_DAYS : Number(rangeMode);
    const todayKey = getSafeVietnamDateKey(new Date());
    const fromKey = shiftVietnamDateKey(todayKey, -(days - 1)) || todayKey;
    const from = buildVietnamBoundaryDate(fromKey, false);
    const to = buildVietnamBoundaryDate(todayKey, true);
    if (from && to) {
      return {
        from,
        to,
        fromKey,
        toKey: todayKey,
      };
    }
    return {
      from: startOfDay(subDays(new Date(), days - 1)),
      to: new Date(),
      fromKey: fromKey,
      toKey: todayKey,
    };
  }, [customFrom, customTo, rangeMode]);
  const rangeLabel = useMemo(() => {
    if (rangeMode === "custom" && customFrom && customTo && customFrom <= customTo) {
      return `${format(customFrom, "dd/MM/yyyy")} - ${format(customTo, "dd/MM/yyyy")}`;
    }
    const days = rangeMode === "custom" ? DEFAULT_RANGE_DAYS : Number(rangeMode);
    return t("general.lastDays", {
      var_0: days,
    });
  }, [customFrom, customTo, rangeMode, t]);
  const rangeDays = useMemo(() => {
    const diff = effectiveRange.to.getTime() - effectiveRange.from.getTime();
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + 1;
  }, [effectiveRange]);
  const incomeRecords = useMemo(() => incomeResponse?.data ?? [], [incomeResponse?.data]);
  const filteredIncomeRecords = useMemo(
    () =>
      incomeRecords.filter((record) =>
        isWithinDateRange(record.createdAt, effectiveRange.fromKey, effectiveRange.toKey)
      ),
    [effectiveRange, incomeRecords]
  );
  const stats = useMemo(() => {
    const directRevenue = filteredIncomeRecords
      .filter((payment) => isSuccessPayment(payment.status))
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    return {
      directRevenue,
    };
  }, [filteredIncomeRecords]);
  const filteredApplications = useMemo(
    () =>
      (applicationsResponse?.data || []).filter((record) =>
        isWithinDateRange(record.createdAt, effectiveRange.fromKey, effectiveRange.toKey)
      ),
    [effectiveRange, applicationsResponse?.data]
  );
  const incomeTrendData = useMemo(() => {
    const successfulIncome = filteredIncomeRecords.filter((payment) =>
      isSuccessPayment(payment.status)
    );
    return buildTrendData(
      successfulIncome,
      filteredApplications,
      effectiveRange.fromKey,
      effectiveRange.toKey
    );
  }, [effectiveRange, filteredIncomeRecords, filteredApplications]);
  const overviewStats = [
    {
      title: t("adminDashboardoverview.totalUsers"),
      value: loadingUsers
        ? "..."
        : (userCount?.data || 0).toLocaleString(i18n.language === "en" ? "en-US" : "vi-VN"),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: t("adminDashboardoverview.mentors"),
      value: loadingMentors
        ? "..."
        : (mentorCount?.data || 0).toLocaleString(i18n.language === "en" ? "en-US" : "vi-VN"),
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: t("adminDashboardoverview.directRevenue"),
      value: loadingIncome ? "..." : formatCurrency(stats.directRevenue),
      icon: DollarSign,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
      title: t("adminDashboardoverview.totalApplications") || "Total Applications",
      value: loadingApplications
        ? "..."
        : (applicationsResponse?.data?.length || 0).toLocaleString(
            i18n.language === "en" ? "en-US" : "vi-VN"
          ),
      icon: ClipboardCheck,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      title: t("adminDashboardoverview.activeInterviews", "Active interviews"),
      value: loadingAnalytics
        ? "..."
        : (analyticsResponse?.data?.summary?.activeInterviewCount || 0).toLocaleString(
            i18n.language === "en" ? "en-US" : "vi-VN"
          ),
      icon: Video,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
  ];
  const recentTransactions = useMemo(() => {
    const analyticsTransactions = analyticsResponse?.data?.recentTransactions;
    if (Array.isArray(analyticsTransactions)) {
      return analyticsTransactions
        .map((record) => normalizeRecentTransaction(record))
        .filter((record) =>
          isWithinDateRange(
            record.createdAt ?? undefined,
            transactionRange.fromKey,
            transactionRange.toKey
          )
        )
        .sort((a, b) => toMillis(b.createdAt ?? undefined) - toMillis(a.createdAt ?? undefined));
    }

    return filteredIncomeRecords
      .filter((record) =>
        isWithinDateRange(record.createdAt, transactionRange.fromKey, transactionRange.toKey)
      )
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
      .slice(0, 8)
      .map((record) => normalizeRecentTransaction(record));
  }, [
    analyticsResponse?.data?.recentTransactions,
    filteredIncomeRecords,
    transactionRange.fromKey,
    transactionRange.toKey,
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-slate-950">
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {overviewStats.map((stat) => (
          <Card
            key={stat.title}
            className="relative overflow-hidden border-0 shadow-sm dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {stat.title}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
                <div className={cn("shrink-0 rounded-xl p-3", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
            <div
              className={cn(
                "absolute -right-6 -bottom-6 h-20 w-20 rounded-full opacity-5 blur-xl",
                stat.bgColor
              )}
            />
          </Card>
        ))}
      </div>

      <AnalyticsOverviewSection
        analytics={analyticsResponse?.data}
        applicationsPerUser={applicationsPerUserResponse?.data}
        jobTrends={(analyticsResponse?.data?.jobTrends ?? []).map((item) => ({
          label: item.jobTitle || "—",
          applicationCount: item.applicationCount ?? 0,
          percentage: item.percentage ?? 0,
        }))}
        positionTrends={(analyticsResponse?.data?.positionTrends ?? []).map((item) => ({
          label: item.position || "—",
          applicationCount: item.applicationCount ?? 0,
          percentage: item.percentage ?? 0,
        }))}
        loading={loadingAnalytics}
        loadingApplicationsPerUser={loadingApplicationsPerUser}
        t={t}
      />

      <div className="grid gap-6">
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-col space-y-4 pb-6 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-violet-600">
                <DollarSign className="h-5 w-5" />
                {t("adminDashboardoverview.liveRevenueTrends")}
              </CardTitle>
              <CardDescription>
                {t("adminDashboardoverview.revenueFluctuationsIn")} {rangeDays}{" "}
                {t("adminDashboardoverview.dateByFilter")} ({rangeLabel})
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                {RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={rangeMode === option.value ? "default" : "ghost"}
                    onClick={() => setRangeMode(option.value)}>
                    {option.label}
                  </Button>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={rangeMode === "custom" ? "default" : "outline"}
                    onClick={() => setRangeMode("custom")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {t("adminDashboardoverview.customize")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-slate-500">
                          {t("common.fromDate")}
                        </label>
                        <Calendar
                          mode="single"
                          selected={customFrom}
                          onSelect={handleCustomFromChange}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-slate-500">
                          {t("common.comeDay")}
                        </label>
                        <Calendar
                          mode="single"
                          selected={customTo}
                          onSelect={handleCustomToChange}
                        />
                      </div>
                    </div>
                    {(!customFrom || !customTo || customFrom > customTo) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {t("adminDashboardoverview.pleaseSelectEnoughFromDate")}
                      </p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomFrom(undefined);
                        setCustomTo(undefined);
                      }}>
                      {t("adminDashboardoverview.deleteCustomDates")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incomeTrendData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                    tickFormatter={(value: number) => `${(value / 1_000_000).toFixed(1)}M`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: "#64748b",
                    }}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const incomeItem = payload.find((p) => p.dataKey === "amount") as
                        | { value: number }
                        | undefined;
                      const appsItem = payload.find((p) => p.dataKey === "count") as
                        | { value: number }
                        | undefined;
                      const dateStr = payload[0]?.payload?.date;
                      return (
                        <div className="rounded-lg border bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                          <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {dateStr}
                          </p>
                          <div className="flex flex-col gap-1">
                            {incomeItem && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-violet-500" />
                                <span className="text-xs text-slate-500">
                                  {t("adminDashboardoverview.income")}:
                                </span>
                                <span className="text-xs font-black text-violet-600">
                                  {formatCurrency(incomeItem.value || 0)}
                                </span>
                              </div>
                            )}
                            {appsItem && (
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-slate-500">
                                  {t("adminDashboardoverview.applications")}:
                                </span>
                                <span className="text-xs font-black text-emerald-600">
                                  {appsItem.value || 0}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="amount"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApplications)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-2">
        <Card className="flex h-full min-w-0 flex-col overflow-hidden border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="flex min-w-0 flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-lg">
                {t("adminDashboardoverview.recentTransactions")}
              </CardTitle>
              <CardDescription className="truncate">
                {t("adminDashboardoverview.latestTransactionsIn", "Latest transactions in")}{" "}
                {transactionRangeLabel}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                {TRANSACTION_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={transactionRangeMode === option.value ? "default" : "ghost"}
                    onClick={() => setTransactionRangeMode(option.value)}>
                    {option.label}
                  </Button>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant={transactionRangeMode === "custom" ? "default" : "outline"}
                    onClick={() => setTransactionRangeMode("custom")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {t("adminDashboardoverview.customize")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-slate-500">
                          {t("common.fromDate")}
                        </label>
                        <Calendar
                          mode="single"
                          selected={transactionCustomFrom}
                          onSelect={handleTransactionCustomFromChange}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-slate-500">
                          {t("common.comeDay")}
                        </label>
                        <Calendar
                          mode="single"
                          selected={transactionCustomTo}
                          onSelect={handleTransactionCustomToChange}
                        />
                      </div>
                    </div>
                    {transactionRangeMode === "custom" &&
                      (!transactionCustomFrom ||
                        !transactionCustomTo ||
                        transactionCustomFrom > transactionCustomTo) && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {t("adminDashboardoverview.pleaseSelectEnoughFromDate")}
                        </p>
                      )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTransactionCustomFrom(undefined);
                        setTransactionCustomTo(undefined);
                      }}>
                      {t("adminDashboardoverview.deleteCustomDates")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="min-w-0 flex-1 overflow-hidden">
            <div className="grid w-full min-w-0 gap-3 overflow-hidden">
              {(loadingAnalytics || loadingIncome) && recentTransactions.length === 0 ? (
                [0, 1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex min-w-0 items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800">
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="h-11 w-11 rounded-lg" />
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-56" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ))
              ) : recentTransactions.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  {t("adminDashboardoverview.noDataAvailable")}
                </div>
              ) : (
                recentTransactions.map((record, index) => {
                  const statusTone = getTransactionStatusTone(record.status);
                  const statusLabel = getPaymentStatusLabel(record.status, t);
                  const transactionTitle =
                    record.description ||
                    record.jobTitle ||
                    record.paymentPurpose ||
                    record.transactionCode ||
                    t("adminDashboardoverview.noDescriptionAvailable");
                  const personLine = [record.userName, record.userEmail]
                    .filter(Boolean)
                    .join(" · ");
                  const showJobInMeta = Boolean(
                    record.jobTitle && record.jobTitle !== transactionTitle
                  );
                  const metaLine = [showJobInMeta ? record.jobTitle : null, personLine]
                    .filter(Boolean)
                    .join(" · ");
                  const transactionTarget =
                    record.url && /^https?:\/\//i.test(record.url) ? record.url : undefined;

                  const cardContent = (
                    <div
                      className={cn(
                        "flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-slate-100 p-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between dark:border-slate-800",
                        transactionTarget
                          ? "cursor-pointer hover:border-indigo-100 hover:bg-slate-50 dark:hover:border-indigo-900/40 dark:hover:bg-slate-800/50"
                          : "bg-white dark:bg-slate-900"
                      )}>
                      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                        <Avatar className="h-11 w-11 shrink-0 rounded-lg border border-slate-100 dark:border-slate-800">
                          <AvatarImage
                            src={record.avatarUrl ?? undefined}
                            alt={record.userName || record.userEmail || transactionTitle}
                            className="object-cover"
                          />
                          <AvatarFallback
                            className={cn("rounded-lg text-xs font-black", statusTone.iconBg)}>
                            {record.avatarUrl ? (
                              <CreditCard className="h-5 w-5" />
                            ) : (
                              getInitials(
                                record.userName || record.userEmail || record.transactionCode
                              )
                            )}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                            <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                              {transactionTitle}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 shrink-0 text-[9px] font-bold uppercase",
                                statusTone.badge
                              )}>
                              {statusLabel}
                            </Badge>
                          </div>
                          {metaLine && (
                            <p className="mt-1 min-w-0 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                              {metaLine}
                            </p>
                          )}
                          <p className="mt-0.5 min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">
                            {formatTransactionTime(record.createdAt ?? undefined, t)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-left sm:text-right">
                        <p className={cn("text-base font-black", statusTone.amount)}>
                          {formatCurrency(record.amount || 0)}
                        </p>
                      </div>
                    </div>
                  );

                  if (transactionTarget) {
                    return (
                      <a
                        key={`${record.transactionId || record.id || record.transactionCode || index}`}
                        href={transactionTarget}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full min-w-0 overflow-hidden no-underline">
                        {cardContent}
                      </a>
                    );
                  }

                  return (
                    <div
                      key={`${record.transactionId || record.id || record.transactionCode || index}`}
                      className="w-full min-w-0 overflow-hidden">
                      {cardContent}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="min-h-[320px]" aria-hidden="true" />
      </div>
    </div>
  );
}
