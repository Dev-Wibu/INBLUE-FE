/**
 * MentorReviewForm — Mentor Interview "Command Center" edit form.
 * UI-only refresh: 4-card STAR grid, 3-col strengths/weakness/improve,
 * live preview pane, character counters, confetti on submit.
 *
 * Form schema, default values, submit pipeline, and validation messages
 * are all preserved exactly. The form's public props are unchanged.
 */

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
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
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
  // Respect reduced-motion preference — never fire confetti if user opted out.
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
type CardTone = "sky" | "indigo" | "emerald" | "amber" | "rose" | "violet";

interface StarConfig {
  field: StarKind;
  icon: LucideIcon;
  letter: string;
  tone: CardTone;
  placeholderKey: string;
  labelKey: string;
}

const STAR_CARDS: StarConfig[] = [
  {
    field: "situation",
    icon: Target,
    letter: "S",
    tone: "sky",
    labelKey: "compReview.situation",
    placeholderKey: "compReview.describeTheContextOfThe",
  },
  {
    field: "task",
    icon: ClipboardList,
    letter: "T",
    tone: "indigo",
    labelKey: "compReview.task",
    placeholderKey: "compReview.tasksStudentsNeedToComplete",
  },
  {
    field: "action",
    icon: Zap,
    letter: "A",
    tone: "emerald",
    labelKey: "compReview.action",
    placeholderKey: "compReview.theActionsStudentsTookDuring",
  },
  {
    field: "result",
    icon: CheckCircle2,
    letter: "R",
    tone: "amber",
    labelKey: "compReview.result",
    placeholderKey: "compReview.theResultsStudentsAchievedAfter",
  },
];

interface AdditionalConfig {
  field: AdditionalKind;
  icon: LucideIcon;
  tone: CardTone;
  labelKey: string;
  placeholderKey: string;
}

const ADDITIONAL_CARDS: AdditionalConfig[] = [
  {
    field: "strength",
    icon: ThumbsUp,
    tone: "emerald",
    labelKey: "compReview.studentStrengths",
    placeholderKey: "compReview.theStrengthsYouSeeIn",
  },
  {
    field: "weakness",
    icon: Wrench,
    tone: "rose",
    labelKey: "common.pointsForImprovement",
    placeholderKey: "compReview.pointsStudentsCanImprove",
  },
  {
    field: "improve",
    icon: Lightbulb,
    tone: "violet",
    labelKey: "common.suggestedImprovements1",
    placeholderKey: "compReview.yourSpecificSuggestionsForStudents",
  },
];

// Tone → class map. Lives in this file (component file) so Fast Refresh
// stays happy and the map travels with the only place that uses it.
const TONE_CLASS: Record<
  CardTone,
  { surface: string; ring: string; ink: string; chip: string; letter: string }
> = {
  sky: {
    surface: "bg-sky-500/8 dark:bg-sky-500/10",
    ring: "ring-sky-500/25",
    ink: "text-sky-700 dark:text-sky-300",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    letter: "bg-sky-500/20 text-sky-700 dark:text-sky-300",
  },
  indigo: {
    surface: "bg-indigo-500/8 dark:bg-indigo-500/10",
    ring: "ring-indigo-500/25",
    ink: "text-indigo-700 dark:text-indigo-300",
    chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    letter: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  },
  emerald: {
    surface: "bg-emerald-500/8 dark:bg-emerald-500/10",
    ring: "ring-emerald-500/25",
    ink: "text-emerald-700 dark:text-emerald-300",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    letter: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    surface: "bg-amber-500/8 dark:bg-amber-500/10",
    ring: "ring-amber-500/25",
    ink: "text-amber-700 dark:text-amber-300",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    letter: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  },
  rose: {
    surface: "bg-rose-500/8 dark:bg-rose-500/10",
    ring: "ring-rose-500/25",
    ink: "text-rose-700 dark:text-rose-300",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    letter: "bg-rose-500/20 text-rose-700 dark:text-rose-300",
  },
  violet: {
    surface: "bg-violet-500/8 dark:bg-violet-500/10",
    ring: "ring-violet-500/25",
    ink: "text-violet-700 dark:text-violet-300",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    letter: "bg-violet-500/20 text-violet-700 dark:text-violet-300",
  },
};

const CHAR_TARGET = 280;

function FieldCard({
  tone,
  letter,
  icon: Icon,
  label,
  hint,
  counter,
  children,
  index,
}: {
  tone: CardTone;
  letter: string;
  icon: LucideIcon;
  label: string;
  hint?: string;
  counter?: { value: number; max: number };
  children: ReactNode;
  index: number;
}) {
  const reduce = useReducedMotion();
  const cls = TONE_CLASS[tone];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.04 * index }}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-2xl p-4 ring-1 transition-shadow ring-inset",
        cls.surface,
        cls.ring,
        "hover:shadow-[0_4px_18px_-12px_rgba(15,23,42,0.18)] dark:hover:shadow-[0_4px_18px_-8px_rgba(0,0,0,0.45)]"
      )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold tracking-wide",
              cls.letter
            )}>
            {letter}
          </span>
          <Icon className={cn("h-3.5 w-3.5", cls.ink)} aria-hidden />
          <p className={cn("text-xs font-semibold tracking-[-0.01em]", cls.ink)}>{label}</p>
        </div>
        {hint && (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", cls.chip)}>
            {hint}
          </span>
        )}
      </div>
      {children}
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

