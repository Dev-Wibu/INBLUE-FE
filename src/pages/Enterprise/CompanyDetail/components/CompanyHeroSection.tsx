import { MediaLightboxDialog, type MediaViewerItem } from "@/components/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Company } from "@/services/company.manager";
import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  Globe,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface CompanyHeroSectionProps {
  company: Company;
}

export function CompanyHeroSection({ company }: CompanyHeroSectionProps) {
  const { t } = useTranslation();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerItems, setViewerItems] = useState<MediaViewerItem[]>([]);

  const bannerUrl = company.bannerUrl;
  const logoUrl = company.logoUrl;
  const companyInitials =
    company.name
      ?.split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TN";

  const openBannerViewer = () => {
    if (!bannerUrl) return;
    setViewerItems([
      {
        id: "company-banner",
        name: t("common.coverPhoto") || "Cover Photo",
        src: bannerUrl,
        alt: `${company.name} banner`,
        kind: "image",
      },
    ]);
    setViewerOpen(true);
  };

  const openLogoViewer = () => {
    if (!logoUrl) return;
    setViewerItems([
      {
        id: "company-logo",
        name: t("common.logo") || "Logo",
        src: logoUrl,
        alt: company.name,
        kind: "image",
      },
    ]);
    setViewerOpen(true);
  };

  return (
    <section className="relative w-full border-b border-slate-200 bg-white pt-16 dark:border-slate-800 dark:bg-slate-950">
      {bannerUrl ? (
        <button
          type="button"
          className="group relative block h-56 w-full overflow-hidden bg-slate-100 text-left md:h-72 lg:h-80 dark:bg-slate-900"
          onClick={openBannerViewer}>
          <img
            src={bannerUrl}
            alt={`${company.name} banner`}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-slate-950/[0.03]" />
        </button>
      ) : (
        <div className="h-28 border-b border-slate-200 bg-slate-50 md:h-36 dark:border-slate-800 dark:bg-slate-900/40" />
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-5xl">
          <div className="min-w-0">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <button
                  type="button"
                  className={cn(
                    "flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm sm:h-28 sm:w-28 dark:border-slate-800 dark:bg-slate-900",
                    logoUrl
                      ? "cursor-pointer transition-transform hover:scale-105"
                      : "cursor-default"
                  )}
                  onClick={openLogoViewer}>
                  {logoUrl ? (
                    <Avatar className="h-full w-full rounded-xl">
                      <AvatarImage src={logoUrl} alt={company.name} className="object-cover" />
                      <AvatarFallback className="rounded-xl bg-transparent text-2xl font-bold text-[#0047AB] sm:text-3xl dark:text-[#66B2FF]">
                        {companyInitials}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Building2 className="h-11 w-11 text-[#0047AB] sm:h-12 sm:w-12 dark:text-[#66B2FF]" />
                  )}
                </button>

                {company.status === "ACTIVE" && (
                  <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white shadow-sm dark:border-slate-950">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {company.industry && (
                    <Badge
                      variant="secondary"
                      className="bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#0047AB]/30 dark:text-[#66B2FF]">
                      {company.industry}
                    </Badge>
                  )}
                  {company.status === "ACTIVE" && (
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300">
                      {t("enterpriseCompanydetail.trustedPartner")}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl leading-tight font-bold tracking-[-0.02em] text-slate-950 sm:text-4xl dark:text-white">
                  {company.name}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7 dark:text-slate-400">
                  {company.description || t("enterpriseCompanydetail.noCompanyDescription")}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                  {company.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {company.location}
                    </span>
                  )}
                  {company.size && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {t("enterpriseCompanydetail.scale")} {company.size}
                    </span>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium hover:text-[#0047AB] dark:hover:text-[#66B2FF]">
                      <Globe className="h-4 w-4" />
                      <span>{t("common.website")}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {company.foundedYear && (
                    <span className="hidden text-slate-400 sm:inline">
                      {t("enterpriseCompanydetail.establish")} {company.foundedYear}
                    </span>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    className="bg-[#0047AB] text-white hover:bg-[#003f98]"
                    onClick={() => {
                      document.getElementById("open-positions")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}>
                    <BriefcaseBusiness className="mr-2 h-4 w-4" />
                    {t("enterpriseCompanydetail.viewOpenPositions")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MediaLightboxDialog open={viewerOpen} onOpenChange={setViewerOpen} items={viewerItems} />
    </section>
  );
}
