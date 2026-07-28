import type { Company } from "@/services/company.manager";
import { useTranslation } from "react-i18next";

interface CompanyInfoSectionProps {
  company: Company;
}

export function CompanyInfoSection({ company }: CompanyInfoSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="w-full bg-white py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <div className="mb-4 text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
            {t("enterpriseCompanydetail.companyOverview")}
          </div>
          <h2 className="max-w-3xl text-2xl leading-tight font-bold tracking-[-0.02em] text-slate-950 sm:text-3xl dark:text-white">
            {t("enterpriseCompanydetail.about")} {company.name}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-400">
            {company.description || t("enterpriseCompanydetail.noCompanyDescription")}
          </p>

          {company.culture && (
            <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                {t("enterpriseCompanydetail.workCulture")}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
                {company.culture}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
