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
import { getSessionMentorId } from "@/lib/session-mentor";
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
  const fallbackMentorName =
    getSessionMentorId(review.session) != null
      ? t("common.mentorWithId", { id: getSessionMentorId(review.session) })
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
        "rounded-2xl border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-indigo-700/60",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}>
      <CardHeader className="px-0 pt-0 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={showMentor ? review.mentor?.avatarUrl : review.user?.avatarUrl}
                alt={displayName}
              />
              <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              {/* Name */}
              <p className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>

              {/* Meta info */}
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {review.session?.roomName && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {review.session.roomName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="flex flex-col items-end gap-1">
            <StarRating value={review.rating || 0} readOnly size="sm" />
            {occurredAt && (
              <TimeAgo date={occurredAt} className="text-xs text-slate-500 dark:text-slate-400" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-0 pb-0">
        {/* STAR Method Notes */}
        {hasStarNotes && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/60 dark:bg-slate-950/40">
            {review.situationNote && (
              <div>
                <p className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                  {t("compReview.situationS")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {review.situationNote}
                </p>
              </div>
            )}
            {review.taskNote && (
              <div>
                <p className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                  {t("compReview.missionT")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{review.taskNote}</p>
              </div>
            )}
            {review.actionNote && (
              <div>
                <p className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                  {t("compReview.actionA")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {review.actionNote}
                </p>
              </div>
            )}
            {review.resultNote && (
              <div>
                <p className="text-xs font-bold tracking-wider text-indigo-600 uppercase dark:text-indigo-400">
                  {t("compReview.resultsR")}
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  {review.resultNote}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        {hasStarNotes && hasAdditionalNotes && (
          <hr className="border-slate-200 dark:border-slate-800" />
        )}

        {/* Additional Notes */}
        {hasAdditionalNotes && (
          <div className="grid gap-3 sm:grid-cols-3">
            {review.strength && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-3.5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {t("common.strengths")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
                  {review.strength}
                </p>
              </div>
            )}
            {review.weakness && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3.5 dark:border-amber-800/40 dark:bg-amber-950/30">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                  {t("common.pointsForImprovement")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                  {review.weakness}
                </p>
              </div>
            )}
            {review.improve && (
              <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3.5 dark:border-sky-800/40 dark:bg-sky-950/30">
                <p className="text-xs font-bold text-sky-700 dark:text-sky-400">
                  {t("common.suggestedImprovements1")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-sky-900 dark:text-sky-200">
                  {review.improve}
                </p>
              </div>
            )}
          </div>
        )}

        {/* No content fallback */}
        {!hasStarNotes && !hasAdditionalNotes && (
          <p className="text-sm text-slate-500 italic dark:text-slate-400">
            {t("compReview.thereIsNoDetailedReview")}
          </p>
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
