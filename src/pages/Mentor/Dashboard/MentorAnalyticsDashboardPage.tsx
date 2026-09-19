import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { useMentorDashboardSummary } from "@/hooks/useMentorDashboard";
import type { AppApiError } from "@/lib/error-normalizer";
import { adaptMentorDashboardSummary } from "@/lib/mentor-dashboard";
import { normalizeFiveStarRating } from "@/lib/rating";
import { cn } from "@/lib/utils";
import { PendingScheduleApprovals } from "@/pages/Mentor/Sessions/components";
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  MessageSquareHeart,
  RefreshCw,
  ServerOff,
  Star,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SESSION_COLORS: Record<string, string> = {
  COMPLETED: "#10b981",
  ONGOING: "#0ea5e9",
  SCHEDULED: "#6366f1",
  PAID: "#8b5cf6",
  DRAFT: "#64748b",
  REJECTED: "#f97316",
  CANCELED: "#f43f5e",
};
const FALLBACK_COLORS = ["#14b8a6", "#a855f7", "#eab308", "#ec4899"];
const METRICS = [
  { key: "totalSessions", icon: CalendarCheck, tone: "indigo", suffix: undefined },
  { key: "completedSessions", icon: CheckCircle2, tone: "emerald", suffix: undefined },
  { key: "averageCandidateScore", icon: Gauge, tone: "sky", suffix: "/100" },
  { key: "averageMentorRating", icon: MessageSquareHeart, tone: "amber", suffix: "/5" },
] as const;