function LivePreviewCard({
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
    <aside
      className={cn(
        "sticky top-4 flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-inset",
        "bg-white/95 ring-slate-200/80 backdrop-blur",
        "dark:bg-slate-900/70 dark:ring-white/5"
      )}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-indigo-700 uppercase dark:text-indigo-300">
          {t("compReview.evaluationStatistics")}
        </p>
        <Sparkles className="h-3.5 w-3.5 text-indigo-500" aria-hidden />
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-baseline justify-between">
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
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Overall rating snapshot */}
      <div className="rounded-xl bg-slate-50/80 p-3 ring-1 ring-slate-200/80 dark:bg-slate-900/40 dark:ring-slate-700/70">
        <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {t("compReview.overallRatingOptional")}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StarRating value={rating} readOnly size="sm" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {rating > 0 ? `${rating.toFixed(1)} / 5` : "—"}
          </span>
        </div>
      </div>

      {/* Student-view preview */}
      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-indigo-50/40 to-white p-3 dark:border-slate-700/70 dark:from-indigo-950/30 dark:to-slate-900/40">
        <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
          {t("mentorReviews.additionalComments")}
        </p>
        <div className="mt-2 space-y-1.5">
          {STAR_CARDS.map((cfg) => (
            <PreviewRow
              key={cfg.field}
              label={t(cfg.labelKey)}
              value={starValues[cfg.field]}
              tone={cfg.tone}
            />
          ))}
          {ADDITIONAL_CARDS.map((cfg) => (
            <PreviewRow
              key={cfg.field}
              label={t(cfg.labelKey)}
              value={additionalValues[cfg.field]}
              tone={cfg.tone}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        {isEdit ? editLabel : submitLabel}
      </p>
    </aside>
  );
}

function PreviewRow({ label, value, tone }: { label: string; value: string; tone: CardTone }) {
  const cls = TONE_CLASS[tone];
  const filled = value.trim().length > 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          filled ? cls.chip : "bg-slate-300 dark:bg-slate-600"
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
      rating: z.number().min(0).max(5),
      situationNote: z.string().optional(),
      taskNote: z.string().optional(),
      actionNote: z.string().optional(),
      resultNote: z.string().optional(),
      strength: z.string().optional(),
      weakness: z.string().optional(),
      improve: z.string().optional(),
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

  // Fire a single confetti burst the first time the form becomes submittable
  // (no animation, just a subtle celebratory accent). We don't gate by
  // submission so it only fires when a user explicitly lands here with
  // pre-filled content (e.g. an edit page that has a complete review).
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
    // Fire confetti on the user-driven submit, not the existing-content init.
    fireConfetti();
  };
  const isEdit = !!existingReview;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main column */}
          <div className="min-w-0 space-y-6">
            {/* Overall rating */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 sm:p-5 dark:bg-slate-900/60 dark:ring-white/5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <FormLabel className="text-base font-semibold tracking-[-0.01em]">
                        {t("compReview.overallRatingOptional")}
                      </FormLabel>
                      <FormDescription className="mt-0.5">
                        {t("compReview.youCanChooseTheNumber")}
                      </FormDescription>
                    </div>
                    <span className="text-[10px] font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
                      {t("compReview.evaluate")}
                    </span>
                  </div>
                  <FormControl>
                    <div className="mt-3">
                      <StarRating value={field.value} onChange={field.onChange} size="lg" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* STAR method — 2x2 grid of cards on desktop, single column on mobile */}
            <section className="space-y-3">
              <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
                    {t("compReview.starMethodOptional")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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
                          <FieldCard
                            tone={cfg.tone}
                            letter={cfg.letter}
                            icon={cfg.icon}
                            label={t(cfg.labelKey)}
                            counter={{ value: (field.value ?? "").length, max: CHAR_TARGET }}
                            index={index}>
                            <Textarea
                              placeholder={t(cfg.placeholderKey)}
                              className="min-h-24 resize-y border-slate-200 bg-white/80 text-sm dark:border-slate-700 dark:bg-slate-900/60"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FieldCard>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>

            {/* Additional comments — 3-column on desktop */}
            <section className="space-y-3">
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
                          <FieldCard
                            tone={cfg.tone}
                            letter=""
                            icon={cfg.icon}
                            label={t(cfg.labelKey)}
                            counter={{ value: (field.value ?? "").length, max: CHAR_TARGET }}
                            index={index + STAR_CARDS.length}>
                            <Textarea
                              placeholder={t(cfg.placeholderKey)}
                              className="min-h-24 resize-y border-slate-200 bg-white/80 text-sm dark:border-slate-700 dark:bg-slate-900/60"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FieldCard>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Sticky preview column — desktop only, gracefully hidden on mobile */}
          <div className="hidden lg:block">
            <LivePreviewCard
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

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/70 pt-4 dark:border-slate-700/70">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="min-w-24">
              {t("general.cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-32 gap-2 bg-indigo-600 text-white shadow-[0_4px_18px_-8px_rgba(79,70,229,0.6)] hover:bg-indigo-700">
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
