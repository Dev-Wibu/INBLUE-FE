import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { companyManager, type Company, type JobDescription } from "@/services/company.manager";
import { ArrowLeft, BriefcaseBusiness, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MasterJobCard } from "../../Enterprise/CompanyDetail/components";
import { JobDetailContainer } from "../JobSearch/JobDetailContainer";

interface CompanyDetailContainerProps {
  companyId: string;
  onClose: () => void;
}

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

export function CompanyDetailContainer({ companyId, onClose }: CompanyDetailContainerProps) {
  const { t } = useTranslation();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const jobsResult = await companyManager.getJobs(companyId);
      if (jobsResult.success && jobsResult.data) {
        const jobList = Array.isArray(jobsResult.data)
          ? jobsResult.data
          : (jobsResult.data as { data?: JobDescription[] }).data || [];
        setJobs(jobList);
      }
    } catch (err) {
      console.error("[CompanyDetailContainer] Error refreshing jobs:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [companyResult, jobsResult] = await Promise.all([
          companyManager.getById(companyId),
          companyManager.getJobs(companyId),
        ]);
        if (companyResult.success && companyResult.data) {
          setCompany(companyResult.data);
        }
        if (jobsResult.success && jobsResult.data) {
          const jobList = Array.isArray(jobsResult.data)
            ? jobsResult.data
            : (jobsResult.data as { data?: JobDescription[] }).data || [];
          setJobs(jobList);
          if (jobList.length > 0 && jobList[0].id) {
            setSelectedJobId(jobList[0].id);
          }
        }
      } catch (err) {
        console.error("[CompanyDetailContainer] Fetch error:", err);
        setError(t("common.unableToLoadCompanyInformation", "Không thể tải thông tin công ty."));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [companyId, t]);

  const openJobs = useMemo(() => {
    return jobs.filter((job) => !job.isDeleted && job.status === "OPEN");
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return openJobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        job.title?.toLowerCase().includes(q) ||
        job.description?.toLowerCase().includes(q) ||
        job.skills?.some((s) => s.toLowerCase().includes(q));

      const matchesLevel = !selectedLevel || job.level === selectedLevel;

      return matchesSearch && matchesLevel;
    });
  }, [openJobs, searchQuery, selectedLevel]);

  const activeSelectedJob = useMemo(() => {
    return (
      filteredJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || openJobs[0] || null
    );
  }, [filteredJobs, selectedJobId, openJobs]);

  if (isLoading) {
    return (
      <div className="custom-scrollbar h-full overflow-y-auto px-5 py-6 md:px-8">
        <Skeleton className="h-44 w-full rounded-[20px]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="lg:col-span-8">
            <Skeleton className="h-[600px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t("enterpriseCompanydetail.noCompanyFound", "Không tìm thấy công ty")}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error ||
            t(
              "enterpriseCompanydetail.theCompanyYouAreLooking",
              "Thông tin công ty không tồn tại hoặc đã bị ẩn."
            )}
        </p>
        <Button onClick={onClose} variant="outline" className="mt-4 h-9 text-xs">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          {t("general.back", "Quay lại danh sách")}
        </Button>
      </div>
    );
  }

  const levels = ["INTERN", "FRESHER", "JUNIOR"] as const;
  const initials = getCompanyInitials(company.name);

  return (
    <div className="custom-scrollbar h-full overflow-y-auto px-5 py-6 md:px-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600/50 [&::-webkit-scrollbar-track]:bg-transparent">
      {/* Single Unified Header Container */}
      <div className="mb-6 w-full rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Back Button Link */}
        <button
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("general.backToCompanyList", "Quay lại danh sách công ty")}</span>
        </button>

        {/* Company Info Row */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Logo Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-slate-200 bg-slate-50 text-xl font-extrabold text-indigo-600 shadow-2xs dark:border-slate-800 dark:bg-[#0F172A] dark:text-indigo-400">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {company.name}
                </h1>
                {company.industry && (
                  <Badge
                    variant="secondary"
                    className="bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {company.industry}
                  </Badge>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {company.location || "TP. Hồ Chí Minh"}
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  {openJobs.length} {t("enterpriseCompanydetail.openPositions", "vị trí mở tuyển")}
                </span>
              </div>

              {company.description && (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {company.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex shrink-0 items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {openJobs.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Vị trí mở</span>
            </div>
          </div>
        </div>
      </div>

      {/* LinkedIn-Style 2-Column Split Layout (3:9 Ratio) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Master Job Descriptions List (3 cols / 25% width) */}
        <div className="space-y-4 lg:col-span-3">
          {/* Sleek Refined Search & Filter Bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder={t(
                  "enterpriseCompanydetail.searchOpenPositions",
                  "Tìm vị trí tuyển dụng..."
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/70 pr-8 pl-9 text-xs font-medium text-slate-900 shadow-2xs transition-all placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Level Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-slate-400">Level:</span>
              <button
                type="button"
                onClick={() => setSelectedLevel(null)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                  selectedLevel === null
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-400"
                }`}>
                Tất cả
              </button>
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                    selectedLevel === lvl
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-400"
                  }`}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Master Job List Cards with Fixed Scrollbar Container */}
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <BriefcaseBusiness className="mb-2 h-7 w-7 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t("enterpriseCompanydetail.noSuitableLocationFound", "Chưa có vị trí phù hợp")}
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-280px)] space-y-3 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {filteredJobs.map((job) => (
                <MasterJobCard
                  key={job.id}
                  job={job}
                  companyName={company.name || ""}
                  companyLogoUrl={company.logoUrl}
                  isSelected={activeSelectedJob?.id === job.id}
                  onSelect={() => job.id && setSelectedJobId(job.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: JobDetailContainer (9 cols / 75% width) */}
        <div className="min-w-0 lg:col-span-9">
          {activeSelectedJob ? (
            <JobDetailContainer
              key={activeSelectedJob.id}
              job={activeSelectedJob}
              onClose={() => {}}
              onRefresh={fetchJobs}
              hideBackButton={true}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <BriefcaseBusiness className="mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {t(
                  "enterpriseCompanydetail.selectJobToViewDetails",
                  "Chọn một công việc bên trái để xem chi tiết."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