export function MentorAnalyticsDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const summaryQuery = useMentorDashboardSummary();
  const dashboard = useMemo(
    () => (summaryQuery.data ? adaptMentorDashboardSummary(summaryQuery.data) : null),
    [summaryQuery.data]
  );
  const isLoading = summaryQuery.isLoading;
  const errorStatus = (summaryQuery.error as AppApiError | null)?.status;
  const values = dashboard
    ? {
        totalSessions: dashboard.totalSessions,
        completedSessions: dashboard.completedSessions,
        averageCandidateScore: formatDecimal(dashboard.averageCandidateScore),
        averageMentorRating: formatDecimal(dashboard.averageMentorRating),
      }
    : null;

  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-gray-50 p-6 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1800px]">
        <section
          aria-label={t("mentorDashboardAnalytics.metricsLabel")}
          className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((metric) => {
            const value = values?.[metric.key] ?? null;
            return (
              <Metric
                key={metric.key}
                icon={metric.icon}
                label={t(
                  metric.key === "averageCandidateScore"
                    ? "mentorScoring.averageCandidateScore"
                    : "mentorDashboardAnalytics." + metric.key
                )}
                value={value}
                suffix={value !== null ? metric.suffix : undefined}
                loading={isLoading}
                tone={metric.tone}
              />
            );
          })}
        </section>

        <PendingScheduleApprovals />

        <div className="space-y-6">
          {isLoading ? (
            <DashboardLoading />
          ) : summaryQuery.isError || !dashboard ? (
            <DashboardUnavailable
              endpointUnavailable={errorStatus === 404}
              refreshing={summaryQuery.isFetching}
              onRetry={() => void summaryQuery.refetch()}
            />
          ) : (
            <DashboardContent
              dashboard={dashboard}
              onOpenSession={(id) => navigate("/mentor/sessions/" + id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardContent({
  dashboard,
  onOpenSession,
}: {
  dashboard: ReturnType<typeof adaptMentorDashboardSummary>;
  onOpenSession: (_sessionId: number) => void;
}) {
  const { t } = useTranslation();
  const statusData = dashboard.statusItems.map((item, index) => ({
    ...item,
    name: getStatusLabel(item.status, t),
    color: SESSION_COLORS[item.status] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));
  const scoreData = dashboard.scoreItems.map((item) => ({
    ...item,
    name: item.candidateName || (item.sessionId ? "#" + item.sessionId : t("common.candidate")),
  }));
  const distributionTotal = dashboard.scoreDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
        <ChartPanel
          title={t("mentorDashboardAnalytics.candidateScores")}
          description={t("mentorDashboardAnalytics.candidateScoresHint")}>
          {scoreData.length === 0 ? (
            <EmptyPanel message={t("mentorDashboardAnalytics.noScores")} />
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#64748b" opacity={0.18} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="score"
                    name={t("common.score")}
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartPanel>

        <ChartPanel
          title={t("mentorDashboardAnalytics.sessionStatus")}
          description={t("mentorDashboardAnalytics.sessionStatusHint")}>
          {statusData.length === 0 ? (
            <EmptyPanel message={t("mentorDashboardAnalytics.noSessions")} />
          ) : (
            <>
              <div className="relative h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={78}
                      paddingAngle={2}>
                      {statusData.map((item) => (
                        <Cell key={item.status} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-950 dark:text-white">
                    {dashboard.statusTotal}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t("common.total")}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                {statusData.map((item) => (
                  <div
                    key={item.status}
                    className="flex min-w-0 items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-semibold text-slate-950 dark:text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartPanel>
      </div>

      <ChartPanel
        title={t("mentorDashboardAnalytics.scoreDistribution")}
        description={t("mentorDashboardAnalytics.scoreDistributionHint")}>
        {distributionTotal === 0 || dashboard.averageCandidateScore === null ? (
          <EmptyPanel message={t("mentorDashboardAnalytics.noScores")} compact />
        ) : (
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {dashboard.scoreDistribution.map((item) => {
              const percent = Math.round((item.value / distributionTotal) * 100);
              return (
                <div key={item.range}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {t("mentorScoring.range." + item.range)}
                    </span>
                    <span className="font-semibold text-slate-950 dark:text-white">
                      {item.value} · {percent}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: percent + "%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <ListPanel title={t("mentorDashboardAnalytics.evaluatedApplications")}>
          {dashboard.reviewedApplications.length === 0 ? (
            <EmptyPanel message={t("mentorDashboardAnalytics.noEvaluatedApplications")} compact />
          ) : (
            dashboard.reviewedApplications.slice(0, 5).map((item, index) => {
              const sessionId = positiveId(item.sessionId);
              return (
                <button
                  key={item.applicationDetailId ?? item.applicationId ?? sessionId ?? index}
                  type="button"
                  disabled={!sessionId}
                  onClick={() => sessionId && onOpenSession(sessionId)}
                  className="flex w-full items-start gap-3 border-b border-slate-200 px-5 py-4 text-left last:border-b-0 enabled:hover:bg-slate-50 enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-[-2px] enabled:focus-visible:outline-indigo-500 disabled:cursor-default dark:border-slate-800 dark:enabled:hover:bg-slate-800/60">
                  <CandidateAvatar name={item.candidateName} src={item.candidateAvatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                          {item.candidateName || t("common.candidate")}
                        </p>
                        {item.jobTitle && (
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {item.jobTitle}
                          </p>
                        )}
                      </div>
                      {typeof item.mentorReview?.rating === "number" && (
                        <span className="shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {item.mentorReview.rating}/100
                        </span>
                      )}
                    </div>
                    {getReviewNote(item.mentorReview) && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {getReviewNote(item.mentorReview)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ListPanel>

        <ListPanel title={t("mentorDashboardAnalytics.candidateFeedback")}>
          {dashboard.feedbacks.length === 0 ? (
            <EmptyPanel message={t("mentorDashboardAnalytics.noCandidateFeedback")} compact />
          ) : (
            dashboard.feedbacks.slice(0, 5).map((item, index) => {
              const sessionId = positiveId(item.sessionId);
              return (
                <button
                  key={sessionId ?? item.user?.id ?? index}
                  type="button"
                  disabled={!sessionId}
                  onClick={() => sessionId && onOpenSession(sessionId)}
                  className="flex w-full items-start gap-3 border-b border-slate-200 px-5 py-4 text-left last:border-b-0 enabled:hover:bg-slate-50 enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-[-2px] enabled:focus-visible:outline-indigo-500 disabled:cursor-default dark:border-slate-800 dark:enabled:hover:bg-slate-800/60">
                  <CandidateAvatar name={item.user?.name} src={item.user?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {item.user?.name || t("common.candidate")}
                      </p>
                      {typeof item.rating === "number" && (
                        <StarRating
                          value={normalizeFiveStarRating(item.rating)}
                          readOnly
                          size="sm"
                          color="sky"
                        />
                      )}
                    </div>
                    {item.comment && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                        {item.comment}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ListPanel>
      </div>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  suffix,
  loading,
  tone,
}: {
  icon: typeof Star;
  label: string;
  value: number | string | null;
  suffix?: string;
  loading: boolean;
  tone: "indigo" | "emerald" | "sky" | "amber";
}) {
  const toneClass = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  }[tone];
  return (
    <Card className="relative overflow-hidden border-0 shadow-sm dark:bg-slate-900">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-20" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {value ?? "--"}
                {suffix && (
                  <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>
                )}
              </p>
            )}
          </div>
          <div className={cn("shrink-0 rounded-xl p-3", toneClass)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm dark:bg-slate-900">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-slate-900 dark:text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ListPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-0 py-0 shadow-sm dark:bg-slate-900">
      <CardHeader className="border-b border-slate-200 py-5 dark:border-slate-800">
        <CardTitle className="text-lg text-slate-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

function CandidateAvatar({ name, src }: { name?: string; src?: string }) {
  return (
    <Avatar className="h-9 w-9 shrink-0">
      <AvatarImage src={src} alt={name || ""} />
      <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {getInitials(name || "") || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

function EmptyPanel({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "min-h-32" : "h-72"
      )}>
      <BarChart3 className="h-7 w-7 text-slate-300 dark:text-slate-700" aria-hidden="true" />
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]" aria-busy="true">
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-60 w-full xl:col-span-2" />
    </div>
  );
}

function DashboardUnavailable({
  endpointUnavailable,
  refreshing,
  onRetry,
}: {
  endpointUnavailable: boolean;
  refreshing: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card className="border-0 shadow-sm dark:bg-slate-900">
      <div className="flex min-h-80 flex-col items-center justify-center px-5 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <ServerOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
          {t("mentorDashboardAnalytics.unavailableTitle")}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {t(
            endpointUnavailable
              ? "mentorDashboardAnalytics.endpointUnavailableDescription"
              : "mentorDashboardAnalytics.loadErrorDescription"
          )}
        </p>
        <Button className="mt-5" variant="outline" onClick={onRetry} disabled={refreshing}>
          <RefreshCw className={cn(refreshing && "animate-spin")} />
          {t("mentorDashboardAnalytics.retry")}
        </Button>
      </div>
    </Card>
  );
}

function getStatusLabel(status: string, t: (_key: string) => string): string {
  const known = ["COMPLETED", "ONGOING", "SCHEDULED", "PAID", "DRAFT", "REJECTED", "CANCELED"];
  if (known.includes(status)) return t("mentorDashboardAnalytics.status." + status.toLowerCase());
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function positiveId(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function formatDecimal(value: number | null): string | null {
  if (value === null) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getReviewNote(review?: {
  situationNote?: string;
  taskNote?: string;
  actionNote?: string;
  resultNote?: string;
  strength?: string;
  weakness?: string;
  improve?: string;
}): string | undefined {
  return [
    review?.resultNote,
    review?.strength,
    review?.improve,
    review?.situationNote,
    review?.taskNote,
    review?.actionNote,
    review?.weakness,
  ].find((note) => typeof note === "string" && note.trim().length > 0);
}
