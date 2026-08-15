import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobDescription } from "@/services/company.manager";
import { Clock, DollarSign, Eye, MapPin, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

interface JobCardProps {
  job: JobDescription;
}

const levelColors: Record<string, string> = {
  INTERN:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  FRESHER:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  JUNIOR:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
  MIDDLE:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
};

export function JobCard({ job }: JobCardProps) {
  const { t } = useTranslation();
  const levelLabels: Record<string, string> = {
    INTERN: t("enterpriseCompanydetail.internInternship"),
    FRESHER: t("enterpriseCompanydetail.fresher"),
    JUNIOR: t("enterpriseCompanydetail.junior"),
    MIDDLE: t("enterpriseCompanydetail.middle"),
  };

  const formatSalaryVND = (min?: number, max?: number): { text: string; hasIcon: boolean } => {
    if (!min && !max) {
      return { text: t("enterpriseCompanydetail.negotiate", "Thỏa thuận"), hasIcon: false };
    }
    const fmt = (num: number): string => num.toLocaleString("en-US");
    if (min && max) return { text: `${fmt(min)} - ${fmt(max)} VND`, hasIcon: false };
    if (min) return { text: `${fmt(min)}+ VND`, hasIcon: false };
    if (max) return { text: `${t("uiLabels.maximum")} ${fmt(max)} VND`, hasIcon: false };
    return { text: t("enterpriseCompanydetail.negotiate", "Thỏa thuận"), hasIcon: false };
  };

  const salaryInfo = formatSalaryVND(job.salaryMin, job.salaryMax);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#0047AB]/30 sm:p-6 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-[#66B2FF]/30">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {job.level && (
              <Badge
                variant="outline"
                className={levelColors[job.level] || "border-slate-200 bg-slate-50 text-slate-700"}>
                {levelLabels[job.level] || job.level}
              </Badge>
            )}
            {job.status && (
              <Badge
                variant="outline"
                className="border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                {job.status}
              </Badge>
            )}
          </div>

          <h3 className="text-xl leading-tight font-semibold tracking-[-0.01em] text-slate-950 dark:text-white">
            {job.title}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1 font-medium text-[#0047AB] dark:text-[#66B2FF]">
              {salaryInfo.hasIcon && <DollarSign className="h-4 w-4" />}
              {salaryInfo.text}
            </span>
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
            )}
            {job.workType && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {job.workType}
              </span>
            )}
            {job.appliedCount !== undefined && job.appliedCount > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {job.appliedCount} {t("common.candidate")}
              </span>
            )}
          </div>

          {job.description && (
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {job.description}
            </p>
          )}

          {job.skills && job.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                  +{job.skills.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="shrink-0 border-[#0047AB]/30 text-[#0047AB] hover:bg-[#0047AB]/10 dark:border-[#66B2FF]/30 dark:text-[#66B2FF]"
          asChild>
          <Link to={`/enterprise/job/${job.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            {t("common.seeDetails")}
          </Link>
        </Button>
      </div>
    </article>
  );
}
