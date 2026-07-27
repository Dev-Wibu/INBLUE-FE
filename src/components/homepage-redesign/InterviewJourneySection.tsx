import { motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  BriefcaseBusiness,
  Bug,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileScan,
  Mail,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type RoundState = "required" | "ai" | "mentor" | "skipped";

type InterviewRound = {
  title: string;
  description: string;
  icon: typeof ClipboardList;
  state: RoundState;
  score?: number;
  x: number;
  y: number;
};

const stateStyles: Record<RoundState, string> = {
  required:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300",
  ai: "border-[#0047AB]/25 bg-[#0047AB]/10 text-[#0047AB] dark:border-[#66B2FF]/25 dark:bg-[#66B2FF]/10 dark:text-[#66B2FF]",
  mentor:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  skipped:
    "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500",
};

export function InterviewJourneySection() {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const rounds: InterviewRound[] = [
    {
      title: t("landingRefactor.roundQuizTitle"),
      description: t("landingRefactor.roundQuizDesc"),
      icon: ClipboardList,
      state: "required",
      x: 8,
      y: 42,
    },
    {
      title: t("landingRefactor.roundCvTitle"),
      description: t("landingRefactor.roundCvDesc"),
      icon: FileScan,
      state: "ai",
      score: 76,
      x: 21,
      y: 42,
    },
    {
      title: t("landingRefactor.roundCodingTitle"),
      description: t("landingRefactor.roundCodingDesc"),
      icon: Code2,
      state: "required",
      x: 34,
      y: 42,
    },
    {
      title: t("landingRefactor.roundCodeReviewTitle"),
      description: t("landingRefactor.roundCodeReviewDesc"),
      icon: Bug,
      state: "ai",
      score: 71,
      x: 48,
      y: 42,
    },
    {
      title: t("landingRefactor.roundEmailTitle"),
      description: t("landingRefactor.roundEmailDesc"),
      icon: Mail,
      state: "ai",
      score: 80,
      x: 62,
      y: 42,
    },
    {
      title: t("landingRefactor.roundMentorTitle"),
      description: t("landingRefactor.roundMentorDesc"),
      icon: UserCheck,
      state: "mentor",
      x: 76,
      y: 42,
    },
    {
      title: t("landingRefactor.roundAiTitle"),
      description: t("landingRefactor.roundAiDesc"),
      icon: Bot,
      state: "skipped",
      x: 89,
      y: 42,
    },
  ];

  const scoredRounds = rounds.filter((round) => round.state === "ai");
  const activeRounds = rounds.filter((round) => round.state !== "skipped").length;

  return (
    <section className="bg-white py-14 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white dark:border-slate-800"
          initial={shouldReduceMotion ? false : { opacity: 0.98, y: 8 }}
          whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#66B2FF]">
                {t("landingRefactor.processStudio")}
              </p>
              <h2 className="mt-1 max-w-2xl text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
                {t("landingRefactor.journeyTitle")}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-slate-200">
                {t("landingRefactor.processConfigured")}
              </span>
              <span className="rounded-full bg-[#66B2FF] px-3 py-1.5 text-xs font-bold text-slate-950">
                {activeRounds}/7 {t("landingRefactor.processRounds")}
              </span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[250px_minmax(0,1fr)_320px]">
            <aside className="border-b border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:border-r lg:border-b-0">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#66B2FF] text-slate-950">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      {t("landingRefactor.processSampleJd")}
                    </p>
                    <p className="text-sm font-bold">{t("landingRefactor.artifactTitle")}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  {t("landingRefactor.journeyDescription")}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
                <StatusLegend label={t("landingRefactor.statusRequired")} state="required" />
                <StatusLegend label={t("landingRefactor.statusAiScored")} state="ai" />
                <StatusLegend label={t("landingRefactor.roundMentorTitle")} state="mentor" />
                <StatusLegend label={t("landingRefactor.statusSkipped")} state="skipped" />
              </div>
            </aside>

            <div className="relative min-h-[420px] p-5 sm:p-6 lg:min-h-[470px]">
              <div className="relative hidden h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:block">
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 720 360" fill="none">
                  <path
                    d="M58 158 H675"
                    stroke="rgb(71 85 105 / 0.75)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <motion.path
                    d="M58 158 H628"
                    stroke="#66B2FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={shouldReduceMotion ? false : { pathLength: 0 }}
                    whileInView={shouldReduceMotion ? undefined : { pathLength: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </svg>

                {rounds.map((round, index) => (
                  <RoundNode
                    key={round.title}
                    index={index}
                    round={round}
                    shouldReduceMotion={shouldReduceMotion}
                  />
                ))}

                <div className="absolute right-6 bottom-6 left-6 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-400">
                    {t("landingRefactor.processConfigured")}
                  </p>
                  <p className="text-xs font-bold text-[#66B2FF]">
                    {activeRounds}/7 {t("landingRefactor.processRounds")}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:hidden">
                {rounds.map((round, index) => {
                  const RoundIcon = round.icon;
                  const isSkipped = round.state === "skipped";

                  return (
                    <motion.article
                      key={round.title}
                      className={`flex gap-4 rounded-xl border p-4 ${
                        isSkipped
                          ? "border-dashed border-white/10 bg-white/[0.02] opacity-60"
                          : "border-white/10 bg-white/[0.06]"
                      }`}
                      initial={false}
                      whileInView={shouldReduceMotion ? undefined : { x: [0, -2, 0] }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: index * 0.03, duration: 0.25 }}>
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${stateStyles[round.state]}`}>
                        <RoundIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="font-bold">{round.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{round.description}</p>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-white p-5 text-slate-950 sm:p-6 lg:border-t-0 lg:border-l dark:bg-slate-900 dark:text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
                    {t("landingRefactor.processAiScored")}
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight">
                    {t("landingRefactor.analysisTitle")}
                  </h3>
                </div>
                <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("landingRefactor.analysisDescription")}
              </p>

              <div className="mt-6 space-y-3">
                {scoredRounds.map((round) => (
                  <div
                    key={round.title}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{round.title}</p>
                      <span className="font-mono text-xs font-bold text-[#0047AB] dark:text-[#66B2FF]">
                        {round.score}/100
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-[#0047AB] dark:bg-[#66B2FF]"
                        style={{ width: `${round.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatusLegend({ label, state }: { label: string; state: RoundState }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">
      <span className={`h-2 w-2 rounded-full border ${stateStyles[state]}`} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function RoundNode({
  index,
  round,
  shouldReduceMotion,
}: {
  index: number;
  round: InterviewRound;
  shouldReduceMotion: boolean | null;
}) {
  const RoundIcon = round.icon;
  const isSkipped = round.state === "skipped";
  const labelOffset = index % 2 === 0 ? "top-16" : "bottom-16";

  return (
    <motion.div
      className="absolute"
      style={{ left: `${round.x}%`, top: `${round.y}%`, transform: "translate(-50%, -50%)" }}
      initial={false}
      whileInView={shouldReduceMotion ? undefined : { y: [0, -3, 0] }}
      whileHover={shouldReduceMotion || isSkipped ? undefined : { scale: 1.03 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ delay: index * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${stateStyles[round.state]}`}>
        <RoundIcon className="h-5 w-5" />
      </div>
      <div className={`absolute left-1/2 w-28 -translate-x-1/2 ${labelOffset}`}>
        <p className="mb-1 text-center text-[11px] font-semibold text-slate-400">
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="text-center text-sm leading-5 font-bold text-white">{round.title}</h3>
      </div>
    </motion.div>
  );
}
