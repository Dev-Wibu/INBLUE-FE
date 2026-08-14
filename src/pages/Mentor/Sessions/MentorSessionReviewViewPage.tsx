import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { TimeAgo } from "@/components/ui/time-ago";
import { useUserById } from "@/hooks/useApplication";
import {
  useMentorReviewBySession,
  useUpdateMentorReview,
  type MentorReview,
} from "@/hooks/useMentorReview";
import { useSessionById } from "@/hooks/useSession";
import { treatZuluAsVietnamLocal } from "@/lib/formatting";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  Lightbulb,
  Mail,
  Pencil,
  Save,
  Star,
  Target,
  ThumbsUp,
  UserRound,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

interface MentorRouteState {
  returnTo?: string;
}

type ReviewTextField =
  | "situationNote"
  | "taskNote"
  | "actionNote"
  | "resultNote"
  | "strength"
  | "weakness"
  | "improve";

interface ReviewDraft extends Record<ReviewTextField, string> {
  rating: number;
}

interface ReviewSectionConfig {
  field: ReviewTextField;
  labelKey: string;
  icon: LucideIcon;
  tone: "sky" | "indigo" | "emerald" | "rose" | "violet";
}

const STAR_SECTIONS: ReviewSectionConfig[] = [
  { field: "situationNote", labelKey: "mentorReviews.situation", icon: Target, tone: "sky" },
  { field: "taskNote", labelKey: "mentorReviews.tasks", icon: ClipboardList, tone: "indigo" },
  { field: "actionNote", labelKey: "mentorReviews.action", icon: Zap, tone: "indigo" },
  { field: "resultNote", labelKey: "mentorReviews.result", icon: Check, tone: "sky" },
];

const ADDITIONAL_SECTIONS: ReviewSectionConfig[] = [
  { field: "strength", labelKey: "common.strengths", icon: ThumbsUp, tone: "emerald" },
  { field: "weakness", labelKey: "common.pointsForImprovement", icon: Wrench, tone: "rose" },
  {
    field: "improve",
    labelKey: "common.suggestedImprovements",
    icon: Lightbulb,
    tone: "violet",
  },
];

const TONE_STYLES: Record<ReviewSectionConfig["tone"], string> = {
  sky: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
};

const createDraft = (review?: MentorReview): ReviewDraft => ({
  rating: typeof review?.rating === "number" ? review.rating : 0,
  situationNote: review?.situationNote || "",
  taskNote: review?.taskNote || "",
  actionNote: review?.actionNote || "",
  resultNote: review?.resultNote || "",
  strength: review?.strength || "",
  weakness: review?.weakness || "",
  improve: review?.improve || "",
});

const normalizeOptionalText = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

const getSafeReturnTo = (state: unknown): string => {
  const returnTo = (state as MentorRouteState | null)?.returnTo;
  return typeof returnTo === "string" &&
    (returnTo.startsWith("/mentor/") || returnTo.startsWith("/mentor?"))
    ? returnTo
    : "/mentor?tab=sessions";
};

interface EditableReviewSectionProps {
  config: ReviewSectionConfig;
  value: string;
  editing: boolean;
  active: boolean;
  onActivate: () => void;
  onChange: (_value: string) => void;
}

