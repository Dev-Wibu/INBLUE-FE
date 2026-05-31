import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
const t = i18n.t.bind(i18n);
/**
 * MentorFeedbackForm Component
 * Form for creating/editing mentor feedback
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import type { MentorFeedback } from "@/services/mentor-feedback.manager";

const feedbackSchema = z
  .object({
    rating: z.number().min(0).max(5),
    comment: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const hasRating = (value.rating || 0) > 0;
    const hasComment = Boolean(value.comment?.trim());

    if (!hasRating && !hasComment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t("compFeedback.pleaseSelectNumberOfStars"),
        path: ["rating"],
      });
    }
  });

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface MentorFeedbackFormProps {
  sessionId: number;
  mentorId: number;
  userId: number;
  existingFeedback?: MentorFeedback;
  onSubmit: (_data: {
    sessionId: number;
    mentorId: number;
    userId: number;
    rating?: number;
    comment?: string;
  }) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function MentorFeedbackForm({
  sessionId,
  mentorId,
  userId,
  existingFeedback,
  onSubmit,
  onCancel,
  isLoading = false,
}: MentorFeedbackFormProps) {
  const { t } = useTranslation();
  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: existingFeedback?.rating || 0,
      comment: existingFeedback?.comment || "",
    },
  });

  const handleSubmit = (data: FeedbackFormData) => {
    const normalizedComment = data.comment?.trim();
    const normalizedRating = data.rating > 0 ? data.rating : undefined;

    onSubmit({
      sessionId,
      mentorId,
      userId,
      rating: normalizedRating,
      comment: normalizedComment ? normalizedComment : undefined,
    });
  };

  const isEdit = !!existingFeedback;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Rating */}
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("compFeedback.mentorEvaluationOptional")}</FormLabel>
              <FormControl>
                <StarRating value={field.value} onChange={field.onChange} size="lg" />
              </FormControl>
              <FormDescription>{t("compFeedback.youCanChooseTheNumber")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comment */}
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("compFeedback.detailedCommentsOptional")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("compFeedback.shareYourCommentsAboutThe")}
                  className="min-h-[150px]"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>{t("compFeedback.youCanLeaveItBlank")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("general.cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700">
            {isLoading && <Spinner size="sm" tone="white" className="mr-2" />}
            {isEdit ? t("compFeedback.updatedResponse") : t("compFeedback.sendFeedback")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
