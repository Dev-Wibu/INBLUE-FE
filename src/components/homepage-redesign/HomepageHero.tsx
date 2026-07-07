import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroBackground } from "./HeroBackground";

export function HomepageHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (query) {
      navigate(`/enterprise/companies?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/enterprise/companies");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <section className="relative min-h-screen bg-[#EFF6FF] pt-24 pb-20 dark:bg-gradient-to-br dark:from-[#030712] dark:via-[#0f172a] dark:to-[#0c1654]">
      {/* Interactive canvas background */}
      <HeroBackground className="z-0" />

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-[#0047AB]/20 via-[#0047AB]/8 to-white dark:from-[#0047AB]/50 dark:via-[#0047AB]/25 dark:to-transparent" />

      {/* Hero Content */}
      <div className="relative z-20 mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mb-14 text-center">
          {/* Eyebrow label */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#0047AB]/20 bg-[#0047AB]/10 px-4 py-1.5 text-sm font-medium text-[#0047AB] backdrop-blur-sm dark:border-white/20 dark:bg-white/10 dark:text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
            <span>AI-Powered Interview Platform</span>
          </div>

          {/* Main headline */}
          <h1 className="mb-5 text-4xl font-bold tracking-tight text-balance text-[#0f172a] md:text-5xl lg:text-6xl dark:text-white">
            {t("compHomepageRedesign.simulateTheRecruitmentProcess")}{" "}
            <span className="text-[#0047AB] dark:text-[#7AB8FF]">
              {t("compHomepageRedesign.softwareEngineer")}
            </span>{" "}
            {t("compHomepageRedesign.soNewSystem")}
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg dark:text-white/70">
            {t("compHomepageRedesign.practiceInterviewSkillsChallengeAlgorithms")}
          </p>

          {/* CTA Buttons */}
          <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 gap-2 bg-[#0047AB] px-8 font-semibold text-white shadow-md hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#7AB8FF]"
              asChild>
              <a href="/select-role">
                <Sparkles className="h-4 w-4" />
                {t("common.register")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 gap-2 border-[#0047AB]/30 bg-white px-8 font-semibold text-[#0047AB] hover:bg-[#0047AB]/5 hover:text-[#0047AB] dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              asChild>
              <a href="/features/ai-interview">
                {t("compHomepageRedesign.discover")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mx-auto max-w-2xl">
          <div className="group relative">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#0047AB]/30 to-[#007BFF]/30 opacity-30 blur transition duration-700 group-hover:opacity-50 dark:from-white/30 dark:to-[#007BFF]/30 dark:opacity-40 dark:group-hover:opacity-60" />

            {/* Search Card */}
            <div className="relative flex items-center gap-3 rounded-xl border border-[#0047AB]/20 bg-white/90 p-3 shadow-md backdrop-blur-sm dark:border-white/20 dark:bg-white/15">
              <Building2 className="ml-2 h-5 w-5 shrink-0 text-[#0047AB]/60 dark:text-white/60" />
              <Input
                type="text"
                placeholder={t("compHomepageRedesign.searchForOutstandingCompaniesAi")}
                className="flex-1 border-none bg-transparent py-3 pr-4 pl-0 text-base text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none dark:text-white dark:placeholder:text-white/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                onClick={handleSearch}
                size="sm"
                className="mr-1 flex items-center gap-1.5 bg-[#0047AB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#003d8f] dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#7AB8FF]">
                <span>{t("compHomepageRedesign.discover")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
