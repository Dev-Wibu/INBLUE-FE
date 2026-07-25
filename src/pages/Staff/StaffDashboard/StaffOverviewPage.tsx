import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useAllPendingHRReviews } from "@/hooks/useApplicationDetails";
import { fixUtf8Mojibake } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowRight,
  ClipboardCheck,
  Clock,
  FileText,
  MessageSquare,
  Newspaper,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Video,
} from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const TAB_LINKS: Record<string, string> = {
  applicationGrading: "/staff?tab=applicationGrading",
  "mentor-applications": "/staff?tab=mentor-applications",
  sessions: "/staff?tab=sessions",
  reviews: "/staff?tab=reviews",
  feedback: "/staff?tab=feedback",
  posts: "/staff?tab=posts",
};

const QUICK_ACTIONS = [
  {
    key: "applicationGrading",
    titleKey: "adminApplicationGrading.applicationGrading",
    descriptionKey: "adminApplicationGrading.gradeApplications",
    icon: ClipboardCheck,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "hover:border-orange-300 dark:hover:border-orange-700",
  },
  {
    key: "mentor-applications",
    titleKey: "staffStaffdashboard.coordinationPanel",
    descriptionKey: "staffStaffdashboard.processMentorRegistration",
    icon: UserCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "hover:border-emerald-300 dark:hover:border-emerald-700",
  },
  {
    key: "sessions",
    titleKey: "common.interviewSession",
    descriptionKey: "staffOverview.monitorInterviewSessions",
    icon: Video,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "hover:border-rose-300 dark:hover:border-rose-700",
  },
  {
    key: "reviews",
    titleKey: "staffStaffdashboard.mentorSReview",
    descriptionKey: "staffOverview.moderateMentorReviews",
    icon: FileText,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "hover:border-yellow-300 dark:hover:border-yellow-700",
  },
  {
    key: "feedback",
    titleKey: "staffStaffdashboard.candidateResponses",
    descriptionKey: "staffStaffdashboard.moderateCandidatesResponsesToMentors",
    icon: MessageSquare,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-900/20",
    border: "hover:border-cyan-300 dark:hover:border-cyan-700",
  },
  {
    key: "posts",
    titleKey: "common.article",
    descriptionKey: "staffOverview.manageCommunityPosts",
    icon: Newspaper,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "hover:border-purple-300 dark:hover:border-purple-700",
  },
];

