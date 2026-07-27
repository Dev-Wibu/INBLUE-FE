import { ReloadButton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobDescription } from "@/interfaces";
import { formatCurrency } from "@/lib/formatting";
import { jobDescriptionManager } from "@/services/job-description.manager";
import type { TFunction } from "i18next";
import { Banknote, Search, X, Circle, Building2 } from "lucide-react";
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
          {t("enterpriseJobsearchpage.noJobsFound", "Không tìm thấy công việc nào")}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {query
            ? t("enterpriseJobsearchpage.emptySearchDescription", { query })
            : t("enterpriseJobsearchpage.emptyDescription", "Chưa có tin tuyển dụng nào phù hợp.")}
        </p>
      </div>
      {query && (
        <Button
          variant="outline"
          onClick={onClear}
          className="mt-2 h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
          {t("enterpriseJobsearchpage.viewAllJobs", "Xem tất cả công việc")}
        </Button>
      )}
    </div>
  );
}

export function JobSearchTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      {/* Top Action Bar (No redundant Hero Header) */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/50 bg-white px-5 py-4 dark:border-slate-800/50 dark:bg-slate-900 md:px-6">
        <form onSubmit={handleSearch} className="flex flex-1 items-center max-w-md gap-2">
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
              className="h-9 border-slate-200 bg-slate-50/50 pl-9 pr-9 text-sm focus-visible:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            className="h-9 shrink-0 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500">
            {t("enterpriseJobsearchpage.searchButton", "Tìm việc")}
          </Button>
        </form>

        <ReloadButton 
          isLoading={isReloading} 
          onReload={() => fetchJobs(true)} 
          className="h-9 w-9 shrink-0 rounded-lg"
        />
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto pb-8">
        {(searchQuery) && (
          <div className="mt-4 px-6 mb-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t("common.showing", "Hiển thị")} <strong className="text-slate-800 dark:text-slate-200">{filteredJobs.length}</strong> {t("common.results", "kết quả")}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="mt-4 border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="h-64 flex flex-col items-center justify-center">
               <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-500" />
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <EmptyState query={searchParams.get("q") || ""} onClear={clearSearch} t={t} />
        ) : (
          <div className="mt-4 border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Table>
              <TableHeader className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[80px] pl-6 font-medium text-slate-500">Logo</TableHead>
                  <TableHead className="font-medium text-slate-500">
                    {t("enterpriseJobsearchpage.jobTitle", "Vị trí tuyển dụng")}
                  </TableHead>
                  <TableHead className="font-medium text-slate-500">
                    {t("enterpriseJobsearchpage.level", "Cấp bậc")}
                  </TableHead>
                  <TableHead className="font-medium text-slate-500">
                    {t("enterpriseJobsearchpage.salary", "Mức lương")}
                  </TableHead>
                  <TableHead className="w-[120px] font-medium text-slate-500">
                    {t("enterpriseJobsearchpage.status", "Trạng thái")}
                  </TableHead>
                  <TableHead className="w-[100px] pr-6 text-right font-medium text-slate-500"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => {
                  const jobAny = job as any;
                  const initials = getCompanyInitials(jobAny.companyName);
                  const logoUrl = jobAny.thumbnailUrl || jobAny.companyLogoUrl || jobAny.companyLogo;

                  return (
                    <TableRow 
                      key={job.id} 
                      onClick={() => navigate(`/enterprise/job/${job.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80"
                    >
                      <TableCell className="pl-6 py-4">
                         <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400">
                            {logoUrl ? (
                              <img src={logoUrl} alt={jobAny.companyName || "Company"} className="h-full w-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                      </TableCell>
                      <TableCell className="py-4">
                         <div className="flex flex-col gap-1">
                           <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                             {job.title || t("enterpriseJobsearchpage.untitledJob", "Chưa có tiêu đề")}
                           </span>
                           <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                             <Building2 className="h-3.5 w-3.5" />
                             <span className="truncate">{jobAny.companyName || t("common.unknown")}</span>
                           </div>
                         </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {job.level ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {job.level}
                          </span>
                        ) : (
                           <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <Banknote className="h-4 w-4 text-slate-400" />
                          {job.salaryMin && job.salaryMax
                            ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`
                            : t("enterpriseJobsearchpage.negotiable", "Thỏa thuận")}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {job.status === "OPEN" ? (
                           <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
                              {t("enterpriseJobsearchpage.hiring", "Đang tuyển")}
                           </div>
                        ) : (
                           <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <Circle className="h-2.5 w-2.5 fill-slate-400 text-slate-400" />
                              {t("enterpriseJobsearchpage.closed", "Đóng")}
                           </div>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          className="h-8 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/enterprise/job/${job.id}`);
                          }}
                        >
                          {t("enterpriseJobsearchpage.viewDetails", "Xem chi tiết")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
