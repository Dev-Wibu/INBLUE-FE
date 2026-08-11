import { Badge } from "@/components/ui/badge";
import { formatUtcNaiveDateTime } from "@/lib/formatting";
import type { JobDescription } from "@/services/company.manager";
import { Banknote, Building2, ChevronRight, Clock, MapPin, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MasterJobCardProps {
  job: JobDescription;
  companyName: string;
  companyLogoUrl?: string;
  isSelected: boolean;
  onSelect: () => void;
}

function getLevelBadgeStyle(level?: string) {
  switch (level?.toUpperCase()) {
    case "INTERN":
      return "bg-emerald-100/90 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60";
    case "FRESHER":
      return "bg-sky-100/90 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60";
    case "JUNIOR":
      return "bg-indigo-100/90 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60";
    case "MIDDLE":
      return "bg-purple-100/90 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60";
    case "SENIOR":
      return "bg-rose-100/90 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
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
      : t("enterpriseCompanydetail.negotiate", "Thỏa thuận");

  return (
    <div
      onClick={onSelect}
      className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-4.5 transition-all duration-200 ${
        isSelected
          ? "border-2 border-indigo-600 bg-indigo-50/50 shadow-md dark:border-indigo-500 dark:bg-indigo-950/40"
          : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
      }`}>
      {/* Left indicator active line */}
      {isSelected && (
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-600 dark:bg-indigo-500" />
      )}

      <div>
        {/* Top Header Row: Level Badge + Hiring Pulsing Status */}
        <div className="flex items-center justify-between gap-2">
          {job.level ? (
            <Badge
              variant="outline"
              className={`px-2.5 py-0.5 text-[11px] font-bold uppercase ${getLevelBadgeStyle(job.level)}`}>
              {job.level}
            </Badge>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>{t("enterpriseJobsearchpage.hiring", "Đang tuyển")}</span>
          </div>
        </div>

        {/* Job Title */}
        <h3
          className={`mt-2.5 line-clamp-2 text-[15px] leading-snug font-bold transition-colors ${
            isSelected
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400"
          }`}>
          {job.title}
        </h3>

        {/* Company Info */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={companyName}
                className="h-full w-full object-contain"
              />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
            {companyName}
          </span>
        </div>

        {/* Salary & Applicants Count */}
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
            <Banknote className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="truncate">{salaryText}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            <span>
              {job.appliedCount || 0} {t("common.candidates", "ứng viên")}
            </span>
          </div>
        </div>

        {/* Tech Stack Pills */}
        {job.skills && job.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {job.skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {skill}
              </span>
            ))}
            {job.skills.length > 3 && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{job.skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Row: Location / Date + Arrow CTA */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11.5px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
        <div className="flex items-center gap-2 truncate">
          {job.location ? (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="max-w-[120px] truncate">{job.location}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0 text-slate-400" />
              <span>{job.createdAt ? formatUtcNaiveDateTime(job.createdAt) : "Mới đăng"}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              isSelected
                ? "translate-x-1 text-indigo-600 dark:text-indigo-400"
                : "group-hover:translate-x-1"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
