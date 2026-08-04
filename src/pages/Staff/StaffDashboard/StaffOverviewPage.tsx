import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useApplicationDetailsForReviewer } from "@/hooks/useApplicationDetails";
import { fixUtf8Mojibake } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { ArrowRight, ClipboardCheck, Clock, Sparkles, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const GRADING_PATH = "/staff?tab=applicationGrading";

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

  const { data: pendingReviews = [], isLoading } = useApplicationDetailsForReviewer(true);

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
    const needsGrading = pendingReviews.filter(
      (r) => (r as { status?: string }).status === "AI_EVALUATED"
    ).length;
    const completed = pendingReviews.filter(
      (r) => (r as { status?: string }).status === "COMPLETED"
    ).length;
    return { total, needsGrading, completed };
  }, [pendingReviews]);

  const recentPending = useMemo(() => pendingReviews.slice(0, 4), [pendingReviews]);

  const openGrading = () => navigate(GRADING_PATH);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="w-full px-4 pt-4 pb-8 md:px-6 lg:px-8">
        {/* Welcome Hero */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
              <Avatar className="h-20 w-20 shrink-0 shadow-md ring-4 ring-white dark:ring-slate-900">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {initials || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center gap-2 md:justify-start">
                  <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-xs font-medium tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                    {t("staffOverview.greeting")}
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl dark:text-white">
                  {displayName}
                </h1>
                <p className="mt-1 text-sm text-slate-600 md:text-base dark:text-slate-400">
                  {t("staffOverview.welcomeDescription")}
                </p>
              </div>
            </div>
            <button
              onClick={openGrading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700">
              <ClipboardCheck className="h-4 w-4" />
              {t("staffOverview.goToApplications")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("staffOverview.pendingReview")}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? "—" : stats.needsGrading}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("staffOverview.pendingReviewHint")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <ClipboardCheck className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("staffOverview.processedToday")}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? "—" : stats.completed}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("staffOverview.processedTodayHint")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  {t("staffOverview.pendingNow")}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? "—" : stats.total}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("staffOverview.pendingNowHint")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Pending Reviews */}
        <div className="mt-6 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("staffOverview.recentSubmissions")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("staffOverview.recentSubmissionsHint")}
              </p>
            </div>
            <button
              onClick={openGrading}
              className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
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
                const detailId = (review as { id?: number }).id;
                const applicationId = (review as { applicationId?: number }).applicationId;
                const status = (review as { status?: string }).status || "PENDING";
                const submittedAt =
                  (review as { updatedAt?: string }).updatedAt ??
                  (review as { createdAt?: string }).createdAt;
                const roundId = (review as { roundId?: number }).roundId;
                return (
                  <button
                    key={detailId}
                    onClick={openGrading}
                    className="flex w-full items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-4 text-left transition-all hover:border-indigo-300/60 hover:bg-indigo-50/50 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <ClipboardCheck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {t("staffOverview.applicationLabel")}
                        {applicationId ?? "—"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(submittedAt, t)}
                        </span>
                        {typeof roundId === "number" && <span>• Round {roundId}</span>}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        status === "COMPLETED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      }>
                      {status}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
