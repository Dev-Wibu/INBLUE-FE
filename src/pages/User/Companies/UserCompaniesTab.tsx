import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { companyManager, type Company } from "@/services/company.manager";
import { BriefcaseBusiness, Building2, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

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

export function UserCompaniesTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("ALL");

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const result = await companyManager.getAll();
        if (result.success && result.data) {
          const list = normalizeCompanies(result.data).filter(
            (c) => !c.isDeleted && c.status === "ACTIVE"
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
    return companies.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.location?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesIndustry =
        selectedIndustry === "ALL" || c.industry?.toLowerCase() === selectedIndustry.toLowerCase();

      return matchesSearch && matchesIndustry;
    });
  }, [companies, searchQuery, selectedIndustry]);

  const totalOpenRoles = useMemo(() => {
    return companies.reduce((acc, c) => acc + getOpenRoleCount(c), 0);
  }, [companies]);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("common.companyList", "Danh sách công ty đối tác")}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t(
              "userCompanies.headerSubtitle",
              "Khám phá các doanh nghiệp hàng đầu, môi trường làm việc và các vị trí tuyển dụng mở"
            )}
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/80 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>{companies.length} Công ty</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <BriefcaseBusiness className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{totalOpenRoles} Vị trí tuyển</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t(
                "userCompanies.searchPlaceholder",
                "Tìm tên công ty, địa điểm, lĩnh vực..."
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-slate-200 bg-slate-50 pl-10 text-xs font-medium focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Industry Filter Pills */}
        {industries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-1 dark:border-slate-800">
            <span className="mr-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              Lĩnh vực:
            </span>
            <button
              onClick={() => setSelectedIndustry("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                selectedIndustry === "ALL"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}>
              Tất cả
            </button>
            {industries.map((ind) => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(ind)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedIndustry.toLowerCase() === ind.toLowerCase()
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}>
                {ind}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            Không tìm thấy công ty phù hợp
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => {
            const openRoles = getOpenRoleCount(company);
            const logoUrl = company.logoUrl || null;
            const initials = getCompanyInitials(company.name);

            return (
              <div
                key={company.id}
                onClick={() => navigate(`/enterprise/company/${company.id}`)}
                className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-base font-bold text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-indigo-400">
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
                    {openRoles > 0 ? (
                      <Badge className="border-0 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                        {openRoles} tuyển dụng
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] font-medium text-slate-500">
                        Chưa mở tuyển
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="line-clamp-1 text-base font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {company.name}
                    </h3>
                    {company.industry && (
                      <p className="mt-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {company.industry}
                      </p>
                    )}
                    {company.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {company.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs dark:border-slate-800">
                  {company.location ? (
                    <div className="flex max-w-[150px] items-center gap-1 truncate font-medium text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{company.location}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">TP. Hồ Chí Minh</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/user?tab=jobSearch&search=${encodeURIComponent(company.name || "")}`
                      );
                    }}>
                    Xem việc làm
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
