import i18n from "@/lib/i18n";

/**
 * Shared HR Mentor Review Approval Page
 *
 * Used by both Admin (`/admin/mentor-review-approvals`) and Staff
 * (`/staff/mentor-review-approvals`) to approve/reject MENTOR_REVIEW rounds
 * after the student has finished their mentor review (status = AI_EVALUATED).
 *
 * Behavior:
 *  - Default action: confirm the backend-computed `finalResult` (PASSED/FAILED)
 *    and forward it to `POST /api/application-details/hr-score` so the backend
 *    marks the round COMPLETED and calls `moveToNextRound()`.
 *  - HR may override and force the round to FAILED by clicking "Reject".
 *  - The student's mentor review (rating + STAR notes) is shown read-only.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useApplications } from "@/hooks/useApplication";
import {
  useApplicationDetails,
  useApplicationDetailsForReviewer,
  useHrScore,
} from "@/hooks/useApplicationDetails";
import { useCurrentRound } from "@/hooks/useRound";
import { filterOutAutoGradedRounds } from "@/lib/application-detail-utils";
import { formatDateTime } from "@/lib/formatting";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import type { components } from "../../../../schema-from-be";

type ApplicationDetail = components["schemas"]["ApplicationDetail"];

// COMPAT v062 (2026-07-13):
//   BE POST /api/mentor-reviews currently sets `ApplicationDetail.finalScore =
//   rating * 10`. So when a mentor submits rating=85 the detail stores
//   finalScore=850 (out of 100). The matching HR override endpoint uses raw
//   score, so the two scales disagree. Until BE fixes the multiplier this
//   helper normalises any value > 100 back down to /10 as a heuristic.
function normalizeMentorFinalScore(value: number | null | undefined): number | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  return value > 100 ? value / 10 : value;
}
type MentorReview = components["schemas"]["MentorReview"];
type Round = components["schemas"]["Round"];
type Application = components["schemas"]["Application"];

const tPure = (k: string, opts?: string | Record<string, unknown>): string =>
  i18n.t(k, opts as string) as unknown as string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: tPure("status.pendingSubmit"),
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  AI_EVALUATED: {
    label: tPure("status.aiGraded"),
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  },
  COMPLETED: {
    label: tPure("general.completed"),
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
};

const RESULT_CONFIG: Record<string, { label: string; className: string }> = {
  PASSED: {
    label: tPure("userApplicationhistory.passed"),
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  FAILED: {
    label: tPure("userApplicationhistory.failed"),
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  },
};

// ============================================================
// Single application row (handles its own round lookup)
// ============================================================

interface PendingItem {
  detail: ApplicationDetail;
  application?: Application;
  round?: Round;
  roundLoading: boolean;
}

interface RowProps {
  item: PendingItem;
  isExpanded: boolean;
  onToggle: () => void;
  onApproved: () => void;
}

function PendingReviewRow({ item, isExpanded, onToggle, onApproved }: RowProps) {
  const { t } = useTranslation();
  const { detail, application, round } = item;
  const review = detail.mentorReview as MentorReview | undefined;

  const computedResult = (detail.finalResult as "PASSED" | "FAILED" | undefined) ?? "PASSED";
  const [isPass, setIsPass] = useState<boolean>(computedResult === "PASSED");
  const [note, setNote] = useState<string>("");

  const { mutate: submitScore, isPending: isSubmitting } = useHrScore({
    onSuccess: onApproved,
  });

  const statusCfg = STATUS_CONFIG[detail.status ?? ""] ?? {
    label: detail.status,
    className: "",
  };
  const resultCfg = detail.finalResult ? RESULT_CONFIG[detail.finalResult] : null;

  const handleApprove = () => {
    if (!detail.id) return;
    // Normalise BE's accidental ×10 multiplier (see helper note). The HR
    // override endpoint takes raw score (0-100) so we always normalise before
    // clamping.
    const rawScore =
      detail.finalScore !== undefined && detail.finalScore !== null
        ? detail.finalScore
        : (review?.rating ?? 0);
    const normalised = normalizeMentorFinalScore(rawScore) ?? 0;
    const clamped = Math.min(100, Math.max(0, Number(normalised) || 0));

    submitScore({
      applicationDetailId: detail.id,
      isPass,
      note: note.trim(),
      score: clamped,
    });
  };

  return (
    <div
      className={`rounded-xl border bg-white transition-all dark:bg-slate-900 ${
        isExpanded
          ? "border-[#0047AB] shadow-md"
          : "border-amber-300 hover:border-amber-400 dark:border-amber-700 dark:hover:border-amber-600"
      }`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isExpanded
                ? "bg-[#0047AB] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            }`}
            aria-label={isExpanded ? t("common.collapse") : t("userPractice.openAll")}>
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t("hrMentorReviewApproval.application")} #{detail.applicationId}
                {application?.jdId ? (
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    (JD #{application.jdId})
                  </span>
                ) : null}
              </h3>
              <Badge className={`px-1.5 py-0 text-[10px] ${statusCfg.className}`}>
                {statusCfg.label}
              </Badge>
              {resultCfg && (
                <Badge className={`px-1.5 py-0 text-[10px] ${resultCfg.className}`}>
                  {resultCfg.label}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-indigo-300 px-1.5 py-0 text-[10px] text-indigo-600">
                {round?.roundType ??
                  (item.roundLoading ? "…" : t("hrMentorReviewApproval.unknownRound"))}
              </Badge>
              {review?.rating !== undefined && (
                <span className="flex items-center gap-1 text-xs">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-amber-600">{review.rating}/10</span>
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                {t("hrMentorReviewApproval.detailId")}: #{detail.id}
              </span>
              {detail.completedAt && <span>{formatDateTime(detail.completedAt)}</span>}
              {detail.mentorId && (
                <span>
                  {t("hrMentorReviewApproval.bookingId")}: #{detail.mentorId}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={onToggle}
            className="h-8 gap-1.5 bg-amber-500 px-3 text-xs font-medium text-white hover:bg-amber-600">
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t("hrMentorReviewApproval.approve")}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="space-y-4">
            {review && (
              <div>
                <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {t("hrMentorReviewApproval.studentReviewTitle")}
                </h4>
                <div className="space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
                  <div className="flex items-center gap-3">
                    <StarRating value={review.rating ?? 0} />
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {review.rating}/10
                    </span>
                    {detail.finalScore !== undefined && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        → finalScore:{" "}
                        <span className="font-semibold">
                          {normalizeMentorFinalScore(detail.finalScore) ?? detail.finalScore}
                        </span>
                        <span className="text-slate-400">/100</span>
                        {(detail.finalScore ?? 0) > 100 && (
                          <span className="rounded bg-amber-100 px-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            ⚠️ ×10
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <StarSection
                    label={t("hrMentorReviewApproval.situation")}
                    value={review.situationNote}
                  />
                  <StarSection label={t("hrMentorReviewApproval.task")} value={review.taskNote} />
                  <StarSection
                    label={t("hrMentorReviewApproval.action")}
                    value={review.actionNote}
                  />
                  <StarSection
                    label={t("hrMentorReviewApproval.result")}
                    value={review.resultNote}
                  />

                  <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
                    <FreeTextSection
                      label={t("hrMentorReviewApproval.strength")}
                      value={review.strength}
                    />
                    <FreeTextSection
                      label={t("hrMentorReviewApproval.weakness")}
                      value={review.weakness}
                    />
                    <FreeTextSection
                      label={t("hrMentorReviewApproval.improve")}
                      value={review.improve}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {t("hrMentorReviewApproval.hrDecision")}
              </h4>
              <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("grading.decision")}
                  </label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={isPass ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 gap-1.5 text-sm ${
                        isPass ? "bg-green-600 hover:bg-green-700" : ""
                      }`}
                      onClick={() => setIsPass(true)}>
                      <ThumbsUp className="h-4 w-4" />
                      {t("hrMentorReviewApproval.confirmPassed")}
                      <span className="ml-1 text-xs opacity-80">
                        ({(detail.finalScore ?? 0).toFixed(1)})
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant={!isPass ? "default" : "outline"}
                      size="sm"
                      className={`flex-1 gap-1.5 text-sm ${
                        !isPass ? "bg-red-600 hover:bg-red-700" : ""
                      }`}
                      onClick={() => setIsPass(false)}>
                      <ThumbsDown className="h-4 w-4" />
                      {t("hrMentorReviewApproval.overrideFail")}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("general.notes")}
                  </label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("hrMentorReviewApproval.notePlaceholder")}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className={`w-full gap-1.5 ${
                    isPass ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                  }`}>
                  {isSubmitting ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      {t("common.saving")}
                    </>
                  ) : (
                    <>
                      {isPass ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {t("hrMentorReviewApproval.confirmAndMove")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StarSection({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr]">
      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{label}</p>
      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}

function FreeTextSection({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-white/60 p-2 dark:bg-slate-900/40">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
        {value || <span className="text-slate-400 italic">—</span>}
      </p>
    </div>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${
            n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

// ============================================================
// Wrapper that resolves round type per application
// ============================================================

interface ResolvedItemProps {
  detail: ApplicationDetail;
  application?: Application;
}

function ResolvedItem({ detail, application }: ResolvedItemProps) {
  const { data: round, isLoading: roundLoading } = useCurrentRound(
    detail.applicationId ?? 0,
    detail.applicationId !== undefined
  );

  const isMentorReview = round?.roundType === "MENTROR_REVIEW";
  const isPending =
    detail.status === "AI_EVALUATED" &&
    (detail.hrScore === undefined || detail.hrScore === null) &&
    isMentorReview;

  const [expanded, setExpanded] = useState<boolean>(true);
  const [version, setVersion] = useState(0);

  const item: PendingItem = useMemo(
    () => ({ detail, application, round, roundLoading }),
    [detail, application, round, roundLoading]
  );

  if (!isPending) return null;

  return (
    <PendingReviewRow
      key={`${detail.id}-${version}`}
      item={item}
      isExpanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      onApproved={() => {
        setVersion((v) => v + 1);
        setExpanded(false);
      }}
    />
  );
}

// ============================================================
// Main shared page
// ============================================================

export function HrMentorReviewApprovalPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const isStaff = location.pathname.startsWith("/staff");

  const {
    data: reviewerDetails = [],
    isLoading: isReviewerLoading,
    refetch: refetchReviewer,
  } = useApplicationDetailsForReviewer(isStaff);

  const { data: rawApps, isLoading: isAppsLoading } = useApplications();

  const applications = useMemo(() => (Array.isArray(rawApps) ? rawApps : []), [rawApps]);
  const inProgressAppIds = useMemo(
    () =>
      applications
        .filter((app) => app.status === "IN_PROGRESS" || app.status === "PASSED")
        .map((app) => app.id!)
        .filter((id): id is number => typeof id === "number" && id > 0),
    [applications]
  );

  // Filter out auto-graded rounds (QUIZ, etc.) from reviewer details
  const filteredReviewerDetails = useMemo(
    () => filterOutAutoGradedRounds(reviewerDetails),
    [reviewerDetails]
  );

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <div className="flex flex-none flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("hrMentorReviewApproval.pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("hrMentorReviewApproval.pageDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <MessageSquare className="h-3.5 w-3.5" />
          {t("hrMentorReviewApproval.reviewerHint")}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isStaff ? (
          <StaffList
            details={filteredReviewerDetails}
            isLoading={isReviewerLoading}
            onReload={refetchReviewer}
          />
        ) : (
          <AdminList
            appIds={inProgressAppIds}
            isLoading={isAppsLoading}
            applications={applications}
          />
        )}
      </div>
    </div>
  );
}

function StaffList({
  details,
  isLoading,
  onReload,
}: {
  details: ApplicationDetail[];
  isLoading: boolean;
  onReload: () => void;
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  return (
    <ResolvedList
      details={details}
      applications={undefined}
      emptyText={t("hrMentorReviewApproval.noPending")}
      onReload={onReload}
    />
  );
}

function AdminList({
  appIds,
  isLoading,
  applications,
}: {
  appIds: number[];
  isLoading: boolean;
  applications: Application[];
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  return (
    <AdminDetailAggregator
      appIds={appIds}
      applications={applications}
      emptyText={t("hrMentorReviewApproval.noPending")}
    />
  );
}

function AdminDetailAggregator({
  appIds,
  applications,
  emptyText,
}: {
  appIds: number[];
  applications: Application[];
  emptyText: string;
}) {
  const appMap = useMemo(() => {
    const m: Record<number, Application | undefined> = {};
    applications.forEach((app) => {
      if (app.id) m[app.id] = app;
    });
    return m;
  }, [applications]);

  if (appIds.length === 0) {
    return <EmptyHint text={emptyText} />;
  }

  return (
    <div className="space-y-4">
      {appIds.map((appId) => (
        <AdminAppDetails key={appId} applicationId={appId} application={appMap[appId]} />
      ))}
    </div>
  );
}

function AdminAppDetails({
  applicationId,
  application,
}: {
  applicationId: number;
  application?: Application;
}) {
  const { t } = useTranslation();
  const { data: details = [], isLoading } = useApplicationDetails(applicationId);

  if (isLoading) {
    return (
      <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700">
        <Spinner className="mr-2 h-3 w-3" />
        {t("hrMentorReviewApproval.loadingDetails")}
      </div>
    );
  }

  const pendingMentorReviews = details.filter(
    (d: ApplicationDetail) =>
      d.status === "AI_EVALUATED" && (d.hrScore === undefined || d.hrScore === null)
  );
  if (pendingMentorReviews.length === 0) return null;

  return (
    <div className="space-y-3">
      {pendingMentorReviews.map((d: ApplicationDetail) => (
        <ResolvedItem
          key={d.id ?? `${d.applicationId}-${d.roundId}`}
          detail={d}
          application={application}
        />
      ))}
    </div>
  );
}

function ResolvedList({
  details,
  applications,
  emptyText,
  onReload,
}: {
  details: ApplicationDetail[];
  applications?: Application[];
  emptyText: string;
  onReload?: () => void;
}) {
  const { t } = useTranslation();

  const appMap = useMemo(() => {
    const m: Record<number, Application | undefined> = {};
    applications?.forEach((a) => {
      if (a.id) m[a.id] = a;
    });
    return m;
  }, [applications]);

  const pending = details.filter(
    (d: ApplicationDetail) =>
      d.status === "AI_EVALUATED" && (d.hrScore === undefined || d.hrScore === null)
  );

  if (pending.length === 0) {
    return <EmptyHint text={emptyText} />;
  }

  return (
    <div className="space-y-3">
      {pending.map((d: ApplicationDetail) => (
        <ResolvedItem
          key={d.id ?? `${d.applicationId}-${d.roundId}`}
          detail={d}
          application={appMap[d.applicationId ?? -1]}
        />
      ))}
      {onReload && (
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onReload} className="gap-1 text-xs">
            <ChevronDown className="h-3.5 w-3.5" />
            {t("common.reload")}
          </Button>
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 border-y border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <CheckCircle2 className="h-6 w-6 text-slate-400 dark:text-slate-500" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-500">{text}</p>
        <p className="mt-1 text-xs text-slate-400">{t("hrMentorReviewApproval.emptyHint")}</p>
      </div>
    </div>
  );
}
