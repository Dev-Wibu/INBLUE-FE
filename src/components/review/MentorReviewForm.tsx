/**
 * MentorReviewForm — Mentor interview review form, v4 "Authoring Surface".
 *
 * Replaces the previous "card wrapping a stack of inputs" feel with a
 * free-flowing authoring surface: each section has its own rhythm
 * (rating hero, STAR cards with distinct personality, additional
 * comments), while the side rail (progress + student-view preview) is
 * aligned to the form's content rather than floating in a separate box.
 *
 * Form schema, default values, submit pipeline, and validation messages
 * are all preserved exactly. The form's public props are unchanged.
 */

import { MentorScoreDisplay } from "@/components/review/MentorScoreDisplay";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MENTOR_REVIEW_NOTE_MAX_LENGTH } from "@/lib/mentor-review-validation";
import { cn } from "@/lib/utils";
import type { MentorReview } from "@/services/mentor-review.manager";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  MessageSquare,
  Send,
  Sparkles,
  Target,
  ThumbsUp,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

// ---------- Confetti (lazy import so tests/Vitest don't pull canvas) ----------

async function fireConfetti() {
  if (typeof window === "undefined") return;
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  const mod = await import("canvas-confetti");
  const confetti = mod.default;
  const colors = ["#0ea5e9", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.65 },
    colors,
    scalar: 0.9,
  });
}

// ---------- STAR card config (component-file, Fast-Refresh clean) ----------

type StarKind = "situation" | "task" | "action" | "result";
type AdditionalKind = "strength" | "weakness" | "improve";

interface StarConfig {
  field: StarKind;
  icon: LucideIcon;
  letter: string;
  labelKey: string;
  placeholderKey: string;
  promptKey: string;
  /** Tint used for the left accent rail + letter badge */
  hue: "sky" | "indigo" | "blue" | "cyan";
}

const STAR_CARDS: StarConfig[] = [
  {
    field: "situation",
    icon: Target,
    letter: "S",
    hue: "sky",
    labelKey: "compReview.situation",
    placeholderKey: "compReview.describeTheContextOfThe",
    promptKey: "compReview.promptSituation",
  },
  {
    field: "task",
    icon: ClipboardList,
    letter: "T",
    hue: "indigo",
    labelKey: "compReview.task",
    placeholderKey: "compReview.tasksStudentsNeedToComplete",
    promptKey: "compReview.promptTask",
  },
  {
    field: "action",
    icon: Zap,
    letter: "A",
    hue: "blue",
    labelKey: "compReview.action",
    placeholderKey: "compReview.theActionsStudentsTookDuring",
    promptKey: "compReview.promptAction",
  },
  {
    field: "result",
    icon: CheckCircle2,
    letter: "R",
    hue: "cyan",
    labelKey: "compReview.result",
    placeholderKey: "compReview.theResultsStudentsAchievedAfter",
    promptKey: "compReview.promptResult",
  },
];

interface AdditionalConfig {
  field: AdditionalKind;
  icon: LucideIcon;
  hue: "emerald" | "rose" | "violet";
  labelKey: string;
  placeholderKey: string;
}

const ADDITIONAL_CARDS: AdditionalConfig[] = [
  {
    field: "strength",
    icon: ThumbsUp,
    hue: "emerald",
    labelKey: "compReview.studentStrengths",
    placeholderKey: "compReview.theStrengthsYouSeeIn",
  },
  {
    field: "weakness",
    icon: Wrench,
    hue: "rose",
    labelKey: "common.pointsForImprovement",
    placeholderKey: "compReview.pointsStudentsCanImprove",
  },
  {
    field: "improve",
    icon: Lightbulb,
    hue: "violet",
    labelKey: "common.suggestedImprovements1",
    placeholderKey: "compReview.yourSpecificSuggestionsForStudents",
  },
];

// Hue → class map. Single neutral surface for body; hue only used as an
// accent (left rail, letter badge, icon tint) so the form never feels
// like a "fruit salad" of colored cards.
const HUE_ACCENT: Record<
  StarConfig["hue"] | AdditionalConfig["hue"],
  { rail: string; icon: string; badge: string; bar: string }
