import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
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
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
        {t("enterpriseJobsearchpage.noJobsFound", "Không tìm thấy công việc nào")}
      </h3>
      <p className="max-w-md text-slate-500 dark:text-slate-400">
        {query
          ? t("enterpriseJobsearchpage.emptySearchDescription", { query })
          : t("enterpriseJobsearchpage.emptyDescription", "Chưa có tin tuyển dụng nào phù hợp.")}
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-6 border-[#0047AB]/30 text-[#0047AB] hover:bg-[#0047AB]/10 dark:border-[#66B2FF]/30 dark:text-[#66B2FF]">
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
      className="group flex min-h-[296px] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[#0047AB]/35 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] focus-visible:ring-2 focus-visible:ring-[#0047AB]/40 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:hover:border-[#66B2FF]/35">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-lg font-bold text-[#0047AB] dark:border-slate-700 dark:bg-slate-950 dark:text-[#66B2FF]">
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

      <div className="mt-4 mb-4 flex flex-wrap gap-2">
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

      <div className="mt-auto border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button className="w-full bg-[#0047AB] text-white hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-[#002b6b] dark:hover:bg-[#4d9eee]">
          {t("enterpriseJobsearchpage.viewDetails", "Xem chi tiết")}
        </Button>
      </div>
    </Link>
  );
}

export function JobSearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state with URL when URL changes
  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const result = await jobDescriptionManager.getAll();
        if (result.success && result.data) {
          // Lọc ra các công việc không bị xóa
          const validJobs = result.data.filter((job) => !job.isDeleted);
          setJobs(validJobs);
        }
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery.trim() });
    } else {
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchParams({});
  };

  const filteredJobs = useMemo(() => {
    let result = jobs;
    const query = searchParams.get("q")?.toLowerCase();

    if (query) {
      result = result.filter((job) => {
        const jobAny = job as any;
        return (
          job.title?.toLowerCase().includes(query) ||
          jobAny.companyName?.toLowerCase().includes(query)
        );
      });
    }

    // Sort logic (can be expanded)
    return result.sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [jobs, searchParams]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <HomepageHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#0047AB] px-4 py-20 dark:bg-[#002b6b]">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-7xl text-center">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t("enterpriseJobsearchpage.heroTitle", "Khám phá cơ hội nghề nghiệp")}
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-blue-100 sm:text-xl">
              {t(
                "enterpriseJobsearchpage.heroSubtitle",
                "Tìm kiếm các vị trí tuyển dụng mới nhất từ các công ty hàng đầu và bắt đầu hành trình của bạn."
              )}
            </p>

            <form
              onSubmit={handleSearch}
              className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl dark:bg-slate-900">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t(
                    "enterpriseJobsearchpage.searchPlaceholder",
                    "Tìm kiếm theo chức danh hoặc công ty..."
                  )}
                  className="h-14 border-0 bg-transparent pr-12 pl-12 text-base font-medium text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 dark:text-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                className="h-14 shrink-0 rounded-xl bg-[#0047AB] px-8 text-base font-semibold text-white shadow-md hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-[#002b6b] dark:hover:bg-[#4d9eee]">
                {t("enterpriseJobsearchpage.searchButton", "Tìm việc")}
              </Button>
            </form>
          </div>
        </section>

        {/* Results Section */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between border-b border-slate-200 pb-6 dark:border-slate-800">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("enterpriseJobsearchpage.allJobs", "Tất cả vị trí")}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t("enterpriseJobsearchpage.showingResults", {
                  count: filteredJobs.length,
                })}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[296px] animate-pulse rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredJobs.map((job) => (
                <JobCard key={job.id} job={job} t={t} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
