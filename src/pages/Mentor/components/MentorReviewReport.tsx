import { MentorScoreDisplay } from "@/components/review/MentorScoreDisplay";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/formatting";
import { MENTOR_REVIEW_NOTE_MAX_LENGTH } from "@/lib/mentor-review-validation";
import { cn } from "@/lib/utils";
import type { MentorFeedback } from "@/services/mentor-feedback.manager";
import type { MentorReview } from "@/services/mentor-review.manager";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  Calendar,
  Gauge,
  Lightbulb,
  MessageSquare,
  MessageSquareQuote,
  Sparkles,
  Target,
  ThumbsUp,
  TrendingUp,
  User,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type MentorReviewTextField =
  | "situationNote"
  | "taskNote"
  | "actionNote"
  | "resultNote"
  | "strength"
  | "weakness"
  | "improve";

export interface MentorReviewReportDraft extends Record<MentorReviewTextField, string> {
  rating: number;
}

interface ReviewPerson {
  id?: number;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

interface MentorReviewReportProps {
  review: MentorReviewReportDraft | MentorReview;
  sessionId: number;
  roomName?: string;
  joinedAt?: string;
  mentor?: ReviewPerson | null;
  candidate?: ReviewPerson | null;
  candidateFeedback?: MentorFeedback | null;
  editing?: boolean;
  activeField?: MentorReviewTextField | null;
  onActivateField?: (_field: MentorReviewTextField) => void;
  onTextChange?: (_field: MentorReviewTextField, _value: string) => void;
  onRatingChange?: (_rating: number) => void;
}

const ratingLabel = (rating: number, t: TFunction) => {
  if (rating >= 5) return t("common.excellent");
  if (rating >= 4) return t("common.veryGood");
  if (rating >= 3) return t("common.meetsExpectations");
  if (rating >= 2) return t("common.needsImprovement");
  return t("common.notRated");
};

function ReviewTextPanel({
  field,
  value,
  title,
  icon: Icon,
  editing,
  active,
  onActivate,
  onChange,
}: {
  field: MentorReviewTextField;
  value?: string;
  title: string;
  icon: LucideIcon;
  editing: boolean;
  active: boolean;
  onActivate?: (_field: MentorReviewTextField) => void;
  onChange?: (_field: MentorReviewTextField, _value: string) => void;
}) {
  const { t } = useTranslation();
  const characterCount = value?.length ?? 0;
  const isOverLimit = characterCount > MENTOR_REVIEW_NOTE_MAX_LENGTH;

  return (
    <div
      className={cn(
        "flex-1 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900",
        editing && "cursor-text hover:border-indigo-300 dark:hover:border-indigo-700",
        active && "border-indigo-400 ring-2 ring-indigo-500/15 dark:border-indigo-600"
      )}
      onDoubleClick={() => onActivate?.(field)}>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {editing ? (
        <Textarea
          value={value || ""}
          maxLength={MENTOR_REVIEW_NOTE_MAX_LENGTH}
          onFocus={() => onActivate?.(field)}
          onChange={(event) => onChange?.(field, event.target.value)}
          className="min-h-24 resize-y border-slate-200 bg-slate-50/70 text-sm leading-relaxed focus-visible:border-indigo-400 focus-visible:ring-indigo-400/20 dark:border-slate-800 dark:bg-slate-950/60"
        />
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {value || "-"}
        </p>
      )}
      {editing && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={cn("text-xs", isOverLimit ? "text-rose-600" : "text-slate-500")}>
            {isOverLimit
              ? t("mentorSessions.reviewNoteMaxLength", {
                  max: MENTOR_REVIEW_NOTE_MAX_LENGTH,
                })
              : t("mentorSessions.reviewNoteCharacterCount", {
                  count: characterCount,
                  max: MENTOR_REVIEW_NOTE_MAX_LENGTH,
                })}
          </p>
        </div>
      )}
    </div>
  );
}

