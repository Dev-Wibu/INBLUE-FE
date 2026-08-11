import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CompetencyChartError,
  competencyLevelLabel,
  competencyLevelLabelVi,
  getCompetencyResult,
  type CompetencyChart,
  type JourneySummary,
} from "@/services/competency-chart.manager";
import {
  Activity,
  CheckCircle,
  Code2,
  FileCheck2,
  HelpCircle,
  Layers,
  Lightbulb,
  Mail,
  RefreshCw,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { components } from "../../../../../schema-from-be";
import type { JdRound } from "./HorizontalPipeline";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

// ─── Utility ──────────────────────────────────────────────────────────────────

function compactSkillName(v: string) {
  return v
    .replace(/Software\s+/i, "")
    .replace(/\s+Skills?$/i, "")
    .trim();
}

function scoreColor(score: number) {
  if (score >= 70)
    return {
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      badge:
        "bg-emerald-50 text-emerald-800 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800",
      stroke: "#10b981",
      fill: "bg-emerald-500",
    };
  if (score >= 40)
    return {
      bar: "bg-amber-400",
      text: "text-amber-600 dark:text-amber-400",
      badge:
        "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
      stroke: "#f59e0b",
      fill: "bg-amber-400",
    };
  return {
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    badge:
      "bg-rose-50 text-rose-800 ring-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800",
    stroke: "#f87171",
    fill: "bg-rose-500",
  };
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function getRoundIcon(roundType?: string) {
  const t = (roundType ?? "").toUpperCase();
  if (t.includes("CV") || t.includes("SCREENING")) return FileCheck2;
  if (t.includes("QUIZ")) return HelpCircle;
  if (t.includes("CODE")) return Code2;
  if (t.includes("EMAIL")) return Mail;
  if (t.includes("MENTOR")) return UserCheck;
  if (t.includes("AI")) return Sparkles;
  return Layers;
}

// ─── Mini ScoreBar ────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const { bar } = scoreColor(score);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={`h-full rounded-full transition-all duration-500 ${bar}`}
        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
      />
    </div>
  );
}

// ─── Compact donut gauge ──────────────────────────────────────────────────────

