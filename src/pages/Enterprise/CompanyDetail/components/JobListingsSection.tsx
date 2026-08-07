import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { JobDescription } from "@/services/company.manager";
import { BriefcaseBusiness, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { JobCard } from "./JobCard";

interface JobListingsSectionProps {
  jobs: JobDescription[];
  companyName: string;
}

export function JobListingsSection({ jobs, companyName }: JobListingsSectionProps) {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (job.status !== "OPEN") return false;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        job.title?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.skills?.some((skill) => skill.toLowerCase().includes(query));

      return matchesSearch;
    });
  }, [jobs, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
  };

  const hasActiveFilters = searchQuery !== "";

  return (
    <section
      id="open-positions"
      className="w-full scroll-mt-24 bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
              <BriefcaseBusiness className="h-4 w-4" />
              {t("enterpriseCompanydetail.openPositions")}
            </div>
            <h2 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-slate-950 sm:text-3xl dark:text-white">
              {t("enterpriseCompanydetail.jobOpportunitiesAt")} {companyName}
            </h2>
          </div>

          <Badge
            variant="secondary"
            className="w-fit bg-[#0047AB]/10 px-3 py-1 text-sm font-medium text-[#0047AB] dark:bg-[#0047AB]/30 dark:text-[#66B2FF]">
            {filteredJobs.length} {t("enterpriseCompanydetail.openRoles")}
          </Badge>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="relative min-w-0">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={t("enterpriseCompanydetail.searchOpenPositions")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pr-10 pl-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-950">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              {t("enterpriseCompanydetail.noSuitableLocationFound")}
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {t("enterpriseCompanydetail.tryAdjustingYourSearchFilters")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t("common.clearFilter")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job, index) => (
              <JobCard key={job.id || index} job={job} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
