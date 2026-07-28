import { ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobDescription } from "@/interfaces";
import { formatCurrency } from "@/lib/formatting";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { format } from "date-fns";
import type { TFunction } from "i18next";
import { Banknote, CalendarDays, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

function getCompanyInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "IB"
  );
}

function EmptyState({ query, onClear, t }: { query: string; onClear: () => void; t: TFunction }) {
  return (
    <div className="mx-6 my-10 flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Search className="h-6 w-6" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t("enterpriseJobsearchpage.noJobsFound", "Không tìm thấy công việc phù hợp")}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {query
            ? t("enterpriseJobsearchpage.emptySearchDescription", { query })
            : t(
                "enterpriseJobsearchpage.emptyDescription",
                "Chưa có tin tuyển dụng nào phù hợp với bộ lọc hiện tại."
              )}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-2 h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
        {t("enterpriseJobsearchpage.viewAllJobs", "Xem tất cả")}
      </Button>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  INTERN: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  FRESHER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  JUNIOR: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  MIDDLE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CLOSED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  DRAFT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

function JobCard({
  job,
  onClick,
  onApply,
  t,
}: {
  job: JobDescription;
  onClick: () => void;
  onApply: (e: React.MouseEvent) => void;
  t: TFunction;
}) {
  const jobAny = job as any;
  const initials = getCompanyInitials(jobAny.companyName);
  const logoUrl = jobAny.thumbnailUrl || jobAny.companyLogoUrl || jobAny.companyLogo;

  const isNegotiable = !job.salaryMin && !job.salaryMax;
  const salaryText = isNegotiable
    ? t("enterpriseJobsearchpage.negotiable", "Thỏa thuận")
    : `${formatCurrency(job.salaryMin || 0)} - ${formatCurrency(job.salaryMax || 0)} ${job.currency || ""}`.trim();

  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/50">
      {/* Header: Avatar + Title + Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 text-sm font-bold text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-400">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={jobAny.companyName || "Company"}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
            {job.title || t("enterpriseJobsearchpage.untitledJob", "Chưa có tiêu đề")}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {job.level && (
              <Badge
                variant="secondary"
                className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${LEVEL_COLORS[job.level] || "bg-slate-100 text-slate-700"}`}>
                {job.level}
              </Badge>
            )}
            <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {jobAny.companyName || t("common.unknown")}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Users className="h-3.5 w-3.5" />
            {job.appliedCount || 0}
          </div>
        </div>
      </div>

      <div className="my-4 h-px w-full bg-slate-100 dark:bg-slate-800" />

      {/* Details (Salary) */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Banknote className="h-4 w-4 text-emerald-500" />
          {salaryText}
        </div>
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`border-transparent px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[job.status || "OPEN"] || STATUS_COLORS.OPEN}`}>
            {job.status === "OPEN"
              ? t("enterpriseJobsearchpage.hiring", "Đang tuyển")
              : job.status === "CLOSED"
                ? t("enterpriseJobsearchpage.closed", "Đóng")
                : job.status}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {job.deadlineAt
              ? format(new Date(job.deadlineAt), "dd/MM/yyyy")
              : t("common.noDeadline", "Không có thời hạn")}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center gap-2 pt-2">
        <Button
          variant="ghost"
          className="h-9 flex-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          {t("enterpriseJobsearchpage.viewDetails", "Chi tiết")}
        </Button>
        <Button
          onClick={onApply}
          className="h-9 flex-1 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
          {t("enterpriseJobsearchpage.applyNow", "Ứng tuyển ngay")}
        </Button>
      </div>
    </div>
  );
}

const FILTER_LEVELS = ["ALL", "INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const;

export function JobSearchTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get("level") || "ALL");
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    setActiveLevel(searchParams.get("level") || "ALL");
  }, [searchParams]);

  const fetchJobs = async (isReload = false) => {
    if (!isReload) {
      setIsLoading(true);
    } else {
      setIsReloading(true);
    }
    try {
      const result = await jobDescriptionManager.getAll();
      if (result.success && result.data) {
        const validJobs = result.data.filter((job) => !job.isDeleted);
        setJobs(validJobs);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  const updateFilters = (q: string, level: string) => {
    const params: Record<string, string> = { tab: "jobSearch" };
    if (q.trim()) params.q = q.trim();
    if (level !== "ALL") params.level = level;
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchQuery, activeLevel);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveLevel("ALL");
    setSearchParams({ tab: "jobSearch" });
  };

  const filteredJobs = useMemo(() => {
    let result = jobs;
    const query = searchParams.get("q")?.toLowerCase();
    const level = searchParams.get("level") || "ALL";

    if (query) {
      result = result.filter((job) => {
        const jobAny = job as any;
        return (
          job.title?.toLowerCase().includes(query) ||
          jobAny.companyName?.toLowerCase().includes(query)
        );
      });
    }

    if (level !== "ALL") {
      result = result.filter((job) => job.level === level);
    }

    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [jobs, searchParams]);

  return (
    <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/50">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 border-b border-slate-200/50 bg-white px-5 py-4 md:px-6 dark:border-slate-800/50 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex max-w-md flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  "enterpriseJobsearchpage.searchPlaceholder",
                  "Tìm kiếm theo chức danh hoặc công ty..."
                )}
                className="h-9 border-slate-200 bg-slate-50/50 pr-9 pl-9 text-sm focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    updateFilters("", activeLevel);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              className="h-9 shrink-0 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500">
              {t("enterpriseJobsearchpage.searchButton", "Tìm việc")}
            </Button>
          </form>

          <ReloadButton
            isLoading={isReloading}
            onReload={() => fetchJobs(true)}
            className="h-9 w-9 shrink-0 rounded-lg"
          />
        </div>

        {/* Level Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {FILTER_LEVELS.map((level) => {
            const isActive = activeLevel === level;
            return (
              <button
                key={level}
                onClick={() => {
                  setActiveLevel(level);
                  updateFilters(searchQuery, level);
                }}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide transition-colors ${
                  isActive
                    ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/10"
                }`}>
                {level === "ALL" ? "TẤT CẢ" : level}
              </button>
            );
          })}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 md:px-6">
        {(searchQuery || activeLevel !== "ALL") && (
          <div className="mb-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("common.showing", "Hiển thị")}{" "}
              <strong className="text-slate-800 dark:text-slate-200">{filteredJobs.length}</strong>{" "}
              {t("common.results", "kết quả")}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex gap-3">
                  <div className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="mt-2 flex gap-2">
                  <div className="h-9 flex-1 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="h-9 flex-1 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState query={searchParams.get("q") || ""} onClear={clearSearch} t={t} />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                t={t}
                onClick={() => navigate(`/enterprise/job/${job.id}`)}
                onApply={(e) => {
                  e.stopPropagation();
                  navigate(`/enterprise/job/${job.id}?action=apply`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
