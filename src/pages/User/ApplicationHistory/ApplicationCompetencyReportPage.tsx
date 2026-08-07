import { Button } from "@/components/ui/button";
import {
  CompetencyChartError,
  competencyLevelLabel,
  getCompetencyResult,
  type CompetencyChart,
  type JourneySummary,
} from "@/services/competency-chart.manager";
import { Activity, ArrowLeft, CheckCircle2, Lightbulb, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

function compactSkillName(value: string) {
  return value
    .replace(/Software\s+/i, "")
    .replace(/\s+Skills?$/i, "")
    .trim();
}

function scoreTone(score: number) {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-cyan-700";
}

function ReportLoadingState() {
  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 px-5 py-8 sm:px-8">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="h-[420px] animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-[420px] animate-pulse rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}

function ReportErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <Activity className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold text-slate-950">Report unavailable</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => navigate("/user?tab=applicationHistory")}>
          Back to applications
        </Button>
      </div>
    </main>
  );
}

function ScoreSummary({ chart }: { chart: CompetencyChart }) {
  const technicalAverage = chart.technicalSkillAreas.length
    ? Math.round(
        chart.technicalSkillAreas.reduce((total, item) => total + item.score, 0) /
          chart.technicalSkillAreas.length
      )
    : 0;
  const behavioralAverage = chart.behavioralSkills.length
    ? Math.round(
        chart.behavioralSkills.reduce((total, item) => total + item.score, 0) /
          chart.behavioralSkills.length
      )
    : 0;

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm sm:col-span-1">
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-400 uppercase">
          Overall score
        </p>
        <p className="mt-5 text-6xl font-bold tracking-[-0.06em] text-cyan-300">
          {chart.overallScore.toFixed(2)}
          <span className="ml-1 text-xl font-medium tracking-normal text-slate-500">/100</span>
        </p>
        <div className="mt-8 border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400">Competency level</p>
          <p className="mt-1 text-lg font-semibold">{competencyLevelLabel[chart.overallLevel]}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 sm:grid-cols-2">
        <div className="rounded-xl bg-cyan-50 p-4">
          <p className="text-xs font-semibold tracking-wider text-cyan-700 uppercase">
            Technical index
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {technicalAverage}
            <span className="text-sm font-medium text-slate-400">/100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {chart.technicalSkillAreas.length} technical signals
          </p>
        </div>
        <div className="rounded-xl bg-violet-50 p-4">
          <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">
            Human index
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {behavioralAverage}
            <span className="text-sm font-medium text-slate-400">/100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {chart.behavioralSkills.length} behavioral signals
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-4 sm:col-span-2">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Assessment completed</p>
            <p className="text-xs text-slate-500">
              This report combines competency and behavioral evidence.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompetencyRadar({ chart }: { chart: CompetencyChart }) {
  const data = useMemo(
    () => [
      ...chart.technicalSkillAreas.map((item) => ({
        label: compactSkillName(item.skillArea),
        subject: item.skillArea,
        score: item.score,
        category: "Technical",
      })),
      ...chart.behavioralSkills.map((item) => ({
        label: compactSkillName(item.skillName),
        subject: item.skillName,
        score: item.score,
        category: "Behavioral",
      })),
    ],
    [chart]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-cyan-700 uppercase">
            Core dimensions
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">Competency radar</h2>
          <p className="mt-1 text-sm text-slate-500">
            A combined view of technical and behavioral signals.
          </p>
        </div>
        <span className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700">
          {data.length} signals
        </span>
      </div>

      <div className="mt-5 h-[330px] rounded-xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50/70 p-2 sm:h-[400px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke="#a5d8e2" gridType="polygon" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fill: "#0e7490", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tickCount={6}
                tick={{ fill: "#64748b", fontSize: 10 }}
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
                  data.find((item) => item.label === label)?.subject ?? label
                }
                formatter={(value) => [`${Number(value).toFixed(2)}/100`, "Score"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No chart data is available.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.map((item) => (
          <div
            key={`${item.category}-${item.subject}`}
            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-700">{item.subject}</p>
              <p className="truncate text-[10px] text-slate-400">{item.category}</p>
            </div>
            <span className={`ml-2 text-sm font-bold ${scoreTone(item.score)}`}>{item.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function JourneySummaryCard({ journey }: { journey: JourneySummary | null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-950">Assessment summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            What the evaluation signals mean for your next step.
          </p>
        </div>
      </div>

      <p className="mt-6 text-sm leading-7 text-slate-600">
        {journey?.narrative?.trim() || "A detailed narrative summary is not available yet."}
      </p>

      {journey?.swecomAssessments?.length ? (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Observed evidence</h3>
          {journey.swecomAssessments.slice(0, 4).map((item) => (
            <div key={`${item.skillArea}-${item.score}`} className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{item.skillArea}</span>
                <span className={`text-sm font-bold ${scoreTone(item.score)}`}>
                  {item.score}/100
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.evidenceSummary}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RecommendationsCard({ journey }: { journey: JourneySummary | null }) {
  const recommendations = journey?.developmentRecommendations ?? [];

  return (
    <section className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <Lightbulb className="h-5 w-5 text-amber-600" />
        <h2 className="text-xl font-bold text-slate-950">Recommended next steps</h2>
      </div>
      {recommendations.length > 0 ? (
        <div className="mt-5 space-y-3">
          {recommendations.slice(0, 4).map((item) => (
            <div
              key={`${item.targetSkillArea}-${item.targetLevel}`}
              className="flex gap-3 rounded-xl bg-white/80 p-3.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.targetSkillArea}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{item.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">
          No development recommendations are available yet.
        </p>
      )}
    </section>
  );
}

export function ApplicationCompetencyReportPage() {
  const navigate = useNavigate();
  const { applicationId } = useParams<{ applicationId: string }>();
  const [result, setResult] = useState<{
    chart: CompetencyChart;
    journey: JourneySummary | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    const id = Number(applicationId);
    if (!Number.isInteger(id) || id <= 0) {
      setError("This application id is invalid.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setResult(await getCompetencyResult(id));
    } catch (reportError) {
      setError(
        reportError instanceof CompetencyChartError
          ? reportError.message
          : "The competency report could not be loaded right now."
      );
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  if (isLoading) return <ReportLoadingState />;
  if (error || !result) {
    return (
      <ReportErrorState
        message={error ?? "The competency report is not ready yet."}
        onRetry={loadReport}
      />
    );
  }

  const { chart, journey } = result;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/user?tab=applicationHistory")}
            className="-ml-2 gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to applications
          </Button>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Report ready
          </span>
        </div>

        <header className="mb-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.16em] text-cyan-700 uppercase">
            Application assessment
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {chart.candidateName}
          </h1>
          <p className="mt-2 text-base text-slate-500">
            {chart.jobTitle} <span className="mx-2 text-slate-300">/</span> Application #
            {chart.applicationId}
          </p>
        </header>

        <div className="space-y-5">
          <ScoreSummary chart={chart} />
          <div className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
            <CompetencyRadar chart={chart} />
            <JourneySummaryCard journey={journey} />
          </div>
          <RecommendationsCard journey={journey} />
        </div>
      </div>
    </main>
  );
}
