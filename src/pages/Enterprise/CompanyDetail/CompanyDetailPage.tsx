import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { companyManager, type Company, type JobDescription } from "@/services/company.manager";
import { motion } from "framer-motion";
import { BriefcaseBusiness, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { CompanySpotlightHeader, JobDetailPane, MasterJobCard } from "./components";

export function CompanyDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError(t("enterpriseCompanydetail.invalidCompanyId"));
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [companyResult, jobsResult] = await Promise.all([
          companyManager.getById(id),
          companyManager.getJobs(id),
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
        console.error("[CompanyDetailPage] Fetch error:", err);
        setError(t("common.unableToLoadCompanyInformation"));
      }
      setIsLoading(false);
    };
    fetchData();
  }, [id, t]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (job.status !== "OPEN") return false;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        job.title?.toLowerCase().includes(q) ||
        job.description?.toLowerCase().includes(q) ||
        job.skills?.some((s) => s.toLowerCase().includes(q));

      const matchesLevel = !selectedLevel || job.level === selectedLevel;

      return matchesSearch && matchesLevel;
    });
  }, [jobs, searchQuery, selectedLevel]);

  const activeSelectedJob = useMemo(() => {
    return filteredJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || jobs[0] || null;
  }, [filteredJobs, selectedJobId, jobs]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HomepageHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("common.loadingCompanyInformation")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <HomepageHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
              {t("enterpriseCompanydetail.noCompanyFound")}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {error || t("enterpriseCompanydetail.theCompanyYouAreLooking")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const levels = ["INTERN", "FRESHER", "JUNIOR", "MIDDLE"] as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <HomepageHeader />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto max-w-7xl px-4 pt-24 pb-12 sm:px-6 lg:px-8">
        {/* Top Company Spotlight Header */}
        <CompanySpotlightHeader
          company={company}
          jobs={jobs}
          onSelectJob={(jobId) => setSelectedJobId(jobId)}
        />

        {/* ITviec Split Master-Detail Jobs Section */}
        <section id="open-positions" className="w-full scroll-mt-24">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold tracking-wider text-[#0047AB] uppercase dark:text-[#66B2FF]">
                <BriefcaseBusiness className="h-4 w-4" />
                <span>{t("enterpriseCompanydetail.openPositions")}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl dark:text-white">
                {t("enterpriseCompanydetail.jobOpportunitiesAt")} {company.name}
              </h2>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-[#0047AB]/10 px-3.5 py-1.5 text-xs font-bold text-[#0047AB] dark:bg-[#0047AB]/30 dark:text-[#66B2FF]">
              {filteredJobs.length} {t("enterpriseCompanydetail.openRoles")}
            </Badge>
          </div>

          {/* Clean Filter Controls */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t("enterpriseCompanydetail.searchOpenPositions")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 pl-9"
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

            {/* Level Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                Level:
              </span>
              <Button
                variant={selectedLevel === null ? "default" : "outline"}
                size="sm"
                className="h-8 rounded-full text-xs"
                onClick={() => setSelectedLevel(null)}>
                All
              </Button>
              {levels.map((lvl) => (
                <Button
                  key={lvl}
                  variant={selectedLevel === lvl ? "default" : "outline"}
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  onClick={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)}>
                  {lvl}
                </Button>
              ))}
            </div>
          </div>

          {/* Master-Detail Split Container */}
          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <Search className="mb-3 h-8 w-8 text-slate-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("enterpriseCompanydetail.noSuitableLocationFound")}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t("enterpriseCompanydetail.tryAdjustingYourSearchFilters")}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row">
              {/* Master Column (Left - Compact Content-fit Width 280px-300px) */}
              <div className="w-full shrink-0 space-y-3 lg:w-[280px] xl:w-[300px]">
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

              {/* Detail Column (Right - Flexible Expanded Area) */}
              <div className="w-full min-w-0 flex-1">
                {activeSelectedJob ? (
                  <JobDetailPane job={activeSelectedJob} company={company} />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    {t("enterpriseCompanydetail.selectJobToViewDetails")}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </motion.main>

      <Footer />
    </div>
  );
}