export function MentorReviewReport({
  review,
  sessionId,
  roomName,
  joinedAt,
  mentor,
  candidate,
  candidateFeedback,
  editing = false,
  activeField,
  onActivateField,
  onTextChange,
  onRatingChange,
}: MentorReviewReportProps) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<"mentor" | "candidate">("mentor");
  const mentorRating = Number(review.rating || 0);
  const candidateRating = Number(candidateFeedback?.rating || 0);
  const formattedDate = joinedAt ? formatDate(joinedAt) : "-";
  const starItems: Array<{
    field: MentorReviewTextField;
    letter: string;
    title: string;
    icon: LucideIcon;
    value?: string;
    color: string;
  }> = [
    {
      field: "situationNote",
      letter: "S",
      title: t("mentorReviews.situation"),
      icon: MessageSquare,
      value: review.situationNote,
      color:
        "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300",
    },
    {
      field: "taskNote",
      letter: "T",
      title: t("mentorReviews.tasks"),
      icon: Target,
      value: review.taskNote,
      color:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/80 dark:text-sky-300",
    },
    {
      field: "actionNote",
      letter: "A",
      title: t("mentorReviews.action"),
      icon: Zap,
      value: review.actionNote,
      color:
        "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/80 dark:text-violet-300",
    },
    {
      field: "resultNote",
      letter: "R",
      title: t("mentorReviews.result"),
      icon: TrendingUp,
      value: review.resultNote,
      color:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-300",
    },
  ];
  const visibleStarItems = editing ? starItems : starItems.filter((item) => Boolean(item.value));

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="min-w-0 space-y-8 lg:col-span-8">
        {activeView === "mentor" ? (
          <div className="animate-in fade-in space-y-8 duration-200">
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t("mentorReviews.detailedAssessmentStarMethod")}</span>
                </h2>
                <MentorScoreDisplay value={mentorRating} showBand />
              </div>

              {visibleStarItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("compReview.thereIsNoDetailedReview")}
                </p>
              ) : (
                <div className="relative space-y-6 pl-8 before:absolute before:top-3 before:bottom-3 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {visibleStarItems.map((item) => (
                    <div key={item.field} className="relative flex gap-4">
                      <div
                        className={cn(
                          "absolute -left-8 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-extrabold shadow-2xs",
                          item.color
                        )}>
                        {item.letter}
                      </div>
                      <ReviewTextPanel
                        field={item.field}
                        value={item.value}
                        title={item.title}
                        icon={item.icon}
                        editing={editing}
                        active={activeField === item.field}
                        onActivate={onActivateField}
                        onChange={onTextChange}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-5">
              <h2 className="flex items-center gap-2 border-b border-slate-200/80 pb-3 text-base font-bold text-slate-900 dark:border-slate-800/80 dark:text-white">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>{t("mentorReviews.additionalComments")}</span>
              </h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ReviewTextPanel
                  field="strength"
                  value={review.strength}
                  title={t("common.strengths")}
                  icon={ThumbsUp}
                  editing={editing}
                  active={activeField === "strength"}
                  onActivate={onActivateField}
                  onChange={onTextChange}
                />
                <ReviewTextPanel
                  field="weakness"
                  value={review.weakness}
                  title={t("common.pointsForImprovement")}
                  icon={AlertTriangle}
                  editing={editing}
                  active={activeField === "weakness"}
                  onActivate={onActivateField}
                  onChange={onTextChange}
                />
              </div>
              <ReviewTextPanel
                field="improve"
                value={review.improve}
                title={t("common.suggestedImprovements")}
                icon={Lightbulb}
                editing={editing}
                active={activeField === "improve"}
                onActivate={onActivateField}
                onChange={onTextChange}
              />
            </section>
          </div>
        ) : (
          <section className="animate-in fade-in space-y-5 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <MessageSquareQuote className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                <span>{t("common.responseReceived")}</span>
              </h2>
              {candidateFeedback && (
                <Badge className="bg-sky-50 text-xs font-bold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  {candidateRating.toFixed(1)}/5
                </Badge>
              )}
            </div>
            {candidateFeedback ? (
              <>
                <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row dark:border-slate-800/80 dark:bg-slate-900">
                  <PersonRow person={candidate} fallback="U" tone="sky" />
                  <div className="flex items-center gap-3">
                    <StarRating value={candidateRating} readOnly size="md" color="sky" />
                    <Badge
                      variant="outline"
                      className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
                      {ratingLabel(candidateRating, t)}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
                  <blockquote className="rounded-xl border-l-4 border-sky-500 bg-sky-50/40 p-4 text-sm leading-relaxed text-slate-700 italic dark:border-sky-400 dark:bg-sky-950/20 dark:text-slate-300">
                    {candidateFeedback.comment || t("common.noComments")}
                  </blockquote>
                </div>
              </>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <MessageSquareQuote className="h-10 w-10 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t("common.noResponseYet")}
                </h3>
              </div>
            )}
          </section>
        )}
      </div>

      <aside className="min-w-0 space-y-6 lg:col-span-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800/60">
            <Gauge className="h-4 w-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
              {t("mentorReviews.overallAssessment")}
            </h3>
          </div>
          <MentorScoreSelector
            active={activeView === "mentor"}
            label={t("common.reviewFromMentor")}
            rating={mentorRating}
            editable={editing}
            onClick={() => setActiveView("mentor")}
            onRatingChange={onRatingChange}
          />
          <RatingSelector
            active={activeView === "candidate"}
            label={t("common.responseReceived")}
            rating={candidateRating}
            empty={!candidateFeedback}
            onClick={() => setActiveView("candidate")}
            t={t}
          />
        </section>

        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800/80 dark:bg-slate-900">
          <h3 className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
            <Video className="h-4 w-4 text-indigo-500" />
            <span>{t("common.sessionInformation")}</span>
          </h3>
          <div className="space-y-6">
            <div className="space-y-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t("common.session")}
                </span>
                <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
                  #{sessionId}
                </span>
              </div>
              {roomName && (
                <div className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{t("common.room")}</span>
                  <span className="truncate font-mono font-bold text-slate-900 dark:text-white">
                    {roomName}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  {t("common.time")}
                </span>
                <span className="text-right font-semibold text-slate-900 dark:text-slate-200">
                  {formattedDate}
                </span>
              </div>
            </div>
            <LabeledPerson
              label={t("common.mentor")}
              badge={t("common.reviewer")}
              person={mentor}
              fallback="M"
              tone="indigo"
            />
            <LabeledPerson
              label={t("common.candidate")}
              badge={t("common.interview")}
              person={candidate}
              fallback="U"
              tone="sky"
            />
          </div>
        </section>
      </aside>
    </div>
  );
}

