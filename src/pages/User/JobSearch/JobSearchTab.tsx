
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import type { JobDescription } from "@/interfaces";
import { formatNumber } from "@/lib/formatting";
import { jobDescriptionManager } from "@/services/job-description.manager";
import type { TFunction } from "i18next";
import { Briefcase, Coins, Search, SlidersHorizontal, X } from "lucide-react";
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
    <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Search className="h-6 w-6" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t("enterpriseJobsearchpage.noJobsFound", "Không tìm thấy công việc phù hợp")}
        </h3>
        <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {query
            ? t("enterpriseJobsearchpage.emptySearchDescription", { query })
            : t("enterpriseJobsearchpage.emptyDescription", "Chưa có tin tuyển dụng nào phù hợp với bộ lọc hiện tại.")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
        {t("enterpriseJobsearchpage.viewAllJobs", "Xem tất cả")}
      </Button>
    </div>
  );
}

const LEVEL_CHIP: Record<string, string> = {
  INTERN: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/30",
  FRESHER: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30",
  JUNIOR: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/30",
  MIDDLE: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30",
};

export function JobCard({
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
  const logoUrl = job.companyLogo || (job as any).thumbnailUrl || (job as any).companyLogoUrl || null;
  const initials = getCompanyInitials(job.companyName);
  const isOpen = job.status === "OPEN";

  const isNegotiable = !job.salaryMin && !job.salaryMax;
  const salaryText = isNegotiable
    ? t("enterpriseJobsearchpage.negotiable", "Thỏa thuận")
    : `${formatNumber(job.salaryMin || 0)} – ${formatNumber(job.salaryMax || 0)}`;

  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col rounded-xl border border-slate-200 bg-white transition-colors hover:border-indigo-300 dark:border-slate-800/60 dark:bg-slate-900/40 dark:hover:border-indigo-700/60">

      <div className="flex gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-indigo-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-indigo-400">
          {logoUrl ? (
            <img src={logoUrl} alt={job.companyName || "Company"} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
            {job.title || t("enterpriseJobsearchpage.untitledJob", "Chưa có tiêu đề")}
          </h3>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500 dark:text-slate-400">
            {job.companyName || t("common.unknownCompany", "Công ty ẩn danh")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {job.level && (
              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${LEVEL_CHIP[job.level] || "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"}`}>
                {job.level}
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${
              isOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-slate-400"}`} />
              {isOpen ? t("enterpriseJobsearchpage.hiring", "Đang tuyển") : t("enterpriseJobsearchpage.closed", "Đóng")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400">
            {salaryText}
          </span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="flex items-center gap-1 text-[12px] font-medium text-amber-600 dark:text-amber-500">
            <Coins className="h-3.5 w-3.5" />
            {job.price ? `${formatNumber(job.price)} VND` : "Miễn phí"}
          </span>
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onApply(e);
          }}
          className="h-7 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
          {t("enterpriseJobsearchpage.applyNow", "Ứng tuyển ngay")}
        </Button>
      </div>
    </div>
  );
}

const FILTER_LEVELS = ["ALL", "INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const;

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
        setJobs(result.data.filter((job) => !job.isDeleted));
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchJobs(); }, []);

  const updateFilters = (q: string, level: string, price: number | null) => {
    const params: Record<string, string> = { tab: "jobSearch" };
    if (q.trim()) params.q = q.trim();
    if (level !== "ALL") params.level = level;
    if (price !== null) params.maxPrice = price.toString();
    setSearchParams(params);
  };

  const handleCloseDetail = () => {
    const p = new URLSearchParams(searchParams);
    p.delete("jobId");
    setSearchParams(p);
  };

  const handleJobClick = (id: number) => {
    const p = new URLSearchParams(searchParams);
    p.set("jobId", id.toString());
    setSearchParams(p);
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
    if (query) result = result.filter((j) => j.title?.toLowerCase().includes(query) || j.companyName?.toLowerCase().includes(query));
    if (level !== "ALL") result = result.filter((j) => j.level === level);
    if (maxPrice !== null) result = result.filter((j) => (j.price || 0) <= maxPrice);
    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [jobs, searchParams]);

  const hasActiveFilter = searchQuery || activeLevel !== "ALL" || maxPrice !== null;

  /* ─── Full-screen Detail View ─── */
  if (selectedJob) {
    return (
      <section className="flex h-full flex-col overflow-hidden">
        <JobDetailContainer
          job={selectedJob}
          onClose={handleCloseDetail}
          onRefresh={() => void fetchJobs()}
        />
      </section>
    );
  }

  /* ─── Job List View: sidebar + grid ─── */
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left Sidebar (filters) ── */}
      <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r border-slate-200 bg-white px-5 py-6 dark:border-slate-800/60 dark:bg-slate-900/40 lg:flex xl:w-72">
        {/* Brand / title */}
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Briefcase className="h-5 w-5" />
            <span className="text-base font-bold text-slate-900 dark:text-white">Tìm việc làm</span>
          </div>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-slate-400">
            Khám phá quy trình tuyển dụng thực tế
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800/50 dark:bg-slate-800/30">
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {jobs.filter((j) => j.status === "OPEN").length || jobs.length}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Vị trí mở</div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {new Set(jobs.map((j) => j.companyName).filter(Boolean)).size}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Công ty</div>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">4</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Cấp bậc</div>
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

        {/* Search */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Tìm kiếm
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Chức danh hoặc công ty..."
                className="h-9 rounded-lg border-slate-200 bg-slate-50 pr-7 text-[13px] dark:border-slate-700 dark:bg-slate-800/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); updateFilters("", activeLevel, maxPrice); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" size="sm" className="h-9 w-9 shrink-0 rounded-lg bg-indigo-600 p-0 hover:bg-indigo-700">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

        {/* Level filter */}
        <div>
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Cấp bậc
          </p>
          <div className="flex flex-col gap-1">
            {FILTER_LEVELS.map((level) => {
              const isActive = activeLevel === level;
              const label = level === "ALL" ? "Tất cả" : level.charAt(0) + level.slice(1).toLowerCase();
              return (
                <button
                  key={level}
                  onClick={() => { setActiveLevel(level); updateFilters(searchQuery, level, maxPrice); }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-colors text-left ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
                  }`}>
                  <span>{label}</span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800/60" />

        {/* Price slider */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Chi phí tối đa
            </p>
            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-500">
              {maxPrice === null || maxPrice >= maxAvailablePrice ? "Tất cả" : `${formatNumber(maxPrice)} VND`}
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

        {/* Clear filters */}
        {hasActiveFilter && (
          <button
            onClick={clearSearch}
            className="flex items-center gap-1.5 text-[12px] font-medium text-rose-500 transition-colors hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300">
            <X className="h-3.5 w-3.5" />
            Xóa bộ lọc
          </button>
        )}
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile filter bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/40 lg:hidden">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm việc làm..."
                className="h-8 text-[13px]"
              />
            </div>
            <Button type="submit" size="sm" className="h-8 bg-indigo-600 px-3 hover:bg-indigo-700">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </form>
          <Button variant="outline" size="sm" className="h-8 px-2">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Result count + scrollable grid */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 md:px-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/50">
          {hasActiveFilter && (
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Hiển thị{" "}
              <strong className="text-slate-700 dark:text-slate-200">{filteredJobs.length}</strong>{" "}
              kết quả
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/60 dark:bg-slate-900/40">
                  <div className="flex gap-3 p-4">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-2 pt-0.5">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="mt-2 flex gap-1.5">
                        <div className="h-5 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800/50">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-7 w-20 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <EmptyState query={searchParams.get("q") || ""} onClear={clearSearch} t={t} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  t={t}
                  onClick={() => handleJobClick(job.id!)}
                  onApply={(e) => { e.stopPropagation(); handleJobClick(job.id!); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
