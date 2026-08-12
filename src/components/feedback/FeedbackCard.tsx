import { useTranslation } from "react-i18next";
/**
 * FeedbackCard Component
 * Displays a single mentor feedback
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { TimeAgo } from "@/components/ui/time-ago";
import { getSessionMentorId } from "@/lib/session-mentor";
import { cn } from "@/lib/utils";
import type { MentorFeedback } from "@/services/mentor-feedback.manager";
import { Calendar, Edit, MessageSquare, Trash2, User } from "lucide-react";
interface FeedbackCardProps {
  feedback: MentorFeedback;
  showMentor?: boolean;
  showUser?: boolean;
  showSession?: boolean;
  showActions?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}
export function FeedbackCard({
  feedback,
  showMentor = true,
  showUser = false,
  showSession = true,
  showActions = false,
  onClick,
  onEdit,
  onDelete,
  className,
}: FeedbackCardProps) {
  const { t } = useTranslation();
  const fallbackUserName = feedback.session?.userId
    ? t("common.studentVar0", {
        var_0: feedback.session.userId,
      })
    : t("common.students");
  const fallbackMentorName =
    getSessionMentorId(feedback.session) != null
      ? t("common.mentorWithId", { id: getSessionMentorId(feedback.session) })
      : t("common.mentor");
  const displayName = showMentor
    ? feedback.mentor?.name || fallbackMentorName
    : showUser
      ? feedback.user?.name || fallbackUserName
      : t("common.anonymous");
  const occurredAt = feedback.session?.endTime1 || feedback.session?.startTime1;
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={showMentor ? feedback.mentor?.avatarUrl : feedback.user?.avatarUrl}
              alt={displayName}
            />
            <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            {/* Name */}
            <p className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>

            {/* Meta info */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              {showSession && feedback.session?.roomName && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {feedback.session.roomName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="flex flex-col items-end gap-1">
          <StarRating value={feedback.rating || 0} readOnly size="sm" />
          {occurredAt && (
            <TimeAgo date={occurredAt} className="text-xs text-slate-500 dark:text-slate-400" />
          )}
        </div>
      </div>

      {/* Comment */}
      {feedback.comment ? (
        <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {feedback.comment}
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-slate-500 italic dark:text-slate-400">
          <MessageSquare className="h-4 w-4" />
          {t("common.noComments")}
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
    </div>
  );
}
