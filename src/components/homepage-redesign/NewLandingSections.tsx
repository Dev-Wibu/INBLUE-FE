import interviewSetupImage from "@/assets/homepage/ai-interview-setup.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { companyManager, type JobDescription } from "@/services/company.manager";
import { jobDescriptionManager } from "@/services/job-description.manager";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileCheck2,
  FileSearch,
  Mail,
  MapPin,
  Mic2,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const res = await jobDescriptionManager.getAll();
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const openJobs = res.data.filter((j) => j.status !== "CLOSED" && !j.isDeleted);
          if (openJobs.length > 0) {
            setJobs(openJobs);
            setIsLoading(false);
            return;
          }
        }

        const companyRes = await companyManager.getAll();
        if (isMounted && companyRes.success && Array.isArray(companyRes.data)) {
          const extractedJobs: JobDescription[] = [];
          for (const company of companyRes.data) {
            if (Array.isArray(company.jobDescriptions)) {
              for (const j of company.jobDescriptions) {
                if (j.id && j.status !== "CLOSED" && !j.isDeleted) {
                  extractedJobs.push({
                    ...j,
                    companyName: j.companyName || company.name,
                    companyId: j.companyId || company.id,
                  });
                }
              }
            }
          }
          setJobs(extractedJobs);
        }
      } catch (err) {
        console.error("[JobDescriptionSlice] Error fetching jobs:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [jobs]);

  const directionRef = useRef<"right" | "left">("right");

  // Ping-Pong continuous 60fps smooth animation
  useEffect(() => {
    if (isLoading || jobs.length <= 1) return;
    let animId: number;

    const step = () => {
      if (scrollRef.current && !isPaused) {
        const el = scrollRef.current;
        const speed = 0.9;

        if (directionRef.current === "right") {
          el.scrollLeft += speed;
          if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) {
            directionRef.current = "left";
          }
        } else {
          el.scrollLeft -= speed;
          if (el.scrollLeft <= 4) {
            directionRef.current = "right";
          }
        }
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isLoading, jobs.length, isPaused]);

  const handleScroll = (direction: "left" | "right") => {
    directionRef.current = direction;
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleCardClick = (job: JobDescription) => {
    if (job.id) {
      navigate(`/enterprise/job/${job.id}`);
    } else if (job.companyId) {
      navigate(`/enterprise/company/${job.companyId}`);
    } else {
      navigate("/enterprise/companies");
    }
  };

  if (!isLoading && jobs.length === 0) {
    return null;
  }

  return (
    <div className="mb-14">
      <div className="mb-6 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0047AB]/10 px-3.5 py-1 text-xs font-semibold text-[#0047AB] dark:bg-[#66B2FF]/10 dark:text-[#66B2FF]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t("landingNew.jobSliceKicker")}</span>
        </div>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
          {t("landingNew.jobSliceTitle")}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t("landingNew.jobSliceDescription")}
        </p>
      </div>

      <div
        className="group/carousel relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}>
        {/* Floating Left Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canScrollLeft}
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
          className="absolute top-1/2 -left-3 z-20 h-11 w-11 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:-left-5 dark:border-slate-700 dark:bg-slate-900/90 dark:text-white dark:hover:bg-slate-900">
          <ChevronLeft className="h-5 w-5 text-slate-800 dark:text-slate-100" />
        </Button>

        {/* Floating Right Button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canScrollRight}
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
          className="absolute top-1/2 -right-3 z-20 h-11 w-11 -translate-y-1/2 rounded-full border border-slate-200 bg-white/90 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:-right-5 dark:border-slate-700 dark:bg-slate-900/90 dark:text-white dark:hover:bg-slate-900">
          <ChevronRight className="h-5 w-5 text-slate-800 dark:text-slate-100" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pt-1 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-72 shrink-0 animate-pulse rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-3 h-5 w-44 rounded bg-slate-300 dark:bg-slate-700" />
                  <div className="mt-4 flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="mt-6 h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))
            : (jobs.length > 0 && jobs.length < 8 ? [...jobs, ...jobs, ...jobs] : jobs).map(
                (job, idx) => {
                  const salaryText =
                    job.salaryMin || job.salaryMax
                      ? `${job.salaryMin ? job.salaryMin.toLocaleString() : 0} - ${
                          job.salaryMax ? job.salaryMax.toLocaleString() : "Max"
                        } ${job.currency || "USD"}`
                      : t("landingNew.negotiableSalary");

                  return (
                    <div
                      key={`${job.id || job.title}-${idx}`}
                      onClick={() => handleCardClick(job)}
                      className="group relative flex w-80 shrink-0 cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#0047AB]/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-[#66B2FF]/40">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                            <span className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {job.companyName || "Enterprise Partner"}
                            </span>
                          </div>
                          {job.level && (
                            <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {job.level}
                            </span>
                          )}
                        </div>

                        <h4 className="mt-3 line-clamp-1 text-base font-bold text-slate-900 group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
                          {job.title}
                        </h4>

                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {job.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span className="max-w-[120px] truncate">{job.location}</span>
                            </span>
                          )}
                          {job.workType && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                              {job.workType}
                            </span>
                          )}
                        </div>

                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {job.skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 3 && (
                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                +{job.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
                        <div>
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {job.rounds && job.rounds.length > 0
                              ? t("landingNew.roundsCount", { count: job.rounds.length })
                              : salaryText}
                          </p>
                          {job.rounds && job.rounds.length > 0 && (
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {salaryText}
                            </p>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0047AB] transition-transform group-hover:translate-x-0.5 dark:text-[#66B2FF]">
                          {t("landingNew.viewJobDetail")}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
        </div>
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
