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
  MentorDetailHeader,
  MentorDetailPage,
  MentorDetailPanel,
  MentorPanelHeading,
} from "@/pages/Mentor/components/MentorDetailLayout";
import {
  ArrowLeft,
  Check,
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
    <div onDoubleClick={onActivate} className="group relative min-w-0 px-5 py-4">
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

  const displayedRating = editing ? draft.rating : review.rating || 0;

  return (
    <MentorDetailPage>
      <MentorDetailHeader
        onBack={goBack}
        backLabel={t("general.back")}
        parentLabel={`${t("common.interviewSession")} #${sessionId}`}
        title={`${t("mentorReviews.mentorReviewReport")} #${review.id}`}
        badge={
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            {t("general.completed")}
          </Badge>
        }
        actions={
          editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={updateReviewMutation.isPending}
                className="h-9 rounded-xl px-3">
                <X className="h-4 w-4" />
                {t("general.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={saveReview}
                disabled={updateReviewMutation.isPending}
                className="h-9 rounded-xl bg-indigo-600 px-3 font-semibold text-white hover:bg-indigo-700">
                <Save className="h-4 w-4" />
                {t("common.save")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => startEditing()}
              className="h-9 rounded-xl px-3 font-semibold">
              <Pencil className="h-4 w-4" />
              {t("common.editReview")}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <MentorDetailPanel>
            <MentorPanelHeading
              icon={<ClipboardList className="h-4 w-4" />}
              title={t("mentorReviews.detailedAssessmentStarMethod")}
            />
            <div className="relative space-y-5 p-5 pl-14 before:absolute before:top-8 before:bottom-8 before:left-[31px] before:w-px before:bg-slate-200 before:content-[''] dark:before:bg-slate-700">
              {STAR_SECTIONS.map((config, index) => (
                <div
                  key={config.field}
                  className="relative rounded-xl border border-slate-200/90 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                  <span className="absolute top-5 -left-[43px] z-10 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-xs font-bold text-white dark:border-slate-900">
                    {"STAR"[index]}
                  </span>
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
          </MentorDetailPanel>

          <MentorDetailPanel>
            <MentorPanelHeading
              icon={<Lightbulb className="h-4 w-4" />}
              title={t("compReview.additionalCommentsOptional")}
            />
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
          </MentorDetailPanel>
        </div>

        <aside className="min-w-0 space-y-6 lg:col-span-4">
          <MentorDetailPanel className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 shrink-0 border border-slate-200 dark:border-slate-700">
                <AvatarImage src={studentAvatarUrl} alt={studentName} />
                <AvatarFallback className="bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {studentName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-950 dark:text-white">
                  {studentName}
                </p>
                {studentEmail && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {studentEmail}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  {session.roomName || t("common.interviewSession")}
                </p>
              </div>
            </div>
          </MentorDetailPanel>

          <MentorDetailPanel className="p-5 lg:sticky lg:top-6">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("mentorReviews.overallAssessment")}
            </p>
            <p className="mt-3 text-4xl font-bold text-slate-950 dark:text-white">
              {displayedRating.toFixed(1)}
              <span className="text-base font-medium text-slate-400">/5</span>
            </p>
            <StarRating
              value={displayedRating}
              onChange={
                editing ? (rating) => setDraft((current) => ({ ...current, rating })) : undefined
              }
              readOnly={!editing}
              size="md"
              className="mt-4"
            />
            {reviewEndedAt && !editing && (
              <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <TimeAgo date={String(reviewEndedAt)} />
              </p>
            )}
          </MentorDetailPanel>
        </aside>
      </div>
    </MentorDetailPage>
  );
}
