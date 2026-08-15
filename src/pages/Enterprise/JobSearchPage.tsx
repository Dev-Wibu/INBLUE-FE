import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { JobDescription } from "@/services/company.manager";
import { companyManager, type Company } from "@/services/company.manager";
import { jobDescriptionManager } from "@/services/job-description.manager";
import type { TFunction } from "i18next";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  DollarSign,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

const ALL_FILTER = "ALL";

export interface EnrichedJob extends JobDescription {
  companyName?: string;
  companyLogoUrl?: string;
  companyIndustry?: string;
}

const levelColors: Record<string, string> = {
  INTERN:
    "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300",
  FRESHER:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  JUNIOR:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  MIDDLE:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  SENIOR:
    "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
};

function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-4 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

interface EmptyPanelProps {
  query: string;
  isError?: boolean;
  onClear: () => void;
  t: TFunction;
}

function EmptyPanel({ query, isError, onClear, t }: EmptyPanelProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
        <BriefcaseBusiness className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
        {isError
          ? t("enterpriseJobsearchpage.cannotLoadJobs", "Không thể tải danh sách vị trí")
          : t("enterpriseJobsearchpage.noMatchingJobs", "Không tìm thấy vị trí tuyển dụng phù hợp")}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {isError
          ? t(
              "enterpriseJobsearchpage.loadErrorDescription",
              "Đã xảy ra lỗi khi tải danh sách công việc. Vui lòng thử lại sau."
            )
          : query
            ? t("enterpriseJobsearchpage.noQueryMatchDescription", {
                query,
                defaultValue: `Không có kết quả nào phù hợp với từ khóa "${query}".`,
              })
            : t(
                "enterpriseJobsearchpage.noFilterMatchDescription",
                "Không có vị trí nào khớp với bộ lọc hiện tại của bạn."
              )}
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-6 border-[#0047AB]/30 text-[#0047AB] hover:bg-[#0047AB]/10 dark:border-[#66B2FF]/30 dark:text-[#66B2FF]">
        {t("enterpriseJobsearchpage.viewAllJobsButton", "Xem tất cả vị trí tuyển dụng")}
      </Button>
    </div>
  );
}

