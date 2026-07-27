import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Code2,
  FileText,
  Mic2,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ArtifactRow({
  icon,
  title,
  meta,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 ${
        active
          ? "border-[#0047AB] bg-[#0047AB] text-white"
          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      }`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          active
            ? "bg-white/15 text-white"
            : "bg-white text-[#0047AB] dark:bg-slate-800 dark:text-[#66B2FF]"
        }`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p
          className={`truncate text-xs ${active ? "text-white/75" : "text-slate-500 dark:text-slate-400"}`}>
          {meta}
        </p>
      </div>
    </div>
  );
}

export function HomepageHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const query = searchQuery.trim();
    navigate(
      query ? `/enterprise/companies?q=${encodeURIComponent(query)}` : "/enterprise/companies"
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <section className="relative overflow-hidden bg-[#07111f] pt-24 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#07111f]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-12 px-6 pt-10 pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:pt-12 lg:pb-20">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-[#0c1a2b] px-3 py-1.5 text-sm font-medium text-[#A5C8F2]">
            <ShieldCheck className="h-4 w-4" />
            {t("landingRefactor.heroBadge")}
          </div>

          <h1 className="max-w-[12ch] text-5xl leading-[0.98] font-bold tracking-tight text-balance text-white sm:text-6xl lg:text-7xl">
            {t("compHomepageRedesign.simulateTheRecruitmentProcess")}{" "}
            <span className="text-[#66B2FF]">{t("compHomepageRedesign.softwareEngineer")}</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
            {t("landingRefactor.heroValue")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="group h-12 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-[#DCEEFF] active:scale-[0.98]"
              asChild>
              <Link to="/signup">
                {t("common.register")}
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/8 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/20 bg-transparent px-6 text-sm font-semibold text-white transition-all duration-200 hover:border-[#66B2FF]/50 hover:bg-[#10203a] hover:text-white active:scale-[0.98]"
              asChild>
              <Link to="/features/ai-interview">
                {t("compHomepageRedesign.discover")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-7 max-w-xl rounded-2xl border border-white/12 bg-white p-2">
            <div className="flex flex-col gap-2 rounded-xl sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
                <Building2 className="h-5 w-5 shrink-0 text-[#0047AB]" />
                <Input
                  type="text"
                  placeholder={t("compHomepageRedesign.searchForOutstandingCompaniesAi")}
                  className="h-11 border-0 bg-transparent px-0 text-base text-slate-950 shadow-none focus-visible:ring-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <Button
                onClick={handleSearch}
                className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0047AB]">
                {t("general.search")}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-2xl border border-white/12 bg-white p-2 text-slate-950 dark:bg-slate-950 dark:text-white">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {t("landingRefactor.artifactWorkspace")}
                  </p>
                  <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                    {t("landingRefactor.artifactTitle")}
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {t("landingRefactor.artifactLive")}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  <ArtifactRow
                    active
                    icon={<Mic2 className="h-4 w-4" />}
                    title={t("common.voiceMode")}
                    meta={t("general.practiceInRealTime")}
                  />
                  <ArtifactRow
                    icon={<Video className="h-4 w-4" />}
                    title={t("general.conversationMode")}
                    meta={t("general.theMostRealisticExperience")}
                  />
                  <ArtifactRow
                    icon={<Code2 className="h-4 w-4" />}
                    title={t("general.trendingQuestions")}
                    meta={t("general.masterPracticeQuestions")}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                        <BriefcaseBusiness className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950 dark:text-white">
                          {t("landingRefactor.artifactReactRound")}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {t("landingRefactor.artifactSessionMeta")}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>

                  <div className="space-y-3">
                    {[
                      t("landingRefactor.artifactCv"),
                      t("landingRefactor.artifactPrompt"),
                      t("landingRefactor.artifactLiveResponse"),
                      t("landingRefactor.artifactMentor"),
                    ].map((item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0047AB]/10 text-[11px] font-bold text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                          {index + 1}
                        </div>
                        <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                        <span className="w-24 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {["450+", "24/7", "98%"].map((value, index) => (
                  <div
                    key={value}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-1.5 text-[#0047AB] dark:text-[#66B2FF]">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-lg font-bold">{value}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {index === 0
                        ? t("compHomepageRedesign.interviewScript")
                        : index === 1
                          ? t("landingRefactor.alwaysOnPractice")
                          : t("compHomepageRedesign.positiveResponseRate")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