function PersonRow({
  person,
  fallback,
  tone,
}: {
  person?: ReviewPerson | null;
  fallback: string;
  tone: "indigo" | "sky";
}) {
  const name = person?.name || (person?.id ? `#${person.id}` : fallback);
  return (
    <div className="flex min-w-0 items-center gap-3.5">
      <Avatar className="h-11 w-11 shrink-0 rounded-[14px] border border-slate-200 shadow-2xs dark:border-slate-800">
        <AvatarImage src={person?.avatarUrl} alt={name} />
        <AvatarFallback
          className={cn(
            "rounded-[14px] font-bold",
            tone === "sky"
              ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          )}>
          {name.charAt(0).toUpperCase() || fallback}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h4 className="truncate text-sm font-bold text-slate-900 dark:text-white">{name}</h4>
        <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {person?.email || (person?.id ? `ID: #${person.id}` : "-")}
        </p>
      </div>
    </div>
  );
}

function LabeledPerson({
  label,
  badge,
  person,
  fallback,
  tone,
}: {
  label: string;
  badge: string;
  person?: ReviewPerson | null;
  fallback: string;
  tone: "indigo" | "sky";
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-bold text-slate-400 uppercase">{label}</span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-[10px] font-bold",
            tone === "sky"
              ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          )}>
          {badge}
        </span>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-950/50">
        <PersonRow person={person} fallback={fallback} tone={tone} />
      </div>
    </div>
  );
}

function RatingSelector({
  active,
  label,
  rating,
  empty,
  onClick,
  t,
}: {
  active: boolean;
  label: string;
  rating: number;
  empty?: boolean;
  onClick: () => void;
  t: TFunction;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-all",
        active && "border-2 border-sky-500 bg-white ring-2 ring-sky-400/20 dark:bg-slate-900",
        !active &&
          "border border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40"
      )}>
      <div className="min-w-0 space-y-1">
        <p
          className={cn(
            "truncate text-[11px] font-extrabold uppercase",
            "text-sky-700 dark:text-sky-400"
          )}>
          {label}
        </p>
        {empty ? (
          <span className="text-xs text-slate-400 italic">{t("common.noResponseYet")}</span>
        ) : (
          <div className="flex items-center gap-2">
            <StarRating value={rating} readOnly size="sm" color="sky" />
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              {rating.toFixed(1)}/5
            </span>
          </div>
        )}
      </div>
      {!empty && (
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[10px] font-bold",
            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300"
          )}>
          {ratingLabel(rating, t)}
        </Badge>
      )}
    </button>
  );
}

function MentorScoreSelector({
  active,
  label,
  rating,
  editable,
  onClick,
  onRatingChange,
}: {
  active: boolean;
  label: string;
  rating: number;
  editable?: boolean;
  onClick: () => void;
  onRatingChange?: (_rating: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl p-3.5 text-left transition-all",
        active && "border-2 border-indigo-500 bg-white ring-2 ring-indigo-400/20 dark:bg-slate-900",
        !active &&
          "border border-slate-200 bg-slate-50/60 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40"
      )}>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate text-[11px] font-extrabold text-indigo-700 uppercase dark:text-indigo-400">
          {label}
        </p>
        {editable ? (
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              value={rating > 0 ? rating : ""}
              onChange={(event) => onRatingChange?.(Number(event.target.value) || 0)}
              className="h-9 w-24 border-indigo-200 bg-white text-right font-mono font-bold text-slate-900 tabular-nums placeholder:text-slate-400 focus-visible:ring-indigo-500 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark] dark:placeholder:text-slate-500"
              aria-label={label}
            />
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">/100</span>
          </div>
        ) : (
          <MentorScoreDisplay value={rating} showBand showProgress />
        )}
      </div>
      <Gauge className="h-5 w-5 shrink-0 text-indigo-500" aria-hidden="true" />
    </button>
  );
}
