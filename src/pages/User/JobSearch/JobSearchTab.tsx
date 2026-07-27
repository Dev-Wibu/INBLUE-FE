import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobDescription } from "@/interfaces";
import { formatCurrency } from "@/lib/formatting";
import { jobDescriptionManager } from "@/services/job-description.manager";
import type { TFunction } from "i18next";
import { Banknote, Briefcase, Building2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { ReloadButton } from "@/components/shared";

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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white/85 py-20 text-center dark:border-slate-800 dark:bg-slate-900/75">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Search className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
        {t("enterpriseJobsearchpage.noJobsFound", "Không tìm thấy công việc nào")}
      </h3>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
        {query
          ? t("enterpriseJobsearchpage.emptySearchDescription", { query })
          : t("enterpriseJobsearchpage.emptyDescription", "Chưa có tin tuyển dụng nào phù hợp.")}
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-4 border-[#0047AB]/30 text-[#0047AB] hover:bg-[#0047AB]/10 dark:border-[#66B2FF]/30 dark:text-[#66B2FF]">
        {t("enterpriseJobsearchpage.viewAllJobs", "Xem tất cả công việc")}
      </Button>
    </div>
  );
}

interface JobCardProps {
  job: JobDescription;
  t: TFunction;
}

function JobCard({ job, t }: JobCardProps) {
  const jobAny = job as any;
  const initials = getCompanyInitials(jobAny.companyName);
  const logoUrl = jobAny.thumbnailUrl || jobAny.companyLogoUrl || jobAny.companyLogo;

  return (
    <Link
      to={`/enterprise/job/${job.id}`}
      className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#0047AB]/35 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-[#66B2FF]/35">
      
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-lg font-bold text-[#0047AB] dark:border-slate-700 dark:bg-slate-950 dark:text-[#66B2FF]">
          {logoUrl ? (
            <img src={logoUrl} alt={jobAny.companyName || "Company"} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {job.status === "OPEN" ? (
          <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300">
            {t("enterpriseJobsearchpage.hiring", "Đang tuyển")}
          </Badge>
        ) : (
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">
            {t("enterpriseJobsearchpage.closed", "Đóng")}
          </Badge>
        )}
      </div>

      <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-slate-950 transition-colors group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
        {job.title || t("enterpriseJobsearchpage.untitledJob", "Chưa có tiêu đề")}
      </h3>

      <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{jobAny.companyName || t("common.unknown")}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {job.level && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Briefcase className="h-3 w-3" />
            {job.level}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Banknote className="h-3 w-3" />
          {job.salaryMin && job.salaryMax
            ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`
            : t("enterpriseJobsearchpage.negotiable", "Thỏa thuận")}
        </span>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button className="w-full bg-[#0047AB] text-white hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-[#002b6b] dark:hover:bg-[#4d9eee]">
          {t("enterpriseJobsearchpage.viewDetails", "Xem chi tiết")}
        </Button>
      </div>
    </Link>
  );
}

export function JobSearchTab() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim(), tab: "jobSearch" });
    } else {
      setSearchParams({ tab: "jobSearch" });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchParams({ tab: "jobSearch" });
  };

  const filteredJobs = useMemo(() => {
    let result = jobs;
    const query = searchParams.get("q")?.toLowerCase();

    if (query) {
      result = result.filter(
        (job) => {
          const jobAny = job as any;
          return job.title?.toLowerCase().includes(query) ||
            jobAny.companyName?.toLowerCase().includes(query)
        }
      );
    }
    
    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [jobs, searchParams]);

  return (
    <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/50">
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/50 px-5 py-4 backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/50 md:px-6 md:py-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
            {t("enterpriseJobsearchpage.heroTitle", "Khám phá cơ hội nghề nghiệp")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(
              "enterpriseJobsearchpage.heroSubtitle",
              "Tìm kiếm các vị trí tuyển dụng mới nhất từ các công ty hàng đầu."
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReloadButton 
            isReloading={isReloading} 
            onReload={() => fetchJobs(true)} 
            className="h-10 w-10 shrink-0 rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 overflow-hidden border-b border-slate-200/50 bg-white/30 px-5 py-4 dark:border-slate-800/50 dark:bg-slate-950/20 md:px-6">
        <form onSubmit={handleSearch} className="flex w-full items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                "enterpriseJobsearchpage.searchPlaceholder",
                "Tìm kiếm theo chức danh hoặc công ty..."
              )}
              className="h-10 border-slate-200 bg-white pl-9 pr-9 text-sm focus-visible:ring-[#0047AB]/20 dark:border-slate-800 dark:bg-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            className="h-10 shrink-0 bg-[#0047AB] px-6 text-sm font-semibold text-white hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-[#002b6b] dark:hover:bg-[#4d9eee]">
            {t("enterpriseJobsearchpage.searchButton", "Tìm việc")}
          </Button>
        </form>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 md:px-6 md:pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[296px] animate-pulse rounded-2xl border border-slate-200/80 bg-white/80 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="mb-5 flex items-start justify-between">
                  <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="mb-3 h-6 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="mb-4 h-4 w-1/2 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="mb-4 flex gap-2">
                  <div className="h-6 w-20 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="mt-auto pt-4">
                  <div className="h-10 w-full rounded-md bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState query={searchParams.get("q") || ""} onClear={clearSearch} t={t} />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
