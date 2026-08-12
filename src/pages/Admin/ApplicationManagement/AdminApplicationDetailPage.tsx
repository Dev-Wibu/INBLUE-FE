import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminApplicationManager,
  type AdminApplicationFullDetailResponseDto,
} from "@/services/admin-application.manager";
import {
  applicationDetailManager,
  type ApplicationDetail,
} from "@/services/application-detail.manager";
import { mentorManager, type Mentor } from "@/services/mentor.manager";
import { usersAdminManager, type User } from "@/services/users-admin.manager";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Briefcase, CheckCircle2, Clock, XCircle } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

type RoundDetail = NonNullable<AdminApplicationFullDetailResponseDto["roundDetails"]>[number];

function formatScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(value % 1 ? 1 : 0)
    : null;
}

function formatThreshold(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function resultIcon(result?: string) {
  if (result === "PASSED") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (result === "FAILED") return <XCircle className="h-4 w-4 text-rose-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

function roundAnchor(round: RoundDetail) {
  return round.roundId || round.roundOrder || round.applicationDetailId;
}

function mergedRoundScore(round: RoundDetail, applicationDetail?: ApplicationDetail) {
  const merged = { ...round, ...applicationDetail };
  return formatScore(merged.finalScore ?? merged.hrScore ?? merged.aiScore);
}

function mergedRoundResult(round: RoundDetail, applicationDetail?: ApplicationDetail) {
  const merged = { ...round, ...applicationDetail };
  if (merged.finalResult) return merged.finalResult;
  if (merged.status === "COMPLETED" || merged.status === "AI_EVALUATED") return "PASSED";
  return merged.status;
}

function DetailStat({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-semibold text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function TextBlock({ title, children }: { title: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
      <p className="mb-1 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function renderFeedback(feedback: unknown) {
  if (!feedback) return null;
  if (typeof feedback === "string") return <p>{feedback}</p>;
  if (typeof feedback !== "object") return <p>{String(feedback)}</p>;

  const data = feedback as {
    generalComment?: unknown;
    strengths?: unknown;
    weakness?: unknown;
    weaknesses?: unknown;
    extraMetrics?: unknown;
  };

  return (
    <div className="space-y-2">
      {data.generalComment ? <p>{String(data.generalComment)}</p> : null}
      {Array.isArray(data.strengths) && data.strengths.length > 0 && (
        <p className="text-emerald-600 dark:text-emerald-400">
          <strong>Strengths:</strong> {data.strengths.map(String).join(", ")}
        </p>
      )}
      {Array.isArray(data.weaknesses) && data.weaknesses.length > 0 && (
        <p className="text-amber-600 dark:text-amber-400">
          <strong>Areas for Improvement:</strong> {data.weaknesses.map(String).join(", ")}
        </p>
      )}
    </div>
  );
}

function RoundFullCard({
  round,
  applicationDetail,
  reviewer,
  mentor,
}: {
  round: RoundDetail;
  applicationDetail?: ApplicationDetail;
  reviewer?: User;
  mentor?: Mentor;
}) {
  const merged = { ...round, ...applicationDetail };
  const finalScore = formatScore(merged.finalScore);
  const aiScore = formatScore(merged.aiScore);
  const hrScore = formatScore(merged.hrScore);
  const finalResult = merged.finalResult;
  const mentorReview = merged.mentorReview;
  const anchor = roundAnchor(round);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div id={anchor ? `round-${anchor}` : undefined} className="scroll-mt-24" />
      <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {round.roundOrder ?? "-"}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {round.roundName || "Round"}
              </h2>
              {round.roundType && (
                <Badge variant="secondary" className="rounded-md">
                  {round.roundType}
                </Badge>
              )}
              {merged.status && (
                <Badge variant="secondary" className="rounded-md">
                  {merged.status}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              ApplicationDetail #{merged.id ?? round.applicationDetailId ?? "-"} · Round #
              {round.roundId ?? "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {finalScore && (
            <Badge className="rounded-md border-indigo-500/30 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              Final {finalScore}/100
            </Badge>
          )}
          {aiScore && (
            <Badge variant="secondary" className="rounded-md">
              AI {aiScore}
            </Badge>
          )}
          {hrScore && (
            <Badge variant="secondary" className="rounded-md">
              HR {hrScore}
            </Badge>
          )}
          {finalResult && (
            <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              {resultIcon(finalResult)}
              {finalResult}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 px-6 pb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <DetailStat label="Pass threshold" value={formatThreshold(round.passThreshold)} />
          <DetailStat
            label="Reviewer"
            value={
              reviewer?.name
                ? reviewer.email
                  ? `${reviewer.name} · ${reviewer.email}`
                  : reviewer.name
                : round.reviewerId
                  ? `#${round.reviewerId}`
                  : null
            }
          />
          <DetailStat
            label="Mentor"
            value={
              mentor?.name
                ? mentor.email
                  ? `${mentor.name} · ${mentor.email}`
                  : mentor.name
                : merged.mentorId
                  ? `#${merged.mentorId}`
                  : null
            }
          />
        </div>

        <TextBlock title="Instruction">
          {round.roundConfig?.instruction ? <p>{round.roundConfig.instruction}</p> : null}
        </TextBlock>

        <TextBlock title="Evaluation criteria">
          {round.roundConfig?.evaluationCriteria ? (
            <p>{round.roundConfig.evaluationCriteria}</p>
          ) : null}
        </TextBlock>

        <TextBlock title="AI feedback">{renderFeedback(merged.aiFeedback)}</TextBlock>

        <TextBlock title="HR note">
          {merged.hrNote ? <p className="whitespace-pre-wrap">{merged.hrNote}</p> : null}
        </TextBlock>

        <TextBlock title="Mentor review">
          {mentorReview ? (
            <div className="space-y-1">
              {mentorReview.rating && (
                <p className="font-semibold">Rating: {mentorReview.rating}/10</p>
              )}
              {mentorReview.situationNote && <p>Situation: {mentorReview.situationNote}</p>}
              {mentorReview.taskNote && <p>Task: {mentorReview.taskNote}</p>}
              {mentorReview.actionNote && <p>Action: {mentorReview.actionNote}</p>}
              {mentorReview.resultNote && <p>Result: {mentorReview.resultNote}</p>}
              {mentorReview.strength && <p>Strength: {mentorReview.strength}</p>}
              {mentorReview.weakness && <p>Weakness: {mentorReview.weakness}</p>}
              {mentorReview.improve && <p>Improve: {mentorReview.improve}</p>}
            </div>
          ) : null}
        </TextBlock>
      </div>
    </section>
  );
}

function ApplicationPipeline({
  rounds,
  detailByRoundId,
  currentRoundOrder,
  totalRounds,
  selectedRoundOrder,
  onSelectRound,
}: {
  rounds: RoundDetail[];
  detailByRoundId: Map<number, ApplicationDetail>;
  currentRoundOrder?: number;
  totalRounds?: number;
  selectedRoundOrder?: number;
  onSelectRound: (_roundOrder: number) => void;
}) {
  const resolvedTotal = totalRounds || rounds.length;
  const resolvedCurrent = currentRoundOrder || rounds.length;

  return (
    <section className="mx-6 rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-sm font-bold tracking-wide text-slate-600 uppercase dark:text-slate-300">
          Application Pipeline ({resolvedTotal} rounds)
        </h2>
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
          Progress: Round {resolvedCurrent}/{resolvedTotal}
        </span>
      </div>

      <div className="overflow-x-auto px-5 pb-5">
        <div className="flex min-w-max items-center gap-4">
          {rounds.map((round, index) => {
            const detail = round.roundId ? detailByRoundId.get(round.roundId) : undefined;
            const score = mergedRoundScore(round, detail);
            const result = mergedRoundResult(round, detail);
            const isPassed = result === "PASSED";
            const isFailed = result === "FAILED";
            const roundOrder = round.roundOrder ?? index + 1;
            const isSelected = selectedRoundOrder === roundOrder;

            return (
              <div
                key={round.applicationDetailId || round.roundId || index}
                className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => onSelectRound(roundOrder)}
                  className={[
                    isFailed
                      ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/50"
                      : isPassed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                        : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50",
                    isSelected
                      ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950"
                      : "",
                    "flex min-h-14 w-44 items-center gap-3 rounded-xl border px-4 text-left transition-colors",
                  ].join(" ")}>
                  <span
                    className={
                      isFailed
                        ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white"
                        : isPassed
                          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"
                    }>
                    {isFailed ? (
                      <XCircle className="h-4 w-4" />
                    ) : isPassed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={
                        isFailed
                          ? "block truncate text-sm font-bold text-rose-800 dark:text-rose-200"
                          : isPassed
                            ? "block truncate text-sm font-bold text-emerald-800 dark:text-emerald-200"
                            : "block truncate text-sm font-bold text-amber-800 dark:text-amber-200"
                      }>
                      {round.roundName || `Round ${index + 1}`}
                    </span>
                    {score && (
                      <span
                        className={
                          isFailed
                            ? "block font-mono text-xs text-rose-700 dark:text-rose-300"
                            : isPassed
                              ? "block font-mono text-xs text-emerald-700 dark:text-emerald-300"
                              : "block font-mono text-xs text-amber-700 dark:text-amber-300"
                        }>
                        Score: {score}/100
                      </span>
                    )}
                  </span>
                </button>

                {index < rounds.length - 1 && (
                  <div
                    className={
                      isPassed
                        ? "h-0.5 w-12 rounded-full bg-indigo-500"
                        : "h-0.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700"
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AdminApplicationDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const numericApplicationId = Number(applicationId);
  const isValidId = Number.isFinite(numericApplicationId) && numericApplicationId > 0;
  const requestedRound = Number(searchParams.get("round"));
  const [selectedRoundOrder, setSelectedRoundOrder] = useState<number>(
    Number.isFinite(requestedRound) && requestedRound > 0 ? requestedRound : 1
  );

  const fullDetailQuery = useQuery({
    queryKey: ["admin", "application-full-detail", numericApplicationId],
    queryFn: async () => {
      const res = await adminApplicationManager.getApplicationFullDetail(numericApplicationId);
      if (!res.success || !res.data) throw new Error(res.error || "Unable to load application");
      return res.data;
    },
    enabled: isValidId,
  });

  const applicationDetailsQuery = useQuery({
    queryKey: ["applicationDetails", "byApplicationId", numericApplicationId],
    queryFn: async () => {
      const res = await applicationDetailManager.getByApplicationId(numericApplicationId);
      if (!res.success) throw new Error(res.error || "Unable to load application details");
      return res.data ?? [];
    },
    enabled: isValidId,
  });

  const detailByRoundId = useMemo(() => {
    const map = new Map<number, ApplicationDetail>();
    for (const detail of applicationDetailsQuery.data ?? []) {
      if (detail.roundId) map.set(detail.roundId, detail);
    }
    return map;
  }, [applicationDetailsQuery.data]);

  const reviewerIds = useMemo(() => {
    return Array.from(
      new Set(
        (fullDetailQuery.data?.roundDetails ?? [])
          .map((round) => round.reviewerId)
          .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
      )
    );
  }, [fullDetailQuery.data?.roundDetails]);

  const reviewerById = useQueries({
    queries: reviewerIds.map((id) => ({
      queryKey: ["admin", "users", id],
      queryFn: async () => {
        const res = await usersAdminManager.getById(id);
        if (!res.success || !res.data) throw new Error(res.error || "Unable to load user");
        return res.data;
      },
      staleTime: 5 * 60 * 1000,
    })),
    combine: (results) => {
      const map = new Map<number, User>();
      results.forEach((query, index) => {
        const id = reviewerIds[index];
        if (id && query.data) map.set(id, query.data);
      });
      return map;
    },
  });

  const mentorIds = useMemo(() => {
    return Array.from(
      new Set(
        [
          ...(fullDetailQuery.data?.roundDetails ?? []).map((round) => round.mentorId),
          ...(applicationDetailsQuery.data ?? []).map((detail) => detail.mentorId),
        ].filter((id): id is number => typeof id === "number" && Number.isFinite(id))
      )
    );
  }, [applicationDetailsQuery.data, fullDetailQuery.data?.roundDetails]);

  const mentorById = useQueries({
    queries: mentorIds.map((id) => ({
      queryKey: ["admin", "mentors", id],
      queryFn: async () => {
        const res = await mentorManager.getById(id);
        if (!res.success || !res.data) throw new Error(res.error || "Unable to load mentor");
        return res.data;
      },
      staleTime: 5 * 60 * 1000,
    })),
    combine: (results) => {
      const map = new Map<number, Mentor>();
      results.forEach((query, index) => {
        const id = mentorIds[index];
        if (id && query.data) map.set(id, query.data);
      });
      return map;
    },
  });

  const isLoading = fullDetailQuery.isLoading || applicationDetailsQuery.isLoading;
  const error = fullDetailQuery.error || applicationDetailsQuery.error;
  const fullDetail = fullDetailQuery.data;
  const rounds = useMemo(
    () =>
      [...(fullDetail?.roundDetails ?? [])].sort(
        (a, b) => (a.roundOrder ?? 0) - (b.roundOrder ?? 0)
      ),
    [fullDetail?.roundDetails]
  );
  const activeRound = useMemo(() => {
    return rounds.find((round) => round.roundOrder === selectedRoundOrder) ?? rounds[0];
  }, [rounds, selectedRoundOrder]);
  const activeDetail = activeRound?.roundId ? detailByRoundId.get(activeRound.roundId) : undefined;
  const activeMentorId = activeDetail?.mentorId ?? activeRound?.mentorId;

  useEffect(() => {
    if (!fullDetail || rounds.length === 0) return;
    const initialRound =
      Number.isFinite(requestedRound) && requestedRound > 0
        ? requestedRound
        : fullDetail.applicationOverview?.currentRoundOrder || rounds[0]?.roundOrder || 1;
    const exists = rounds.some((round) => round.roundOrder === initialRound);
    setSelectedRoundOrder(exists ? initialRound : rounds[0]?.roundOrder || 1);
  }, [fullDetail, requestedRound, rounds]);

  const handleSelectRound = (roundOrder: number) => {
    setSelectedRoundOrder(roundOrder);
    setSearchParams({ round: String(roundOrder) });
  };

  if (!isValidId) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] items-center justify-center bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="text-center text-sm text-slate-500">
          <AlertCircle className="mx-auto mb-2 h-6 w-6" />
          Invalid application id.
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate("/admin/applications")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Briefcase className="h-3.5 w-3.5" />
                Application #{numericApplicationId}
              </div>
              <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
                {fullDetail?.candidateInfo?.name ||
                  t("adminApplicationManagement.applicationDetail", "Application detail")}
              </h1>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {fullDetail?.jobDescriptionInfo?.title || "Loading..."}
              </p>
            </div>
          </div>

          {fullDetail?.applicationOverview?.status && (
            <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-600">
              {fullDetail.applicationOverview.status}
            </Badge>
          )}
        </div>

        {fullDetail && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <DetailStat label="Candidate" value={fullDetail.candidateInfo?.name} />
            <DetailStat label="Email" value={fullDetail.candidateInfo?.email} />
            <DetailStat label="Company" value={fullDetail.jobDescriptionInfo?.companyName} />
            <DetailStat
              label="Overall score"
              value={formatScore(fullDetail.applicationOverview?.overallScore)}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Loading application detail...
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center px-6">
            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
              {error instanceof Error ? error.message : "Unable to load application detail."}
            </div>
          </div>
        ) : fullDetail ? (
          <div className="space-y-6 py-6">
            <ApplicationPipeline
              rounds={rounds}
              detailByRoundId={detailByRoundId}
              currentRoundOrder={fullDetail.applicationOverview?.currentRoundOrder}
              totalRounds={fullDetail.applicationOverview?.totalRounds}
              selectedRoundOrder={selectedRoundOrder}
              onSelectRound={handleSelectRound}
            />

            <div className="grid gap-6 px-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                {activeRound ? (
                  <RoundFullCard
                    key={activeRound.applicationDetailId || activeRound.roundId}
                    round={activeRound}
                    applicationDetail={activeDetail}
                    reviewer={
                      activeRound.reviewerId ? reviewerById.get(activeRound.reviewerId) : undefined
                    }
                    mentor={activeMentorId ? mentorById.get(activeMentorId) : undefined}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                    <AlertCircle className="mx-auto mb-2 h-6 w-6" />
                    No round selected.
                  </div>
                )}
              </div>

              <aside className="space-y-4 lg:col-span-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Application Meta
                    </h3>
                  </div>
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Candidate</span>
                      <span className="text-right font-semibold text-slate-900 dark:text-white">
                        {fullDetail.candidateInfo?.name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Email</span>
                      <span className="text-right font-semibold text-slate-900 dark:text-white">
                        {fullDetail.candidateInfo?.email || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Company</span>
                      <span className="text-right font-semibold text-slate-900 dark:text-white">
                        {fullDetail.jobDescriptionInfo?.companyName || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">Status</span>
                      <span className="text-right font-semibold text-slate-900 dark:text-white">
                        {fullDetail.applicationOverview?.status || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {activeRound && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Round Standard
                      </h3>
                    </div>
                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Round</span>
                        <span className="text-right font-semibold text-slate-900 dark:text-white">
                          {activeRound.roundOrder || "-"} / {rounds.length}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Type</span>
                        <span className="text-right font-semibold text-slate-900 dark:text-white">
                          {activeRound.roundType || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Pass threshold</span>
                        <span className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatThreshold(activeRound.passThreshold) || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Score</span>
                        <span className="text-right font-semibold text-indigo-600 dark:text-indigo-400">
                          {mergedRoundScore(activeRound, activeDetail) || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
