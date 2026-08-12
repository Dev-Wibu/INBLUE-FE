import interviewSetupImage from "@/assets/homepage/ai-interview-setup.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { companyManager, type Company, type JobDescription } from "@/services/company.manager";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  Code2,
  FileCheck2,
  FileSearch,
  Mail,
  MapPin,
  Mic2,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

const motionEase = [0.16, 1, 0.3, 1] as const;

function PrimaryLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button
      size="lg"
      className="group h-12 rounded-full bg-[#0047AB] px-5 font-semibold whitespace-nowrap text-white transition-all duration-300 hover:bg-[#003d8f] active:scale-[0.98] dark:bg-[#66B2FF] dark:text-slate-950 dark:hover:bg-[#87c4ff]"
      asChild>
      <Link to={to}>
        {children}
        <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/16 transition-transform duration-300 group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </Button>
  );
}

export function NewHomepageHero() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[oklch(0.985_0.006_260)] pt-28 pb-14 sm:pt-32 lg:pt-36 lg:pb-24 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 xl:grid-cols-[1.15fr_0.85fr] xl:gap-14">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: motionEase }}>
          <p className="text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
            {t("landingNew.heroKicker")}
          </p>
          <h1 className="mt-5 max-w-none text-[2.55rem] leading-[1.06] font-bold tracking-tight text-pretty text-slate-950 sm:max-w-[15ch] sm:text-6xl lg:max-w-none lg:text-6xl xl:text-[3.5rem] dark:text-white">
            {t("landingNew.heroTitle")}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
            {t("landingNew.heroDescription")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryLink to="/enterprise/companies">{t("landingNew.heroPrimaryCta")}</PrimaryLink>
            <Button
              variant="ghost"
              className="h-12 rounded-full px-4 font-semibold whitespace-nowrap text-slate-700 hover:bg-white hover:text-[#0047AB] dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-[#66B2FF]"
              asChild>
              <a href="#interview-map">
                {t("landingNew.heroSecondaryCta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </motion.div>

        <motion.figure
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: reduceMotion ? 0 : 0.12, ease: motionEase }}
          className="relative">
          <div className="overflow-hidden rounded-xl bg-slate-200 p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.12)] dark:bg-slate-800">
            <img
              src={interviewSetupImage}
              alt={t("landingNew.setupScreenshotAlt")}
              className="aspect-[1.44] w-full rounded-[9px] object-cover object-left-top"
            />
          </div>
          <figcaption className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {t("landingNew.heroCaption")}
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}