> = {
  sky: {
    rail: "from-sky-400/70 via-sky-400/40 to-transparent",
    icon: "text-sky-600 dark:text-sky-300",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    bar: "bg-sky-500/70",
  },
  indigo: {
    rail: "from-indigo-400/70 via-indigo-400/40 to-transparent",
    icon: "text-indigo-600 dark:text-indigo-300",
    badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-200",
    bar: "bg-indigo-500/70",
  },
  blue: {
    rail: "from-blue-400/70 via-blue-400/40 to-transparent",
    icon: "text-blue-600 dark:text-blue-300",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-200",
    bar: "bg-blue-500/70",
  },
  cyan: {
    rail: "from-cyan-400/70 via-cyan-400/40 to-transparent",
    icon: "text-cyan-600 dark:text-cyan-300",
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
    bar: "bg-cyan-500/70",
  },
  emerald: {
    rail: "from-emerald-400/70 via-emerald-400/40 to-transparent",
    icon: "text-emerald-600 dark:text-emerald-300",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    bar: "bg-emerald-500/70",
  },
  rose: {
    rail: "from-rose-400/70 via-rose-400/40 to-transparent",
    icon: "text-rose-600 dark:text-rose-300",
    badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
    bar: "bg-rose-500/70",
  },
  violet: {
    rail: "from-violet-400/70 via-violet-400/40 to-transparent",
    icon: "text-violet-600 dark:text-violet-300",
    badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
    bar: "bg-violet-500/70",
  },
};

const CHAR_TARGET = MENTOR_REVIEW_NOTE_MAX_LENGTH;

// ---------- Card primitives ----------

function StarFieldCard({
  hue,
  letter,
  icon: Icon,
  label,
  prompt,
  counter,
  children,
  index,
}: {
  hue: StarConfig["hue"];
  letter: string;
  icon: LucideIcon;
  label: string;
  prompt?: string;
  counter?: { value: number; max: number };
  children: ReactNode;
  index: number;
}) {
  const reduce = useReducedMotion();
  const accent = HUE_ACCENT[hue];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: "easeOut" as const, delay: 0.05 * index }}
      whileHover={reduce ? undefined : { y: -2 }}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-4 ring-1 transition-shadow ring-inset sm:p-5",
        "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
        "dark:bg-white/[0.03] dark:ring-white/5",
        "hover:shadow-[0_4px_18px_-12px_rgba(15,23,42,0.18)] dark:hover:shadow-[0_4px_18px_-8px_rgba(0,0,0,0.45)]"
      )}>
      {/* Left accent rail */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b",
          accent.rail
        )}
      />
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold",
              accent.badge
            )}>
            {letter}
          </span>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
              {t_prefix()}
            </p>
            <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {label}
            </p>
          </div>
        </div>
        <Icon className={cn("h-4 w-4 shrink-0", accent.icon)} aria-hidden />
      </header>
      {prompt && (
        <p className="-mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{prompt}</p>
      )}
      <div className="flex-1">{children}</div>
      {counter && (
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
            <motion.div
              className={cn("h-full rounded-full", accent.bar)}
              initial={false}
              animate={{
                width: `${Math.min(100, Math.round((counter.value / counter.max) * 100))}%`,
              }}
              transition={{ duration: 0.32, ease: "easeOut" as const }}
            />
          </div>
          <p
            className={cn(
              "text-[10px] tabular-nums",
              counter.value > counter.max ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
            )}>
            {counter.value} / {counter.max}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// We can't call `useTranslation` from a non-component; the eyebrow label
// above is rendered with a static "STAR" prefix.
function t_prefix() {
  return "STAR";
}

function AdditionalFieldCard({
  hue,
  icon: Icon,
  label,
  counter,
  children,
  index,
}: {
  hue: AdditionalConfig["hue"];
  icon: LucideIcon;
  label: string;
  counter?: { value: number; max: number };
  children: ReactNode;
  index: number;
}) {
  const reduce = useReducedMotion();
  const accent = HUE_ACCENT[hue];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" as const, delay: 0.04 * index }}
      className={cn(
        "group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-4 ring-1 ring-inset sm:p-5",
        "bg-slate-500/[0.04] ring-slate-200/70 backdrop-blur-sm",
        "dark:bg-white/[0.03] dark:ring-white/5",
        "hover:shadow-[0_4px_18px_-12px_rgba(15,23,42,0.18)] dark:hover:shadow-[0_4px_18px_-8px_rgba(0,0,0,0.45)]"
      )}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-2 top-0 h-[2px] rounded-full bg-gradient-to-r",
          accent.rail
        )}
      />
      <header className="flex items-center gap-2.5">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", accent.badge)}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="text-sm font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
          {label}
        </p>
      </header>
      <div className="flex-1">{children}</div>
      {counter && (
        <p
          className={cn(
            "text-right text-[10px] tabular-nums",
            counter.value > counter.max ? "text-rose-500" : "text-slate-400 dark:text-slate-500"
          )}>
          {counter.value} / {counter.max}
        </p>
      )}
    </motion.div>
  );
}

