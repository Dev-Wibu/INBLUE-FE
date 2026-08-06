import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatting";
import type { Company, JobDescription } from "@/services/company.manager";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileText,
  Heart,
  MapPin,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { InterviewProcessTimeline } from "./InterviewProcessTimeline";

interface JobDetailPaneProps {
  job: JobDescription;
  company: Company;
}

export function JobDetailPane({ job, company }: JobDetailPaneProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);

  const salaryText =
    job.salaryMin || job.salaryMax
      ? `${job.salaryMin ? job.salaryMin.toLocaleString() : 0} - ${
          job.salaryMax ? job.salaryMax.toLocaleString() : "Max"
        } ${job.currency || "VND"}`
      : t("enterpriseCompanydetail.negotiate");

  const companyInitials =
    company.name
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TN";

  const handleStartPractice = () => {
    navigate("/user/ai-interview/setup");
  };

  const hasRounds = Array.isArray(job.rounds) && job.rounds.length > 0;

  return (
    <div className="sticky top-20 flex h-[calc(100vh-96px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Scrollable Container containing Left Detail Content + Right Timeline */}
      <div className="scrollbar-thin flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Main Job Content (Image 2 style) */}
          <div className={hasRounds ? "space-y-5 xl:col-span-8" : "space-y-5 xl:col-span-12"}>
            {/* Header Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              {/* Top Navigation & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>{t("common.back", "Back")}</span>
                </button>

                <div className="flex items-center gap-2">
                  {job.level && (
                    <Badge
                      variant="secondary"
                      className="bg-indigo-50 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      {job.level}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {t("enterpriseCompanydetail.currentlyRecruiting", "Currently recruiting")}
                  </Badge>
                </div>
              </div>

              {/* Company Logo, Job Title & Price Box */}
              <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                    {company.logoUrl ? (
                      <Avatar className="h-full w-full rounded-lg">
                        <AvatarImage
                          src={company.logoUrl}
                          alt={company.name}
                          className="object-contain"
                        />
                        <AvatarFallback className="rounded-lg bg-transparent text-xl font-bold text-indigo-600 dark:text-indigo-400">
                          {companyInitials}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-950 sm:text-2xl dark:text-white">
                      {job.title}
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {company.name}
                    </p>
                  </div>
                </div>

                {/* Price Box + Primary Action Button */}
                <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <div className="text-right">
                    <span className="block text-[10px] font-medium text-slate-400 uppercase">
                      Fee / Fee practice
                    </span>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      {job.price ? `${job.price.toLocaleString()} VND` : "2,000 VND"}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={handleStartPractice}
                    className="group rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {t("enterpriseCompanydetail.payPractice", "Pay & Practice")}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsSaved(!isSaved)}
                    className="h-9 w-9 rounded-xl border-slate-200 dark:border-slate-700">
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Info Chips (Salary, Location, HSD) */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-3.5 w-3.5" />
                  {salaryText}
                </span>

                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{job.location}</span>
                  </span>
                )}

                {job.deadlineAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>HSD: {formatDate(job.deadlineAt)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Main Sections: Job description, Candidate requirements, Welfare */}
            <div className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              {/* Job description */}
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t("enterpriseCompanydetail.jobDescription", "Job description")}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                  {job.description || t("enterpriseCompanydetail.noCompanyDescription")}
                </p>
              </div>

              {/* Candidate requirements */}
              {job.requirements && (
                <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>
                      {t("enterpriseCompanydetail.jobRequirements", "Candidate requirements")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                    {job.requirements}
                  </p>
                </div>
              )}

              {/* Welfare / Benefits */}
              {job.benefits && (
                <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>{t("enterpriseCompanydetail.jobBenefits", "Welfare")}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                    {job.benefits}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sub-column: Vertical Interview Process Timeline (Image 2 style) */}
          {hasRounds && (
            <div className="xl:col-span-4">
              <InterviewProcessTimeline rounds={job.rounds} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