function formatTimeAgo(
  value: string | undefined,
  t: (_key: string, _opts?: Record<string, unknown>) => string
): string {
  if (!value) return t("common.notUpdatedYet");
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return t("common.notUpdatedYet");
  const diffMs = Date.now() - created;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("staffOverview.justNow");
  if (minutes < 60) return t("staffOverview.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("staffOverview.hoursAgoShort", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("staffOverview.daysAgoShort", { count: days });
  return t("staffOverview.daysAgoShort", { count: days });
}

export function StaffOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: pendingReviews = [], isLoading } = useAllPendingHRReviews(true);

  const displayName = fixUtf8Mojibake(user?.name) || t("common.staff");
  const avatarUrl = user?.avatarUrl ?? null;
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const stats = useMemo(() => {
    const total = pendingReviews.length;
    const submitted = pendingReviews.filter(
      (r) => (r as { status?: string }).status === "SUBMITTED"
    ).length;
    const pending = Math.max(0, total - submitted);
    return { total, submitted, pending };
  }, [pendingReviews]);

  const recentPending = useMemo(() => pendingReviews.slice(0, 4), [pendingReviews]);

  const handleQuickAction = (key: string) => {
    const link = TAB_LINKS[key];
    if (link) navigate(link);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-[#0b1c30]">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pt-6 pb-12 lg:px-6">
        {/* Welcome Hero */}
        <div className="glass-card relative overflow-hidden rounded-xl p-6">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#0058be]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative z-10 flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
              <Avatar className="h-20 w-20 shrink-0 shadow-md ring-4 ring-white dark:ring-slate-900">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-[#e5eeff] text-lg font-bold text-[#0058be] dark:bg-[#1a2a3a] dark:text-[#66B2FF]">
                  {initials || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center gap-2 md:justify-start">
                  <Sparkles className="h-4 w-4 text-[#0058be] dark:text-[#66B2FF]" />
                  <span className="text-xs font-medium tracking-wider text-[#0058be] uppercase dark:text-[#66B2FF]">
                    {t("staffOverview.greeting")}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-bold text-[#0b1c30] md:text-3xl dark:text-white">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-[#45464d] md:text-base dark:text-[#8f9099]">
                  {t("staffOverview.welcomeDescription")}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleQuickAction("applicationGrading")}
              className="flex items-center gap-2 rounded-lg bg-[#0058be] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#0047a8]">
              <ClipboardCheck className="h-4 w-4" />
              {t("staffOverview.goToApplications")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="glass-card border-slate-200/60 p-5 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider text-[#45464d] uppercase dark:text-[#8f9099]">
                  {t("staffOverview.pendingReview")}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0b1c30] dark:text-white">
                  {isLoading ? "—" : stats.total}
                </p>
                <p className="mt-1 text-xs text-[#45464d] dark:text-[#8f9099]">
                  {t("staffOverview.pendingReviewHint")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                <ClipboardCheck className="h-6 w-6" />
              </div>
            </div>
          </Card>
          <Card className="glass-card border-slate-200/60 p-5 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider text-[#45464d] uppercase dark:text-[#8f9099]">
                  {t("staffOverview.processedToday")}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0b1c30] dark:text-white">
                  {isLoading ? "—" : stats.submitted}
                </p>
                <p className="mt-1 text-xs text-[#45464d] dark:text-[#8f9099]">
                  {t("staffOverview.processedTodayHint")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </Card>
          <Card className="glass-card border-slate-200/60 p-5 dark:border-slate-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider text-[#45464d] uppercase dark:text-[#8f9099]">
                  {t("staffOverview.pendingNow")}
                </p>
                <p className="mt-2 text-3xl font-bold text-[#0b1c30] dark:text-white">
                  {isLoading ? "—" : stats.pending}
                </p>
                <p className="mt-1 text-xs text-[#45464d] dark:text-[#8f9099]">
                  {t("staffOverview.pendingNowHint")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="glass-card border-slate-200/60 p-6 dark:border-slate-800/60">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
                {t("staffOverview.quickActions")}
              </h2>
              <p className="mt-1 text-sm text-[#45464d] dark:text-[#8f9099]">
                {t("staffOverview.workSubtitle")}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-[#0058be]/30 bg-[#0058be]/5 text-[#0058be] dark:border-[#66B2FF]/30 dark:bg-[#66B2FF]/10 dark:text-[#66B2FF]">
              <Users className="mr-1 h-3 w-3" />
              {t("common.staff")}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.key}
                  onClick={() => handleQuickAction(action.key)}
                  className={`group flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/50 ${action.border}`}>
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${action.bg}`}>
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0b1c30] dark:text-white">
                      {t(action.titleKey)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#45464d] dark:text-[#8f9099]">
                      {t(action.descriptionKey)}
                    </p>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 ${action.color}`}
                  />
                </button>
              );
            })}
          </div>
        </Card>

        {/* Recent Pending Reviews */}
        <Card className="glass-card border-slate-200/60 p-6 dark:border-slate-800/60">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0b1c30] dark:text-white">
                {t("staffOverview.recentSubmissions")}
              </h2>
              <p className="mt-1 text-sm text-[#45464d] dark:text-[#8f9099]">
                {t("staffOverview.recentSubmissionsHint")}
              </p>
            </div>
            <button
              onClick={() => handleQuickAction("applicationGrading")}
              className="flex items-center gap-1 text-sm font-medium text-[#0058be] transition-colors hover:text-[#0047a8] dark:text-[#66B2FF] dark:hover:text-[#99ccff]">
              {t("common.seeAll")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <SpinnerBlock size="md" />
            </div>
          ) : recentPending.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/30">
              <ClipboardCheck className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                {t("staffOverview.emptyRecentTitle")}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                {t("staffOverview.emptyRecentDescription")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPending.map((review) => {
                const reviewId = (review as { id?: number }).id;
                const status = (review as { status?: string }).status || "PENDING";
                const submittedAt = (review as { createdAt?: string }).createdAt;
                const roundOrder = (review as { currentRoundOrder?: number }).currentRoundOrder;
                return (
                  <button
                    key={reviewId}
                    onClick={() => handleQuickAction("applicationGrading")}
                    className="flex w-full items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-4 text-left transition-all hover:border-[#0058be]/40 hover:bg-[#eff4ff] dark:border-slate-800/60 dark:bg-slate-900/50 dark:hover:bg-[#0058be]/10">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0b1c30] dark:text-white">
                        {t("staffOverview.applicationLabel")}
                        {reviewId ?? "—"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#45464d] dark:text-[#8f9099]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(submittedAt, t)}
                        </span>
                        {typeof roundOrder === "number" && <span>• Round {roundOrder}</span>}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        status === "SUBMITTED"
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      }>
                      {status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
