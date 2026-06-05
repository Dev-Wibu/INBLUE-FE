import { useTranslation } from "react-i18next";
/**
 * ReviewCard Component
 * Displays a single mentor review with STAR method details
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { cn } from "@/lib/utils";
import type { MentorReview } from "@/services/mentor-review.manager";
import { Calendar, Edit, Trash2, User } from "lucide-react";
interface ReviewCardProps {
  review: MentorReview;
  showMentor?: boolean;
  showUser?: boolean;
  showActions?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}
export function ReviewCard({
  review,
  showMentor = true,
  showUser = false,
  showActions = false,
  onClick,
  onEdit,
  onDelete,
  className,
}: ReviewCardProps) {
  const { t } = useTranslation();
  const hasStarNotes =
    review.situationNote || review.taskNote || review.actionNote || review.resultNote;
  const hasAdditionalNotes = review.strength || review.weakness || review.improve;
  const fallbackUserName = review.session?.userId
    ? t("common.studentVar0", {
        var_0: review.session.userId,
      })
    : t("common.students");
  const fallbackMentorName = review.session?.userId2
    ? t("common.mentorWithId", { id: review.session.userId2 })
    : t("common.mentor");
  const displayName = showUser
    ? review.user?.name || fallbackUserName
    : showMentor
      ? review.mentor?.name || fallbackMentorName
      : t("common.anonymous");
  const occurredAt = review.session?.endTime1 || review.session?.startTime1;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "overflow-hidden",
        onClick && "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={showMentor ? review.mentor?.avatarUrl : review.user?.avatarUrl}
                alt={displayName}
              />
              <AvatarFallback className="bg-[#0047AB]/10 text-[#0047AB]">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              {/* Name */}
              <p className="font-medium text-slate-900 dark:text-slate-100">{displayName}</p>

              {/* Meta info */}
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {review.session?.roomName && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {review.session.roomName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-end gap-1">
            <StarRating value={review.rating || 0} readOnly size="sm" />
            {occurredAt && <TimeAgo date={occurredAt} className="text-xs" />}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* STAR Method Notes */}
        {hasStarNotes && (
          <div className="space-y-3">
            {review.situationNote && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#0047AB] uppercase">
                  {t("compReview.situationS")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {review.situationNote}
                </p>
              </div>
            )}
            {review.taskNote && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#0047AB] uppercase">
                  {t("compReview.missionT")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{review.taskNote}</p>
              </div>
            )}
            {review.actionNote && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#0047AB] uppercase">
                  {t("compReview.actionA")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {review.actionNote}
                </p>
              </div>
            )}
            {review.resultNote && (
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#0047AB] uppercase">
                  {t("compReview.resultsR")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {review.resultNote}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        {hasStarNotes && hasAdditionalNotes && (
          <hr className="border-slate-200 dark:border-slate-700" />
        )}

        {/* Additional Notes */}
        {hasAdditionalNotes && (
          <div className="grid gap-3 sm:grid-cols-3">
            {review.strength && (
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                  {t("common.strengths")}
                </p>
                <p className="mt-1 text-sm text-green-800 dark:text-green-300">{review.strength}</p>
              </div>
            )}
            {review.weakness && (
              <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {t("common.pointsForImprovement")}
                </p>
                <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{review.weakness}</p>
              </div>
            )}
            {review.improve && (
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {t("common.suggestedImprovements1")}
                </p>
                <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">{review.improve}</p>
              </div>
            )}
          </div>
        )}

        {/* No content fallback */}
        {!hasStarNotes && !hasAdditionalNotes && (
          <p className="text-sm text-slate-500 italic">{t("compReview.thereIsNoDetailedReview")}</p>
        )}

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}>
                <Edit className="mr-1 h-4 w-4" />
                {t("general.edit")}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-1 h-4 w-4" />
                {t("general.delete")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
