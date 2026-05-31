import i18n from "@/lib/i18n";
const t = i18n.t.bind(i18n);
/**
 * ReviewList Component
 * Displays a list of mentor reviews
 */

import { EmptyState } from "@/components/ui/empty-state";
import { LoadingCardList } from "@/components/ui/loading-card";
import { cn } from "@/lib/utils";
import type { MentorReview } from "@/services/mentor-review.manager";
import { Star } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
interface ReviewListProps {
  reviews: MentorReview[];
  isLoading?: boolean;
  showMentor?: boolean;
  showUser?: boolean;
  showActions?: boolean;
  onSelect?: (review: MentorReview) => void;
  onEdit?: (review: MentorReview) => void;
  onDelete?: (review: MentorReview) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}
export function ReviewList({
  reviews,
  isLoading,
  showMentor = true,
  showUser = false,
  showActions = false,
  onSelect,
  onEdit,
  onDelete,
  emptyTitle = t("common.thereAreNoReviewsYet"),
  emptyDescription = t("compReview.noReviewsHaveBeenSubmitted"),
  className,
}: ReviewListProps) {
  // Loading state
  if (isLoading) {
    return <LoadingCardList count={3} className={className} />;
  }

  // Empty state
  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }
  return (
    <div className={cn("space-y-4", className)}>
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          showMentor={showMentor}
          showUser={showUser}
          showActions={showActions}
          onClick={onSelect ? () => onSelect(review) : undefined}
          onEdit={onEdit ? () => onEdit(review) : undefined}
          onDelete={onDelete ? () => onDelete(review) : undefined}
        />
      ))}
    </div>
  );
}