function JobCard({ job, t }: { job: EnrichedJob; t: TFunction }) {
  const levelLabel = job.level || "INTERN";

  const formatSalaryVND = (min?: number, max?: number): { text: string; hasIcon: boolean } => {
    if (!min && !max) {
      return { text: t("enterpriseCompanydetail.negotiate", "Thỏa thuận"), hasIcon: false };
    }

    const fmt = (num: number): string => num.toLocaleString("en-US");

    if (min && max) {
      return { text: `${fmt(min)} - ${fmt(max)} VND`, hasIcon: false };
    }
    if (min) {
      return { text: `${fmt(min)}+ VND`, hasIcon: false };
    }
    if (max) {
      return { text: `Tối đa ${fmt(max)} VND`, hasIcon: false };
    }
    return { text: t("enterpriseCompanydetail.negotiate", "Thỏa thuận"), hasIcon: false };
  };

  const salaryInfo = formatSalaryVND(job.salaryMin, job.salaryMax);

  return (
    <article className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:border-[#0047AB]/40 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-[#66B2FF]/40">
      <div>
        {/* Company Logo & Level Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              {job.companyLogoUrl ? (
                <img
                  src={job.companyLogoUrl}
                  alt={job.companyName || "Company"}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Building2 className="h-6 w-6 text-[#0047AB] dark:text-[#66B2FF]" />
              )}
            </div>
            <div>
              <h4 className="line-clamp-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {job.companyName || "Công ty tuyển dụng"}
              </h4>
              {job.companyIndustry && (
                <p className="line-clamp-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {job.companyIndustry}
                </p>
              )}
            </div>
          </div>

          {job.level && (
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-0.5 text-xs font-bold tracking-wider uppercase",
                levelColors[job.level] || "border-slate-200 bg-slate-50 text-slate-700"
              )}>
              {levelLabel}
            </Badge>
          )}
        </div>

        {/* Job Title */}
        <h3 className="line-clamp-2 text-lg leading-snug font-bold tracking-tight text-slate-950 transition-colors group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
          {job.title}
        </h3>

        {/* Description snippet */}
        {job.description && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {job.description}
          </p>
        )}

        {/* Skills pills */}
        {job.skills && job.skills.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {job.skills.slice(0, 4).map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{job.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Action Button */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            {salaryInfo.hasIcon && <DollarSign className="h-3.5 w-3.5" />}
            {salaryInfo.text}
          </span>
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
          )}
          {job.appliedCount !== undefined && job.appliedCount > 0 && (
            <span className="flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400">
              <Users className="h-3.5 w-3.5" />
              {job.appliedCount}
            </span>
          )}
        </div>

        <Button
          size="sm"
          asChild
          className="h-8 rounded-full bg-[#0047AB] px-3.5 text-xs font-semibold text-white transition-all hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#87c4ff]">
          <Link to={`/enterprise/job/${job.id}`}>
            {t("enterpriseJobsearchpage.viewDetails", "Xem chi tiết")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function JobSearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState<EnrichedJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("q") || "");
  const [selectedLevel, setSelectedLevel] = useState<string>(ALL_FILTER);
  const [selectedLocation, setSelectedLocation] = useState<string>(ALL_FILTER);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        // Fetch jobs and companies in parallel
        const [jobsRes, companiesRes] = await Promise.all([
          jobDescriptionManager.getAll(),
          companyManager.getAll(),
        ]);

        if (!isMounted) return;

        let rawJobs: JobDescription[] = [];
        if (jobsRes.success && jobsRes.data) {
          if (Array.isArray(jobsRes.data)) {
            rawJobs = jobsRes.data;
          } else if (
            jobsRes.data &&
            typeof jobsRes.data === "object" &&
            "content" in jobsRes.data
          ) {
            rawJobs = ((jobsRes.data as { content?: unknown }).content || []) as JobDescription[];
          }
        }

        let rawCompanies: Company[] = [];
        if (companiesRes.success && companiesRes.data) {
          if (Array.isArray(companiesRes.data)) {
            rawCompanies = companiesRes.data;
          } else if (
            companiesRes.data &&
            typeof companiesRes.data === "object" &&
            "content" in companiesRes.data
          ) {
            rawCompanies = ((companiesRes.data as { content?: unknown }).content ||
              []) as Company[];
          }
        }

        // Map companies by ID
        const companyMap = new Map<number, Company>();
        rawCompanies.forEach((c) => {
          if (c.id) companyMap.set(c.id, c);
        });

        // Also extract jobs embedded in companies if rawJobs is empty
        if (rawJobs.length === 0) {
          rawCompanies.forEach((c) => {
            if (c.jobDescriptions && c.jobDescriptions.length > 0) {
              c.jobDescriptions.forEach((j) => {
                if (j.id && !rawJobs.some((existing) => existing.id === j.id)) {
                  rawJobs.push({ ...j, companyId: c.id });
                }
              });
            }
          });
        }

        // Enrich jobs with company details
        const enriched: EnrichedJob[] = rawJobs
          .filter((j) => j.id && !j.isDeleted && j.status !== "CLOSED")
          .map((j) => {
            const comp = j.companyId ? companyMap.get(j.companyId) : undefined;
            return {
              ...j,
              companyName: comp?.name || j.companyName || "Công ty đối tác",
              companyLogoUrl: comp?.logoUrl,
              companyIndustry: comp?.industry,
            };
          });

        setJobs(enriched);
      } catch {
        if (isMounted) setIsError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync search input from URL params
  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      nextParams.set("q", searchQuery.trim());
    } else {
      nextParams.delete("q");
    }
    setSearchParams(nextParams);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedLevel(ALL_FILTER);
    setSelectedLocation(ALL_FILTER);
    setSearchParams(new URLSearchParams());
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchQuery.trim().toLowerCase();

      // Search keyword check
      const matchKeyword =
        !q ||
        job.title?.toLowerCase().includes(q) ||
        job.companyName?.toLowerCase().includes(q) ||
        job.description?.toLowerCase().includes(q) ||
        job.skills?.some((s) => s.toLowerCase().includes(q));

      // Level check
      const matchLevel =
        selectedLevel === ALL_FILTER || job.level?.toUpperCase() === selectedLevel.toUpperCase();

      // Location check
      const matchLocation =
        selectedLocation === ALL_FILTER ||
        (job.location && job.location.toLowerCase().includes(selectedLocation.toLowerCase()));

      return matchKeyword && matchLevel && matchLocation;
    });
  }, [jobs, searchQuery, selectedLevel, selectedLocation]);

  // Unique locations for filter
  const locations = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.location?.trim()) set.add(j.location.trim());
    });
    return Array.from(set).slice(0, 6);
  }, [jobs]);

  const levels = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const;

  return (
    <div className="min-h-screen bg-[oklch(0.985_0.006_260)] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <HomepageHeader />

      {/* Hero Section Header */}
      <section className="relative border-b border-slate-200/80 bg-white pt-28 pb-12 sm:pt-32 lg:pt-36 dark:border-slate-800/80 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0047AB]/10 px-3.5 py-1 text-xs font-semibold text-[#0047AB] dark:bg-[#66B2FF]/10 dark:text-[#66B2FF]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                {t("enterpriseJobsearchpage.badgeLabel", "VỊ TRÍ TUYỂN DỤNG & LỘ TRÌNH PHỎNG VẤN")}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
              {t("enterpriseJobsearchpage.heroTitle", "Khám phá các Job Description nổi bật")}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              {t(
                "enterpriseJobsearchpage.heroSubtitle",
                "Chọn bất kỳ vị trí tuyển dụng nào để xem lộ trình phỏng vấn chi tiết, thực hành câu hỏi trắc nghiệm, bài tập lập trình và phỏng vấn AI thực tế."
              )}
            </p>
          </div>

          {/* Search Bar & Filters */}
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-4xl space-y-4">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder={t(
                  "enterpriseJobsearchpage.searchPlaceholder",
                  "Tìm vị trí theo tên công việc, kỹ năng (React, Java...), hoặc tên công ty..."
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-13 rounded-2xl border-slate-200 bg-slate-50/80 pr-28 pl-12 text-sm shadow-xs transition-all focus:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:focus:bg-slate-900"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-24 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              )}
              <Button
                type="submit"
                className="absolute right-2 h-9 rounded-xl bg-[#0047AB] px-4 text-xs font-semibold text-white hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#87c4ff]">
                {t("enterpriseJobsearchpage.searchButton", "Tìm kiếm")}
              </Button>
            </div>

            {/* Level Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {t("enterpriseJobsearchpage.levelLabel", "Cấp bậc:")}
              </span>
              <button
                type="button"
                onClick={() => setSelectedLevel(ALL_FILTER)}
                className={cn(
                  "rounded-full px-3 py-1 font-medium transition-all",
                  selectedLevel === ALL_FILTER
                    ? "bg-[#0047AB] text-white shadow-xs dark:bg-[#66B2FF] dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                )}>
                {t("enterpriseJobsearchpage.allLevels", "Tất cả")}
              </button>
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium transition-all",
                    selectedLevel === lvl
                      ? "bg-[#0047AB] text-white shadow-xs dark:bg-[#66B2FF] dark:text-slate-950"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  )}>
                  {lvl}
                </button>
              ))}

              {/* Location filter quick pills */}
              {locations.length > 0 && (
                <>
                  <span className="ml-3 font-semibold text-slate-500 dark:text-slate-400">
                    {t("enterpriseJobsearchpage.locationLabel", "Địa điểm:")}
                  </span>
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() =>
                        setSelectedLocation(selectedLocation === loc ? ALL_FILTER : loc)
                      }
                      className={cn(
                        "rounded-full px-3 py-1 font-medium transition-all",
                        selectedLocation === loc
                          ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      )}>
                      {loc}
                    </button>
                  ))}
                </>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Main Jobs Listing Section */}
      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Results Header Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {t("enterpriseJobsearchpage.showingJobsPrefix", "Hiển thị")}{" "}
            <strong className="font-bold text-slate-950 dark:text-white">
              {filteredJobs.length}
            </strong>{" "}
            {t("enterpriseJobsearchpage.showingJobsSuffix", "vị trí tuyển dụng")}
          </p>

          {(searchQuery || selectedLevel !== ALL_FILTER || selectedLocation !== ALL_FILTER) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="h-8 gap-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="h-3.5 w-3.5" />
              {t("enterpriseJobsearchpage.clearFilter", "Xóa bộ lọc")}
            </Button>
          )}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <JobCardSkeleton key={idx} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredJobs.length === 0 && (
          <EmptyPanel query={searchQuery} isError={isError} onClear={handleClearSearch} t={t} />
        )}

        {/* Jobs Grid */}
        {!isLoading && filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} t={t} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
export default JobSearchPage;
