import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Headphones,
  Mail,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Square,
  Volume2,
  Waves,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  loadResponsiveVoice,
  resolveResponsiveVoiceName,
  stopResponsiveVoicePlayback,
} from "@/lib/tts-playground";
import {
  buildHoloboxCompetencyScript,
  CompetencyChartError,
  competencyLevelLabel,
  getApplicationsByEmail,
  getCompetencyResult,
  type CompetencyApplication,
  type CompetencyChart,
  type JourneySummary,
} from "@/services/competency-chart.manager";

type KioskStep = "search" | "applications" | "result";
type HoloboxDimension = "overview" | "technical" | "behavioral" | "journey";

const statusLabel: Record<CompetencyApplication["status"], string> = {
  IN_PROGRESS: "In progress",
  PASSED: "Passed",
  FAILED: "Failed",
  SOFT_FAILED: "Needs review",
};

const statusClass: Record<CompetencyApplication["status"], string> = {
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  PASSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  SOFT_FAILED: "bg-orange-50 text-orange-700 ring-orange-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatApplicationScore(score: number) {
  return score >= 0 ? `${Math.round(score)}/100` : "No score yet";
}

function KioskHeader({ step, onReset }: { step: KioskStep; onReset: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur sm:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
          <Waves className="h-5 w-5" strokeWidth={1.7} />
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-slate-950 uppercase">Inblue</p>
          <p className="text-xs text-slate-500">Holobox competency experience</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Kiosk ready
        </span>
        {step !== "search" && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-slate-500">
            <RotateCcw className="h-3.5 w-3.5" />
            Start over
          </Button>
        )}
      </div>
    </header>
  );
}