export function AnxietyReliefStrip() {
  const { t } = useTranslation();
  const items = ["reliefOne", "reliefTwo", "reliefThree"] as const;

  return (
    <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-7 sm:grid-cols-3 sm:gap-8">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#0047AB] dark:text-[#66B2FF]" />
            <p className="text-sm leading-6 font-medium text-slate-700 dark:text-slate-200">
              {t(`landingNew.${item}`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

type RoundId = "quiz" | "cv" | "coding" | "review" | "email" | "mentor" | "ai";

const rounds: Array<{
  id: RoundId;
  icon: typeof FileCheck2;
  status: "included" | "review" | "mentor" | "skip";
}> = [
  { id: "quiz", icon: FileCheck2, status: "included" },
  { id: "cv", icon: FileSearch, status: "review" },
  { id: "coding", icon: Code2, status: "included" },
  { id: "review", icon: Code2, status: "review" },
  { id: "email", icon: Mail, status: "review" },
  { id: "mentor", icon: UserRoundCheck, status: "mentor" },
  { id: "ai", icon: Bot, status: "skip" },
];

export function JobDescriptionSlice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchCompanies = async () => {
      setIsLoading(true);
      try {
        const res = await companyManager.getAll();
        if (isMounted && res.success) {
          let list: Company[] = [];
          if (Array.isArray(res.data)) {
            list = res.data;
          } else if (res.data && typeof res.data === "object" && "content" in res.data) {
            const content = (res.data as { content?: unknown }).content;
            if (Array.isArray(content)) list = content as Company[];
          }
          let filteredList = list.filter((c) => c.id && !c.isDeleted);

          filteredList = await Promise.all(
            filteredList.map(async (c) => {
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
                  console.error("[JobDescriptionSlice] Error fetching jobs for company", c.id, err);
                }
              }
              return c;
            })
          );

          filteredList.sort((a, b) => {
            const countA = (a.jobDescriptions ?? []).filter(
              (j) => j.id && j.status === "OPEN" && !j.isDeleted
            ).length;
            const countB = (b.jobDescriptions ?? []).filter(
              (j) => j.id && j.status === "OPEN" && !j.isDeleted
            ).length;
            if (countB !== countA) return countB - countA;
            return (a.name || "").localeCompare(b.name || "");
          });

          setCompanies(filteredList);
        }
      } catch (err) {
        console.error("[JobDescriptionSlice] Error fetching companies:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCompanies();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCompanyClick = (companyId?: number) => {
    if (companyId) {
      navigate(`/enterprise/company/${companyId}`);
    } else {
      navigate("/enterprise/companies");
    }
  };

  const featuredCompanies = companies.slice(0, 6);

  if (!isLoading && featuredCompanies.length === 0) {
    return null;
  }

  return (
    <div className="mb-14">
      {/* Section Header */}
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#0047AB]/10 px-3.5 py-1 text-xs font-semibold text-[#0047AB] dark:bg-[#66B2FF]/10 dark:text-[#66B2FF]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("landingNew.jobSliceKicker")}</span>
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            {t("landingNew.topCompaniesTitle")}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t("landingNew.topCompaniesDescription")}
          </p>
        </div>

        {!isLoading && (
          <Button
            asChild
            variant="outline"
            className="group h-10 rounded-full bg-white px-4 text-xs font-semibold whitespace-nowrap dark:bg-slate-900">
            <Link to="/enterprise/companies">
              {t("common.seeAll")}
              <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        )}
      </div>

      {/* ITviec-Style Companies Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-72 animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-28 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div className="h-16 w-24 rounded-lg bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="my-4 space-y-3">
                  <div className="mx-auto h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="flex justify-center gap-2">
                    <div className="h-5 w-14 rounded-md bg-slate-100 dark:bg-slate-800" />
                    <div className="h-5 w-16 rounded-md bg-slate-100 dark:bg-slate-800" />
                    <div className="h-5 w-12 rounded-md bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-8 w-full rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))
          : featuredCompanies.map((company) => {
              const activeJobs = (company.jobDescriptions ?? []).filter(
                (j) => j.id && j.status === "OPEN" && !j.isDeleted
              );
              const openJobsCount = activeJobs.length;

              return (
                <div
                  key={company.id}
                  onClick={() => handleCompanyClick(company.id)}
                  className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                  {/* Header with Logo container */}
                  <div className="relative flex h-36 w-full items-center justify-center border-b border-slate-100 bg-gradient-to-b from-slate-50/90 via-slate-50/50 to-white px-4 dark:border-slate-800/80 dark:from-slate-800/40 dark:via-slate-800/20 dark:to-slate-900">
                    {/* Background SVG radial grid pattern */}
                    <svg
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-slate-200/50 dark:stroke-slate-700/30"
                      fill="none">
                      <defs>
                        <pattern
                          id={`grid-pattern-${company.id}`}
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
                        fill={`url(#grid-pattern-${company.id})`}
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

                  {/* Card Footer: Location & Job Count */}
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
                        {openJobsCount}{" "}
                        {t(
                          openJobsCount === 1
                            ? "landingNew.openJobsCount"
                            : "landingNew.openJobsCount_plural"
                        )}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

export function InterviewMapSection() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [selectedRound, setSelectedRound] = useState<RoundId>("cv");
  const selected = rounds.find((round) => round.id === selectedRound) ?? rounds[0];
  const SelectedIcon = selected.icon;

  return (
    <section id="interview-map" className="scroll-mt-24 bg-white py-20 sm:py-28 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <JobDescriptionSlice />

        <div className="max-w-3xl lg:max-w-none">
          <p className="text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
            {t("landingNew.mapKicker")}
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-pretty text-slate-950 sm:text-5xl lg:max-w-none lg:whitespace-nowrap dark:text-white">
            {t("landingNew.mapTitle")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("landingNew.mapDescription")}
          </p>
        </div>

        <div className="mt-11 grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:grid-cols-[0.8fr_1.35fr_0.75fr] dark:border-slate-800 dark:bg-slate-900/35">
          <div className="border-b border-slate-200 p-6 lg:border-r lg:border-b-0 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0047AB] text-white dark:bg-[#66B2FF] dark:text-slate-950">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <p className="mt-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t("landingNew.mapSelectorLabel")}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
              {t("landingNew.mapSampleJd")}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t("landingNew.mapSelectorDescription")}
            </p>
            <Link
              to="/enterprise/companies"
              className="mt-6 inline-flex items-center text-sm font-semibold text-[#0047AB] transition-colors hover:text-[#003d8f] dark:text-[#66B2FF] dark:hover:text-[#87c4ff]">
              {t("landingNew.mapSelectorCta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="relative min-h-80 overflow-hidden p-6 sm:p-8">
            <div className="absolute top-1/2 right-10 left-10 hidden h-px -translate-y-1/2 bg-slate-200 lg:block dark:bg-slate-700" />
            <div className="relative grid h-full gap-2 sm:grid-cols-4 lg:grid-cols-7 lg:items-center">
              {rounds.map((round, index) => {
                const Icon = round.icon;
                const isSelected = selectedRound === round.id;
                const skipped = round.status === "skip";
                return (
                  <motion.button
                    type="button"
                    key={round.id}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRound(round.id)}
                    initial={false}
                    whileInView={reduceMotion ? undefined : { y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{
                      duration: 0.45,
                      delay: reduceMotion ? 0 : index * 0.045,
                      ease: motionEase,
                    }}
                    className={cn(
                      "relative z-10 flex min-h-20 flex-col items-start rounded-lg p-3 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#0047AB] focus-visible:ring-offset-2 focus-visible:outline-none lg:items-center lg:text-center dark:focus-visible:ring-[#66B2FF] dark:focus-visible:ring-offset-slate-900",
                      isSelected
                        ? "bg-white text-[#0047AB] shadow-[0_8px_18px_rgba(15,23,42,0.08)] ring-1 ring-[#0047AB]/20 dark:bg-slate-800 dark:text-[#66B2FF] dark:ring-[#66B2FF]/25"
                        : "text-slate-700 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/70",
                      skipped && "opacity-45"
                    )}>
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                        isSelected &&
                          "border-[#0047AB] bg-[#0047AB] text-white dark:border-[#66B2FF] dark:bg-[#66B2FF] dark:text-slate-950"
                      )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="mt-2 text-xs leading-4 font-semibold">
                      {t(`landingNew.round.${round.id}.title`)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-6 lg:border-t-0 lg:border-l dark:border-slate-800 dark:bg-slate-900">
            <SelectedIcon className="h-5 w-5 text-[#0047AB] dark:text-[#66B2FF]" />
            <p className="mt-5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(`landingNew.round.${selected.id}.label`)}
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {t(`landingNew.round.${selected.id}.title`)}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t(`landingNew.round.${selected.id}.description`)}
            </p>
            <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-xs font-semibold text-[#0047AB] dark:text-[#66B2FF]">
                {t("landingNew.mapFeedbackLabel")}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {t(`landingNew.round.${selected.id}.feedback`)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PracticeBeforePressureSection() {
  const { t } = useTranslation();
  const scenes = [
    { id: "ai", icon: Bot },
    { id: "jd", icon: FileSearch },
    { id: "mentor", icon: UserRoundCheck },
  ];

  return (
    <section className="bg-[oklch(0.985_0.006_260)] py-20 sm:py-28 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl lg:max-w-none">
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-pretty text-slate-950 sm:text-5xl lg:max-w-none lg:whitespace-nowrap dark:text-white">
            {t("landingNew.practiceTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("landingNew.practiceDescription")}
          </p>
        </div>
        <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-6">
          {scenes.map((scene, index) => {
            const Icon = scene.icon;
            return (
              <article
                key={scene.id}
                className="border-t border-slate-300 pt-6 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <Icon className="h-6 w-6 text-[#0047AB] dark:text-[#66B2FF]" />
                  <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-bold text-slate-950 dark:text-white">
                  {t(`landingNew.scene.${scene.id}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t(`landingNew.scene.${scene.id}.description`)}
                </p>
                <p className="mt-6 text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
                  {t(`landingNew.scene.${scene.id}.outcome`)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FeedbackActionSection() {
  const { t } = useTranslation();
  const actions = ["keep", "improve", "next"] as const;

  return (
    <section className="bg-white py-20 sm:py-28 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 xl:grid-cols-[0.9fr_1.1fr] xl:gap-16">
        <div>
          <p className="text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
            {t("landingNew.feedbackKicker")}
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-pretty text-slate-950 sm:text-5xl xl:text-4xl dark:text-white">
            {t("landingNew.feedbackTitle")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("landingNew.feedbackDescription")}
          </p>
          <div className="mt-8 space-y-5">
            {actions.map((action) => (
              <div key={action} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0047AB]/10 text-[#0047AB] dark:bg-[#66B2FF]/15 dark:text-[#66B2FF]">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 dark:text-white">
                    {t(`landingNew.feedback.${action}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t(`landingNew.feedback.${action}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <figure className="overflow-hidden rounded-xl bg-slate-200 p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.1)] dark:bg-slate-800">
          <img
            src={interviewSetupImage}
            alt={t("landingNew.feedbackScreenshotAlt")}
            className="aspect-[1.44] w-full rounded-[9px] object-cover object-right-top"
          />
        </figure>
      </div>
    </section>
  );
}

export function StartingPointSection() {
  const { t } = useTranslation();
  const entries = [
    { id: "first", icon: BriefcaseBusiness, to: "/enterprise/companies" },
    { id: "code", icon: Code2, to: "/questions/bank" },
    { id: "communication", icon: Mic2, to: "/features/ai-interview" },
  ];

  return (
    <section className="border-y border-slate-200 bg-[oklch(0.985_0.006_260)] py-20 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="max-w-3xl text-3xl leading-tight font-bold tracking-tight text-pretty text-slate-950 sm:text-5xl lg:max-w-none lg:whitespace-nowrap dark:text-white">
          {t("landingNew.startTitle")}
        </h2>
        <div className="mt-10 grid gap-x-8 lg:grid-cols-3">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.id}
                to={entry.to}
                className="group border-t border-slate-300 py-6 transition-colors hover:border-[#0047AB] dark:border-slate-700 dark:hover:border-[#66B2FF]">
                <Icon className="h-5 w-5 text-[#0047AB] dark:text-[#66B2FF]" />
                <h3 className="mt-7 flex items-center justify-between gap-4 text-xl font-bold text-slate-950 dark:text-white">
                  {t(`landingNew.start.${entry.id}.title`)}
                  <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t(`landingNew.start.${entry.id}.description`)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SimpleTestimonials() {
  const { t } = useTranslation();
  const testimonials = ["ha", "duc", "anh"] as const;

  return (
    <section className="bg-white py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="max-w-2xl text-3xl leading-tight font-bold tracking-tight text-pretty text-slate-950 sm:text-5xl lg:max-w-none lg:whitespace-nowrap dark:text-white">
          {t("landingNew.testimonialsTitle")}
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial}
              className="border-t border-slate-300 pt-5 dark:border-slate-700">
              <blockquote className="text-base leading-7 text-slate-700 dark:text-slate-200">
                “{t(`landingNew.testimonial.${testimonial}.quote`)}”
              </blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-slate-950 dark:text-white">
                {t(`landingNew.testimonial.${testimonial}.name`)}
                <span className="mt-1 block font-normal text-slate-500 dark:text-slate-400">
                  {t(`landingNew.testimonial.${testimonial}.role`)}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalLandingCta() {
  const { t } = useTranslation();
  return (
    <section className="bg-[#0047AB] py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl lg:max-w-none">
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-pretty sm:text-5xl lg:max-w-none lg:whitespace-nowrap">
            {t("landingNew.finalTitle")}
          </h2>
          <p className="mt-4 text-base leading-7 text-[#DCEEFF]">
            {t("landingNew.finalDescription")}
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              className="group h-12 rounded-full bg-white px-5 font-semibold whitespace-nowrap text-[#0047AB] transition-all duration-300 hover:bg-[#DCEEFF] active:scale-[0.98]"
              asChild>
              <Link to="/signup">
                {t("landingNew.finalCta")}
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#0047AB]/10 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
