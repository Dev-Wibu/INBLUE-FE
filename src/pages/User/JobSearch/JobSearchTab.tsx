import { ReloadButton } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobDescription } from "@/interfaces";
import { formatCurrency } from "@/lib/formatting";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { format } from "date-fns";
import type { TFunction } from "i18next";
import { Banknote, Building2, CalendarDays, Search, Users, X } from "lucide-react";
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
  const initials = getCompanyInitials(job.companyName);
  const logoUrl = job.companyLogo || (job as any).thumbnailUrl || (job as any).companyLogoUrl;

  const isNegotiable = !job.salaryMin && !job.salaryMax;
  const salaryText = isNegotiable
    ? t("enterpriseJobsearchpage.negotiable", "Thỏa thuận")
    : `${formatCurrency(job.salaryMin || 0)} - ${formatCurrency(job.salaryMax || 0)}`.trim();

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
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h3 className="truncate text-[17px] font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
              {job.title || t("enterpriseJobsearchpage.untitledJob", "Chưa có tiêu đề")}
            </h3>
            <div className="ml-2 flex shrink-0 items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
              <Users className="h-4 w-4" />
              {job.appliedCount || 0} {t("common.candidates", "ứng viên")}
            </div>
          </div>
          
          <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Building2 className="h-4 w-4 opacity-70" />
            <span className="truncate">{job.companyName || t("common.unknownCompany", "Công ty ẩn danh")}</span>
          </div>
          
          <div className="mt-2.5">
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
        <div className="flex items-center justify-between mt-1">
          <div className={`flex items-center gap-2 text-[15px] font-semibold ${
            job.status === "OPEN" ? "text-emerald-600 dark:text-emerald-500" :
            job.status === "CLOSED" ? "text-slate-600 dark:text-slate-400" :
            "text-orange-600 dark:text-orange-500"
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              job.status === "OPEN" ? "bg-emerald-500 dark:bg-emerald-500" :
              job.status === "CLOSED" ? "bg-slate-400 dark:bg-slate-500" :
              "bg-orange-500 dark:bg-orange-500"
            }`} />
            {job.status === "OPEN"
              ? t("enterpriseJobsearchpage.hiring", "Đang tuyển")
              : job.status === "CLOSED"
                ? t("enterpriseJobsearchpage.closed", "Đóng")
                : job.status}
          </div>
          <div className="flex items-center gap-1.5 text-[14px] font-medium text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            HSD: {job.deadlineAt
              ? format(new Date(job.deadlineAt), "dd/MM/yyyy")
              : t("common.noDeadline", "Không có thời hạn")}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 flex-1 rounded-xl border-slate-300 bg-transparent text-[15px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          {t("enterpriseJobsearchpage.viewDetails", "Chi tiết")}
        </Button>
        <Button
          onClick={onApply}
          className="h-11 flex-1 rounded-xl border border-transparent bg-indigo-600 text-[15px] font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500">
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
        return (
          job.title?.toLowerCase().includes(query) ||
          job.companyName?.toLowerCase().includes(query)
        );
      });
    }

    if (level !== "ALL") {
      result = result.filter((job) => job.level === level);
    }

    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [jobs, searchParams]);

  return (
    <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-transparent">
      {/* Top Action Bar */}
      <div className="flex flex-col items-center gap-6 border-b border-slate-200/50 bg-white px-5 py-8 dark:border-transparent dark:bg-transparent md:px-8">
        <form onSubmit={handleSearch} className="relative flex w-full max-w-2xl items-center">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              "enterpriseJobsearchpage.searchPlaceholder",
              "Tìm kiếm theo chức danh hoặc công ty..."
            )}
            className="h-14 w-full rounded-full border border-slate-200 bg-slate-50/50 pl-14 pr-36 text-base shadow-sm focus-visible:ring-indigo-500/30 dark:border-[#333333] dark:bg-[#1E1E1E] dark:placeholder:text-[#888888] dark:text-white dark:focus-visible:ring-indigo-500/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                updateFilters("", activeLevel);
              }}
              className="absolute right-32 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
          <Button
            type="submit"
            className="absolute right-1.5 top-1.5 h-11 rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white shadow hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors">
            {t("enterpriseJobsearchpage.searchButton", "Tìm việc")}
          </Button>
        </form>

        <div className="flex w-full max-w-4xl flex-wrap items-center justify-between gap-4">
          {/* Level Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            {FILTER_LEVELS.map((level) => {
              const isActive = activeLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => {
                    setActiveLevel(level);
                    updateFilters(searchQuery, level);
                  }}
                  className={`rounded-full border px-4 py-1.5 text-[11px] font-bold tracking-wide transition-all ${
                    isActive
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm dark:border-indigo-500 dark:bg-indigo-500"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-[#131620] dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800"
                  }`}>
                  {level === "ALL" ? "TẤT CẢ" : level}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-6 md:px-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/50">
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
          <div className="grid grid-cols-1 gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-5 dark:border-slate-800/60 dark:bg-slate-900/40">
                <div className="flex gap-4">
                  <div className="h-16 w-16 shrink-0 animate-pulse rounded-[14px] bg-slate-200 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-1/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800 mt-2" />
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
          <div className="grid grid-cols-1 gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