// ---------- Side rail (progress + student preview) ----------

function LivePreviewRail({
  rating,
  starValues,
  additionalValues,
  isEdit,
  editLabel,
  submitLabel,
  t,
}: {
  rating: number;
  starValues: Record<StarKind, string>;
  additionalValues: Record<AdditionalKind, string>;
  isEdit: boolean;
  editLabel: string;
  submitLabel: string;
  t: (_key: string) => string;
}) {
  const filledCount =
    Number(rating > 0) +
    (starValues.situation ? 1 : 0) +
    (starValues.task ? 1 : 0) +
    (starValues.action ? 1 : 0) +
    (starValues.result ? 1 : 0) +
    (additionalValues.strength ? 1 : 0) +
    (additionalValues.weakness ? 1 : 0) +
    (additionalValues.improve ? 1 : 0);
  const totalSlots = 8;
  const progress = Math.min(100, Math.round((filledCount / totalSlots) * 100));

  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" as const, delay: 0.2 }}
      className="space-y-3 lg:sticky lg:top-4">
      {/* Progress card */}
      <div
        className={cn(
          "rounded-2xl p-4 ring-1 backdrop-blur-sm ring-inset sm:p-5",
          "bg-slate-500/[0.04] ring-slate-200/70",
          "dark:bg-white/[0.03] dark:ring-white/5"
        )}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
            {t("compReview.evaluationStatistics")}
          </p>
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
        </div>

        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-3xl font-bold tracking-[-0.03em] text-slate-900 dark:text-slate-100">
            {filledCount}
            <span className="text-base font-medium opacity-60"> / {totalSlots}</span>
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            {progress}%
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/80">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.32, ease: "easeOut" as const }}
          />
        </div>
      </div>

      {/* Student-view preview */}
      <div
        className={cn(
          "rounded-2xl p-4 ring-1 backdrop-blur-sm ring-inset sm:p-5",
          "bg-slate-500/[0.04] ring-slate-200/70",
          "dark:bg-white/[0.03] dark:ring-white/5"
        )}>
        <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
          {t("compReview.overallRatingOptional")}
        </p>
        <div className="mt-1.5">
          <MentorScoreDisplay value={rating} showBand showProgress />
        </div>

        <div className="mt-3 space-y-1.5 border-t border-slate-200/60 pt-3 dark:border-slate-700/60">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase dark:text-slate-400">
            {t("mentorReviews.additionalComments")}
          </p>
          {STAR_CARDS.map((cfg) => (
            <PreviewRow
              key={cfg.field}
              label={t(cfg.labelKey)}
              value={starValues[cfg.field]}
              tone={cfg.hue}
            />
          ))}
          {ADDITIONAL_CARDS.map((cfg) => (
            <PreviewRow
              key={cfg.field}
              label={t(cfg.labelKey)}
              value={additionalValues[cfg.field]}
              tone={cfg.hue}
            />
          ))}
        </div>
      </div>

      <p className="px-1 text-[10px] text-slate-400 dark:text-slate-500">
        {isEdit ? editLabel : submitLabel}
      </p>
    </motion.aside>
  );
}

function PreviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof HUE_ACCENT;
}) {
  const filled = value.trim().length > 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
          filled ? cn(HUE_ACCENT[tone].bar, "opacity-80") : "bg-slate-300 dark:bg-slate-600"
        )}
        aria-hidden
      />
      <span className="truncate text-slate-600 dark:text-slate-400">{label}</span>
      <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
        {value.trim().length}
      </span>
    </div>
  );
}

// ---------- Form definition (unchanged schema, unchanged submit contract) ----------

interface MentorReviewFormProps {
  sessionId: number;
  mentorId: number;
  userId: number;
  existingReview?: MentorReview;
  onSubmit: (_data: {
    sessionId: number;
    mentorId: number;
    userId: number;
    rating?: number;
    situationNote?: string;
    taskNote?: string;
    actionNote?: string;
    resultNote?: string;
    strength?: string;
    weakness?: string;
    improve?: string;
  }) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function MentorReviewForm({
  sessionId,
  mentorId,
  userId,
  existingReview,
  onSubmit,
  onCancel,
  isLoading = false,
}: MentorReviewFormProps) {
  const { t } = useTranslation();

  const reviewSchema = z
    .object({
      rating: z.number().refine((value) => value >= 1 && value <= 100, {
        message: t("mentorScoring.scoreRequired"),
      }),
      situationNote: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
      taskNote: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
      actionNote: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
      resultNote: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
      strength: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
      weakness: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
      improve: z
        .string()
        .max(CHAR_TARGET, t("mentorSessions.reviewNoteMaxLength", { max: CHAR_TARGET }))
        .optional(),
    })
    .superRefine((value, ctx) => {
      const hasRating = (value.rating || 0) > 0;
      const hasAnyNote = [
        value.situationNote,
        value.taskNote,
        value.actionNote,
        value.resultNote,
        value.strength,
        value.weakness,
        value.improve,
      ].some((note) => Boolean(note?.trim()));
      if (!hasRating && !hasAnyNote) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("compReview.pleaseEnterAtLeastOne"),
          path: ["rating"],
        });
      }
    });

  type ReviewFormData = z.infer<typeof reviewSchema>;

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: existingReview?.rating || 0,
      situationNote: existingReview?.situationNote || "",
      taskNote: existingReview?.taskNote || "",
      actionNote: existingReview?.actionNote || "",
      resultNote: existingReview?.resultNote || "",
      strength: existingReview?.strength || "",
      weakness: existingReview?.weakness || "",
      improve: existingReview?.improve || "",
    },
  });

  const normalizeOptionalText = (value?: string) => {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  };

  // Track current values for the live preview.
  const watched = useWatch({ control: form.control });
  const starValues = useMemo(
    () => ({
      situation: (watched?.situationNote as string | undefined) ?? "",
      task: (watched?.taskNote as string | undefined) ?? "",
      action: (watched?.actionNote as string | undefined) ?? "",
      result: (watched?.resultNote as string | undefined) ?? "",
    }),
    [watched]
  );
  const additionalValues = useMemo(
    () => ({
      strength: (watched?.strength as string | undefined) ?? "",
      weakness: (watched?.weakness as string | undefined) ?? "",
      improve: (watched?.improve as string | undefined) ?? "",
    }),
    [watched]
  );
  const watchedRating = (watched?.rating as number | undefined) ?? 0;

  // Fire a single confetti burst the first time the form lands with
  // pre-filled content (i.e. an edit page with a complete review).
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (confettiFiredRef.current) return;
    const hasExistingContent =
      !!existingReview &&
      ((existingReview.rating || 0) > 0 ||
        Boolean(existingReview.situationNote?.trim()) ||
        Boolean(existingReview.strength?.trim()));
    if (hasExistingContent) {
      confettiFiredRef.current = true;
      fireConfetti();
    }
  }, [existingReview]);

  const handleSubmit = (data: ReviewFormData) => {
    const normalizedRating = data.rating > 0 ? data.rating : undefined;
    onSubmit({
      sessionId,
      mentorId,
      userId,
      rating: normalizedRating,
      situationNote: normalizeOptionalText(data.situationNote),
      taskNote: normalizeOptionalText(data.taskNote),
      actionNote: normalizeOptionalText(data.actionNote),
      resultNote: normalizeOptionalText(data.resultNote),
      strength: normalizeOptionalText(data.strength),
      weakness: normalizeOptionalText(data.weakness),
      improve: normalizeOptionalText(data.improve),
    });
    fireConfetti();
  };
  const isEdit = !!existingReview;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main column — free-flowing sections, no outer card */}
          <div className="min-w-0 space-y-10">
            {/* Overall rating hero */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <FormLabel className="text-base font-semibold tracking-[-0.01em]">
                        {t("mentorScoring.candidateScore")}
                      </FormLabel>
                      <FormDescription className="mt-0.5 text-xs">
                        {t("mentorScoring.scoreInputHint")}
                      </FormDescription>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                        {field.value && field.value > 0 ? field.value.toFixed(0) : "—"}
                      </span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        /100
                      </span>
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      inputMode="numeric"
                      value={field.value || ""}
                      onChange={(event) =>
                        field.onChange(event.target.value === "" ? 0 : Number(event.target.value))
                      }
                      className="h-12 max-w-48 text-lg font-semibold tabular-nums"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* STAR method */}
            <section className="space-y-4">
              <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                    {t("compReview.starMethodOptional")}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t("compReview.describeInDetailYourStudent")}
                  </p>
                </div>
              </header>
              <div className="grid gap-3 sm:grid-cols-2">
                {STAR_CARDS.map((cfg, index) => (
                  <FormField
                    key={cfg.field}
                    control={form.control}
                    name={
                      cfg.field === "situation"
                        ? "situationNote"
                        : cfg.field === "task"
                          ? "taskNote"
                          : cfg.field === "action"
                            ? "actionNote"
                            : "resultNote"
                    }
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <StarFieldCard
                            hue={cfg.hue}
                            letter={cfg.letter}
                            icon={cfg.icon}
                            label={t(cfg.labelKey)}
                            prompt={t(cfg.promptKey)}
                            counter={{ value: (field.value ?? "").length, max: CHAR_TARGET }}
                            index={index}>
                            <Textarea
                              maxLength={CHAR_TARGET}
                              placeholder={t(cfg.placeholderKey)}
                              className="min-h-32 resize-y border-slate-200 bg-white/80 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900/60"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </StarFieldCard>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            {/* Additional comments */}
            <section className="space-y-4">
              <header>
                <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                  {t("compReview.additionalCommentsOptional")}
                </h2>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ADDITIONAL_CARDS.map((cfg, index) => (
                  <FormField
                    key={cfg.field}
                    control={form.control}
                    name={cfg.field}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <AdditionalFieldCard
                            hue={cfg.hue}
                            icon={cfg.icon}
                            label={t(cfg.labelKey)}
                            counter={{ value: (field.value ?? "").length, max: CHAR_TARGET }}
                            index={index + STAR_CARDS.length}>
                            <Textarea
                              maxLength={CHAR_TARGET}
                              placeholder={t(cfg.placeholderKey)}
                              className="min-h-32 resize-y border-slate-200 bg-white/80 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900/60"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </AdditionalFieldCard>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Side rail — desktop only, gracefully hidden on mobile */}
          <div className="hidden lg:block">
            <LivePreviewRail
              rating={watchedRating}
              starValues={starValues}
              additionalValues={additionalValues}
              isEdit={isEdit}
              editLabel={t("mentorSessions.updateYourReviewOfThe")}
              submitLabel={t("mentorSessions.evaluateStudentsAfterTheInterview")}
              t={t}
            />
          </div>
        </div>

        {/* Actions — flowing footer, no card chrome */}
        <div className="flex flex-wrap items-center justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="min-w-24">
              {t("general.cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-36 gap-2 bg-indigo-600 text-white shadow-[0_4px_18px_-8px_rgba(79,70,229,0.6)] hover:bg-indigo-700">
            {isLoading ? (
              <Spinner size="sm" tone="white" />
            ) : isEdit ? (
              <MessageSquare className="h-4 w-4" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {isEdit ? t("compReview.updatedReview") : t("compReview.submitAReview")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
