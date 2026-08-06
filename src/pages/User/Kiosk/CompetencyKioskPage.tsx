import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Headphones,
  Mail,
  Play,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Square,
  UserRound,
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

const statusLabel: Record<CompetencyApplication["status"], string> = {
  IN_PROGRESS: "Đang thực hiện",
  PASSED: "Đã hoàn thành",
  FAILED: "Chưa đạt",
  SOFT_FAILED: "Cần xem lại",
};

const statusClass: Record<CompetencyApplication["status"], string> = {
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200",
  PASSED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  FAILED: "bg-rose-50 text-rose-700 ring-rose-200",
  SOFT_FAILED: "bg-orange-50 text-orange-700 ring-orange-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
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
          Kiosk sẵn sàng
        </span>
        {step !== "search" && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-slate-500">
            <RotateCcw className="h-3.5 w-3.5" />
            Bắt đầu lại
          </Button>
        )}
      </div>
    </header>
  );
}

function StepRail({ activeStep }: { activeStep: KioskStep }) {
  const steps = [
    { key: "search" as const, label: "Nhập email", detail: "Xác định ứng viên" },
    { key: "applications" as const, label: "Chọn hồ sơ", detail: "Chọn application cần đọc" },
    { key: "result" as const, label: "Kết quả năng lực", detail: "Biểu đồ & giọng đọc" },
  ];
  const activeIndex = steps.findIndex((step) => step.key === activeStep);

  return (
    <div className="flex items-center gap-2" aria-label="Tiến trình kiosk">
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
          Xem kết quả đánh giá
        </div>
        <h1 className="max-w-xl text-4xl font-bold tracking-[-0.035em] text-slate-950 sm:text-6xl">
          Khám phá năng lực của bạn.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-7 text-slate-500 sm:text-lg">
          Nhập email đã dùng trong quy trình tuyển dụng để Holobox hiển thị và đọc bản tổng hợp năng
          lực.
        </p>

        <form onSubmit={onSubmit} className="mt-10 max-w-xl">
          <label
            htmlFor="candidate-email"
            className="mb-2 block text-sm font-semibold text-slate-700">
            Email ứng viên
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
              {isLoading ? "Đang tìm..." : "Tìm hồ sơ"}
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
          Thông tin chỉ được dùng để tìm đúng hồ sơ đánh giá.
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
              ["01", "Tìm đúng ứng viên", "Xác thực bằng email"],
              ["02", "Chọn application", "Mỗi vị trí là một hành trình riêng"],
              ["03", "Nghe kết quả", "Biểu đồ được đọc thành lời"],
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
            Chạm để bắt đầu · Thời lượng trải nghiệm khoảng 2 phút
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
        Đổi email
      </button>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-cyan-700">
            Đã tìm thấy {applications.length} hồ sơ
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl">
            Chọn application muốn xem
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Kết quả cho <span className="font-medium text-slate-700">{email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Search className="h-4 w-4" /> Chạm vào một hồ sơ để tiếp tục
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
                  Application #{application.id}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Job description{" "}
                  <span className="font-mono text-slate-700">#{application.jdId}</span> · Tạo ngày{" "}
                  {formatDate(application.createdAt)}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
                  Điểm tổng
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {Math.round(application.overallScore)}
                  <span className="text-sm font-medium text-slate-400">/100</span>
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

type VoiceProfile = "deep" | "clear";

const voiceProfileCopy: Record<VoiceProfile, { label: string; rate: number; pitch: number }> = {
  deep: { label: "Giọng trầm", rate: 0.84, pitch: 0.78 },
  clear: { label: "Giọng rõ", rate: 0.98, pitch: 1.08 },
};

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
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>("deep");
  const [voiceEngine, setVoiceEngine] = useState<"responsive" | "browser">("responsive");
  const script = useMemo(() => buildHoloboxCompetencyScript(chart, journey), [chart, journey]);
  const radarData = useMemo(
    () => [
      ...chart.technicalSkillAreas.map((item) => ({
        subject: item.skillArea,
        label: compactSkillName(item.skillArea),
        category: "Kỹ thuật",
        score: item.score,
        fullMark: 100,
        sourceRounds: item.sourceRounds,
      })),
      ...chart.behavioralSkills.map((item) => ({
        subject: item.skillName,
        label: compactSkillName(item.skillName),
        category: "Hành vi",
        score: item.score,
        fullMark: 100,
        sourceRounds: item.sourceRounds,
      })),
    ],
    [chart]
  );

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const syncVoices = () => {
      const availableVoices = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang.toLowerCase().startsWith("vi"));
      setVoices(availableVoices);
      setSelectedVoiceName((current) => current || availableVoices[0]?.name || "");
    };

    syncVoices();
    window.speechSynthesis.addEventListener("voiceschanged", syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", syncVoices);
      window.speechSynthesis.cancel();
      stopResponsiveVoicePlayback();
    };
  }, []);

  const speakWithBrowserVoice = () => {
    if (!("speechSynthesis" in window)) return false;
    setVoiceEngine("browser");
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return true;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = "vi-VN";
    utterance.rate = voiceProfileCopy[voiceProfile].rate;
    utterance.pitch = voiceProfileCopy[voiceProfile].pitch;
    utterance.volume = 1;
    const selectedVoice = voices.find((voice) => voice.name === selectedVoiceName);
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

    setIsVoiceLoading(true);
    try {
      const responsiveVoice = await loadResponsiveVoice();
      setVoiceEngine("responsive");
      responsiveVoice.speak(script, resolveResponsiveVoiceName("vi-VN"), {
        rate: voiceProfileCopy[voiceProfile].rate,
        pitch: voiceProfileCopy[voiceProfile].pitch,
        volume: 1,
        onstart: () => setIsSpeaking(true),
        onend: () => setIsSpeaking(false),
        onerror: () => setIsSpeaking(false),
      });
    } catch {
      speakWithBrowserVoice();
    } finally {
      setIsVoiceLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 py-6 sm:px-10 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách application
      </button>

      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-700">
            <span className="h-2 w-2 rounded-full bg-cyan-500" /> Báo cáo đã sẵn sàng
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            {chart.candidateName}
          </h1>
          <p className="mt-2 text-base text-slate-500">
            {chart.jobTitle} <span className="mx-2 text-slate-300">/</span> Application #
            {chart.applicationId}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-sm">
          <span className="px-3 text-slate-500">Holobox audio</span>
          <div
            className="flex rounded-lg bg-slate-100 p-1"
            role="group"
            aria-label="Kiểu giọng đọc">
            {(Object.keys(voiceProfileCopy) as VoiceProfile[]).map((profile) => (
              <button
                type="button"
                key={profile}
                onClick={() => setVoiceProfile(profile)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${voiceProfile === profile ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                {voiceProfileCopy[profile].label}
              </button>
            ))}
          </div>
          <select
            aria-label="Chọn giọng dự phòng tiếng Việt"
            value={selectedVoiceName}
            onChange={(event) => setSelectedVoiceName(event.target.value)}
            disabled={voices.length === 0}
            className="h-9 max-w-[170px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 outline-none focus:border-cyan-500">
            {voices.length === 0 ? (
              <option>Giọng của thiết bị</option>
            ) : (
              voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))
            )}
          </select>
          <Button
            onClick={speak}
            disabled={isVoiceLoading}
            className={`h-10 rounded-lg px-4 font-semibold ${isSpeaking ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800"}`}>
            {isVoiceLoading ? (
              <>
                <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Đang chuẩn bị giọng...
              </>
            ) : isSpeaking ? (
              <>
                <Square className="mr-2 h-3.5 w-3.5 fill-current" /> Dừng đọc
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" /> Đọc kết quả
              </>
            )}
          </Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="holobox-score-scene rounded-2xl p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
          <div className="holobox-orbit holobox-orbit-one" />
          <div className="holobox-orbit holobox-orbit-two" />
          <div className="holobox-orbit holobox-orbit-three" />
          <div className="relative z-10 flex min-h-[330px] flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
                  Overall score
                </p>
                <p className="mt-5 text-7xl font-bold tracking-[-0.06em] text-cyan-300 sm:text-8xl">
                  {chart.overallScore.toFixed(2)}
                  <span className="text-2xl font-medium tracking-normal text-slate-500">/100</span>
                </p>
              </div>
              <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 p-3 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">Mức năng lực tổng quan</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {competencyLevelLabel[chart.overallLevel]}
                  </p>
                </div>
                <div className="holobox-score-chip">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  Live insight
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-800 pt-5 text-sm text-slate-400">
                <UserRound className="h-4 w-4 text-cyan-300" /> Hồ sơ đã hoàn tất đánh giá
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Competency radar</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tất cả vùng kỹ thuật và hành vi từ báo cáo
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                Kỹ thuật
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Hành vi
              </span>
            </div>
          </div>
          {radarData.length > 0 ? (
            <>
              <div className="h-[300px] w-full sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#dbe5ec" gridType="polygon" />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tickCount={6}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#0891b2"
                      fill="#22d3ee"
                      fillOpacity={0.3}
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#0e7490", strokeWidth: 0 }}
                    />
                    <Tooltip
                      labelFormatter={(label) =>
                        radarData.find((item) => item.label === label)?.subject ?? label
                      }
                      formatter={(value) => [`${Number(value).toFixed(2)}/100`, "Điểm"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
                {radarData.map((item) => (
                  <div
                    key={`${item.category}-${item.subject}`}
                    className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-600">
                        {item.label}
                      </span>
                      <span className={`text-sm font-bold ${scoreTone(item.score)}`}>
                        {item.score}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-slate-400">
                      {item.category} · {item.sourceRounds.join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu kỹ thuật.
            </div>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <h2 className="font-bold text-slate-950">Kỹ năng hành vi</h2>
              <p className="mt-1 text-sm text-slate-500">
                Những gì được ghi nhận trong quá trình đánh giá
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
                    Nguồn: {item.sourceRounds.join(" · ") || "Tổng hợp"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Chưa có dữ liệu kỹ năng hành vi.</p>
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
              <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
                <Settings2 className="h-3.5 w-3.5" />{" "}
                {voiceEngine === "responsive" ? "Natural voice" : "Voice dự phòng"} ·{" "}
                {voiceProfileCopy[voiceProfile].label}
              </span>
            </div>
            <div className="holobox-wave mt-7" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <p className="mt-7 text-lg leading-7 font-semibold text-slate-950">“{script}”</p>
            <button
              type="button"
              onClick={speak}
              className="mt-7 flex items-center gap-2 text-sm font-bold text-cyan-800 transition hover:text-cyan-950">
              {isSpeaking ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}{" "}
              {isSpeaking ? "Đang đọc kết quả" : "Nghe phần tóm tắt"}
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
              <h2 className="mt-2 text-xl font-bold text-slate-950">Câu chuyện năng lực</h2>
            </div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              Journey summary
            </span>
          </div>
          <p className="text-[15px] leading-7 text-slate-600">
            {journey?.narrative?.trim() || "Bản tóm tắt hành trình chưa có nội dung chi tiết."}
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
              <h2 className="mt-2 text-xl font-bold text-slate-950">Gợi ý phát triển</h2>
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
                    Mục tiêu: {competencyLevelLabel[item.targetLevel]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Chưa có recommendation chi tiết cho hồ sơ này.
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
        setError("Email này chưa có application nào để hiển thị.");
        return;
      }
      const activeApplications = result.filter((application) => !application.isDeleted);
      if (activeApplications.length === 0) {
        setError("Các application của email này không còn khả dụng để hiển thị.");
        return;
      }
      setApplications(activeApplications);
      setStep("applications");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Không thể tìm hồ sơ lúc này."
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
          ? "Báo cáo năng lực đang được tạo. Vui lòng thử lại sau ít phút."
          : requestError instanceof Error
            ? requestError.message
            : "Không thể tải báo cáo năng lực."
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