function Gauge({ score, size = 96 }: { score: number; size?: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const { stroke, text } = scoreColor(score);
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="9"
          className="dark:stroke-slate-700"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          stroke={stroke}
          style={{ transition: "stroke-dasharray 0.7s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-xl leading-none font-bold tabular-nums ${text}`}>
          {Math.round(score)}
        </span>
        <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">/100</span>
      </div>
    </div>
  );
}

// ─── Mini circular score badge (for evidence list) ────────────────────────────

function CircleScore({ score, size = 48 }: { score: number; size?: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const { stroke, text } = scoreColor(score);
  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 48 48" className="-rotate-90">
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="5"
          className="dark:stroke-slate-700"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          stroke={stroke}
          style={{ transition: "stroke-dasharray 0.7s ease" }}
        />
      </svg>
      <span className={`absolute text-[11px] font-bold tabular-nums ${text}`}>{score}</span>
    </div>
  );
}

// ─── Result pill ──────────────────────────────────────────────────────────────

function ResultPill({ result }: { result?: string | null }) {
  if (result === "PASSED")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-300 ring-inset dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
        <CheckCircle className="h-3 w-3" /> Đạt
      </span>
    );
  if (result === "FAILED" || result === "REJECT")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-300 ring-inset dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800">
        <XCircle className="h-3 w-3" /> Không đạt
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 ring-inset dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
      Chưa có kết quả
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinalCompetencyReportNodeViewProps {
  applicationId: number;
  rounds?: JdRound[];
  details?: ApplicationDetail[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinalCompetencyReportNodeView({
  applicationId,
  rounds = [],
  details = [],
}: FinalCompetencyReportNodeViewProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [result, setResult] = useState<{
    chart: CompetencyChart;
    journey: JourneySummary | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    if (!applicationId || applicationId <= 0) {
      setError("Mã hồ sơ không hợp lệ.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setResult(await getCompetencyResult(applicationId));
    } catch (err) {
      setError(
        err instanceof CompetencyChartError
          ? err.message
          : t("userApplicationhistory.reportLoadError", {
              defaultValue: "Không thể tải báo cáo. Vui lòng thử lại.",
            })
      );
    } finally {
      setIsLoading(false);
    }
  }, [applicationId, t]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)),
    [rounds]
  );

  const radarData = useMemo(() => {
    if (!result?.chart) return [];
    return [
      ...result.chart.technicalSkillAreas.map((item) => ({
        label: compactSkillName(item.skillArea),
        score: item.score,
      })),
      ...result.chart.behavioralSkills.map((item) => ({
        label: compactSkillName(item.skillName),
        score: item.score,
      })),
    ];
  }, [result?.chart]);

  const radarOverallScore = useMemo(() => {
    if (!radarData.length) return 0;
    return radarData.reduce((total, item) => total + item.score, 0) / radarData.length;
  }, [radarData]);

  const technicalAvg = useMemo(() => {
    if (!result?.chart.technicalSkillAreas.length) return 0;
    return Math.round(
      result.chart.technicalSkillAreas.reduce((s, i) => s + i.score, 0) /
        result.chart.technicalSkillAreas.length
    );
  }, [result?.chart.technicalSkillAreas]);

  const behavioralAvg = useMemo(() => {
    if (!result?.chart.behavioralSkills.length) return 0;
    return Math.round(
      result.chart.behavioralSkills.reduce((s, i) => s + i.score, 0) /
        result.chart.behavioralSkills.length
    );
  }, [result?.chart.behavioralSkills]);

  const strongestSkill = useMemo(() => {
    const skills = [
      ...(result?.chart.technicalSkillAreas ?? []).map((item) => ({
        name: item.skillArea,
        score: item.score,
      })),
      ...(result?.chart.behavioralSkills ?? []).map((item) => ({
        name: item.skillName,
        score: item.score,
      })),
    ];
    return skills.sort((a, b) => b.score - a.score)[0];
  }, [result?.chart.behavioralSkills, result?.chart.technicalSkillAreas]);

  const focusSkill = useMemo(() => {
    const skills = [
      ...(result?.chart.technicalSkillAreas ?? []).map((item) => ({
        name: item.skillArea,
        score: item.score,
      })),
      ...(result?.chart.behavioralSkills ?? []).map((item) => ({
        name: item.skillName,
        score: item.score,
      })),
    ];
    return skills.sort((a, b) => a.score - b.score)[0];
  }, [result?.chart.behavioralSkills, result?.chart.technicalSkillAreas]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-lg lg:col-span-2" />
          <Skeleton className="h-80 rounded-lg lg:col-span-3" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // ── Error state ──
  if (error || !result) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Activity className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t("userApplicationhistory.reportNotReadyTitle", {
            defaultValue: "Báo cáo đang được tổng hợp",
          })}
        </p>
        <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {error ??
            t("userApplicationhistory.reportNotReadyDesc", {
              defaultValue: "Dữ liệu sẽ sẵn sàng khi hệ thống hoàn tất phân tích.",
            })}
        </p>
        <Button onClick={loadReport} variant="outline" className="mt-5 h-8 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          {t("common.tryAgain", { defaultValue: "Tải lại" })}
        </Button>
      </div>
    );
  }

  const { chart, journey } = result;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════
          ROW 1 — Page header: title + action
          ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-white p-4 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                BÁO CÁO NĂNG LỰC TỔNG KẾT AI
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Vòng {sortedRounds.length || 7}: Báo cáo năng lực
              </span>
            </div>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-200">
              Đánh giá tổng hợp năng lực ứng viên sau toàn bộ quá trình tuyển dụng.
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 2 — KPI tiles (3 score panels)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[0.95fr_1.05fr_1.05fr]">
        {/* Tile: overall score — centered column layout */}
        {(() => {
          const { text, badge } = scoreColor(chart.overallScore);
          return (
            <div className="flex min-h-[200px] items-center rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-5 shadow-xs dark:border-indigo-500/20 dark:bg-indigo-500/[0.08] dark:shadow-none">
              <div className="flex w-full items-center justify-center gap-4">
                <Gauge score={chart.overallScore} size={88} />
                <div className="min-w-0">
                  <p className="max-w-[230px] text-base leading-snug font-bold tracking-tight text-slate-900 uppercase dark:text-white">
                    Đánh giá trình độ hiện tại đang ở cấp độ nào?
                  </p>
                  <span
                    className={`mt-2.5 inline-flex rounded-md px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${badge}`}>
                    {competencyLevelLabelVi[chart.overallLevel] ||
                      competencyLevelLabel[chart.overallLevel] ||
                      chart.overallLevel}
                  </span>
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className={`text-xl font-black tabular-nums ${text}`}>
                      {chart.overallScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Điểm tổng thể /100
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tile: technical */}
        {(() => {
          const { text, bar } = scoreColor(technicalAvg);
          return (
            <div className="min-h-[200px] rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Kỹ năng chuyên môn
              </p>
              <p className={`mt-2 text-3xl leading-none font-bold tabular-nums ${text}`}>
                {technicalAvg}
              </p>
              <div className="mt-6 space-y-3">
                {chart.technicalSkillAreas.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-slate-700 dark:text-slate-300">
                      {compactSkillName(item.skillArea)}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${bar}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                    <span className={`w-7 text-right text-xs font-semibold tabular-nums ${text}`}>
                      {item.score}
                    </span>
                  </div>
                ))}
                {chart.technicalSkillAreas.length > 3 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    +{chart.technicalSkillAreas.length - 3} kỹ năng khác
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Tile: behavioral */}
        {(() => {
          const { text, bar } = scoreColor(behavioralAvg);
          return (
            <div className="min-h-[200px] rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Kỹ năng mềm & thái độ
              </p>
              <p className={`mt-2 text-3xl leading-none font-bold tabular-nums ${text}`}>
                {behavioralAvg}
              </p>
              <div className="mt-6 space-y-3">
                {chart.behavioralSkills.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 truncate text-xs text-slate-700 dark:text-slate-300">
                      {compactSkillName(item.skillName)}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${bar}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                    <span className={`w-6 text-right text-xs font-semibold tabular-nums ${text}`}>
                      {item.score}
                    </span>
                  </div>
                ))}
                {chart.behavioralSkills.length > 3 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    +{chart.behavioralSkills.length - 3} kỹ năng khác
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 3 — Highlight cards (Strongest & Focus skills)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-emerald-300/80 bg-emerald-50/50 px-5 py-4 shadow-xs dark:border-emerald-500/30 dark:bg-slate-900/40 dark:shadow-none">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500/15 transition-[width] duration-500 dark:bg-emerald-500/[0.14]"
            style={{ width: `${strongestSkill?.score ?? 0}%` }}
          />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300/90">
                Điểm nổi bật
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {strongestSkill?.name ?? "Chưa có dữ liệu"}
              </p>
            </div>
            <span className="shrink-0 text-2xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
              {strongestSkill?.score ?? "—"}
            </span>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-amber-300/80 bg-amber-50/50 px-5 py-4 shadow-xs dark:border-amber-500/30 dark:bg-slate-900/40 dark:shadow-none">
          <div
            className="absolute inset-y-0 left-0 bg-amber-500/15 transition-[width] duration-500 dark:bg-amber-400/[0.14]"
            style={{ width: `${focusSkill?.score ?? 0}%` }}
          />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300/90">
                Ưu tiên phát triển
              </p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                {focusSkill?.name ?? "Chưa có dữ liệu"}
              </p>
            </div>
            <span className="shrink-0 text-2xl font-black text-amber-600 tabular-nums dark:text-amber-400">
              {focusSkill?.score ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 4 — Radar (left) + Full skill breakdown (right)
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-5 lg:items-start">
        {/* Radar panel */}
        <div className="overflow-hidden rounded-xl border border-indigo-200/80 bg-white shadow-xs lg:col-span-3 dark:border-indigo-500/20 dark:bg-[#0b1225] dark:shadow-none">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-indigo-500/15">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Biểu đồ năng lực
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Tương quan giữa các nhóm kỹ năng
              </p>
            </div>
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              0—100
            </span>
          </div>
          {radarData.length > 0 ? (
            <div className="grid items-center gap-3 px-4 pt-3 pb-5 md:grid-cols-[minmax(0,1fr)_150px]">
              <div className="relative min-w-0">
                <style>{`
                  @keyframes radar-glow-float {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .35; }
                    50% { transform: translate3d(8px, -10px, 0) scale(1.35); opacity: .9; }
                  }
                  @keyframes radar-glow-pulse {
                    0%, 100% { transform: scale(.92); opacity: .28; }
                    50% { transform: scale(1.08); opacity: .5; }
                  }
                `}</style>
                <div
                  className="pointer-events-none absolute inset-10 rounded-full bg-indigo-500/[0.08] blur-2xl"
                  style={{
                    animation: prefersReducedMotion
                      ? "none"
                      : "radar-glow-pulse 5s ease-in-out infinite",
                  }}
                />
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid
                      stroke="#cbd5e1"
                      strokeOpacity={0.7}
                      className="dark:[stroke:#334155]"
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tickCount={5}
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      axisLine={false}
                    />
                    <PolarAngleAxis
                      dataKey="label"
                      tick={{ className: "fill-slate-700 dark:fill-slate-200 text-xs font-bold" }}
                      tickLine={false}
                    />
                    <Radar
                      dataKey="score"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.3}
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: "#818cf8", stroke: "#4f46e5", strokeWidth: 2 }}
                      isAnimationActive={!prefersReducedMotion}
                      animationBegin={150}
                      animationDuration={prefersReducedMotion ? 0 : 1200}
                      animationEasing="ease-out"
                    />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 10,
                        color: "#e2e8f0",
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${Number(v).toFixed(0)}/100`, "Điểm"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-center dark:border-indigo-400/25 dark:bg-indigo-500/[0.08]">
                <p className="text-[11px] font-bold tracking-[0.18em] text-indigo-700 dark:text-indigo-300">
                  TỔNG QUAN
                </p>
                <p
                  className={`mt-3 text-4xl leading-none font-black tabular-nums ${scoreColor(radarOverallScore).text}`}>
                  {radarOverallScore.toFixed(1)}
                </p>
                <span
                  className={`mt-4 inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${scoreColor(radarOverallScore).badge}`}>
                  {competencyLevelLabelVi[chart.overallLevel] ||
                    competencyLevelLabel[chart.overallLevel] ||
                    chart.overallLevel}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>

        {/* Full skill list panel */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs lg:col-span-2 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Chi tiết tất cả kỹ năng
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* Technical */}
            {chart.technicalSkillAreas.length > 0 && (
              <>
                <div className="bg-slate-50 px-5 py-2 dark:bg-slate-800/40">
                  <span className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                    Chuyên môn
                  </span>
                </div>
                {chart.technicalSkillAreas.map((item, i) => {
                  const { text, bar } = scoreColor(item.score);
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-800 dark:text-slate-300">
                        {item.skillArea}
                      </span>
                      <div className="flex-1">
                        <ScoreBar score={item.score} />
                      </div>
                      <span className={`w-8 text-right text-sm font-bold tabular-nums ${text}`}>
                        {item.score}
                      </span>
                      <div className={`h-2 w-2 rounded-full ${bar}`} />
                    </div>
                  );
                })}
              </>
            )}

            {/* Behavioral */}
            {chart.behavioralSkills.length > 0 && (
              <>
                <div className="bg-slate-50 px-5 py-2 dark:bg-slate-800/40">
                  <span className="text-xs font-bold tracking-wider text-slate-600 uppercase dark:text-slate-400">
                    Kỹ năng mềm & thái độ
                  </span>
                </div>
                {chart.behavioralSkills.map((item, i) => {
                  const { text, bar } = scoreColor(item.score);
                  return (
                    <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-800 dark:text-slate-300">
                        {item.skillName}
                      </span>
                      <div className="flex-1">
                        <ScoreBar score={item.score} />
                      </div>
                      <span className={`w-8 text-right text-sm font-bold tabular-nums ${text}`}>
                        {item.score}
                      </span>
                      <div className={`h-2 w-2 rounded-full ${bar}`} />
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ROW 4 — Left: Narrative + Recommendations | Right: CircleScore cards
          ═══════════════════════════════════════════════════════ */}
      {(journey?.narrative ||
        (journey?.swecomAssessments?.length ?? 0) > 0 ||
        (journey?.developmentRecommendations?.length ?? 0) > 0) && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* LEFT (3/5): Narrative + Định hướng phát triển stacked */}
          <div className="space-y-4 lg:col-span-3">
            {journey?.narrative && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Nhận xét tổng thể
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {journey.narrative}
                </p>
              </div>
            )}

            {journey?.developmentRecommendations &&
              journey.developmentRecommendations.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Định hướng phát triển
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {journey.developmentRecommendations.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex gap-3 px-5 py-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.targetSkillArea}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            {item.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* RIGHT (2/5): CircleScore cards + Round list below */}
          <div className="space-y-4 lg:col-span-2">
            {/* CircleScore evidence cards */}
            {journey?.swecomAssessments && journey.swecomAssessments.length > 0 && (
              <>
                {journey.swecomAssessments.slice(0, 5).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <CircleScore score={item.score} size={52} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.skillArea}
                      </p>
                      {item.evidenceSummary && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {item.evidenceSummary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Round list below circles */}
            {sortedRounds.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Chi tiết từng vòng
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {sortedRounds.length} vòng
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedRounds.map((round, idx) => {
                    const roundOrder = round.roundOrder ?? idx + 1;
                    const detail = details.find((d) => d.roundId === round.id);
                    const RoundIcon = getRoundIcon(round.roundType);
                    const score = detail?.finalScore ?? detail?.aiScore ?? detail?.hrScore;
                    return (
                      <div key={round.id ?? idx} className="flex items-center gap-2.5 px-4 py-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {roundOrder}
                        </span>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                          <RoundIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="flex-1 truncate text-xs font-medium text-slate-800 dark:text-slate-300">
                          {round.name || `Vòng ${roundOrder}`}
                        </span>
                        <ResultPill result={detail?.finalResult} />
                        {score !== undefined && score !== null && (
                          <span
                            className={`shrink-0 text-xs font-bold tabular-nums ${scoreColor(score).text}`}>
                            {score}
                            <span className="font-normal text-slate-500">/100</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
