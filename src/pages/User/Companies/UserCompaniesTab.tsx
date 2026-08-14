import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { companyManager, type Company, type JobDescription } from "@/services/company.manager";
import { BriefcaseBusiness, Building2, MapPin, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { CompanyDetailContainer } from "./CompanyDetailContainer";

function getOpenRoleCount(company: Company) {
  return (
    company.jobDescriptions?.filter((job) => !job.isDeleted && job.status === "OPEN").length || 0
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

function normalizeCompanies(data: unknown): Company[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "content" in data) {
    const content = (data as { content?: unknown }).content;
    if (Array.isArray(content)) return content;
  }
  return [];
}

export function CompanyCard({
  company,
  onClick,
  onExplore,
  t,
}: {
  company: Company;
  onClick: () => void;
  onExplore: (_e: React.MouseEvent) => void;
  t: (_key: string, _optionsOrDefault?: string | Record<string, unknown>) => string;
}) {
  const openRoles = getOpenRoleCount(company);
  const logoUrl = company.logoUrl || null;
  const initials = getCompanyInitials(company.name);

  // Extract skills from company's job descriptions
  const companySkills = useMemo(() => {
    const set = new Set<string>();
    company.jobDescriptions?.forEach((j) => {
      j.skills?.forEach((s) => set.add(s));
    });
    return Array.from(set).slice(0, 3);
  }, [company]);

  return (
    <div
      onClick={onClick}
      className="group relative flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200 bg-white p-5 transition-all hover:border-indigo-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
      {/* Upper content container */}
      <div className="flex flex-col">
        {/* Header section — identical to JobCard layout */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 text-xl font-bold text-indigo-600 dark:border-slate-800/80 dark:bg-[#0F172A] dark:text-indigo-400">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={company.name || "Company"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex h-[48px] items-start">
              <h3 className="line-clamp-2 text-[16.5px] leading-tight font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                {company.name || t("common.unknownCompany", "Công ty ẩn danh")}
              </h3>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-[13.5px] text-slate-600 dark:text-slate-300">
                <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="max-w-[130px] truncate">
                  {company.industry || t("common.enterprise", "Doanh nghiệp")}
                </span>
              </div>

              <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />

              {openRoles > 0 ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {t("enterpriseJobsearchpage.hiring", "Đang tuyển")}
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {t("enterpriseJobsearchpage.closed", "Đóng")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="my-5 h-px w-full bg-slate-100 dark:bg-slate-800/60" />

        {/* Details (Description & Tech Stack) */}
        <div className="flex flex-col gap-3">
          <div className="flex min-h-[40px] items-start">
            <p className="line-clamp-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-300">
              {company.description ||
                t("userCompanies.noDescription", "Chưa có mô tả giới thiệu chi tiết.")}
            </p>
          </div>

          <div className="mt-1 flex h-[24px] items-center justify-between">
            <div className="flex min-w-0 items-center gap-1.5 text-[14px] font-medium text-slate-500 dark:text-slate-400">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="max-w-[150px] truncate">
                {company.location || t("common.defaultLocation", "TP. Hồ Chí Minh")}
              </span>
            </div>

            {companySkills.length > 0 && (
              <div className="flex shrink-0 items-center gap-1">
                {companySkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer (Action Button identical to JobCard) */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[14px] font-bold text-indigo-600 dark:text-indigo-400">
          <BriefcaseBusiness className="h-[18px] w-[18px]" />
          {openRoles > 0
            ? t("userCompanies.openRolesCount", {
                count: openRoles,
              })
            : t("common.overview", "Tổng quan")}
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onExplore(e);
          }}
          className="h-11 shrink-0 rounded-xl border border-transparent bg-indigo-600 px-8 text-[15px] font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500">
          {t("userCompanies.exploreNow", "Khám phá")}
        </Button>
      </div>
    </div>
  );
}

export function UserCompaniesTab() {
  const { t: i18nT } = useTranslation();
  const t: (_key: string, _optionsOrDefault?: string | Record<string, unknown>) => string =
    useCallback(
      (key, optionsOrDefault) => {
        if (typeof optionsOrDefault === "string") {
          return i18nT(key, optionsOrDefault);
        }
        if (optionsOrDefault && typeof optionsOrDefault === "object") {
          return i18nT(key, optionsOrDefault);
        }
        return i18nT(key);
      },
      [i18nT]
    );
  const [searchParams, setSearchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("ALL");

  const companyId = searchParams.get("companyId");

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const result = await companyManager.getAll();
        if (result.success && result.data) {
          let list = normalizeCompanies(result.data).filter(
            (c) => !c.isDeleted && c.status === "ACTIVE"
          );

          list = await Promise.all(
            list.map(async (c) => {
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
                  console.error("[UserCompaniesTab] Error fetching jobs for company", c.id, err);
                }
              }
              return c;
            })
          );

          setCompanies(list);
        }
      } catch (err) {
        console.error("[UserCompaniesTab] Error fetching companies:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.industry?.trim()) set.add(c.industry.trim());
    });
    return Array.from(set).slice(0, 6);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter((c) => {
        const matchesSearch =
          !searchQuery.trim() ||
          c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.location?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesIndustry =
          selectedIndustry === "ALL" ||
          c.industry?.toLowerCase() === selectedIndustry.toLowerCase();

        return matchesSearch && matchesIndustry;
      })
      .sort((a, b) => getOpenRoleCount(b) - getOpenRoleCount(a));
  }, [companies, searchQuery, selectedIndustry]);

  const totalOpenRoles = useMemo(() => {
    return companies.reduce((acc, c) => acc + getOpenRoleCount(c), 0);
  }, [companies]);

  const handleCompanyClick = (id: number | undefined) => {
    if (id == null) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set("companyId", String(id));
    setSearchParams(newParams);
  };

  const handleCloseDetail = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("companyId");
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  /* ─── In-Dashboard Company Detail View ─── */
  if (companyId) {
    return (
      <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-transparent">
        <CompanyDetailContainer companyId={companyId} onClose={handleCloseDetail} />
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-transparent">
      {/* Top Action Bar (Hero Style — 100% Identical Layout to JobSearchTab) */}
      <div className="shrink-0 px-5 py-6 md:px-8">
        <div className="w-full rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
            {/* Title & Subtitle */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t("userCompanies.heroTitle", "Khám phá Công ty đối tác")}
              </h2>
              <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
                {t(
                  "userCompanies.heroSubtitle",
                  "Khám phá môi trường làm việc thực tế, văn hóa doanh nghiệp và cơ hội nghề nghiệp"
                )}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-5 sm:gap-6">
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {companies.length}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("jobSearch.companies", "Công ty")}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {totalOpenRoles}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("jobSearch.openPositions", "Vị trí mở")}
                </span>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex min-w-[70px] flex-col items-center justify-center text-center">
                <span className="text-2xl leading-none font-bold text-indigo-600 dark:text-[#66B2FF]">
                  {industries.length || 1}
                </span>
                <span className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {t("userCompanies.industriesLabel", "Lĩnh vực")}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  "userCompanies.searchPlaceholder",
                  "Tìm theo tên công ty, địa điểm hoặc lĩnh vực..."
                )}
                className="h-[46px] w-full rounded-xl border border-slate-200/90 bg-slate-50/70 px-4 text-[14.5px] text-slate-900 shadow-2xs transition-all placeholder:text-slate-400 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              className="h-[46px] shrink-0 rounded-[10px] border border-slate-300 bg-transparent px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <Search className="mr-2 h-[18px] w-[18px]" />
              {t("general.search", "Tìm kiếm")}
            </Button>
          </form>

          {/* Filters */}
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-[13px] font-semibold text-slate-500">
                {t("userCompanies.industryLabel", "Lĩnh vực:")}
              </span>
              <button
                key="ALL"
                type="button"
                onClick={() => setSelectedIndustry("ALL")}
                className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                  selectedIndustry === "ALL"
                    ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-600 dark:bg-indigo-600"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}>
                {t("userCompanies.allIndustries", "Tất cả")}
              </button>
              {industries.map((ind) => {
                const isActive = selectedIndustry.toLowerCase() === ind.toLowerCase();
                return (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => setSelectedIndustry(ind)}
                    className={`rounded-full border px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                      isActive
                        ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-600 dark:bg-indigo-600"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    }`}>
                    {ind}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Company Grid List — 100% Identical Grid Ratio to JobSearchTab */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {(searchQuery || selectedIndustry !== "ALL") && (
          <div className="mb-5">
            <span className="text-xs text-slate-500 dark:text-[#888888]">
              {t("common.showing", "Hiển thị")}{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {filteredCompanies.length}
              </strong>{" "}
              {t("common.results", "kết quả")}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[20px]" />
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="mx-6 my-10 flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {t("enterpriseCompanysearchpage.noCompaniesFound")}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {t("enterpriseCompanysearchpage.emptyFilteredDescription")}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedIndustry("ALL");
              }}
              className="mt-2 h-8 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
              {t("enterpriseCompanysearchpage.viewAllCompanies")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => handleCompanyClick(company.id)}
                onExplore={(e) => {
                  e.stopPropagation();
                  handleCompanyClick(company.id);
                }}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
