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
      <div className="mx-auto grid max-w-[92rem] items-center gap-12 px-6 xl:grid-cols-[0.82fr_1.18fr] xl:gap-16">
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
          <div className="relative overflow-hidden rounded-xl bg-[#040814] shadow-[0_8px_8px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/10 dark:ring-white/10">
            <img
              src="/images/homepage/ai-kiosk-pin-screen.png"
              alt={t("landingNew.heroCaption")}
              className="block aspect-[2048/1071] w-full object-cover"
              loading="eager"
            />
          </div>
          <figcaption className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("landingNew.heroCaption")}
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}

export function AIInterviewHeroConsoleMockup() {
  const reduceMotion = useReducedMotion();
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const waveform = [34, 68, 42, 82, 48, 74, 36, 64, 44, 88, 52, 70];

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#050b17] text-slate-100 shadow-[0_8px_8px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#070d1b] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-[#9ccfff]">INBLUE</span>
          <span className="rounded-full border border-[#66B2FF]/25 bg-[#66B2FF]/10 px-2.5 py-1 text-[10px] font-bold text-[#9ccfff]">
            AI KIOSK MODE
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10.5px] font-bold text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              {isSpeaking && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            System Online
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 font-mono text-[10.5px] font-bold text-slate-200">
            14:25
          </span>
        </div>
      </div>

      <div className="grid min-h-[390px] lg:grid-cols-[1fr_15rem]">
        <div className="relative overflow-hidden bg-[#071322] p-5 lg:border-r lg:border-white/10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(102,178,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(102,178,255,0.045)_1px,transparent_1px)] bg-[size:34px_34px]" />
          <div className="absolute top-16 left-10 h-1.5 w-1.5 rounded-full bg-[#9ccfff]/70" />
          <div className="absolute top-32 right-20 h-1.5 w-1.5 rounded-full bg-[#9ccfff]/60" />
          <div className="absolute right-32 bottom-20 h-1 w-1 rounded-full bg-[#9ccfff]/60" />

          <div className="relative mx-auto max-w-[30rem] rounded-lg border border-[#008dff]/45 bg-[#0c1b2e]/85 px-5 py-3 text-center shadow-[0_0_24px_rgba(0,141,255,0.12)]">
            <div className="mb-2 flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-[#008dff]/45" />
              <span className="text-[10px] font-black tracking-[0.28em] text-[#28b9ff]">
                CÂU HỎI HIỆN TẠI
              </span>
              <span className="h-px w-12 bg-[#008dff]/45" />
            </div>
            <p className="text-xs leading-5 font-semibold text-white">
              Chào bạn, rất vui được gặp bạn trong buổi phỏng vấn hôm nay. Hãy giới thiệu ngắn gọn
              về bản thân và kinh nghiệm làm việc của mình nhé.
            </p>
          </div>

          <div className="relative mx-auto mt-8 flex h-36 w-36 items-center justify-center rounded-full border border-[#66B2FF]/15 bg-[#0b1728]">
            <span className="absolute inset-3 rounded-full border border-[#66B2FF]/30" />
            <span className="absolute inset-6 rounded-full bg-[#0f2d50] shadow-[0_0_34px_rgba(40,185,255,0.35)]" />
            <Bot className="relative h-12 w-12 text-[#9ccfff]" />
          </div>

          <div className="relative mx-auto mt-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#008dff]/45 bg-[#0c1b2e] text-[#9ccfff]">
            <Mic2 className="h-4 w-4" />
          </div>

          <div className="relative mx-auto mt-2 flex h-8 w-24 items-end justify-center gap-1">
            {waveform.slice(0, 10).map((height, i) => (
              <motion.span
                key={`${height}-${i}`}
                animate={
                  isSpeaking && !reduceMotion
                    ? { height: [`${height * 0.24}%`, `${height * 0.62}%`, `${height * 0.24}%`] }
                    : { height: `${height * 0.28}%` }
                }
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.06,
                }}
                className="w-1 rounded-full bg-[#18baff]"
                style={{ minHeight: 4 }}
              />
            ))}
          </div>

          <div className="relative mx-auto mt-4 max-w-[28rem] rounded-lg border border-[#008dff]/30 bg-[#07111f]/90 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[10px] font-black tracking-[0.2em] text-[#28b9ff]">
                BẢN DỊCH TRỰC TIẾP
              </span>
              <span className="text-[10px] font-bold text-slate-400">CHỈNH SỬA</span>
            </div>
            <p className="text-xs leading-5 text-slate-100">
              Nhấn mic để bắt đầu trả lời bằng giọng nói.
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.22em] text-slate-500">
                VOICE READY
              </span>
              <button
                type="button"
                onClick={() => setIsSpeaking((value) => !value)}
                className="rounded-md border border-[#008dff]/30 bg-[#0d233b] px-3 py-1.5 text-[10px] font-bold text-[#9ccfff] transition-colors hover:border-[#66B2FF]/60 hover:text-white">
                Gửi phản hồi
              </button>
            </div>
          </div>
        </div>

        <aside className="hidden flex-col bg-[#06101d] lg:flex">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-bold text-white">Lịch sử Trao đổi</span>
            <span className="rounded-full bg-[#008dff]/20 px-2 py-0.5 text-[10px] font-bold text-[#9ccfff]">
              1 tin nhắn
            </span>
          </div>
          <div className="flex-1 p-3">
            <div className="rounded-lg border border-[#008dff]/20 bg-[#0c1b2e] p-3">
              <p className="mb-2 text-[10px] font-black tracking-[0.18em] text-[#9ccfff]">
                INBLUE AI
              </p>
              <p className="text-[11px] leading-5 text-slate-100">
                Chào bạn, rất vui được gặp bạn trong buổi phỏng vấn hôm nay. Hãy dành khoảng 1-2
                phút giới thiệu ngắn gọn về bản thân nhé.
              </p>
              <p className="mt-3 text-right text-[10px] font-semibold text-slate-500">02:09 PM</p>
            </div>
          </div>
          <div className="border-t border-white/10 px-4 py-3 text-[10px] font-black tracking-[0.2em] text-[#66B2FF]/65">
            THANH LAN IS TYPING...
          </div>
        </aside>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-[#070d1b] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMuted(!isMuted)}
            className="h-7 gap-1 rounded-full border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold text-slate-100 hover:bg-white/10 hover:text-white">
            <Mic2 className={cn("h-3 w-3", isMuted && "text-rose-400")} />
            {isMuted ? "Mic Off" : "Mic Active"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsSpeaking(!isSpeaking)}
            className="h-7 gap-1 rounded-full px-2.5 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white">
            <Bot className="h-3 w-3 text-[#66B2FF]" />
            AI Hints
          </Button>
        </div>
        <span className="text-[10px] font-bold tracking-[0.16em] text-slate-500">
          POWERED BY INBLUE PLATFORM
        </span>
      </div>
    </div>
  );
}