function StepRail({ activeStep }: { activeStep: KioskStep }) {
  const steps = [
    { key: "search" as const, label: "Enter email", detail: "Identify candidate" },
    {
      key: "applications" as const,
      label: "Choose application",
      detail: "Select a result to read",
    },
    { key: "result" as const, label: "Competency result", detail: "Charts & narration" },
  ];
  const activeIndex = steps.findIndex((step) => step.key === activeStep);

  return (
    <div className="flex items-center gap-2" aria-label="Kiosk progress">
      {steps.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                isDone
                  ? "bg-slate-950 text-white"
                  : isActive
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-100 text-slate-400"
              }`}>
              {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <span
              className={`hidden text-xs font-semibold md:block ${isActive ? "text-slate-950" : "text-slate-400"}`}>
              {step.label}
            </span>
            {index < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

function SearchStep({
  email,
  onEmailChange,
  onSubmit,
  isLoading,
  error,
}: {
  email: string;
  onEmailChange: (_value: string) => void;
  onSubmit: (_event: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
      <section>
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
          <Activity className="h-3.5 w-3.5" />
          View assessment results
        </div>
        <h1 className="max-w-xl text-4xl font-bold tracking-[-0.035em] text-slate-950 sm:text-6xl">
          Discover your potential.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
          Enter the email used during the hiring journey so Holobox can display and narrate your
          competency summary.
        </p>

        <form onSubmit={onSubmit} className="mt-10 max-w-xl">
          <label
            htmlFor="candidate-email"
            className="mb-2 block text-sm font-semibold text-slate-700">
            Candidate email
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="candidate-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="candidate@example.com"
                autoComplete="email"
                className="h-14 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-12 text-base text-slate-950 transition outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60">
              {isLoading ? "Searching..." : "Find applications"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>

        <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Your information is only used to find the correct assessment.
        </p>
      </section>

      <aside className="relative overflow-hidden rounded-2xl bg-slate-950 p-7 text-white shadow-xl shadow-slate-200/80 sm:p-9">
        <div className="absolute -top-14 -right-14 h-44 w-44 rounded-full border border-cyan-400/20" />
        <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full border border-cyan-400/20" />
        <div className="relative">
          <div className="mb-16 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Holobox flow
            </span>
            <Headphones className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="space-y-7">
            {[
              ["01", "Find the candidate", "Verify with email"],
              ["02", "Choose an application", "Each role is a different journey"],
              ["03", "Hear the result", "Charts become a spoken story"],
            ].map(([number, title, description], index) => (
              <div key={number} className="flex gap-4">
                <span className="font-mono text-xs text-cyan-400">{number}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-slate-400">{description}</p>
                </div>
                {index < 2 && <div className="ml-auto hidden h-8 w-px bg-slate-800 sm:block" />}
              </div>
            ))}
          </div>
          <div className="mt-14 border-t border-slate-800 pt-5 text-xs text-slate-500">
            Tap to begin · The experience takes about 2 minutes
          </div>
        </div>
      </aside>
    </main>
  );
}

function ApplicationsStep({
  email,
  applications,
  selectedId,
  isLoading,
  onSelect,
  onBack,
}: {
  email: string;
  applications: CompetencyApplication[];
  selectedId: number | null;
  isLoading: boolean;
  onSelect: (_application: CompetencyApplication) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" />
        Change email
      </button>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-cyan-700">
            Found {applications.length} application{applications.length === 1 ? "" : "s"}
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl">
            Choose an application to explore
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Results for <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Search className="h-4 w-4" /> Tap a result to continue
        </div>
      </div>

      <div className="space-y-3">
        {applications.map((application) => {
          const isSelected = selectedId === application.id;
          return (
            <button
              type="button"
              key={application.id}
              onClick={() => onSelect(application)}
              disabled={isLoading}
              className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border bg-white p-5 text-left transition sm:grid-cols-[auto_1fr_auto_auto] sm:gap-6 sm:p-6 ${isSelected ? "border-cyan-400 ring-4 ring-cyan-50" : "border-slate-200 hover:border-slate-400 hover:shadow-md"} ${isLoading && !isSelected ? "opacity-50" : ""}`}>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl font-mono text-sm font-bold ${isSelected ? "bg-cyan-400 text-slate-950" : "bg-slate-100 text-slate-500"}`}>
                #{application.id}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-950">
                  {application.applicationName ?? `Application #${application.id}`}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Application #{application.id} · Job description{" "}
                  <span className="font-mono text-slate-700">#{application.jdId}</span> · Created{" "}
                  {formatDate(application.createdAt)}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  Overall score
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {formatApplicationScore(application.overallScore)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:inline-flex ${statusClass[application.status]}`}>
                  {statusLabel[application.status]}
                </span>
                {isSelected && isLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-600" />
                ) : (
                  <ArrowRight
                    className={`h-5 w-5 transition group-hover:translate-x-1 ${isSelected ? "text-cyan-600" : "text-slate-300"}`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-cyan-700";
  return "text-amber-600";
}

function compactSkillName(value: string) {
  return value
    .replace(/^Software\s+/i, "")
    .replace(/\s+Skills?$/i, "")
    .replace(/^Team Participation$/i, "Teamwork");
}

function HoloboxRobot({
  score,
  level,
  isSpeaking,
  activeDimension,
  onDimensionSelect,
}: {
  score: number;
  level: string;
  isSpeaking: boolean;
  activeDimension: HoloboxDimension;
  onDimensionSelect: (_dimension: HoloboxDimension) => void;
}) {
  const dimensions: Array<{ key: HoloboxDimension; label: string; detail: string }> = [
    { key: "overview", label: "CORE", detail: "Overview" },
    { key: "technical", label: "TECH", detail: "Technical" },
    { key: "behavioral", label: "HUMAN", detail: "Behavioral" },
    { key: "journey", label: "PATH", detail: "Journey" },
  ];

  return (
    <div className={`holobox-robot-stage ${isSpeaking ? "is-speaking" : ""}`}>
      <div className="holobox-robot-grid" aria-hidden="true" />
      <div className="holobox-robot-halo holobox-robot-halo-one" aria-hidden="true" />
      <div className="holobox-robot-halo holobox-robot-halo-two" aria-hidden="true" />
      <div className="holobox-robot-orbit holobox-robot-orbit-one" aria-hidden="true">
        <span className="holobox-robot-orb holobox-robot-orb-one" />
      </div>
      <div className="holobox-robot-orbit holobox-robot-orbit-two" aria-hidden="true">
        <span className="holobox-robot-orb holobox-robot-orb-two" />
      </div>

      {dimensions.map((dimension) => (
        <button
          type="button"
          key={dimension.key}
          className={`holobox-dimension-node holobox-dimension-node-${dimension.key} ${activeDimension === dimension.key ? "is-active" : ""}`}
          onClick={() => onDimensionSelect(dimension.key)}
          aria-label={`Show ${dimension.detail} report`}>
          <span className="holobox-dimension-node-dot" />
          <span>
            <strong>{dimension.label}</strong>
            <small>{dimension.detail}</small>
          </span>
        </button>
      ))}

      <div className="holobox-robot-data holobox-robot-data-one">
        <span>NEURAL LINK</span>
        <strong>ACTIVE</strong>
      </div>
      <div className="holobox-robot-data holobox-robot-data-two">
        <span>CORE INDEX</span>
        <strong>{Math.round(score).toString().padStart(2, "0")}</strong>
      </div>

      <div className={`holobox-robot ${isSpeaking ? "is-speaking" : ""}`} aria-hidden="true">
        <div className="holobox-robot-antenna">
          <span />
        </div>
        <div className="holobox-robot-head">
          <span className="holobox-robot-ear holobox-robot-ear-left" />
          <span className="holobox-robot-ear holobox-robot-ear-right" />
          <div className="holobox-robot-face">
            <div className="holobox-robot-brow" />
            <div className="holobox-robot-eyes">
              <span />
              <span />
            </div>
            <div className="holobox-robot-mouth" />
            <div className="holobox-robot-scanline" />
          </div>
        </div>
        <div className="holobox-robot-neck" />
        <div className="holobox-robot-body">
          <div className="holobox-robot-shoulder holobox-robot-shoulder-left" />
          <div className="holobox-robot-shoulder holobox-robot-shoulder-right" />
          <div className="holobox-robot-chest">
            <span className="holobox-robot-chest-label">INBLUE / SYNTH</span>
            <strong>{level}</strong>
            <div className="holobox-robot-core">
              <span />
            </div>
          </div>
          <div className="holobox-robot-arm holobox-robot-arm-left" />
          <div className="holobox-robot-arm holobox-robot-arm-right" />
        </div>
      </div>
      <div className="holobox-robot-floor" />
      <div className="holobox-robot-floor-shadow" />
    </div>
  );
}

function ResultStep({
  chart,
  journey,
  onBack,
}: {
  chart: CompetencyChart;
  journey: JourneySummary | null;
  onBack: () => void;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isScriptExpanded, setIsScriptExpanded] = useState(false);
  const [activeDimension, setActiveDimension] = useState<HoloboxDimension>("overview");
  const [isFullMode, setIsFullMode] = useState(false);
  const script = useMemo(() => buildHoloboxCompetencyScript(chart, journey), [chart, journey]);
  const isVi = useMemo(
    () => /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(script),
    [script]
  );
  const radarData = useMemo(
    () => [
      ...chart.technicalSkillAreas.map((item) => ({
        subject: item.skillArea,
        label: compactSkillName(item.skillArea),
        category: "Technical",
        score: item.score,
        fullMark: 100,
        sourceRounds: item.sourceRounds,
      })),
      ...chart.behavioralSkills.map((item) => ({
        subject: item.skillName,
        label: compactSkillName(item.skillName),
        category: "Behavioral",
        score: item.score,
        fullMark: 100,
        sourceRounds: item.sourceRounds,
      })),
    ],
    [chart]
  );
  const activeChartData = useMemo(() => {
    if (activeDimension === "technical") {
      return radarData.filter((item) => item.category === "Technical");
    }
    if (activeDimension === "behavioral") {
      return radarData.filter((item) => item.category === "Behavioral");
    }
    return radarData;
  }, [activeDimension, radarData]);
  const activeDimensionCopy: Record<HoloboxDimension, { kicker: string; title: string }> = {
    overview: { kicker: "Core dimension", title: "Competency radar" },
    technical: { kicker: "Technical dimension", title: "Technical radar" },
    behavioral: { kicker: "Human dimension", title: "Behavioral radar" },
    journey: { kicker: "Journey dimension", title: "Assessment journey" },
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopResponsiveVoicePlayback();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullMode(false);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullMode = async () => {
    if (isFullMode) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined);
      }
      setIsFullMode(false);
      return;
    }

    setIsFullMode(true);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // The immersive overlay remains usable when kiosk policies block fullscreen.
    }
  };

  const speakWithBrowserVoice = () => {
    if (!("speechSynthesis" in window)) return false;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return true;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = isVi ? "vi-VN" : "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1;
    const availableVoices = window.speechSynthesis.getVoices();
    const selectedVoice = isVi
      ? availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("vi"))
      : availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const speak = async () => {
    if (isVoiceLoading) return;
    if (isSpeaking) {
      stopResponsiveVoicePlayback();
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    setIsVoiceLoading(true);
    try {
      const responsiveVoice = await loadResponsiveVoice();
      const lang = isVi ? "vi-VN" : "en-US";
      responsiveVoice.speak(script, resolveResponsiveVoiceName(lang, "female"), {
        rate: 0.95,
        pitch: 1.0,
        volume: 1,
        onstart: () => setIsSpeaking(true),
        onend: () => setIsSpeaking(false),
        onerror: () => setIsSpeaking(false),
      });
    } catch {
      const started = speakWithBrowserVoice();
      if (!started) setIsSpeaking(false);
    } finally {
      setIsVoiceLoading(false);
    }
  };

  return (
    <main
      className={`holobox-result-page mx-auto w-full max-w-[3600px] px-5 py-6 sm:px-8 sm:py-8 xl:px-10 ${isFullMode ? "is-full-mode" : ""}`}>
      {isFullMode ? (
        <div className="holobox-full-mode-bar">
          <div>
            <p className="holobox-full-mode-kicker">Inblue / Holobox theatre</p>
            <strong>Immersive competency workspace</strong>
          </div>
          <div className="holobox-full-mode-actions">
            <Button
              onClick={speak}
              disabled={isVoiceLoading}
              className={`holobox-full-mode-voice ${isSpeaking ? "is-speaking" : ""}`}>
              {isSpeaking ? (
                <Square className="mr-2.5 h-4 w-4 fill-current" />
              ) : (
                <Volume2 className="mr-2.5 h-4 w-4" />
              )}
              {isSpeaking ? "Stop voice" : "Read result"}
            </Button>
            <Button onClick={toggleFullMode} className="holobox-full-mode-exit">
              <Minimize2 className="mr-2.5 h-4 w-4" />
              Exit full mode
            </Button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" />
        Back to applications
      </button>

      {/* ── Unified Command Deck: merged Overall Score + AI Operator + Radar ── */}
      <section className="holobox-command-deck holobox-command-deck--unified">
        {/* Top bar: score info left, audio button right */}
        <div className="holobox-unified-topbar flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <h1 className="holobox-unified-name m-0 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {chart.candidateName}
            </h1>
            <span className="holobox-unified-level rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 shadow-2xs sm:text-xs">
              {competencyLevelLabel[chart.overallLevel]}
            </span>
            <div className="holobox-unified-score-block flex items-center gap-1.5 rounded-xl border border-cyan-200/90 bg-cyan-50/90 px-3 py-1 text-cyan-950 shadow-2xs">
              <span className="text-[10px] font-bold tracking-wider text-cyan-700 uppercase">
                Score
              </span>
              <span className="text-xl leading-none font-black text-cyan-900 sm:text-2xl">
                {Math.round(chart.overallScore)}
              </span>
              <span className="text-xs font-bold text-cyan-700">/100</span>
            </div>
          </div>
          {!isFullMode ? (
            <div className="holobox-unified-actions flex items-center gap-3">
              <Button
                onClick={toggleFullMode}
                className="holobox-unified-action-btn"
                title="Full mode">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={speak}
                disabled={isVoiceLoading}
                className={`holobox-unified-voice-btn ${isSpeaking ? "is-speaking" : ""}`}>
                {isVoiceLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : isSpeaking ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span className="holobox-unified-voice-label font-bold">
                  {isVoiceLoading
                    ? isVi
                      ? "Chuẩn bị..."
                      : "Loading..."
                    : isSpeaking
                      ? isVi
                        ? "Dừng"
                        : "Stop"
                      : isVi
                        ? "Nghe"
                        : "Listen"}
                </span>
              </Button>
            </div>
          ) : null}
        </div>

        {/* Main content: operator center, radar right */}
        <div className="holobox-unified-body">
          {/* AI Operator (center) */}
          <div className="holobox-operator-bay holobox-operator-bay--unified">
            <div className="holobox-operator-topline">
              <span>AI operator</span>
              <span className="holobox-operator-live">
                <i /> Speaking simulation
              </span>
            </div>
            <HoloboxRobot
              score={chart.overallScore}
              level={competencyLevelLabel[chart.overallLevel]}
              isSpeaking={isSpeaking}
              activeDimension={activeDimension}
              onDimensionSelect={setActiveDimension}
            />
            <div className="holobox-operator-caption">
              <div className="holobox-operator-status">
                <span
                  className={`holobox-operator-status-dot ${isSpeaking ? "is-speaking" : ""}`}
                />
                <strong>{isSpeaking ? "Speaking..." : "Ready to narrate"}</strong>
              </div>
              <div className="holobox-wave" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
            </div>
          </div>

          {/* Radar chart (right) */}
          <div className="holobox-radar-panel holobox-radar-panel--unified">
            <div className="mb-1.5 flex items-start justify-between">
              <div>
                <p className="mb-0.5 text-[10px] font-bold tracking-[0.18em] text-cyan-600 uppercase">
                  {activeDimensionCopy[activeDimension].kicker}
                </p>
                <h2 className="font-bold text-slate-950">
                  {activeDimensionCopy[activeDimension].title}
                </h2>
              </div>
              <div className="holobox-radar-status">
                <span /> {activeChartData.length} signals
              </div>
            </div>
            <div className="mb-1.5 flex flex-wrap gap-2">
              {(["overview", "technical", "behavioral", "journey"] as HoloboxDimension[]).map(
                (dimension) => (
                  <button
                    key={dimension}
                    type="button"
                    onClick={() => setActiveDimension(dimension)}
                    className={`holobox-dimension-tab ${activeDimension === dimension ? "is-active" : ""}`}>
                    {dimension === "overview"
                      ? "Core"
                      : dimension === "technical"
                        ? "Technical"
                        : dimension === "behavioral"
                          ? "Behavioral"
                          : "Journey"}
                  </button>
                )
              )}
            </div>
            <div className="mb-1.5 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                Technical
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Behavioral
              </span>
            </div>
            {activeChartData.length > 0 && activeDimension !== "journey" ? (
              <>
                <div className="holobox-radar-stage h-[240px] w-full sm:h-[260px]">
                  <div className="holobox-radar-floor" aria-hidden="true" />
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={activeChartData} outerRadius="75%">
                      <PolarGrid
                        stroke={isFullMode ? "#67a4b5" : "#0891b2"}
                        strokeOpacity={0.35}
                        gridType="polygon"
                      />
                      <PolarAngleAxis
                        dataKey="label"
                        tick={({ x, y, payload }) => {
                          // Push top vertex label slightly higher for crisp clearance
                          return (
                            <text
                              x={x}
                              y={y}
                              fill={isFullMode ? "#0e7490" : "#0f172a"}
                              fontSize={12}
                              fontWeight={800}
                              textAnchor="middle">
                              {payload.value}
                            </text>
                          );
                        }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tickCount={6}
                        angle={30}
                        axisLine={false}
                        stroke="transparent"
                        tick={({ x, y, payload }) => {
                          // Hide 100 to prevent outer rim clutter, render 0..80 along 30deg diagonal
                          if (payload.value === 100) return null;
                          return (
                            <text
                              x={x}
                              y={y}
                              dx={4}
                              fill={isFullMode ? "#0891b2" : "#0284c7"}
                              fontSize={10}
                              fontWeight={700}
                              textAnchor="start"
                              transform={`rotate(0, ${x}, ${y})`}>
                              {payload.value}
                            </text>
                          );
                        }}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke={isFullMode ? "#0891b2" : "#0284c7"}
                        fill={isFullMode ? "#22d3ee" : "#38bdf8"}
                        fillOpacity={0.35}
                        strokeWidth={3}
                        dot={{ r: 4, fill: isFullMode ? "#0e7490" : "#0284c7", strokeWidth: 0 }}
                      />
                      <Tooltip
                        labelFormatter={(label) =>
                          activeChartData.find((item) => item.label === label)?.subject ?? label
                        }
                        formatter={(value) => [`${Number(value).toFixed(2)}/100`, "Score"]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 border-t border-cyan-950/10 pt-2 sm:grid-cols-4">
                  {activeChartData.map((item) => (
                    <div
                      key={`${item.category}-${item.subject}`}
                      className="rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-600">
                          {item.label}
                        </span>
                        <span className={`text-sm font-bold ${scoreTone(item.score)}`}>
                          {item.score}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {item.category} &middot; {item.sourceRounds.join(" \u00b7 ")}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="holobox-journey-preview flex min-h-[300px] flex-col justify-center">
                <p className="text-xs font-bold tracking-[0.16em] text-cyan-600 uppercase">
                  AI operator feed
                </p>
                <p className="mt-3 max-w-lg text-lg leading-7 font-semibold text-slate-800">
                  {journey?.narrative?.trim() || "No detailed journey summary is available yet."}
                </p>
                <p className="mt-4 text-xs font-medium text-slate-500">
                  The center operator is ready to narrate this dimension.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Behavioral skills</h2>
              <p className="mt-1 text-sm text-slate-500">
                What was observed throughout the assessment
              </p>
            </div>
            <Activity className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="space-y-5">
            {chart.behavioralSkills.length > 0 ? (
              chart.behavioralSkills.map((item) => (
                <div key={item.skillName}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-700">{item.skillName}</span>
                    <span className={`font-bold ${scoreTone(item.score)}`}>
                      {Math.round(item.score)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-cyan-500 transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">
                    Source: {item.sourceRounds.join(" · ") || "Summary"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No behavioral data available.</p>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-cyan-50 p-6 sm:p-7">
          <div className="absolute -right-10 -bottom-10 h-36 w-36 rounded-full border-[18px] border-cyan-100" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-cyan-700 shadow-sm">
                <Volume2 className="h-5 w-5" />
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-cyan-800 shadow-xs">
                <Volume2 className="h-3.5 w-3.5" />
                {isVi ? "Giọng đọc tự nhiên" : "Natural voice"}
              </span>
            </div>
            <div className="holobox-wave mt-7" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <span key={index} />
              ))}
            </div>

            <div className="relative mt-7">
              <p
                className={`text-lg leading-7 font-semibold text-slate-950 transition-all duration-300 ${
                  !isScriptExpanded ? "line-clamp-4" : ""
                }`}>
                “{script}”
              </p>
              {script.length > 180 && (
                <button
                  type="button"
                  onClick={() => setIsScriptExpanded(!isScriptExpanded)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-800 transition hover:text-cyan-950">
                  {isScriptExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      {isVi ? "Thu gọn script" : "Collapse script"}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      {isVi ? "Xem thêm script" : "Expand script"}
                    </>
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={speak}
              className="mt-7 flex items-center gap-2 text-sm font-bold text-cyan-800 transition hover:text-cyan-950">
              {isSpeaking ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}{" "}
              {isSpeaking
                ? isVi
                  ? "Đang đọc kết quả"
                  : "Reading result"
                : isVi
                  ? "Nghe tóm tắt"
                  : "Listen to summary"}
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-cyan-700 uppercase">
                AI journey narrative
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Competency story</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              Journey summary
            </span>
          </div>
          <p className="text-[15px] leading-7 text-slate-600">
            {journey?.narrative?.trim() || "No detailed journey summary is available yet."}
          </p>
          {(journey?.swecomAssessments?.length ?? 0) > 0 && (
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
              {journey?.swecomAssessments?.slice(0, 3).map((item) => (
                <div key={item.skillArea} className="rounded-xl bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-slate-700">{item.skillArea}</span>
                    <span className={`font-bold ${scoreTone(item.score)}`}>{item.score}/100</span>
                  </div>
                  {item.evidenceSummary && (
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      {item.evidenceSummary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-violet-700 uppercase">
                Next moves
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Development recommendations</h2>
            </div>
            <ArrowRight className="h-5 w-5 text-violet-500" />
          </div>
          {(journey?.developmentRecommendations?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              {journey?.developmentRecommendations?.slice(0, 3).map((item) => (
                <div
                  key={`${item.targetSkillArea}-${item.targetLevel}`}
                  className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-bold text-slate-800">{item.targetSkillArea}</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.recommendation}</p>
                  <span className="mt-2 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                    Target: {competencyLevelLabel[item.targetLevel]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              No detailed recommendations are available for this application.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

export function CompetencyKioskPage() {
  const [step, setStep] = useState<KioskStep>("search");
  const [email, setEmail] = useState("");
  const [applications, setApplications] = useState<CompetencyApplication[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [chart, setChart] = useState<CompetencyChart | null>(null);
  const [journey, setJourney] = useState<JourneySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    window.speechSynthesis?.cancel();
    setStep("search");
    setEmail("");
    setApplications([]);
    setSelectedId(null);
    setChart(null);
    setJourney(null);
    setError(null);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await getApplicationsByEmail(email);
      if (result.length === 0) {
        setError("This email has no applications to display.");
        return;
      }
      const activeApplications = result.filter((application) => !application.isDeleted);
      if (activeApplications.length === 0) {
        setError("The applications for this email are no longer available.");
        return;
      }
      setApplications(activeApplications);
      setStep("applications");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to find applications right now."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (application: CompetencyApplication) => {
    setSelectedId(application.id);
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCompetencyResult(application.id);
      setChart(result.chart);
      setJourney(result.journey);
      setStep("result");
    } catch (requestError) {
      const isNotReady =
        requestError instanceof CompetencyChartError && requestError.status === 404;
      setError(
        isNotReady
          ? "The competency report is still being generated. Please try again in a few minutes."
          : requestError instanceof Error
            ? requestError.message
            : "Unable to load the competency report."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const backToApplications = () => {
    window.speechSynthesis?.cancel();
    setError(null);
    setChart(null);
    setJourney(null);
    setStep("applications");
  };

  return (
    <div className="min-h-[100dvh] bg-[#f7fafc] text-slate-950">
      <KioskHeader step={step} onReset={reset} />
      <div className="border-b border-slate-200/70 bg-white px-6 py-3 sm:px-10">
        <div className="mx-auto flex max-w-[1400px] justify-end">
          <StepRail activeStep={step} />
        </div>
      </div>
      {step === "search" && (
        <SearchStep
          email={email}
          onEmailChange={setEmail}
          onSubmit={handleSearch}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === "applications" && (
        <ApplicationsStep
          email={email}
          applications={applications}
          selectedId={selectedId}
          isLoading={isLoading}
          onSelect={handleSelect}
          onBack={() => {
            setError(null);
            setStep("search");
          }}
        />
      )}
      {step === "applications" && error && (
        <div
          role="alert"
          className="mx-auto -mt-5 mb-8 flex max-w-5xl items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {step === "result" && chart && (
        <ResultStep chart={chart} journey={journey} onBack={backToApplications} />
      )}
    </div>
  );
}
