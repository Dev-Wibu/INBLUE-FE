import { Button } from "@/components/ui/button";
import { companyManager, type Company } from "@/services/company.manager";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Cpu,
  Landmark,
  Loader2,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function getIconForDescription(description?: string) {
  const desc = description?.toLowerCase() || "";
  if (desc.includes("security")) return ShieldCheck;
  if (desc.includes("fintech") || desc.includes("finance")) return Landmark;
  if (
    desc.includes("ai") ||
    desc.includes("data") ||
    desc.includes("cloud") ||
    desc.includes("saas")
  )
    return Cpu;
  return Building2;
}

function normalizeCompanies(data: unknown): Company[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "content" in data) {
    const content = (data as { content?: unknown }).content;
    if (Array.isArray(content)) return content;
  }
  return [];
}

const practiceCompanyPreviews = [
  { key: "product", icon: BriefcaseBusiness },
  { key: "data", icon: Cpu },
  { key: "commerce", icon: ShoppingBag },
] as const;

export function CompanyGridSection() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const availableJobs = companies.flatMap((company) =>
    (company.jobDescriptions ?? [])
      .filter((job) => job.id && job.status === "OPEN")
      .map((job) => ({ company, job }))
  );

  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const result = await companyManager.getAll();
        if (result.success) setCompanies(normalizeCompanies(result.data));
      } catch (err) {
        console.error("[CompanyGridSection] Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  return (
    <section className="border-y border-slate-200 bg-[oklch(0.985_0.006_260)] py-16 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
              {t("landingNew.companyKicker")}
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-pretty text-slate-950 sm:text-4xl dark:text-white">
              {t("landingNew.companyTitle")}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
              {t("landingNew.companyDescription")}
            </p>
          </div>
          {!isLoading && (
            <Button
              asChild
              variant="outline"
              className="group h-11 rounded-full bg-white px-5 font-semibold whitespace-nowrap dark:bg-slate-900">
              <Link to="/enterprise/companies">
                {t("common.seeAll")}
                {companies.length > 0 && (
                  <span className="ml-2 text-xs text-slate-500">
                    {companies.length} {t("compHomepageRedesign.partner")}
                  </span>
                )}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-8 w-8 animate-spin text-[#0047AB] dark:text-[#66B2FF]" />
          </div>
        )}

        {!isLoading && companies.length === 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 md:flex-row md:items-center md:justify-between dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
                  {t("landingNew.companyPreviewKicker")}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t("landingNew.companyPreviewDescription")}
                </p>
              </div>
              <span className="w-fit rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold whitespace-nowrap text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("landingNew.companyPreviewLabel")}
              </span>
            </div>
            <div className="grid md:grid-cols-3">
              {practiceCompanyPreviews.map(({ key, icon: Icon }) => (
                <Link
                  key={key}
                  to="/enterprise/companies"
                  className="group flex min-h-48 flex-col justify-between border-b border-slate-200 px-5 py-5 transition-colors hover:bg-slate-50 md:border-r md:last:border-r-0 dark:border-slate-800 dark:hover:bg-slate-800/60 md:[&:nth-child(3)]:border-b-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-8">
                    <p className="text-xs font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
                      {t(`landingNew.companyPreview.${key}.label`)}
                    </p>
                    <h3 className="mt-2 text-lg leading-6 font-bold text-slate-950 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
                      {t(`landingNew.companyPreview.${key}.title`)}
                    </h3>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span>{t(`landingNew.companyPreview.${key}.role`)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#0047AB] transition-transform duration-200 group-hover:translate-x-1 dark:text-[#66B2FF]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p className="border-t border-slate-200 px-5 py-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t("landingNew.companyPreviewNotice")}
            </p>
          </div>
        )}

        {!isLoading && companies.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {availableJobs.length > 0
              ? availableJobs.slice(0, 6).map(({ company, job }) => {
                  const CompanyIcon = getIconForDescription(company.description);
                  return (
                    <Link
                      key={`${company.id}-${job.id}`}
                      to={`/enterprise/job/${job.id}`}
                      className="group grid gap-4 border-b border-slate-200 px-5 py-5 transition-colors last:border-b-0 hover:bg-slate-50 md:grid-cols-[minmax(0,1fr)_auto] md:items-center dark:border-slate-800 dark:hover:bg-slate-800/60">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name || t("common.company")}
                              className="h-7 w-7 object-contain"
                            />
                          ) : (
                            <CompanyIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="leading-6 font-bold text-slate-950 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-600 md:truncate dark:text-slate-300">
                            {company.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {job.level && <span>{job.level}</span>}
                        <ArrowRight className="h-4 w-4 text-[#0047AB] transition-transform duration-200 group-hover:translate-x-1 dark:text-[#66B2FF]" />
                      </div>
                    </Link>
                  );
                })
              : companies.slice(0, 6).map((company) => {
                  const CompanyIcon = getIconForDescription(company.description);
                  return (
                    <Link
                      key={company.id}
                      to={`/enterprise/company/${company.id}`}
                      className="group flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name || t("common.company")}
                              className="h-7 w-7 object-contain"
                            />
                          ) : (
                            <CompanyIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="leading-6 font-bold text-slate-950 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
                            {company.name}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {t("landingNew.companyFallbackMeta")}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#0047AB] transition-transform duration-200 group-hover:translate-x-1 dark:text-[#66B2FF]" />
                    </Link>
                  );
                })}
          </div>
        )}
      </div>
    </section>
  );
}
