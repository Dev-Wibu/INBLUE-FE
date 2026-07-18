/**
 * RateMentorModal
 *
 * Student-facing dialog that lets a candidate rate their Mentor after a
 * Mentor Interview session ends. Implementation follows
 * `docs/frontend_student_rate_mentor.md` §5 / §9.
 *
 * Wires the existing `useCreateMentorFeedback` mutation hook (via
 * `services/mentor-feedback.manager`) — no new API client code.
 *
 * Validation:
 *   - rating: 1–10 (required)
 *   - comment: ≥ 20 chars after trim
 *
 * Error handling:
 *   - Mutation errors are surfaced via Sonner toast (handled inside the
 *     mutation hook) and re-thrown so the modal can keep its loading
 *     state coherent.
 *
 * Lifecycle:
 *   - Parent should pass `key={sessionId}` so a stale draft from a
 *     different session never leaks into the new rating flow.
 *   - The dialog is internally controlled; `onOpenChange` is forwarded
 *     to Radix Dialog so the close affordance still works.
 */

import { useState } from "react";

import { RatingScale10 } from "@/components/feedback/RatingScale10";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMentorFeedback } from "@/hooks/useMentorFeedback";
import { useAuthStore } from "@/stores/authStore";
import { Send, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

const MIN_COMMENT_LENGTH = 20;
const MAX_COMMENT_LENGTH = 1000;

export interface RateMentorModalProps {
  sessionId: number;
  mentorId: number;
  /** Optional mentor name shown in the header copy. */
  mentorName?: string;
  /** Called when the feedback was successfully submitted. */
  onSuccess?: () => void;
  /** Override for the comment field (e.g. for edit mode). */
  initialComment?: string;
  initialRating?: number;
}

interface FormErrors {
  rating?: string;
  comment?: string;
}

export function RateMentorModal({
  sessionId,
  mentorId,
  mentorName,
  onSuccess,
  initialComment = "",
  initialRating = 0,
}: RateMentorModalProps) {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id);
  const createFeedback = useCreateMentorFeedback();
  const [rating, setRating] = useState<number>(initialRating);
  const [comment, setComment] = useState<string>(initialComment);
  const [errors, setErrors] = useState<FormErrors>({});
  const [open, setOpen] = useState(true);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!rating || rating < 1 || rating > 10) {
      next.rating = t("userRateMentor.ratingRequired");
    }
    const trimmed = comment.trim();
    if (trimmed.length < MIN_COMMENT_LENGTH) {
      next.comment = t("userRateMentor.commentTooShort", { count: MIN_COMMENT_LENGTH });
    }
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setErrors({ rating: t("userRateMentor.notLoggedIn") });
      return;
    }
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    try {
      await createFeedback.mutateAsync({
        sessionId,
        mentorId,
        userId,
        rating,
        comment: comment.trim(),
      });
      onSuccess?.();
      setOpen(false);
    } catch {
      // The mutation hook already toasted the error; keep the modal open
      // so the user can retry without losing their draft.
    }
  };

  const isSubmitting = createFeedback.isPending;
  const trimmedCommentLen = comment.trim().length;
  const submitDisabled = isSubmitting || trimmedCommentLen < MIN_COMMENT_LENGTH || rating < 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-[#FFD700] text-[#FFD700]" />
            {t("userRateMentor.modalTitle")}
          </DialogTitle>
          <DialogDescription>
            {mentorName
              ? t("userRateMentor.modalDescriptionWithMentor", { name: mentorName })
              : t("userRateMentor.modalDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("userRateMentor.ratingLabel")} <span className="text-red-500">*</span>
            </Label>
            <RatingScale10 value={rating} onChange={setRating} />
            {errors.rating && (
              <p className="text-xs text-red-500" role="alert">
                {errors.rating}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="rate-mentor-comment" className="text-sm font-medium">
              {t("userRateMentor.commentLabel")} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rate-mentor-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder={t("userRateMentor.commentPlaceholder")}
              aria-invalid={!!errors.comment}
            />
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  trimmedCommentLen < MIN_COMMENT_LENGTH
                    ? "text-slate-400"
                    : "text-slate-500 dark:text-slate-300"
                }>
                {t("userRateMentor.commentHint", { count: MIN_COMMENT_LENGTH })}
              </span>
              <span className="text-slate-400">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            {errors.comment && (
              <p className="text-xs text-red-500" role="alert">
                {errors.comment}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled}
              className="gap-2 bg-[#0047AB] text-white hover:bg-[#003d91] disabled:bg-slate-300">
              {isSubmitting ? (
                <>
                  <Spinner size="sm" tone="white" />
                  {t("compUi.submitting")}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t("userRateMentor.submit")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