export function AIInterviewHeroMockup() {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-[0_16px_32px_rgba(15,23,42,0.1)] backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/95">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5 dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-400 dark:bg-rose-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400 dark:bg-amber-500/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 dark:bg-emerald-500/80" />
          </div>
          <span className="ml-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            INBLUE AI Interview Studio
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            </span>
            LIVE SESSION
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
            14:25
          </span>
        </div>
      </div>

      {/* Main Content Area - Compact padding */}
      <div className="space-y-3 p-3.5 sm:p-4">
        {/* AI Interviewer Question Card */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0047AB] to-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-1 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0047AB] dark:text-[#66B2FF]">
                AI Interviewer • Tech Lead
              </span>
              <span className="text-[10px] font-medium text-slate-400">AI Round</span>
            </div>
            <p className="text-xs leading-snug font-medium text-slate-800 dark:text-slate-200">
              "How do you optimize component re-renders in a large React application handling
              high-frequency WebSocket streams?"
            </p>
          </div>
        </div>

        {/* Candidate Audio & Speech Stream */}
        <div className="relative rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-950/60">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                ME
              </div>
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Your Answer (Voice Input)
              </span>
            </div>
            {/* Live Audio Equalizer Waveform Animation */}
            <div className="flex items-center gap-0.5">
              {[40, 75, 30, 90, 60, 100, 45, 80, 50, 35].map((height, i) => (
                <motion.span
                  key={i}
                  animate={
                    isSpeaking
                      ? { height: [`${height * 0.3}%`, `${height}%`, `${height * 0.3}%`] }
                      : { height: "20%" }
                  }
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: i * 0.08,
                  }}
                  className="w-0.5 rounded-full bg-[#0047AB] dark:bg-[#66B2FF]"
                  style={{ height: `${height}%`, minHeight: "5px" }}
                />
              ))}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600 italic dark:text-slate-300">
            "I leverage{" "}
            <strong className="font-semibold text-indigo-600 not-italic dark:text-indigo-400">
              React.memo
            </strong>{" "}
            with custom equality checks, paired with{" "}
            <strong className="font-semibold text-indigo-600 not-italic dark:text-indigo-400">
              virtualized lists
            </strong>{" "}
            to ensure DOM updates remain decoupled from state updates..."
          </p>
        </div>

        {/* Realtime Telemetry Indicators Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-200/60 bg-white p-2 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Clarity
            </div>
            <div className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              96%
            </div>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-white p-2 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Pacing</div>
            <div className="mt-0.5 text-xs font-bold text-[#0047AB] dark:text-[#66B2FF]">
              140 wpm
            </div>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-white p-2 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              Keywords
            </div>
            <div className="mt-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">92%</div>
          </div>
        </div>
      </div>

      {/* Control Bar Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsMuted(!isMuted)}
            className="h-7 gap-1 rounded-full px-2.5 text-[11px] font-semibold">
            <Mic2 className={cn("h-3 w-3", isMuted && "text-rose-500")} />
            {isMuted ? "Mic Off" : "Mic Active"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsSpeaking(!isSpeaking)}
            className="h-7 gap-1 rounded-full px-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <Bot className="h-3 w-3 text-[#0047AB] dark:text-[#66B2FF]" />
            AI Hints
          </Button>
        </div>
        <span className="text-[10px] font-medium text-slate-400">INBLUE Engine</span>
      </div>
    </div>
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
        <figure className="relative">
          <AIInterviewFeedbackMockup />
        </figure>
      </div>
    </section>
  );
}

export function HoloboxPromoSection() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const holoboxSignals = [
    { label: "Construction", value: 75 },
    { label: "Communication", value: 83 },
    { label: "Work ethic", value: 25 },
  ];
  const waveformHeights = [22, 46, 30, 64, 40, 58, 28, 52, 34, 70, 42, 56];

  return (
    <section className="border-y border-orange-200/70 bg-white py-20 sm:py-24 dark:border-orange-400/15 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5, ease: motionEase }}>
          <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3.5 py-1 text-sm font-semibold text-orange-700 ring-1 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/20">
            <Bot className="h-4 w-4" />
            {t("landingNew.holoboxKicker")}
          </p>
          <h2 className="mt-5 max-w-3xl text-3xl leading-tight font-bold tracking-tight text-pretty text-slate-950 sm:text-5xl lg:max-w-none lg:text-4xl dark:text-white">
            {t("landingNew.holoboxTitle")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t("landingNew.holoboxDescription")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="group h-12 rounded-full bg-orange-500 px-5 font-semibold whitespace-nowrap text-white transition-all duration-300 hover:bg-orange-600 active:scale-[0.98]"
              asChild>
              <Link to="/holobox/competency">
                {t("landingNew.holoboxCta")}
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/18 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {t("landingNew.holoboxNote")}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.08, ease: motionEase }}
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[oklch(0.985_0.006_260)] p-4 shadow-[0_8px_8px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  HOLOBOX STUDIO
                </p>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  {t("landingNew.holoboxPreviewTitle")}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              LIVE
            </span>
          </div>

          <div className="grid gap-4 pt-4 sm:grid-cols-[0.82fr_1.18fr]">
            <div className="relative min-h-72 overflow-hidden rounded-xl bg-white dark:bg-slate-950">
              <img
                src="/images/holobox/holobox-robot-cutout.png"
                alt={t("landingNew.holoboxRobotAlt")}
                className="absolute bottom-5 left-1/2 z-10 h-[15rem] w-auto max-w-none -translate-x-1/2 object-contain drop-shadow-[0_18px_18px_rgba(15,23,42,0.16)]"
                loading="lazy"
              />
            </div>

            <div className="flex min-h-72 flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t("landingNew.holoboxCandidateLabel")}
                  </p>
                  <h3 className="mt-2 truncate text-xl font-bold text-slate-950 dark:text-white">
                    Nguyen Pham Thu Ha
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {t("landingNew.holoboxRoleLabel")}
                    </span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:bg-orange-400/10 dark:text-orange-300">
                      {t("landingNew.holoboxDimensionLabel")}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-orange-50 px-3 py-2 text-right ring-1 ring-orange-100 dark:bg-orange-400/10 dark:ring-orange-400/15">
                  <p className="text-[10px] font-bold text-orange-700/75 dark:text-orange-300/75">
                    {t("landingNew.holoboxScoreLabel")}
                  </p>
                  <strong className="mt-0.5 block text-sm font-black text-orange-700 dark:text-orange-300">
                    46/100
                  </strong>
                </div>
              </div>

              <div className="mt-5 space-y-3.5">
                {holoboxSignals.map((signal) => (
                  <div key={signal.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {signal.label}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {signal.value}
                      </span>
                    </div>
                    <span className="block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-orange-500"
                        style={{ width: `${signal.value}%` }}
                      />
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:bg-orange-400/10 dark:text-orange-300">
                        <Mic2 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {t("landingNew.holoboxAudioLabel")}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {t("landingNew.holoboxAudioMeta")}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-orange-100 dark:bg-slate-950 dark:text-orange-300 dark:ring-orange-400/15">
                      0:42
                    </span>
                  </div>
                  <div className="mt-4 flex h-16 items-end gap-1.5 rounded-lg bg-white/80 px-2.5 py-2 dark:bg-slate-950/70">
                    {waveformHeights.map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="w-full rounded-full bg-orange-500"
                        style={{ height }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function AIInterviewFeedbackMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.1)] dark:border-slate-800/90 dark:bg-slate-900">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#0047AB] to-indigo-600 text-white shadow-2xs">
            <FileCheck2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-[11px] font-bold text-slate-900 dark:text-white">
                Final Application Summary
              </h4>
              <span className="py-0.2 rounded bg-indigo-50 px-1.5 text-[9.5px] font-semibold text-[#0047AB] dark:bg-indigo-950/60 dark:text-[#66B2FF]">
                JD #APP-9824
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Frontend Engineer • 4-Round Assessment
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Passed 94 / 100
          </span>
        </div>
      </div>

      {/* Main Body - Compact padding */}
      <div className="space-y-3 p-3.5 sm:p-4">
        {/* Application Rounds Progress Grid */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <span>Rounds Progress</span>
            <span className="text-emerald-600 dark:text-emerald-400">4/4 Completed</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {/* Round 1 */}
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-2 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                Round 1: CV
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <Check className="h-2.5 w-2.5" /> Matched
              </div>
            </div>

            {/* Round 2 */}
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-2 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                Round 2: Quiz
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <Check className="h-2.5 w-2.5" /> 90/100
              </div>
            </div>

            {/* Round 3 */}
            <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/40 p-2 text-center dark:border-indigo-900/40 dark:bg-indigo-950/20">
              <div className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                Round 3: AI Stream
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-bold text-[#0047AB] dark:text-[#66B2FF]">
                <Sparkles className="h-2.5 w-2.5" /> 95/100
              </div>
            </div>

            {/* Round 4 */}
            <div className="rounded-lg border border-purple-200/80 bg-purple-50/40 p-2 text-center dark:border-purple-900/40 dark:bg-purple-950/20">
              <div className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                Round 4: Mentor
              </div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                <UserRoundCheck className="h-2.5 w-2.5" /> 92/100
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Feedback Highlights Cards */}
        <div className="space-y-2 pt-0.5">
          {/* Keep */}
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 dark:border-emerald-950/60 dark:bg-emerald-950/20">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-3 w-3" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                Keep (Application Strengths)
              </span>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                Solid algorithm fundamentals, confident AI interview posture, and positive mentor
                review.
              </p>
            </div>
          </div>

          {/* Improve */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 dark:border-amber-950/60 dark:bg-amber-950/20">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                Improve (Enhancement Area)
              </span>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                Add quantified metrics from past projects (e.g., "reduced render latency by 35%")
                for impact.
              </p>
            </div>
          </div>

          {/* Practice Next */}
          <div className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2.5 dark:border-indigo-950/60 dark:bg-indigo-950/20">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0047AB] text-white">
              <ArrowRight className="h-3 w-3" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#0047AB] dark:text-[#66B2FF]">
                Next Step (Final Verdict)
              </span>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                Application status:{" "}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  Ready for Official Enterprise Referral & Submission
                </strong>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StartingPointSection() {
  const { t } = useTranslation();
  const entries = [
    { id: "first", icon: BriefcaseBusiness, to: "/enterprise/companies" },
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