function EditableReviewSection({
  config,
  value,
  editing,
  active,
  onActivate,
  onChange,
}: EditableReviewSectionProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const Icon = config.icon;

  useEffect(() => {
    if (editing && active) {
      textareaRef.current?.focus();
    }
  }, [active, editing]);

  return (
    <div
      onDoubleClick={onActivate}
      className="group relative min-w-0 border-b border-slate-100 px-5 py-4 last:border-b-0 dark:border-slate-800">
      <div className="mb-2 flex items-center gap-2 pr-8">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONE_STYLES[config.tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {t(config.labelKey)}
        </h3>
      </div>

      {editing ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onFocus={onActivate}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 resize-y border-slate-200 text-sm leading-6 focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-700"
        />
      ) : (
        <p className="min-h-12 text-sm leading-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {value.trim() || "—"}
        </p>
      )}

      {!editing && (
        <button
          type="button"
          onClick={onActivate}
          title={t("common.editReview")}
          aria-label={`${t("common.editReview")}: ${t(config.labelKey)}`}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-slate-100 hover:text-indigo-600 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:bg-slate-800 dark:hover:text-indigo-400">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function MentorSessionReviewViewPage() {
  const { t } = useTranslation();
  const { sessionId: sessionIdParam } = useParams<{ sessionId: string }>();
  const sessionId = Number(sessionIdParam);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isLoading: sessionLoading } = useSessionById(sessionId);
  const { data: review, isLoading: reviewLoading } = useMentorReviewBySession(sessionId);
  const updateReviewMutation = useUpdateMentorReview();
  const studentUserId = session?.userId ?? review?.user?.id ?? 0;
  const { data: studentInfo } = useUserById(studentUserId);
  const [editing, setEditing] = useState(false);
  const [activeField, setActiveField] = useState<ReviewTextField | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>(() => createDraft(review));
  const returnTo = getSafeReturnTo(location.state);
  const hasInternalReturn = Boolean((location.state as MentorRouteState | null)?.returnTo);
  const routeState = {
    returnTo: `/mentor/sessions/${sessionId}`,
  } satisfies MentorRouteState;

  useEffect(() => {
    if (!editing) {
      setDraft(createDraft(review));
    }
  }, [editing, review]);

  const studentName =
    review?.user?.name ||
    studentInfo?.name ||
    (studentUserId ? t("common.studentVar0", { var_0: studentUserId }) : t("common.students"));
  const studentEmail = review?.user?.email || studentInfo?.email;
  const studentAvatarUrl = review?.user?.avatarUrl || studentInfo?.avatarUrl;
  const reviewEndedAt = session?.endTime1 ? treatZuluAsVietnamLocal(session.endTime1) : null;

  const startEditing = (field?: ReviewTextField) => {
    setActiveField(field || null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(createDraft(review));
    setActiveField(null);
    setEditing(false);
  };

  const saveReview = async () => {
    if (!review?.id) return;
    await updateReviewMutation.mutateAsync({
      id: review.id,
      data: {
        rating: draft.rating > 0 ? draft.rating : undefined,
        situationNote: normalizeOptionalText(draft.situationNote),
        taskNote: normalizeOptionalText(draft.taskNote),
        actionNote: normalizeOptionalText(draft.actionNote),
        resultNote: normalizeOptionalText(draft.resultNote),
        strength: normalizeOptionalText(draft.strength),
        weakness: normalizeOptionalText(draft.weakness),
        improve: normalizeOptionalText(draft.improve),
      },
    });
    setActiveField(null);
    setEditing(false);
  };

  const updateTextField = (field: ReviewTextField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const goBack = () => {
    if (hasInternalReturn) {
      navigate(-1);
      return;
    }
    navigate(`/mentor/sessions/${sessionId}`, { replace: true });
  };

  if (sessionLoading || reviewLoading) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex h-16 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
          <Skeleton className="h-8 w-72" />
        </div>
        <div className="space-y-5 p-4 sm:p-6">
          <Skeleton className="h-32" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] items-center justify-center bg-slate-50 p-6 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Star className="h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-900 dark:text-white">
            {t("common.noInterviewSessionsFound")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              hasInternalReturn ? navigate(-1) : navigate(returnTo, { replace: true })
            }>
            <ArrowLeft className="h-4 w-4" />
            {t("general.back")}
          </Button>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="-m-4 flex h-[calc(100%+32px)] items-center justify-center bg-slate-50 p-6 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <Star className="h-10 w-10 text-slate-400" />
          <p className="font-semibold text-slate-900 dark:text-white">
            {t("mentorSessions.thereAreNoReviewsSubmitted")}
          </p>
          <Button
            size="sm"
            onClick={() => navigate(`/mentor/sessions/${sessionId}/review`, { state: routeState })}>
            <Pencil className="h-4 w-4" />
            {t("common.writeAReview")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
      <header className="flex flex-none flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label={t("common.backToTheSession")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-950/40">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goBack}
            className="hidden text-xs font-medium text-slate-500 hover:text-indigo-600 sm:block dark:text-slate-400 dark:hover:text-indigo-400">
            {t("common.interviewSession")} #{sessionId}
          </button>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" />
          <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
            {t("mentorReviews.mentorReviewReport")} #{review.id}
          </h1>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            {t("general.completed")}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={updateReviewMutation.isPending}
                className="h-8 px-3 text-xs">
                <X className="h-3.5 w-3.5" />
                {t("general.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={saveReview}
                disabled={updateReviewMutation.isPending}
                className="h-8 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">
                <Save className="h-3.5 w-3.5" />
                {t("common.save")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing()}
              className="h-8 px-3 text-xs font-semibold">
              <Pencil className="h-3.5 w-3.5" />
              {t("common.editReview")}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="rounded-lg bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {studentName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900 dark:text-white">
                  {studentName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {studentEmail && (
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {studentEmail}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    {session.roomName || t("common.interviewSession")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-w-[220px] flex-col gap-2 lg:items-end">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("mentorReviews.overallAssessment")}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {(editing ? draft.rating : review.rating || 0).toFixed(1)}
                  <span className="ml-1 text-sm font-medium text-slate-500">/5</span>
                </span>
                <StarRating
                  value={editing ? draft.rating : review.rating || 0}
                  onChange={
                    editing
                      ? (rating) => setDraft((current) => ({ ...current, rating }))
                      : undefined
                  }
                  readOnly={!editing}
                  size="md"
                />
              </div>
              {reviewEndedAt && !editing && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <TimeAgo date={String(reviewEndedAt)} />
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-5 p-4 sm:p-6">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("mentorReviews.detailedAssessmentStarMethod")}
              </h2>
            </div>
            <div className="grid lg:grid-cols-2">
              {STAR_SECTIONS.map((config, index) => (
                <div
                  key={config.field}
                  className={
                    index % 2 === 0
                      ? "lg:border-r lg:border-slate-100 dark:lg:border-slate-800"
                      : ""
                  }>
                  <EditableReviewSection
                    config={config}
                    value={draft[config.field]}
                    editing={editing}
                    active={activeField === config.field}
                    onActivate={() => startEditing(config.field)}
                    onChange={(value) => updateTextField(config.field, value)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("compReview.additionalCommentsOptional")}
              </h2>
            </div>
            <div className="grid lg:grid-cols-3 lg:divide-x lg:divide-slate-100 dark:lg:divide-slate-800">
              {ADDITIONAL_SECTIONS.map((config) => (
                <EditableReviewSection
                  key={config.field}
                  config={config}
                  value={draft[config.field]}
                  editing={editing}
                  active={activeField === config.field}
                  onActivate={() => startEditing(config.field)}
                  onChange={(value) => updateTextField(config.field, value)}
                />
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
