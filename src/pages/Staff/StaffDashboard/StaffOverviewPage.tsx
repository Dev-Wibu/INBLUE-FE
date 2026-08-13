import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useApplicationDetailsForReviewer } from "@/hooks/useApplicationDetails";
import { cn, fixUtf8Mojibake } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Inbox,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const GRADING_PATH = "/staff?tab=applicationGrading";

type FilterType = "all" | "AI_EVALUATED" | "COMPLETED" | "PENDING";

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
    const pending = pendingReviews.filter(
      (r) => (r as { status?: string }).status === "PENDING"
    ).length;
    return { total, needsGrading, completed, pending };
  }, [pendingReviews]);

  const progressPercent = useMemo(() => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  }, [stats]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: "all", label: t("staffOverview.filterAll") },
    { value: "AI_EVALUATED", label: t("staffOverview.filterAiEvaluated") },
    { value: "PENDING", label: t("staffOverview.filterPending") },
    { value: "COMPLETED", label: t("staffOverview.filterCompleted") },
  ];

  const filteredReviews = useMemo(() => {
    let filtered = pendingReviews;
    if (activeFilter !== "all") {
      filtered = filtered.filter((r) => (r as { status?: string }).status === activeFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        const appId = String((r as { applicationId?: number }).applicationId ?? "").toLowerCase();
        const applicantName = ((r as { applicantName?: string }).applicantName ?? "").toLowerCase();
        const appName = ((r as { applicationName?: string }).applicationName ?? "").toLowerCase();
        return appId.includes(query) || applicantName.includes(query) || appName.includes(query);
      });
    }
    return filtered;
  }, [pendingReviews, activeFilter, searchQuery]);

  const openGrading = () => navigate(GRADING_PATH);

  const openGradingWithId = (detailId: number) => {
    navigate(`/staff?tab=grading-detail&detailId=${detailId}`);
  };

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <div className="w-full px-4 pt-4 pb-8 md:px-6 lg:px-8">
        {/* ── Welcome Hero ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="flex flex-col items-center gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
              <Avatar className="h-16 w-16 shrink-0 shadow-md ring-4 ring-white dark:ring-slate-900">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {initials || "S"}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center gap-2 md:justify-start">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-[11px] font-semibold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                    {t("staffOverview.greeting")}
                  </span>
                </div>
                <h1 className="mt-0.5 text-xl font-bold text-slate-900 md:text-2xl dark:text-white">
                  {displayName}
                </h1>
                <div className="mt-2 flex flex-col gap-0.5">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("staffOverview.remainingReviews", {
                      count: stats.needsGrading,
                    })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("staffOverview.weeklyPerformance", {
                      completed: stats.completed,
                      total: stats.total,
                    })}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={openGrading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md">
              <ClipboardCheck className="h-4 w-4" />
              {t("staffOverview.goToApplications")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* PENDING REVIEWS - Emphasized */}
          <div className="group relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-indigo-800 dark:bg-slate-900/40 dark:hover:border-indigo-700">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-indigo-50 opacity-50 dark:bg-indigo-500/10" />
            <div className="flex items-start justify-between">
              <div className="relative z-10">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 dark:bg-indigo-500/15">
                    <Star className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-bold tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
                      Priority
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? "—" : stats.needsGrading}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("staffOverview.pendingReview")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {t("staffOverview.pendingReviewHint")}
                </p>
              </div>
            </div>
          </div>

          {/* COMPLETED */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-emerald-800">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-emerald-50 opacity-50 dark:bg-emerald-500/10" />
            <div className="flex items-start justify-between">
              <div className="relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? "—" : stats.completed}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("staffOverview.processedToday")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {t("staffOverview.processedTodayHint")}
                </p>
              </div>
            </div>
          </div>

          {/* TOTAL ASSIGNED */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-blue-800">
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-blue-50 opacity-50 dark:bg-blue-500/10" />
            <div className="flex items-start justify-between">
              <div className="relative z-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                  {isLoading ? "—" : stats.total}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {t("staffOverview.pendingNow")}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {t("staffOverview.pendingNowHint")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recent Pending Submissions ── */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          {/* Section header */}
          <div className="border-b border-slate-100 p-5 dark:border-slate-800">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {t("staffOverview.recentSubmissions")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("staffOverview.recentSubmissionsHint")}
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  {filterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setActiveFilter(opt.value)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                        activeFilter === opt.value
                          ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      )}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("staffOverview.searchPlaceholder")}
                    className="h-8 w-48 rounded-lg border-slate-200 bg-slate-50 pl-8 text-xs placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </div>

                <button
                  onClick={openGrading}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  {t("common.seeAll")}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <SpinnerBlock size="md" />
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 dark:border-slate-800 dark:bg-slate-900/30">
                <Inbox className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {searchQuery
                    ? t("staffOverview.noSearchResults")
                    : t("staffOverview.emptyRecentTitle")}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  {searchQuery
                    ? t("staffOverview.noSearchResultsHint")
                    : t("staffOverview.emptyRecentDescription")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReviews.map((review) => {
                  const detailId = (review as { id?: number }).id;
                  const applicantName = (review as { applicantName?: string }).applicantName;
                  const aiScore = (review as { aiScore?: number }).aiScore;
                  const status = (review as { status?: string }).status || "PENDING";
                  const submittedAt =
                    (review as { updatedAt?: string }).updatedAt ??
                    (review as { createdAt?: string }).createdAt;
                  const roundName = (review as { roundName?: string }).roundName;
                  const jobTitle = (review as { jobTitle?: string }).jobTitle;

                  return (
                    <div
                      key={detailId}
                      className="group relative flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white p-4 transition-all hover:border-indigo-300/80 hover:bg-indigo-50/30 dark:border-slate-800/60 dark:bg-slate-900/20 dark:hover:border-indigo-700/50 dark:hover:bg-indigo-500/5">
                      {/* Icon */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>

                      {/* Main info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {jobTitle ?? t("staffOverview.applicationLabel")}
                          </p>
                          {applicantName && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              · {applicantName}
                            </span>
                          )}
                          {status === "AI_EVALUATED" && aiScore != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                              <Sparkles className="h-2.5 w-2.5" />
                              AI: {aiScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(submittedAt, t)}
                          </span>
                          {roundName && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {roundName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status badge + action */}
                      <div className="flex shrink-0 items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-semibold",
                            status === "COMPLETED"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : status === "AI_EVALUATED"
                                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          )}>
                          {status === "AI_EVALUATED" && <Sparkles className="mr-1 h-2.5 w-2.5" />}
                          {status === "COMPLETED" && <CheckCircle2 className="mr-1 h-2.5 w-2.5" />}
                          {status === "PENDING" && <Clock className="mr-1 h-2.5 w-2.5" />}
                          {status.replace("_", " ")}
                        </Badge>

                        {/* Review button - shows on hover */}
                        <button
                          onClick={() => detailId && openGradingWithId(detailId)}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-indigo-700 hover:shadow-md">
                          {status === "COMPLETED" ? (
                            <>
                              {t("common.view")}
                              <ChevronRight className="h-3 w-3" />
                            </>
                          ) : (
                            <>
                              {t("staffOverview.review")}
                              <ChevronRight className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
