import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import {
  calculateAverageFeedbackRating,
  useMentorFeedbacksByMentor,
} from "@/hooks/useMentorFeedback";
import { useMentorReviewsByMentor } from "@/hooks/useMentorReview";
import { useSessions } from "@/hooks/useSession";
import {
  calculateAverageMentorReviewScore,
  matchesMentorReviewScoreRange,
  normalizeMentorReviewScore,
} from "@/lib/mentor-review-score";
import { filterSessionsForMentor } from "@/lib/session-mentor";
import { fixUtf8Mojibake } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Gauge,
  MessageSquareHeart,
  Star,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
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
  CANCELED: "#f43f5e",
  OTHER: "#64748b",
};

interface ChartTooltipEntry {
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
  payload?: ChartTooltipEntry[];
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

export function MentorAnalyticsDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const { data: mentorProfile, isLoading: mentorLoading } = useCurrentMentorProfile();
  const mentorId = Number(mentorProfile?.id || 0);
  const { data: allSessions = [], isLoading: sessionsLoading } = useSessions();
  const { data: reviews = [], isLoading: reviewsLoading } = useMentorReviewsByMentor(mentorId);
  const { data: feedbacks = [], isLoading: feedbacksLoading } =
    useMentorFeedbacksByMentor(mentorId);

  const sessions = useMemo(
    () => filterSessionsForMentor(allSessions, mentorId),
    [allSessions, mentorId]
  );
  const isLoading = mentorLoading || sessionsLoading || reviewsLoading || feedbacksLoading;

  const sessionStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    sessions.forEach((session) => {
      const rawStatus = String(session.status || "OTHER").toUpperCase();
      const status = SESSION_COLORS[rawStatus] ? rawStatus : "OTHER";
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return Array.from(counts, ([status, value]) => ({
      status,
      name: t(`mentorDashboardAnalytics.status.${status.toLowerCase()}`),
      value,
    }));
  }, [sessions, t]);

  const scoreTrend = useMemo(
    () =>
      [...reviews]
        .filter((review) => typeof review.rating === "number")
        .sort((a, b) => {
          const aTime = new Date(a.session?.endTime1 || a.session?.startTime1 || 0).getTime();
          const bTime = new Date(b.session?.endTime1 || b.session?.startTime1 || 0).getTime();
          return aTime - bTime || Number(a.id || 0) - Number(b.id || 0);
        })
        .slice(-10)
        .map((review, index) => ({
          name: `#${review.session?.id || review.id || index + 1}`,
          score: normalizeMentorReviewScore(review.rating),
        })),
    [reviews]
  );

  const scoreDistribution = useMemo(
    () =>
      (["excellent", "strong", "meets", "developing"] as const).map((range) => ({
        name: t(`mentorScoring.range.${range}`),
        value: reviews.filter((review) => matchesMentorReviewScoreRange(review.rating, range))
          .length,
      })),
    [reviews, t]
  );

  const completedSessions = sessions.filter((session) => session.status === "COMPLETED").length;
  const upcomingSessions = sessions.filter((session) =>
    ["SCHEDULED", "PAID", "ONGOING"].includes(String(session.status || ""))
  ).length;
  const averageCandidateScore = calculateAverageMentorReviewScore(reviews);
  const averageMentorRating = calculateAverageFeedbackRating(feedbacks);
  const displayName = fixUtf8Mojibake(mentorProfile?.name || authUser?.name) || t("common.mentor");
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="-m-4 min-h-[calc(100%+32px)] bg-slate-50 md:-m-6 md:min-h-[calc(100%+48px)] lg:-m-8 lg:min-h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1800px] space-y-6 p-5 sm:p-6 md:px-8">
        <section className="flex flex-col justify-between gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0 border border-slate-200 dark:border-slate-700">
              <AvatarImage
                src={mentorProfile?.avatarUrl || authUser?.avatarUrl}
                alt={displayName}
              />
              <AvatarFallback className="bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {initials || "M"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-bold text-indigo-600 uppercase dark:text-indigo-400">
                {t("mentorDashboardAnalytics.greeting")}
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-white">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("mentorDashboardAnalytics.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/mentor?tab=reviews")}>
              {t("mentorDashboardAnalytics.openReviews")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate("/mentor?tab=sessions")}>
              {t("mentorDashboardAnalytics.openSessions")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CalendarCheck}
            label={t("mentorDashboardAnalytics.totalSessions")}
            value={isLoading ? undefined : sessions.length}
            tone="indigo"
          />
          <MetricCard
            icon={CheckCircle2}
            label={t("mentorDashboardAnalytics.completedSessions")}
            value={isLoading ? undefined : completedSessions}
            detail={t("mentorDashboardAnalytics.upcomingCount", { count: upcomingSessions })}
            tone="emerald"
          />
          <MetricCard
            icon={Gauge}
            label={t("mentorScoring.averageCandidateScore")}
            value={isLoading ? undefined : averageCandidateScore.toFixed(1)}
            suffix="/100"
            tone="sky"
          />
          <MetricCard
            icon={MessageSquareHeart}
            label={t("mentorDashboardAnalytics.averageMentorRating")}
            value={isLoading ? undefined : averageMentorRating.toFixed(1)}
            suffix="/5"
            tone="amber"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
          <ChartPanel
            title={t("mentorDashboardAnalytics.recentCandidateScores")}
            description={t("mentorDashboardAnalytics.recentCandidateScoresHint")}>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : scoreTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#64748b"
                      opacity={0.2}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name={t("common.score")}
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.14}
                      strokeWidth={2.5}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartPanel>

          <ChartPanel
            title={t("mentorDashboardAnalytics.sessionStatus")}
            description={t("mentorDashboardAnalytics.sessionStatusHint")}>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : sessionStatusData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="relative h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sessionStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}>
                      {sessionStatusData.map((item) => (
                        <Cell key={item.status} fill={SESSION_COLORS[item.status]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DashboardChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-950 dark:text-white">
                    {sessions.length}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t("common.total")}
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {sessionStatusData.map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SESSION_COLORS[item.status] }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </ChartPanel>
        </section>

        <ChartPanel
          title={t("mentorDashboardAnalytics.scoreDistribution")}
          description={t("mentorDashboardAnalytics.scoreDistributionHint")}>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : reviews.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {scoreDistribution.map((item, index) => {
                const tones = ["bg-emerald-500", "bg-indigo-500", "bg-sky-500", "bg-amber-500"];
                const width = reviews.length ? Math.round((item.value / reviews.length) * 100) : 0;
                return (
                  <div
                    key={item.name}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {item.name}
                      </span>
                      <span className="text-xl font-bold text-slate-950 dark:text-white">
                        {item.value}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${tones[index]}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{width}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </ChartPanel>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  detail,
  tone,
}: {
  icon: typeof Star;
  label: string;
  value?: number | string;
  suffix?: string;
  detail?: string;
  tone: "indigo" | "emerald" | "sky" | "amber";
}) {
  const toneClass = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {value === undefined ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          {value}
          {suffix && <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span>}
        </p>
      )}
      {detail && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
    </div>
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 mb-5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {children}
    </section>
  );
}

function EmptyChart() {
  const { t } = useTranslation();
  return (
    <div className="flex h-48 flex-col items-center justify-center text-center">
      <Gauge className="h-8 w-8 text-slate-300 dark:text-slate-700" />
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {t("mentorDashboardAnalytics.noData")}
      </p>
    </div>
  );
}
