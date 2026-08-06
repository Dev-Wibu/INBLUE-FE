import { formatUtcNaiveDateTime } from "@/lib/formatting";
import type { JobDescription } from "@/services/company.manager";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MasterJobCardProps {
  job: JobDescription;
  companyName: string;
  companyLogoUrl?: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function MasterJobCard({
  job,
  companyName,
  companyLogoUrl,
  isSelected,
  onSelect,
}: MasterJobCardProps) {
  const { t } = useTranslation();

  const salaryText =
    job.salaryMin || job.salaryMax
      ? `${job.salaryMin ? job.salaryMin.toLocaleString() : 0} - ${
          job.salaryMax ? job.salaryMax.toLocaleString() : "Max"
        } ${job.currency || "USD"}`
      : t("enterpriseCompanydetail.negotiate");

  return (
    <div
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
        isSelected
          ? "border-2 border-[#0047AB] bg-blue-50/30 shadow-md dark:border-[#66B2FF] dark:bg-blue-950/20"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}>
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span>
            {job.createdAt
              ? t("enterpriseCompanydetail.postedTime", {
                  time: formatUtcNaiveDateTime(job.createdAt),
                })
              : t("enterpriseCompanydetail.positionIsRecruiting")}
          </span>
        </div>

        {/* Job Title */}
        <h3
          className={`mt-2 line-clamp-2 text-base font-bold transition-colors ${
            isSelected
              ? "text-[#0047AB] dark:text-[#66B2FF]"
              : "text-slate-950 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]"
          }`}>
          {job.title}
        </h3>

        {/* Company Name & Logo */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={companyName}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-[#0047AB] dark:text-[#66B2FF]" />
            )}
          </div>
          <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
            {companyName}
          </span>
        </div>

        {/* Salary */}
        <p className="mt-2.5 text-xs font-bold text-[#0047AB] dark:text-[#66B2FF]">{salaryText}</p>

        {/* Work Model & Location */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {job.level && (
            <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {job.level}
            </span>
          )}
          {job.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              <span className="max-w-[120px] truncate">{job.location}</span>
            </span>
          )}
        </div>

        {/* Tech Stack Tags */}
        {job.skills && job.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {job.skills.slice(0, 4).map((skill, idx) => (
              <span
                key={idx}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{job.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end text-xs font-semibold text-[#0047AB] dark:text-[#66B2FF]">
        <ChevronRight
          className={`h-4 w-4 transition-transform ${
            isSelected ? "translate-x-1" : "group-hover:translate-x-1"
          }`}
        />
      </div>
    </div>
  );
}
