import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { JobDescription } from "@/interfaces";
import { formatNumber } from "@/lib/formatting";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { format } from "date-fns";
import type { TFunction } from "i18next";
import { Banknote, Building2, CalendarDays, Coins, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { JobDetailContainer } from "./JobDetailContainer";

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
  INTERN: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  FRESHER: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  JUNIOR: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  MIDDLE: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
};

export function JobCard({
  job,
  onClick,
  onApply,
  t,
}: {
  job: JobDescription;
  onClick: () => void;
  onApply: (_e: React.MouseEvent) => void;
  t: TFunction;
}) {
  const jobExtra = job as JobDescription & { thumbnailUrl?: string; companyLogoUrl?: string };
  const logoUrl = jobExtra.companyLogo || jobExtra.thumbnailUrl || jobExtra.companyLogoUrl || null;
  const initials = getCompanyInitials(job.companyName);

  const isNegotiable = !job.salaryMin && !job.salaryMax;
  const salaryText = isNegotiable
    ? t("enterpriseJobsearchpage.negotiable", "Thỏa thuận")
    : `${formatNumber(job.salaryMin || 0)} - ${formatNumber(job.salaryMax || 0)}`.trim();

  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 transition-all hover:border-indigo-400 hover:shadow-lg dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-indigo-500/50">
      {/* Header section */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 text-xl font-bold text-indigo-600 dark:border-slate-800/80 dark:bg-[#0F172A] dark:text-indigo-400">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={job.companyName || "Company"}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <h3 className="truncate text-[17px] font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
              {job.title || t("enterpriseJobsearchpage.untitledJob", "Chưa có tiêu đề")}
            </h3>
            <div className="ml-2 flex shrink-0 items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
              <Users className="h-4 w-4" />
              {job.appliedCount || 0} {t("common.candidates", "ứng viên")}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[13.5px] text-slate-600 dark:text-slate-300">
              <Building2 className="h-4 w-4" />
              <span className="max-w-[140px] truncate">
                {job.companyName || t("common.unknownCompany", "Công ty ẩn danh")}
              </span>
            </div>

            <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />

            {job.level && (
              <Badge
                variant="secondary"
                className={`border-transparent px-3 py-0.5 text-xs font-semibold ${LEVEL_COLORS[job.level] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                {job.level}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="my-5 h-px w-full bg-slate-100 dark:bg-slate-800/60" />

      {/* Details (Salary + Status) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[15px] font-bold text-emerald-600 dark:text-slate-200">
          <Banknote className="h-5 w-5 text-emerald-500" />
          {salaryText}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div
            className={`flex items-center gap-2 text-[15px] font-semibold ${
              job.status === "OPEN"
                ? "text-emerald-600 dark:text-emerald-500"
                : job.status === "CLOSED"
                  ? "text-slate-600 dark:text-slate-400"
                  : "text-orange-600 dark:text-orange-500"
            }`}>
            <div
              className={`h-2 w-2 rounded-full ${
                job.status === "OPEN"
                  ? "bg-emerald-500 dark:bg-emerald-500"
                  : job.status === "CLOSED"
                    ? "bg-slate-400 dark:bg-slate-500"
                    : "bg-orange-500 dark:bg-orange-500"
              }`}
            />
            {job.status === "OPEN"
              ? t("enterpriseJobsearchpage.hiring", "Đang tuyển")
              : job.status === "CLOSED"
                ? t("enterpriseJobsearchpage.closed", "Đóng")
                : job.status}
          </div>
          <div className="flex items-center gap-1.5 text-[14px] font-medium text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            HSD:{" "}
            {job.deadlineAt
              ? format(new Date(job.deadlineAt), "dd/MM/yyyy")
              : t("common.noDeadline", "Không có thời hạn")}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-amber-600 dark:text-amber-500">
          <Coins className="h-[18px] w-[18px]" />
          {job.price ? `${formatNumber(job.price)} VND` : t("common.free", "Miễn phí")}
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onApply(e);
          }}
          className="h-11 rounded-xl border border-transparent bg-indigo-600 px-8 text-[15px] font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500">
          {t("enterpriseJobsearchpage.applyNow", "Ứng tuyển ngay")}
        </Button>
      </div>
    </div>
  );
}

const FILTER_LEVELS = ["ALL", "INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const;

const getLevelLabel = (level: (typeof FILTER_LEVELS)[number], t: TFunction): string => {
  if (level === "ALL") {
    return t("jobSearch.levelAll", "Tất cả");
  }
  return t(`jobSearch.level.${level.toLowerCase()}`, level);
};

export function JobSearchTab() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get("level") || "ALL");
  const [maxPrice, setMaxPrice] = useState<number | null>(
    searchParams.has("maxPrice") ? Number(searchParams.get("maxPrice")) : null
  );
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedJobId = searchParams.get("jobId");
  const selectedJob = useMemo(
    () => jobs.find((j) => j.id?.toString() === selectedJobId),
    [jobs, selectedJobId]
  );

  const maxAvailablePrice = useMemo(() => {
    const max = Math.max(0, ...jobs.map((j) => j.price || 0));
    return max > 0 ? max : 10000;
  }, [jobs]);

  const displayMaxPrice = maxPrice !== null ? maxPrice : maxAvailablePrice;

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    setActiveLevel(searchParams.get("level") || "ALL");
    if (searchParams.has("maxPrice")) {
      setMaxPrice(Number(searchParams.get("maxPrice")));
    } else {
      setMaxPrice(null);
    }
  }, [searchParams]);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const result = await jobDescriptionManager.getAll();
      if (result.success && result.data) {
        const validJobs = result.data.filter((job) => !job.isDeleted && job.status === "OPEN");
        setJobs(validJobs);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  const updateFilters = (q: string, level: string, price: number | null) => {
    const params: Record<string, string> = { tab: "jobSearch" };
    if (q.trim()) params.q = q.trim();
    if (level !== "ALL") params.level = level;
    if (price !== null) params.maxPrice = price.toString();
    setSearchParams(params);
  };

  const handleCloseDetail = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("jobId");
    setSearchParams(newParams);
  };

  const handleRefresh = () => {
    void fetchJobs();
  };

  const handleJobClick = (id: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("jobId", id.toString());
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchQuery, activeLevel, maxPrice);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setActiveLevel("ALL");
    setMaxPrice(null);
    setSearchParams({ tab: "jobSearch" });
  };

  const filteredJobs = useMemo(() => {
    let result = jobs;
    const query = searchParams.get("q")?.toLowerCase();
    const level = searchParams.get("level") || "ALL";

    if (query) {
      result = result.filter((job) => {
        return (
          job.title?.toLowerCase().includes(query) || job.companyName?.toLowerCase().includes(query)
        );
      });
    }

    if (level !== "ALL") {
      result = result.filter((job) => job.level === level);
    }

    if (maxPrice !== null) {
      result = result.filter((job) => (job.price || 0) <= maxPrice);
    }

    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [jobs, searchParams, maxPrice]);

  /* ─── Full-screen Detail View ─── */
  if (selectedJob) {
    return (
      <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-transparent">
        <JobDetailContainer
          job={selectedJob}
          onClose={handleCloseDetail}
          onRefresh={handleRefresh}
        />
      </section>
    );
  }

  /* ─── Job List View ─── */
  return (
    <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-transparent">
      {/* Top Action Bar (Hero Style) */}
      <div className="shrink-0 px-5 py-6 md:px-8">
        <div className="w-full rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/40">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            {/* Title & Subtitle */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("jobSearch.heroTitle", "Tìm việc làm phù hợp")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t(
                  "jobSearch.heroSubtitle",
                  "Khám phá quy trình tuyển dụng thực tế, luyện tập và ứng tuyển ngay"
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-semibold text-indigo-600 dark:text-[#66B2FF]">
                  {jobs.filter((j) => j.status === "OPEN").length || jobs.length}
                </span>
                <span className="text-[13px] text-slate-500 dark:text-slate-400">
                  {t("jobSearch.openPositions", "Vị trí mở")}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-semibold text-indigo-600 dark:text-[#66B2FF]">
                  {new Set(jobs.map((j) => j.companyName).filter(Boolean)).size}
                </span>
                <span className="text-[13px] text-slate-500 dark:text-slate-400">
                  {t("jobSearch.companies", "Công ty")}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-semibold text-indigo-600 dark:text-[#66B2FF]">
                  4
                </span>
                <span className="text-[13px] text-slate-500 dark:text-slate-400">
                  {t("jobSearch.levels", "Cấp bậc")}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("jobSearch.searchPlaceholder", "Tìm theo chức danh hoặc công ty...")}
                className="h-[46px] w-full rounded-[10px] border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-500/50 dark:border-slate-800/60 dark:bg-[#0B0F19] dark:text-white dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    updateFilters("", activeLevel, maxPrice);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              className="h-[46px] shrink-0 rounded-[10px] border border-slate-300 bg-transparent px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <Search className="mr-2 h-[18px] w-[18px]" />
              {t("jobSearch.searchButton", "Tìm việc")}
            </Button>
          </form>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-center">
            {/* Level Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500">
                {t("jobSearch.levelLabel", "Cấp bậc:")}
              </span>
              {FILTER_LEVELS.map((level) => {
                const isActive = activeLevel === level;
                const levelLabel = getLevelLabel(level, t);
                return (
                  <button
                    key={level}
                    onClick={() => {
                      setActiveLevel(level);
                      updateFilters(searchQuery, level, maxPrice);
                    }}
                    className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-600 dark:bg-indigo-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}>
                    {levelLabel}
                  </button>
                );
              })}
            </div>

            <div className="hidden h-5 w-px bg-slate-200 xl:block dark:bg-slate-700"></div>

            {/* Price Slider */}
            <div className="flex w-full max-w-[280px] flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-500">
                  {t("jobSearch.maxPrice", "Chi phí tối đa:")}
                </span>
                <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-500">
                  {maxPrice === null || maxPrice >= maxAvailablePrice
                    ? t("jobSearch.anyPrice", "Mọi mức giá")
                    : `${formatNumber(maxPrice)} VND`}
                </span>
              </div>
              <Slider
                value={[displayMaxPrice]}
                min={0}
                max={maxAvailablePrice}
                step={maxAvailablePrice > 1000 ? 500 : maxAvailablePrice > 100 ? 50 : 10}
                onValueChange={(val: number[]) => setMaxPrice(val[0])}
                onValueCommit={(val: number[]) => updateFilters(searchQuery, activeLevel, val[0])}
                className="[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:focus-visible:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Job List */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-6 md:px-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/50 [&::-webkit-scrollbar-track]:bg-transparent">
        {(searchQuery || activeLevel !== "ALL") && (
          <div className="mb-5">
            <span className="text-xs text-slate-500 dark:text-[#888888]">
              {t("common.showing", "Hiển thị")}{" "}
              <strong className="text-slate-800 dark:text-slate-200">{filteredJobs.length}</strong>{" "}
              {t("common.results", "kết quả")}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 animate-pulse rounded-[14px] bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="mt-2 h-4 w-1/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="my-1 h-px w-full bg-slate-100 dark:bg-slate-800/60" />
                <div className="space-y-3">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="flex justify-between">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <div className="h-11 flex-1 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-11 flex-1 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState query={searchParams.get("q") || ""} onClear={clearSearch} t={t} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                t={t}
                onClick={() => handleJobClick(job.id!)}
                onApply={(e) => {
                  e.stopPropagation();
                  handleJobClick(job.id!);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
