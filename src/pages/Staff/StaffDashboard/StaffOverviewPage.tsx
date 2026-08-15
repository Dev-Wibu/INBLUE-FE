import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApplicationDetailsForReviewer } from "@/hooks/useApplicationDetails";
import type { Post } from "@/interfaces";
import { cn, extractDataArray, fixUtf8Mojibake } from "@/lib/utils";
import { postManager } from "@/services/post.manager";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Gauge,
  Layers3,
  Newspaper,
  Sparkles,
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

const GRADING_PATH = "/staff?tab=applicationGrading";
const STATUS_COLORS: Record<string, string> = {
  AI_EVALUATED: "#f59e0b",
  PENDING: "#64748b",
  SUBMITTED: "#0ea5e9",
  COMPLETED: "#10b981",
};

interface ReviewerItem {
  id?: number;
  applicationId?: number;
  applicantName?: string;
  applicationName?: string;
  jobTitle?: string;
  roundName?: string;
  status?: string;
  aiScore?: number;
  hrScore?: number;
  finalScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DashboardTooltipEntry {
  color?: string;
  name?: string;
  value?: number | string;
}

function DashboardChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: DashboardTooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-950">
      {label !== undefined && (
        <p className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">{label}</p>
      )}
      {payload.map((entry, index) => (
        <div
          key={`${entry.name || "value"}-${index}`}
          className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color || "#6366f1" }}
            />
            {entry.name}
          </span>
          <span className="font-semibold text-slate-950 dark:text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

const scoreOf = (item: ReviewerItem) => item.hrScore ?? item.finalScore ?? item.aiScore;

const statusLabel = (status: string, t: TFunction) => {
  if (status === "AI_EVALUATED") return t("staffOverview.statusReadyToGrade");
  if (status === "COMPLETED") return t("staffOverview.statusCompleted");
  if (status === "SUBMITTED") return t("staffOverview.statusSubmitted");
  if (status === "PENDING") return t("staffOverview.statusPending");
  if (status === "SLOT_PICKED") return t("staffOverview.statusSlotPicked");
  return t("staffOverview.statusUnknown", { status });
};

export function StaffOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: rawReviews = [], isLoading } = useApplicationDetailsForReviewer(true);
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["staff", "posts", "overview"],
    queryFn: async (): Promise<Post[]> => {
      const response = await postManager.getAll();
      return response.success ? extractDataArray<Post>(response) : [];
    },
  });
  const reviews = rawReviews as ReviewerItem[];
  const displayName = fixUtf8Mojibake(user?.name) || t("common.staff");
  const initials = displayName
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const stats = useMemo(() => {
    const total = reviews.length;
    const ready = reviews.filter((item) => item.status === "AI_EVALUATED").length;
    const completed = reviews.filter((item) => item.status === "COMPLETED").length;
    const scores = reviews
      .map(scoreOf)
      .filter((score): score is number => typeof score === "number");
    const averageScore = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    return {
      total,
      ready,
      completed,
      averageScore,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    };
  }, [reviews]);

  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    reviews.forEach((item) => {
      const status = item.status || "PENDING";
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return Array.from(counts, ([status, value]) => ({
      status,
      name: statusLabel(status, t),
      value,
    }));
  }, [reviews, t]);

  const roundData = useMemo(() => {
    const rounds = new Map<string, { assigned: number; completed: number }>();
    reviews.forEach((item) => {
      const round = fixUtf8Mojibake(item.roundName) || t("staffOverview.roundFallback");
      const current = rounds.get(round) || { assigned: 0, completed: 0 };
      current.assigned += 1;
      if (item.status === "COMPLETED") current.completed += 1;
      rounds.set(round, current);
    });
    return Array.from(rounds, ([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.assigned - a.assigned)
      .slice(0, 7);
  }, [reviews, t]);

  const recentReviews = useMemo(
    () =>
      [...reviews]
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 6),
    [reviews]
  );

  const postStatusData = useMemo(
    () => [
      {
        status: "DRAFT",
        name: t("common.draft"),
        value: posts.filter((post) => post.status === "DRAFT").length,
        fill: "#f59e0b",
      },
      {
        status: "PUBLISHED",
        name: t("common.published"),
        value: posts.filter((post) => post.status === "PUBLISHED").length,
        fill: "#10b981",
      },
      {
        status: "ARCHIVED",
        name: t("common.archived"),
        value: posts.filter((post) => post.status === "ARCHIVED").length,
        fill: "#64748b",
      },
    ],
    [posts, t]
  );

  const openGrading = () => navigate(GRADING_PATH);
  const openDetail = (item: ReviewerItem) => {
    if (item.id) navigate(`/staff?tab=grading-detail&detailId=${item.id}`);
  };

  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1800px] space-y-6 p-5 sm:p-6 md:px-8">
        <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0 border border-slate-200 shadow-2xs dark:border-slate-700">
                <AvatarImage src={user?.avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {initials || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-bold text-indigo-600 uppercase dark:text-indigo-400">
                  {t("staffOverview.greeting")}
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-white">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("staffOverview.remainingReviews", { count: stats.ready })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-48">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    {t("common.completed")}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {stats.completionRate}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
              </div>
              <Button
                onClick={openGrading}
                className="h-10 rounded-xl bg-indigo-600 px-5 text-white hover:bg-indigo-700">
                <ClipboardCheck className="h-4 w-4" />
                {t("staffOverview.goToApplications")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Layers3}
            label={t("staffOverview.totalAssigned")}
            value={isLoading ? undefined : stats.total}
            tone="indigo"
          />
          <MetricCard
            icon={Sparkles}
            label={t("staffOverview.pendingReview")}
            value={isLoading ? undefined : stats.ready}
            tone="amber"
          />
          <MetricCard
            icon={CheckCircle2}
            label={t("common.completed")}
            value={isLoading ? undefined : stats.completed}
            tone="emerald"
          />
          <MetricCard
            icon={Gauge}
            label={t("staffOverview.averageScore")}
            value={isLoading ? undefined : stats.averageScore.toFixed(1)}
            suffix="/100"
            tone="sky"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white">
                  <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  {t("staffOverview.workloadByRound")}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("staffOverview.workloadByRoundHint")}
                </p>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : roundData.length === 0 ? (
              <EmptyChart message={t("staffOverview.noGradingData")} />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roundData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#334155"
                      opacity={0.18}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tickFormatter={(value) => String(value).slice(0, 15)}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Bar
                      dataKey="assigned"
                      name={t("staffOverview.assigned")}
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="completed"
                      name={t("common.completed")}
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-950 dark:text-white">
              {t("staffOverview.statusDistribution")}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t("staffOverview.statusDistributionHint")}
            </p>
            {isLoading ? (
              <Skeleton className="mt-5 h-72 w-full" />
            ) : statusData.length === 0 ? (
              <EmptyChart message={t("staffOverview.noGradingData")} />
            ) : (
              <div className="relative mt-2 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={92}
                      paddingAngle={3}>
                      {statusData.map((item) => (
                        <Cell key={item.status} fill={STATUS_COLORS[item.status] || "#64748b"} />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-950 dark:text-white">
                    {stats.total}
                  </span>
                  <span className="text-xs text-slate-500">{t("common.total")}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {statusData.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[item.status] || "#64748b" }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs lg:grid-cols-[1fr_2fr] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between border-b border-slate-200 p-5 lg:border-r lg:border-b-0 dark:border-slate-800">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                <Newspaper className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-950 dark:text-white">
                {t("staffOverview.contentModeration")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("staffOverview.contentModerationHint", { count: posts.length })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/staff?tab=articles")}
              className="mt-5 w-fit border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950">
              {t("staffOverview.openArticles")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-5">
            {postsLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : posts.length === 0 ? (
              <EmptyChart message={t("staffOverview.noPostData")} />
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={postStatusData}
                    margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#334155"
                      opacity={0.18}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Bar
                      dataKey="value"
                      name={t("common.articlesCommunity")}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={58}>
                      {postStatusData.map((item) => (
                        <Cell key={item.status} fill={item.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-950 dark:text-white">
                {t("staffOverview.recentSubmissions")}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("staffOverview.recentSubmissionsHint")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={openGrading}
              className="text-indigo-600 dark:text-indigo-400">
              {t("common.seeAll")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-14" />
              ))}
            </div>
          ) : recentReviews.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">
              {t("grading.noApplicationsToGrade")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[90px_minmax(240px,1.4fr)_minmax(180px,1fr)_130px_130px_48px] border-b border-slate-200 bg-slate-100/80 px-5 py-3 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                  <span>{t("common.id")}</span>
                  <span>{t("common.candidate")}</span>
                  <span>{t("common.interviewRound")}</span>
                  <span>{t("common.score")}</span>
                  <span>{t("common.status")}</span>
                  <span />
                </div>
                {recentReviews.map((item) => {
                  const score = scoreOf(item);
                  const status = item.status || "PENDING";
                  return (
                    <button
                      key={item.id}
                      onClick={() => openDetail(item)}
                      className="group grid min-h-[68px] w-full grid-cols-[90px_minmax(240px,1.4fr)_minmax(180px,1fr)_130px_130px_48px] items-center border-b border-slate-100 px-5 text-left last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        #{item.applicationId || item.id}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {fixUtf8Mojibake(item.applicantName) ||
                            fixUtf8Mojibake(item.applicationName) ||
                            t("common.candidate")}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {fixUtf8Mojibake(item.jobTitle) || "-"}
                        </p>
                      </div>
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                        {fixUtf8Mojibake(item.roundName) || "-"}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {typeof score === "number" ? `${score.toFixed(1)}/100` : "-"}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit rounded-full text-[10px] font-bold",
                          status === "COMPLETED"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : status === "AI_EVALUATED"
                              ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                              : "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}>
                        {statusLabel(status, t)}
                      </Badge>
                      <ArrowRight className="h-4 w-4 justify-self-end text-slate-400 group-hover:text-indigo-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: typeof Layers3;
  label: string;
  value?: string | number;
  suffix?: string;
  tone: "indigo" | "amber" | "emerald" | "sky";
}) {
  const toneClass = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
  }[tone];
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div
        className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        {value === undefined ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold text-slate-950 dark:text-white">
            {value}
            <span className="ml-1 text-sm font-medium text-slate-400">{suffix}</span>
          </p>
        )}
        <p className="mt-1 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-2 text-slate-400">
      <Clock3 className="h-8 w-8" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
