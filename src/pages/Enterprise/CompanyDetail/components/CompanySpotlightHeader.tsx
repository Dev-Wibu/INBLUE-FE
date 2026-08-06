import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Company, JobDescription } from "@/services/company.manager";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CompanySpotlightHeaderProps {
  company: Company;
  jobs: JobDescription[];
  onSelectJob?: (jobId: number) => void;
}

export function CompanySpotlightHeader({
  company,
  jobs,
  onSelectJob,
}: CompanySpotlightHeaderProps) {
  const { t } = useTranslation();

  const logoUrl = company.logoUrl;
  const companyInitials =
    company.name
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TN";

  const featuredJobs = jobs.filter((j) => j.id && j.status !== "CLOSED").slice(0, 3);

  return (
    <div className="relative mb-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-12 lg:divide-x lg:divide-y-0 dark:divide-slate-800">
        {/* Left / Middle: Logo + Company Info */}
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center lg:col-span-8">
          {/* Logo container */}
          <div className="relative shrink-0">
            <div className="flex h-24 w-28 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-xs dark:border-slate-700 dark:bg-slate-800">
              {logoUrl ? (
                <Avatar className="h-full w-full rounded-lg">
                  <AvatarImage src={logoUrl} alt={company.name} className="object-contain" />
                  <AvatarFallback className="rounded-lg bg-transparent text-2xl font-bold text-[#0047AB] dark:text-[#66B2FF]">
                    {companyInitials}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Building2 className="h-10 w-10 text-[#0047AB] dark:text-[#66B2FF]" />
              )}
            </div>
          </div>

          {/* Info Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">
                {company.name}
              </h1>
              {company.industry && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {company.industry}
                </Badge>
              )}
            </div>

            {company.location && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{company.location}</span>
              </div>
            )}

            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {company.description || t("enterpriseCompanydetail.noCompanyDescription")}
            </p>

            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0047AB] dark:text-[#66B2FF]">
                {jobs.length} {t("enterpriseCompanydetail.openPositions")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Featured Open Roles */}
        <div className="flex flex-col justify-center bg-slate-50/50 p-6 lg:col-span-4 dark:bg-slate-900/30">
          <p className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            {t("enterpriseCompanydetail.featuredRoles")} ({jobs.length})
          </p>
          {featuredJobs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("landingNew.noJobsAvailable")}
            </p>
          ) : (
            <div className="space-y-2">
              {featuredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => job.id && onSelectJob?.(job.id)}
                  className="group/item flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-slate-700 transition-colors hover:text-[#0047AB] dark:text-slate-300 dark:hover:text-[#66B2FF]">
                  <span className="truncate group-hover/item:underline">{job.title}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-400 transition-transform group-hover/item:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
