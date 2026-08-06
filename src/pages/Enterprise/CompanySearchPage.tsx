import { HomepageHeader } from "@/components/homepage-redesign";
import { Footer } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { companyManager, type Company, type JobDescription } from "@/services/company.manager";
import type { TFunction } from "i18next";
import { BriefcaseBusiness, Building2, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

const ALL_FILTER = "ALL";

function getOpenRoleCount(company: Company) {
  return (
    company.jobDescriptions?.filter(
      (job) => !job.isDeleted && (!job.status || job.status === "OPEN")
    ).length || 0
  );
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

function uniqueValues(companies: Company[], key: "industry" | "location") {
  return Array.from(
    new Set(companies.map((company) => company[key]?.trim()).filter(Boolean) as string[])
  ).slice(0, 8);
}

function CompanyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-7 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="mb-3 h-6 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="mb-6 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

interface EmptyPanelProps {
  query: string;
  isError?: boolean;
  onClear: () => void;
  t: TFunction;
}

function EmptyPanel({ query, isError, onClear, t }: EmptyPanelProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
        <Building2 className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
        {isError
          ? t("enterpriseCompanysearchpage.unableToLoadCompanies")
          : t("enterpriseCompanysearchpage.noMatchedCompanies")}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {isError
          ? t("enterpriseCompanysearchpage.unableToLoadCompaniesDescription")
          : query
            ? t("enterpriseCompanysearchpage.emptySearchDescription", { query })
            : t("enterpriseCompanysearchpage.emptyFilteredDescription")}
      </p>
      <Button
        variant="outline"
        onClick={onClear}
        className="mt-6 border-[#0047AB]/30 text-[#0047AB] hover:bg-[#0047AB]/10 dark:border-[#66B2FF]/30 dark:text-[#66B2FF]">
        {t("enterpriseCompanysearchpage.viewAllCompanies")}
      </Button>
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  t: TFunction;
}

function CompanyCard({ company, t }: CompanyCardProps) {
  const openRoleCount = getOpenRoleCount(company);

  return (
    <Link
      to={`/enterprise/company/${company.id}`}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      {/* Header with Radial SVG Grid Pattern + Center Logo Box */}
      <div className="relative flex h-36 w-full items-center justify-center border-b border-slate-100 bg-gradient-to-b from-slate-50/90 via-slate-50/50 to-white px-4 dark:border-slate-800/80 dark:from-slate-800/40 dark:via-slate-800/20 dark:to-slate-900">
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-slate-200/50 dark:stroke-slate-700/30"
          fill="none">
          <defs>
            <pattern
              id={`grid-pattern-search-${company.id}`}
              width="16"
              height="16"
              patternUnits="userSpaceOnUse">
              <path d="M.5 16V.5H16" />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            strokeWidth="0"
            fill={`url(#grid-pattern-search-${company.id})`}
          />
        </svg>

        <div className="relative z-1 flex h-20 w-28 items-center justify-center rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:border-slate-700 dark:bg-slate-800">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name || t("common.company")}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <Building2 className="h-8 w-8 text-[#0047AB] dark:text-[#66B2FF]" />
          )}
        </div>
      </div>

      {/* Card Content / Company Name & Description */}
      <div className="flex flex-1 flex-col items-center p-5 text-center">
        <h3 className="line-clamp-1 text-base font-bold text-slate-950 transition-colors group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
          {company.name}
        </h3>

        {company.description && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {company.description}
          </p>
        )}
      </div>

      {/* Card Footer: Location & Open Jobs Count */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
        {company.location ? (
          <div className="flex max-w-[55%] items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{company.location}</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>
            {t("enterpriseCompanysearchpage.openPositionsCount", { count: openRoleCount })}
          </span>
        </div>
      </div>
    </Link>
  );
}
interface FeaturedCompanyDeskProps {
  companies: Company[];
  isLoading: boolean;
  totalOpenRoles: number;
  t: TFunction;
}

function FeaturedCompanyDesk({
  companies,
  isLoading,
  totalOpenRoles,
  t,
}: FeaturedCompanyDeskProps) {
  const featuredCompanies = companies
    .slice()
    .sort((a, b) => getOpenRoleCount(b) - getOpenRoleCount(a))
    .slice(0, 3);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              {t("enterpriseCompanysearchpage.featuredDeskTitle")}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t("enterpriseCompanysearchpage.featuredDeskDescription")}
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              {totalOpenRoles}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t("enterpriseCompanysearchpage.openPositions")}
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-4">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}

          {!isLoading &&
            featuredCompanies.map((company) => (
              <FeaturedCompanyRow key={company.id} company={company} t={t} />
            ))}

          {!isLoading && featuredCompanies.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
              {t("enterpriseCompanysearchpage.featuredDeskEmpty")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FeaturedCompanyRowProps {
  company: Company;
  t: TFunction;
}

function FeaturedCompanyRow({ company, t }: FeaturedCompanyRowProps) {
  const initials = getCompanyInitials(company.name);
  const openRoleCount = getOpenRoleCount(company);
  const metadata = [company.industry, company.location].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/enterprise/company/${company.id}`}
      className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-900 dark:focus-visible:bg-slate-900">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-[#0047AB] dark:border-slate-700 dark:bg-slate-900 dark:text-[#66B2FF]">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt={company.name} className="h-8 w-8 object-contain" />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-sm font-semibold text-slate-950 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
            {company.name}
          </div>
        </div>
        {metadata && (
          <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{metadata}</div>
        )}
      </div>

      <div className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {t("enterpriseCompanysearchpage.openPositionsCount", { count: openRoleCount })}
      </div>
    </Link>
  );
}

export function CompanySearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [industryFilter, setIndustryFilter] = useState(ALL_FILTER);
  const [locationFilter, setLocationFilter] = useState(ALL_FILTER);
  const [openRolesOnly, setOpenRolesOnly] = useState(false);

  useEffect(() => {
    setSearchInput(query);
    searchCompanies(query);
  }, [query]);

  const searchCompanies = async (searchTerm: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setHasError(false);
    try {
      const result = await companyManager.getAll();
      if (result.success && result.data) {
        let companyList: Company[] = [];
        const data = result.data;
        if (Array.isArray(data)) {
          companyList = data;
        } else if (data && "content" in data) {
          companyList = (data as { content: Company[] }).content;
        }

        companyList = companyList.filter(
          (company) => !company.isDeleted && company.status === "ACTIVE"
        );

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          companyList = companyList.filter(
            (company) =>
              company.name?.toLowerCase().includes(term) ||
              company.description?.toLowerCase().includes(term) ||
              company.industry?.toLowerCase().includes(term) ||
              company.location?.toLowerCase().includes(term)
          );
        }

        // Fetch jobs for each company to extract real skill tags
        companyList = await Promise.all(
          companyList.map(async (c) => {
            if (c.id && (!c.jobDescriptions || c.jobDescriptions.length === 0)) {
              try {
                const jobsRes = await companyManager.getJobs(c.id);
                if (jobsRes.success && jobsRes.data) {
                  const jobs = Array.isArray(jobsRes.data)
                    ? jobsRes.data
                    : (jobsRes.data as { data?: JobDescription[] }).data || [];
                  return { ...c, jobDescriptions: jobs };
                }
              } catch (err) {
                console.error("[CompanySearchPage] Error fetching jobs for company", c.id, err);
              }
            }
            return c;
          })
        );

        setCompanies(companyList);
      } else {
        setHasError(true);
        setCompanies([]);
      }
    } catch (err) {
      console.error("[CompanySearchPage] Search error:", err);
      setHasError(true);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const industries = useMemo(() => uniqueValues(companies, "industry"), [companies]);
  const locations = useMemo(() => uniqueValues(companies, "location"), [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesIndustry = industryFilter === ALL_FILTER || company.industry === industryFilter;
      const matchesLocation = locationFilter === ALL_FILTER || company.location === locationFilter;
      const matchesOpenRoles = !openRolesOnly || getOpenRoleCount(company) > 0;
      return matchesIndustry && matchesLocation && matchesOpenRoles;
    });
  }, [companies, industryFilter, locationFilter, openRolesOnly]);

  const totalOpenRoles = useMemo(
    () => companies.reduce((sum, company) => sum + getOpenRoleCount(company), 0),
    [companies]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const nextQuery = searchInput.trim();
    setSearchParams(nextQuery ? { q: nextQuery } : {});
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchParams({});
    setIndustryFilter(ALL_FILTER);
    setLocationFilter(ALL_FILTER);
    setOpenRolesOnly(false);
  };

  const hasActiveFilters =
    query || industryFilter !== ALL_FILTER || locationFilter !== ALL_FILTER || openRolesOnly;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <HomepageHeader />

      <main className="flex-1 pt-16">
        <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="lg:py-4">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#0047AB]/20 bg-[#0047AB]/5 px-3 py-1 text-xs font-semibold text-[#0047AB] dark:border-[#66B2FF]/25 dark:bg-[#66B2FF]/10 dark:text-[#66B2FF]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("enterpriseCompanysearchpage.trustedEnterprisePartners")}
                </div>
                <h1 className="max-w-2xl text-4xl leading-[1.02] font-bold tracking-[-0.025em] text-slate-950 sm:text-5xl dark:text-white">
                  {t("enterpriseCompanysearchpage.discoverTrustedCompanies")}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
                  {t("enterpriseCompanysearchpage.heroDescription")}
                </p>

                <form onSubmit={handleSearch} className="mt-8 max-w-xl">
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm sm:flex-row dark:border-slate-800 dark:bg-slate-900">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        placeholder={t("enterpriseCompanysearchpage.timKiemTheoTenCongTyNganhNghe")}
                        className="h-12 border-0 bg-transparent pr-4 pl-12 shadow-none focus-visible:ring-0"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="h-12 bg-[#0047AB] px-6 hover:bg-[#003f98]">
                      {t("general.search")}
                    </Button>
                  </div>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>
                    {companies.length} {t("enterpriseCompanysearchpage.activeCompanies")}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>
                    {totalOpenRoles} {t("enterpriseCompanysearchpage.openPositions")}
                  </span>
                </div>
              </div>

              <FeaturedCompanyDesk
                companies={companies}
                isLoading={isLoading}
                totalOpenRoles={totalOpenRoles}
                t={t}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="sticky top-16 z-20 mb-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                  {isLoading
                    ? t("enterpriseCompanysearchpage.loadingCompanies")
                    : t("enterpriseCompanysearchpage.companiesMatched", {
                        count: filteredCompanies.length,
                      })}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {query
                    ? t("enterpriseCompanysearchpage.filteredByQuery", { query })
                    : t("enterpriseCompanysearchpage.currentlyRecruitingPartners")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FilterButton
                  active={industryFilter === ALL_FILTER}
                  onClick={() => setIndustryFilter(ALL_FILTER)}>
                  {t("enterpriseCompanysearchpage.allIndustries")}
                </FilterButton>
                {industries.slice(0, 4).map((industry) => (
                  <FilterButton
                    key={industry}
                    active={industryFilter === industry}
                    onClick={() => setIndustryFilter(industry)}>
                    {industry}
                  </FilterButton>
                ))}
                {locations.length > 0 && (
                  <select
                    value={locationFilter}
                    onChange={(event) => setLocationFilter(event.target.value)}
                    className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors outline-none hover:border-[#0047AB]/40 focus:border-[#0047AB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <option value={ALL_FILTER}>
                      {t("enterpriseCompanysearchpage.allLocations")}
                    </option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                )}
                <FilterButton active={openRolesOnly} onClick={() => setOpenRolesOnly((v) => !v)}>
                  <BriefcaseBusiness className="h-3.5 w-3.5" />
                  {t("enterpriseCompanysearchpage.hasJobDescriptions")}
                </FilterButton>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-9 rounded-full px-3 text-xs text-slate-500 hover:text-[#0047AB]">
                    <X className="mr-1 h-3.5 w-3.5" />
                    {t("enterpriseCompanysearchpage.clearFilters")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <CompanyCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!isLoading && (hasError || (hasSearched && filteredCompanies.length === 0)) && (
            <EmptyPanel query={query} isError={hasError} onClear={handleClear} t={t} />
          )}

          {!isLoading && !hasError && filteredCompanies.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} t={t} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

interface FilterButtonProps {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

function FilterButton({ active, children, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
        active
          ? "border-[#0047AB] bg-[#0047AB] text-white dark:border-[#66B2FF] dark:bg-[#66B2FF] dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-600 hover:border-[#0047AB]/40 hover:text-[#0047AB] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-[#66B2FF]/40 dark:hover:text-[#66B2FF]"
      )}>
      {children}
    </button>
  );
}
