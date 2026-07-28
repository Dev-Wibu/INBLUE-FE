import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companyManager, type JobDescription } from "@/services/company.manager";
import {
  ArrowRight,
  Briefcase,
  Building2,
  DollarSign,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function JobSearchSection() {
  const { t, i18n } = useTranslation();
  const localeSuffixKey = (() => {
    const lang = (i18n.language || "vi").split("-")[0];
    if (lang === "en") return "compHomepageRedesign.salaryUnitSuffixEn";
    if (lang === "ja") return "compHomepageRedesign.salaryUnitSuffixJa";
    return "compHomepageRedesign.salaryUnitSuffixVi";
  })();
  const salaryUnitSuffix = t(localeSuffixKey);
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const params: {
        titleKeyword?: string;
        status?: "OPEN";
        level?: "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE";
        salaryMin?: number;
        salaryMax?: number;
      } = { status: "OPEN" };
      if (keyword.trim()) params.titleKeyword = keyword.trim();
      if (level !== "all")
        params.level = level.toUpperCase() as "INTERN" | "FRESHER" | "JUNIOR" | "MIDDLE";
      const parsedMin = parseInt(salaryMin.replace(/[^\d]/g, ""), 10);
      const parsedMax = parseInt(salaryMax.replace(/[^\d]/g, ""), 10);
      if (!isNaN(parsedMin) && parsedMin > 0) params.salaryMin = parsedMin * 1000000;
      if (!isNaN(parsedMax) && parsedMax > 0) params.salaryMax = parsedMax * 1000000;
      const result = await companyManager.searchJobs(params);
      setJobs(result.success && result.data ? result.data : []);
    } catch {
      setJobs([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const formatSalary = (min?: number, max?: number, currency?: string) => {
    const fmt = (num: number) =>
      num >= 1000000 ? `${(num / 1000000).toFixed(0)}M` : `${(num / 1000).toFixed(0)}K`;
    if (min && max) return `${fmt(min)} - ${fmt(max)} ${currency || "VND"}`;
    if (min) return t("common.fromVar0Var1", { var_0: fmt(min), var_1: currency || "VND" });
    if (max) return t("common.toVar0Var1", { var_0: fmt(max), var_1: currency || "VND" });
    return t("common.agree");
  };

  const getLevelBadgeColor = (jobLevel?: string) => {
    switch (jobLevel?.toUpperCase()) {
      case "INTERN":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
      case "FRESHER":
        return "bg-[#DCEEFF] text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]";
      case "JUNIOR":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300";
      case "MIDDLE":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <section className="relative bg-white py-16 dark:bg-slate-950" id="job-search">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 max-w-2xl">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
              <SlidersHorizontal className="h-4 w-4" />
              {t("landingRefactor.jobEyebrow")}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-balance text-slate-950 sm:text-4xl dark:text-white">
              {t("compHomepageRedesign.searchForCareerOpportunities")}
            </h2>
          </div>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("compHomepageRedesign.exploreVacanciesThatFitYour")}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_160px_150px_150px_auto] lg:items-end">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder={t("compHomepageRedesign.searchForPositionsSkillsOr")}
                className="h-11 pl-10"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t("general.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("general.all")}</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="fresher">Fresher</SelectItem>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="middle">Middle</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="text"
              inputMode="numeric"
              placeholder={`${t("adminCompanymanagement.minimumWage")} (${salaryUnitSuffix})`}
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value.replace(/[^\d]/g, ""))}
              className="h-11"
            />
            <Input
              type="text"
              inputMode="numeric"
              placeholder={`${t("adminCompanymanagement.maximumSalary")} (${salaryUnitSuffix})`}
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value.replace(/[^\d]/g, ""))}
              className="h-11"
            />

            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="h-11 rounded-xl bg-[#0047AB] px-6 font-semibold text-white transition-colors duration-200 hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#7AB8FF]">
              <Search className={`mr-2 h-4 w-4 ${isSearching ? "animate-spin" : ""}`} />
              {isSearching ? t("compHomepageRedesign.lookingFor") : t("general.search")}
            </Button>
          </div>
        </div>

        {hasSearched && (
          <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {isSearching
                  ? t("common.searching")
                  : `${t("common.find")} ${jobs.length} ${t("common.location")}`}
              </p>
              {jobs.length > 0 && (
                <Button
                  asChild
                  variant="ghost"
                  className="group text-[#0047AB] dark:text-[#66B2FF]">
                  <Link to="/enterprise/companies">
                    {t("common.seeAll")}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </div>

            {!isSearching && jobs.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {jobs.slice(0, 9).map((job) => (
                  <Link key={job.id} to={`/enterprise/job/${job.id}`} className="group block">
                    <article className="h-full rounded-2xl border border-slate-200 bg-white transition-colors duration-200 hover:border-[#0047AB]/40 dark:border-slate-800 dark:bg-slate-900">
                      <div className="p-5">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-bold text-slate-950 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
                              {job.title}
                            </h3>
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                              {job.companyName || t("common.company")}
                            </p>
                          </div>
                        </div>
                        <div className="mb-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-slate-400" />
                            {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {job.location || t("common.hoChiMinh")}
                          </p>
                          <p className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {job.workType || t("compHomepageRedesign.fullTime")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={getLevelBadgeColor(job.level)}>
                            {job.level || t("common.notDetermined")}
                          </Badge>
                          {job.skills?.slice(0, 2).map((skill) => (
                            <Badge key={skill} variant="outline" className="dark:border-slate-700">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {!isSearching && jobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-900/60">
                <Search className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {t("compHomepageRedesign.noLocationsFound")}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {t("compHomepageRedesign.tryAdjustingYourSearchKeywords")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
